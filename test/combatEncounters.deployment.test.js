const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createCombatEncounter,
    getDeployedCompanions,
    getCompanionFormationTiles,
    MAX_STANDARD_PLAYER_ACTORS,
    MAX_PLAYER_TEAM_ACTORS,
    MAX_QUEST_BONUS_ALLIES
} = require('../combatEncounters.js');

function companion(number) {
    return {
        instanceId: `merc_${number}`,
        templateId: 'starter_mercenary',
        name: `Mercenary ${number}`,
        role: 'Frontliner',
        level: 1,
        xp: 0,
        hired: true,
        active: true,
        stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
        equipment: { weapon: null, helmet: null, armor: null, gloves: null, boots: null },
        pockets: [null, null]
    };
}

function player(companions, activeIds, overrides = {}) {
    return {
        username: 'Deployment Tester',
        hp: 100,
        stamina: 50,
        vitality: 4,
        offense: 4,
        defense: 4,
        speed: 4,
        wildernessLevel: 20,
        equipment: {},
        inventory: [],
        roster: { companions, activeIds },
        ...overrides
    };
}

test('standard deployment preserves selection order and caps the party at three mercenaries plus the Knight', () => {
    const companions = Array.from({ length: 5 }, (_, index) => companion(index + 1));
    const knight = player(companions, ['merc_4', 'merc_2', 'merc_4', 'merc_1', 'merc_5']);

    const deployed = getDeployedCompanions(knight);

    assert.equal(MAX_STANDARD_PLAYER_ACTORS, 4);
    assert.deepEqual(deployed.map(entry => entry.instanceId), ['merc_4', 'merc_2', 'merc_1']);
});

test('an explicit empty activeIds array benches every optional mercenary', () => {
    const companions = [companion(1), companion(2)];
    const knight = player(companions, []);

    assert.deepEqual(getDeployedCompanions(knight), []);
});

test('quest-required mercenaries deploy from the bench as bonus allies without consuming selected slots', () => {
    const companions = Array.from({ length: 6 }, (_, index) => companion(index + 1));
    const knight = player(companions, ['merc_1', 'merc_2', 'merc_3'], {
        activeQuestSession: { requiredCompanionIds: ['merc_5', 'merc_6'] }
    });

    const deployed = getDeployedCompanions(knight);

    assert.equal(MAX_QUEST_BONUS_ALLIES, 2);
    assert.deepEqual(deployed.map(entry => entry.instanceId), [
        'merc_1', 'merc_2', 'merc_3', 'merc_5', 'merc_6'
    ]);
});

test('a legacy selected required ID cannot displace any of the three optional mercenaries', () => {
    const companions = Array.from({ length: 5 }, (_, index) => companion(index + 1));
    const knight = player(companions, ['merc_5', 'merc_1', 'merc_2', 'merc_3'], {
        activeQuestSession: { requiredCompanionIds: ['merc_5'] }
    });

    const deployed = getDeployedCompanions(knight);

    assert.deepEqual(deployed.map(entry => entry.instanceId), [
        'merc_1',
        'merc_2',
        'merc_3',
        'merc_5'
    ]);
});

test('the Wilderness 20 quest NPC reservation keeps the total friendly battle team at six', () => {
    const companions = Array.from({ length: 6 }, (_, index) => companion(index + 1));
    const knight = player(companions, ['merc_1', 'merc_2', 'merc_3'], {
        activeQuestSession: { requiredCompanionIds: ['merc_4', 'merc_5'] }
    });

    const combat = createCombatEncounter(knight, { zoneChoice: 'WILDERNESS', activeLevel: 20 });
    const friendlyActors = combat.actors.filter(actor => actor.teamId === 'PLAYER');
    const deployedIds = friendlyActors
        .filter(actor => actor.kind === 'companion')
        .map(actor => actor.companionInstanceId);

    assert.equal(MAX_PLAYER_TEAM_ACTORS, 6);
    assert.equal(friendlyActors.length, MAX_PLAYER_TEAM_ACTORS);
    assert.deepEqual(deployedIds, ['merc_1', 'merc_2', 'merc_3', 'merc_4']);
    assert.equal(friendlyActors.some(actor => actor.uid === 'ally_kreg'), true);
});

test('formation candidates are deterministic, unique, and do not reuse the Knight tile', () => {
    const origin = { x: 3, y: 4 };
    const first = getCompanionFormationTiles(origin);
    const second = getCompanionFormationTiles(origin);
    const keys = first.map(tile => `${tile.x},${tile.y}`);

    assert.deepEqual(first, second);
    assert.deepEqual(first.slice(0, 5), [
        { x: 4, y: 4 },
        { x: 3, y: 5 },
        { x: 3, y: 3 },
        { x: 4, y: 5 },
        { x: 4, y: 3 }
    ]);
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(keys.includes('3,4'), false);
});
