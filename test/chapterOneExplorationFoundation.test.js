const test = require('node:test');
const assert = require('node:assert/strict');

const {
    beginExpedition,
    beginReturnTrip,
    calculatePartyPower,
    getAdventureSnapshot,
    getPartyPowerBand,
    normalizeAdventureState,
    reconcileAdventureProgression,
    resolveRouteEncounterSelection,
    resolveRouteEncounterPool
} = require('../adventureState.js');
const { AuthoredEncounterCatalog, RouteCatalog } = require('../adventureCatalog.js');

function player(overrides = {}) {
    return {
        username: 'Exploration Foundation Tester',
        vitality: 1,
        maxStamina: 1,
        offense: 1,
        defense: 1,
        speed: 1,
        equipment: { weapon: { id: 'rusty_mace', offense: 1 } },
        roster: { companions: [], activeIds: [] },
        world: {
            facts: {
                forged_toll_seal: false,
                pine_signal_chart: false
            }
        },
        pendingGold: 0,
        ...overrides
    };
}

function routeIds(snapshot) {
    return snapshot.routes.map(route => route.id);
}

function locationIds(snapshot) {
    return snapshot.locations.map(location => location.id);
}

function prepareWatchhouse(knight, optionId = 'warded_approach') {
    knight.world.chapters = {
        chapter_one: {
            status: 'finale',
            finale: {
                status: 'prepared',
                preparationFlags: { tildas_wards: true, marlows_breach: true },
                selectedPreparationOptionId: optionId
            },
            epilogue: { status: 'locked' }
        }
    };
    knight.world.contracts = {
        active: {
            watchhouse_reckoning: { status: 'active', objectives: {} }
        },
        completed: {}
    };
}

test('unknown branch nodes, routes, coordinates, and internal route stats stay out of a fresh snapshot', () => {
    const snapshot = getAdventureSnapshot(player());

    assert.deepEqual(locationIds(snapshot), ['pub_hub', 'old_road', 'pine_trail']);
    assert.deepEqual(routeIds(snapshot), ['route_old_road', 'route_pine_trail']);
    assert.deepEqual(Object.keys(snapshot.adventure.routeStats), ['route_old_road', 'route_pine_trail']);
    assert.equal(snapshot.locations.some(location => location.id === 'burnt_heath'), false);
    assert.equal(snapshot.locations.some(location => location.id === 'ruined_watchhouse'), false);
    assert.equal(snapshot.routes.some(route => route.id === 'route_toll_crossing'), false);
    snapshot.routes.forEach(route => {
        assert.equal(Object.hasOwn(route, 'encounterIds'), false);
        assert.equal(Object.hasOwn(route, 'enemySpawns'), false);
        assert.deepEqual(route.encounterReports, []);
    });
});

test('middle branches require both a discovered clue and a safe return carrying it home', () => {
    const knight = player();
    const adventure = normalizeAdventureState(knight);

    knight.world.facts.pine_signal_chart = true;
    reconcileAdventureProgression(knight);
    assert.equal(adventure.unlockedRouteIds.includes('route_burnt_heath'), false);

    adventure.routeStats.route_pine_trail.successfulRoundTrips = 1;
    const pineChanges = reconcileAdventureProgression(knight).changes;
    assert.deepEqual(pineChanges.discoveredLocationIds, ['burnt_heath']);
    assert.ok(adventure.unlockedRouteIds.includes('route_burnt_heath'));
    assert.equal(adventure.unlockedRouteIds.includes('route_toll_crossing'), false);

    knight.world.facts.forged_toll_seal = true;
    reconcileAdventureProgression(knight);
    assert.equal(adventure.unlockedRouteIds.includes('route_toll_crossing'), false);

    adventure.routeStats.route_old_road.successfulRoundTrips = 1;
    const tollChanges = reconcileAdventureProgression(knight).changes;
    assert.ok(tollChanges.discoveredLocationIds.includes('toll_crossing'));
    assert.ok(adventure.unlockedRouteIds.includes('route_toll_crossing'));
    assert.ok(adventure.unlockedRouteIds.includes('route_old_pine_cut'));
});

