const test = require('node:test');
const assert = require('node:assert/strict');

global.atbEngineStarted = true;
const registerCombatRouter = require('../combatRouter.js');

class FakeSocket {
    constructor(id) {
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
        const match = [...this.emitted].reverse().find(event => event.eventName === eventName);
        return match && match.payload;
    }
}

function makeWeapon(standard, special = null) {
    return {
        id: 'test_weapon',
        name: 'Test Weapon',
        slot: 'weapon',
        offense: 1,
        spriteId: 'test_weapon',
        combat: { standard, special }
    };
}

function createHarness({ weapon, inventory = [], enemies = null }) {
    const socket = new FakeSocket('actor-dispatch-test');
    const player = {
        username: 'Tester',
        hp: 100,
        stamina: 25,
        vitality: 4,
        offense: 4,
        defense: 4,
        speed: 4,
        equipment: { weapon: null },
        inventory: [...inventory],
        statusEffects: {},
        activeBuffs: []
    };
    const playerActor = {
        uid: 'player_0',
        kind: 'player',
        controller: 'player',
        teamId: 'PLAYER',
        name: 'Tester',
        x: 1,
        y: 1,
        hp: 100,
        maxHp: 100,
        stamina: 25,
        maxStamina: 25,
        alive: true,
        targetableByPlayer: false,
        targetableByEnemies: true,
        atbCharge: 0
    };
    const companion = {
        uid: 'ally_mercenary_1',
        kind: 'companion',
        controller: 'player_companion',
        teamId: 'PLAYER',
        name: 'Mira',
        x: 2,
        y: 2,
        hp: 100,
        maxHp: 100,
        stamina: 50,
        maxStamina: 50,
        offense: 20,
        defense: 5,
        speed: 4,
        alive: true,
        targetableByPlayer: false,
        targetableByEnemies: true,
        atbCharge: 100,
        equipment: { weapon }
    };
    const defaultEnemy = {
        uid: 'enemy_1',
        kind: 'monster',
        controller: 'ai_enemy',
        teamId: 'ENEMY',
        name: 'Target',
        x: 4,
        y: 2,
        size: 1,
        hp: 10000,
        maxHp: 10000,
        offense: 1,
        defense: 1,
        speed: 1,
        alive: true,
        targetable: true,
        targetableByPlayer: true,
        targetableByEnemies: false,
        rewardsEligible: true
    };
    const combat = {
        gridSize: { cols: 10, rows: 8 },
        obstacles: [],
        actors: [playerActor, companion, ...(enemies || [defaultEnemy])],
        player: { x: 1, y: 1, atbCharge: 0 },
        activeActorUid: companion.uid,
        atbPaused: true,
        playbackLock: false
    };
    const activePlayers = { [socket.id]: player };
    const activeCombats = { [socket.id]: combat };
    const io = { to: () => ({ emit: () => {} }) };

    registerCombatRouter(socket, io, activePlayers, activeCombats);
    return { socket, player, combat, companion, activeCombats, enemies: combat.actors.filter(actor => actor.teamId === 'ENEMY') };
}

function pinRandom(t) {
    const originalRandom = Math.random;
    Math.random = () => 0.99;
    t.after(() => { Math.random = originalRandom; });
}

