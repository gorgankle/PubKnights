// --- COMBAT CORE MECHANICS & ACTIONS ---

// Make sure these three lines only appear ONCE at the top of the file!
let activeTargetIndex   = -1;
let previousCombatPhase = 'PHASE_1';
let pendingLoot = []; 


// Data-Driven Special Descriptions
function getWeaponSpecialDesc(item) {
    if (!item || item.slot !== "weapon" || !item.combat || !item.combat.special) return "";
    return `<b>[${item.combat.special.name}]:</b> ${item.combat.special.desc}`;
}

// The Unified Client Dispatcher
function executeCombatAction(actionType) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER' || combatPhase === 'TARGETING') return;

    if (actionType === 'end' || actionType === 'slash' || actionType === 'special') {
        
        // Client-side UX validation (Server will verify this again)
        if (actionType === 'slash' || actionType === 'special') {
            if (combatPhase !== 'PHASE_2') {
                logMessage("❌ Tactical Error: Attacks can only be performed in Phase 2."); 
                if (typeof playRetroSound === 'function') playRetroSound('error'); 
                return;
            }
           if (!selectedEnemy || !selectedEnemy.alive) return;
            
            let weapon = player.equipment.weapon;
            
            // === PHASE 0: UNARMED CLIENT FALLBACK ===
            // Injects a mock weapon dynamically so it passes validation and emits to the server
            if (!weapon || !weapon.combat) {
                weapon = {
                    combat: {
                        standard: { range: 1, staminaCost: 5 },
                        special: { name: "Haymaker", range: 1, staminaCost: 15, targetType: 'single' }
                    }
                };
            }
            // ========================================

// === NEW: TACTICAL WEAPON SPECIAL INTERCEPT ===
        // If it's an AoE weapon skill, stop the normal attack and switch to TARGETING!
        if (actionType === 'special' && weapon.combat.special && weapon.combat.special.targetType === 'aoe') {
            activeTargetIndex = 'weapon'; // Flag it as the weapon special
            combatPhase = 'TARGETING';
            logMessage("📍 Targeting AoE Special... Select the epicenter.");
            refreshSystemUI();
            if (typeof drawGrid === 'function') drawGrid();
            return; 
        }
        // ===============================================


            // Pull dynamic rules directly from the item schema
            let combatRules = actionType === 'special' ? weapon.combat.special : weapon.combat.standard;
            let staminaCost = combatRules.staminaCost;
            let range = combatRules.range;
            
            if (player.stamina < staminaCost) {
                logMessage(`❌ Legs are too heavy. Not enough stamina (${staminaCost} required).`);
                if (typeof playRetroSound === 'function') playRetroSound('error');
                return;
            }
            
            let dist = getGridDistance(player.x, player.y, selectedEnemy.x, selectedEnemy.y, selectedEnemy.size || 1);
            if (dist > range) { 
                logMessage(`❌ Target outside weapon scope range (Max Range: ${range}).`); 
                if (typeof playRetroSound === 'function') playRetroSound('error'); 
                return; 
            }
            
            let losClear = false; 
            let sSize = selectedEnemy.size || 1;
            for (let bx = selectedEnemy.x; bx < selectedEnemy.x + sSize; bx++) {
                for (let by = selectedEnemy.y; by < selectedEnemy.y + sSize; by++) {
                    if (hasLineOfSight(player.x, player.y, bx, by)) losClear = true;
                }
            }
            if (!losClear) { 
                logMessage("❌ Line of sight blocked by obstruction."); 
                if (typeof playRetroSound === 'function') playRetroSound('error'); 
                return; 
            }
            
        }

if (actionType !== 'end') combatPhase = 'WAITING_FOR_SERVER';

        // ONE unified payload to rule them all
        socket.emit('dispatchCombatAction', { 
            actionCategory: actionType === 'end' ? 'pass' : 'weapon',
            subType: actionType, 
            targetEnemy: selectedEnemy ? { 
                id: selectedEnemy.id, 
                uid: selectedEnemy.uid,
                x: selectedEnemy.x,
                y: selectedEnemy.y
            } : null 
        });
        
        return; 
    }
}

function endPlayerTurn() { 
    currentTurn = 'ENEMY'; 
    combatPhase = 'WAITING_FOR_ATB'; // <--- THE LOCK
    selectedEnemy = null; 
    pendingMove = null; 
    player.visualAtb = 0;            // <--- RESET VISUAL BAR
    refreshSystemUI(); 
    
    // Pass control securely to the Server AI, and sync our final X/Y position!
    socket.emit('endPlayerTurn', { playerPos: { x: player.x, y: player.y } });
}

