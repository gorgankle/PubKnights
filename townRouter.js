// --- townRouter.js ---
// Handles all non-combat economy, inventory, and tavern management logic.

// 1. Import the specific dictionaries this router needs
const crypto = require('crypto');
const { ItemDatabase } = require('./public/js/items.js');
const { LootTables } = require('./public/js/lootTables.js');
const {
    sanitizeToken,
    clampInt,
    getArrayIndex
} = require('./serverSecurity.js');
const {
    COMPANION_EQUIPMENT_SLOTS,
    COMPANION_POCKET_COUNT,
    normalizeRosterState,
    findCompanionByInstanceId,
    canActivateCompanion,
    canBenchCompanion,
    canDismissCompanion
} = require('./companionRoster.js');
const {
    trainMercenaryOneLevel
} = require('./mercenaryProgression.js');
const {
    EQUIPMENT_SLOTS,
    equipItemWithHandRules
} = require('./equipmentHandRules.js');
const { hasActiveJourney } = require('./adventureState.js');

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

function cloneItem(itemId) {
    return ItemDatabase[itemId] ? JSON.parse(JSON.stringify(ItemDatabase[itemId])) : null;
}
function isCompanionPocketItem(item) {
    if (!item || typeof item !== 'object') return false;
    if (COMPANION_EQUIPMENT_SLOTS.includes(item.slot)) return true;
    return item.slot === 'consumable' && item.combat && typeof item.combat === 'object';
}

function getCompanionStoredItems(companion) {
    if (!companion) return [];
    const equipmentItems = COMPANION_EQUIPMENT_SLOTS
        .map(slotKey => companion.equipment && companion.equipment[slotKey])
        .filter(Boolean);
    const pocketItems = Array.isArray(companion.pockets) ? companion.pockets.filter(Boolean) : [];
    return [...equipmentItems, ...pocketItems];
}


function ensurePlayerContainers(player) {
    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    player.stash = Array.isArray(player.stash) ? player.stash : [];
    player.equipment = player.equipment && typeof player.equipment === 'object' ? player.equipment : {};
    normalizeRosterState(player);
}

const EXPEDITION_LOCKED_INVENTORY_ACTIONS = new Set([
    'sell',
    'deposit',
    'withdraw',
    'depositEquipment',
    'reorderVault'
]);

