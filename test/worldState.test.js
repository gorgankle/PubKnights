const test = require('node:test');
const assert = require('node:assert/strict');

const {
    WORLD_SCHEMA_VERSION,
    createInitialWorldState,
    normalizeWorldState,
    ensureWorldState,
    mergeWorldStates,
    createActiveContractRecord,
    worldRequirementsMet,
    getAvailableTownServiceIds,
    getAvailableTownStockEntries
} = require('../worldState.js');

test('initial world state has stable v3 defaults and only the opening contract', () => {
    const world = createInitialWorldState();

    assert.equal(world.schemaVersion, WORLD_SCHEMA_VERSION);
    assert.equal(WORLD_SCHEMA_VERSION, 3);
    assert.deepEqual(world.facts, {
        forged_toll_seal: false,
        pine_signal_chart: false,
        heath_signal_cipher: false,
        toll_gang_ledger: false,
        watchhouse_orders: false,
        north_road_patron: false
    });
    assert.deepEqual(
        Object.fromEntries(Object.entries(world.npcs).map(([id, npc]) => [id, npc.stageId])),
        {
            kreg: 'steady',
            elowen: 'reserved',
            mara: 'waiting',
            tilda: 'guarded',
            marlow: 'retired'
        }
    );
    assert.ok(Object.values(world.town.milestones).every(record => record.status === 'locked'));
    assert.ok(Object.values(world.destinationInteractions).every(record => record.completionCount === 0));
    assert.deepEqual(Object.keys(world.contracts.offered), ['missing_kegs']);
    assert.deepEqual(world.contracts.active, {});
    assert.deepEqual(world.contracts.completed, {});
    assert.deepEqual(world.rewards.choices.first_return_kit, { status: 'locked' });
    assert.deepEqual(world.chapters.chapter_one, {
        status: 'active',
        finale: {
            status: 'locked',
            preparationFlags: { tildas_wards: false, marlows_breach: false }
        },
        epilogue: { status: 'locked' }
    });
});

test('new states do not share nested mutable records', () => {
    const first = createInitialWorldState();
    const second = createInitialWorldState();
    first.facts.forged_toll_seal = true;
    first.npcs.marlow.stageId = 'road_captain';
    first.chapters.chapter_one.finale.preparationFlags.marlows_breach = true;

    assert.equal(second.facts.forged_toll_seal, false);
    assert.equal(second.npcs.marlow.stageId, 'retired');
    assert.equal(second.chapters.chapter_one.finale.preparationFlags.marlows_breach, false);
});

test('legacy-shaped and malformed world data migrates without unknown ids', () => {
    const world = normalizeWorldState({
        schemaVersion: -20,
        discoveredFacts: ['forged_toll_seal', 'unknown_fact'],
        npcStates: {
            kreg: 'concerned',
            elowen: { stage: 'not_real', interactions: '3.8', lastInteractionAt: '200' },
            stranger: { stage: 'admin' }
        },
        town: {
            quartermaster_stall_open: { completed: true, achievedAt: '500' },
            debug_palace: true
        },
        completedDestinationInteractions: ['inspect_wreck', 'not_real'],
        contracts: {
            available: ['road_conditions_pine', 'unknown_contract'],
            active: {
                missing_kegs: {
                    status: 'claimable',
                    acceptedAt: 100,
                    objectives: { find_keg_wreck: { progress: 80 } }
                },
                unknown_contract: { objectives: {} }
            },
            completed: {
                road_conditions_pine: { count: '2.9', lastCompletedAt: 700 },
                unknown_contract: { count: 9 }
            }
        },
        chapters: {
            chapter_one: {
                status: 'hacked',
                finale: {
                    status: 'not_real',
                    preparationFlags: { tildas_wards: true, cheat: true },
                    selectedPreparationOptionId: 'not_real'
                }
            },
            debug_chapter: { status: 'completed' }
        }
    });

    assert.equal(world.schemaVersion, 3);
    assert.deepEqual(world.facts, {
        forged_toll_seal: true,
        pine_signal_chart: false,
        heath_signal_cipher: false,
        toll_gang_ledger: false,
        watchhouse_orders: false,
        north_road_patron: false
    });
    assert.deepEqual(Object.keys(world.npcs).sort(), ['elowen', 'kreg', 'mara', 'marlow', 'tilda']);
    assert.equal(world.npcs.kreg.stageId, 'concerned');
    assert.equal(world.npcs.elowen.stageId, 'reserved');
    assert.equal(world.npcs.elowen.interactionCount, 3);
    assert.deepEqual(world.town.milestones.quartermaster_stall_open, {
        status: 'completed', achievedAt: 500
    });
    assert.equal(world.destinationInteractions.inspect_wreck.completionCount, 1);
    assert.deepEqual(Object.keys(world.destinationInteractions).sort(), [
        'inspect_wreck',
        'search_signal_cache',
        'search_watchhouse_orders',
        'seize_toll_ledger',
        'trace_heath_signal'
    ]);
    assert.equal(world.contracts.active.missing_kegs.status, 'active');
    assert.equal(world.contracts.active.missing_kegs.objectives.find_keg_wreck.progress, 1);
    assert.ok(world.contracts.offered.false_toll, 'durable forged seal restores Marlow contract');
    assert.ok(world.contracts.offered.road_conditions_pine);
    assert.deepEqual(world.contracts.completed.road_conditions_pine, {
        count: 2, lastCompletedAt: 700
    });
    assert.deepEqual(world.chapters.chapter_one.finale.preparationFlags, {
        tildas_wards: true,
        marlows_breach: false
    });
    assert.equal(world.chapters.chapter_one.finale.selectedPreparationOptionId, undefined);
    assert.deepEqual(Object.keys(world.chapters), ['chapter_one']);
});

