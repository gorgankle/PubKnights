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
	
	// === UPDATED: CONTINUOUS MAGIC BEAMS (Data-Driven Interpolation) ===
    spawnBeam: function(startX, startY, endX, endY, config = {}) {
        // 1. Extract the custom variables (with safe fallbacks)
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
        
        // 2. Use the data-driven DENSITY 
        let particleCount = Math.floor(distance / density); 
        if (particleCount < 1) particleCount = 1; 
        
        let colors = style === 'fire' ? ['#e74c3c', '#f1c40f', '#d35400'] : 
                     style === 'arcane' ? ['#9b59b6', '#8e44ad', '#3498db'] :
                     style === 'poison' ? ['#2ecc71', '#27ae60', '#f1c40f'] : ['#ffffff'];

        for (let i = 0; i <= particleCount; i++) {
            setTimeout(() => {
                let progress = i / particleCount;
                let currentX = pxStart + (dx * progress);
                let currentY = pyStart + (dy * progress);
                
                // 3. Use the data-driven SPREAD volatility
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

        // 4. Fire the particles in a rapid sequence along the vector path
        for (let i = 0; i <= particleCount; i++) {
            setTimeout(() => {
                let progress = i / particleCount;
                let currentX = pxStart + (dx * progress);
                let currentY = pyStart + (dy * progress);
                
                // Add a slight random scatter so the beam looks volatile
                let scatterX = (Math.random() - 0.5) * 15;
                let scatterY = (Math.random() - 0.5) * 15;

                // Push to your existing particle render loop!
                // NOTE: Make sure this pushes to whatever array your renderer.js uses to draw explosions/particles!
                if (typeof activeExplosions !== 'undefined') {
                    activeExplosions.push({
                        x: currentX + scatterX,
                        y: currentY + scatterY,
                        radius: 6 + Math.random() * 8, // Varies size between 6 and 14
                        color: colors[Math.floor(Math.random() * colors.length)],
                        life: 1.0, 
                        decay: 0.03 + (Math.random() * 0.04) // Fast fade out
                    });
                }
                
            }, i * 15); // Stagger the spawns by 15ms so the beam physically "travels" forward!
        }
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

    // 5. Melee Lunges
    spawnMeleeStrike: function(playerRef, targetX, targetY, animType, config = {}) {
        this.queue.push({
            type: 'MELEE',
            attacker: playerRef, // <--- THE FIX: Change attackerObj to playerRef!
            tx: targetX, ty: targetY,
            animType: animType,
            life: 0,
            maxLife: config.frames || 15, // 15 frames = snappy, visceral strike
            onComplete: config.onComplete || null
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
                let callback = null;
                if ((fx.type === 'PROJECTILE' || fx.type === 'MELEE') && typeof fx.onComplete === 'function') {
                    callback = fx.onComplete;
                }
                
                this.queue.splice(i, 1);
                if (callback) callback();
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