function emitActiveJourneyTownLock(socket, eventName, action, player) {
    return socket.emit(eventName, {
        success: false,
        code: 'ACTIVE_JOURNEY',
        action,
        updatedPlayer: player,
        message: 'Return safely to the pub before using town services.'
    });
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
    lumber: { durationMs: 90000, graceMs: 15000, minEventMs: 125, maxScore: 50000, pointsKey: 'lumberPoints', label: 'Timber Trial' },
    fishing: { durationMs: 90000, graceMs: 15000, minEventMs: 75, maxScore: 50000, pointsKey: 'fishingPoints', label: 'Fishing Trial' },
    hops: { durationMs: 90000, graceMs: 15000, minEventMs: 75, maxScore: 50000, pointsKey: 'hopsPoints', label: 'Hops Trial' }
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
module.exports = function(socket, _io, activePlayers, activeCombats) {

    // --- SERVER-AUTHORITATIVE INVENTORY & VAULT ---
    socket.on('inventoryAction', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;
        if (!data || typeof data !== 'object') return;
        ensurePlayerContainers(p);

        if (activeCombats && activeCombats[socket.id]) {
            return socket.emit('inventoryReceipt', {
                success: false,
                action: sanitizeToken(data.action, ''),
                message: 'Inventory changes are locked during combat and must be made outside combat. Use the combat Backpack to swap gear for one action.',
                updatedPlayer: p
            });
        }

        if (
            hasActiveJourney(p)
            && EXPEDITION_LOCKED_INVENTORY_ACTIONS.has(data.action)
        ) {
            return emitActiveJourneyTownLock(
                socket,
                'inventoryReceipt',
                data.action,
                p
            );
        }

        if (['equipCompanion', 'unequipCompanion', 'storeCompanionPocket', 'removeCompanionPocket'].includes(data.action)) {
            const failCompanionInventoryAction = message => socket.emit('inventoryReceipt', {
                success: false,
                action: data.action,
                message,
                updatedPlayer: p
            });
            const companion = findCompanionByInstanceId(p, data.instanceId);
            if (!companion) return failCompanionInventoryAction('That mercenary is not on your roster.');

            if (data.action === 'equipCompanion') {
                const idx = getArrayIndex(data.index, p.inventory);
                if (idx < 0) return failCompanionInventoryAction('Invalid backpack slot.');
                const toEquip = p.inventory[idx];
                if (!toEquip || !COMPANION_EQUIPMENT_SLOTS.includes(toEquip.slot)) {
                    return failCompanionInventoryAction('That item cannot be equipped by a mercenary.');
                }

                p.maxInventorySlots = p.maxInventorySlots || 5;
                const equipResult = equipItemWithHandRules({
                    equipment: companion.equipment,
                    inventory: p.inventory,
                    inventoryIndex: idx,
                    maxInventorySlots: p.maxInventorySlots,
                    validSlots: COMPANION_EQUIPMENT_SLOTS
                });
                if (!equipResult.success) {
                    return failCompanionInventoryAction(equipResult.message);
                }
                const handMessage = equipResult.conflictSlot
                    ? ' Conflicting hand gear was stowed.'
                    : '';
                return socket.emit('inventoryReceipt', {
                    success: true,
                    action: 'equipCompanion',
                    updatedPlayer: p,
                    message: `${companion.name} equipped ${toEquip.name}.${handMessage}`
                });
            }

            if (data.action === 'unequipCompanion') {
                const slotKey = sanitizeToken(data.slotKey, '');
                if (!COMPANION_EQUIPMENT_SLOTS.includes(slotKey)) {
                    return failCompanionInventoryAction('Invalid mercenary equipment slot.');
                }
                const worn = companion.equipment[slotKey];
                if (!worn) return failCompanionInventoryAction(`${companion.name} has nothing equipped there.`);
                p.maxInventorySlots = p.maxInventorySlots || 5;
                if (p.inventory.length >= p.maxInventorySlots) {
                    return failCompanionInventoryAction('Backpack is full. Make space first.');
                }
                p.inventory.push(worn);
                companion.equipment[slotKey] = null;
                return socket.emit('inventoryReceipt', { success: true, action: 'unequipCompanion', updatedPlayer: p, message: `${companion.name} unequipped ${worn.name}.` });
            }

            const pocketIndex = getArrayIndex(data.pocketIndex, companion.pockets);
            if (pocketIndex < 0 || pocketIndex >= COMPANION_POCKET_COUNT) {
                return failCompanionInventoryAction('Invalid mercenary pocket.');
            }

            if (data.action === 'storeCompanionPocket') {
                const idx = getArrayIndex(data.index, p.inventory);
                if (idx < 0) return failCompanionInventoryAction('Invalid backpack slot.');
                const toStore = p.inventory[idx];
                if (!isCompanionPocketItem(toStore)) {
                    return failCompanionInventoryAction('Pockets can only hold equipment or combat consumables.');
                }
                const stored = companion.pockets[pocketIndex];
                companion.pockets[pocketIndex] = toStore;
                if (stored) p.inventory[idx] = stored;
                else p.inventory.splice(idx, 1);
                return socket.emit('inventoryReceipt', { success: true, action: 'storeCompanionPocket', updatedPlayer: p, message: `${companion.name} stored ${toStore.name} in pocket ${pocketIndex + 1}.` });
            }

            const stored = companion.pockets[pocketIndex];
            if (!stored) return failCompanionInventoryAction(`${companion.name}'s pocket is empty.`);
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length >= p.maxInventorySlots) {
                return failCompanionInventoryAction('Backpack is full. Make space first.');
            }
            p.inventory.push(stored);
            companion.pockets[pocketIndex] = null;
            return socket.emit('inventoryReceipt', { success: true, action: 'removeCompanionPocket', updatedPlayer: p, message: `${stored.name} returned to the shared backpack.` });
        }
        else if (data.action === 'equip') {
            let idx = getArrayIndex(data.index, p.inventory);
            if (idx < 0) return;
            let toEquip = p.inventory[idx];
            if (!toEquip) return;
            
            // STRICT VALIDATION: Only allow proper gear slots!
            if (!EQUIPMENT_SLOTS.includes(toEquip.slot)) {
                return socket.emit('inventoryReceipt', { success: false, message: "\u274C This item cannot be equipped." });
            }

            p.maxInventorySlots = p.maxInventorySlots || 5;
            const equipResult = equipItemWithHandRules({
                equipment: p.equipment,
                inventory: p.inventory,
                inventoryIndex: idx,
                maxInventorySlots: p.maxInventorySlots
            });
            if (!equipResult.success) {
                return socket.emit('inventoryReceipt', {
                    success: false,
                    message: equipResult.message
                });
            }

            const handMessage = equipResult.conflictSlot
                ? ' Conflicting hand gear was stowed.'
                : '';
            socket.emit('inventoryReceipt', {
                success: true,
                action: 'equip',
                updatedPlayer: p,
                message: `\u2699\uFE0F Gear equipped.${handMessage}`
            });
        }
        else if (data.action === 'unequip') {
            let slotKey = data.slotKey;
            if (!EQUIPMENT_SLOTS.includes(slotKey)) return;
            let worn = p.equipment[slotKey];
            if (!worn) return;
            
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length < p.maxInventorySlots) {
                p.inventory.push(worn);
                p.equipment[slotKey] = null; // <--- FORCES CLIENT TO UPDATE
                socket.emit('inventoryReceipt', { success: true, action: 'unequip', updatedPlayer: p, message: "\u2699\uFE0F Gear unequipped." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "\u{1F392} Backpack is full. Make space first." });
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
            
            socket.emit('inventoryReceipt', { success: true, action: 'sell', updatedPlayer: p, message: `\u{1F4B0} Sold item for ${val}g.` });
        }
        else if (data.action === 'deposit') {
            let idx = getArrayIndex(data.index, p.inventory);
            if (idx < 0) return;
            if (!p.inventory[idx]) return;
            
            if (p.stash.length < (p.vaultSlots || 10)) {
                p.stash.push(p.inventory.splice(idx, 1)[0]);
                socket.emit('inventoryReceipt', { success: true, action: 'deposit', updatedPlayer: p, message: "\u{1F3E6} Item deposited into Vault." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "\u{1F3E6} Vault is full." });
            }
        }
        else if (data.action === 'withdraw') {
            let idx = getArrayIndex(data.index, p.stash);
            if (idx < 0) return;
            if (!p.stash[idx]) return;
            
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length < p.maxInventorySlots) {
                p.inventory.push(p.stash.splice(idx, 1)[0]);
                socket.emit('inventoryReceipt', { success: true, action: 'withdraw', updatedPlayer: p, message: "\u{1F392} Item withdrawn to Backpack." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "\u{1F392} Backpack is full." });
            }
        }
        else if (data.action === 'depositEquipment') {
            const slotKey = sanitizeToken(data.slotKey, '');
            if (!EQUIPMENT_SLOTS.includes(slotKey)) return;

            const worn = p.equipment[slotKey];
            if (!worn) return socket.emit('inventoryReceipt', { success: false, message: "No equipped item in that slot." });

            if (p.stash.length < (p.vaultSlots || 10)) {
                p.stash.push(worn);
                p.equipment[slotKey] = null;
                socket.emit('inventoryReceipt', { success: true, action: 'deposit', updatedPlayer: p, message: "Equipped item deposited into Vault." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "\u{1F3E6} Vault is full." });
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

        if (hasActiveJourney(p)) {
            return emitActiveJourneyTownLock(
                socket,
                'townReceipt',
                data.action,
                p
            );
        }

        if (data.action === 'startMinigame') {
            const gameType = sanitizeToken(data.gameType, '');
            const session = createMinigameSession(p, gameType);
            if (!session) return socket.emit('townReceipt', { success: false, action: 'startMinigame', updatedPlayer: p, message: 'Invalid minigame.' });

            socket.emit('minigameSessionStarted', {
                gameType,
                sessionId: session.id,
                durationMs: MINIGAME_CONFIG[gameType].durationMs
            });
            return socket.emit('townReceipt', { success: true, action: 'startMinigame', updatedPlayer: p, message: `${MINIGAME_CONFIG[gameType].label} started.` });
        }

        if (data.action === 'recordMinigameEvent') {
            recordMinigameEvent(p, data);
            return;
        }
        if (data.action === 'setActiveCompanion') {
            if (activeCombats && activeCombats[socket.id]) {
                return socket.emit('townReceipt', { success: false, action: 'setActiveCompanion', message: 'Mercenary rosters can only be changed outside combat.' });
            }
            const instanceId = sanitizeToken(data.instanceId || data.companionId, '');
            normalizeRosterState(p);
            const companion = findCompanionByInstanceId(p, instanceId);
            const activationPolicy = canActivateCompanion(p, instanceId);
            if (!activationPolicy.allowed) {
                return socket.emit('townReceipt', { success: false, action: 'setActiveCompanion', message: activationPolicy.message });
            }
            p.roster.activeIds.push(companion.instanceId);
            normalizeRosterState(p);
            socket.emit('townReceipt', { success: true, action: 'setActiveCompanion', updatedPlayer: p, message: `${companion.name} joined the active party.` });
        }
        else if (data.action === 'benchCompanion') {
            if (activeCombats && activeCombats[socket.id]) {
                return socket.emit('townReceipt', { success: false, action: 'benchCompanion', message: 'Mercenary rosters can only be changed outside combat.' });
            }
            const instanceId = sanitizeToken(data.instanceId || data.companionId, '');
            normalizeRosterState(p);
            const benchPolicy = canBenchCompanion(p, instanceId);
            if (!benchPolicy.allowed) {
                return socket.emit('townReceipt', { success: false, action: 'benchCompanion', message: benchPolicy.message });
            }
            p.roster.activeIds = p.roster.activeIds.filter(id => id !== instanceId);
            normalizeRosterState(p);
            socket.emit('townReceipt', { success: true, action: 'benchCompanion', updatedPlayer: p, message: 'Mercenary moved to the bench.' });
        }
        else if (data.action === 'benchAllCompanions') {
            if (activeCombats && activeCombats[socket.id]) {
                return socket.emit('townReceipt', { success: false, action: 'benchAllCompanions', message: 'Mercenary rosters can only be changed outside combat.' });
            }
            p.roster.activeIds = [];
            normalizeRosterState(p);
            socket.emit('townReceipt', { success: true, action: 'benchAllCompanions', updatedPlayer: p, message: 'All mercenaries moved to the bench.' });
        }
        else if (data.action === 'fillActiveCompanions') {
            if (activeCombats && activeCombats[socket.id]) {
                return socket.emit('townReceipt', { success: false, action: 'fillActiveCompanions', message: 'Mercenary rosters can only be changed outside combat.' });
            }
            normalizeRosterState(p);
            p.roster.companions.forEach(companion => {
                const policy = canActivateCompanion(p, companion.instanceId);
                if (!policy.allowed) return;
                p.roster.activeIds.push(companion.instanceId);
                normalizeRosterState(p);
            });
            socket.emit('townReceipt', { success: true, action: 'fillActiveCompanions', updatedPlayer: p, message: `Active mercenary party filled (${p.roster.activeIds.length}/3).` });
        }
        else if (data.action === 'dismissCompanion') {
            if (activeCombats && activeCombats[socket.id]) {
                return socket.emit('townReceipt', { success: false, action: 'dismissCompanion', message: 'Mercenaries can only be dismissed outside combat.' });
            }
            const instanceId = sanitizeToken(data.instanceId || data.companionId, '');
            normalizeRosterState(p);
            const companion = findCompanionByInstanceId(p, instanceId);
            const dismissalPolicy = canDismissCompanion(p, instanceId);
            if (!dismissalPolicy.allowed) {
                return socket.emit('townReceipt', { success: false, action: 'dismissCompanion', message: dismissalPolicy.message });
            }

            const storedItems = getCompanionStoredItems(companion);
            p.maxInventorySlots = p.maxInventorySlots || 5;
            const freeSlots = Math.max(0, p.maxInventorySlots - p.inventory.length);
            if (storedItems.length > freeSlots) {
                const needed = storedItems.length - freeSlots;
                return socket.emit('townReceipt', { success: false, action: 'dismissCompanion', message: `${companion.name} has ${storedItems.length} stored items. Free ${needed} more backpack slot${needed === 1 ? '' : 's'} before dismissal.` });
            }

            p.inventory.push(...storedItems);
            p.roster.activeIds = p.roster.activeIds.filter(id => id !== companion.instanceId);
            p.roster.companions = p.roster.companions.filter(entry => entry.instanceId !== companion.instanceId);
            normalizeRosterState(p);
            socket.emit('townReceipt', { success: true, action: 'dismissCompanion', updatedPlayer: p, message: `${companion.name} left the roster. ${storedItems.length} item${storedItems.length === 1 ? '' : 's'} returned to the backpack.` });
        }
        else if (data.action === 'trainMercenary') {
            const instanceId = sanitizeToken(data.instanceId || data.companionId, '');
            const result = trainMercenaryOneLevel(p, instanceId, {
                inCombat: Boolean(activeCombats && activeCombats[socket.id])
            });
            socket.emit('townReceipt', {
                success: result.success,
                action: 'trainMercenary',
                updatedPlayer: p,
                training: result,
                message: result.message
            });
        }
        else if (data.action === 'upgradeVault') {
            let currentSlots = p.vaultSlots || 10;
            let upg = Math.floor((currentSlots - 10) / 5);
            let goldCost = Math.floor(175 * Math.pow(1.2, upg));

            if (p.gold >= goldCost) {
                p.gold -= goldCost; p.vaultSlots += 5;
                socket.emit('townReceipt', { success: true, action: 'upgradeVault', updatedPlayer: p, message: `Vault capacity expanded to ${p.vaultSlots} slots!` });
            } else socket.emit('townReceipt', { success: false, message: 'Insufficient gold to upgrade vault.' });
        }
// === REPLACED ===
        // 11. RESET STATS
        else if (data.action === 'resetStats') {
            const SP_PER_LEVEL = 5;
            let totalExpectedSP = ((p.level || 1) - 1) * SP_PER_LEVEL;
            
            if (p.skillPoints >= totalExpectedSP) return socket.emit('townReceipt', { success: false, message: "\u274C Your Knight's memory is already a blank slate." });
            
            if (p.gold >= 1000) {
                p.gold -= 1000;
                // Reset to new proper baselines
                p.vitality = 1; p.hp = Math.min(p.hp, 25);
                p.maxStamina = 1; p.stamina = Math.min(p.stamina, 25);
                p.offense = 1; p.defense = 1; p.speed = 1; 
                p.skillPoints = totalExpectedSP;
                socket.emit('townReceipt', { success: true, action: 'resetStats', updatedPlayer: p, message: "\u{1F504} Knight stats reset! Reallocate your Skill Points." });
            } else socket.emit('townReceipt', { success: false, message: "\u274C Insufficient gold for a stat reset." });
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
                socket.emit('townReceipt', { success: true, action: 'allocateStat', updatedPlayer: p, message: "\u{1F31F} Stat point allocated!" });
            } else socket.emit('townReceipt', { success: false, message: "\u274C No Skill Points available." });
        }
// ===================
        else if (data.action === 'craftBrew') {
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length >= p.maxInventorySlots) return socket.emit('townReceipt', { success: false, message: 'Backpack is full.' });
            const brewType = sanitizeToken(data.brewType, '');
            const brewCosts = {
                STOUT: { gold: 25, item: 'stout', message: 'Crafted a stronger Combat Stout!' },
                IPA: { gold: 75, item: 'ipa', message: 'Crafted a Furious IPA!' },
                LAGER: { gold: 75, item: 'lager', message: 'Crafted a Swift Lager!' },
                RESERVE: { gold: 1000, item: 'reserve', message: 'Crafted a scarce Grandmaster Reserve!' },
                IRONWALL: { gold: 150, item: 'ironwall_porter', message: 'Crafted an Ironwall Porter!' },
                CLEARWATER: { gold: 150, item: 'clearwater_tonic', message: 'Crafted a Clearwater Tonic!' },
                STAUNCH: { gold: 250, item: 'staunching_bitter', message: 'Crafted a Staunching Bitter!' }
            };
            const cost = brewCosts[brewType];
            if (!cost) return;
            if (p.gold < cost.gold) return socket.emit('townReceipt', { success: false, message: 'Lacking gold for brew crafting.' });
            p.gold -= cost.gold;
            p.inventory.push(JSON.parse(JSON.stringify(ItemDatabase[cost.item])));
            socket.emit('townReceipt', { success: true, action: 'craftBrew', updatedPlayer: p, message: cost.message });
        }
        // 15. DRINK BREW IN TOWN
        else if (data.action === 'drinkBrew') {
            return socket.emit('townReceipt', { success: false, message: "Brews can only be consumed from the combat backpack." });
            let brewIndex = getArrayIndex(data.idx, p.inventory);
            if (brewIndex < 0) return;
            let item = p.inventory[brewIndex];
            if (!item || item.type !== 'brew') return;
            if (item.id === 'stout') {
                if (p.hp >= p.vitality) return socket.emit('townReceipt', { success: false, message: "\u274C Vitality already at max." });
                p.hp = Math.min(p.vitality, p.hp + Math.floor(p.vitality * 0.1));
                p.inventory.splice(brewIndex, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "\u{1F37A} Chugged a Stout! Restored 10% HP." });
            }
            else if (item.id === 'ipa') {
                p.activeCombatBuff = 'IPA'; p.inventory.splice(brewIndex, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "\u{1F37A} Drank Furious IPA! Damage boosted for next run." });
            }
            else if (item.id === 'lager') {
                p.activeCombatBuff = 'LAGER'; p.inventory.splice(brewIndex, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "\u{1F37A} Drank Swift Lager! Movement boosted for next run." });
            }
        }
        // 16. BACKPACK UPGRADES
        else if (data.action === 'upgradeBackpack') {
            let upg = p.backpackUpgrades || 0;
            let gCost = Math.floor(400 * Math.pow(1.2, upg));

            if (p.gold >= gCost) {
                p.gold -= gCost;
                p.maxInventorySlots = (p.maxInventorySlots || 5) + 1; p.backpackUpgrades = upg + 1;
                socket.emit('townReceipt', { success: true, action: 'upgradeBackpack', updatedPlayer: p, message: `Backpack capacity expanded to ${p.maxInventorySlots}!` });
            } else socket.emit('townReceipt', { success: false, message: 'Insufficient gold.' });
        }
