const test = require('node:test');
const assert = require('node:assert/strict');

global.atbEngineStarted = true;

class FakeSocket {
    constructor(id = 'adventure-router') {
        this.id = id;
        this.handlers = new Map();
        this.emitted = [];
        this.timeline = [];
    }

    on(eventName, handler) {
        this.handlers.set(eventName, handler);
    }

    emit(eventName, payload) {
        this.emitted.push({ eventName, payload });
        this.timeline.push({ channel: 'socket', eventName, payload });
    }

    dispatch(eventName, payload) {
        const handler = this.handlers.get(eventName);
        assert.ok(handler, `Missing socket handler for ${eventName}`);
        return handler(payload);
    }

    lastPayload(eventName) {
        const entry = [...this.emitted].reverse().find(candidate => candidate.eventName === eventName);
        return entry && entry.payload;
    }
}

function createIo(socket) {
    const emitted = [];
    return {
        emitted,
        to(socketId) {
            assert.equal(socketId, socket.id);
            return {
                emit(eventName, payload) {
                    emitted.push({ eventName, payload });
                    socket.timeline.push({ channel: 'io', eventName, payload });
                }
            };
        }
    };
}

function makePlayer(overrides = {}) {
    return {
        username: 'Expedition Tester',
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
        wildernessLevel: 1,
        cellarLevel: 1,
        abyssDepth: 1,
        equipment: {},
        inventory: [],
        stash: [],
        roster: { companions: [], activeIds: [] },
        statusEffects: {},
        activeBuffs: [],
        ...overrides
    };
}

function createHarness({
    registerCombat = false,
    activeCombat = null,
    playerOverrides = {},
    persistPlayer = null
} = {}) {
    const socket = new FakeSocket();
    const io = createIo(socket);
    const player = makePlayer(playerOverrides);
    const activePlayers = { [socket.id]: player };
    const activeCombats = {};
    if (activeCombat) activeCombats[socket.id] = activeCombat;

    const registerAdventureRouter = require('../adventureRouter.js');
    registerAdventureRouter(socket, io, activePlayers, activeCombats, persistPlayer);
    if (registerCombat) {
        const registerCombatRouter = require('../combatRouter.js');
        registerCombatRouter(socket, io, activePlayers, activeCombats, persistPlayer);
    }

    return { socket, io, player, activePlayers, activeCombats };
}

test('adventure state is server-authored and starting a route deploys its resolved encounter after state receipts', () => {
    const harness = createHarness();

    harness.socket.dispatch('requestAdventureState');
    const initial = harness.socket.lastPayload('adventureState');
    assert.equal(initial.schemaVersion, 3);
    assert.ok(initial.routes.some(route => route.id === 'route_old_road'));

    harness.socket.timeline.length = 0;
    harness.socket.dispatch('startExpedition', {
        routeId: 'route_old_road',
        encounterId: 'road_toll_ambush',
        rewardGold: 999999
    });

    const receipt = harness.socket.lastPayload('adventureReceipt');
    const combat = harness.activeCombats[harness.socket.id];
    assert.equal(receipt.success, true);
    assert.equal(receipt.action, 'startExpedition');
    assert.equal(receipt.expeditionContext, undefined);
    assert.ok(['alley_robbery', 'alley_gang'].includes(receipt.encounterId));
    assert.ok(combat);
    assert.equal(combat.mode, 'EXPEDITION');
    assert.equal(combat.encounterId, receipt.encounterId);
    assert.equal(combat.expeditionContext.routeId, 'route_old_road');
    assert.equal(combat.expeditionContext.direction, 'OUTBOUND');
    assert.deepEqual(
        harness.socket.timeline.slice(-3).map(entry => entry.eventName),
        ['adventureReceipt', 'adventureState', 'combatDeployed']
    );
});

