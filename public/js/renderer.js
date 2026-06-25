// --- RENDERER: CANVAS & GRID SYSTEM (ANIMATION UPGRADE) ---

let hoverTile = {x: -1, y: -1};
let globalAnimClock = 0; 

const SpriteRasterCache = {};

const playerBufferCanvas = document.createElement('canvas');
const playerBufferCtx = playerBufferCanvas.getContext('2d', { alpha: true });

function drawOptimizedSprite(ctx, spriteKey, matrix, x, y, size) {
    if (!matrix) return;
    
    if (!SpriteRasterCache[spriteKey]) {
        const offscreen = document.createElement('canvas');
        offscreen.width = size;
        offscreen.height = size;
        const offCtx = offscreen.getContext('2d', { alpha: true });
        
        drawProceduralSprite(offCtx, matrix, 0, 0, size);
        SpriteRasterCache[spriteKey] = offscreen;
    }

    ctx.drawImage(SpriteRasterCache[spriteKey], x, y);
}

// Canvas Input Listener
canvas.addEventListener("click", function(e) {
    if (gameState !== 'COMBAT') return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tx = Math.floor(x / currentTileSize);
    const ty = Math.floor(y / currentTileSize);

    if (currentTurn === 'PLAYER' && combatPhase === 'PHASE_2') {
        let targetEnemy = enemies.find(e => e.alive && e.x <= tx && tx < e.x + (e.size || 1) && e.y <= ty && ty < e.y + (e.size || 1));
        
        if (targetEnemy) {
            selectedEnemy = targetEnemy;
            refreshSystemUI();
            return;
        }

        if (isValidPlayerMovePath(tx, ty)) {
            socket.emit('movePlayer', { x: tx, y: ty });
        } else {
            logMessage("🚫 Path obstructed or exceeds stride limits.");
        }
    }
    
    // Updated: Uses the new unified action pipeline standard!
    if (combatPhase === 'TARGET_BOMB') {
        if (typeof dispatchCombatAction === 'function') {
            dispatchCombatAction('throw_bomb', { 
                invIndex: activeBombIndex, 
                tx: tx, 
                ty: ty 
            });
        }
        hoverTile = {x: -1, y: -1}; 
        return;
    }
});

// (Include the rest of your drawGrid, drawMapLayers, and drawing functions below)