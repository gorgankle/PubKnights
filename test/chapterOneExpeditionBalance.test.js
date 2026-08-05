const test = require('node:test');
const assert = require('node:assert/strict');

const {
    AuthoredEncounterCatalog,
    RouteCatalog
} = require('../adventureCatalog.js');
const { attackTarget } = require('../combatAI.js');
const { createAuthoredCombatEncounter } = require('../combatEncounters.js');
const { getMoveStaminaCost } = require('../combatResources.js');
const { ItemDatabase } = require('../public/js/items.js');
const { NpcDatabase, createEnemy } = require('../public/js/npc-database.js');

const PINE_ENCOUNTER_IDS = Object.freeze([
    'pine_lookout',
    'poachers_trail',
    'pine_signal_ambush'
]);
const PINE_FORMATION_IDS = Object.freeze(['poachers_trail', 'pine_signal_ambush']);

function makeFreshKnight() {
    return {
        username: 'Fresh Knight',
        hp: 25,
        stamina: 25,
        vitality: 1,
        maxStamina: 1,
        offense: 1,
        defense: 1,
        speed: 1,
        equipment: {
            weapon: JSON.parse(JSON.stringify(ItemDatabase.rusty_mace)),
            offhand: null
        },
        inventory: [],
        roster: { companions: [], activeIds: [] },
        activeBuffs: [],
        statusEffects: {}
    };
}

function makeAdjacentAttackHarness(enemyId) {
    const player = makeFreshKnight();
    const playerActor = {
        uid: 'player_0',
        id: 'player',
        kind: 'player',
        controller: 'player',
        teamId: 'PLAYER',
        name: player.username,
        x: 1,
        y: 1,
        size: 1,
        hp: 25,
        maxHp: 25,
        stamina: 25,
        maxStamina: 25,
        alive: true,
        targetable: true,
        targetableByEnemies: true,
        blocksMovement: true
    };
    const enemy = Object.assign(createEnemy(enemyId, 2, 1), {
        uid: `balance_${enemyId}`,
        kind: 'monster',
        controller: 'ai_enemy',
        teamId: 'ENEMY',
        targetable: true,
        targetableByPlayer: true,
        blocksMovement: true
    });
    const combat = {
        gridSize: { cols: 16, rows: 10 },
        obstacles: [],
        actors: [playerActor, enemy]
    };

    return {
        socketId: `balance_${enemyId}`,
        player,
        playerActor,
        enemy,
        combat,
        activeCombats: { [`balance_${enemyId}`]: combat }
    };
}

function attackOnce(harness) {
    const events = [];
    const acted = attackTarget(
        harness.socketId,
        harness.combat,
        harness.player,
        harness.enemy,
        harness.playerActor,
        harness.activeCombats,
        () => ({ combatComplete: false }),
        events
    );
    const outcome = events.find(event => event.type === 'hit' || event.type === 'deflect');
    assert.equal(acted, true);
    assert.ok(outcome);
    return outcome;
}

test('Pine Trail offers a solo scouting encounter plus two reversed veteran formations', () => {
    const route = RouteCatalog.route_pine_trail;
    assert.deepEqual(route.encounterIds, PINE_ENCOUNTER_IDS);

    const definitions = PINE_ENCOUNTER_IDS.map(id => AuthoredEncounterCatalog[id]);
    definitions.forEach(definition => {
        assert.ok(definition);
        assert.equal(definition.mapTemplateId, 'EXPEDITION_PINE_TRAIL');
        assert.ok(createAuthoredCombatEncounter(makeFreshKnight(), definition.id));
    });

    const formationSignatures = PINE_FORMATION_IDS.map(id => Object.fromEntries(
        AuthoredEncounterCatalog[id].enemies.map(enemy => [enemy.spawnId, enemy.id])
    ));
    assert.notDeepEqual(formationSignatures[0], formationSignatures[1]);
    assert.equal(formationSignatures[0].bandit_path, 'melee_bandit');
    assert.equal(formationSignatures[0].archer_ridge, 'bandit_archer');
    assert.equal(formationSignatures[1].bandit_path, 'bandit_archer');
    assert.equal(formationSignatures[1].poacher_flank, 'melee_bandit');
});