// === REPLACED ===
        // 19. MINIGAME PAYOUT SECURE HANDLER
        else if (data.action === 'claimLumberMinigame') {
            const result = claimMinigameSession(p, 'lumber', sanitizeToken(data.sessionId, ''));
            if (!result.success) return socket.emit('townReceipt', { success: false, action: 'minigameWin', updatedPlayer: p, message: result.message });
            socket.emit('townReceipt', { success: true, action: 'minigameWin', updatedPlayer: p, message: `Timber Trial complete: +${result.points} Quartermaster points.` });
        }
        // 20. FISHING POND SECURE HANDLER
        else if (data.action === 'claimFishingMinigame') {
            const result = claimMinigameSession(p, 'fishing', sanitizeToken(data.sessionId, ''));
            if (!result.success) return socket.emit('townReceipt', { success: false, action: 'minigameWin', updatedPlayer: p, message: result.message });
            socket.emit('townReceipt', { success: true, action: 'minigameWin', updatedPlayer: p, message: `Fishing Trial complete: +${result.points} Quartermaster points.` });
        }
        // 21. HOPS HARVESTING SECURE HANDLER
        else if (data.action === 'claimHopsMinigame') {
            const result = claimMinigameSession(p, 'hops', sanitizeToken(data.sessionId, ''));
            if (!result.success) return socket.emit('townReceipt', { success: false, action: 'minigameWin', updatedPlayer: p, message: result.message });
            socket.emit('townReceipt', { success: true, action: 'minigameWin', updatedPlayer: p, message: `Hops Trial complete: +${result.points} Quartermaster points.` });
        }
