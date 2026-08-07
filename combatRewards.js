// --- combatRewards.js ---
// Server-side combat rewards, pending loot, and zone progression.

const { ItemDatabase } = require('./public/js/items.js');
const { LootTables } = require('./public/js/lootTables.js');
const { getMaxHp, getMaxStamina } = require('./combatMath.js');
const { getAliveRogueActors, syncCombatViews } = require('./combatActors.js');
const { sanitizeLifetimeXp } = require('./xpMath.js');
const { applyLifetimeXpLevelUps } = require('./playerProgression.js');
const { awardMercenaryEncounterXp } = require('./mercenaryProgression.js');
const {
    failActiveExpedition,
    getAdventureSnapshot,
    resolveExpeditionCombatVictory
} = require('./adventureState.js');
const {
    advanceChapterOneSafeReturn,
    advanceChapterOneDiscovery,
    advanceChapterOneEncounterDefeat
} = require('./chapterOneWorld.js');

const ROGUE_STEAL_RARITIES = new Set(['Epic', 'Unique', 'Relic', 'Gorilla']);
const EXPEDITION_DEFEAT_GOLD = 12;
const EXPEDITION_CAPTAIN_GOLD = 35;

function applyRogueLootTheft(socketId, player, combat, io) {
    if (combat.zone !== 'CELLARS' || combat.activeLevel !== 20) return null;
    const thief = getAliveRogueActors(combat).find(actor => actor.stealsBossLoot);
    if (!thief || !Array.isArray(player.pendingLoot) || player.pendingLoot.length === 0) return null;

    const stealIndex = player.pendingLoot.findIndex(item => item && ROGUE_STEAL_RARITIES.has(item.rarity));
    if (stealIndex < 0) return null;

    const stolenItem = player.pendingLoot.splice(stealIndex, 1)[0];
    io.to(socketId).emit('rogueLootTheft', {
        thiefName: thief.name,
        itemName: stolenItem.name,
        pendingLoot: player.pendingLoot
    });
    return stolenItem;
}

function rollLootFromTable(table) {
    if (!table || Math.random() > (table.dropChance ?? 0)) return null;
    const totalWeight = table.pools.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    let droppedItemId = null;

    for (const entry of table.pools) {
        if (roll < entry.weight) {
            droppedItemId = entry.itemId;
            break;
        }
        roll -= entry.weight;
    }

    return droppedItemId && ItemDatabase[droppedItemId]
        ? JSON.parse(JSON.stringify(ItemDatabase[droppedItemId]))
        : null;
}

function grantActorDefeatRewards(socketId, defeatedActor, context) {
    const { activePlayers, activeCombats, io } = context;
    const player = activePlayers[socketId];
    const combat = activeCombats[socketId];
    if (!player || !combat || !defeatedActor || defeatedActor.rewardsEligible === false) return null;
    if (defeatedActor.rewardResolved) return defeatedActor.rewardResult || null;
    defeatedActor.rewardResolved = true;

    const isGorilla = combat.zone === 'GORILLA_ARENA';
    const isExpedition = combat.mode === 'EXPEDITION';
    const goldReward = isGorilla
        ? 500
        : (isExpedition
            ? (defeatedActor.id === 'chapter_one_shield_captain'
                ? EXPEDITION_CAPTAIN_GOLD
                : EXPEDITION_DEFEAT_GOLD)
            : 25);
    const table = LootTables[defeatedActor.id];
    const xpReward = table ? (table.xpDrop || 0) : 0;
    const droppedItem = rollLootFromTable(table);

    player.pendingGold = (player.pendingGold || 0) + goldReward;
    player.pendingXp = (player.pendingXp || 0) + xpReward;
    player.pendingLoot = player.pendingLoot || [];
    if (droppedItem) player.pendingLoot.push(droppedItem);

    io.to(socketId).emit('killConfirmed', {
        gold: goldReward,
        xp: xpReward,
        item: droppedItem,
        isPet: false,
        enemyName: defeatedActor.name
    });

    defeatedActor.rewardResult = { gold: goldReward, xp: xpReward, item: droppedItem };
    return defeatedActor.rewardResult;
}

