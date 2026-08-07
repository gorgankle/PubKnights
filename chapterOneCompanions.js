// --- chapterOneCompanions.js ---
// Authored Chapter One companions. Narrative availability belongs to the world
// domain; this module owns only roster-safe recruitment and gameplay loadouts.

const { ItemDatabase } = require('./public/js/items.js');
const {
    MAX_ROSTER_COMPANIONS,
    normalizeRosterState
} = require('./companionRoster.js');

const ChapterOneCompanionCatalog = Object.freeze({
    marlow: Object.freeze({
        id: 'marlow',
        instanceId: 'story_marlow',
        name: 'Marlow',
        role: 'Road Warden',
        icon: 'M',
        spriteId: 'companion_marlow',
        level: 2,
        stats: Object.freeze({
            vitality: 3,
            offense: 2,
            defense: 3,
            speed: 3
        }),
        equipment: Object.freeze({
            weapon: 'scavenged_machete',
            offhand: 'round_shield'
        })
    })
});

function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

function getNamedCompanion(player, companionId) {
    const definition = ChapterOneCompanionCatalog[companionId];
    if (!definition || !player || !player.roster || !Array.isArray(player.roster.companions)) {
        return null;
    }
    return player.roster.companions.find(companion => (
        companion
        && (companion.templateId === definition.id || companion.instanceId === definition.instanceId)
    )) || null;
}

function buildNamedCompanion(definition) {
    const equipment = {
        weapon: null,
        offhand: null,
        helmet: null,
        armor: null,
        gloves: null,
        boots: null
    };
    Object.entries(definition.equipment || {}).forEach(([slot, itemId]) => {
        if (Object.prototype.hasOwnProperty.call(equipment, slot) && ItemDatabase[itemId]) {
            equipment[slot] = clone(ItemDatabase[itemId]);
        }
    });
    return {
        instanceId: definition.instanceId,
        templateId: definition.id,
        name: definition.name,
        role: definition.role,
        level: definition.level,
        xp: 0,
        hired: true,
        active: false,
        icon: definition.icon,
        spriteId: definition.spriteId,
        stats: clone(definition.stats),
        equipment,
        pockets: [null]
    };
}

function recruitChapterOneCompanion(player, companionId) {
    const definition = ChapterOneCompanionCatalog[companionId];
    if (!definition) {
        return {
            success: false,
            code: 'UNKNOWN_STORY_COMPANION',
            message: 'That traveler is not available to join the party.'
        };
    }
    if (!player || typeof player !== 'object') {
        return {
            success: false,
            code: 'PLAYER_NOT_FOUND',
            message: 'The party roster is unavailable.'
        };
    }

    normalizeRosterState(player);
    const existing = getNamedCompanion(player, companionId);
    if (existing) {
        return {
            success: false,
            code: 'ALREADY_RECRUITED',
            companion: existing,
            message: `${definition.name} is already on the roster.`
        };
    }
    if (player.roster.companions.length >= MAX_ROSTER_COMPANIONS) {
        return {
            success: false,
            code: 'ROSTER_FULL',
            message: `Make room in the roster before asking ${definition.name} to join.`
        };
    }

    const companion = buildNamedCompanion(definition);
    player.roster.companions.push(companion);
    normalizeRosterState(player);
    const recruited = getNamedCompanion(player, companionId);
    return {
        success: true,
        code: 'RECRUITED',
        companion: clone(recruited),
        message: `${definition.name} joined the roster. Choose whether to place him in the active party.`
    };
}

module.exports = {
    ChapterOneCompanionCatalog,
    getNamedCompanion,
    recruitChapterOneCompanion
};
