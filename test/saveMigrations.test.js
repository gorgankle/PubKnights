const test = require('node:test');
const assert = require('node:assert/strict');

const {
    CURRENT_SAVE_VERSION,
    RETIRED_TOP_LEVEL_KEYS,
    needsSaveMigration,
    migrateSaveData
} = require('../saveMigrations.js');

test('a legacy save gains a normalized, separate world namespace', () => {
    const legacy = { username: 'Old Knight', gold: 47 };

    const result = migrateSaveData(legacy);

    assert.equal(result.migrated, true);
    assert.equal(result.fromVersion, 0);
    assert.equal(result.toVersion, CURRENT_SAVE_VERSION);
    assert.equal(result.saveData, legacy);
    assert.equal(legacy.saveVersion, CURRENT_SAVE_VERSION);
    assert.equal(legacy.gold, 47);
    assert.equal(legacy.world.schemaVersion, 3);
    assert.equal(legacy.world.contracts.offered.missing_kegs != null, true);
    assert.equal(needsSaveMigration(legacy), false);
});

test('the version-2 migration is idempotent and imports the prototype worldState key', () => {
    const legacy = {
        saveVersion: 1,
        worldState: {
            facts: { forged_toll_seal: true },
            npcs: { kreg: { stageId: 'concerned' } }
        }
    };

    migrateSaveData(legacy);
    const once = JSON.stringify(legacy);
    const second = migrateSaveData(legacy);

    assert.equal(legacy.worldState, undefined);
    assert.equal(legacy.world.facts.forged_toll_seal, true);
    assert.equal(legacy.world.npcs.kreg.stageId, 'concerned');
    assert.equal(second.migrated, false);
    assert.equal(JSON.stringify(legacy), once);
});

test('migration conservatively merges populated current and prototype world namespaces', () => {
    const save = {
        saveVersion: CURRENT_SAVE_VERSION,
        world: {
            facts: { forged_toll_seal: false },
            npcs: {
                kreg: { stageId: 'concerned', interactionCount: 2 },
                mara: { stageId: 'quartermaster' }
            },
            town: { milestones: { quartermaster_stall_open: 'locked' } },
            destinationInteractions: {
                inspect_wreck: { completionCount: 1, lastCompletedAt: 100 }
            },
            contracts: {
                completed: { missing_kegs: { count: 1, lastCompletedAt: 300 } },
                offered: { road_conditions_pine: { offeredAt: 400 } }
            },
            rewards: {
                choices: {
                    first_return_kit: {
                        status: 'claimed',
                        claimedOptionId: 'spear_reach',
                        claimedAt: 500
                    }
                }
            }
        },
        worldState: {
            facts: { forged_toll_seal: true, pine_signal_chart: true },
            npcs: {
                kreg: { stageId: 'committed', interactionCount: 7, lastInteractionAt: 600 },
                elowen: { stageId: 'informed', interactionCount: 3 }
            },
            town: {
                milestones: {
                    quartermaster_stall_open: { status: 'completed', achievedAt: 700 }
                }
            },
            destinationInteractions: {
                inspect_wreck: { completionCount: 0 },
                search_signal_cache: { completionCount: 1, lastCompletedAt: 800 }
            },
            contracts: {
                active: { missing_kegs: { objectives: {} } },
                completed: { road_conditions_pine: { count: 4, lastCompletedAt: 900 } }
            },
            rewards: {
                choices: {
                    first_return_kit: {
                        status: 'claimed',
                        claimedOptionId: 'bow_reposition',
                        claimedAt: 950
                    }
                }
            }
        }
    };

    const first = migrateSaveData(save);
    const once = JSON.stringify(save);
    const second = migrateSaveData(save);

    assert.equal(first.migrated, true);
    assert.equal(save.worldState, undefined);
    assert.equal(save.world.facts.forged_toll_seal, true);
    assert.equal(save.world.facts.pine_signal_chart, true);
    assert.equal(save.world.npcs.kreg.stageId, 'committed');
    assert.equal(save.world.npcs.kreg.interactionCount, 7);
    assert.equal(save.world.npcs.kreg.lastInteractionAt, 600);
    assert.equal(save.world.npcs.elowen.stageId, 'informed');
    assert.deepEqual(save.world.town.milestones.quartermaster_stall_open, {
        status: 'completed',
        achievedAt: 700
    });
    assert.equal(save.world.destinationInteractions.inspect_wreck.completionCount, 1);
    assert.equal(save.world.destinationInteractions.search_signal_cache.completionCount, 1);
    assert.deepEqual(save.world.contracts.completed.missing_kegs, {
        count: 1,
        lastCompletedAt: 300
    });
    assert.equal(save.world.contracts.active.missing_kegs, undefined);
    assert.deepEqual(save.world.contracts.completed.road_conditions_pine, {
        count: 4,
        lastCompletedAt: 900
    });
    assert.deepEqual(save.world.contracts.offered.road_conditions_pine, { offeredAt: 400 });
    assert.deepEqual(save.world.rewards.choices.first_return_kit, {
        status: 'claimed',
        claimedOptionId: 'spear_reach',
        claimedAt: 500
    });
    assert.equal(second.migrated, false);
    assert.equal(JSON.stringify(save), once);
});