test('successful adventure and expedition transitions request ordered authoritative persistence', () => {
    const { finalizeCombatVictory } = require('../combatRewards.js');
    const reasons = [];
    const persistPlayer = (_player, metadata) => {
        reasons.push(metadata.reason);
        return Promise.resolve();
    };
    const harness = createHarness({ persistPlayer });

    harness.socket.dispatch('acceptContract', { contractId: 'missing_kegs' });
    harness.socket.dispatch('acceptContract', { contractId: 'unknown_contract' });
    harness.socket.dispatch('startExpedition', { routeId: 'route_old_road' });
    finalizeCombatVictory(harness.socket.id, {
        activePlayers: harness.activePlayers,
        activeCombats: harness.activeCombats,
        io: harness.io,
        persistPlayer
    });

    assert.deepEqual(reasons, [
        'acceptContract',
        'startExpedition',
        'expedition_destination_reached'
    ]);
});

test('adventure mutations reject active combat and never replace the current combat instance', () => {
    const existingCombat = { mode: 'LEGACY', sentinel: true };
    const harness = createHarness({ activeCombat: existingCombat });

    harness.socket.dispatch('startExpedition', { routeId: 'route_old_road' });

    const receipt = harness.socket.lastPayload('adventureReceipt');
    assert.equal(receipt.success, false);
    assert.equal(receipt.code, 'ACTIVE_COMBAT');
    assert.equal(harness.activeCombats[harness.socket.id], existingCombat);
    assert.equal(harness.io.emitted.some(entry => entry.eventName === 'combatDeployed'), false);
});

test('the retired legacy level-selector socket adapter is no longer registered', () => {
    const harness = createHarness({ registerCombat: true });
    harness.socket.dispatch('startExpedition', { routeId: 'route_old_road' });
    const authoredCombat = harness.activeCombats[harness.socket.id];

    assert.equal(harness.socket.handlers.has('deployToCombat'), false);
    assert.equal(harness.activeCombats[harness.socket.id], authoredCombat);
});

test('fleeing fails only the active journey and exposes its authoritative outcome', () => {
    const { hasActiveJourney } = require('../adventureState.js');
    const harness = createHarness({ registerCombat: true });

    harness.socket.dispatch('acceptContract', { contractId: 'missing_kegs' });
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, true);
    harness.socket.dispatch('startExpedition', { routeId: 'route_old_road' });
    assert.equal(hasActiveJourney(harness.player), true);

    harness.socket.dispatch('dispatchCombatAction', { actionCategory: 'flee' });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'flee');
    assert.equal(result.adventureOutcome.success, true);
    assert.equal(result.adventureOutcome.outcome, 'expedition_failed');
    assert.equal(hasActiveJourney(harness.player), false);
    assert.equal(harness.activeCombats[harness.socket.id], undefined);
    const accepted = result.adventureState.world.contracts
        .find(contract => contract.id === 'missing_kegs');
    assert.equal(accepted.status, 'active', 'fleeing erased accepted contract progress');
});

test('normal expedition sockets keep a hidden branch locked when only its location was restored', () => {
    const { normalizeAdventureState } = require('../adventureState.js');
    const harness = createHarness();
    normalizeAdventureState(harness.player, { recoverInterruptedJourney: false });
    harness.player.adventure.unlockedLocationIds.push('burnt_heath');

    harness.socket.dispatch('startExpedition', { routeId: 'route_burnt_heath' });

    const receipt = harness.socket.lastPayload('adventureReceipt');
    assert.equal(receipt.success, false);
    assert.equal(receipt.code, 'LOCKED_ROUTE');
    assert.equal(harness.player.adventure.activeJourney, null);
    assert.equal(harness.activeCombats[harness.socket.id], undefined);
});

