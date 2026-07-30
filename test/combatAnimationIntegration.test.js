const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
    hasCombatAnimationClip,
    getCombatAnimationTimeline,
    getCombatAnimationReleaseOrigin,
    resolveCombatAnimationClip,
    createCombatPlaybackBarrier,
    CombatSpriteAnimation
} = require('../public/js/combat-animation.js');

const projectRoot = path.join(__dirname, '..');

test('combat timelines expose authored contact and release frames', () => {
    const slash = getCombatAnimationTimeline('slash');
    const bash = getCombatAnimationTimeline('bash');
    const shoot = getCombatAnimationTimeline('shoot');
    const cast = getCombatAnimationTimeline('cast');
    const thrust = getCombatAnimationTimeline('thrust');
    const heavy = getCombatAnimationTimeline('heavy');
    const dagger = getCombatAnimationTimeline('dagger');
    const scythe = getCombatAnimationTimeline('scythe');
    const block = getCombatAnimationTimeline('shield_block');
    const shieldBash = getCombatAnimationTimeline('shield_bash');
    const dualWield = getCombatAnimationTimeline('dual_wield');

    assert.equal(slash.eventType, 'contact');
    assert.equal(slash.actionFrame, 2);
    assert.equal(slash.actionTimeMs, 250);
    assert.equal(slash.durationMs, 500);

    assert.equal(bash.eventType, 'contact');
    assert.equal(bash.actionFrame, 2);
    assert.ok(bash.actionTimeMs < bash.durationMs);

    assert.equal(shoot.eventType, 'release');
    assert.equal(shoot.actionFrame, 3);
    assert.ok(shoot.actionTimeMs < shoot.durationMs);

    assert.equal(cast.eventType, 'release');
    assert.equal(cast.actionFrame, 3);
    assert.ok(cast.actionTimeMs < cast.durationMs);

    assert.deepEqual(
        [
            [thrust.eventType, thrust.actionFrame, thrust.actionTimeMs, thrust.durationMs],
            [heavy.eventType, heavy.actionFrame, heavy.actionTimeMs, heavy.durationMs],
            [dagger.eventType, dagger.actionFrame, dagger.actionTimeMs, dagger.durationMs],
            [scythe.eventType, scythe.actionFrame, Math.round(scythe.actionTimeMs), Math.round(scythe.durationMs)],
            [block.eventType, block.actionFrame, block.actionTimeMs, block.durationMs],
            [shieldBash.eventType, shieldBash.actionFrame, shieldBash.actionTimeMs, shieldBash.durationMs],
            [dualWield.eventType, dualWield.actionFrame, dualWield.actionTimeMs, dualWield.durationMs]
        ],
        [
            ['contact', 2, 250, 625],
            ['contact', 3, 500, 1000],
            ['contact', 2, 200, 500],
            ['contact', 3, 429, 857],
            ['guard', 1, 125, 500],
            ['contact', 2, 250, 625],
            ['contact', 2, 200, 600]
        ]
    );
    assert.equal(heavy.powerful, true);
});

test('registered locomotion, reaction, and terminal clips are valid without events', () => {
    const walk = getCombatAnimationTimeline('walk');
    const hit = getCombatAnimationTimeline('hit');
    const defeat = getCombatAnimationTimeline('defeat');

    assert.equal(hasCombatAnimationClip('walk'), true);
    assert.equal(hasCombatAnimationClip('hit'), true);
    assert.equal(hasCombatAnimationClip('defeat'), true);
    assert.equal(hasCombatAnimationClip('not_a_clip'), false);

    assert.equal(walk.clipId, 'walk');
    assert.equal(walk.eventType, null);
    assert.equal(hit.clipId, 'hit');
    assert.equal(hit.eventType, null);
    assert.equal(hit.frameCount, 3);
    assert.equal(hit.durationMs, 300);
    assert.equal(defeat.clipId, 'defeat');
    assert.equal(defeat.eventType, null);
    assert.equal(defeat.frameCount, 4);
    assert.equal(defeat.terminal, true);
    assert.equal(defeat.holdLastFrame, true);

    assert.equal(
        getCombatAnimationTimeline('not_a_clip').clipId,
        'idle'
    );
});

