const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ADVENTURE_SCHEMA_VERSION,
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

    assert.equal(adventure.schemaVersion, ADVENTURE_SCHEMA_VERSION);
    assert.deepEqual(adventure.discoveredLocationIds.sort(), ['old_road', 'pine_trail', 'pub_hub']);
    assert.deepEqual(adventure.unlockedLocationIds.sort(), ['old_road', 'pine_trail', 'pub_hub']);
    assert.deepEqual(adventure.discoveredRouteIds.sort(), ['route_old_road', 'route_pine_trail']);
    assert.deepEqual(adventure.unlockedRouteIds.sort(), ['route_old_road', 'route_pine_trail']);
    assert.equal(adventure.totalSafeReturns, 0);
    assert.equal(adventure.routeStats.route_old_road.successfulRoundTrips, 2);
    assert.equal(adventure.routeStats.route_old_road.failedTrips, 0);
    assert.equal(adventure.latestReturnReport, null);
    assert.equal(adventure.contracts, undefined);
    assert.deepEqual(adventure.observedEncounterIdsByRoute.route_old_road, []);
});

test('initial state creation is independent and does not share mutable route records', () => {
    const first = createInitialAdventureState();
    const second = createInitialAdventureState();
    first.routeStats.route_old_road.successfulRoundTrips = 9;

    assert.equal(second.routeStats.route_old_road.successfulRoundTrips, 0);
});