// ============================================
        // 22. QUARTERMASTER POINT EXCHANGE
        else if (data.action === 'exchangePoints') {
            const type = sanitizeToken(data.type, '');
            const tier = sanitizeToken(data.tier, '');
            const crateCost = 2500;
            const crateTrades = {
                lumber: { pointsKey: 'lumberPoints', crateId: 'timber_crate', label: 'Timber Crate' },
                fish: { pointsKey: 'fishingPoints', crateId: 'angler_crate', label: 'Angler Crate' },
                hops: { pointsKey: 'hopsPoints', crateId: 'harvest_crate', label: 'Harvest Crate' }
            };
            const trade = crateTrades[type];

            if (tier !== 'gamble' || !trade) {
                return socket.emit('townReceipt', { success: false, action: 'trade', updatedPlayer: p, message: 'Only Quartermaster crate trades are available right now.' });
            }
            if (p.inventory.length >= (p.maxInventorySlots || 5)) {
                return socket.emit('townReceipt', { success: false, action: 'trade', updatedPlayer: p, message: 'Backpack is full.' });
            }
            if ((p[trade.pointsKey] || 0) < crateCost) {
                return socket.emit('townReceipt', { success: false, action: 'trade', updatedPlayer: p, message: `Need ${crateCost} Quartermaster points for a ${trade.label}.` });
            }

            const crateItem = cloneItem(trade.crateId);
            if (!crateItem) {
                return socket.emit('townReceipt', { success: false, action: 'trade', updatedPlayer: p, message: 'That crate is not available.' });
            }

            p[trade.pointsKey] = (p[trade.pointsKey] || 0) - crateCost;
            p.inventory.push(crateItem);
            socket.emit('townReceipt', { success: true, action: 'trade', updatedPlayer: p, message: `Quartermaster issued a ${trade.label}.` });
        }
