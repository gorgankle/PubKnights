const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ChapterOneCompanionCatalog,
    getNamedCompanion,
    recruitChapterOneCompanion
} = require('../chapterOneCompanions.js');

function makePlayer(companions = []) {
    return {
        inventory: [],
        roster: { companions, activeIds: [] }
    };
}

test('Marlow is one authored companion with a deliberate starter loadout', () => {
    const player = makePlayer();
    const result = recruitChapterOneCompanion(player, 'marlow');

    assert.equal(result.success, true);
    assert.equal(player.roster.companions.length, 1);
    const marlow = getNamedCompanion(player, 'marlow');
    assert.equal(marlow.instanceId, ChapterOneCompanionCatalog.marlow.instanceId);
    assert.equal(marlow.templateId, 'marlow');
    assert.equal(marlow.spriteId, 'companion_marlow');
    assert.equal(marlow.equipment.weapon.id, 'scavenged_machete');
    assert.equal(marlow.equipment.offhand.id, 'round_shield');
    assert.equal(marlow.active, false);
});

test('recruiting Marlow twice never creates a generic clone', () => {
    const player = makePlayer();
    assert.equal(recruitChapterOneCompanion(player, 'marlow').success, true);
    const duplicate = recruitChapterOneCompanion(player, 'marlow');

    assert.equal(duplicate.success, false);
    assert.equal(duplicate.code, 'ALREADY_RECRUITED');
    assert.equal(player.roster.companions.length, 1);
});

test('Marlow waits when the existing roster has no open slot', () => {
    const companions = Array.from({ length: 6 }, (_, index) => ({
        instanceId: `merc_existing_${index}`,
        templateId: `existing_${index}`,
        name: `Existing ${index}`,
        equipment: {},
        pockets: []
    }));
    const player = makePlayer(companions);
    const result = recruitChapterOneCompanion(player, 'marlow');

    assert.equal(result.success, false);
    assert.equal(result.code, 'ROSTER_FULL');
    assert.equal(player.roster.companions.length, 6);
});
