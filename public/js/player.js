// --- CHARACTER & SAVE ENGINES ---

// --- CHARACTER & SAVE ENGINES ---

const MAX_PLAYER_LEVEL = 50;
const SP_PER_LEVEL = 5;

// === REPLACED ===
let activeCombatActorUid = 'player_0';

let player = { 
    x: 1, y: 1, 
    level: 1, xp: 0, xpToNext: 100, skillPoints: 0,
    vitality: 1, hp: 25, stamina: 25, maxStamina: 1, 
    offense: 1, defense: 1, speed: 1, // <--- PROPER LEVEL 1 START
    vaultSlots: 10, gold: 0,
    wildernessLevel: 1, cellarsUnlocked: false, cellarLevel: 1,         
    
	appearance: { gender: 'male', skin: 'light', hair: 'hair_messy', hairColor: 'brown', eyes: 'eyes_blue', shirtColor: 'blue', pantsColor: 'dark', bootsColor: 'leather' },
// ===================
    equipment: {
        helmet: null,
        armor: null, 
        weapon: typeof ItemDatabase !== 'undefined' ? JSON.parse(JSON.stringify(ItemDatabase["rusty_mace"])) : null,
        gloves: null, 
        boots: null 
    },
    inventory: [], stash: [],
    roster: { companions: [], activeIds: [] },
    mapBaited: false,
maxInventorySlots: 5, backpackUpgrades: 0,
    
// === MULTI-BUFF ARRAYS ADDED HERE ===
    activeCombatBuff: null, activeBuffs: [], happyHourTicks: 0, cellarsChummed: false,
    
// === NEW: PET STATE ===
    // supply cart automation retired
};

function getClientRequiredCompanionIds(targetPlayer = player) {
    const requiredIds = [];
    const sources = [
        targetPlayer && targetPlayer.activeQuestSession,
        targetPlayer && targetPlayer.quests && targetPlayer.quests.active
    ];

    sources.forEach(source => {
        if (!source || !Array.isArray(source.requiredCompanionIds)) return;
        source.requiredCompanionIds.forEach(value => {
            const instanceId = typeof value === 'string' ? value.trim() : '';
            if (instanceId && !requiredIds.includes(instanceId)) requiredIds.push(instanceId);
        });
    });

    return requiredIds;
}

