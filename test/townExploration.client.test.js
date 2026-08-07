const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');
const townSource = fs.readFileSync(
    path.join(projectRoot, 'public', 'js', 'town-exploration.js'),
    'utf8'
);
const dialogueSource = fs.readFileSync(
    path.join(projectRoot, 'public', 'js', 'dialogue.js'),
    'utf8'
);
const expeditionSource = fs.readFileSync(
    path.join(projectRoot, 'public', 'js', 'expeditions.js'),
    'utf8'
);
const mainSource = fs.readFileSync(
    path.join(projectRoot, 'public', 'js', 'main.js'),
    'utf8'
);
const html = fs.readFileSync(path.join(projectRoot, 'public', 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(projectRoot, 'public', 'style.css'), 'utf8');
const town = require('../public/js/town-exploration.js');

function extractFunction(source, functionName, nextFunctionName) {
    const start = source.indexOf(`function ${functionName}`);
    const end = source.indexOf(`\nfunction ${nextFunctionName}`, start);
    assert.notEqual(start, -1, `${functionName} is missing`);
    assert.notEqual(end, -1, `${functionName} boundary is missing`);
    return source.slice(start, end);
}

function makePointerHarness() {
    const observations = {
        closed: 0,
        path: null,
        selectedNpcId: null,
        startedPath: null,
        status: null,
        stopped: 0
    };
    const context = vm.createContext({
        Math,
        Number,
        TOWN_SCENE: town.TOWN_SCENE,
        closeTownNpcDialogue() {
            observations.closed += 1;
        },
        findTownPath(start, target) {
            observations.path = { start: { ...start }, target: { ...target } };
            return [{ ...target }];
        },
        getTownNpcRecords() {
            return context.npcs;
        },
        npcs: [],
        startTownPath(pathToWalk) {
            observations.startedPath = pathToWalk.map(tile => ({ ...tile }));
        },
        stopTownWalking() {
            observations.stopped += 1;
        },
        townPendingNpcId: 'previous-npc',
        townPlayerPosition: { x: 15, y: 16 },
        townSelectedNpcId: 'previous-npc',
        updateTownStatus(message) {
            observations.status = message;
        },
        walkToTownNpc(npcId) {
            observations.selectedNpcId = npcId;
        }
    });
    const handlerSource = extractFunction(
        townSource,
        'handleTownCanvasPointer',
        'teardownWalkableTown'
    );
    vm.runInContext(
        `${handlerSource}\nglobalThis.__handleTownCanvasPointer = handleTownCanvasPointer;`,
        context,
        { filename: 'town-pointer-handler.js' }
    );
    return { context, handle: context.__handleTownCanvasPointer, observations };
}

function clientPointForLogical(rect, canvas, logicalX, logicalY) {
    return {
        clientX: rect.left + logicalX * rect.width / canvas.width,
        clientY: rect.top + logicalY * rect.height / canvas.height
    };
}

test('town scene dimensions and collision paths stay aligned to the canvas grid', () => {
    assert.deepEqual(town.TOWN_SCENE, { columns: 30, rows: 18, tileSize: 24 });
    assert.match(html, /id="town-exploration-canvas" width="720" height="432"/);

    const blocked = town.getTownBlockedTileSet();
    const start = { x: 15, y: 16 };
    const target = { x: 1, y: 1 };
    const route = town.findTownPath(start, target, blocked);

    assert.ok(route.length > 0);
    assert.deepEqual(route.at(-1), target);
    let previous = start;
    route.forEach(tile => {
        assert.equal(town.isTownTileWalkable(tile.x, tile.y, blocked), true);
        assert.equal(Math.abs(tile.x - previous.x) + Math.abs(tile.y - previous.y), 1);
        previous = tile;
    });
    assert.equal(blocked.has('14,4'), true, 'the bar remains a collision boundary');
    assert.equal(blocked.has('14,3'), true, 'Kreg occupies his own tile');
});

test('every townsfolk placement has a reachable interaction tile', () => {
    const blocked = town.getTownBlockedTileSet();
    const start = { x: 15, y: 16 };

    Object.entries(town.TOWN_NPC_PLACEMENTS).forEach(([npcId, npc]) => {
        const candidates = [];
        for (let y = npc.y - town.TOWN_INTERACTION_RANGE; y <= npc.y + town.TOWN_INTERACTION_RANGE; y += 1) {
            for (let x = npc.x - town.TOWN_INTERACTION_RANGE; x <= npc.x + town.TOWN_INTERACTION_RANGE; x += 1) {
                if (Math.abs(npc.x - x) + Math.abs(npc.y - y) > town.TOWN_INTERACTION_RANGE) continue;
                if (!town.isTownTileWalkable(x, y, blocked)) continue;
                const route = town.findTownPath(start, { x, y }, blocked);
                if (route.length || (x === start.x && y === start.y)) candidates.push(route);
            }
        }
        assert.ok(candidates.length > 0, `${npcId} must be approachable without crossing scenery`);
    });
});

test('scaled mobile pointer taps use a forgiving NPC hit target and cancel the old route', () => {
    const harness = makePointerHarness();
    const rect = { left: 10, top: 20, width: 360, height: 216 };
    const canvas = {
        width: 720,
        height: 432,
        getBoundingClientRect() {
            return rect;
        }
    };
    harness.context.npcs = [{ id: 'mara', x: 25, y: 6 }];

    // This point is visibly on Mara's enlarged sprite, but falls in logical row
    // five rather than her exact row-six occupancy tile.
    const point = clientPointForLogical(rect, canvas, 25 * 24 + 12, 5 * 24 + 20);
    harness.handle({
        ...point,
        button: 0,
        currentTarget: canvas,
        isPrimary: true,
        preventDefault() {}
    });

    assert.equal(harness.observations.selectedNpcId, 'mara');
    assert.equal(harness.observations.stopped, 1);
    assert.equal(harness.context.townPendingNpcId, null);
    assert.equal(harness.observations.path, null, 'an NPC tap must not become a floor path');
});

test('scaled floor taps resolve the same logical destination while invalid pointers are ignored', () => {
    const harness = makePointerHarness();
    const rect = { left: 35, top: 42, width: 360, height: 216 };
    const canvas = {
        width: 720,
        height: 432,
        getBoundingClientRect() {
            return rect;
        }
    };
    const point = clientPointForLogical(rect, canvas, 20 * 24 + 12, 8 * 24 + 12);

    harness.handle({
        ...point,
        button: 0,
        currentTarget: canvas,
        isPrimary: true,
        preventDefault() {}
    });
    assert.deepEqual(harness.observations.path.target, { x: 20, y: 8 });
    assert.deepEqual(harness.observations.startedPath, [{ x: 20, y: 8 }]);
    assert.equal(harness.observations.closed, 1);

    const stoppedBeforeInvalidPointer = harness.observations.stopped;
    harness.handle({
        ...point,
        button: 2,
        currentTarget: canvas,
        isPrimary: true,
        preventDefault() {
            assert.fail('secondary pointers should be ignored before cancellation');
        }
    });
    assert.equal(harness.observations.stopped, stoppedBeforeInvalidPointer);
});

test('town and classic dialogue controls expose mobile-sized and keyboard-operable alternatives', () => {
    assert.match(styles, /#town-exploration-canvas\s*\{[\s\S]*?touch-action:\s*none;/);
    assert.match(styles, /\.town-nearby-npcs button\s*\{[\s\S]*?min-height:\s*44px;/);
    assert.match(html, /id="town-exploration-canvas"[^>]+tabindex="0"[^>]+Arrow keys or WASD/);
    assert.match(html, /id="dialogue-overlay"[^>]+role="dialog"[^>]+aria-modal="true"[^>]+tabindex="-1"/);
    assert.match(html, /id="dialogue-choice-menu"[^>]+role="group"/);
    assert.match(html, /id="town-shop-overlay"[^>]+hidden/);

    assert.match(dialogueSource, /textContent\.textContent = currentDialogueText/);
    assert.doesNotMatch(dialogueSource, /dialogue-text-content'\)\.innerHTML/);
    assert.match(dialogueSource, /event\.stopPropagation\(\);[\s\S]{0,100}selectDialogueChoice/);
    assert.match(dialogueSource, /dialogueCancelCallback/);
    assert.match(dialogueSource, /event\.key === 'Escape'/);
    assert.match(dialogueSource, /'ArrowDown'[\s\S]{0,80}'ArrowUp'/);
    assert.match(townSource, /function handleTownShopKeydown/);
    assert.match(townSource, /overlay\.removeEventListener\('keydown', handleTownShopKeydown\)/);
    assert.match(townSource, /data-town-shop-id/);
    assert.match(townSource, /hadListFocus[\s\S]{0,800}focusTarget\.focus/);
    assert.match(townSource, /focusedNpcId[\s\S]{0,800}replacement\.focus/);
});

test('town navigation cleans up fixed overlays and all gameplay actions remain identifier-only', () => {
    assert.match(mainSource, /previousState === 'TOWN'[\s\S]{0,100}teardownWalkableTown\(\)/);
    assert.match(townSource, /function teardownWalkableTown\(\)[\s\S]{0,220}stopTownWalking\(\)[\s\S]{0,220}closeTownShop\(false\)/);
    assert.doesNotMatch(townSource, /socket\.emit\(/);

    assert.match(expeditionSource, /socket\.emit\('acceptContract', \{ contractId \}\)/);
    assert.match(expeditionSource, /socket\.emit\('claimContract', \{ contractId \}\)/);
    assert.match(expeditionSource, /socket\.emit\('purchaseChapterOneStock', \{ stockId \}\)/);
    assert.match(expeditionSource, /socket\.emit\('recruitChapterOneNpc', \{ npcId \}\)/);
    assert.match(expeditionSource, /socket\.emit\('selectChapterOneFinalePreparation', \{ optionId \}\)/);
    assert.doesNotMatch(expeditionSource, /socket\.emit\('purchaseChapterOneStock',[\s\S]{0,100}(price|item)/);
});
