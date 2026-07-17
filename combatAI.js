// --- combatAI.js ---
// Server-side actor movement, targeting, support, and attack resolution.

const { getGridDistance, getEffectiveStat, getMaxHp } = require('./combatMath.js');
const { ACTIONS_PER_TURN } = require('./combatTurns.js');
const {
    ensureActorStamina,
    getActorMaxStamina,
    getActorStamina,
    canSpendActorStamina,
    spendActorStamina,
    recoverActorStamina,
    getMoveStaminaCost,
    getActorAttackStaminaCost,
    getActorHealStaminaCost
} = require('./combatResources.js');
const { applyPoison } = require('./combatStatus.js');
const { applyPlayerCombatDefeat } = require('./combatDefeat.js');
const {
    getAliveActors,
    getHostileActorsFor,
    isActorAlive,
    isBlockingActor,
    isPlayerActor
} = require('./combatActors.js');

function getActorStat(actor, player, statKey) {
    if (isPlayerActor(actor)) return getEffectiveStat(player, statKey);
    return Math.max(0, actor[statKey] || 0);
}

function getActorHp(actor, player) {
    return isPlayerActor(actor) ? player.hp : actor.hp;
}

function getActorMaxHp(actor, player) {
    return isPlayerActor(actor) ? getMaxHp(player) : (actor.maxHp || actor.hp || 1);
}

function setActorHp(actor, player, value) {
    const maxHp = getActorMaxHp(actor, player);
    const nextHp = Math.max(0, Math.min(maxHp, Math.floor(value)));
    if (isPlayerActor(actor)) {
        player.hp = nextHp;
        actor.hp = nextHp;
    } else {
        actor.hp = nextHp;
    }
    return nextHp;
}

function defeatActor(socketId, combat, player, actor, activeCombats, onActorDefeated, turnEvents, sourceActor) {
    if (isPlayerActor(actor)) {
        actor.hp = 0;
        actor.alive = false;
        applyPlayerCombatDefeat(player);
        delete activeCombats[socketId];
        turnEvents.push({ type: 'death' });
        return { combatDefeated: true };
    }

    if (typeof onActorDefeated === 'function') {
        const resolution = onActorDefeated(actor, { sourceActor, cause: 'attack' });
        if (resolution && resolution.retreated) {
            turnEvents.push({
                type: 'retreat',
                uid: actor.uid,
                actorName: actor.name,
                teamId: actor.teamId
            });
        }
        return resolution;
    }

    actor.hp = 0;
    actor.alive = false;
    if (actor.deathBehavior === 'retreat') actor.retreated = true;
    return { combatComplete: false, resolved: true, retreated: actor.retreated === true };
}

function buildCollisionMatrix(combat, movingActor) {
    const cols = combat.gridSize.cols || 16;
    const rows = combat.gridSize.rows || 10;
    const collisionMatrix = Array(cols).fill(null).map(() => Array(rows).fill(0));

    combat.obstacles.forEach(o => {
        if (o.x >= 0 && o.x < cols && o.y >= 0 && o.y < rows) collisionMatrix[o.x][o.y] = 1;
    });

    getAliveActors(combat).forEach(actor => {
        if (!isBlockingActor(actor) || actor.uid === movingActor.uid) return;
        const size = actor.size || 1;
        for (let bx = actor.x; bx < actor.x + size; bx++) {
            for (let by = actor.y; by < actor.y + size; by++) {
                if (bx >= 0 && bx < cols && by >= 0 && by < rows) collisionMatrix[bx][by] = 2;
            }
        }
    });

    return collisionMatrix;
}

function hasLineOfSightMatrix(collisionMatrix, x1, y1, x2, y2) {
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

function actorHasLineOfSight(combat, actor, target) {
    const collisionMatrix = buildCollisionMatrix(combat, actor);
    const actorSize = actor.size || 1;
    for (let bx = actor.x; bx < actor.x + actorSize; bx++) {
        for (let by = actor.y; by < actor.y + actorSize; by++) {
            if (hasLineOfSightMatrix(collisionMatrix, bx, by, target.x, target.y)) return true;
        }
    }
    return false;
}

function getActorDistance(actor, target) {
    return getGridDistance(target.x, target.y, actor.x, actor.y, actor.size || 1);
}

function selectAttackTarget(combat, actor, player) {
    const candidates = getHostileActorsFor(actor, combat).filter(target => getActorHp(target, player) > 0);
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
        const distA = getActorDistance(actor, a);
        const distB = getActorDistance(actor, b);
        if (distA !== distB) return distA - distB;
        if (a.kind === 'player' && b.kind !== 'player') return -1;
        if (b.kind === 'player' && a.kind !== 'player') return 1;
        return String(a.uid).localeCompare(String(b.uid));
    });

    return candidates[0];
}

