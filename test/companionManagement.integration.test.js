const test = require('node:test');
const assert = require('node:assert/strict');

const registerTownRouter = require('../townRouter.js');

class FakeSocket {
    constructor(id = 'companion-management') {
        this.id = id;
        this.handlers = new Map();
        this.emitted = [];
    }

    on(eventName, handler) {
        this.handlers.set(eventName, handler);
    }

    emit(eventName, payload) {
        this.emitted.push({ eventName, payload });
    }

    dispatch(eventName, payload) {
        const handler = this.handlers.get(eventName);
        assert.ok(handler, `Missing socket handler for ${eventName}`);
        handler(payload);
    }

    lastPayload(eventName) {
        const event = [...this.emitted].reverse().find(entry => entry.eventName === eventName);
        return event && event.payload;
    }
}

function item(id, slot, combat = null) {
    return { id, name: id, slot, rarity: 'Common', ...(combat ? { combat } : {}) };
}

function mercenary(number, overrides = {}) {
    return {
        instanceId: `merc_${number}`,
        templateId: 'starter_mercenary',
        name: `Mercenary ${number}`,
        role: 'Frontliner',
        level: 1,
        xp: 0,
        hired: true,
        active: false,
        icon: 'M',
        spriteId: 'companion_marlow',
        stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
        equipment: { weapon: null, helmet: null, armor: null, gloves: null, boots: null },
        pockets: [null, null],
        ...overrides
    };
}

function player(companions = [], activeIds = []) {
    return {
        username: 'Management Tester',
        level: 5,
        gold: 5000,
        inventory: [],
        stash: [],
        equipment: {},
        maxInventorySlots: 10,
        vaultSlots: 10,
        roster: { companions, activeIds }
    };
}

function createHarness(knight, activeCombat = null) {
    const socket = new FakeSocket();
    const activePlayers = { [socket.id]: knight };
    const activeCombats = {};
    if (activeCombat) activeCombats[socket.id] = activeCombat;
    registerTownRouter(socket, { to: () => ({ emit: () => {} }) }, activePlayers, activeCombats);
    return { socket, player: knight, activeCombats };
}

test('Bench All leaves an explicit empty party and Fill Party selects at most three mercenaries', () => {
    const companions = Array.from({ length: 5 }, (_, index) => mercenary(index + 1));
    const harness = createHarness(player(companions, ['merc_1', 'merc_2', 'merc_3']));

    harness.socket.dispatch('townAction', { action: 'benchAllCompanions' });
    assert.equal(harness.socket.lastPayload('townReceipt').success, true);
    assert.deepEqual(harness.player.roster.activeIds, []);

    harness.socket.dispatch('townAction', { action: 'fillActiveCompanions' });
    assert.equal(harness.socket.lastPayload('townReceipt').success, true);
    assert.deepEqual(harness.player.roster.activeIds, ['merc_1', 'merc_2', 'merc_3']);
});

test('quest-required mercenaries refuse both bench and dismissal requests with no roster mutation', () => {
    const required = mercenary(1);
    const knight = player([required], []);
    knight.activeQuestSession = { requiredCompanionIds: [required.instanceId] };
    const harness = createHarness(knight);

    harness.socket.dispatch('townAction', { action: 'benchCompanion', instanceId: required.instanceId });
    const benchReceipt = harness.socket.lastPayload('townReceipt');
    assert.equal(benchReceipt.success, false);
    assert.match(benchReceipt.message, /quest/i);

    harness.socket.dispatch('townAction', { action: 'dismissCompanion', instanceId: required.instanceId });
    const dismissReceipt = harness.socket.lastPayload('townReceipt');
    assert.equal(dismissReceipt.success, false);
    assert.match(dismissReceipt.message, /quest/i);
    assert.deepEqual(harness.player.roster.activeIds, []);
    assert.equal(harness.player.roster.companions.length, 1);
});

