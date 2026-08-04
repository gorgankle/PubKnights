const test = require('node:test');
const assert = require('node:assert/strict');

global.atbEngineStarted = true;

const registerCombatRouter = require('../combatRouter.js');
const registerTownRouter = require('../townRouter.js');
const { executeActorTurn } = require('../combatAI.js');
const { activatePartyActor } = require('../combatParties.js');
const { ItemDatabase } = require('../public/js/items.js');

class FakeSocket {
    constructor(id = 'equipment-action-test') {
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
        const event = [...this.emitted]
            .reverse()
            .find(entry => entry.eventName === eventName);
        return event && event.payload;
    }
}

function cloneItem(itemId) {
    return JSON.parse(JSON.stringify(ItemDatabase[itemId]));
}

function createActorHarness(options = {}) {
    const socket = new FakeSocket(options.socketId);
    const playerEquipment = options.playerEquipment || {
        weapon: cloneItem('rusty_mace'),
        offhand: cloneItem('round_shield')
    };
    const companionEquipment = options.companionEquipment || {
        weapon: cloneItem('rusty_mace'),
        offhand: cloneItem('parrying_dagger')
    };
    const player = {
        username: 'Equipment Tester',
        hp: 100,
        stamina: options.playerStamina === undefined
            ? 50
            : options.playerStamina,
        vitality: 4,
        maxStamina: 2,
        offense: 4,
        defense: 4,
        speed: 4,
        equipment: playerEquipment,
        inventory: options.inventory ? [...options.inventory] : [],
        statusEffects: {},
        activeBuffs: []
    };
    const playerActor = {
        uid: 'player_0',
        kind: 'player',
        controller: 'player',
        teamId: 'PLAYER',
        name: 'Equipment Tester',
        x: 2,
        y: 2,
        hp: 100,
        maxHp: 100,
        stamina: player.stamina,
        maxStamina: 50,
        alive: true,
        targetableByEnemies: true,
        targetableByPlayer: false,
        atbCharge: options.activeKind === 'companion' ? 0 : 100
    };
    const companion = {
        uid: 'ally_equipment_mercenary',
        kind: 'companion',
        controller: 'player_companion',
        teamId: 'PLAYER',
        name: 'Mira',
        x: 2,
        y: 3,
        hp: 100,
        maxHp: 100,
        stamina: options.companionStamina === undefined
            ? 50
            : options.companionStamina,
        maxStamina: 50,
        offense: 20,
        defense: 5,
        speed: 4,
        alive: true,
        targetableByEnemies: true,
        targetableByPlayer: false,
        atbCharge: options.activeKind === 'companion' ? 100 : 0,
        equipment: companionEquipment
    };
    const enemy = {
        uid: 'mob_equipment_target',
        id: 'equipment_target',
        kind: 'monster',
        controller: 'ai_enemy',
        teamId: 'ENEMY',
        name: 'Target',
        x: 3,
        y: options.activeKind === 'companion' ? 3 : 2,
        size: 1,
        hp: 1000,
        maxHp: 1000,
        stamina: 25,
        maxStamina: 25,
        offense: 1,
        defense: 1,
        speed: 1,
        alive: true,
        targetable: true,
        targetableByPlayer: true,
        targetableByEnemies: false,
        rewardsEligible: true
    };
    const activeActor = options.activeKind === 'companion'
        ? companion
        : playerActor;
    const combat = {
        gridSize: { cols: 10, rows: 8 },
        obstacles: [],
        actors: [playerActor, companion, enemy],
        player: { x: playerActor.x, y: playerActor.y, atbCharge: playerActor.atbCharge },
        activeActorUid: activeActor.uid,
        atbPaused: true,
        actionsRemaining: 2,
        actionsTaken: 0,
        turnSequence: 1,
        playbackLock: false,
        playbackId: null,
        playbackExpiresAt: 0
    };
    const activePlayers = { [socket.id]: player };
    const activeCombats = { [socket.id]: combat };
    const io = { to: () => ({ emit: () => {} }) };

    registerCombatRouter(socket, io, activePlayers, activeCombats);
    return {
        socket,
        player,
        combat,
        playerActor,
        companion,
        enemy,
        activeActor,
        activePlayers,
        activeCombats,
        io
    };
}

