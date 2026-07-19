const test = require('node:test');
const assert = require('node:assert/strict');

global.atbEngineStarted = true;
const registerCombatRouter = require('../combatRouter.js');

class FakeSocket {
    constructor(id = 'turn-recovery') {
        this.id = id;
        this.handlers = new Map();
        this.emitted = [];
    }

    on(eventName, handler) {
        this.handlers.set(eventName, handler);
    }

    emit(eventName, payload) {
        this.emitted.push({ eventName, payload });
    }

    dispatch(eventName, payload) {
        const handler = this.handlers.get(eventName);
        assert.ok(handler, `Missing socket handler for ${eventName}`);
        handler(payload);
    }

    lastPayload(eventName) {
        const event = [...this.emitted].reverse().find(entry => entry.eventName === eventName);
        return event && event.payload;
    }
}

function createHarness(activeKind = 'companion') {
    const socket = new FakeSocket();
    const player = {
        username: 'Turn Tester',
        hp: 100,
        stamina: activeKind === 'player' ? 10 : 50,
        vitality: 4,
        maxStamina: 2,
        offense: 4,
        defense: 4,
        speed: 4,
        equipment: {},
        inventory: [],
        statusEffects: {},
        activeBuffs: []
    };
    const playerActor = {
        uid: 'player_0', id: 'player', kind: 'player', controller: 'player', teamId: 'PLAYER',
        name: player.username, x: 1, y: 1, hp: 100, maxHp: 100,
        stamina: player.stamina, maxStamina: 50, alive: true, atbCharge: activeKind === 'player' ? 100 : 0
    };
    const companion = {
        uid: 'ally_turn_tester', id: 'companion_marlow', kind: 'companion', controller: 'player_companion',
        teamId: 'PLAYER', name: 'Mira', x: 2, y: 1, hp: 100, maxHp: 100,
        stamina: 10, maxStamina: 50, offense: 3, defense: 3, speed: 3,
        alive: true, atbCharge: activeKind === 'companion' ? 100 : 0, equipment: {}
    };
    const enemy = {
        uid: 'mob_1', kind: 'monster', controller: 'ai_enemy', teamId: 'ENEMY',
        name: 'Target', x: 6, y: 3, hp: 100, maxHp: 100, stamina: 25, maxStamina: 25,
        alive: true, targetable: true, targetableByPlayer: true, targetableByEnemies: false
    };
    const activeActor = activeKind === 'player' ? playerActor : companion;
    const combat = {
        gridSize: { cols: 10, rows: 8 },
        obstacles: [],
        actors: [playerActor, companion, enemy],
        enemies: [],
        allies: [],
        rogues: [],
        player: { x: 1, y: 1, atbCharge: playerActor.atbCharge },
        activeActorUid: activeActor.uid,
        atbPaused: true
    };
    const activePlayers = { [socket.id]: player };
    const activeCombats = { [socket.id]: combat };
    registerCombatRouter(socket, { to: () => ({ emit: () => {} }) }, activePlayers, activeCombats);
    return { socket, player, combat, playerActor, companion, activeActor };
}

test('Pass immediately converts both companion action credits into 30% stamina and ends the turn', () => {
    const harness = createHarness('companion');

    harness.socket.dispatch('dispatchCombatAction', { actionCategory: 'pass' });
    const result = harness.socket.lastPayload('combatResult');

    assert.equal(result.type, 'endTurn');
    assert.equal(result.unusedActionCredits, 2);
    assert.equal(result.recovered, 15);
    assert.equal(harness.companion.stamina, 25);
    assert.equal(harness.companion.atbCharge, 0);
    assert.equal(harness.combat.activeActorUid, null);
    assert.equal(harness.combat.atbPaused, false);
});

test('ending after one Rest converts only the remaining action credit', () => {
    const harness = createHarness('companion');

    harness.socket.dispatch('dispatchCombatAction', { actionCategory: 'rest' });
    const rest = harness.socket.lastPayload('combatResult');
    assert.equal(rest.recovered, 7);
    assert.equal(rest.actionsRemaining, 1);
    assert.equal(harness.companion.stamina, 17);

    harness.socket.dispatch('dispatchCombatAction', { actionCategory: 'endTurn' });
    const ended = harness.socket.lastPayload('combatResult');
    assert.equal(ended.unusedActionCredits, 1);
    assert.equal(ended.recovered, 7);
    assert.equal(harness.companion.stamina, 24);
    assert.equal(harness.combat.activeActorUid, null);
});

test('Pass recovery uses and synchronizes the Knight persistent stamina pool', () => {
    const harness = createHarness('player');

    harness.socket.dispatch('dispatchCombatAction', { actionCategory: 'pass' });
    const result = harness.socket.lastPayload('combatResult');

    assert.equal(result.unusedActionCredits, 2);
    assert.equal(result.recovered, 15);
    assert.equal(harness.player.stamina, 25);
    assert.equal(harness.playerActor.stamina, 25);
    assert.equal(harness.combat.player.atbCharge, 0);
});

test('the legacy endPlayerTurn route applies the same unused-credit recovery', () => {
    const harness = createHarness('companion');

    harness.socket.dispatch('endPlayerTurn', {});

    assert.equal(harness.companion.stamina, 25);
    assert.equal(harness.companion.atbCharge, 0);
    assert.equal(harness.combat.activeActorUid, null);
    assert.equal(harness.combat.atbPaused, false);
});
