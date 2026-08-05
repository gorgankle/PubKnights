const test = require('node:test');
const assert = require('node:assert/strict');

global.atbEngineStarted = true;

const registerCombatRouter = require('../combatRouter.js');
const registerAdventureRouter = require('../adventureRouter.js');
const registerTownRouter = require('../townRouter.js');
const {
    beginExpedition,
    beginReturnTrip,
    normalizeAdventureState,
    resolveExpeditionCombatVictory
} = require('../adventureState.js');

class FakeSocket {
    constructor(id = 'expedition-escrow-test') {
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
        const event = [...this.emitted]
            .reverse()
            .find(entry => entry.eventName === eventName);
        return event && event.payload;
    }

    emittedCount(eventName) {
        return this.emitted.filter(entry => entry.eventName === eventName).length;
    }
}

function makePlayer(overrides = {}) {
    return {
        username: 'Escrow Tester',
        level: 3,
        xp: 0,
        skillPoints: 0,
        gold: 10,
        hp: 25,
        stamina: 25,
        vitality: 1,
        maxStamina: 1,
        offense: 1,
        defense: 1,
        speed: 1,
        pendingGold: 0,
        pendingXp: 0,
        pendingLoot: [],
        inventory: [],
        stash: [],
        equipment: {},
        maxInventorySlots: 10,
        vaultSlots: 10,
        statusEffects: {},
        activeBuffs: [],
        roster: { companions: [], activeIds: [] },
        ...overrides
    };
}

function reachOldRoadDestination(player) {
    const outbound = beginExpedition(player, 'route_old_road', { random: () => 0 });
    assert.equal(outbound.success, true);
    const arrival = resolveExpeditionCombatVictory(player, outbound.expeditionContext);
    assert.equal(arrival.success, true);
    assert.equal(arrival.outcome, 'destination_reached');
    assert.equal(player.adventure.activeJourney.phase, 'AT_DESTINATION');
}

function returnSafely(player) {
    const returning = beginReturnTrip(player, { random: () => 0 });
    assert.equal(returning.success, true);
    const returned = resolveExpeditionCombatVictory(player, returning.expeditionContext);
    assert.equal(returned.success, true);
    assert.equal(returned.outcome, 'safe_return');
    assert.equal(player.adventure.activeJourney, null);
}

function registerCombatHarness(player) {
    const socket = new FakeSocket('combat-expedition-escrow');
    const activePlayers = { [socket.id]: player };
    const activeCombats = {};
    const io = { to: () => ({ emit: () => {} }) };
    registerCombatRouter(socket, io, activePlayers, activeCombats);
    return { socket, activeCombats };
}

function registerAdventureHarness(player) {
    const socket = new FakeSocket('adventure-expedition-escrow');
    const activePlayers = { [socket.id]: player };
    const activeCombats = {};
    const io = { to: () => ({ emit: () => {} }) };
    registerAdventureRouter(socket, io, activePlayers, activeCombats);
    return { socket, activeCombats };
}

function registerTownHarness(player) {
    const socket = new FakeSocket('town-expedition-escrow');
    const activePlayers = { [socket.id]: player };
    const activeCombats = {};
    const io = { to: () => ({ emit: () => {} }) };
    registerTownRouter(socket, io, activePlayers, activeCombats);
    return { socket, activeCombats };
}