function pinSuccessfulAttack(t) {
    const originalRandom = Math.random;
    Math.random = () => 0.99;
    t.after(() => { Math.random = originalRandom; });
}

test('player shield block ends the turn, holds one guard charge, and locks playback', () => {
    const harness = createActorHarness();

    harness.socket.dispatch('dispatchCombatAction', {
        actorUid: 'spoofed_actor',
        actionCategory: 'equipmentAttack',
        equipmentSlot: 'offhand',
        actionId: 'shield_block',
        itemId: 'round_shield'
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'guard');
    assert.equal(result.actorUid, harness.playerActor.uid);
    assert.equal(result.action.id, 'shield_block');
    assert.equal(result.action.equipmentSlot, 'offhand');
    assert.equal(result.action.itemId, 'round_shield');
    assert.equal(result.action.clipId, 'shield_block');
    assert.equal(result.guarded, true);
    assert.equal(result.actionsRemaining, 0);
    assert.equal(result.turnComplete, true);
    assert.equal(harness.player.stamina, 40);
    assert.equal(harness.playerActor.stamina, 40);
    assert.equal(harness.playerActor.guardState.charges, 1);
    assert.equal(harness.playerActor.atbCharge, 0);
    assert.equal(harness.combat.activeActorUid, null);
    assert.equal(harness.combat.atbPaused, false);
    assert.equal(harness.combat.actionsRemaining, 0);
    assert.match(result.playbackId, /^combat-playback-\d+$/);
    assert.equal(harness.combat.playbackLock, true);
});

test('changing away from a seeded guarding shield clears its actor-local guard', () => {
    const harness = createActorHarness({
        inventory: [cloneItem('hunter_bow')]
    });
    harness.playerActor.guardState = {
        type: 'shield_block',
        charges: 1,
        equipmentSlot: 'offhand',
        itemId: 'round_shield'
    };
    harness.combat.actionsRemaining = 1;
    harness.combat.actionsTaken = 1;
    harness.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'equip',
        invIndex: 0
    });

    const equipReceipt = harness.socket.lastPayload('combatItemReceipt');
    assert.equal(equipReceipt.success, true);
    assert.equal(harness.player.equipment.weapon.id, 'hunter_bow');
    assert.equal(harness.player.equipment.offhand, null);
    assert.equal(harness.playerActor.guardState, undefined);
    assert.equal(harness.combat.actionsRemaining, 0);
});

test('companion Shield Block forfeits its remaining credit without Pass recovery', () => {
    const harness = createActorHarness({
        activeKind: 'companion',
        companionEquipment: {
            weapon: cloneItem('rusty_mace'),
            offhand: cloneItem('round_shield')
        },
        companionStamina: 50
    });
    harness.combat.actionsRemaining = 1;
    harness.combat.actionsTaken = 1;

    harness.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'equipmentAttack',
        equipmentSlot: 'offhand',
        actionId: 'shield_block',
        itemId: 'round_shield'
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'guard');
    assert.equal(result.actorUid, harness.companion.uid);
    assert.equal(result.actionsRemaining, 0);
    assert.equal(result.turnComplete, true);
    assert.equal(harness.companion.stamina, 40);
    assert.equal(harness.companion.guardState.charges, 1);
    assert.equal(harness.combat.activeActorUid, null);
    assert.equal(harness.combat.atbPaused, false);
});

