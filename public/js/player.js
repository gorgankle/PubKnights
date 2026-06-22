// --- CHARACTER & SAVE ENGINES ---

let player = { 
    x: 1, y: 1, 
    level: 1, xp: 0, xpToNext: 100, skillPoints: 0,
    vitality: 70, hp: 70, stamina: 50, maxStamina: 50, power: 12, accuracy: 85, resilience: 5, swiftness: 3,
    vaultSlots: 10, gold: 0, hops: 0, wood: 0, fish: 0, 
	lumberPoints: 0,  // NEW: Active timber game currency
    fishingPoints: 0, // NEW: Active fishing game currency
    hopsPoints: 0,    // NEW: Active hops game currency
    idleJob: 'TAVERN', wildernessLevel: 1, cellarsUnlocked: false, cellarLevel: 1,         
    
	appearance: { gender: 'male', skin: 'light', hair: 'hair_messy', hairColor: 'brown', eyes: 'eyes_blue', shirtColor: 'blue', pantsColor: 'dark', bootsColor: 'leather' },
    equipment: {
        helmet: null,
        armor: null, 
        weapon: { name: "Rusty Mace", slot: "weapon", type: "Mace", atkBonus: 8, rarity: "Common", attackRange: 1, value: 15, spriteId: "weap_rusty_mace" },
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
    let base = 100;
    let multiplier = Math.pow(1.15, currentLevel - 1);
    let flatBump = currentLevel * 50;
    return Math.floor((base * multiplier) + flatBump);
}



// === UNIVERSAL STAT PARSER ===

function getPlayerSwiftness() {
    let equipmentBonus = 0;
    
    // Loop through every equipped item, regardless of slot
    for (let slot in player.equipment) {
        let item = player.equipment[slot];
        if (item && item.moveBonus) {
            equipmentBonus += item.moveBonus;
        }
    }
    
    let totalRange = (player.swiftness || 3) + equipmentBonus; 
    
    // === MULTI-BUFF ARRAY CHECK ===
    if (player.activeBuffs && player.activeBuffs.includes('LAGER')) totalRange += 1; 
    
    // Hard floor of 1 (can't have 0 movement), hard ceiling of 12
    return Math.max(1, Math.min(12, totalRange));
}

function getPlayerTotalPower() {
    let equipmentBonus = 0;
    
    // Loop through every equipped item, regardless of slot
    for (let slot in player.equipment) {
        let item = player.equipment[slot];
        if (item && item.atkBonus) {
            equipmentBonus += item.atkBonus;
        }
    }
    
    let baseTotal = (player.power || 12) + equipmentBonus; 
    
    // === MULTI-BUFF ARRAY CHECK ===
    if (player.activeBuffs && player.activeBuffs.includes('IPA')) baseTotal = Math.floor(baseTotal * 1.10); 
    
    // Ensure power never drops below 1 due to curses/heavy gear
    return Math.max(1, baseTotal);
}

function getPlayerDeflectChance() {
    let baseResilience = player.resilience || 5;
    let equipmentBonus = 0;
    
    // Loop through every equipped item, regardless of slot
    for (let slot in player.equipment) {
        let item = player.equipment[slot];
        if (item && item.deflectChance) {
            equipmentBonus += item.deflectChance;
        }
    }
    
    // Multiply the total by 0.75 so resilience scales slower
    let rawDeflect = Math.floor((baseResilience + equipmentBonus) * 0.75);
    
    // Hard ceiling: max dodge is 75%, hard floor is 0%
    return Math.max(0, Math.min(75, rawDeflect));
}

function getPlayerMoveRange() { return getPlayerSwiftness(); }
function getPlayerTotalAttack() { return getPlayerTotalPower(); }

// === ECONOMY MATH HELPERS (MUST MATCH SERVER.JS) ===
function getCartUpgradeCost() {
    let level = player.supplyCart ? (player.supplyCart.level || 1) : 1;
    let upg = level - 1;
    // Base cost: 200g/100w. Scales moderately by 1.2x.
    return { 
        gold: Math.floor(200 * Math.pow(1.2, upg)), 
        wood: Math.floor(100 * Math.pow(1.2, upg)) 
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
        workers: player.workers, supplyCart: player.supplyCart, idleJob: player.idleJob, mapBaited: player.mapBaited,
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

