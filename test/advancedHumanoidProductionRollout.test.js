const test = require('node:test');
const assert = require('node:assert/strict');

const {
    NpcDatabase,
    createEnemy
} = require('../public/js/npc-database.js');
const {
    createEnemyActor
} = require('../combatActors.js');
const {
    createCombatEncounter
} = require('../combatEncounters.js');
const {
    LootTables
} = require('../public/js/lootTables.js');
const {
    ItemDatabase
} = require('../public/js/items.js');
const {
    HumanoidActorVisualProfiles,
    resolveHumanoidActorVisualProfile,
    resolveHumanoidActorActionClip
} = require('../public/js/humanoid-actor-visuals.js');
const {
    resolveCombatAnimationClip
} = require('../public/js/combat-animation.js');
const {
    grantActorDefeatRewards
} = require('../combatRewards.js');

const PRODUCTION_HUMANOIDS = Object.freeze({
    shield_guard_captain: {
        visualProfileId: 'shield_guard_captain',
        attackClip: 'slash',
        defensiveClip: 'shield_block'
    },
    tankard_brute: {
        visualProfileId: 'tankard_brute',
        attackClip: 'heavy',
        defensiveClip: null
    },
    harvest_champion: {
        visualProfileId: 'harvest_champion',
        attackClip: 'thrust',
        defensiveClip: null
    },
    cellar_duelist: {
        visualProfileId: 'cellar_dweller',
        attackClip: 'dual_wield',
        defensiveClip: null
    },
    cult_champion: {
        visualProfileId: 'cult_champion',
        attackClip: 'scythe',
        defensiveClip: null
    }
});

const PRODUCTION_HUMANOID_IDS = Object.freeze(
    Object.keys(PRODUCTION_HUMANOIDS)
);

function makeEncounterPlayer(overrides = {}) {
    return {
        username: 'Advanced Humanoid Rollout Tester',
        hp: 100,
        stamina: 50,
        vitality: 4,
        offense: 4,
        defense: 4,
        speed: 4,
        wildernessLevel: 20,
        cellarLevel: 20,
        cellarsUnlocked: true,
        abyssUnlocked: true,
        abyssDepth: 1,
        equipment: {},
        inventory: [],
        roster: { companions: [], activeIds: [] },
        ...overrides
    };
}

function createEncounter(zoneChoice, activeLevel, playerOverrides = {}) {
    return createCombatEncounter(
        makeEncounterPlayer(playerOverrides),
        { zoneChoice, activeLevel }
    );
}

function actorIds(combat, teamId = null) {
    return (combat.actors || [])
        .filter(actor => !teamId || actor.teamId === teamId)
        .map(actor => actor.id);
}

function withMockedRandom(sequence, callback) {
    const originalRandom = Math.random;
    let index = 0;
    Math.random = () => {
        assert.ok(index < sequence.length, 'unexpected random roll');
        return sequence[index++];
    };
    try {
        const result = callback();
        assert.equal(index, sequence.length, 'not every random roll was used');
        return result;
    } finally {
        Math.random = originalRandom;
    }
}

function midpointRollForItem(table, itemId) {
    const totalWeight = table.pools.reduce(
        (sum, entry) => sum + Number(entry.weight),
        0
    );
    let precedingWeight = 0;
    for (const entry of table.pools) {
        if (entry.itemId === itemId) {
            return (
                precedingWeight + (Number(entry.weight) / 2)
            ) / totalWeight;
        }
        precedingWeight += Number(entry.weight);
    }
    throw new Error(`${itemId} is not present in the requested loot table`);
}

test('advanced humanoid NPC definitions keep gameplay data separate from shared visual profiles', () => {
    Object.entries(PRODUCTION_HUMANOIDS).forEach(
        ([enemyId, expected]) => {
            const definition = NpcDatabase[enemyId];
            const enemy = createEnemy(enemyId, 3, 4);

            assert.ok(definition, `${enemyId} is absent from NpcDatabase`);
            assert.equal(
                definition.visualProfileId,
                expected.visualProfileId,
                `${enemyId} uses the wrong shared visual profile`
            );
            assert.equal(definition.size, 1, `${enemyId} is not a native humanoid`);
            assert.ok(definition.hp > 0, `${enemyId} has invalid HP`);
            assert.ok(definition.offense >= 0, `${enemyId} has invalid offense`);
            assert.ok(definition.defense >= 0, `${enemyId} has invalid defense`);
            assert.ok(definition.speed > 0, `${enemyId} has invalid speed`);
            assert.ok(enemy, `${enemyId} cannot be instantiated`);
            assert.equal(enemy.visualProfileId, expected.visualProfileId);
            assert.equal(enemy.x, 3);
            assert.equal(enemy.y, 4);

            [
                'appearance',
                'equipment',
                'attackClip',
                'animationSet',
                'stanceProfileId',
                'overrides'
            ].forEach(visualKey => {
                assert.equal(
                    Object.hasOwn(definition, visualKey),
                    false,
                    `${enemyId} embeds visual field ${visualKey}`
                );
            });
        }
    );
});