function getPathStepToward(combat, actor, target) {
    const cols = combat.gridSize.cols || 16;
    const rows = combat.gridSize.rows || 10;
    const actorSize = actor.size || 1;
    const collisionMatrix = buildCollisionMatrix(combat, actor);
    const queue = [{ x: actor.x, y: actor.y }];
    const visited = new Set([`${actor.x},${actor.y}`]);
    const parent = {};
    const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
    let targetNode = null;
    let closestNode = { x: actor.x, y: actor.y };
    let minDist = Infinity;
    let searchCount = 0;
    const searchLimit = 80;

    while (queue.length > 0 && searchCount < searchLimit) {
        searchCount++;
        const curr = queue.shift();
        const d = getGridDistance(target.x, target.y, curr.x, curr.y, actorSize);
        let hasLos = false;
        if (d <= (actor.attackRange || 1)) {
            for (let bx = curr.x; bx < curr.x + actorSize; bx++) {
                for (let by = curr.y; by < curr.y + actorSize; by++) {
                    if (hasLineOfSightMatrix(collisionMatrix, bx, by, target.x, target.y)) hasLos = true;
                }
            }
        }

        if (d < minDist) { minDist = d; closestNode = curr; }
        if (d <= (actor.attackRange || 1) && hasLos) { targetNode = curr; break; }

        for (const dir of dirs) {
            const nx = curr.x + dir.x; const ny = curr.y + dir.y; const key = `${nx},${ny}`;
            if (visited.has(key)) continue;
            visited.add(key);

            let blocked = false;
            for (let bx = nx; bx < nx + actorSize; bx++) {
                for (let by = ny; by < ny + actorSize; by++) {
                    if (bx < 0 || bx >= cols || by < 0 || by >= rows) blocked = true;
                    else if (collisionMatrix[bx][by] > 0) blocked = true;
                }
            }

            if (!blocked) {
                parent[key] = curr;
                queue.push({ x: nx, y: ny });
            }
        }
    }

    if (!targetNode) targetNode = closestNode;
    if (targetNode.x === actor.x && targetNode.y === actor.y) return null;
    let step = targetNode;
    while (parent[`${step.x},${step.y}`] && (parent[`${step.x},${step.y}`].x !== actor.x || parent[`${step.x},${step.y}`].y !== actor.y)) {
        step = parent[`${step.x},${step.y}`];
    }
    return step;
}

function moveTowardTarget(combat, actor, target, turnEvents, maxSteps = actor.speed || 1) {
    let steps = Math.max(0, Math.min(actor.speed || 1, maxSteps));
    let movedSteps = 0;
    while (steps > 0) {
        const dist = getActorDistance(actor, target);
        if (dist <= (actor.attackRange || 1) && actorHasLineOfSight(combat, actor, target)) break;

        const nextStep = getPathStepToward(combat, actor, target);
        if (!nextStep) break;
        actor.x = nextStep.x;
        actor.y = nextStep.y;
        turnEvents.push({ type: 'move', uid: actor.uid, actorId: actor.id, name: actor.name, finalX: actor.x, finalY: actor.y });
        movedSteps++;
        steps--;
    }
    return movedSteps;
}

function moveAwayFromTarget(combat, actor, threat, turnEvents, maxSteps = actor.speed || 1) {
    const cols = combat.gridSize.cols || 16;
    const rows = combat.gridSize.rows || 10;
    let steps = Math.max(0, Math.min(actor.speed || 1, maxSteps));
    let movedSteps = 0;

    while (steps > 0) {
        const collisionMatrix = buildCollisionMatrix(combat, actor);
        const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
        let best = null;
        let bestDistance = getActorDistance(actor, threat);

        dirs.forEach(dir => {
            const nx = actor.x + dir.x;
            const ny = actor.y + dir.y;
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return;
            if (collisionMatrix[nx] && collisionMatrix[nx][ny] > 0) return;
            const distance = getGridDistance(threat.x, threat.y, nx, ny, actor.size || 1);
            if (distance > bestDistance) {
                bestDistance = distance;
                best = { x: nx, y: ny };
            }
        });

        if (!best) break;
        actor.x = best.x;
        actor.y = best.y;
        turnEvents.push({ type: 'move', uid: actor.uid, actorId: actor.id, name: actor.name, finalX: actor.x, finalY: actor.y });
        movedSteps++;
        steps--;
    }
    return movedSteps;
}

function getAffordableMoveSteps(actor, player) {
    const speed = Math.max(1, Math.trunc(Number(actor.speed) || 1));
    for (let steps = speed; steps > 0; steps--) {
        if (canSpendActorStamina(actor, player, getMoveStaminaCost(steps, speed))) return steps;
    }
    return 0;
}

