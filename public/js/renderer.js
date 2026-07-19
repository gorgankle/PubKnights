// --- RENDERER: CANVAS & GRID SYSTEM (ANIMATION UPGRADE) ---

let hoverTile = {x: -1, y: -1};
let globalAnimClock = 0; // Global engine clock tick count for procedural breathing waves

// Overlay priority: movement -> attack range -> AoE preview -> selected target.
const COMBAT_OVERLAY_STYLE = Object.freeze({
    movementFill: "rgba(32, 178, 170, 0.22)",
    movementPendingFill: "rgba(45, 212, 191, 0.46)",
    movementPendingStroke: "#2dd4bf",
    attackStroke: "#ef4444",
    attackBlockedStroke: "rgba(239, 68, 68, 0.42)",
    aoeFill: "rgba(239, 68, 68, 0.38)",
    aoeStroke: "#ff4d4d",
    invalidFill: "rgba(110, 30, 30, 0.22)",
    invalidStroke: "rgba(220, 90, 90, 0.58)",
    selectedOuter: "#050505",
    selectedInner: "#ff2525"
});

function getCombatTargetProfile() {
    const activeWeapon = typeof getActiveCombatantWeapon === 'function'
        ? getActiveCombatantWeapon()
        : player.equipment.weapon;
    let actionItem = activeWeapon;
    let rules = activeWeapon && activeWeapon.combat ? activeWeapon.combat.standard : null;

    if (combatPhase === 'TARGETING' && typeof activeTargetIndex !== 'undefined' && activeTargetIndex !== -1) {
        actionItem = typeof getActiveCombatantItem === 'function'
            ? getActiveCombatantItem(activeTargetIndex)
            : (activeTargetIndex === 'weapon' ? activeWeapon : player.inventory[activeTargetIndex]);
        rules = activeTargetIndex === 'weapon'
            ? (actionItem && actionItem.combat && actionItem.combat.special)
            : (actionItem && actionItem.combat);
    }

    rules = rules || { range: 1 };
    const spellData = rules.actionType === 'spell' && typeof SpellDatabase !== 'undefined'
        ? SpellDatabase[rules.spellId]
        : null;
    return {
        range: Math.max(0, Number(spellData && spellData.range) || Number(rules.range) || 1),
        ignoresLoS: Boolean(rules.ignoresLoS || (spellData && spellData.ignoresLoS)),
        shape: (spellData && spellData.type) || rules.aoeShape || rules.targetType || 'single',
        radius: Math.max(0, Number(rules.aoeRadius ?? (spellData && spellData.aoeRadius)) || 0)
    };
}

function getCombatTileTargetValidity(origin, tileX, tileY, profile = getCombatTargetProfile()) {
    const inRange = getGridDistance(origin.x, origin.y, tileX, tileY, origin.size || 1) <= profile.range;
    const lineClear = profile.ignoresLoS || hasLineOfSight(origin.x, origin.y, tileX, tileY);
    return { inRange, lineClear, valid: inRange && lineClear };
}

function getCombatActorTargetValidity(actor, origin, profile = getCombatTargetProfile()) {
    if (!actor || actor.alive === false) return { inRange: false, lineClear: false, valid: false };
    const size = actor.size || 1;
    const inRange = getGridDistance(origin.x, origin.y, actor.x, actor.y, size) <= profile.range;
    let lineClear = profile.ignoresLoS;
    if (!lineClear) {
        for (let x = actor.x; x < actor.x + size && !lineClear; x++) {
            for (let y = actor.y; y < actor.y + size; y++) {
                if (hasLineOfSight(origin.x, origin.y, x, y)) { lineClear = true; break; }
            }
        }
    }
    return { inRange, lineClear, valid: inRange && lineClear };
}

