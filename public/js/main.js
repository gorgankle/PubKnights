// --- CORE GAME ENGINE & GLOBALS ---

// Establish secure connection to the Node server
const socket = io();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function syncCombatCollectionsFromState(serverCombatState) {
    if (!serverCombatState) return;
    if (serverCombatState.player) {
        player.x = serverCombatState.player.x;
        player.y = serverCombatState.player.y;
    }
    enemies = serverCombatState.enemies || [];
    allies = serverCombatState.allies || [];
    rogues = serverCombatState.rogues || [];
    mapObstacles = serverCombatState.obstacles || mapObstacles || [];
    if (serverCombatState.parties && typeof serverCombatState.parties === "object") {
        combatParties = serverCombatState.parties;
    }
    if (Object.prototype.hasOwnProperty.call(serverCombatState, "activeActorUid")) {
        activeCombatActorUid = serverCombatState.activeActorUid || null;
    }
}

function getCombatActorByUid(uid) {
    if (!uid) return null;
    if (uid === 'player_0') {
        player.uid = 'player_0';
        player.kind = 'player';
        player.name = player.username || 'Knight';
        return player;
    }
    return [...(enemies || []), ...(allies || []), ...(rogues || [])].find(actor => actor.uid === uid) || null;
}

function getPlayerAttackables() {
    return [...(enemies || []), ...(rogues || [])].filter(actor => actor && actor.alive);
}

let combatVictoryPresentationStarted = false;

function presentCombatVictory() {
    if (combatVictoryPresentationStarted || gameState !== "COMBAT") return;
    combatVictoryPresentationStarted = true;
    currentTurn = "ENEMY";
    combatPhase = "VICTORY";
    activeCombatActorUid = null;
    selectedEnemy = null;
    pendingMove = null;

    logMessage("🏆 VICTORY Conditions verified.");
    if (typeof playRetroSound === "function") playRetroSound("victory");

    const returnButton = document.querySelector("#loot-screen button");
    if (returnButton) returnButton.style.display = "block";
    refreshSystemUI();
    if (typeof drawGrid === "function") drawGrid();

    setTimeout(() => {
        if (gameState === "COMBAT" && typeof showLootScreen === "function") showLootScreen();
    }, 1200);
}

function getCombatEventActorUid(event) {
    if (!event) return null;
    if (event.sourceUid) return event.sourceUid;
    if (["move", "hit", "deflect", "statusTick"].includes(event.type)) return event.uid || null;
    return null;
}

// === SERVER-AUTHORITATIVE SYNC ===