test('shield bash and legacy weapon special carry authoritative action descriptors', async t => {
    await t.test('shield bash', testContext => {
        pinSuccessfulAttack(testContext);
        const harness = createActorHarness();

        harness.socket.dispatch('dispatchCombatAction', {
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'offhand',
            actionId: 'shield_bash',
            itemId: 'round_shield',
            targetEnemy: { uid: harness.enemy.uid }
        });

        const result = harness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'hit');
        assert.equal(result.action.id, 'shield_bash');
        assert.equal(result.action.equipmentSlot, 'offhand');
        assert.equal(result.action.animType, 'shield_bash');
        assert.equal(result.targets[0].uid, harness.enemy.uid);
        assert.ok(result.targets[0].damage >= 1);
        assert.equal(harness.player.stamina, 38);
        assert.equal(harness.combat.actionsRemaining, 1);
    });

    await t.test('legacy weapon special', testContext => {
        pinSuccessfulAttack(testContext);
        const harness = createActorHarness();

        harness.socket.dispatch('dispatchCombatAction', {
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'weapon',
            actionId: 'special',
            itemId: 'rusty_mace',
            targetEnemy: { uid: harness.enemy.uid }
        });

        const result = harness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'hit');
        assert.equal(result.action.id, 'special');
        assert.equal(result.action.equipmentSlot, 'weapon');
        assert.equal(result.action.itemId, 'rusty_mace');
        assert.equal(harness.player.stamina, 35);
        assert.equal(harness.combat.actionsRemaining, 1);
    });
});

