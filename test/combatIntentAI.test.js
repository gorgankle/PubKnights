const test = require('node:test');
const assert = require('node:assert/strict');

const { executeActorTurn } = require('../combatAI.js');
const {
    AI_PROFILE_CATALOG,
    getActorAiProfile,
    prepareActorIntent,
    canResolveActorIntent,
    interruptActorIntent,
    consumeActorReaction
} = require('../combatIntents.js');
const { createEnemy } = require('../public/js/npc-database.js');

function makePlayer(overrides = {}) {
    return {
        username: 'Intent Tester',
        hp: 100,
        maxHp: 100,
        stamina: 50,
        maxStamina: 50,
        vitality: 4,
        offense: 4,
        defense: 4,
        speed: 4,
        equipment: {},
        activeBuffs: [],
        statusEffects: {},
        ...overrides
    };
}

function makePlayerActor(overrides = {}) {
    return {
        uid: 'player_0',
        id: 'player',
        kind: 'player',
        controller: 'player',
        teamId: 'PLAYER',
        partyId: 'PLAYER',
        name: 'Intent Tester',
        x: 1,
        y: 3,
        size: 1,
        hp: 100,
        maxHp: 100,
        stamina: 50,
        maxStamina: 50,
        alive: true,
        targetable: true,
        targetableByEnemies: true,
        targetableByPlayer: false,
        blocksMovement: true,
        ...overrides
    };
}

function makeEnemy(overrides = {}) {
    return {
        uid: 'mob_0',
        id: 'melee_bandit',
        kind: 'monster',
        controller: 'ai_enemy',
        teamId: 'ENEMY',
        partyId: 'ENEMY',
        name: 'Enemy',
        type: 'MELEE',
        x: 3,
        y: 3,
        size: 1,
        hp: 100,
        maxHp: 100,
        stamina: 25,
        maxStamina: 25,
        attackStaminaCost: 5,
        attackRange: 1,
        offense: 5,
        defense: 2,
        speed: 3,
        alive: true,
        targetable: true,
        targetableByEnemies: false,
        targetableByPlayer: true,
        blocksMovement: true,
        ...overrides
    };
}

function makeHarness(enemyOverrides = {}, playerActorOverrides = {}) {
    const player = makePlayer();
    const playerActor = makePlayerActor(playerActorOverrides);
    const enemy = makeEnemy(enemyOverrides);
    const combat = {
        gridSize: { cols: 10, rows: 8 },
        obstacles: [],
        actors: [playerActor, enemy],
        turnSequence: 0,
        nextIntentId: 0
    };
    return {
        socketId: 'intent_test',
        player,
        playerActor,
        enemy,
        combat,
        activeCombats: { intent_test: combat },
        onDefeat() { return { combatComplete: false }; }
    };
}

test('production humanoids carry server-owned AI roles independently of visuals', () => {
    const expected = {
        melee_bandit: 'melee_pursuer',
        bandit_archer: 'ranged_skirmisher',
        hedge_mage: 'telegraph_caster',
        harvest_champion: 'polearm_pursuer',
        shield_guard_captain: 'shield_guard',
        cellar_duelist: 'agile_duelist',
        tankard_brute: 'heavy_telegraph',
        cult_champion: 'scythe_telegraph',
        alpha_poacher: 'ranged_skirmisher'
    };

    for (const [enemyId, profileId] of Object.entries(expected)) {
        const enemy = createEnemy(enemyId, 2, 2);
        assert.equal(enemy.aiProfileId, profileId, enemyId);
        assert.equal(getActorAiProfile(enemy).id, profileId, enemyId);
        assert.ok(AI_PROFILE_CATALOG[profileId]);
    }
    assert.equal(
        getActorAiProfile({ aiProfileId: 'not_a_real_profile' }).id,
        'melee_pursuer'
    );
});

test('actor-local intents use unique ids and require a later manual turn sequence', () => {
    const harness = makeHarness();
    const second = makeEnemy({ uid: 'mob_1', x: 4 });
    harness.combat.actors.push(second);
    const intentProfile = AI_PROFILE_CATALOG.telegraph_caster.intent;

    const firstIntent = prepareActorIntent(
        harness.combat,
        harness.enemy,
        harness.playerActor,
        intentProfile
    );
    const secondIntent = prepareActorIntent(
        harness.combat,
        second,
        harness.playerActor,
        intentProfile
    );

    assert.notEqual(firstIntent.intentId, secondIntent.intentId);
    assert.notEqual(harness.enemy.pendingIntent, second.pendingIntent);
    assert.equal(canResolveActorIntent(harness.combat, harness.enemy), false);
    harness.combat.turnSequence++;
    assert.equal(canResolveActorIntent(harness.combat, harness.enemy), true);
    assert.equal(canResolveActorIntent(harness.combat, second), true);
});