test('normal expedition sockets preserve and deploy a restored active-branch return', () => {
    const {
        createInitialAdventureState
    } = require('../adventureState.js');
    const harness = createHarness();
    harness.player.adventure = createInitialAdventureState();
    harness.player.adventure.discoveredLocationIds.push('burnt_heath');
    harness.player.adventure.unlockedLocationIds.push('burnt_heath');
    harness.player.adventure.discoveredRouteIds.push('route_burnt_heath');
    harness.player.adventure.unlockedRouteIds.push('route_burnt_heath');
    harness.player.adventure.activeJourney = {
        journeyId: 'journey_legacy_burnt_heath',
        routeId: 'route_burnt_heath',
        originLocationId: 'pub_hub',
        destinationLocationId: 'burnt_heath',
        phase: 'AT_DESTINATION',
        direction: null,
        reachedDestination: true,
        currentEncounterId: null,
        startedAt: Date.now()
    };

    harness.socket.dispatch('beginExpeditionReturn');

    const receipt = harness.socket.lastPayload('adventureReceipt');
    assert.equal(receipt.success, true);
    assert.equal(receipt.action, 'beginExpeditionReturn');
    assert.equal(harness.player.adventure.activeJourney.phase, 'RETURN_COMBAT');
    assert.equal(harness.activeCombats[harness.socket.id].mode, 'EXPEDITION');
    assert.equal(harness.activeCombats[harness.socket.id].expeditionContext.routeId, 'route_burnt_heath');
});

test('outbound and return victories advance the exact journey without changing legacy Wilderness progression', () => {
    const { finalizeCombatVictory } = require('../combatRewards.js');
    const { hasActiveJourney } = require('../adventureState.js');
    const harness = createHarness();

    harness.socket.dispatch('startExpedition', { routeId: 'route_old_road' });
    const outboundCombat = harness.activeCombats[harness.socket.id];
    const outbound = finalizeCombatVictory(harness.socket.id, {
        activePlayers: harness.activePlayers,
        activeCombats: harness.activeCombats,
        io: harness.io
    });

    assert.equal(outbound.adventureOutcome.success, true);
    assert.equal(outbound.adventureOutcome.outcome, 'destination_reached');
    assert.equal(harness.player.wildernessLevel, 1);
    assert.equal(hasActiveJourney(harness.player), true);
    assert.equal(harness.activeCombats[harness.socket.id], undefined);
    assert.equal(outboundCombat.mode, 'EXPEDITION');

    harness.socket.dispatch('beginExpeditionReturn');
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, true);
    assert.ok(harness.activeCombats[harness.socket.id]);

    const returned = finalizeCombatVictory(harness.socket.id, {
        activePlayers: harness.activePlayers,
        activeCombats: harness.activeCombats,
        io: harness.io
    });

    assert.equal(returned.adventureOutcome.success, true);
    assert.equal(returned.adventureOutcome.outcome, 'safe_return');
    assert.equal(hasActiveJourney(harness.player), false);
    assert.equal(harness.player.wildernessLevel, 1);
    assert.ok(harness.player.pendingGold >= 20);
    assert.equal(
        harness.io.emitted.filter(entry => entry.eventName === 'adventureProgress').length,
        2
    );
});

test('context-mismatched expedition victories fail the journey without advancing world objectives', () => {
    const { finalizeCombatVictory } = require('../combatRewards.js');
    const { advanceChapterOneDiscovery } = require('../chapterOneWorld.js');
    const harness = createHarness({
        playerOverrides: { world: { facts: { pine_signal_chart: true } } }
    });

    harness.socket.dispatch('acceptContract', { contractId: 'ashes_on_the_heath' });
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, true);
    advanceChapterOneDiscovery(harness.player, {
        locationId: 'burnt_heath',
        routeId: 'route_burnt_heath'
    }, 100);
    assert.equal(
        harness.player.world.contracts.active.ashes_on_the_heath.objectives.discover_burnt_heath.complete,
        true
    );

    harness.socket.dispatch('startExpedition', { routeId: 'route_old_road' });
    const combat = harness.activeCombats[harness.socket.id];
    combat.encounterId = 'hedge_fire';
    combat.expeditionContext.routeId = 'route_burnt_heath';

    const result = finalizeCombatVictory(harness.socket.id, {
        activePlayers: harness.activePlayers,
        activeCombats: harness.activeCombats,
        io: harness.io
    });

    assert.equal(result.adventureOutcome.code, 'EXPEDITION_CONTEXT_MISMATCH');
    assert.equal(
        harness.player.world.contracts.active.ashes_on_the_heath.objectives.defeat_heath_signalers.progress,
        0
    );
    assert.equal(harness.player.adventure.activeJourney, null);
});