test('active mercenary owns offhand strike state despite a spoofed player actor uid', t => {
    pinSuccessfulAttack(t);
    const harness = createActorHarness({ activeKind: 'companion' });

    harness.socket.dispatch('dispatchCombatAction', {
        actorUid: 'player_0',
        actionCategory: 'equipmentAttack',
        equipmentSlot: 'offhand',
        actionId: 'offhand_strike',
        itemId: 'parrying_dagger',
        targetEnemy: { uid: harness.enemy.uid }
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'hit');
    assert.equal(result.actorUid, harness.companion.uid);
    assert.equal(result.action.id, 'offhand_strike');
    assert.equal(result.action.equipmentSlot, 'offhand');
    assert.equal(result.action.itemId, 'parrying_dagger');
    assert.equal(result.action.clipId, 'dual_wield');
    assert.equal(harness.companion.stamina, 38);
    assert.equal(harness.player.stamina, 50);
    assert.equal(harness.combat.actionsRemaining, 1);
});

test('stale, spoofed, unaffordable, and targetless equipment attacks spend nothing', async t => {
    await t.test('wrong slot and spoofed client rules', () => {
        const harness = createActorHarness();
        harness.socket.dispatch('dispatchCombatAction', {
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'weapon',
            actionId: 'shield_bash',
            itemId: 'rusty_mace',
            action: { staminaCost: 0, multiplier: 999 },
            targetEnemy: { uid: harness.enemy.uid }
        });

        const result = harness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'error');
        assert.match(result.message, /no longer available/i);
        assert.equal(result.updatedCombatState, harness.combat);
        assert.equal(harness.player.stamina, 50);
        assert.equal(harness.combat.actionsRemaining, 2);
        assert.equal(harness.enemy.hp, harness.enemy.maxHp);
    });

    await t.test('missing or stale item identity', () => {
        const missingHarness = createActorHarness();
        missingHarness.socket.dispatch('dispatchCombatAction', {
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'offhand',
            actionId: 'shield_bash',
            targetEnemy: { uid: missingHarness.enemy.uid }
        });

        let result = missingHarness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'error');
        assert.match(result.message, /active loadout/i);
        assert.equal(result.updatedCombatState, missingHarness.combat);
        assert.equal(result.newStamina, 50);
        assert.equal(missingHarness.player.stamina, 50);
        assert.equal(missingHarness.combat.actionsRemaining, 2);
        assert.equal(missingHarness.enemy.hp, missingHarness.enemy.maxHp);

        const staleHarness = createActorHarness({
            playerEquipment: {
                weapon: cloneItem('hunter_bow'),
                offhand: cloneItem('round_shield')
            }
        });
        staleHarness.socket.dispatch('dispatchCombatAction', {
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'weapon',
            actionId: 'special',
            itemId: 'rusty_mace',
            targetEnemy: { uid: staleHarness.enemy.uid }
        });

        result = staleHarness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'error');
        assert.match(result.message, /active loadout/i);
        assert.equal(result.updatedCombatState, staleHarness.combat);
        assert.equal(result.newStamina, 50);
        assert.equal(staleHarness.player.stamina, 50);
        assert.equal(staleHarness.combat.actionsRemaining, 2);
        assert.equal(staleHarness.enemy.hp, staleHarness.enemy.maxHp);
    });

    await t.test('insufficient stamina', () => {
        const harness = createActorHarness({ playerStamina: 9 });
        harness.socket.dispatch('dispatchCombatAction', {
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'offhand',
            actionId: 'shield_block',
            itemId: 'round_shield'
        });

        const result = harness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'error');
        assert.match(result.message, /lacks stamina/i);
        assert.equal(harness.player.stamina, 9);
        assert.equal(harness.combat.actionsRemaining, 2);
        assert.equal(harness.playerActor.guardState, undefined);
    });

    await t.test('missing target', () => {
        const harness = createActorHarness();
        harness.socket.dispatch('dispatchCombatAction', {
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'offhand',
            actionId: 'shield_bash',
            itemId: 'round_shield'
        });

        const result = harness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'error');
        assert.match(result.message, /target lost/i);
        assert.equal(result.updatedCombatState, harness.combat);
        assert.equal(result.newStamina, 50);
        assert.equal(result.action.id, 'shield_bash');
        assert.equal(harness.player.stamina, 50);
        assert.equal(harness.combat.actionsRemaining, 2);
        assert.equal(harness.enemy.hp, harness.enemy.maxHp);
    });

    await t.test('out-of-range target', () => {
        const harness = createActorHarness({ activeKind: 'companion' });
        harness.enemy.x = 8;
        harness.enemy.y = 3;
        harness.socket.dispatch('dispatchCombatAction', {
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'offhand',
            actionId: 'offhand_strike',
            itemId: 'parrying_dagger',
            targetEnemy: { uid: harness.enemy.uid }
        });

        const result = harness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'error');
        assert.match(result.message, /out of confirmed range/i);
        assert.equal(result.updatedCombatState, harness.combat);
        assert.equal(result.newStamina, 50);
        assert.equal(result.action.id, 'offhand_strike');
        assert.equal(harness.companion.stamina, 50);
        assert.equal(harness.player.stamina, 50);
        assert.equal(harness.combat.actionsRemaining, 2);
        assert.equal(harness.enemy.hp, harness.enemy.maxHp);
    });

    await t.test('line-of-sight obstruction', () => {
        const harness = createActorHarness({
            playerEquipment: {
                weapon: cloneItem('hunter_bow'),
                offhand: null
            }
        });
        harness.enemy.x = 4;
        harness.enemy.y = 2;
        harness.combat.obstacles = [{ x: 3, y: 2 }];
        harness.socket.dispatch('dispatchCombatAction', {
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'weapon',
            actionId: 'special',
            itemId: 'hunter_bow',
            targetEnemy: { uid: harness.enemy.uid }
        });

        const result = harness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'error');
        assert.match(result.message, /obscured by an obstacle/i);
        assert.equal(result.updatedCombatState, harness.combat);
        assert.equal(result.newStamina, 50);
        assert.equal(result.action.id, 'special');
        assert.equal(harness.player.stamina, 50);
        assert.equal(harness.combat.actionsRemaining, 2);
        assert.equal(harness.enemy.hp, harness.enemy.maxHp);
    });
});

