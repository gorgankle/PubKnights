// --- mercenaryProgression.js ---
// Server-authoritative mercenary XP sharing and paid one-level training.

const {
    MAX_PLAYER_LEVEL,
    normalizeLevel,
    sanitizeLifetimeXp,
    getTotalXpForLevel,
    getTotalXpForNextLevel
} = require('./xpMath.js');

const ACTIVE_MERCENARY_XP_RATIO = 1;
const BENCHED_MERCENARY_XP_RATIO = 0.5;
const DEFAULT_TRAINING_GOLD_PER_TARGET_LEVEL = 150;

function getRosterCompanions(player) {
    return player && player.roster && Array.isArray(player.roster.companions)
        ? player.roster.companions
        : [];
}

function findMercenary(player, instanceId) {
    const requestedId = String(instanceId || '');
    if (!requestedId) return null;
    return getRosterCompanions(player).find(companion =>
        companion && companion.hired !== false && companion.instanceId === requestedId
    ) || null;
}

function normalizeMercenaryProgression(companion) {
    if (!companion || typeof companion !== 'object') return companion;
    companion.level = normalizeLevel(companion.level);
    companion.xp = sanitizeLifetimeXp(companion.xp);
    return companion;
}

function applyMercenaryLifetimeXpLevelUps(companion, knightLevel) {
    if (!companion) return { companion, levelsGained: 0 };

    normalizeMercenaryProgression(companion);
    const levelCap = Math.max(1, Math.min(MAX_PLAYER_LEVEL, normalizeLevel(knightLevel)));
    let levelsGained = 0;

    while (companion.level < levelCap) {
        const nextLevelXp = getTotalXpForNextLevel(companion.level);
        if (nextLevelXp === 'MAX' || companion.xp < nextLevelXp) break;
        companion.level += 1;
        levelsGained += 1;
    }

    companion.xpToNext = getTotalXpForNextLevel(companion.level);
    return { companion, levelsGained, levelCap };
}

function awardMercenaryEncounterXp(player, encounterXp, options = {}) {
    const earnedXp = sanitizeLifetimeXp(encounterXp);
    const roster = player && player.roster && typeof player.roster === 'object' ? player.roster : {};
    const activeIds = new Set(
        (Array.isArray(options.activeInstanceIds) ? options.activeInstanceIds : roster.activeIds || [])
            .map(value => String(value || ''))
            .filter(Boolean)
    );
    const eligibleIds = Array.isArray(options.eligibleInstanceIds)
        ? new Set(options.eligibleInstanceIds.map(value => String(value || '')))
        : null;
    const seenIds = new Set();
    const awards = [];

    getRosterCompanions(player).forEach(companion => {
        if (!companion || companion.hired === false || !companion.instanceId) return;
        if (seenIds.has(companion.instanceId)) return;
        if (eligibleIds && !eligibleIds.has(companion.instanceId)) return;
        seenIds.add(companion.instanceId);

        normalizeMercenaryProgression(companion);
        const active = activeIds.has(companion.instanceId);
        const ratio = active ? ACTIVE_MERCENARY_XP_RATIO : BENCHED_MERCENARY_XP_RATIO;
        const xpAwarded = Math.floor(earnedXp * ratio);
        companion.xp = sanitizeLifetimeXp(companion.xp + xpAwarded);
        const progression = applyMercenaryLifetimeXpLevelUps(companion, player && player.level);

        awards.push({
            instanceId: companion.instanceId,
            active,
            ratio,
            xpAwarded,
            levelsGained: progression.levelsGained,
            level: companion.level,
            xp: companion.xp
        });
    });

    return awards;
}

function trainingDecision(success, code, message, details = {}) {
    return {
        success,
        allowed: success,
        code,
        message,
        ...details
    };
}

