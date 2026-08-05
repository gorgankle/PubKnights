const test = require('node:test');
const assert = require('node:assert/strict');

const { createInitialWorldState, getAvailableTownServiceIds } = require('../worldState.js');
const {
    WORLD_EFFECT_TYPES,
    WORLD_EVENT_TYPES,
    WORLD_OBJECTIVE_TYPES,
    eventMatchesObjective,
    applyWorldEffects,
    evaluateWorldEvent,
    acceptWorldContract,
    claimWorldContract,
    selectWorldFinalePreparation,
    performDestinationInteraction
} = require('../worldEvents.js');

function event(world, type, payload, now) {
    return evaluateWorldEvent(world, { type, ...payload }, { now }).state;
}

function completeHeathBranch(source, start = 100, encounterId = 'heath_smoke_screen') {
    let world = performDestinationInteraction(source, 'search_signal_cache', { now: start }).state;
    world = acceptWorldContract(world, 'ashes_on_the_heath', { now: start + 1 }).state;
    world = event(world, WORLD_EVENT_TYPES.ENCOUNTER_DEFEATED, {
        routeId: 'route_burnt_heath', encounterId
    }, start + 2);
    world = performDestinationInteraction(world, 'trace_heath_signal', { now: start + 3 }).state;
    world = event(world, WORLD_EVENT_TYPES.SAFE_RETURN, {
        routeId: 'route_burnt_heath'
    }, start + 4);
    return claimWorldContract(world, 'ashes_on_the_heath', { now: start + 5 }).state;
}

function completeTollBranch(source, start = 200, encounterId = 'road_toll_crossfire') {
    let world = performDestinationInteraction(source, 'inspect_wreck', { now: start }).state;
    world = acceptWorldContract(world, 'false_toll', { now: start + 1 }).state;
    world = event(world, WORLD_EVENT_TYPES.ENCOUNTER_DEFEATED, {
        routeId: 'route_toll_crossing', encounterId
    }, start + 2);
    world = performDestinationInteraction(world, 'seize_toll_ledger', { now: start + 3 }).state;
    world = event(world, WORLD_EVENT_TYPES.SAFE_RETURN, {
        routeId: 'route_toll_crossing'
    }, start + 4);
    return claimWorldContract(world, 'false_toll', { now: start + 5 }).state;
}

test('generic objective matching reads top-level or payload fields declaratively', () => {
    const objective = {
        eventType: 'SAFE_RETURN',
        match: { routeId: ['route_old_road', 'route_pine_trail'], safe: true }
    };
    assert.equal(eventMatchesObjective({
        type: 'SAFE_RETURN', payload: { routeId: 'route_old_road', safe: true }
    }, objective), true);
    assert.equal(eventMatchesObjective({
        type: 'SAFE_RETURN', routeId: 'route_burnt_heath', safe: true
    }, objective), false);
    assert.equal(eventMatchesObjective({
        type: 'COMBAT_VICTORY', routeId: 'route_old_road', safe: true
    }, objective), false);
});

test('semantic objective types remain event-driven', () => {
    assert.deepEqual(WORLD_OBJECTIVE_TYPES, {
        DISCOVER: 'discover',
        INTERACT: 'interact',
        DEFEAT: 'defeat',
        SAFE_RETURN: 'safe_return',
        CONTRACT: 'contract',
        PREPARE: 'prepare'
    });
    assert.equal(eventMatchesObjective({
        type: WORLD_EVENT_TYPES.ENCOUNTER_DEFEATED,
        encounterId: 'road_toll_crossfire'
    }, {
        eventType: WORLD_EVENT_TYPES.ENCOUNTER_DEFEATED,
        match: { encounterId: { in: ['road_toll', 'road_toll_crossfire'] } }
    }), true);
});

