// --- worldState.js ---
// Save-safe state for narrative facts, NPC arcs, town growth, interactions, and
// contracts. Combat statistics and rendering data do not belong in this state.

const {
    WorldFactCatalog,
    NpcCatalog,
    TownMilestoneCatalog,
    TownServiceCatalog,
    TownStockCatalog,
    WorldRewardChoiceCatalog,
    WorldChapterCatalog,
    DestinationInteractionCatalog,
    WorldContractCatalog
} = require('./worldCatalog.js');

const WORLD_SCHEMA_VERSION = 3;
const MILESTONE_STATUSES = ['locked', 'unlocked', 'completed'];
const CHAPTER_STATUSES = ['active', 'finale', 'epilogue', 'completed'];
const FINALE_STATUSES = ['locked', 'ready', 'prepared', 'defeated', 'completed'];
const EPILOGUE_STATUSES = ['locked', 'available', 'completed'];

function nonNegativeInt(value, fallback = 0) {
    const parsed = Math.trunc(Number(value));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function cleanTimestamp(value) {
    const parsed = nonNegativeInt(value, 0);
    return parsed > 0 ? parsed : undefined;
}

function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function laterTimestamp(first, second) {
    return Math.max(cleanTimestamp(first) || 0, cleanTimestamp(second) || 0) || undefined;
}

function stageIds(npc) {
    return npc.stages.map(stage => stage.id);
}

function normalizeFacts(source) {
    const facts = {};
    const sourceSet = new Set(Array.isArray(source) ? source : []);
    Object.keys(WorldFactCatalog).forEach(factId => {
        const raw = source && !Array.isArray(source) && typeof source === 'object'
            ? source[factId]
            : undefined;
        facts[factId] = sourceSet.has(factId)
            || raw === true
            || raw === 1
            || !!(raw && typeof raw === 'object' && (raw.value === true || raw.discovered === true));
    });
    return facts;
}

function normalizeNpcs(source) {
    const normalized = {};
    Object.values(NpcCatalog).forEach(npc => {
        const raw = source && typeof source === 'object' ? source[npc.id] : undefined;
        const record = raw && typeof raw === 'object' ? raw : {};
        const requestedStageId = typeof raw === 'string' ? raw : record.stageId || record.stage;
        const allowedStages = stageIds(npc);
        normalized[npc.id] = {
            stageId: allowedStages.includes(requestedStageId)
                ? requestedStageId
                : npc.initialStageId,
            interactionCount: nonNegativeInt(record.interactionCount != null
                ? record.interactionCount
                : record.interactions)
        };
        const lastInteractionAt = cleanTimestamp(record.lastInteractionAt);
        if (lastInteractionAt) normalized[npc.id].lastInteractionAt = lastInteractionAt;
    });
    return normalized;
}

function normalizeMilestoneStatus(raw, fallback) {
    if (raw === true) return 'unlocked';
    if (raw === false) return 'locked';
    const requested = typeof raw === 'string'
        ? raw.toLowerCase()
        : String(raw && (raw.status || (raw.completed === true ? 'completed' : ''))).toLowerCase();
    return MILESTONE_STATUSES.includes(requested) ? requested : fallback;
}

function normalizeTown(source) {
    const town = source && typeof source === 'object' ? source : {};
    const milestoneSource = town.milestones && typeof town.milestones === 'object'
        ? town.milestones
        : town;
    const milestones = {};
    Object.values(TownMilestoneCatalog).forEach(definition => {
        const raw = milestoneSource[definition.id];
        const status = normalizeMilestoneStatus(raw, definition.initialStatus);
        milestones[definition.id] = { status };
        const achievedAt = cleanTimestamp(raw && typeof raw === 'object' ? raw.achievedAt : undefined);
        if (achievedAt && status !== 'locked') milestones[definition.id].achievedAt = achievedAt;
    });
    return { milestones };
}

function normalizeDestinationInteractions(source) {
    const normalized = {};
    const completedIds = new Set(Array.isArray(source) ? source : []);
    Object.keys(DestinationInteractionCatalog).forEach(interactionId => {
        const raw = source && !Array.isArray(source) && typeof source === 'object'
            ? source[interactionId]
            : undefined;
        const record = raw && typeof raw === 'object' ? raw : {};
        let completionCount = completedIds.has(interactionId) || raw === true
            ? 1
            : nonNegativeInt(record.completionCount != null
                ? record.completionCount
                : record.completions);
        if (DestinationInteractionCatalog[interactionId].repeatability === 'once') {
            completionCount = Math.min(1, completionCount);
        }
        normalized[interactionId] = { completionCount };
        const lastCompletedAt = cleanTimestamp(record.lastCompletedAt);
        if (lastCompletedAt && completionCount > 0) {
            normalized[interactionId].lastCompletedAt = lastCompletedAt;
        }
    });
    return normalized;
}

function normalizeCompletedContracts(source) {
    const completed = {};
    const entries = Array.isArray(source)
        ? source.map(contractId => [contractId, { count: 1 }])
        : Object.entries(source && typeof source === 'object' ? source : {});
    entries.forEach(([contractId, raw]) => {
        const definition = WorldContractCatalog[contractId];
        if (!definition) return;
        const record = raw && typeof raw === 'object' ? raw : {};
        let count = nonNegativeInt(typeof raw === 'number' ? raw : record.count, 1);
        if (count < 1) return;
        if (!definition.repeatable) count = 1;
        completed[contractId] = { count };
        const lastCompletedAt = cleanTimestamp(record.lastCompletedAt);
        if (lastCompletedAt) completed[contractId].lastCompletedAt = lastCompletedAt;
    });
    return completed;
}

function createObjectiveProgress(objective, raw) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const target = Math.max(1, nonNegativeInt(objective.target, 1));
    const requestedProgress = typeof raw === 'number'
        ? raw
        : (record.progress != null ? record.progress : record.count);
    const progress = record.complete === true
        ? target
        : Math.min(target, nonNegativeInt(requestedProgress));
    const normalized = {
        progress,
        complete: progress >= target
    };
    const completedAt = cleanTimestamp(record.completedAt);
    if (completedAt && normalized.complete) normalized.completedAt = completedAt;
    return normalized;
}

