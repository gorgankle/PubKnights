// --- RENDERER: CANVAS & GRID SYSTEM (ANIMATION UPGRADE) ---

let hoverTile = {x: -1, y: -1};
let globalAnimClock = 0; // Global engine clock tick count for procedural breathing waves

// === NEW: HARDWARE-ACCELERATED RASTER CACHE ===
const SpriteRasterCache = {};

// === NEW: PLAYER COMPOSITE BUFFER ===
// Used to safely apply clipping masks without punching through the map floor
const playerBufferCanvas = document.createElement('canvas');
const playerBufferCtx = playerBufferCanvas.getContext('2d', { alpha: true });

function drawOptimizedSprite(ctx, spriteKey, matrix, x, y, size) {
    if (!matrix) return;
    
    // 1. If we haven't baked this sprite yet, bake it now!
    if (!SpriteRasterCache[spriteKey]) {
        // Create an invisible canvas in the browser's memory
        const offscreen = document.createElement('canvas');
        offscreen.width = size;
        offscreen.height = size;
        const offCtx = offscreen.getContext('2d', { alpha: true });
        
        // Draw the heavy 576-rectangle math ONCE
        drawProceduralSprite(offCtx, matrix, 0, 0, size);
        
        // Save the finished image to the cache
        SpriteRasterCache[spriteKey] = offscreen;
    }

    // 2. GPU-Stamp the baked image to the main canvas instantly
    ctx.drawImage(SpriteRasterCache[spriteKey], x, y, size, size);
}

// Optional: A helper to clear the cache if the player changes clothes!
window.clearSpriteCache = function(spriteKey) {
    if (spriteKey && SpriteRasterCache[spriteKey]) delete SpriteRasterCache[spriteKey];
    else if (!spriteKey) for (let key in SpriteRasterCache) delete SpriteRasterCache[key];
};


// === NEW: VISUAL EFFECTS ARRAYS ===
let activeProjectiles = [];
let activeExplosions = [];

// === NEW: CLIENT-SIDE LINE OF EFFECT MATH ===
function getLineOfEffectPath(x1, y1, x2, y2, maxRange, stopsAtWalls) {
    let path = [];
    let dx = Math.abs(x2 - x1); let dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1; let sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy; let cx = x1; let cy = y1;
    let distanceTraveled = 0;

    while (distanceTraveled <= maxRange) {
        if (cx !== x1 || cy !== y1) {
            path.push({ x: cx, y: cy });
            // Stop drawing the red line if it hits a rock
            if (stopsAtWalls && mapObstacles.some(o => o.x === cx && o.y === cy)) break; 
        }
        if (cx === x2 && cy === y2) break; 
        
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
        distanceTraveled++;
    }
    return path;
}

function getActiveFloorSpriteId(tileX, tileY) {
    if (typeof activeCombatFloorTiles !== 'undefined' && activeCombatFloorTiles.length) {
        const floorTile = activeCombatFloorTiles.find(tile => tile.x === tileX && tile.y === tileY);
        if (floorTile && floorTile.spriteId) return floorTile.spriteId;
    }
    if (typeof activeCombatFloorSpriteId !== 'undefined' && activeCombatFloorSpriteId) {
        return activeCombatFloorSpriteId;
    }
    if (activeCombatZone === 'CELLARS') return 'ground_cellars';
    if (activeCombatZone === 'GORILLA_ARENA') return 'ground_arena';
    if (activeCombatZone === 'ABYSS') return 'ground_abyss';
    return 'ground_wilderness';
}

