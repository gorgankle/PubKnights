const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const townSource = fs.readFileSync(path.join(root, 'public', 'js', 'town-exploration.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(root, 'public', 'js', 'main.js'), 'utf8');
const socialSource = fs.readFileSync(path.join(root, 'public', 'js', 'social.js'), 'utf8');
const companionSource = fs.readFileSync(path.join(root, 'public', 'js', 'companion-ui.js'), 'utf8');

function extractFunction(source, functionName, nextFunctionName) {
    const start = source.indexOf(`function ${functionName}`);
    const end = source.indexOf(`\nfunction ${nextFunctionName}`, start);
    assert.notEqual(start, -1, `${functionName} is missing`);
    assert.notEqual(end, -1, `${functionName} boundary is missing`);
    return source.slice(start, end);
}

test('retargeting another townsfolk dismisses the old actionable dialogue before walking', () => {
    const calls = [];
    const context = vm.createContext({
        closeDialogueOverlay(runComplete) { calls.push(['dialogue', runComplete]); },
        closeTownShop(reopenDialogue) { calls.push(['shop', reopenDialogue]); },
        getTownNpcApproachPath() { return [{ x: 4, y: 6 }]; },
        getTownNpcDistance() { return 4; },
        getTownNpcRecords() { return [{ id: 'mara', name: 'Mara', x: 5, y: 6 }]; },
        startTownPath(pathToWalk, arrival) { calls.push(['walk', pathToWalk, arrival]); },
        stopTownWalking() { calls.push(['stop']); },
        townPendingArrival: { kind: 'npc', id: 'kreg' },
        townSelectedDestinationId: 'roads',
        townSelectedNpcId: 'kreg',
        TOWN_INTERACTION_RANGE: 2,
        updateTownStatus(message) { calls.push(['status', message]); }
    });
    vm.runInContext(
        `${extractFunction(townSource, 'walkToTownNpc', 'walkToTownDestination')}\n`
            + 'globalThis.__walkToTownNpc = walkToTownNpc;',
        context,
        { filename: 'town-npc-retarget.js' }
    );

    context.__walkToTownNpc('mara');

    const dialogueIndex = calls.findIndex(call => call[0] === 'dialogue');
    const shopIndex = calls.findIndex(call => call[0] === 'shop');
    const walkIndex = calls.findIndex(call => call[0] === 'walk');
    assert.ok(dialogueIndex >= 0 && dialogueIndex < walkIndex);
    assert.ok(shopIndex >= 0 && shopIndex < walkIndex);
    assert.equal(calls[walkIndex][2].kind, 'npc');
    assert.equal(calls[walkIndex][2].id, 'mara');
    assert.equal(context.townPendingArrival, null);
    assert.equal(context.townSelectedDestinationId, null);
});

test('every hub screen change focuses its visible heading and resets the viewport', () => {
    const focused = [];
    const scrolls = [];
    const headings = Object.fromEntries([
        ['town-screen-title', 'TOWN'],
        ['knight-screen-title', 'KNIGHT'],
        ['party-screen-title', 'PARTY'],
        ['adventures-screen-title', 'ADVENTURES'],
        ['vault-screen-title', 'VAULT'],
        ['community-screen-title', 'COMMUNITY']
    ].map(([id, state]) => [id, {
        focus(options) { focused.push({ state, options }); }
    }]));
    const context = vm.createContext({
        document: { getElementById(id) { return headings[id] || null; } },
        gameState: 'TOWN',
        hideTooltip() {},
        joinMultiplayerZone() {},
        leaveMultiplayerZone() {},
        logMessage() {},
        player: { adventure: { activeJourney: null } },
        playRetroSound() {},
        refreshSystemUI() {},
        teardownWalkableTown() {},
        window: { scrollTo(...args) { scrolls.push(args); } }
    });
    const start = mainSource.indexOf('function setGameState(state)');
    const end = mainSource.indexOf('// === NEW: MOBILE TOOLTIP DISMISSAL ===', start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    vm.runInContext(mainSource.slice(start, end), context, { filename: 'hub-router.js' });

    ['KNIGHT', 'PARTY', 'TOWN', 'ADVENTURES', 'VAULT', 'COMMUNITY']
        .forEach(state => context.setGameState(state));

    assert.deepEqual(focused.map(entry => entry.state), [
        'KNIGHT', 'PARTY', 'TOWN', 'ADVENTURES', 'VAULT', 'COMMUNITY'
    ]);
    assert.ok(focused.every(entry => entry.options && entry.options.preventScroll === true));
    assert.equal(scrolls.length, 6);
    assert.ok(scrolls.every(args => args[0] === 0 && args[1] === 0));
});

test('a stale Community join acknowledgement cannot reactivate the zone after leaving', () => {
    const listenerStart = socialSource.indexOf("socket.on('zoneJoined', (data) => {");
    const bodyStart = socialSource.indexOf('{', listenerStart) + 1;
    const listenerEnd = socialSource.indexOf('\n});', bodyStart);
    assert.notEqual(listenerStart, -1);
    assert.notEqual(listenerEnd, -1);
    const body = socialSource.slice(bodyStart, listenerEnd);
    const context = vm.createContext({
        currentSocialZone: null,
        expectedSocialZone: null,
        gameState: 'TOWN',
        playersInRoom: {},
        document: { getElementById() { return { innerHTML: '' }; } },
        renderStarts: 0,
        startSocialRenderLoop() { context.renderStarts += 1; },
        updateSocialPlayerList() {}
    });
    vm.runInContext(`globalThis.__zoneJoined = data => {${body}\n};`, context, {
        filename: 'community-zone-joined.js'
    });

    context.__zoneJoined({ zoneId: 'ZONE_HUB', players: [] });
    assert.equal(context.currentSocialZone, null);
    assert.equal(context.renderStarts, 0);

    context.expectedSocialZone = 'ZONE_HUB';
    context.gameState = 'COMMUNITY';
    context.__zoneJoined({ zoneId: 'ZONE_HUB', players: [] });
    assert.equal(context.currentSocialZone, 'ZONE_HUB');
    assert.equal(context.renderStarts, 1);
});

class FakeElement {
    constructor() {
        this.attributes = {};
        this.children = [];
        this.dataset = {};
        this.disabled = false;
        this.draggable = false;
        this.tabIndex = -1;
    }

    addEventListener(name, listener) { this[`on${name}`] = listener; }
    appendChild(child) { this.children.push(child); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
}

test('Party focus and stored-slot controls survive authoritative redraws without releasing on unrelated receipts', () => {
    const actions = [];
    const oldFocus = {
        dataset: { partyFocusKey: 'companion:merc_1:equipment', partyCompanionId: 'merc_1' },
        closest() { return null; }
    };
    const replacement = new FakeElement();
    replacement.dataset.partyFocusKey = 'companion:merc_1:equipment';
    replacement.focus = options => { replacement.focusOptions = options; };
    const partyList = {
        attributes: {},
        contains(element) { return element === oldFocus; },
        querySelectorAll() { return []; },
        setAttribute(name, value) { this.attributes[name] = String(value); }
    };
    const equipmentPanel = {
        attributes: {},
        contains() { return false; },
        querySelectorAll() { return []; },
        setAttribute(name, value) { this.attributes[name] = String(value); }
    };
    const status = { textContent: '' };
    const document = {
        activeElement: oldFocus,
        createElement() { return new FakeElement(); },
        getElementById(id) {
            if (id === 'party-inventory-list') return partyList;
            if (id === 'companion-equipment-panel') return equipmentPanel;
            if (id === 'party-inventory-status') return status;
            return null;
        },
        querySelectorAll() { return [replacement]; }
    };
    const player = {
        adventure: { activeJourney: null },
        inventory: [{ id: 'sword', name: 'Sword', slot: 'weapon' }],
        roster: {
            activeIds: ['merc_1'],
            companions: [{ instanceId: 'merc_1', name: 'Mira', equipment: {}, pockets: [null] }]
        }
    };
    const context = vm.createContext({
        document,
        gameState: 'PARTY',
        player,
        window: { selectedCompanionInstanceId: 'merc_1' },
        equipCompanionItem(instanceId, index) { actions.push({ action: 'equipCompanion', instanceId, index }); },
        unequipCompanionItem(instanceId, slotKey) { actions.push({ action: 'unequipCompanion', instanceId, slotKey }); },
        removeCompanionPocketItem(instanceId, pocketIndex) { actions.push({ action: 'removeCompanionPocket', instanceId, pocketIndex }); },
        storeCompanionPocketItem(instanceId, index, pocketIndex) { actions.push({ action: 'storeCompanionPocket', instanceId, index, pocketIndex }); },
        logMessage() {},
        playRetroSound() {}
    });
    vm.runInContext(`${companionSource}\n        globalThis.__partyQa = {
            activatePartyBackpackItem,
            capturePartyFocus,
            completePartyInventoryAction,
            createCompanionPaperdollSlot,
            createCompanionPocketSlot,
            restoreRenderedPartyFocus
        };`, context, { filename: 'party-qa.js' });

    const focusState = context.__partyQa.capturePartyFocus(partyList, equipmentPanel);
    context.__partyQa.restoreRenderedPartyFocus(focusState);
    assert.equal(focusState.focusKey, 'companion:merc_1:equipment');
    assert.equal(focusState.companionId, 'merc_1');
    assert.equal(replacement.focusOptions.preventScroll, true);

    context.__partyQa.activatePartyBackpackItem(0, 'equip');
    assert.equal(actions.length, 1);
    assert.equal(context.__partyQa.completePartyInventoryAction({ action: 'reorderBackpack', success: true }), false);
    context.__partyQa.activatePartyBackpackItem(0, 'pocket');
    assert.equal(actions.length, 1, 'an unrelated receipt must not release the Party mutation lock');
    assert.equal(context.__partyQa.completePartyInventoryAction({ action: 'equipCompanion', success: true }), true);

    const equipped = context.__partyQa.createCompanionPaperdollSlot({
        instanceId: 'merc_1',
        equipment: { weapon: { id: 'sword', name: 'Sword', slot: 'weapon' } }
    }, 'weapon');
    assert.equal(equipped.getAttribute('role'), 'button');
    assert.equal(equipped.tabIndex, 0);
    assert.equal(typeof equipped.onclick, 'function');

    const empty = context.__partyQa.createCompanionPocketSlot({
        instanceId: 'merc_1',
        pockets: [null]
    }, 0);
    assert.equal(empty.getAttribute('role'), 'group');
    assert.equal(empty.tabIndex, -1);
    assert.equal(empty.onclick, undefined);
});