test('either middle return reveals a watchhouse approach and both returns earn the cross-branch shortcut', () => {
    const knight = player();
    const adventure = normalizeAdventureState(knight);
    Object.assign(knight.world.facts, {
        pine_signal_chart: true,
        forged_toll_seal: true
    });
    adventure.routeStats.route_pine_trail.successfulRoundTrips = 1;
    adventure.routeStats.route_old_road.successfulRoundTrips = 1;
    reconcileAdventureProgression(knight);

    adventure.routeStats.route_burnt_heath.successfulRoundTrips = 1;
    reconcileAdventureProgression(knight);
    let snapshot = getAdventureSnapshot(knight);
    assert.ok(locationIds(snapshot).includes('ruined_watchhouse'));
    assert.ok(routeIds(snapshot).includes('route_heath_watchhouse'));
    assert.equal(snapshot.locations.find(location => location.id === 'ruined_watchhouse').unlocked, false);
    assert.equal(snapshot.routes.find(route => route.id === 'route_heath_watchhouse').unlocked, false);
    assert.equal(routeIds(snapshot).includes('route_toll_watchhouse'), false);
    assert.equal(routeIds(snapshot).includes('route_heath_toll_cut'), false);

    knight.adventure.routeStats.route_toll_crossing.successfulRoundTrips = 1;
    reconcileAdventureProgression(knight);
    snapshot = getAdventureSnapshot(knight);
    assert.ok(routeIds(snapshot).includes('route_toll_watchhouse'));
    assert.ok(routeIds(snapshot).includes('route_heath_toll_cut'));
    assert.equal(snapshot.routes.find(route => route.id === 'route_heath_toll_cut').bidirectional, true);
    assert.equal(snapshot.routes.find(route => route.id === 'route_toll_watchhouse').unlocked, false);

    prepareWatchhouse(knight);
    reconcileAdventureProgression(knight);
    snapshot = getAdventureSnapshot(knight);
    assert.equal(snapshot.locations.find(location => location.id === 'ruined_watchhouse').unlocked, true);
    assert.equal(snapshot.routes.find(route => route.id === 'route_heath_watchhouse').unlocked, true);
    assert.equal(snapshot.routes.find(route => route.id === 'route_toll_watchhouse').unlocked, true);
});

test('watchhouse routes require a prepared finale and its active contract even when old saves retain unlock ids', () => {
    const knight = player();
    const adventure = normalizeAdventureState(knight);
    Object.assign(knight.world.facts, {
        pine_signal_chart: true,
        forged_toll_seal: true
    });
    adventure.routeStats.route_pine_trail.successfulRoundTrips = 1;
    adventure.routeStats.route_old_road.successfulRoundTrips = 1;
    adventure.routeStats.route_burnt_heath.successfulRoundTrips = 1;
    reconcileAdventureProgression(knight);

    assert.ok(adventure.discoveredRouteIds.includes('route_heath_watchhouse'));
    assert.equal(adventure.unlockedRouteIds.includes('route_heath_watchhouse'), false);
    adventure.unlockedRouteIds.push('route_heath_watchhouse');
    assert.equal(beginExpedition(knight, 'route_heath_watchhouse').code, 'FINALE_NOT_READY');

    prepareWatchhouse(knight);
    delete knight.world.contracts.active.watchhouse_reckoning;
    reconcileAdventureProgression(knight);
    assert.equal(beginExpedition(knight, 'route_heath_watchhouse').code, 'FINALE_NOT_READY');

    knight.world.contracts.active.watchhouse_reckoning = { status: 'active', objectives: {} };
    reconcileAdventureProgression(knight);
    const started = beginExpedition(knight, 'route_heath_watchhouse', { random: () => 0 });
    assert.equal(started.success, true);
    assert.equal(started.encounterId, 'watchhouse_breach_heath_prepared');
});

test('a defeated or completed finale cannot replay the captain while an existing return journey remains valid', () => {
    const knight = player();
    const adventure = normalizeAdventureState(knight);
    knight.world.facts.pine_signal_chart = true;
    adventure.routeStats.route_pine_trail.successfulRoundTrips = 1;
    adventure.routeStats.route_burnt_heath.successfulRoundTrips = 1;
    prepareWatchhouse(knight);
    reconcileAdventureProgression(knight);

    const started = beginExpedition(knight, 'route_heath_watchhouse', { random: () => 0 });
    assert.equal(started.success, true);
    knight.adventure.activeJourney.phase = 'AT_DESTINATION';
    knight.adventure.activeJourney.direction = null;
    knight.adventure.activeJourney.reachedDestination = true;
    knight.adventure.activeJourney.currentEncounterId = null;
    knight.world.chapters.chapter_one.status = 'epilogue';
    knight.world.chapters.chapter_one.finale.status = 'defeated';

    normalizeAdventureState(knight, { recoverInterruptedJourney: false });
    assert.ok(knight.adventure.activeJourney, 'the already-started finale journey was discarded');
    const returning = beginReturnTrip(knight, { random: () => 0 });
    assert.equal(returning.success, true);
    assert.equal(returning.encounterId, 'watchhouse_pursuit');

    knight.adventure.activeJourney = null;
    const replay = beginExpedition(knight, 'route_heath_watchhouse', { random: () => 0 });
    assert.equal(replay.success, false);
    assert.equal(replay.code, 'FINALE_RESOLVED');
    const snapshot = getAdventureSnapshot(knight);
    const route = snapshot.routes.find(candidate => candidate.id === 'route_heath_watchhouse');
    assert.equal(route.unlocked, false);
    assert.equal(route.resolved, true);
    assert.equal(snapshot.adventure.unlockedRouteIds.includes('route_heath_watchhouse'), false);
});

