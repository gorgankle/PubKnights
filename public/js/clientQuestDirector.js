// public/js/clientQuestDirector.js
window.ClientQuestDirector = {
    isActive: false,
    shield: null,
    cinematicActors: [],
    cinematicMap: { cols: 16, rows: 10, tileSize: 54 },
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
            
            if (data.updatedPlayer) Object.assign(player, data.updatedPlayer);
            
            if (data.action === 'RETURN_TOWN' && typeof transitionToTown === 'function') {
                transitionToTown();
            } else if (data.action === 'START_COMBAT') {
                // The movie is over! Seamlessly transition into a real fight.
                socket.emit('deployToCombat', { zoneChoice: 'WILDERNESS', activeLevel: 1 });
            } else {
                if (typeof refreshSystemUI === 'function') refreshSystemUI(); 
            }
        });
    },

    processEvent: function(ev) {
        if (ev.type === 'SET_SCENE') {
            // DETACHMENT: We do NOT ping the combat router. We set up a ghost board.
            gameState = 'CINEMATIC'; 
            this.cinematicMap = { cols: ev.cols || 16, rows: ev.rows || 10, tileSize: ev.tileSize || 54 };
            this.cinematicActors = [];
            this.activeHighlightTile = null;
            
            // Force the combat UI wrapper visible so we have a canvas to draw on
            document.getElementById("top-nav-bar").style.display = "none";
            document.getElementById("town-vault-view").style.display = "none";
            document.getElementById("combat-screen").style.display = "block";
            
            let uiHeader = document.getElementById("target-ui-header");
            if (uiHeader) {
                uiHeader.innerHTML = `🎬 CINEMATIC SEQUENCE RUNNING`;
                uiHeader.style.color = "#9b59b6";
            }

            setTimeout(() => socket.emit('questStepComplete'), 400);
        }
        else if (ev.type === 'SPAWN_ACTOR') {
            // Push a fake actor to our private movie set
            this.cinematicActors.push({ uid: ev.uid, id: ev.actorId, x: ev.x, y: ev.y });
            setTimeout(() => socket.emit('questStepComplete'), 100);
        }
        else if (ev.type === 'DIALOGUE') {
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
    // --- 2. UI HIGHLIGHTING ---
        else if (ev.type === 'HIGHLIGHT_UI') {
            let targetEl = document.getElementById(ev.elementId);
            if (targetEl) {
                targetEl.removeAttribute('disabled'); // <-- ADD THIS LINE
                targetEl.classList.add('director-highlight');
                targetEl.addEventListener('click', () => {
                    this.removeHighlighter();
                    setTimeout(() => socket.emit('questStepComplete'), 100);
                }, { once: true });
            } else {
                socket.emit('questStepComplete');
            }
        }
        else if (ev.type === 'HIGHLIGHT_TILE') {
            this.activeHighlightTile = { x: ev.targetX, y: ev.targetY, style: ev.style };
            
            // Add a temporary click listener to the canvas itself
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
                    
                    // Move the 'player' actor to the clicked tile
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
                    FXEngine.spawnMeleeStrike({x: ev.startX, y: ev.startY}, ev.targetX, ev.targetY, 'lunge_slash');
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

    // --- THE GHOST RENDERER ---
    drawCinematicScene: function(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        let size = this.cinematicMap.tileSize;

        // 1. Draw Floor
        for (let x = 0; x < this.cinematicMap.cols; x++) {
            for (let y = 0; y < this.cinematicMap.rows; y++) {
                if (typeof SpriteMatrices !== 'undefined' && SpriteMatrices['ground_wilderness']) {
                    drawOptimizedSprite(ctx, 'ground_wilderness', SpriteMatrices['ground_wilderness'], x * size, y * size, size);
                } else {
                    ctx.fillStyle = "#273c24"; ctx.fillRect(x * size, y * size, size, size);
                }
                ctx.strokeStyle = "#1a1512"; ctx.strokeRect(x * size, y * size, size, size);
            }
        }

        // 2. Draw Highlight Tile
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

        // 3. Draw Actors
        this.cinematicActors.forEach(a => {
            let px = a.x * size;
            let py = a.y * size;
            
            if (a.id === 'player') {
                // If it's the player, we can borrow the cached player portrait logic from dialogue or just render the body
                if (typeof SpriteMatrices !== 'undefined' && SpriteMatrices['body_male']) {
                    drawOptimizedSprite(ctx, 'body_male', SpriteMatrices['body_male'], px, py, size);
                    drawOptimizedSprite(ctx, 'hair_messy', SpriteMatrices['hair_messy'], px, py, size);
                }
            } else if (typeof SpriteMatrices !== 'undefined' && SpriteMatrices[a.id]) {
                drawOptimizedSprite(ctx, a.id, SpriteMatrices[a.id], px, py, size);
            } else {
                ctx.fillStyle = "#d35400"; ctx.fillRect(px, py, size, size);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ClientQuestDirector.init();
});