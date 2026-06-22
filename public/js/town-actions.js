// --- LOGIC: TOWN ECONOMY & ACTIONS ---

function allocateStat(statKey) { socket.emit('townAction', { action: 'allocateStat', statKey: statKey }); }

// === NEW: STAT RESET FUNCTION ===
function resetStats() {
    socket.emit('townAction', { action: 'resetStats' });
}

function craftKegBomb(tier) { socket.emit('townAction', { action: 'craftBomb', tier: tier }); }

function upgradeBackpackCapacity() { socket.emit('townAction', { action: 'upgradeBackpack' }); }

function upgradeVaultCapacity() {
    socket.emit('townAction', { action: 'upgradeVault' });
}

function setIdleJob(jobType) { 
    player.idleJob = jobType; 
    if (typeof playRetroSound === 'function') playRetroSound('menu');
    
    // NEW: Tell the server about the job change immediately!
    if (typeof saveGame === 'function') saveGame(); 
    
    refreshSystemUI(); 
}

// === NEW: ITEM-BASED CONSUMPTION IN TOWN ===
function drinkBrewFromInventory(idx) { socket.emit('townAction', { action: 'drinkBrew', idx: idx }); }

function hireBrewmasterServices() { socket.emit('townAction', { action: 'craftBrew', brewType: 'STOUT' }); }

function craftSpecialtyBrew(brewType) { socket.emit('townAction', { action: 'craftBrew', brewType: brewType }); }

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

function hireWorker(type) {
    socket.emit('townAction', { action: 'hireWorker', type: type });
}

function upgradeCartCapacity() { socket.emit('townAction', { action: 'upgradeCart' }); }

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

function claimSupplyCart(isAuto = false) {
    socket.emit('townAction', { action: 'claimCart', isAuto: isAuto });
}

// === NEW: GRANDMASTER RESERVE CRAFTING ===
function craftReserveBrew() { socket.emit('townAction', { action: 'craftBrew', brewType: 'RESERVE' }); }

// === GILDED TAVERN AUTOMATION ===
// Function 1: Purchasing the Gilded Tavern
function purchaseGildedTavern() {
    socket.emit('townAction', { action: 'purchaseGildedTavern' });
}

// Function 2: Toggling Auto-Claim On/Off
function toggleAutoClaim(isEnabled) {
    player.autoClaimEnabled = isEnabled;
    if (isEnabled) {
        logMessage("⚙️ Supply Cart Automation: ACTIVE. Reserves will be pulled automatically.");
    } else {
        logMessage("⚙️ Supply Cart Automation: SUSPENDED.");
    }
    saveGame();
}

// Function 3: The Auto-Claim Logic
function runAutoClaimCheck() {
    if (player && player.gildedTavernUnlocked && player.autoClaimEnabled) {
        // Calculate the total items currently sitting in the cart
        let totalCart = player.supplyCart.wood + player.supplyCart.fish + (player.supplyCart.hops || 0);
        
        // If the cart is full (or within 5 items of hitting the max capacity), claim it!
        if (totalCart >= (player.supplyCart.max - 5)) {
            if (typeof claimSupplyCart === 'function') {
                claimSupplyCart(true); // <--- We pass TRUE here so the server knows it was automatic
            }
        }
    }
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

// === PET PROGRESSION SYSTEM ===
function trainPet() {
    // Basic client-side check just to prevent spamming the button
    if (!player.pet || !player.pet.adopted) return;
    
    // Ask the server to process the transaction securely
    socket.emit('townAction', { action: 'trainPet' });
}