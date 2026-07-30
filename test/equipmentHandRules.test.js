const test = require('node:test');
const assert = require('node:assert/strict');

const {
    EQUIPMENT_SLOTS,
    isTwoHandedWeapon,
    getConflictingHandSlot,
    normalizeEquipmentHandRules,
    normalizeEquipmentLoadoutState,
    equipItemWithHandRules
} = require('../equipmentHandRules.js');
const registerTownRouter = require('../townRouter.js');

function gear(id, slot, extra = {}) {
    return {
        id,
        name: id,
        slot,
        rarity: 'Common',
        ...extra
    };
}

function loadout(weapon = null, offhand = null) {
    return {
        weapon,
        offhand,
        helmet: null,
        armor: null,
        gloves: null,
        boots: null
    };
}

function companion(instanceId, equipment) {
    return {
        instanceId,
        templateId: 'starter_mercenary',
        name: instanceId,
        role: 'Frontliner',
        hired: true,
        stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
        xp: 0,
        pockets: [null, null],
        equipment
    };
}

class FakeSocket {
    constructor(id = 'hand-rules-test') {
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
        const entry = [...this.emitted]
            .reverse()
            .find(candidate => candidate.eventName === eventName);
        return entry && entry.payload;
    }
}

test('equipment registry exposes offhand and recognizes explicit two-handed weapons', () => {
    assert.deepEqual(EQUIPMENT_SLOTS, [
        'weapon',
        'offhand',
        'helmet',
        'armor',
        'gloves',
        'boots'
    ]);
    assert.equal(isTwoHandedWeapon(gear('maul', 'weapon', { twoHanded: true })), true);
    assert.equal(isTwoHandedWeapon(gear('staff', 'weapon', { handedness: 'TWO' })), true);
    assert.equal(isTwoHandedWeapon(gear('sword', 'weapon', { handedness: 'one' })), false);
    assert.equal(isTwoHandedWeapon(gear('shield', 'offhand', { twoHanded: true })), false);

    const bow = gear('bow', 'weapon', { twoHanded: true });
    const shield = gear('shield', 'offhand');
    assert.equal(getConflictingHandSlot(loadout(null, shield), bow), 'offhand');
    assert.equal(getConflictingHandSlot(loadout(bow), shield), 'weapon');
});

test('same-slot swaps preserve compatible hand gear and backpack size', () => {
    const oldSword = gear('old_sword', 'weapon');
    const newSword = gear('new_sword', 'weapon');
    const shield = gear('shield', 'offhand');
    const equipment = loadout(oldSword, shield);
    const inventory = [
        newSword,
        gear('helmet', 'helmet'),
        gear('armor', 'armor'),
        gear('gloves', 'gloves'),
        gear('boots', 'boots')
    ];

    const result = equipItemWithHandRules({
        equipment,
        inventory,
        inventoryIndex: 0,
        maxInventorySlots: 5
    });

    assert.equal(result.success, true);
    assert.equal(result.conflictSlot, null);
    assert.deepEqual(result.stowedSlots, ['weapon']);
    assert.equal(equipment.weapon, newSword);
    assert.equal(equipment.offhand, shield);
    assert.equal(inventory.length, 5);
    assert.equal(inventory[0], oldSword);
});

test('equipping a two-handed weapon stows both the old weapon and occupied offhand', () => {
    const oldSword = gear('old_sword', 'weapon');
    const shield = gear('shield', 'offhand');
    const maul = gear('maul', 'weapon', { twoHanded: true });
    const equipment = loadout(oldSword, shield);
    const inventory = [maul, gear('helmet', 'helmet')];

    const result = equipItemWithHandRules({
        equipment,
        inventory,
        inventoryIndex: 0,
        maxInventorySlots: 5
    });

    assert.equal(result.success, true);
    assert.equal(result.conflictSlot, 'offhand');
    assert.deepEqual(result.stowedSlots, ['weapon', 'offhand']);
    assert.equal(equipment.weapon, maul);
    assert.equal(equipment.offhand, null);
    assert.deepEqual(inventory.map(item => item.id), ['old_sword', 'helmet', 'shield']);
});

test('equipping an offhand stows an equipped two-handed weapon', () => {
    const bow = gear('bow', 'weapon', { handedness: 'two' });
    const shield = gear('shield', 'offhand');
    const equipment = loadout(bow);
    const inventory = [shield, gear('boots', 'boots')];

    const result = equipItemWithHandRules({
        equipment,
        inventory,
        inventoryIndex: 0,
        maxInventorySlots: 5
    });

    assert.equal(result.success, true);
    assert.equal(result.conflictSlot, 'weapon');
    assert.deepEqual(result.stowedSlots, ['weapon']);
    assert.equal(equipment.weapon, null);
    assert.equal(equipment.offhand, shield);
    assert.deepEqual(inventory.map(item => item.id), ['bow', 'boots']);
});