test('effect reducer supports narrative and chapter effects in order', () => {
    let world = acceptWorldContract(createInitialWorldState(), 'missing_kegs', { now: 10 }).state;
    const reduction = applyWorldEffects(world, [
        { type: WORLD_EFFECT_TYPES.SET_FACT, factId: 'pine_signal_chart' },
        { type: WORLD_EFFECT_TYPES.ADVANCE_NPC, npcId: 'elowen' },
        { type: WORLD_EFFECT_TYPES.SET_TOWN_MILESTONE, milestoneId: 'quartermaster_stall_open' },
        { type: WORLD_EFFECT_TYPES.OFFER_CONTRACT, contractId: 'road_conditions_pine' },
        {
            type: WORLD_EFFECT_TYPES.COMPLETE_OBJECTIVE,
            contractId: 'missing_kegs',
            objectiveId: 'find_keg_wreck'
        },
        { type: WORLD_EFFECT_TYPES.SET_CHAPTER_PREPARATION, chapterId: 'chapter_one', flagId: 'tildas_wards' },
        { type: WORLD_EFFECT_TYPES.SET_CHAPTER_PREPARATION, chapterId: 'chapter_one', flagId: 'marlows_breach' },
        { type: WORLD_EFFECT_TYPES.SET_FINALE_STATUS, chapterId: 'chapter_one', status: 'ready' },
        { type: WORLD_EFFECT_TYPES.COMPLETE_CHAPTER, chapterId: 'chapter_one' }
    ], { now: 20 });

    world = reduction.state;
    assert.equal(reduction.appliedEffects.length, 9);
    assert.equal(world.facts.pine_signal_chart, true);
    assert.equal(world.contracts.active.missing_kegs.objectives.find_keg_wreck.complete, true);
    assert.equal(world.chapters.chapter_one.status, 'completed');
    assert.equal(world.chapters.chapter_one.completedAt, 20);
});

test('invalid effects and attempts to regress state are safe no-ops', () => {
    let world = applyWorldEffects(createInitialWorldState(), [
        { type: 'SET_FACT', factId: 'not_real' },
        { type: 'ADVANCE_NPC', npcId: 'not_real' },
        { type: 'SET_TOWN_MILESTONE', milestoneId: 'not_real' },
        { type: 'OFFER_CONTRACT', contractId: 'not_real' },
        { type: 'COMPLETE_OBJECTIVE', contractId: 'not_real', objectiveId: 'not_real' },
        { type: 'SET_CHAPTER_PREPARATION', chapterId: 'chapter_one', flagId: 'not_real' },
        { type: 'SET_FINALE_STATUS', chapterId: 'not_real', status: 'defeated' },
        { type: 'COMPLETE_CHAPTER', chapterId: 'not_real' },
        { type: 'NOT_AN_EFFECT' }
    ]).state;
    assert.deepEqual(world, createInitialWorldState());

    world = applyWorldEffects(world, [
        { type: 'ADVANCE_NPC', npcId: 'kreg', stageId: 'committed' },
        { type: 'ADVANCE_NPC', npcId: 'kreg', stageId: 'steady' },
        { type: 'SET_TOWN_MILESTONE', milestoneId: 'quartermaster_stall_open', status: 'completed' },
        { type: 'SET_TOWN_MILESTONE', milestoneId: 'quartermaster_stall_open', status: 'locked' }
    ]).state;
    assert.equal(world.npcs.kreg.stageId, 'committed');
    assert.equal(world.town.milestones.quartermaster_stall_open.status, 'completed');
});

test('Missing Kegs enforces interaction before return and opens Mara service', () => {
    let world = acceptWorldContract(createInitialWorldState(), 'missing_kegs', { now: 100 }).state;
    world = event(world, WORLD_EVENT_TYPES.SAFE_RETURN, { routeId: 'route_old_road' }, 110);
    assert.equal(world.contracts.active.missing_kegs.objectives.return_from_old_road.progress, 0);

    const inspected = performDestinationInteraction(world, 'inspect_wreck', { now: 120 });
    assert.deepEqual(inspected.completedObjectiveIds, ['missing_kegs:find_keg_wreck']);
    world = inspected.state;
    assert.equal(world.facts.forged_toll_seal, true);
    assert.equal(world.npcs.marlow.stageId, 'suspicious');
    assert.ok(world.contracts.offered.false_toll);

    const returned = evaluateWorldEvent(world, {
        type: WORLD_EVENT_TYPES.SAFE_RETURN, routeId: 'route_old_road'
    }, { now: 130 });
    world = returned.state;
    assert.deepEqual(returned.completedObjectiveIds, ['missing_kegs:return_from_old_road']);
    assert.equal(world.contracts.active.missing_kegs.status, 'claimable');
    assert.deepEqual(getAvailableTownServiceIds(world), ['quartermaster_stock']);
});