test('weapon families resolve to the matching side action clip', () => {
    assert.equal(
        resolveCombatAnimationClip({
            weapon: { projectileSprite: 'icon_arrow' }
        }),
        'shoot'
    );
    assert.equal(
        resolveCombatAnimationClip({
            source: 'spell',
            weapon: { spriteId: 'weap_stormcaller_staff' }
        }),
        'cast'
    );
    assert.equal(
        resolveCombatAnimationClip({
            animType: 'jump_smash',
            weapon: { spriteId: 'weap_tankard' }
        }),
        'bash'
    );
    assert.equal(
        resolveCombatAnimationClip({
            weapon: { spriteId: 'weap_spear' }
        }),
        'thrust'
    );
    assert.equal(
        resolveCombatAnimationClip({
            animType: 'lunge_bash',
            weapon: { spriteId: 'weap_machete' }
        }),
        'slash'
    );
    assert.equal(
        resolveCombatAnimationClip({
            animType: 'lunge_bash',
            weapon: { spriteId: 'weap_rusty_mace' }
        }),
        'bash'
    );
    assert.equal(
        resolveCombatAnimationClip({ animType: 'heavy' }),
        'heavy'
    );
    assert.equal(
        resolveCombatAnimationClip({ animType: 'dagger' }),
        'dagger'
    );
    assert.equal(
        resolveCombatAnimationClip({ animType: 'scythe' }),
        'scythe'
    );
    assert.equal(
        resolveCombatAnimationClip({ actionType: 'block' }),
        'shield_block'
    );
    assert.equal(
        resolveCombatAnimationClip({ actionType: 'shield_bash' }),
        'shield_bash'
    );
    assert.equal(
        resolveCombatAnimationClip({
            weapon: { spriteId: 'weap_mimic_dagger' },
            offhand: { offhandType: 'weapon' }
        }),
        'dual_wield'
    );
});

test('shield defense interrupts explicitly, guards once, and recovers cleanly', () => {
    const actor = {
        uid: 'enemy_guard_captain',
        x: 4,
        y: 2,
        alive: true
    };
    const cancellations = [];
    const guards = [];

    CombatSpriteAnimation.clear();
    const heavy = CombatSpriteAnimation.startAction(actor, {
        clipId: 'heavy',
        startTime: 0,
        targetX: 1,
        onCancel: event => cancellations.push(event)
    });
    assert.ok(heavy);

    const block = CombatSpriteAnimation.startDefensiveReaction(actor, {
        startTime: 100,
        targetX: 7,
        interrupt: true,
        onEvent: event => guards.push(event)
    });
    assert.ok(block);
    assert.equal(cancellations.length, 1);
    assert.equal(cancellations[0].reason, 'block');
    assert.equal(block.facing, 'right');

    CombatSpriteAnimation.update(224.999);
    assert.equal(guards.length, 0);
    CombatSpriteAnimation.update(225);
    CombatSpriteAnimation.update(400);
    assert.equal(guards.length, 1);
    assert.equal(guards[0].eventType, 'guard');
    assert.equal(guards[0].frameIndex, 1);

    CombatSpriteAnimation.update(600);
    assert.equal(CombatSpriteAnimation.isActionLocked(actor), false);
});

test('advanced humanoids keep independent runtime clips and cleanup callbacks', () => {
    const brute = { uid: 'enemy_brute', x: 6, y: 2, alive: true };
    const duelist = { uid: 'enemy_duelist', x: 2, y: 2, alive: true };
    const contacts = [];
    const cleanup = [];

    CombatSpriteAnimation.clear();
    CombatSpriteAnimation.startAction(brute, {
        clipId: 'heavy',
        startTime: 0,
        targetX: 2,
        onEvent: event => contacts.push(event.clipId),
        onCancel: event => cleanup.push(event)
    });
    CombatSpriteAnimation.startAction(duelist, {
        clipId: 'dual_wield',
        startTime: 0,
        targetX: 6,
        onEvent: event => contacts.push(event.clipId),
        onCancel: event => cleanup.push(event)
    });

    CombatSpriteAnimation.update(200);
    assert.deepEqual(contacts, ['dual_wield']);
    assert.equal(
        CombatSpriteAnimation.getRenderState(brute, { now: 200 }).clipId,
        'heavy'
    );
    assert.equal(
        CombatSpriteAnimation.getRenderState(duelist, { now: 200 }).clipId,
        'dual_wield'
    );

    CombatSpriteAnimation.clear();
    assert.equal(cleanup.length, 2);
    assert.ok(cleanup.every(event => event.reason === 'cleanup'));
    assert.equal(CombatSpriteAnimation.isAnimating(brute), false);
    assert.equal(CombatSpriteAnimation.isAnimating(duelist), false);
});

