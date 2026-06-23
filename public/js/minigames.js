// --- minigames.js ---
let lumberGameActive = false;
let lumberTimer = 90;
let lumberInterval = null;
let lumberPoints = 0;
let lumberCombo = 1;

let lCanvas, lCtx;
let indicatorPos = 0;
let indicatorDirection = 1; // 1 for right, -1 for left
let baseSpeed = 4; // Sped up slightly for the larger canvas
let currentSpeed = baseSpeed;
let isFrozen = false;
let animationFrameId = null;

let barWidth = 600; // Fixed canvas width
// CRITICAL ADJUSTMENT: Widen target zone to fit much larger Log
const targetWidth = 160; 
const indicatorWidth = 10;
let targetPos = 200;

function setRandomTarget() {
    // Keep target completely within the bounds of the bar
    let maxPos = barWidth - targetWidth;
    targetPos = Math.floor(Math.random() * maxPos);
}

function startLumberMinigame() {
    lCanvas = document.getElementById("lumber-canvas");
    lCtx = lCanvas.getContext("2d");
    
    lumberGameActive = true;
    lumberTimer = 90;
    lumberPoints = 0;
    lumberCombo = 1;
    currentSpeed = baseSpeed;
    indicatorPos = 0;
    
    document.getElementById("lumber-start-btn").style.display = "none";
    document.getElementById("lumber-chop-btn").style.display = "block";
    
    updateLumberUI();
    setRandomTarget();
    
    if (typeof playRetroSound === 'function') playRetroSound('combatStart');

    // Start 90-second countdown
    lumberInterval = setInterval(() => {
        lumberTimer--;
        document.getElementById("lumber-timer").innerText = lumberTimer + "s";
        if (lumberTimer <= 0) {
            endLumberMinigame();
        }
    }, 1000);

    // Start the visual bounce loop
    isFrozen = false;
    cancelAnimationFrame(animationFrameId);
    lumberLoop();
}

function lumberLoop() {
    if (!lumberGameActive) return;

    if (!isFrozen) {
        indicatorPos += (currentSpeed * indicatorDirection);

        // Bounce off walls
        if (indicatorPos >= (barWidth - indicatorWidth)) {
            indicatorPos = barWidth - indicatorWidth;
            indicatorDirection = -1;
        } else if (indicatorPos <= 0) {
            indicatorPos = 0;
            indicatorDirection = 1;
        }
    }

    // 1. Clear Canvas Background
    lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);

    // 2. Draw Target Zone
    lCtx.fillStyle = 'rgba(46, 204, 113, 0.2)';
    lCtx.fillRect(targetPos, 0, targetWidth, lCanvas.height);
    lCtx.strokeStyle = '#2ecc71';
    lCtx.lineWidth = 2;
    lCtx.strokeRect(targetPos, 0, targetWidth, lCanvas.height);

    // 3. Draw the Target Sprite (Log)
    if (typeof drawProceduralSprite === 'function' && SpriteMatrices["sprite_minigame_log"]) {
        // ENLARGEMENT CHANGE: Log size increased from 60 to 150
        let logSize = 150;
        let logX = targetPos + (targetWidth / 2) - (logSize / 2);
        // reposition logic centers the bigger log within the taller canvas
        let logY = (lCanvas.height / 2) - (logSize / 2);
        drawProceduralSprite(lCtx, SpriteMatrices["sprite_minigame_log"], logX, logY, logSize);
    }

    // 4. Draw the Moving Indicator (Axe)
    if (typeof drawProceduralSprite === 'function' && SpriteMatrices["sprite_minigame_axe"]) {
        // ENLARGEMENT CHANGE: Axe size increased from 60 to 150
        let axeSize = 150;
        // Center the axe horizontally over the mathematical indicatorPos
        let axeX = indicatorPos - (axeSize / 2) + (indicatorWidth / 2);
        // reposition logic handles vertical centering
        let axeY = (lCanvas.height / 2) - (axeSize / 2);
        
        lCtx.save();
        
        // Flip the axe depending on the direction it's traveling
        if (indicatorDirection === -1) {
            lCtx.translate(axeX * 2 + axeSize, 0);
            lCtx.scale(-1, 1);
        }
        
        // If frozen (chopping), rotate it downward!
        if (isFrozen) {
            // Pivot around the bottom center of the axe handle
            let pivotX = axeX + (axeSize / 2);
            let pivotY = axeY + axeSize;
            lCtx.translate(pivotX, pivotY);
            lCtx.rotate(Math.PI / 3); // 60 degrees down
            lCtx.translate(-pivotX, -pivotY);
        }
        
        drawProceduralSprite(lCtx, SpriteMatrices["sprite_minigame_axe"], axeX, axeY, axeSize);
        lCtx.restore();
        
        // Draw a tiny red dot to show the exact mathematical collision center
        lCtx.fillStyle = '#e74c3c';
        lCtx.fillRect(indicatorPos, lCanvas.height - 4, indicatorWidth, 4);
    } else {
        // Fallback if sprites fail
        lCtx.fillStyle = '#f1c40f';
        lCtx.fillRect(indicatorPos, 0, indicatorWidth, lCanvas.height);
    }

    animationFrameId = requestAnimationFrame(lumberLoop);
}

