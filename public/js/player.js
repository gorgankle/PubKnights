// --- CHARACTER & SAVE ENGINES ---

// --- CHARACTER & SAVE ENGINES ---

const MAX_PLAYER_LEVEL = 50;
const SP_PER_LEVEL = 5;

let player = { 
    x: 1, y: 1, 
    level: 1, xp: 0, xpToNext: 100, skillPoints: 0,
    vitality: 70, hp: 70, stamina: 50, maxStamina: 50, power: 12, accuracy: 85, resilience: 5, swiftness: 3,
    vaultSlots: 10, gold: 0, hops: 0, wood: 0, fish: 0, 
	lumberPoints: 0,  // NEW: Active timber game currency
    fishingPoints: 0, // NEW: Active fishing game currency
    hopsPoints: 0,    // NEW: Active hops game currency
    wildernessLevel: 1, cellarsUnlocked: false, cellarLevel: 1,         
    
	appearance: { gender: 'male', skin: 'light', hair: 'hair_messy', hairColor: 'brown', eyes: 'eyes_blue', shirtColor: 'blue', pantsColor: 'dark', bootsColor: 'leather' },
    equipment: {
        helmet: null,
        armor: null, 
        weapon: typeof ItemDatabase !== 'undefined' ? JSON.parse(JSON.stringify(ItemDatabase["rusty_mace"])) : null,
        gloves: null, 
        boots: null
    },
    inventory: [], stash: [], workers: { woodcutters: 0, fishermen: 0, farmers: 0 },
    supplyCart: { wood: 0, fish: 0, hops: 0, max: 100, level: 1 }, mapBaited: false,
maxInventorySlots: 5, sharpeningStoneBought: 0, ironPlatingBought: 0, backpackUpgrades: 0,
    
    // === MULTI-BUFF ARRAYS ADDED HERE ===
    activeCombatBuff: null, activeBuffs: [], happyHourTicks: 0, cellarsChummed: false,
    tutorialCompleted: false,
    
// === NEW: PET STATE ===
    pet: { adopted: false, name: "Bandit", type: "dog", furColor: "brown", collarColor: "red" },
    
    // === NEW: EPIC TAVERN PRESTIGE ===
    gildedTavernUnlocked: false,
    autoClaimEnabled: false
};

function calculateNextLevelXp(currentLevel) {
    if (currentLevel >= MAX_PLAYER_LEVEL) return "MAX"; // Cap out the UI
    let base = 100;
    let multiplier = Math.pow(1.15, currentLevel - 1);
    let flatBump = currentLevel * 50;
    return Math.floor((base * multiplier) + flatBump);
}


// === UNIVERSAL STAT PARSERS (CLIENT-SIDE ENGINE) ===

function getEffectiveStat(targetPlayer, statKey) {
    let base = targetPlayer[statKey] || 0;
    let flatBonus = 0;
    let multiplier = 1.0;

    for (let slot in targetPlayer.equipment) {
        let item = targetPlayer.equipment[slot];
        if (item) {
            if (statKey === 'power' && item.atkBonus) flatBonus += item.atkBonus;
            if (statKey === 'accuracy' && item.accBonus) flatBonus += item.accBonus;
            if (statKey === 'resilience' && item.deflectChance) flatBonus += item.deflectChance;
            if (statKey === 'swiftness' && item.moveBonus) flatBonus += item.moveBonus;
        }
    }

    if (targetPlayer.activeBuffs && targetPlayer.activeBuffs.length > 0) {
        targetPlayer.activeBuffs.forEach(buffId => {
            // Safely fetch from the global database
            let buffData = typeof ItemDatabase !== 'undefined' ? ItemDatabase[buffId.toLowerCase()] : null;
            if (buffData && buffData.combat && buffData.combat.effectCategory === statKey) {
                if (buffData.combat.effectType === 'flat') flatBonus += buffData.combat.effectValue;
                else if (buffData.combat.effectType === 'multiplier') multiplier *= buffData.combat.effectValue;
            }
        });
    }
    return Math.floor((base + flatBonus) * multiplier);
}

// Ultra-clean 1-line getter functions for the UI!
function getPlayerSwiftness() { return Math.max(1, Math.min(12, getEffectiveStat(player, 'swiftness'))); }
function getPlayerTotalPower() { return Math.max(1, getEffectiveStat(player, 'power')); }
function getPlayerAccuracy() { return Math.max(10, Math.min(100, getEffectiveStat(player, 'accuracy'))); }
function getPlayerDeflectChance() {
    // Scale curve: Every point of resilience only grants 0.75% deflect chance
    let rawDeflect = Math.floor(getEffectiveStat(player, 'resilience') * 0.75);
    return Math.max(0, Math.min(75, rawDeflect));
}

