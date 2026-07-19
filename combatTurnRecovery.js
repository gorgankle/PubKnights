// --- combatTurnRecovery.js ---
// Converts unspent action credits into stamina when a manual actor passes.

const { ACTIONS_PER_TURN } = require('./combatTurns.js');
const {
    getActorMaxStamina,
    getActorStamina,
    setActorStamina
} = require('./combatResources.js');

const PASS_STAMINA_RATIO_PER_UNUSED_ACTION = 0.15;

function getUnusedActionCredits(combat, actor) {
    if (!combat || !actor || combat.activeActorUid !== actor.uid) return 0;
    const remaining = Number.isInteger(combat.actionsRemaining)
        ? combat.actionsRemaining
        : ACTIONS_PER_TURN;
    return Math.max(0, Math.min(ACTIONS_PER_TURN, remaining));
}

function recoverUnusedActionStamina(combat, actor, player) {
    const unusedActionCredits = getUnusedActionCredits(combat, actor);
    const before = actor ? getActorStamina(actor, player) : 0;
    const maxStamina = actor ? getActorMaxStamina(actor, player) : 0;

    if (!actor || unusedActionCredits === 0) {
        return {
            recovered: 0,
            unusedActionCredits,
            recoveryRatio: 0,
            before,
            after: before,
            maxStamina
        };
    }

    const recoveryRatio = PASS_STAMINA_RATIO_PER_UNUSED_ACTION * unusedActionCredits;
    const recoveryAmount = Math.floor(maxStamina * recoveryRatio);
    const after = setActorStamina(actor, player, before + recoveryAmount);

    return {
        recovered: after - before,
        unusedActionCredits,
        recoveryRatio,
        before,
        after,
        maxStamina
    };
}

module.exports = {
    PASS_STAMINA_RATIO_PER_UNUSED_ACTION,
    getUnusedActionCredits,
    recoverUnusedActionStamina
};
