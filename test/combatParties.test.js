const test = require('node:test');
const assert = require('node:assert/strict');

const {
    PARTY_PLAYER,
    PARTY_ENEMY,
    CONTROL_MANUAL,
    CONTROL_AUTO,
    syncCombatParties,
    getActivePartyActor,
    activatePartyActor,
    clearActivePartyActor
} = require('../combatParties.js');

function actor(uid, kind, controller, teamId) {
    return {
        uid,
        kind,
        controller,
        teamId,
        hp: 25,
        alive: true
    };
}

test('combat parties preserve real mercenary UIDs and group every actor once', () => {
    const mercenaryUid = 'ally_merc_0123456789abcdef01234567';
    const player = actor('player_0', 'player', 'player', 'PLAYER');
    const mercenary = actor(mercenaryUid, 'companion', 'player_companion', 'PLAYER');
    const enemy = actor('mob_0', 'monster', 'ai_enemy', 'ENEMY');
    const combat = { actors: [player, mercenary, enemy], activeActorUid: mercenaryUid, atbPaused: true };

    const parties = syncCombatParties(combat);
    const activeActor = getActivePartyActor(combat, {
        partyId: PARTY_PLAYER,
        controlMode: CONTROL_MANUAL
    });

    assert.equal(mercenaryUid.length, 34);
    assert.deepEqual(parties[PARTY_PLAYER].memberUids, ['player_0', mercenaryUid]);
    assert.deepEqual(parties[PARTY_ENEMY].memberUids, ['mob_0']);
    assert.equal(mercenary.partyId, PARTY_PLAYER);
    assert.equal(mercenary.controlMode, CONTROL_MANUAL);
    assert.equal(enemy.controlMode, CONTROL_AUTO);
    assert.equal(activeActor, mercenary);
});

test('party activation and clearing update the single activeActorUid token atomically', () => {
    const mercenary = actor(
        'ally_merc_0123456789abcdef01234567',
        'companion',
        'player_companion',
        'PLAYER'
    );
    const combat = { actors: [mercenary], activeActorUid: null, atbPaused: false };

    assert.equal(activatePartyActor(combat, mercenary), mercenary);
    assert.equal(combat.activeActorUid, mercenary.uid);
    assert.equal(combat.atbPaused, true);

    assert.equal(clearActivePartyActor(combat, 'wrong_uid'), false);
    assert.equal(combat.activeActorUid, mercenary.uid);
    assert.equal(combat.atbPaused, true);

    assert.equal(clearActivePartyActor(combat, mercenary.uid), true);
    assert.equal(combat.activeActorUid, null);
    assert.equal(combat.atbPaused, false);
});
