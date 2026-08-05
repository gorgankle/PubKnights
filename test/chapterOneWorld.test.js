const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getChapterOneWorldSnapshot,
    resolveDestinationInteraction,
    advanceChapterOneSafeReturn,
    advanceChapterOneDiscovery,
    advanceChapterOneEncounterDefeat,
    acceptChapterOneContract,
    claimChapterOneContract,
    selectChapterOneFinalePreparation,
    claimChapterOneRewardChoice
} = require('../chapterOneWorld.js');

const ROUTES_BY_DESTINATION = {
    old_road: 'route_old_road',
    pine_trail: 'route_pine_trail',
    burnt_heath: 'route_burnt_heath',
    toll_crossing: 'route_toll_crossing',
    ruined_watchhouse: 'route_heath_watchhouse'
};

function makePlayer() {
    return {
        gold: 0,
        inventory: [],
        maxInventorySlots: 8,
        roster: { companions: [], activeIds: [] },
        adventure: { totalSafeReturns: 0, activeJourney: null }
    };
}

function placeAt(player, destinationLocationId, routeId = ROUTES_BY_DESTINATION[destinationLocationId]) {
    player.adventure.activeJourney = {
        journeyId: 'journey_test',
        routeId,
        destinationLocationId,
        phase: 'AT_DESTINATION',
        reachedDestination: true
    };
}

function returnToPub(player) {
    player.adventure.activeJourney = null;
}

function completeHeathBranch(player, start = 100) {
    placeAt(player, 'pine_trail');
    assert.equal(resolveDestinationInteraction(player, 'search_signal_cache', start).success, true);
    returnToPub(player);
    assert.equal(acceptChapterOneContract(player, 'ashes_on_the_heath', start + 1).success, true);
    advanceChapterOneDiscovery(player, { locationId: 'burnt_heath' }, start + 2);
    advanceChapterOneEncounterDefeat(player, {
        routeId: 'route_burnt_heath', encounterId: 'heath_cinder_circle'
    }, start + 3);
    placeAt(player, 'burnt_heath');
    assert.equal(resolveDestinationInteraction(player, 'trace_heath_signal', start + 4).success, true);
    returnToPub(player);
    advanceChapterOneSafeReturn(player, 'route_burnt_heath', start + 5);
    assert.equal(claimChapterOneContract(player, 'ashes_on_the_heath', start + 6).success, true);
}

function completeTollBranch(player, start = 200) {
    placeAt(player, 'old_road');
    assert.equal(resolveDestinationInteraction(player, 'inspect_wreck', start).success, true);
    returnToPub(player);
    assert.equal(acceptChapterOneContract(player, 'false_toll', start + 1).success, true);
    advanceChapterOneDiscovery(player, { locationId: 'toll_crossing' }, start + 2);
    advanceChapterOneEncounterDefeat(player, {
        routeId: 'route_toll_crossing', encounterId: 'road_toll_crossfire'
    }, start + 3);
    placeAt(player, 'toll_crossing');
    assert.equal(resolveDestinationInteraction(player, 'seize_toll_ledger', start + 4).success, true);
    returnToPub(player);
    advanceChapterOneSafeReturn(player, 'route_toll_crossing', start + 5);
    assert.equal(claimChapterOneContract(player, 'false_toll', start + 6).success, true);
}

test('fresh snapshot exposes five named NPCs but omits undiscovered content', () => {
    const snapshot = getChapterOneWorldSnapshot(makePlayer());

    assert.deepEqual(snapshot.facts, []);
    assert.deepEqual(snapshot.npcs.map(npc => npc.id), ['kreg', 'elowen', 'mara', 'tilda', 'marlow']);
    snapshot.npcs.forEach(npc => assert.ok(npc.returnReaction.length > 20));
    assert.deepEqual(snapshot.town.milestones, []);
    assert.deepEqual(snapshot.town.services, []);
    assert.deepEqual(snapshot.town.stock, []);
    assert.deepEqual(snapshot.destinationInteractions, []);
    assert.deepEqual(snapshot.contracts.map(contract => contract.id), ['missing_kegs']);
    assert.equal(snapshot.contracts[0].status, 'available');
    assert.deepEqual(snapshot.rewardChoices, []);
    assert.deepEqual(snapshot.chapter.preparations, []);
    assert.equal(snapshot.chapter.finale.status, 'locked');
    assert.deepEqual(snapshot.chapter.finale.preparationOptions, []);
    assert.equal(snapshot.chapter.epilogue.available, false);
    assert.equal(snapshot.chapter.nextRegion, null);
});

