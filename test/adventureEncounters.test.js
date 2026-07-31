const test = require('node:test');
const assert = require('node:assert/strict');

const { AuthoredEncounterCatalog } = require('../adventureCatalog.js');
const {
    CombatMapTemplates,
    getCombatMapTemplateById
} = require('../combatMapTemplates.js');
const {
    createAuthoredCombatEncounter,
    createCombatEncounter
} = require('../combatEncounters.js');

const AUTHORED_MAP_IDS = Object.freeze([
    'EXPEDITION_ALLEY',
    'EXPEDITION_PINE_TRAIL',
    'EXPEDITION_HEDGE_FIRE',
    'EXPEDITION_ROAD_TOLL'
]);

function catalogEntries() {
    return Array.isArray(AuthoredEncounterCatalog)
        ? AuthoredEncounterCatalog
        : Object.values(AuthoredEncounterCatalog || {});
}

function companion(number) {
    return {
        instanceId: `expedition_merc_${number}`,
        templateId: 'starter_mercenary',
        name: `Expedition Mercenary ${number}`,
        role: 'Frontliner',
        level: 1,
        xp: 0,
        hired: true,
        active: true,
        stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
        equipment: {
            helmet: null,
            armor: null,
            weapon: null,
            offhand: null,
            gloves: null,
            boots: null
        },
        pockets: [null]
    };
}

function player(overrides = {}) {
    const companions = [companion(1), companion(2)];
    return {
        username: 'Expedition Tester',
        hp: 75,
        stamina: 25,
        vitality: 3,
        offense: 3,
        defense: 3,
        speed: 3,
        wildernessLevel: 20,
        equipment: {},
        inventory: [],
        roster: {
            companions,
            activeIds: companions.map(entry => entry.instanceId)
        },
        ...overrides
    };
}

function getEntryForMap(mapTemplateId) {
    return catalogEntries().find(entry => entry && entry.mapTemplateId === mapTemplateId) || null;
}

test('authored expedition catalog covers each production map and its intended enemy role', () => {
    const expectedRoles = {
        EXPEDITION_ALLEY: ['melee_bandit'],
        EXPEDITION_PINE_TRAIL: ['bandit_archer'],
        EXPEDITION_HEDGE_FIRE: ['hedge_mage'],
        EXPEDITION_ROAD_TOLL: ['melee_bandit', 'bandit_archer']
    };

    AUTHORED_MAP_IDS.forEach(mapTemplateId => {
        const entry = getEntryForMap(mapTemplateId);
        assert.ok(entry, `${mapTemplateId} is absent from AuthoredEncounterCatalog`);
        assert.equal(typeof entry.id, 'string');
        assert.equal(typeof entry.name, 'string');
        assert.ok(Number(entry.difficulty) >= 1);
        assert.ok(Array.isArray(entry.enemies) && entry.enemies.length > 0);

        const enemyIds = entry.enemies.map(enemy => enemy.id);
        expectedRoles[mapTemplateId].forEach(enemyId => {
            assert.ok(enemyIds.includes(enemyId), `${entry.id} is missing ${enemyId}`);
        });

        entry.enemies.forEach(enemy => {
            assert.equal(typeof enemy.spawnId, 'string');
            assert.ok(CombatMapTemplates[mapTemplateId].enemySpawns[enemy.spawnId]);
        });
    });

    catalogEntries().forEach(entry => {
        const combat = createAuthoredCombatEncounter(player({ roster: { companions: [], activeIds: [] } }), entry.id, {});
        assert.ok(combat, `${entry.id} could not be constructed`);
        const enemies = combat.actors.filter(actor => actor.teamId === 'ENEMY');
        assert.deepEqual(enemies.map(actor => actor.id), entry.enemies.map(enemy => enemy.id));
        assert.deepEqual(enemies.map(actor => actor.aiProfileId), entry.enemies.map(enemy => enemy.aiProfileId));
    });
});