test('the server chooses an authored encounter for an unlocked route and rejects a hidden branch', () => {
    const knight = player();
    const first = beginExpedition(knight, 'route_old_road', { random: () => 0 });

    assert.equal(first.success, true);
    assert.equal(first.encounterId, 'alley_robbery');
    assert.equal(first.expeditionContext.direction, 'OUTBOUND');
    assert.equal(first.expeditionContext.routeId, 'route_old_road');
    assert.match(first.expeditionContext.journeyId, /^journey_[a-f0-9]{16}$/);
    assert.equal(hasActiveJourney(knight), true);

    failActiveExpedition(knight, 'test_cleanup');
    const alternate = beginExpedition(knight, 'route_pine_trail', { random: () => 0 });
    assert.equal(alternate.success, true);
    assert.equal(alternate.encounterId, 'pine_lookout');
    assert.equal(alternate.expeditionContext.routeId, 'route_pine_trail');

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

test('a matching return victory pays once and counts once without leaking undiscovered roads', () => {
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
    assert.equal(knight.adventure.unlockedLocationIds.includes('toll_crossing'), false);
    assert.equal(knight.adventure.activeJourney, null);
    assert.match(knight.adventure.latestReturnReport.reportId, /^return_[a-f0-9]{16}$/);
    assert.equal(knight.adventure.latestReturnReport.outcome, 'safe_return');
    assert.equal(knight.adventure.latestReturnReport.routeName, 'The Old Road');
    assert.equal(knight.adventure.latestReturnReport.encounterName, 'Alley Robbery');
    assert.deepEqual(knight.adventure.latestReturnReport.enemyNames, ['Roadside Bandit']);
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

test('failure clears the current journey and its escrow without touching durable progress', () => {
    const knight = player();
    beginExpedition(knight, 'route_pine_trail', { random: () => 0 });
    Object.assign(knight, {
        pendingGold: 40,
        pendingXp: 15,
        pendingLoot: [{ id: 'unsecured_drop' }],
        pendingMercenaryXpContext: { eligibleInstanceIds: ['merc_1'] }
    });
    const failed = failActiveExpedition(knight, 'fled_combat');
    const duplicate = failActiveExpedition(knight, 'fled_combat');

    assert.equal(failed.success, true);
    assert.equal(duplicate.success, false);
    assert.equal(knight.adventure.routeStats.route_pine_trail.failedTrips, 1);
    assert.equal(knight.adventure.totalSafeReturns, 0);
    assert.equal(knight.adventure.latestReturnReport.outcome, 'expedition_failed');
    assert.equal(knight.adventure.latestReturnReport.failureReason, 'fled_combat');
    assert.equal(knight.adventure.latestReturnReport.rewardGold, 0);
    assert.equal(knight.pendingGold, 0);
    assert.equal(knight.pendingXp, 0);
    assert.deepEqual(knight.pendingLoot, []);
    assert.equal(knight.pendingMercenaryXpContext, undefined);
});

test('explicit login recovery converts an interrupted saved journey into a failed trip', () => {
    const knight = player();
    beginExpedition(knight, 'route_old_road', { random: () => 0 });
    Object.assign(knight, {
        pendingGold: 25,
        pendingXp: 9,
        pendingLoot: [{ id: 'road_drop' }]
    });
    const preserved = normalizeAdventureState(knight, { recoverInterruptedJourney: false });
    assert.ok(preserved.activeJourney);

    const recovered = normalizeAdventureState(knight, { recoverInterruptedJourney: true });
    assert.equal(recovered.activeJourney, null);
    assert.equal(recovered.routeStats.route_old_road.failedTrips, 1);
    assert.equal(recovered.routeStats.route_old_road.lastFailureReason, 'interrupted');
    assert.equal(knight.pendingGold, 0);
    assert.equal(knight.pendingXp, 0);
    assert.deepEqual(knight.pendingLoot, []);
});

test('public snapshots omit hidden nodes and unobserved enemy details, then reveal only observed intel', () => {
    const knight = player();
    const freshSnapshot = getAdventureSnapshot(knight);
    const freshOldRoad = freshSnapshot.routes.find(route => route.id === 'route_old_road');

    assert.deepEqual(
        freshSnapshot.locations.map(location => location.id),
        ['pub_hub', 'old_road', 'pine_trail']
    );
    assert.deepEqual(
        freshSnapshot.routes.map(route => route.id),
        ['route_old_road', 'route_pine_trail']
    );
    assert.equal(freshSnapshot.locations.some(location => location.id === 'burnt_heath'), false);
    assert.equal(freshSnapshot.routes.some(route => route.id === 'route_burnt_heath'), false);
    assert.equal(freshSnapshot.routes.every(route => route.unlocked === true), true);
    assert.equal(freshOldRoad.newcomerLabel, 'Gentler first outing');
    assert.match(freshOldRoad.newcomerHint, /shortest road from the pub/i);
    assert.equal(freshOldRoad.possibleEncounterNames, undefined);
    assert.deepEqual(freshOldRoad.encounterReports, []);
    assert.equal(freshOldRoad.unconfirmedEncounterCount, 2);
    assert.equal(freshSnapshot.adventure.routeEncounterHistory, undefined);
    assert.equal(freshSnapshot.adventure.observedEncounterIdsByRoute, undefined);

    beginExpedition(knight, 'route_old_road', { random: () => 0 });
    const observedSnapshot = getAdventureSnapshot(knight);
    const observedOldRoad = observedSnapshot.routes.find(route => route.id === 'route_old_road');
    assert.deepEqual(observedOldRoad.encounterReports, [{
        name: 'Alley Robbery',
        difficulty: 1,
        tags: ['melee', 'close-quarters'],
        enemyNames: ['Roadside Bandit']
    }]);
    assert.equal(observedOldRoad.unconfirmedEncounterCount, 1);
    assert.equal(JSON.stringify(observedOldRoad.encounterReports).includes('Roadside Gang'), false);
    assert.equal(JSON.stringify(observedOldRoad.encounterReports).includes('Bandit Lookout'), false);
    assert.equal(observedOldRoad.encounterIds, undefined);
    assert.equal(JSON.stringify(observedOldRoad.encounterReports).includes('aiProfileId'), false);
    assert.equal(JSON.stringify(observedOldRoad.encounterReports).includes('statMult'), false);
    assert.equal(JSON.stringify(observedOldRoad.encounterReports).includes('spawnId'), false);

    observedSnapshot.adventure.unlockedLocationIds.push('burnt_heath');
    assert.equal(knight.adventure.unlockedLocationIds.includes('burnt_heath'), false);
});

test('return-report world metadata survives snapshots with catalog validation and bounded deduplication', () => {
    const knight = player();
    completeLeg(knight, beginExpedition(knight, 'route_old_road', { random: () => 0 }));
    const returning = beginReturnTrip(knight, { random: () => 0 });
    completeLeg(knight, returning);
    knight.adventure.latestReturnReport.worldContractUpdates = [
        'missing_kegs:return_from_old_road',
        'missing_kegs:return_from_old_road',
        ' missing_kegs:return_from_old_road ',
        'missing_kegs:not_an_objective',
        'not_a_contract:return_from_old_road',
        'missing_kegs:return_from_old_road:extra',
        { contractId: 'missing_kegs' }
    ];
    knight.adventure.latestReturnReport.rewardChoiceOffered = true;

    const snapshot = getAdventureSnapshot(knight);
    const report = snapshot.adventure.latestReturnReport;

    assert.deepEqual(report.worldContractUpdates, ['missing_kegs:return_from_old_road']);
    assert.equal(report.contractUpdates, undefined);
    assert.equal(report.rewardChoiceOffered, true);
    assert.deepEqual(
        knight.adventure.latestReturnReport.worldContractUpdates,
        ['missing_kegs:return_from_old_road']
    );
    report.worldContractUpdates.push('road_conditions_pine:return_from_pine');
    assert.deepEqual(
        knight.adventure.latestReturnReport.worldContractUpdates,
        ['missing_kegs:return_from_old_road']
    );
});
