const test = require('node:test');
const assert = require('node:assert/strict');

const adventureState = require('../adventureState.js');
const adventureCatalog = require('../adventureCatalog.js');
const {
    acceptChapterOneContract,
    advanceChapterOneSafeReturn,
    claimChapterOneContract,
    resolveDestinationInteraction
} = require('../chapterOneWorld.js');

function player() {
    return {
        username: 'Contract Tester',
        gold: 0,
        pendingGold: 0,
        pendingXp: 0,
        pendingLoot: []
    };
}

function reachDestination(knight, routeId) {
    const outbound = adventureState.beginExpedition(knight, routeId, { random: () => 0 });
    assert.equal(outbound.success, true);
    const arrival = adventureState.resolveExpeditionCombatVictory(knight, outbound.expeditionContext);
    assert.equal(arrival.outcome, 'destination_reached');
    return arrival;
}

function returnSafely(knight) {
    const returning = adventureState.beginReturnTrip(knight, { random: () => 0 });
    assert.equal(returning.success, true);
    const result = adventureState.resolveExpeditionCombatVictory(knight, returning.expeditionContext);
    assert.equal(result.outcome, 'safe_return');
    const worldProgress = advanceChapterOneSafeReturn(knight, result.routeId);
    if (knight.adventure.latestReturnReport) {
        knight.adventure.latestReturnReport.worldContractUpdates = worldProgress.completedObjectiveIds;
        knight.adventure.latestReturnReport.rewardChoiceOffered = worldProgress.rewardChoiceOffered;
    }
    return { ...result, worldContractUpdates: worldProgress.completedObjectiveIds };
}

function clearEscrow(knight) {
    knight.pendingGold = 0;
    knight.pendingXp = 0;
    knight.pendingLoot = [];
}

test('legacy three-return bounty APIs and catalog are retired', () => {
    assert.equal(adventureState.acceptBounty, undefined);
    assert.equal(adventureState.claimBounty, undefined);
    assert.equal(adventureCatalog.BountyCatalog, undefined);

    const snapshot = adventureState.getAdventureSnapshot(player());
    assert.equal(Object.hasOwn(snapshot, 'bounties'), false);
    assert.equal(Object.hasOwn(snapshot.adventure, 'contracts'), false);
    assert.deepEqual(snapshot.world.contracts.map(contract => contract.id), ['missing_kegs']);
});

test('Missing Kegs advances through typed discovery and safe-return objectives', () => {
    const knight = player();
    assert.equal(acceptChapterOneContract(knight, 'missing_kegs').success, true);

    reachDestination(knight, 'route_old_road');
    const discovery = resolveDestinationInteraction(knight, 'inspect_wreck');
    assert.equal(discovery.success, true);
    assert.equal(
        knight.world.contracts.active.missing_kegs.objectives.find_keg_wreck.complete,
        true
    );
    assert.equal(knight.world.contracts.active.missing_kegs.status, 'active');

    const returned = returnSafely(knight);
    assert.equal(knight.world.contracts.active.missing_kegs.status, 'claimable');
    assert.deepEqual(returned.worldContractUpdates, ['missing_kegs:return_from_old_road']);
    assert.equal(knight.adventure.routeStats.route_old_road.successfulRoundTrips, 1);
});

test('failed travel preserves typed contract progress without completing a safe-return objective', () => {
    const knight = player();
    acceptChapterOneContract(knight, 'missing_kegs');
    reachDestination(knight, 'route_old_road');
    resolveDestinationInteraction(knight, 'inspect_wreck');
    const returning = adventureState.beginReturnTrip(knight, { random: () => 0 });
    assert.equal(returning.success, true);

    adventureState.failActiveExpedition(knight, 'fled_combat');

    const active = knight.world.contracts.active.missing_kegs;
    assert.equal(active.objectives.find_keg_wreck.complete, true);
    assert.equal(active.objectives.return_from_old_road.progress, 0);
    assert.equal(active.status, 'active');
});

test('contract claims use immutable rewards and cannot be duplicated', () => {
    const knight = player();
    acceptChapterOneContract(knight, 'missing_kegs');
    reachDestination(knight, 'route_old_road');
    resolveDestinationInteraction(knight, 'inspect_wreck');
    returnSafely(knight);

    const claimed = claimChapterOneContract(knight, 'missing_kegs');
    const duplicate = claimChapterOneContract(knight, 'missing_kegs');

    assert.equal(claimed.success, true);
    assert.equal(claimed.rewardGold, 75);
    assert.equal(knight.gold, 75);
    assert.equal(duplicate.success, false);
    assert.equal(knight.gold, 75);
});

test('Pine Road Conditions is discovered through an optional clue and repeats one typed report at a time', () => {
    const knight = player();
    reachDestination(knight, 'route_pine_trail');
    assert.equal(resolveDestinationInteraction(knight, 'search_signal_cache').success, true);
    returnSafely(knight);
    clearEscrow(knight);

    assert.equal(acceptChapterOneContract(knight, 'road_conditions_pine').success, true);
    reachDestination(knight, 'route_pine_trail');
    returnSafely(knight);
    assert.equal(knight.world.contracts.active.road_conditions_pine.status, 'claimable');

    assert.equal(claimChapterOneContract(knight, 'road_conditions_pine').success, true);
    assert.equal(knight.gold, 45);
    assert.equal(acceptChapterOneContract(knight, 'road_conditions_pine').success, true);
    assert.equal(knight.world.contracts.active.road_conditions_pine.status, 'active');
});