function performMoveAction(combat, actor, target, player, turnEvents, moveAway = false) {
    const maxSteps = getAffordableMoveSteps(actor, player);
    if (maxSteps <= 0) return false;

    const eventStart = turnEvents.length;
    const movedSteps = moveAway
        ? moveAwayFromTarget(combat, actor, target, turnEvents, maxSteps)
        : moveTowardTarget(combat, actor, target, turnEvents, maxSteps);
    if (movedSteps <= 0) return false;

    const staminaCost = getMoveStaminaCost(movedSteps, actor.speed || 1);
    spendActorStamina(actor, player, staminaCost);
    for (let index = eventStart; index < turnEvents.length; index++) {
        turnEvents[index].stamina = getActorStamina(actor, player);
        turnEvents[index].maxStamina = getActorMaxStamina(actor, player);
    }
    return true;
}

function restActor(actor, player, turnEvents) {
    const recovered = recoverActorStamina(actor, player);
    turnEvents.push({
        type: 'rest',
        uid: actor.uid,
        actorId: actor.id,
        name: actor.name,
        recovered,
        stamina: getActorStamina(actor, player),
        maxStamina: getActorMaxStamina(actor, player)
    });
    return true;
}


function buildAttackFx(actor) {
    const isRangedAttack = actor.type === 'RANGED' || !!actor.projectileSprite || !!actor.spellFx;
    return {
        isRangedAttack,
        projectileSprite: actor.projectileSprite || (actor.type === 'RANGED' && !actor.spellFx ? 'icon_arrow' : null),
        spellFx: actor.spellFx,
        spellId: actor.spellId,
        ex: actor.x,
        ey: actor.y
    };
}

function pushDeflectEvent(actor, target, turnEvents, attackFx) {
    if (isPlayerActor(target)) {
        turnEvents.push({ type: 'deflect', uid: actor.uid, enemyName: actor.name, ...attackFx });
    } else {
        turnEvents.push({
            type: 'actorDeflect',
            sourceUid: actor.uid,
            sourceName: actor.name,
            targetUid: target.uid,
            targetName: target.name,
            tx: target.x,
            ty: target.y,
            ...attackFx
        });
    }
}

function pushHitEvent(actor, target, player, damage, isCrit, poisonApplied, killed, turnEvents, attackFx) {
    if (isPlayerActor(target)) {
        turnEvents.push({
            type: 'hit',
            uid: actor.uid,
            enemyName: actor.name,
            damage,
            isCrit,
            statusApplied: poisonApplied ? 'poison' : null,
            playerStatusEffects: player.statusEffects,
            ...attackFx
        });
        return;
    }

    turnEvents.push({
        type: 'actorHit',
        sourceUid: actor.uid,
        sourceName: actor.name,
        sourceTeamId: actor.teamId,
        targetUid: target.uid,
        targetName: target.name,
        targetTeamId: target.teamId,
        damage,
        isCrit,
        killed,
        statusApplied: poisonApplied ? 'poison' : null,
        statusEffects: target.statusEffects,
        tx: target.x,
        ty: target.y,
        ...attackFx
    });
}

function attackTarget(socketId, combat, player, actor, target, activeCombats, onActorDefeated, turnEvents) {
    const dist = getActorDistance(actor, target);
    if (dist > (actor.attackRange || 1) || !actorHasLineOfSight(combat, actor, target)) return false;

    const staminaCost = getActorAttackStaminaCost(actor);
    if (!spendActorStamina(actor, player, staminaCost)) return false;
    const attackFx = {
        ...buildAttackFx(actor),
        stamina: getActorStamina(actor, player),
        maxStamina: getActorMaxStamina(actor, player)
    };
    const offense = Math.max(1, getActorStat(actor, player, 'offense')) * 10;
    const defenderSpeed = Math.max(1, getActorStat(target, player, 'speed')) * 10;
    const defenderDefense = Math.max(0, getActorStat(target, player, 'defense')) * 10;
    const hitPower = (offense * 0.5) + (Math.random() * offense * 0.5);
    const speedMitigation = Math.random() * defenderSpeed;

    if ((hitPower - speedMitigation) <= 0) {
        pushDeflectEvent(actor, target, turnEvents, attackFx);
        return true;
    }

    const rawDamageRoll = Math.sqrt(Math.random()) * offense;
    const armorAbsorption = Math.pow(Math.random(), 2) * defenderDefense;
    const damage = Math.floor(rawDamageRoll - armorAbsorption);

    if (damage <= 0) {
        pushDeflectEvent(actor, target, turnEvents, attackFx);
        return true;
    }

    const isCrit = damage >= Math.floor(offense * 0.90);
    setActorHp(target, player, getActorHp(target, player) - damage);

    const poisonTarget = isPlayerActor(target) ? player : target;
    const poisonApplied = applyPoison(poisonTarget, {
        chance: actor.poisonChance || 0,
        turns: actor.poisonTurns || 3,
        fallbackDamage: Math.max(2, Math.floor((actor.offense || 1) * 2)),
        sourceActor: actor
    });

    let killed = false;
    if (getActorHp(target, player) <= 0) {
        killed = true;
    }

    pushHitEvent(actor, target, player, damage, isCrit, poisonApplied, killed, turnEvents, attackFx);
    if (killed) defeatActor(socketId, combat, player, target, activeCombats, onActorDefeated, turnEvents, actor);
    return true;
}