function drawSingleCombatAura(aura, gridX, gridY, size = 1, layerOffset = 0) {
    if (!aura || aura.style !== "rise") return;

    const colors = aura.colors || ["#ffffff"];
    const intensity = aura.intensity || 1;
    const opacity = aura.opacity ?? 0.42;
    const particleCount = Math.max(4, Math.floor(8 * intensity));
    const centerX = (gridX + size / 2) * currentTileSize;
    const baseY = gridY * currentTileSize;
    const spread = currentTileSize * size * 0.55;
    const maxRise = currentTileSize * (0.7 + (aura.radius || 0.2));

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < particleCount; i++) {
        const phase = ((globalAnimClock * 0.018) + (i / particleCount) + layerOffset) % 1;
        const wobble = Math.sin(globalAnimClock * 0.07 + i * 1.7 + layerOffset * 8) * spread * 0.16;
        const px = centerX + (((i / Math.max(1, particleCount - 1)) - 0.5) * spread) + wobble;
        const py = baseY + currentTileSize * 0.86 - (phase * maxRise);
        const radius = Math.max(2, currentTileSize * (aura.radius || 0.2) * (0.25 + phase * 0.35));

        ctx.globalAlpha = (1 - phase) * opacity;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function collectCombatAuras(target) {
    const auras = [];
    const poison = target && target.statusEffects && target.statusEffects.poison;
    if (poison) {
        const poisonAura = poison.aura || (typeof AuraDatabase !== 'undefined' ? AuraDatabase[poison.auraId || 'poison'] : null);
        if (poisonAura) auras.push(poisonAura);
    }

    if (target && Array.isArray(target.activeBuffs) && typeof AuraDatabase !== 'undefined') {
        target.activeBuffs.forEach(buffId => {
            const aura = AuraDatabase[buffId];
            if (aura) auras.push(aura);
        });
    }

    return auras;
}

function drawCombatAura(target, gridX, gridY, size = 1) {
    collectCombatAuras(target).forEach((aura, index) => {
        drawSingleCombatAura(aura, gridX, gridY, size, index * 0.19);
    });
}


// === ENGINE HEARTBEAT LOOP ===
function updateAnimationEngine() {
    requestAnimationFrame(updateAnimationEngine);
    globalAnimClock++;
    
    // Otherwise, run the normal tactical game
    if (gameState === 'COMBAT') {
        drawGrid(); 
    } 
}




function drawGrid() {
    if (gameState !== 'COMBAT') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let moveRange = getPlayerSwiftness(); 
	// === DYNAMIC TARGETING ENGINE ===
    let currentTargetRange = (player.equipment.weapon && player.equipment.weapon.combat && player.equipment.weapon.combat.standard.range) || 1;
    let currentIgnoresLoS = false; 

    // THE FIX: If we are actively targeting with an item, override the melee weapon's range!
    if (combatPhase === 'TARGETING' && typeof activeTargetIndex !== 'undefined' && activeTargetIndex !== -1) {
        let activeItem = activeTargetIndex === 'weapon' ? player.equipment.weapon : player.inventory[activeTargetIndex];
        if (activeItem && activeItem.combat) {
            if (activeItem.combat.actionType === 'spell') {
                let spellData = typeof SpellDatabase !== 'undefined' ? SpellDatabase[activeItem.combat.spellId] : null;
                if (spellData) { 
                    currentTargetRange = spellData.range || 4; 
                    currentIgnoresLoS = spellData.ignoresLoS || false; 
                }
            } else {
                currentTargetRange = activeItem.combat.range || 4;
                currentIgnoresLoS = activeItem.combat.ignoresLoS || false;
            }
        }

    }


    // --- INTERPOLATION ENGINE: PLAYER ---

// === NEW: PLAYER ATB VISUAL MATH ===
    if (player.visualAtb === undefined) player.visualAtb = 0;
    if (combatPhase === 'WAITING_FOR_ATB') {
        let pSpeed = (getPlayerSwiftness() * 3) + 5; // Matches server buff
        player.visualAtb += (pSpeed * 5) / 60; 
        if (player.visualAtb > 100) player.visualAtb = 100;
    } else {
        player.visualAtb = 100; // Remains full during their active turn
    }

	
    if (player.visualX === undefined) {
        player.visualX = player.x; player.visualY = player.y;
        player.moveAnimTimer = 0; 
    }
    
    let pDeltaX = player.x - player.visualX;
    let pDeltaY = player.y - player.visualY;
    let pIsMoving = Math.abs(pDeltaX) > 0.01 || Math.abs(pDeltaY) > 0.01;
    
    if (pIsMoving) {
        player.visualX += pDeltaX * 0.15; 
        player.visualY += pDeltaY * 0.15;
        player.moveAnimTimer += 0.25;     
    } else {
        player.visualX = player.x; player.visualY = player.y; player.moveAnimTimer = 0;
    }
    let playerHopY = Math.abs(Math.sin(player.moveAnimTimer)) * 14; 

// --- DRAW THE CORE TACTICAL GRID ---
    let cols = currentGridSize.cols || currentGridSize || 8;
    let rows = currentGridSize.rows || currentGridSize || 8;

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            
            let groundSprite = getActiveFloorSpriteId(x, y);
            if (!SpriteMatrices[groundSprite]) groundSprite = 'ground_wilderness';
            
if (SpriteMatrices[groundSprite]) {
    drawOptimizedSprite(ctx, groundSprite, SpriteMatrices[groundSprite], x * currentTileSize, y * currentTileSize, currentTileSize);
}

            ctx.strokeStyle = activeCombatZone==='GORILLA_ARENA' ? "#443425" : "#3a2f26";
            ctx.lineWidth = 1; ctx.strokeRect(x * currentTileSize, y * currentTileSize, currentTileSize, currentTileSize);
            
            if (currentTurn === 'PLAYER') {
                if (combatPhase === 'PHASE_1' || combatPhase === 'PHASE_3') {
                    
                    // === THE FIX: DIRECT SMART CACHE HOOK ===
                    // The renderer now instantly asks the combat-mechanics engine if the tile is valid!
                    if (isValidPlayerMovePath(x, y)) {
                        ctx.fillStyle = "rgba(52, 152, 219, 0.20)"; 
                        ctx.fillRect(x * currentTileSize, y * currentTileSize, currentTileSize, currentTileSize);
                    }
                    
                    if (pendingMove && pendingMove.x === x && pendingMove.y === y) {
                        ctx.fillStyle = "rgba(46, 204, 113, 0.4)";
                        ctx.fillRect(x * currentTileSize, y * currentTileSize, currentTileSize, currentTileSize);
                        ctx.strokeStyle = "#2ecc71"; ctx.lineWidth = 2;
                        ctx.strokeRect(x * currentTileSize, y * currentTileSize, currentTileSize, currentTileSize);

                        let dist = getGridDistance(player.x, player.y, x, y);
                        let swiftness = getPlayerSwiftness(); 
                        let estCost = Math.floor((dist / swiftness) * 10);
                        
                        let fontSize = currentGridSize > 10 ? 10 : 14;
                        ctx.font = `bold ${fontSize}px Courier New`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                        ctx.fillStyle = "#f1c40f"; ctx.shadowColor = "#000"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
                        ctx.fillText(`-${estCost}⚡`, x * currentTileSize + (currentTileSize / 2), y * currentTileSize + (currentTileSize / 2));
                        
                        ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
                        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
                    }
                }
               // === UNIFIED ACTION RENDERING (MELEE, MAGIC, & BOMBS) ===
                else if (combatPhase === 'PHASE_2' || combatPhase === 'TARGETING') {
                    
                    // 2. Draw the Grid (Using the dynamically calculated currentTargetRange)
                    if (Math.max(Math.abs(x - player.x), Math.abs(y - player.y)) <= currentTargetRange) {
                        
                        // THE FIX: If it ignores LoS, it's always Yellow!
                        if (currentIgnoresLoS || hasLineOfSight(player.x, player.y, x, y)) {
                            ctx.fillStyle = "rgba(241, 196, 15, 0.15)"; // Valid Yellow
                        } else {
                            ctx.fillStyle = "rgba(200, 0, 0, 0.15)"; // Blocked Red
                        }
                        
                        ctx.fillRect(x * currentTileSize, y * currentTileSize, currentTileSize, currentTileSize);
                    }
                }
            }
        }
    }
    