function executeChop() {
    if (!lumberGameActive || isFrozen) return;

    // Freeze the indicator so the player sees the axe hit the log
    isFrozen = true;
    
    let indLeft = indicatorPos;
    let indRight = indicatorPos + indicatorWidth;
    let tgtLeft = targetPos;
    let tgtRight = targetPos + targetWidth;

    let hit = (indRight >= tgtLeft && indLeft <= tgtRight);
    let feedbackEl = document.getElementById("lumber-feedback");

    if (hit) {
        if (typeof playRetroSound === 'function') playRetroSound('heavyAttack');
        let pointsEarned = 10 * lumberCombo;
        lumberPoints += pointsEarned;
        lumberCombo++;
        
        // DYNAMIC DIFFICULTY: Increase speed by 5% every hit!
        currentSpeed = baseSpeed * Math.pow(1.05, lumberCombo - 1);
        
        feedbackEl.innerHTML = `<span style="color:#2ecc71;">PERFECT CHOP! +${pointsEarned} Pts</span>`;
    } else {
        if (typeof playRetroSound === 'function') playRetroSound('error');
        lumberCombo = 1;
        currentSpeed = baseSpeed; // Reset speed on miss
        feedbackEl.innerHTML = `<span style="color:#e74c3c;">MISSED! Combo Reset.</span>`;
    }

    updateLumberUI();

    // Thaw after 400ms (slightly longer to admire the animation)
    setTimeout(() => {
        if (!lumberGameActive) return;
        setRandomTarget();
        feedbackEl.innerHTML = "";
        isFrozen = false;
    }, 400);
}

function updateLumberUI() {
    document.getElementById("lumber-points-display").innerText = lumberPoints;
    document.getElementById("lumber-combo-display").innerText = lumberCombo + "x";
}

function endLumberMinigame() {
    lumberGameActive = false;
    clearInterval(lumberInterval);
    cancelAnimationFrame(animationFrameId);
    
    // Clear canvas visually
    if (lCtx) lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);
    
    document.getElementById("lumber-chop-btn").style.display = "none";
    
    let feedbackEl = document.getElementById("lumber-feedback");
    feedbackEl.innerHTML = `<span style="color:#f1c40f;">ROUND OVER! Final Score: ${lumberPoints}</span>`;
    
    if (typeof playRetroSound === 'function') playRetroSound('victory');

    // Payloads remain clean, only emitting points for the store
    socket.emit('townAction', { action: 'claimLumberMinigame', points: lumberPoints });

    setTimeout(() => {
        document.getElementById("lumber-start-btn").style.display = "block";
        document.getElementById("lumber-start-btn").innerText = "PLAY AGAIN";
    }, 1500);
}

function leaveMinigame() {
    if (lumberGameActive) {
        let confirmLeave = confirm("Abandon current round? You will lose these points!");
        if (!confirmLeave) return;
    }
    
    // Force a cleanup
    lumberGameActive = false;
    clearInterval(lumberInterval);
    cancelAnimationFrame(animationFrameId);
    
    document.getElementById("lumber-start-btn").style.display = "block";
    document.getElementById("lumber-chop-btn").style.display = "none";
    document.getElementById("lumber-feedback").innerHTML = "";
    
    setGameState('ADVENTURES');
}

// ==========================================
// --- 2D POOL TENSION FISHING MINIGAME ---
// ==========================================

