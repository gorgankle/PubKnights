// --- townRouter.js ---
// Handles all non-combat economy, inventory, and tavern management logic.

// 1. Import the specific dictionaries this router needs
const crypto = require('crypto');
const { ItemDatabase } = require('./public/js/items.js');
const { LootTables } = require('./public/js/lootTables.js');
const {
    sanitizePetCosmetics,
    sanitizeToken,
    clampInt,
    getArrayIndex
} = require('./serverSecurity.js');

// 2. Bring over the secure unboxing math from server.js
function rollSecureCrateLoot(crateId) {
    const table = LootTables[crateId];
    if (!table || !table.pools) return null;
    
    let totalWeight = table.pools.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosenEntry = null;

    for (let entry of table.pools) {
        if (roll < entry.weight) { chosenEntry = entry; break; }
        roll -= entry.weight;
    }
    
    return chosenEntry;
}

const STARTER_COMPANION_ID = 'marlow_shieldhand';
const STARTER_COMPANION_COST = 250;

function cloneItem(itemId) {
    return ItemDatabase[itemId] ? JSON.parse(JSON.stringify(ItemDatabase[itemId])) : null;
}

function createStarterCompanion() {
    return {
        id: STARTER_COMPANION_ID,
        name: 'Marlow Shieldhand',
        role: 'Frontliner',
        level: 1,
        hired: true,
        active: true,
        icon: 'M',
        spriteId: 'companion_marlow',
        stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
        equipment: {
            weapon: cloneItem('rusty_mace'),
            helmet: cloneItem('rusty_coif'),
            armor: cloneItem('leather_tunic'),
            accessory: null
        }
    };
}

function normalizeRosterState(player) {
    const roster = player.roster && typeof player.roster === 'object' ? player.roster : {};
    const companions = Array.isArray(roster.companions) ? roster.companions : [];
    const seen = new Set();
    player.roster = {
        companions: companions.filter(companion => {
            if (!companion || !companion.id || seen.has(companion.id)) return false;
            seen.add(companion.id);
            companion.hired = companion.hired !== false;
            companion.equipment = companion.equipment && typeof companion.equipment === 'object' ? companion.equipment : {};
            ['weapon', 'helmet', 'armor', 'accessory'].forEach(slot => {
                if (!Object.prototype.hasOwnProperty.call(companion.equipment, slot)) companion.equipment[slot] = null;
            });
            companion.stats = companion.stats && typeof companion.stats === 'object' ? companion.stats : { vitality: 3, offense: 2, defense: 2, speed: 3 };
            return true;
        }),
        activeIds: Array.isArray(roster.activeIds) ? roster.activeIds.filter(id => seen.has(id)).slice(0, 1) : []
    };
    player.roster.companions.forEach(companion => { companion.active = player.roster.activeIds.includes(companion.id); });
}

function ensurePlayerContainers(player) {
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    player.stash = Array.isArray(player.stash) ? player.stash : [];
    player.equipment = player.equipment && typeof player.equipment === 'object' ? player.equipment : {};
    normalizeRosterState(player);
}

function reorderCollection(collection, fromValue, toValue) {
    const fromIndex = getArrayIndex(fromValue, collection);
    if (fromIndex < 0) return false;

    const [movedItem] = collection.splice(fromIndex, 1);
    const toIndex = clampInt(toValue, 0, Math.max(collection.length, 0), fromIndex);
    collection.splice(toIndex, 0, movedItem);
    return true;
}

const MINIGAME_CONFIG = Object.freeze({
    lumber: { pointsKey: 'lumberPoints', durationMs: 90000, graceMs: 12000, maxScore: 50000, minEventMs: 300 },
    fishing: { pointsKey: 'fishingPoints', durationMs: 90000, graceMs: 12000, maxScore: 25000, minEventMs: 700 },
    hops: { pointsKey: 'hopsPoints', durationMs: 90000, graceMs: 12000, maxScore: 15000, minEventMs: 60 }
});

function createMinigameSession(player, type) {
    const config = MINIGAME_CONFIG[type];
    if (!config) return null;

    const now = Date.now();
    const session = {
        id: crypto.randomBytes(16).toString('hex'),
        type,
        startedAt: now,
        expiresAt: now + config.durationMs + config.graceMs,
        score: 0,
        combo: 1,
        eventCount: 0,
        lastEventAt: 0
    };

    player.activeMinigame = session;
    return session;
}

function validateMinigameSession(player, type, sessionId) {
    const session = player.activeMinigame;
    if (!session || session.id !== sessionId || session.type !== type) {
        return { success: false, message: 'Minigame session expired. Please start a new run.' };
    }

    if (Date.now() > session.expiresAt) {
        player.activeMinigame = null;
        return { success: false, message: 'Minigame session expired. Please start a new run.' };
    }

    return { success: true, session };
}