test('once-only destination interactions are idempotent', () => {
    const first = performDestinationInteraction(createInitialWorldState(), 'inspect_wreck', { now: 10 });
    const duplicate = performDestinationInteraction(first.state, 'inspect_wreck', { now: 20 });

    assert.equal(first.success, true);
    assert.equal(duplicate.success, false);
    assert.equal(duplicate.code, 'ALREADY_COMPLETED');
    assert.equal(duplicate.state.destinationInteractions.inspect_wreck.completionCount, 1);
    assert.equal(duplicate.state.destinationInteractions.inspect_wreck.lastCompletedAt, 10);
});

test('each middle branch accepts every authored outbound encounter variant', () => {
    for (const encounterId of ['hedge_fire', 'heath_smoke_screen', 'heath_cinder_circle']) {
        const world = completeHeathBranch(createInitialWorldState(), 100, encounterId);
        assert.ok(world.contracts.completed.ashes_on_the_heath, encounterId);
    }
    for (const encounterId of ['road_toll', 'road_toll_crossfire', 'road_toll_ambush']) {
        const world = completeTollBranch(createInitialWorldState(), 200, encounterId);
        assert.ok(world.contracts.completed.false_toll, encounterId);
    }
});

test('middle branches are order-independent and each yields meaningful preparation', () => {
    const heathThenToll = completeTollBranch(
        completeHeathBranch(createInitialWorldState(), 100),
        200
    );
    const tollThenHeath = completeHeathBranch(
        completeTollBranch(createInitialWorldState(), 100),
        200
    );

    for (const world of [heathThenToll, tollThenHeath]) {
        assert.deepEqual(world.chapters.chapter_one.finale.preparationFlags, {
            tildas_wards: true,
            marlows_breach: true
        });
        assert.equal(world.chapters.chapter_one.finale.status, 'ready');
        assert.equal(world.npcs.tilda.stageId, 'wardkeeper');
        assert.equal(world.npcs.marlow.stageId, 'road_captain');
        assert.ok(world.contracts.offered.watchhouse_reckoning);
        assert.ok(world.contracts.offered.heath_watch);
        assert.ok(world.contracts.offered.crossing_patrol);
    }
});

test('earned shortcuts advance the repeatable contracts tied to their destinations', () => {
    let pine = performDestinationInteraction(createInitialWorldState(), 'search_signal_cache', { now: 10 }).state;
    pine = acceptWorldContract(pine, 'road_conditions_pine', { now: 11 }).state;
    pine = event(pine, WORLD_EVENT_TYPES.SAFE_RETURN, { routeId: 'route_old_pine_cut' }, 12);
    assert.equal(pine.contracts.active.road_conditions_pine.status, 'claimable');

    let heath = completeHeathBranch(createInitialWorldState(), 100);
    heath = acceptWorldContract(heath, 'heath_watch', { now: 110 }).state;
    heath = event(heath, WORLD_EVENT_TYPES.ENCOUNTER_DEFEATED, {
        routeId: 'route_heath_toll_cut',
        encounterId: 'heath_smoke_screen'
    }, 111);
    heath = event(heath, WORLD_EVENT_TYPES.SAFE_RETURN, {
        routeId: 'route_heath_toll_cut'
    }, 112);
    assert.equal(heath.contracts.active.heath_watch.status, 'claimable');

    let toll = completeTollBranch(createInitialWorldState(), 200);
    toll = acceptWorldContract(toll, 'crossing_patrol', { now: 210 }).state;
    toll = event(toll, WORLD_EVENT_TYPES.ENCOUNTER_DEFEATED, {
        routeId: 'route_heath_toll_cut',
        encounterId: 'road_toll'
    }, 211);
    toll = event(toll, WORLD_EVENT_TYPES.SAFE_RETURN, {
        routeId: 'route_heath_toll_cut'
    }, 212);
    assert.equal(toll.contracts.active.crossing_patrol.status, 'claimable');
});

