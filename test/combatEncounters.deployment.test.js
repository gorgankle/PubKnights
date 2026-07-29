const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createCombatEncounter,
    getDeployedCompanions,
    getCompanionFormationTiles,
    MAX_STANDARD_PLAYER_ACTORS
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

test('Wilderness 20 keeps the selected mercenary cap when Kreg joins the battle', () => {
    const companions = Array.from({ length: 6 }, (_, index) => companion(index + 1));
    const knight = player(companions, ['merc_1', 'merc_2', 'merc_3', 'merc_4']);

    const combat = createCombatEncounter(knight, { zoneChoice: 'WILDERNESS', activeLevel: 20 });
    const friendlyActors = combat.actors.filter(actor => actor.teamId === 'PLAYER');
    const deployedIds = friendlyActors
        .filter(actor => actor.kind === 'companion')
        .map(actor => actor.companionInstanceId);

    assert.equal(friendlyActors.length, 5);
    assert.deepEqual(deployedIds, ['merc_1', 'merc_2', 'merc_3']);
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