test('capacity rejection leaves equipment and inventory untouched', () => {
    const equipment = loadout(
        gear('old_sword', 'weapon'),
        gear('shield', 'offhand')
    );
    const inventory = [
        gear('maul', 'weapon', { twoHanded: true }),
        gear('helmet', 'helmet'),
        gear('armor', 'armor'),
        gear('gloves', 'gloves'),
        gear('boots', 'boots')
    ];
    const before = JSON.parse(JSON.stringify({ equipment, inventory }));

    const result = equipItemWithHandRules({
        equipment,
        inventory,
        inventoryIndex: 0,
        maxInventorySlots: 5
    });

    assert.equal(result.success, false);
    assert.equal(result.code, 'INVENTORY_FULL');
    assert.deepEqual(equipment, before.equipment);
    assert.deepEqual(inventory, before.inventory);
});

test('hydration repair stows an illegal offhand without deleting saved gear', () => {
    const bow = gear('saved_bow', 'weapon', { handedness: 'two' });
    const shield = gear('saved_shield', 'offhand');
    const equipment = loadout(bow, shield);
    const inventory = [
        gear('full_slot_1', 'helmet'),
        gear('full_slot_2', 'armor')
    ];

    const first = normalizeEquipmentHandRules(equipment, inventory);
    const second = normalizeEquipmentHandRules(equipment, inventory);

    assert.equal(first.changed, true);
    assert.deepEqual(first.stowedItems, [shield]);
    assert.equal(equipment.weapon, bow);
    assert.equal(equipment.offhand, null);
    assert.equal(inventory.at(-1), shield);
    assert.equal(second.changed, false);
    assert.equal(
        inventory.filter(item => item === shield).length,
        1,
        'repeated normalization duplicated the repaired offhand'
    );
});

test('hydration repair creates a missing inventory before stowing an illegal offhand', () => {
    const bow = gear('legacy_bow', 'weapon', { handedness: 'two' });
    const shield = gear('legacy_shield', 'offhand');
    const playerState = {
        equipment: loadout(bow, shield)
    };

    const result = normalizeEquipmentLoadoutState(playerState);

    assert.equal(result.changed, true);
    assert.equal(playerState.equipment.offhand, null);
    assert.deepEqual(playerState.inventory, [shield]);
});

test('companion hand conflicts are resolved independently through the town route', () => {
    const first = companion(
        'merc_first',
        loadout(gear('first_bow', 'weapon', { twoHanded: true }))
    );
    const second = companion(
        'merc_second',
        loadout(gear('second_sword', 'weapon'), gear('second_shield', 'offhand'))
    );
    const playerSword = gear('player_sword', 'weapon');
    const playerShield = gear('player_shield', 'offhand');
    const player = {
        username: 'Tester',
        gold: 1000,
        inventory: [gear('first_shield', 'offhand')],
        stash: [],
        equipment: loadout(playerSword, playerShield),
        maxInventorySlots: 5,
        vaultSlots: 10,
        roster: {
            companions: [first, second],
            activeIds: [first.instanceId, second.instanceId]
        }
    };
    const socket = new FakeSocket();
    const activePlayers = { [socket.id]: player };
    registerTownRouter(socket, { to: () => ({ emit() {} }) }, activePlayers, {});

    socket.dispatch('inventoryAction', {
        action: 'equipCompanion',
        instanceId: first.instanceId,
        index: 0
    });

    const receipt = socket.lastPayload('inventoryReceipt');
    const savedFirst = player.roster.companions.find(entry => entry.instanceId === first.instanceId);
    const savedSecond = player.roster.companions.find(entry => entry.instanceId === second.instanceId);
    assert.equal(receipt.success, true);
    assert.equal(savedFirst.equipment.weapon, null);
    assert.equal(savedFirst.equipment.offhand.id, 'first_shield');
    assert.equal(player.inventory[0].id, 'first_bow');
    assert.equal(savedSecond.equipment.weapon.id, 'second_sword');
    assert.equal(savedSecond.equipment.offhand.id, 'second_shield');
    assert.equal(player.equipment.weapon, playerSword);
    assert.equal(player.equipment.offhand, playerShield);
});