test('Wilderness levels 12 through 19 substitute a Harvest Champion into the final standard slot without changing level 20', () => {
    const beforeRollout = new Set();
    for (let level = 1; level < 12; level++) {
        createEncounter('WILDERNESS', level).enemies.forEach(enemy => {
            if (PRODUCTION_HUMANOID_IDS.includes(enemy.id)) {
                beforeRollout.add(enemy.id);
            }
        });
    }
    assert.deepEqual(
        [...beforeRollout],
        [],
        'advanced field humanoids leak into the early Wilderness'
    );

    for (let level = 12; level <= 19; level++) {
        const encounter = createEncounter('WILDERNESS', level);
        const ids = encounter.enemies.map(enemy => enemy.id);

        assert.equal(ids.length, 6, `Wilderness level ${level} changed size`);
        assert.equal(
            ids.at(-1),
            'harvest_champion',
            `Wilderness level ${level} does not replace its final slot`
        );
        assert.equal(
            ids.filter(id => id === 'harvest_champion').length,
            1,
            `Wilderness level ${level} has the wrong champion count`
        );
        assert.equal(ids.includes('shield_guard_captain'), false);
        assert.equal(ids.includes('tankard_brute'), false);
    }

    const bossEncounter = createEncounter('WILDERNESS', 20);
    assert.deepEqual(
        bossEncounter.enemies.map(enemy => enemy.id),
        ['wilderness_overlord']
    );
    assert.equal(
        actorIds(bossEncounter, 'PLAYER').includes('npc_kreg'),
        true,
        'Wilderness level 20 no longer deploys Kreg'
    );
});

test('Cellars substitute captain, duelist, and brute at their authored thresholds without increasing encounter size', () => {
    const progressionCases = [
        [5, ['corrupted_cask', 'corrupted_cask', 'corrupted_cask']],
        [6, [
            'corrupted_cask',
            'corrupted_cask',
            'corrupted_cask',
            'shield_guard_captain'
        ]],
        [8, [
            'corrupted_cask',
            'corrupted_cask',
            'corrupted_cask',
            'corrupted_cask',
            'shield_guard_captain'
        ]],
        [9, [
            'corrupted_cask',
            'corrupted_cask',
            'corrupted_cask',
            'cellar_duelist',
            'shield_guard_captain'
        ]],
        [11, [
            'corrupted_cask',
            'corrupted_cask',
            'corrupted_cask',
            'corrupted_cask',
            'cellar_duelist',
            'shield_guard_captain'
        ]],
        [12, [
            'corrupted_cask',
            'corrupted_cask',
            'corrupted_cask',
            'tankard_brute',
            'cellar_duelist',
            'shield_guard_captain'
        ]],
        [19, [
            'corrupted_cask',
            'corrupted_cask',
            'corrupted_cask',
            'tankard_brute',
            'cellar_duelist',
            'shield_guard_captain'
        ]]
    ];

    progressionCases.forEach(([level, expectedStandardIds]) => {
        const ids = createEncounter('CELLARS', level)
            .enemies
            .map(enemy => enemy.id);
        const expectedMimics = level >= 5 ? ['pub_crawl_mimic'] : [];

        assert.deepEqual(
            ids,
            [...expectedStandardIds, ...expectedMimics],
            `Cellars level ${level} substitutions are wrong`
        );
        assert.equal(
            ids.length,
            expectedStandardIds.length + expectedMimics.length,
            `Cellars level ${level} changed encounter size`
        );
    });
});

test('the Cellars level 20 Behemoth and Cellar Dweller encounter stays unchanged', () => {
    const bossEncounter = createEncounter('CELLARS', 20);
    assert.deepEqual(
        bossEncounter.enemies.map(enemy => enemy.id),
        ['vintage_behemoth']
    );
    assert.equal(
        actorIds(bossEncounter, 'ROGUE').filter(
            id => id === 'cellar_dweller'
        ).length,
        1,
        'Cellars level 20 no longer contains exactly one Cellar Dweller'
    );
    PRODUCTION_HUMANOID_IDS.forEach(enemyId => {
        assert.equal(
            bossEncounter.enemies.some(enemy => enemy.id === enemyId),
            false,
            `${enemyId} leaks into the Cellars boss encounter`
        );
    });
});

test('Abyss depth three introduces the Cult Champion and keeps it reachable deeper down', () => {
    const depthTwo = createEncounter(
        'ABYSS',
        1,
        { abyssDepth: 2 }
    );
    const depthThree = createEncounter(
        'ABYSS',
        1,
        { abyssDepth: 3 }
    );
    const depthNine = createEncounter(
        'ABYSS',
        1,
        { abyssDepth: 9 }
    );

    assert.equal(
        depthTwo.enemies.some(enemy => enemy.id === 'cult_champion'),
        false
    );
    assert.equal(
        depthThree.enemies.some(enemy => enemy.id === 'cult_champion'),
        true
    );
    assert.equal(
        depthNine.enemies.some(enemy => enemy.id === 'cult_champion'),
        true
    );
});

