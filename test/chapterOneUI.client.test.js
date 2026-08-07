const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public', 'js', 'expeditions.js'), 'utf8');
const townSource = fs.readFileSync(path.join(root, 'public', 'js', 'town-exploration.js'), 'utf8');
const {
    buildTavernReturnPresentation,
    getContractObjectivePresentation,
    getContractRoutePayPresentation,
    getContractStatusPresentation,
    getExpeditionEscrowSummary,
    getRouteAvailabilityPresentation,
    getSnapshotContracts,
    getWorldContractUpdates,
    isCurrentChapterCatalogItem,
    sortAdventureContracts
} = require('../public/js/expeditions.js');

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

test('fresh route presentation distinguishes an open unscouted road from a locked route', () => {
    assert.deepEqual(plain(getRouteAvailabilityPresentation({
        unlocked: true,
        encounterReports: []
    })), {
        unlocked: true,
        scouted: false,
        label: 'Open - Unscouted',
        className: 'is-open-unscouted',
        description: 'This road is unlocked. Travel it to turn rumor into a reliable enemy report.'
    });
    assert.equal(getRouteAvailabilityPresentation({ encounterReports: [] }).label, 'Locked');
    assert.equal(getRouteAvailabilityPresentation({
        unlocked: false,
        encounterReports: []
    }).label, 'Locked');
    assert.equal(getRouteAvailabilityPresentation({
        unlocked: true,
        encounterReports: [{ encounterId: 'alley_robbery' }]
    }).label, 'Open - Scouted');
    assert.equal(getRouteAvailabilityPresentation({
        unlocked: true,
        encounterReports: [{ encounterId: 'alley_robbery' }],
        unconfirmedEncounterCount: 1
    }).label, 'Open - Partial Intel');
});

function createClientHarness(search = '?mute=1') {
    const listeners = {};
    const emissions = [];
    const events = [];
    const context = vm.createContext({
        URLSearchParams,
        confirm: () => true,
        console,
        events,
        pendingLoot: [],
        expeditionRewardReturnPending: false,
        player: { adventure: {}, pendingGold: 0, pendingXp: 0, pendingLoot: [] },
        showLootScreen: () => events.push('loot-claim'),
        setGameState: state => events.push(`state:${state}`),
        setTimeout: callback => callback(),
        window: { location: { search } },
        socket: {
            on(eventName, listener) {
                listeners[eventName] = listener;
            },
            emit(eventName, payload) {
                emissions.push({ eventName, payload });
            }
        }
    });
    vm.runInContext(`${source}
        renderTownWorldState = () => events.push('town');
        renderAdventureScreen = () => events.push('journey');
        renderTavernReturnReport = () => events.push('return-report');
        saveGame = () => events.push('save');
        globalThis.__chapterOneUi = {
            acceptContract: acceptAdventureContract,
            claimReward: claimAdventureWorldRewardChoice,
            claimContract: claimAdventureContract,
            getSnapshot: () => adventureViewSnapshot,
            purchaseStock: purchaseChapterOneStock,
            recruitNpc: recruitChapterOneNpc,
            resetPending: () => { adventureRequestPending = false; },
            continueJourney: continueAdventureJourney,
            resolveJourneyInstance: resolveAdventureJourneyInstance,
            resolveInteraction: resolveAdventureDestinationInteraction,
            selectFinalePreparation: selectChapterOneFinalePreparation
        };
    `, context, { filename: 'expeditions.js' });
    return { context, emissions, events, listeners };
}