function createActiveContractRecord(contractId, raw = {}, now) {
    const definition = WorldContractCatalog[contractId];
    if (!definition) return null;
    const record = raw && typeof raw === 'object' ? raw : {};
    const objectiveSource = record.objectives && typeof record.objectives === 'object'
        ? record.objectives
        : {};
    const objectives = {};
    definition.objectives.forEach(objective => {
        objectives[objective.id] = createObjectiveProgress(objective, objectiveSource[objective.id]);
    });
    const allComplete = definition.objectives.every(objective => objectives[objective.id].complete);
    const normalized = {
        status: allComplete ? 'claimable' : 'active',
        objectives
    };
    const acceptedAt = cleanTimestamp(record.acceptedAt) || cleanTimestamp(now);
    if (acceptedAt) normalized.acceptedAt = acceptedAt;
    return normalized;
}

function normalizeActiveContracts(source, completed) {
    const active = {};
    Object.entries(source && typeof source === 'object' && !Array.isArray(source) ? source : {})
        .forEach(([contractId, raw]) => {
            const definition = WorldContractCatalog[contractId];
            if (!definition || !raw || typeof raw !== 'object') return;
            if (!definition.repeatable && completed[contractId]) return;
            active[contractId] = createActiveContractRecord(contractId, raw);
        });
    return active;
}

function normalizeOfferedContracts(source, active, completed) {
    const offered = {};
    const entries = Array.isArray(source)
        ? source.map(contractId => [contractId, {}])
        : Object.entries(source && typeof source === 'object' ? source : {});

    Object.values(WorldContractCatalog).forEach(definition => {
        if (definition.initiallyOffered) entries.push([definition.id, {}]);
    });

    entries.forEach(([contractId, raw]) => {
        const definition = WorldContractCatalog[contractId];
        if (!definition || active[contractId]) return;
        if (!definition.repeatable && completed[contractId]) return;
        const record = {};
        const offeredAt = cleanTimestamp(raw && typeof raw === 'object' ? raw.offeredAt : undefined);
        if (offeredAt) record.offeredAt = offeredAt;
        offered[contractId] = record;
    });
    return offered;
}

function normalizeContracts(source) {
    const records = source && typeof source === 'object' ? source : {};
    const completed = normalizeCompletedContracts(records.completed);
    const active = normalizeActiveContracts(records.active, completed);
    const offered = normalizeOfferedContracts(records.offered || records.available, active, completed);
    return { offered, active, completed };
}

function normalizeRewardChoices(source) {
    const records = source && typeof source === 'object' && !Array.isArray(source)
        ? (source.choices && typeof source.choices === 'object' ? source.choices : source)
        : {};
    const choices = {};
    Object.values(WorldRewardChoiceCatalog).forEach(definition => {
        const raw = records[definition.id];
        const record = raw && typeof raw === 'object' ? raw : {};
        const validOptionIds = new Set(definition.options.map(option => option.id));
        const claimedOptionId = validOptionIds.has(record.claimedOptionId)
            ? record.claimedOptionId
            : undefined;
        const requestedStatus = String(record.status || '').toLowerCase();
        const status = claimedOptionId
            ? 'claimed'
            : (requestedStatus === 'available' ? 'available' : 'locked');
        choices[definition.id] = { status };
        const offeredAt = cleanTimestamp(record.offeredAt);
        const claimedAt = cleanTimestamp(record.claimedAt);
        if (status !== 'locked' && offeredAt) choices[definition.id].offeredAt = offeredAt;
        if (status === 'claimed') {
            choices[definition.id].claimedOptionId = claimedOptionId;
            if (claimedAt) choices[definition.id].claimedAt = claimedAt;
        }
    });
    return { choices };
}

