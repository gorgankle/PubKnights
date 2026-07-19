const test = require('node:test');
const assert = require('node:assert/strict');

const {
    COMPANION_EQUIPMENT_SLOTS,
    COMPANION_POCKET_COUNT,
    MAX_ROSTER_COMPANIONS,
    MAX_SELECTED_COMPANIONS,
    normalizeRosterState,
    getRequiredCompanionIds,
    canHireCompanion,
    canActivateCompanion,
    canBenchCompanion,
    canDismissCompanion
} = require('../companionRoster.js');
const { createCompanionActor } = require('../combatActors.js');
const registerTownRouter = require('../townRouter.js');

class FakeSocket {
    constructor(id = 'companion-test') {
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
        assert.ok(handler, 'Missing socket handler for ' + eventName);
        handler(payload);
    }

    lastPayload(eventName) {
        const event = [...this.emitted].reverse().find(entry => entry.eventName === eventName);
        return event && event.payload;
    }
}

function gear(id, slot) {
    return { id, name: id, slot, rarity: 'Common' };
}

function makeCompanion(instanceId = 'merc_test_1') {
    return {
        instanceId,
        templateId: 'starter_mercenary',
        name: 'Mira',
        role: 'Frontliner',
        hired: true,
        stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
        xp: 0,
        pockets: [null, null],
        equipment: {
            weapon: gear('old_mace', 'weapon'),
            helmet: null,
            armor: null,
            gloves: null,
            boots: null
        }
    };
}

function makePlayer() {
    return {
        username: 'Tester',
        gold: 1000,
        inventory: [],
        stash: [],
        equipment: {},
        maxInventorySlots: 5,
        vaultSlots: 10,
        roster: { companions: [], activeIds: [] }
    };
}

function createTownHarness(player = makePlayer(), activeCombat = null) {
    const socket = new FakeSocket();
    const activePlayers = { [socket.id]: player };
    const activeCombats = {};
    if (activeCombat) activeCombats[socket.id] = activeCombat;
    const io = { to: () => ({ emit: () => {} }) };
    registerTownRouter(socket, io, activePlayers, activeCombats);
    return { socket, player, activeCombats };
}

test('party limits expose six roster slots, three selections, and two pockets', () => {
    assert.equal(MAX_ROSTER_COMPANIONS, 6);
    assert.equal(MAX_SELECTED_COMPANIONS, 3);
    assert.equal(COMPANION_POCKET_COUNT, 2);
});

test('legacy companion ids migrate without losing active state or gear', () => {
    const player = makePlayer();
    player.roster = {
        companions: [{
            id: 'starter_mercenary',
            name: 'Legacy Mira',
            role: 'Frontliner',
            active: true,
            stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
            equipment: {
                weapon: gear('old_mace', 'weapon'),
                accessory: gear('legacy_charm', 'accessory'),
                boots: null,
                helmet: gear('old_helmet', 'helmet'),
                armor: null,
            }
        }],
        activeIds: ['starter_mercenary']
    };

    normalizeRosterState(player);

    const companion = player.roster.companions[0];
    assert.match(companion.instanceId, /^merc_[a-f0-9]{24}$/);
    assert.equal(companion.templateId, 'starter_mercenary');
    assert.equal(Object.hasOwn(companion, 'id'), false);
    assert.deepEqual(Object.keys(companion.equipment), COMPANION_EQUIPMENT_SLOTS);
    assert.equal(companion.equipment.weapon.id, 'old_mace');
    assert.equal(companion.equipment.gloves, null);
    assert.equal(companion.xp, 0);
    assert.deepEqual(companion.pockets, [null, null]);
    assert.deepEqual(player.roster.activeIds, [companion.instanceId]);
    assert.equal(companion.active, true);
    assert.equal(player.inventory[0].id, 'legacy_charm');
});