test('abandoning at a destination forfeits escrow and returns the party recovered to the pub', () => {
    const { finalizeCombatVictory } = require('../combatRewards.js');
    const harness = createHarness();

    harness.socket.dispatch('startExpedition', { routeId: 'route_old_road' });
    finalizeCombatVictory(harness.socket.id, {
        activePlayers: harness.activePlayers,
        activeCombats: harness.activeCombats,
        io: harness.io
    });
    harness.player.hp = 3;
    harness.player.stamina = 2;
    harness.player.pendingGold = 50;
    harness.player.pendingXp = 20;
    harness.player.pendingLoot = [{ id: 'unsecured' }];

    harness.socket.dispatch('abandonExpedition');

    const receipt = harness.socket.lastPayload('adventureReceipt');
    assert.equal(receipt.success, true);
    assert.equal(harness.player.adventure.activeJourney, null);
    assert.equal(harness.player.pendingGold, 0);
    assert.equal(harness.player.pendingXp, 0);
    assert.deepEqual(harness.player.pendingLoot, []);
    assert.equal(harness.player.hp, 25);
    assert.equal(harness.player.stamina, 25);
});

test('contract commands accept Chapter One identifiers only and reject retired contract fallthrough', () => {
    const harness = createHarness();
    const startingGold = harness.player.gold;

    harness.socket.dispatch('acceptContract', {
        contractId: 'old_road_goods',
        rewardGold: 999999,
        targetRoundTrips: 0
    });
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, false);
    assert.equal(harness.socket.lastPayload('adventureReceipt').code, 'UNKNOWN_CONTRACT');
    assert.equal(harness.player.world.contracts.active.old_road_goods, undefined);
    assert.equal(harness.player.gold, startingGold);

    harness.socket.dispatch('acceptContract', { contractId: 'missing_kegs' });
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, true);

    harness.socket.dispatch('claimContract', {
        contractId: 'missing_kegs',
        rewardGold: 999999
    });
    const claim = harness.socket.lastPayload('adventureReceipt');
    assert.equal(claim.success, false);
    assert.equal(harness.player.gold, startingGold);

    harness.socket.dispatch('acceptContract', { contractId: 'not_a_real_contract' });
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, false);
});

test('shared combat defeat fails the journey while preserving accepted contract progress', () => {
    const { beginExpedition, hasActiveJourney } = require('../adventureState.js');
    const { acceptChapterOneContract } = require('../chapterOneWorld.js');
    const { applyPlayerCombatDefeat } = require('../combatDefeat.js');
    const player = makePlayer();

    assert.equal(acceptChapterOneContract(player, 'missing_kegs').success, true);
    assert.equal(beginExpedition(player, 'route_old_road', { random: () => 0 }).success, true);
    assert.equal(hasActiveJourney(player), true);

    applyPlayerCombatDefeat(player);

    assert.equal(hasActiveJourney(player), false);
    assert.equal(player.adventure.routeStats.route_old_road.failedTrips, 1);
    assert.equal(player.world.contracts.active.missing_kegs.objectives.find_keg_wreck.progress, 0);
});

