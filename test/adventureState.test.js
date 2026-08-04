const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createInitialAdventureState,
    normalizeAdventureState,
    getAdventureSnapshot,
    beginExpedition,
    beginReturnTrip,
    resolveExpeditionCombatVictory,
    failActiveExpedition,
    hasActiveJourney
} = require('../adventureState.js');

function player(overrides = {}) {
    return {
        username: 'Road Tester',
        gold: 0,
        pendingGold: 0,
        ...overrides
    };
}

function completeLeg(knight, result) {
    assert.equal(result.success, true);
    return resolveExpeditionCombatVictory(knight, result.expeditionContext);
}

test('old and malformed saves normalize into the two-branch starting map', () => {
    const knight = player({
        adventure: {
            schemaVersion: -5,
            discoveredLocationIds: ['old_road', 'not_real', 'old_road'],
            unlockedLocationIds: ['not_real'],
            totalSafeReturns: -40,
            routeStats: { route_old_road: { successfulRoundTrips: '2.9', failedTrips: -3 } },
            latestReturnReport: { reportId: 'spoofed', outcome: 'safe_return', routeId: 'not_real' },
            contracts: { active: { not_real: { progress: 99 } } }
        }
    });

    const adventure = normalizeAdventureState(knight);

    assert.equal(adventure.schemaVersion, 1);
    assert.deepEqual(adventure.discoveredLocationIds.sort(), ['old_road', 'pine_trail', 'pub_hub']);
    assert.deepEqual(adventure.unlockedLocationIds.sort(), ['old_road', 'pine_trail', 'pub_hub']);
    assert.equal(adventure.totalSafeReturns, 0);
    assert.equal(adventure.routeStats.route_old_road.successfulRoundTrips, 2);
    assert.equal(adventure.routeStats.route_old_road.failedTrips, 0);
    assert.equal(adventure.latestReturnReport, null);
    assert.deepEqual(adventure.contracts.active, {});
});

test('initial state creation is independent and does not share mutable route records', () => {
    const first = createInitialAdventureState();
    const second = createInitialAdventureState();
    first.routeStats.route_old_road.successfulRoundTrips = 9;

    assert.equal(second.routeStats.route_old_road.successfulRoundTrips, 0);
});

test('the server chooses an authored encounter for an unlocked route and rejects locked travel', () => {
    const knight = player();
    const first = beginExpedition(knight, 'route_old_road', { random: () => 0 });

    assert.equal(first.success, true);
    assert.equal(first.encounterId, 'alley_robbery');
    assert.equal(first.expeditionContext.direction, 'OUTBOUND');
    assert.equal(first.expeditionContext.routeId, 'route_old_road');
    assert.match(first.expeditionContext.journeyId, /^journey_[a-f0-9]{16}$/);
    assert.equal(hasActiveJourney(knight), true);

    failActiveExpedition(knight, 'test_cleanup');
    const locked = beginExpedition(knight, 'route_burnt_heath', { random: () => 0 });
    assert.equal(locked.success, false);
    assert.equal(locked.code, 'LOCKED_ROUTE');
});

test('outbound victory reaches the destination without awarding a round-trip reward', () => {
    const knight = player();
    const outbound = beginExpedition(knight, 'route_old_road', { random: () => 0 });
    const arrival = completeLeg(knight, outbound);

    assert.equal(arrival.outcome, 'destination_reached');
    assert.equal(knight.adventure.activeJourney.phase, 'AT_DESTINATION');
    assert.equal(knight.adventure.activeJourney.reachedDestination, true);
    assert.equal(knight.adventure.totalSafeReturns, 0);
    assert.equal(knight.pendingGold, 0);
});

