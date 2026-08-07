const test = require('node:test');
const assert = require('node:assert/strict');

const {
    beginExpedition,
    beginReturnTrip,
    continueJourney,
    resolveJourneyInstance,
    getAdventureSnapshot,
    reconcileAdventureProgression
} = require('../adventureState.js');
const { createAuthoredCombatEncounter } = require('../combatEncounters.js');
const {
    finalizeCombatVictory,
    claimCombatRewards
} = require('../combatRewards.js');
const {
    getChapterOneWorldSnapshot,
    resolveDestinationInteraction,
    acceptChapterOneContract,
    claimChapterOneContract,
    selectChapterOneFinalePreparation,
    advanceChapterOneDiscovery,
    advanceChapterOneSafeReturn
} = require('../chapterOneWorld.js');

const SOCKET_ID = 'chapter-one-full-journey';

function makeFreshPlayer() {
    return {
        username: 'Chapter Journey Tester',
        level: 1,
        xp: 0,
        xpToNext: 100,
        skillPoints: 0,
        gold: 0,
        pendingGold: 0,
        pendingXp: 0,
        pendingLoot: [],
        hp: 25,
        stamina: 25,
        vitality: 1,
        maxStamina: 1,
        offense: 1,
        defense: 1,
        speed: 1,
        equipment: {},
        inventory: [],
        stash: [],
        roster: { companions: [], activeIds: [] },
        statusEffects: {},
        activeBuffs: []
    };
}

function makeSilentIo() {
    const emitted = [];
    return {
        emitted,
        to(socketId) {
            assert.equal(socketId, SOCKET_ID);
            return {
                emit(eventName, payload) {
                    emitted.push({ eventName, payload });
                }
            };
        }
    };
}

function winStartedLeg(player, started, io) {
    assert.equal(started.success, true, started.message || started.code);
    const combat = createAuthoredCombatEncounter(
        player,
        started.encounterId,
        started.expeditionContext
    );
    assert.ok(combat, `Encounter ${started.encounterId} did not create an authored combat`);

    const activePlayers = { [SOCKET_ID]: player };
    const activeCombats = { [SOCKET_ID]: combat };
    const victory = finalizeCombatVictory(SOCKET_ID, {
        activePlayers,
        activeCombats,
        io
    });

    assert.equal(victory.combatComplete, true);
    assert.equal(victory.adventureOutcome.success, true);
    assert.equal(activeCombats[SOCKET_ID], undefined);
    return victory;
}

function applyNoncombatWorldProgress(player, outcome) {
    if (outcome.outcome === 'destination_reached') {
        advanceChapterOneDiscovery(player, {
            locationId: outcome.journey.destinationLocationId,
            routeId: outcome.journey.routeId
        });
    }
    if (outcome.outcome === 'safe_return') {
        const progress = advanceChapterOneSafeReturn(player, outcome.routeId);
        if (player.adventure.latestReturnReport) {
            player.adventure.latestReturnReport.worldContractUpdates = progress.completedObjectiveIds || [];
            player.adventure.latestReturnReport.rewardChoiceOffered = progress.rewardChoiceOffered === true;
        }
    }
    return outcome;
}

function finishDirection(player, started, io, expectedEncounterId) {
    let victory = { adventureOutcome: started };
    let outcome = started;
    let pendingCombat = started.combatRequired ? started : null;
    let firstEncounterId = null;
    while (!['destination_reached', 'safe_return'].includes(outcome.outcome)) {
        const journey = player.adventure.activeJourney;
        assert.ok(journey, `Journey ended before arrival: ${JSON.stringify(outcome)}`);
        if (journey.currentInstance.kind === 'combat') {
            const continued = pendingCombat || continueJourney(player);
            if (!firstEncounterId) firstEncounterId = continued.encounterId;
            victory = winStartedLeg(player, continued, io);
            outcome = victory.adventureOutcome;
            pendingCombat = null;
        } else {
            outcome = applyNoncombatWorldProgress(
                player,
                resolveJourneyInstance(player, journey.currentInstance.options[0].id)
            );
        }
    }
    if (expectedEncounterId) assert.equal(firstEncounterId, expectedEncounterId);
    return { ...victory, adventureOutcome: outcome };
}

function reachDestination(player, routeId, io, expectedEncounterId) {
    const started = beginExpedition(player, routeId, { random: () => 0 });
    assert.equal(started.success, true, started.message || started.code);
    const victory = finishDirection(player, started, io, expectedEncounterId);
    assert.equal(victory.adventureOutcome.outcome, 'destination_reached');
    assert.equal(player.adventure.activeJourney.routeId, routeId);
    assert.equal(player.adventure.activeJourney.phase, 'AT_DESTINATION');
    return victory;
}

function returnSafely(player, io, expectedEncounterId) {
    const started = beginReturnTrip(player, { random: () => 0 });
    assert.equal(started.success, true, started.message || started.code);
    const victory = finishDirection(player, started, io, expectedEncounterId);
    assert.equal(victory.adventureOutcome.outcome, 'safe_return');
    assert.equal(player.adventure.activeJourney, null);
    assert.ok(player.pendingGold > 0, 'safe-return gold was not placed in expedition escrow');
    claimCombatRewards(player);
    assert.equal(player.pendingGold, 0);
    return victory;
}

function contract(player, contractId) {
    return player.world.contracts.active[contractId];
}

