// --- LOGIC: TOWN ECONOMY & ACTIONS ---

function allocateStat(statKey) { socket.emit('townAction', { action: 'allocateStat', statKey: statKey }); }

// === NEW: STAT RESET FUNCTION ===
function resetStats() {
    socket.emit('townAction', { action: 'resetStats' });
}

function craftKegBomb() { logMessage('Keg bombs have been retired. Ranged and AOE tactics now come from weapons.'); }

function upgradeBackpackCapacity() { socket.emit('townAction', { action: 'upgradeBackpack' }); }

function upgradeVaultCapacity() {
    socket.emit('townAction', { action: 'upgradeVault' });
}


// Brews are combat actions only.
function drinkBrewFromInventory(idx) {
    logMessage("Brews can only be consumed from the combat backpack.");
    if (typeof playRetroSound === 'function') playRetroSound('error');
}

// === CRATE UNBOXING LOGIC ===
function openCrate(index, crateId) {
    const crateItem = player && player.inventory ? player.inventory[index] : null;
    if (!crateItem || crateItem.id !== crateId) {
        logMessage('Crate not found.');
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }
    triggerUnboxing(index, crateItem);
}

function hireBrewmasterServices() { socket.emit('townAction', { action: 'craftBrew', brewType: 'STOUT' }); }

function craftSpecialtyBrew(brewType) { socket.emit('townAction', { action: 'craftBrew', brewType: brewType }); }

window.selectedCompanionInstanceId = window.selectedCompanionInstanceId || null;

function hireTavernCompanion() {
    const nameInput = document.getElementById('mercenary-name-input');
    const companionName = nameInput ? nameInput.value.trim() : '';
    socket.emit('townAction', { action: 'hireCompanion', templateId: 'starter_mercenary', companionName: companionName });
}

function setActiveCompanion(instanceId) {
    socket.emit('townAction', { action: 'setActiveCompanion', instanceId: instanceId });
}

function benchCompanion(instanceId) {
    socket.emit('townAction', { action: 'benchCompanion', instanceId: instanceId });
}

function selectCompanionEquipment(instanceId) {
    window.selectedCompanionInstanceId = instanceId;
    if (typeof refreshSystemUI === 'function') refreshSystemUI();
}

function equipCompanionItem(instanceId, inventoryIndex) {
    hideTooltip();
    socket.emit('inventoryAction', { action: 'equipCompanion', instanceId: instanceId, index: inventoryIndex });
}

function unequipCompanionItem(instanceId, slotKey) {
    hideTooltip();
    socket.emit('inventoryAction', { action: 'unequipCompanion', instanceId: instanceId, slotKey: slotKey });
}
function hostHappyHour() {
    logMessage('Happy Hour has been retired from this alpha branch.');
}
function tradeHopsForGear() { logMessage('Black market trading has been removed.'); if (typeof playRetroSound === 'function') playRetroSound('error'); }

function baitWildernessMap() { logMessage('Wilds baiting has been retired for now.'); if (typeof playRetroSound === 'function') playRetroSound('error'); }

function exportFishWholesale() { logMessage('Fish exports have been retired in the gold economy.'); }

function chumForbiddenCellars() { logMessage('Cellar chumming has been retired for now.'); if (typeof playRetroSound === 'function') playRetroSound('error'); }

function hireWorker() { logMessage('Worker systems have been removed from this alpha branch.'); }
function upgradeCabin() { logMessage('Worker systems have been removed from this alpha branch.'); }
function adjustWorker(type, delta) { logMessage('Worker systems have been removed from this alpha branch.'); }
function upgradeCartCapacity() { logMessage('Supply cart upgrades have been removed.'); }
function claimSupplyCart(isAuto = false) { logMessage('Supply cart claiming has been removed.'); }