test('completed non-repeatable contracts cannot be resurrected by offered or active save data', () => {
    const world = normalizeWorldState({
        contracts: {
            offered: ['missing_kegs'],
            active: { missing_kegs: { objectives: {} } },
            completed: { missing_kegs: { count: 99, lastCompletedAt: 50 } }
        }
    });

    assert.deepEqual(world.contracts.completed.missing_kegs, { count: 1, lastCompletedAt: 50 });
    assert.equal(world.contracts.active.missing_kegs, undefined);
    assert.equal(world.contracts.offered.missing_kegs, undefined);
    assert.equal(world.npcs.mara.stageId, 'quartermaster');
    assert.equal(world.town.milestones.quartermaster_stall_open.status, 'unlocked');
});

test('contract progress is derived from typed objectives and capped at target', () => {
    const active = createActiveContractRecord('missing_kegs', {
        status: 'claimable',
        objectives: {
            find_keg_wreck: { progress: 99, completedAt: 50 },
            return_from_old_road: -4,
            invented: { progress: 1 }
        }
    }, 25);

    assert.deepEqual(Object.keys(active.objectives).sort(), ['find_keg_wreck', 'return_from_old_road']);
    assert.deepEqual(active.objectives.find_keg_wreck, {
        progress: 1, complete: true, completedAt: 50
    });
    assert.deepEqual(active.objectives.return_from_old_road, { progress: 0, complete: false });
    assert.equal(active.status, 'active');
    assert.equal(active.acceptedAt, 25);
});

test('ensureWorldState upgrades worldState saves and persists an isolated v3 world', () => {
    const player = { worldState: { facts: { pine_signal_chart: true } } };
    const world = ensureWorldState(player);

    assert.equal(player.world, world);
    assert.equal(world.facts.pine_signal_chart, true);
    assert.ok(world.contracts.offered.ashes_on_the_heath);
    assert.equal(ensureWorldState(null).schemaVersion, 3);
});

test('durable interaction evidence restores facts, NPC stages, and branch offers', () => {
    const world = normalizeWorldState({
        destinationInteractions: {
            search_signal_cache: { completionCount: 1, lastCompletedAt: 250 },
            inspect_wreck: { completionCount: 1, lastCompletedAt: 300 }
        },
        contracts: { offered: {} }
    });

    assert.equal(world.facts.pine_signal_chart, true);
    assert.equal(world.facts.forged_toll_seal, true);
    assert.equal(world.npcs.tilda.stageId, 'curious');
    assert.equal(world.npcs.marlow.stageId, 'suspicious');
    assert.deepEqual(world.contracts.offered.ashes_on_the_heath, { offeredAt: 250 });
    assert.deepEqual(world.contracts.offered.false_toll, { offeredAt: 300 });
});

