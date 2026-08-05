// Shared, data-driven equipment attack discovery and resolution contract.
(function attachEquipmentActionContract(root, factory) {
    const contract = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = contract;
    }
    if (root && typeof root === 'object') {
        root.EquipmentActionContract = contract;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEquipmentActionContract() {
    'use strict';

    const EQUIPMENT_SLOT_ORDER = Object.freeze([
        'weapon',
        'offhand',
        'helmet',
        'armor',
        'gloves',
        'boots'
    ]);

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function isTwoHandedWeapon(item) {
        if (!item || typeof item !== 'object') return false;
        const handedness = String(item.handedness || '').toLowerCase();
        return item.twoHanded === true
            || ['two', 'two-handed', '2h'].includes(handedness);
    }

    function hasCompatibleOneHandedMainHand(equipment) {
        const weapon = equipment && equipment.weapon;
        if (!weapon || weapon.slot !== 'weapon' || isTwoHandedWeapon(weapon)) {
            return false;
        }
        return weapon.twoHanded === false
            || String(weapon.handedness || '').toLowerCase() === 'one';
    }

    function cloneAndFreeze(value) {
        if (Array.isArray(value)) {
            return Object.freeze(value.map(cloneAndFreeze));
        }
        if (!isObject(value)) return value;

        const clone = {};
        Object.entries(value).forEach(([key, nestedValue]) => {
            clone[key] = cloneAndFreeze(nestedValue);
        });
        return Object.freeze(clone);
    }

    function getActionDefinitions(item, equipmentSlot) {
        if (!item || !isObject(item)) return null;

        if (Object.prototype.hasOwnProperty.call(item, 'equipmentActions')) {
            return isObject(item.equipmentActions)
                ? item.equipmentActions
                : null;
        }

        if (
            equipmentSlot === 'weapon'
            && item.combat
            && isObject(item.combat.special)
        ) {
            return { special: item.combat.special };
        }
        return null;
    }

    function meetsActionRequirements(equipment, equipmentSlot, action) {
        if (
            equipmentSlot === 'offhand'
            && isTwoHandedWeapon(equipment && equipment.weapon)
        ) {
            return false;
        }

        const requirements = isObject(action && action.requirements)
            ? action.requirements
            : {};
        if (requirements.mainHand === 'one-handed') {
            return hasCompatibleOneHandedMainHand(equipment);
        }
        return true;
    }

    function normalizedNumber(value, fallback, minimum = 0) {
        const numericValue = Number(value);
        return Number.isFinite(numericValue)
            ? Math.max(minimum, numericValue)
            : fallback;
    }

    function normalizeDescriptor(item, equipmentSlot, actionId, action) {
        if (!isObject(action)) return null;

        const actionType = String(action.actionType || 'attack');
        const targetType = String(
            action.targetType || (actionType === 'guard' ? 'self' : 'enemy')
        );
        const range = normalizedNumber(
            action.range,
            targetType === 'self' ? 0 : 1
        );
        const staminaCost = normalizedNumber(action.staminaCost, 0);
        const multiplier = normalizedNumber(action.multiplier, 1);
        const ignoresDefense = action.ignoresDefense === true;
        const animTypeValue = action.animType
            || action.clipId
            || item.animationFamily
            || null;
        const clipIdValue = action.clipId
            || action.animType
            || item.animationFamily
            || null;
        const animType = animTypeValue === null ? null : String(animTypeValue);
        const clipId = clipIdValue === null ? null : String(clipIdValue);
        const description = String(action.description || action.desc || '');
        const itemId = String(item.id || '');
        const itemName = String(item.name || itemId || 'Equipment');
        const identity = isObject(item.combatIdentity)
            ? item.combatIdentity
            : {};
        const family = String(
            action.family
            || identity.family
            || item.animationFamily
            || item.offhandType
            || item.type
            || ''
        ).toLowerCase();
        const guardType = action.guardType
            ? String(action.guardType).toLowerCase()
            : null;
        const charges = normalizedNumber(action.charges, 0);
        const pushTarget = normalizedNumber(action.pushTarget, 0);
        const repositionAway = normalizedNumber(action.repositionAway, 0);
        const endsTurn = action.endsTurn === true;
        const interruptsIntent = action.interruptsIntent === true;
        const normalizedRules = cloneAndFreeze({
            ...action,
            actionType,
            targetType,
            range,
            staminaCost,
            multiplier,
            ignoresDefense,
            animType,
            clipId,
            family,
            guardType,
            charges,
            pushTarget,
            repositionAway,
            endsTurn,
            interruptsIntent
        });

        return Object.freeze({
            id: actionId,
            name: String(action.name || actionId),
            description,
            equipmentSlot,
            itemId,
            itemName,
            actionType,
            targetType,
            range,
            staminaCost,
            multiplier,
            ignoresDefense,
            animType,
            clipId,
            family,
            guardType,
            charges,
            pushTarget,
            repositionAway,
            endsTurn,
            interruptsIntent,
            rules: normalizedRules
        });
    }

    function resolveEquipmentAttack(equipment, equipmentSlot, actionId) {
        if (
            !isObject(equipment)
            || typeof equipmentSlot !== 'string'
            || typeof actionId !== 'string'
            || !Object.prototype.hasOwnProperty.call(equipment, equipmentSlot)
        ) {
            return null;
        }

        const item = equipment[equipmentSlot];
        const actionDefinitions = getActionDefinitions(item, equipmentSlot);
        if (
            !actionDefinitions
            || !Object.prototype.hasOwnProperty.call(actionDefinitions, actionId)
        ) {
            return null;
        }

        const action = actionDefinitions[actionId];
        if (!meetsActionRequirements(equipment, equipmentSlot, action)) {
            return null;
        }
        return normalizeDescriptor(item, equipmentSlot, actionId, action);
    }

    function listEquipmentAttacks(equipment) {
        if (!isObject(equipment)) return Object.freeze([]);

        const additionalSlots = Object.keys(equipment)
            .filter(slot => !EQUIPMENT_SLOT_ORDER.includes(slot))
            .sort();
        const slots = [...EQUIPMENT_SLOT_ORDER, ...additionalSlots];
        const attacks = [];

        slots.forEach(equipmentSlot => {
            const item = equipment[equipmentSlot];
            const actionDefinitions = getActionDefinitions(
                item,
                equipmentSlot
            );
            if (!actionDefinitions) return;

            Object.keys(actionDefinitions).forEach(actionId => {
                const descriptor = resolveEquipmentAttack(
                    equipment,
                    equipmentSlot,
                    actionId
                );
                if (descriptor) attacks.push(descriptor);
            });
        });

        return Object.freeze(attacks);
    }

    return Object.freeze({
        listEquipmentAttacks,
        resolveEquipmentAttack
    });
});