function normalizeClientPlayerContainers() {
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    player.stash = Array.isArray(player.stash) ? player.stash : [];
    player.equipment = player.equipment && typeof player.equipment === 'object' ? player.equipment : {};

    const equipmentSlots = ['helmet', 'armor', 'weapon', 'gloves', 'boots'];
    const pocketCount = 2;
    const maxSelectedCompanions = 3;
    equipmentSlots.forEach(slot => {
        if (!Object.prototype.hasOwnProperty.call(player.equipment, slot)) player.equipment[slot] = null;
    });

    const roster = player.roster && typeof player.roster === 'object' ? player.roster : {};
    const sourceCompanions = Array.isArray(roster.companions) ? roster.companions : [];
    const legacyIdMap = new Map();
    const hasCanonicalActiveIds = Object.prototype.hasOwnProperty.call(roster, 'activeIds');
    const companions = sourceCompanions.map(companion => {
        if (!companion || typeof companion !== 'object') return null;
        const instanceId = companion.instanceId || companion.id;
        const templateId = companion.templateId || companion.id || 'companion';
        if (!instanceId) return null;

        legacyIdMap.set(instanceId, instanceId);
        if (companion.id && !legacyIdMap.has(companion.id)) legacyIdMap.set(companion.id, instanceId);

        const sourceEquipment = companion.equipment && typeof companion.equipment === 'object' ? companion.equipment : {};
        const equipment = {};
        equipmentSlots.forEach(slot => { equipment[slot] = sourceEquipment[slot] || null; });

        if (sourceEquipment.accessory) player.inventory.push(sourceEquipment.accessory);

        const sourcePockets = Array.isArray(companion.pockets) ? companion.pockets : [];
        const pockets = Array.from({ length: pocketCount }, (_, index) => sourcePockets[index] || null);
        sourcePockets.slice(pocketCount).forEach(item => {
            if (item) player.inventory.push(item);
        });

        const normalized = Object.assign({}, companion, {
            instanceId,
            templateId,
            level: Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.trunc(Number(companion.level) || 1))),
            xp: Math.max(0, Math.trunc(Number(companion.xp) || 0)),
            equipment,
            pockets
        });
        delete normalized.id;
        return normalized;
    }).filter(Boolean);

    const validIds = new Set(companions.map(companion => companion.instanceId));
    const requiredIds = new Set(getClientRequiredCompanionIds(player).map(requiredId => (
        validIds.has(requiredId) ? requiredId : legacyIdMap.get(requiredId)
    )).filter(Boolean));
    const activeIds = [];
    const requestedActiveIds = hasCanonicalActiveIds
        ? (Array.isArray(roster.activeIds) ? roster.activeIds : [])
        : companions.filter(companion => companion.active === true).map(companion => companion.instanceId);
    requestedActiveIds.forEach(requestedId => {
        const instanceId = validIds.has(requestedId) ? requestedId : legacyIdMap.get(requestedId);
        if (instanceId
            && !requiredIds.has(instanceId)
            && !activeIds.includes(instanceId)
            && activeIds.length < maxSelectedCompanions) activeIds.push(instanceId);
    });

    player.roster = { companions, activeIds };
    companions.forEach(companion => { companion.active = activeIds.includes(companion.instanceId); });
}

function normalizePlayerLevel(level) {
    return Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(Number(level) || 1)));
}

function sanitizeLifetimeXp(xp) {
    return Math.max(0, Math.floor(Number(xp) || 0));
}

function getXpRequirementForLevel(level) {
    let currentLevel = normalizePlayerLevel(level);
    if (currentLevel <= 1) return 100;

    let base = 100;
    let multiplier = Math.pow(1.15, currentLevel - 1);
    let flatBump = currentLevel * 50;
    return Math.floor((base * multiplier) + flatBump);
}

function getTotalXpForLevel(level) {
    let targetLevel = normalizePlayerLevel(level);
    let total = 0;

    for (let currentLevel = 1; currentLevel < targetLevel; currentLevel++) {
        total += getXpRequirementForLevel(currentLevel);
    }

    return total;
}

function calculateNextLevelXp(currentLevel) {
    let level = normalizePlayerLevel(currentLevel);
    if (level >= MAX_PLAYER_LEVEL) return "MAX"; // Cap out the UI
    return getTotalXpForLevel(level + 1);
}

function getLevelXpProgress(totalXp, currentLevel) {
    let level = normalizePlayerLevel(currentLevel);
    let lifetimeXp = sanitizeLifetimeXp(totalXp);

    if (level >= MAX_PLAYER_LEVEL) {
        return {
            levelStart: getTotalXpForLevel(MAX_PLAYER_LEVEL),
            nextLevel: "MAX",
            progress: 1,
            needed: 1,
            pct: 100,
            total: lifetimeXp
        };
    }

    let levelStart = getTotalXpForLevel(level);
    let nextLevel = calculateNextLevelXp(level);
    let needed = Math.max(1, nextLevel - levelStart);
    let progress = Math.max(0, Math.min(needed, lifetimeXp - levelStart));

    return {
        levelStart,
        nextLevel,
        progress,
        needed,
        pct: Math.floor((progress / needed) * 100),
        total: lifetimeXp
    };
}


// === UNIVERSAL STAT PARSERS (CLIENT-SIDE ENGINE) ===

