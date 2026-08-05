const test = require('node:test');
const assert = require('node:assert/strict');

const {
    WorldFactCatalog,
    NpcCatalog,
    TownMilestoneCatalog,
    TownServiceCatalog,
    TownStockCatalog,
    WorldRewardChoiceCatalog,
    WorldChapterCatalog,
    DestinationInteractionCatalog,
    WorldContractCatalog
} = require('../worldCatalog.js');
const { ItemDatabase } = require('../public/js/items.js');
const { RouteCatalog, AuthoredEncounterCatalog } = require('../adventureCatalog.js');

test('Chapter One catalog contains the two non-linear branches, named NPC arcs, and finale', () => {
    assert.deepEqual(Object.keys(WorldFactCatalog).sort(), [
        'forged_toll_seal',
        'heath_signal_cipher',
        'north_road_patron',
        'pine_signal_chart',
        'toll_gang_ledger',
        'watchhouse_orders'
    ]);
    assert.deepEqual(Object.keys(NpcCatalog).sort(), ['elowen', 'kreg', 'mara', 'marlow', 'tilda']);
    assert.deepEqual(Object.keys(DestinationInteractionCatalog).sort(), [
        'inspect_wreck',
        'search_signal_cache',
        'search_watchhouse_orders',
        'seize_toll_ledger',
        'trace_heath_signal'
    ]);
    assert.deepEqual(Object.keys(WorldContractCatalog).sort(), [
        'ashes_on_the_heath',
        'crossing_patrol',
        'false_toll',
        'heath_watch',
        'missing_kegs',
        'road_conditions_pine',
        'watchhouse_reckoning'
    ]);
    assert.equal(NpcCatalog.tilda.stages.at(-1).id, 'settled');
    assert.equal(NpcCatalog.marlow.stages.at(-1).id, 'staying');
    Object.values(NpcCatalog).forEach(npc => {
        npc.stages.forEach(stage => assert.ok(stage.returnReaction.length > 20));
    });
});

test('catalog definitions are deeply immutable', () => {
    assert.equal(Object.isFrozen(WorldContractCatalog), true);
    assert.equal(Object.isFrozen(WorldContractCatalog.watchhouse_reckoning.objectives), true);
    assert.equal(Object.isFrozen(WorldChapterCatalog.chapter_one.finale.preparationOptions), true);
    assert.equal(Object.isFrozen(TownStockCatalog.quartermaster_tankard_maul), true);

    assert.throws(() => {
        WorldContractCatalog.missing_kegs.objectives.push({ id: 'spoof' });
    }, TypeError);
});

test('typed objectives retain generic event declarations without domain_event labels', () => {
    const expectedEvents = {
        discover: 'LOCATION_DISCOVERED',
        interact: 'DESTINATION_INTERACTION_COMPLETED',
        defeat: 'ENCOUNTER_DEFEATED',
        safe_return: 'SAFE_RETURN',
        contract: 'CONTRACT_CLAIMED',
        prepare: 'FINALE_PREPARATION_SELECTED'
    };
    const seenTypes = new Set();
    Object.values(WorldContractCatalog).forEach(contract => {
        contract.objectives.forEach(objective => {
            seenTypes.add(objective.type);
            assert.equal(objective.eventType, expectedEvents[objective.type]);
            assert.notEqual(objective.type, 'domain_event');
            assert.ok(objective.target > 0);
        });
    });
    assert.deepEqual([...seenTypes].sort(), Object.keys(expectedEvents).sort());
});

test('all declarative world references resolve', () => {
    const destinationIds = new Set([
        'old_road', 'pine_trail', 'burnt_heath', 'toll_crossing', 'ruined_watchhouse'
    ]);
    Object.values(NpcCatalog).forEach(npc => {
        assert.ok(npc.stages.some(stage => stage.id === npc.initialStageId));
        assert.equal(new Set(npc.stages.map(stage => stage.id)).size, npc.stages.length);
    });

    Object.values(TownServiceCatalog).forEach(service => {
        assert.ok(NpcCatalog[service.providerNpcId]);
        Object.keys(service.requirements.townMilestones || {}).forEach(id => {
            assert.ok(TownMilestoneCatalog[id]);
        });
        Object.entries(service.requirements.npcStages || {}).forEach(([npcId, stageId]) => {
            assert.ok(NpcCatalog[npcId].stages.some(stage => stage.id === stageId));
        });
    });

    const assertEffectReference = effect => {
        if (effect.factId) assert.ok(WorldFactCatalog[effect.factId]);
        if (effect.npcId) assert.ok(NpcCatalog[effect.npcId]);
        if (effect.milestoneId) assert.ok(TownMilestoneCatalog[effect.milestoneId]);
        if (effect.contractId) assert.ok(WorldContractCatalog[effect.contractId]);
        if (effect.chapterId) assert.ok(WorldChapterCatalog[effect.chapterId]);
    };
    Object.values(DestinationInteractionCatalog).forEach(interaction => {
        assert.ok(destinationIds.has(interaction.destinationId));
        interaction.effects.forEach(assertEffectReference);
    });
    Object.values(WorldContractCatalog).forEach(contract => {
        assert.ok(NpcCatalog[contract.issuerNpcId]);
        assert.ok(['story', 'repeatable'].includes(contract.type));
        assert.equal(contract.repeatable, contract.type === 'repeatable');
        (contract.onClaimEffects || []).forEach(assertEffectReference);
        contract.objectives.forEach(objective => {
            (objective.onCompleteEffects || []).forEach(assertEffectReference);
        });
    });
});