// Aliases used by other scripts
function getPlayerMoveRange() { return getPlayerSwiftness(); }
function getPlayerTotalAttack() { return getPlayerTotalPower(); }

// === ECONOMY MATH HELPERS (MUST MATCH SERVER.JS) ===
function getCartUpgradeCost() {
    let level = player.supplyCart ? (player.supplyCart.level || 1) : 1;
    let upg = level - 1;
    // Wave 5 Economy Balance: 250g/125w. Scales heavily by 1.25x.
    return { 
        gold: Math.floor(250 * Math.pow(1.25, upg)), 
        wood: Math.floor(125 * Math.pow(1.25, upg)) 
    };
}
function getBackpackUpgradeCost() {
    let upg = player.backpackUpgrades || 0;
    // Base cost: 250g/100w. Scales moderately by 1.2x.
    return { 
        gold: Math.floor(250 * Math.pow(1.2, upg)), 
        wood: Math.floor(100 * Math.pow(1.2, upg)) 
    };
}

function getVaultUpgradeCost() {
    let currentSlots = player.vaultSlots || 10;
    let upg = Math.floor((currentSlots - 10) / 5);
    // Base cost: 100g/50w. Scales moderately by 1.2x.
    return {
        gold: Math.floor(100 * Math.pow(1.2, upg)),
        wood: Math.floor(50 * Math.pow(1.2, upg))
    };
}

function getPetTrainingCost() {
    let level = player.pet ? (player.pet.level || 1) : 1;
    let upg = level - 1;
    // Base: 500g, 250h, 50f. Scales moderately by 1.2x per level.
    return {
        gold: Math.floor(500 * Math.pow(1.2, upg)),
        hops: Math.floor(250 * Math.pow(1.2, upg)),
        fish: Math.floor(50 * Math.pow(1.2, upg))
    };
}

function saveGame(manualNotify = false) {
    // Failsafe: Don't try to save if they aren't fully logged in yet
    if (!currentUsername) return;

    const saveData = {
        appearance: player.appearance,
        level: player.level || 1, xp: player.xp || 0, xpToNext: player.xpToNext || 100, skillPoints: player.skillPoints || 0,
        vitality: player.vitality || 70, hp: player.hp || 70, stamina: player.stamina || 50, maxStamina: player.maxStamina || 50,
        power: player.power || 12, accuracy: player.accuracy || 85, resilience: player.resilience || 5, swiftness: player.swiftness || 3,
        vaultSlots: player.vaultSlots, gold: player.gold, hops: player.hops, wood: player.wood, fish: player.fish, 
		lumberPoints: player.lumberPoints, fishingPoints: player.fishingPoints, hopsPoints: player.hopsPoints,
        wildernessLevel: player.wildernessLevel, cellarsUnlocked: player.cellarsUnlocked, cellarLevel: player.cellarLevel, 
        abyssUnlocked: player.abyssUnlocked, abyssDepth: player.abyssDepth,
        appearance: player.appearance, // <--- CRITICAL FIX!
        equipment: player.equipment, inventory: player.inventory, stash: player.stash,
        workers: player.workers, supplyCart: player.supplyCart, mapBaited: player.mapBaited,
        maxInventorySlots: player.maxInventorySlots, sharpeningStoneBought: player.sharpeningStoneBought,
        ironPlatingBought: player.ironPlatingBought, backpackUpgrades: player.backpackUpgrades,
        activeCombatBuff: player.activeCombatBuff, activeBuffs: player.activeBuffs, happyHourTicks: player.happyHourTicks, cellarsChummed: player.cellarsChummed,
        tutorialCompleted: player.tutorialCompleted, pet: player.pet,
        gildedTavernUnlocked: player.gildedTavernUnlocked, autoClaimEnabled: player.autoClaimEnabled,
        tradeRoutesExpanded: player.tradeRoutesExpanded, monumentBuilt: player.monumentBuilt
    };
    
    // NEW: Emit the save data directly to the Node server!
    socket.emit('saveGame', {
        username: currentUsername,
        saveData: saveData
    });
    
    if (manualNotify) { logMessage(`💾 Profiles tracked under block "${currentUsername}".`); }
}