test('one-hit guard is consumed by AI before hit math and expires on the defender next activation', () => {
    const player = {
        username: 'Guard Tester',
        hp: 100,
        stamina: 50,
        vitality: 4,
        maxStamina: 2,
        offense: 4,
        defense: 4,
        speed: 4,
        equipment: {
            weapon: cloneItem('rusty_mace'),
            offhand: cloneItem('round_shield')
        },
        statusEffects: {}
    };
    const defender = {
        uid: 'player_0', kind: 'player', controller: 'player', teamId: 'PLAYER',
        name: 'Guard Tester', x: 2, y: 2, hp: 100, maxHp: 100,
        stamina: 50, maxStamina: 50, alive: true,
        targetableByEnemies: true, targetableByPlayer: false, atbCharge: 0,
        guardState: {
            type: 'shield_block', charges: 1, actionId: 'shield_block',
            equipmentSlot: 'offhand', itemId: 'round_shield'
        }
    };
    const attacker = {
        uid: 'mob_guard_attacker', kind: 'monster', controller: 'ai_enemy', teamId: 'ENEMY',
        name: 'Attacker', type: 'MELEE', x: 3, y: 2, size: 1,
        hp: 100, maxHp: 100, stamina: 5, maxStamina: 5,
        attackStaminaCost: 5, attackRange: 1, offense: 20, defense: 1,
        speed: 1, alive: true, targetableByPlayer: true,
        targetableByEnemies: false
    };
    const combat = {
        gridSize: { cols: 8, rows: 8 }, obstacles: [],
        actors: [defender, attacker],
        player: { x: defender.x, y: defender.y, atbCharge: 0 },
        atbPaused: false,
        turnSequence: 1
    };
    const activeCombats = { guard_ai_test: combat };

    const events = executeActorTurn(
        'guard_ai_test',
        combat,
        player,
        attacker,
        activeCombats,
        () => ({ combatComplete: false })
    );

    assert.equal(events[0].type, 'deflect');
    assert.equal(events[0].deflectReason, 'shield_block');
    assert.equal(events[0].guarded, true);
    assert.equal(events[0].guardEquipmentSlot, 'offhand');
    assert.equal(player.hp, 100);
    assert.equal(defender.guardState, undefined);

    defender.guardState = {
        type: 'shield_block', charges: 1, actionId: 'shield_block'
    };
    defender.atbCharge = 100;
    assert.equal(activatePartyActor(combat, defender), defender);
    assert.equal(defender.guardState, undefined);
    assert.equal(combat.activeActorUid, defender.uid);
});

test('playback lock rejects equipment actions, movement, and legacy end-turn dispatch', () => {
    const harness = createActorHarness({
        activeKind: 'companion',
        playerStamina: 7,
        companionStamina: 42
    });
    harness.combat.playbackLock = true;
    harness.combat.playbackId = 'combat-playback-locked';
    harness.combat.playbackExpiresAt = Date.now() + 60000;

    harness.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'equipmentAttack',
        equipmentSlot: 'offhand',
        actionId: 'offhand_strike',
        itemId: 'parrying_dagger'
    });
    let result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'error');
    assert.match(result.message, /current action/i);
    assert.equal(result.updatedCombatState, harness.combat);
    assert.equal(result.newStamina, 42);
    assert.equal(harness.companion.stamina, 42);
    assert.equal(harness.player.stamina, 7);
    assert.equal(harness.combat.actionsRemaining, 2);

    harness.socket.dispatch('combatMove', { tx: 2, ty: 1 });
    const move = harness.socket.lastPayload('moveReceipt');
    assert.equal(move.success, false);
    assert.match(move.message, /current action/i);
    assert.equal(move.updatedCombatState, harness.combat);

    harness.socket.dispatch('endPlayerTurn', {});
    result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'error');
    assert.equal(result.newStamina, 42);
    assert.equal(harness.combat.activeActorUid, harness.companion.uid);
    assert.equal(harness.combat.actionsRemaining, 2);
});