function getMercenaryTrainingQuote(player, instanceId, options = {}) {
    if (!player) return trainingDecision(false, 'INVALID_PLAYER', 'Knight data is unavailable.');
    if (options.inCombat) {
        return trainingDecision(false, 'IN_COMBAT', 'Mercenaries can only train outside combat.');
    }

    const companion = findMercenary(player, instanceId);
    if (!companion) {
        return trainingDecision(false, 'NOT_FOUND', 'That mercenary is not on your roster.');
    }

    normalizeMercenaryProgression(companion);
    const knightLevel = normalizeLevel(player.level);
    const maxTrainingLevel = Math.max(1, Math.min(MAX_PLAYER_LEVEL, knightLevel - 1));
    const currentLevel = companion.level;
    const targetLevel = Math.min(MAX_PLAYER_LEVEL, currentLevel + 1);
    const configuredRate = Math.trunc(Number(options.goldPerTargetLevel));
    const goldPerTargetLevel = Number.isFinite(configuredRate) && configuredRate > 0
        ? configuredRate
        : DEFAULT_TRAINING_GOLD_PER_TARGET_LEVEL;
    const cost = goldPerTargetLevel * targetLevel;
    const details = {
        instanceId: companion.instanceId,
        currentLevel,
        targetLevel,
        maxTrainingLevel,
        knightLevel,
        goldPerTargetLevel,
        cost
    };

    if (currentLevel >= maxTrainingLevel || currentLevel >= MAX_PLAYER_LEVEL) {
        return trainingDecision(
            false,
            'TRAINING_CAP',
            `${companion.name || 'Mercenary'} cannot train above level ${maxTrainingLevel} while the Knight is level ${knightLevel}.`,
            details
        );
    }

    return trainingDecision(
        true,
        'AVAILABLE',
        `Train ${companion.name || 'Mercenary'} to level ${targetLevel} for ${cost} gold.`,
        details
    );
}

function trainMercenaryOneLevel(player, instanceId, options = {}) {
    const quote = getMercenaryTrainingQuote(player, instanceId, options);
    if (!quote.success) return quote;

    const availableGold = Math.max(0, Math.trunc(Number(player.gold) || 0));
    if (availableGold < quote.cost) {
        return trainingDecision(false, 'INSUFFICIENT_GOLD', `Training requires ${quote.cost} gold.`, {
            instanceId: quote.instanceId,
            currentLevel: quote.currentLevel,
            targetLevel: quote.targetLevel,
            maxTrainingLevel: quote.maxTrainingLevel,
            knightLevel: quote.knightLevel,
            goldPerTargetLevel: quote.goldPerTargetLevel,
            cost: quote.cost,
            availableGold
        });
    }

    const companion = findMercenary(player, quote.instanceId);
    player.gold = availableGold - quote.cost;
    companion.level = quote.targetLevel;
    companion.xp = Math.max(sanitizeLifetimeXp(companion.xp), getTotalXpForLevel(companion.level));
    companion.xpToNext = getTotalXpForNextLevel(companion.level);

    return trainingDecision(true, 'TRAINED', `${companion.name || 'Mercenary'} trained to level ${companion.level}.`, {
        instanceId: companion.instanceId,
        previousLevel: quote.currentLevel,
        currentLevel: companion.level,
        targetLevel: companion.level,
        maxTrainingLevel: quote.maxTrainingLevel,
        knightLevel: quote.knightLevel,
        goldPerTargetLevel: quote.goldPerTargetLevel,
        cost: quote.cost,
        goldRemaining: player.gold
    });
}

module.exports = {
    ACTIVE_MERCENARY_XP_RATIO,
    BENCHED_MERCENARY_XP_RATIO,
    DEFAULT_TRAINING_GOLD_PER_TARGET_LEVEL,
    normalizeMercenaryProgression,
    applyMercenaryLifetimeXpLevelUps,
    awardMercenaryEncounterXp,
    getMercenaryTrainingQuote,
    trainMercenaryOneLevel
};
