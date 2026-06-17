// --- RENDERER: CANVAS & GRID SYSTEM (ANIMATION UPGRADE) ---

let hoverTile = {x: -1, y: -1};
let globalAnimClock = 0; // Global engine clock tick count for procedural breathing waves

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

// === GLOBAL ANIMATION ANIM-STATE TRIGGERS ===
function triggerPlayerAttackAnimation() { player.attackTimer = 20; }
function triggerEnemyAttackAnimation(enemy) { enemy.attackTimer = 20; }
function triggerBombAnimation() { player.bombTimer = 20; }

// === UPDATED: CHUG TRIGGER ACCEPTS BREW ID ===
function triggerChugAnimation(brewId = 'stout') { 
    player.chugTimer = 25; 
    player.activeChugSprite = 'icon_' + brewId;
}

// === NEW: SPAWN VISUAL EFFECTS ===
function spawnProjectile(startX, startY, targetX, targetY, spriteId, duration, onComplete, isArrow = false) {
    activeProjectiles.push({
        startX: startX, startY: startY,
        targetX: targetX, targetY: targetY,
        spriteId: spriteId,
        frame: 0,
        maxFrames: duration,
        onComplete: onComplete,
        isArrow: isArrow // Tells the engine this is a dart, not a bomb
    });
}

function spawnExplosion(gridX, gridY, radiusTiles) {
    activeExplosions.push({
        x: gridX, y: gridY,
        radius: radiusTiles,
        frame: 0,
        maxFrames: 25 // Lasts about half a second
    });
}