test('rejected combat equip includes recovery state and town inventory cannot bypass combat', () => {
    const harness = createActorHarness();
    harness.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'equip',
        invIndex: 99
    });

    const combatReceipt = harness.socket.lastPayload('combatItemReceipt');
    assert.equal(combatReceipt.success, false);
    assert.equal(combatReceipt.updatedCombatState, harness.combat);
    assert.equal(harness.combat.actionsRemaining, 2);

    const mercenaryHarness = createActorHarness({
        activeKind: 'companion',
        inventory: [cloneItem('sturdy_boots')]
    });
    mercenaryHarness.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'equip',
        invIndex: 0
    });
    const mercenaryReceipt = mercenaryHarness.socket.lastPayload(
        'combatItemReceipt'
    );
    assert.equal(mercenaryReceipt.success, false);
    assert.equal(
        mercenaryReceipt.updatedCombatState,
        mercenaryHarness.combat
    );

    const outOfTurnHarness = createActorHarness({
        inventory: [cloneItem('sturdy_boots')]
    });
    outOfTurnHarness.combat.atbPaused = false;
    outOfTurnHarness.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'equip',
        invIndex: 0
    });
    const outOfTurnResult = outOfTurnHarness.socket.lastPayload(
        'combatResult'
    );
    assert.equal(outOfTurnResult.type, 'error');
    assert.equal(
        outOfTurnResult.updatedCombatState,
        outOfTurnHarness.combat
    );

    const townSocket = new FakeSocket('town-inventory-lock-test');
    const backpackWeapon = cloneItem('rusty_mace');
    const townPlayer = {
        username: 'Town Lock Tester',
        equipment: { weapon: null, offhand: null },
        inventory: [backpackWeapon],
        stash: [],
        roster: { companions: [], activeIds: [] },
        maxInventorySlots: 5,
        vaultSlots: 10,
        gold: 0
    };
    const townPlayers = { [townSocket.id]: townPlayer };
    const townCombats = { [townSocket.id]: { active: true } };
    registerTownRouter(townSocket, harness.io, townPlayers, townCombats);

    townSocket.dispatch('inventoryAction', {
        action: 'equip',
        index: 0
    });

    const inventoryReceipt = townSocket.lastPayload('inventoryReceipt');
    assert.equal(inventoryReceipt.success, false);
    assert.match(inventoryReceipt.message, /locked during combat/i);
    assert.equal(townPlayer.equipment.weapon, null);
    assert.deepEqual(townPlayer.inventory.map(item => item.id), ['rusty_mace']);
});

test('dagger Evasive Feint ends the turn and the next AI attack consumes only that actor reaction', t => {
    pinSuccessfulAttack(t);
    const harness = createActorHarness({
        playerEquipment: {
            weapon: cloneItem('mimic_fang_dagger'),
            offhand: null
        }
    });

    harness.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'equipmentAttack',
        equipmentSlot: 'weapon',
        actionId: 'special',
        itemId: 'mimic_fang_dagger'
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'guard');
    assert.equal(result.reactionType, 'evade');
    assert.equal(result.evading, true);
    assert.equal(result.turnComplete, true);
    assert.equal(harness.playerActor.guardState, undefined);
    assert.equal(harness.playerActor.evasionState.type, 'evade');
    assert.equal(harness.combat.activeActorUid, null);

    harness.enemy.attackRange = 1;
    harness.enemy.attackStaminaCost = 5;
    const events = executeActorTurn(
        harness.socket.id,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        () => ({ combatComplete: false })
    );
    assert.equal(events[0].type, 'deflect');
    assert.equal(events[0].deflectReason, 'evade_stance');
    assert.equal(events[0].evaded, true);
    assert.equal(harness.playerActor.evasionState, undefined);
    assert.equal(harness.player.hp, 100);
});

test('Driving Thrust forcibly interrupts a heavy intent and pushes the target one clear tile', t => {
    pinSuccessfulAttack(t);
    const harness = createActorHarness({
        playerEquipment: {
            weapon: cloneItem('hunters_spear'),
            offhand: null
        }
    });
    harness.enemy.x = 4;
    harness.enemy.y = 2;
    harness.enemy.pendingIntent = {
        intentId: 'intent_heavy_test',
        actionId: 'crushing_swing',
        label: 'Crushing Swing',
        clipId: 'heavy',
        interruptible: false,
        targetTiles: [{ x: 2, y: 2 }],
        counterplay: ['block', 'reposition']
    };

    harness.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'equipmentAttack',
        equipmentSlot: 'weapon',
        actionId: 'special',
        itemId: 'hunters_spear',
        targetEnemy: { uid: harness.enemy.uid }
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'hit');
    assert.equal(result.action.interruptsIntent, true);
    assert.equal(result.targets[0].interruptedIntent.intentId, 'intent_heavy_test');
    assert.equal(result.targets[0].pushed.x, 5);
    assert.equal(harness.enemy.x, 5);
    assert.equal(harness.enemy.pendingIntent, undefined);
    assert.equal(harness.combat.actionsRemaining, 1);
});