test('dispatchCombatAction uses the active companion weapon despite a spoofed actor uid', t => {
    pinRandom(t);
    const weapon = makeWeapon({ range: 1, staminaCost: 5, multiplier: 1 });
    const harness = createHarness({ weapon });
    harness.companion.x = 3;

    harness.socket.dispatch('dispatchCombatAction', {
        actorUid: 'player_0',
        actionCategory: 'weapon',
        subType: 'slash',
        targetEnemy: { uid: harness.enemies[0].uid }
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'hit');
    assert.equal(result.actorUid, harness.companion.uid);
    assert.equal(result.fx.sourceUid, harness.companion.uid);
    assert.equal(harness.companion.stamina, 45);
    assert.equal(harness.player.stamina, 25);
    assert.ok(harness.enemies[0].hp < harness.enemies[0].maxHp);
});

test('a companion killing blow completes the encounter through the shared resolver', t => {
    pinRandom(t);
    const weapon = makeWeapon({ range: 1, staminaCost: 5, multiplier: 1 });
    const harness = createHarness({ weapon });
    harness.companion.x = 3;
    harness.enemies[0].hp = 1;
    harness.enemies[0].maxHp = 1;

    harness.socket.dispatch('dispatchCombatAction', {
        actorUid: 'player_0',
        actionCategory: 'weapon',
        subType: 'slash',
        targetEnemy: { uid: harness.enemies[0].uid }
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'hit');
    assert.equal(result.combatComplete, true);
    assert.equal(result.updatedCombatState, null);
    assert.equal(harness.activeCombats[harness.socket.id], undefined);
    assert.equal(harness.enemies[0].defeatedBy.uid, harness.companion.uid);
});

test('dispatchCombatAction applies a shared-backpack consumable to the active companion', () => {
    const stout = {
        id: 'stout',
        name: 'Combat Stout',
        combat: { actionType: 'heal', healPercent: 0.4, staminaCost: 0 }
    };
    const weapon = makeWeapon({ range: 1, staminaCost: 5, multiplier: 1 });
    const harness = createHarness({ weapon, inventory: [stout] });
    harness.companion.hp = 20;

    harness.socket.dispatch('dispatchCombatAction', {
        actorUid: 'player_0',
        actionCategory: 'consumable',
        invIndex: 0
    });

    const receipt = harness.socket.lastPayload('combatItemReceipt');
    assert.equal(receipt.success, true);
    assert.equal(receipt.actorUid, harness.companion.uid);
    assert.equal(harness.companion.hp, 60);
    assert.equal(harness.player.hp, 100);
    assert.equal(harness.player.inventory.length, 0);
});

test('a companion staff can resolve single-target and area spells', async t => {
    pinRandom(t);

    await t.test('single target', () => {
        const weapon = makeWeapon({ actionType: 'spell', spellId: 'arcane_bolt', range: 5, staminaCost: 6, multiplier: 1 });
        const harness = createHarness({ weapon });

        harness.socket.dispatch('dispatchCombatAction', {
            actorUid: 'player_0',
            actionCategory: 'weapon',
            subType: 'slash',
            targetEnemy: { uid: harness.enemies[0].uid }
        });

        const result = harness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'hit');
        assert.equal(result.actorUid, harness.companion.uid);
        assert.equal(result.targets.length, 1);
        assert.equal(harness.companion.stamina, 44);
    });

    await t.test('area target', () => {
        const weapon = makeWeapon(
            { range: 1, staminaCost: 5, multiplier: 1 },
            { actionType: 'spell', spellId: 'storm_burst', targetType: 'aoe', range: 4, staminaCost: 28, multiplier: 1 }
        );
        const enemies = [
            {
                uid: 'enemy_1', kind: 'monster', controller: 'ai_enemy', teamId: 'ENEMY', name: 'Target One',
                x: 4, y: 2, size: 1, hp: 10000, maxHp: 10000, defense: 1, speed: 1, alive: true,
                targetable: true, targetableByPlayer: true, targetableByEnemies: false, rewardsEligible: true
            },
            {
                uid: 'enemy_2', kind: 'monster', controller: 'ai_enemy', teamId: 'ENEMY', name: 'Target Two',
                x: 4, y: 3, size: 1, hp: 10000, maxHp: 10000, defense: 1, speed: 1, alive: true,
                targetable: true, targetableByPlayer: true, targetableByEnemies: false, rewardsEligible: true
            }
        ];
        const harness = createHarness({ weapon, enemies });

        harness.socket.dispatch('dispatchCombatAction', {
            actorUid: 'player_0',
            actionCategory: 'weapon',
            subType: 'special',
            tx: 4,
            ty: 2
        });

        const result = harness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'hit');
        assert.equal(result.actorUid, harness.companion.uid);
        assert.equal(result.targets.length, 2);
        assert.equal(harness.companion.stamina, 22);
    });
});

test('pass atomically ends the active companion turn and ignores a spoofed actor uid', () => {
    const weapon = makeWeapon({ range: 1, staminaCost: 5, multiplier: 1 });
    const harness = createHarness({ weapon });
    harness.companion.stamina = 10;

    harness.socket.dispatch('dispatchCombatAction', {
        actorUid: 'player_0',
        actionCategory: 'pass'
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'pass');
    assert.equal(result.actorUid, harness.companion.uid);
    assert.equal(result.recovered, 7);
    assert.equal(harness.companion.stamina, 17);
    assert.equal(harness.companion.atbCharge, 0);
    assert.equal(harness.combat.activeActorUid, null);
    assert.equal(harness.combat.atbPaused, false);
    assert.equal(result.updatedCombatState.activeActorUid, null);
});

test('pass atomically ends the player actor turn', () => {
    const weapon = makeWeapon({ range: 1, staminaCost: 5, multiplier: 1 });
    const harness = createHarness({ weapon });
    const playerActor = harness.combat.actors.find(actor => actor.uid === 'player_0');
    harness.player.maxStamina = 2;
    harness.player.stamina = 10;
    playerActor.atbCharge = 100;
    harness.combat.player.atbCharge = 100;
    harness.combat.activeActorUid = playerActor.uid;

    harness.socket.dispatch('dispatchCombatAction', {
        actorUid: harness.companion.uid,
        actionCategory: 'pass'
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'pass');
    assert.equal(result.actorUid, playerActor.uid);
    assert.equal(result.recovered, 7);
    assert.equal(harness.player.stamina, 17);
    assert.equal(playerActor.atbCharge, 0);
    assert.equal(harness.combat.player.atbCharge, 0);
    assert.equal(harness.combat.activeActorUid, null);
    assert.equal(harness.combat.atbPaused, false);
});
