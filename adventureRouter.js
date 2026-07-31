// --- adventureRouter.js ---
// Server-authoritative exploration, expedition, and bounty socket wiring.

const { sanitizeToken } = require('./serverSecurity.js');
const { createAuthoredCombatEncounter } = require('./combatEncounters.js');
const {
    normalizeAdventureState,
    getAdventureSnapshot,
    beginExpedition,
    beginReturnTrip,
    failActiveExpedition,
    acceptBounty,
    claimBounty,
    hasActiveJourney
} = require('./adventureState.js');

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
    player.idleJob = 'NONE';
    delete player.pendingMercenaryXpContext;
    player.statusEffects = {};
    player.activeBuffs = [];
    player.activeCombatBuff = null;
}

function deployResolvedEncounter(socket, io, player, activeCombats, action, result) {
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

module.exports = function registerAdventureRouter(socket, io, activePlayers, activeCombats) {
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
            message: getActionMessage(result, successMessage)
        });
        socket.emit('adventureReceipt', receipt);
        emitAdventureState(socket, player);
        return receipt;
    }

    function beginJourneyAction(action, operation) {
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;

        const result = operation(player);
        if (!actionSucceeded(result)) {
            finishAction(player, action, result, 'That expedition action is not available.');
            return;
        }

        const deployment = deployResolvedEncounter(
            socket,
            io,
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
            player => beginExpedition(player, routeId)
        );
    });

    socket.on('beginExpeditionReturn', () => {
        beginJourneyAction(
            'beginExpeditionReturn',
            player => beginReturnTrip(player)
        );
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
        finishAction(player, action, result, 'The expedition was abandoned.');
    });

    socket.on('acceptBounty', (data = {}) => {
        const action = 'acceptBounty';
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        const bountyId = sanitizeToken(data && data.bountyId, '');
        const result = acceptBounty(player, bountyId);
        finishAction(player, action, result, 'Bounty accepted.');
    });

    socket.on('claimBounty', (data = {}) => {
        const action = 'claimBounty';
        const player = getPlayer(action);
        if (!player || rejectCombatConflict(player, action)) return;
        const bountyId = sanitizeToken(data && data.bountyId, '');
        const result = claimBounty(player, bountyId);
        finishAction(player, action, result, 'Bounty reward claimed.');
    });
};
