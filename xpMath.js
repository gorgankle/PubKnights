// --- xpMath.js ---
// Shared server-side XP curve helpers. XP is stored as a lifetime total.

const MAX_PLAYER_LEVEL = 50;
const SP_PER_LEVEL = 5;

function normalizeLevel(level) {
    return Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(Number(level) || 1)));
}

function sanitizeLifetimeXp(xp) {
    return Math.max(0, Math.floor(Number(xp) || 0));
}

function getXpRequirementForLevel(level) {
    const currentLevel = normalizeLevel(level);
    if (currentLevel <= 1) return 100;

    const base = 100;
    const multiplier = Math.pow(1.15, currentLevel - 1);
    const flatBump = currentLevel * 50;
    return Math.floor((base * multiplier) + flatBump);
}

function getTotalXpForLevel(level) {
    const targetLevel = normalizeLevel(level);
    let total = 0;

    for (let currentLevel = 1; currentLevel < targetLevel; currentLevel++) {
        total += getXpRequirementForLevel(currentLevel);
    }

    return total;
}

function getTotalXpForNextLevel(level) {
    const currentLevel = normalizeLevel(level);
    if (currentLevel >= MAX_PLAYER_LEVEL) return "MAX";
    return getTotalXpForLevel(currentLevel + 1);
}

module.exports = {
    MAX_PLAYER_LEVEL,
    SP_PER_LEVEL,
    normalizeLevel,
    sanitizeLifetimeXp,
    getXpRequirementForLevel,
    getTotalXpForLevel,
    getTotalXpForNextLevel
};