test('melee contact fires once on its authored frame before recovery completes', () => {
    const actor = {
        uid: 'player_0',
        kind: 'player',
        x: 5,
        y: 3,
        size: 1
    };
    const events = [];

    CombatSpriteAnimation.clear();
    CombatSpriteAnimation.startAction(actor, {
        clipId: 'slash',
        targetX: 2,
        targetY: 3,
        startTime: 1000,
        onEvent(event) {
            events.push(`${event.eventType}:${event.frameIndex}`);
        },
        onComplete() {
            events.push('complete');
        }
    });

    assert.equal(
        CombatSpriteAnimation.getRenderState(actor, { now: 1000 }).facing,
        'left'
    );
    CombatSpriteAnimation.update(1249);
    assert.deepEqual(events, []);

    CombatSpriteAnimation.update(1250);
    CombatSpriteAnimation.update(1400);
    assert.deepEqual(events, ['contact:2']);

    CombatSpriteAnimation.update(1500);
    assert.deepEqual(events, ['contact:2', 'complete']);
    assert.equal(CombatSpriteAnimation.isAnimating(actor), false);
});

test('projectile release precedes recovery and preserves the target facing', () => {
    const actor = {
        uid: 'player_0',
        kind: 'player',
        x: 1,
        y: 1,
        size: 1
    };
    const timeline = getCombatAnimationTimeline('shoot');
    const events = [];

    CombatSpriteAnimation.clear();
    CombatSpriteAnimation.startAction(actor, {
        clipId: 'shoot',
        targetX: 8,
        targetY: 1,
        startTime: 0,
        onEvent(event) {
            events.push(event.eventType);
        },
        onComplete() {
            events.push('complete');
        }
    });

    CombatSpriteAnimation.update(timeline.actionTimeMs - 0.01);
    assert.deepEqual(events, []);
    CombatSpriteAnimation.update(timeline.actionTimeMs);
    assert.deepEqual(events, ['release']);
    assert.equal(
        CombatSpriteAnimation.getRenderState(actor, {
            now: timeline.actionTimeMs
        }).facing,
        'right'
    );

    CombatSpriteAnimation.update(timeline.durationMs);
    assert.deepEqual(events, ['release', 'complete']);
});

test('playback rate scales events, recovery, and post-action idle timing', () => {
    const actor = {
        uid: 'player_rate',
        kind: 'player',
        x: 1,
        y: 1,
        alive: true
    };
    const events = [];

    CombatSpriteAnimation.clear();
    const state = CombatSpriteAnimation.startAction(actor, {
        clipId: 'slash',
        startTime: 100,
        playbackRate: 2,
        onEvent() {
            events.push('contact');
        },
        onComplete() {
            events.push('complete');
        }
    });

    assert.equal(state.playbackRate, 2);
    assert.equal(state.timeline.actionTimeMs, 125);
    assert.equal(state.timeline.durationMs, 250);

    CombatSpriteAnimation.update(224.999);
    assert.deepEqual(events, []);
    CombatSpriteAnimation.update(225);
    assert.deepEqual(events, ['contact']);
    CombatSpriteAnimation.update(349.999);
    assert.deepEqual(events, ['contact']);
    CombatSpriteAnimation.update(350);
    assert.deepEqual(events, ['contact', 'complete']);

    const seededIdle = CombatSpriteAnimation.getRenderState(actor, {
        now: 500
    });
    assert.equal(seededIdle.clipId, 'idle');
    assert.equal(seededIdle.frameIndex, 0);

    CombatSpriteAnimation.clear(actor);
    const clamped = CombatSpriteAnimation.startHitReaction(actor, {
        startTime: 0,
        playbackRate: 100
    });
    assert.equal(clamped.playbackRate, 8);
});

test('walk frames change facing without disturbing the remembered idle side', () => {
    const actor = {
        uid: 'player_0',
        kind: 'player',
        x: 4,
        y: 2
    };

    CombatSpriteAnimation.clear();
    const first = CombatSpriteAnimation.getRenderState(actor, {
        isMoving: true,
        deltaX: 1,
        now: 0
    });
    const second = CombatSpriteAnimation.getRenderState(actor, {
        isMoving: true,
        deltaX: -1,
        now: 150
    });
    const idle = CombatSpriteAnimation.getRenderState(actor, {
        isMoving: false,
        now: 200
    });

    assert.equal(first.clipId, 'walk');
    assert.equal(first.frameIndex, 0);
    assert.equal(first.facing, 'right');
    assert.equal(second.frameIndex, 1);
    assert.equal(second.facing, 'left');
    assert.equal(idle.clipId, 'idle');
    assert.equal(idle.facing, 'left');
});

