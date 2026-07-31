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
        pet: { adopted: false, level: 1 },
        ...overrides
    };
}

function createHarness({ registerCombat = false, activeCombat = null } = {}) {
    const socket = new FakeSocket();
    const io = createIo(socket);
    const player = makePlayer();
    const activePlayers = { [socket.id]: player };
    const activeCombats = {};
    if (activeCombat) activeCombats[socket.id] = activeCombat;

    const registerAdventureRouter = require('../adventureRouter.js');
    registerAdventureRouter(socket, io, activePlayers, activeCombats);
    if (registerCombat) {
        const registerCombatRouter = require('../combatRouter.js');
        registerCombatRouter(socket, io, activePlayers, activeCombats);
    }

    return { socket, io, player, activePlayers, activeCombats };
}

test('adventure state is server-authored and starting a route deploys its resolved encounter after state receipts', () => {
    const harness = createHarness();

    harness.socket.dispatch('requestAdventureState');
    const initial = harness.socket.lastPayload('adventureState');
    assert.equal(initial.schemaVersion, 1);
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

test('an active expedition blocks the legacy level selector deployment', () => {
    const harness = createHarness({ registerCombat: true });
    harness.socket.dispatch('startExpedition', { routeId: 'route_old_road' });
    const authoredCombat = harness.activeCombats[harness.socket.id];

    harness.socket.dispatch('deployToCombat', {
        zoneChoice: 'WILDERNESS',
        activeLevel: 1
    });

    const receipt = harness.socket.lastPayload('adventureReceipt');
    assert.equal(receipt.action, 'legacyDeploy');
    assert.equal(receipt.success, false);
    assert.equal(receipt.code, 'ACTIVE_JOURNEY');
    assert.equal(harness.activeCombats[harness.socket.id], authoredCombat);
});

test('fleeing fails only the active journey and exposes its authoritative outcome', () => {
    const { hasActiveJourney } = require('../adventureState.js');
    const harness = createHarness({ registerCombat: true });

    harness.socket.dispatch('acceptBounty', { bountyId: 'old_road_goods' });
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
    assert.equal(
        JSON.stringify(result.adventureState).includes('old_road_goods'),
        true,
        'fleeing erased accepted contract progress'
    );
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

test('bounty commands accept identifiers only and reject an unearned claim', () => {
    const harness = createHarness();
    const startingGold = harness.player.gold;

    harness.socket.dispatch('acceptBounty', {
        bountyId: 'old_road_goods',
        rewardGold: 999999,
        targetRoundTrips: 0
    });
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, true);
    assert.equal(harness.player.gold, startingGold);

    harness.socket.dispatch('claimBounty', {
        bountyId: 'old_road_goods',
        rewardGold: 999999
    });
    const claim = harness.socket.lastPayload('adventureReceipt');
    assert.equal(claim.success, false);
    assert.equal(harness.player.gold, startingGold);

    harness.socket.dispatch('acceptBounty', { bountyId: 'not_a_real_bounty' });
    assert.equal(harness.socket.lastPayload('adventureReceipt').success, false);
});

test('shared combat defeat fails the journey while preserving accepted bounty progress', () => {
    const {
        acceptBounty,
        beginExpedition,
        hasActiveJourney
    } = require('../adventureState.js');
    const { applyPlayerCombatDefeat } = require('../combatDefeat.js');
    const player = makePlayer();

    assert.equal(acceptBounty(player, 'old_road_goods').success, true);
    assert.equal(beginExpedition(player, 'route_old_road', { random: () => 0 }).success, true);
    assert.equal(hasActiveJourney(player), true);

    applyPlayerCombatDefeat(player);

    assert.equal(hasActiveJourney(player), false);
    assert.equal(player.adventure.routeStats.route_old_road.failedTrips, 1);
    assert.equal(player.adventure.contracts.active.old_road_goods.progress, 0);
});
