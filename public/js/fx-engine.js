// ==========================================================
// === UNIFIED VISUAL FX ENGINE (DATA-DRIVEN) ===
// ==========================================================

const FXEngine = {
    queue: [],
    completionFrameMs: 1000 / 60,
    completionFallbackFloorMs: 500,
    completionFallbackGraceMs: 100,

    _getCompletionFallbackDelay: function(fx) {
        if (Number.isFinite(fx.completionFallbackMs)) {
            return Math.max(0, fx.completionFallbackMs);
        }

        const remainingFrames = Math.max(
            1,
            (Number(fx.maxLife) || 1) - (Number(fx.life) || 0)
        );
        return Math.max(
            this.completionFallbackFloorMs,
            Math.ceil(
                (remainingFrames * this.completionFrameMs)
                + this.completionFallbackGraceMs
            )
        );
    },

    _cancelCompletionFallback: function(fx) {
        if (!fx) return;
        if (
            fx.completionTimer !== null
            && fx.completionTimer !== undefined
            && typeof clearTimeout === 'function'
        ) {
            clearTimeout(fx.completionTimer);
        }
        fx.completionTimer = null;
        fx.completionTimerToken = null;
    },

    _armCompletionFallback: function(fx) {
        if (
            !fx
            || fx.completed
            || typeof fx.onComplete !== 'function'
            || typeof setTimeout !== 'function'
        ) {
            return;
        }

        this._cancelCompletionFallback(fx);
        const timerToken = {};
        fx.completionTimerToken = timerToken;
        fx.completionTimer = setTimeout(() => {
            // A cleared timer can still already be queued. Only the newest
            // watchdog may settle the effect.
            if (fx.completed || fx.completionTimerToken !== timerToken) return;
            fx.completionTimer = null;
            fx.completionTimerToken = null;
            this._completeQueuedEffect(fx);
        }, this._getCompletionFallbackDelay(fx));
    },

    _completeQueuedEffect: function(fx) {
        if (!fx || fx.completed) return false;

        fx.completed = true;
        this._cancelCompletionFallback(fx);

        const queueIndex = this.queue.indexOf(fx);
        if (queueIndex >= 0) {
            this.queue.splice(queueIndex, 1);
        }

        if (fx.type === 'MELEE' && fx.attacker) {
            fx.attacker.lungeOffsetX = 0;
            fx.attacker.lungeOffsetY = 0;
            fx.attacker.lungeHop = 0;
        }

        const callback = (
            (fx.type === 'PROJECTILE' || fx.type === 'MELEE')
            && typeof fx.onComplete === 'function'
        )
            ? fx.onComplete
            : null;
        fx.onComplete = null;
        if (callback) callback();
        return true;
    },

    getMagicColors: function(style) {
        const palettes = {
            fire: ['#e74c3c', '#f1c40f', '#d35400'],
            arcane: ['#9b59b6', '#8e44ad', '#3498db'],
            poison: ['#2ecc71', '#27ae60', '#f1c40f'],
            frost: ['#dff9fb', '#74b9ff', '#00cec9'],
            storm: ['#f9ca24', '#7ed6df', '#686de0'],
            shadow: ['#2c2c54', '#706fd3', '#b33939'],
            holy: ['#fff6a3', '#f8c291', '#ffffff']
        };
        return palettes[style] || palettes.fire;
    },

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
        const fx = {
            type: 'PROJECTILE',
            sx: startX, sy: startY,
            tx: targetX, ty: targetY,
            spriteId: spriteId,
            arc: config.arc || 0.5, // 0 = flat trajectory (arrows), > 1 = high lob (bombs)
            spin: config.spin || false,
            life: 0,
            maxLife: config.frames || 20,
            onComplete: config.onComplete || null,
            completed: false,
            completionTimer: null,
            completionTimerToken: null,
            completionFallbackMs: config.completionFallbackMs
        };
        this.queue.push(fx);
        this._armCompletionFallback(fx);
    },
	
	// === 3. CONTINUOUS MAGIC BEAMS (Data-Driven Interpolation) ===
    spawnBeam: function(startX, startY, endX, endY, config = {}) {
        let style = config.style || 'fire';
        let density = config.density || 12;
        let spread = config.spread || 15;
        let speed = config.speed || 15;

        let pxStart = (startX * currentTileSize) + (currentTileSize / 2);
        let pyStart = (startY * currentTileSize) + (currentTileSize / 2);
        let pxEnd = (endX * currentTileSize) + (currentTileSize / 2);
        let pyEnd = (endY * currentTileSize) + (currentTileSize / 2);

        let dx = pxEnd - pxStart;
        let dy = pyEnd - pyStart;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        let particleCount = Math.floor(distance / density); 
        if (particleCount < 1) particleCount = 1; 
        
        let colors = this.getMagicColors(style);

        for (let i = 0; i <= particleCount; i++) {
            setTimeout(() => {
                let progress = i / particleCount;
                let currentX = pxStart + (dx * progress);
                let currentY = pyStart + (dy * progress);
                
                let scatterX = (Math.random() - 0.5) * spread;
                let scatterY = (Math.random() - 0.5) * spread;

                if (typeof activeExplosions !== 'undefined') {
                    activeExplosions.push({
                        x: currentX + scatterX,
                        y: currentY + scatterY,
                        radius: 6 + Math.random() * 8, 
                        color: colors[Math.floor(Math.random() * colors.length)],
                        life: 1.0, 
                        decay: 0.03 + (Math.random() * 0.04) 
                    });
                }
            }, i * speed); 
        }

        const travelTime = particleCount * speed;
        if (typeof config.onComplete === 'function') {
            setTimeout(config.onComplete, travelTime);
        }
        return travelTime;
    },
    // ==============================================================

    // 4. Grid Explosions
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

    spawnMagicBurst: function(gridX, gridY, config = {}) {
        let style = config.style || 'arcane';
        let colors = this.getMagicColors(style);
        let radius = config.radius || 1.35;
        this.spawnExplosion(gridX, gridY, {
            radius: radius,
            colors: colors,
            frames: config.frames || 22
        });

        if (typeof activeExplosions !== 'undefined') {
            let cx = (gridX * currentTileSize) + (currentTileSize / 2);
            let cy = (gridY * currentTileSize) + (currentTileSize / 2);
            let particleCount = config.particles || 28;
            let spread = radius * currentTileSize;

            for (let i = 0; i < particleCount; i++) {
                let angle = Math.random() * Math.PI * 2;
                let distance = Math.random() * spread;
                activeExplosions.push({
                    x: cx + Math.cos(angle) * distance,
                    y: cy + Math.sin(angle) * distance,
                    radius: 5 + Math.random() * 12,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    life: 1.0,
                    decay: 0.025 + (Math.random() * 0.04)
                });
            }
        }
    },

    // 5. Melee Lunges
    spawnMeleeStrike: function(playerRef, targetX, targetY, animType, config = {}) {
        const fx = {
            type: 'MELEE',
            attacker: playerRef, // <--- THE FIX: Change attackerObj to playerRef!
            tx: targetX, ty: targetY,
            animType: animType,
            life: 0,
            maxLife: config.frames || 15, // 15 frames = snappy, visceral strike
            onComplete: config.onComplete || null,
            completed: false,
            completionTimer: null,
            completionTimerToken: null,
            completionFallbackMs: config.completionFallbackMs
        };
        this.queue.push(fx);
        this._armCompletionFallback(fx);
    },

    spawnMeleeImpact: function(targetX, targetY, clipId, config = {}) {
        this.queue.push({
            type: 'MELEE_IMPACT',
            x: targetX,
            y: targetY,
            clipId: clipId === 'bash' ? 'bash' : 'slash',
            life: 0,
            maxLife: config.frames || 10
        });
    },

    // --- MASTER FX RENDER LOOP ---
    render: function(ctx, tileSize) {
        for (let i = this.queue.length - 1; i >= 0; i--) {
            let fx = this.queue[i];
            fx.life++;
            let progress = fx.life / fx.maxLife;

            // Remove dead effects
            if (progress >= 1.0) {
                this._completeQueuedEffect(fx);
                continue;
            }

            // Rendering can be suspended by a backgrounded tab. Refresh the
            // watchdog while frames are healthy so foreground completion stays
            // frame-authored, but a stalled queue still releases combat.
            this._armCompletionFallback(fx);
			
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

                // Safely grab from SpriteRasterCache if it exists globally
                if (typeof SpriteMatrices !== 'undefined' && SpriteMatrices[fx.spriteId]) {
                    if (typeof drawOptimizedSprite === 'function') {
                        drawOptimizedSprite(ctx, fx.spriteId, SpriteMatrices[fx.spriteId], -tileSize/2, -tileSize/2, tileSize);
                    }
                }
            }
            else if (fx.type === 'EXPLOSION') {
                ctx.globalAlpha = globalAlpha;
                let currentRadius = (fx.radius * tileSize) * Math.sin(progress * Math.PI / 2);
                let cx = (fx.x * tileSize) + (tileSize / 2);
                let cy = (fx.y * tileSize) + (tileSize / 2);

                ctx.beginPath(); ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = fx.colors[0]; ctx.fill();
                
                ctx.beginPath(); ctx.arc(cx, cy, currentRadius * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = fx.colors[1]; ctx.fill();
                
                ctx.beginPath(); ctx.arc(cx, cy, currentRadius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = fx.colors[2]; ctx.fill();
            }
            else if (fx.type === 'MELEE_IMPACT') {
                const cx = (fx.x * tileSize) + (tileSize / 2);
                const cy = (fx.y * tileSize) + (tileSize / 2);
                const impactWave = Math.sin(progress * Math.PI);

                ctx.globalAlpha = globalAlpha;
                ctx.translate(cx, cy);
                if (fx.clipId === 'bash') {
                    ctx.strokeStyle = "#f39c12";
                    ctx.lineWidth = Math.max(2, tileSize * 0.08);
                    ctx.beginPath();
                    ctx.arc(0, 0, tileSize * (0.16 + impactWave * 0.34), 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = Math.max(2, tileSize * 0.07);
                    ctx.beginPath();
                    ctx.arc(
                        0,
                        0,
                        tileSize * (0.25 + impactWave * 0.28),
                        -Math.PI * 0.7,
                        Math.PI * 0.18
                    );
                    ctx.stroke();
                }
            }
            else if (fx.type === 'MELEE') {
                let p = fx.attacker;
                if (!p) continue;
                
                let dx = (fx.tx - p.x) * tileSize;
                let dy = (fx.ty - p.y) * tileSize;
                
                let lungeAmount = Math.sin(progress * Math.PI); 

                // --- 1. PHYSICAL MOVEMENT ---
                if (fx.animType === 'lunge_bash' || fx.animType === 'lunge_slash') {
                    p.lungeOffsetX = dx * 0.4 * lungeAmount; 
                    p.lungeOffsetY = dy * 0.4 * lungeAmount;
                } 
                else if (fx.animType === 'jump_smash') {
                    p.lungeOffsetX = dx * 0.4 * lungeAmount;
                    p.lungeOffsetY = dy * 0.4 * lungeAmount;
                    p.lungeHop = lungeAmount * 40; 
                }

                // --- 2. VISUAL OVERLAYS ---
                if (progress > 0.4 && progress < 0.7) {
                    ctx.save();
                    ctx.translate((fx.tx * tileSize) + tileSize/2, (fx.ty * tileSize) + tileSize/2);
                    let angle = Math.atan2(dy, dx);
                    ctx.rotate(angle);
                    
                    if (fx.animType.includes('slash')) {
                        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                        ctx.beginPath(); ctx.arc(0, 0, tileSize/2, -Math.PI/4, Math.PI/4); ctx.fill();
                    } else if (fx.animType.includes('smash') || fx.animType.includes('bash')) {
                        ctx.fillStyle = "rgba(230, 126, 34, 0.7)";
                        ctx.beginPath(); ctx.arc(0, 0, tileSize * 0.7, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                }

                // --- 3. CLEANUP ---
                if (progress >= 0.95) {
                    p.lungeOffsetX = 0; p.lungeOffsetY = 0; p.lungeHop = 0;
                }
            }
            
            ctx.restore();
        } // <--- Properly closes the 'for' loop
    } // <--- Properly closes the 'render' function
}; // <--- Properly closes the FXEngine object