function statusAtLeast(current, requested, statuses) {
    return statuses.indexOf(current) >= statuses.indexOf(requested);
}

function laterStatus(first, second, statuses) {
    return statuses[Math.max(
        Math.max(0, statuses.indexOf(first)),
        Math.max(0, statuses.indexOf(second))
    )];
}

function normalizeKnownStatus(value, allowed, fallback) {
    const requested = String(value || '').toLowerCase();
    return allowed.includes(requested) ? requested : fallback;
}

function normalizeChapters(source) {
    const records = isRecord(source) ? source : {};
    const chapters = {};
    Object.values(WorldChapterCatalog).forEach(definition => {
        const raw = isRecord(records[definition.id])
            ? records[definition.id]
            : (definition.id === 'chapter_one' && isRecord(records.finale) ? records : {});
        const finaleRaw = isRecord(raw.finale) ? raw.finale : {};
        const epilogueRaw = isRecord(raw.epilogue) ? raw.epilogue : {};
        const rawFlags = isRecord(finaleRaw.preparationFlags)
            ? finaleRaw.preparationFlags
            : (isRecord(raw.preparationFlags) ? raw.preparationFlags : {});
        const flagSet = new Set(Array.isArray(finaleRaw.preparationFlags)
            ? finaleRaw.preparationFlags
            : (Array.isArray(raw.preparationFlags) ? raw.preparationFlags : []));
        const preparationFlags = {};
        definition.finale.preparationFlags.forEach(flag => {
            preparationFlags[flag.id] = flagSet.has(flag.id)
                || rawFlags[flag.id] === true
                || !!(isRecord(rawFlags[flag.id]) && rawFlags[flag.id].unlocked === true);
        });

        let finaleStatus = normalizeKnownStatus(finaleRaw.status, FINALE_STATUSES, 'locked');
        const validOptions = definition.finale.preparationOptions.filter(option => (
            option.requiredFlagIds.every(flagId => preparationFlags[flagId] === true)
        ));
        const requestedOptionId = finaleRaw.selectedPreparationOptionId
            || finaleRaw.selectedOptionId
            || raw.selectedPreparationOptionId;
        const selectedPreparationOptionId = validOptions.some(option => option.id === requestedOptionId)
            ? requestedOptionId
            : undefined;
        if (selectedPreparationOptionId && !statusAtLeast(finaleStatus, 'prepared', FINALE_STATUSES)) {
            finaleStatus = 'prepared';
        }

        let chapterStatus = normalizeKnownStatus(raw.status, CHAPTER_STATUSES, definition.initialStatus);
        let epilogueStatus = normalizeKnownStatus(epilogueRaw.status, EPILOGUE_STATUSES, 'locked');
        if (statusAtLeast(finaleStatus, 'defeated', FINALE_STATUSES)) {
            chapterStatus = laterStatus(chapterStatus, 'epilogue', CHAPTER_STATUSES);
            epilogueStatus = laterStatus(epilogueStatus, 'available', EPILOGUE_STATUSES);
        } else if (statusAtLeast(finaleStatus, 'ready', FINALE_STATUSES)) {
            chapterStatus = laterStatus(chapterStatus, 'finale', CHAPTER_STATUSES);
        }
        if (chapterStatus === 'completed') {
            finaleStatus = 'completed';
            epilogueStatus = 'completed';
        }

        chapters[definition.id] = {
            status: chapterStatus,
            finale: {
                status: finaleStatus,
                preparationFlags
            },
            epilogue: { status: epilogueStatus }
        };
        if (selectedPreparationOptionId) {
            chapters[definition.id].finale.selectedPreparationOptionId = selectedPreparationOptionId;
        }
        const selectedAt = cleanTimestamp(finaleRaw.selectedAt);
        const defeatedAt = cleanTimestamp(finaleRaw.defeatedAt);
        const completedAt = cleanTimestamp(raw.completedAt);
        const epilogueAvailableAt = cleanTimestamp(epilogueRaw.availableAt);
        const epilogueCompletedAt = cleanTimestamp(epilogueRaw.completedAt);
        if (selectedAt && selectedPreparationOptionId) chapters[definition.id].finale.selectedAt = selectedAt;
        if (defeatedAt && statusAtLeast(finaleStatus, 'defeated', FINALE_STATUSES)) {
            chapters[definition.id].finale.defeatedAt = defeatedAt;
        }
        if (completedAt && chapterStatus === 'completed') chapters[definition.id].completedAt = completedAt;
        if (epilogueAvailableAt && epilogueStatus !== 'locked') {
            chapters[definition.id].epilogue.availableAt = epilogueAvailableAt;
        }
        if (epilogueCompletedAt && epilogueStatus === 'completed') {
            chapters[definition.id].epilogue.completedAt = epilogueCompletedAt;
        }
    });
    return chapters;
}

