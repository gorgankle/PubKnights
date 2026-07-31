'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { ItemDatabase } = require('../public/js/items.js');
const {
    listEquipmentAttacks,
    resolveEquipmentAttack
} = require('../public/js/equipment-actions.js');

const projectRoot = path.join(__dirname, '..');

function loadout(weapon = null, offhand = null, extra = {}) {
    return {
        weapon,
        offhand,
        helmet: null,
        armor: null,
        gloves: null,
        boots: null,
        ...extra
    };
}

function descriptorFields(descriptor) {
    return {
        id: descriptor.id,
        name: descriptor.name,
        description: descriptor.description,
        equipmentSlot: descriptor.equipmentSlot,
        itemId: descriptor.itemId,
        itemName: descriptor.itemName,
        actionType: descriptor.actionType,
        targetType: descriptor.targetType,
        range: descriptor.range,
        staminaCost: descriptor.staminaCost,
        multiplier: descriptor.multiplier,
        ignoresDefense: descriptor.ignoresDefense,
        animType: descriptor.animType,
        clipId: descriptor.clipId
    };
}

test('equipment action contract exposes the same API as a browser global and CommonJS module', () => {
    const source = fs.readFileSync(
        path.join(projectRoot, 'public', 'js', 'equipment-actions.js'),
        'utf8'
    );
    const context = vm.createContext({});

    vm.runInContext(source, context, { filename: 'equipment-actions.js' });

    assert.equal(
        typeof context.EquipmentActionContract.listEquipmentAttacks,
        'function'
    );
    assert.equal(
        typeof context.EquipmentActionContract.resolveEquipmentAttack,
        'function'
    );
    assert.equal(Object.isFrozen(context.EquipmentActionContract), true);
});

test('all production weapon specials adapt to an exact main-hand special action', () => {
    const weapons = Object.values(ItemDatabase)
        .filter(item => item.slot === 'weapon');

    assert.equal(weapons.length, 22);
    weapons.forEach(weapon => {
        const special = weapon.combat.special;
        const equipment = loadout(weapon);
        const attacks = listEquipmentAttacks(equipment);
        const descriptor = resolveEquipmentAttack(
            equipment,
            'weapon',
            'special'
        );

        assert.deepEqual(attacks.map(action => action.id), ['special'], weapon.id);
        assert.ok(descriptor, weapon.id);
        assert.deepEqual(descriptorFields(descriptor), {
            id: 'special',
            name: special.name,
            description: special.desc || '',
            equipmentSlot: 'weapon',
            itemId: weapon.id,
            itemName: weapon.name,
            actionType: special.actionType || 'attack',
            targetType: special.targetType || 'enemy',
            range: special.range,
            staminaCost: special.staminaCost,
            multiplier: special.multiplier,
            ignoresDefense: special.ignoresDefense === true,
            animType: special.animType,
            clipId: special.animType
        }, weapon.id);
        assert.equal(Object.isFrozen(descriptor), true, weapon.id);
        assert.equal(Object.isFrozen(descriptor.rules), true, weapon.id);
    });

    const scythe = resolveEquipmentAttack(
        loadout(ItemDatabase.scythe_of_reaping),
        'weapon',
        'special'
    );
    assert.equal(scythe.rules.aoeShape, 'radius');
    assert.equal(scythe.rules.aoeRadius, 1);
});

test('each shield exposes normalized block and bash actions after the weapon special', () => {
    ['round_shield', 'captains_shield', 'tower_shield'].forEach(itemId => {
        const equipment = loadout(
            ItemDatabase.rusty_mace,
            ItemDatabase[itemId]
        );
        const attacks = listEquipmentAttacks(equipment);

        assert.deepEqual(
            attacks.map(action => `${action.equipmentSlot}:${action.id}`),
            [
                'weapon:special',
                'offhand:shield_block',
                'offhand:shield_bash'
            ],
            itemId
        );
        assert.deepEqual(
            descriptorFields(resolveEquipmentAttack(
                equipment,
                'offhand',
                'shield_block'
            )),
            {
                id: 'shield_block',
                name: 'Shield Block',
                description: 'Brace behind the equipped shield and guard against the next attack.',
                equipmentSlot: 'offhand',
                itemId,
                itemName: ItemDatabase[itemId].name,
                actionType: 'guard',
                targetType: 'self',
                range: 0,
                staminaCost: 10,
                multiplier: 1,
                ignoresDefense: false,
                animType: 'shield_block',
                clipId: 'shield_block'
            }
        );
        assert.deepEqual(
            descriptorFields(resolveEquipmentAttack(
                equipment,
                'offhand',
                'shield_bash'
            )),
            {
                id: 'shield_bash',
                name: 'Shield Bash',
                description: 'Drive the equipped shield into an adjacent enemy.',
                equipmentSlot: 'offhand',
                itemId,
                itemName: ItemDatabase[itemId].name,
                actionType: 'attack',
                targetType: 'enemy',
                range: 1,
                staminaCost: 12,
                multiplier: 0.75,
                ignoresDefense: false,
                animType: 'shield_bash',
                clipId: 'shield_bash'
            }
        );
    });
});

