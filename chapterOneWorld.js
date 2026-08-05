// --- chapterOneWorld.js ---
// Thin application layer joining the generic world domain to player inventory,
// expedition context, rewards, and a deliberately small public snapshot.

const { ItemDatabase } = require('./public/js/items.js');
const {
    WorldFactCatalog,
    NpcCatalog,
    TownMilestoneCatalog,
    TownServiceCatalog,
    WorldRewardChoiceCatalog,
    WorldChapterCatalog,
    DestinationInteractionCatalog,
    WorldContractCatalog
} = require('./worldCatalog.js');
const {
    ensureWorldState,
    normalizeWorldState,
    FINALE_STATUSES,
    worldRequirementsMet,
    getAvailableTownServiceIds,
    getAvailableTownStockEntries
} = require('./worldState.js');
const {
    WORLD_EVENT_TYPES,
    applyWorldEffects,
    evaluateWorldEvent,
    acceptWorldContract,
    claimWorldContract,
    offerWorldRewardChoice,
    claimWorldRewardChoice,
    performDestinationInteraction,
    selectWorldFinalePreparation
} = require('./worldEvents.js');

function nonNegativeInt(value) {
    const parsed = Math.trunc(Number(value));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

const STOCK_ITEM_SUMMARIES = Object.freeze({
    round_shield: 'Shield control: block committed blows and interrupt wind-ups.',
    hunters_spear: 'Reach control: threaten two tiles and push prepared enemies.',
    hunter_bow: 'Ranged mobility: attack at distance and reposition after a shot.',
    apprentice_staff: 'Channelled casting: pressure distant targets with visible commitments.',
    parrying_dagger: 'Dagger defense: pair with a one-handed weapon for evasive counterplay.',
    tankard_maul: 'Heavy commitment: trade speed and flexibility for armor-breaking blows.'
});

function getPublicStockEntry(entry, includeServiceId = false) {
    const item = ItemDatabase[entry.itemId] || {};
    const combatIdentity = item.combatIdentity && item.combatIdentity.family
        ? item.combatIdentity.family
        : (item.animationFamily || item.type || 'equipment');
    return {
        id: entry.id,
        ...(includeServiceId ? { serviceId: entry.serviceId } : {}),
        itemId: entry.itemId,
        name: item.name || entry.itemId,
        description: STOCK_ITEM_SUMMARIES[entry.itemId] || 'Dependable equipment for the roads ahead.',
        combatIdentity,
        price: nonNegativeInt(entry.price)
    };
}

function finaleStatusAtLeast(status, minimum) {
    return FINALE_STATUSES.indexOf(status) >= FINALE_STATUSES.indexOf(minimum);
}

function isAtPub(player) {
    return !(player && player.adventure && player.adventure.activeJourney);
}

function isJourneyAtDestination(player, destinationId) {
    const journey = player && player.adventure && player.adventure.activeJourney;
    return !!(
        journey
        && journey.phase === 'AT_DESTINATION'
        && journey.reachedDestination === true
        && journey.destinationLocationId === destinationId
    );
}

function getContractStatus(world, definition) {
    const active = world.contracts.active[definition.id];
    if (active) return active.status;
    if (world.contracts.offered[definition.id]) return 'available';
    if (world.contracts.completed[definition.id] && !definition.repeatable) return 'completed';
    return 'locked';
}

function getChapterOneWorldSnapshot(player) {
    const world = ensureWorldState(player);
    const availableServiceIds = new Set(getAvailableTownServiceIds(world));
    const availableStock = getAvailableTownStockEntries(world);
    const rosterCompanions = player && player.roster && Array.isArray(player.roster.companions)
        ? player.roster.companions
        : [];
    const facts = Object.values(WorldFactCatalog)
        .filter(definition => world.facts[definition.id] === true)
        .map(definition => ({
            id: definition.id,
            discovered: true,
            name: definition.name,
            category: definition.category,
            description: definition.description
        }));
    const npcs = Object.values(NpcCatalog).map(definition => {
        const record = world.npcs[definition.id];
        const stageIndex = Math.max(0, definition.stages.findIndex(stage => stage.id === record.stageId));
        const stage = definition.stages[stageIndex] || definition.stages[0];
        return {
            id: definition.id,
            name: definition.name,
            role: definition.role,
            stageId: stage.id,
            stageName: stage.name,
            stageIndex,
            progressed: stageIndex > 0,
            returnReaction: stage.returnReaction || ''
        };
    });
    const milestones = Object.values(TownMilestoneCatalog)
        .filter(definition => world.town.milestones[definition.id].status !== 'locked')
        .map(definition => ({
            id: definition.id,
            name: definition.name,
            description: definition.description,
            ...clone(world.town.milestones[definition.id])
        }));
    const services = Object.values(TownServiceCatalog)
        .filter(definition => availableServiceIds.has(definition.id))
        .map(definition => ({
            id: definition.id,
            name: definition.name,
            providerNpcId: definition.providerNpcId,
            description: definition.description,
            available: true,
            ...(definition.actionId ? {
                actionId: definition.actionId,
                actionLabel: definition.actionLabel || 'Review'
            } : {}),
            ...(definition.recruitNpcId ? {
                recruitNpcId: definition.recruitNpcId,
                claimed: rosterCompanions.some(companion => (
                    companion
                    && (companion.templateId === definition.recruitNpcId
                        || companion.instanceId === `story_${definition.recruitNpcId}`)
                ))
            } : {}),
            stock: availableStock
                .filter(entry => entry.serviceId === definition.id)
                .map(entry => getPublicStockEntry(entry))
        }));
    const destinationInteractions = Object.values(DestinationInteractionCatalog).map(definition => {
        const record = world.destinationInteractions[definition.id];
        const completed = record.completionCount > 0;
        return {
            id: definition.id,
            destinationId: definition.destinationId,
            name: definition.name,
            description: definition.description,
            completed,
            completionCount: record.completionCount,
            available: !completed
                && isJourneyAtDestination(player, definition.destinationId)
                && worldRequirementsMet(world, definition.requirements || {})
        };
    }).filter(interaction => interaction.completed || interaction.available);
    const contracts = Object.values(WorldContractCatalog).map(definition => {
        const active = world.contracts.active[definition.id];
        const completed = world.contracts.completed[definition.id];
        const status = getContractStatus(world, definition);
        const objectives = definition.objectives.map(objective => {
            const progress = active && active.objectives[objective.id];
            return {
                id: objective.id,
                type: objective.type,
                description: objective.description,
                progress: progress ? progress.progress : 0,
                target: Math.max(1, nonNegativeInt(objective.target)),
                complete: !!(progress && progress.complete)
            };
        });
        const progress = objectives.reduce((sum, objective) => sum + (objective.complete ? 1 : 0), 0);
        const issuer = NpcCatalog[definition.issuerNpcId];
        return {
            id: definition.id,
            title: definition.title,
            description: definition.summary,
            type: definition.type,
            routeId: definition.routeId,
            routeIds: Array.isArray(definition.routeIds) ? [...definition.routeIds] : [],
            issuerNpcId: definition.issuerNpcId,
            issuerName: issuer ? issuer.name : 'Unknown',
            repeatable: definition.repeatable,
            rewardGold: nonNegativeInt(definition.reward && definition.reward.gold),
            status,
            progress,
            target: objectives.length,
            objectives,
            completedCount: completed ? completed.count : 0
        };
    }).filter(contract => contract.status !== 'locked');
    const rewardChoices = Object.values(WorldRewardChoiceCatalog).map(definition => {
        const record = world.rewards.choices[definition.id];
        return {
            id: definition.id,
            name: definition.name,
            description: definition.description,
            status: record.status,
            claimedOptionId: record.claimedOptionId,
            options: record.status === 'locked' ? [] : definition.options.map(option => ({ ...option }))
        };
    }).filter(choice => choice.status !== 'locked');

    const chapterDefinition = WorldChapterCatalog.chapter_one;
    const chapterState = world.chapters.chapter_one;
    const finaleContractActive = !!world.contracts.active[chapterDefinition.finale.contractId];
    const preparations = chapterDefinition.finale.preparationFlags
        .filter(definition => (
            chapterState.finale.preparationFlags[definition.id] === true
            || worldRequirementsMet(world, definition.revealRequirements || {})
        ))
        .map(definition => ({
            id: definition.id,
            name: definition.name,
            description: definition.description,
            ready: chapterState.finale.preparationFlags[definition.id] === true
        }));
    const preparationOptions = finaleStatusAtLeast(chapterState.finale.status, 'ready')
        ? chapterDefinition.finale.preparationOptions.map(option => ({
            id: option.id,
            name: option.name,
            description: option.description,
            ready: option.requiredFlagIds.every(flagId => chapterState.finale.preparationFlags[flagId]),
            selectable: finaleContractActive
                && option.requiredFlagIds.every(flagId => chapterState.finale.preparationFlags[flagId]),
            selected: chapterState.finale.selectedPreparationOptionId === option.id
        }))
        : [];
    const leadDiscovered = world.facts[chapterDefinition.epilogue.leadFactId] === true;
    const chapter = {
        id: chapterDefinition.id,
        title: chapterDefinition.title,
        status: chapterState.status,
        completed: chapterState.status === 'completed',
        completedAt: chapterState.completedAt,
        preparations,
        finale: {
            status: chapterState.finale.status,
            selectedPreparationOptionId: chapterState.finale.selectedPreparationOptionId,
            preparationOptions,
            ...(finaleStatusAtLeast(chapterState.finale.status, 'ready') ? {
                locationId: chapterDefinition.finale.locationId,
                routeIds: [...chapterDefinition.finale.routeIds]
            } : {})
        },
        epilogue: {
            status: chapterState.epilogue.status,
            available: chapterState.epilogue.status !== 'locked',
            completed: chapterState.epilogue.status === 'completed',
            ...(chapterState.epilogue.status !== 'locked' ? {
                title: chapterDefinition.epilogue.title,
                description: chapterDefinition.epilogue.description
            } : {})
        },
        nextRegion: leadDiscovered ? {
            leadId: chapterDefinition.epilogue.nextRegionLeadId,
            factId: chapterDefinition.epilogue.leadFactId,
            name: chapterDefinition.epilogue.nextRegionName,
            description: chapterDefinition.epilogue.nextRegionDescription
        } : null
    };

    return {
        schemaVersion: world.schemaVersion,
        facts,
        npcs,
        town: {
            milestones,
            services,
            stock: availableStock.map(entry => getPublicStockEntry(entry, true))
        },
        destinationInteractions,
        contracts,
        rewardChoices,
        chapter
    };
}

function resolveDestinationInteraction(player, interactionId, now = Date.now()) {
    const definition = DestinationInteractionCatalog[interactionId];
    if (!definition) {
        return { success: false, code: 'UNKNOWN_INTERACTION', message: 'That discovery is not present here.' };
    }
    if (!isJourneyAtDestination(player, definition.destinationId)) {
        return {
            success: false,
            code: 'WRONG_DESTINATION',
            message: 'That object can only be investigated after reaching its destination.'
        };
    }
    const result = performDestinationInteraction(ensureWorldState(player), interactionId, { now });
    player.world = result.state;
    if (!result.success) {
        return {
            ...result,
            message: result.code === 'ALREADY_COMPLETED'
                ? 'This destination has already yielded its useful clue.'
                : 'There is nothing more to learn from that object yet.'
        };
    }
    return {
        ...result,
        message: `${definition.name} completed. ${WorldFactCatalog[definition.effects.find(effect => effect.factId)?.factId]?.name || 'A clue'} was recorded.`
    };
}

function advanceChapterOneSafeReturn(player, routeId, now = Date.now()) {
    let world = ensureWorldState(player);
    const eventResult = evaluateWorldEvent(world, {
        type: WORLD_EVENT_TYPES.SAFE_RETURN,
        routeId
    }, { now });
    world = eventResult.state;

    let rewardChoiceOffered = false;
    const choice = world.rewards.choices.first_return_kit;
    if (choice && choice.status === 'locked') {
        const offer = offerWorldRewardChoice(world, 'first_return_kit', { now });
        world = offer.state;
        rewardChoiceOffered = offer.success === true;
        if (rewardChoiceOffered) {
            world = applyWorldEffects(world, [
                { type: 'ADVANCE_NPC', npcId: 'mara', stageId: 'quartermaster' },
                {
                    type: 'SET_TOWN_MILESTONE',
                    milestoneId: 'quartermaster_stall_open',
                    status: 'unlocked'
                }
            ], { now }).state;
        }
    }
    player.world = world;
    return {
        ...eventResult,
        state: world,
        rewardChoiceOffered
    };
}

function advanceChapterOneDiscovery(player, discovery, now = Date.now()) {
    const payload = typeof discovery === 'string' ? { locationId: discovery } : (discovery || {});
    const result = evaluateWorldEvent(ensureWorldState(player), {
        type: WORLD_EVENT_TYPES.LOCATION_DISCOVERED,
        ...payload
    }, { now });
    player.world = result.state;
    return result;
}

function advanceChapterOneEncounterDefeat(player, encounter, now = Date.now()) {
    const payload = typeof encounter === 'string' ? { encounterId: encounter } : (encounter || {});
    const result = evaluateWorldEvent(ensureWorldState(player), {
        type: WORLD_EVENT_TYPES.ENCOUNTER_DEFEATED,
        ...payload
    }, { now });
    player.world = result.state;
    return result;
}

function acceptChapterOneContract(player, contractId, now = Date.now()) {
    if (!isAtPub(player)) {
        return { success: false, code: 'AWAY_FROM_PUB', message: 'Contracts can only be accepted at the pub.' };
    }
    const result = acceptWorldContract(ensureWorldState(player), contractId, { now });
    player.world = result.state;
    const definition = WorldContractCatalog[contractId];
    return {
        ...result,
        message: result.success
            ? `${definition.title} accepted from ${NpcCatalog[definition.issuerNpcId].name}.`
            : 'That contract is not available.'
    };
}

function claimChapterOneContract(player, contractId, now = Date.now()) {
    if (!isAtPub(player)) {
        return { success: false, code: 'AWAY_FROM_PUB', message: 'Contract pay can only be collected at the pub.' };
    }
    const result = claimWorldContract(ensureWorldState(player), contractId, { now });
    player.world = result.state;
    if (!result.success) return { ...result, message: 'That contract is not ready to claim.' };
    const rewardGold = nonNegativeInt(result.reward && result.reward.gold);
    player.gold = nonNegativeInt(player.gold) + rewardGold;
    return {
        ...result,
        rewardGold,
        message: `${WorldContractCatalog[contractId].title} paid ${rewardGold}g.`
    };
}

function selectChapterOneFinalePreparation(player, optionId, now = Date.now()) {
    if (!isAtPub(player)) {
        return { success: false, code: 'AWAY_FROM_PUB', message: 'The finale approach must be chosen at the pub.' };
    }
    const world = ensureWorldState(player);
    if (!world.contracts.active.watchhouse_reckoning) {
        return {
            success: false,
            code: 'FINALE_CONTRACT_INACTIVE',
            message: 'Accept the Ruined Watchhouse contract before choosing an approach.'
        };
    }
    const result = selectWorldFinalePreparation(world, 'chapter_one', optionId, { now });
    player.world = result.state;
    return {
        ...result,
        message: result.success
            ? `${result.option.name} selected for the watchhouse expedition.`
            : 'That finale preparation is not available.'
    };
}

function claimChapterOneRewardChoice(player, rewardChoiceId, optionId, now = Date.now()) {
    if (!isAtPub(player)) {
        return { success: false, code: 'AWAY_FROM_PUB', message: 'Road gear can only be collected at the pub.' };
    }
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const capacity = Math.max(1, nonNegativeInt(player.maxInventorySlots) || 5);
    if (player.inventory.length >= capacity) {
        return { success: false, code: 'BACKPACK_FULL', message: 'Make one backpack space before choosing the kit.' };
    }
    const preview = WorldRewardChoiceCatalog[rewardChoiceId];
    const option = preview && preview.options.find(candidate => candidate.id === optionId);
    const item = option && ItemDatabase[option.itemId];
    if (!option || !item) {
        return { success: false, code: 'UNKNOWN_REWARD_OPTION', message: 'That equipment choice is unavailable.' };
    }
    const result = claimWorldRewardChoice(ensureWorldState(player), rewardChoiceId, optionId, { now });
    player.world = result.state;
    if (!result.success) return { ...result, message: 'That equipment choice is no longer available.' };
    player.inventory.push(clone(item));
    return {
        ...result,
        item: clone(item),
        message: `${item.name} was added to the backpack.`
    };
}

module.exports = {
    getChapterOneWorldSnapshot,
    resolveDestinationInteraction,
    advanceChapterOneSafeReturn,
    advanceChapterOneDiscovery,
    advanceChapterOneEncounterDefeat,
    acceptChapterOneContract,
    claimChapterOneContract,
    selectChapterOneFinalePreparation,
    claimChapterOneRewardChoice
};
