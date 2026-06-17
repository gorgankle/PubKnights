// --- CHARACTER & SAVE ENGINES ---

let player = { 
    x: 1, y: 1, 
    level: 1, xp: 0, xpToNext: 100, skillPoints: 0,
    vitality: 70, hp: 70, stamina: 50, maxStamina: 50, power: 12, accuracy: 85, resilience: 5, swiftness: 3,
    vaultSlots: 10, gold: 0, hops: 0, wood: 0, fish: 0, 
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



function saveGame(manualNotify = false) {
    // Failsafe: Don't try to save if they aren't fully logged in yet
    if (!currentUsername) return;

    const saveData = {
        appearance: player.appearance,
        level: player.level || 1, xp: player.xp || 0, xpToNext: player.xpToNext || 100, skillPoints: player.skillPoints || 0,
        vitality: player.vitality || 70, hp: player.hp || 70, stamina: player.stamina || 50, maxStamina: player.maxStamina || 50,
        power: player.power || 12, accuracy: player.accuracy || 85, resilience: player.resilience || 5, swiftness: player.swiftness || 3,
        vaultSlots: player.vaultSlots, gold: player.gold, hops: player.hops, wood: player.wood, fish: player.fish, 
        wildernessLevel: player.wildernessLevel, cellarsUnlocked: player.cellarsUnlocked, cellarLevel: player.cellarLevel, 
        abyssUnlocked: player.abyssUnlocked, abyssDepth: player.abyssDepth,
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

function loadGame() {
    const savedString = localStorage.getItem("pub_knights_save_v7");
    if (!savedString) { logMessage(`❌ No data block located.`); return; }
    try {
        const loadedData = JSON.parse(savedString);
        Object.assign(player, loadedData);
        
        if (player.vitality === undefined) player.vitality = loadedData.maxHp || 70;
        if (player.power === undefined) player.power = loadedData.baseAttack || 12;
        if (player.swiftness === undefined) player.swiftness = loadedData.baseMoveRange || 3;
        if (player.level === undefined) player.level = 1;
        if (player.xp === undefined) player.xp = 0;
        if (!player.appearance.gender) player.appearance.gender = 'male';
        if (!player.appearance.skin) player.appearance.skin = 'light';
		if (!player.appearance.hairColor) player.appearance.hairColor = 'brown';
		if (!player.appearance.shirtColor) player.appearance.shirtColor = 'blue';
        if (!player.appearance.pantsColor) player.appearance.pantsColor = 'dark';
        if (!player.appearance.bootsColor) player.appearance.bootsColor = 'leather';
        
        if (player.xpToNext === undefined || player.xpToNext < 100) {
            player.xpToNext = calculateNextLevelXp(player.level);
        }
        
        if (player.skillPoints === undefined) player.skillPoints = 0;
        if (player.stamina === undefined) player.stamina = 50;
        if (player.maxStamina === undefined) player.maxStamina = 50;
        if (player.accuracy === undefined) player.accuracy = 85;
        if (player.resilience === undefined) player.resilience = 5;

        if (!player.appearance) player.appearance = { hair: 'hair_messy', eyes: 'eyes_blue', body: 'body_base' };
        if (!player.workers) player.workers = { woodcutters: 0, fishermen: 0, farmers: 0 };
        if (player.workers.farmers === undefined) player.workers.farmers = 0;
        if (!player.supplyCart) player.supplyCart = { wood: 0, fish: 0, hops: 0, max: 100, level: 1 };
        if (!player.idleJob || player.idleJob === 'SQUARE') player.idleJob = 'TAVERN';
        if (player.mapBaited === undefined) player.mapBaited = false;
        if (player.cellarsChummed === undefined) player.cellarsChummed = false;
        
        if (player.maxInventorySlots === undefined) player.maxInventorySlots = 5;
        if (player.sharpeningStoneBought === undefined) player.sharpeningStoneBought = 0;
        if (player.ironPlatingBought === undefined) player.ironPlatingBought = 0;
        if (player.backpackUpgrades === undefined) player.backpackUpgrades = 0;
        if (player.happyHourTicks === undefined) player.happyHourTicks = 0;
		if (player.backpackUpgrades === undefined) player.backpackUpgrades = 0;
        if (player.happyHourTicks === undefined) player.happyHourTicks = 0;
        if (player.tutorialCompleted === undefined) player.tutorialCompleted = false;
		if (!player.pet) player.pet = { adopted: false, name: "Name your pet", type: "dog", furColor: "brown", collarColor: "red" };
        
        // === LEGACY BUFF MIGRATION ===
        if (player.activeCombatBuff === undefined) player.activeCombatBuff = null;
        if (!player.activeBuffs) player.activeBuffs = [];
        if (player.activeCombatBuff && !player.activeBuffs.includes(player.activeCombatBuff)) {
            player.activeBuffs.push(player.activeCombatBuff); 
        }
        
        if (loadedData.brews && loadedData.brews > 0) {
            for (let i = 0; i < loadedData.brews; i++) {
                if (player.inventory.length < player.maxInventorySlots) {
                    player.inventory.push({ id: "stout", name: "Combat Stout", slot: "consumable", type: "brew", rarity: "Common", value: 5, spriteId: "icon_stout" });
                }
            }
            delete player.brews; 
            logMessage(`🔄 Migrated legacy brews into inventory items.`);
        }
        
gameState = 'TOWN'; 
        logMessage(`✨ Storage states verified.`);

        refreshSystemUI();
    } catch(err) { logMessage("❌ Parse fault loading variables."); }
}

function exportSave() {
    const data = localStorage.getItem("pub_knights_save_v7");
    if (!data) { logMessage("❌ Empty block."); return; }
    navigator.clipboard.writeText(data).then(() => { logMessage("📋 Block mirrored to global clipboard."); });
}

function importSave() {
    const importedData = prompt("Paste save payload string:");
    if (!importedData) return;
    try {
        JSON.parse(importedData);
        localStorage.setItem("pub_knights_save_v7", importedData);
        loadGame();
    } catch (e) { logMessage("❌ Payload signature breakdown."); }
}