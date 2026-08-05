// --- worldEvents.js ---
// Pure world-domain commands and event reduction. Callers own persistence by
// assigning the returned state to player.world.

const {
    WorldFactCatalog,
    NpcCatalog,
    TownMilestoneCatalog,
    DestinationInteractionCatalog,
    WorldContractCatalog,
    WorldRewardChoiceCatalog,
    WorldChapterCatalog
} = require('./worldCatalog.js');
const {
    MILESTONE_STATUSES,
    CHAPTER_STATUSES,
    FINALE_STATUSES,
    normalizeWorldState,
    createActiveContractRecord,
    worldRequirementsMet
} = require('./worldState.js');

const WORLD_EFFECT_TYPES = Object.freeze({
    SET_FACT: 'SET_FACT',
    ADVANCE_NPC: 'ADVANCE_NPC',
    SET_TOWN_MILESTONE: 'SET_TOWN_MILESTONE',
    OFFER_CONTRACT: 'OFFER_CONTRACT',
    COMPLETE_OBJECTIVE: 'COMPLETE_OBJECTIVE',
    SET_CHAPTER_PREPARATION: 'SET_CHAPTER_PREPARATION',
    SET_FINALE_STATUS: 'SET_FINALE_STATUS',
    COMPLETE_CHAPTER: 'COMPLETE_CHAPTER'
});

const WORLD_EVENT_TYPES = Object.freeze({
    DESTINATION_INTERACTION_COMPLETED: 'DESTINATION_INTERACTION_COMPLETED',
    LOCATION_DISCOVERED: 'LOCATION_DISCOVERED',
    ENCOUNTER_DEFEATED: 'ENCOUNTER_DEFEATED',
    SAFE_RETURN: 'SAFE_RETURN',
    CONTRACT_CLAIMED: 'CONTRACT_CLAIMED',
    FINALE_PREPARATION_SELECTED: 'FINALE_PREPARATION_SELECTED'
});

const WORLD_OBJECTIVE_TYPES = Object.freeze({
    DISCOVER: 'discover',
    INTERACT: 'interact',
    DEFEAT: 'defeat',
    SAFE_RETURN: 'safe_return',
    CONTRACT: 'contract',
    PREPARE: 'prepare'
});

