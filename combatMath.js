// --- combatMath.js ---
// Shared server-side combat geometry and stat helpers.

const { ItemDatabase } = require('./public/js/items.js');

function getGridDistance(x1, y1, x2, y2, size2 = 1) {
    const closeX = Math.max(x2, Math.min(x1, x2 + size2 - 1));
    const closeY = Math.max(y2, Math.min(y1, y2 + size2 - 1));
    return Math.max(Math.abs(x1 - closeX), Math.abs(y1 - closeY));
}

function checkLineOfSight(x1, y1, x2, y2, combatState) {
    let dx = Math.abs(x2 - x1); let dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1; let sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy; let cx = x1; let cy = y1;

    while (true) {
        if (cx === x2 && cy === y2) return true;
        if (cx !== x1 || cy !== y1) {
            if (combatState.obstacles.some(o => o.x === cx && o.y === cy)) return false;
        }
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
    }
}

function getLineOfEffectPath(x1, y1, x2, y2, maxRange, stopsAtWalls, combatState) {
    const path = [];
    let dx = Math.abs(x2 - x1); let dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1; let sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy; let cx = x1; let cy = y1;
    let distanceTraveled = 0;

    while (distanceTraveled <= maxRange) {
        if (cx !== x1 || cy !== y1) {
            path.push({ x: cx, y: cy });
            if (stopsAtWalls && combatState.obstacles.some(o => o.x === cx && o.y === cy)) break;
        }
        if (cx === x2 && cy === y2) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
        distanceTraveled++;
    }
    return path;
}

function getEffectiveStat(player, statKey) {
    let base = player[statKey] || 1;
    let flatBonus = 0;
    let multiplier = 1.0;

    for (const slot in player.equipment) {
        const item = player.equipment[slot];
        if (item) {
            if (statKey === 'offense' && item.offense) flatBonus += item.offense;
            if (statKey === 'defense' && item.defense) flatBonus += item.defense;
            if (statKey === 'speed' && item.speed) flatBonus += item.speed;
            if (statKey === 'vitality' && item.vitality) flatBonus += item.vitality;
            if (statKey === 'maxStamina' && item.stamina) flatBonus += item.stamina;
        }
    }

    if (player.activeBuffs && player.activeBuffs.length > 0) {
        player.activeBuffs.forEach(buffId => {
            const buffData = ItemDatabase[String(buffId).toLowerCase()];
            if (buffData && buffData.combat && buffData.combat.effectCategory === statKey) {
                if (buffData.combat.effectType === 'flat') {
                    flatBonus += buffData.combat.effectValue;
                } else if (buffData.combat.effectType === 'multiplier') {
                    multiplier *= buffData.combat.effectValue;
                }
            }
        });
    }

    return Math.floor((base + flatBonus) * multiplier);
}

function getMaxHp(player) {
    return getEffectiveStat(player, 'vitality') * 25;
}

function getMaxStamina(player) {
    return getEffectiveStat(player, 'maxStamina') * 25;
}

module.exports = {
    getGridDistance,
    checkLineOfSight,
    getLineOfEffectPath,
    getEffectiveStat,
    getMaxHp,
    getMaxStamina
};
