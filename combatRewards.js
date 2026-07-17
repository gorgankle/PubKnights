// --- combatRewards.js ---
// Server-side combat rewards, pending loot, pet scavenging, and zone progression.

const { ItemDatabase } = require('./public/js/items.js');
const { LootTables } = require('./public/js/lootTables.js');
const { getMaxHp, getMaxStamina } = require('./combatMath.js');
const { getAliveRogueActors, syncCombatViews } = require('./combatActors.js');
const { sanitizeLifetimeXp } = require('./xpMath.js');
const { applyLifetimeXpLevelUps } = require('./playerProgression.js');

const ROGUE_STEAL_RARITIES = new Set(['Epic', 'Unique', 'Relic', 'Gorilla']);

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
    const isBaited = combat.zone === 'WILDERNESS' && player.mapBaited;
    const goldReward = isGorilla ? 500 : (isBaited ? 60 : 25);
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

function rollPetVictoryLoot(player) {
    if (!player.pet || !player.pet.adopted) return null;
    const petLevel = Math.max(1, Math.min(100, Math.trunc(Number(player.pet.level) || 1)));
    if ((Math.random() * 100) >= petLevel) return null;
    return rollLootFromTable(LootTables.pet_scavenge);
}

function finalizeCombatVictory(socketId, context) {
    const { activePlayers, activeCombats, io } = context;
    const player = activePlayers[socketId];
    const combat = activeCombats[socketId];
    if (!player || !combat) return { combatComplete: false };
    if (combat.victoryRewardsResolved) return { combatComplete: true };
    combat.victoryRewardsResolved = true;

    let zoneGoldReward = 0;
    if (combat.zone === 'GORILLA_ARENA') zoneGoldReward += 5000;
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

    const petItem = rollPetVictoryLoot(player);
    if (petItem) {
        player.pendingLoot = player.pendingLoot || [];
        player.pendingLoot.push(petItem);
        io.to(socketId).emit('killConfirmed', {
            gold: 0,
            xp: 0,
            item: petItem,
            isPet: true,
            petName: player.pet.name || 'Companion',
            enemyName: null
        });
    }

    syncCombatViews(combat, player);
    delete activeCombats[socketId];
    return { combatComplete: true, petItem, zoneGoldReward };
}

function claimCombatRewards(player) {
    player.gold = player.gold || 0;
    player.xp = sanitizeLifetimeXp(player.xp);

    if (player.pendingGold > 0) player.gold += player.pendingGold;
    if (player.pendingXp > 0) player.xp += sanitizeLifetimeXp(player.pendingXp);

    applyLifetimeXpLevelUps(player);

    player.hp = getMaxHp(player);
    player.stamina = getMaxStamina(player);
    player.pendingGold = 0;
    player.pendingXp = 0;
    player.pendingLoot = [];
    player.activeBuffs = [];
    player.activeCombatBuff = null;
    player.mapBaited = false;
    player.cellarsChummed = false;

    return player;
}

module.exports = {
    grantActorDefeatRewards,
    finalizeCombatVictory,
    rollPetVictoryLoot,
    claimCombatRewards
};