test('a fresh knight can complete Chapter One through both branches and the prepared watchhouse finale', () => {
    const player = makeFreshPlayer();
    const io = makeSilentIo();

    assert.equal(acceptChapterOneContract(player, 'missing_kegs', 10).success, true);
    reachDestination(player, 'route_old_road', io, 'alley_robbery');
    assert.equal(resolveDestinationInteraction(player, 'inspect_wreck', 20).success, true);
    assert.equal(contract(player, 'missing_kegs').objectives.find_keg_wreck.complete, true);
    returnSafely(player, io, 'alley_robbery');
    assert.equal(contract(player, 'missing_kegs').status, 'claimable');
    assert.equal(claimChapterOneContract(player, 'missing_kegs', 30).success, true);

    reachDestination(player, 'route_pine_trail', io, 'pine_lookout');
    assert.equal(resolveDestinationInteraction(player, 'search_signal_cache', 40).success, true);
    returnSafely(player, io, 'pine_lookout');

    reconcileAdventureProgression(player);
    let adventure = getAdventureSnapshot(player);
    assert.equal(adventure.routes.find(route => route.id === 'route_burnt_heath').unlocked, true);
    assert.equal(adventure.routes.find(route => route.id === 'route_toll_crossing').unlocked, true);
    assert.equal(adventure.routes.find(route => route.id === 'route_old_pine_cut').unlocked, true);

    assert.equal(acceptChapterOneContract(player, 'ashes_on_the_heath', 50).success, true);
    assert.equal(acceptChapterOneContract(player, 'false_toll', 51).success, true);
    assert.equal(contract(player, 'ashes_on_the_heath').objectives.discover_burnt_heath.complete, true);
    assert.equal(contract(player, 'false_toll').objectives.discover_toll_crossing.complete, true);

    reachDestination(player, 'route_burnt_heath', io, 'hedge_fire');
    assert.equal(contract(player, 'ashes_on_the_heath').objectives.defeat_heath_signalers.complete, true);
    assert.equal(resolveDestinationInteraction(player, 'trace_heath_signal', 60).success, true);
    returnSafely(player, io, 'hedge_fire');
    assert.equal(contract(player, 'ashes_on_the_heath').status, 'claimable');
    assert.equal(claimChapterOneContract(player, 'ashes_on_the_heath', 70).success, true);

    reachDestination(player, 'route_toll_crossing', io, 'road_toll');
    assert.equal(contract(player, 'false_toll').objectives.defeat_toll_gang.complete, true);
    assert.equal(resolveDestinationInteraction(player, 'seize_toll_ledger', 80).success, true);
    returnSafely(player, io, 'road_toll');
    assert.equal(contract(player, 'false_toll').status, 'claimable');
    assert.equal(claimChapterOneContract(player, 'false_toll', 90).success, true);

    let world = getChapterOneWorldSnapshot(player);
    assert.deepEqual(
        world.chapter.preparations.filter(preparation => preparation.ready).map(preparation => preparation.id),
        ['tildas_wards', 'marlows_breach']
    );
    assert.equal(world.chapter.finale.status, 'ready');
    assert.equal(world.contracts.find(entry => entry.id === 'watchhouse_reckoning').status, 'available');
    assert.equal(world.town.services.some(service => service.id === 'tilda_ward_table'), true);
    assert.equal(world.town.services.some(service => service.id === 'marlow_road_watch'), true);

    assert.equal(acceptChapterOneContract(player, 'watchhouse_reckoning', 100).success, true);
    assert.equal(contract(player, 'watchhouse_reckoning').objectives.secure_tildas_support.complete, true);
    assert.equal(contract(player, 'watchhouse_reckoning').objectives.secure_marlows_support.complete, true);

    const preparation = selectChapterOneFinalePreparation(player, 'warded_approach', 110);
    assert.equal(preparation.success, true, preparation.message || preparation.code);
    assert.equal(contract(player, 'watchhouse_reckoning').objectives.choose_watchhouse_plan.complete, true);

    reconcileAdventureProgression(player);
    adventure = getAdventureSnapshot(player);
    assert.equal(adventure.routes.find(route => route.id === 'route_heath_watchhouse').unlocked, true);
    assert.equal(adventure.routes.find(route => route.id === 'route_toll_watchhouse').unlocked, true);

    reachDestination(
        player,
        'route_heath_watchhouse',
        io,
        'watchhouse_breach_heath_prepared'
    );
    assert.equal(player.world.chapters.chapter_one.finale.status, 'defeated');
    assert.equal(contract(player, 'watchhouse_reckoning').objectives.defeat_watchhouse_breach.complete, true);
    assert.equal(resolveDestinationInteraction(player, 'search_watchhouse_orders', 120).success, true);
    assert.equal(player.world.facts.watchhouse_orders, true);
    assert.equal(player.world.facts.north_road_patron, true);

    returnSafely(player, io, 'watchhouse_pursuit');
    assert.equal(contract(player, 'watchhouse_reckoning').status, 'claimable');
    assert.equal(claimChapterOneContract(player, 'watchhouse_reckoning', 130).success, true);

    world = getChapterOneWorldSnapshot(player);
    assert.equal(world.chapter.status, 'completed');
    assert.equal(world.chapter.completed, true);
    assert.equal(world.chapter.finale.status, 'completed');
    assert.equal(world.chapter.epilogue.status, 'completed');
    assert.equal(world.chapter.nextRegion.leadId, 'north_road');
    assert.equal(
        world.town.milestones.find(milestone => milestone.id === 'road_network_restored').status,
        'completed'
    );
    assert.equal(world.npcs.find(npc => npc.id === 'tilda').stageId, 'settled');
    assert.equal(world.npcs.find(npc => npc.id === 'marlow').stageId, 'staying');
    assert.equal(player.gold, 910);
    assert.equal(player.pendingGold, 0);
    assert.equal(player.pendingXp, 0);
    assert.deepEqual(player.pendingLoot, []);

    assert.equal(
        io.emitted.filter(entry => entry.eventName === 'adventureProgress').length,
        14,
        'distance-scaled round trips should publish progress for every combat leg'
    );
});
