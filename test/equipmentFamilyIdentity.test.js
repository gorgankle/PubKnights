'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ItemDatabase,
    EquipmentCombatIdentities
} = require('../public/js/items.js');
const {
    resolveEquipmentAttack
} = require('../public/js/equipment-actions.js');

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

function resolveWeaponSpecial(itemId) {
    return resolveEquipmentAttack(
        loadout(ItemDatabase[itemId]),
        'weapon',
        'special'
    );
}

test('meaningful equipment families expose frozen build identities', () => {
    assert.deepEqual(
        Object.keys(EquipmentCombatIdentities).sort(),
        ['bow', 'dagger', 'heavy', 'shield', 'spear', 'staff']
    );
    assert.equal(Object.isFrozen(EquipmentCombatIdentities), true);

    Object.entries(EquipmentCombatIdentities).forEach(([family, identity]) => {
        assert.equal(identity.family, family);
        assert.ok(identity.label.length > 0, family);
        assert.ok(identity.description.length > 0, family);
        assert.equal(Object.isFrozen(identity), true, family);
    });
});

test('shield actions declare committed guard and disruptive bash rules', () => {
    ['round_shield', 'captains_shield', 'tower_shield'].forEach(itemId => {
        const equipment = loadout(ItemDatabase.rusty_mace, ItemDatabase[itemId]);
        const block = resolveEquipmentAttack(
            equipment,
            'offhand',
            'shield_block'
        );
        const bash = resolveEquipmentAttack(
            equipment,
            'offhand',
            'shield_bash'
        );

        assert.equal(ItemDatabase[itemId].combatIdentity.family, 'shield');
        assert.equal(block.family, 'shield');
        assert.equal(block.guardType, 'shield_block');
        assert.equal(block.charges, 1);
        assert.equal(block.endsTurn, true);
        assert.equal(block.rules.endsTurn, true);
        assert.equal(bash.family, 'shield');
        assert.equal(bash.interruptsIntent, true);
        assert.equal(bash.pushTarget, 1);
        assert.equal(bash.rules.pushTarget, 1);
    });
});

test('spear family keeps two-tile reach and adds a control thrust', () => {
    ['hunters_spear', 'harpoon_trident', 'pitchfork_spear']
        .forEach(itemId => {
            const item = ItemDatabase[itemId];
            const thrust = resolveWeaponSpecial(itemId);

            assert.equal(item.combatIdentity.family, 'spear');
            assert.equal(item.combat.standard.range, 2);
            assert.equal(thrust.family, 'spear');
            assert.equal(thrust.range, 2);
            assert.equal(thrust.name, 'Driving Thrust');
            assert.equal(thrust.interruptsIntent, true);
            assert.equal(thrust.pushTarget, 1);
        });
});

test('daggers trade raw weight for low-cost strikes and an evasive stance', () => {
    ['mimic_fang_dagger', 'beerglass_shiv'].forEach(itemId => {
        const item = ItemDatabase[itemId];
        const evade = resolveWeaponSpecial(itemId);

        assert.equal(item.combatIdentity.family, 'dagger');
        assert.equal(item.combat.standard.staminaCost, 3);
        assert.equal(evade.family, 'dagger');
        assert.equal(evade.actionType, 'guard');
        assert.equal(evade.targetType, 'self');
        assert.equal(evade.guardType, 'evasion');
        assert.equal(evade.charges, 1);
        assert.equal(evade.endsTurn, true);
    });
});

test('heavy weapons expose one committed armor-breaking family rule', () => {
    [
        'behemoth_maw_crusher',
        'brewmasters_club',
        'silverback_greatclub',
        'tankard_maul',
        'blackout_axe',
        'axe_timberlord'
    ].forEach(itemId => {
        const item = ItemDatabase[itemId];
        const heavy = resolveWeaponSpecial(itemId);

        assert.equal(item.combatIdentity.family, 'heavy');
        assert.equal(heavy.family, 'heavy');
        assert.equal(heavy.ignoresDefense, true);
        assert.equal(heavy.armorBreak, true);
        assert.equal(heavy.endsTurn, true);
        assert.equal(heavy.rules.armorBreak, true);
    });
});

test('bow and staff specials declare reposition and channel contracts', () => {
    const bow = resolveWeaponSpecial('hunter_bow');
    assert.equal(bow.family, 'bow');
    assert.equal(bow.name, 'Parting Shot');
    assert.equal(bow.range, 5);
    assert.equal(bow.repositionAway, 1);
    assert.equal(bow.rules.repositionAway, 1);

    [
        ['apprentice_staff', 'line'],
        ['bogwood_staff', 'line'],
        ['stormcaller_staff', 'radius'],
        ['last_call_voidstaff', 'radius']
    ].forEach(([itemId, telegraphShape]) => {
        const staff = resolveWeaponSpecial(itemId);

        assert.equal(ItemDatabase[itemId].combatIdentity.family, 'staff');
        assert.equal(staff.family, 'staff');
        assert.equal(staff.actionType, 'spell');
        assert.equal(staff.channelled, true);
        assert.equal(staff.interruptible, true);
        assert.equal(staff.endsTurn, true);
        assert.equal(staff.rules.telegraphShape, telegraphShape);
    });
});

test('family rule normalization defaults safely for legacy attacks', () => {
    const legacy = resolveWeaponSpecial('rusty_mace');

    assert.equal(legacy.family, 'bash');
    assert.equal(legacy.guardType, null);
    assert.equal(legacy.charges, 0);
    assert.equal(legacy.pushTarget, 0);
    assert.equal(legacy.repositionAway, 0);
    assert.equal(legacy.endsTurn, false);
    assert.equal(legacy.interruptsIntent, false);
    assert.equal(legacy.armorBreak, false);
    assert.equal(legacy.channelled, false);
    assert.equal(legacy.interruptible, false);
    assert.equal(Object.isFrozen(legacy.rules), true);
});