function recordMinigameEvent(player, data) {
    const type = sanitizeToken(data.gameType, '');
    const sessionId = sanitizeToken(data.sessionId, '');
    const event = sanitizeToken(data.event, '');
    const config = MINIGAME_CONFIG[type];
    if (!config) return { success: false, message: 'Invalid minigame.' };

    const valid = validateMinigameSession(player, type, sessionId);
    if (!valid.success) return valid;

    const session = valid.session;
    const now = Date.now();
    if (session.lastEventAt && now - session.lastEventAt < config.minEventMs) {
        return { success: false, message: 'Minigame action was too fast.' };
    }

    if (type === 'lumber') {
        if (event === 'hit') {
            session.score += 10 * session.combo;
            session.combo += 1;
        } else if (event === 'miss') {
            session.combo = 1;
        } else {
            return { success: false, message: 'Invalid minigame action.' };
        }
    } else if (type === 'fishing') {
        if (event !== 'catch') return { success: false, message: 'Invalid minigame action.' };
        const catchPoints = clampInt(data.points, 10, 35, 10);
        session.score += catchPoints;
    } else if (type === 'hops') {
        if (event === 'harvest') {
            session.score += 15;
        } else if (event === 'badPick') {
            session.score = Math.max(0, session.score - 5);
        } else {
            return { success: false, message: 'Invalid minigame action.' };
        }
    }

    session.eventCount += 1;
    session.lastEventAt = now;
    session.score = Math.min(config.maxScore, Math.max(0, session.score));
    return { success: true, score: session.score, eventCount: session.eventCount };
}

function claimMinigameSession(player, type, sessionId) {
    const config = MINIGAME_CONFIG[type];
    if (!config) return { success: false, points: 0, message: 'Invalid minigame.' };

    const valid = validateMinigameSession(player, type, sessionId);
    if (!valid.success) return { ...valid, points: 0 };

    const session = valid.session;
    const points = clampInt(session.score, 0, config.maxScore, 0);
    player.activeMinigame = null;

    if (points <= 0) {
        return { success: false, points: 0, message: 'No minigame points to claim.' };
    }

    player[config.pointsKey] = (player[config.pointsKey] || 0) + points;
    return { success: true, points };
}

