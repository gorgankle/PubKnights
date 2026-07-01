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

// === SERVER-AUTHORITATIVE COMBAT DISPATCH (UNIFIED ENGINE) ===
socket.on('combatResult', (result) => {
    if (!result || gameState !== 'COMBAT') return;

    if (result.updatedPlayer) Object.assign(player, result.updatedPlayer); // Instantly sync stamina

    // === THE FIX: HANDLE ERRORS & PASS TURN ===
    if (result.type === 'error') {
        logMessage(result.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        
        // Failsafe: If the server rejected a throw, unlock the client back to Phase 2!
        if (combatPhase === 'WAITING_FOR_SERVER') combatPhase = 'PHASE_2'; 
        
        refreshSystemUI();
        if (typeof drawGrid === 'function') drawGrid();
        return;
    }
    
    if (result.type === 'pass') {
        logMessage(`⌛ Phase passed. Recovered ${result.recovered} stamina.`);
        advancePhase(); // Safely advances the turn!
        refreshSystemUI();
        if (typeof drawGrid === 'function') drawGrid();
        return;
    }

    if (result.type === 'flee') {
        logMessage(`🏃 You fled the battlefield in terror!`);
        if (typeof playRetroSound === 'function') playRetroSound('step');
        
        // Clear any pending escrow loot locally
        pendingLoot = [];
        if (player) player.pendingLoot = [];
        
        setTimeout(transitionToTown, 500);
        return;
    }
    // ==========================================

    // --- 1. HANDLE EVASION ---
    if (result.type === 'miss') {
        logMessage(`💨 Strike MISSED! Target evaded (${result.hitChance}% Hit Chance).`); 
        if (typeof playRetroSound === 'function') playRetroSound('error'); 
        if (selectedEnemy) FXEngine.spawnText(selectedEnemy.x, selectedEnemy.y, "MISS", { color: "#3498db" }); 
        
        advancePhase(); // Unlocks the Phase!
        refreshSystemUI();
        return;
    } 
    
    // --- 2. HANDLE HITS (MELEE & MAGIC/BOMBS) ---
    if (result.type === 'hit') {
        let fx = result.fx;
        
        // Define animation physics based on the attack type
        let animOptions = { arc: 0, spin: true, frames: 10 }; 
        if (result.source === 'throwable') {
            animOptions = { arc: 1.5, spin: true, frames: 30 }; 
        }

        // What happens the exact millisecond the projectile finishes traveling?
        animOptions.onComplete = () => {
            
            // Play physical impact visuals/audio
            if (result.source === 'throwable') {
                if (typeof playRetroSound === 'function') playRetroSound('explosion'); 
                FXEngine.spawnExplosion(fx.tx, fx.ty, { radius: fx.radius + 1.25 });
                if (result.targets.length === 0) logMessage("💨 Blast hit nothing.");
            } else if (result.source === 'spell') {
                // === NEW: Spell Impact Sounds ===
                if (typeof playRetroSound === 'function') playRetroSound('explosion'); 
                if (result.targets.length === 0) logMessage("💨 Spell scorched nothing but the earth.");
            } else {
                let isCrit = result.targets.length > 0 && result.targets[0].isCrit;
                if (typeof playRetroSound === 'function') playRetroSound(isCrit ? 'playerCrit' : (result.actionName === 'special' ? 'heavyAttack' : 'attack'));
            }

            // Loop through EVERY enemy hit by this attack and process damage dynamically
            result.targets.forEach(targetData => {
                let e = enemies.find(en => en.uid === targetData.uid);
                if (!e) return;
                
                e.hp -= targetData.damage;
                if (targetData.killed) { e.hp = 0; e.alive = false; }
                
                // === THE FIX: Route spell damage text identical to throwables ===
                if (result.source === 'throwable' || result.source === 'spell') {
                    logMessage(`🔥 ${e.name} caught in blast for ${targetData.damage} DMG!`);
                    FXEngine.spawnText(e.x, e.y, `-${targetData.damage}`, { color: "#e74c3c" });
                } else {
                    if (targetData.isCrit) {
                        logMessage(`💥 CRITICAL STRIKE! Executed ${result.actionName.toUpperCase()} onto ${e.name} for ${targetData.damage} DMG!`);
                        FXEngine.spawnText(e.x, e.y, `-${targetData.damage}!`, { color: "#f1c40f", isCrit: true });
                    } else {
                        logMessage(`⚔️ Executed ${result.actionName.toUpperCase()} strike onto ${e.name} for ${targetData.damage} DMG!`);
                        FXEngine.spawnText(e.x, e.y, `-${targetData.damage}`, { color: "#e74c3c" });
                    }
                }
            });

            // Cleanup & Victory Checks
            if (selectedEnemy && !selectedEnemy.alive) selectedEnemy = null;
            
            if (enemies.every(e => !e.alive)) {
                logMessage("🏆 VICTORY Conditions verified.");
                if (typeof playRetroSound === 'function') playRetroSound('victory');
                setTimeout(showLootScreen, 1200); 
            } else {
                advancePhase(); // Unlocks the Phase safely!
            }
            
            refreshSystemUI();
        };

        // === THE MASTER ANIMATION TRIGGER ===
        if (result.source === 'spell' && fx && fx.type === 'beam') {
            
            // THE FIX: Pass the entire 'fx' configuration object instead of just the style string!
            FXEngine.spawnBeam(player.x, player.y, fx.tx, fx.ty, fx);
            
            setTimeout(() => { 
                if (typeof animOptions.onComplete === 'function') animOptions.onComplete(); 
            }, 350);

       } else if (result.source === 'throwable' && fx && fx.spriteId) {
            FXEngine.spawnProjectile(player.x, player.y, fx.tx, fx.ty, fx.spriteId, animOptions);
            
        // === NEW: ROUTE RANGED WEAPONS (BOWS/CROSSBOWS) ===
        } else if (result.source === 'weapon' && fx && fx.isProjectile) {
            
            animOptions.arc = 0;         // Flat trajectory
            animOptions.spin = false;    // Arrows point directly at target
            animOptions.frames = 15;     // Quick flight speed
            
            FXEngine.spawnProjectile(player.x, player.y, fx.tx, fx.ty, fx.spriteId, animOptions);
        // ===================================================

        } else {
            // 1. Determine if they used 'standard' or 'special'
            let profileKey = result.actionName === 'special' ? 'special' : 'standard';
            
            // 2. Fetch the exact animation profile you wrote in items.js!
            let weaponProfile = player.equipment.weapon.combat[profileKey];
            let animType = weaponProfile && weaponProfile.animType ? weaponProfile.animType : 'lunge_slash';
            
            // 3. Trigger the lunge, and ONLY execute the damage math when the strike physically connects!
            FXEngine.spawnMeleeStrike(player, fx.tx, fx.ty, animType, { 
                frames: 15, 
                onComplete: animOptions.onComplete 
            });
        }
        // ====================================
    }
});

// === SERVER-AUTHORITATIVE COMBAT ITEM RECEIPT ===
socket.on('combatItemReceipt', (receipt) => {
    if (!receipt.success) {
        logMessage(receipt.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        
        // === THE FIX: Unlock the phase if the server rejects the drink! ===
        if (combatPhase === 'WAITING_FOR_SERVER') combatPhase = 'PHASE_2'; 
        refreshSystemUI();
        
        return;
    }

    if (receipt.updatedPlayer) Object.assign(player, receipt.updatedPlayer); // Magic bullet sync
    
    logMessage(receipt.message);
    if (receipt.message.includes("gear")) {
        if (typeof playRetroSound === 'function') playRetroSound('equip');
    } else {
        if (typeof playRetroSound === 'function') playRetroSound('chug');
    }
    
    if (typeof saveGame === 'function') saveGame();
    
    advancePhase(); // Updates HTML buttons & phases securely
    
    // === THE MISSING CANVAS REPAINT ===
    // Forces the physical game board to instantly redraw the new movement/range tiles!
    if (typeof drawGrid === 'function') {
        drawGrid(); 
    }
    // ==================================
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

socket.on('ATB_READY', () => {
    if (gameState !== 'COMBAT') return;
    combatPhase = 'PHASE_1'; // The exact start of your tactical phase!
    currentTurn = 'PLAYER';
    logMessage("⚡ ATB Gauge Full! Your tactical turn begins.");
    if (typeof playRetroSound === 'function') playRetroSound('equip');
    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid();
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
    currentTurn = 'ENEMY';             // <--- THE LOCK
    combatPhase = 'WAITING_FOR_ATB';   // <--- THE LOCK
    player.visualAtb = 0;              // <--- START EMPTY
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
                FXEngine.spawnText(player.x, player.y, "DEFLECT", { color: "#3498db" });
                if (typeof playRetroSound === 'function') playRetroSound('deflect');
            }
            else if (ev.type === 'hit') {
                let executeHit = () => {
                    if (ev.isCrit) {
                        logMessage(`💥 CRITICAL STRIKE! ${ev.enemyName} hits you for ${ev.damage} DMG!${ev.isPoacher ? " (Deflected)" : ""}`);
                        FXEngine.spawnText(player.x, player.y, `-${ev.damage}!`, { color: "#9b59b6", isCrit: true });
                        if (typeof playRetroSound === 'function') playRetroSound('enemyCrit');
                    } else {
                        logMessage(`⚔️ ${ev.enemyName} hits you for ${ev.damage} DMG.${ev.isPoacher ? " (Deflected)" : ""}`);
                        FXEngine.spawnText(player.x, player.y, `-${ev.damage}`, { color: "#e74c3c" });
                        if (typeof playRetroSound === 'function') playRetroSound('playerHit');
                    }
                };

                if (ev.isPoacher) {
                    FXEngine.spawnProjectile(ev.ex, ev.ey, player.x, player.y, 'icon_arrow', { arc: 0, spin: false, frames: 20, onComplete: executeHit });
                } else {
                    // Instantly execute melee hits
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