// --- COMBAT CORE MECHANICS & ACTIONS ---

let activeBombIndex = -1;
let previousCombatPhase = 'PHASE_1';
let pendingLoot = []; // <--- NEW: Temporary array for post-combat loot

function getWeaponSpecialDesc(item) {
    if (!item || item.slot !== "weapon") return "";
    let wType = item.type || "Mace";
    
    if (item.rarity === "Gorilla") return `<b>[Primate Cataclysm]:</b> Unleashes a crushing blow dealing 4.0x damage (${Math.floor(getPlayerTotalPower()*4)} DMG). Ignores resilience mechanics entirely.`;
    
    // === NEW: AXE SKILL DESCRIPTION ===
    if (wType === "Axe") return `<b>[Execute]:</b> Brings down a devastating vertical chop producing 1.5x standard power (${Math.floor(getPlayerTotalPower()*1.5)} DMG).`;
    
    if (wType === "Mace" || wType === "Club") return `<b>[Heavy Smash]:</b> Converts weight momentum into a heavy attack producing 1.5x standard power (${Math.floor(getPlayerTotalPower()*1.5)} DMG).`;
    
    return `<b>[Flurry]:</b> Strike rapidly targeting weak structural thresholds for 1.2x weapon value.`;
}

function transitionToTown() { 
    gameState = 'KNIGHT'; 
    player.idleJob = 'TAVERN'; // Auto-heal after returning from combat
    selectedEnemy = null; 
    player.mapBaited = false; 
    player.activeCombatBuff = null;
    pendingMove = null; player.cellarsChummed = false;
    
    // === SYNC UI TO MAX UNLOCKED LEVEL ===
    player.selectedWildernessLevel = player.wildernessLevel;
    player.selectedCellarLevel = player.cellarLevel;

    if (player.maxStamina) player.stamina = player.maxStamina; 
    
    saveGame(); refreshSystemUI(); 
    window.scrollTo(0, 0);
}

function advancePhase() {
	reachableTiles = null;
    if (combatPhase === 'PHASE_1') combatPhase = 'PHASE_2';
    else if (combatPhase === 'PHASE_2') combatPhase = 'PHASE_3';
    else if (combatPhase === 'PHASE_3') {
        endPlayerTurn();
        return;
    }
    pendingMove = null;
    refreshSystemUI();
}

function executeCombatAction(actionType) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER' || combatPhase === 'TARGET_BOMB') return;

    // --- SERVER-AUTHORITATIVE ACTIONS (Pass, Slash, Special) ---
    if (actionType === 'end' || actionType === 'slash' || actionType === 'special') {
        
// Client-side visual/range checks before bothering the server
        if (actionType === 'slash' || actionType === 'special') {
            if (combatPhase !== 'PHASE_2') {
                logMessage("❌ Tactical Error: Attacks can only be performed in Phase 2."); 
                if (typeof playRetroSound === 'function') playRetroSound('error'); 
                return;
            }
            if (!selectedEnemy || !selectedEnemy.alive) return;
            
            // === NEW: STRICT STAMINA CHECK ===
            let staminaCost = actionType === 'special' ? 15 : 5;
            if (player.stamina < staminaCost) {
                logMessage(`❌ Legs are too heavy. Not enough stamina (${staminaCost} required).`);
                if (typeof playRetroSound === 'function') playRetroSound('error');
                return;
            }
            
            let range = (player.equipment.weapon && player.equipment.weapon.attackRange) || 1;
            let dist = getGridDistance(player.x, player.y, selectedEnemy.x, selectedEnemy.y, selectedEnemy.size || 1);
            
            if (dist > range) { logMessage("❌ Target outside weapon scope range."); if (typeof playRetroSound === 'function') playRetroSound('error'); return; }
            
            let losClear = false; let sSize = selectedEnemy.size || 1;
            for (let bx = selectedEnemy.x; bx < selectedEnemy.x + sSize; bx++) {
                for (let by = selectedEnemy.y; by < selectedEnemy.y + sSize; by++) {
                    if (hasLineOfSight(player.x, player.y, bx, by)) losClear = true;
                }
            }
            if (!losClear) { logMessage("❌ Line of sight blocked by obstruction."); if (typeof playRetroSound === 'function') playRetroSound('error'); return; }
            
            if (typeof triggerPlayerAttackAnimation === 'function') triggerPlayerAttackAnimation();
        }

// Beam the action to the Node server!
        socket.emit('combatAction', { 
            actionType: actionType, 
            targetEnemy: selectedEnemy ? { 
                resilience: selectedEnemy.resilience,
                x: selectedEnemy.x,   // <--- ADD THIS
                y: selectedEnemy.y,   // <--- ADD THIS
                id: selectedEnemy.id  // <--- ADD THIS (Good for failsafes)
            } : null 
        });
        
        // Halt the browser! Do NOT call advancePhase() here.
        return; 
    }
}