test('Chapter One contracts take priority and deferred catalog nodes stay off the map', () => {
    const harness = createClientHarness();
    harness.listeners.adventureProgress({
        adventureState: {
            partyPower: { score: 17, bandId: 'seasoned' },
            adventure: { totalSafeReturns: 1, activeJourney: null },
            locations: [
                { id: 'old_road', chapterStatus: 'active' },
                { id: 'burnt_heath', chapterStatus: 'deferred' }
            ],
            routes: [
                { id: 'route_old_road', chapterStatus: 'active' },
                { id: 'route_burnt_heath', chapterStatus: 'deferred' }
            ],
            contracts: [{ id: 'missing_kegs', objectives: [] }],
            world: { contracts: [{ id: 'world_fallback' }], facts: [] }
        }
    });

    const snapshot = plain(harness.context.__chapterOneUi.getSnapshot());
    assert.deepEqual(snapshot.locations.map(location => location.id), ['old_road']);
    assert.deepEqual(snapshot.routes.map(route => route.id), ['route_old_road']);
    assert.deepEqual(snapshot.contracts.map(contract => contract.id), ['missing_kegs']);
    assert.deepEqual(snapshot.partyPower, { score: 17, bandId: 'seasoned' });
    assert.equal(Object.hasOwn(snapshot, 'bounties'), false);
    assert.deepEqual(harness.events, ['save', 'town', 'journey', 'return-report']);
});

test('contract, destination, and reward actions emit identifier-only payloads', () => {
    const harness = createClientHarness();
    harness.context.__chapterOneUi.acceptContract('missing_kegs');
    harness.context.__chapterOneUi.resetPending();
    harness.context.__chapterOneUi.claimContract('missing_kegs');
    harness.context.__chapterOneUi.resetPending();
    harness.context.__chapterOneUi.resolveInteraction('inspect_wreck');
    harness.context.__chapterOneUi.resetPending();
    harness.context.__chapterOneUi.claimReward('first_return_kit', 'shield_control');
    harness.context.__chapterOneUi.resetPending();
    harness.context.__chapterOneUi.purchaseStock('quartermaster_apprentice_staff');
    harness.context.__chapterOneUi.resetPending();
    harness.context.__chapterOneUi.recruitNpc('marlow');
    harness.context.__chapterOneUi.resetPending();
    harness.context.__chapterOneUi.selectFinalePreparation('warded_approach');

    assert.deepEqual(plain(harness.emissions), [
        {
            eventName: 'acceptContract',
            payload: { contractId: 'missing_kegs' }
        },
        {
            eventName: 'claimContract',
            payload: { contractId: 'missing_kegs' }
        },
        {
            eventName: 'resolveDestinationInteraction',
            payload: { interactionId: 'inspect_wreck' }
        },
        {
            eventName: 'claimWorldRewardChoice',
            payload: { rewardChoiceId: 'first_return_kit', optionId: 'shield_control' }
        },
        {
            eventName: 'purchaseChapterOneStock',
            payload: { stockId: 'quartermaster_apprentice_staff' }
        },
        {
            eventName: 'recruitChapterOneNpc',
            payload: { npcId: 'marlow' }
        },
        {
            eventName: 'selectChapterOneFinalePreparation',
            payload: { optionId: 'warded_approach' }
        }
    ]);
});

test('journey instance actions use the minimal finalized socket contract', () => {
    const harness = createClientHarness();
    harness.context.player.adventure.activeJourney = {
        combatPending: true,
        currentInstance: { kind: 'combat' }
    };
    harness.context.__chapterOneUi.continueJourney();
    harness.context.__chapterOneUi.resetPending();
    harness.context.player.adventure.activeJourney = {
        combatPending: false,
        currentInstance: { kind: 'event', options: [{ id: 'wait_out_storm' }] }
    };
    harness.context.__chapterOneUi.resolveJourneyInstance('wait_out_storm');

    assert.deepEqual(plain(harness.emissions), [
        { eventName: 'continueJourney' },
        {
            eventName: 'resolveJourneyInstance',
            payload: { optionId: 'wait_out_storm' }
        }
    ]);
});

test('retired deployment and bounty wiring is absent from the Chapter One client', () => {
    assert.doesNotMatch(source, /isAdventureDeveloperMode|legacy-deployments/);
    assert.doesNotMatch(source, /acceptBounty|claimBounty|targetRoundTrips/);
});