function drawMovementOverlayTile(tileX, tileY, isPending) {
    const px = tileX * currentTileSize;
    const py = tileY * currentTileSize;
    ctx.fillStyle = isPending ? COMBAT_OVERLAY_STYLE.movementPendingFill : COMBAT_OVERLAY_STYLE.movementFill;
    ctx.fillRect(px, py, currentTileSize, currentTileSize);
    if (isPending) {
        ctx.save();
        ctx.strokeStyle = COMBAT_OVERLAY_STYLE.movementPendingStroke;
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, py + 2, currentTileSize - 4, currentTileSize - 4);
        ctx.restore();
    }
}

function drawAttackRangeOverlayTile(tileX, tileY, isValid) {
    ctx.save();
    ctx.strokeStyle = isValid ? COMBAT_OVERLAY_STYLE.attackStroke : COMBAT_OVERLAY_STYLE.attackBlockedStroke;
    ctx.lineWidth = isValid ? 2 : 1.5;
    ctx.setLineDash(isValid ? [] : [5, 5]);
    ctx.strokeRect(tileX * currentTileSize + 3, tileY * currentTileSize + 3, currentTileSize - 6, currentTileSize - 6);
    ctx.restore();
}

function drawAreaOverlayTile(tileX, tileY, isValid) {
    const px = tileX * currentTileSize;
    const py = tileY * currentTileSize;
    ctx.save();
    ctx.fillStyle = isValid ? COMBAT_OVERLAY_STYLE.aoeFill : COMBAT_OVERLAY_STYLE.invalidFill;
    ctx.fillRect(px, py, currentTileSize, currentTileSize);
    ctx.strokeStyle = isValid ? COMBAT_OVERLAY_STYLE.aoeStroke : COMBAT_OVERLAY_STYLE.invalidStroke;
    ctx.lineWidth = 2;
    ctx.setLineDash(isValid ? [] : [7, 5]);
    ctx.strokeRect(px + 3, py + 3, currentTileSize - 6, currentTileSize - 6);
    ctx.restore();
}

function drawSelectedTargetOverlay(target, isValid) {
    if (!target || target.alive === false) return;
    const size = target.size || 1;
    const px = target.x * currentTileSize;
    const py = target.y * currentTileSize;
    const width = currentTileSize * size;
    const height = currentTileSize * size;
    const corner = Math.max(8, Math.floor(currentTileSize * 0.22));
    ctx.save();
    ctx.strokeStyle = COMBAT_OVERLAY_STYLE.selectedOuter;
    ctx.lineWidth = 7;
    ctx.strokeRect(px + 3.5, py + 3.5, width - 7, height - 7);
    ctx.strokeStyle = isValid ? COMBAT_OVERLAY_STYLE.selectedInner : COMBAT_OVERLAY_STYLE.invalidStroke;
    ctx.lineWidth = 3;
    ctx.setLineDash(isValid ? [] : [8, 6]);
    ctx.strokeRect(px + 8, py + 8, width - 16, height - 16);
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
    [[px+2,py+2,1,1],[px+width-2,py+2,-1,1],[px+2,py+height-2,1,-1],[px+width-2,py+height-2,-1,-1]]
        .forEach(([x, y, dx, dy]) => {
            ctx.beginPath();
            ctx.moveTo(x + dx * corner, y);
            ctx.lineTo(x, y);
            ctx.lineTo(x, y + dy * corner);
            ctx.stroke();
        });
    ctx.restore();
}

// === NEW: HARDWARE-ACCELERATED RASTER CACHE ===
const SpriteRasterCache = {};
const PROCEDURAL_RASTER_SIZE = typeof PROCEDURAL_SPRITE_GRID_SIZE === 'number'
    ? PROCEDURAL_SPRITE_GRID_SIZE
    : 32;

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
        offscreen.width = PROCEDURAL_RASTER_SIZE;
        offscreen.height = PROCEDURAL_RASTER_SIZE;
        const offCtx = offscreen.getContext('2d', { alpha: true });
        offCtx.imageSmoothingEnabled = false;

        // Bake the canonical 32x32 pixel pass once, then scale the cached raster.
        drawProceduralSprite(offCtx, matrix, 0, 0, PROCEDURAL_RASTER_SIZE);

        // Save the finished image to the cache
        SpriteRasterCache[spriteKey] = offscreen;
    }

    // 2. GPU-Stamp the baked image to the main canvas instantly
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(SpriteRasterCache[spriteKey], x, y, size, size);
    ctx.restore();
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


