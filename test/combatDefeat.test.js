const test = require('node:test');
const assert = require('node:assert/strict');

const { applyPlayerCombatDefeat } = require('../combatDefeat.js');

test('ordinary combat defeat preserves equipped gear and backpack contents', () => {
    const equipment = {
        helmet: { id: 'sturdy_helm', vitality: 1 },
        armor: { id: 'patched_mail', vitality: 2 },
        weapon: { id: 'balanced_sword', stamina: 1 },
        offhand: null,
        gloves: null,
        boots: null
    };
    const inventory = [
        { id: 'healing_tonic', quantity: 2 },
        { id: 'spare_dagger', offense: 1 }
    ];
    const equipmentSnapshot = structuredClone(equipment);
    const inventorySnapshot = structuredClone(inventory);
    const player = {
        vitality: 4,
        maxStamina: 2,
        hp: 1,
        stamina: 0,
        equipment,
        inventory,
        pendingLoot: [{ id: 'unclaimed_relic' }],
        pendingGold: 80,
        pendingXp: 35,
        pendingMercenaryXpContext: {
            eligibleInstanceIds: ['merc_1'],
            activeInstanceIds: ['merc_1']
        },
        statusEffects: { poison: { turns: 2 } },
        activeBuffs: ['fortified_stew'],
        activeCombatBuff: { id: 'fortified_stew' }
    };

    const result = applyPlayerCombatDefeat(player);

    assert.equal(result, player);
    assert.equal(player.equipment, equipment);
    assert.equal(player.inventory, inventory);
    assert.deepEqual(player.equipment, equipmentSnapshot);
    assert.deepEqual(player.inventory, inventorySnapshot);
    assert.equal(player.hp, 175);
    assert.equal(player.stamina, 75);
});

test('ordinary combat defeat clears only unclaimed expedition rewards and combat status', () => {
    const player = {
        vitality: 4,
        maxStamina: 2,
        hp: 1,
        stamina: 0,
        equipment: {},
        inventory: [{ id: 'owned_item' }],
        gold: 123,
        xp: 456,
        pendingLoot: [{ id: 'unclaimed_item' }],
        pendingGold: 80,
        pendingXp: 35,
        pendingMercenaryXpContext: {
            eligibleInstanceIds: ['merc_1'],
            activeInstanceIds: ['merc_1']
        },
        statusEffects: { poison: { turns: 2 } },
        activeBuffs: ['fortified_stew'],
        activeCombatBuff: { id: 'fortified_stew' }
    };

    applyPlayerCombatDefeat(player);

    assert.deepEqual(player.pendingLoot, []);
    assert.equal(player.pendingGold, 0);
    assert.equal(player.pendingXp, 0);
    assert.equal(player.pendingMercenaryXpContext, undefined);
    assert.equal(Object.hasOwn(player, 'cellarsChummed'), false);
    assert.deepEqual(player.statusEffects, {});
    assert.deepEqual(player.activeBuffs, []);
    assert.equal(player.activeCombatBuff, null);
    assert.equal(player.gold, 123);
    assert.equal(player.xp, 456);
    assert.deepEqual(player.inventory, [{ id: 'owned_item' }]);
    assert.equal(player.hp, 100);
    assert.equal(player.stamina, 50);
});