// 3. Export the setup function that server.js will call
// We "inject" the live socket and the master activePlayers memory object here.
module.exports = function(socket, io, activePlayers, activeCombats) {

    // --- SERVER-AUTHORITATIVE INVENTORY & VAULT ---
    socket.on('inventoryAction', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;
        if (!data || typeof data !== 'object') return;
        ensurePlayerContainers(p);

if (data.action === 'equip') {
            let idx = getArrayIndex(data.index, p.inventory);
            if (idx < 0) return;
            let toEquip = p.inventory[idx];
            if (!toEquip) return;
            
            // STRICT VALIDATION: Only allow proper gear slots!
            const validSlots = ["weapon", "helmet", "armor", "gloves", "boots"];
            if (!validSlots.includes(toEquip.slot)) {
                return socket.emit('inventoryReceipt', { success: false, message: "❌ This item cannot be equipped." });
            }
            
            let slotKey = toEquip.slot;
            let worn = p.equipment[slotKey];
            
            p.equipment[slotKey] = toEquip; 
            
            if (worn) p.inventory[idx] = worn; 
            else p.inventory.splice(idx, 1);   
            
            socket.emit('inventoryReceipt', { success: true, action: 'equip', updatedPlayer: p, message: "⚙️ Gear equipped." });
        }
        else if (data.action === 'unequip') {
            let slotKey = data.slotKey;
            const validSlots = ["weapon", "helmet", "armor", "gloves", "boots"];
            if (!validSlots.includes(slotKey)) return;
            let worn = p.equipment[slotKey];
            if (!worn) return;
            
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length < p.maxInventorySlots) {
                p.inventory.push(worn);
                p.equipment[slotKey] = null; // <--- FORCES CLIENT TO UPDATE
                socket.emit('inventoryReceipt', { success: true, action: 'unequip', updatedPlayer: p, message: "⚙️ Gear unequipped." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "🎒 Backpack is full. Make space first." });
            }
        }
        else if (data.action === 'sell') {
            let idx = getArrayIndex(data.index, p.inventory);
            if (idx < 0) return;
            let item = p.inventory[idx];
            if (!item) return;
            
            let val = item.value || (item.rarity === "Gorilla" ? 500 : 15);
            p.gold += val;
            p.inventory.splice(idx, 1);
            
            socket.emit('inventoryReceipt', { success: true, action: 'sell', updatedPlayer: p, message: `💰 Sold item for ${val}g.` });
        }
        else if (data.action === 'deposit') {
            let idx = getArrayIndex(data.index, p.inventory);
            if (idx < 0) return;
            if (!p.inventory[idx]) return;
            
            if (p.stash.length < (p.vaultSlots || 10)) {
                p.stash.push(p.inventory.splice(idx, 1)[0]);
                socket.emit('inventoryReceipt', { success: true, action: 'deposit', updatedPlayer: p, message: "🏦 Item deposited into Vault." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "🏦 Vault is full." });
            }
        }
        else if (data.action === 'withdraw') {
            let idx = getArrayIndex(data.index, p.stash);
            if (idx < 0) return;
            if (!p.stash[idx]) return;
            
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length < p.maxInventorySlots) {
                p.inventory.push(p.stash.splice(idx, 1)[0]);
                socket.emit('inventoryReceipt', { success: true, action: 'withdraw', updatedPlayer: p, message: "🎒 Item withdrawn to Backpack." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "🎒 Backpack is full." });
            }
        }
        else if (data.action === 'depositEquipment') {
            const validSlots = ["weapon", "helmet", "armor", "gloves", "boots"];
            const slotKey = sanitizeToken(data.slotKey, '');
            if (!validSlots.includes(slotKey)) return;

            const worn = p.equipment[slotKey];
            if (!worn) return socket.emit('inventoryReceipt', { success: false, message: "No equipped item in that slot." });

            if (p.stash.length < (p.vaultSlots || 10)) {
                p.stash.push(worn);
                p.equipment[slotKey] = null;
                socket.emit('inventoryReceipt', { success: true, action: 'deposit', updatedPlayer: p, message: "Equipped item deposited into Vault." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "Vault is full." });
            }
        }
        else if (data.action === 'reorderBackpack') {
            if (reorderCollection(p.inventory, data.fromIndex, data.toIndex)) {
                socket.emit('inventoryReceipt', { success: true, action: 'reorder', updatedPlayer: p });
            }
        }
        else if (data.action === 'reorderVault') {
            if (reorderCollection(p.stash, data.fromIndex, data.toIndex)) {
                socket.emit('inventoryReceipt', { success: true, action: 'reorder', updatedPlayer: p });
            }
        }
    });

    // --- SERVER-AUTHORITATIVE ECONOMY (THE BANK) ---
    socket.on('townAction', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;
        if (!data || typeof data !== 'object') return;
        ensurePlayerContainers(p);

        if (data.action === 'startMinigame') {
            const gameType = sanitizeToken(data.gameType, '');
            const session = createMinigameSession(p, gameType);
            if (!session) return socket.emit('townReceipt', { success: false, message: 'Invalid minigame.' });

            return socket.emit('minigameSessionStarted', {
                gameType,
                sessionId: session.id,
                durationMs: MINIGAME_CONFIG[gameType].durationMs
            });
        }

        if (data.action === 'recordMinigameEvent') {
            const result = recordMinigameEvent(p, data);
            if (result.success) {
                socket.emit('minigameSessionScore', {
                    gameType: sanitizeToken(data.gameType, ''),
                    score: result.score,
                    eventCount: result.eventCount
                });
            }
            return;
        }

        // 1. GILDED TAVERN
        if (data.action === 'purchaseGildedTavern') {
            if (p.gold >= 10000 && !p.gildedTavernUnlocked) {
                p.gold -= 10000; p.gildedTavernUnlocked = true;
                socket.emit('townReceipt', { success: true, action: 'gildedTavern', updatedPlayer: p, message: "👑 ACHIEVEMENT UNLOCKED: Gilded Tavern Metamorphosis!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient funds. Requires 10,000 Gold Pieces." });
        }
        // 2. TRADE ROUTES
        else if (data.action === 'buyTradeRoutes') {
            if (p.gold >= 25000 && !p.tradeRoutesExpanded) {
                p.gold -= 25000; p.tradeRoutesExpanded = true;
                socket.emit('townReceipt', { success: true, action: 'tradeRoutes', updatedPlayer: p, message: "🗺️ ACHIEVEMENT UNLOCKED: Trade Routes Expanded!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient funds. The crown demands 25,000 Gold Pieces." });
        }
        // 3. THE GOLDEN MONUMENT
        else if (data.action === 'purchaseMonument') {
            if (p.gold >= 1000000 && !p.monumentBuilt) {
                p.gold -= 1000000; p.monumentBuilt = true;
                socket.emit('townReceipt', { success: true, action: 'monument', updatedPlayer: p, message: "🏆 ACHIEVEMENT UNLOCKED: The Golden Monument!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient funds. A million gold pieces are required." });
        }
		// 3.5 ADOPT PET SECURELY
        else if (data.action === 'adoptPet') {
            if (p.pet && p.pet.adopted) return socket.emit('townReceipt', { success: false, message: "❌ You already have a companion." });
            
            if (p.gold >= 10) {
                p.gold -= 10;
                const petCosmetics = sanitizePetCosmetics(data, p.pet);
                p.pet = {
                    adopted: true,
                    level: 1,
                    name: petCosmetics.name,
                    type: petCosmetics.type,
                    furColor: petCosmetics.furColor,
                    collarColor: petCosmetics.collarColor
                };
                socket.emit('townReceipt', { success: true, action: 'adoptPet', updatedPlayer: p, message: `🐕 You have officially adopted ${p.pet.name}!` });
            } else {
                socket.emit('townReceipt', { success: false, message: "❌ Insufficient funds to adopt a companion (Requires 10 Gold)." });
            }
        }
        else if (data.action === 'hireCompanion') {
            const companionId = sanitizeToken(data.companionId, STARTER_COMPANION_ID);
            if (companionId !== STARTER_COMPANION_ID) return socket.emit('townReceipt', { success: false, message: 'That companion is not available yet.' });
            if (p.roster.companions.some(companion => companion.id === STARTER_COMPANION_ID)) {
                return socket.emit('townReceipt', { success: false, action: 'hireCompanion', updatedPlayer: p, message: 'Marlow is already on your roster.' });
            }
            if (p.gold < STARTER_COMPANION_COST) {
                return socket.emit('townReceipt', { success: false, message: `Marlow asks for ${STARTER_COMPANION_COST}g up front.` });
            }

            p.gold -= STARTER_COMPANION_COST;
            const companion = createStarterCompanion();
            p.roster.companions.push(companion);
            p.roster.activeIds = [companion.id];
            normalizeRosterState(p);
            socket.emit('townReceipt', { success: true, action: 'hireCompanion', updatedPlayer: p, message: 'Marlow Shieldhand joins your party. Manage active companions from the Knight screen.' });
        }
        else if (data.action === 'setActiveCompanion') {
            const companionId = sanitizeToken(data.companionId, '');
            normalizeRosterState(p);
            const companion = p.roster.companions.find(entry => entry.id === companionId);
            if (!companion) return socket.emit('townReceipt', { success: false, message: 'That companion is not on your roster.' });
            p.roster.activeIds = [companion.id];
            normalizeRosterState(p);
            socket.emit('townReceipt', { success: true, action: 'setActiveCompanion', updatedPlayer: p, message: `${companion.name} is now active.` });
        }
        else if (data.action === 'benchCompanion') {
            const companionId = sanitizeToken(data.companionId, '');
            normalizeRosterState(p);
            p.roster.activeIds = p.roster.activeIds.filter(id => id !== companionId);
            normalizeRosterState(p);
            socket.emit('townReceipt', { success: true, action: 'benchCompanion', updatedPlayer: p, message: 'Companion moved to inactive roster.' });
        }

		
        // 4. PET TRAINING
        else if (data.action === 'trainPet') {
            p.pet = p.pet || { adopted: false, level: 1 };
            let level = p.pet.level || 1;
            let upg = level - 1;
            
            let costG = Math.floor(500 * Math.pow(1.2, upg));
            let costH = Math.floor(250 * Math.pow(1.2, upg));
            let costF = Math.floor(50 * Math.pow(1.2, upg));

            if (p.hops >= costH && p.fish >= costF && p.gold >= costG) {
                p.hops -= costH; p.fish -= costF; p.gold -= costG; p.pet.level = level + 1;
                socket.emit('townReceipt', { success: true, action: 'trainPet', updatedPlayer: p, message: `🦴 Fed pet! Scavenging increased to Level ${p.pet.level}!` });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient materials to train your companion." });
        }
        // 5. EXPORT FISH WHOLESALE
        else if (data.action === 'exportFish') {
            if (p.fish >= 100) {
                p.fish -= 100; p.gold += 120;
                socket.emit('townReceipt', { success: true, action: 'exportFish', updatedPlayer: p, message: "🐟 Wholesale Export Complete: Traded 100 fish for 120g!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Wholesalers require a clean batch of 100 Fish." });
        }
        else if (data.action === 'hireWorker' || data.action === 'upgradeCabin' || data.action === 'assignWorker' || data.action === 'claimCart') {
            socket.emit('townReceipt', { success: false, action: data.action, updatedPlayer: p, message: 'Workers and supply carts have been removed from this alpha branch.' });
        }
        // 8. HOST HAPPY HOUR
        else if (data.action === 'happyHour') {
            if (p.hops >= 40 && p.gold >= 100) {
                p.hops -= 40; p.gold -= 100; p.happyHourTicks = 60;
                socket.emit('townReceipt', { success: true, action: 'happyHour', updatedPlayer: p, message: "🎉 HAPPY HOUR ACTIVE! Minigame rewards are the main economy now, but the tavern still loves the party." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Lacking materials to launch a workforce festival." });
        }
        // 9. BAIT / CHUM MAPS
        else if (data.action === 'baitWilds') {
            if (p.fish >= 15 && !p.mapBaited) {
                p.fish -= 15; p.mapBaited = true;
                socket.emit('townReceipt', { success: true, action: 'baitWilds', updatedPlayer: p, message: "🎣 You scatter 15 Fish down the trails. Monster signals are spiking!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient fish or map already baited." });
        }
        else if (data.action === 'chumCellars') {
            if (p.fish >= 100 && p.cellarsUnlocked && !p.cellarsChummed) {
                p.fish -= 100; p.cellarsChummed = true;
                socket.emit('townReceipt', { success: true, action: 'chumCellars', updatedPlayer: p, message: "🛢️ Chummed the sewer lines! 5 massive mimics are tracking the scent." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient fish or cellars not unlocked/already chummed." });
        }
        // 10. UPGRADE VAULT
        else if (data.action === 'upgradeVault') {
            let currentSlots = p.vaultSlots || 10;
            let upg = Math.floor((currentSlots - 10) / 5);
            let goldCost = Math.floor(100 * Math.pow(1.2, upg)); 
            let woodCost = Math.floor(50 * Math.pow(1.2, upg));

            if (p.gold >= goldCost && p.wood >= woodCost) {
                p.gold -= goldCost; p.wood -= woodCost; p.vaultSlots += 5;
                socket.emit('townReceipt', { success: true, action: 'upgradeVault', updatedPlayer: p, message: `🏦 Vault capacity expanded to ${p.vaultSlots} slots!` });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient gold or wood to upgrade vault." });
        }
// === REPLACED ===
        // 11. RESET STATS
        else if (data.action === 'resetStats') {
            const SP_PER_LEVEL = 5;
            let totalExpectedSP = ((p.level || 1) - 1) * SP_PER_LEVEL;
            
            if (p.skillPoints >= totalExpectedSP) return socket.emit('townReceipt', { success: false, message: "❌ Your Knight's memory is already a blank slate." });
            
            if (p.gold >= 1000) {
                p.gold -= 1000;
                // Reset to new proper baselines
                p.vitality = 1; p.hp = Math.min(p.hp, 25);
                p.maxStamina = 1; p.stamina = Math.min(p.stamina, 25);
                p.offense = 1; p.defense = 1; p.speed = 1; 
                p.skillPoints = totalExpectedSP;
                socket.emit('townReceipt', { success: true, action: 'resetStats', updatedPlayer: p, message: "🔄 Knight stats reset! Reallocate your Skill Points." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient gold for a stat reset." });
        }
        // 12. ALLOCATE STAT
        else if (data.action === 'allocateStat') {
            if (p.skillPoints > 0) {
                const validStats = ['vitality', 'maxStamina', 'offense', 'defense', 'speed'];
                if (!validStats.includes(data.statKey)) {
                    return socket.emit('townReceipt', { success: false, message: "Invalid stat selection." });
                }

                p.skillPoints--;
                switch(data.statKey) {
                    case 'vitality': p.vitality += 1; p.hp += 25; break; // +1 Level, +25 resource
                    case 'maxStamina': p.maxStamina += 1; p.stamina += 25; break;
                    case 'offense': p.offense += 1; break; 
                    case 'defense': p.defense += 1; break; 
                    case 'speed': p.speed += 1; break; 
                }
                socket.emit('townReceipt', { success: true, action: 'allocateStat', updatedPlayer: p, message: "🌟 Stat point allocated!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ No Skill Points available." });
        }
// ===================
// 13. RETIRED: THROWABLES
        else if (data.action === 'craftBomb') {
            socket.emit('townReceipt', { success: false, message: 'Keg bombs have been retired. Ranged and AOE tactics now come from weapons.' });
        }
// 14. CRAFT BREWS 
        else if (data.action === 'craftBrew') {
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length >= p.maxInventorySlots) return socket.emit('townReceipt', { success: false, message: '🎒 Backpack is full.' });
            const brewType = sanitizeToken(data.brewType, '');
            if (!['STOUT', 'IPA', 'LAGER', 'RESERVE', 'IRONWALL', 'CLEARWATER', 'STAUNCH'].includes(brewType)) return;

            const craftItem = (itemId, message) => {
                p.inventory.push(JSON.parse(JSON.stringify(ItemDatabase[itemId])));
                socket.emit('townReceipt', { success: true, action: 'craftBrew', updatedPlayer: p, message });
            };

            if (brewType === 'STOUT') {
                if (p.hops >= 1 && p.gold >= 10) { p.hops -= 1; p.gold -= 10; craftItem('stout', '🍺 Crafted a stronger Combat Stout!'); }
                else socket.emit('townReceipt', { success: false, message: '❌ Lacking resources for Stout.' });
            }
            else if (brewType === 'IPA') {
                if (p.hops >= 2 && p.wood >= 10) { p.hops -= 2; p.wood -= 10; craftItem('ipa', '🍺 Crafted a Furious IPA!'); }
                else socket.emit('townReceipt', { success: false, message: '❌ Lacking resources for IPA.' });
            }
            else if (brewType === 'LAGER') {
                if (p.hops >= 2 && p.fish >= 10) { p.hops -= 2; p.fish -= 10; craftItem('lager', '🍺 Crafted a Swift Lager!'); }
                else socket.emit('townReceipt', { success: false, message: '❌ Lacking resources for Lager.' });
            }
            else if (brewType === 'RESERVE') {
                if (p.hops >= 500 && p.gold >= 250) { p.hops -= 500; p.gold -= 250; craftItem('reserve', '🍷 Crafted a scarce Grandmaster Reserve!'); }
                else socket.emit('townReceipt', { success: false, message: '❌ Lacking resources for Reserve.' });
            }
            else if (brewType === 'IRONWALL') {
                if (p.hops >= 8 && p.wood >= 25 && p.gold >= 25) { p.hops -= 8; p.wood -= 25; p.gold -= 25; craftItem('ironwall_porter', '🛡️ Crafted an Ironwall Porter!'); }
                else socket.emit('townReceipt', { success: false, message: '❌ Lacking resources for Ironwall Porter.' });
            }
            else if (brewType === 'CLEARWATER') {
                if (p.hops >= 4 && p.fish >= 20) { p.hops -= 4; p.fish -= 20; craftItem('clearwater_tonic', '💧 Crafted a Clearwater Tonic!'); }
                else socket.emit('townReceipt', { success: false, message: '❌ Lacking resources for Clearwater Tonic.' });
            }
            else if (brewType === 'STAUNCH') {
                if (p.hops >= 12 && p.fish >= 30 && p.gold >= 50) { p.hops -= 12; p.fish -= 30; p.gold -= 50; craftItem('staunching_bitter', '🩸 Crafted a Staunching Bitter!'); }
                else socket.emit('townReceipt', { success: false, message: '❌ Lacking resources for Staunching Bitter.' });
            }
        }
        // 15. DRINK BREW IN TOWN
        else if (data.action === 'drinkBrew') {
            return socket.emit('townReceipt', { success: false, message: "Brews can only be consumed from the combat backpack." });
            let brewIndex = getArrayIndex(data.idx, p.inventory);
            if (brewIndex < 0) return;
            let item = p.inventory[brewIndex];
            if (!item || item.type !== 'brew') return;
            if (item.id === 'stout') {
                if (p.hp >= p.vitality) return socket.emit('townReceipt', { success: false, message: "❌ Vitality already at max." });
                p.hp = Math.min(p.vitality, p.hp + Math.floor(p.vitality * 0.1));
                p.inventory.splice(brewIndex, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "🍺 Chugged a Stout! Restored 10% HP." });
            }
            else if (item.id === 'ipa') {
                p.activeCombatBuff = 'IPA'; p.inventory.splice(brewIndex, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "🍺 Drank Furious IPA! Damage boosted for next run." });
            }
            else if (item.id === 'lager') {
                p.activeCombatBuff = 'LAGER'; p.inventory.splice(brewIndex, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "🍺 Drank Swift Lager! Movement boosted for next run." });
            }
        }
        // 16. UPGRADES (BACKPACK & CART)
        else if (data.action === 'upgradeBackpack') {
            let upg = p.backpackUpgrades || 0;
            let gCost = Math.floor(250 * Math.pow(1.2, upg)); 
            let wCost = Math.floor(100 * Math.pow(1.2, upg));
            
            if (p.gold >= gCost && p.wood >= wCost) {
                p.gold -= gCost; p.wood -= wCost;
                p.maxInventorySlots = (p.maxInventorySlots || 5) + 1; p.backpackUpgrades = upg + 1;
                socket.emit('townReceipt', { success: true, action: 'upgradeBackpack', updatedPlayer: p, message: `🎒 Backpack capacity expanded to ${p.maxInventorySlots}!` });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient gold or wood." });
        }
        else if (data.action === 'upgradeCart') {
            socket.emit('townReceipt', { success: false, action: 'upgradeCart', updatedPlayer: p, message: 'Supply cart upgrades have been removed from this alpha branch.' });
        }
        // 17. BLACK MARKET (SERVER-SIDE LOOT ROLL)
        else if (data.action === 'blackMarket') {
            if (p.hops >= 50) {
                p.maxInventorySlots = p.maxInventorySlots || 5;
                if (p.inventory.length < p.maxInventorySlots) {
                    let table = LootTables["black_market"];
                    if (!table) return socket.emit('townReceipt', { success: false, message: "❌ Loot table missing configuration data." });

                    p.hops -= 50;
                    let totalWeight = table.pools.reduce((sum, entry) => sum + entry.weight, 0);
                    let roll = Math.random() * totalWeight;
                    let chosenItemId = null;

                    for (let entry of table.pools) {
                        if (roll < entry.weight) { chosenItemId = entry.itemId; break; }
                        roll -= entry.weight;
                    }

                    let droppedItemTemplate = ItemDatabase[chosenItemId] || ItemDatabase["rusty_mace"];
                    let randomItem = JSON.parse(JSON.stringify(droppedItemTemplate));
                    
                    p.inventory.push(randomItem);
                    socket.emit('townReceipt', { success: true, action: 'blackMarket', updatedPlayer: p, message: `🪙 Black Market Trader gave you: ${randomItem.name} [${randomItem.rarity}]` });
                } else socket.emit('townReceipt', { success: false, message: "🎒 Backpack is full." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Trader demands 50 Hops." });
        }
        // 18. SELL FISH BULK
        else if (data.action === 'sellFishBulk') {
            if (!p.tradeRoutesExpanded) return socket.emit('townReceipt', { success: false, message: "❌ Trade routes are not expanded." });
            if (p.fish >= 1000) {
                p.fish -= 1000; p.gold += 1200;
                socket.emit('townReceipt', { success: true, action: 'sellFishBulk', updatedPlayer: p, message: "🚢 Exported 1,000 Fish to distant lands for 1,200 Gold." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Not enough stock. The merchant ships require exactly 1,000 Fish." });
        }
// === REPLACED ===
        // 19. MINIGAME PAYOUT SECURE HANDLER
        else if (data.action === 'claimLumberMinigame') {
            const result = claimMinigameSession(p, 'lumber', sanitizeToken(data.sessionId, ''));
            if (!result.success) return socket.emit('townReceipt', { success: false, message: result.message });
            return socket.emit('townReceipt', { success: true, action: 'minigameWin', updatedPlayer: p, message: `Timber Camp Complete! Secured ${result.points} Quartermaster Pts.` });
        }
        // 20. FISHING POND SECURE HANDLER
        else if (data.action === 'claimFishingMinigame') {
            const result = claimMinigameSession(p, 'fishing', sanitizeToken(data.sessionId, ''));
            if (!result.success) return socket.emit('townReceipt', { success: false, message: result.message });
            return socket.emit('townReceipt', { success: true, action: 'minigameWin', updatedPlayer: p, message: `Fishing Complete! Secured ${result.points} Quartermaster Pts.` });
        }
        // 21. HOPS HARVESTING SECURE HANDLER
        else if (data.action === 'claimHopsMinigame') {
            const result = claimMinigameSession(p, 'hops', sanitizeToken(data.sessionId, ''));
            if (!result.success) return socket.emit('townReceipt', { success: false, message: result.message });
            return socket.emit('townReceipt', { success: true, action: 'minigameWin', updatedPlayer: p, message: `Harvest Complete! Secured ${result.points} Quartermaster Pts.` });
        }
// ============================================
        // 22. QUARTERMASTER POINT EXCHANGE
        else if (data.action === 'exchangePoints') {
            const type = sanitizeToken(data.exchangeType, '');
            const tier = sanitizeToken(data.tier, '');         
            if (!['lumber', 'fish', 'hops'].includes(type) || !['low', 'mid', 'gamble', 'epic'].includes(tier)) return;
            let cost = 0; let rewardAmt = 0;

            if (tier === 'low') { cost = 100; rewardAmt = 100; }
            else if (tier === 'mid') { cost = 1000; rewardAmt = 1000; }
            else if (tier === 'gamble') { cost = 2500; }
            else if (tier === 'epic') { cost = 25000; }

            let success = false; let msg = "";

            if (type === 'lumber' && (p.lumberPoints || 0) >= cost) {
                p.lumberPoints -= cost;
                if (tier === 'low' || tier === 'mid') { p.wood = (p.wood || 0) + rewardAmt; msg = `🌲 Quartermaster traded ${cost} Pts for ${rewardAmt} Timber.`; } 
                else if (tier === 'gamble') {
                    // FIX: Pull directly from ItemDatabase!
                    let newCrate = JSON.parse(JSON.stringify(ItemDatabase["timber_crate"]));
                    if (p.inventory.length < (p.maxInventorySlots || 5)) p.inventory.push(newCrate); else p.stash.push(newCrate);
                    msg = `📦 Purchased a Sealed Timber Crate! It has been sent to your storage.`;
                }
                success = true;
            }
            else if (type === 'fish' && (p.fishingPoints || 0) >= cost) {
                p.fishingPoints -= cost;
                if (tier === 'low' || tier === 'mid') { p.fish = (p.fish || 0) + rewardAmt; msg = `🐟 Quartermaster traded ${cost} Pts for ${rewardAmt} Fish.`; } 
                else if (tier === 'gamble') {
                    // FIX: Pull directly from ItemDatabase!
                    let newCrate = JSON.parse(JSON.stringify(ItemDatabase["angler_crate"]));
                    if (p.inventory.length < (p.maxInventorySlots || 5)) p.inventory.push(newCrate); else p.stash.push(newCrate);
                    msg = `📦 Purchased an Angler Gamble Crate! It has been sent to your storage.`;
                }
                success = true;
            }
            else if (type === 'hops' && (p.hopsPoints || 0) >= cost) {
                p.hopsPoints -= cost;
                if (tier === 'low' || tier === 'mid') { p.hops = (p.hops || 0) + rewardAmt; msg = `🌾 Quartermaster traded ${cost} Pts for ${rewardAmt} Hops.`; } 
                else if (tier === 'gamble') {
                    // FIX: Pull directly from ItemDatabase!
                    let newCrate = JSON.parse(JSON.stringify(ItemDatabase["harvest_crate"]));
                    if (p.inventory.length < (p.maxInventorySlots || 5)) p.inventory.push(newCrate); else p.stash.push(newCrate);
                    msg = `📦 Purchased a Harvest Gamble Crate! It has been sent to your storage.`;
                }
                success = true;
            } else msg = `❌ Not enough ${type} points for this transaction.`;

            socket.emit('townReceipt', { success: success, action: 'trade', updatedPlayer: p, message: msg });
        }
// 23. UNBOX GAMBLE CRATES
        else if (data.action === 'openCrate') {
            const invIndex = getArrayIndex(data.index, p.inventory);
            const crateId = sanitizeToken(data.crateId, '');
            if (invIndex < 0) return socket.emit('townReceipt', { success: false, message: "Invalid crate selection." });
            if (!p.inventory[invIndex] || p.inventory[invIndex].id !== crateId) return socket.emit('townReceipt', { success: false, message: "❌ Invalid crate selection." });
            
            p.inventory.splice(invIndex, 1);
            const rolledLoot = rollSecureCrateLoot(crateId); 
            let lootMsg = "";
            let finalRarity = "Common";

            if (rolledLoot) {
                // Determine animation color based on weight rarity
                if (rolledLoot.isJackpot) finalRarity = "JACKPOT";
                else if (rolledLoot.weight <= 4) finalRarity = "Epic";
                else if (rolledLoot.weight <= 10) finalRarity = "Rare";
                else if (rolledLoot.weight <= 25) finalRarity = "Uncommon";

                if (rolledLoot.isResource) {
                    p[rolledLoot.itemId] = (p[rolledLoot.itemId] || 0) + rolledLoot.amt; 
                    let resName = rolledLoot.itemId.charAt(0).toUpperCase() + rolledLoot.itemId.slice(1);
                    lootMsg = `${rolledLoot.amt}x ${resName}`;
                } 
                else {
                    // PULL SECURELY FROM ITEM DATABASE to attach sprites and stats!
                    let dbItem = ItemDatabase[rolledLoot.itemId];
                    if (dbItem) {
                        let newItem = JSON.parse(JSON.stringify(dbItem));
                        
                        if (rolledLoot.amt && rolledLoot.amt > 1) newItem.name = `${newItem.name} (x${rolledLoot.amt})`; 
                        
                        if (p.inventory.length < (p.maxInventorySlots || 5)) p.inventory.push(newItem); else p.stash.push(newItem); 
                        
                        lootMsg = `1x ${newItem.name}`;
                        if (rolledLoot.isJackpot) {
                            lootMsg = `🌟 ${newItem.name} 🌟`;
                            finalRarity = "JACKPOT";
                        } else if (newItem.rarity) {
                            finalRarity = newItem.rarity;
                        }
                    } else {
                        lootMsg = "The crate was mysteriously empty...";
                        finalRarity = "None";
                    }
                }
            } else {
                lootMsg = "The crate was mysteriously empty...";
                finalRarity = "None";
            }
            
            socket.emit('crateOpened', { success: true, lootMessage: lootMsg, rarity: finalRarity });
            socket.emit('townReceipt', { success: true, action: 'inventoryUpdate', updatedPlayer: p, message: "" });
        }
		// === WITH ===
        // (Idle Job Assignment Removed)
    });
};