function drawActiveTurnMarker() {
    if (typeof activeCombatActorUid === "undefined" || !activeCombatActorUid) return;
    if (typeof getCombatActorByUid !== "function") return;

    const actor = getCombatActorByUid(activeCombatActorUid);
    if (!actor || actor.alive === false) return;

    const size = actor.size || 1;
    const visualX = Number.isFinite(actor.visualX) ? actor.visualX : actor.x;
    const visualY = Number.isFinite(actor.visualY) ? actor.visualY : actor.y;
    const pulse = (Math.sin(globalAnimClock * 0.12) + 1) / 2;
    const centerX = (visualX + (size / 2)) * currentTileSize;
    const footY = Math.min(canvas.height - 4, (visualY + size) * currentTileSize - 4);
    const ringRadiusX = Math.max(12, (currentTileSize * size * 0.43) + (pulse * 2));
    const ringRadiusY = Math.max(5, currentTileSize * 0.12);

    ctx.save();
    ctx.strokeStyle = "#f1c40f";
    ctx.fillStyle = "#f1c40f";
    ctx.lineWidth = Math.max(2, currentTileSize * 0.055);
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 4;
    ctx.globalAlpha = 0.78 + (pulse * 0.22);
    ctx.beginPath();
    ctx.ellipse(centerX, footY, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    const arrowHalfWidth = Math.max(5, currentTileSize * 0.11);
    const arrowTipY = Math.max(10, (visualY * currentTileSize) - 5 + (pulse * 3));
    const arrowTopY = Math.max(2, arrowTipY - Math.max(9, currentTileSize * 0.22));
    ctx.beginPath();
    ctx.moveTo(centerX - arrowHalfWidth, arrowTopY);
    ctx.lineTo(centerX + arrowHalfWidth, arrowTopY);
    ctx.lineTo(centerX, arrowTipY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3b2a11";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
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
    const activeGridPos = typeof getActiveCombatantPosition === 'function' ? getActiveCombatantPosition() : { x: player.x, y: player.y, size: 1 };
    const targetProfile = getCombatTargetProfile();


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

            if (currentTurn === 'PLAYER' && combatPhase === 'ACTION_READY') {
                if (isValidPlayerMovePath(x, y)) {
                    drawMovementOverlayTile(x, y, Boolean(pendingMove && pendingMove.x === x && pendingMove.y === y));
                }

                if (pendingMove && pendingMove.x === x && pendingMove.y === y) {
                    let dist = getGridDistance(activeGridPos.x, activeGridPos.y, x, y, activeGridPos.size || 1);
                    let swiftness = typeof getActiveCombatantMoveRange === 'function' ? getActiveCombatantMoveRange() : getPlayerSwiftness();
                    let estCost = Math.floor((dist / swiftness) * 10);
                    let fontSize = currentGridSize > 10 ? 10 : 14;
                    ctx.font = `bold ${fontSize}px Courier New`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.fillStyle = "#f1c40f"; ctx.shadowColor = "#000"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
                    ctx.fillText(`-${estCost}⚡`, x * currentTileSize + (currentTileSize / 2), y * currentTileSize + (currentTileSize / 2));
                    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
                    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
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

    // Range recomputes from active actor/action/current position every frame.
    if (currentTurn === 'PLAYER' && (combatPhase === 'ACTION_READY' || combatPhase === 'TARGETING')) {
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const validity = getCombatTileTargetValidity(activeGridPos, x, y, targetProfile);
                if (validity.inRange) drawAttackRangeOverlayTile(x, y, validity.valid);
            }
        }
    }

// --- RENDERING PIPELINE: DYNAMIC TRANSFORMS KNIGHT ---
    // === NEW: DYNAMIC LUNGE OFFSETS ===
    const pX = (player.visualX * currentTileSize) + (player.lungeOffsetX || 0);
    const pY = (player.visualY * currentTileSize) - playerHopY + (player.lungeOffsetY || 0) - (player.lungeHop || 0);

    ctx.save();

    let pScaleY = 1.0 + Math.sin(globalAnimClock * 0.08) * 0.02;
    let pScaleX = 1.0 - Math.sin(globalAnimClock * 0.08) * 0.01;

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

            renderGridHealthBar(e.visualX, e.visualY - (enemyHopY / currentTileSize), e.hp, e.maxHp, sSize, e.stamina, e.maxStamina, e.visualAtb);
        }
    });


    function drawNonEnemyActor(actor, palette) {
        if (!actor.alive) return;
        let sSize = actor.size || 1;
        if (actor.visualAtb === undefined) actor.visualAtb = 0;
        if (combatPhase === 'WAITING_FOR_ATB') {
            let aSpeed = ((actor.speed || 1) * 3) + 5;
            actor.visualAtb += (aSpeed * 5) / 60;
            if (actor.visualAtb > 100) actor.visualAtb = 100;
        }
        if (actor.visualX === undefined) {
            actor.visualX = actor.x; actor.visualY = actor.y; actor.moveAnimTimer = 0;
        }
        let deltaX = actor.x - actor.visualX; let deltaY = actor.y - actor.visualY;
        let isMoving = Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01;
        if (isMoving) {
            actor.visualX += deltaX * 0.15; actor.visualY += deltaY * 0.15;
            actor.moveAnimTimer += 0.25;
        } else {
            actor.visualX = actor.x; actor.visualY = actor.y; actor.moveAnimTimer = 0;
        }
        let hopY = Math.abs(Math.sin(actor.moveAnimTimer)) * 10;
        let ax = (actor.visualX * currentTileSize) + (actor.lungeOffsetX || 0);
        let ay = (actor.visualY * currentTileSize) - hopY + (actor.lungeOffsetY || 0) - (actor.lungeHop || 0);

        ctx.save();
        if (SpriteMatrices[actor.id]) {
            drawOptimizedSprite(ctx, actor.id, SpriteMatrices[actor.id], ax, ay, currentTileSize * sSize);
        } else {
            ctx.fillStyle = palette.fill;
            ctx.fillRect(ax + 1, ay + 1, (currentTileSize * sSize) - 2, (currentTileSize * sSize) - 2);
            ctx.fillStyle = "#fff";
            ctx.font = `${currentGridSize > 10 ? "13px" : "20px"} Courier New`;
            ctx.fillText(actor.icon || "?", ax + 14, ay + 36);
        }
        ctx.restore();

        ctx.strokeStyle = palette.stroke;
        ctx.lineWidth = 2;
        ctx.strokeRect(actor.x * currentTileSize + 2, actor.y * currentTileSize + 2, (currentTileSize * sSize) - 4, (currentTileSize * sSize) - 4);
        drawCombatAura(actor, actor.visualX, actor.visualY - (hopY / currentTileSize), sSize);
        renderGridHealthBar(actor.visualX, actor.visualY - (hopY / currentTileSize), actor.hp, actor.maxHp, sSize, actor.stamina, actor.maxStamina, actor.visualAtb);
    }

    (allies || []).forEach(actor => drawNonEnemyActor(actor, { fill: "#216b4f", stroke: "#2ecc71" }));
    (rogues || []).forEach(actor => drawNonEnemyActor(actor, { fill: "#5c2f18", stroke: "#e67e22" }));

    // AoE preview draws over movement/range, while selected target draws last.
    if (combatPhase === 'TARGETING' && hoverTile && hoverTile.x >= 0) {
        const validity = getCombatTileTargetValidity(activeGridPos, hoverTile.x, hoverTile.y, targetProfile);
        let previewTiles = [];

        if (targetProfile.shape === 'line') {
            previewTiles = getLineOfEffectPath(
                activeGridPos.x,
                activeGridPos.y,
                hoverTile.x,
                hoverTile.y,
                targetProfile.range,
                !targetProfile.ignoresLoS
            );
        } else {
            const previewRadius = targetProfile.shape === 'single' ? 0 : targetProfile.radius;
            for (let bx = hoverTile.x - previewRadius; bx <= hoverTile.x + previewRadius; bx++) {
                for (let by = hoverTile.y - previewRadius; by <= hoverTile.y + previewRadius; by++) {
                    if (bx >= 0 && bx < cols && by >= 0 && by < rows) previewTiles.push({ x: bx, y: by });
                }
            }
        }

        previewTiles.forEach(tile => drawAreaOverlayTile(tile.x, tile.y, validity.valid));
    }

    if (typeof selectedEnemy !== 'undefined' && selectedEnemy && selectedEnemy.alive !== false) {
        const selectedValidity = getCombatActorTargetValidity(selectedEnemy, activeGridPos, targetProfile);
        drawSelectedTargetOverlay(selectedEnemy, selectedValidity.valid);
    }

    drawActiveTurnMarker();

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
    const stamina = Number.isFinite(mob.stamina) ? mob.stamina : 0;
    const maxStamina = Number.isFinite(mob.maxStamina) ? mob.maxStamina : stamina;
    const offense = Number.isFinite(mob.offense) ? mob.offense : 0;
    const defense = Number.isFinite(mob.defense) ? mob.defense : 0;
    const speed = Number.isFinite(mob.speed) ? mob.speed : 0;
    const attackRange = Number.isFinite(mob.attackRange) ? mob.attackRange : 1;
    const npcType = mob.type || "ENEMY";

    return `<h3>${mob.name}</h3>` +
           `<b>Type:</b> ${npcType}<br>` +
           `<b>Vitality:</b> ${hp}/${maxHp} HP<br>` +
           `<b>Stamina:</b> ${Math.floor(stamina)}/${Math.floor(maxStamina)} STAM<br>` +
           `<b>Offense:</b> ${offense}<br>` +
           `<b>Defense:</b> ${defense}<br>` +
           `<b>Speed:</b> ${speed}<br>` +
           `<b>Attack Range:</b> ${attackRange} Tile(s)`;
}