function createInitialWorldState() {
    return normalizeWorldState({});
}

function contractCompletionCount(world, contractId) {
    const record = world.contracts.completed[contractId];
    return record ? nonNegativeInt(record.count) : 0;
}

function requirementsMetNormalized(world, requirements = {}) {
    const factsAll = Array.isArray(requirements.factsAll) ? requirements.factsAll : [];
    const factsAny = Array.isArray(requirements.factsAny) ? requirements.factsAny : [];
    const factsAbsent = Array.isArray(requirements.factsAbsent) ? requirements.factsAbsent : [];
    if (!factsAll.every(factId => WorldFactCatalog[factId] && world.facts[factId] === true)) return false;
    if (factsAny.length > 0 && !factsAny.some(factId => WorldFactCatalog[factId] && world.facts[factId])) {
        return false;
    }
    if (!factsAbsent.every(factId => WorldFactCatalog[factId] && world.facts[factId] !== true)) return false;

    const milestonesMet = Object.entries(requirements.townMilestones || {}).every(
        ([milestoneId, minimumStatus]) => {
            const current = world.town.milestones[milestoneId];
            return current
                && MILESTONE_STATUSES.includes(minimumStatus)
                && statusAtLeast(current.status, minimumStatus, MILESTONE_STATUSES);
        }
    );
    if (!milestonesMet) return false;

    const npcStagesMet = Object.entries(requirements.npcStages || {}).every(
        ([npcId, minimumStageId]) => {
            const npc = NpcCatalog[npcId];
            const current = world.npcs[npcId];
            return npc && current
                && stageIds(npc).includes(minimumStageId)
                && stageIds(npc).indexOf(current.stageId) >= stageIds(npc).indexOf(minimumStageId);
        }
    );
    if (!npcStagesMet) return false;

    const completedRequirements = Array.isArray(requirements.contractsCompleted)
        ? Object.fromEntries(requirements.contractsCompleted.map(contractId => [contractId, 1]))
        : (requirements.contractsCompleted || {});
    if (!Object.entries(completedRequirements).every(([contractId, minimumCount]) => (
        WorldContractCatalog[contractId]
        && contractCompletionCount(world, contractId) >= Math.max(1, nonNegativeInt(minimumCount, 1))
    ))) return false;

    const flagsMet = Object.entries(requirements.chapterPreparationFlagsAll || {}).every(
        ([chapterId, flagIds]) => {
            const chapter = world.chapters[chapterId];
            return chapter && Array.isArray(flagIds) && flagIds.every(flagId => (
                chapter.finale.preparationFlags[flagId] === true
            ));
        }
    );
    if (!flagsMet) return false;

    const chapterStatusesMet = Object.entries(requirements.chapterStatuses || {}).every(
        ([chapterId, minimumStatus]) => {
            const chapter = world.chapters[chapterId];
            return chapter
                && CHAPTER_STATUSES.includes(minimumStatus)
                && statusAtLeast(chapter.status, minimumStatus, CHAPTER_STATUSES);
        }
    );
    if (!chapterStatusesMet) return false;

    const finaleStatusesMet = Object.entries(requirements.chapterFinaleStatuses || {}).every(
        ([chapterId, minimumStatus]) => {
            const chapter = world.chapters[chapterId];
            return chapter
                && FINALE_STATUSES.includes(minimumStatus)
                && statusAtLeast(chapter.finale.status, minimumStatus, FINALE_STATUSES);
        }
    );
    return finaleStatusesMet;
}

function worldRequirementsMet(source, requirements = {}) {
    const world = source && source.schemaVersion === WORLD_SCHEMA_VERSION && source.chapters
        ? source
        : normalizeWorldState(source);
    return requirementsMetNormalized(world, requirements);
}

function advanceNpcAtLeast(world, npcId, stageId) {
    const npc = NpcCatalog[npcId];
    if (!npc || !world.npcs[npcId]) return;
    const ids = stageIds(npc);
    if (ids.indexOf(stageId) > ids.indexOf(world.npcs[npcId].stageId)) {
        world.npcs[npcId].stageId = stageId;
    }
}

