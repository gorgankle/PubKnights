// --- playerProgression.js ---
// Secure server-side player level progression from lifetime XP.

const {
    MAX_PLAYER_LEVEL,
    SP_PER_LEVEL,
    normalizeLevel,
    sanitizeLifetimeXp,
    getTotalXpForLevel,
    getTotalXpForNextLevel
} = require('./xpMath.js');
const { getMaxHp, getMaxStamina } = require('./combatMath.js');

function applyLifetimeXpLevelUps(player, options = {}) {
    const awardSkillPoints = options.awardSkillPoints !== false;
    const restoreVitals = options.restoreVitals !== false;
    let levelsGained = 0;

    if (!player) return { player, levelsGained };

    player.level = normalizeLevel(player.level);
    player.xp = sanitizeLifetimeXp(player.xp);

    if (player.level >= MAX_PLAYER_LEVEL) {
        const maxLevelFloor = getTotalXpForLevel(MAX_PLAYER_LEVEL);
        if (player.xp < maxLevelFloor) {
            player.xp += maxLevelFloor;
        }
    }

    while (player.level < MAX_PLAYER_LEVEL) {
        const nextLevelXp = getTotalXpForNextLevel(player.level);
        if (nextLevelXp === "MAX" || player.xp < nextLevelXp) break;

        player.level += 1;
        levelsGained += 1;
        if (awardSkillPoints) {
            player.skillPoints = (player.skillPoints || 0) + SP_PER_LEVEL;
        }
    }

    player.xpToNext = getTotalXpForNextLevel(player.level);

    if (restoreVitals && levelsGained > 0) {
        player.hp = getMaxHp(player);
        player.stamina = getMaxStamina(player);
    }

    return { player, levelsGained };
}

module.exports = {
    applyLifetimeXpLevelUps
};