canvas.addEventListener("mouseleave", function() {
    hoverTile = {x: -1, y: -1};
    hideTooltip();
});
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
    if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) {
        hoverTile = {x: -1, y: -1};
        hideTooltip();
        return;
    }

    // Keep invalid destinations visible so dashed feedback explains the rejection.
    if (combatPhase === 'TARGETING') {
        hoverTile = {x: tx, y: ty};
    }

    let mob = [...(enemies || []), ...(rogues || []), ...(allies || [])].find(em => { let s = em.size || 1; return em.alive && tx >= em.x && tx < em.x + s && ty >= em.y && ty < em.y + s; });

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

    // Use the same range/LoS profile used by the renderer.
    if (combatPhase === 'TARGETING') {
        const activePosForTarget = typeof getActiveCombatantPosition === 'function' ? getActiveCombatantPosition() : { x: player.x, y: player.y, size: 1 };
        const validity = getCombatTileTargetValidity(activePosForTarget, tx, ty, getCombatTargetProfile());

        if (validity.valid) {
            if (typeof executeTargetAction === 'function') executeTargetAction(tx, ty);
        } else {
            logMessage(validity.inRange ? "Target blocked by obstacles." : "Target outside action range.");
            if (typeof playRetroSound === 'function') playRetroSound('error');
        }

        hoverTile = {x: -1, y: -1};
        return;
    }
    let clickedMonster = getPlayerAttackables().find(em => { let s = em.size || 1; return em.alive && tx >= em.x && tx < em.x + s && ty >= em.y && ty < em.y + s; });

    if (combatPhase === 'ACTION_READY') {
        if (clickedMonster) {
            const activePosForAttack = typeof getActiveCombatantPosition === 'function' ? getActiveCombatantPosition() : { x: player.x, y: player.y, size: 1 };
            const validity = getCombatActorTargetValidity(clickedMonster, activePosForAttack, getCombatTargetProfile());
            if (validity.valid) {
                selectedEnemy = clickedMonster;
                pendingMove = null;
                logMessage(`Target Locked: ${clickedMonster.name}.`);
            } else {
                logMessage(validity.inRange ? "No line of sight to target." : "Target outside weapon range.");
                if (typeof playRetroSound === 'function') playRetroSound('error');
            }
            refreshSystemUI();
            if (typeof drawGrid === 'function') drawGrid();
            return;
        }

        const activePos = typeof getActiveCombatantPosition === 'function' ? getActiveCombatantPosition() : { x: player.x, y: player.y, size: 1 };
        if (tx === activePos.x && ty === activePos.y) {
            pendingMove = null;
            logMessage("Use Rest to hold position and recover stamina.");
            refreshSystemUI();
            return;
        }

if (isValidPlayerMovePath(tx, ty)) {
            // Note: We removed the manual mapObstacles check because isValidPlayerMovePath handles it!

            if (pendingMove && pendingMove.x === tx && pendingMove.y === ty) {
                let activePosForMove = typeof getActiveCombatantPosition === 'function' ? getActiveCombatantPosition() : { x: player.x, y: player.y, size: 1 };
                let dist = getGridDistance(activePosForMove.x, activePosForMove.y, tx, ty, activePosForMove.size || 1);
                let swiftness = typeof getActiveCombatantMoveRange === 'function' ? getActiveCombatantMoveRange() : getPlayerSwiftness();
			    let moveStaminaCost = Math.floor((dist / swiftness) * 10);
                if ((typeof getActiveCombatantStamina === 'function' ? getActiveCombatantStamina() : player.stamina) < moveStaminaCost) {
                    logMessage(`❌ Legs are too heavy. Not enough stamina (${moveStaminaCost} required).`); playRetroSound('error');
                    pendingMove = null; return;
                }
                if (typeof applyActiveCombatantLocalMove === 'function') applyActiveCombatantLocalMove(tx, ty, moveStaminaCost);
                else { player.stamina -= moveStaminaCost; player.x = tx; player.y = ty; }
                pendingMove = null;
                logMessage(`🏃 Strided to [${tx}, ${ty}] (Cost: ${moveStaminaCost} Stamina).`);

                if (typeof playRetroSound === 'function') playRetroSound('step');

                // === NEW: INSTANT SERVER SYNC ===
                combatPhase = 'WAITING_FOR_SERVER';
                refreshSystemUI();
                socket.emit('combatMove', { actorUid: (typeof activeCombatActorUid !== 'undefined' ? activeCombatActorUid : 'player_0'), tx: tx, ty: ty });
            } else {
                pendingMove = {x: tx, y: ty};
                let activePosForMove = typeof getActiveCombatantPosition === 'function' ? getActiveCombatantPosition() : { x: player.x, y: player.y, size: 1 };
                let dist = getGridDistance(activePosForMove.x, activePosForMove.y, tx, ty, activePosForMove.size || 1);
                let swiftness = typeof getActiveCombatantMoveRange === 'function' ? getActiveCombatantMoveRange() : getPlayerSwiftness();
                let estCost = Math.floor((dist / swiftness) * 10);
                logMessage(`📍 Target marked. Click again to confirm movement (Costs ${estCost} Stamina).`);
            }
        } else { logMessage("❌ Outside stride capabilities."); playRetroSound('error'); }
    }
});


// === BOOTSTRAP INITIALIZER: RUN THE LOOP PIPELINE ===
requestAnimationFrame(updateAnimationEngine);