mapObstacles.forEach(o => {
        if (o.spriteId && SpriteMatrices[o.spriteId]) {
            // === GPU RASTER SWAP ===
            drawOptimizedSprite(ctx, o.spriteId, SpriteMatrices[o.spriteId], o.x * currentTileSize, o.y * currentTileSize, currentTileSize);
        } else {
            ctx.fillStyle = "#504035"; ctx.fillRect(o.x * currentTileSize + 2, o.y * currentTileSize + 2, currentTileSize - 4, currentTileSize - 4);
            ctx.fillStyle = "#888"; ctx.font = `14px Courier New`; ctx.fillText(o.icon || "🪨", o.x * currentTileSize + (currentTileSize/2) - 7, o.y * currentTileSize + (currentTileSize/2) + 5);
        }
    });

// --- RENDERING PIPELINE: DYNAMIC TRANSFORMS KNIGHT ---
    ctx.save();
    
    let pScaleY = 1.0 + Math.sin(globalAnimClock * 0.08) * 0.02;
    let pScaleX = 1.0 - Math.sin(globalAnimClock * 0.08) * 0.01;

    // === NEW: DYNAMIC LUNGE OFFSETS ===
    const pX = (player.visualX * currentTileSize) + (player.lungeOffsetX || 0);
    const pY = (player.visualY * currentTileSize) - playerHopY + (player.lungeOffsetY || 0) - (player.lungeHop || 0);
	
    // Notice we removed 'let' here so it simply updates your existing variables
    pPivotX = pX + currentTileSize / 2; 
    pPivotY = pY + currentTileSize;
    
    ctx.translate(pPivotX, pPivotY); 
    ctx.scale(pScaleX, pScaleY); 
    ctx.translate(-pPivotX, -pPivotY);

    // === NEW: RENDER BODY TO BUFFER FIRST FOR MASKING ===
    playerBufferCanvas.width = currentTileSize;
    playerBufferCanvas.height = currentTileSize;
    playerBufferCtx.clearRect(0, 0, currentTileSize, currentTileSize);

    let bodySprite = player.appearance.gender === 'female' ? 'body_female' : 'body_male';
    if (SpriteMatrices[bodySprite]) drawProceduralSprite(playerBufferCtx, SpriteMatrices[bodySprite], 0, 0, currentTileSize);
    if (SpriteMatrices[player.appearance.eyes]) drawProceduralSprite(playerBufferCtx, SpriteMatrices[player.appearance.eyes], 0, 0, currentTileSize);
    
    const hidesHair = player.equipment.helmet && player.equipment.helmet.hidesHair;
    if (!hidesHair && SpriteMatrices[player.appearance.hair]) {
        drawProceduralSprite(playerBufferCtx, SpriteMatrices[player.appearance.hair], 0, 0, currentTileSize);
    }

    const eq = player.equipment; let gSuffix = player.appearance.gender === 'female' ? '_female' : '_male';
    
    if (eq.armor && eq.armor.spriteId) {
        let sId = eq.armor.spriteId + gSuffix;
        if (SpriteMatrices[sId]) drawProceduralSprite(playerBufferCtx, SpriteMatrices[sId], 0, 0, currentTileSize);
        else if (SpriteMatrices[eq.armor.spriteId]) drawProceduralSprite(playerBufferCtx, SpriteMatrices[eq.armor.spriteId], 0, 0, currentTileSize);
    }
    
    if (eq.boots && eq.boots.spriteId && SpriteMatrices[eq.boots.spriteId]) drawProceduralSprite(playerBufferCtx, SpriteMatrices[eq.boots.spriteId], 0, 0, currentTileSize);
    if (eq.gloves && eq.gloves.spriteId && SpriteMatrices[eq.gloves.spriteId]) drawProceduralSprite(playerBufferCtx, SpriteMatrices[eq.gloves.spriteId], 0, 0, currentTileSize);
    if (eq.helmet && eq.helmet.spriteId && SpriteMatrices[eq.helmet.spriteId]) drawProceduralSprite(playerBufferCtx, SpriteMatrices[eq.helmet.spriteId], 0, 0, currentTileSize);

    // Stamp the fully assembled/masked character onto the main canvas
    ctx.drawImage(playerBufferCanvas, pX, pY);
    // ====================================================

    if (eq.weapon && eq.weapon.spriteId && SpriteMatrices[eq.weapon.spriteId]) {
        ctx.save();
        
        // 1. Establish the hand's pivot point (Standard Left Hand / Viewer's Right)
		let wPivotX = pX + (currentTileSize * 0.58);
        let wPivotY = pY + (currentTileSize * 0.5);
        
        // 2. Move the canvas origin to the hand
        ctx.translate(wPivotX, wPivotY);
        
        // 3. Clear hardcoded rotations
        ctx.rotate(0); 
        
        // === 4. THE ENGINE TRICK: SCALE THE CANVAS ===
        let scaleMult = eq.weapon.oversizeScale || 1.0;
        ctx.scale(scaleMult, scaleMult);
        // =============================================

        // 5. Move the origin back so the procedural matrix aligns correctly
        ctx.translate(-wPivotX, -wPivotY);
        
        // 6. Draw the weapon!
        drawProceduralSprite(ctx, SpriteMatrices[eq.weapon.spriteId], pX, pY, currentTileSize);
        ctx.restore();
    }
    

    ctx.restore(); 

