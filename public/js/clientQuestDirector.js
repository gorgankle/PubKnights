// public/js/clientQuestDirector.js
window.ClientQuestDirector = {
    
    isActive: false,
    shield: null,

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
            e.stopPropagation();
            e.preventDefault();
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
                // Free the combat UI lock natively
                if (typeof refreshSystemUI === 'function') refreshSystemUI();
            }
            
            if (typeof refreshSystemUI === 'function') refreshSystemUI(); 
        });
    },

    processEvent: function(ev) {
        // --- 1. DIALOGUE ---
        if (ev.type === 'DIALOGUE') {
            if (typeof playDialogueSequence === 'function') {
                playDialogueSequence(ev.sequence); 
            }
        } 
		// --- SCENE ROUTING ---
       else if (ev.type === 'SET_SCENE') {
    // 1. Tell the server to deploy the combat zone
    socket.emit('deployToCombat', { 
        zoneChoice: ev.zone,
        customCols: ev.cols,
        customRows: ev.rows,
        customTileSize: ev.tileSize
    });

    // 2. CRITICAL: Do NOT emit 'questStepComplete' here.
    // We wait for the server to send the 'combatDeployed' socket event.
}
        
        // --- FADES ---
        else if (ev.type === 'FADE') {
            // We use the shield itself to simulate the fade!
            this.shield.style.display = 'block';
            this.shield.style.transition = `background-color ${ev.duration}ms ease`;
            
            if (ev.direction === 'OUT') {
                this.shield.style.backgroundColor = ev.color || '#000000';
            } else {
                this.shield.style.backgroundColor = 'transparent';
            }
            
            setTimeout(() => {
                this.shield.style.transition = 'none';
                socket.emit('questStepComplete');
            }, ev.duration + 100);
        }
        
        // --- 2. UI HIGHLIGHTING ---
        else if (ev.type === 'HIGHLIGHT_UI') {
            let targetEl = document.getElementById(ev.elementId);
            if (targetEl) {
                targetEl.classList.add('director-highlight');
                targetEl.addEventListener('click', () => {
                    this.removeHighlighter();
                    setTimeout(() => socket.emit('questStepComplete'), 100);
                }, { once: true });
            } else {
                socket.emit('questStepComplete');
            }
        }

        // --- 3. AUDIO ---
        else if (ev.type === 'AUDIO') {
            if (ev.action === 'PLAY' && typeof cycleMusicTrack === 'function' && typeof musicTracks !== 'undefined') {
                let trackIndex = musicTracks.findIndex(t => t.name === ev.trackName);
                if (trackIndex !== -1) {
                    activeTrackIndex = trackIndex - 1; // Offset for cycle logic
                    cycleMusicTrack();
                }
            } else if (ev.action === 'SFX' && typeof playRetroSound === 'function') {
                playRetroSound(ev.trackName); // Repurposed for SFX triggers
            }
            socket.emit('questStepComplete'); 
        }
        
        // --- 4. UTILITY / FADES / DELAYS ---
        else if (ev.type === 'DELAY') {
            setTimeout(() => socket.emit('questStepComplete'), ev.duration || 1000);
        }
        else if (ev.type === 'FADE') {
            // Can be expanded to trigger a CSS fade div in the future
            setTimeout(() => socket.emit('questStepComplete'), ev.duration || 1000);
        }
        
        // --- 5. COMBAT BOARD INJECTIONS ---
        else if (ev.type === 'SHAKE' || ev.type === 'PLAY_FX' || ev.type === 'SPAWN_ACTOR' || ev.type === 'HIGHLIGHT_TILE') {
            if (ev.type === 'SHAKE' && document.getElementById('combat-screen')) {
                document.getElementById('combat-screen').animate([
                    { transform: 'translate(2px, 1px) rotate(0deg)' },
                    { transform: 'translate(-1px, -2px) rotate(-1deg)' },
                    { transform: 'translate(1px, 2px) rotate(0deg)' }
                ], { duration: 300, iterations: 1 });
            } 
            else if (ev.type === 'SPAWN_ACTOR' && typeof enemies !== 'undefined') {
                // Instantly inject the actor into the local combat state for rendering
                enemies.push({ uid: ev.uid, name: ev.actorId, id: ev.actorId, x: ev.x, y: ev.y, hp: 1, maxHp: 1, alive: true, size: 1, speed: 1, defense: 0 });
                if (typeof drawGrid === 'function') drawGrid();
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
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ClientQuestDirector.init();
});