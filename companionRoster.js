// Server-side companion roster identity and equipment normalization.

const crypto = require('crypto');
const { sanitizeToken } = require('./serverSecurity.js');

const COMPANION_EQUIPMENT_SLOTS = Object.freeze(['weapon', 'helmet', 'armor', 'gloves', 'boots']);
const COMPANION_POCKET_COUNT = 2;
const MAX_ROSTER_COMPANIONS = 6;
const MAX_SELECTED_COMPANIONS = 3;
// Kept as a compatibility alias for older callers. "Selected" is the clearer
// term now that quest-required companions can be deployed as bonus allies.
const MAX_ACTIVE_COMPANIONS = MAX_SELECTED_COMPANIONS;
const MAX_COMPANION_LEVEL = 50;

function createCompanionInstanceId() {
    return `merc_${crypto.randomBytes(12).toString('hex')}`;
}

function getRequiredCompanionIds(player) {
    const sources = [
        player && player.activeQuestSession,
        player && player.quests && player.quests.active
    ];
    const requiredIds = [];

    sources.forEach(source => {
        if (!source || !Array.isArray(source.requiredCompanionIds)) return;
        source.requiredCompanionIds.forEach(value => {
            const instanceId = sanitizeToken(value, '');
            if (instanceId && !requiredIds.includes(instanceId)) requiredIds.push(instanceId);
        });
    });

    return requiredIds;
}

function makePolicy(allowed, message = '') {
    return { allowed, message };
}

function getCombatLock(options, actionLabel) {
    if (!options || (!options.inCombat && !options.activeCombat)) return null;
    return makePolicy(false, `${actionLabel} can only be changed outside combat.`);
}

function canHireCompanion(player, options = {}) {
    const combatLock = getCombatLock(options, 'Mercenary rosters');
    if (combatLock) return combatLock;

    const companions = player && player.roster && Array.isArray(player.roster.companions)
        ? player.roster.companions
        : [];
    if (companions.length >= MAX_ROSTER_COMPANIONS) {
        return makePolicy(false, `Your mercenary roster is full (${MAX_ROSTER_COMPANIONS}/${MAX_ROSTER_COMPANIONS}).`);
    }
    return makePolicy(true);
}

function canActivateCompanion(player, value, options = {}) {
    const combatLock = getCombatLock(options, 'Mercenary rosters');
    if (combatLock) return combatLock;

    const companion = findCompanionByInstanceId(player, value);
    if (!companion || companion.hired === false) {
        return makePolicy(false, 'That mercenary is not on your roster.');
    }
    if (getRequiredCompanionIds(player).includes(companion.instanceId)) {
        return makePolicy(false, `${companion.name} is locked to the active quest and does not use a selected party slot.`);
    }

    const activeIds = player && player.roster && Array.isArray(player.roster.activeIds)
        ? player.roster.activeIds
        : [];
    const requiredIds = new Set(getRequiredCompanionIds(player));
    const selectedIds = [...new Set(activeIds.filter(instanceId => !requiredIds.has(instanceId)))];
    if (activeIds.includes(companion.instanceId)) {
        return makePolicy(false, `${companion.name} is already in the active party.`);
    }
    if (selectedIds.length >= MAX_SELECTED_COMPANIONS) {
        return makePolicy(false, `The active party is full (${MAX_SELECTED_COMPANIONS}/${MAX_SELECTED_COMPANIONS} mercenaries).`);
    }
    return makePolicy(true);
}

function canBenchCompanion(player, value, options = {}) {
    const combatLock = getCombatLock(options, 'Mercenary rosters');
    if (combatLock) return combatLock;

    const companion = findCompanionByInstanceId(player, value);
    if (!companion) return makePolicy(false, 'That mercenary is not on your roster.');
    if (getRequiredCompanionIds(player).includes(companion.instanceId)) {
        return makePolicy(false, `${companion.name} is required by the active quest and cannot be benched.`);
    }

    const activeIds = player && player.roster && Array.isArray(player.roster.activeIds)
        ? player.roster.activeIds
        : [];
    if (!activeIds.includes(companion.instanceId)) {
        return makePolicy(false, `${companion.name} is already benched.`);
    }
    return makePolicy(true);
}

function canDismissCompanion(player, value, options = {}) {
    const combatLock = getCombatLock(options, 'Mercenaries');
    if (combatLock) return combatLock;

    const companion = findCompanionByInstanceId(player, value);
    if (!companion) return makePolicy(false, 'That mercenary is not on your roster.');
    if (getRequiredCompanionIds(player).includes(companion.instanceId)) {
        return makePolicy(false, `${companion.name} is required by the active quest and cannot be dismissed.`);
    }
    return makePolicy(true);
}