test('parrying dagger requires a compatible one-handed main hand', () => {
    const compatible = loadout(
        ItemDatabase.mimic_fang_dagger,
        ItemDatabase.parrying_dagger
    );
    const offhandStrike = resolveEquipmentAttack(
        compatible,
        'offhand',
        'offhand_strike'
    );

    assert.deepEqual(descriptorFields(offhandStrike), {
        id: 'offhand_strike',
        name: 'Offhand Strike',
        description: 'Strike with the parrying dagger alongside a compatible one-handed weapon.',
        equipmentSlot: 'offhand',
        itemId: 'parrying_dagger',
        itemName: 'Parrying Dagger',
        actionType: 'attack',
        targetType: 'enemy',
        range: 1,
        staminaCost: 12,
        multiplier: 1,
        ignoresDefense: false,
        animType: 'dual_wield',
        clipId: 'dual_wield'
    });
    assert.equal(offhandStrike.rules.requirements.mainHand, 'one-handed');
    assert.equal(Object.isFrozen(offhandStrike.rules.requirements), true);

    assert.equal(
        resolveEquipmentAttack(
            loadout(null, ItemDatabase.parrying_dagger),
            'offhand',
            'offhand_strike'
        ),
        null
    );
    assert.equal(
        resolveEquipmentAttack(
            loadout(ItemDatabase.hunter_bow, ItemDatabase.parrying_dagger),
            'offhand',
            'offhand_strike'
        ),
        null
    );
    assert.equal(
        resolveEquipmentAttack(
            loadout(
                { id: 'ambiguous', name: 'Ambiguous', slot: 'weapon' },
                ItemDatabase.parrying_dagger
            ),
            'offhand',
            'offhand_strike'
        ),
        null
    );
});

test('a two-handed main hand suppresses every offhand action', () => {
    ['round_shield', 'captains_shield', 'tower_shield', 'parrying_dagger']
        .forEach(itemId => {
            const equipment = loadout(
                ItemDatabase.hunter_bow,
                ItemDatabase[itemId]
            );
            const attacks = listEquipmentAttacks(equipment);

            assert.deepEqual(
                attacks.map(action => `${action.equipmentSlot}:${action.id}`),
                ['weapon:special'],
                itemId
            );
            Object.keys(ItemDatabase[itemId].equipmentActions)
                .forEach(actionId => {
                    assert.equal(
                        resolveEquipmentAttack(
                            equipment,
                            'offhand',
                            actionId
                        ),
                        null,
                        `${itemId}:${actionId}`
                    );
                });
        });

    const lightweightTwoHandedLoadout = loadout(
        { handedness: 'two' },
        ItemDatabase.round_shield
    );
    assert.deepEqual(listEquipmentAttacks(lightweightTwoHandedLoadout), []);
    assert.equal(
        resolveEquipmentAttack(
            lightweightTwoHandedLoadout,
            'offhand',
            'shield_bash'
        ),
        null
    );
});

test('explicit equipment actions replace rather than merge the legacy special adapter', () => {
    const weapon = {
        id: 'explicit_blade',
        name: 'Explicit Blade',
        slot: 'weapon',
        handedness: 'one',
        combat: {
            special: {
                name: 'Legacy Skill',
                range: 1,
                staminaCost: 99,
                multiplier: 9
            }
        },
        equipmentActions: {
            precise_cut: {
                name: 'Precise Cut',
                description: 'An explicitly authored equipment action.',
                actionType: 'attack',
                targetType: 'enemy',
                range: 2,
                staminaCost: 7,
                multiplier: 1.25,
                ignoresDefense: true,
                animType: 'slash',
                clipId: 'slash'
            }
        }
    };
    const equipment = loadout(weapon);

    assert.deepEqual(
        listEquipmentAttacks(equipment).map(action => action.id),
        ['precise_cut']
    );
    assert.equal(resolveEquipmentAttack(equipment, 'weapon', 'special'), null);
    assert.equal(resolveEquipmentAttack(equipment, 'weapon', 'missing'), null);
    assert.equal(resolveEquipmentAttack(equipment, 'Weapon', 'precise_cut'), null);
    assert.equal(resolveEquipmentAttack(equipment, ' weapon', 'precise_cut'), null);
    assert.equal(resolveEquipmentAttack(equipment, 'weapon', 'precise_cut '), null);
});

test('returned lists, descriptors, and nested rules are isolated from item data', () => {
    const sourceAction = {
        name: 'Mutable Test',
        description: 'Original description',
        staminaCost: 4,
        metadata: { marker: 'original' }
    };
    const weapon = {
        id: 'mutable_weapon',
        name: 'Mutable Weapon',
        slot: 'weapon',
        handedness: 'one',
        equipmentActions: { mutable: sourceAction }
    };
    const equipment = loadout(weapon);
    const attacks = listEquipmentAttacks(equipment);
    const descriptor = attacks[0];

    assert.equal(Object.isFrozen(attacks), true);
    assert.equal(Object.isFrozen(descriptor), true);
    assert.equal(Object.isFrozen(descriptor.rules), true);
    assert.equal(Object.isFrozen(descriptor.rules.metadata), true);
    assert.throws(() => attacks.push(descriptor), TypeError);
    assert.throws(() => { descriptor.staminaCost = 100; }, TypeError);
    assert.throws(() => { descriptor.rules.metadata.marker = 'changed'; }, TypeError);

    sourceAction.staminaCost = 88;
    sourceAction.metadata.marker = 'source changed';
    assert.equal(descriptor.staminaCost, 4);
    assert.equal(descriptor.rules.metadata.marker, 'original');

    assert.deepEqual(listEquipmentAttacks(null), []);
    assert.equal(Object.isFrozen(listEquipmentAttacks(null)), true);
    assert.equal(resolveEquipmentAttack(null, 'weapon', 'special'), null);
    assert.equal(resolveEquipmentAttack([], 'weapon', 'special'), null);
    assert.equal(resolveEquipmentAttack(equipment, 'offhand', 'mutable'), null);
});
