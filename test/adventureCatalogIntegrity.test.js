const test = require('node:test');
const assert = require('node:assert/strict');

const {
    LocationCatalog,
    RouteCatalog,
    AuthoredEncounterCatalog,
    JourneyInstanceCatalog
} = require('../adventureCatalog.js');
const { CombatMapTemplates } = require('../combatMapTemplates.js');
const { NpcDatabase } = require('../public/js/npc-database.js');

function namedSpawns(template) {
    const source = template && template.enemySpawns;
    if (Array.isArray(source)) return new Set(source.map(spawn => spawn && spawn.id).filter(Boolean));
    return new Set(Object.keys(source || {}));
}

test('every adventure route references known locations and authored encounters', () => {
    Object.values(RouteCatalog).forEach(route => {
        assert.ok(LocationCatalog[route.fromLocationId], `${route.id} has an unknown origin`);
        assert.ok(LocationCatalog[route.toLocationId], `${route.id} has an unknown destination`);
        assert.ok(Array.isArray(route.encounterIds) && route.encounterIds.length > 0, `${route.id} has no encounters`);

        const routeEncounterIds = new Set(route.encounterIds);
        route.encounterIds.forEach(encounterId => {
            assert.ok(AuthoredEncounterCatalog[encounterId], `${route.id} references unknown ${encounterId}`);
        });
        Object.values(route.encounterBands || {}).flat().forEach(encounterId => {
            assert.ok(routeEncounterIds.has(encounterId), `${route.id} band escapes its encounter pool: ${encounterId}`);
        });
        (route.returnEncounterIds || []).forEach(encounterId => {
            assert.ok(routeEncounterIds.has(encounterId), `${route.id} return escapes its encounter pool: ${encounterId}`);
        });
        (route.preparationVariants || []).forEach(variant => {
            (variant.outboundEncounterIds || []).forEach(encounterId => {
                assert.ok(routeEncounterIds.has(encounterId), `${route.id}/${variant.id} references unknown ${encounterId}`);
            });
        });
    });
});

test('every authored encounter references a deployable map, enemy, and named spawn', () => {
    Object.values(AuthoredEncounterCatalog).forEach(encounter => {
        const template = CombatMapTemplates[encounter.mapTemplateId];
        assert.ok(template, `${encounter.id} references unknown map ${encounter.mapTemplateId}`);
        const spawns = namedSpawns(template);
        assert.ok(Array.isArray(encounter.enemies) && encounter.enemies.length > 0, `${encounter.id} has no enemies`);
        encounter.enemies.forEach(enemy => {
            assert.ok(NpcDatabase[enemy.id], `${encounter.id} references unknown enemy ${enemy.id}`);
            assert.ok(spawns.has(enemy.spawnId), `${encounter.id} references unknown spawn ${enemy.spawnId}`);
        });
    });
});

test('journey instance choices and route stop references are immutable and server-authored', () => {
    const representedTypes = new Set();
    Object.values(JourneyInstanceCatalog).forEach(instance => {
        representedTypes.add(instance.type);
        assert.ok(['event', 'stop'].includes(instance.kind));
        assert.ok(instance.title && instance.description);
        assert.ok(Array.isArray(instance.options) && instance.options.length >= 2);
        instance.options.forEach(option => {
            assert.ok(option.id && option.label && option.resultMessage);
            assert.equal(Object.isFrozen(option.effects), true);
        });
    });
    assert.deepEqual(
        [...representedTypes].sort(),
        ['camp', 'npc', 'puzzle', 'waypoint', 'weather']
    );
    Object.values(RouteCatalog).forEach(route => {
        (route.journeyInstanceIds || []).forEach(instanceId => {
            assert.ok(JourneyInstanceCatalog[instanceId], `${route.id} references unknown ${instanceId}`);
        });
        if (route.waypointInstanceId) {
            const stop = JourneyInstanceCatalog[route.waypointInstanceId];
            assert.ok(stop, `${route.id} references an unknown waypoint`);
            assert.equal(stop.kind, 'stop');
        }
    });
});

test('the retired fully-prepared watchhouse composition has no active adventure reference', () => {
    const retiredId = 'watchhouse_breach_fully_prepared';
    assert.equal(AuthoredEncounterCatalog[retiredId], undefined);
    Object.values(RouteCatalog).forEach(route => {
        assert.equal(route.encounterIds.includes(retiredId), false, `${route.id} retained ${retiredId}`);
        (route.preparationVariants || []).forEach(variant => {
            assert.equal(
                (variant.outboundEncounterIds || []).includes(retiredId),
                false,
                `${route.id}/${variant.id} retained ${retiredId}`
            );
        });
    });
});
