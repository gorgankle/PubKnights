const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');
const fxSource = fs.readFileSync(
    path.join(projectRoot, 'public', 'js', 'fx-engine.js'),
    'utf8'
);

function createHarness() {
    let nextTimerId = 1;
    const scheduledTimers = [];
    const activeTimers = new Map();
    const clearedTimerIds = [];
    const context = vm.createContext({
        currentTileSize: 32,
        activeExplosions: [],
        SpriteMatrices: {},
        setTimeout(callback, delay) {
            const id = nextTimerId++;
            const timer = { id, callback, delay };
            scheduledTimers.push(timer);
            activeTimers.set(id, timer);
            return id;
        },
        clearTimeout(id) {
            clearedTimerIds.push(id);
            activeTimers.delete(id);
        }
    });

    vm.runInContext(
        `${fxSource}\nthis.__fxEngine = FXEngine;`,
        context,
        { filename: 'fx-engine.js' }
    );

    return {
        engine: context.__fxEngine,
        scheduledTimers,
        activeTimers,
        clearedTimerIds,
        runTimer(timer) {
            activeTimers.delete(timer.id);
            timer.callback();
        }
    };
}

function createCanvasContext() {
    return {
        save() {},
        restore() {},
        translate() {},
        rotate() {},
        beginPath() {},
        arc() {},
        fill() {}
    };
}

test('foreground projectile completion stays frame-authored and cancels its watchdog', () => {
    const harness = createHarness();
    const ctx = createCanvasContext();
    let completions = 0;

    harness.engine.spawnProjectile(0, 0, 3, 0, 'icon_arrow', {
        frames: 3,
        onComplete() {
            completions++;
        }
    });
    const originalWatchdog = harness.scheduledTimers[0];

    harness.engine.render(ctx, 32);
    harness.engine.render(ctx, 32);
    assert.equal(completions, 0);
    assert.equal(harness.engine.queue.length, 1);

    harness.engine.render(ctx, 32);
    assert.equal(completions, 1);
    assert.equal(harness.engine.queue.length, 0);
    assert.equal(harness.activeTimers.size, 0);
    assert.ok(harness.clearedTimerIds.length >= 1);

    // Simulate a timer callback that was already queued when it was cleared.
    harness.runTimer(originalWatchdog);
    assert.equal(completions, 1);
});

test('projectile watchdog completes the callback when no render frame arrives', () => {
    const harness = createHarness();
    let completions = 0;

    harness.engine.spawnProjectile(0, 0, 4, 0, 'icon_arrow', {
        frames: 15,
        onComplete() {
            completions++;
        }
    });

    assert.equal(completions, 0);
    assert.equal(harness.engine.queue.length, 1);
    assert.equal(harness.activeTimers.size, 1);

    const watchdog = Array.from(harness.activeTimers.values())[0];
    assert.ok(watchdog.delay >= 500);
    harness.runTimer(watchdog);

    assert.equal(completions, 1);
    assert.equal(harness.engine.queue.length, 0);
    assert.equal(harness.activeTimers.size, 0);
});

test('melee watchdog cleans up offsets and ignores late render and timer callbacks', () => {
    const harness = createHarness();
    const ctx = createCanvasContext();
    const attacker = {
        x: 0,
        y: 0,
        lungeOffsetX: 0,
        lungeOffsetY: 0,
        lungeHop: 0
    };
    let completions = 0;

    harness.engine.spawnMeleeStrike(attacker, 2, 0, 'lunge_slash', {
        frames: 15,
        onComplete() {
            completions++;
        }
    });
    harness.engine.render(ctx, 32);
    assert.notEqual(attacker.lungeOffsetX, 0);

    const watchdog = Array.from(harness.activeTimers.values())[0];
    harness.runTimer(watchdog);
    assert.equal(completions, 1);
    assert.equal(harness.engine.queue.length, 0);
    assert.equal(attacker.lungeOffsetX, 0);
    assert.equal(attacker.lungeOffsetY, 0);
    assert.equal(attacker.lungeHop, 0);

    harness.engine.render(ctx, 32);
    harness.runTimer(watchdog);
    assert.equal(completions, 1);
});