function changeZoneLevel(zone, dir) {
    if (zone === 'WILDERNESS') {
        if (!player.selectedWildernessLevel) player.selectedWildernessLevel = player.wildernessLevel;
        player.selectedWildernessLevel = Math.max(1, Math.min(player.wildernessLevel, player.selectedWildernessLevel + dir));
    } else if (zone === 'CELLARS') {
        if (!player.cellarsUnlocked) return;
        if (!player.selectedCellarLevel) player.selectedCellarLevel = player.cellarLevel;
        player.selectedCellarLevel = Math.max(1, Math.min(player.cellarLevel, player.selectedCellarLevel + dir));
    }
    if (typeof playRetroSound === 'function') playRetroSound('menu');
    refreshSystemUI();
}


// === NEW: GRANDMASTER RESERVE CRAFTING ===
function craftReserveBrew() { socket.emit('townAction', { action: 'craftBrew', brewType: 'RESERVE' }); }

// === RETIRED TOWN UPGRADE ACTIONS ===
function purchaseGildedTavern() { logMessage('Town prestige upgrades have been removed from this alpha branch.'); }
function buyTradeRoutes() { logMessage('Trade route upgrades have been removed.'); }
function purchaseMonument() { logMessage('The Golden Monument upgrade has been retired for this alpha branch.'); }

function sellFishBulk() { logMessage('Bulk fish exports have been retired in the gold economy.'); }

// === QUARTERMASTER EXCHANGE LOGIC ===
function exchangePoints(type, tier) {
    if (tier !== 'gamble') {
        logMessage('Only Quartermaster crate trades are available right now.');
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }
    socket.emit('townAction', { action: 'exchangePoints', type: type, tier: tier });
}
// === ROULETTE UNBOXING SEQUENCE ===
function triggerUnboxing(inventoryIndex, crateItem) {
    if (gameState === 'COMBAT') {
        logMessage("\u274C You cannot open crates while in combat!");
        return;
    }

    const overlay = document.getElementById('unboxing-overlay');
    const track = document.getElementById('roulette-track');
    const lootReveal = document.getElementById('unboxing-loot-reveal');
    const title = document.getElementById('unboxing-title');

    // 1. Reset UI State
    overlay.style.display = 'flex';
    lootReveal.style.display = 'none';
    track.style.transition = 'none';      
    track.style.transform = 'translateX(0px)';
    track.innerHTML = '';                 
    title.innerText = `Unlocking ${crateItem.name}...`;
    
    // Clear any lingering double-click listeners
    overlay.ondblclick = null;

    if (typeof playRetroSound === 'function') playRetroSound('step');

    // 2. Tell the server to consume the crate and roll the loot
    socket.emit('townAction', { action: 'openCrate', index: inventoryIndex, crateId: crateItem.id });

    // 3. Wait for the server to reply with the winning item
    socket.once('crateOpened', (data) => {
        if (!data.success) {
            closeUnboxing();
            return;
        }

        // --- BUILD THE ROULETTE TRACK ---
        const totalItems = 45;       
        const winningIndex = 40;     
        const itemWidth = 110;       
        let html = '';

        const fillerColors = ['#bdc3c7', '#3498db', '#9b59b6', '#2ecc71'];

        for (let i = 0; i < totalItems; i++) {
            if (i === winningIndex) {
                let borderCol = data.rarity === 'JACKPOT' ? '#f1c40f' : (data.rarity === 'Rare' ? '#9b59b6' : '#2ecc71');
                html += `
                    <div style="width: 100px; height: 100%; margin-right: 10px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #2c3e50; border-bottom: 6px solid ${borderCol}; border-radius: 4px;">
                        <div style="font-size: 36px; margin-bottom: 4px;">\u2728</div>
                        <div style="font-size: 10px; color: #fff; text-align: center; padding: 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${data.rarity}</div>
                    </div>`;
            } else {
                let rCol = fillerColors[Math.floor(Math.random() * fillerColors.length)];
                html += `
                    <div style="width: 100px; height: 100%; margin-right: 10px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #1a1a1a; border-bottom: 6px solid ${rCol}; border-radius: 4px; opacity: 0.7;">
                        <div style="font-size: 28px; opacity: 0.5;">\u2753</div>
                    </div>`;
            }
        }
        track.innerHTML = html;

        // --- CALCULATE THE SLIDE MATH ---
        void track.offsetWidth; 

        const windowWidth = document.getElementById('roulette-window').offsetWidth;
        const centerPoint = windowWidth / 2;
        let randomOffset = Math.floor(Math.random() * 70) - 35; 
        let finalPosition = (winningIndex * itemWidth) + (itemWidth / 2) - centerPoint + randomOffset;

        // --- TRIGGER THE ANIMATION (WITH SKIP TRACKERS) ---
        let spinTimer = setTimeout(() => {
            track.style.transition = 'transform 4.5s cubic-bezier(0.1, 0.9, 0.15, 1)';
            track.style.transform = `translateX(-${finalPosition}px)`;
        }, 50);

        let revealTimer = setTimeout(() => {
            finishUnboxing(data);
        }, 4700); 

        // --- THE DOUBLE-CLICK SKIP LOGIC ---
        overlay.ondblclick = () => {
            // 1. Cancel the planned timers
            clearTimeout(spinTimer);
            clearTimeout(revealTimer);
            
            // 2. Instantly snap the visual track to the winning item
            track.style.transition = 'none';
            track.style.transform = `translateX(-${finalPosition}px)`;
            
            // 3. Reveal the loot immediately
            finishUnboxing(data);
            
            // 4. Remove the listener so it doesn't fire again while reading the results
            overlay.ondblclick = null;
        };
    });
}

