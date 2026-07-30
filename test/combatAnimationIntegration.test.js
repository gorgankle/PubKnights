const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
    getCombatAnimationTimeline,
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
        'slash'
    );
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
        'sprite-overhaul-animation.js?v=27'
    );
    const bridgeScriptIndex = indexSource.indexOf(
        'combat-animation.js?v=4'
    );
    const mainScriptIndex = indexSource.indexOf('main.js?v=11');

    assert.ok(sideScriptIndex >= 0);
    assert.ok(bridgeScriptIndex > sideScriptIndex);
    assert.ok(mainScriptIndex > bridgeScriptIndex);
    assert.match(mainSource, /playOutgoingCombatHit/);
    assert.match(mainSource, /releaseOrigin/);
    assert.match(mainSource, /createCombatPlaybackBarrier/);
    assert.match(rendererSource, /drawSidePlayerAnimationFrame/);
    assert.match(rendererSource, /CombatSpriteAnimation\.getRenderState/);
    assert.match(fxSource, /spawnMeleeImpact/);
    assert.match(fxSource, /config\.onComplete/);
});