drawCombatAura(player, player.visualX, player.visualY - (playerHopY / currentTileSize), 1);

renderGridHealthBar(player.visualX, player.visualY - (playerHopY / currentTileSize), player.hp, getPlayerMaxHp(), 1, player.stamina, getPlayerMaxStamina(), player.visualAtb);

    if (selectedEnemy && selectedEnemy.alive) {
        let sSize = selectedEnemy.size || 1;
        ctx.strokeStyle = "#ff2222"; ctx.lineWidth = 3; 
        ctx.strokeRect(selectedEnemy.x * currentTileSize, selectedEnemy.y * currentTileSize, currentTileSize * sSize, currentTileSize * sSize);
    }

    // --- INTERPOLATION ENGINE: ENEMIES ---
    enemies.forEach(e => {
        if (e.alive) {
            let sSize = e.size || 1;

            // === NEW: ENEMY ATB VISUAL MATH ===
            if (e.visualAtb === undefined) e.visualAtb = 0;
            if (combatPhase === 'WAITING_FOR_ATB') {
                let eSpeed = ((e.speed || 1) * 3) + 5; // Matches server buff
                e.visualAtb += (eSpeed * 5) / 60;
                if (e.visualAtb > 100) e.visualAtb = 100;
            }
            
            if (e.visualX === undefined) {
                e.visualX = e.x; e.visualY = e.y; e.moveAnimTimer = 0; e.attackTimer = 0;
            }
            
            let eDeltaX = e.x - e.visualX; let eDeltaY = e.y - e.visualY;
            let eIsMoving = Math.abs(eDeltaX) > 0.01 || Math.abs(eDeltaY) > 0.01;
            
            if (eIsMoving) {
                e.visualX += eDeltaX * 0.15; e.visualY += eDeltaY * 0.15;
                e.moveAnimTimer += 0.25;
            } else {
                e.visualX = e.x; e.visualY = e.y; e.moveAnimTimer = 0;
            }
            let enemyHopY = Math.abs(Math.sin(e.moveAnimTimer)) * 14;

            ctx.save();
            
            // Retain only the idle breathing animation math
            let eScaleY = 1.0 + Math.sin((globalAnimClock + (e.x * 15)) * 0.07) * 0.02;
            let eScaleX = 1.0 - Math.sin((globalAnimClock + (e.x * 15)) * 0.07) * 0.01;

            // Base positional variables completely stripped of lunge mechanics
            let exPosition = e.visualX * currentTileSize;
            let eyPosition = (e.visualY * currentTileSize) - enemyHopY;

            let ePivotX = exPosition + (currentTileSize * sSize) / 2;
            let ePivotY = eyPosition + (currentTileSize * sSize);
            ctx.translate(ePivotX, ePivotY); ctx.scale(eScaleX, eScaleY); ctx.translate(-ePivotX, -ePivotY);

if (SpriteMatrices[e.id]) {
                // === GPU RASTER SWAP ===
                drawOptimizedSprite(ctx, e.id, SpriteMatrices[e.id], exPosition, eyPosition, currentTileSize * sSize);
            } else {
                ctx.fillStyle = activeCombatZone === 'GORILLA_ARENA' ? "#5c4033" : "#d35400"; 
                ctx.fillRect(exPosition + 1, eyPosition + 1, (currentTileSize * sSize) - 2, (currentTileSize * sSize) - 2);
                let fontScale = currentGridSize > 10 ? "13px" : "20px"; let yOffset = currentGridSize > 10 ? 22 : 36; let xOffset = currentGridSize > 10 ? 9 : 14;
                ctx.fillStyle = "#fff"; ctx.font = `${fontScale} Courier New`; ctx.fillText(e.icon, exPosition + xOffset, eyPosition + yOffset);
            }
            ctx.restore();

            drawCombatAura(e, e.visualX, e.visualY - (enemyHopY / currentTileSize), sSize);

            renderGridHealthBar(e.visualX, e.visualY - (enemyHopY / currentTileSize), e.hp, e.maxHp, sSize, null, null, e.visualAtb);
        }
    });

  // === REPLACED: Dynamic Area of Effect Rendering ===
    if (combatPhase === 'TARGETING' && hoverTile && hoverTile.x >= 0) {
        ctx.fillStyle = "rgba(231, 76, 60, 0.4)"; 
        
        let activeItem = activeTargetIndex === 'weapon' ? player.equipment.weapon : player.inventory[activeTargetIndex];
        let isLineSpell = false;
        let spellRange = 5;
        let ignoresLoS = false;

        // Check if the item we are holding is a line spell
        if (activeItem && activeItem.combat && activeItem.combat.actionType === 'spell') {
            let spellData = typeof SpellDatabase !== 'undefined' ? SpellDatabase[activeItem.combat.spellId] : null;
            if (spellData && spellData.type === 'line') {
                isLineSpell = true;
                spellRange = spellData.range || 5;
                ignoresLoS = spellData.ignoresLoS || false;
            }
        }

      if (isLineSpell) {
            // === DRAW THE BRESENHAM BEAM ===
            let blastPath = getLineOfEffectPath(player.x, player.y, hoverTile.x, hoverTile.y, spellRange, !ignoresLoS);
            blastPath.forEach(tile => {
                ctx.fillRect(tile.x * currentTileSize, tile.y * currentTileSize, currentTileSize, currentTileSize);
            });
        } else {
            // === STANDARD BOMB 3x3 SQUARE ===
            let startX = hoverTile.x - 1; let startY = hoverTile.y - 1;
            for(let bx = startX; bx <= startX + 2; bx++) {
                for(let by = startY; by <= startY + 2; by++) {
                    if (bx >= 0 && bx < cols && by >= 0 && by < rows) {
                        ctx.fillRect(bx * currentTileSize, by * currentTileSize, currentTileSize, currentTileSize);
                    }
                }
            }
        }
    }

    // === NEW: VISUAL FX PARTICLE RENDERER ===
    if (typeof activeExplosions !== 'undefined') {
        for (let i = activeExplosions.length - 1; i >= 0; i--) {
            let p = activeExplosions[i];
            p.life -= p.decay;
            p.radius -= (p.decay * 5); 
            
            if (p.life <= 0 || p.radius <= 0) {
                activeExplosions.splice(i, 1);
                continue;
            }
            
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0; 
        }
    }
    // ========================================