test('advanced humanoid loot tables contain valid weighted item references and every new offhand', () => {
    const lootItemIds = new Set();

    PRODUCTION_HUMANOID_IDS.forEach(enemyId => {
        const table = LootTables[enemyId];

        assert.ok(table, `${enemyId} has no loot table`);
        assert.ok(table.xpDrop > 0, `${enemyId} grants no XP`);
        assert.ok(
            table.dropChance > 0 && table.dropChance <= 1,
            `${enemyId} has invalid drop chance`
        );
        assert.ok(
            Array.isArray(table.pools) && table.pools.length > 0,
            `${enemyId} has no loot pool`
        );
        assert.equal(
            new Set(table.pools.map(entry => entry.itemId)).size,
            table.pools.length,
            `${enemyId} repeats a loot item`
        );

        table.pools.forEach(entry => {
            lootItemIds.add(entry.itemId);
            assert.ok(
                ItemDatabase[entry.itemId],
                `${enemyId} references unknown item ${entry.itemId}`
            );
            assert.equal(
                Number.isFinite(Number(entry.weight))
                    && Number(entry.weight) > 0,
                true,
                `${enemyId} has invalid weight for ${entry.itemId}`
            );
        });
    });

    [
        'round_shield',
        'captains_shield',
        'tower_shield',
        'parrying_dagger'
    ].forEach(itemId => {
        assert.equal(
            lootItemIds.has(itemId),
            true,
            `${itemId} is absent from advanced humanoid loot`
        );
    });
});

test('deterministic defeat rewards clone every production offhand with canonical fields intact', () => {
    [
        ['shield_guard_captain', 'round_shield'],
        ['shield_guard_captain', 'captains_shield'],
        ['shield_guard_captain', 'tower_shield'],
        ['cellar_duelist', 'parrying_dagger']
    ].forEach(([enemyId, itemId], caseIndex) => {
        const socketId = `offhand_reward_${caseIndex}`;
        const player = {
            pendingGold: 0,
            pendingXp: 0,
            pendingLoot: []
        };
        const combat = {
            zone: 'CELLARS',
            activeLevel: 12
        };
        const emitted = [];
        const context = {
            activePlayers: { [socketId]: player },
            activeCombats: { [socketId]: combat },
            io: {
                to(targetSocketId) {
                    assert.equal(targetSocketId, socketId);
                    return {
                        emit(eventName, payload) {
                            emitted.push({ eventName, payload });
                        }
                    };
                }
            }
        };
        const table = LootTables[enemyId];
        const masterItem = ItemDatabase[itemId];
        const result = withMockedRandom(
            [0, midpointRollForItem(table, itemId)],
            () => grantActorDefeatRewards(
                socketId,
                {
                    id: enemyId,
                    name: NpcDatabase[enemyId].name,
                    rewardsEligible: true
                },
                context
            )
        );

        assert.deepEqual(result.item, masterItem, `${itemId} reward clone`);
        assert.notEqual(result.item, masterItem, `${itemId} was not cloned`);
        assert.deepEqual(player.pendingLoot, [masterItem]);
        assert.notEqual(player.pendingLoot[0], masterItem);
        assert.equal(emitted.length, 1);
        assert.equal(emitted[0].eventName, 'killConfirmed');
        assert.deepEqual(emitted[0].payload.item, masterItem);

        result.item.value = -999;
        assert.notEqual(
            ItemDatabase[itemId].value,
            -999,
            `${itemId} reward mutation reached ItemDatabase`
        );
    });
});

test('production advanced humanoids resolve their shared attack and defense clips', () => {
    Object.entries(PRODUCTION_HUMANOIDS).forEach(
        ([enemyId, expected]) => {
            const actor = createEnemyActor(createEnemy(enemyId, 2, 3));
            const profile = resolveHumanoidActorVisualProfile(actor);

            assert.equal(
                profile,
                HumanoidActorVisualProfiles[expected.visualProfileId]
            );
            assert.equal(profile.attackClip, expected.attackClip);
            assert.equal(
                profile.defensiveClip || null,
                expected.defensiveClip
            );
            assert.equal(
                resolveHumanoidActorActionClip(
                    actor,
                    {},
                    { animType: profile.attackClip }
                ),
                expected.attackClip
            );
            assert.equal(
                resolveCombatAnimationClip({
                    weapon: profile.equipment.weapon,
                    offhand: profile.equipment.offhand,
                    animType: profile.attackClip
                }),
                expected.attackClip
            );
        }
    );
});