// Extracted the reveal logic into a helper function so both the timer and the skip-click can use it
function finishUnboxing(data) {
    if (typeof playRetroSound === 'function') playRetroSound('victory');
    
    document.getElementById('unboxing-title').innerText = "Seal Broken!";
    document.getElementById('unboxing-rarity-text').innerText = data.rarity === 'JACKPOT' ? '\u{1F31F} JACKPOT! \u{1F31F}' : 'Loot Acquired!';
    document.getElementById('unboxing-rarity-text').style.color = data.rarity === 'JACKPOT' ? '#f1c40f' : '#2ecc71';
    document.getElementById('unboxing-loot-desc').innerText = data.lootMessage;
    
    document.getElementById('unboxing-loot-reveal').style.display = 'block';
    
    // Re-render the UI so the new item actually shows up in the inventory grid
    if (typeof refreshSystemUI === 'function') refreshSystemUI();
}

function closeUnboxing() {
    const overlay = document.getElementById('unboxing-overlay');
    overlay.style.display = 'none';
    overlay.ondblclick = null; // Clean up the listener
}



// === PET PROGRESSION SYSTEM ===
function trainPet() {
    // Basic client-side check just to prevent spamming the button
    if (!player.pet || !player.pet.adopted) return;
    
    // Ask the server to process the transaction securely
    socket.emit('townAction', { action: 'trainPet' });
}

// === QUARTERMASTER EXCHANGE LOGIC ===
function exchangePoints(type, tier) {
    if (tier !== 'gamble') {
        logMessage('Only Quartermaster crate trades are available right now.');
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }
    socket.emit('townAction', { action: 'exchangePoints', type: type, tier: tier });
}

// --- RENAISSANCE CORNER BRIDGE ---

function openStudioTool(toolUrl) {
    // Load the tool into the iframe
    document.getElementById('studio-iframe').src = toolUrl;
    // Tell the game to switch to the studio view
    setGameState('STUDIO'); 
}

// Listen for messages from the tools inside the iframe
window.addEventListener('message', (event) => {
    // When a tool says "RETURN_TO_TOWN"
    if (event.data === 'RETURN_TO_TOWN') {
        // Clear the iframe source so audio stops playing and canvas stops rendering
        document.getElementById('studio-iframe').src = ""; 
        // Send the player back to the Town menu
        setGameState('TOWN');
    }
});

