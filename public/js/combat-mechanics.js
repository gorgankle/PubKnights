// --- COMBAT CORE MECHANICS & ACTIONS ---

let activeBombIndex = -1;
let previousCombatPhase = 'PHASE_1';
let pendingLoot = []; 

function calculateHitResult(attackerAcc, defenderRes, attackerPower) {
    let totalStatPool = attackerAcc + defenderRes;
    let hitChance = attackerAcc / totalStatPool; 
    let isHit = Math.random() < hitChance;

    if (!isHit) return { hit: false, damage: 0 };

    let minDamage = Math.ceil(attackerPower * 0.2);
    let maxDamage = attackerPower;
    let varianceDamage = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;

    return { hit: true, damage: varianceDamage };
}

// Data-Driven Special Descriptions
function getWeaponSpecialDesc(item) {
    if (!item || item.slot !== "weapon" || !item.combat || !item.combat.special) return "";
    return `<b>[${item.combat.special.name}]:</b> ${item.combat.special.desc}`;
}

// The Unified Client Dispatcher
function executeCombatAction(actionType) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER' || combatPhase === 'TARGET_BOMB') return;

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
            if (!weapon || !weapon.combat) {
                logMessage("❌ Tactical Error: Invalid weapon profile.");
                return;
            }

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
            
            if (typeof triggerPlayerAttackAnimation === 'function') triggerPlayerAttackAnimation();
        }

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
    combatPhase = 'PHASE_1'; 
    selectedEnemy = null; 
    pendingMove = null; 
    refreshSystemUI(); 
    
    // Pass control securely to the Server AI, and sync our final X/Y position!
    socket.emit('endPlayerTurn', { playerPos: { x: player.x, y: player.y } });
}

function handleCombatEquip(idx) {
    socket.emit('dispatchCombatAction', { actionCategory: 'equip', invIndex: idx });
}

function consumeBrew(invIndex) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER' || combatPhase === 'TARGET_BOMB') return;
    socket.emit('dispatchCombatAction', { actionCategory: 'consumable', invIndex: invIndex });
}

function executeBombThrow(tx, ty) {
    if (activeBombIndex < 0 || activeBombIndex >= player.inventory.length) return;
    
    socket.emit('dispatchCombatAction', { 
        actionCategory: 'consumable', 
        invIndex: activeBombIndex, 
        tx: tx, 
        ty: ty 
    });
    
    activeBombIndex = -1;
    combatPhase = previousCombatPhase;
    refreshSystemUI(); 
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
let moveCache = { x: -1, y: -1, turn: '', swiftness: -1, buffs: '', tiles: new Set() };

function isValidPlayerMovePath(targetX, targetY) {
    let currentSwiftness = getPlayerSwiftness();
    // Convert the array into a flat string so the engine can easily detect changes
    let currentBuffs = (player.activeBuffs || []).join(',');
    
    // If the player moves, the turn swaps, speed changes, OR a visual buff is applied/removed... wipe the cache!
    if (moveCache.x !== player.x || 
        moveCache.y !== player.y || 
        moveCache.turn !== currentTurn || 
        moveCache.swiftness !== currentSwiftness ||
        moveCache.buffs !== currentBuffs) {
        
        moveCache.x = player.x;
        moveCache.y = player.y;
        moveCache.turn = currentTurn;
        moveCache.swiftness = currentSwiftness; 
        moveCache.buffs = currentBuffs; // <--- STORE THE NEW VISUAL STATE
        moveCache.tiles = new Set();
        
        let maxRange = currentSwiftness; 
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
// === THE PHASE CONTROLLER ===
function advancePhase() {
    if (combatPhase === 'PHASE_1' || combatPhase === 'MOVE') {
        combatPhase = 'PHASE_2';
    } else if (combatPhase === 'PHASE_2' || combatPhase === 'ACTION') {
        combatPhase = 'PHASE_3';
    } else if (combatPhase === 'PHASE_3' || combatPhase === 'MOVE_2') {
        endPlayerTurn();
    }
    
    refreshSystemUI(); // Updates the HTML buttons & health bars
    
    // === NEW: THE MASTER CANVAS REDRAW ===
    // This guarantees the physical game board updates instantly 
    // whenever a phase shifts, catching all new buffs, states, and ranges!
    if (typeof drawGrid === 'function') {
        drawGrid();
    }
}ystemUI();
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