test('typed contract objectives and expedition escrow are normalized for display', () => {
    assert.deepEqual(getContractObjectivePresentation({ objectives: [
        { id: 'find', type: 'investigate', description: '<Inspect>', progress: 1, target: 1 },
        { id: 'return', type: 'safe_return', description: 'Return safely', progress: -8, target: 1 }
    ] }), [
        { id: 'find', type: 'investigate', description: '<Inspect>', progress: 1, target: 1, complete: true },
        { id: 'return', type: 'safe_return', description: 'Return safely', progress: 0, target: 1, complete: false }
    ]);
    assert.deepEqual(getExpeditionEscrowSummary({
        pendingGold: 18,
        pendingXp: 7,
        pendingLoot: [{ id: 'one' }, { id: 'two' }]
    }), { gold: 18, xp: 7, lootCount: 2 });
    assert.equal(isCurrentChapterCatalogItem({ chapterStatus: 'deferred' }), false);
    assert.equal(isCurrentChapterCatalogItem({ chapterStatus: 'active' }), true);
    assert.doesNotMatch(source, /safe returns`|requiredRoundTrips|bountyCatalog/);
});

test('contract presentation prioritizes actionable work and reports alternative route pay honestly', () => {
    const ordered = sortAdventureContracts([
        { id: 'finished', status: 'completed', type: 'story' },
        { id: 'repeatable', status: 'available', type: 'repeatable', repeatable: true },
        { id: 'story', status: 'available', type: 'story' },
        { id: 'active', status: 'active', type: 'story' },
        { id: 'claim', status: 'claimable', type: 'story' }
    ]);
    assert.deepEqual(ordered.map(contract => contract.id), [
        'claim',
        'active',
        'story',
        'repeatable',
        'finished'
    ]);
    assert.equal(getContractStatusPresentation({ status: 'claimable' }).label, 'Ready to claim');
    assert.equal(getContractStatusPresentation({ status: 'available', repeatable: true }).sortRank, 3);
    assert.equal(getContractRoutePayPresentation([
        { safeReturnGold: 15 },
        { safeReturnGold: 30 },
        { safeReturnGold: 15 }
    ]), '15-30g safe-return pay');
});

test('login restores the authoritative claim overlay for safe-return rewards', () => {
    const harness = createClientHarness();
    harness.listeners.loginSuccess({
        pendingGold: 35,
        pendingXp: 12,
        pendingLoot: [{ id: 'road_relic' }],
        adventure: {
            activeJourney: null,
            latestReturnReport: { outcome: 'safe_return', routeId: 'route_old_road' }
        }
    });

    assert.deepEqual(plain(harness.context.pendingLoot), [{ id: 'road_relic' }]);
    assert.deepEqual(harness.events, ['loot-claim']);
    assert.deepEqual(plain(harness.emissions), [{
        eventName: 'requestAdventureState'
    }]);
    assert.equal(harness.context.expeditionRewardReturnPending, true);
});

test('login blocks active-journey escrow while restoring generic completed-combat rewards', () => {
    const activeHarness = createClientHarness();
    activeHarness.listeners.loginSuccess({
        pendingGold: 35,
        pendingXp: 12,
        pendingLoot: [{ id: 'journey_escrow' }],
        adventure: {
            activeJourney: { phase: 'RETURNING' },
            latestReturnReport: { outcome: 'safe_return' }
        }
    });
    assert.deepEqual(activeHarness.events, []);
    assert.equal(activeHarness.context.expeditionRewardReturnPending, false);

    const unrelatedHarness = createClientHarness();
    unrelatedHarness.listeners.loginSuccess({
        pendingGold: 35,
        pendingXp: 12,
        pendingLoot: [{ id: 'unrelated_reward' }],
        adventure: { activeJourney: null, latestReturnReport: null }
    });
    assert.deepEqual(unrelatedHarness.events, ['loot-claim']);
    assert.equal(unrelatedHarness.context.expeditionRewardReturnPending, false);
    assert.deepEqual(
        plain(unrelatedHarness.context.pendingLoot),
        [{ id: 'unrelated_reward' }]
    );
});

test('a final noncombat safe return enters town and exposes escrow rewards immediately', () => {
    const harness = createClientHarness();
    harness.context.player.adventure.activeJourney = {
        direction: 'RETURN',
        phase: 'RETURNING',
        currentInstance: { kind: 'event', type: 'weather' }
    };
    harness.listeners.adventureReceipt({
        success: true,
        outcome: 'safe_return',
        updatedPlayer: {
            adventure: { activeJourney: null },
            pendingGold: 28,
            pendingXp: 9,
            pendingLoot: [{ id: 'road_cache' }]
        }
    });

    assert.deepEqual(harness.events, [
        'town',
        'journey',
        'return-report',
        'save',
        'state:TOWN',
        'loot-claim'
    ]);
    assert.equal(harness.context.expeditionRewardReturnPending, true);
    assert.deepEqual(plain(harness.context.pendingLoot), [{ id: 'road_cache' }]);
});

test('return report resolves world objective updates and surfaces the waiting kit', () => {
    const snapshot = {
        routes: [{ id: 'route_old_road', name: 'The Old Road', dangerLabel: 'Low' }],
        contracts: [{
            id: 'missing_kegs',
            title: 'Missing Kegs',
            status: 'claimable',
            objectives: [{
                id: 'return_from_old_road',
                description: 'Return safely from the Old Road.',
                progress: 1,
                target: 1,
                complete: true
            }]
        }],
        world: {
            rewardChoices: [{ id: 'first_return_kit', status: 'available' }]
        }
    };
    assert.deepEqual(getSnapshotContracts(snapshot, snapshot).map(contract => contract.id), ['missing_kegs']);
    assert.deepEqual(getWorldContractUpdates({
        worldContractUpdates: ['missing_kegs:return_from_old_road']
    }, snapshot)[0], {
        kind: 'world-objective',
        contractId: 'missing_kegs',
        objectiveId: 'return_from_old_road',
        title: 'Missing Kegs',
        objectiveDescription: 'Return safely from the Old Road.',
        progress: 1,
        target: 1,
        status: 'claimable',
        currentStatus: 'claimable'
    });

    const presentation = buildTavernReturnPresentation({
        outcome: 'safe_return',
        routeId: 'route_old_road',
        encounterName: 'Roadside Gang',
        rewardGold: 20,
        worldContractUpdates: ['missing_kegs:return_from_old_road']
    }, snapshot, {});
    assert.equal(presentation.rewardChoiceAvailable, true);
    assert.match(presentation.summary, /equipment choice waiting/);
    assert.match(presentation.kregLine, /ready to claim/);
    assert.equal(presentation.contractUpdates[0].kind, 'world-objective');
});

test('destination rendering always keeps the independent return action', () => {
    assert.match(source, /renderDestinationInteractionsMarkup\(destinationId\)/);
    assert.match(source, /id="begin-return-trip-btn">Begin Return Journey/);
    assert.doesNotMatch(source, /interaction[^\n]{0,80}(gate|require)[^\n]{0,80}begin-return-trip-btn/i);
});

test('finale planning, route context, and epilogue copy use projected chapter fields', () => {
    assert.match(source, /option\.selectable !== false/);
    assert.match(source, /Accept Finale Contract First/);
    assert.match(source, /allLocations: rawLocations/);
    assert.match(source, /allRoutes: rawRoutes/);
    assert.match(source, /is-silhouetted/);
    assert.match(source, /chapter\.epilogue && chapter\.epilogue\.description/);
    assert.match(source, /chapter\.nextRegion && chapter\.nextRegion\.description/);
    assert.doesNotMatch(source, /textContent = chapter\.epilogue \|\|/);
});

test('Tilda and Marlow preparation services stay in the NPC town conversation', () => {
    const serviceHandler = source.match(/function openChapterOneTownService\(actionId\) \{([\s\S]*?)\n\}/);
    assert.ok(serviceHandler);
    assert.match(serviceHandler[1], /actionId !== 'review_watchhouse_preparations'/);
    assert.match(serviceHandler[1], /setGameState\('TOWN'\)/);
    assert.doesNotMatch(serviceHandler[1], /ADVENTURES/);
    assert.match(townSource, /\['kreg', 'tilda', 'marlow'\]\.includes\(npcId\)/);
    assert.match(townSource, /selectChapterOneFinalePreparation\(option\.id\)/);
});