test('destination rewards stay immutable escrow until the party returns safely', () => {
    const player = makePlayer();
    reachOldRoadDestination(player);
    player.pendingGold = 80;
    player.pendingXp = 30;
    player.pendingLoot = [
        { id: 'road_relic', name: 'Road Relic', value: 7, slot: 'misc' },
        { id: 'pine_token', name: 'Pine Token', value: 9, slot: 'misc' }
    ];
    const harness = registerCombatHarness(player);
    const before = {
        gold: player.gold,
        xp: player.xp,
        pendingGold: player.pendingGold,
        pendingXp: player.pendingXp,
        pendingLoot: structuredClone(player.pendingLoot),
        inventory: structuredClone(player.inventory)
    };

    harness.socket.dispatch('takePendingLoot', 0);
    let receipt = harness.socket.lastPayload('inventoryReceipt');
    assert.equal(receipt.success, false);
    assert.equal(receipt.code, 'ACTIVE_JOURNEY');
    assert.equal(receipt.action, 'takeLoot');

    harness.socket.dispatch('sellPendingLoot', 0);
    receipt = harness.socket.lastPayload('inventoryReceipt');
    assert.equal(receipt.success, false);
    assert.equal(receipt.code, 'ACTIVE_JOURNEY');
    assert.equal(receipt.action, 'sellPendingLoot');

    harness.socket.dispatch('claimCombatRewards');
    const claimReceipt = harness.socket.lastPayload('combatRewardsReceipt');
    assert.equal(claimReceipt.success, false);
    assert.equal(claimReceipt.code, 'ACTIVE_JOURNEY');
    assert.equal(claimReceipt.action, 'claimCombatRewards');
    assert.match(claimReceipt.message, /escrow.*return safely/i);

    assert.deepEqual({
        gold: player.gold,
        xp: player.xp,
        pendingGold: player.pendingGold,
        pendingXp: player.pendingXp,
        pendingLoot: player.pendingLoot,
        inventory: player.inventory
    }, before);

    returnSafely(player);
    const pendingGoldAtPub = player.pendingGold;

    harness.socket.dispatch('takePendingLoot', 0);
    assert.equal(harness.socket.lastPayload('inventoryReceipt').success, true);
    assert.deepEqual(player.inventory.map(item => item.id), ['road_relic']);

    harness.socket.dispatch('sellPendingLoot', 0);
    assert.equal(harness.socket.lastPayload('inventoryReceipt').success, true);
    assert.equal(player.gold, before.gold + 9);
    assert.deepEqual(player.pendingLoot, []);

    harness.socket.dispatch('claimCombatRewards');
    assert.equal(harness.socket.lastPayload('combatRewardsReceipt').success, true);
    assert.equal(player.gold, before.gold + 9 + pendingGoldAtPub);
    assert.equal(player.xp, before.pendingXp);
    assert.equal(player.pendingGold, 0);
    assert.equal(player.pendingXp, 0);
});

test('safe-return rewards survive login hydration, block departure, and cannot be erased by abandon', () => {
    const player = makePlayer();
    reachOldRoadDestination(player);
    player.pendingGold = 80;
    player.pendingXp = 30;
    player.pendingLoot = [
        { id: 'road_relic', name: 'Road Relic', value: 7, slot: 'misc' }
    ];
    returnSafely(player);

    const reconnected = structuredClone(player);
    normalizeAdventureState(reconnected, { recoverInterruptedJourney: true });
    const waitingRewards = {
        pendingGold: reconnected.pendingGold,
        pendingXp: reconnected.pendingXp,
        pendingLoot: structuredClone(reconnected.pendingLoot)
    };
    assert.equal(waitingRewards.pendingGold, 115);
    assert.equal(waitingRewards.pendingXp, 30);
    assert.deepEqual(waitingRewards.pendingLoot.map(item => item.id), ['road_relic']);

    const adventureHarness = registerAdventureHarness(reconnected);
    adventureHarness.socket.dispatch('startExpedition', { routeId: 'route_pine_trail' });
    let receipt = adventureHarness.socket.lastPayload('adventureReceipt');
    assert.equal(receipt.success, false);
    assert.equal(receipt.code, 'UNCLAIMED_REWARDS');
    assert.equal(reconnected.adventure.activeJourney, null);

    adventureHarness.socket.dispatch('abandonExpedition');
    receipt = adventureHarness.socket.lastPayload('adventureReceipt');
    assert.equal(receipt.success, false);
    assert.equal(receipt.code, 'NO_ACTIVE_JOURNEY');
    assert.deepEqual({
        pendingGold: reconnected.pendingGold,
        pendingXp: reconnected.pendingXp,
        pendingLoot: reconnected.pendingLoot
    }, waitingRewards);

    const combatHarness = registerCombatHarness(reconnected);
    combatHarness.socket.dispatch('takePendingLoot', 0);
    assert.equal(combatHarness.socket.lastPayload('inventoryReceipt').success, true);
    assert.deepEqual(reconnected.inventory.map(item => item.id), ['road_relic']);

    const goldBeforeClaim = reconnected.gold;
    combatHarness.socket.dispatch('claimCombatRewards');
    assert.equal(combatHarness.socket.lastPayload('combatRewardsReceipt').success, true);
    assert.equal(reconnected.gold, goldBeforeClaim + waitingRewards.pendingGold);
    assert.equal(reconnected.xp, waitingRewards.pendingXp);
    assert.equal(reconnected.pendingGold, 0);
    assert.equal(reconnected.pendingXp, 0);
    assert.deepEqual(reconnected.pendingLoot, []);

    const nextDeparture = beginExpedition(reconnected, 'route_pine_trail', { random: () => 0 });
    assert.equal(nextDeparture.success, true);
});