test('Chapter One discovery connects contract, safe return, town growth, pay, and equipment choice', () => {
    const { finalizeCombatVictory } = require('../combatRewards.js');
    const harness = createHarness();

    harness.socket.dispatch('acceptContract', {
        contractId: 'missing_kegs',
        rewardGold: 999999
    });
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, true);
    assert.ok(harness.player.world.contracts.active.missing_kegs);

    harness.socket.dispatch('startExpedition', { routeId: 'route_old_road' });
    const outbound = finalizeCombatVictory(harness.socket.id, {
        activePlayers: harness.activePlayers,
        activeCombats: harness.activeCombats,
        io: harness.io
    });
    assert.equal(outbound.adventureOutcome.outcome, 'destination_reached');

    harness.socket.dispatch('resolveDestinationInteraction', {
        interactionId: 'inspect_wreck',
        factId: 'invented_fact'
    });
    const discovery = harness.socket.lastPayload('adventureReceipt');
    assert.equal(discovery.success, true);
    assert.equal(harness.player.world.facts.forged_toll_seal, true);
    assert.equal(
        harness.player.world.contracts.active.missing_kegs.objectives.find_keg_wreck.complete,
        true
    );

    harness.socket.dispatch('beginExpeditionReturn');
    const returned = finalizeCombatVictory(harness.socket.id, {
        activePlayers: harness.activePlayers,
        activeCombats: harness.activeCombats,
        io: harness.io
    });
    assert.equal(returned.adventureOutcome.outcome, 'safe_return');
    assert.equal(returned.adventureOutcome.worldProgress.rewardChoiceOffered, true);
    const progress = harness.io.emitted
        .filter(entry => entry.eventName === 'adventureProgress')
        .at(-1).payload;
    assert.deepEqual(
        progress.adventureState.adventure.latestReturnReport.worldContractUpdates,
        ['missing_kegs:return_from_old_road']
    );
    assert.equal(
        progress.adventureState.adventure.latestReturnReport.rewardChoiceOffered,
        true
    );
    assert.equal(harness.player.world.contracts.active.missing_kegs.status, 'claimable');
    assert.equal(
        harness.player.world.town.milestones.quartermaster_stall_open.status,
        'unlocked'
    );

    harness.socket.dispatch('claimContract', { contractId: 'missing_kegs', rewardGold: 999999 });
    const claimed = harness.socket.lastPayload('adventureReceipt');
    assert.equal(claimed.success, true);
    assert.equal(harness.player.gold, 75);

    harness.socket.dispatch('claimWorldRewardChoice', {
        rewardChoiceId: 'first_return_kit',
        optionId: 'shield_control',
        itemId: 'tower_shield'
    });
    const kit = harness.socket.lastPayload('adventureReceipt');
    assert.equal(kit.success, true);
    assert.deepEqual(harness.player.inventory.map(item => item.id), ['round_shield']);
    assert.equal(kit.adventureState.world.rewardChoices[0].status, 'claimed');

    harness.socket.dispatch('purchaseChapterOneStock', {
        stockId: 'quartermaster_hunters_spear',
        price: 1,
        itemId: 'tankard_maul'
    });
    const purchase = harness.socket.lastPayload('adventureReceipt');
    assert.equal(purchase.success, true);
    assert.equal(harness.player.gold, 15);
    assert.deepEqual(harness.player.inventory.map(item => item.id), ['round_shield', 'hunters_spear']);

    harness.socket.dispatch('purchaseChapterOneStock', {
        stockId: 'quartermaster_apprentice_staff'
    });
    const lockedPurchase = harness.socket.lastPayload('adventureReceipt');
    assert.equal(lockedPurchase.success, false);
    assert.equal(harness.player.gold, 15);
});

test('Marlow recruitment is a one-time server-authored town service', () => {
    const harness = createHarness({
        playerOverrides: {
            world: {
                contracts: {
                    completed: { false_toll: { count: 1, lastCompletedAt: 100 } }
                }
            }
        }
    });

    harness.socket.dispatch('recruitChapterOneNpc', { npcId: 'marlow', level: 99 });
    const recruited = harness.socket.lastPayload('adventureReceipt');
    assert.equal(recruited.success, true);
    assert.equal(harness.player.roster.companions.length, 1);
    assert.equal(harness.player.roster.companions[0].instanceId, 'story_marlow');
    assert.equal(harness.player.roster.companions[0].level, 2);

    harness.socket.dispatch('recruitChapterOneNpc', { npcId: 'marlow' });
    const duplicate = harness.socket.lastPayload('adventureReceipt');
    assert.equal(duplicate.success, false);
    assert.equal(harness.player.roster.companions.length, 1);
});