test('interruptions clear only interruptible intents after real direct damage', () => {
    const harness = makeHarness();
    const channel = prepareActorIntent(
        harness.combat,
        harness.enemy,
        harness.playerActor,
        AI_PROFILE_CATALOG.telegraph_caster.intent
    );

    assert.equal(interruptActorIntent(harness.enemy, { damage: 0 }), null);
    assert.ok(harness.enemy.pendingIntent);
    assert.equal(
        interruptActorIntent(harness.enemy, { damage: 5, damageOverTime: true }),
        null
    );
    assert.ok(harness.enemy.pendingIntent);

    const interruption = interruptActorIntent(harness.enemy, {
        damage: 5,
        sourceActor: harness.playerActor
    });
    assert.equal(interruption.intentId, channel.intentId);
    assert.equal(interruption.interruptedByUid, 'player_0');
    assert.equal(harness.enemy.pendingIntent, undefined);

    prepareActorIntent(
        harness.combat,
        harness.enemy,
        harness.playerActor,
        AI_PROFILE_CATALOG.heavy_telegraph.intent
    );
    assert.equal(interruptActorIntent(harness.enemy, { damage: 50 }), null);
    assert.ok(harness.enemy.pendingIntent);
    const forced = interruptActorIntent(harness.enemy, {
        damage: 1,
        sourceActor: harness.playerActor,
        interruptsIntent: true
    });
    assert.equal(forced.interruptionReason, 'damage');
    assert.equal(harness.enemy.pendingIntent, undefined);
});

test('one-charge shield and evade reactions are actor-local and consumed once', () => {
    const defender = makePlayerActor({
        guardState: { type: 'shield_block', charges: 1, actionId: 'shield_block' },
        evasionState: { type: 'evasion', charges: 1, actionId: 'dagger_evade' }
    });

    const block = consumeActorReaction(defender);
    assert.equal(block.type, 'shield_block');
    assert.equal(defender.guardState, undefined);
    assert.ok(defender.evasionState);

    const evade = consumeActorReaction(defender, { blockable: false });
    assert.equal(evade.type, 'evade');
    assert.equal(defender.evasionState, undefined);
    assert.equal(consumeActorReaction(defender), null);
});

test('hedge mage channels without immediate damage and movement leaves the marked tile safe', () => {
    const harness = makeHarness({
        id: 'hedge_mage',
        name: 'Hedge Mage',
        type: 'RANGED',
        x: 5,
        attackRange: 5,
        aiProfileId: 'telegraph_caster',
        spellFx: { type: 'beam', style: 'arcane' }
    });

    const prepared = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(prepared.length, 1);
    assert.equal(prepared[0].type, 'intent');
    assert.equal(prepared[0].intent.clipId, 'cast');
    assert.deepEqual(prepared[0].intent.targetTiles, [{ x: 1, y: 3 }]);
    assert.equal(harness.player.hp, 100);

    const tooSoon = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.deepEqual(tooSoon, []);
    assert.ok(harness.enemy.pendingIntent);

    harness.combat.turnSequence++;
    harness.playerActor.y = 2;
    const avoided = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(avoided.length, 1);
    assert.equal(avoided[0].type, 'intentOutcome');
    assert.equal(avoided[0].outcome, 'avoided');
    assert.equal(avoided[0].reason, 'target_repositioned');
    assert.equal(harness.player.hp, 100);
    assert.equal(harness.enemy.pendingIntent, undefined);
});

test('telegraphed heavy attacks honor an already-raised shield on resolution', () => {
    const harness = makeHarness({
        id: 'tankard_brute',
        name: 'Tankard Brute',
        x: 2,
        attackRange: 1,
        aiProfileId: 'heavy_telegraph'
    }, {
        guardState: {
            type: 'shield_block',
            charges: 1,
            actionId: 'shield_block',
            equipmentSlot: 'offhand',
            itemId: 'round_shield'
        }
    });

    const prepared = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(prepared[0].type, 'intent');
    harness.combat.turnSequence++;

    const resolved = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].type, 'deflect');
    assert.equal(resolved[0].deflectReason, 'shield_block');
    assert.equal(resolved[0].telegraphed, true);
    assert.equal(resolved[0].intentId, prepared[0].intent.intentId);
    assert.equal(harness.player.hp, 100);
    assert.equal(harness.playerActor.guardState, undefined);
    assert.equal(harness.enemy.pendingIntent, undefined);
});

test('shield captains visibly guard on alternating activations', () => {
    const harness = makeHarness({
        id: 'shield_guard_captain',
        name: 'Guard Captain',
        x: 2,
        aiProfileId: 'shield_guard'
    });

    const guardEvents = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(guardEvents.length, 1);
    assert.equal(guardEvents[0].type, 'guard');
    assert.equal(guardEvents[0].clipId, 'shield_block');
    assert.equal(harness.enemy.guardState.charges, 1);
    assert.equal(harness.enemy.stamina, 20);

    const attackEvents = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(harness.enemy.guardState, undefined);
    assert.equal(attackEvents.some(event => event.type === 'guard'), false);
    assert.ok(attackEvents.length > 0);
});

test('ranged skirmishers seek distance before taking a shot', () => {
    const harness = makeHarness({
        id: 'bandit_archer',
        name: 'Bandit Archer',
        type: 'RANGED',
        x: 2,
        attackRange: 5,
        aiProfileId: 'ranged_skirmisher',
        projectileSprite: 'icon_arrow'
    });

    const events = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(events[0].type, 'move');
    assert.ok(harness.enemy.x >= 4);
    assert.ok(events.some(event => ['hit', 'deflect'].includes(event.type)));
});