function normalizeRosterState(player, options = {}) {
    const sanitizeItem = typeof options.sanitizeItem === 'function' ? options.sanitizeItem : item => item || null;
    const requestedMaxActive = Number(options.maxActive);
    const maxActive = Number.isFinite(requestedMaxActive)
        ? Math.max(0, Math.trunc(requestedMaxActive))
        : MAX_SELECTED_COMPANIONS;
    const roster = player.roster && typeof player.roster === 'object' ? player.roster : {};
    const companions = Array.isArray(roster.companions) ? roster.companions : [];
    const hasCanonicalActiveIds = Object.prototype.hasOwnProperty.call(roster, 'activeIds');
    const requestedActiveIds = Array.isArray(roster.activeIds)
        ? roster.activeIds.map(id => sanitizeToken(id, '')).filter(Boolean)
        : [];
    const seenInstanceIds = new Set();
    const legacyIdMap = new Map();
    const flaggedActiveIds = [];

    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];

    const normalizedCompanions = companions
        .filter(companion => companion && typeof companion === 'object')
        .map(companion => {
            const legacyId = sanitizeToken(companion.id, '');
            const templateId = sanitizeToken(companion.templateId || legacyId, 'companion');
            if (!templateId) return null;

            let instanceId = sanitizeToken(companion.instanceId, '');
            if (!instanceId || seenInstanceIds.has(instanceId)) instanceId = createCompanionInstanceId();
            seenInstanceIds.add(instanceId);

            [instanceId, legacyId].filter(Boolean).forEach(alias => {
                if (!legacyIdMap.has(alias)) legacyIdMap.set(alias, instanceId);
            });
            if (companion.active === true) flaggedActiveIds.push(instanceId);

            const sourceEquipment = companion.equipment && typeof companion.equipment === 'object' ? companion.equipment : {};
            const equipment = {};
            COMPANION_EQUIPMENT_SLOTS.forEach(slot => {
                equipment[slot] = sanitizeItem(sourceEquipment[slot]) || null;
            });

            const legacyAccessory = sanitizeItem(sourceEquipment.accessory);
            if (legacyAccessory) player.inventory.push(legacyAccessory);

            const sourcePockets = Array.isArray(companion.pockets) ? companion.pockets : [];
            const pockets = Array.from({ length: COMPANION_POCKET_COUNT }, (_, index) => (
                sanitizeItem(sourcePockets[index]) || null
            ));
            sourcePockets.slice(COMPANION_POCKET_COUNT).forEach(item => {
                const overflowItem = sanitizeItem(item);
                if (overflowItem) player.inventory.push(overflowItem);
            });

            return {
                instanceId,
                templateId,
                name: String(companion.name || 'Companion').slice(0, 32),
                role: String(companion.role || 'Companion').slice(0, 32),
                level: Math.max(1, Math.min(MAX_COMPANION_LEVEL, Math.trunc(Number(companion.level) || 1))),
                xp: Math.max(0, Math.trunc(Number(companion.xp) || 0)),
                hired: companion.hired !== false,
                active: false,
                icon: String(companion.icon || 'M').slice(0, 2),
                spriteId: sanitizeToken(companion.spriteId, ''),
                stats: {
                    vitality: Math.max(1, Math.trunc(Number(companion.stats && companion.stats.vitality) || 3)),
                    offense: Math.max(1, Math.trunc(Number(companion.stats && companion.stats.offense) || 2)),
                    defense: Math.max(1, Math.trunc(Number(companion.stats && companion.stats.defense) || 2)),
                    speed: Math.max(1, Math.trunc(Number(companion.stats && companion.stats.speed) || 3))
                },
                equipment,
                pockets
            };
        })
        .filter(Boolean);

    const validInstanceIds = new Set(normalizedCompanions.map(companion => companion.instanceId));
    const requiredInstanceIds = new Set(getRequiredCompanionIds(player).map(requiredId => (
        validInstanceIds.has(requiredId) ? requiredId : legacyIdMap.get(requiredId)
    )).filter(Boolean));
    const activeIds = [];
    const activeCandidates = hasCanonicalActiveIds ? requestedActiveIds : flaggedActiveIds;
    activeCandidates.forEach(requestedId => {
        const instanceId = validInstanceIds.has(requestedId) ? requestedId : legacyIdMap.get(requestedId);
        if (instanceId
            && !requiredInstanceIds.has(instanceId)
            && !activeIds.includes(instanceId)
            && activeIds.length < maxActive) activeIds.push(instanceId);
    });

    player.roster = { companions: normalizedCompanions, activeIds };
    player.roster.companions.forEach(companion => {
        companion.active = activeIds.includes(companion.instanceId);
    });
    return player.roster;
}

function findCompanionByInstanceId(player, value) {
    const instanceId = sanitizeToken(value, '');
    if (!instanceId || !player || !player.roster || !Array.isArray(player.roster.companions)) return null;
    return player.roster.companions.find(companion => companion.instanceId === instanceId) || null;
}

module.exports = {
    COMPANION_EQUIPMENT_SLOTS,
    COMPANION_POCKET_COUNT,
    MAX_ROSTER_COMPANIONS,
    MAX_SELECTED_COMPANIONS,
    MAX_ACTIVE_COMPANIONS,
    createCompanionInstanceId,
    normalizeRosterState,
    findCompanionByInstanceId,
    getRequiredCompanionIds,
    canHireCompanion,
    canActivateCompanion,
    canBenchCompanion,
    canDismissCompanion
};