test('destination interactions require the matching reached destination and requirements', () => {
    const player = makePlayer();
    assert.equal(resolveDestinationInteraction(player, 'inspect_wreck', 10).code, 'WRONG_DESTINATION');

    placeAt(player, 'pine_trail');
    assert.deepEqual(
        getChapterOneWorldSnapshot(player).destinationInteractions.map(interaction => interaction.id),
        ['search_signal_cache']
    );
    assert.equal(resolveDestinationInteraction(player, 'inspect_wreck', 20).code, 'WRONG_DESTINATION');
    assert.equal(resolveDestinationInteraction(player, 'search_signal_cache', 30).success, true);
    const discovered = getChapterOneWorldSnapshot(player);
    assert.deepEqual(discovered.facts.map(fact => fact.id), ['pine_signal_chart']);
    assert.equal(
        discovered.contracts.find(contract => contract.id === 'ashes_on_the_heath').status,
        'available'
    );

    placeAt(player, 'ruined_watchhouse');
    assert.equal(
        getChapterOneWorldSnapshot(player).destinationInteractions
            .some(interaction => interaction.id === 'search_watchhouse_orders'),
        false,
        'command room stays hidden until the finale is defeated'
    );
});

test('discovery before acceptance backfills interaction evidence without faking a safe return', () => {
    const player = makePlayer();
    placeAt(player, 'old_road');
    assert.equal(resolveDestinationInteraction(player, 'inspect_wreck', 10).success, true);
    returnToPub(player);

    const accepted = acceptChapterOneContract(player, 'missing_kegs', 20);
    assert.equal(accepted.success, true);
    const active = player.world.contracts.active.missing_kegs;
    assert.equal(active.objectives.find_keg_wreck.complete, true);
    assert.equal(active.objectives.return_from_old_road.complete, false);
    const publicContract = getChapterOneWorldSnapshot(player).contracts
        .find(contract => contract.id === 'missing_kegs');
    assert.deepEqual(publicContract.objectives.map(objective => objective.type), ['interact', 'safe_return']);
});

test('first safe return opens Mara and exposes named, stat-free staged stock', () => {
    const player = makePlayer();
    const returned = advanceChapterOneSafeReturn(player, 'route_pine_trail', 20);

    assert.equal(returned.rewardChoiceOffered, true);
    assert.equal(player.world.npcs.mara.stageId, 'quartermaster');
    const snapshot = getChapterOneWorldSnapshot(player);
    assert.deepEqual(snapshot.town.services.map(service => service.id), ['quartermaster_stock']);
    assert.deepEqual(snapshot.town.stock.map(entry => entry.itemId), [
        'round_shield', 'hunters_spear', 'hunter_bow'
    ]);
    snapshot.town.stock.forEach(entry => {
        assert.ok(entry.name.length > 2);
        assert.ok(entry.description.length > 20);
        assert.ok(entry.combatIdentity.length > 0);
        assert.equal(Object.prototype.hasOwnProperty.call(entry, 'stats'), false);
    });
    assert.equal(snapshot.rewardChoices[0].options.length, 3);
});

test('middle branches unlock independently and converge on both town preparations', () => {
    const player = makePlayer();
    completeTollBranch(player, 100);

    let snapshot = getChapterOneWorldSnapshot(player);
    assert.equal(snapshot.chapter.preparations.find(item => item.id === 'marlows_breach').ready, true);
    assert.equal(snapshot.chapter.preparations.find(item => item.id === 'tildas_wards'), undefined);
    assert.ok(snapshot.town.services.some(service => service.id === 'marlow_road_watch'));
    assert.ok(snapshot.town.stock.some(entry => entry.itemId === 'parrying_dagger'));
    assert.equal(snapshot.contracts.some(contract => contract.id === 'watchhouse_reckoning'), false);

    completeHeathBranch(player, 200);
    snapshot = getChapterOneWorldSnapshot(player);
    assert.ok(snapshot.chapter.preparations.every(item => item.ready));
    assert.equal(snapshot.chapter.finale.status, 'ready');
    assert.deepEqual(snapshot.chapter.finale.routeIds, [
        'route_heath_watchhouse', 'route_toll_watchhouse'
    ]);
    assert.deepEqual(snapshot.chapter.finale.preparationOptions.map(option => option.id), [
        'warded_approach', 'side_gate_breach'
    ]);
    assert.ok(snapshot.town.stock.some(entry => entry.itemId === 'apprentice_staff'));
    assert.ok(snapshot.town.stock.some(entry => entry.itemId === 'tankard_maul'));
    assert.deepEqual(
        snapshot.town.services
            .filter(service => ['tilda_ward_table', 'marlow_road_watch'].includes(service.id))
            .map(service => [service.id, service.actionId]),
        [
            ['tilda_ward_table', 'review_watchhouse_preparations'],
            ['marlow_road_watch', 'review_watchhouse_preparations']
        ]
    );
});