function unlockMilestoneAtLeast(world, milestoneId, status = 'unlocked', achievedAt) {
    const milestone = world.town.milestones[milestoneId];
    if (!milestone || !MILESTONE_STATUSES.includes(status)) return;
    if (MILESTONE_STATUSES.indexOf(status) > MILESTONE_STATUSES.indexOf(milestone.status)) {
        milestone.status = status;
    }
    const timestamp = cleanTimestamp(achievedAt);
    if (timestamp && milestone.status !== 'locked') {
        milestone.achievedAt = laterTimestamp(milestone.achievedAt, timestamp);
    }
}

function offerContractIfAvailable(world, contractId, offeredAt) {
    const definition = WorldContractCatalog[contractId];
    if (!definition
        || world.contracts.active[contractId]
        || world.contracts.offered[contractId]
        || (!definition.repeatable && world.contracts.completed[contractId])
        || !requirementsMetNormalized(world, definition.availability || {})) return;
    const timestamp = cleanTimestamp(offeredAt);
    world.contracts.offered[contractId] = timestamp ? { offeredAt: timestamp } : {};
}

function reconcileDurableDiscoveries(world) {
    const interactionFacts = {
        inspect_wreck: 'forged_toll_seal',
        search_signal_cache: 'pine_signal_chart',
        trace_heath_signal: 'heath_signal_cipher',
        seize_toll_ledger: 'toll_gang_ledger',
        search_watchhouse_orders: 'watchhouse_orders'
    };
    Object.entries(interactionFacts).forEach(([interactionId, factId]) => {
        if (world.destinationInteractions[interactionId].completionCount > 0) world.facts[factId] = true;
    });
    if (world.destinationInteractions.search_watchhouse_orders.completionCount > 0) {
        world.facts.north_road_patron = true;
    }

    const oldRoadSearch = world.destinationInteractions.inspect_wreck;
    if (world.facts.forged_toll_seal) {
        advanceNpcAtLeast(world, 'kreg', 'concerned');
        advanceNpcAtLeast(world, 'marlow', 'suspicious');
        offerContractIfAvailable(world, 'false_toll', oldRoadSearch.lastCompletedAt);
    }
    const pineSearch = world.destinationInteractions.search_signal_cache;
    if (world.facts.pine_signal_chart) {
        advanceNpcAtLeast(world, 'elowen', 'informed');
        advanceNpcAtLeast(world, 'tilda', 'curious');
        offerContractIfAvailable(world, 'road_conditions_pine', pineSearch.lastCompletedAt);
        offerContractIfAvailable(world, 'ashes_on_the_heath', pineSearch.lastCompletedAt);
    }
    if (world.facts.heath_signal_cipher) advanceNpcAtLeast(world, 'tilda', 'deciphering');
    if (world.facts.toll_gang_ledger) advanceNpcAtLeast(world, 'marlow', 'scouting');
    if (world.contracts.completed.missing_kegs) {
        advanceNpcAtLeast(world, 'kreg', 'committed');
        advanceNpcAtLeast(world, 'mara', 'quartermaster');
        unlockMilestoneAtLeast(
            world,
            'quartermaster_stall_open',
            'unlocked',
            world.contracts.completed.missing_kegs.lastCompletedAt
        );
    }

    const chapter = world.chapters.chapter_one;
    if (world.contracts.completed.ashes_on_the_heath) {
        chapter.finale.preparationFlags.tildas_wards = true;
        advanceNpcAtLeast(world, 'tilda', 'wardkeeper');
        unlockMilestoneAtLeast(
            world,
            'tilda_ward_table_open',
            'unlocked',
            world.contracts.completed.ashes_on_the_heath.lastCompletedAt
        );
        offerContractIfAvailable(world, 'heath_watch', world.contracts.completed.ashes_on_the_heath.lastCompletedAt);
    }
    if (world.contracts.completed.false_toll) {
        chapter.finale.preparationFlags.marlows_breach = true;
        advanceNpcAtLeast(world, 'marlow', 'road_captain');
        unlockMilestoneAtLeast(
            world,
            'marlow_road_watch_open',
            'unlocked',
            world.contracts.completed.false_toll.lastCompletedAt
        );
        offerContractIfAvailable(world, 'crossing_patrol', world.contracts.completed.false_toll.lastCompletedAt);
    }

    const chapterDefinition = WorldChapterCatalog.chapter_one;
    if (requirementsMetNormalized(world, chapterDefinition.finale.unlockRequirements)) {
        chapter.status = laterStatus(chapter.status, 'finale', CHAPTER_STATUSES);
        chapter.finale.status = laterStatus(chapter.finale.status, 'ready', FINALE_STATUSES);
        unlockMilestoneAtLeast(
            world,
            'watchhouse_assault_ready',
            'unlocked',
            laterTimestamp(
                world.contracts.completed.ashes_on_the_heath
                    && world.contracts.completed.ashes_on_the_heath.lastCompletedAt,
                world.contracts.completed.false_toll
                    && world.contracts.completed.false_toll.lastCompletedAt
            )
        );
        offerContractIfAvailable(world, chapterDefinition.finale.contractId);
    }
    if (chapter.finale.selectedPreparationOptionId) {
        chapter.finale.status = laterStatus(chapter.finale.status, 'prepared', FINALE_STATUSES);
    }
    if (statusAtLeast(chapter.finale.status, 'defeated', FINALE_STATUSES)) {
        chapter.status = laterStatus(chapter.status, 'epilogue', CHAPTER_STATUSES);
        chapter.epilogue.status = laterStatus(chapter.epilogue.status, 'available', EPILOGUE_STATUSES);
    }
    if (world.contracts.completed.watchhouse_reckoning || chapter.status === 'completed') {
        const completedAt = cleanTimestamp(
            world.contracts.completed.watchhouse_reckoning
                && world.contracts.completed.watchhouse_reckoning.lastCompletedAt
        ) || cleanTimestamp(chapter.completedAt);
        chapter.status = 'completed';
        chapter.finale.status = 'completed';
        chapter.epilogue.status = 'completed';
        if (completedAt) {
            chapter.completedAt = completedAt;
            chapter.epilogue.completedAt = completedAt;
        }
        unlockMilestoneAtLeast(world, 'road_network_restored', 'completed');
        advanceNpcAtLeast(world, 'kreg', 'relieved');
        advanceNpcAtLeast(world, 'elowen', 'watchful');
        advanceNpcAtLeast(world, 'mara', 'provisioned');
        advanceNpcAtLeast(world, 'tilda', 'settled');
        advanceNpcAtLeast(world, 'marlow', 'staying');
    }
    return world;
}