test('finale choice, defeat, object interaction, safe return, and claim form one durable sequence', () => {
    let world = completeTollBranch(completeHeathBranch(createInitialWorldState(), 100), 200);
    world = acceptWorldContract(world, 'watchhouse_reckoning', { now: 300 }).state;
    assert.equal(world.contracts.active.watchhouse_reckoning.objectives.secure_tildas_support.complete, true);
    assert.equal(world.contracts.active.watchhouse_reckoning.objectives.secure_marlows_support.complete, true);

    const selected = selectWorldFinalePreparation(world, 'chapter_one', 'warded_approach', { now: 310 });
    assert.equal(selected.success, true);
    assert.deepEqual(selected.completedObjectiveIds, ['watchhouse_reckoning:choose_watchhouse_plan']);
    world = selected.state;
    assert.equal(world.chapters.chapter_one.finale.status, 'prepared');
    assert.equal(
        selectWorldFinalePreparation(world, 'chapter_one', 'side_gate_breach').code,
        'PREPARATION_CHOICE_LOCKED'
    );

    const defeated = evaluateWorldEvent(world, {
        type: WORLD_EVENT_TYPES.ENCOUNTER_DEFEATED,
        routeId: 'route_heath_watchhouse',
        encounterId: 'watchhouse_breach_heath_prepared'
    }, { now: 320 });
    world = defeated.state;
    assert.deepEqual(defeated.completedObjectiveIds, ['watchhouse_reckoning:defeat_watchhouse_breach']);
    assert.deepEqual(defeated.resolvedFinaleIds, ['chapter_one']);
    assert.equal(world.chapters.chapter_one.finale.status, 'defeated');
    assert.equal(world.chapters.chapter_one.epilogue.status, 'available');

    const searched = performDestinationInteraction(world, 'search_watchhouse_orders', { now: 330 });
    assert.equal(searched.success, true);
    world = searched.state;
    assert.equal(world.facts.watchhouse_orders, true);
    assert.equal(world.facts.north_road_patron, true);

    world = event(world, WORLD_EVENT_TYPES.SAFE_RETURN, {
        routeId: 'route_heath_watchhouse'
    }, 340);
    assert.equal(world.contracts.active.watchhouse_reckoning.status, 'claimable');
    const claimed = claimWorldContract(world, 'watchhouse_reckoning', { now: 350 });
    assert.equal(claimed.success, true);
    assert.equal(claimed.state.chapters.chapter_one.status, 'completed');
    assert.equal(claimed.state.chapters.chapter_one.completedAt, 350);
    assert.equal(claimed.state.town.milestones.road_network_restored.status, 'completed');
    assert.equal(claimed.state.npcs.marlow.stageId, 'staying');
});

test('completed objectives are event-idempotent and cannot exceed target', () => {
    let world = acceptWorldContract(createInitialWorldState(), 'missing_kegs').state;
    world = performDestinationInteraction(world, 'inspect_wreck').state;
    const first = evaluateWorldEvent(world, {
        type: 'SAFE_RETURN', routeId: 'route_old_road', amount: 50
    });
    const duplicate = evaluateWorldEvent(first.state, {
        type: 'SAFE_RETURN', routeId: 'route_old_road', amount: 50
    });

    const objective = duplicate.state.contracts.active.missing_kegs.objectives.return_from_old_road;
    assert.equal(objective.progress, 1);
    assert.equal(objective.complete, true);
    assert.deepEqual(duplicate.completedObjectiveIds, []);
});

test('contract and finale commands reject unknown, unavailable, and premature operations', () => {
    const world = createInitialWorldState();
    assert.equal(acceptWorldContract(world, 'not_real').code, 'UNKNOWN_CONTRACT');
    assert.equal(acceptWorldContract(world, 'ashes_on_the_heath').code, 'NOT_OFFERED');
    assert.equal(claimWorldContract(world, 'missing_kegs').code, 'NOT_CLAIMABLE');
    assert.equal(performDestinationInteraction(world, 'not_real').code, 'UNKNOWN_INTERACTION');
    assert.equal(
        selectWorldFinalePreparation(world, 'chapter_one', 'warded_approach').code,
        'FINALE_NOT_PREPARABLE'
    );
});