function executeHealerTurn(socketId, combat, player, actor, activeCombats, onActorDefeated) {
    const turnEvents = [];
    const playerTarget = (combat.actors || []).find(candidate => candidate.kind === 'player');
    const playerMaxHp = getMaxHp(player);
    const healRange = actor.healRange || 6;
    actor.healCooldown = Math.max(0, (actor.healCooldown || 0) - 1);

    for (let actionIndex = 0; actionIndex < ACTIONS_PER_TURN; actionIndex++) {
        if (!activeCombats[socketId] || !isActorAlive(actor) || player.hp <= 0) break;
        let acted = false;
        const playerNeedsHealing = player.hp < Math.floor(playerMaxHp * 0.70);

        if (playerTarget && playerNeedsHealing && actor.healCooldown <= 0) {
            const dist = getActorDistance(actor, playerTarget);
            if (dist <= healRange && actorHasLineOfSight(combat, actor, playerTarget)) {
                const healCost = getActorHealStaminaCost(actor);
                if (!spendActorStamina(actor, player, healCost)) {
                    restActor(actor, player, turnEvents);
                    continue;
                }

                const amount = Math.max(20, Math.floor(playerMaxHp * 0.22));
                const before = player.hp;
                setActorHp(playerTarget, player, player.hp + amount);
                actor.healCooldown = 2;
                turnEvents.push({
                    type: 'heal',
                    sourceUid: actor.uid,
                    sourceName: actor.name,
                    targetType: 'player',
                    amount: player.hp - before,
                    hp: player.hp,
                    maxHp: playerMaxHp,
                    stamina: getActorStamina(actor, player),
                    maxStamina: getActorMaxStamina(actor, player),
                    sx: actor.x,
                    sy: actor.y,
                    tx: playerTarget.x,
                    ty: playerTarget.y
                });
                acted = true;
            } else {
                acted = performMoveAction(combat, actor, playerTarget, player, turnEvents);
                if (!acted) restActor(actor, player, turnEvents);
                continue;
            }
        }

        if (!acted) {
            const threat = selectAttackTarget(combat, actor, player);
            if (threat && getActorDistance(actor, threat) <= 4) {
                acted = performMoveAction(combat, actor, threat, player, turnEvents, true);
            } else if (playerTarget && getActorDistance(actor, playerTarget) > healRange) {
                acted = performMoveAction(combat, actor, playerTarget, player, turnEvents);
            }
        }

        if (!acted) restActor(actor, player, turnEvents);
    }

    return turnEvents;
}

function executeActorTurn(socketId, combat, player, actor, activeCombats, onActorDefeated) {
    if (!isActorAlive(actor) || player.hp <= 0) return [];
    ensureActorStamina(actor, isPlayerActor(actor) ? player : null);

    if (actor.controller === 'ai_healer') {
        return executeHealerTurn(socketId, combat, player, actor, activeCombats, onActorDefeated);
    }

    const turnEvents = [];
    for (let actionIndex = 0; actionIndex < ACTIONS_PER_TURN; actionIndex++) {
        if (!activeCombats[socketId] || !isActorAlive(actor) || player.hp <= 0) break;
        const target = selectAttackTarget(combat, actor, player);
        if (!target) break;

        const inRange = getActorDistance(actor, target) <= (actor.attackRange || 1)
            && actorHasLineOfSight(combat, actor, target);
        let acted = false;

        if (inRange && canSpendActorStamina(actor, player, getActorAttackStaminaCost(actor))) {
            acted = attackTarget(socketId, combat, player, actor, target, activeCombats, onActorDefeated, turnEvents);
        } else if (!inRange) {
            acted = performMoveAction(combat, actor, target, player, turnEvents);
        }

        if (!acted) restActor(actor, player, turnEvents);
    }

    return turnEvents;
}

module.exports = {
    executeActorTurn
};