function normalizeWorldState(source) {
    const record = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
    return reconcileDurableDiscoveries({
        schemaVersion: WORLD_SCHEMA_VERSION,
        facts: normalizeFacts(record.facts || record.discoveredFacts),
        npcs: normalizeNpcs(record.npcs || record.npcStates),
        town: normalizeTown(record.town),
        destinationInteractions: normalizeDestinationInteractions(
            record.destinationInteractions || record.completedDestinationInteractions
        ),
        contracts: normalizeContracts(record.contracts),
        rewards: normalizeRewardChoices(record.rewards || record.rewardChoices),
        chapters: normalizeChapters(record.chapters || record.chapter)
    });
}

function mergeActiveContract(current, legacy, definition) {
    const preferred = current || legacy;
    if (!preferred) return undefined;
    const objectives = {};
    definition.objectives.forEach(objective => {
        const currentProgress = current && current.objectives[objective.id];
        const legacyProgress = legacy && legacy.objectives[objective.id];
        const progress = Math.max(
            currentProgress ? currentProgress.progress : 0,
            legacyProgress ? legacyProgress.progress : 0
        );
        objectives[objective.id] = { progress };
        const completedAt = laterTimestamp(
            currentProgress && currentProgress.completedAt,
            legacyProgress && legacyProgress.completedAt
        );
        if (completedAt && progress >= Math.max(1, nonNegativeInt(objective.target, 1))) {
            objectives[objective.id].completedAt = completedAt;
        }
    });
    const merged = { objectives };
    const acceptedAt = cleanTimestamp(preferred.acceptedAt)
        || cleanTimestamp(current && current.acceptedAt)
        || cleanTimestamp(legacy && legacy.acceptedAt);
    if (acceptedAt) merged.acceptedAt = acceptedAt;
    return merged;
}

