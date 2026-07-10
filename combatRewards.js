// --- combatRewards.js ---
// Server-side combat rewards, pending loot, and zone progression.

const { ItemDatabase } = require('./public/js/items.js');
const { LootTables } = require('./public/js/lootTables.js');
const { getMaxHp, getMaxStamina } = require('./combatMath.js');
const { getEnemyActors, getAliveRogueActors, syncCombatViews } = require('./combatActors.js');
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

function processSecureKill(socketId, serverEnemy, context) {
    const { activePlayers, activeCombats, io } = context;
    const p = activePlayers[socketId];
    const combat = activeCombats[socketId];
    if (!p || !combat) return;
    if (serverEnemy.rewardsEligible === false) {
        syncCombatViews(combat, p);
        return { combatComplete: getEnemyActors(combat).every(e => !e.alive) };
    }

    const multiplier = p.monumentBuilt ? 2 : 1;
    const isGorilla = (combat.zone === 'GORILLA_ARENA');
    const isBaited = (combat.zone === 'WILDERNESS' && p.mapBaited);

    let goldReward = ((isGorilla ? 500 : (isBaited ? 60 : 25)) * multiplier);
    let xpReward = 0;
    let droppedItemObj = null;
    const table = LootTables[serverEnemy.id];

    if (table) {
        xpReward = (table.xpDrop || 0) * multiplier;
        if (Math.random() <= table.dropChance) {
            const totalWeight = table.pools.reduce((sum, entry) => sum + entry.weight, 0);
            let roll = Math.random() * totalWeight;
            let droppedItemId = null;
            for (const entry of table.pools) {
                if (roll < entry.weight) { droppedItemId = entry.itemId; break; }
                roll -= entry.weight;
            }
            if (droppedItemId && ItemDatabase[droppedItemId]) {
                droppedItemObj = JSON.parse(JSON.stringify(ItemDatabase[droppedItemId]));
            }
        }
    }

    p.pendingGold = (p.pendingGold || 0) + goldReward;
    p.pendingXp = (p.pendingXp || 0) + xpReward;
    p.pendingLoot = p.pendingLoot || [];
    if (droppedItemObj) p.pendingLoot.push(droppedItemObj);

    io.to(socketId).emit('killConfirmed', {
        gold: goldReward, xp: xpReward, item: droppedItemObj, isPet: false, enemyName: serverEnemy.name
    });

    if (getEnemyActors(combat).every(e => !e.alive)) {
        let zoneGoldReward = 0;
        if (combat.zone === 'GORILLA_ARENA') zoneGoldReward += 5000;
        else if (combat.zone === 'ABYSS') {
            p.abyssDepth = (p.abyssDepth || 1) + 1;
            zoneGoldReward += (50 + (10 * p.abyssDepth));
        } else if (combat.zone === 'WILDERNESS') {
            if (p.wildernessLevel === 20 && !p.cellarsUnlocked) p.cellarsUnlocked = true;
            else if (combat.activeLevel === p.wildernessLevel) p.wildernessLevel = Math.min(20, p.wildernessLevel + 1);
        } else if (combat.zone === 'CELLARS') {
            if (p.cellarLevel === 20 && !p.abyssUnlocked) p.abyssUnlocked = true;
            else if (combat.activeLevel === p.cellarLevel) p.cellarLevel = Math.min(20, p.cellarLevel + 1);
        }
        if (zoneGoldReward > 0) p.pendingGold = (p.pendingGold || 0) + zoneGoldReward;

        applyRogueLootTheft(socketId, p, combat, io);
        syncCombatViews(combat, p);
        delete activeCombats[socketId];
        return { combatComplete: true };
    }

    syncCombatViews(combat, p);
    return { combatComplete: false };
}

function claimCombatRewards(player) {
    player.gold = player.gold || 0;
    player.xp = sanitizeLifetimeXp(player.xp);

    if (player.pendingGold > 0) player.gold += player.pendingGold;

    if (player.pendingXp > 0) {
        player.xp += sanitizeLifetimeXp(player.pendingXp);
    }

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
    processSecureKill,
    claimCombatRewards
};