test('actions lock an actor instead of overwriting its active lifecycle', () => {
    const actor = {
        uid: 'enemy_lock',
        x: 2,
        y: 2,
        alive: true
    };
    const completions = [];

    CombatSpriteAnimation.clear();
    const action = CombatSpriteAnimation.startAction(actor, {
        clipId: 'slash',
        startTime: 0,
        onComplete(event) {
            completions.push(event);
        }
    });

    assert.ok(action);
    assert.equal(CombatSpriteAnimation.isActionLocked(actor), true);
    assert.equal(
        CombatSpriteAnimation.startAction(actor, {
            clipId: 'bash',
            startTime: 0
        }),
        null
    );
    assert.equal(
        CombatSpriteAnimation.startHitReaction(actor, { startTime: 0 }),
        null
    );
    assert.equal(
        CombatSpriteAnimation.startAction(actor, {
            clipId: 'hit',
            startTime: 0
        }),
        null
    );

    CombatSpriteAnimation.update(
        getCombatAnimationTimeline('slash').durationMs
    );
    CombatSpriteAnimation.update(1000);
    assert.equal(completions.length, 1);
    assert.equal(completions[0].cancelled, false);
    assert.equal(CombatSpriteAnimation.isActionLocked(actor), false);
});

test('hit reactions are exclusive but release their lock after completion', () => {
    const actor = {
        uid: 'enemy_hit',
        x: 3,
        y: 2,
        alive: true
    };
    let completions = 0;

    CombatSpriteAnimation.clear();
    const reaction = CombatSpriteAnimation.startHitReaction(actor, {
        facing: 'left',
        startTime: 100,
        onComplete() {
            completions++;
        }
    });

    assert.ok(reaction);
    assert.equal(reaction.clipId, 'hit');
    assert.equal(CombatSpriteAnimation.isAnimating(actor), true);
    assert.equal(CombatSpriteAnimation.hasTerminalState(actor), false);
    assert.equal(
        CombatSpriteAnimation.startHitReaction(actor, { startTime: 100 }),
        null
    );
    assert.equal(
        CombatSpriteAnimation.startAction(actor, {
            clipId: 'slash',
            startTime: 100
        }),
        null
    );

    CombatSpriteAnimation.update(
        100 + getCombatAnimationTimeline('hit').durationMs
    );
    assert.equal(completions, 1);
    assert.equal(CombatSpriteAnimation.isAnimating(actor), false);
    assert.equal(CombatSpriteAnimation.isActionLocked(actor), false);
    assert.equal(
        CombatSpriteAnimation.getRenderState(actor, { now: 1000 }).clipId,
        'idle'
    );
});

test('compressed hit reactions release before a compressed follow-up action', () => {
    const actor = {
        uid: 'enemy_compressed_reaction',
        x: 1,
        y: 1,
        alive: true
    };
    const playbackRate = 1 / 0.15;

    CombatSpriteAnimation.clear();
    const reaction = CombatSpriteAnimation.startHitReaction(actor, {
        startTime: 0,
        playbackRate
    });

    assert.ok(reaction);
    assert.equal(reaction.timeline.durationMs, 45);
    CombatSpriteAnimation.update(reaction.timeline.durationMs);

    const action = CombatSpriteAnimation.startAction(actor, {
        clipId: 'slash',
        startTime: reaction.timeline.durationMs,
        playbackRate
    });
    assert.ok(action);
    assert.equal(action.timeline.durationMs, 75);
});

