// --- combatTurns.js ---
// Server-authoritative action budget for the currently active manual actor.

const ACTIONS_PER_TURN = 2;

function beginActionTurn(combat) {
    if (!combat || !combat.activeActorUid) return false;
    combat.actionsRemaining = ACTIONS_PER_TURN;
    combat.actionsTaken = 0;
    return true;
}

function ensureActionTurn(combat, actorUid) {
    if (!combat || !actorUid || combat.activeActorUid !== actorUid) return false;
    if (!Number.isInteger(combat.actionsRemaining)) beginActionTurn(combat);
    combat.actionsRemaining = Math.max(0, Math.min(ACTIONS_PER_TURN, combat.actionsRemaining));
    combat.actionsTaken = Math.max(0, ACTIONS_PER_TURN - combat.actionsRemaining);
    return combat.actionsRemaining > 0;
}

function consumeAction(combat, actorUid) {
    if (!ensureActionTurn(combat, actorUid)) {
        return { consumed: false, actionsRemaining: 0, turnComplete: true };
    }

    combat.actionsRemaining -= 1;
    combat.actionsTaken = ACTIONS_PER_TURN - combat.actionsRemaining;
    return {
        consumed: true,
        actionsRemaining: combat.actionsRemaining,
        turnComplete: combat.actionsRemaining === 0
    };
}

function clearActionTurn(combat) {
    if (!combat) return;
    combat.actionsRemaining = 0;
    combat.actionsTaken = 0;
}

module.exports = {
    ACTIONS_PER_TURN,
    beginActionTurn,
    ensureActionTurn,
    consumeAction,
    clearActionTurn
};
