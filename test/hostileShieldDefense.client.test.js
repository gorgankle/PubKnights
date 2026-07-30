const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
    createCombatPlaybackBarrier
} = require('../public/js/combat-animation.js');

const mainSource = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'main.js'),
    'utf8'
);

function extractFunction(source, functionName) {
    const start = source.indexOf(`function ${functionName}(`);
    assert.ok(start >= 0, `Missing ${functionName}`);
    const bodyStart = source.indexOf('{', start);
    let depth = 0;

    for (let index = bodyStart; index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] === '}') {
            depth--;
            if (depth === 0) return source.slice(start, index + 1);
        }
    }

    throw new Error(`Unterminated ${functionName}`);
}

const deflectOptionsSource = extractFunction(
    mainSource,
    'getHumanoidDeflectPlaybackOptions'
);
const outgoingMissSource = extractFunction(
    mainSource,
    'playOutgoingCombatMiss'
);

function createClientHarness(deflectReason = 'armor') {
    const sourceActor = {
        uid: 'player_0',
        kind: 'player',
        name: 'Knight',
        x: 1,
        y: 2,
        size: 1
    };
    const shieldTarget = {
        uid: 'mob_shield_captain',
        name: 'Shielded Guard Captain',
        x: 5,
        y: 2,
        size: 1
    };
    const staleSelection = {
        uid: 'mob_stale_selection',
        name: 'Wrong Target',
        x: 8,
        y: 6,
        size: 1
    };
    const weapon = {
        spriteId: 'weap_great_axe',
        projectileSprite: null
    };
    const defenseState = { clipId: 'shield_block' };
    const calls = {
        action: null,
        defense: null,
        cleared: [],
        finalized: 0,
        playbackTracked: [],
        playbackAcknowledged: [],
        logs: [],
        sounds: [],
        text: []
    };
    let activeDefenseState = defenseState;

    const context = vm.createContext({
        selectedEnemy: staleSelection,
        CombatSpriteAnimation: {
            getActionState(actor) {
                return actor === shieldTarget
                    ? activeDefenseState
                    : null;
            },
            clear(actor) {
                calls.cleared.push(actor);
                activeDefenseState = null;
                if (
                    calls.defense
                    && typeof calls.defense.options.onCancel === 'function'
                ) {
                    calls.defense.options.onCancel();
                }
            }
        },
        FXEngine: {
            spawnText(x, y, label) {
                calls.text.push({ x, y, label });
            },
            spawnProjectile() {
                throw new Error('Melee shield test launched a projectile');
            }
        },
        createCombatPlaybackBarrier,
        getCombatResultWeapon() {
            return weapon;
        },
        getCombatResultAnimationProfile() {
            return { clipId: 'heavy', lift: false };
        },
        getCombatActorByUid(uid) {
            return uid === shieldTarget.uid ? shieldTarget : null;
        },
        getCombatResultTarget() {
            return { x: 99, y: 99 };
        },
        getCombatAnimationTimeline(clipId) {
            return clipId === 'shield_block'
                ? { frameDurationMs: 125, durationMs: 500 }
                : { actionTimeMs: 500, durationMs: 1000 };
        },
        getHumanoidShieldDefenseProfile(actor) {
            return actor === shieldTarget
                ? { clipId: 'shield_block' }
                : null;
        },
        playHumanoidDefensiveReaction(actor, attacker, options) {
            calls.defense = { actor, attacker, options };
            return defenseState;
        },
        startCombatSpriteActionWhenReady(
            actor,
            options,
            _onUnavailable,
            onStarted
        ) {
            calls.action = { actor, options };
            onStarted({ clipId: options.clipId });
            return { cancel() {} };
        },
        finalizeOutgoingCombatAction() {
            calls.finalized++;
        },
        trackCombatPlayback(playbackId) {
            calls.playbackTracked.push(playbackId);
        },
        acknowledgeCombatPlayback(playbackId) {
            calls.playbackAcknowledged.push(playbackId);
        },
        logMessage(message) {
            calls.logs.push(message);
        },
        playRetroSound(sound) {
            calls.sounds.push(sound);
        },
        Number,
        Math,
        Object,
        Array,
        Boolean
    });

    vm.runInContext(
        `${deflectOptionsSource}\n${outgoingMissSource}\n`
        + 'this.playOutgoingCombatMissForTest = playOutgoingCombatMiss;',
        context,
        { filename: 'hostile-shield-defense-client.js' }
    );

    context.playOutgoingCombatMissForTest(
        {
            type: 'miss',
            actorUid: sourceActor.uid,
            targetUid: shieldTarget.uid,
            deflectReason,
            hitChance: deflectReason === 'armor' ? 100 : 0,
            playbackId: 'combat-playback-shield-test'
        },
        sourceActor,
        { actors: [] }
    );

    return {
        calls,
        sourceActor,
        shieldTarget,
        staleSelection,
        defenseState
    };
}

test('outgoing armor deflect uses the authoritative shield target and waits for guard recovery', () => {
    const harness = createClientHarness();
    const { calls, sourceActor, shieldTarget, staleSelection } = harness;

    assert.equal(calls.action.actor, sourceActor);
    assert.equal(calls.action.options.clipId, 'heavy');
    assert.equal(calls.action.options.targetX, shieldTarget.x);
    assert.notEqual(calls.action.options.targetX, staleSelection.x);
    assert.equal(calls.defense.actor, shieldTarget);
    assert.equal(calls.defense.attacker, sourceActor);
    assert.equal(calls.defense.options.playbackRate, 0.5);

    calls.action.options.onEvent();
    calls.action.options.onComplete();

    assert.equal(calls.finalized, 0);
    assert.deepEqual(calls.text, [{
        x: shieldTarget.x,
        y: shieldTarget.y,
        label: 'BLOCK'
    }]);
    assert.deepEqual(calls.sounds, ['deflect']);

    calls.defense.options.onComplete();
    calls.defense.options.onComplete();
    assert.equal(calls.finalized, 1);
    assert.deepEqual(
        calls.playbackAcknowledged,
        ['combat-playback-shield-test']
    );
});

test('cancelled outgoing playback settles state, clears its shield reaction, and ignores late callbacks', () => {
    const harness = createClientHarness();
    const { calls, shieldTarget } = harness;

    calls.action.options.onCancel();
    assert.deepEqual(calls.cleared, [shieldTarget]);

    calls.action.options.onEvent();
    calls.action.options.onComplete();
    calls.defense.options.onComplete();
    assert.equal(calls.finalized, 1);
    assert.deepEqual(
        calls.playbackAcknowledged,
        ['combat-playback-shield-test']
    );
    assert.deepEqual(calls.text, []);
});

test('an evasion miss keeps the authoritative target but does not invent a shield block', () => {
    const harness = createClientHarness('evasion');
    const { calls, shieldTarget } = harness;

    assert.equal(calls.action.options.targetX, shieldTarget.x);
    assert.equal(calls.defense, null);

    calls.action.options.onEvent();
    calls.action.options.onComplete();

    assert.equal(calls.finalized, 1);
    assert.deepEqual(
        calls.playbackAcknowledged,
        ['combat-playback-shield-test']
    );
    assert.deepEqual(calls.text, [{
        x: shieldTarget.x,
        y: shieldTarget.y,
        label: 'MISS'
    }]);
    assert.deepEqual(calls.sounds, ['error']);
});