test('authored maps are native 16x10 layouts with safe deployment and named spawn tiles', () => {
    AUTHORED_MAP_IDS.forEach(mapTemplateId => {
        const template = getCombatMapTemplateById(mapTemplateId);
        assert.ok(template);
        assert.deepEqual(template.gridSize, { cols: 16, rows: 10 });
        assert.equal(template.tileSize, 54);
        assert.equal(template.zone, 'WILDERNESS');
        assert.equal(template.floorSpriteId, 'ground_wilderness');

        const obstacleKeys = new Set();
        template.obstacles.forEach(obstacle => {
            assert.ok(obstacle.x >= 0 && obstacle.x < 16);
            assert.ok(obstacle.y >= 0 && obstacle.y < 10);
            const key = `${obstacle.x},${obstacle.y}`;
            assert.equal(obstacleKeys.has(key), false, `${mapTemplateId} repeats obstacle ${key}`);
            obstacleKeys.add(key);
        });

        const deploymentKeys = new Set();
        template.deploymentZone.forEach(tile => {
            const key = `${tile.x},${tile.y}`;
            assert.equal(obstacleKeys.has(key), false, `${mapTemplateId} blocks deployment ${key}`);
            assert.equal(deploymentKeys.has(key), false, `${mapTemplateId} repeats deployment ${key}`);
            deploymentKeys.add(key);
        });
        assert.ok(deploymentKeys.has(`${template.playerStart.x},${template.playerStart.y}`));

        const spawnKeys = new Set();
        Object.entries(template.enemySpawns).forEach(([spawnId, spawn]) => {
            const key = `${spawn.x},${spawn.y}`;
            assert.match(spawnId, /^[A-Za-z0-9_-]+$/);
            assert.ok(spawn.x >= 0 && spawn.x < 16);
            assert.ok(spawn.y >= 0 && spawn.y < 10);
            assert.equal(obstacleKeys.has(key), false, `${mapTemplateId} blocks spawn ${spawnId}`);
            assert.equal(deploymentKeys.has(key), false, `${mapTemplateId} overlaps deployment at ${spawnId}`);
            assert.equal(spawnKeys.has(key), false, `${mapTemplateId} repeats spawn tile ${key}`);
            spawnKeys.add(key);
        });
    });

    const clone = getCombatMapTemplateById('EXPEDITION_ALLEY');
    clone.playerStart.x = 15;
    assert.equal(getCombatMapTemplateById('EXPEDITION_ALLEY').playerStart.x, 1);
    assert.equal(getCombatMapTemplateById('missing'), null);
});

test('authored encounter construction deploys the selected party and catalog enemies with stable metadata', () => {
    const entry = getEntryForMap('EXPEDITION_ALLEY');
    assert.ok(entry);

    const combat = createAuthoredCombatEncounter(player(), entry.id, {
        journeyId: 'journey_1',
        routeId: 'old_road_route',
        destinationId: 'old_road',
        direction: 'OUTBOUND',
        legIndex: 2,
        encounterIndex: 1,
        encounterId: 'forged_encounter',
        from: '<unsafe>',
        rewards: { gold: 999999 },
        enemies: [{ id: 'wilderness_overlord' }]
    });

    assert.ok(combat);
    assert.equal(combat.mode, 'EXPEDITION');
    assert.equal(combat.zone, 'WILDERNESS');
    assert.equal(combat.encounterId, entry.id);
    assert.equal(combat.encounterName, entry.name);
    assert.equal(combat.mapTemplateId, entry.mapTemplateId);
    assert.equal(combat.expeditionContext.encounterId, entry.id);
    assert.equal(combat.expeditionContext.journeyId, 'journey_1');
    assert.equal(combat.expeditionContext.destinationId, 'old_road');
    assert.equal(combat.expeditionContext.legIndex, 2);
    assert.equal(Object.hasOwn(combat.expeditionContext, 'from'), false);
    assert.equal(Object.hasOwn(combat.expeditionContext, 'rewards'), false);
    assert.equal(Object.hasOwn(combat.expeditionContext, 'enemies'), false);

    const friendlyActors = combat.actors.filter(actor => actor.teamId === 'PLAYER');
    assert.deepEqual(
        friendlyActors.filter(actor => actor.kind === 'companion').map(actor => actor.companionInstanceId),
        ['expedition_merc_1', 'expedition_merc_2']
    );
    const deploymentKeys = new Set(combat.deploymentZone.map(tile => `${tile.x},${tile.y}`));
    friendlyActors.forEach(actor => assert.ok(deploymentKeys.has(`${actor.x},${actor.y}`)));

    const enemies = combat.actors.filter(actor => actor.teamId === 'ENEMY');
    assert.deepEqual(enemies.map(actor => actor.uid), entry.enemies.map((_, index) => `mob_${index}`));
    assert.deepEqual(enemies.map(actor => actor.id), entry.enemies.map(enemy => enemy.id));
    enemies.forEach((enemy, index) => {
        const spawn = CombatMapTemplates[entry.mapTemplateId].enemySpawns[entry.enemies[index].spawnId];
        assert.deepEqual({ x: enemy.x, y: enemy.y }, spawn);
        assert.equal(enemy.spawnId, entry.enemies[index].spawnId);
    });
});

test('invalid authored ids fail closed while legacy encounter construction remains available', () => {
    const knight = player({ wildernessLevel: 3 });
    assert.equal(createAuthoredCombatEncounter(knight, 'not_a_real_encounter', {
        rewards: { gold: 999999 },
        enemies: [{ id: 'wilderness_overlord' }]
    }), null);

    const legacy = createCombatEncounter(knight, { zoneChoice: 'WILDERNESS', activeLevel: 1 });
    assert.ok(legacy);
    assert.equal(legacy.zone, 'WILDERNESS');
    assert.equal(legacy.activeLevel, 1);
    assert.equal(legacy.mode, undefined);
    assert.equal(legacy.encounterId, undefined);
});
