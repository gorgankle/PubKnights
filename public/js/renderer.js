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

// === ENGINE HEARTBEAT LOOP ===
function updateAnimationEngine() {
    requestAnimationFrame(updateAnimationEngine);
    globalAnimClock++;
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
    
    // If we are holding a ranged item, override the yellow grid to show its max range!
    if (combatPhase === 'TARGETING' && typeof activeTargetIndex !== 'undefined' && activeTargetIndex !== -1) {
        let activeItem = player.inventory[activeTargetIndex];
        if (activeItem && activeItem.combat && activeItem.combat.range) {
            currentTargetRange = activeItem.combat.range;
        }
    }

    // --- INTERPOLATION ENGINE: PLAYER ---
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
    


    for (let x = 0; x < currentGridSize; x++) {
        for (let y = 0; y < currentGridSize; y++) {
            
            let groundSprite = 'ground_wilderness';
            if (activeCombatZone === 'CELLARS') groundSprite = 'ground_cellars';
            else if (activeCombatZone === 'GORILLA_ARENA') groundSprite = 'ground_arena';
			else if (activeCombatZone === 'ABYSS') groundSprite = 'ground_abyss';
            
if (SpriteMatrices[groundSprite]) {
    drawOptimizedSprite(ctx, groundSprite, SpriteMatrices[groundSprite], x * currentTileSize, y * currentTileSize, currentTileSize);
}

            ctx.strokeStyle = activeCombatZone==='GORILLA_ARENA' ? "#443425" : "#3a2f26";
            ctx.lineWidth = 1; ctx.strokeRect(x * currentTileSize, y * currentTileSize, currentTileSize, currentTileSize);
            
            if (currentTurn === 'PLAYER' && combatPhase !== 'TARGETING') {
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
                    
                    // 1. Check if the active item ignores Line of Sight
                    let currentIgnoresLoS = false;
                    if (combatPhase === 'TARGETING' && typeof activeTargetIndex !== 'undefined' && activeTargetIndex !== -1) {
                        let activeItem = player.inventory[activeTargetIndex];
                        if (activeItem && activeItem.combat && activeItem.combat.ignoresLoS) {
                            currentIgnoresLoS = true;
                        }
                    }

                    // 2. Draw the Grid
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

    const pX = player.visualX * currentTileSize;
    const pY = (player.visualY * currentTileSize) - playerHopY;

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

    renderGridHealthBar(player.visualX, player.visualY - (playerHopY / currentTileSize), player.hp, player.vitality, 1, player.stamina, player.maxStamina);

    if (selectedEnemy && selectedEnemy.alive) {
        let sSize = selectedEnemy.size || 1;
        ctx.strokeStyle = "#ff2222"; ctx.lineWidth = 3; 
        ctx.strokeRect(selectedEnemy.x * currentTileSize, selectedEnemy.y * currentTileSize, currentTileSize * sSize, currentTileSize * sSize);
    }

    // --- INTERPOLATION ENGINE: ENEMIES ---
    enemies.forEach(e => {
        if (e.alive) {
            let sSize = e.size || 1;
            
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

            renderGridHealthBar(e.visualX, e.visualY - (enemyHopY / currentTileSize), e.hp, e.maxHp, sSize);
        }
    });

    if (combatPhase === 'TARGETING' && hoverTile && hoverTile.x >= 0) {
            ctx.fillStyle = "rgba(231, 76, 60, 0.4)"; 
            let startX = hoverTile.x - 1; let startY = hoverTile.y - 1;
            for(let bx = startX; bx <= startX + 2; bx++) {
                for(let by = startY; by <= startY + 2; by++) {
                    if (bx >= 0 && bx < currentGridSize && by >= 0 && by < currentGridSize) ctx.fillRect(bx * currentTileSize, by * currentTileSize, currentTileSize, currentTileSize);
                }
            }
        }
		FXEngine.render(ctx, currentTileSize);
    }


function renderGridHealthBar(gridX, gridY, currentHp, maximumHp, size = 1, currentStamina = null, maxStamina = null) {
    let barWidth = (currentTileSize * size) - 6; 
    let rx = gridX * currentTileSize + 3; 
    let ry = gridY * currentTileSize + 1; 
    
    let hpRatio = Math.max(0, currentHp / maximumHp);
    
    ctx.fillStyle = "#110d0a"; 
    ctx.fillRect(rx, ry, barWidth, 2);
    ctx.fillStyle = hpRatio > 0.45 ? "#27ae60" : "#c0392b"; 
    ctx.fillRect(rx, ry, barWidth * hpRatio, 2);

    if (currentStamina !== null && maxStamina !== null) {
        let stRatio = Math.max(0, currentStamina / maxStamina);
        let ryStamina = ry + 3; 
        
        ctx.fillStyle = "#110d0a"; 
        ctx.fillRect(rx, ryStamina, barWidth, 2);
        ctx.fillStyle = "#e67e22"; 
        ctx.fillRect(rx, ryStamina, barWidth * stRatio, 2);
    }
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

    if (tx < 0 || tx >= currentGridSize || ty < 0 || ty >= currentGridSize) return;

    if (combatPhase === 'TARGETING') { hoverTile = {x: tx, y: ty}; }

    let mob = enemies.find(em => { let s = em.size || 1; return em.alive && tx >= em.x && tx < em.x + s && ty >= em.y && ty < em.y + s; });
    
    if (mob) {
        let tooltipHtml = `<h3>${mob.name}</h3>` +
                          `❤️ <b>Vitality:</b> ${mob.hp}/${mob.maxHp} HP<br>` +
                          `💥 <b>Power:</b> ${mob.attack} DMG<br>` +
                          `🎯 <b>Accuracy:</b> ${mob.accuracy}<br>` +
                          `🛡️ <b>Resilience:</b> ${mob.resilience}<br>` +
                          `🏃 <b>Swiftness:</b> ${mob.moveRange} Steps<br>` +
                          `📏 <b>Strike Radius:</b> ${mob.attackRange} Tile(s)`;
        showTooltip(tooltipHtml, e);
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

    if (tx < 0 || tx >= currentGridSize || ty < 0 || ty >= currentGridSize) return;

    if (combatPhase === 'TARGETING') {
        if (typeof executeBombThrow === 'function') executeBombThrow(tx, ty);
        hoverTile = {x: -1, y: -1}; return;
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

// ==========================================================
// === UNIFIED VISUAL FX ENGINE (DATA-DRIVEN) ===
// ==========================================================

const FXEngine = {
    queue: [],

    // 1. Text Floaters (Damage, Healing, Misses)
    spawnText: function(gridX, gridY, text, config = {}) {
        let color = config.color || "#e74c3c";
        let isCrit = config.isCrit || false;
        
        this.queue.push({
            type: 'TEXT',
            x: gridX,
            y: gridY,
            text: text,
            color: color,
            size: isCrit ? 28 : 20,
            life: 0,
            maxLife: 45, // Frames before fading out
            offsetY: 0
        });
    },

    // 2. Data-Driven Projectiles
    spawnProjectile: function(startX, startY, targetX, targetY, spriteId, config = {}) {
        this.queue.push({
            type: 'PROJECTILE',
            sx: startX, sy: startY,
            tx: targetX, ty: targetY,
            spriteId: spriteId,
            arc: config.arc || 0.5, // 0 = flat trajectory (arrows), > 1 = high lob (bombs)
            spin: config.spin || false,
            life: 0,
            maxLife: config.frames || 20,
            onComplete: config.onComplete || null
        });
    },

    // 3. Grid-Based AoE Explosions
    spawnExplosion: function(gridX, gridY, config = {}) {
        this.queue.push({
            type: 'EXPLOSION',
            x: gridX, y: gridY,
            radius: config.radius || 1.5,
            colors: config.colors || ["#e74c3c", "#e67e22", "#f1c40f"],
            life: 0,
            maxLife: config.frames || 25
        });
    },

    // --- MASTER FX RENDER LOOP ---
    // This MUST be called at the very end of drawGrid() to overlay the FX!
    render: function(ctx, tileSize) {
        for (let i = this.queue.length - 1; i >= 0; i--) {
            let fx = this.queue[i];
            fx.life++;
            let progress = fx.life / fx.maxLife;

            // Remove dead effects
            if (progress >= 1.0) {
                if (fx.type === 'PROJECTILE' && typeof fx.onComplete === 'function') {
                    fx.onComplete();
                }
                this.queue.splice(i, 1);
                continue;
            }

            ctx.save();
            let globalAlpha = 1.0 - Math.pow(progress, 3); // Fast fade at the very end

            if (fx.type === 'TEXT') {
                fx.offsetY -= 1.5; // Float upwards
                let px = (fx.x * tileSize) + (tileSize / 2);
                let py = (fx.y * tileSize) + fx.offsetY;

                ctx.globalAlpha = globalAlpha;
                ctx.fillStyle = fx.color;
                ctx.font = `bold ${fx.size}px Courier New`;
                ctx.textAlign = "center";
                ctx.shadowColor = "#000"; ctx.shadowBlur = 4;
                ctx.fillText(fx.text, px, py);
            } 
            else if (fx.type === 'PROJECTILE') {
                let curX = fx.sx + (fx.tx - fx.sx) * progress;
                let curY = fx.sy + (fx.ty - fx.sy) * progress;
                
                // Add arc height
                let arcOffset = Math.sin(progress * Math.PI) * fx.arc;
                
                let px = (curX * tileSize) + (tileSize / 2);
                let py = ((curY - arcOffset) * tileSize) + (tileSize / 2);

                ctx.translate(px, py);
                if (fx.spin) {
                    ctx.rotate(progress * Math.PI * 8); // Spin rapidly
                } else {
                    let angle = Math.atan2(fx.ty - fx.sy, fx.tx - fx.sx);
                    ctx.rotate(angle + (Math.PI / 4)); // Point at target
                }

                if (SpriteMatrices[fx.spriteId]) {
                    drawOptimizedSprite(ctx, fx.spriteId, SpriteMatrices[fx.spriteId], -tileSize/2, -tileSize/2, tileSize);
                }
            }
            else if (fx.type === 'EXPLOSION') {
                ctx.globalAlpha = globalAlpha;
                let currentRadius = (fx.radius * tileSize) * Math.sin(progress * Math.PI / 2);
                let cx = (fx.x * tileSize) + (tileSize / 2);
                let cy = (fx.y * tileSize) + (tileSize / 2);

                // Draw 3 layers of explosion
                ctx.beginPath(); ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = fx.colors[0]; ctx.fill();
                
                ctx.beginPath(); ctx.arc(cx, cy, currentRadius * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = fx.colors[1]; ctx.fill();
                
                ctx.beginPath(); ctx.arc(cx, cy, currentRadius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = fx.colors[2]; ctx.fill();
            }

            ctx.restore();
        }
    }
};