test('Marlow recruitment projection is named and reflects an existing authored companion', () => {
    const player = makePlayer();
    completeTollBranch(player, 100);
    let service = getChapterOneWorldSnapshot(player).town.services
        .find(entry => entry.id === 'marlow_road_watch');
    assert.equal(service.recruitNpcId, 'marlow');
    assert.equal(service.claimed, false);

    player.roster.companions.push({ instanceId: 'story_marlow', templateId: 'marlow' });
    service = getChapterOneWorldSnapshot(player).town.services
        .find(entry => entry.id === 'marlow_road_watch');
    assert.equal(service.claimed, true);
});

test('finale snapshot exposes live routes and selectable plans without a parallel integration adapter', () => {
    const player = makePlayer();
    completeHeathBranch(player, 100);
    completeTollBranch(player, 200);

    let snapshot = getChapterOneWorldSnapshot(player);
    assert.deepEqual(snapshot.chapter.finale.routeIds,
        ['route_heath_watchhouse', 'route_toll_watchhouse']
    );
    assert.equal(snapshot.chapter.finale.preparationOptions.every(option => option.selectable === false), true);

    assert.equal(acceptChapterOneContract(player, 'watchhouse_reckoning', 300).success, true);
    const selected = selectChapterOneFinalePreparation(player, 'warded_approach', 310);
    assert.equal(selected.success, true);
    assert.equal(Object.hasOwn(selected, 'integrationEffects'), false);
    snapshot = getChapterOneWorldSnapshot(player);
    assert.equal(snapshot.chapter.finale.selectedPreparationOptionId, 'warded_approach');
    assert.equal(snapshot.chapter.finale.preparationOptions.every(option => option.selectable), true);
});

test('finale resolution exposes epilogue copy, next-region lead, and durable completion', () => {
    const player = makePlayer();
    completeHeathBranch(player, 100);
    completeTollBranch(player, 200);
    assert.equal(acceptChapterOneContract(player, 'watchhouse_reckoning', 300).success, true);
    assert.equal(selectChapterOneFinalePreparation(player, 'side_gate_breach', 310).success, true);

    const defeated = advanceChapterOneEncounterDefeat(player, {
        routeId: 'route_toll_watchhouse',
        encounterId: 'watchhouse_breach_toll_prepared'
    }, 320);
    assert.deepEqual(defeated.resolvedFinaleIds, ['chapter_one']);
    placeAt(player, 'ruined_watchhouse', 'route_toll_watchhouse');
    assert.equal(resolveDestinationInteraction(player, 'search_watchhouse_orders', 330).success, true);
    returnToPub(player);
    advanceChapterOneSafeReturn(player, 'route_toll_watchhouse', 340);
    assert.equal(claimChapterOneContract(player, 'watchhouse_reckoning', 350).success, true);

    const snapshot = getChapterOneWorldSnapshot(player);
    assert.equal(snapshot.chapter.status, 'completed');
    assert.equal(snapshot.chapter.completed, true);
    assert.equal(snapshot.chapter.completedAt, 350);
    assert.equal(snapshot.chapter.epilogue.status, 'completed');
    assert.equal(snapshot.chapter.epilogue.title, 'Open Roads, Distant Debts');
    assert.ok(snapshot.chapter.epilogue.description.includes('northern'));
    assert.deepEqual(snapshot.chapter.nextRegion, {
        leadId: 'north_road',
        factId: 'north_road_patron',
        name: 'The North Road',
        description: 'A future region tied to the unnamed patron who financed the false toll network.'
    });
});

test('contract pay and first-return gear remain authoritative and one-time', () => {
    const player = makePlayer();
    player.world = {
        facts: { forged_toll_seal: true },
        destinationInteractions: { inspect_wreck: { completionCount: 1 } }
    };
    assert.equal(acceptChapterOneContract(player, 'missing_kegs', 10).success, true);
    advanceChapterOneSafeReturn(player, 'route_old_road', 20);

    const paid = claimChapterOneContract(player, 'missing_kegs', 30);
    assert.equal(paid.success, true);
    assert.equal(paid.rewardGold, 75);
    assert.equal(player.gold, 75);

    const chosen = claimChapterOneRewardChoice(player, 'first_return_kit', 'shield_control', 40);
    assert.equal(chosen.success, true);
    assert.equal(player.inventory[0].id, 'round_shield');
    assert.equal(
        claimChapterOneRewardChoice(player, 'first_return_kit', 'bow_reposition', 50).success,
        false
    );
    assert.deepEqual(player.inventory.map(item => item.id), ['round_shield']);
});
