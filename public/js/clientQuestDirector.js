// --- clientQuestDirector.js ---
window.ClientQuestDirector = {
    isActive: false,
    shield: null,
    cinematicActors: [],
	obstacles: [],
    cinematicMap: { cols: 16, rows: 10, tileSize: 54, zone: 'WILDERNESS' },
    activeHighlightTile: null,

    init: function() {
        const style = document.createElement('style');
        style.innerHTML = `
            .director-highlight {
                z-index: 100000 !important;
                position: relative !important;
                box-shadow: 0 0 25px #f1c40f, 0 0 10px #e67e22 !important;
                border: 2px solid #f1c40f !important;
                animation: pulseGlow 1.5s infinite !important;
                pointer-events: auto !important;
            }
        `;
        document.head.appendChild(style);

        this.shield = document.createElement('div');
        this.shield.id = 'cinematic-shield';
        this.shield.style.position = 'fixed';
        this.shield.style.top = '0';
        this.shield.style.left = '0';
        this.shield.style.width = '100vw';
        this.shield.style.height = '100vh';
        this.shield.style.zIndex = '99999'; 
        this.shield.style.display = 'none';
        
        this.shield.addEventListener('click', (e) => {
            e.stopPropagation(); e.preventDefault();
        }, true);
        
        document.body.appendChild(this.shield);
        this.setupSocketListeners();
    },

    setupSocketListeners: function() {
        socket.on('questEvent', (ev) => {
            this.isActive = true;
            this.shield.style.display = 'block'; 
            this.processEvent(ev);
        });

        socket.on('questConcluded', (data) => {
            this.isActive = false;
            this.shield.style.display = 'none';
            this.removeHighlighter();
            
            if (data.action === 'RETURN_TOWN' && typeof transitionToTown === 'function') {
                transitionToTown();
            } else if (data.action === 'START_COMBAT') {
                socket.emit('deployToCombat', { zoneChoice: data.targetZone || 'WILDERNESS', activeLevel: data.targetLevel || 1 });
            } else {
                if (typeof refreshSystemUI === 'function') refreshSystemUI(); 
            }
        });
    },

processEvent: function(ev) {
        if (ev.type === 'SET_SCENE') {
            gameState = 'CINEMATIC'; 
            this.cinematicMap = { 
                cols: ev.cols || 16, rows: ev.rows || 10, 
                tileSize: ev.tileSize || 54, zone: ev.zone || 'WILDERNESS',
                obstacles: ev.obstacles || [] 
            };
            this.cinematicActors = [];
            this.activeHighlightTile = null;
            
            document.getElementById("top-nav-bar").style.display = "none";
            document.getElementById("town-vault-view").style.display = "none";
            
            let combatWrapper = document.getElementById("combat-screen");
            if (combatWrapper) combatWrapper.style.display = "block";
            
            // === THE FIX: LOCK THE CANVAS TO THE 16x10 GRID RATIO ===
            let canvas = document.getElementById("gameCanvas");
            if (canvas) {
                canvas.width = this.cinematicMap.cols * this.cinematicMap.tileSize;
                canvas.height = this.cinematicMap.rows * this.cinematicMap.tileSize;
            }
            
            // Sync global physics to the movie layout
            window.currentTileSize = this.cinematicMap.tileSize;
            window.currentGridSize = { cols: this.cinematicMap.cols, rows: this.cinematicMap.rows };

            // Trigger the UI to draw the backpack buttons!
            if (typeof refreshSystemUI === 'function') refreshSystemUI();

            setTimeout(() => socket.emit('questStepComplete'), 400);
        }
        else if (ev.type === 'SET_UI_STATE') {
            let targetEl = document.getElementById(ev.elementId);
            if (targetEl) targetEl.style.display = ev.displayState; 
            setTimeout(() => socket.emit('questStepComplete'), 100);
        }
        // === NEW: MOVIE PROP SPAWNER ===
        else if (ev.type === 'INJECT_HTML') {
            let targetEl = document.getElementById(ev.elementId);
            if (targetEl) targetEl.innerHTML = ev.html;
            setTimeout(() => socket.emit('questStepComplete'), 100);
        }
        else if (ev.type === 'SPAWN_ACTOR') {
            this.cinematicActors.push({ 
                uid: ev.uid, 
                id: ev.actorId, 
                x: ev.x, 
                y: ev.y,
                equipment: ev.equipment || null // <-- Add fake gear storage
            });
            setTimeout(() => socket.emit('questStepComplete'), 100);
        }
        else if (ev.type === 'DESPAWN_ACTOR') {
            this.cinematicActors = this.cinematicActors.filter(a => a.uid !== ev.uid);
            setTimeout(() => socket.emit('questStepComplete'), 100);
        }
        else if (ev.type === 'DIALOGUE') {
            let overlay = document.getElementById('dialogue-overlay');
            if (overlay) overlay.style.zIndex = '100000'; 
            if (typeof playDialogueSequence === 'function') playDialogueSequence(ev.sequence); 
        }
        else if (ev.type === 'FADE') {
            this.shield.style.display = 'block';
            this.shield.style.transition = `background-color ${ev.duration}ms ease`;
            this.shield.style.backgroundColor = ev.direction === 'OUT' ? (ev.color || '#000000') : 'transparent';
            setTimeout(() => {
                this.shield.style.transition = 'none';
                socket.emit('questStepComplete');
            }, ev.duration + 100);
        }
        else if (ev.type === 'HIGHLIGHT_UI') {
            let targetEl = document.getElementById(ev.elementId);
            if (!targetEl && ev.elementId.includes('inventory-slot-0')) targetEl = document.querySelector('.item-slot');
            
            if (targetEl) {
                targetEl.removeAttribute('disabled'); 
                targetEl.classList.add('director-highlight');
                
                // === THE FIX: ESCAPE STACKING CONTEXT TRAPS ===
                // If the button is trapped inside a modal (like the backpack), pull the WHOLE panel above the shield
                let parentPanel = targetEl.closest('.panel');
                let originalZ = '';
                if (parentPanel) {
                    originalZ = parentPanel.style.zIndex;
                    parentPanel.style.zIndex = '100000';
                }
                
                targetEl.addEventListener('click', () => {
                    this.removeHighlighter();
                    if (parentPanel) parentPanel.style.zIndex = originalZ; // Restore original z-index
                    setTimeout(() => socket.emit('questStepComplete'), 100);
                }, { once: true });
            } else {
                console.error("UI Element not found:", ev.elementId);
                socket.emit('questStepComplete');
            }
        }
        else if (ev.type === 'HIGHLIGHT_TILE') {
            this.activeHighlightTile = { x: ev.targetX, y: ev.targetY, style: ev.style };
            
            const canvas = document.getElementById("gameCanvas");
            const tileClickHandler = (e) => {
                const r = canvas.getBoundingClientRect();
                const scaleX = canvas.width / r.width;
                const scaleY = canvas.height / r.height;
                const tx = Math.floor(((e.clientX - r.left) * scaleX) / this.cinematicMap.tileSize);
                const ty = Math.floor(((e.clientY - r.top) * scaleY) / this.cinematicMap.tileSize);
                
                if (tx === ev.targetX && ty === ev.targetY) {
                    this.activeHighlightTile = null;
                    canvas.removeEventListener('click', tileClickHandler, true);
                    
                    let pActor = this.cinematicActors.find(a => a.id === 'player');
                    if (pActor) { pActor.x = tx; pActor.y = ty; }
                    
                    if (typeof playRetroSound === 'function') playRetroSound('step');
                    setTimeout(() => socket.emit('questStepComplete'), 100);
                }
            };
            canvas.addEventListener('click', tileClickHandler, true); 
        }
        else if (ev.type === 'AUDIO') {
            if (ev.action === 'PLAY' && typeof cycleMusicTrack === 'function' && typeof musicTracks !== 'undefined') {
                let trackIndex = musicTracks.findIndex(t => t.name === ev.trackName);
                if (trackIndex !== -1) { activeTrackIndex = trackIndex - 1; cycleMusicTrack(); }
            } else if (ev.action === 'SFX' && typeof playRetroSound === 'function') {
                playRetroSound(ev.trackName); 
            }
            socket.emit('questStepComplete'); 
        }
        else if (ev.type === 'DELAY') {
            setTimeout(() => socket.emit('questStepComplete'), ev.duration || 1000);
        }
        else if (ev.type === 'SHAKE' || ev.type === 'PLAY_FX') {
            if (ev.type === 'SHAKE' && document.getElementById('combat-screen')) {
                document.getElementById('combat-screen').animate([
                    { transform: 'translate(2px, 1px) rotate(0deg)' },
                    { transform: 'translate(-1px, -2px) rotate(-1deg)' },
                    { transform: 'translate(1px, 2px) rotate(0deg)' }
                ], { duration: 300, iterations: 1 });
            } 
            else if (ev.type === 'PLAY_FX' && typeof FXEngine !== 'undefined') {
                if (ev.fxType === 'EXPLOSION') {
                    FXEngine.spawnExplosion(ev.targetX, ev.targetY, { radius: 1.5 });
                    if (typeof playRetroSound === 'function') playRetroSound('explosion');
                } else if (ev.fxType === 'MELEE') {
                    let actorRef = this.cinematicActors.find(a => a.x === ev.startX && a.y === ev.startY) || {x: ev.startX, y: ev.startY};
                    FXEngine.spawnMeleeStrike(actorRef, ev.targetX, ev.targetY, 'lunge_slash');
                    if (typeof playRetroSound === 'function') playRetroSound('attack');
                }
            }
            setTimeout(() => socket.emit('questStepComplete'), 400);
        }
    },

    removeHighlighter: function() {
        document.querySelectorAll('.director-highlight').forEach(el => {
            el.classList.remove('director-highlight');
        });
    },

   drawCinematicScene: function(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // FIX: Use the engine's dynamic tile size, fallback to manifest size
        let size = window.currentTileSize || this.cinematicMap.tileSize || 54;

        // 1. Draw Environment Floor
        let groundSprite = 'ground_wilderness';
        if (this.cinematicMap.zone === 'CELLARS') groundSprite = 'ground_cellars';
        else if (this.cinematicMap.zone === 'GORILLA_ARENA') groundSprite = 'ground_arena';
        else if (this.cinematicMap.zone === 'ABYSS') groundSprite = 'ground_abyss';

        for (let x = 0; x < this.cinematicMap.cols; x++) {
            for (let y = 0; y < this.cinematicMap.rows; y++) {
                if (typeof SpriteMatrices !== 'undefined' && SpriteMatrices[groundSprite]) {
                    drawOptimizedSprite(ctx, groundSprite, SpriteMatrices[groundSprite], x * size, y * size, size);
                } else {
                    ctx.fillStyle = "#273c24"; ctx.fillRect(x * size, y * size, size, size);
                }
                ctx.strokeStyle = "#1a1512"; ctx.strokeRect(x * size, y * size, size, size);
            }
        }

        // 2. Draw Static Map Obstacles (The Boss Arena) - NOW CRASH PROOF
        if (this.cinematicMap.obstacles) {
            this.cinematicMap.obstacles.forEach(obs => {
                let px = obs.x * size;
                let py = obs.y * size;
                if (typeof SpriteMatrices !== 'undefined' && SpriteMatrices[obs.spriteId]) {
                    drawOptimizedSprite(ctx, obs.spriteId, SpriteMatrices[obs.spriteId], px, py, size);
                }
            });
        }

        // 3. Draw Highlight Tile Guide
        if (this.activeHighlightTile) {
            ctx.save();
            ctx.lineWidth = 4; ctx.setLineDash([5, 5]);
            ctx.strokeStyle = this.activeHighlightTile.style === 'AIM' ? "#f1c40f" : "#2ecc71";
            ctx.fillStyle = this.activeHighlightTile.style === 'AIM' ? "rgba(241, 196, 15, 0.3)" : "rgba(46, 204, 113, 0.3)";
            ctx.beginPath();
            ctx.rect(this.activeHighlightTile.x * size, this.activeHighlightTile.y * size, size, size);
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }

       // 4. Draw Actors
        this.cinematicActors.forEach(a => {
            let px = (a.x * size) + (a.lungeOffsetX || 0);
            let py = (a.y * size) + (a.lungeOffsetY || 0);
            
            if (a.id === 'player') {
                if (typeof SpriteMatrices !== 'undefined' && SpriteMatrices['body_male']) {
                    // Draw base body
                    let bodySprite = player.appearance.gender === 'female' ? 'body_female' : 'body_male';
                    drawOptimizedSprite(ctx, bodySprite, SpriteMatrices[bodySprite], px, py, size);
                    
                    if (SpriteMatrices[player.appearance.eyes]) drawOptimizedSprite(ctx, player.appearance.eyes, SpriteMatrices[player.appearance.eyes], px, py, size);
                    
                    // === THE FIX: DRAW FAKE MOVIE GEAR ===
                    let fakeEq = a.equipment || {};
                    let gSuffix = player.appearance.gender === 'female' ? '_female' : '_male';

                    const hidesHair = fakeEq.helmet && fakeEq.helmet.includes("helm") && !fakeEq.helmet.includes("coif");
                    if (!hidesHair && SpriteMatrices[player.appearance.hair]) {
                        drawOptimizedSprite(ctx, player.appearance.hair, SpriteMatrices[player.appearance.hair], px, py, size);
                    }
                    
                    if (fakeEq.armor) {
                        if (SpriteMatrices[fakeEq.armor + gSuffix]) drawOptimizedSprite(ctx, fakeEq.armor + gSuffix, SpriteMatrices[fakeEq.armor + gSuffix], px, py, size);
                        else if (SpriteMatrices[fakeEq.armor]) drawOptimizedSprite(ctx, fakeEq.armor, SpriteMatrices[fakeEq.armor], px, py, size);
                    }
                    if (fakeEq.boots && SpriteMatrices[fakeEq.boots]) drawOptimizedSprite(ctx, fakeEq.boots, SpriteMatrices[fakeEq.boots], px, py, size);
                    if (fakeEq.gloves && SpriteMatrices[fakeEq.gloves]) drawOptimizedSprite(ctx, fakeEq.gloves, SpriteMatrices[fakeEq.gloves], px, py, size);
                    if (fakeEq.helmet && SpriteMatrices[fakeEq.helmet]) drawOptimizedSprite(ctx, fakeEq.helmet, SpriteMatrices[fakeEq.helmet], px, py, size);
                    
                    if (fakeEq.weapon && SpriteMatrices[fakeEq.weapon]) {
                        ctx.save();
                        let wPivotX = px + (size * 0.58);
                        let wPivotY = py + (size * 0.5);
                        ctx.translate(wPivotX, wPivotY);
                        ctx.scale(1.0, 1.0);
                        ctx.translate(-wPivotX, -wPivotY);
                        drawOptimizedSprite(ctx, fakeEq.weapon, SpriteMatrices[fakeEq.weapon], px, py, size);
                        ctx.restore();
                    }
                }
            } else if (typeof SpriteMatrices !== 'undefined' && SpriteMatrices[a.id]) {
                drawOptimizedSprite(ctx, a.id, SpriteMatrices[a.id], px, py, size);
            } else {
                ctx.fillStyle = "#d35400"; ctx.fillRect(px, py, size, size);
            }
        });

        // 5. Force FXEngine
        if (typeof FXEngine !== 'undefined') FXEngine.render(ctx, size);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ClientQuestDirector.init();
});