// === REPLACED ===
function getEffectiveStat(targetPlayer, statKey) {
    let base = targetPlayer[statKey] || 1; 
    let flatBonus = 0;
    let multiplier = 1.0;

    for (let slot in targetPlayer.equipment) {
        let item = targetPlayer.equipment[slot];
        if (item) {
            if (statKey === 'offense' && item.offense) flatBonus += item.offense;
            if (statKey === 'defense' && item.defense) flatBonus += item.defense;
            if (statKey === 'speed' && item.speed) flatBonus += item.speed;
            if (statKey === 'vitality' && item.vitality) flatBonus += item.vitality;
            if (statKey === 'maxStamina' && item.stamina) flatBonus += item.stamina; // <--- FIXED KEY MISMATCH
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
// ============================================

// === REPLACED / ADDED === (Inside player.js)
// Ultra-clean 1-line getter functions for the UI!
function getPlayerMaxHp() { return getEffectiveStat(player, 'vitality') * 25; }
function getPlayerMaxStamina() { return getEffectiveStat(player, 'maxStamina') * 25; }

function getPlayerSwiftness() { return Math.max(1, Math.min(12, getEffectiveStat(player, 'speed'))); } // Re-wired to Speed!
function getPlayerTotalPower() { return Math.max(1, getEffectiveStat(player, 'offense')); }
function getPlayerAccuracy() { return Math.max(1, getEffectiveStat(player, 'offense')); } // Obfuscated
function getPlayerDeflectChance() { return Math.max(0, Math.min(75, getEffectiveStat(player, 'defense'))); }
// ============================================
// Aliases used by other scripts
function getPlayerMoveRange() { return getPlayerSwiftness(); }
function getPlayerTotalAttack() { return getPlayerTotalPower(); }

// === ECONOMY MATH HELPERS (MUST MATCH SERVER.JS) ===
function getBackpackUpgradeCost() {
    let upg = player.backpackUpgrades || 0;
    return { gold: Math.floor(400 * Math.pow(1.2, upg)) };
}

function getVaultUpgradeCost() {
    let currentSlots = player.vaultSlots || 10;
    let upg = Math.floor((currentSlots - 10) / 5);
    return { gold: Math.floor(175 * Math.pow(1.2, upg)) };
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

// === REPLACED ===
function saveGame(manualNotify = false) {
    // Failsafe: Don't try to save if they aren't fully logged in yet
    if (!currentUsername) return;
    if (typeof normalizeClientPlayerContainers === 'function') normalizeClientPlayerContainers();

    const saveData = {
        level: player.level || 1, xp: player.xp || 0, xpToNext: player.xpToNext || calculateNextLevelXp(player.level || 1), skillPoints: player.skillPoints || 0,
        vitality: player.vitality || 70, hp: player.hp || 70, stamina: player.stamina || 50, maxStamina: player.maxStamina || 50,
        
        // === THE NEW CORE 5 ===
        offense: player.offense || 15, defense: player.defense || 5, speed: player.speed || 3, 
        
        vaultSlots: player.vaultSlots, gold: player.gold,
        wildernessLevel: player.wildernessLevel, cellarsUnlocked: player.cellarsUnlocked, cellarLevel: player.cellarLevel, 
        abyssUnlocked: player.abyssUnlocked, abyssDepth: player.abyssDepth,
        appearance: player.appearance, 
        equipment: player.equipment, inventory: player.inventory, stash: player.stash,
        roster: player.roster,
        mapBaited: player.mapBaited,
		maxInventorySlots: player.maxInventorySlots, backpackUpgrades: player.backpackUpgrades,
        activeCombatBuff: player.activeCombatBuff, activeBuffs: player.activeBuffs, happyHourTicks: player.happyHourTicks, cellarsChummed: player.cellarsChummed,
        pet: player.pet
    };
    
    // Emit the save data directly to the Node server!
    socket.emit('saveGame', {
        username: currentUsername,
        saveData: saveData
    });
    
    if (manualNotify) { logMessage(`💾 Profiles tracked under block "${currentUsername}".`); }
}
// ============================================