test('normalization preserves an explicitly empty bench and caps selected mercenaries at three', () => {
    const player = makePlayer();
    player.roster = {
        companions: Array.from({ length: 4 }, (_, index) => ({
            ...makeCompanion(`merc_${index}`),
            active: true
        })),
        activeIds: []
    };

    normalizeRosterState(player);
    assert.deepEqual(player.roster.activeIds, []);
    assert.equal(player.roster.companions.every(companion => companion.active === false), true);

    delete player.roster.activeIds;
    player.roster.companions.forEach(companion => { companion.active = true; });
    normalizeRosterState(player);
    assert.deepEqual(player.roster.activeIds, ['merc_0', 'merc_1', 'merc_2']);
});

test('quest-required allies are removed before applying the three selected-slot cap', () => {
    const player = makePlayer();
    player.roster = {
        companions: [
            makeCompanion('merc_required'),
            makeCompanion('merc_1'),
            makeCompanion('merc_2'),
            makeCompanion('merc_3')
        ],
        activeIds: ['merc_required', 'merc_1', 'merc_2', 'merc_3']
    };
    player.activeQuestSession = { requiredCompanionIds: ['merc_required'] };

    normalizeRosterState(player);

    assert.deepEqual(player.roster.activeIds, ['merc_1', 'merc_2', 'merc_3']);
    assert.equal(player.roster.companions[0].active, false);
    assert.deepEqual(player.inventory, []);
});

test('activation policy counts only optional selected mercenaries in stale roster data', () => {
    const player = makePlayer();
    player.roster = {
        companions: [
            makeCompanion('merc_required'),
            makeCompanion('merc_1'),
            makeCompanion('merc_2'),
            makeCompanion('merc_3'),
            makeCompanion('merc_4')
        ],
        activeIds: ['merc_required', 'merc_1', 'merc_2']
    };
    player.activeQuestSession = { requiredCompanionIds: ['merc_required'] };

    assert.equal(canActivateCompanion(player, 'merc_3').allowed, true);
    player.roster.activeIds.push('merc_3');
    assert.equal(canActivateCompanion(player, 'merc_4').allowed, false);
});

test('companion xp and exactly two pockets survive normalization without losing overflow items', () => {
    const player = makePlayer();
    player.roster.companions = [{
        ...makeCompanion('merc_pockets'),
        xp: 275.9,
        pockets: [gear('potion', 'consumable'), null, gear('spare_boots', 'boots')]
    }];

    normalizeRosterState(player);

    const companion = player.roster.companions[0];
    assert.equal(companion.xp, 275);
    assert.equal(companion.pockets.length, 2);
    assert.equal(companion.pockets[0].id, 'potion');
    assert.equal(companion.pockets[1], null);
    assert.deepEqual(player.inventory.map(item => item.id), ['spare_boots']);
});

test('roster policies enforce capacity, combat locks, and quest-required locks', () => {
    const player = makePlayer();
    player.roster.companions = Array.from({ length: MAX_ROSTER_COMPANIONS }, (_, index) => (
        makeCompanion(`merc_${index}`)
    ));
    player.roster.activeIds = ['merc_0', 'merc_1', 'merc_2'];
    player.activeQuestSession = {
        requiredCompanionIds: ['merc_3', 'merc_3', 'not valid!']
    };
    normalizeRosterState(player);

    assert.deepEqual(getRequiredCompanionIds(player), ['merc_3']);
    assert.equal(canHireCompanion(player).allowed, false);
    assert.match(canHireCompanion(player).message, /full/i);
    assert.equal(canHireCompanion(makePlayer(), { inCombat: true }).allowed, false);
    assert.match(canHireCompanion(makePlayer(), { inCombat: true }).message, /outside combat/i);

    assert.equal(canActivateCompanion(player, 'merc_4').allowed, false);
    assert.match(canActivateCompanion(player, 'merc_4').message, /active party is full/i);
    assert.equal(canActivateCompanion(player, 'merc_3').allowed, false);
    assert.match(canActivateCompanion(player, 'merc_3').message, /active quest/i);
    assert.equal(canBenchCompanion(player, 'merc_3').allowed, false);
    assert.match(canBenchCompanion(player, 'merc_3').message, /cannot be benched/i);
    assert.equal(canDismissCompanion(player, 'merc_3').allowed, false);
    assert.match(canDismissCompanion(player, 'merc_3').message, /cannot be dismissed/i);
    assert.equal(canDismissCompanion(player, 'merc_4', { activeCombat: true }).allowed, false);
});