test('branch defeat objectives accept every authored outbound encounter and avoid RNG repetition', () => {
    const ashMatch = WorldContractCatalog.ashes_on_the_heath.objectives
        .find(objective => objective.id === 'defeat_heath_signalers').match.encounterId.in;
    const tollMatch = WorldContractCatalog.false_toll.objectives
        .find(objective => objective.id === 'defeat_toll_gang').match.encounterId.in;
    assert.deepEqual(ashMatch, RouteCatalog.route_burnt_heath.encounterIds);
    assert.deepEqual(tollMatch, RouteCatalog.route_toll_crossing.encounterIds);
});

test('finale choices map to live adventure routes and tactical compositions', () => {
    const finale = WorldChapterCatalog.chapter_one.finale;
    assert.deepEqual(finale.routeIds, ['route_heath_watchhouse', 'route_toll_watchhouse']);
    finale.routeIds.forEach(routeId => {
        const route = RouteCatalog[routeId];
        assert.ok(route);
        finale.preparationOptions.forEach(option => {
            const variant = route.preparationVariants.find(candidate => (
                candidate.id === option.integrationPreparationId
            ));
            assert.ok(variant, `${routeId} lacks ${option.integrationPreparationId}`);
            assert.ok(variant.outboundEncounterIds.includes(option.integrationEncounterId));
            assert.ok(AuthoredEncounterCatalog[option.integrationEncounterId]);
        });
    });
    const defeatIds = WorldContractCatalog.watchhouse_reckoning.objectives
        .find(objective => objective.id === 'defeat_watchhouse_breach').match.encounterId.in;
    assert.deepEqual(defeatIds, [
        'watchhouse_breach_unprepared',
        'watchhouse_breach_heath_prepared',
        'watchhouse_breach_toll_prepared'
    ]);
    defeatIds.forEach(encounterId => assert.ok(AuthoredEncounterCatalog[encounterId]));
});

test('staged quartermaster stock guarantees build families without owning their statistics', () => {
    const entries = Object.values(TownStockCatalog);
    assert.deepEqual(entries.map(entry => entry.itemId), [
        'round_shield',
        'hunters_spear',
        'hunter_bow',
        'apprentice_staff',
        'parrying_dagger',
        'tankard_maul'
    ]);
    entries.forEach(entry => {
        assert.equal(entry.serviceId, 'quartermaster_stock');
        assert.ok(ItemDatabase[entry.itemId]);
        assert.ok(entry.price > 0);
        assert.equal(Object.prototype.hasOwnProperty.call(entry, 'stats'), false);
    });
    assert.deepEqual(
        WorldRewardChoiceCatalog.first_return_kit.options.map(option => option.itemId),
        ['round_shield', 'hunters_spear', 'hunter_bow']
    );
});

test('world definitions contain no gameplay statistics or visual profiles', () => {
    const forbiddenKeys = new Set([
        'stats', 'hp', 'health', 'attack', 'defense', 'damage', 'speed',
        'equipment', 'weaponId', 'spriteId', 'animationId', 'visualProfileId'
    ]);
    const visit = value => {
        if (!value || typeof value !== 'object') return;
        Object.entries(value).forEach(([key, child]) => {
            assert.equal(forbiddenKeys.has(key), false, `world catalog must not own ${key}`);
            visit(child);
        });
    };
    visit({
        WorldFactCatalog,
        NpcCatalog,
        TownMilestoneCatalog,
        TownServiceCatalog,
        TownStockCatalog,
        WorldRewardChoiceCatalog,
        WorldChapterCatalog,
        DestinationInteractionCatalog,
        WorldContractCatalog
    });
});