test('branch completion restores preparations, services, staged stock, and finale readiness', () => {
    const world = normalizeWorldState({
        contracts: {
            completed: {
                missing_kegs: { count: 1, lastCompletedAt: 100 },
                ashes_on_the_heath: { count: 1, lastCompletedAt: 200 },
                false_toll: { count: 1, lastCompletedAt: 300 }
            }
        }
    });

    assert.deepEqual(world.chapters.chapter_one.finale.preparationFlags, {
        tildas_wards: true,
        marlows_breach: true
    });
    assert.equal(world.chapters.chapter_one.status, 'finale');
    assert.equal(world.chapters.chapter_one.finale.status, 'ready');
    assert.equal(world.town.milestones.watchhouse_assault_ready.status, 'unlocked');
    assert.deepEqual(getAvailableTownServiceIds(world), [
        'quartermaster_stock',
        'tilda_ward_table',
        'marlow_road_watch',
        'watchhouse_planning'
    ]);
    assert.deepEqual(
        getAvailableTownStockEntries(world).map(entry => entry.itemId),
        ['round_shield', 'hunters_spear', 'hunter_bow', 'apprentice_staff', 'parrying_dagger', 'tankard_maul']
    );
    assert.ok(world.contracts.offered.watchhouse_reckoning);
});

test('world requirement evaluation supports facts, contracts, stages, milestones, and chapter flags', () => {
    const world = normalizeWorldState({
        facts: { pine_signal_chart: true },
        npcs: { tilda: 'wardkeeper' },
        town: { milestones: { tilda_ward_table_open: 'unlocked' } },
        contracts: { completed: { ashes_on_the_heath: 1 } }
    });
    assert.equal(worldRequirementsMet(world, {
        factsAll: ['pine_signal_chart'],
        factsAbsent: ['watchhouse_orders'],
        contractsCompleted: ['ashes_on_the_heath'],
        npcStages: { tilda: 'deciphering' },
        townMilestones: { tilda_ward_table_open: 'unlocked' },
        chapterPreparationFlagsAll: { chapter_one: ['tildas_wards'] }
    }), true);
    assert.equal(worldRequirementsMet(world, {
        chapterPreparationFlagsAll: { chapter_one: ['marlows_breach'] }
    }), false);
});

test('world merging preserves monotonic progress while current finale choice wins', () => {
    const merged = mergeWorldStates({
        npcs: { kreg: { stageId: 'concerned', interactionCount: 1 } },
        chapters: {
            chapter_one: {
                status: 'finale',
                finale: {
                    status: 'prepared',
                    preparationFlags: { tildas_wards: true, marlows_breach: true },
                    selectedPreparationOptionId: 'warded_approach',
                    selectedAt: 30
                }
            }
        },
        rewards: { choices: { first_return_kit: { status: 'claimed', claimedOptionId: 'spear_reach' } } }
    }, {
        facts: { pine_signal_chart: true },
        npcs: { kreg: { stageId: 'committed', interactionCount: 4 } },
        chapters: {
            chapter_one: {
                status: 'epilogue',
                finale: {
                    status: 'defeated',
                    preparationFlags: { tildas_wards: true, marlows_breach: true },
                    selectedPreparationOptionId: 'side_gate_breach',
                    defeatedAt: 40
                }
            }
        },
        rewards: { choices: { first_return_kit: { status: 'claimed', claimedOptionId: 'bow_reposition' } } }
    });

    assert.equal(merged.facts.pine_signal_chart, true);
    assert.equal(merged.npcs.kreg.stageId, 'committed');
    assert.equal(merged.npcs.kreg.interactionCount, 4);
    assert.equal(merged.chapters.chapter_one.finale.status, 'defeated');
    assert.equal(merged.chapters.chapter_one.finale.selectedPreparationOptionId, 'warded_approach');
    assert.equal(merged.chapters.chapter_one.finale.defeatedAt, 40);
    assert.equal(merged.rewards.choices.first_return_kit.claimedOptionId, 'spear_reach');
});

test('chapter completion and next-region evidence survive normalization', () => {
    const world = normalizeWorldState({
        destinationInteractions: { search_watchhouse_orders: { completionCount: 1 } },
        contracts: { completed: { watchhouse_reckoning: { count: 1, lastCompletedAt: 900 } } }
    });

    assert.equal(world.facts.watchhouse_orders, true);
    assert.equal(world.facts.north_road_patron, true);
    assert.equal(world.chapters.chapter_one.status, 'completed');
    assert.equal(world.chapters.chapter_one.finale.status, 'completed');
    assert.equal(world.chapters.chapter_one.epilogue.status, 'completed');
    assert.equal(world.chapters.chapter_one.completedAt, 900);
    assert.equal(world.town.milestones.road_network_restored.status, 'completed');
});