// === THE MISSING HEARTBEAT ===
    // This tells the engine to physically draw the arrows, lunges, and damage text!
    if (typeof FXEngine !== 'undefined') {
        FXEngine.render(ctx, currentTileSize);
    }
    // =============================

} // <--- This bracket closes drawGrid()!

// === REPLACED ===
function renderGridHealthBar(gridX, gridY, currentHp, maximumHp, size = 1, currentStamina = null, maxStamina = null, currentAtb = null) {
    let barWidth = (currentTileSize * size) - 6; 
    let rx = gridX * currentTileSize + 3; 
    let ry = gridY * currentTileSize + 1; 
    
    let hpRatio = Math.max(0, Math.min(1.0, currentHp / maximumHp));
    ctx.fillStyle = "#110d0a"; ctx.fillRect(rx, ry, barWidth, 2);
    ctx.fillStyle = hpRatio > 0.45 ? "#27ae60" : "#c0392b"; ctx.fillRect(rx, ry, barWidth * hpRatio, 2);

    let nextY = ry + 3;
    if (currentStamina !== null && maxStamina !== null) {
        let stRatio = Math.max(0, Math.min(1.0, currentStamina / maxStamina));
        ctx.fillStyle = "#110d0a"; ctx.fillRect(rx, nextY, barWidth, 2);
        ctx.fillStyle = "#e67e22"; ctx.fillRect(rx, nextY, barWidth * stRatio, 2);
        nextY += 3;
    }

    if (currentAtb !== null) {
        let atbRatio = Math.max(0, Math.min(1.0, currentAtb / 100));
        ctx.fillStyle = "#110d0a"; ctx.fillRect(rx, nextY, barWidth, 2);
        ctx.fillStyle = currentAtb >= 100 ? "#f1c40f" : "#3498db"; 
        ctx.fillRect(rx, nextY, barWidth * atbRatio, 2);
    }
}
// ============================================