let fishingGameActive = false;
let fishingTimer = 90;
let fishingInterval = null;
let fishingAnimFrameId = null;

let fCanvas, fCtx;
let fishingScore = 0;
let fishingPoints = 0;
let fishes = [];
let activeHookedFish = null;
let isReeling = false;

// Physics constants as requested by user
const GRAVITY = 0.1;
const LIFT = 0.1;
const THRASH_SPEED = .7;

// Phase State Machine: 0 = Sweeping, 1 = Dropping, 2 = Waiting, 3 = Reeling
let fishingPhase = 0; 

// Track & Zone Variables
let trackX = 50;
let trackDir = 1;
let trackSpeed = 5;
const TRACK_W = 60;
const TRACK_TOP = 40;
let TRACK_H = 300; 

let zoneY = 0;
let zoneVel = 0;
let zoneH = 50; // Small square catch zone

class PoolFish {
    constructor(canvasWidth, canvasHeight) {
        this.cw = canvasWidth; this.ch = canvasHeight;
        this.spawn();
    }

    spawn() {
        // Size Tiers: 0 = Small/Fast, 1 = Medium, 2 = Big/Thrashy
        this.tier = Math.floor(Math.random() * 3);
        
        if (this.tier === 0) { this.radius = 12; this.pts = 10; this.speed = 2.0 + Math.random(); }
        else if (this.tier === 1) { this.radius = 18; this.pts = 20; this.speed = 1.4 + Math.random() * 0.6; }
        else { this.radius = 24; this.pts = 35; this.speed = 0.8 + Math.random() * 0.4; }

        this.y = TRACK_TOP + this.radius + Math.random() * (TRACK_H - this.radius * 2);
        
        // Spawn randomly going left or right
        this.dir = Math.random() > 0.5 ? 1 : -1;
        this.x = this.dir === 1 ? -50 : this.cw + 50;
        
        this.color = '#e74c3c'; // Red unhooked
        this.isHooked = false;
        this.captureProgress = 20;
        
        // Thrash variables
        this.thrashTargetY = this.y;
        this.thrashTimer = 0;
    }

    update() {
        if (this.isHooked) {
            // Thrashing Logic - Moves erratically UP and DOWN only
            this.thrashTimer--;
            if (this.thrashTimer <= 0) {
                // Pick a new random height inside the track
                this.thrashTargetY = TRACK_TOP + this.radius + Math.random() * (TRACK_H - this.radius * 2);
                
                // Bigger fish change direction slightly slower
                this.thrashTimer = 15 + Math.random() * (30 + this.tier * 10); 
            }

            // Move smoothly towards thrash target height (multiplied by thrash speed request)
            this.y += (this.thrashTargetY - this.y) * 0.05 * THRASH_SPEED;

            // Check overlap with the Catch Zone
            let fishTop = this.y - this.radius;
            let fishBottom = this.y + this.radius;
            let zoneTop = zoneY;
            let zoneBottom = zoneY + zoneH;
            
            let overlap = !(fishBottom < zoneTop || fishTop > zoneBottom);
            
            if (overlap) {
                this.captureProgress += 0.7; // Reeling in
            } else {
                this.captureProgress -= 0.15; // Slipping away
            }
            this.captureProgress = Math.max(0, Math.min(100, this.captureProgress));

        } else {
            // Normal Swimming (Horizontal)
            this.x += this.speed * this.dir;
            if ((this.dir === 1 && this.x > this.cw + 50) || (this.dir === -1 && this.x < -50)) {
                this.spawn(); // Respawn if swims off screen
            }
        }
    }

