const test = require('node:test');
const assert = require('node:assert/strict');

const {
    acceptBounty,
    claimBounty,
    beginExpedition,
    beginReturnTrip,
    resolveExpeditionCombatVictory,
    failActiveExpedition,
    getAdventureSnapshot
} = require('../adventureState.js');

function player() {
    return { username: 'Contract Tester', gold: 0, pendingGold: 0 };
}

function completeRoundTrip(knight, routeId) {
    const outbound = beginExpedition(knight, routeId, { random: () => 0 });
    assert.equal(outbound.success, true);
    assert.equal(resolveExpeditionCombatVictory(knight, outbound.expeditionContext).outcome, 'destination_reached');
    const returning = beginReturnTrip(knight, { random: () => 0 });
    assert.equal(returning.success, true);
    return resolveExpeditionCombatVictory(knight, returning.expeditionContext);
}

test('accepting the hedge investigation reveals its route without adding a cargo item', () => {
    const knight = player();
    const accepted = acceptBounty(knight, 'hedge_fire_investigation');

    assert.equal(accepted.success, true);
    assert.equal(knight.adventure.unlockedLocationIds.includes('burnt_heath'), true);
    assert.equal(knight.adventure.discoveredLocationIds.includes('burnt_heath'), true);
    assert.equal(knight.inventory, undefined);
});

test('three matching safe returns make the Old Road delivery claimable', () => {
    const knight = player();
    acceptBounty(knight, 'old_road_goods');

    completeRoundTrip(knight, 'route_old_road');
    completeRoundTrip(knight, 'route_old_road');
    const third = completeRoundTrip(knight, 'route_old_road');

    const record = knight.adventure.contracts.active.old_road_goods;
    assert.equal(record.progress, 3);
    assert.equal(record.status, 'claimable');
    assert.equal(third.advancedBounties[0].bountyId, 'old_road_goods');
    assert.deepEqual(knight.adventure.latestReturnReport.contractUpdates, [{
        bountyId: 'old_road_goods',
        title: 'Goods for the Old Road',
        progress: 3,
        target: 3,
        status: 'claimable'
    }]);
});

test('a different route cannot advance a delivery contract', () => {
    const knight = player();
    acceptBounty(knight, 'old_road_goods');
    completeRoundTrip(knight, 'route_pine_trail');

    assert.equal(knight.adventure.contracts.active.old_road_goods.progress, 0);
});

test('fleeing preserves previous progress but does not count the failed trip', () => {
    const knight = player();
    acceptBounty(knight, 'old_road_goods');
    completeRoundTrip(knight, 'route_old_road');
    beginExpedition(knight, 'route_old_road', { random: () => 0 });
    failActiveExpedition(knight, 'fled_combat');

    assert.equal(knight.adventure.contracts.active.old_road_goods.progress, 1);
    assert.equal(knight.adventure.routeStats.route_old_road.failedTrips, 1);
});

test('claiming uses the immutable catalog payout exactly once', () => {
    const knight = player();
    acceptBounty(knight, 'pine_trail_patrol');
    completeRoundTrip(knight, 'route_pine_trail');

    const claimed = claimBounty(knight, 'pine_trail_patrol', { rewardGold: 999999 });
    const duplicate = claimBounty(knight, 'pine_trail_patrol');

    assert.equal(claimed.success, true);
    assert.equal(claimed.rewardGold, 70);
    assert.equal(knight.gold, 70);
    assert.equal(duplicate.success, false);
    assert.equal(knight.gold, 70);
});

test('repeatable and one-time bounties expose the correct post-claim board state', () => {
    const knight = player();
    acceptBounty(knight, 'pine_trail_patrol');
    completeRoundTrip(knight, 'route_pine_trail');
    claimBounty(knight, 'pine_trail_patrol');
    assert.equal(acceptBounty(knight, 'pine_trail_patrol').success, true);

    acceptBounty(knight, 'hedge_fire_investigation');
    completeRoundTrip(knight, 'route_burnt_heath');
    claimBounty(knight, 'hedge_fire_investigation');
    assert.equal(acceptBounty(knight, 'hedge_fire_investigation').success, false);

    const snapshot = getAdventureSnapshot(knight);
    assert.equal(snapshot.bounties.find(entry => entry.id === 'hedge_fire_investigation').status, 'completed');
});