function buildNpcTooltipHtml(mob) {
    const hp = Number.isFinite(mob.hp) ? mob.hp : 0;
    const maxHp = Number.isFinite(mob.maxHp) ? mob.maxHp : hp;
    const offense = Number.isFinite(mob.offense) ? mob.offense : 0;
    const defense = Number.isFinite(mob.defense) ? mob.defense : 0;
    const speed = Number.isFinite(mob.speed) ? mob.speed : 0;
    const attackRange = Number.isFinite(mob.attackRange) ? mob.attackRange : 1;
    const npcType = mob.type || "ENEMY";

    return `<h3>${mob.name}</h3>` +
           `<b>Type:</b> ${npcType}<br>` +
           `<b>Vitality:</b> ${hp}/${maxHp} HP<br>` +
           `<b>Offense:</b> ${offense}<br>` +
           `<b>Defense:</b> ${defense}<br>` +
           `<b>Speed:</b> ${speed}<br>` +
           `<b>Attack Range:</b> ${attackRange} Tile(s)`;
}

canvas.addEventListener("mouseleave", hideTooltip);
canvas.addEventListener("mousemove", function(e) {
    if (gameState !== 'COMBAT') return;
    const r = canvas.getBoundingClientRect();
    
    // === NEW: MOBILE SCALING MATH ===
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    
    const tx = Math.floor(((e.clientX - r.left) * scaleX) / currentTileSize);
    const ty = Math.floor(((e.clientY - r.top) * scaleY) / currentTileSize);
    // ================================

   let cols = currentGridSize.cols || currentGridSize || 8;
    let rows = currentGridSize.rows || currentGridSize || 8;
    if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) return;

    // === REPLACED: Enforce targeting bounds on hover ===
    if (combatPhase === 'TARGETING') { 
        let activeItem = activeTargetIndex === 'weapon' ? player.equipment.weapon : player.inventory[activeTargetIndex];
        let maxRange = 4;
        let ignoresLoS = false;

        if (activeItem && activeItem.combat) {
            if (activeItem.combat.actionType === 'spell') {
                let spellData = typeof SpellDatabase !== 'undefined' ? SpellDatabase[activeItem.combat.spellId] : null;
                if (spellData) { maxRange = spellData.range || 4; ignoresLoS = spellData.ignoresLoS || false; }
            } else {
                maxRange = activeItem.combat.range || 4;
                ignoresLoS = activeItem.combat.ignoresLoS || false;
            }
        }
        
        // === THE FIX: Calculate the distance before checking it! ===
        let dist = getGridDistance(player.x, player.y, tx, ty);
        
        // Only show the red targeting box if it's a valid, legal throw
        if (dist <= maxRange && (ignoresLoS || hasLineOfSight(player.x, player.y, tx, ty))) {
            hoverTile = {x: tx, y: ty}; 
        } else {
            hoverTile = {x: -1, y: -1}; 
        }
    }

    let mob = enemies.find(em => { let s = em.size || 1; return em.alive && tx >= em.x && tx < em.x + s && ty >= em.y && ty < em.y + s; });
    
    if (mob) {
        showTooltip(buildNpcTooltipHtml(mob), e);
    } else {
        hideTooltip(); 
    }
});