test('defeat safely cancels one lifecycle and persists its final frame', () => {
    const actor = {
        uid: 'enemy_defeat',
        x: 5,
        y: 3,
        alive: true
    };
    const interrupted = [];
    let defeatCompletions = 0;
    let actionCompletions = 0;

    CombatSpriteAnimation.clear();
    CombatSpriteAnimation.startAction(actor, {
        clipId: 'bash',
        startTime: 0,
        onCancel(event) {
            interrupted.push(event);
        },
        onComplete() {
            actionCompletions++;
        }
    });
    const defeat = CombatSpriteAnimation.startDefeat(actor, {
        facing: 'left',
        startTime: 50,
        onComplete() {
            defeatCompletions++;
        }
    });

    assert.ok(defeat);
    assert.equal(interrupted.length, 1);
    assert.equal(interrupted[0].cancelled, true);
    assert.equal(interrupted[0].reason, 'defeat');
    assert.equal(actionCompletions, 0);
    assert.equal(CombatSpriteAnimation.hasTerminalState(actor), true);
    assert.equal(CombatSpriteAnimation.isActionLocked(actor), true);
    assert.equal(
        CombatSpriteAnimation.startDefeat(actor, { startTime: 50 }),
        null
    );
    assert.equal(
        CombatSpriteAnimation.startHitReaction(actor, { startTime: 50 }),
        null
    );
    assert.equal(
        CombatSpriteAnimation.startAction(actor, {
            clipId: 'slash',
            startTime: 50
        }),
        null
    );

    const defeatTimeline = getCombatAnimationTimeline('defeat');
    CombatSpriteAnimation.update(50 + defeatTimeline.durationMs);
    CombatSpriteAnimation.update(5000);

    assert.equal(interrupted.length, 1);
    assert.equal(actionCompletions, 0);
    assert.equal(defeatCompletions, 1);
    assert.equal(CombatSpriteAnimation.isAnimating(actor), false);
    assert.equal(CombatSpriteAnimation.isActionLocked(actor), true);
    assert.deepEqual(
        CombatSpriteAnimation.getRenderState(actor, {
            isMoving: true,
            deltaX: 1,
            now: 5000
        }),
        {
            clipId: 'defeat',
            frameIndex: defeatTimeline.frameCount - 1,
            facing: 'left',
            isAction: false,
            isTerminal: true,
            progress: 1
        }
    );
});

test('a reentrant defeat cannot be deleted by the interrupted action update', () => {
    const actor = {
        uid: 'enemy_reentrant',
        x: 2,
        y: 2,
        alive: true
    };
    const interrupted = [];
    let actionCompletions = 0;

    CombatSpriteAnimation.clear();
    CombatSpriteAnimation.startAction(actor, {
        clipId: 'slash',
        startTime: 0,
        onEvent() {
            CombatSpriteAnimation.startDefeat(actor, {
                startTime: 1000
            });
        },
        onCancel(event) {
            interrupted.push(event);
        },
        onComplete() {
            actionCompletions++;
        }
    });

    CombatSpriteAnimation.update(1000);
    const current = CombatSpriteAnimation.getActionState(actor);

    assert.ok(current);
    assert.equal(current.clipId, 'defeat');
    assert.equal(CombatSpriteAnimation.isAnimating(actor), true);
    assert.equal(interrupted.length, 1);
    assert.equal(interrupted[0].cancelled, true);
    assert.equal(actionCompletions, 0);

    CombatSpriteAnimation.update(
        1000 + getCombatAnimationTimeline('defeat').durationMs
    );
    assert.equal(interrupted.length, 1);
    assert.equal(actionCompletions, 0);
    assert.equal(CombatSpriteAnimation.isAnimating(actor), false);
    assert.equal(CombatSpriteAnimation.hasTerminalState(actor), true);
});

test('active and terminal playback rebind to replacement actor objects', () => {
    const original = {
        uid: 'enemy_rebound',
        x: 1,
        y: 1,
        alive: true
    };
    const replacement = {
        uid: 'enemy_rebound',
        x: 7,
        y: 4,
        alive: true
    };
    let eventActor = null;

    CombatSpriteAnimation.clear();
    CombatSpriteAnimation.startAction(original, {
        clipId: 'slash',
        startTime: 0,
        onEvent(event) {
            eventActor = event.actor;
        }
    });

    assert.equal(
        CombatSpriteAnimation.getActionState(replacement).actor,
        replacement
    );
    CombatSpriteAnimation.update(
        getCombatAnimationTimeline('slash').actionTimeMs
    );
    assert.equal(eventActor, replacement);

    const defeat = CombatSpriteAnimation.startDefeat(replacement, {
        startTime: 500
    });
    const terminalReplacement = {
        uid: 'enemy_rebound',
        x: 9,
        y: 5,
        alive: false
    };
    CombatSpriteAnimation.getRenderState(terminalReplacement, { now: 500 });
    assert.equal(defeat.actor, terminalReplacement);
    assert.equal(
        CombatSpriteAnimation.getActionState(terminalReplacement).actor,
        terminalReplacement
    );

    CombatSpriteAnimation.update(
        500 + getCombatAnimationTimeline('defeat').durationMs
    );
    const finalReplacement = {
        uid: 'enemy_rebound',
        x: 10,
        y: 6,
        alive: false
    };
    CombatSpriteAnimation.getActionState(finalReplacement);
    CombatSpriteAnimation.getRenderState(finalReplacement, { now: 5000 });
    assert.equal(defeat.actor, finalReplacement);
});