function fleeCombat() {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER' || combatPhase === 'TARGETING') return;
    
    let confirmFlee = confirm("Are you sure you want to run away? You will forfeit all pending loot and return to town.");
    if (!confirmFlee) return;

    // Lock the phase so they can't spam buttons while fleeing
    combatPhase = 'WAITING_FOR_SERVER';
    refreshSystemUI();
    
    socket.emit('dispatchCombatAction', { actionCategory: 'flee' });
}

function handleCombatEquip(idx) {
    socket.emit('dispatchCombatAction', { actionCategory: 'equip', invIndex: idx });
}

function consumeBrew(invIndex) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER' || combatPhase === 'TARGETING') return;
    
    // === THE FIX: ENFORCE PHASE LOCK ON CONSUMABLES ===
    combatPhase = 'WAITING_FOR_SERVER'; 
    
    socket.emit('dispatchCombatAction', { actionCategory: 'consumable', invIndex: invIndex });
}


// === TARGETING STATE CONTROLLERS ===
window.prepTargetAction = function(idx) {
    if (gameState !== 'COMBAT') return;
    
    // === THE FIX: Enforce Phase 2 for ALL throws and spells! ===
    if (combatPhase !== 'PHASE_2') {
        logMessage("❌ Tactical Error: Spells and throwables can only be aimed during Phase 2.");
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }

    activeTargetIndex = idx;         
    combatPhase = 'TARGETING';       
    refreshSystemUI(); 
    if (typeof drawGrid === 'function') drawGrid(); 
};
window.executeTargetAction = function(tx, ty) {
    if (activeTargetIndex === -1) return;
    
    combatPhase = 'WAITING_FOR_SERVER'; 
    
    // Route Weapon Specials vs Consumables!
    if (activeTargetIndex === 'weapon') {
        socket.emit('dispatchCombatAction', { actionCategory: 'weapon', subType: 'special', tx: tx, ty: ty });
    } else {
        socket.emit('dispatchCombatAction', { actionCategory: 'consumable', invIndex: activeTargetIndex, tx: tx, ty: ty });
    }
    
    activeTargetIndex = -1;
    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid();
};

window.cancelTarget = function() {
    activeTargetIndex = -1;
    combatPhase = 'PHASE_2'; 
    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid(); 
};

// === POST-COMBAT LOOT GUI ENGINE ===

function showLootScreen() {
    document.getElementById("loot-screen").style.display = "block";
    refreshLootUI();
    animateCombatRewards(); // <--- Triggers the new animation!
}

// === NEW: XP BAR ANIMATOR ===
function animateCombatRewards() {
    let goldDisplay = document.getElementById("loot-gold-reward");
    let xpDisplay = document.getElementById("loot-xp-reward");
    let xpBar = document.getElementById("loot-xp-bar");
    let xpText = document.getElementById("loot-xp-text");

    let targetGold = player.pendingGold || 0;
    let targetXp = player.pendingXp || 0;

    if (goldDisplay) goldDisplay.innerText = `+${targetGold}g`;
    if (xpDisplay) xpDisplay.innerText = `+${targetXp} XP`;

    if (!xpBar || !xpText) return;

    let currentXp = player.xp || 0;
    let currentLevel = player.level || 1;
    let xpToNext = calculateNextLevelXp(currentLevel);

    // If max level, freeze the bar
    if (currentLevel >= MAX_PLAYER_LEVEL) {
        xpText.innerText = `Lvl ${MAX_PLAYER_LEVEL} (MAX)`;
        xpBar.style.width = `100%`;
        xpBar.style.background = `linear-gradient(90deg, #f1c40f, #e67e22)`; // Gold max level bar
        return;
    }

    xpText.innerText = `Lvl ${currentLevel}: ${Math.floor(currentXp)}/${xpToNext}`;
    xpBar.style.width = `${(currentXp / xpToNext) * 100}%`;

    if (targetXp > 0) {
        let ticks = 45; 
        let xpPerTick = targetXp / ticks;
        let tickCount = 0;

        let animInterval = setInterval(() => {
            if (currentLevel >= MAX_PLAYER_LEVEL) {
                clearInterval(animInterval);
                return;
            }

            currentXp += xpPerTick;

            if (currentXp >= xpToNext) {
                currentXp -= xpToNext;
                currentLevel++;
                
                // === GRANT NEW SKILL POINTS ===
                player.skillPoints = (player.skillPoints || 0) + SP_PER_LEVEL;
                
                if (currentLevel >= MAX_PLAYER_LEVEL) {
                    currentXp = 0;
                    xpToNext = "MAX";
                    xpText.innerText = `Lvl ${MAX_PLAYER_LEVEL} (MAX)`;
                    xpBar.style.width = `100%`;
                    xpBar.style.background = `linear-gradient(90deg, #f1c40f, #e67e22)`;
                    if (typeof playRetroSound === 'function') playRetroSound('statUp');
                    clearInterval(animInterval);
                    return;
                }

                xpToNext = calculateNextLevelXp(currentLevel);
                if (typeof playRetroSound === 'function') playRetroSound('statUp'); 
            } else if (tickCount % 3 === 0) {
                if (typeof playRetroSound === 'function') playRetroSound('xpTick');
            }

            if (currentLevel < MAX_PLAYER_LEVEL) {
                xpText.innerText = `Lvl ${currentLevel}: ${Math.floor(currentXp)}/${xpToNext}`;
                xpBar.style.width = `${(currentXp / xpToNext) * 100}%`;
            }

            tickCount++;
            if (tickCount >= ticks) clearInterval(animInterval);
        }, 30);
    }
}

