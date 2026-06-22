// --- CORE GAME ENGINE & GLOBALS ---

// Establish secure connection to the Node server
const socket = io('https://pubknights.onrender.com');

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// === SERVER-AUTHORITATIVE SYNC ===

socket.on('serverTick', (serverData) => {
    // Failsafe: Ignore background ticks if the player hasn't logged in yet
    if (document.getElementById('main-game-container').style.display !== 'flex') return;

    // Only accept personal idle job resources if we are physically in the Town
    if (gameState === 'TOWN' || gameState === 'VAULT') {
        player.hp = serverData.hp;
        player.wood = serverData.wood;
        player.fish = serverData.fish;
        player.hops = serverData.hops;
    }

    // Workers ALWAYS gather, regardless of what map the player is on
    player.supplyCart = serverData.supplyCart;
    player.happyHourTicks = serverData.happyHourTicks;

    // Re-trigger the gilded tavern auto-claim logic
    if (typeof runAutoClaimCheck === 'function') runAutoClaimCheck();

    refreshSystemUI();
    updateTownUI(serverData);   // <--- USE serverData HERE
});

socket.on('combatResult', (result) => {
    if (gameState !== 'COMBAT') return;

    // Sync the server's authoritative stamina deduction/recovery
    player.stamina = result.newStamina;

// Catch Server Rejections!
    if (result.type === 'error') {
        logMessage(result.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        
        // CRITICAL FIX: Unlock the UI so the player can click "Pass Turn" instead!
        if (typeof combatPhase !== 'undefined') combatPhase = 'ACTION'; 
        
        refreshSystemUI();
        return; 
    }

    // Catch the "Pass Turn" response!
    if (result.type === 'pass') {
        logMessage(`💨 Passed phase. Restored ${result.recovered} Stamina.`);
        advancePhase();
        return;
    }

    // Failsafe: Ignore hit/miss logs if target was cleared
    if (!selectedEnemy) return; 

    if (result.type === 'miss') {
        logMessage(`💨 Strike MISSED! Target evaded (${result.hitChance}% Hit Chance).`); 
        if (typeof playRetroSound === 'function') playRetroSound('error'); 
        if (typeof spawnHitMarker === 'function') spawnHitMarker(selectedEnemy.x, selectedEnemy.y, "-0", "#3498db"); 
    } 
    else if (result.type === 'hit') {
selectedEnemy.hp -= result.damage;
        
        // Tell the browser the monster is officially dead so the UI updates
        if (selectedEnemy.hp <= 0) {
            selectedEnemy.hp = 0;
            selectedEnemy.alive = false;
        }
        
        if (result.isCrit) {
            if (typeof playRetroSound === 'function') playRetroSound('playerCrit');
            logMessage(`💥 CRITICAL STRIKE! Executed ${result.actionType.toUpperCase()} onto ${selectedEnemy.name} for ${result.damage} DMG!`);
            if (typeof spawnHitMarker === 'function') spawnHitMarker(selectedEnemy.x, selectedEnemy.y, `-${result.damage}!`, "#f1c40f");
        } else {
            if (typeof playRetroSound === 'function') playRetroSound(result.actionType === 'special' ? 'heavyAttack' : 'attack');
            logMessage(`⚔️ Executed ${result.actionType.toUpperCase()} strike onto ${selectedEnemy.name} for ${result.damage} DMG!`);
            if (typeof spawnHitMarker === 'function') spawnHitMarker(selectedEnemy.x, selectedEnemy.y, `-${result.damage}`, "#e74c3c");
        }


        if (selectedEnemy && !selectedEnemy.alive) selectedEnemy = null;
        
// --- SECURE VICTORY HANDLER ---
        if (enemies.every(e => !e.alive)) {
            logMessage("🏆 VICTORY Conditions verified.");
            if (typeof playRetroSound === 'function') playRetroSound('victory');
            setTimeout(showLootScreen, 1200); 
            return; 
        }
    }
    
    // Server successfully applied damage, now we can advance the turn
    advancePhase();
});

// === SERVER-AUTHORITATIVE BOMB RESULT ===
socket.on('bombResult', (result) => {
    if (gameState !== 'COMBAT') return;

    // NEW: Sync the inventory securely with the server's master copy!
    if (result.updatedPlayer) {
        Object.assign(player, result.updatedPlayer);
        if (typeof saveGame === 'function') saveGame();
        refreshSystemUI();
    }

    logMessage(`💥 Threw ${result.bombName} at coordinates [${result.tx}, ${result.ty}]!`);
    
    if (typeof triggerBombAnimation === 'function') triggerBombAnimation();

    let spriteToThrow = result.bombId === "bomb_heavy" ? "icon_bomb_heavy" : "icon_bomb_small";

    if (typeof spawnProjectile === 'function') {
        // FIX: Changed visualX/visualY to player.x/player.y to prevent the silent crash!
        spawnProjectile(player.x, player.y, result.tx, result.ty, spriteToThrow, 30, () => {
            
            if (typeof playRetroSound === 'function') playRetroSound('explosion'); 
            if (typeof spawnExplosion === 'function') spawnExplosion(result.tx, result.ty, result.aoe + 1.25);

            let hitCount = 0;
            enemies.forEach(e => {
                if (!e.alive) return;
                
                let sSize = e.size || 1;
                let blastLeft = result.tx - result.aoe; let blastRight = result.tx + result.aoe;
                let blastTop = result.ty - result.aoe; let blastBottom = result.ty + result.aoe;
                let enemyLeft = e.x; let enemyRight = e.x + sSize - 1;
                let enemyTop = e.y; let enemyBottom = e.y + sSize - 1;
                
                let overlaps = !(blastRight < enemyLeft || blastLeft > enemyRight || blastBottom < enemyTop || blastTop > enemyBottom);
                
                if (overlaps) {
					e.hp -= result.damage; 
                    
                    // Tell the browser the monster caught in the blast is dead
                    if (e.hp <= 0) {
                        e.hp = 0;
                        e.alive = false;
                    }
                    hitCount++;
                    
                    logMessage(`🔥 ${e.name} caught in blast for ${result.damage} DMG!`);
                    if (typeof spawnHitMarker === 'function') spawnHitMarker(e.x, e.y, `-${result.damage}`, "#e74c3c");
                }
            });

            if (hitCount === 0) logMessage("💨 Blast hit nothing.");
            


            // Keep this to clear the UI target!
            if (selectedEnemy && !selectedEnemy.alive) selectedEnemy = null;
            
// --- SECURE VICTORY HANDLER ---
            if (enemies.every(e => !e.alive)) {
                logMessage("🏆 VICTORY Conditions verified.");
                if (typeof playRetroSound === 'function') playRetroSound('victory');
                setTimeout(showLootScreen, 1200); 
                return; 
            }
            
            advancePhase();
        });
    }
});

// === SERVER-AUTHORITATIVE COMBAT ITEM RECEIPT ===
socket.on('combatItemReceipt', (receipt) => {
    if (!receipt.success) {
        logMessage(receipt.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }

    if (receipt.updatedPlayer) Object.assign(player, receipt.updatedPlayer); // Magic bullet sync!
    
    logMessage(receipt.message);
    if (receipt.message.includes("gear")) {
        if (typeof playRetroSound === 'function') playRetroSound('equip');
    } else {
        if (typeof playRetroSound === 'function') playRetroSound('chug');
    }
    
    if (typeof saveGame === 'function') saveGame();
    advancePhase(); // Advance the turn securely
});

// === SERVER-AUTHORITATIVE MOVEMENT RECEIPT ===
socket.on('moveReceipt', (receipt) => {
    if (!receipt.success) {
        logMessage(receipt.message);
        player.x = receipt.x;
        player.y = receipt.y;
        if (typeof playRetroSound === 'function') playRetroSound('error');
        refreshSystemUI();
    } else {
        // Successfully moved! Keep client stamina perfectly in sync with the server
        if (receipt.updatedPlayer) {
            player.stamina = receipt.updatedPlayer.stamina;
            refreshSystemUI();
        }
    }
});

// === SERVER-AUTHORITATIVE ECONOMY RECEIPT ===
socket.on('townReceipt', (receipt) => {
    // If the server rejected the action
    if (!receipt.success) {
        logMessage(receipt.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }

    // Instantly overwrite our local variables with the server's master copy!
    if (receipt.updatedPlayer) {
        Object.assign(player, receipt.updatedPlayer);
    }

    // Play the correct sound effect based on what we just bought/did
    if (receipt.action === 'gildedTavern' || receipt.action === 'tradeRoutes' || receipt.action === 'monument') {
        if (typeof playRetroSound === 'function') playRetroSound('victory');
    } else if (receipt.action === 'trainPet' || receipt.action === 'resetStats' || receipt.action === 'allocateStat') {
        if (typeof playRetroSound === 'function') playRetroSound('statUp');
	} else if (receipt.action === 'claimCart') {
        // Only play the sound if the player manually clicked the button
        if (!receipt.isAuto && typeof playRetroSound === 'function') playRetroSound('claim');
    } else if (receipt.action === 'baitWilds' || receipt.action === 'chumCellars') {
        if (typeof playRetroSound === 'function') playRetroSound('splat');
    } else if (receipt.action === 'drinkBrew') {
        if (typeof playRetroSound === 'function') playRetroSound('chug');
    } else {
        if (typeof playRetroSound === 'function') playRetroSound('coin');
    }

    logMessage(receipt.message);
    if (typeof saveGame === 'function') saveGame(); 
    refreshSystemUI(); 
});

// === SERVER-AUTHORITATIVE INVENTORY RECEIPT ===
socket.on('inventoryReceipt', (receipt) => {
    // If the server rejected the action (e.g. bag full)
    if (!receipt.success) {
        if (receipt.message) logMessage(receipt.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }

    if (receipt.updatedPlayer) {
        Object.assign(player, receipt.updatedPlayer);
    }

    // UPDATED: Added 'takeLoot' to the coin sound triggers
    if (receipt.action === 'equip' || receipt.action === 'unequip' || receipt.action === 'deposit' || receipt.action === 'withdraw') {
        if (typeof playRetroSound === 'function') playRetroSound('equip');
    } else if (receipt.action === 'sell' || receipt.action === 'takeLoot') {
        if (typeof playRetroSound === 'function') playRetroSound('coin');
        
        // === THE FIX: VISUALLY CLEAR THE ITEM FROM THE LOOT SCREEN ===
        pendingLoot.length = 0; // Wipe the old visual list
        if (player.pendingLoot) pendingLoot.push(...player.pendingLoot); // Sync with the server's truth
        if (typeof refreshLootUI === 'function') refreshLootUI(); // Force the window to redraw!
    }

    if (receipt.message) logMessage(receipt.message);
    
    // Save to DB and re-render the visual UI grids
    if (typeof saveGame === 'function') saveGame(); 
    refreshSystemUI(); 
});

// === SERVER-AUTHORITATIVE ESCROW CATCHERS ===
socket.on('killConfirmed', (data) => {
    // We only update these variables so the visual UI bar can animate!
    // The server holds the real secured values in its escrow.
    player.pendingGold = (player.pendingGold || 0) + data.gold;
    player.pendingXp = (player.pendingXp || 0) + data.xp;
    
    if (data.xp > 0) logMessage(`💀 Terminated entity: ${data.enemyName} (Stored ${data.xp} XP)`);

if (data.item) {
        pendingLoot.push(data.item); // For the visual UI
        
        // === THE FIX: STORE IT IN THE PLAYER'S LOCAL MEMORY TOO ===
        player.pendingLoot = player.pendingLoot || [];
        player.pendingLoot.push(data.item);

        if (data.isPet) logMessage(`🐾 ${player.pet.name} joyfully dug up a hidden treasure!`);
        else logMessage(`🎁 SECURED LOOT: ${data.item.name} [${data.item.rarity}]`);
    }

    if (document.getElementById("loot-screen").style.display === "block") {
        if (typeof refreshLootUI === 'function') refreshLootUI();
    }
});

socket.on('combatRewardsReceipt', (receipt) => {
    if (receipt.updatedPlayer) {
        let oldLevel = player.level;
        Object.assign(player, receipt.updatedPlayer); // Magic bullet sync!
        
        if (player.level > oldLevel) {
            if (typeof playRetroSound === 'function') playRetroSound('heavyAttack'); 
            logMessage(`🎉 LEVEL UP! The Guild has verified you are now Level ${player.level}.`);
        }
        
        // === NEW: Safely transition to town now that the server gave us our new map levels! ===
        transitionToTown(); 
    }
});

// === SERVER-AUTHORITATIVE MAP DEPLOYMENT ===
socket.on('combatDeployed', (serverCombatState) => {
    reachableTiles = null;
    hideTooltip();
    
    // Sync browser state to the Server's command
    player.idleJob = 'NONE';
    gameState = 'COMBAT'; 
    currentTurn = serverCombatState.turn; 
    combatPhase = serverCombatState.phase;
    activeCombatZone = serverCombatState.zone; 
    pendingMove = null;
    player.pendingXp = 0;
    
    // Load the physical grid variables
    currentGridSize = serverCombatState.gridSize;
    currentTileSize = serverCombatState.tileSize;
    player.x = serverCombatState.player.x;
    player.y = serverCombatState.player.y;
    enemies = serverCombatState.enemies;
    mapObstacles = serverCombatState.obstacles;
    selectedEnemy = null;
    
    if (typeof playRetroSound === 'function') playRetroSound('combatStart');
    
    // Display context messages based on zone
    if (activeCombatZone === 'GORILLA_ARENA') logMessage("🚨 GORILLA PIT INITIALIZED. Challenge parameters deployed.");
    else if (activeCombatZone === 'ABYSS') logMessage(`🌌 Descended to Abyss Depth ${player.abyssDepth || 1}. The pressure is crushing.`);
    else if (activeCombatZone === 'CELLARS' && (player.selectedCellarLevel || player.cellarLevel) === 20) logMessage("⚠️ THE FLOOR TREMBLES! An ancient, corrupted mega-cask awakens from its slumber!");
    else if (activeCombatZone === 'CELLARS' && player.cellarsChummed) logMessage("⚠️ SEAFOOD CODES LOADED: 5 Mimics burst out of the structural drain layers!");
    else if (activeCombatZone === 'WILDERNESS' && player.mapBaited && (player.selectedWildernessLevel || player.wildernessLevel) === 20) logMessage("⚠️ THE BOSS SMELLS THE FISH BAIT! CRITICAL COMBAT PARAMETERS ENGAGED.");
    
    // Force the browser to draw the server's map
    refreshSystemUI(); 
    drawGrid();
    window.scrollTo(0, 0);
});

// === SERVER-AUTHORITATIVE AI CATCHER (THE MOVIE PLAYER) ===
socket.on('enemyTurnReceipt', (receipt) => {
    // 1. Accept only the player's math instantly (so death checks work)
    if (receipt.updatedPlayer) Object.assign(player, receipt.updatedPlayer);

    let events = receipt.events || [];
    
    // === NEW: DYNAMIC FAST-FORWARD MATH ===
    // If there are hundreds of events (Gorilla Pit), compress the time!
    let eventCount = events.length;
    let timeCompression = 1.0; 
    
    // If there are more than 15 events, start speeding up the playback
    if (eventCount > 15) {
        // Caps the maximum speed at 15% of normal time (roughly 15ms per move)
        timeCompression = Math.max(0.15, 15 / eventCount); 
    }

    let delay = 0; // The playback timer!

    // 2. Play the events sequentially on the screen
    events.forEach(ev => {
        setTimeout(() => {
            if (ev.type === 'move') {
                let e = ev.uid ? enemies.find(en => en.uid === ev.uid) : enemies.find(en => en.name === ev.name);
                if (e) { e.x = ev.finalX; e.y = ev.finalY; }
            } 
            else if (ev.type === 'crush') {
                if (typeof playRetroSound === 'function') playRetroSound('heavyAttack');
                logMessage(`💥 The massive ${ev.enemyName} crushes an obstacle in its path!`);
            }
            else if (ev.type === 'deflect') {
                logMessage(`🛡️ Deflected attack from ${ev.enemyName}!`);
                if (typeof spawnHitMarker === 'function') spawnHitMarker(player.x, player.y, "-0", "#3498db");
                if (typeof playRetroSound === 'function') playRetroSound('deflect');
            }
            else if (ev.type === 'hit') {
                let executeHit = () => {
                    if (ev.isCrit) {
                        logMessage(`💥 CRITICAL STRIKE! ${ev.enemyName} hits you for ${ev.damage} DMG!${ev.isPoacher ? " (Deflected)" : ""}`);
                        if (typeof spawnHitMarker === 'function') spawnHitMarker(player.x, player.y, `-${ev.damage}!`, "#9b59b6");
                        if (typeof playRetroSound === 'function') playRetroSound('enemyCrit');
                    } else {
                        logMessage(`⚔️ ${ev.enemyName} hits you for ${ev.damage} DMG.${ev.isPoacher ? " (Deflected)" : ""}`);
                        if (typeof spawnHitMarker === 'function') spawnHitMarker(player.x, player.y, `-${ev.damage}`, "#e74c3c");
                        if (typeof playRetroSound === 'function') playRetroSound('playerHit');
                    }
                };

                if (ev.isPoacher && typeof spawnProjectile === 'function') {
                    spawnProjectile(ev.ex, ev.ey, player.x, player.y, 'icon_arrow', 20, executeHit, true);
                } else {
                    let visualEnemy = ev.uid ? enemies.find(en => en.uid === ev.uid) : enemies.find(en => en.name === ev.enemyName);
                    if (visualEnemy && typeof triggerEnemyAttackAnimation === 'function') triggerEnemyAttackAnimation(visualEnemy);
                    executeHit(); 
                }
            }
            else if (ev.type === 'steal') {
                logMessage(`🍺 The Mimic intercepts your gear inventory and chugs one of your Stouts!`);
            }
            else if (ev.type === 'death') {
                logMessage("💀 casualty verified. Transporting to safety structures.");
                if (typeof playRetroSound === 'function') playRetroSound('death');
                setTimeout(transitionToTown, 1500); 
            }
            refreshSystemUI();
        }, delay);

        // === NEW: MULTIPLY THE DELAY BY OUR TIME COMPRESSION ===
        if (ev.type === 'move') delay += (100 * timeCompression);
        else if (ev.type === 'hit' || ev.type === 'deflect') delay += (350 * timeCompression);
        else delay += (50 * timeCompression);
    });

    // 3. Finally, hand control back to the player!
    setTimeout(() => {
        // We only overwrite the grid with the server's truth AFTER the movie finishes playing!
        if (receipt.updatedCombatState) {
            enemies = receipt.updatedCombatState.enemies;
            mapObstacles = receipt.updatedCombatState.obstacles;
        }

        if (player.hp > 0) {
            reachableTiles = null;
            currentTurn = 'PLAYER'; 
            combatPhase = 'PHASE_1'; 
            if (typeof saveGame === 'function') saveGame();
            refreshSystemUI();
        }
    }, delay + 200);
});


// Global Game States
let currentGridSize = 8; 
let currentTileSize = 60; 
let gameState = 'KNIGHT'; 
let currentTurn = 'PLAYER';
let combatPhase = 'MOVE'; 
let activeCombatZone = 'WILDERNESS'; 

// Target Tracking
let pendingMove = null;
let selectedEnemy = null;

function logMessage(msg) {
    const logDiv = document.getElementById("log");
    if (logDiv) {
        logDiv.innerHTML += "<br>" + msg;
        logDiv.scrollTop = logDiv.scrollHeight;
    }
}

function setGameState(state) {
    hideTooltip();
    
    // Remember where we just came from
    let previousState = gameState; 
    
    gameState = state;
    
    // Play the door sound when shifting to a non-combat environment
    if (state === 'VAULT' || state === 'TOWN' || state === 'MERCHANT' || state === 'ADVENTURES') {
        if (typeof playRetroSound === 'function') playRetroSound('door');
    }
    
    refreshSystemUI();

    // NEW: Only auto-scroll for major screen changes, ignoring right-column tab swaps
    if (state === 'VAULT' || previousState === 'VAULT') {
        window.scrollTo(0, 0);
    }
}

// Top-Level Keyboard Inputs
window.addEventListener("keydown", function(e) {
    if (document.activeElement.tagName === 'INPUT') return;
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER') return;
    if (combatPhase === 'ACTION' || combatPhase === 'PHASE_2') {
        if (e.key === '1') executeCombatAction('slash');
        else if (e.key === '2') executeCombatAction('special');
        else if (e.key === '3') executeCombatAction('brew');
        else if (e.key === '4' || e.key === ' ') executeCombatAction('end');
    }
});

// === NEW: MOBILE TOOLTIP DISMISSAL ===
document.addEventListener("touchstart", function(e) {
    // If the player taps somewhere on the screen that does NOT have a tooltip trigger...
    if (!e.target.closest('[onmouseenter]')) {
        // ...force the tooltip to hide!
        if (typeof hideTooltip === 'function') hideTooltip();
    }
}, {passive: true});

// === NEW: GLOBAL MUSIC INITIALIZER ===
// Listens for the very first click on the document to safely start the Audio API
document.addEventListener("click", function startMusicOnce() {
    if (typeof startBackgroundMusic === 'function') {
        startBackgroundMusic();
    }
    // Remove the listener so it doesn't keep firing every time they click
    document.removeEventListener("click", startMusicOnce);
}, { once: true });

// === RENDER WAKE-UP HEARTBEAT ===
// Render free tiers kill servers after 15 mins of HTTP inactivity, ignoring WebSockets.
// This silently pings the server every 10 minutes to keep your session alive and prevent 502s!
setInterval(() => {
    fetch('/').catch(err => console.log('Heartbeat skipped.'));
}, 10 * 60 * 1000);