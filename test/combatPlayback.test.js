const test = require('node:test');
const assert = require('node:assert/strict');

const {
    DEFAULT_COMBAT_PLAYBACK_TIMEOUT_MS,
    beginCombatPlayback,
    acknowledgeCombatPlayback,
    releaseExpiredCombatPlayback,
    isCombatPlaybackLocked
} = require('../combatPlayback.js');

test('combat playback acknowledgements release only their current token', () => {
    const combat = {};
    const firstId = beginCombatPlayback(combat, {
        now: 1000,
        timeoutMs: 5000
    });
    const secondId = beginCombatPlayback(combat, {
        now: 1200,
        timeoutMs: 5000
    });

    assert.notEqual(firstId, secondId);
    assert.equal(combat.playbackId, secondId);
    assert.equal(combat.playbackLock, true);
    assert.deepEqual(
        acknowledgeCombatPlayback(combat, firstId, 1300),
        { released: false, reason: 'stale-playback' }
    );
    assert.equal(combat.playbackLock, true);
    assert.equal(combat.playbackId, secondId);

    assert.deepEqual(
        acknowledgeCombatPlayback(combat, secondId, 1400),
        { released: true, reason: 'acknowledged' }
    );
    assert.equal(combat.playbackLock, false);
    assert.equal(combat.playbackId, null);
});

test('missing acknowledgements cannot unlock a tokenized playback', () => {
    const combat = {};
    const playbackId = beginCombatPlayback(combat, {
        now: 100,
        timeoutMs: 1000
    });

    assert.match(playbackId, /^combat-playback-\d+$/);
    assert.deepEqual(
        acknowledgeCombatPlayback(combat, undefined, 200),
        { released: false, reason: 'stale-playback' }
    );
    assert.equal(isCombatPlaybackLocked(combat, 999), true);
});

test('expired playback locks release without an acknowledgement', () => {
    const combat = {};
    beginCombatPlayback(combat, {
        now: 500,
        timeoutMs: 250
    });

    assert.equal(releaseExpiredCombatPlayback(combat, 749), false);
    assert.equal(isCombatPlaybackLocked(combat, 749), true);
    assert.equal(isCombatPlaybackLocked(combat, 750), false);
    assert.equal(combat.playbackId, null);
    assert.equal(combat.playbackExpiresAt, 0);
});

test('playback locks use a bounded default expiry', () => {
    const combat = {};
    beginCombatPlayback(combat, { now: 2500 });

    assert.equal(
        combat.playbackExpiresAt,
        2500 + DEFAULT_COMBAT_PLAYBACK_TIMEOUT_MS
    );
});