test('a matching return victory pays once, counts once, and reveals first-return roads', () => {
    const knight = player();
    completeLeg(knight, beginExpedition(knight, 'route_old_road', { random: () => 0 }));
    const returning = beginReturnTrip(knight, { random: () => 0.99 });
    const completed = completeLeg(knight, returning);

    assert.equal(completed.outcome, 'safe_return');
    assert.equal(completed.firstReturn, true);
    assert.equal(completed.rewardGold, 35);
    assert.equal(knight.pendingGold, 35);
    assert.equal(knight.adventure.totalSafeReturns, 1);
    assert.equal(knight.adventure.routeStats.route_old_road.successfulRoundTrips, 1);
    assert.equal(knight.adventure.unlockedLocationIds.includes('toll_crossing'), true);
    assert.equal(knight.adventure.activeJourney, null);
    assert.match(knight.adventure.latestReturnReport.reportId, /^return_[a-f0-9]{16}$/);
    assert.equal(knight.adventure.latestReturnReport.outcome, 'safe_return');
    assert.equal(knight.adventure.latestReturnReport.routeName, 'The Old Road');
    assert.equal(knight.adventure.latestReturnReport.encounterName, 'Roadside Gang');
    assert.deepEqual(knight.adventure.latestReturnReport.enemyNames, ['Roadside Bandit', 'Bandit Lookout']);
    assert.equal(knight.adventure.latestReturnReport.rewardGold, 35);
    assert.equal(knight.adventure.latestReturnReport.firstReturn, true);

    const duplicate = resolveExpeditionCombatVictory(knight, returning.expeditionContext);
    assert.equal(duplicate.success, false);
    assert.equal(knight.pendingGold, 35);
    assert.equal(knight.adventure.totalSafeReturns, 1);
});

test('stale victory context cannot advance or redirect an active journey', () => {
    const knight = player();
    const outbound = beginExpedition(knight, 'route_pine_trail', { random: () => 0 });
    const spoofed = resolveExpeditionCombatVictory(knight, {
        ...outbound.expeditionContext,
        routeId: 'route_old_road'
    });

    assert.equal(spoofed.success, false);
    assert.equal(knight.adventure.activeJourney.phase, 'OUTBOUND_COMBAT');
    assert.equal(knight.pendingGold, 0);
});

test('failure clears only the current journey and is idempotent', () => {
    const knight = player();
    beginExpedition(knight, 'route_pine_trail', { random: () => 0 });
    const failed = failActiveExpedition(knight, 'fled_combat');
    const duplicate = failActiveExpedition(knight, 'fled_combat');

    assert.equal(failed.success, true);
    assert.equal(duplicate.success, false);
    assert.equal(knight.adventure.routeStats.route_pine_trail.failedTrips, 1);
    assert.equal(knight.adventure.totalSafeReturns, 0);
    assert.equal(knight.adventure.latestReturnReport.outcome, 'expedition_failed');
    assert.equal(knight.adventure.latestReturnReport.failureReason, 'fled_combat');
    assert.equal(knight.adventure.latestReturnReport.rewardGold, 0);
});

test('explicit login recovery converts an interrupted saved journey into a failed trip', () => {
    const knight = player();
    beginExpedition(knight, 'route_old_road', { random: () => 0 });
    const preserved = normalizeAdventureState(knight, { recoverInterruptedJourney: false });
    assert.ok(preserved.activeJourney);

    const recovered = normalizeAdventureState(knight, { recoverInterruptedJourney: true });
    assert.equal(recovered.activeJourney, null);
    assert.equal(recovered.routeStats.route_old_road.failedTrips, 1);
    assert.equal(recovered.routeStats.route_old_road.lastFailureReason, 'interrupted');
});

test('public snapshots expose road reports without mutable enemy or reward authority', () => {
    const knight = player();
    const snapshot = getAdventureSnapshot(knight);
    const oldRoad = snapshot.routes.find(route => route.id === 'route_old_road');

    assert.deepEqual(oldRoad.possibleEncounterNames, ['Alley Robbery', 'Roadside Gang']);
    assert.deepEqual(oldRoad.encounterReports[0], {
        name: 'Alley Robbery',
        difficulty: 1,
        tags: ['melee', 'close-quarters'],
        enemyNames: ['Roadside Bandit']
    });
    assert.deepEqual(oldRoad.encounterReports[1].enemyNames, ['Roadside Bandit', 'Bandit Lookout']);
    assert.equal(oldRoad.encounterIds, undefined);
    assert.equal(JSON.stringify(oldRoad.encounterReports).includes('aiProfileId'), false);
    assert.equal(JSON.stringify(oldRoad.encounterReports).includes('statMult'), false);
    assert.equal(JSON.stringify(oldRoad.encounterReports).includes('spawnId'), false);
    assert.equal(snapshot.locations.find(location => location.id === 'burnt_heath').unlocked, false);
    snapshot.adventure.unlockedLocationIds.push('burnt_heath');
    assert.equal(knight.adventure.unlockedLocationIds.includes('burnt_heath'), false);
});