test('earned shortcuts trade some road pay for materially smaller encounter groups', () => {
    const knight = player();
    const droversCut = RouteCatalog.route_old_pine_cut;
    const pineTrail = RouteCatalog.route_pine_trail;
    assert.ok(droversCut.danger < pineTrail.danger);
    assert.ok(droversCut.safeReturnGold < pineTrail.safeReturnGold);
    assert.deepEqual(
        resolveRouteEncounterPool(droversCut, knight, { partyPowerBandId: 'company' }),
        ['alley_robbery']
    );
    assert.equal(AuthoredEncounterCatalog.alley_robbery.enemies.length, 1);

    const traverse = RouteCatalog.route_heath_toll_cut;
    const tollRoad = RouteCatalog.route_toll_crossing;
    assert.ok(traverse.danger < tollRoad.danger);
    assert.ok(traverse.safeReturnGold < tollRoad.safeReturnGold);
    resolveRouteEncounterPool(traverse, knight, { partyPowerBandId: 'company' })
        .forEach(encounterId => {
            assert.ok(AuthoredEncounterCatalog[encounterId].enemies.length <= 2);
        });
    resolveRouteEncounterPool(tollRoad, knight, { partyPowerBandId: 'company' })
        .forEach(encounterId => {
            assert.ok(AuthoredEncounterCatalog[encounterId].enemies.length >= 3);
        });
});

test('party power uses equipped combat stats and active companions, not level, XP, or return grinding', () => {
    const knight = player();
    assert.equal(calculatePartyPower(knight), 6);
    assert.equal(getPartyPowerBand(calculatePartyPower(knight)).id, 'scouting');
    assert.deepEqual(resolveRouteEncounterPool('route_old_road', knight), ['alley_robbery']);
    assert.deepEqual(
        resolveRouteEncounterPool('route_burnt_heath', knight),
        ['hedge_fire', 'heath_smoke_screen']
    );

    Object.assign(knight, { level: 99, xp: 999999 });
    knight.adventure = { totalSafeReturns: 9999 };
    assert.equal(calculatePartyPower(knight), 6);

    const companion = {
        instanceId: 'elowen_companion',
        hired: true,
        active: true,
        stats: { vitality: 3, maxStamina: 1, offense: 2, defense: 2, speed: 2 },
        equipment: {}
    };
    knight.roster = { companions: [companion], activeIds: [companion.instanceId] };
    assert.equal(calculatePartyPower(knight), 16);
    assert.equal(getPartyPowerBand(calculatePartyPower(knight)).id, 'seasoned');
    assert.deepEqual(
        resolveRouteEncounterPool('route_toll_crossing', knight),
        ['road_toll', 'road_toll_crossfire']
    );

    knight.equipment.armor = { id: 'test_plate', defense: 10 };
    assert.equal(getPartyPowerBand(calculatePartyPower(knight)).id, 'company');
    assert.deepEqual(
        resolveRouteEncounterPool('route_burnt_heath', knight),
        ['heath_smoke_screen', 'heath_cinder_circle']
    );
});

test('the finale composition follows the explicit planning choice and never auto-selects a dominant combined plan', () => {
    const knight = player();
    const adventure = normalizeAdventureState(knight);
    adventure.routeStats.route_burnt_heath.successfulRoundTrips = 1;
    adventure.routeStats.route_toll_crossing.successfulRoundTrips = 1;

    const unprepared = resolveRouteEncounterSelection('route_heath_watchhouse', knight, {
        adventure,
        direction: 'OUTBOUND'
    });
    assert.deepEqual(unprepared.encounterIds, ['watchhouse_breach_unprepared']);
    assert.equal(unprepared.preparationId, 'unprepared');

    knight.world.chapters = {
        chapter_one: {
            finale: { selectedPreparationOptionId: 'warded_approach' }
        }
    };
    const warded = resolveRouteEncounterSelection('route_heath_watchhouse', knight, {
        adventure,
        direction: 'OUTBOUND'
    });
    assert.deepEqual(warded.encounterIds, ['watchhouse_breach_heath_prepared']);
    assert.equal(warded.preparationId, 'warded_approach');

    knight.world.chapters.chapter_one.finale.selectedPreparationOptionId = 'side_gate_breach';
    const sideGate = resolveRouteEncounterSelection('route_toll_watchhouse', knight, {
        adventure,
        direction: 'OUTBOUND'
    });
    assert.deepEqual(sideGate.encounterIds, ['watchhouse_breach_toll_prepared']);
    assert.equal(sideGate.preparationId, 'side_gate_breach');

    const returnSelection = resolveRouteEncounterSelection('route_toll_watchhouse', knight, {
        adventure,
        direction: 'RETURN'
    });
    assert.deepEqual(returnSelection.encounterIds, ['watchhouse_pursuit']);
    assert.equal(returnSelection.preparationId, null);
});