function drawGrid() {
    if (gameState !== 'COMBAT') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let moveRange = getPlayerSwiftness(); 
    let weaponRange = (player.equipment.weapon && player.equipment.weapon.attackRange) || 1;

    // --- INTERPOLATION ENGINE: PLAYER ---
    if (player.visualX === undefined) {
        player.visualX = player.x; player.visualY = player.y;
        player.moveAnimTimer = 0; player.attackTimer = 0;
        player.chugTimer = 0; player.bombTimer = 0;
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
                drawProceduralSprite(ctx, SpriteMatrices[groundSprite], x * currentTileSize, y * currentTileSize, currentTileSize);
            }

            ctx.strokeStyle = activeCombatZone==='GORILLA_ARENA' ? "#443425" : "#3a2f26";
            ctx.lineWidth = 1; ctx.strokeRect(x * currentTileSize, y * currentTileSize, currentTileSize, currentTileSize);
            
            if (currentTurn === 'PLAYER' && combatPhase !== 'TARGET_BOMB') {
					if (combatPhase === 'PHASE_1' || combatPhase === 'PHASE_3') {
                    // === NEW: USE PATHFINDING FOR HIGHLIGHTS ===
                    if (isValidPlayerMovePath(x, y)) {
                        ctx.fillStyle = "rgba(52, 152, 219, 0.20)"; ctx.fillRect(x * currentTileSize, y * currentTileSize, currentTileSize, currentTileSize);
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
                else if (combatPhase === 'PHASE_2') {
                    if (Math.max(Math.abs(x - player.x), Math.abs(y - player.y)) <= weaponRange) {
                        if (hasLineOfSight(player.x, player.y, x, y)) ctx.fillStyle = "rgba(241, 196, 15, 0.15)";
                        else ctx.fillStyle = "rgba(200, 0, 0, 0.15)";
                        ctx.fillRect(x * currentTileSize, y * currentTileSize, currentTileSize, currentTileSize);
                    }
                }
            }
        }
    }
    
    mapObstacles.forEach(o => {
        if (o.spriteId && SpriteMatrices[o.spriteId]) drawProceduralSprite(ctx, SpriteMatrices[o.spriteId], o.x * currentTileSize, o.y * currentTileSize, currentTileSize);
        else {
            ctx.fillStyle = "#504035"; ctx.fillRect(o.x * currentTileSize + 2, o.y * currentTileSize + 2, currentTileSize - 4, currentTileSize - 4);
            ctx.fillStyle = "#888"; ctx.font = `14px Courier New`; ctx.fillText(o.icon || "🪨", o.x * currentTileSize + (currentTileSize/2) - 7, o.y * currentTileSize + (currentTileSize/2) + 5);
        }
    });

    // --- RENDERING PIPELINE: DYNAMIC TRANSFORMS KNIGHT ---
    ctx.save();
    
    let pLungeX = 0; let pLungeY = 0; let pWeaponRot = 0;
    let pScaleX = 1.0; let pScaleY = 1.0;

    if (player.attackTimer > 0) {
        player.attackTimer--;
        let progress = (20 - player.attackTimer) / 20;
        let lungeFactor = Math.sin(progress * Math.PI); 
        
        let dirX = 1, dirY = 0;
        if (selectedEnemy) {
            let dx = selectedEnemy.x - player.x; let dy = selectedEnemy.y - player.y;
            let len = Math.sqrt(dx*dx + dy*dy) || 1;
            dirX = dx / len; dirY = dy / len;
        }
        
        pLungeX = dirX * currentTileSize * 0.45 * lungeFactor;
        pLungeY = dirY * currentTileSize * 0.45 * lungeFactor;
        pWeaponRot = Math.sin(progress * Math.PI) * 0.75; 
    } 
    else if (player.bombTimer > 0) {
        player.bombTimer--;
        let progress = (20 - player.bombTimer) / 20;
        pScaleX = 1.0 + Math.sin(progress * Math.PI) * 0.15;
        pScaleY = 1.0 - Math.sin(progress * Math.PI) * 0.15;
    }
    else if (player.chugTimer > 0) {
        player.chugTimer--;
        let progress = (25 - player.chugTimer) / 25;
        pScaleY = 1.0 - Math.sin(progress * Math.PI) * 0.05;
        pLungeY = -Math.sin(progress * Math.PI) * 4; 
    }
    else {
        pScaleY = 1.0 + Math.sin(globalAnimClock * 0.08) * 0.02;
        pScaleX = 1.0 - Math.sin(globalAnimClock * 0.08) * 0.01;
    }

    const pX = player.visualX * currentTileSize + pLungeX;
    const pY = (player.visualY * currentTileSize) - playerHopY + pLungeY;

    let pPivotX = pX + currentTileSize / 2; let pPivotY = pY + currentTileSize;
    ctx.translate(pPivotX, pPivotY); ctx.scale(pScaleX, pScaleY); ctx.translate(-pPivotX, -pPivotY);

    let bodySprite = player.appearance.gender === 'female' ? 'body_female' : 'body_male';
    if (SpriteMatrices[bodySprite]) drawProceduralSprite(ctx, SpriteMatrices[bodySprite], pX, pY, currentTileSize);
    if (SpriteMatrices[player.appearance.eyes]) drawProceduralSprite(ctx, SpriteMatrices[player.appearance.eyes], pX, pY, currentTileSize);
    
    const hidesHair = player.equipment.helmet && player.equipment.helmet.hidesHair;
    if (!hidesHair && SpriteMatrices[player.appearance.hair]) {
        drawProceduralSprite(ctx, SpriteMatrices[player.appearance.hair], pX, pY, currentTileSize);
    }

    const eq = player.equipment; let gSuffix = player.appearance.gender === 'female' ? '_female' : '_male';
    
    if (eq.armor && eq.armor.spriteId) {
        let sId = eq.armor.spriteId + gSuffix;
        if (SpriteMatrices[sId]) drawProceduralSprite(ctx, SpriteMatrices[sId], pX, pY, currentTileSize);
        else if (SpriteMatrices[eq.armor.spriteId]) drawProceduralSprite(ctx, SpriteMatrices[eq.armor.spriteId], pX, pY, currentTileSize);
    }
    
    if (eq.boots && eq.boots.spriteId && SpriteMatrices[eq.boots.spriteId]) drawProceduralSprite(ctx, SpriteMatrices[eq.boots.spriteId], pX, pY, currentTileSize);
    if (eq.gloves && eq.gloves.spriteId && SpriteMatrices[eq.gloves.spriteId]) drawProceduralSprite(ctx, SpriteMatrices[eq.gloves.spriteId], pX, pY, currentTileSize);
    if (eq.helmet && eq.helmet.spriteId && SpriteMatrices[eq.helmet.spriteId]) drawProceduralSprite(ctx, SpriteMatrices[eq.helmet.spriteId], pX, pY, currentTileSize);
    
    if (eq.weapon && eq.weapon.spriteId && SpriteMatrices[eq.weapon.spriteId]) {
        ctx.save();
        let wPivotX = pX + (currentTileSize * 0.7); let wPivotY = pY + (currentTileSize * 0.5);
        ctx.translate(wPivotX, wPivotY);
        ctx.rotate(pWeaponRot);
        if (player.chugTimer > 0) ctx.rotate(Math.PI / 4); // Tuck weapon slightly when drinking
        ctx.translate(-wPivotX, -wPivotY);
        drawProceduralSprite(ctx, SpriteMatrices[eq.weapon.spriteId], pX, pY, currentTileSize);
        ctx.restore();
    }
    
// === NEW: RENDER THE BREW MUG WHEN DRINKING ===
    if (player.chugTimer > 0) {
        ctx.save();
        let brewSpriteId = player.activeChugSprite || 'icon_stout';
        
        // --- SCALED DOWN AND REPOSITIONED MUG ---
        let mugSize = currentTileSize * 0.45; // 45% of normal size!
        
        // Offset Pivot to the right (X * 0.6) so it aligns with the character's face
        let mPivotX = pX + (currentTileSize * 0.6); 
        let mPivotY = pY + (currentTileSize * 0.35);
        
        ctx.translate(mPivotX, mPivotY);
        
        // Tilt the mug progressively backwards as the timer counts down
        let chugProgress = (25 - player.chugTimer) / 25;
        ctx.rotate(-Math.PI * 0.5 * chugProgress); 
        
        // Draw the sprite offset so the "lip" of the mug is held at the mouth pivot
        if (SpriteMatrices[brewSpriteId]) {
            drawProceduralSprite(ctx, SpriteMatrices[brewSpriteId], -mugSize * 0.2, -mugSize * 0.8, mugSize);
        }
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
            let eLungeX = 0; let eLungeY = 0; let eScaleX = 1.0; let eScaleY = 1.0;

            if (e.attackTimer > 0) {
                e.attackTimer--;
                let eProgress = (20 - e.attackTimer) / 20;
                let eLungeFactor = Math.sin(eProgress * Math.PI);
                let edx = player.x - e.x; let edy = player.y - e.y;
                let elen = Math.sqrt(edx*edx + edy*edy) || 1;
                eLungeX = (edx / elen) * currentTileSize * 0.35 * eLungeFactor;
                eLungeY = (edy / elen) * currentTileSize * 0.35 * eLungeFactor;
            } else {
                eScaleY = 1.0 + Math.sin((globalAnimClock + (e.x * 15)) * 0.07) * 0.02;
                eScaleX = 1.0 - Math.sin((globalAnimClock + (e.x * 15)) * 0.07) * 0.01;
            }

            let exPosition = e.visualX * currentTileSize + eLungeX;
            let eyPosition = (e.visualY * currentTileSize) - enemyHopY + eLungeY;

            let ePivotX = exPosition + (currentTileSize * sSize) / 2;
            let ePivotY = eyPosition + (currentTileSize * sSize);
            ctx.translate(ePivotX, ePivotY); ctx.scale(eScaleX, eScaleY); ctx.translate(-ePivotX, -ePivotY);

            if (SpriteMatrices[e.id]) {
                drawProceduralSprite(ctx, SpriteMatrices[e.id], exPosition, eyPosition, currentTileSize * sSize);
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

    if (combatPhase === 'TARGET_BOMB' && hoverTile && hoverTile.x >= 0) {
        ctx.fillStyle = "rgba(231, 76, 60, 0.4)"; 
        let startX = hoverTile.x - 1; let startY = hoverTile.y - 1;
        for(let bx = startX; bx <= startX + 2; bx++) {
            for(let by = startY; by <= startY + 2; by++) {
                if (bx >= 0 && bx < currentGridSize && by >= 0 && by < currentGridSize) ctx.fillRect(bx * currentTileSize, by * currentTileSize, currentTileSize, currentTileSize);
            }
        }
    }

    // === RENDER FLYING PROJECTILES OVER EVERYTHING ===
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        let p = activeProjectiles[i];
        p.frame++;
        let progress = p.frame / p.maxFrames;
        
        let currentX = p.startX + (p.targetX - p.startX) * progress;
        let currentY = p.startY + (p.targetY - p.startY) * progress;
        
        // Arc math: Arrows fly flatter than heavy bombs
        let arcOffset = p.isArrow ? (Math.sin(progress * Math.PI) * 0.5) : (Math.sin(progress * Math.PI) * 1.5); 
        
        let px = currentX * currentTileSize;
        let py = (currentY - arcOffset) * currentTileSize;
        
        ctx.save();
        ctx.translate(px + currentTileSize/2, py + currentTileSize/2);
        
        if (p.isArrow) {
            let dx = p.targetX - p.startX;
            let dy = p.targetY - p.startY;
            let angle = Math.atan2(dy, dx);
            ctx.rotate(angle + (Math.PI / 4)); 
        } else {
            ctx.rotate(progress * Math.PI * 4); 
        }
        
        ctx.translate(-(px + currentTileSize/2), -(py + currentTileSize/2));
        
        if (SpriteMatrices[p.spriteId]) drawProceduralSprite(ctx, SpriteMatrices[p.spriteId], px, py, currentTileSize);
        ctx.restore();
        
        if (p.frame >= p.maxFrames) {
            let callback = p.onComplete;
            activeProjectiles.splice(i, 1);
            if (typeof callback === 'function') callback(); 
        }
    }

    // === RENDER EXPANDING EXPLOSIONS ===
    for (let i = activeExplosions.length - 1; i >= 0; i--) {
        let exp = activeExplosions[i];
        exp.frame++;
        let progress = exp.frame / exp.maxFrames;
        let alpha = 1.0 - progress; 
        
        let cx = (exp.x * currentTileSize) + (currentTileSize / 2);
        let cy = (exp.y * currentTileSize) + (currentTileSize / 2);
        let currentRadius = (exp.radius * currentTileSize) * Math.sin(progress * Math.PI / 2); 
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        ctx.beginPath(); ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#e74c3c"; ctx.fill();
        
        ctx.beginPath(); ctx.arc(cx, cy, currentRadius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = "#e67e22"; ctx.fill();
        
        ctx.beginPath(); ctx.arc(cx, cy, currentRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#f1c40f"; ctx.fill();
        
        ctx.restore();
        
        if (exp.frame >= exp.maxFrames) activeExplosions.splice(i, 1);
    }
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

    if (combatPhase === 'TARGET_BOMB') { hoverTile = {x: tx, y: ty}; }

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

    if (combatPhase === 'TARGET_BOMB') {
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
        let weaponRange = (player.equipment.weapon && player.equipment.weapon.attackRange) || 1;
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

function spawnHitMarker(gridX, gridY, text, color) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const marker = document.createElement("div");
    marker.innerText = text;
    marker.style.position = "absolute";
    marker.style.left = (rect.left + window.scrollX + (gridX * currentTileSize) + (currentTileSize / 2)) + "px";
    marker.style.top = (rect.top + window.scrollY + (gridY * currentTileSize) + 10) + "px";
    marker.style.color = color;
    marker.style.fontWeight = "bold";
    marker.style.fontSize = "22px";
    marker.style.textShadow = "2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000";
    marker.style.pointerEvents = "none";
    marker.style.zIndex = "9999";
    marker.style.transform = "translate(-50%, -50%)";
    marker.style.transition = "top 1s ease-out, opacity 1s ease-in";

    document.body.appendChild(marker);
    setTimeout(() => {
        marker.style.top = (rect.top + window.scrollY + (gridY * currentTileSize) - 30) + "px";
        marker.style.opacity = "0";
    }, 10);
    setTimeout(() => marker.remove(), 1000);
}

// === BOOTSTRAP INITIALIZER: RUN THE LOOP PIPELINE ===
requestAnimationFrame(updateAnimationEngine);