test('malformed saves receive safe defaults without inventing progression', () => {
    const result = migrateSaveData(null);

    assert.equal(result.saveData.saveVersion, CURRENT_SAVE_VERSION);
    assert.equal(result.saveData.world.facts.forged_toll_seal, false);
    assert.equal(result.saveData.world.npcs.mara.stageId, 'waiting');
    assert.equal(
        result.saveData.world.town.milestones.quartermaster_stall_open.status,
        'locked'
    );
});

test('retired adopted pets refund adoption and historical training once', () => {
    const legacy = {
        saveVersion: 4,
        gold: 100,
        pet: {
            adopted: true,
            name: 'Biscuit',
            type: 'dog',
            level: 3
        },
        roster: {
            companions: [{ instanceId: 'story_marlow', templateId: 'marlow' }],
            activeIds: ['story_marlow']
        }
    };
    const rosterBefore = structuredClone(legacy.roster);

    const first = migrateSaveData(legacy);
    const goldAfterFirstMigration = legacy.gold;
    const second = migrateSaveData(legacy);

    // 10g adoption + 750g level 1 training + 900g level 2 training.
    assert.equal(first.refundedGold, 1_660);
    assert.equal(goldAfterFirstMigration, 1_760);
    assert.equal(legacy.pet, undefined);
    assert.deepEqual(legacy.roster, rosterBefore);
    assert.equal(second.refundedGold, 0);
    assert.equal(second.migrated, false);
    assert.equal(legacy.gold, goldAfterFirstMigration);
});

test('legacy pet refunds cap malformed levels at the former level-100 benefit ceiling', () => {
    const malformed = {
        saveVersion: CURRENT_SAVE_VERSION,
        gold: 0,
        pet: { adopted: true, level: Number.MAX_SAFE_INTEGER }
    };
    const neverAdopted = {
        saveVersion: CURRENT_SAVE_VERSION,
        gold: 40,
        pet: { adopted: false, level: 100 }
    };

    const capped = migrateSaveData(malformed);
    const inactive = migrateSaveData(neverAdopted);

    assert.equal(capped.refundedGold, 258_806_166_590);
    assert.equal(malformed.gold, 258_806_166_590);
    assert.equal(Number.isSafeInteger(malformed.gold), true);
    assert.equal(malformed.pet, undefined);
    assert.equal(inactive.refundedGold, 0);
    assert.equal(neverAdopted.gold, 40);
    assert.equal(neverAdopted.pet, undefined);
});