// 23. UNBOX GAMBLE CRATES
        else if (data.action === 'openCrate') {
            const idx = getArrayIndex(data.index, p.inventory);
            const crateId = sanitizeToken(data.crateId, '');
            if (idx < 0 || !p.inventory[idx] || p.inventory[idx].id !== crateId || p.inventory[idx].type !== 'crate') {
                return socket.emit('crateOpened', { success: false, message: 'Invalid crate.' });
            }

            const drop = rollSecureCrateLoot(crateId);
            if (!drop || !ItemDatabase[drop.itemId]) {
                return socket.emit('crateOpened', { success: false, message: 'No eligible crate loot found.' });
            }

            const item = JSON.parse(JSON.stringify(ItemDatabase[drop.itemId]));
            p.inventory.splice(idx, 1, item);

            const rarity = drop.isJackpot ? 'JACKPOT' : (item.rarity || 'Common');
            const lootMessage = drop.isJackpot ? `JACKPOT! ${item.name}` : `Found ${item.name}.`;
            socket.emit('crateOpened', { success: true, updatedPlayer: p, item, itemId: item.id, rarity, lootMessage });
            socket.emit('townReceipt', { success: true, action: 'inventoryUpdate', updatedPlayer: p, message: lootMessage });
        }
        // === WITH ===
        // (Idle Job Assignment Removed)
    });
};