test('the chapter catalog keeps two starting roads and data-gates the wider exploration graph', () => {
    const activeRouteIds = Object.values(RouteCatalog)
        .filter(route => route.chapterStatus === 'active')
        .map(route => route.id)
        .sort();
    const startingRouteIds = Object.values(RouteCatalog)
        .filter(route => route.initiallyUnlocked)
        .map(route => route.id)
        .sort();

    assert.deepEqual(startingRouteIds, ['route_old_road', 'route_pine_trail']);
    assert.deepEqual(activeRouteIds, [
        'route_burnt_heath',
        'route_heath_toll_cut',
        'route_heath_watchhouse',
        'route_old_pine_cut',
        'route_old_road',
        'route_pine_trail',
        'route_toll_crossing',
        'route_toll_watchhouse'
    ]);
    assert.ok(RouteCatalog.route_burnt_heath.unlockRequirements);
    assert.ok(RouteCatalog.route_toll_crossing.unlockRequirements);
    assert.equal(RouteCatalog.route_burnt_heath.encounterIds.length, 3);
    assert.equal(RouteCatalog.route_toll_crossing.encounterIds.length, 3);
    assert.deepEqual(RouteCatalog.route_old_road.encounterBands.scouting, ['alley_robbery']);
    assert.deepEqual(RouteCatalog.route_pine_trail.encounterBands.scouting, ['pine_lookout']);
});

test('fresh scouting encounters use one softened humanoid and leave stamina for attacks', () => {
    const oldRoadEnemy = AuthoredEncounterCatalog.alley_robbery.enemies[0];
    const pineEnemy = AuthoredEncounterCatalog.pine_lookout.enemies[0];
    assert.equal(AuthoredEncounterCatalog.alley_robbery.enemies.length, 1);
    assert.equal(AuthoredEncounterCatalog.pine_lookout.enemies.length, 1);
    assert.ok(oldRoadEnemy.statMult <= 0.6);
    assert.ok(pineEnemy.statMult <= 0.6);

    const oldRoadCombat = createAuthoredCombatEncounter(makeFreshKnight(), 'alley_robbery');
    const pineCombat = createAuthoredCombatEncounter(makeFreshKnight(), 'pine_lookout');
    const oldRoadActor = oldRoadCombat.actors.find(actor => actor.teamId === 'ENEMY');
    const pineActor = pineCombat.actors.find(actor => actor.teamId === 'ENEMY');
    assert.equal(oldRoadActor.offense, 1);
    assert.equal(pineActor.offense, 1);
    assert.ok(oldRoadActor.maxHp <= 14);
    assert.ok(pineActor.maxHp <= 11);

    const twoTileMove = getMoveStaminaCost(2, 1);
    const twoStandardAttacks = ItemDatabase.rusty_mace.combat.standard.staminaCost * 2;
    assert.equal(twoTileMove, 10);
    assert.ok(twoTileMove + twoStandardAttacks <= 25);
});

test('baseline bandits cannot one-shot a fresh Knight and remain a multi-hit threat', t => {
    const originalRandom = Math.random;
    t.after(() => { Math.random = originalRandom; });

    for (const enemyId of ['melee_bandit', 'bandit_archer']) {
        const stats = NpcDatabase[enemyId];
        assert.equal(stats.offense, 2);
        assert.equal(stats.defense, 1);
        assert.equal(stats.speed, 2);

        // The production formula scales offense by 10. These rolls approach its
        // legal maximum while giving the fresh Knight's armor no absorption.
        Math.random = (() => {
            const rolls = [0.999999, 0, 0.999999, 0, 0.5];
            return () => rolls.shift() ?? 0.5;
        })();
        const worstCase = makeAdjacentAttackHarness(enemyId);
        const worstOutcome = attackOnce(worstCase);
        assert.equal(worstOutcome.type, 'hit');
        assert.equal(worstOutcome.damage, 19);
        assert.equal(worstCase.player.hp, 6, `${enemyId} one-shot the default 25 HP Knight`);

        // Midpoint rolls exercise the same server-owned attack function twice:
        // 11 + 11 damage leaves 3 HP, so two ordinary hits hurt without usually
        // ending a brand-new expedition; a third unanswered hit would finish it.
        Math.random = () => 0.5;
        const representative = makeAdjacentAttackHarness(enemyId);
        const first = attackOnce(representative);
        const second = attackOnce(representative);
        assert.deepEqual([first.damage, second.damage], [11, 11]);
        assert.equal(representative.player.hp, 3);
    }
});

test('fresh Rusty Mace offense can break both baseline bandits in a few attacks', () => {
    const freshKnightOffense = 1 + ItemDatabase.rusty_mace.offense;
    assert.equal(freshKnightOffense, 2);

    // At midpoint damage/armor rolls the mirrored production formula yields 11
    // damage against one defense. This keeps both enemies inside 2-3 clean hits.
    const midpointDamage = Math.floor(
        Math.sqrt(0.5) * freshKnightOffense * 10
        - Math.pow(0.5, 2) * NpcDatabase.melee_bandit.defense * 10
    );
    assert.equal(midpointDamage, 11);
    assert.ok(NpcDatabase.bandit_archer.hp > midpointDamage);
    assert.ok(NpcDatabase.bandit_archer.hp <= midpointDamage * 2);
    assert.ok(NpcDatabase.melee_bandit.hp > midpointDamage);
    assert.ok(NpcDatabase.melee_bandit.hp <= midpointDamage * 2);
});