test('watchhouse preparation requires the finale contract and cannot change away from the pub', () => {
    const harness = createHarness({
        playerOverrides: {
            world: {
                contracts: {
                    completed: {
                        ashes_on_the_heath: { count: 1, lastCompletedAt: 100 },
                        false_toll: { count: 1, lastCompletedAt: 200 }
                    }
                }
            }
        }
    });

    harness.socket.dispatch('selectChapterOneFinalePreparation', { optionId: 'warded_approach' });
    assert.equal(harness.socket.lastPayload('adventureReceipt').code, 'FINALE_CONTRACT_INACTIVE');

    harness.socket.dispatch('acceptContract', { contractId: 'watchhouse_reckoning' });
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, true);
    harness.socket.dispatch('selectChapterOneFinalePreparation', { optionId: 'warded_approach' });
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, true);
    assert.equal(
        harness.player.world.chapters.chapter_one.finale.selectedPreparationOptionId,
        'warded_approach'
    );

    harness.socket.dispatch('startExpedition', { routeId: 'route_old_road' });
    delete harness.activeCombats[harness.socket.id];
    harness.socket.dispatch('selectChapterOneFinalePreparation', { optionId: 'side_gate_breach' });
    const away = harness.socket.lastPayload('adventureReceipt');
    assert.equal(away.success, false);
    assert.equal(away.code, 'AWAY_FROM_PUB');
    assert.equal(
        harness.player.world.chapters.chapter_one.finale.selectedPreparationOptionId,
        'warded_approach'
    );
});

test('router resolves noncombat journey choices and completes a distance-three return outside combat rewards', () => {
    const { finalizeCombatVictory } = require('../combatRewards.js');
    const harness = createHarness();

    harness.socket.dispatch('startExpedition', { routeId: 'route_pine_trail' });
    assert.equal(harness.socket.lastPayload('adventureReceipt').combatDeployed, false);
    let current = harness.player.adventure.activeJourney.currentInstance;
    assert.ok(['puzzle', 'npc'].includes(current.type));
    harness.socket.dispatch('resolveJourneyInstance', { optionId: current.options[0].id, pendingGold: 9999 });
    let receipt = harness.socket.lastPayload('adventureReceipt');
    assert.equal(receipt.outcome, 'combat_pending');
    assert.equal(receipt.combatDeployed, false);
    harness.socket.dispatch('continueJourney');
    assert.equal(harness.socket.lastPayload('adventureReceipt').combatDeployed, true);
    const outboundCombat = finalizeCombatVictory(harness.socket.id, {
        activePlayers: harness.activePlayers,
        activeCombats: harness.activeCombats,
        io: harness.io
    });
    assert.equal(outboundCombat.adventureOutcome.outcome, 'destination_reached');
    assert.equal(harness.player.adventure.discoveredLocationIds.includes('pine_trail'), true);

    harness.socket.dispatch('beginExpeditionReturn');
    assert.equal(harness.socket.lastPayload('adventureReceipt').combatDeployed, true);
    const returnCombat = finalizeCombatVictory(harness.socket.id, {
        activePlayers: harness.activePlayers,
        activeCombats: harness.activeCombats,
        io: harness.io
    });
    assert.equal(returnCombat.adventureOutcome.outcome, 'journey_continues');
    current = harness.player.adventure.activeJourney.currentInstance;
    harness.socket.dispatch('resolveJourneyInstance', { optionId: current.options[0].id });
    receipt = harness.socket.lastPayload('adventureReceipt');
    assert.equal(receipt.outcome, 'safe_return');
    assert.equal(receipt.combatDeployed, false);
    assert.equal(harness.player.adventure.activeJourney, null);
    assert.ok(receipt.worldProgress);
    assert.equal(harness.player.adventure.latestReturnReport.rewardGold, receipt.rewardGold);
});