    draw(ctx) {
        // We calculate the top-left X/Y based on the center coordinates and radius
        let spriteSize = this.radius * 2.5; // Scale the 24x24 matrix up based on fish tier
        let startX = this.x - (spriteSize / 2);
        let startY = this.y - (spriteSize / 2);

        // Save context state to handle the directional flipping
        ctx.save();
        
        // If the fish is swimming left, we mirror the canvas horizontally
        if (this.dir === -1) {
            ctx.translate(this.x * 2, 0); // Shift over by 2x the X pos
            ctx.scale(-1, 1);             // Flip horizontally
        }

        // Apply a visual tint if hooked! We do this by dropping a semi-transparent overlay
        if (this.isHooked) {
            ctx.globalAlpha = 0.5;
            // Draw a green highlight behind it
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // Call your established Procedural Renderer!
        if (typeof drawProceduralSprite === 'function' && SpriteMatrices["sprite_minigame_fish"]) {
            drawProceduralSprite(ctx, SpriteMatrices["sprite_minigame_fish"], startX, startY, spriteSize);
        }

        ctx.restore();

        // Draw Progress Bar next to the dynamically moving track
        if (this.isHooked) {
            ctx.fillStyle = '#110d0a';
            ctx.fillRect(trackX + TRACK_W + 10, TRACK_TOP, 10, TRACK_H);
            
            ctx.fillStyle = this.captureProgress > 50 ? '#2ecc71' : '#e67e22';
            let barFillH = (this.captureProgress / 100) * TRACK_H;
            ctx.fillRect(trackX + TRACK_W + 10, TRACK_TOP + (TRACK_H - barFillH), 10, barFillH);
        }
    }
}

function startFishingMinigame() {
    fCanvas = document.getElementById("fishing-pool-canvas");
    fCtx = fCanvas.getContext("2d");
    
    // Set dynamic heights
    TRACK_H = fCanvas.height - 80;
    
    fishingGameActive = true;
    fishingTimer = 90;
    fishingScore = 0;
    fishingPoints = 0;
    activeHookedFish = null;
    isReeling = false;
    
    // Initial State reset
    fishingPhase = 0;
    trackX = 50;
    zoneY = TRACK_TOP;
    zoneVel = 0;
    
    fishes = [];
    
    // Spawn initial fish
    for(let i=0; i<6; i++) {
        // Stagger their start positions so they don't all appear at once
        let f = new PoolFish(fCanvas.width, fCanvas.height);
        f.x = Math.random() * fCanvas.width; 
        fishes.push(f);
    }

    document.getElementById("fishing-start-btn").style.display = "none";
    document.getElementById("fishing-feedback").innerText = "Click to Cast. Click again when fish is centered to Hook. Hold to Reel!";
    updateFishingUI();

    // --- INPUT LISTENERS (State Machine Driver) ---
    const handleDown = (evt) => {
        if (!fishingGameActive) return;
        evt.preventDefault();
        isReeling = true;
        
        if (fishingPhase === 0) {
            // Player Casts the line!
            fishingPhase = 1;
            if (typeof playRetroSound === 'function') playRetroSound('equip');
        } 
        else if (fishingPhase === 1 || fishingPhase === 2) {
            // Player strikes while the hook is floating down (1) or resting at bottom (2)!
            let hit = false;
            for (let f of fishes) {
                // Strict check 1: Is the fish perfectly inside the vertical track?
                let inTrack = Math.abs(f.x - (trackX + TRACK_W / 2)) < 25;
                
                // Strict check 2: Is the fish vertically overlapping the blue Catch Zone?
                let fishTop = f.y - f.radius;
                let fishBottom = f.y + f.radius;
                let zoneBottom = zoneY + zoneH;
                let inZone = !(fishBottom < zoneY || fishTop > zoneBottom);

                if (inTrack && inZone) {
                    f.isHooked = true;
                    f.x = trackX + TRACK_W / 2; // Center it perfectly in the track
                    activeHookedFish = f;
                    fishingPhase = 3;
                    hit = true;
                    if (typeof playRetroSound === 'function') playRetroSound('splat'); // Bite sound!
                    break; // Only hook one at a time
                }
            }
            
            if (!hit) {
                // Missed the strike. Recall line back to Sweeping phase.
                fishingPhase = 0;
                if (typeof playRetroSound === 'function') playRetroSound('error');
            }
        }
    };
    
    const handleUp = (evt) => {
        if (!fishingGameActive) return;
        evt.preventDefault();
        isReeling = false;
    };

    fCanvas.onmousedown = handleDown;
    fCanvas.ontouchstart = handleDown;
    
    // Releasing the mouse/touch anywhere stops the reeling
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);

    if (typeof playRetroSound === 'function') playRetroSound('combatStart');

    fishingInterval = setInterval(() => {
        fishingTimer--;
        document.getElementById("fishing-timer").innerText = fishingTimer + "s";
        if (fishingTimer <= 0) endFishingSession();
    }, 1000);

    cancelAnimationFrame(fishingAnimFrameId);
    fishingLoop();
}