test('Parting Shot withdraws after firing while a blocked retreat stays in place', t => {
    pinSuccessfulAttack(t);
    const harness = createActorHarness({
        playerEquipment: {
            weapon: cloneItem('hunter_bow'),
            offhand: null
        }
    });
    harness.enemy.x = 4;
    harness.enemy.y = 2;

    harness.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'equipmentAttack',
        equipmentSlot: 'weapon',
        actionId: 'special',
        itemId: 'hunter_bow',
        targetEnemy: { uid: harness.enemy.uid }
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'hit');
    assert.deepEqual(result.reposition, {
        fromX: 2,
        fromY: 2,
        x: 1,
        y: 2
    });
    assert.equal(harness.playerActor.x, 1);
    assert.equal(harness.combat.player.x, 1);

    const blocked = createActorHarness({
        playerEquipment: {
            weapon: cloneItem('hunter_bow'),
            offhand: null
        }
    });
    blocked.enemy.x = 4;
    blocked.enemy.y = 2;
    blocked.combat.obstacles = [
        { x: 1, y: 2 },
        { x: 2, y: 1 },
        { x: 2, y: 3 }
    ];
    blocked.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'equipmentAttack',
        equipmentSlot: 'weapon',
        actionId: 'special',
        itemId: 'hunter_bow',
        targetEnemy: { uid: blocked.enemy.uid }
    });
    assert.equal(blocked.socket.lastPayload('combatResult').reposition, null);
    assert.equal(blocked.playerActor.x, 2);
});

test('heavy and channelled staff specials commit the remainder of the turn', t => {
    pinSuccessfulAttack(t);
    for (const caseData of [
        { itemId: 'tankard_maul', enemyX: 3 },
        { itemId: 'apprentice_staff', enemyX: 4 }
    ]) {
        const harness = createActorHarness({
            socketId: `commit_${caseData.itemId}`,
            playerEquipment: {
                weapon: cloneItem(caseData.itemId),
                offhand: null
            }
        });
        harness.enemy.x = caseData.enemyX;
        harness.enemy.y = 2;
        harness.enemy.defense = 999;
        harness.socket.dispatch('dispatchCombatAction', {
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'weapon',
            actionId: 'special',
            itemId: caseData.itemId,
            targetEnemy: { uid: harness.enemy.uid }
        });
        const result = harness.socket.lastPayload('combatResult');
        assert.equal(result.type, 'hit', caseData.itemId);
        assert.equal(result.action.endsTurn, true, caseData.itemId);
        assert.equal(harness.combat.actionsRemaining, 0, caseData.itemId);
        assert.equal(harness.combat.activeActorUid, null, caseData.itemId);
    }
});

test('player attacks consume an enemy shield guard before hit math', () => {
    const harness = createActorHarness();
    harness.enemy.guardState = {
        type: 'shield_block',
        charges: 1,
        actionId: 'shield_block',
        equipmentSlot: 'offhand',
        itemId: 'captains_shield'
    };

    harness.socket.dispatch('dispatchCombatAction', {
        actionCategory: 'weapon',
        subType: 'slash',
        targetEnemy: { uid: harness.enemy.uid }
    });

    const result = harness.socket.lastPayload('combatResult');
    assert.equal(result.type, 'miss');
    assert.equal(result.deflectReason, 'shield_block');
    assert.equal(result.guarded, true);
    assert.equal(harness.enemy.guardState, undefined);
    assert.equal(harness.enemy.hp, harness.enemy.maxHp);
});
