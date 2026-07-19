const test = require('node:test');
const assert = require('node:assert/strict');

const {
    PASS_STAMINA_RATIO_PER_UNUSED_ACTION,
    getUnusedActionCredits,
    recoverUnusedActionStamina
} = require('../combatTurnRecovery.js');

function companion(stamina = 0) {
    return { uid: 'ally_1', kind: 'companion', stamina, maxStamina: 50 };
}

test('passing with two unspent credits restores 30% of maximum stamina', () => {
    const actor = companion(10);
    const combat = { activeActorUid: actor.uid, actionsRemaining: 2 };

    const result = recoverUnusedActionStamina(combat, actor, null);

    assert.equal(PASS_STAMINA_RATIO_PER_UNUSED_ACTION, 0.15);
    assert.equal(result.unusedActionCredits, 2);
    assert.equal(result.recoveryRatio, 0.3);
    assert.equal(result.recovered, 15);
    assert.equal(actor.stamina, 25);
});

test('passing after spending one credit restores 15% of maximum stamina', () => {
    const actor = companion(10);
    const combat = { activeActorUid: actor.uid, actionsRemaining: 1 };

    const result = recoverUnusedActionStamina(combat, actor, null);

    assert.equal(result.unusedActionCredits, 1);
    assert.equal(result.recovered, 7);
    assert.equal(actor.stamina, 17);
});

test('zero credits never grant the one-point minimum used by Rest', () => {
    const actor = companion(10);
    const combat = { activeActorUid: actor.uid, actionsRemaining: 0 };

    const result = recoverUnusedActionStamina(combat, actor, null);

    assert.equal(result.recovered, 0);
    assert.equal(actor.stamina, 10);
});

test('recovery is capped at maximum stamina and synchronizes the player actor', () => {
    const player = { vitality: 1, maxStamina: 2, stamina: 49 };
    const actor = { uid: 'player_0', kind: 'player', stamina: 49, maxStamina: 50 };
    const combat = { activeActorUid: actor.uid, actionsRemaining: 2 };

    const result = recoverUnusedActionStamina(combat, actor, player);

    assert.equal(result.recovered, 1);
    assert.equal(player.stamina, 50);
    assert.equal(actor.stamina, 50);
});

test('a stale actor cannot recover another actor’s unspent credits', () => {
    const actor = companion(10);
    const combat = { activeActorUid: 'ally_other', actionsRemaining: 2 };

    assert.equal(getUnusedActionCredits(combat, actor), 0);
    assert.equal(recoverUnusedActionStamina(combat, actor, null).recovered, 0);
    assert.equal(actor.stamina, 10);
});