function mergeWorldStates(currentSource, legacySource) {
    const currentRecord = isRecord(currentSource) ? currentSource : {};
    const legacyRecord = isRecord(legacySource) ? legacySource : {};
    const current = normalizeWorldState(currentRecord);
    const legacy = normalizeWorldState(legacyRecord);
    const merged = createInitialWorldState();

    Object.keys(WorldFactCatalog).forEach(factId => {
        merged.facts[factId] = current.facts[factId] || legacy.facts[factId];
    });

    Object.values(NpcCatalog).forEach(npc => {
        const ids = stageIds(npc);
        const stageId = ids[Math.max(
            ids.indexOf(current.npcs[npc.id].stageId),
            ids.indexOf(legacy.npcs[npc.id].stageId)
        )];
        merged.npcs[npc.id] = {
            stageId,
            interactionCount: Math.max(
                current.npcs[npc.id].interactionCount,
                legacy.npcs[npc.id].interactionCount
            )
        };
        const lastInteractionAt = laterTimestamp(
            current.npcs[npc.id].lastInteractionAt,
            legacy.npcs[npc.id].lastInteractionAt
        );
        if (lastInteractionAt) merged.npcs[npc.id].lastInteractionAt = lastInteractionAt;
    });

    Object.values(TownMilestoneCatalog).forEach(definition => {
        const currentMilestone = current.town.milestones[definition.id];
        const legacyMilestone = legacy.town.milestones[definition.id];
        const status = MILESTONE_STATUSES[
            Math.max(
                MILESTONE_STATUSES.indexOf(currentMilestone.status),
                MILESTONE_STATUSES.indexOf(legacyMilestone.status)
            )
        ];
        merged.town.milestones[definition.id] = { status };
        const achievedAt = laterTimestamp(currentMilestone.achievedAt, legacyMilestone.achievedAt);
        if (achievedAt && status !== 'locked') {
            merged.town.milestones[definition.id].achievedAt = achievedAt;
        }
    });

    Object.keys(DestinationInteractionCatalog).forEach(interactionId => {
        const currentInteraction = current.destinationInteractions[interactionId];
        const legacyInteraction = legacy.destinationInteractions[interactionId];
        const completionCount = Math.max(
            currentInteraction.completionCount,
            legacyInteraction.completionCount
        );
        merged.destinationInteractions[interactionId] = { completionCount };
        const lastCompletedAt = laterTimestamp(
            currentInteraction.lastCompletedAt,
            legacyInteraction.lastCompletedAt
        );
        if (lastCompletedAt && completionCount > 0) {
            merged.destinationInteractions[interactionId].lastCompletedAt = lastCompletedAt;
        }
    });

    merged.contracts = { offered: {}, active: {}, completed: {} };
    Object.values(WorldContractCatalog).forEach(definition => {
        const currentCompleted = current.contracts.completed[definition.id];
        const legacyCompleted = legacy.contracts.completed[definition.id];
        if (currentCompleted || legacyCompleted) {
            merged.contracts.completed[definition.id] = {
                count: Math.max(
                    currentCompleted ? currentCompleted.count : 0,
                    legacyCompleted ? legacyCompleted.count : 0
                )
            };
            const lastCompletedAt = laterTimestamp(
                currentCompleted && currentCompleted.lastCompletedAt,
                legacyCompleted && legacyCompleted.lastCompletedAt
            );
            if (lastCompletedAt) {
                merged.contracts.completed[definition.id].lastCompletedAt = lastCompletedAt;
            }
        }

        const currentActive = current.contracts.active[definition.id];
        const legacyActive = legacy.contracts.active[definition.id];
        if (currentActive || legacyActive) {
            merged.contracts.active[definition.id] = mergeActiveContract(
                currentActive,
                legacyActive,
                definition
            );
            return;
        }

        const currentOffered = current.contracts.offered[definition.id];
        const legacyOffered = legacy.contracts.offered[definition.id];
        if (currentOffered || legacyOffered) {
            merged.contracts.offered[definition.id] = {};
            const offeredAt = cleanTimestamp(currentOffered && currentOffered.offeredAt)
                || cleanTimestamp(legacyOffered && legacyOffered.offeredAt);
            if (offeredAt) merged.contracts.offered[definition.id].offeredAt = offeredAt;
        }
    });

    Object.values(WorldRewardChoiceCatalog).forEach(definition => {
        const currentChoice = current.rewards.choices[definition.id];
        const legacyChoice = legacy.rewards.choices[definition.id];
        let preferred = currentChoice;
        if (currentChoice.status !== 'claimed' && legacyChoice.status === 'claimed') {
            preferred = legacyChoice;
        } else if (currentChoice.status === 'locked' && legacyChoice.status === 'available') {
            preferred = legacyChoice;
        }
        merged.rewards.choices[definition.id] = { status: preferred.status };
        if (preferred.status !== 'locked') {
            const offeredAt = cleanTimestamp(preferred.offeredAt)
                || cleanTimestamp(currentChoice.offeredAt)
                || cleanTimestamp(legacyChoice.offeredAt);
            if (offeredAt) merged.rewards.choices[definition.id].offeredAt = offeredAt;
        }
        if (preferred.status === 'claimed') {
            merged.rewards.choices[definition.id].claimedOptionId = preferred.claimedOptionId;
            const other = preferred === currentChoice ? legacyChoice : currentChoice;
            const claimedAt = cleanTimestamp(preferred.claimedAt)
                || (other.claimedOptionId === preferred.claimedOptionId
                    ? cleanTimestamp(other.claimedAt)
                    : undefined);
            if (claimedAt) merged.rewards.choices[definition.id].claimedAt = claimedAt;
        }
    });

    merged.chapters = {};
    const currentChapterSource = isRecord(currentRecord.chapters)
        ? currentRecord.chapters
        : (isRecord(currentRecord.chapter) ? currentRecord.chapter : {});
    Object.values(WorldChapterCatalog).forEach(definition => {
        const currentChapter = current.chapters[definition.id];
        const legacyChapter = legacy.chapters[definition.id];
        const flags = {};
        definition.finale.preparationFlags.forEach(flag => {
            flags[flag.id] = currentChapter.finale.preparationFlags[flag.id]
                || legacyChapter.finale.preparationFlags[flag.id];
        });
        const currentWasPersisted = Object.prototype.hasOwnProperty.call(currentChapterSource, definition.id)
            || (definition.id === 'chapter_one' && isRecord(currentRecord.chapter));
        const preferredSelected = currentWasPersisted
            ? currentChapter.finale.selectedPreparationOptionId
            : legacyChapter.finale.selectedPreparationOptionId;
        const fallbackSelected = preferredSelected
            || currentChapter.finale.selectedPreparationOptionId
            || legacyChapter.finale.selectedPreparationOptionId;
        merged.chapters[definition.id] = {
            status: laterStatus(currentChapter.status, legacyChapter.status, CHAPTER_STATUSES),
            finale: {
                status: laterStatus(
                    currentChapter.finale.status,
                    legacyChapter.finale.status,
                    FINALE_STATUSES
                ),
                preparationFlags: flags
            },
            epilogue: {
                status: laterStatus(
                    currentChapter.epilogue.status,
                    legacyChapter.epilogue.status,
                    EPILOGUE_STATUSES
                )
            }
        };
        if (fallbackSelected) {
            merged.chapters[definition.id].finale.selectedPreparationOptionId = fallbackSelected;
        }
        const selectedAt = laterTimestamp(
            currentChapter.finale.selectedAt,
            legacyChapter.finale.selectedAt
        );
        const defeatedAt = laterTimestamp(
            currentChapter.finale.defeatedAt,
            legacyChapter.finale.defeatedAt
        );
        const completedAt = laterTimestamp(currentChapter.completedAt, legacyChapter.completedAt);
        const epilogueAvailableAt = laterTimestamp(
            currentChapter.epilogue.availableAt,
            legacyChapter.epilogue.availableAt
        );
        const epilogueCompletedAt = laterTimestamp(
            currentChapter.epilogue.completedAt,
            legacyChapter.epilogue.completedAt
        );
        if (selectedAt && fallbackSelected) merged.chapters[definition.id].finale.selectedAt = selectedAt;
        if (defeatedAt) merged.chapters[definition.id].finale.defeatedAt = defeatedAt;
        if (completedAt) merged.chapters[definition.id].completedAt = completedAt;
        if (epilogueAvailableAt) merged.chapters[definition.id].epilogue.availableAt = epilogueAvailableAt;
        if (epilogueCompletedAt) merged.chapters[definition.id].epilogue.completedAt = epilogueCompletedAt;
    });

    return normalizeWorldState(merged);
}