test('dismissal refuses insufficient backpack space, then returns every paperdoll and pocket item atomically', () => {
    const storedWeapon = item('stored_sword', 'weapon');
    const storedPotion = item('stored_potion', 'consumable', { actionType: 'heal', healPercent: 0.4 });
    const departing = mercenary(1, {
        equipment: { weapon: storedWeapon, helmet: null, armor: null, gloves: null, boots: null },
        pockets: [storedPotion, null]
    });
    const knight = player([departing], [departing.instanceId]);
    knight.maxInventorySlots = 2;
    knight.inventory = [item('occupied', 'weapon')];
    const harness = createHarness(knight);

    harness.socket.dispatch('townAction', { action: 'dismissCompanion', instanceId: departing.instanceId });
    const refused = harness.socket.lastPayload('townReceipt');
    assert.equal(refused.success, false);
    assert.match(refused.message, /free 1 more backpack slot/i);
    assert.equal(harness.player.roster.companions.length, 1);
    assert.deepEqual(harness.player.inventory.map(entry => entry.id), ['occupied']);

    harness.player.inventory.pop();
    harness.socket.dispatch('townAction', { action: 'dismissCompanion', instanceId: departing.instanceId });
    const accepted = harness.socket.lastPayload('townReceipt');
    assert.equal(accepted.success, true);
    assert.equal(harness.player.roster.companions.length, 0);
    assert.deepEqual(harness.player.roster.activeIds, []);
    assert.deepEqual(harness.player.inventory.map(entry => entry.id), ['stored_sword', 'stored_potion']);
});

test('two true pockets store equipment or combat consumables and return them to the shared backpack', () => {
    const companion = mercenary(1);
    const potion = item('healing_draught', 'consumable', { actionType: 'heal', healPercent: 0.4 });
    const junk = item('quest_token', 'quest');
    const knight = player([companion], []);
    knight.inventory = [potion, junk];
    const harness = createHarness(knight);

    harness.socket.dispatch('inventoryAction', {
        action: 'storeCompanionPocket',
        instanceId: companion.instanceId,
        pocketIndex: 0,
        index: 0
    });
    assert.equal(harness.socket.lastPayload('inventoryReceipt').success, true);
    assert.equal(harness.player.roster.companions[0].pockets[0].id, 'healing_draught');
    assert.deepEqual(harness.player.inventory.map(entry => entry.id), ['quest_token']);

    harness.socket.dispatch('inventoryAction', {
        action: 'storeCompanionPocket',
        instanceId: companion.instanceId,
        pocketIndex: 1,
        index: 0
    });
    assert.equal(harness.socket.lastPayload('inventoryReceipt').success, false);
    assert.match(harness.socket.lastPayload('inventoryReceipt').message, /equipment or combat consumables/i);

    harness.socket.dispatch('inventoryAction', {
        action: 'removeCompanionPocket',
        instanceId: companion.instanceId,
        pocketIndex: 0
    });
    assert.equal(harness.socket.lastPayload('inventoryReceipt').success, true);
    assert.equal(harness.player.roster.companions[0].pockets[0], null);
    assert.deepEqual(harness.player.inventory.map(entry => entry.id), ['quest_token', 'healing_draught']);
});

test('training through the town router advances one level, charges the quote, and refuses combat training', () => {
    const trainee = mercenary(1);
    const knight = player([trainee], []);
    knight.gold = 1000;
    const harness = createHarness(knight);

    harness.socket.dispatch('townAction', { action: 'trainMercenary', instanceId: trainee.instanceId });
    const trained = harness.socket.lastPayload('townReceipt');
    assert.equal(trained.success, true);
    assert.equal(trained.training.currentLevel, 2);
    assert.equal(harness.player.gold, 700);
    assert.equal(harness.player.roster.companions[0].level, 2);

    harness.activeCombats[harness.socket.id] = { activeActorUid: 'player_0' };
    harness.socket.dispatch('townAction', { action: 'trainMercenary', instanceId: trainee.instanceId });
    const blocked = harness.socket.lastPayload('townReceipt');
    assert.equal(blocked.success, false);
    assert.equal(blocked.training.code, 'IN_COMBAT');
    assert.equal(harness.player.roster.companions[0].level, 2);
});