test('historical workers and cabin levels refund once before retired state is stripped', () => {
    const legacy = {
        saveVersion: 1,
        gold: 47,
        workers: {
            woodcutters: 2,
            fishermen: 1,
            farmers: 3
        },
        buildings: {
            workerCabin: 3,
            smithy: { stage: 2 }
        },
        supplyCart: { wood: 20, fish: 10, hops: 5, level: 4 },
        wood: 12,
        fish: 8,
        hops: 4,
        economyMigrationVersion: 0
    };

    // Six workers refund 600g. Cabin levels 1 -> 2 and 2 -> 3 refund
    // floor(100 * 1.3) + floor(100 * 1.3^2) = 299g.
    const first = migrateSaveData(legacy);
    const afterFirstMigration = JSON.stringify(legacy);
    const second = migrateSaveData(legacy);

    assert.equal(first.refundedGold, 899);
    assert.equal(legacy.gold, 946);
    assert.deepEqual(legacy.buildings, { smithy: { stage: 2 } });
    assert.equal(legacy.workers, undefined);
    assert.equal(legacy.supplyCart, undefined);
    assert.equal(legacy.economyMigrationVersion, undefined);
    assert.equal(second.refundedGold, 0);
    assert.equal(second.migrated, false);
    assert.equal(legacy.gold, 946);
    assert.equal(JSON.stringify(legacy), afterFirstMigration);
});

test('the prior worker-economy migration marker prevents a duplicate worker refund', () => {
    const alreadyRefunded = {
        saveVersion: 2,
        gold: 780,
        economyMigrationVersion: 3,
        workerRefundGold: 650,
        workers: {
            total: 5,
            assigned: { wood: 2, fish: 2, hops: 1 },
            retired: true
        },
        buildings: { workerCabin: 4 },
        tavernContacts: { total: 5, refundGold: 650 }
    };

    const result = migrateSaveData(alreadyRefunded);

    assert.equal(result.refundedGold, 0);
    assert.equal(alreadyRefunded.gold, 780);
    assert.equal(alreadyRefunded.workers, undefined);
    assert.equal(alreadyRefunded.buildings, undefined);
    assert.equal(alreadyRefunded.workerRefundGold, undefined);
    assert.equal(alreadyRefunded.tavernContacts, undefined);
    assert.equal(alreadyRefunded.economyMigrationVersion, undefined);
});

test('retired prestige purchases refund their historical prices once', () => {
    const legacy = {
        saveVersion: 2,
        gold: 25,
        gildedTavernUnlocked: true,
        tradeRoutesExpanded: true,
        monumentBuilt: true
    };

    const first = migrateSaveData(legacy);
    const goldAfterFirstMigration = legacy.gold;
    const second = migrateSaveData(legacy);

    assert.equal(first.refundedGold, 1_035_000);
    assert.equal(goldAfterFirstMigration, 1_035_025);
    assert.equal(legacy.gildedTavernUnlocked, undefined);
    assert.equal(legacy.tradeRoutesExpanded, undefined);
    assert.equal(legacy.monumentBuilt, undefined);
    assert.equal(second.refundedGold, 0);
    assert.equal(second.migrated, false);
    assert.equal(legacy.gold, goldAfterFirstMigration);
});

test('current migration strips every retired durable key and obsolete bounty mirrors', () => {
    const save = {
        saveVersion: CURRENT_SAVE_VERSION,
        gold: 10,
        buildings: { workerCabin: 2, keepMe: true },
        adventure: {
            contracts: { old_delivery: { progress: 2 } },
            latestReturnReport: {
                contractUpdates: [{ contractId: 'old_delivery', progress: 1 }],
                summary: 'Keep this report.'
            }
        }
    };
    RETIRED_TOP_LEVEL_KEYS.forEach(key => {
        save[key] = key === 'workers' ? { total: 1 } : true;
    });
    // The loop assigns a nonnumeric value to gold-adjacent retired fields on
    // purpose: stripping malformed residue must not corrupt valid core gold.
    save.gold = 10;

    assert.equal(needsSaveMigration(save), true);
    const result = migrateSaveData(save);

    assert.equal(result.refundedGold, 0);
    RETIRED_TOP_LEVEL_KEYS.forEach(key => {
        assert.equal(Object.hasOwn(save, key), false, key);
    });
    assert.deepEqual(save.buildings, { keepMe: true });
    assert.equal(save.adventure.contracts, undefined);
    assert.equal(save.adventure.latestReturnReport.contractUpdates, undefined);
    assert.equal(save.adventure.latestReturnReport.summary, 'Keep this report.');
    assert.equal(save.gold, 10);
    assert.equal(needsSaveMigration(save), false);
});