function endPlayerTurn() { 
    currentTurn = 'ENEMY'; 
    combatPhase = 'PHASE_1'; 
    selectedEnemy = null; 
    pendingMove = null; 
    refreshSystemUI(); 
    
    // Pass control securely to the Server AI, and sync our final X/Y position!
    socket.emit('endPlayerTurn', { playerPos: { x: player.x, y: player.y } });
}

function handleCombatEquip(idx) {
    socket.emit('combatItemAction', { action: 'equip', index: idx });
}

function consumeBrew(invIndex) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER' || combatPhase === 'TARGET_BOMB') return;
    
    // We do NO math here. We just ask the server to handle the potion!
    socket.emit('combatItemAction', { action: 'brew', index: invIndex });
}

function prepBomb(invIndex) {
    if (combatPhase !== 'PHASE_2') {
        logMessage("❌ Tactical Error: Bombs can only be thrown during Phase 2.");
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }

    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER') return;
    let bomb = player.inventory[invIndex];
    if (!bomb || bomb.type !== 'bomb') return;
    previousCombatPhase = combatPhase;
    combatPhase = 'TARGET_BOMB';
    activeBombIndex = invIndex;
    logMessage(`🎯 Targeting ${bomb.name}. Click a tile to detonate a 3x3 blast area.`);
    refreshSystemUI(); 
}

function cancelBomb() {
    combatPhase = previousCombatPhase;
    activeBombIndex = -1;
    refreshSystemUI(); 
}

function executeBombThrow(tx, ty) {
    if (activeBombIndex < 0 || activeBombIndex >= player.inventory.length) return;
    
    // Ask server to authorize the throw and calculate the damage
    socket.emit('bombAction', { invIndex: activeBombIndex, tx: tx, ty: ty });
    
    // Clear the targeting phase immediately so they can't spam clicks
    activeBombIndex = -1;
    combatPhase = previousCombatPhase;
    refreshSystemUI(); 
}

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

        // === NEW: SAFE INITIALIZATION FOR THE UI ANIMATOR ===
        let currentXp = player.xp || 0;
        let currentLevel = player.level || 1;
        let xpToNext = player.xpToNext || 100;

        xpText.innerText = `Lvl ${currentLevel}: ${Math.floor(currentXp)}/${xpToNext}`;
        xpBar.style.width = `${(currentXp / xpToNext) * 100}%`;

        if (targetXp > 0) {
        let ticks = 45; // Smooth 45-frame animation
        let xpPerTick = targetXp / ticks;
        let tickCount = 0;

        let animInterval = setInterval(() => {
            currentXp += xpPerTick;

            // Handle visual level up mid-animation!
            if (currentXp >= xpToNext) {
                currentXp -= xpToNext;
                currentLevel++;
                let base = 100; let multiplier = Math.pow(1.15, currentLevel - 1); let flatBump = currentLevel * 50;
                xpToNext = Math.floor((base * multiplier) + flatBump);
                if (typeof playRetroSound === 'function') playRetroSound('statUp'); // Play the "Ding!"
            } else if (tickCount % 3 === 0) {
                // Play rapid ticking sound
                if (typeof playRetroSound === 'function') playRetroSound('xpTick');
            }

            xpText.innerText = `Lvl ${currentLevel}: ${Math.floor(currentXp)}/${xpToNext}`;
            xpBar.style.width = `${(currentXp / xpToNext) * 100}%`;

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

// === NEW: TRUE PATHFINDING MOVEMENT VALIDATOR (OPTIMIZED CACHE) ===
// A self-cleaning memory cache that prevents the browser from doing heavy math!
let moveCache = { x: -1, y: -1, turn: '', tiles: new Set() };

function isValidPlayerMovePath(targetX, targetY) {
    
    // If the player moved or the turn swapped to the enemy, automatically wipe the cache and recalculate!
    if (moveCache.x !== player.x || moveCache.y !== player.y || moveCache.turn !== currentTurn) {
        moveCache.x = player.x;
        moveCache.y = player.y;
        moveCache.turn = currentTurn;
        moveCache.tiles = new Set();
        
        let maxRange = getPlayerSwiftness(); 
        let queue = [{ x: player.x, y: player.y, dist: 0 }];
        let visited = new Set([`${player.x},${player.y}`]);
        
        let dirs = [
            {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0},
            {x: -1, y: -1}, {x: 1, y: -1}, {x: 1, y: 1}, {x: -1, y: 1} 
        ];

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

        while (queue.length > 0) {
            let curr = queue.shift();
            moveCache.tiles.add(`${curr.x},${curr.y}`);
            
            if (curr.dist >= maxRange) continue;

            for (let d of dirs) {
                let nx = curr.x + d.x; 
                let ny = curr.y + d.y;
                let key = `${nx},${ny}`;

                if (!visited.has(key) && nx >= 0 && nx < currentGridSize && ny >= 0 && ny < currentGridSize) {
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