canvas.addEventListener("click", function(e) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER') return;
    const r = canvas.getBoundingClientRect();
    
    // === NEW: MOBILE SCALING MATH ===
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    
    const tx = Math.floor(((e.clientX - r.left) * scaleX) / currentTileSize);
    const ty = Math.floor(((e.clientY - r.top) * scaleY) / currentTileSize);
    // ================================

    let cols = currentGridSize.cols || currentGridSize || 8;
    let rows = currentGridSize.rows || currentGridSize || 8;
    if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) return;

    // === REPLACED: Client-side throw validation ===
    if (combatPhase === 'TARGETING') {
        let activeItem = activeTargetIndex === 'weapon' ? player.equipment.weapon : player.inventory[activeTargetIndex];
        let maxRange = 4;
        let ignoresLoS = false;

        if (activeItem && activeItem.combat) {
            if (activeItem.combat.actionType === 'spell') {
                let spellData = typeof SpellDatabase !== 'undefined' ? SpellDatabase[activeItem.combat.spellId] : null;
                if (spellData) { maxRange = spellData.range || 4; ignoresLoS = spellData.ignoresLoS || false; }
            } else {
                maxRange = activeItem.combat.range || 4;
                ignoresLoS = activeItem.combat.ignoresLoS || false;
            }
        }
        
        // === THE FIX: Calculate the distance before checking it! ===
        let dist = getGridDistance(player.x, player.y, tx, ty);
        
        if (dist <= maxRange && (ignoresLoS || hasLineOfSight(player.x, player.y, tx, ty))) {
            if (typeof executeTargetAction === 'function') executeTargetAction(tx, ty);
        } else {
            logMessage("❌ Target outside of throw range or blocked by obstacles.");
            if (typeof playRetroSound === 'function') playRetroSound('error');
        }
        
        hoverTile = {x: -1, y: -1}; 
        return;
    }
    let clickedMonster = enemies.find(em => { let s = em.size || 1; return em.alive && tx >= em.x && tx < em.x + s && ty >= em.y && ty < em.y + s; });

    if (combatPhase === 'PHASE_1' || combatPhase === 'PHASE_3') {
        if (clickedMonster) {
            logMessage("❌ Tactical Error: You can only attack during Phase 2."); playRetroSound('error'); return;
        }

        if (tx === player.x && ty === player.y) { 
            if (pendingMove && pendingMove.x === tx && pendingMove.y === ty) {
                logMessage("🏃 Stood ground. Skipping phase."); 
                pendingMove = null;
                if (typeof advancePhase === 'function') advancePhase(); 
            } else {
                pendingMove = {x: tx, y: ty};
                logMessage("📍 Stance marked. Click yourself again to confirm holding position (Pass Phase).");
            }
            return; 
        }
        
if (isValidPlayerMovePath(tx, ty)) {
            // Note: We removed the manual mapObstacles check because isValidPlayerMovePath handles it!
            
            if (pendingMove && pendingMove.x === tx && pendingMove.y === ty) {
                let dist = getGridDistance(player.x, player.y, tx, ty);
                let swiftness = getPlayerSwiftness(); 
			    let moveStaminaCost = Math.floor((dist / swiftness) * 10);
                if (player.stamina < moveStaminaCost) {
                    logMessage(`❌ Legs are too heavy. Not enough stamina (${moveStaminaCost} required).`); playRetroSound('error');
                    pendingMove = null; return;
                }
				player.stamina -= moveStaminaCost; player.x = tx; player.y = ty; pendingMove = null;
                logMessage(`🏃 Strided to [${tx}, ${ty}] (Cost: ${moveStaminaCost} Stamina).`); 
                
                if (typeof playRetroSound === 'function') playRetroSound('step');
                
                // === NEW: INSTANT SERVER SYNC ===
                socket.emit('combatMove', { tx: tx, ty: ty });
                
                if (typeof advancePhase === 'function') advancePhase(); 
            } else {
                pendingMove = {x: tx, y: ty};
                let dist = getGridDistance(player.x, player.y, tx, ty);
                let swiftness = getPlayerSwiftness(); 
                let estCost = Math.floor((dist / swiftness) * 10);
                logMessage(`📍 Target marked. Click again to confirm movement (Costs ${estCost} Stamina).`); 
            }
        } else { logMessage("❌ Outside stride capabilities."); playRetroSound('error'); }
    } 
    else if (combatPhase === 'PHASE_2') {
        if (!clickedMonster) {
            logMessage("❌ Tactical Error: You can only move during Phase 1 or Phase 3."); playRetroSound('error'); return;
        }

        let dist = getGridDistance(player.x, player.y, clickedMonster.x, clickedMonster.y, clickedMonster.size || 1);
		let weaponRange = (player.equipment.weapon && player.equipment.weapon.combat && player.equipment.weapon.combat.standard.range) || 1;
        if (dist <= weaponRange) {
            let hasLos = false; let cSize = clickedMonster.size || 1;
            for (let bx = clickedMonster.x; bx < clickedMonster.x + cSize; bx++) {
                for (let by = clickedMonster.y; by < clickedMonster.y + cSize; by++) if (hasLineOfSight(player.x, player.y, bx, by)) hasLos = true;
            }
            if (hasLos) { selectedEnemy = clickedMonster; logMessage("🎯 Target Locked: " + clickedMonster.name + "."); } 
            else { logMessage("❌ No line of sight to target."); playRetroSound('error'); }
        } else { logMessage("❌ Target outside weapon scope range."); playRetroSound('error'); }
    }
});


// === BOOTSTRAP INITIALIZER: RUN THE LOOP PIPELINE ===
requestAnimationFrame(updateAnimationEngine);