function fishingLoop() {
    if (!fishingGameActive) return;

    // Clear Water
    fCtx.clearRect(0, 0, fCanvas.width, fCanvas.height);

    // --- PHASE STATE MACHINE ---
    if (fishingPhase === 0) {
        // Sweeping left and right
        trackX += trackSpeed * trackDir;
        if (trackX <= 0) { trackX = 0; trackDir = 1; }
        if (trackX >= fCanvas.width - TRACK_W) { trackX = fCanvas.width - TRACK_W; trackDir = -1; }
        zoneY = TRACK_TOP; // Lock at top
    } 
    else if (fishingPhase === 1) {
        // Sinks slowly ("floats" down the water column)
        zoneY += 1.5; 
        if (zoneY >= TRACK_TOP + TRACK_H - zoneH) {
            zoneY = TRACK_TOP + TRACK_H - zoneH; // Lock at bottom
            fishingPhase = 2; // Move to waiting phase
        }
    } 
    else if (fishingPhase === 2) {
        // Waiting at the bottom for a strike
        zoneY = TRACK_TOP + TRACK_H - zoneH; // Keep locked at bottom
    } 
    else if (fishingPhase === 3) {
        // Reeling / Tension Game
        if (isReeling) zoneVel -= LIFT;    // Lift
        else zoneVel += GRAVITY;           // Gravity
        
        zoneVel *= 0.95; // Friction so it moves smoothly
        zoneY += zoneVel;

        // Hard Boundaries for Catch Zone
        if (zoneY < TRACK_TOP) { zoneY = TRACK_TOP; zoneVel = 0; }
        if (zoneY > TRACK_TOP + TRACK_H - zoneH) { zoneY = TRACK_TOP + TRACK_H - zoneH; zoneVel = 0; }
    }

    // --- DRAWING: Background Track ---
    fCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    fCtx.fillRect(trackX, TRACK_TOP, TRACK_W, TRACK_H);
    fCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    fCtx.strokeRect(trackX, TRACK_TOP, TRACK_W, TRACK_H);

    // --- DRAWING: Catch Zone ---
    fCtx.fillStyle = 'rgba(52, 152, 219, 0.5)';
    fCtx.fillRect(trackX, zoneY, TRACK_W, zoneH);
    fCtx.strokeStyle = '#3498db';
    fCtx.lineWidth = 2;
    fCtx.strokeRect(trackX, zoneY, TRACK_W, zoneH);

    // Update & Draw Fish
    for (let f of fishes) {
        f.update();
        f.draw(fCtx);

        if (f.isHooked) {
            if (f.captureProgress >= 100) {
                // CAUGHT!
                fishingScore++;
                fishingPoints += f.pts;
                updateFishingUI();
                if (typeof playRetroSound === 'function') playRetroSound('coin');
                activeHookedFish = null;
                fishingPhase = 0; // Reset cast
                f.spawn(); // Instantly recycle fish
            } else if (f.captureProgress <= 0) {
                // ESCAPED!
                if (typeof playRetroSound === 'function') playRetroSound('error');
                activeHookedFish = null;
                fishingPhase = 0; // Reset cast
                f.isHooked = false;
                f.dir = f.dir === 1 ? -1 : 1; // Turn around
                f.speed = 8; // Swim away fast
            }
        }
    }

    fishingAnimFrameId = requestAnimationFrame(fishingLoop);
}

function updateFishingUI() {
    document.getElementById("fishing-score").innerText = fishingScore;
    document.getElementById("fishing-points").innerText = fishingPoints;
}

function endFishingSession() {
    fishingGameActive = false;
    clearInterval(fishingInterval);
    cancelAnimationFrame(fishingAnimFrameId);
    
    // Clear the cleanup listeners to prevent memory leaks
    window.removeEventListener('mouseup', () => isReeling = false);
    window.removeEventListener('touchend', () => isReeling = false);
    
    fCtx.clearRect(0, 0, fCanvas.width, fCanvas.height);
    document.getElementById("fishing-start-btn").style.display = "block";
    document.getElementById("fishing-start-btn").innerText = "CAST AGAIN";
    
    let fb = document.getElementById("fishing-feedback");
    
    if (fishingScore > 0) {
        fb.innerHTML = `<span style="color:#2ecc71;">Session Ended! Secured ${fishingScore} Fish and ${fishingPoints} Pts!</span>`;
        if (typeof playRetroSound === 'function') playRetroSound('victory');
        socket.emit('townAction', { action: 'claimFishingMinigame', points: fishingPoints, fishCaught: fishingScore });
    } else {
        fb.innerHTML = `<span style="color:#e74c3c;">Session Ended. Nothing was biting...</span>`;
        if (typeof playRetroSound === 'function') playRetroSound('error');
    }
}

