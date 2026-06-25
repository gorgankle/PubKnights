// --- COMBAT CORE MECHANICS & ACTIONS ---

let activeBombIndex = -1;
let previousCombatPhase = 'PHASE_1';
let pendingLoot = [];

// Properly declare pathfinding tracking variables globally at the top
let moveCache = { x: -1, y: -1, turn: '', tiles: new Set() };
let reachableTiles = null;

// === NEW: CONTESTED PVP/PVE HIT CALCULATOR ===
function calculateHitResult(attackerAcc, defenderRes, attackerPower) {
    let totalStatPool = attackerAcc + defenderRes;
    let hitChance = attackerAcc / totalStatPool;
    let isHit = Math.random() < hitChance;

    if (!isHit) {
        return { hit: false, damage: 0 };
    }

    let minDamage = Math.ceil(attackerPower * 0.2);
    let maxDamage = attackerPower;
    let varianceDamage = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;

    return { hit: true, damage: varianceDamage };
}

function getWeaponSpecialDesc(item) {
    if (!item || item.slot !== "weapon") return "";
    let wType = item.type || "Mace";
    
    if (item.rarity === "Gorilla") return "🦍 Primate Cataclysm: 4x Damage, Ignores Resilience (15 Staminer)";
    if (wType === "Axe") return "🌲 Heavy Chop: 1.5x Damage (15 Staminer)";
    if (wType === "Mace") return "🍻 Heavy Bash: 1.5x Damage (15 Staminer)";
    if (wType === "Club") return "💫 Crushing Blow: 1.5x Damage (15 Staminer)";
    if (wType === "Spear") return "🗡️ Lunge Strike: 1.2x Damage (15 Staminer)";
    if (wType === "Sword") return "🔪 Deep Slice: 1.2x Damage (15 Staminer)";
    return "⚔️ Special Attack (15 Staminer)";
}

// --- UNIFIED COMBAT DISPATCHER ---
function dispatchCombatAction(category, payload = {}) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER') return;

    switch (category) {
        case 'attack':
            if (combatPhase !== 'PHASE_2') {
                if (typeof logMessage === 'function') logMessage("❌ Tactical Error: Attacks can only be performed in Phase 2."); 
                if (typeof playRetroSound === 'function') playRetroSound('error'); 
                return;
            }
            if (!selectedEnemy || !selectedEnemy.alive) return;
            
            let staminaCost = payload.subType === 'special' ? 15 : 5;
            if (player.stamina < staminaCost) {
                if (typeof logMessage === 'function') logMessage(`❌ Legs are too heavy. Not enough stamina (${staminaCost} required).`);
                if (typeof playRetroSound === 'function') playRetroSound('error');
                return;
            }
            
            let range = (player.equipment.weapon && player.equipment.weapon.attackRange) || 1;
            let dist = getGridDistance(player.x, player.y, selectedEnemy.x, selectedEnemy.y, selectedEnemy.size || 1);
            
            if (dist > range) { 
                if (typeof logMessage === 'function') logMessage("❌ Target outside weapon scope range."); 
                if (typeof playRetroSound === 'function') playRetroSound('error'); 
                return; 
            }
            
            if (typeof triggerPlayerAttackAnimation === 'function') triggerPlayerAttackAnimation();
            
            payload.target = { 
                uid: selectedEnemy.uid, 
                id: selectedEnemy.id,
                x: selectedEnemy.x, 
                y: selectedEnemy.y, 
                resilience: selectedEnemy.resilience 
            };
            break;

        case 'throw_bomb':
            if (combatPhase !== 'TARGET_BOMB') return;
            break;

        case 'item':
            window.combatSubmenuState = 'MAIN'; 
            break;
            
        case 'end_turn':
            break;
    }

    socket.emit('combatAction', { category, ...payload });
}

function prepBomb(invIndex) {
    activeBombIndex = invIndex;
    previousCombatPhase = combatPhase;
    combatPhase = 'TARGET_BOMB';
    refreshSystemUI();
    logMessage("🎯 Select a tile to throw the keg bomb.");
}

function cancelBomb() {
    combatPhase = previousCombatPhase;
    activeBombIndex = -1;
    refreshSystemUI();
    logMessage("↩️ Bomb throw cancelled.");
}

// === NEW: TRUE PATHFINDING MOVEMENT VALIDATOR (OPTIMIZED CACHE) ===
function isValidPlayerMovePath(targetX, targetY) {
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
    
    return moveCache.tiles.has(`${targetX},${targetY}`);
}

function getPlayerSwiftness() {
    let base = 3; 
    let boots = player.equipment.boots;
    let swiftFromBoots = (boots && boots.moveBonus) ? boots.moveBonus : 0;
    let armor = player.equipment.armor;
    let movePenalty = (armor && armor.moveBonus) ? armor.moveBonus : 0;
    
    return Math.max(1, base + swiftFromBoots + movePenalty);
}