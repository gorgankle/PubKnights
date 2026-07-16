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
    // 1. Hide the tooltip so it doesn't get stuck on screen
    if (typeof hideTooltip === 'function') hideTooltip();
    
    // 2. Grab the crate data directly from the player's backpack
    let crateItem = player.inventory[index];
    
    if (crateItem && crateItem.id === crateId) {
        // 3. Route it directly into your awesome CS:GO Roulette sequence!
        triggerUnboxing(index, crateItem);
    } else {
        logMessage("❌ You can only unbox crates from your active backpack.");
    }
}

function hireBrewmasterServices() { socket.emit('townAction', { action: 'craftBrew', brewType: 'STOUT' }); }

function craftSpecialtyBrew(brewType) { socket.emit('townAction', { action: 'craftBrew', brewType: brewType }); }

function hireTavernCompanion() {
    socket.emit('townAction', { action: 'hireCompanion', companionId: 'marlow_shieldhand' });
}

function setActiveCompanion(companionId) {
    socket.emit('townAction', { action: 'setActiveCompanion', companionId: companionId });
}

function benchCompanion(companionId) {
    socket.emit('townAction', { action: 'benchCompanion', companionId: companionId });
}
function hostHappyHour() {
    socket.emit('townAction', { action: 'happyHour' });
}
function tradeHopsForGear() { socket.emit('townAction', { action: 'blackMarket' }); }

function baitWildernessMap() {
    socket.emit('townAction', { action: 'baitWilds' });
}

function exportFishWholesale() {
    socket.emit('townAction', { action: 'exportFish' });
}

function chumForbiddenCellars() {
    socket.emit('townAction', { action: 'chumCellars' });
}

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

// === GILDED TAVERN AUTOMATION ===
// Function 1: Purchasing the Gilded Tavern
function purchaseGildedTavern() {
    socket.emit('townAction', { action: 'purchaseGildedTavern' });
}

// === TRADE ROUTES & MONUMENT UPGRADES ===

function buyTradeRoutes() {
    socket.emit('townAction', { action: 'buyTradeRoutes' });
}

function sellFishBulk() {
    if (!player.tradeRoutesExpanded) return; // Basic UI failsafe
    socket.emit('townAction', { action: 'sellFishBulk' });
}

function purchaseMonument() {
    socket.emit('townAction', { action: 'purchaseMonument' });
}

// === QUARTERMASTER EXCHANGE LOGIC ===
function exchangePoints(type, tier) {
    if (gameState === 'COMBAT') {
        logMessage("❌ You cannot trade with the Quartermaster while in combat!");
        return;
    }
    
    // Play a nice click sound
    if (typeof playRetroSound === 'function') playRetroSound('click');
    
    // Send the request directly to the secure server logic
    socket.emit('townAction', { 
        action: 'exchangePoints', 
        exchangeType: type, 
        tier: tier 
    });
}
// === ROULETTE UNBOXING SEQUENCE ===
function triggerUnboxing(inventoryIndex, crateItem) {
    if (gameState === 'COMBAT') {
        logMessage("❌ You cannot open crates while in combat!");
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
                        <div style="font-size: 36px; margin-bottom: 4px;">✨</div>
                        <div style="font-size: 10px; color: #fff; text-align: center; padding: 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${data.rarity}</div>
                    </div>`;
            } else {
                let rCol = fillerColors[Math.floor(Math.random() * fillerColors.length)];
                html += `
                    <div style="width: 100px; height: 100%; margin-right: 10px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #1a1a1a; border-bottom: 6px solid ${rCol}; border-radius: 4px; opacity: 0.7;">
                        <div style="font-size: 28px; opacity: 0.5;">❓</div>
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
    document.getElementById('unboxing-rarity-text').innerText = data.rarity === 'JACKPOT' ? '🌟 JACKPOT! 🌟' : 'Loot Acquired!';
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
    if (gameState === 'COMBAT') {
        logMessage("❌ You cannot trade with the Quartermaster while in combat!");
        return;
    }
    
    // Play a nice click sound
    if (typeof playRetroSound === 'function') playRetroSound('click');
    
    // Send the request directly to the secure server logic
    socket.emit('townAction', { 
        action: 'exchangePoints', 
        exchangeType: type, 
        tier: tier 
    });
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