test('explicit facing overrides targets while vertical targets preserve memory', () => {
    const actor = {
        uid: 'enemy_facing',
        x: 4,
        y: 4,
        size: 1,
        alive: true
    };

    CombatSpriteAnimation.clear();
    CombatSpriteAnimation.faceActorToward(actor, 9);
    const explicit = CombatSpriteAnimation.startAction(actor, {
        clipId: 'slash',
        targetX: 9,
        facing: 'left',
        startTime: 0
    });
    assert.equal(explicit.facing, 'left');

    CombatSpriteAnimation.clear(actor);
    CombatSpriteAnimation.faceActorToward(actor, 9);
    const vertical = CombatSpriteAnimation.startAction(actor, {
        clipId: 'slash',
        targetX: 4,
        targetY: 1,
        startTime: 0
    });
    assert.equal(vertical.facing, 'right');
});

test('release origins follow visual interpolation and mirror authored sockets', () => {
    const hadFrameResolver = Object.prototype.hasOwnProperty.call(
        globalThis,
        'getSidePlayerAnimationFrame'
    );
    const previousFrameResolver = globalThis.getSidePlayerAnimationFrame;
    const hadProfileResolver = Object.prototype.hasOwnProperty.call(
        globalThis,
        'resolveHumanoidActorVisualProfile'
    );
    const previousProfileResolver =
        globalThis.resolveHumanoidActorVisualProfile;
    const genders = [];

    globalThis.getSidePlayerAnimationFrame = gender => {
        genders.push(gender);
        return {
            pose: {
                bobY: 0,
                weapon: {
                    grip: [22, 19],
                    arrowTip: [28, 19]
                }
            },
            anchors: {
                weaponHand: [18, 20]
            }
        };
    };
    globalThis.resolveHumanoidActorVisualProfile = () => ({
        appearance: { gender: 'female' },
        stanceProfile: { visualScale: 1 },
        equipment: {
            weapon: {
                spriteId: 'weap_longbow',
                projectileSprite: 'icon_arrow'
            }
        }
    });

    try {
        const actor = {
            uid: 'enemy_anchor',
            x: 1,
            y: 2,
            visualX: 10,
            visualY: 20,
            size: 1,
            appearance: { gender: 'male' }
        };
        const right = getCombatAnimationReleaseOrigin(
            actor,
            'shoot',
            3,
            'right'
        );
        const left = getCombatAnimationReleaseOrigin(
            actor,
            'shoot',
            3,
            'left'
        );

        assert.deepEqual(genders, ['female', 'female']);
        assert.equal(right.x, 10.390625);
        assert.equal(left.x, 9.609375);
        assert.equal(right.x + left.x, actor.visualX * 2);
        assert.equal(right.y, 20.109375);
        assert.equal(left.y, right.y);

        actor.size = 2;
        const largeRight = getCombatAnimationReleaseOrigin(
            actor,
            'shoot',
            3,
            'right'
        );
        const largeLeft = getCombatAnimationReleaseOrigin(
            actor,
            'shoot',
            3,
            'left'
        );
        assert.equal(largeRight.x, 10.890625);
        assert.equal(largeLeft.x, 10.109375);
        assert.equal(largeRight.x + largeLeft.x, 21);
        assert.equal(largeRight.y, 20.609375);
        assert.equal(largeLeft.y, largeRight.y);

        globalThis.resolveHumanoidActorVisualProfile = () => null;
        actor.appearance.gender = 'female';
        actor.size = 1;
        actor.equipment = { weapon: null };
        const hand = getCombatAnimationReleaseOrigin(
            actor,
            'shoot',
            3,
            'right'
        );
        assert.equal(hand.x, 10.078125);
    } finally {
        if (hadFrameResolver) {
            globalThis.getSidePlayerAnimationFrame = previousFrameResolver;
        } else {
            delete globalThis.getSidePlayerAnimationFrame;
        }
        if (hadProfileResolver) {
            globalThis.resolveHumanoidActorVisualProfile =
                previousProfileResolver;
        } else {
            delete globalThis.resolveHumanoidActorVisualProfile;
        }
    }
});

