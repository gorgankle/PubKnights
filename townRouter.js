// --- townRouter.js ---
// Handles all non-combat economy, inventory, and tavern management logic.

// 1. Import the specific dictionaries this router needs
const { ItemDatabase } = require('./public/js/items.js');
const { LootTables } = require('./public/js/lootTables.js');

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

// 3. Export the setup function that server.js will call
// We "inject" the live socket and the master activePlayers memory object here.
module.exports = function(socket, io, activePlayers, activeCombats) {

    // --- SERVER-AUTHORITATIVE INVENTORY & VAULT ---
    socket.on('inventoryAction', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

if (data.action === 'equip') {
            let idx = data.index;
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
            let idx = data.index;
            let item = p.inventory[idx];
            if (!item) return;
            
            let val = item.value || (item.rarity === "Gorilla" ? 500 : 15);
            p.gold += val;
            p.inventory.splice(idx, 1);
            
            socket.emit('inventoryReceipt', { success: true, action: 'sell', updatedPlayer: p, message: `💰 Sold item for ${val}g.` });
        }
        else if (data.action === 'deposit') {
            let idx = data.index;
            if (!p.inventory[idx]) return;
            
            if (p.stash.length < (p.vaultSlots || 10)) {
                p.stash.push(p.inventory.splice(idx, 1)[0]);
                socket.emit('inventoryReceipt', { success: true, action: 'deposit', updatedPlayer: p, message: "🏦 Item deposited into Vault." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "🏦 Vault is full." });
            }
        }
        else if (data.action === 'withdraw') {
            let idx = data.index;
            if (!p.stash[idx]) return;
            
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length < p.maxInventorySlots) {
                p.inventory.push(p.stash.splice(idx, 1)[0]);
                socket.emit('inventoryReceipt', { success: true, action: 'withdraw', updatedPlayer: p, message: "🎒 Item withdrawn to Backpack." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "🎒 Backpack is full." });
            }
        }
        else if (data.action === 'reorderBackpack') {
            const [movedItem] = p.inventory.splice(data.fromIndex, 1);
            p.inventory.splice(data.toIndex, 0, movedItem);
            socket.emit('inventoryReceipt', { success: true, action: 'reorder', updatedPlayer: p });
        }
        else if (data.action === 'reorderVault') {
            const [movedItem] = p.stash.splice(data.fromIndex, 1);
            p.stash.splice(data.toIndex, 0, movedItem);
            socket.emit('inventoryReceipt', { success: true, action: 'reorder', updatedPlayer: p });
        }
    });

    // --- SERVER-AUTHORITATIVE ECONOMY (THE BANK) ---
    socket.on('townAction', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

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
                socket.emit('townReceipt', { success: true, action: 'exportFish', updatedPlayer: p, message: "🐟 Wholesale Export Complete: Traded 100 fish for 150g!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Wholesalers require a clean batch of 100 Fish." });
        }
        // 6. WORKER HOUSING & RECRUITMENT
        else if (data.action === 'hireWorker') {
            let maxWorkers = (p.buildings.workerCabin || 1) * 10;
            if ((p.workers.total || 0) >= maxWorkers) {
                return socket.emit('townReceipt', { success: false, message: `❌ Housing full. Upgrade Worker Cabin (Max ${maxWorkers}).` });
            }
            if (p.gold >= 100) {
                p.gold -= 100;
                p.workers.total = (p.workers.total || 0) + 1;
                socket.emit('townReceipt', { success: true, action: 'hireWorker', updatedPlayer: p, message: `👷 Hired a new worker! Assign them to a resource.` });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient gold reserves to recruit." });
        }
        else if (data.action === 'upgradeCabin') {
            let lvl = p.buildings.workerCabin || 1;
            if (lvl >= 20) return socket.emit('townReceipt', { success: false, message: "❌ Cabin is at maximum level (20)." });
            
            let cost = Math.floor(100 * Math.pow(1.3, lvl)); 
            if (p.wood >= cost && p.gold >= cost) {
                p.wood -= cost; p.gold -= cost;
                p.buildings.workerCabin++;
                socket.emit('townReceipt', { success: true, action: 'upgradeCabin', updatedPlayer: p, message: `🏠 Worker Cabin upgraded to Lvl ${p.buildings.workerCabin}! Housing increased.` });
            } else socket.emit('townReceipt', { success: false, message: `❌ Requires ${cost}W, ${cost}g.` });
        }
        else if (data.action === 'assignWorker') {
            let reqW = data.wood || 0; let reqF = data.fish || 0; let reqH = data.hops || 0;
            if ((reqW + reqF + reqH) > (p.workers.total || 0)) return socket.emit('townReceipt', { success: false, message: "❌ Cannot exceed total hired workers." });
            
            p.workers.assigned = { wood: reqW, fish: reqF, hops: reqH };
            socket.emit('townReceipt', { success: true, action: 'assignWorker', updatedPlayer: p, message: "👷 Labor pool reallocated." });
        }
        // 7. CLAIM SUPPLY CART (Flat Wage Model)
        else if (data.action === 'claimCart') {
            let w = p.supplyCart.wood || 0; let f = p.supplyCart.fish || 0; let h = p.supplyCart.hops || 0;
            let totalClaimed = w + f + h;
            if (totalClaimed === 0) return socket.emit('townReceipt', { success: false, message: "❌ Supply cart is empty." });
            
            let wageCost = totalClaimed * 1; // 1g per resource tax
            
            if (p.gold < wageCost) {
                return socket.emit('townReceipt', { success: false, message: `❌ Insufficient gold for wages. Cart delivery requires ${wageCost}g.` });
            }
            
            p.gold -= wageCost;
            p.wood += w; p.fish += f; p.hops += h;
            p.supplyCart.wood = 0; p.supplyCart.fish = 0; p.supplyCart.hops = 0;
            
            socket.emit('townReceipt', { success: true, action: 'claimCart', isAuto: data.isAuto, updatedPlayer: p, message: `🧺 Claimed Supplies: +${w} Timber, +${f} Fish, +${h} Hops. (Paid ${wageCost}g to drivers)` });
        }
        // 8. HOST HAPPY HOUR
        else if (data.action === 'happyHour') {
            if (p.hops >= 40 && p.gold >= 100) {
                p.hops -= 40; p.gold -= 100; p.happyHourTicks = 60;
                socket.emit('townReceipt', { success: true, action: 'happyHour', updatedPlayer: p, message: "🎉 HAPPY HOUR ACTIVE! Town production doubled for 3 minutes!" });
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
                p.vitality = 3; p.hp = Math.min(p.hp, 75);
                p.maxStamina = 2; p.stamina = Math.min(p.stamina, 50);
                p.offense = 1; p.defense = 1; p.speed = 1; 
                p.skillPoints = totalExpectedSP;
                socket.emit('townReceipt', { success: true, action: 'resetStats', updatedPlayer: p, message: "🔄 Knight stats reset! Reallocate your Skill Points." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient gold for a stat reset." });
        }
        // 12. ALLOCATE STAT
        else if (data.action === 'allocateStat') {
            if (p.skillPoints > 0) {
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
// 13. CRAFT BOMB
        else if (data.action === 'craftBomb') {
            let tier = data.tier;
            let costW = tier === 1 ? 10 : 25;   
            let costH = tier === 1 ? 100 : 250; 
            
            if (p.wood >= costW && p.hops >= costH) {
                p.maxInventorySlots = p.maxInventorySlots || 5;
                if (p.inventory.length < p.maxInventorySlots) {
                    p.wood -= costW; p.hops -= costH;
                    
                    // PULL SECURELY FROM ITEM DATABASE!
                    let bombId = tier === 1 ? "bomb_small" : "bomb_heavy";
                    let bomb = JSON.parse(JSON.stringify(ItemDatabase[bombId]));
                    
                    p.inventory.push(bomb);
                    socket.emit('townReceipt', { success: true, action: 'craftBomb', updatedPlayer: p, message: `💣 Crafted ${bomb.name}!` });
                } else socket.emit('townReceipt', { success: false, message: "🎒 Backpack is full." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient materials for bomb." });
        }
// 14. CRAFT BREWS 
        else if (data.action === 'craftBrew') {
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length >= p.maxInventorySlots) return socket.emit('townReceipt', { success: false, message: "🎒 Backpack is full." });
            
            if (data.brewType === 'STOUT') {
                if (p.hops >= 1 && p.gold >= 10) { p.hops -= 1; p.gold -= 10; p.inventory.push(JSON.parse(JSON.stringify(ItemDatabase["stout"]))); socket.emit('townReceipt', { success: true, action: 'craftBrew', updatedPlayer: p, message: "🍺 Crafted a Combat Stout!" }); }
                else socket.emit('townReceipt', { success: false, message: "❌ Lacking resources for Stout." });
            }
            else if (data.brewType === 'IPA') {
                if (p.hops >= 1 && p.wood >= 5) { p.hops -= 1; p.wood -= 5; p.inventory.push(JSON.parse(JSON.stringify(ItemDatabase["ipa"]))); socket.emit('townReceipt', { success: true, action: 'craftBrew', updatedPlayer: p, message: "🍺 Crafted a Furious IPA!" }); }
                else socket.emit('townReceipt', { success: false, message: "❌ Lacking resources for IPA." });
            }
            else if (data.brewType === 'LAGER') {
                if (p.hops >= 2 && p.fish >= 5) { p.hops -= 2; p.fish -= 5; p.inventory.push(JSON.parse(JSON.stringify(ItemDatabase["lager"]))); socket.emit('townReceipt', { success: true, action: 'craftBrew', updatedPlayer: p, message: "🍺 Crafted a Swift Lager!" }); }
                else socket.emit('townReceipt', { success: false, message: "❌ Lacking resources for Lager." });
            }
            else if (data.brewType === 'RESERVE') {
                if (p.hops >= 200 && p.gold >= 50) { p.hops -= 200; p.gold -= 50; p.inventory.push(JSON.parse(JSON.stringify(ItemDatabase["reserve"]))); socket.emit('townReceipt', { success: true, action: 'craftBrew', updatedPlayer: p, message: "🍷 Crafted Grandmaster Reserve!" }); }
                else socket.emit('townReceipt', { success: false, message: "❌ Lacking resources for Reserve." });
            }
        }
        // 15. DRINK BREW IN TOWN
        else if (data.action === 'drinkBrew') {
            let item = p.inventory[data.idx];
            if (!item || item.type !== 'brew') return;
            if (item.id === 'stout') {
                if (p.hp >= p.vitality) return socket.emit('townReceipt', { success: false, message: "❌ Vitality already at max." });
                p.hp = Math.min(p.vitality, p.hp + Math.floor(p.vitality * 0.1));
                p.inventory.splice(data.idx, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "🍺 Chugged a Stout! Restored 10% HP." });
            }
            else if (item.id === 'ipa') {
                p.activeCombatBuff = 'IPA'; p.inventory.splice(data.idx, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "🍺 Drank Furious IPA! Damage boosted for next run." });
            }
            else if (item.id === 'lager') {
                p.activeCombatBuff = 'LAGER'; p.inventory.splice(data.idx, 1);
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
            let level = p.supplyCart.level || 1;
            if (level >= 21) return socket.emit('townReceipt', { success: false, message: "❌ Cart has reached maximum capacity (400)." });
            
            let upg = level - 1;
            // Bumped base cost and exponential curve to compensate for the level cap
            let gCost = Math.floor(250 * Math.pow(1.25, upg)); 
            let wCost = Math.floor(125 * Math.pow(1.25, upg));
            
            if (p.gold >= gCost && p.wood >= wCost) {
                p.gold -= gCost; p.wood -= wCost;
                p.supplyCart.max += 15; p.supplyCart.level = level + 1;
                socket.emit('townReceipt', { success: true, action: 'upgradeCart', updatedPlayer: p, message: `📦 Cart capacity expanded to ${p.supplyCart.max}!` });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient funds for Cart upgrade." });
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
                socket.emit('townReceipt', { success: true, action: 'sellFishBulk', updatedPlayer: p, message: "🚢 Exported 1,000 Fish to distant lands for 1,500 Gold." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Not enough stock. The merchant ships require exactly 1,000 Fish." });
        }
// === REPLACED ===
        // 19. MINIGAME PAYOUT SECURE HANDLER
        else if (data.action === 'claimLumberMinigame') {
            if (data.points >= 0) { 
                p.lumberPoints = (p.lumberPoints || 0) + data.points; 
                socket.emit('townReceipt', { success: true, action: 'minigameWin', updatedPlayer: p, message: `🌲 Timber Camp Complete! Secured ${data.points} Quartermaster Pts.` });
            }
        }
        // 20. FISHING POND SECURE HANDLER
        else if (data.action === 'claimFishingMinigame') {
            if (data.points >= 0) { 
                p.fishingPoints = (p.fishingPoints || 0) + data.points; 
                socket.emit('townReceipt', { success: true, action: 'minigameWin', updatedPlayer: p, message: `🐟 Fishing Complete! Secured ${data.points} Quartermaster Pts.` });
            }
        }
        // 21. HOPS HARVESTING SECURE HANDLER
        else if (data.action === 'claimHopsMinigame') {
            if (data.points >= 0) { 
                p.hopsPoints = (p.hopsPoints || 0) + data.points; 
                socket.emit('townReceipt', { success: true, action: 'minigameWin', updatedPlayer: p, message: `🌾 Harvest Complete! Secured ${data.points} Quartermaster Pts.` });
            }
        }
// ============================================
        // 22. QUARTERMASTER POINT EXCHANGE
        else if (data.action === 'exchangePoints') {
            const type = data.exchangeType; const tier = data.tier;         
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
            const invIndex = data.index; const crateId = data.crateId;
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