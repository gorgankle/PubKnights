// Shared server-side equipment slot and hand-compatibility rules.

const EQUIPMENT_SLOTS = Object.freeze([
    'weapon',
    'offhand',
    'helmet',
    'armor',
    'gloves',
    'boots'
]);

function isTwoHandedWeapon(item) {
    if (!item || item.slot !== 'weapon') return false;
    return item.twoHanded === true
        || String(item.handedness || '').toLowerCase() === 'two';
}

function getConflictingHandSlot(equipment, item) {
    const loadout = equipment && typeof equipment === 'object'
        ? equipment
        : {};
    if (item && item.slot === 'weapon' && isTwoHandedWeapon(item)) {
        return loadout.offhand ? 'offhand' : null;
    }
    if (
        item
        && item.slot === 'offhand'
        && isTwoHandedWeapon(loadout.weapon)
    ) {
        return 'weapon';
    }
    return null;
}

function normalizeEquipmentHandRules(equipment, inventory) {
    if (
        !equipment
        || typeof equipment !== 'object'
        || !Array.isArray(inventory)
    ) {
        return {
            changed: false,
            stowedItems: []
        };
    }
    if (
        !isTwoHandedWeapon(equipment.weapon)
        || !equipment.offhand
    ) {
        return {
            changed: false,
            stowedItems: []
        };
    }

    const stowedOffhand = equipment.offhand;
    equipment.offhand = null;
    // Hydration repair must never delete valid saved gear. Temporary overflow
    // is safer than retaining an invisible, stat-bearing illegal loadout.
    inventory.push(stowedOffhand);
    return {
        changed: true,
        stowedItems: [stowedOffhand]
    };
}

function normalizeEquipmentLoadoutState(state) {
    if (!state || typeof state !== 'object') {
        return {
            changed: false,
            stowedItems: []
        };
    }
    if (!state.equipment || typeof state.equipment !== 'object') {
        state.equipment = {};
    }
    if (!Array.isArray(state.inventory)) {
        state.inventory = [];
    }
    return normalizeEquipmentHandRules(state.equipment, state.inventory);
}

function equipItemWithHandRules(options = {}) {
    const equipment = options.equipment;
    const inventory = options.inventory;
    const inventoryIndex = Number(options.inventoryIndex);
    const validSlots = Array.isArray(options.validSlots)
        ? options.validSlots
        : EQUIPMENT_SLOTS;

    if (
        !equipment
        || typeof equipment !== 'object'
        || !Array.isArray(inventory)
        || !Number.isInteger(inventoryIndex)
        || inventoryIndex < 0
        || inventoryIndex >= inventory.length
    ) {
        return {
            success: false,
            code: 'INVALID_EQUIPMENT_TRANSACTION',
            message: 'Invalid equipment transaction.'
        };
    }

    const item = inventory[inventoryIndex];
    if (!item || !validSlots.includes(item.slot)) {
        return {
            success: false,
            code: 'INVALID_EQUIPMENT_SLOT',
            message: 'This item cannot be equipped.'
        };
    }

    const slotKey = item.slot;
    const conflictSlot = getConflictingHandSlot(equipment, item);
    const displaced = [];
    if (equipment[slotKey]) {
        displaced.push({
            slotKey,
            item: equipment[slotKey]
        });
    }
    if (
        conflictSlot
        && conflictSlot !== slotKey
        && equipment[conflictSlot]
    ) {
        displaced.push({
            slotKey: conflictSlot,
            item: equipment[conflictSlot]
        });
    }

    const requestedCapacity = Number(options.maxInventorySlots);
    const maxInventorySlots = Number.isFinite(requestedCapacity)
        ? Math.max(0, Math.trunc(requestedCapacity))
        : Infinity;
    const finalInventoryLength = inventory.length - 1 + displaced.length;
    const effectiveCapacity = Number.isFinite(maxInventorySlots)
        ? Math.max(maxInventorySlots, inventory.length)
        : Infinity;
    if (finalInventoryLength > effectiveCapacity) {
        return {
            success: false,
            code: 'INVENTORY_FULL',
            message: 'Backpack is full. Make space before changing that hand setup.',
            slotKey,
            conflictSlot
        };
    }

    // Mutation starts only after every validation and capacity check passes.
    equipment[slotKey] = item;
    if (conflictSlot && conflictSlot !== slotKey) {
        equipment[conflictSlot] = null;
    }

    if (displaced.length > 0) {
        inventory[inventoryIndex] = displaced[0].item;
        displaced.slice(1).forEach(entry => inventory.push(entry.item));
    } else {
        inventory.splice(inventoryIndex, 1);
    }

    return {
        success: true,
        code: 'EQUIPPED',
        slotKey,
        conflictSlot,
        stowedSlots: displaced.map(entry => entry.slotKey),
        stowedItems: displaced.map(entry => entry.item)
    };
}

module.exports = {
    EQUIPMENT_SLOTS,
    isTwoHandedWeapon,
    getConflictingHandSlot,
    normalizeEquipmentHandRules,
    normalizeEquipmentLoadoutState,
    equipItemWithHandRules
};