function nonNegativeInt(value, fallback = 0) {
    const parsed = Math.trunc(Number(value));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function cleanTimestamp(value) {
    const parsed = nonNegativeInt(value, 0);
    return parsed > 0 ? parsed : undefined;
}

function eventValue(event, key) {
    if (Object.prototype.hasOwnProperty.call(event, key)) return event[key];
    if (event.payload && typeof event.payload === 'object') return event.payload[key];
    return undefined;
}

function matchesExpected(actual, expected) {
    if (Array.isArray(expected)) return expected.includes(actual);
    if (expected && typeof expected === 'object') {
        if (Array.isArray(expected.in)) return expected.in.includes(actual);
        if (Object.prototype.hasOwnProperty.call(expected, 'equals')) return actual === expected.equals;
        if (Object.prototype.hasOwnProperty.call(expected, 'exists')) {
            return expected.exists ? actual !== undefined : actual === undefined;
        }
    }
    return actual === expected;
}

function eventMatchesObjective(event, objective) {
    if (!event || typeof event !== 'object' || event.type !== objective.eventType) return false;
    return Object.entries(objective.match || {}).every(([key, expected]) => (
        matchesExpected(eventValue(event, key), expected)
    ));
}

function effectResult(effect, applied, reason) {
    return {
        effect: { ...effect },
        applied,
        ...(reason ? { reason } : {})
    };
}

function statusAtLeast(current, requested, statuses) {
    return statuses.indexOf(current) >= statuses.indexOf(requested);
}

function applyEffectMutable(world, effect, context, results, depth = 0) {
    if (!effect || typeof effect !== 'object' || depth > 12) {
        results.push(effectResult(effect || {}, false, depth > 12 ? 'effect_depth_exceeded' : 'invalid_effect'));
        return;
    }

    const now = cleanTimestamp(context.now);
    switch (effect.type) {
        case WORLD_EFFECT_TYPES.SET_FACT: {
            if (!WorldFactCatalog[effect.factId]) {
                results.push(effectResult(effect, false, 'unknown_fact'));
                return;
            }
            const value = effect.value !== false;
            if (world.facts[effect.factId] === value) {
                results.push(effectResult(effect, false, 'no_change'));
                return;
            }
            world.facts[effect.factId] = value;
            results.push(effectResult(effect, true));
            return;
        }
        case WORLD_EFFECT_TYPES.ADVANCE_NPC: {
            const npc = NpcCatalog[effect.npcId];
            if (!npc) {
                results.push(effectResult(effect, false, 'unknown_npc'));
                return;
            }
            const ids = npc.stages.map(stage => stage.id);
            const currentIndex = ids.indexOf(world.npcs[npc.id].stageId);
            const targetIndex = effect.stageId
                ? ids.indexOf(effect.stageId)
                : Math.min(ids.length - 1, currentIndex + Math.max(1, nonNegativeInt(effect.steps, 1)));
            if (targetIndex < 0) {
                results.push(effectResult(effect, false, 'unknown_npc_stage'));
                return;
            }
            if (targetIndex <= currentIndex) {
                results.push(effectResult(effect, false, 'no_change'));
                return;
            }
            world.npcs[npc.id].stageId = ids[targetIndex];
            results.push(effectResult(effect, true));
            return;
        }
        case WORLD_EFFECT_TYPES.SET_TOWN_MILESTONE: {
            const milestone = TownMilestoneCatalog[effect.milestoneId];
            const targetStatus = String(effect.status || 'unlocked').toLowerCase();
            if (!milestone) {
                results.push(effectResult(effect, false, 'unknown_milestone'));
                return;
            }
            if (!MILESTONE_STATUSES.includes(targetStatus)) {
                results.push(effectResult(effect, false, 'unknown_milestone_status'));
                return;
            }
            const record = world.town.milestones[milestone.id];
            if (MILESTONE_STATUSES.indexOf(targetStatus) <= MILESTONE_STATUSES.indexOf(record.status)) {
                results.push(effectResult(effect, false, 'no_change'));
                return;
            }
            record.status = targetStatus;
            if (now) record.achievedAt = now;
            results.push(effectResult(effect, true));
            return;
        }
        case WORLD_EFFECT_TYPES.OFFER_CONTRACT: {
            const definition = WorldContractCatalog[effect.contractId];
            if (!definition) {
                results.push(effectResult(effect, false, 'unknown_contract'));
                return;
            }
            if (world.contracts.active[definition.id]
                || world.contracts.offered[definition.id]
                || (!definition.repeatable && world.contracts.completed[definition.id])) {
                results.push(effectResult(effect, false, 'contract_unavailable'));
                return;
            }
            if (!worldRequirementsMet(world, definition.availability || {})) {
                results.push(effectResult(effect, false, 'contract_requirements_unmet'));
                return;
            }
            world.contracts.offered[definition.id] = now ? { offeredAt: now } : {};
            results.push(effectResult(effect, true));
            return;
        }
        case WORLD_EFFECT_TYPES.COMPLETE_OBJECTIVE: {
            const definition = WorldContractCatalog[effect.contractId];
            const active = world.contracts.active[effect.contractId];
            const objective = definition && definition.objectives.find(item => item.id === effect.objectiveId);
            const progress = active && active.objectives[effect.objectiveId];
            if (!definition || !active || !objective || !progress) {
                results.push(effectResult(effect, false, 'inactive_or_unknown_objective'));
                return;
            }
            if (progress.complete) {
                results.push(effectResult(effect, false, 'objective_already_complete'));
                return;
            }
            const target = Math.max(1, nonNegativeInt(objective.target, 1));
            const amount = effect.complete === true
                ? target
                : Math.max(1, nonNegativeInt(effect.amount, 1));
            progress.progress = Math.min(target, progress.progress + amount);
            progress.complete = progress.progress >= target;
            if (progress.complete && now) progress.completedAt = now;
            results.push(effectResult(effect, true));

            if (progress.complete) {
                (objective.onCompleteEffects || []).forEach(nestedEffect => {
                    applyEffectMutable(world, nestedEffect, context, results, depth + 1);
                });
            }
            if (definition.objectives.every(item => active.objectives[item.id].complete)) {
                active.status = 'claimable';
            }
            return;
        }
        case WORLD_EFFECT_TYPES.SET_CHAPTER_PREPARATION: {
            const definition = WorldChapterCatalog[effect.chapterId];
            const chapter = definition && world.chapters[effect.chapterId];
            const knownFlag = definition && definition.finale.preparationFlags.some(
                flag => flag.id === effect.flagId
            );
            if (!definition || !chapter || !knownFlag) {
                results.push(effectResult(effect, false, 'unknown_chapter_preparation'));
                return;
            }
            if (chapter.finale.preparationFlags[effect.flagId]) {
                results.push(effectResult(effect, false, 'no_change'));
                return;
            }
            chapter.finale.preparationFlags[effect.flagId] = true;
            results.push(effectResult(effect, true));
            return;
        }
        case WORLD_EFFECT_TYPES.SET_FINALE_STATUS: {
            const definition = WorldChapterCatalog[effect.chapterId];
            const chapter = definition && world.chapters[effect.chapterId];
            const targetStatus = String(effect.status || '').toLowerCase();
            if (!definition || !chapter) {
                results.push(effectResult(effect, false, 'unknown_chapter'));
                return;
            }
            if (!FINALE_STATUSES.includes(targetStatus)) {
                results.push(effectResult(effect, false, 'unknown_finale_status'));
                return;
            }
            if (statusAtLeast(chapter.finale.status, targetStatus, FINALE_STATUSES)) {
                results.push(effectResult(effect, false, 'no_change'));
                return;
            }
            chapter.finale.status = targetStatus;
            if (targetStatus === 'defeated' && now) chapter.finale.defeatedAt = now;
            if (statusAtLeast(targetStatus, 'ready', FINALE_STATUSES)
                && !statusAtLeast(chapter.status, 'finale', CHAPTER_STATUSES)) {
                chapter.status = 'finale';
            }
            if (statusAtLeast(targetStatus, 'defeated', FINALE_STATUSES)) {
                chapter.status = 'epilogue';
                chapter.epilogue.status = 'available';
                if (now) chapter.epilogue.availableAt = now;
            }
            results.push(effectResult(effect, true));
            return;
        }
        case WORLD_EFFECT_TYPES.COMPLETE_CHAPTER: {
            const definition = WorldChapterCatalog[effect.chapterId];
            const chapter = definition && world.chapters[effect.chapterId];
            if (!definition || !chapter) {
                results.push(effectResult(effect, false, 'unknown_chapter'));
                return;
            }
            if (chapter.status === 'completed') {
                results.push(effectResult(effect, false, 'no_change'));
                return;
            }
            chapter.status = 'completed';
            chapter.finale.status = 'completed';
            chapter.epilogue.status = 'completed';
            if (now) {
                chapter.completedAt = now;
                chapter.epilogue.completedAt = now;
            }
            results.push(effectResult(effect, true));
            return;
        }
        default:
            results.push(effectResult(effect, false, 'unknown_effect_type'));
    }
}

function applyWorldEffects(source, effects, context = {}) {
    const state = normalizeWorldState(source);
    const results = [];
    (Array.isArray(effects) ? effects : []).forEach(effect => {
        applyEffectMutable(state, effect, context, results);
    });
    return {
        state: normalizeWorldState(state),
        appliedEffects: results.filter(result => result.applied).map(result => result.effect),
        ignoredEffects: results.filter(result => !result.applied)
    };
}

function objectivePrerequisitesMet(active, objective) {
    return (objective.requiresObjectiveIds || []).every(objectiveId => (
        active.objectives[objectiveId] && active.objectives[objectiveId].complete
    ));
}

function evaluateWorldEvent(source, event, context = {}) {
    let state = normalizeWorldState(source);
    const appliedEffects = [];
    const ignoredEffects = [];
    const completedObjectiveIds = [];
    const resolvedFinaleIds = [];

    if (!event || typeof event !== 'object' || typeof event.type !== 'string' || !event.type) {
        return { state, appliedEffects, ignoredEffects, completedObjectiveIds, resolvedFinaleIds };
    }

    Object.entries(state.contracts.active).forEach(([contractId, active]) => {
        const definition = WorldContractCatalog[contractId];
        if (!definition || active.status === 'claimable') return;
        definition.objectives.forEach(objective => {
            const before = active.objectives[objective.id];
            if (!before || before.complete || !objectivePrerequisitesMet(active, objective)) return;
            if (!eventMatchesObjective(event, objective)) return;
            const amount = nonNegativeInt(eventValue(event, 'amount'), 1);
            const reduction = applyWorldEffects(state, [{
                type: WORLD_EFFECT_TYPES.COMPLETE_OBJECTIVE,
                contractId,
                objectiveId: objective.id,
                amount: Math.max(1, amount)
            }], context);
            state = reduction.state;
            appliedEffects.push(...reduction.appliedEffects);
            ignoredEffects.push(...reduction.ignoredEffects);
            const after = state.contracts.active[contractId].objectives[objective.id];
            if (!before.complete && after.complete) completedObjectiveIds.push(`${contractId}:${objective.id}`);
            active = state.contracts.active[contractId];
        });
    });

    Object.values(WorldChapterCatalog).forEach(definition => {
        const chapter = state.chapters[definition.id];
        const resolution = definition.finale.resolutionEvent;
        if (!chapter
            || chapter.finale.status !== 'prepared'
            || !chapter.finale.selectedPreparationOptionId
            || !eventMatchesObjective(event, resolution)) return;
        const reduction = applyWorldEffects(state, [{
            type: WORLD_EFFECT_TYPES.SET_FINALE_STATUS,
            chapterId: definition.id,
            status: 'defeated'
        }], context);
        state = reduction.state;
        appliedEffects.push(...reduction.appliedEffects);
        ignoredEffects.push(...reduction.ignoredEffects);
        if (state.chapters[definition.id].finale.status === 'defeated') {
            resolvedFinaleIds.push(definition.id);
        }
    });

    return { state, appliedEffects, ignoredEffects, completedObjectiveIds, resolvedFinaleIds };
}

function objectiveEvidence(world, objective) {
    const target = Math.max(1, nonNegativeInt(objective.target, 1));
    if (objective.type === WORLD_OBJECTIVE_TYPES.INTERACT) {
        const interactionId = objective.match && objective.match.interactionId;
        const interaction = interactionId && world.destinationInteractions[interactionId];
        if (interaction && interaction.completionCount > 0) {
            return { progress: target, completedAt: interaction.lastCompletedAt };
        }
    }
    if (objective.type === WORLD_OBJECTIVE_TYPES.CONTRACT) {
        const contractId = objective.match && objective.match.contractId;
        const completion = contractId && world.contracts.completed[contractId];
        if (completion && completion.count > 0) {
            return { progress: target, completedAt: completion.lastCompletedAt };
        }
    }
    if (objective.type === WORLD_OBJECTIVE_TYPES.PREPARE) {
        const chapterId = objective.match && objective.match.chapterId;
        const chapter = chapterId && world.chapters[chapterId];
        if (chapter && chapter.finale.selectedPreparationOptionId) {
            return { progress: target, completedAt: chapter.finale.selectedAt };
        }
    }
    if (objective.type === WORLD_OBJECTIVE_TYPES.DISCOVER
        && objective.evidence
        && worldRequirementsMet(world, objective.evidence)) {
        return { progress: target };
    }
    return null;
}

function acceptWorldContract(source, contractId, context = {}) {
    const state = normalizeWorldState(source);
    const definition = WorldContractCatalog[contractId];
    if (!definition) return { success: false, code: 'UNKNOWN_CONTRACT', state };
    if (state.contracts.active[contractId]) return { success: false, code: 'ALREADY_ACTIVE', state };
    if (!state.contracts.offered[contractId]) return { success: false, code: 'NOT_OFFERED', state };
    if (!definition.repeatable && state.contracts.completed[contractId]) {
        return { success: false, code: 'ALREADY_COMPLETED', state };
    }
    if (!worldRequirementsMet(state, definition.availability || {})) {
        return { success: false, code: 'REQUIREMENTS_UNMET', state };
    }
    delete state.contracts.offered[contractId];
    state.contracts.active[contractId] = createActiveContractRecord(contractId, {}, context.now);
    // Exploration may precede contract acceptance. Backfill only objective
    // evidence represented by durable narrative state. Defeats and safe
    // returns deliberately remain post-acceptance accomplishments.
    definition.objectives.forEach(objective => {
        const evidence = objectiveEvidence(state, objective);
        if (!evidence) return;
        state.contracts.active[contractId].objectives[objective.id] = {
            progress: evidence.progress,
            complete: true,
            ...(evidence.completedAt ? { completedAt: evidence.completedAt } : {})
        };
    });
    if (definition.objectives.every(objective => (
        state.contracts.active[contractId].objectives[objective.id].complete
    ))) {
        state.contracts.active[contractId].status = 'claimable';
    }
    return { success: true, state: normalizeWorldState(state), contractId };
}

function selectWorldFinalePreparation(source, chapterId, optionId, context = {}) {
    let state = normalizeWorldState(source);
    const definition = WorldChapterCatalog[chapterId];
    const chapter = definition && state.chapters[chapterId];
    if (!definition || !chapter) return { success: false, code: 'UNKNOWN_CHAPTER', state };
    if (!statusAtLeast(chapter.finale.status, 'ready', FINALE_STATUSES)
        || statusAtLeast(chapter.finale.status, 'defeated', FINALE_STATUSES)) {
        return { success: false, code: 'FINALE_NOT_PREPARABLE', state };
    }
    const option = definition.finale.preparationOptions.find(candidate => candidate.id === optionId);
    if (!option) return { success: false, code: 'UNKNOWN_PREPARATION_OPTION', state };
    if (!option.requiredFlagIds.every(flagId => chapter.finale.preparationFlags[flagId])) {
        return { success: false, code: 'PREPARATION_NOT_READY', state };
    }
    if (chapter.finale.selectedPreparationOptionId) {
        return {
            success: false,
            code: chapter.finale.selectedPreparationOptionId === optionId
                ? 'PREPARATION_ALREADY_SELECTED'
                : 'PREPARATION_CHOICE_LOCKED',
            state
        };
    }

    chapter.finale.selectedPreparationOptionId = option.id;
    chapter.finale.status = 'prepared';
    const now = cleanTimestamp(context.now);
    if (now) chapter.finale.selectedAt = now;
    const eventResult = evaluateWorldEvent(state, {
        type: WORLD_EVENT_TYPES.FINALE_PREPARATION_SELECTED,
        chapterId,
        optionId: option.id
    }, context);
    state = eventResult.state;
    return {
        success: true,
        state,
        chapterId,
        option,
        appliedEffects: eventResult.appliedEffects,
        ignoredEffects: eventResult.ignoredEffects,
        completedObjectiveIds: eventResult.completedObjectiveIds
    };
}

function offerWorldRewardChoice(source, rewardChoiceId, context = {}) {
    const state = normalizeWorldState(source);
    const definition = WorldRewardChoiceCatalog[rewardChoiceId];
    if (!definition) return { success: false, code: 'UNKNOWN_REWARD_CHOICE', state };
    const record = state.rewards.choices[rewardChoiceId];
    if (record.status !== 'locked') {
        return { success: false, code: 'REWARD_CHOICE_ALREADY_OFFERED', state };
    }
    record.status = 'available';
    const now = cleanTimestamp(context.now);
    if (now) record.offeredAt = now;
    return { success: true, state, rewardChoiceId };
}

function claimWorldRewardChoice(source, rewardChoiceId, optionId, context = {}) {
    const state = normalizeWorldState(source);
    const definition = WorldRewardChoiceCatalog[rewardChoiceId];
    if (!definition) return { success: false, code: 'UNKNOWN_REWARD_CHOICE', state };
    const record = state.rewards.choices[rewardChoiceId];
    if (record.status !== 'available') {
        return { success: false, code: 'REWARD_CHOICE_NOT_AVAILABLE', state };
    }
    const option = definition.options.find(candidate => candidate.id === optionId);
    if (!option) return { success: false, code: 'UNKNOWN_REWARD_OPTION', state };
    record.status = 'claimed';
    record.claimedOptionId = option.id;
    const now = cleanTimestamp(context.now);
    if (now) record.claimedAt = now;
    return { success: true, state, rewardChoiceId, option };
}

function claimWorldContract(source, contractId, context = {}) {
    let state = normalizeWorldState(source);
    const definition = WorldContractCatalog[contractId];
    const active = state.contracts.active[contractId];
    if (!definition) return { success: false, code: 'UNKNOWN_CONTRACT', state };
    if (!active || active.status !== 'claimable') return { success: false, code: 'NOT_CLAIMABLE', state };

    const previous = state.contracts.completed[contractId];
    state.contracts.completed[contractId] = {
        count: (previous ? previous.count : 0) + 1
    };
    const now = cleanTimestamp(context.now);
    if (now) state.contracts.completed[contractId].lastCompletedAt = now;
    delete state.contracts.active[contractId];
    if (definition.repeatable) {
        state.contracts.offered[contractId] = now ? { offeredAt: now } : {};
    }
    const claimEvent = evaluateWorldEvent(state, {
        type: WORLD_EVENT_TYPES.CONTRACT_CLAIMED,
        contractId,
        issuerNpcId: definition.issuerNpcId
    }, context);
    state = claimEvent.state;
    const claimEffects = applyWorldEffects(state, definition.onClaimEffects || [], context);
    state = claimEffects.state;
    return {
        success: true,
        state,
        contractId,
        reward: { ...(definition.reward || {}) },
        appliedEffects: [...claimEvent.appliedEffects, ...claimEffects.appliedEffects],
        ignoredEffects: [...claimEvent.ignoredEffects, ...claimEffects.ignoredEffects],
        completedObjectiveIds: claimEvent.completedObjectiveIds
    };
}

function performDestinationInteraction(source, interactionId, context = {}) {
    let state = normalizeWorldState(source);
    const definition = DestinationInteractionCatalog[interactionId];
    if (!definition) return { success: false, code: 'UNKNOWN_INTERACTION', state };
    const progress = state.destinationInteractions[interactionId];
    if (definition.repeatability === 'once' && progress.completionCount > 0) {
        return { success: false, code: 'ALREADY_COMPLETED', state };
    }
    if (!worldRequirementsMet(state, definition.requirements || {})) {
        return { success: false, code: 'REQUIREMENTS_UNMET', state };
    }

    const effects = applyWorldEffects(state, definition.effects, context);
    state = effects.state;
    const updatedProgress = state.destinationInteractions[interactionId];
    updatedProgress.completionCount += 1;
    const now = cleanTimestamp(context.now);
    if (now) updatedProgress.lastCompletedAt = now;
    const eventReduction = evaluateWorldEvent(state, {
        type: WORLD_EVENT_TYPES.DESTINATION_INTERACTION_COMPLETED,
        interactionId,
        destinationId: definition.destinationId
    }, context);
    state = eventReduction.state;

    return {
        success: true,
        state,
        interactionId,
        appliedEffects: [...effects.appliedEffects, ...eventReduction.appliedEffects],
        ignoredEffects: [...effects.ignoredEffects, ...eventReduction.ignoredEffects],
        completedObjectiveIds: eventReduction.completedObjectiveIds
    };
}

module.exports = {
    WORLD_EFFECT_TYPES,
    WORLD_EVENT_TYPES,
    WORLD_OBJECTIVE_TYPES,
    eventMatchesObjective,
    applyWorldEffects,
    evaluateWorldEvent,
    acceptWorldContract,
    claimWorldContract,
    selectWorldFinalePreparation,
    offerWorldRewardChoice,
    claimWorldRewardChoice,
    performDestinationInteraction
};
