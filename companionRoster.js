// Server-side companion roster identity and equipment normalization.

const crypto = require('crypto');
const { sanitizeToken } = require('./serverSecurity.js');

const COMPANION_EQUIPMENT_SLOTS = Object.freeze(['weapon', 'helmet', 'armor', 'gloves', 'boots']);
const MAX_ACTIVE_COMPANIONS = 1;

function createCompanionInstanceId() {
    return `merc_${crypto.randomBytes(12).toString('hex')}`;
}

function normalizeRosterState(player, options = {}) {
    const sanitizeItem = typeof options.sanitizeItem === 'function' ? options.sanitizeItem : item => item || null;
    const maxActive = Math.max(0, Math.trunc(Number(options.maxActive) || MAX_ACTIVE_COMPANIONS));
    const roster = player.roster && typeof player.roster === 'object' ? player.roster : {};
    const companions = Array.isArray(roster.companions) ? roster.companions : [];
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

            return {
                instanceId,
                templateId,
                name: String(companion.name || 'Companion').slice(0, 32),
                role: String(companion.role || 'Companion').slice(0, 32),
                level: Math.max(1, Math.min(50, Math.trunc(Number(companion.level) || 1))),
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
                equipment
            };
        })
        .filter(Boolean);

    const validInstanceIds = new Set(normalizedCompanions.map(companion => companion.instanceId));
    const activeIds = [];
    const activeCandidates = requestedActiveIds.length > 0 ? requestedActiveIds : flaggedActiveIds;
    activeCandidates.forEach(requestedId => {
        const instanceId = validInstanceIds.has(requestedId) ? requestedId : legacyIdMap.get(requestedId);
        if (instanceId && !activeIds.includes(instanceId) && activeIds.length < maxActive) activeIds.push(instanceId);
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
    MAX_ACTIVE_COMPANIONS,
    createCompanionInstanceId,
    normalizeRosterState,
    findCompanionByInstanceId
};
