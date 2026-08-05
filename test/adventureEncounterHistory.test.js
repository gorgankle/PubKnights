const test = require('node:test');
const assert = require('node:assert/strict');
const { RouteCatalog } = require('../adventureCatalog.js');

const {
    beginExpedition,
    beginReturnTrip,
    createInitialAdventureState,
    getAdventureSnapshot,
    normalizeAdventureState,
    resolveExpeditionCombatVictory
} = require('../adventureState.js');

function player(overrides = {}) {
    return {
        username: 'Encounter History Tester',
        gold: 0,
        pendingGold: 0,
        ...overrides
    };
}

function reachDestination(knight, outbound) {
    assert.equal(outbound.success, true);
    const arrival = resolveExpeditionCombatVictory(knight, outbound.expeditionContext);
    assert.equal(arrival.success, true);
    assert.equal(arrival.outcome, 'destination_reached');
}

test('a return leg avoids the outbound encounter when the route has another eligible encounter', () => {
    const knight = player();
    const outbound = beginExpedition(knight, 'route_old_road', {
        random: () => 0,
        partyPower: 12
    });

    assert.equal(outbound.encounterId, 'alley_robbery');
    reachDestination(knight, outbound);

    const returning = beginReturnTrip(knight, { random: () => 0 });

    assert.equal(returning.success, true);
    assert.equal(returning.encounterId, 'alley_gang');
    assert.deepEqual(
        knight.adventure.routeEncounterHistory.route_old_road,
        ['alley_robbery', 'alley_gang']
    );
});

test('a restored middle-route journey avoids its most recently recorded encounter', () => {
    const knight = player({ adventure: createInitialAdventureState() });
    knight.adventure.discoveredLocationIds.push('burnt_heath');
    knight.adventure.unlockedLocationIds.push('burnt_heath');
    knight.adventure.discoveredRouteIds.push('route_burnt_heath');
    knight.adventure.unlockedRouteIds.push('route_burnt_heath');
    knight.adventure.routeEncounterHistory.route_burnt_heath.push('hedge_fire');
    knight.adventure.activeJourney = {
        journeyId: 'journey_restored_burnt_heath',
        routeId: 'route_burnt_heath',
        originLocationId: 'pub_hub',
        destinationLocationId: 'burnt_heath',
        phase: 'AT_DESTINATION',
        direction: null,
        reachedDestination: true,
        currentEncounterId: null,
        startedAt: Date.now()
    };

    const returning = beginReturnTrip(knight, { random: () => 0 });

    assert.equal(returning.success, true);
    assert.equal(returning.encounterId, 'heath_smoke_screen');
    assert.deepEqual(
        knight.adventure.routeEncounterHistory.route_burnt_heath,
        ['hedge_fire', 'heath_smoke_screen']
    );
});

test('recorded encounter history stays bounded across repeated round trips', () => {
    const knight = player();

    for (let trip = 0; trip < 3; trip++) {
        const outbound = beginExpedition(knight, 'route_old_road', { random: () => 0 });
        reachDestination(knight, outbound);
        const returning = beginReturnTrip(knight, { random: () => 0 });
        assert.equal(returning.success, true);
        assert.equal(
            resolveExpeditionCombatVictory(knight, returning.expeditionContext).outcome,
            'safe_return'
        );
        // This unit test advances multiple trips without the loot-claim router.
        // Model that intervening claim before starting the next expedition.
        knight.pendingGold = 0;
        knight.pendingXp = 0;
        knight.pendingLoot = [];
    }

    assert.deepEqual(
        knight.adventure.routeEncounterHistory.route_old_road,
        ['alley_robbery', 'alley_robbery', 'alley_robbery']
    );
});

test('route encounter history normalization rejects foreign entries and keeps only a bounded valid tail', () => {
    const knight = player({
        adventure: {
            routeEncounterHistory: {
                route_old_road: [
                    'road_toll',
                    'alley_robbery',
                    null,
                    'alley_gang',
                    'alley_robbery',
                    'alley_gang'
                ],
                route_pine_trail: 'poachers_trail',
                route_burnt_heath: { malformed: true },
                not_a_route: ['alley_robbery']
            }
        }
    });

    const adventure = normalizeAdventureState(knight);

    assert.deepEqual(Object.keys(adventure.routeEncounterHistory), Object.keys(RouteCatalog));
    assert.deepEqual(
        adventure.routeEncounterHistory.route_old_road,
        ['alley_gang', 'alley_robbery', 'alley_gang']
    );
    assert.deepEqual(adventure.routeEncounterHistory.route_pine_trail, ['poachers_trail']);
    Object.keys(RouteCatalog)
        .filter(routeId => !['route_old_road', 'route_pine_trail'].includes(routeId))
        .forEach(routeId => assert.deepEqual(adventure.routeEncounterHistory[routeId], []));
    assert.equal(Object.hasOwn(adventure.routeEncounterHistory, 'not_a_route'), false);
});

test('initial route encounter histories do not share mutable arrays', () => {
    const first = createInitialAdventureState();
    const second = createInitialAdventureState();

    first.routeEncounterHistory.route_old_road.push('alley_robbery');

    assert.deepEqual(second.routeEncounterHistory.route_old_road, []);
    assert.deepEqual(first.routeEncounterHistory.route_pine_trail, []);
});

test('public snapshots retain route stats but omit internal encounter-selection history', () => {
    const knight = player();
    beginExpedition(knight, 'route_old_road', { random: () => 0 });

    const snapshot = getAdventureSnapshot(knight);
    const oldRoad = snapshot.routes.find(route => route.id === 'route_old_road');

    assert.equal(Object.hasOwn(snapshot.adventure, 'routeEncounterHistory'), false);
    assert.deepEqual(oldRoad.stats, {
        successfulRoundTrips: 0,
        failedTrips: 0
    });
    oldRoad.stats.successfulRoundTrips = 99;
    assert.equal(knight.adventure.routeStats.route_old_road.successfulRoundTrips, 0);
    assert.deepEqual(
        knight.adventure.routeEncounterHistory.route_old_road,
        ['alley_robbery']
    );
});