socket.on('serverTick', (serverData) => {
    // Failsafe: Ignore background ticks if the player hasn't logged in yet
    if (document.getElementById('main-game-container').style.display !== 'flex') return;

    // Server ticks keep durable town status in sync.
    if (typeof serverData.gold === 'number') player.gold = serverData.gold;
    player.happyHourTicks = serverData.happyHourTicks;

    refreshSystemUI();
    updateTownUI(serverData);
});
// === SERVER-AUTHORITATIVE COMBAT DISPATCH (UNIFIED ENGINE) ===
socket.on('combatResult', (result) => {
    if (!result || gameState !== 'COMBAT') return;

    if (result.updatedPlayer) Object.assign(player, result.updatedPlayer); // Instantly sync stamina
    const resultCombatState = result.updatedCombatState || null;

    // === THE FIX: HANDLE ERRORS & PASS TURN ===
    if (result.type === 'error') {
        logMessage(result.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        if (resultCombatState) syncCombatCollectionsFromState(resultCombatState);

        if (!activeCombatActorUid) {
            currentTurn = 'ENEMY';
            combatPhase = 'WAITING_FOR_ATB';
            selectedEnemy = null;
            pendingMove = null;
        } else if (combatPhase === 'WAITING_FOR_SERVER') {
            combatPhase = 'PHASE_2';
        }

        refreshSystemUI();
        if (typeof drawGrid === 'function') drawGrid();
        return;
    }

    if (result.type === 'pass') {
        logMessage(`⌛ Phase passed. Recovered ${result.recovered} stamina.`);
        if (resultCombatState) syncCombatCollectionsFromState(resultCombatState);
        currentTurn = 'ENEMY';
        combatPhase = 'WAITING_FOR_ATB';
        selectedEnemy = null;
        pendingMove = null;
        activeCombatActorUid = null;
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

    // --- 2. HANDLE HITS (WEAPONS & MAGIC) ---
    if (result.type === 'hit') {
        let fx = result.fx || {};
        const sourceActor = getCombatActorByUid(result.actorUid || fx.sourceUid || 'player_0') || player;
        const sourceX = Number.isFinite(fx.sx) ? fx.sx : sourceActor.x;
        const sourceY = Number.isFinite(fx.sy) ? fx.sy : sourceActor.y;

        // Define animation physics based on the attack type
        let animOptions = { arc: 0, spin: true, frames: 10 };

        // What happens the exact millisecond the projectile finishes traveling?
        animOptions.onComplete = () => {

            // Play physical impact visuals/audio
            if (result.source === 'spell') {
                // === NEW: Spell Impact Sounds ===
                if (typeof playRetroSound === 'function') playRetroSound('explosion');
                if (result.targets.length === 0) logMessage("💨 Spell scorched nothing but the earth.");
            } else {
                let isCrit = result.targets.length > 0 && result.targets[0].isCrit;
                if (typeof playRetroSound === 'function') playRetroSound(isCrit ? 'playerCrit' : (result.actionName === 'special' ? 'heavyAttack' : 'attack'));
            }

            // Loop through EVERY enemy hit by this attack and process damage dynamically
            result.targets.forEach(targetData => {
                let e = getCombatActorByUid(targetData.uid);
                if (!e) return;

                e.hp -= targetData.damage;
                if (targetData.killed) { e.hp = 0; e.alive = false; }
                if (targetData.statusEffects) e.statusEffects = targetData.statusEffects;

                if (result.source === 'spell') {
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

                if (targetData.statusApplied === 'poison') {
                    logMessage(`${e.name} is poisoned!`);
                    FXEngine.spawnText(e.x, e.y, "POISON", { color: "#8e44ad" });
                }
            });

            // Cleanup & Victory Checks
            if (resultCombatState) syncCombatCollectionsFromState(resultCombatState);
            if (selectedEnemy && !selectedEnemy.alive) selectedEnemy = null;

            if (result.combatComplete) {
                presentCombatVictory();
            } else {
                advancePhase(); // Unlocks the Phase safely!
            }

            refreshSystemUI();
        };

        // === THE MASTER ANIMATION TRIGGER ===
        if (result.source === 'spell' && fx && fx.type === 'beam') {

            // THE FIX: Pass the entire 'fx' configuration object instead of just the style string!
            FXEngine.spawnBeam(sourceX, sourceY, fx.tx, fx.ty, fx);

            setTimeout(() => {
                if (typeof animOptions.onComplete === 'function') animOptions.onComplete();
            }, 350);

        } else if (result.source === 'spell' && fx && fx.type === 'burst') {
            FXEngine.spawnMagicBurst(fx.tx, fx.ty, fx);

            setTimeout(() => {
                if (typeof animOptions.onComplete === 'function') animOptions.onComplete();
            }, 350);

       // === NEW: ROUTE RANGED WEAPONS (BOWS/CROSSBOWS) ===
        } else if (result.source === 'weapon' && fx && fx.isProjectile) {

            animOptions.arc = 0;         // Flat trajectory
            animOptions.spin = false;    // Arrows point directly at target
            animOptions.frames = 15;     // Quick flight speed

            FXEngine.spawnProjectile(sourceX, sourceY, fx.tx, fx.ty, fx.spriteId, animOptions);
        // ===================================================

        } else {
            // 1. Determine if they used 'standard' or 'special'
            let profileKey = result.actionName === 'special' ? 'special' : 'standard';

            // === THE FIX: UNARMED ANIMATION FALLBACK ===
            // Inject a mock weapon profile so the client doesn't crash when bare-handed!
            let weapon = player.equipment.weapon;
            if (!weapon || !weapon.combat) {
                weapon = {
                    combat: {
                        standard: { animType: 'lunge_bash' },
                        special: { animType: 'lunge_bash' }
                    }
                };
            }

            // 2. Fetch the exact animation profile
            let weaponProfile = weapon.combat[profileKey];
            let animType = weaponProfile && weaponProfile.animType ? weaponProfile.animType : 'lunge_slash';

            // 3. Trigger the lunge, and ONLY execute the damage math when the strike physically connects!
            FXEngine.spawnMeleeStrike(sourceActor, fx.tx, fx.ty, animType, {
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
    if (receipt.updatedCombatState) syncCombatCollectionsFromState(receipt.updatedCombatState);

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
        if (receipt.updatedCombatState) syncCombatCollectionsFromState(receipt.updatedCombatState);
        if (!activeCombatActorUid) {
            currentTurn = 'ENEMY';
            combatPhase = 'WAITING_FOR_ATB';
        }
        const failedMoveActor = receipt.actorUid && typeof getCombatActorByUid === 'function' ? getCombatActorByUid(receipt.actorUid) : player;
        if (failedMoveActor && Number.isFinite(receipt.x) && Number.isFinite(receipt.y)) {
            failedMoveActor.x = receipt.x;
            failedMoveActor.y = receipt.y;
        }
        if (typeof playRetroSound === 'function') playRetroSound('error');
        refreshSystemUI();
    } else {
        // Successfully moved! Keep client stamina perfectly in sync with the server
        if (receipt.updatedPlayer) {
            player.stamina = receipt.updatedPlayer.stamina;
            refreshSystemUI();
        }
        if (receipt.updatedCombatState) syncCombatCollectionsFromState(receipt.updatedCombatState);
    }
});

socket.on('ATB_READY', (payload = {}) => {
    if (gameState !== 'COMBAT') return;
    activeCombatActorUid = payload.actorUid || 'player_0';
    combatPhase = 'PHASE_1'; // The exact start of your tactical phase!
    currentTurn = 'PLAYER';
    logMessage(`⚡ ${payload.actorName || 'Party'} is ready! Tactical turn begins.`);
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
        if (!receipt.isAuto && typeof playRetroSound === 'function') playRetroSound('claim');
    } else if (receipt.action === 'baitWilds' || receipt.action === 'chumCellars') {
        if (typeof playRetroSound === 'function') playRetroSound('splat');
    } else if (receipt.action === 'drinkBrew') {
        if (typeof playRetroSound === 'function') playRetroSound('chug');
    } else if (receipt.action === 'adoptPet') {
        // === HIDE THE MENU UPON SUCCESSFUL SERVER PURCHASE ===
        if (typeof playRetroSound === 'function') playRetroSound('coin');
        let adoptionUI = document.getElementById('pet-adoption-ui');
        if (adoptionUI) adoptionUI.style.display = "none";
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

        if (data.isPet) logMessage(`🐾 ${data.petName || (player.pet && player.pet.name) || "Companion"} joyfully dug up a hidden treasure!`);
        else logMessage(`🎁 SECURED LOOT: ${data.item.name} [${data.item.rarity}]`);
    }

    if (document.getElementById("loot-screen").style.display === "block") {
        if (typeof refreshLootUI === 'function') refreshLootUI();
    }
});

socket.on('rogueLootTheft', (data) => {
    if (!data) return;
    pendingLoot.length = 0;
    if (Array.isArray(data.pendingLoot)) {
        player.pendingLoot = data.pendingLoot;
        pendingLoot.push(...data.pendingLoot);
    }
    logMessage(`${data.thiefName || 'A rogue'} slipped away with ${data.itemName || 'a prize'}!`);
    if (typeof playRetroSound === 'function') playRetroSound('error');
    if (document.getElementById("loot-screen").style.display === "block" && typeof refreshLootUI === 'function') {
        refreshLootUI();
    }
});

// === REPLACED ===
socket.on('combatRewardsReceipt', (receipt) => {
    if (receipt.updatedPlayer) {
        let oldLevel = player.level;

        // === THE FIX: AUTO-SNAP ZONE UI ===
        // Track the old maximum levels before the magic sync
        let oldWild = player.wildernessLevel || 1;
        let oldCellar = player.cellarLevel || 1;

        Object.assign(player, receipt.updatedPlayer); // Magic bullet sync!

        // If the server pushed your max level forward, snap the UI selector to match!
        if (player.wildernessLevel > oldWild) player.selectedWildernessLevel = player.wildernessLevel;
        if (player.cellarLevel > oldCellar) player.selectedCellarLevel = player.cellarLevel;
        // ==================================

        if (player.level > oldLevel) {
            if (typeof playRetroSound === 'function') playRetroSound('heavyAttack');
            logMessage(`🎉 LEVEL UP! The Guild has verified you are now Level ${player.level}.`);
        }

        // === THE FIX: FORCE A DATABASE COMMIT BEFORE LEAVING THE ARENA ===
        if (typeof saveGame === 'function') saveGame();

        transitionToTown();
    }
});
// ============================================

socket.on('statusEffectReceipt', (receipt) => {
    if (!receipt || gameState !== 'COMBAT') return;
    if (receipt.updatedPlayer) Object.assign(player, receipt.updatedPlayer);
    if (receipt.updatedCombatState) syncCombatCollectionsFromState(receipt.updatedCombatState);

    (receipt.events || []).forEach(ev => {
        if (ev.status === 'poison') {
            if (ev.targetType === 'player') {
                logMessage(`Poison burns you for ${ev.damage} DMG.`);
                FXEngine.spawnText(player.x, player.y, `-${ev.damage}`, { color: "#8e44ad" });
            } else if (ev.uid) {
                const e = getCombatActorByUid(ev.uid);
                if (e) {
                    logMessage(`${e.name} suffers ${ev.damage} poison DMG.`);
                    FXEngine.spawnText(e.x, e.y, `-${ev.damage}`, { color: "#8e44ad" });
                }
            }
        }
    });

    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid();
});

socket.on('combatDeployed', (serverCombatState) => {
    activeCombatActorUid = null;
    combatVictoryPresentationStarted = false;
    reachableTiles = null;
    hideTooltip();

    // Sync browser state to the Server's command
    player.idleJob = 'NONE';
    player.statusEffects = {};
    gameState = 'COMBAT';

    // STRICT GAME LOGIC: Always start waiting for the server's ATB tick
    currentTurn = 'ENEMY';
    combatPhase = 'WAITING_FOR_ATB';
    player.visualAtb = 0;

    pendingMove = null;
    player.pendingXp = 0;

    // Load the physical grid variables
    currentGridSize = serverCombatState.gridSize;
    currentTileSize = serverCombatState.tileSize;
    player.x = serverCombatState.player.x;
    player.y = serverCombatState.player.y;
    syncCombatCollectionsFromState(serverCombatState);
    selectedEnemy = null;

    activeCombatZone = serverCombatState.zone;
    activeCombatFloorSpriteId = serverCombatState.floorSpriteId || "ground_wilderness";
    activeCombatFloorTiles = serverCombatState.floorTiles || [];

    // Automatically rip the loot screen away if it's open
    const lootOverlay = document.getElementById("loot-screen");
    if (lootOverlay) lootOverlay.style.display = "none";

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
    const combatDefeated = !!receipt.combatDefeated || events.some(ev => ev && ev.type === 'death');
    const combatComplete = !!receipt.combatComplete;
    currentTurn = "ENEMY";

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

    function playEnemyAttackFx(ev, onComplete, targetActor = null) {
        const targetX = targetActor ? targetActor.x : player.x;
        const targetY = targetActor ? targetActor.y : player.y;
        if (ev.spellFx && ev.spellFx.type === 'beam') {
            FXEngine.spawnBeam(ev.ex, ev.ey, targetX, targetY, ev.spellFx);
            setTimeout(onComplete, 350);
        } else if (ev.projectileSprite) {
            FXEngine.spawnProjectile(ev.ex, ev.ey, targetX, targetY, ev.projectileSprite, { arc: 0, spin: false, frames: 20, onComplete: onComplete });
        } else {
            onComplete();
        }
    }

    // 2. Play the events sequentially on the screen
    events.forEach(ev => {
        setTimeout(() => {
            const eventActorUid = getCombatEventActorUid(ev);
            if (eventActorUid) activeCombatActorUid = eventActorUid;
            if (ev.type === 'move') {
                let e = ev.uid ? getCombatActorByUid(ev.uid) : [...enemies, ...allies, ...rogues].find(en => en.name === ev.name);
                if (e) { e.x = ev.finalX; e.y = ev.finalY; }
            }
            else if (ev.type === 'crush') {
                if (typeof playRetroSound === 'function') playRetroSound('heavyAttack');
                logMessage(`💥 The massive ${ev.enemyName} crushes an obstacle in its path!`);
            }
            else if (ev.type === 'deflect') {
                playEnemyAttackFx(ev, () => {
                    logMessage(`Deflected attack from ${ev.enemyName}!`);
                    FXEngine.spawnText(player.x, player.y, "DEFLECT", { color: "#3498db" });
                    if (typeof playRetroSound === 'function') playRetroSound('deflect');
                });
            }
            else if (ev.type === 'hit') {
                let executeHit = () => {
                    if (ev.playerStatusEffects) player.statusEffects = ev.playerStatusEffects;
                    const rangedLabel = ev.isRangedAttack ? " (Ranged)" : "";
                    if (ev.isCrit) {
                        logMessage(`💥 CRITICAL STRIKE! ${ev.enemyName} hits you for ${ev.damage} DMG!${rangedLabel}`);
                        FXEngine.spawnText(player.x, player.y, `-${ev.damage}!`, { color: "#9b59b6", isCrit: true });
                        if (typeof playRetroSound === 'function') playRetroSound('enemyCrit');
                    } else {
                        logMessage(`⚔️ ${ev.enemyName} hits you for ${ev.damage} DMG.${rangedLabel}`);
                        FXEngine.spawnText(player.x, player.y, `-${ev.damage}`, { color: "#e74c3c" });
                        if (typeof playRetroSound === 'function') playRetroSound('playerHit');
                    }

                    if (ev.statusApplied === 'poison') {
                        logMessage(`You are poisoned by ${ev.enemyName}!`);
                        FXEngine.spawnText(player.x, player.y, "POISON", { color: "#8e44ad" });
                    }
                };

                playEnemyAttackFx(ev, executeHit);
            }
            else if (ev.type === 'statusTick') {
                if (ev.status === 'poison') {
                    if (ev.targetType === 'enemy' || ev.targetType === 'actor') {
                        const e = getCombatActorByUid(ev.uid);
                        if (e) {
                            e.hp = Math.max(0, e.hp - ev.damage);
                            if (ev.killed) e.alive = false;
                            logMessage(`${e.name} suffers ${ev.damage} poison DMG.`);
                            FXEngine.spawnText(e.x, e.y, `-${ev.damage}`, { color: "#8e44ad" });
                        }
                    } else if (ev.targetType === 'player') {
                        logMessage(`Poison burns you for ${ev.damage} DMG.`);
                        FXEngine.spawnText(player.x, player.y, `-${ev.damage}`, { color: "#8e44ad" });
                    }
                }
            }
            else if (ev.type === 'actorDeflect') {
                const target = getCombatActorByUid(ev.targetUid);
                playEnemyAttackFx(ev, () => {
                    if (target) FXEngine.spawnText(target.x, target.y, "DEFLECT", { color: "#3498db" });
                    logMessage(`${ev.targetName} deflected ${ev.sourceName}'s attack.`);
                    if (typeof playRetroSound === 'function') playRetroSound('deflect');
                }, target);
            }
            else if (ev.type === 'actorHit') {
                const target = getCombatActorByUid(ev.targetUid);
                playEnemyAttackFx(ev, () => {
                    if (target) {
                        target.hp = Math.max(0, target.hp - ev.damage);
                        if (ev.killed) target.alive = false;
                        if (ev.statusEffects) target.statusEffects = ev.statusEffects;
                        FXEngine.spawnText(target.x, target.y, ev.isCrit ? `-${ev.damage}!` : `-${ev.damage}`, {
                            color: ev.sourceTeamId === 'PLAYER' ? "#f1c40f" : "#e74c3c",
                            isCrit: ev.isCrit
                        });
                        if (ev.statusApplied === 'poison') FXEngine.spawnText(target.x, target.y, "POISON", { color: "#8e44ad" });
                    }
                    logMessage(`${ev.sourceName} hits ${ev.targetName} for ${ev.damage} DMG.`);
                    if (typeof playRetroSound === 'function') playRetroSound(ev.sourceTeamId === 'PLAYER' ? 'attack' : 'playerHit');
                }, target);
            }
            else if (ev.type === 'heal') {
                player.hp = ev.hp || player.hp;
                logMessage(`${ev.sourceName} patches you up for ${ev.amount} HP.`);
                FXEngine.spawnText(player.x, player.y, `+${ev.amount}`, { color: "#2ecc71" });
                if (typeof playRetroSound === 'function') playRetroSound('chug');
            }
            else if (ev.type === 'retreat') {
                const actor = getCombatActorByUid(ev.uid);
                if (actor) {
                    actor.alive = false;
                    actor.retreated = true;
                }
                logMessage(`${ev.actorName} retreats to safety.`);
            }
            else if (ev.type === 'steal') {
                logMessage(`🍺 The Mimic intercepts your gear inventory and chugs one of your Stouts!`);
            }
      else if (ev.type === 'death') {
                logMessage("💀 casualty verified. Transporting to safety structures.");
                if (typeof playRetroSound === 'function') playRetroSound('death');
                setTimeout(() => {
                    transitionToTown();
                    if (typeof saveGame === 'function') saveGame();
                    refreshSystemUI();
                }, 1500);
            }
            refreshSystemUI();
        }, delay);

        // === NEW: MULTIPLY THE DELAY BY OUR TIME COMPRESSION ===
        if (ev.type === 'move') delay += (100 * timeCompression);
        else if (ev.type === 'hit' || ev.type === 'deflect' || ev.type === 'actorHit' || ev.type === 'actorDeflect') delay += (350 * timeCompression);
        else delay += (50 * timeCompression);
    });

    // 3. Finally, hand control back to the player!
    setTimeout(() => {
        if (combatDefeated) return;
        if (combatComplete) {
            presentCombatVictory();
            return;
        }

        // We only overwrite the grid with the server's truth AFTER the movie finishes playing!
        if (receipt.updatedCombatState) syncCombatCollectionsFromState(receipt.updatedCombatState);
        activeCombatActorUid = null;

        if (player.hp > 0) {
            reachableTiles = null;
            // (Ghost Unlock remains removed!)
            if (typeof saveGame === 'function') saveGame();
            refreshSystemUI();
            if (typeof drawGrid === 'function') drawGrid();

            // === THE FIX: THE MOVIE HANDSHAKE ===
            // Tell the server the visual animation is finished so it can unpause the ATB Heartbeat!
            socket.emit('clientPlaybackComplete');
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
let activeCombatFloorSpriteId = 'ground_wilderness';
let activeCombatFloorTiles = [];
let allies = [];
let rogues = [];
let combatParties = {};


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