function leaveFishingMinigame() {
    if (fishingGameActive) {
        if (!confirm("Abandon current session? You will lose any un-beamed catches!")) return;
    }
    fishingGameActive = false;
    clearInterval(fishingInterval);
    cancelAnimationFrame(fishingAnimFrameId);
    
    document.getElementById("fishing-start-btn").style.display = "block";
    setGameState('ADVENTURES');
}

// ==========================================
// --- 2D RIPEN & PICK HOPS MINIGAME ---
// ==========================================

let hopsGameActive = false;
let hopsTimer = 90;
let hopsInterval = null;
let hopsAnimFrameId = null;

let hCanvas, hCtx;
let hopsScore = 0;
let hopsPoints = 0;
let hopsGrid = [];
let hCols = 5; 
let hRows = 3;
let hCellSize = 130;
let hOffsetX = 0; 
let hOffsetY = 0;

function initHopsGrid() {
    hopsGrid = [];
    // Center the grid dynamically based on canvas size
    hOffsetX = (hCanvas.width - (hCols * hCellSize)) / 2;
    hOffsetY = (hCanvas.height - (hRows * hCellSize)) / 2;

    for(let r=0; r<hRows; r++) {
        for(let c=0; c<hCols; c++) {
            // State: 0:Empty, 1:Growing, 2:Ripe, 3:Rotten
            hopsGrid.push({ c, r, state: 0, timer: 0 }); 
        }
    }
}

function startHopsMinigame() {
    hCanvas = document.getElementById("hops-farm-canvas");
    hCtx = hCanvas.getContext("2d");
    
    hopsGameActive = true;
    hopsTimer = 90;
    hopsScore = 0;
    hopsPoints = 0;
    
    initHopsGrid();

    document.getElementById("hops-start-btn").style.display = "none";
    document.getElementById("hops-feedback").innerText = "Harvest active! Watch the vines!";
    updateHopsUI();

    // --- INPUT LISTENER ---
    hCanvas.onmousedown = (e) => handleHopsClick(e);
    hCanvas.ontouchstart = (e) => { e.preventDefault(); handleHopsClick(e.touches[0] || e); };

    if (typeof playRetroSound === 'function') playRetroSound('combatStart');

    hopsInterval = setInterval(() => {
        hopsTimer--;
        document.getElementById("hops-timer").innerText = hopsTimer + "s";
        if (hopsTimer <= 0) endHopsSession();
    }, 1000);

    cancelAnimationFrame(hopsAnimFrameId);
    hopsLastTime = performance.now();
    hopsLoop(hopsLastTime);
}

let hopsLastTime = 0;