function refreshLootUI() {
    const container = document.getElementById("loot-container");
    container.innerHTML = "";

    if (pendingLoot.length === 0) {
        container.innerHTML = "<div style='text-align:center; color:#776c62; font-size: 12px; margin-top: 30px;'>No items dropped during this deployment.</div>";
        return;
    }

    pendingLoot.forEach((item, idx) => {
        let rc = item.rarity === "Gorilla" ? "GorillaTier" : item.rarity;
        let imgUrl = typeof getItemSpriteURL === 'function' ? getItemSpriteURL(item) : "";
        let imgHtml = imgUrl ? `<img src="${imgUrl}" style="width:28px;height:28px;image-rendering:pixelated;margin-right:8px;vertical-align:middle;">` : ``;
        
        let sellValue = item.value || 5;

        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#221a14; padding:8px; border-radius:4px; border: 1px dashed #634e3d;">
                <div style="font-size: 12px;">
                    ${imgHtml}<span class="${rc}" style="cursor:help;" onmouseenter="showTooltip(getItemTooltip(pendingLoot[${idx}]), event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">[${item.slot.toUpperCase()}] ${item.name}</span>
                </div>
                <div style="display:flex; gap: 6px;">
                    <button onclick="takeLoot(${idx})" style="background: #27ae60; padding: 4px 8px; font-size: 11px;">🎒 Take</button>
                    <button onclick="sellLoot(${idx}, ${sellValue})" style="background: #e67e22; padding: 4px 8px; font-size: 11px;">💰 Sell (${sellValue}g)</button>
                </div>
            </div>
        `;
    });
	if (typeof ClientDirector !== 'undefined') ClientDirector.applyLootScreenLocks();
}
function takeLoot(idx) {
    if (player.inventory.length >= (player.maxInventorySlots || 5)) {
        logMessage("❌ Backpack is full! Sell items or expand capacity.");
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }
    // Ask the server to securely move the item from escrow to inventory
    socket.emit('takePendingLoot', idx);
}

function sellLoot(idx, value) {
    // Ask the server to securely sell the item from escrow
    socket.emit('sellPendingLoot', idx);
}

// === UPDATED: FINALIZE LOOTING ===
function finishLooting() {
    if (pendingLoot.length > 0) {
        let confirmLeave = confirm("You have items left behind. They will be discarded. Return to town anyway?");
        if (!confirmLeave) return;
    }
    
    // Ask server to finalize rewards, level ups, and unlocks!
    socket.emit('claimCombatRewards');

    pendingLoot = []; 
    document.getElementById("loot-screen").style.display = "none";
    // NOTE: We deleted transitionToTown() from here!
}

// === REPLACED ===
// === NEW: TRUE PATHFINDING MOVEMENT VALIDATOR (OPTIMIZED CACHE) ===
// A self-cleaning memory cache that prevents the browser from doing heavy math!
let moveCache = { x: -1, y: -1, turn: '', speed: -1, buffs: '', tiles: new Set() };

function isValidPlayerMovePath(targetX, targetY) {
    let currentSpeed = getPlayerSwiftness(); // (Note: player.js securely routes this alias to the new 'speed' stat!)
    
    // Convert the array into a flat string so the engine can easily detect changes
    let currentBuffs = (player.activeBuffs || []).join(',');
    
    // If the player moves, the turn swaps, speed changes, OR a visual buff is applied/removed... wipe the cache!
    if (moveCache.x !== player.x || 
        moveCache.y !== player.y || 
        moveCache.turn !== currentTurn || 
        moveCache.speed !== currentSpeed ||
        moveCache.buffs !== currentBuffs) {
        
        moveCache.x = player.x;
        moveCache.y = player.y;
        moveCache.turn = currentTurn;
        moveCache.speed = currentSpeed; 
        moveCache.buffs = currentBuffs; // <--- STORE THE NEW VISUAL STATE
        moveCache.tiles = new Set();
        
        let maxRange = currentSpeed; 
        let queue = [{ x: player.x, y: player.y, dist: 0 }];
        let visited = new Set([`${player.x},${player.y}`]);
// ============================================
        
       let dirs = [
            {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0},
            {x: -1, y: -1}, {x: 1, y: -1}, {x: 1, y: 1}, {x: -1, y: 1} 
        ];

        // === THE FIX: SAFELY EXTRACT BOUNDARIES ===
        let cols = currentGridSize.cols || currentGridSize || 8;
        let rows = currentGridSize.rows || currentGridSize || 8;
		
        let blockedSet = new Set();
        mapObstacles.forEach(o => blockedSet.add(`${o.x},${o.y}`));
        enemies.forEach(e => {
            if (e.alive) {
                let s = e.size || 1;
                for (let bx = e.x; bx < e.x + s; bx++) {
                    for (let by = e.y; by < e.y + s; by++) blockedSet.add(`${bx},${by}`);
                }
            }
        });
        [...(allies || []), ...(rogues || [])].forEach(actor => {
            if (actor.alive && actor.blocksMovement !== false) {
                let s = actor.size || 1;
                for (let bx = actor.x; bx < actor.x + s; bx++) {
                    for (let by = actor.y; by < actor.y + s; by++) blockedSet.add(`${bx},${by}`);
                }
            }
        });

        while (queue.length > 0) {
            let curr = queue.shift();
            moveCache.tiles.add(`${curr.x},${curr.y}`);
            
            if (curr.dist >= maxRange) continue;

            for (let d of dirs) {
                let nx = curr.x + d.x; 
                let ny = curr.y + d.y;
                let key = `${nx},${ny}`;

                if (!visited.has(key) && nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    if (!blockedSet.has(key)) {
                        visited.add(key);
                        queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
                    }
                }
            }
        }
    }
    
    // Instantly return the cached answer!
    return moveCache.tiles.has(`${targetX},${targetY}`);
}
// === THE PHASE CONTROLLER ===
function advancePhase() {
    if (combatPhase === 'PHASE_1' || combatPhase === 'MOVE') {
        combatPhase = 'PHASE_2';
    } else if (combatPhase === 'PHASE_2' || combatPhase === 'ACTION' || combatPhase === 'WAITING_FOR_SERVER') {
        // === THE FIX: Advance from the Server Lock into Phase 3 ===
        combatPhase = 'PHASE_3';
    } else if (combatPhase === 'PHASE_3' || combatPhase === 'MOVE_2') {
        endPlayerTurn();
    }
    
    refreshSystemUI(); // Updates the HTML buttons & health bars
    
    // === NEW: THE MASTER CANVAS REDRAW ===
    if (typeof drawGrid === 'function') {
        drawGrid();
    }
}

// === RESTORED TRANSITION FUNCTION ===
window.transitionToTown = function() {
    if (typeof setGameState === 'function') {
        setGameState('TOWN');
    }
    
    // Failsafe cleanup of combat states
    if (typeof hideTooltip === 'function') hideTooltip();
    
    // Reset combat screen visibility elements
    const combatScreen = document.getElementById('combat-screen');
    if (combatScreen) combatScreen.style.display = 'none';
    
    const mainGameContainer = document.getElementById('main-game-container');
    if (mainGameContainer) mainGameContainer.style.display = 'flex';
    
    logMessage("🏕️ Returned safely to Town.");
    if (typeof playRetroSound === 'function') playRetroSound('door');
}
