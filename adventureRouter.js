// --- adventureRouter.js ---
// Server-authoritative exploration, expedition, and contract socket wiring.

const { sanitizeToken } = require('./serverSecurity.js');
const { createAuthoredCombatEncounter } = require('./combatEncounters.js');
const { getMaxHp, getMaxStamina } = require('./combatMath.js');
const { RouteCatalog } = require('./adventureCatalog.js');
const { TownStockCatalog } = require('./worldCatalog.js');
const {
    ensureWorldState,
    getAvailableTownServiceIds,
    getAvailableTownStockEntries
} = require('./worldState.js');
const { purchaseChapterOneStockItem } = require('./chapterOneTownEconomy.js');
const { recruitChapterOneCompanion } = require('./chapterOneCompanions.js');
const {
    normalizeAdventureState,
    getAdventureSnapshot,
    beginExpedition,
    beginReturnTrip,
    failActiveExpedition,
    hasActiveJourney
} = require('./adventureState.js');
const {
    resolveDestinationInteraction,
    acceptChapterOneContract,
    claimChapterOneContract,
    claimChapterOneRewardChoice,
    selectChapterOneFinalePreparation
} = require('./chapterOneWorld.js');

function actionSucceeded(result) {
    if (!result || typeof result !== 'object') return false;
    if (Object.prototype.hasOwnProperty.call(result, 'success')) return result.success === true;
    if (Object.prototype.hasOwnProperty.call(result, 'ok')) return result.ok === true;
    return true;
}

function getActionMessage(result, fallback) {
    return result && typeof result.message === 'string' && result.message.trim()
        ? result.message
        : fallback;
}

function emitAdventureState(socket, player) {
    const snapshot = getAdventureSnapshot(player);
    socket.emit('adventureState', snapshot);
    return snapshot;
}

function buildAdventureReceipt(action, result, player, overrides = {}) {
    const source = result && typeof result === 'object' ? result : {};
    const receipt = {
        ...source,
        action,
        success: actionSucceeded(source),
        adventureState: getAdventureSnapshot(player),
        ...overrides
    };

    // The encounter descriptor is server-only. The client only receives the
    // resolved encounter id and the public combat state after deployment.
    delete receipt.expeditionContext;
    return receipt;
}

function rejectAction(socket, player, action, message, code) {
    const result = {
        success: false,
        code,
        message
    };
    socket.emit('adventureReceipt', buildAdventureReceipt(action, result, player));
    emitAdventureState(socket, player);
    return result;
}

function preparePlayerForAdventureCombat(player) {
    delete player.pendingMercenaryXpContext;
    player.statusEffects = {};
    player.activeBuffs = [];
    player.activeCombatBuff = null;
}

function deployResolvedEncounter(socket, player, activeCombats, action, result) {
    const encounterId = sanitizeToken(result && result.encounterId, '');
    if (!encounterId) return { deployed: false, combat: null };

    const expeditionContext = result && result.expeditionContext && typeof result.expeditionContext === 'object'
        ? result.expeditionContext
        : {};
    const combatState = createAuthoredCombatEncounter(player, encounterId, {
        ...expeditionContext,
        encounterId
    });

    if (!combatState) {
        const failure = failActiveExpedition(player, 'deployment_error');
        const message = 'The selected route could not produce a valid encounter.';
        socket.emit('adventureReceipt', buildAdventureReceipt(action, failure, player, {
            success: false,
            code: 'ENCOUNTER_DEPLOYMENT_FAILED',
            message
        }));
        emitAdventureState(socket, player);
        return { deployed: false, combat: null, failed: true };
    }

    preparePlayerForAdventureCombat(player);
    activeCombats[socket.id] = combatState;
    return { deployed: true, combat: combatState };
}