test('multiple companions from one template receive distinct combat identities', () => {
    const player = makePlayer();
    player.roster.companions = [
        { id: 'starter_mercenary', name: 'One', equipment: {} },
        { id: 'starter_mercenary', name: 'Two', equipment: {} }
    ];

    normalizeRosterState(player);

    assert.equal(player.roster.companions.length, 2);
    const [first, second] = player.roster.companions;
    assert.notEqual(first.instanceId, second.instanceId);
    assert.equal(first.templateId, second.templateId);
    assert.notEqual(
        createCompanionActor(first, { x: 1, y: 1 }).uid,
        createCompanionActor(second, { x: 2, y: 1 }).uid
    );
});

test('companion gear swaps are server-authoritative and use the shared backpack', () => {
    const player = makePlayer();
    const companion = makeCompanion();
    player.roster = { companions: [companion], activeIds: [companion.instanceId] };
    player.inventory = [gear('new_sword', 'weapon')];
    const harness = createTownHarness(player);

    harness.socket.dispatch('inventoryAction', {
        action: 'equipCompanion',
        instanceId: companion.instanceId,
        index: 0
    });

    let receipt = harness.socket.lastPayload('inventoryReceipt');
    let savedCompanion = player.roster.companions[0];
    assert.equal(receipt.success, true);
    assert.equal(receipt.action, 'equipCompanion');
    assert.equal(savedCompanion.equipment.weapon.id, 'new_sword');
    assert.equal(player.inventory[0].id, 'old_mace');

    harness.socket.dispatch('inventoryAction', {
        action: 'unequipCompanion',
        instanceId: companion.instanceId,
        slotKey: 'weapon'
    });

    receipt = harness.socket.lastPayload('inventoryReceipt');
    savedCompanion = player.roster.companions[0];
    assert.equal(receipt.success, true);
    assert.equal(receipt.action, 'unequipCompanion');
    assert.equal(savedCompanion.equipment.weapon, null);
    assert.deepEqual(player.inventory.map(item => item.id), ['old_mace', 'new_sword']);
});

test('companion gear changes are rejected during combat', () => {
    const player = makePlayer();
    const companion = makeCompanion();
    player.roster = { companions: [companion], activeIds: [companion.instanceId] };
    player.inventory = [gear('new_sword', 'weapon')];
    const harness = createTownHarness(player, { activeActorUid: 'player_0' });

    harness.socket.dispatch('inventoryAction', {
        action: 'equipCompanion',
        instanceId: companion.instanceId,
        index: 0
    });

    const receipt = harness.socket.lastPayload('inventoryReceipt');
    assert.equal(receipt.success, false);
    assert.match(receipt.message, /outside combat/i);
    assert.equal(player.inventory[0].id, 'new_sword');
});

test('hiring supports multiple roster instances while keeping one active slot', () => {
    const harness = createTownHarness();

    harness.socket.dispatch('townAction', {
        action: 'hireCompanion',
        templateId: 'starter_mercenary',
        companionName: 'Mira'
    });
    harness.socket.dispatch('townAction', {
        action: 'hireCompanion',
        templateId: 'starter_mercenary',
        companionName: 'Tomas'
    });

    const companions = harness.player.roster.companions;
    assert.equal(companions.length, 2);
    assert.notEqual(companions[0].instanceId, companions[1].instanceId);
    assert.equal(companions[0].templateId, 'starter_mercenary');
    assert.equal(companions[1].templateId, 'starter_mercenary');
    assert.equal(harness.player.roster.activeIds.length, 1);
    assert.equal(harness.player.roster.activeIds[0], companions[0].instanceId);
});
