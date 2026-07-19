// --- questRouter.js ---
// Server-side quest authorization, completion, and reward routing.

const crypto = require('crypto');
const mongoose = require('mongoose');
const { sanitizeToken } = require('./serverSecurity.js');
const { getQuestDefinition } = require('./questDefinitions.js');
const { sanitizeLifetimeXp } = require('./xpMath.js');
const { applyLifetimeXpLevelUps } = require('./playerProgression.js');
const { normalizeRosterState } = require('./companionRoster.js');

function ensureQuestState(player) {
    if (!player.quests || typeof player.quests !== 'object') {
        player.quests = { completed: {} };
    }
    if (!player.quests.completed || typeof player.quests.completed !== 'object') {
        player.quests.completed = {};
    }
}

function meetsRequirements(player, questDef) {
    const requirements = questDef.requirements || {};
    if (requirements.minLevel && (player.level || 1) < requirements.minLevel) return false;
    return true;
}

function sanitizeRequiredCompanionIds(values) {
    if (!Array.isArray(values)) return null;

    const companionIds = [];
    values.forEach(value => {
        const companionId = sanitizeToken(value, '');
        if (companionId && !companionIds.includes(companionId)) {
            companionIds.push(companionId);
        }
    });
    return companionIds;
}

function applyQuestRewards(player, rewards) {
    if (!rewards) return [];

    const granted = [];
    if (Number.isInteger(rewards.gold) && rewards.gold > 0) {
        player.gold = (player.gold || 0) + rewards.gold;
        granted.push({ type: 'gold', amount: rewards.gold });
    }
    if (Number.isInteger(rewards.xp) && rewards.xp > 0) {
        player.xp = sanitizeLifetimeXp(player.xp) + rewards.xp;
        applyLifetimeXpLevelUps(player);
        granted.push({ type: 'xp', amount: rewards.xp });
    }

    return granted;
}

function createQuestSaveSnapshot(playerState) {
    const snapshot = JSON.parse(JSON.stringify(playerState || {}));

    delete snapshot.activeMinigame;
    delete snapshot._lastMinigameClaim;
    delete snapshot.tradeStaging;
    delete snapshot.tradeResources;
    delete snapshot.tradeLocked;
    delete snapshot.tradeConfirmed;
    delete snapshot.activeTradePartner;
    delete snapshot.activeQuestSession;
    delete snapshot.currentZone;
    delete snapshot.socialX;
    delete snapshot.socialY;

    return snapshot;
}

async function persistQuestProgress(player) {
    if (!player || !player.username) return;

    try {
        const Player = mongoose.model('Player');
        await Player.findOneAndUpdate(
            { username: player.username },
            { saveData: createQuestSaveSnapshot(player) }
        );
    } catch (err) {
        console.error('Quest progress save failed:', err.message);
    }
}

module.exports = function injectQuestRouter(socket, io, activePlayers) {
    socket.on('questStartRequest', (data = {}) => {
        const player = activePlayers[socket.id];
        if (!player) {
            return socket.emit('questStartReceipt', {
                success: false,
                message: 'Quest system unavailable. Please reconnect.'
            });
        }

        const questId = sanitizeToken(data.questId, '');
        const questDef = getQuestDefinition(questId);
        if (!questDef) {
            return socket.emit('questStartReceipt', {
                success: false,
                message: 'Unknown quest.'
            });
        }

        ensureQuestState(player);

        if (questDef.persistCompletion && player.quests.completed[questId]) {
            return socket.emit('questStartReceipt', {
                success: false,
                message: 'Quest already completed.'
            });
        }

        if (!meetsRequirements(player, questDef)) {
            return socket.emit('questStartReceipt', {
                success: false,
                message: 'Quest requirements not met.'
            });
        }

        const completionToken = crypto.randomUUID();
        const requiredCompanionIds = sanitizeRequiredCompanionIds(questDef.requiredCompanionIds);
        const hasRequiredCompanions = Array.isArray(requiredCompanionIds) && requiredCompanionIds.length > 0;
        player.activeQuestSession = {
            questId,
            completionToken,
            startedAt: Date.now(),
            ...(hasRequiredCompanions ? { requiredCompanionIds } : {})
        };
        normalizeRosterState(player);

        socket.emit('questStartReceipt', {
            success: true,
            questId,
            scriptId: questDef.scriptId,
            title: questDef.title,
            type: questDef.type,
            completionToken,
            persistCompletion: !!questDef.persistCompletion,
            hasRewards: !!questDef.rewards,
            ...(hasRequiredCompanions ? { requiredCompanionIds } : {})
        });
    });

    socket.on('questCompleteRequest', async (data = {}) => {
        const player = activePlayers[socket.id];
        if (!player) {
            return socket.emit('questCompleteReceipt', {
                success: false,
                message: 'Quest system unavailable. Please reconnect.'
            });
        }

        const questId = sanitizeToken(data.questId, '');
        const token = typeof data.completionToken === 'string' ? data.completionToken : '';
        const session = player.activeQuestSession;
        const questDef = getQuestDefinition(questId);

        if (!questDef || !session || session.questId !== questId || session.completionToken !== token) {
            return socket.emit('questCompleteReceipt', {
                success: false,
                message: 'Quest completion rejected.'
            });
        }

        ensureQuestState(player);

        let grantedRewards = [];
        if (questDef.persistCompletion && !player.quests.completed[questId]) {
            player.quests.completed[questId] = new Date().toISOString();
            grantedRewards = applyQuestRewards(player, questDef.rewards);
        }

        delete player.activeQuestSession;

        if (grantedRewards.length || questDef.persistCompletion) {
            await persistQuestProgress(player);
        }

        socket.emit('questCompleteReceipt', {
            success: true,
            questId,
            rewards: grantedRewards,
            completionAction: questDef.completionAction || null,
            updatedPlayer: grantedRewards.length || questDef.persistCompletion ? player : null,
            message: grantedRewards.length ? 'Quest complete. Rewards granted.' : 'Quest complete.'
        });
    });
};