test('town storage, economy, roster, crafting, upgrades, and minigames are unavailable away from the pub', () => {
    const player = makePlayer({
        gold: 5000,
        inventory: [
            { id: 'sale_item', name: 'Sale Item', value: 20, slot: 'misc' },
            { id: 'deposit_item', name: 'Deposit Item', value: 10, slot: 'misc' }
        ],
        stash: [{ id: 'vault_item', name: 'Vault Item', value: 5, slot: 'misc' }],
        equipment: {
            weapon: { id: 'worn_weapon', name: 'Worn Weapon', value: 10, slot: 'weapon' }
        }
    });
    reachOldRoadDestination(player);
    const harness = registerTownHarness(player);
    const before = {
        gold: player.gold,
        inventory: structuredClone(player.inventory),
        stash: structuredClone(player.stash),
        equipment: structuredClone(player.equipment),
        roster: structuredClone(player.roster),
        vaultSlots: player.vaultSlots,
        maxInventorySlots: player.maxInventorySlots
    };

    const inventoryActions = [
        { action: 'sell', index: 0 },
        { action: 'deposit', index: 1 },
        { action: 'withdraw', index: 0 },
        { action: 'depositEquipment', slotKey: 'weapon' },
        { action: 'reorderVault', fromIndex: 0, toIndex: 0 }
    ];
    for (const action of inventoryActions) {
        harness.socket.dispatch('inventoryAction', action);
        const receipt = harness.socket.lastPayload('inventoryReceipt');
        assert.equal(receipt.success, false, action.action);
        assert.equal(receipt.code, 'ACTIVE_JOURNEY', action.action);
        assert.equal(receipt.action, action.action);
    }

    const townActions = [
        { action: 'hireCompanion' },
        { action: 'trainMercenary', instanceId: 'missing' },
        { action: 'craftBrew', brewType: 'STOUT' },
        { action: 'upgradeVault' },
        { action: 'startMinigame', gameType: 'lumber' }
    ];
    for (const action of townActions) {
        harness.socket.dispatch('townAction', action);
        const receipt = harness.socket.lastPayload('townReceipt');
        assert.equal(receipt.success, false, action.action);
        assert.equal(receipt.code, 'ACTIVE_JOURNEY', action.action);
        assert.equal(receipt.action, action.action);
    }

    assert.equal(harness.socket.emittedCount('minigameSessionStarted'), 0);
    assert.equal(player.activeMinigame, undefined);
    assert.deepEqual({
        gold: player.gold,
        inventory: player.inventory,
        stash: player.stash,
        equipment: player.equipment,
        roster: player.roster,
        vaultSlots: player.vaultSlots,
        maxInventorySlots: player.maxInventorySlots
    }, before);

    returnSafely(player);

    harness.socket.dispatch('inventoryAction', { action: 'sell', index: 0 });
    assert.equal(harness.socket.lastPayload('inventoryReceipt').success, true);
    assert.equal(player.gold, before.gold + 20);

    harness.socket.dispatch('townAction', { action: 'startMinigame', gameType: 'lumber' });
    assert.equal(harness.socket.lastPayload('townReceipt').success, true);
    assert.equal(harness.socket.emittedCount('minigameSessionStarted'), 1);
    assert.equal(player.activeMinigame.type, 'lumber');
});
