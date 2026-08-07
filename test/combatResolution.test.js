const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveActorDefeat } = require('../combatResolution.js');
const { createCombatEncounter } = require('../combatEncounters.js');
const { applyPoison, tickPoison } = require('../combatStatus.js');

function makePlayer(overrides = {}) {
    return {
        username: 'Resolver Tester',
        hp: 100,
        stamina: 25,
        vitality: 4,
        offense: 4,
        defense: 4,
        speed: 4,
        gold: 0,
        xp: 0,
        pendingGold: 0,
        pendingXp: 0,
        pendingLoot: [],
        wildernessLevel: 1,
        equipment: {},
        inventory: [],
        statusEffects: {},
        activeBuffs: [],
        ...overrides
    };
}

function makeEnemy(index) {
    return {
        uid: `enemy_${index}`,
        id: `test_enemy_${index}`,
        kind: 'monster',
        controller: 'ai_enemy',
        teamId: 'ENEMY',
        name: `Target ${index}`,
        x: 5 + index,
        y: 2,
        size: 1,
        hp: 10,
        maxHp: 10,
        stamina: 0,
        maxStamina: 0,
        offense: 1,
        defense: 1,
        speed: 1,
        alive: true,
        targetable: true,
        targetableByPlayer: true,
        targetableByEnemies: false,
        rewardsEligible: true,
        atbCharge: 0
    };
}

function createContext({ enemyCount = 1, playerOverrides = {} } = {}) {
    const socketId = 'resolver-test';
    const player = makePlayer(playerOverrides);
    const playerActor = {
        uid: 'player_0',
        id: 'player',
        kind: 'player',
        controller: 'player',
        teamId: 'PLAYER',
        name: player.username,
        x: 1,
        y: 1,
        hp: player.hp,
        maxHp: player.hp,
        stamina: player.stamina,
        maxStamina: player.stamina,
        alive: true,
        targetableByPlayer: false,
        targetableByEnemies: true,
        atbCharge: 0
    };
    const enemies = Array.from({ length: enemyCount }, (_, index) => makeEnemy(index + 1));
    const combat = {
        zone: 'WILDERNESS',
        activeLevel: 1,
        gridSize: { cols: 10, rows: 8 },
        tileSize: 60,
        floorTiles: [],
        obstacles: [],
        actors: [playerActor, ...enemies],
        enemies: [],
        allies: [],
        rogues: [],
        player: { x: 1, y: 1, atbCharge: 0 },
        atbPaused: true,
        activeActorUid: 'player_0'
    };
    const emitted = [];
    const activePlayers = { [socketId]: player };
    const activeCombats = { [socketId]: combat };
    const io = {
        to: () => ({
            emit: (eventName, payload) => emitted.push({ eventName, payload })
        })
    };

    return {
        socketId,
        player,
        combat,
        enemies,
        emitted,
        context: { activePlayers, activeCombats, io }
    };
}

const defeatSources = [
    { label: 'player', source: { uid: 'player_0', name: 'Knight', kind: 'player' }, cause: 'weapon' },
    { label: 'mercenary', source: { uid: 'ally_merc_1', name: 'Mira', kind: 'companion' }, cause: 'weapon' },
    { label: 'allied NPC', source: { uid: 'ally_kreg', name: 'Kreg', kind: 'npc' }, cause: 'attack' },
    { label: 'poison', source: { uid: 'player_0', name: 'Knight', kind: 'player' }, cause: 'poison' }
];

for (const defeatSource of defeatSources) {
    test(`the shared resolver completes combat for a ${defeatSource.label} kill`, () => {
        const harness = createContext();
        const result = resolveActorDefeat(
            harness.socketId,
            harness.enemies[0],
            harness.context,
            { sourceActor: defeatSource.source, cause: defeatSource.cause }
        );

        assert.equal(result.combatComplete, true);
        assert.equal(harness.context.activeCombats[harness.socketId], undefined);
        assert.equal(harness.enemies[0].defeatResolved, true);
        assert.deepEqual(harness.enemies[0].defeatedBy, {
            uid: defeatSource.source.uid,
            name: defeatSource.source.name,
            kind: defeatSource.source.kind,
            cause: defeatSource.cause
        });
        assert.equal(harness.player.pendingGold, 25);
    });
}

test('non-final defeats reward once and only the last enemy finalizes victory', () => {
    const harness = createContext({ enemyCount: 2 });
    const sourceActor = { uid: 'ally_merc_1', name: 'Mira', kind: 'companion' };

    const first = resolveActorDefeat(harness.socketId, harness.enemies[0], harness.context, { sourceActor });
    const duplicate = resolveActorDefeat(harness.socketId, harness.enemies[0], harness.context, { sourceActor });
    const final = resolveActorDefeat(harness.socketId, harness.enemies[1], harness.context, { sourceActor });

    assert.equal(first.combatComplete, false);
    assert.equal(duplicate.resolved, false);
    assert.equal(final.combatComplete, true);
    assert.equal(harness.player.pendingGold, 50);
    assert.equal(harness.emitted.filter(event => event.eventName === 'killConfirmed').length, 2);
});

test('poison preserves its original source for the shared resolver', () => {
    const harness = createContext();
    const sourceActor = { uid: 'ally_merc_1', name: 'Mira', kind: 'companion' };
    harness.enemies[0].hp = 4;

    assert.equal(applyPoison(harness.enemies[0], { chance: 1, turns: 1, damage: 5, sourceActor }), true);
    const poisonTick = tickPoison(harness.enemies[0]);
    const result = resolveActorDefeat(harness.socketId, harness.enemies[0], harness.context, {
        cause: 'poison',
        sourceUid: poisonTick.sourceUid,
        sourceName: poisonTick.sourceName,
        sourceKind: poisonTick.sourceKind
    });

    assert.equal(poisonTick.killed, true);
    assert.equal(result.combatComplete, true);
    assert.equal(harness.enemies[0].defeatedBy.uid, sourceActor.uid);
    assert.equal(harness.enemies[0].defeatedBy.cause, 'poison');
});

test('legacy standalone pet data cannot create combat loot', t => {
    const originalRandom = Math.random;
    Math.random = () => 0;
    t.after(() => { Math.random = originalRandom; });

    const harness = createContext({
        playerOverrides: {
            pet: { adopted: true, name: 'Biscuit', type: 'dog', level: 100 }
        }
    });
    const result = resolveActorDefeat(harness.socketId, harness.enemies[0], harness.context, {
        sourceActor: { uid: 'player_0', name: 'Knight', kind: 'player' }
    });
    assert.equal(result.combatComplete, true);
    assert.deepEqual(harness.player.pendingLoot, []);
    assert.equal(harness.emitted.some(event => event.payload && event.payload.isPet), false);
});

test('encounters deploy active party companions', () => {
    const companion = {
        instanceId: 'merc_test_1',
        templateId: 'starter_mercenary',
        name: 'Mira',
        role: 'Frontliner',
        hired: true,
        stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
        equipment: { weapon: null, helmet: null, armor: null, gloves: null, boots: null }
    };
    const player = makePlayer({
        roster: { companions: [companion], activeIds: [companion.instanceId] }
    });

    const combat = createCombatEncounter(player, { zoneChoice: 'WILDERNESS', activeLevel: 1 });

    assert.ok(combat);
    assert.equal(combat.actors.filter(actor => actor.kind === 'companion').length, 1);
});
