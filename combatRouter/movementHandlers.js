// Registration for the server-authoritative combat movement socket route.

const { clampInt } = require('../serverSecurity.js');
const { getGridDistance } = require('../combatMath.js');
const {
    getActorStamina: getActorStaminaValue,
    spendActorStamina,
    getMoveStaminaCost
} = require('../combatResources.js');
const { isCombatPlaybackLocked } = require('../combatPlayback.js');
const {
    syncCombatViews,
    getAliveActors,
    isPlayerActor,
    isBlockingActor
} = require('../combatActors.js');
const { clearActivePartyActor } = require('../combatParties.js');

module.exports = function registerMovementHandlers({
    socket,
    activePlayers,
    activeCombats,
    shared
}) {
    const {
        getCombatTurnActor,
        getActorStatValue,
        completePlayerControlledAction
    } = shared;

    socket.on('combatMove', data => {
        const player = activePlayers[socket.id];
        const combat = activeCombats[socket.id];
        if (!data || typeof data !== 'object') {
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Server: Invalid movement payload.',
                updatedCombatState: combat && player
                    ? syncCombatViews(combat, player)
                    : null
            });
        }
        if (!player || !combat) {
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Server connection lost. Please refresh the page.'
            });
        }
        if (isCombatPlaybackLocked(combat)) {
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Tactical Error: Wait for the current action to finish.',
                x: combat.player.x,
                y: combat.player.y,
                updatedCombatState: syncCombatViews(combat, player)
            });
        }
        if (combat.atbPaused !== true) {
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Tactical Error: Cannot move out of turn.',
                x: combat.player.x,
                y: combat.player.y
            });
        }

        const activeActor = getCombatTurnActor(combat, player);
        if (!activeActor) {
            clearActivePartyActor(combat, combat.activeActorUid || null);
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Tactical turn resynchronized. Waiting for the next party member.',
                x: combat.player.x,
                y: combat.player.y,
                updatedCombatState: syncCombatViews(combat, player)
            });
        }

        let speed = getActorStatValue(activeActor, player, 'speed');
        speed = Math.max(1, Math.min(12, speed));
        const tx = clampInt(data.tx, 0, combat.gridSize.cols - 1, activeActor.x);
        const ty = clampInt(data.ty, 0, combat.gridSize.rows - 1, activeActor.y);
        const distance = getGridDistance(
            activeActor.x,
            activeActor.y,
            tx,
            ty,
            activeActor.size || 1
        );

        if (tx < 0 || tx >= combat.gridSize.cols || ty < 0 || ty >= combat.gridSize.rows) {
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Server: Coordinates out of bounds.',
                x: activeActor.x,
                y: activeActor.y,
                actorUid: activeActor.uid
            });
        }
        if (combat.obstacles.some(obstacle => obstacle.x === tx && obstacle.y === ty)) {
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Server: Obstacle collision detected.',
                x: activeActor.x,
                y: activeActor.y,
                actorUid: activeActor.uid
            });
        }

        syncCombatViews(combat, player);
        const hitActor = getAliveActors(combat).some(actor => {
            if (!isBlockingActor(actor) || actor.uid === activeActor.uid) return false;
            const size = actor.size || 1;
            return tx >= actor.x
                && tx < actor.x + size
                && ty >= actor.y
                && ty < actor.y + size;
        });
        if (hitActor) {
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Server: Entity collision detected.',
                x: activeActor.x,
                y: activeActor.y,
                actorUid: activeActor.uid
            });
        }

        const moveStaminaCost = getMoveStaminaCost(distance, speed);
        if (getActorStaminaValue(activeActor, player) >= moveStaminaCost) {
            spendActorStamina(activeActor, player, moveStaminaCost);
            activeActor.x = tx;
            activeActor.y = ty;
            if (isPlayerActor(activeActor)) {
                combat.player.x = tx;
                combat.player.y = ty;
            }
            const actionResult = completePlayerControlledAction(combat, player, activeActor);
            return socket.emit('moveReceipt', {
                success: true,
                actorUid: activeActor.uid,
                updatedPlayer: player,
                updatedCombatState: combat,
                actionsRemaining: actionResult.actionsRemaining,
                turnComplete: actionResult.turnComplete
            });
        }

        return socket.emit('moveReceipt', {
            success: false,
            message: `Server: Not enough stamina to move (${Math.floor(getActorStaminaValue(activeActor, player))}/${moveStaminaCost}).`,
            x: activeActor.x,
            y: activeActor.y,
            actorUid: activeActor.uid
        });
    });
};