function ensureWorldState(player) {
    if (!player || typeof player !== 'object') return createInitialWorldState();
    const current = isRecord(player.world) ? player.world : null;
    const legacy = isRecord(player.worldState) ? player.worldState : null;
    player.world = current && legacy
        ? mergeWorldStates(current, legacy)
        : normalizeWorldState(current || legacy || {});
    return player.world;
}

function getAvailableTownServiceIds(source) {
    const world = normalizeWorldState(source);
    return Object.values(TownServiceCatalog)
        .filter(service => requirementsMetNormalized(world, service.requirements || {}))
        .map(service => service.id);
}

function getAvailableTownStockEntries(source, serviceId) {
    const world = normalizeWorldState(source);
    const availableServices = new Set(getAvailableTownServiceIds(world));
    return Object.values(TownStockCatalog).filter(entry => (
        (!serviceId || entry.serviceId === serviceId)
        && availableServices.has(entry.serviceId)
        && requirementsMetNormalized(world, entry.requirements || {})
    ));
}

module.exports = {
    WORLD_SCHEMA_VERSION,
    MILESTONE_STATUSES,
    CHAPTER_STATUSES,
    FINALE_STATUSES,
    EPILOGUE_STATUSES,
    createInitialWorldState,
    normalizeWorldState,
    mergeWorldStates,
    ensureWorldState,
    createActiveContractRecord,
    worldRequirementsMet,
    getAvailableTownServiceIds,
    getAvailableTownStockEntries
};
