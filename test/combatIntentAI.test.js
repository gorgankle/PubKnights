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
const { NpcDatabase, createEnemy } = require('../public/js/npc-database.js');

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
        chapter_one_shield_captain: 'chapter_one_shield_captain',
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

test('Chapter One captain reuses the guard-captain rig without replacing the legacy fallback', () => {
    const captain = createEnemy('chapter_one_shield_captain', 4, 3);
    assert.equal(captain.id, 'chapter_one_shield_captain');
    assert.equal(captain.visualProfileId, 'shield_guard_captain');
    assert.equal(captain.aiProfileId, 'chapter_one_shield_captain');
    assert.equal(captain.size, 1);
    assert.equal(captain.hp, 72);
    assert.equal(captain.offense, 2);
    assert.equal(captain.defense, 4);

    assert.equal(NpcDatabase.shield_guard_captain.aiProfileId, 'shield_guard');
    assert.equal(NpcDatabase.shield_guard_captain.hp, 220);
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
    assert.equal(firstIntent.damageMultiplier, 1.5);
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
    assert.equal(prepared[0].intent.targetShape, 'line');
    assert.equal(prepared[0].intent.effectType, 'area_damage');
    assert.equal(prepared[0].intent.hazardType, 'fire');
    assert.equal(prepared[0].intent.hazardous, true);
    assert.deepEqual(prepared[0].intent.targetTiles, [
        { x: 4, y: 3 },
        { x: 3, y: 3 },
        { x: 2, y: 3 },
        { x: 1, y: 3 },
        { x: 0, y: 3 }
    ]);
    assert.deepEqual(
        prepared[0].affectedTiles,
        prepared[0].intent.targetTiles
    );
    assert.match(prepared[0].accessibilityLabel, /marked line attack/i);
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

test('Hedge Fire resolves once across every opposing actor left in its projected line', t => {
    const originalRandom = Math.random;
    Math.random = () => 0.99;
    t.after(() => { Math.random = originalRandom; });

    const harness = makeHarness({
        id: 'hedge_mage',
        name: 'Hedge Mage',
        type: 'RANGED',
        x: 5,
        attackRange: 5,
        aiProfileId: 'telegraph_caster',
        spellFx: { type: 'beam', style: 'fire' }
    });
    harness.player.speed = 1;
    harness.player.defense = 1;
    const companion = makePlayerActor({
        uid: 'ally_line_target',
        id: 'companion',
        kind: 'companion',
        controller: 'player_companion',
        name: 'Line Ally',
        x: 2,
        y: 3,
        hp: 100,
        maxHp: 100,
        offense: 2,
        defense: 1,
        speed: 1
    });
    harness.combat.actors.push(companion);

    const prepared = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(prepared[0].intent.affectedTileCount, 5);

    harness.combat.turnSequence++;
    const resolved = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );

    assert.equal(resolved.length, 2);
    assert.deepEqual(
        resolved.map(event => event.type).sort(),
        ['actorHit', 'hit']
    );
    assert.ok(harness.player.hp < 100);
    assert.ok(companion.hp < 100);
    assert.equal(harness.enemy.stamina, 20);
    resolved.forEach(event => {
        assert.equal(event.telegraphed, true);
        assert.equal(event.intentTargetShape, 'line');
        assert.match(event.intentEffectSummary, /every opposing actor/i);
        assert.match(event.intentAccessibilityLabel, /marked line attack/i);
    });
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

test('powerful intents apply their explicit damage multiplier after mitigation', t => {
    const originalRandom = Math.random;
    Math.random = () => 0.99;
    t.after(() => { Math.random = originalRandom; });

    const harness = makeHarness({
        id: 'tankard_brute',
        name: 'Tankard Brute',
        x: 2,
        attackRange: 1,
        aiProfileId: 'heavy_telegraph'
    });

    const prepared = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(prepared[0].intent.damageMultiplier, 1.5);

    harness.combat.turnSequence++;
    const resolved = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );

    assert.equal(resolved[0].type, 'hit');
    assert.equal(resolved[0].damage, 15);
    assert.equal(harness.player.hp, 85);
});

test('the hostile scythe telegraph is honestly named as a single strike', () => {
    const intent = AI_PROFILE_CATALOG.scythe_telegraph.intent;
    assert.equal(intent.actionId, 'reaping_strike');
    assert.equal(intent.label, 'Reaping Strike');
    assert.equal(intent.damageMultiplier, 1.5);
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

test('Chapter One captain cycles readable defense, bash, and real area sweep actions', t => {
    const originalRandom = Math.random;
    Math.random = () => 0.99;
    t.after(() => { Math.random = originalRandom; });

    const harness = makeHarness({
        id: 'chapter_one_shield_captain',
        name: 'False Toll Shield Captain',
        x: 2,
        y: 3,
        hp: 72,
        maxHp: 72,
        stamina: 35,
        maxStamina: 35,
        attackRange: 1,
        offense: 2,
        defense: 4,
        speed: 2,
        aiProfileId: 'chapter_one_shield_captain'
    });
    harness.player.speed = 1;
    harness.player.defense = 1;
    const companion = makePlayerActor({
        uid: 'ally_captain_sweep_target',
        id: 'companion',
        kind: 'companion',
        controller: 'player_companion',
        name: 'Shieldmate',
        x: 1,
        y: 2,
        hp: 100,
        maxHp: 100,
        offense: 2,
        defense: 1,
        speed: 1
    });
    harness.combat.actors.push(companion);

    const defended = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(defended[0].type, 'guard');
    assert.equal(defended[0].actionName, 'Hold the Line');
    assert.match(defended[0].effectSummary, /blocks the next/i);
    assert.match(defended[0].accessibilityLabel, /captain is defending/i);
    assert.equal(harness.enemy.guardState.charges, 1);

    const bashPrepared = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(bashPrepared[0].type, 'intent');
    assert.equal(bashPrepared[0].intent.actionId, 'captains_bash');
    assert.equal(bashPrepared[0].intent.targetShape, 'single');
    assert.match(bashPrepared[0].intent.accessibilityLabel, /one marked target/i);

    harness.combat.turnSequence++;
    const bashResolved = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.ok(bashResolved.some(event => ['hit', 'deflect'].includes(event.type)));

    const sweepPrepared = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(sweepPrepared[0].type, 'intent');
    assert.equal(sweepPrepared[0].intent.actionId, 'sweeping_rebuke');
    assert.equal(sweepPrepared[0].intent.targetShape, 'radius');
    assert.equal(sweepPrepared[0].intent.radius, 1);
    assert.equal(sweepPrepared[0].intent.targetTiles.length, 9);
    assert.match(sweepPrepared[0].intent.effectSummary, /every opposing actor/i);

    harness.combat.turnSequence++;
    const sweepResolved = executeActorTurn(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.activeCombats,
        harness.onDefeat
    );
    assert.equal(sweepResolved.length, 2);
    assert.deepEqual(
        sweepResolved.map(event => event.type).sort(),
        ['actorHit', 'hit']
    );
    assert.ok(harness.player.hp < 100);
    assert.ok(companion.hp < 100);
    assert.equal(harness.enemy.stamina, 20);
    sweepResolved.forEach(event => {
        assert.equal(event.intentTargetShape, 'radius');
        assert.match(event.intentAccessibilityLabel, /3 by 3 area/i);
    });
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