function hopsLoop(timestamp) {
    if (!hopsGameActive) return;
    
    let dt = (timestamp - hopsLastTime) / 1000;
    hopsLastTime = timestamp;
    if (dt > 0.1) dt = 0.1; // Prevent lag spirals

    hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);

    // 1. Spawning Logic
    if (Math.random() < 0.04) { // Spawn rate
        let emptyCells = hopsGrid.filter(cell => cell.state === 0);
        if (emptyCells.length > 0) {
            let cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            cell.state = 1; cell.timer = 0;
        }
    }

    // 2. Update States & Draw
    hopsGrid.forEach(cell => {
        let x = hOffsetX + cell.c * hCellSize;
        let y = hOffsetY + cell.r * hCellSize;
        let innerSize = hCellSize - 10;
        
        // Draw vine background ("Map" flooring for the node)
        hCtx.fillStyle = '#1e2d17'; // Dark dirt/leaf background
        hCtx.fillRect(x, y, innerSize, innerSize);
        hCtx.strokeStyle = '#2d4a22';
        hCtx.lineWidth = 4;
        hCtx.strokeRect(x, y, innerSize, innerSize);

        if (cell.state > 0) {
            cell.timer += dt;
            
            // Speed up the life cycle slightly as time drops to increase tension
            let speedMult = hopsTimer < 30 ? 0.8 : 1.0; 

            if (cell.state === 1 && cell.timer > (1.5 * speedMult)) { cell.state = 2; cell.timer = 0; } // Grow -> Ripe
            else if (cell.state === 2 && cell.timer > (1.8 * speedMult)) { cell.state = 3; cell.timer = 0; } // Ripe -> Rotten
            else if (cell.state === 3 && cell.timer > 1.2) { cell.state = 0; cell.timer = 0; } // Rotten -> Empty

            let spriteKey = null;
            let padding = 10;
            
            // Determine which 24x24 matrix to pass to the renderer
            if (cell.state === 1) { spriteKey = "sprite_minigame_hops_growing"; padding = 30; } 
            else if (cell.state === 2) { spriteKey = "sprite_minigame_hops_ripe"; padding = 10; } 
            else if (cell.state === 3) { spriteKey = "sprite_minigame_hops_rotten"; padding = 10; }

            if (spriteKey && typeof drawProceduralSprite === 'function' && SpriteMatrices[spriteKey]) {
                // We calculate a slightly padded size to fit beautifully inside the grid box
                let renderSize = innerSize - padding;
                let renderX = x + (padding / 2);
                let renderY = y + (padding / 2);
                
                drawProceduralSprite(hCtx, SpriteMatrices[spriteKey], renderX, renderY, renderSize);
            }
        }
    });

    hopsAnimFrameId = requestAnimationFrame(hopsLoop);
}

function handleHopsClick(e) {
    if (!hopsGameActive) return;
    
    const r = hCanvas.getBoundingClientRect();
    const scaleX = hCanvas.width / r.width;
    const scaleY = hCanvas.height / r.height;
    
    let mx = (e.clientX - r.left) * scaleX;
    let my = (e.clientY - r.top) * scaleY;

    hopsGrid.forEach(cell => {
        let x = hOffsetX + cell.c * hCellSize;
        let y = hOffsetY + cell.r * hCellSize;
        let innerSize = hCellSize - 10;
        
        if (mx > x && mx < x + innerSize && my > y && my < y + innerSize) {
            if (cell.state === 2) { 
                // Hit!
                hopsScore += 1; 
                hopsPoints += 15;
                cell.state = 0; 
                if (typeof playRetroSound === 'function') playRetroSound('coin');
            }
            else if (cell.state === 1 || cell.state === 3) { 
                // Miss/Bad click!
                hopsPoints = Math.max(0, hopsPoints - 5); 
                cell.state = 0; 
                if (typeof playRetroSound === 'function') playRetroSound('error');
            }
            updateHopsUI();
        }
    });
}

function updateHopsUI() {
    document.getElementById("hops-score").innerText = hopsScore;
    document.getElementById("hops-points").innerText = hopsPoints;
}

function endHopsSession() {
    hopsGameActive = false;
    clearInterval(hopsInterval);
    cancelAnimationFrame(hopsAnimFrameId);
    
    hCanvas.onmousedown = null;
    hCanvas.ontouchstart = null;
    
    hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);
    document.getElementById("hops-start-btn").style.display = "block";
    document.getElementById("hops-start-btn").innerText = "FARM AGAIN";
    
    let fb = document.getElementById("hops-feedback");
    
    if (hopsScore > 0) {
        fb.innerHTML = `<span style="color:#2ecc71;">Harvest Ended! Secured ${hopsScore} Hops and ${hopsPoints} Pts!</span>`;
        if (typeof playRetroSound === 'function') playRetroSound('victory');
        socket.emit('townAction', { action: 'claimHopsMinigame', points: hopsPoints, hopsHarvested: hopsScore });
    } else {
        fb.innerHTML = `<span style="color:#e74c3c;">Harvest Ended. The crops withered...</span>`;
        if (typeof playRetroSound === 'function') playRetroSound('error');
    }
}

function leaveHopsMinigame() {
    if (hopsGameActive) {
        if (!confirm("Abandon current harvest? You will lose any un-beamed crops!")) return;
    }
    hopsGameActive = false;
    clearInterval(hopsInterval);
    cancelAnimationFrame(hopsAnimFrameId);
    
    document.getElementById("hops-start-btn").style.display = "block";
    setGameState('ADVENTURES');
}