test('migration preserves all minigame currencies and crate save content exactly', () => {
    const crates = [
        {
            id: 'timber_crate',
            name: 'Sealed Timber Crate',
            slot: 'consumable',
            type: 'crate',
            rarity: 'Epic',
            value: 1000,
            spriteId: 'icon_crate_timber',
            customLegacyNote: { owner: 'Lumber Team', sequence: 1 }
        },
        {
            id: 'angler_crate',
            name: 'Waterlogged Angler Crate',
            slot: 'consumable',
            type: 'crate',
            rarity: 'Epic',
            value: 1000,
            spriteId: 'icon_crate_angler',
            customLegacyNote: { owner: 'Fishing Team', sequence: 2 }
        },
        {
            id: 'harvest_crate',
            name: 'Overgrown Harvest Crate',
            slot: 'consumable',
            type: 'crate',
            rarity: 'Epic',
            value: 1000,
            spriteId: 'icon_crate_harvest',
            customLegacyNote: { owner: 'Hops Team', sequence: 3 }
        }
    ];
    const save = {
        saveVersion: 2,
        lumberPoints: 12_345,
        fishingPoints: 23_456,
        hopsPoints: 34_567,
        inventory: structuredClone(crates),
        stash: [{ id: 'ordinary_item', name: 'Keep Me' }],
        happyHourTicks: 14,
        cellarsChummed: true
    };
    const pointsBefore = {
        lumberPoints: save.lumberPoints,
        fishingPoints: save.fishingPoints,
        hopsPoints: save.hopsPoints
    };
    const inventoryBefore = structuredClone(save.inventory);
    const stashBefore = structuredClone(save.stash);

    migrateSaveData(save);

    assert.deepEqual({
        lumberPoints: save.lumberPoints,
        fishingPoints: save.fishingPoints,
        hopsPoints: save.hopsPoints
    }, pointsBefore);
    assert.deepEqual(save.inventory, inventoryBefore);
    assert.deepEqual(save.inventory.map(item => item.id), [
        'timber_crate',
        'angler_crate',
        'harvest_crate'
    ]);
    assert.deepEqual(save.stash, stashBefore);
    assert.equal(save.happyHourTicks, undefined);
    assert.equal(save.cellarsChummed, undefined);
});

test('version 3 saves gain Chapter One branch, finale, and NPC state without inventing progress', () => {
    const save = {
        saveVersion: 3,
        world: {
            schemaVersion: 2,
            facts: { forged_toll_seal: true },
            npcs: { kreg: { stageId: 'concerned' } },
            contracts: { offered: { missing_kegs: {} } }
        },
        lumberPoints: 17,
        inventory: [{ id: 'timber_crate', customLegacyNote: 'preserve' }]
    };

    const result = migrateSaveData(save);

    assert.equal(result.fromVersion, 3);
    assert.equal(result.toVersion, CURRENT_SAVE_VERSION);
    assert.equal(save.world.schemaVersion, 3);
    assert.equal(save.world.npcs.tilda.stageId, 'guarded');
    assert.equal(save.world.npcs.marlow.stageId, 'suspicious');
    assert.equal(save.world.chapters.chapter_one.status, 'active');
    assert.deepEqual(save.world.chapters.chapter_one.finale.preparationFlags, {
        tildas_wards: false,
        marlows_breach: false
    });
    assert.equal(save.lumberPoints, 17);
    assert.deepEqual(save.inventory, [{ id: 'timber_crate', customLegacyNote: 'preserve' }]);
});