module.exports = function registerAdventureRouter(
    socket,
    io,
    activePlayers,
    activeCombats,
    persistPlayer
) {
    function getPlayer(action) {
        const player = activePlayers[socket.id];
        if (!player) {
            socket.emit('adventureReceipt', {
                action,
                success: false,
                code: 'PLAYER_NOT_FOUND',
                message: 'Adventure state is unavailable. Please sign in again.'
            });
            return null;
        }
        // Normalization during an authenticated session must preserve the
        // active journey. Login hydration explicitly recovers an interrupted
        // combat as a failed trip because its in-memory battle no longer exists.
        normalizeAdventureState(player, { recoverInterruptedJourney: false });
        return player;
    }

    function rejectCombatConflict(player, action) {
        if (!activeCombats[socket.id]) return false;
        rejectAction(
            socket,
            player,
            action,
            'Finish or flee the current combat before changing the expedition.',
            'ACTIVE_COMBAT'
        );
        return true;
    }

    function finishAction(player, action, result, successMessage) {
        const receipt = buildAdventureReceipt(action, result, player, {
            message: getActionMessage(result, successMessage),
            updatedPlayer: player
        });
        socket.emit('adventureReceipt', receipt);
        emitAdventureState(socket, player);
        if (receipt.success && typeof persistPlayer === 'function') {
            void Promise.resolve(persistPlayer(player, { reason: action })).catch(() => undefined);
        }
        return receipt;
    }

    function beginJourneyAction(action, operation, resolveRouteId) {
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        const routeId = typeof resolveRouteId === 'function'
            ? resolveRouteId(player)
            : null;
        const route = routeId && RouteCatalog[routeId];
        if (route && route.chapterStatus !== 'active') {
            rejectAction(
                socket,
                player,
                action,
                'That road is not available in this chapter.',
                'INACTIVE_ROUTE'
            );
            return;
        }

        const result = operation(player);
        if (!actionSucceeded(result)) {
            finishAction(player, action, result, 'That expedition action is not available.');
            return;
        }

        const deployment = deployResolvedEncounter(
            socket,
            player,
            activeCombats,
            action,
            result
        );
        if (deployment.failed) return;

        finishAction(player, action, result, 'Expedition state updated.');
        if (deployment.deployed) {
            io.to(socket.id).emit('combatDeployed', deployment.combat);
        }
    }

    socket.on('requestAdventureState', () => {
        const player = getPlayer('requestAdventureState');
        if (!player) return;
        emitAdventureState(socket, player);
    });

    socket.on('startExpedition', (data = {}) => {
        const routeId = sanitizeToken(data && data.routeId, '');
        beginJourneyAction(
            'startExpedition',
            player => beginExpedition(player, routeId),
            () => routeId
        );
    });

    socket.on('beginExpeditionReturn', () => {
        beginJourneyAction(
            'beginExpeditionReturn',
            player => beginReturnTrip(player),
            player => player.adventure && player.adventure.activeJourney
                ? player.adventure.activeJourney.routeId
                : null
        );
    });

    socket.on('resolveDestinationInteraction', (data = {}) => {
        const action = 'resolveDestinationInteraction';
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        const interactionId = sanitizeToken(data && data.interactionId, '');
        const result = resolveDestinationInteraction(player, interactionId);
        finishAction(player, action, result, 'Destination investigated.');
    });

    socket.on('abandonExpedition', () => {
        const action = 'abandonExpedition';
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        if (!hasActiveJourney(player)) {
            rejectAction(socket, player, action, 'There is no active expedition to abandon.', 'NO_ACTIVE_JOURNEY');
            return;
        }

        const result = failActiveExpedition(player, 'abandoned');
        player.hp = getMaxHp(player);
        player.stamina = getMaxStamina(player);
        player.statusEffects = {};
        player.activeBuffs = [];
        player.activeCombatBuff = null;
        finishAction(player, action, result, 'The expedition was abandoned.');
    });

    socket.on('acceptContract', (data = {}) => {
        const action = 'acceptContract';
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        const contractId = sanitizeToken(data && data.contractId, '');
        const result = acceptChapterOneContract(player, contractId);
        finishAction(player, action, result, 'Contract accepted.');
    });

    socket.on('claimContract', (data = {}) => {
        const action = 'claimContract';
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        const contractId = sanitizeToken(data && data.contractId, '');
        const result = claimChapterOneContract(player, contractId);
        finishAction(player, action, result, 'Contract reward claimed.');
    });

    socket.on('claimWorldRewardChoice', (data = {}) => {
        const action = 'claimWorldRewardChoice';
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        const rewardChoiceId = sanitizeToken(data && data.rewardChoiceId, '');
        const optionId = sanitizeToken(data && data.optionId, '');
        const result = claimChapterOneRewardChoice(player, rewardChoiceId, optionId);
        finishAction(player, action, result, 'Equipment choice collected.');
    });

    socket.on('purchaseChapterOneStock', (data = {}) => {
        const action = 'purchaseChapterOneStock';
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        if (hasActiveJourney(player)) {
            rejectAction(socket, player, action, 'Return to the pub before buying equipment.', 'AWAY_FROM_PUB');
            return;
        }
        const stockId = sanitizeToken(data && data.stockId, '');
        const world = ensureWorldState(player);
        const availableEntry = getAvailableTownStockEntries(world)
            .find(entry => entry.id === stockId);
        // Resolve through the immutable catalog only after the world-domain
        // availability check; clients can never submit price or item data.
        const result = purchaseChapterOneStockItem(
            player,
            availableEntry ? TownStockCatalog[availableEntry.id] : null
        );
        finishAction(player, action, result, 'Quartermaster purchase completed.');
    });

    socket.on('recruitChapterOneNpc', (data = {}) => {
        const action = 'recruitChapterOneNpc';
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        if (hasActiveJourney(player)) {
            rejectAction(socket, player, action, 'Return to the pub before changing the party.', 'AWAY_FROM_PUB');
            return;
        }
        const npcId = sanitizeToken(data && data.npcId, '');
        const availableServices = new Set(getAvailableTownServiceIds(ensureWorldState(player)));
        if (npcId !== 'marlow' || !availableServices.has('marlow_road_watch')) {
            rejectAction(socket, player, action, 'That named companion is not ready to join.', 'RECRUITMENT_LOCKED');
            return;
        }
        const result = recruitChapterOneCompanion(player, npcId);
        finishAction(player, action, result, 'Named companion recruited.');
    });

    socket.on('selectChapterOneFinalePreparation', (data = {}) => {
        const action = 'selectChapterOneFinalePreparation';
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        if (hasActiveJourney(player)) {
            rejectAction(socket, player, action, 'Return to the pub before changing the watchhouse plan.', 'AWAY_FROM_PUB');
            return;
        }
        const optionId = sanitizeToken(data && data.optionId, '');
        const result = selectChapterOneFinalePreparation(player, optionId);
        finishAction(player, action, result, 'Watchhouse approach selected.');
    });
};
