const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');
const rendererSource = fs.readFileSync(
    path.join(projectRoot, 'public', 'js', 'renderer.js'),
    'utf8'
);

const initializerStart = rendererSource.indexOf(
    '(function initializeCombatCanvasInteractions'
);

assert.notEqual(initializerStart, -1, 'renderer combat initializer is missing');
const initializerSource = rendererSource.slice(initializerStart);

function runInitializer(canvas, overrides = {}) {
    const listeners = new Map();
    const requestedElementIds = [];
    const animationCallbacks = [];
    let tooltipHideCount = 0;

    if (canvas) {
        canvas.addEventListener = (eventName, handler) => {
            listeners.set(eventName, handler);
        };
    }

    const context = vm.createContext({
        document: {
            getElementById(elementId) {
                requestedElementIds.push(elementId);
                return canvas;
            }
        },
        gameState: 'TOWN',
        hideTooltip() {
            tooltipHideCount++;
        },
        hoverTile: { x: 4, y: 5 },
        requestAnimationFrame(callback) {
            animationCallbacks.push(callback);
        },
        updateAnimationEngine() {},
        ...overrides
    });

    vm.runInContext(initializerSource, context, {
        filename: 'renderer-combat-initializer.js'
    });

    return {
        animationCallbacks,
        context,
        getTooltipHideCount: () => tooltipHideCount,
        listeners,
        requestedElementIds
    };
}

test('renderer skips combat listeners and heartbeat when gameCanvas is absent', () => {
    const result = runInitializer(null);

    assert.deepEqual(result.requestedElementIds, ['gameCanvas']);
    assert.equal(result.listeners.size, 0);
    assert.equal(result.animationCallbacks.length, 0);
});

test('complete renderer script loads on an asset tool without gameCanvas', () => {
    let animationRequestCount = 0;
    const context = vm.createContext({
        document: {
            createElement(elementName) {
                assert.equal(elementName, 'canvas');
                return {
                    getContext() {
                        return {};
                    }
                };
            },
            getElementById(elementId) {
                assert.equal(elementId, 'gameCanvas');
                return null;
            }
        },
        requestAnimationFrame() {
            animationRequestCount++;
        },
        window: {}
    });

    assert.doesNotThrow(() => vm.runInContext(rendererSource, context, {
        filename: 'renderer.js'
    }));
    assert.equal(animationRequestCount, 0);
    assert.equal(typeof context.window.clearSpriteCache, 'function');
});

test('renderer accepts a partial document without DOM lookup helpers', () => {
    let animationRequestCount = 0;
    const context = vm.createContext({
        document: {
            createElement() {
                return {
                    getContext() {
                        return {};
                    }
                };
            }
        },
        requestAnimationFrame() {
            animationRequestCount++;
        },
        window: {}
    });

    assert.doesNotThrow(() => vm.runInContext(rendererSource, context, {
        filename: 'renderer.js'
    }));
    assert.equal(animationRequestCount, 0);
});

test('renderer installs combat interactions and heartbeat when gameCanvas exists', () => {
    const canvas = {
        width: 640,
        height: 640,
        getBoundingClientRect() {
            return { left: 0, top: 0, width: 640, height: 640 };
        }
    };
    const result = runInitializer(canvas);

    assert.deepEqual(result.requestedElementIds, ['gameCanvas']);
    assert.deepEqual([...result.listeners.keys()], ['mouseleave', 'mousemove', 'click']);
    assert.equal(result.animationCallbacks.length, 1);
    assert.equal(result.animationCallbacks[0], result.context.updateAnimationEngine);

    result.listeners.get('mouseleave')();
    assert.deepEqual(
        { x: result.context.hoverTile.x, y: result.context.hoverTile.y },
        { x: -1, y: -1 }
    );
    assert.equal(result.getTooltipHideCount(), 1);

    assert.doesNotThrow(() => result.listeners.get('mousemove')({}));
    assert.doesNotThrow(() => result.listeners.get('click')({}));
});

test('combat mouse and targeting handlers use the resolved gameCanvas', () => {
    const targetedTiles = [];
    const canvas = {
        width: 640,
        height: 640,
        getBoundingClientRect() {
            return { left: 0, top: 0, width: 640, height: 640 };
        }
    };
    const result = runInitializer(canvas, {
        gameState: 'COMBAT',
        currentTurn: 'PLAYER',
        currentTileSize: 64,
        currentGridSize: { cols: 10, rows: 10 },
        combatPhase: 'TARGETING',
        enemies: [],
        rogues: [],
        allies: [],
        getActiveCombatantPosition() {
            return { x: 0, y: 0, size: 1 };
        },
        getCombatTargetProfile() {
            return {};
        },
        getCombatTileTargetValidity() {
            return { valid: true, inRange: true };
        },
        executeTargetAction(tx, ty) {
            targetedTiles.push({ tx, ty });
        },
        logMessage() {},
        playRetroSound() {},
        showTooltip() {}
    });

    assert.doesNotThrow(() => result.listeners.get('mousemove')({
        clientX: 96,
        clientY: 160
    }));
    assert.doesNotThrow(() => result.listeners.get('click')({
        clientX: 96,
        clientY: 160
    }));
    assert.deepEqual(targetedTiles, [{ tx: 1, ty: 2 }]);
});