function finalizeCombatVictory(socketId, context) {
    const { activePlayers, activeCombats, io } = context;
    const player = activePlayers[socketId];
    const combat = activeCombats[socketId];
    if (!player || !combat) return { combatComplete: false };
    if (combat.victoryRewardsResolved) return { combatComplete: true };
    combat.victoryRewardsResolved = true;

    const isExpeditionCombat = combat.mode === 'EXPEDITION';
    let adventureOutcome = null;
    let zoneGoldReward = 0;

    if (isExpeditionCombat) {
        adventureOutcome = resolveExpeditionCombatVictory(
            player,
            combat.expeditionContext || {}
        );
        const validJourneyVictory = !!(adventureOutcome && adventureOutcome.success === true);
        if (!validJourneyVictory) {
            const resolutionFailure = adventureOutcome;
            adventureOutcome = {
                ...failActiveExpedition(player, 'victory_context_mismatch'),
                code: 'EXPEDITION_CONTEXT_MISMATCH',
                resolutionFailure
            };
        }
        const worldObjectiveIds = [];
        if (validJourneyVictory && combat.encounterId) {
            const encounterProgress = advanceChapterOneEncounterDefeat(player, {
                encounterId: combat.encounterId,
                routeId: combat.expeditionContext && combat.expeditionContext.routeId,
                direction: combat.expeditionContext && combat.expeditionContext.direction
            }, Date.now());
            worldObjectiveIds.push(...(encounterProgress.completedObjectiveIds || []));
        }
        if (validJourneyVictory && adventureOutcome.outcome === 'destination_reached') {
            const reachedJourney = adventureOutcome.journey && typeof adventureOutcome.journey === 'object'
                ? adventureOutcome.journey
                : {};
            const discoveryProgress = advanceChapterOneDiscovery(player, {
                locationId: reachedJourney.destinationLocationId,
                routeId: reachedJourney.routeId
            }, Date.now());
            worldObjectiveIds.push(...(discoveryProgress.completedObjectiveIds || []));
        }
        if (validJourneyVictory && adventureOutcome.outcome === 'safe_return') {
            const worldProgress = advanceChapterOneSafeReturn(
                player,
                adventureOutcome.routeId,
                Date.now()
            );
            worldObjectiveIds.push(...(worldProgress.completedObjectiveIds || []));
            const completedObjectiveIds = [...new Set(worldObjectiveIds)];
            adventureOutcome.worldProgress = {
                completedObjectiveIds,
                rewardChoiceOffered: worldProgress.rewardChoiceOffered
            };
            if (player.adventure && player.adventure.latestReturnReport) {
                player.adventure.latestReturnReport.worldContractUpdates =
                    completedObjectiveIds;
                player.adventure.latestReturnReport.rewardChoiceOffered =
                    worldProgress.rewardChoiceOffered;
            }
        } else if (worldObjectiveIds.length) {
            adventureOutcome.worldProgress = {
                completedObjectiveIds: [...new Set(worldObjectiveIds)],
                rewardChoiceOffered: false
            };
        }
        combat.adventureOutcome = adventureOutcome;
        io.to(socketId).emit('adventureProgress', {
            ...adventureOutcome,
            adventureState: getAdventureSnapshot(player)
        });
    } else if (combat.zone === 'GORILLA_ARENA') zoneGoldReward += 5000;
    else if (combat.zone === 'ABYSS') {
        player.abyssDepth = (player.abyssDepth || 1) + 1;
        zoneGoldReward += 50 + (10 * player.abyssDepth);
    } else if (combat.zone === 'WILDERNESS') {
        if (player.wildernessLevel === 20 && !player.cellarsUnlocked) player.cellarsUnlocked = true;
        else if (combat.activeLevel === player.wildernessLevel) player.wildernessLevel = Math.min(20, player.wildernessLevel + 1);
    } else if (combat.zone === 'CELLARS') {
        if (player.cellarLevel === 20 && !player.abyssUnlocked) player.abyssUnlocked = true;
        else if (combat.activeLevel === player.cellarLevel) player.cellarLevel = Math.min(20, player.cellarLevel + 1);
    }
    if (zoneGoldReward > 0) player.pendingGold = (player.pendingGold || 0) + zoneGoldReward;

    applyRogueLootTheft(socketId, player, combat, io);

    const rosterCompanions = player.roster && Array.isArray(player.roster.companions)
        ? player.roster.companions
        : [];
    player.pendingMercenaryXpContext = {
        eligibleInstanceIds: rosterCompanions
            .filter(companion => companion && companion.hired !== false && companion.instanceId)
            .map(companion => companion.instanceId),
        activeInstanceIds: (combat.actors || [])
            .filter(actor => actor && actor.kind === 'companion' && actor.companionInstanceId)
            .map(actor => actor.companionInstanceId)
    };
    syncCombatViews(combat, player);
    delete activeCombats[socketId];
    if (typeof context.persistPlayer === 'function') {
        const reason = isExpeditionCombat
            ? `expedition_${adventureOutcome && adventureOutcome.outcome || 'victory'}`
            : 'combat_victory';
        void Promise.resolve(context.persistPlayer(player, { reason })).catch(() => undefined);
    }
    return {
        combatComplete: true,
        zoneGoldReward,
        adventureOutcome,
        adventureState: getAdventureSnapshot(player)
    };
}

function claimCombatRewards(player) {
    player.gold = player.gold || 0;
    player.xp = sanitizeLifetimeXp(player.xp);
    const encounterXp = sanitizeLifetimeXp(player.pendingXp);

    if (player.pendingGold > 0) player.gold += player.pendingGold;
    if (encounterXp > 0) player.xp += encounterXp;

    applyLifetimeXpLevelUps(player);
    awardMercenaryEncounterXp(player, encounterXp, player.pendingMercenaryXpContext || {});
    delete player.pendingMercenaryXpContext;

    player.hp = getMaxHp(player);
    player.stamina = getMaxStamina(player);
    player.pendingGold = 0;
    player.pendingXp = 0;
    player.pendingLoot = [];
    player.activeBuffs = [];
    player.activeCombatBuff = null;

    return player;
}

module.exports = {
    EXPEDITION_DEFEAT_GOLD,
    EXPEDITION_CAPTAIN_GOLD,
    grantActorDefeatRewards,
    finalizeCombatVictory,
    claimCombatRewards
};
