// --- combatAI.js ---
// Server-side enemy movement, targeting, and attack resolution.

const { ItemDatabase } = require('./public/js/items.js');
const { getGridDistance, getEffectiveStat } = require('./combatMath.js');

function executeEnemyTurn(socketId, combat, player, enemy, activeCombats) {
    if (!enemy.alive || player.hp <= 0) return [];
    const turnEvents = [];

    const cols = combat.gridSize.cols || 16;
    const rows = combat.gridSize.rows || 10;
    const collisionMatrix = Array(cols).fill(null).map(() => Array(rows).fill(0));

    combat.obstacles.forEach(o => { if (o.x >= 0 && o.x < cols && o.y >= 0 && o.y < rows) collisionMatrix[o.x][o.y] = 1; });
    combat.enemies.forEach(en => {
        if (en.alive) {
            const enSize = en.size || 1;
            for (let bx = en.x; bx < en.x + enSize; bx++) {
                for (let by = en.y; by < en.y + enSize; by++) {
                    if (bx >= 0 && bx < cols && by >= 0 && by < rows) collisionMatrix[bx][by] = 2;
                }
            }
        }
    });

    if (combat.player.x >= 0 && combat.player.x < cols && combat.player.y >= 0 && combat.player.y < rows) {
        collisionMatrix[combat.player.x][combat.player.y] = 2;
    }

    function hasLineOfSightMatrix(x1, y1, x2, y2) {
        let dx = Math.abs(x2 - x1); let dy = Math.abs(y2 - y1);
        let sx = (x1 < x2) ? 1 : -1; let sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy; let cx = x1; let cy = y1;
        while (true) {
            if (cx === x2 && cy === y2) return true;
            if (cx !== x1 || cy !== y1) {
                if (collisionMatrix[cx] === undefined || collisionMatrix[cx][cy] === 1) return false;
            }
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; cx += sx; }
            if (e2 < dx) { err += dx; cy += sy; }
        }
    }

    function getEnemyPathStep(entity) {
        const eSize = entity.size || 1;
        const queue = [{ x: entity.x, y: entity.y }];
        const visited = new Set([`${entity.x},${entity.y}`]);
        const parent = {};
        const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
        let targetNode = null;
        let closestNode = { x: entity.x, y: entity.y };
        let minDist = Infinity;
        let searchCount = 0;
        const searchLimit = 30;

        while (queue.length > 0 && searchCount < searchLimit) {
            searchCount++;
            const curr = queue.shift();
            const d = getGridDistance(combat.player.x, combat.player.y, curr.x, curr.y, eSize);
            let hasLos = false;
            if (d <= entity.attackRange) {
                for (let bx = curr.x; bx < curr.x + eSize; bx++) {
                    for (let by = curr.y; by < curr.y + eSize; by++) if (hasLineOfSightMatrix(bx, by, combat.player.x, combat.player.y)) hasLos = true;
                }
            }

            if (d < minDist) { minDist = d; closestNode = curr; }
            if (d <= entity.attackRange && hasLos) { targetNode = curr; break; }

            for (const dir of dirs) {
                const nx = curr.x + dir.x; const ny = curr.y + dir.y; const key = `${nx},${ny}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    let blocked = false;
                    for (let bx = nx; bx < nx + eSize; bx++) {
                        for (let by = ny; by < ny + eSize; by++) {
                            if (bx < 0 || bx >= cols || by < 0 || by >= rows) blocked = true;
                            else if (collisionMatrix[bx][by] === 2 && !(bx >= entity.x && bx < entity.x + eSize && by >= entity.y && by < entity.y + eSize)) blocked = true;
                            else if (collisionMatrix[bx][by] === 1 && eSize === 1) blocked = true;
                        }
                    }
                    if (!blocked) { parent[key] = curr; queue.push({ x: nx, y: ny }); }
                }
            }
        }
        if (!targetNode) targetNode = closestNode;
        if (targetNode.x === entity.x && targetNode.y === entity.y) return null;
        let step = targetNode;
        while (parent[`${step.x},${step.y}`] && (parent[`${step.x},${step.y}`].x !== entity.x || parent[`${step.x},${step.y}`].y !== entity.y)) {
            step = parent[`${step.x},${step.y}`];
        }
        return step;
    }

    const eSize = enemy.size || 1;
    let dist = getGridDistance(combat.player.x, combat.player.y, enemy.x, enemy.y, eSize);
    let hasLos = false;

    if (dist <= enemy.attackRange) {
        for (let bx = enemy.x; bx < enemy.x + eSize; bx++) {
            for (let by = enemy.y; by < enemy.y + eSize; by++) if (hasLineOfSightMatrix(bx, by, combat.player.x, combat.player.y)) hasLos = true;
        }
    }

    if (dist > enemy.attackRange || !hasLos) {
        let steps = enemy.speed;
        while (steps > 0) {
            dist = getGridDistance(combat.player.x, combat.player.y, enemy.x, enemy.y, eSize);
            hasLos = false;
            if (dist <= enemy.attackRange) {
                for (let bx = enemy.x; bx < enemy.x + eSize; bx++) {
                    for (let by = enemy.y; by < enemy.y + eSize; by++) if (hasLineOfSightMatrix(bx, by, combat.player.x, combat.player.y)) hasLos = true;
                }
            }
            if (dist <= enemy.attackRange && hasLos) break;

            const nextStep = getEnemyPathStep(enemy);
            if (nextStep) {
                enemy.x = nextStep.x;
                enemy.y = nextStep.y;
                turnEvents.push({ type: 'move', uid: enemy.uid, enemyId: enemy.id, name: enemy.name, finalX: enemy.x, finalY: enemy.y });
            } else break;
            steps--;
        }
    }

    dist = getGridDistance(combat.player.x, combat.player.y, enemy.x, enemy.y, eSize);
    hasLos = false;
    if (dist <= enemy.attackRange) {
        for (let bx = enemy.x; bx < enemy.x + eSize; bx++) {
            for (let by = enemy.y; by < enemy.y + eSize; by++) if (hasLineOfSightMatrix(bx, by, combat.player.x, combat.player.y)) hasLos = true;
        }
    }

    if (dist <= enemy.attackRange && hasLos) {
        const isRangedAttack = enemy.type === 'RANGED' || !!enemy.projectileSprite || !!enemy.spellFx;
        const projectileSprite = enemy.projectileSprite || (enemy.type === 'RANGED' && !enemy.spellFx ? 'icon_arrow' : null);
        const attackFx = {
            isRangedAttack: isRangedAttack,
            projectileSprite: projectileSprite,
            spellFx: enemy.spellFx,
            spellId: enemy.spellId,
            ex: enemy.x,
            ey: enemy.y
        };
        const eOffense = enemy.offense * 10;
        const playerSpeed = getEffectiveStat(player, 'speed') * 10;
        const enemyHitPower = (eOffense * 0.5) + (Math.random() * eOffense * 0.5);
        const playerSpeedMitigation = Math.random() * playerSpeed;

        if ((enemyHitPower - playerSpeedMitigation) <= 0) {
            turnEvents.push({ type: 'deflect', enemyName: enemy.name, ...attackFx });
        } else {
            const rawDamageRoll = Math.sqrt(Math.random()) * eOffense;
            const playerDef = getEffectiveStat(player, 'defense') * 10;
            const armorAbsorption = Math.pow(Math.random(), 2) * playerDef;
            const mitigatedDmg = Math.floor(rawDamageRoll - armorAbsorption);

            if (mitigatedDmg <= 0) turnEvents.push({ type: 'deflect', enemyName: enemy.name, ...attackFx });
            else {
                const isCrit = mitigatedDmg >= Math.floor(eOffense * 0.90);
                player.hp -= mitigatedDmg;
                turnEvents.push({
                    type: 'hit',
                    uid: enemy.uid,
                    enemyName: enemy.name,
                    damage: mitigatedDmg,
                    isCrit: isCrit,
                    ...attackFx
                });

                if (player.hp <= 0) {
                    player.hp = 0;
                    player.equipment = {
                        helmet: null,
                        armor: null,
                        weapon: JSON.parse(JSON.stringify(ItemDatabase["rusty_mace"])),
                        gloves: null,
                        boots: null
                    };
                    player.inventory = [];
                    player.pendingLoot = [];
                    player.pendingGold = 0;
                    player.pendingXp = 0;

                    delete activeCombats[socketId];
                    turnEvents.push({ type: 'death' });
                }
            }
        }
    }

    return turnEvents;
}

module.exports = {
    executeEnemyTurn
};