test('combat playback settles only after both recovery and impact', () => {
    let completions = 0;
    const barrier = createCombatPlaybackBarrier(() => {
        completions++;
    });

    barrier.markImpactComplete();
    barrier.markImpactComplete();
    assert.equal(completions, 0);

    barrier.markActionComplete();
    barrier.markActionComplete();
    assert.equal(completions, 1);
});

test('a cancelled playback barrier ignores late action and impact callbacks', () => {
    let completions = 0;
    const barrier = createCombatPlaybackBarrier(() => {
        completions++;
    });

    barrier.cancel();
    barrier.markActionComplete();
    barrier.markImpactComplete();
    assert.equal(completions, 0);
});

test('projectile and beam callbacks fire at visual arrival', () => {
    const timers = [];
    const context = vm.createContext({
        currentTileSize: 32,
        activeExplosions: [],
        SpriteMatrices: {},
        setTimeout(callback, delay) {
            timers.push({ callback, delay });
        }
    });
    const fxSource = fs.readFileSync(
        path.join(projectRoot, 'public', 'js', 'fx-engine.js'),
        'utf8'
    );
    vm.runInContext(
        `${fxSource}\nthis.__fxEngine = FXEngine;`,
        context,
        { filename: 'fx-engine.js' }
    );

    const canvasContext = {
        save() {},
        restore() {},
        translate() {},
        rotate() {}
    };
    let projectileArrivals = 0;
    context.__fxEngine.spawnProjectile(
        0,
        0,
        3,
        0,
        'icon_arrow',
        {
            frames: 3,
            onComplete() {
                projectileArrivals++;
            }
        }
    );

    context.__fxEngine.render(canvasContext, 32);
    context.__fxEngine.render(canvasContext, 32);
    assert.equal(projectileArrivals, 0);
    context.__fxEngine.render(canvasContext, 32);
    assert.equal(projectileArrivals, 1);

    let beamArrivals = 0;
    const travelTime = context.__fxEngine.spawnBeam(
        0,
        0,
        2,
        0,
        {
            density: 16,
            speed: 10,
            onComplete() {
                beamArrivals++;
            }
        }
    );
    const finalTimers = timers.filter(timer => timer.delay === travelTime);

    assert.equal(travelTime, 40);
    assert.equal(finalTimers.length, 2);
    finalTimers.forEach(timer => timer.callback());
    assert.equal(beamArrivals, 1);
});

test('the live game loads and consumes the combat animation bridge', () => {
    const indexSource = fs.readFileSync(
        path.join(projectRoot, 'public', 'index.html'),
        'utf8'
    );
    const mainSource = fs.readFileSync(
        path.join(projectRoot, 'public', 'js', 'main.js'),
        'utf8'
    );
    const rendererSource = fs.readFileSync(
        path.join(projectRoot, 'public', 'js', 'renderer.js'),
        'utf8'
    );
    const fxSource = fs.readFileSync(
        path.join(projectRoot, 'public', 'js', 'fx-engine.js'),
        'utf8'
    );

    const sideScriptIndex = indexSource.indexOf(
        'sprite-overhaul-animation.js?v='
    );
    const bridgeScriptIndex = indexSource.indexOf(
        'combat-animation.js?v='
    );
    const mainScriptIndex = indexSource.indexOf('main.js?v=');

    assert.ok(sideScriptIndex >= 0);
    assert.ok(bridgeScriptIndex > sideScriptIndex);
    assert.ok(mainScriptIndex > bridgeScriptIndex);
    assert.match(mainSource, /playOutgoingCombatHit/);
    assert.match(mainSource, /function startCombatSpriteActionWhenReady/);
    assert.match(mainSource, /compressedPlaybackOptions/);
    assert.match(mainSource, /reactionTimeline\.durationMs/);
    assert.match(mainSource, /releaseOrigin/);
    assert.match(mainSource, /createCombatPlaybackBarrier/);
    assert.match(rendererSource, /drawSidePlayerAnimationFrame/);
    assert.match(rendererSource, /CombatSpriteAnimation\.getRenderState/);
    assert.match(fxSource, /spawnMeleeImpact/);
    assert.match(fxSource, /config\.onComplete/);
});
