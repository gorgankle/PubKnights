// === REPLACED ===
// --- minigames.js ---
const activeMinigameSessions = { lumber: null, fishing: null, hops: null };
const pendingMinigameEvents = { lumber: [], fishing: [], hops: [] };

function requestMinigameSession(gameType) {
    activeMinigameSessions[gameType] = null;
    pendingMinigameEvents[gameType] = [];
    socket.emit('townAction', { action: 'startMinigame', gameType });
}

function recordMinigameEvent(gameType, event, payload = {}) {
    const sessionId = activeMinigameSessions[gameType];
    if (!sessionId) {
        if (pendingMinigameEvents[gameType]) pendingMinigameEvents[gameType].push({ event, payload });
        return;
    }

    socket.emit('townAction', {
        action: 'recordMinigameEvent',
        gameType,
        sessionId,
        event,
        ...payload
    });
}

function claimMinigameSession(gameType, claimAction, payload = {}) {
    const sessionId = activeMinigameSessions[gameType];
    activeMinigameSessions[gameType] = null;
    pendingMinigameEvents[gameType] = [];

    socket.emit('townAction', {
        action: claimAction,
        sessionId,
        ...payload
    });
}

socket.on('minigameSessionStarted', (data) => {
    if (!data || !data.gameType || !data.sessionId) return;
    activeMinigameSessions[data.gameType] = data.sessionId;

    const queuedEvents = pendingMinigameEvents[data.gameType] || [];
    pendingMinigameEvents[data.gameType] = [];
    queuedEvents.forEach(entry => recordMinigameEvent(data.gameType, entry.event, entry.payload));
});

let lumberGameActive = false;
let lumberTimer = 90;
let lumberInterval = null;
let lumberPoints = 0;
let lumberCombo = 1;
let lumberScore = 0; // THE FIX: Track actual wood chopped!

let lCanvas, lCtx;
let indicatorPos = 0;
let indicatorDirection = 1; 
let baseSpeed = 4; 
let currentSpeed = baseSpeed;
let isFrozen = false;
let animationFrameId = null;

// UPDATED: Expanded to 800px to match the new canvas!
let barWidth = 800; 
const targetWidth = 160; 
const indicatorWidth = 10;
let targetPos = 200;

function setRandomTarget() {
    let maxPos = barWidth - targetWidth;
    targetPos = Math.floor(Math.random() * maxPos);
}

function startLumberMinigame() {
    requestMinigameSession('lumber');
    lCanvas = document.getElementById("lumber-canvas");
    lCtx = lCanvas.getContext("2d");
    
    lumberGameActive = true;
    lumberTimer = 90;
    lumberPoints = 0;
    lumberCombo = 1;
    lumberScore = 0; // THE FIX: Reset wood tracking
    currentSpeed = baseSpeed;
    indicatorPos = 0;
// ============================================
    
    document.getElementById("lumber-start-btn").style.display = "none";
    document.getElementById("lumber-chop-btn").style.display = "block";
    
    updateLumberUI();
    setRandomTarget();
    
    if (typeof playRetroSound === 'function') playRetroSound('combatStart');

    lumberInterval = setInterval(() => {
        lumberTimer--;
        document.getElementById("lumber-timer").innerText = lumberTimer + "s";
        if (lumberTimer <= 0) endLumberMinigame();
    }, 1000);

    isFrozen = false;
    cancelAnimationFrame(animationFrameId);
    lumberLoop();
}

function lumberLoop() {
    if (!lumberGameActive) return;

    if (!isFrozen) {
        indicatorPos += (currentSpeed * indicatorDirection);
        if (indicatorPos >= (barWidth - indicatorWidth)) {
            indicatorPos = barWidth - indicatorWidth;
            indicatorDirection = -1;
        } else if (indicatorPos <= 0) {
            indicatorPos = 0;
            indicatorDirection = 1;
        }
    }

    lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);

    // Target Zone
    lCtx.fillStyle = 'rgba(46, 204, 113, 0.2)';
    lCtx.fillRect(targetPos, 0, targetWidth, lCanvas.height);
    lCtx.strokeStyle = '#2ecc71';
    lCtx.lineWidth = 2;
    lCtx.strokeRect(targetPos, 0, targetWidth, lCanvas.height);

    // Target Sprite (Log)
    if (typeof drawProceduralSprite === 'function' && SpriteMatrices["sprite_minigame_log"]) {
        let logSize = 150;
        let logX = targetPos + (targetWidth / 2) - (logSize / 2);
        let logY = (lCanvas.height / 2) - (logSize / 2);
        drawProceduralSprite(lCtx, SpriteMatrices["sprite_minigame_log"], logX, logY, logSize);
    }

    // Moving Indicator (Axe)
    if (typeof drawProceduralSprite === 'function' && SpriteMatrices["sprite_minigame_axe"]) {
        let axeSize = 150;
        let axeX = indicatorPos - (axeSize / 2) + (indicatorWidth / 2);
        let axeY = (lCanvas.height / 2) - (axeSize / 2);
        
        lCtx.save();
        if (indicatorDirection === -1) {
            lCtx.translate(axeX * 2 + axeSize, 0);
            lCtx.scale(-1, 1);
        }
        
        if (isFrozen) {
            let pivotX = axeX + (axeSize / 2);
            let pivotY = axeY + axeSize;
            lCtx.translate(pivotX, pivotY);
            lCtx.rotate(Math.PI / 3); 
            lCtx.translate(-pivotX, -pivotY);
        }
        
        drawProceduralSprite(lCtx, SpriteMatrices["sprite_minigame_axe"], axeX, axeY, axeSize);
        lCtx.restore();
        
        // UPDATED: Red dot moved to the vertical center!
        lCtx.fillStyle = '#e74c3c';
        lCtx.fillRect(indicatorPos, (lCanvas.height / 2) - 2, indicatorWidth, 4);
    }

    animationFrameId = requestAnimationFrame(lumberLoop);
}

function executeChop() {
    if (!lumberGameActive || isFrozen) return;

    isFrozen = true;
    
    let indLeft = indicatorPos;
    let indRight = indicatorPos + indicatorWidth;
    let tgtLeft = targetPos;
    let tgtRight = targetPos + targetWidth;

    let hit = (indRight >= tgtLeft && indLeft <= tgtRight);
    let feedbackEl = document.getElementById("lumber-feedback");

// === REPLACED ===
    if (hit) {
        if (typeof playRetroSound === 'function') playRetroSound('heavyAttack');
        let pointsEarned = 10 * lumberCombo;
        lumberPoints += pointsEarned;
        lumberScore++; // THE FIX: Log the actual wood piece
        recordMinigameEvent('lumber', 'hit');
        lumberCombo++;
        currentSpeed = baseSpeed * Math.pow(1.05, lumberCombo - 1);
        feedbackEl.innerHTML = `<span style="color:#2ecc71;">PERFECT CHOP! +${pointsEarned} Pts</span>`;
    } else {
// ============================================
        if (typeof playRetroSound === 'function') playRetroSound('error');
        recordMinigameEvent('lumber', 'miss');
        lumberCombo = 1;
        currentSpeed = baseSpeed; 
        feedbackEl.innerHTML = `<span style="color:#e74c3c;">MISSED! Combo Reset.</span>`;
    }

    updateLumberUI();

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

// === REPLACED ===
function endLumberMinigame() {
    lumberGameActive = false;
    clearInterval(lumberInterval);
    cancelAnimationFrame(animationFrameId);
    
    if (lCtx) lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);
    document.getElementById("lumber-chop-btn").style.display = "none";
    
    let feedbackEl = document.getElementById("lumber-feedback");
    feedbackEl.innerHTML = `<span style="color:#f1c40f;">ROUND OVER! Final Score: ${lumberPoints}</span>`;
    
    if (typeof playRetroSound === 'function') playRetroSound('victory');
    
    // THE FIX: Sent woodChopped to the server so it doesn't get rejected!
    claimMinigameSession('lumber', 'claimLumberMinigame', { points: lumberPoints, woodChopped: lumberScore });

    setTimeout(() => {
        document.getElementById("lumber-start-btn").style.display = "block";
        document.getElementById("lumber-start-btn").innerText = "PLAY AGAIN";
    }, 1500);
}

function leaveMinigame() {
    // THE FIX: Remove the confirm dialogue and silently bank whatever they earned!
    if (lumberGameActive && (lumberPoints > 0 || lumberScore > 0)) {
        claimMinigameSession('lumber', 'claimLumberMinigame', { points: lumberPoints, woodChopped: lumberScore });
        if (typeof playRetroSound === 'function') playRetroSound('victory');
    }
    
    lumberGameActive = false;
    clearInterval(lumberInterval);
    cancelAnimationFrame(animationFrameId);
    
    document.getElementById("lumber-start-btn").style.display = "block";
    document.getElementById("lumber-chop-btn").style.display = "none";
    document.getElementById("lumber-feedback").innerHTML = "";
    
    setGameState('ADVENTURES');
}
// ============================================

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

// PHYSICS UPGRADE: Smoother gravity and snappier lift!
const GRAVITY = 0.12;
const LIFT = 0.18;
const THRASH_SPEED = 0.5; // Slowed down fish thrashing for smoother gameplay

let fishingPhase = 0; 

let trackX = 50;
let trackDir = 1;
let trackSpeed = 5;
const TRACK_W = 60;
// ENVIRONMENT UPGRADE: The water starts 120px down from the top
let TRACK_TOP = 120; 
let TRACK_H = 300; 

let zoneY = 0;
let zoneVel = 0;
let zoneH = 80; // ENLARGED: The hook zone is much bigger now

class PoolFish {
    constructor(canvasWidth, canvasHeight) {
        this.cw = canvasWidth; this.ch = canvasHeight;
        this.spawn();
    }

    spawn() {
        this.tier = Math.floor(Math.random() * 3);
        
        if (this.tier === 0) { this.radius = 12; this.pts = 10; this.speed = 2.0 + Math.random(); }
        else if (this.tier === 1) { this.radius = 18; this.pts = 20; this.speed = 1.4 + Math.random() * 0.6; }
        else { this.radius = 24; this.pts = 35; this.speed = 0.8 + Math.random() * 0.4; }

        // Only spawn below the water line
        this.y = TRACK_TOP + this.radius + Math.random() * (TRACK_H - this.radius * 2);
        
        this.dir = Math.random() > 0.5 ? 1 : -1;
        this.x = this.dir === 1 ? -50 : this.cw + 50;
        
        this.color = '#e74c3c'; 
        this.isHooked = false;
        this.captureProgress = 20;
        
        this.thrashTargetY = this.y;
        this.thrashTimer = 0;
    }

    update() {
        if (this.isHooked) {
            this.thrashTimer--;
            if (this.thrashTimer <= 0) {
                this.thrashTargetY = TRACK_TOP + this.radius + Math.random() * (TRACK_H - this.radius * 2);
                this.thrashTimer = 15 + Math.random() * (30 + this.tier * 10); 
            }

            this.y += (this.thrashTargetY - this.y) * 0.05 * THRASH_SPEED;

            let fishTop = this.y - this.radius;
            let fishBottom = this.y + this.radius;
            let zoneTop = zoneY;
            let zoneBottom = zoneY + zoneH;
            
            let overlap = !(fishBottom < zoneTop || fishTop > zoneBottom);
            
            // FORGIVENESS TWEAKS: Reeling in is faster, slipping is slower
            if (overlap) {
                this.captureProgress += 1.0; 
            } else {
                this.captureProgress -= 0.08; 
            }
            this.captureProgress = Math.max(0, Math.min(100, this.captureProgress));

        } else {
            this.x += this.speed * this.dir;
            if ((this.dir === 1 && this.x > this.cw + 50) || (this.dir === -1 && this.x < -50)) {
                this.spawn(); 
            }
        }
    }

    draw(ctx) {
        let spriteSize = this.radius * 2.5; 
        let startX = this.x - (spriteSize / 2);
        let startY = this.y - (spriteSize / 2);

        ctx.save();
        
        if (this.dir === -1) {
            ctx.translate(this.x * 2, 0); 
            ctx.scale(-1, 1);             
        }

        if (this.isHooked) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        if (typeof drawProceduralSprite === 'function' && SpriteMatrices["sprite_minigame_fish"]) {
            drawProceduralSprite(ctx, SpriteMatrices["sprite_minigame_fish"], startX, startY, spriteSize);
        }

        ctx.restore();

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
    requestMinigameSession('fishing');
    fCanvas = document.getElementById("fishing-pool-canvas");
    fCtx = fCanvas.getContext("2d");
    
    TRACK_H = fCanvas.height - TRACK_TOP;
    
    fishingGameActive = true;
    fishingTimer = 90;
    fishingScore = 0;
    fishingPoints = 0;
    activeHookedFish = null;
    isReeling = false;
    
    fishingPhase = 0;
    trackX = 50;
    zoneY = 20; // Starts dangling in the air!
    zoneVel = 0;
    
    fishes = [];
    
    for(let i=0; i<6; i++) {
        let f = new PoolFish(fCanvas.width, fCanvas.height);
        f.x = Math.random() * fCanvas.width; 
        fishes.push(f);
    }

    document.getElementById("fishing-start-btn").style.display = "none";
    document.getElementById("fishing-feedback").innerText = "Click to Cast. Click again when fish is centered to Hook. Hold to Reel!";
    updateFishingUI();

    const handleDown = (evt) => {
        if (!fishingGameActive) return;
        evt.preventDefault();
        isReeling = true;
        
        if (fishingPhase === 0) {
            fishingPhase = 1;
            if (typeof playRetroSound === 'function') playRetroSound('equip');
        } 
        else if (fishingPhase === 1 || fishingPhase === 2) {
            let hit = false;
            for (let f of fishes) {
                let inTrack = Math.abs(f.x - (trackX + TRACK_W / 2)) < 25;
                let fishTop = f.y - f.radius;
                let fishBottom = f.y + f.radius;
                let zoneBottom = zoneY + zoneH;
                let inZone = !(fishBottom < zoneY || fishTop > zoneBottom);

                if (inTrack && inZone) {
                    f.isHooked = true;
                    f.x = trackX + TRACK_W / 2; 
                    activeHookedFish = f;
                    fishingPhase = 3;
                    hit = true;
                    if (typeof playRetroSound === 'function') playRetroSound('splat'); 
                    break; 
                }
            }
            
            if (!hit) {
                fishingPhase = 0;
                zoneY = 20; // Snap back to air
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

    fCtx.clearRect(0, 0, fCanvas.width, fCanvas.height);

    if (fishingPhase === 0) {
        trackX += trackSpeed * trackDir;
        if (trackX <= 0) { trackX = 0; trackDir = 1; }
        if (trackX >= fCanvas.width - TRACK_W) { trackX = fCanvas.width - TRACK_W; trackDir = -1; }
        zoneY = 20; 
    } 
    else if (fishingPhase === 1) {
        zoneY += 2.5; // Dropping into the water
        if (zoneY >= TRACK_TOP + TRACK_H - zoneH) {
            zoneY = TRACK_TOP + TRACK_H - zoneH; 
            fishingPhase = 2; 
        }
    } 
    else if (fishingPhase === 2) {
        zoneY = TRACK_TOP + TRACK_H - zoneH; 
    } 
    else if (fishingPhase === 3) {
        if (isReeling) zoneVel -= LIFT;    
        else zoneVel += GRAVITY;           
        
        zoneVel *= 0.95; 
        zoneY += zoneVel;

        if (zoneY < TRACK_TOP) { zoneY = TRACK_TOP; zoneVel = 0; }
        if (zoneY > TRACK_TOP + TRACK_H - zoneH) { zoneY = TRACK_TOP + TRACK_H - zoneH; zoneVel = 0; }
    }

    // --- DRAW ENVIRONMENT ---
    
    // 1. Dark Air Background
    fCtx.fillStyle = '#1e272e';
    fCtx.fillRect(0, 0, fCanvas.width, TRACK_TOP);
    
    // 2. Water Surface
    fCtx.fillStyle = 'rgba(52, 152, 219, 0.4)';
    fCtx.fillRect(0, TRACK_TOP, fCanvas.width, 6);

    // 3. Track Guide (Only drawn in the water)
    fCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    fCtx.fillRect(trackX, TRACK_TOP, TRACK_W, TRACK_H);
    fCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    fCtx.strokeRect(trackX, TRACK_TOP, TRACK_W, TRACK_H);

    // 4. The Fishing Line
    fCtx.strokeStyle = '#bdc3c7';
    fCtx.lineWidth = 1;
    fCtx.beginPath();
    fCtx.moveTo(trackX + TRACK_W / 2, 0);
    fCtx.lineTo(trackX + TRACK_W / 2, zoneY + (zoneH * 0.2)); 
    fCtx.stroke();

    // 5. Draw The Hook Sprite!
    if (typeof drawProceduralSprite === 'function' && SpriteMatrices["sprite_minigame_hook"]) {
        let hookX = trackX + (TRACK_W / 2) - (zoneH / 2);
        drawProceduralSprite(fCtx, SpriteMatrices["sprite_minigame_hook"], hookX, zoneY, zoneH);
    } else {
        fCtx.fillStyle = 'rgba(52, 152, 219, 0.5)';
        fCtx.fillRect(trackX, zoneY, TRACK_W, zoneH);
    }

    // Update & Draw Fish
    for (let f of fishes) {
        f.update();
        f.draw(fCtx);

        if (f.isHooked) {
            if (f.captureProgress >= 100) {
                fishingScore++;
                fishingPoints += f.pts;
                recordMinigameEvent('fishing', 'catch', { points: f.pts });
                updateFishingUI();
                if (typeof playRetroSound === 'function') playRetroSound('coin');
                activeHookedFish = null;
                fishingPhase = 0; 
                f.spawn(); 
            } else if (f.captureProgress <= 0) {
                if (typeof playRetroSound === 'function') playRetroSound('error');
                activeHookedFish = null;
                fishingPhase = 0; 
                f.isHooked = false;
                f.dir = f.dir === 1 ? -1 : 1; 
                f.speed = 8; 
            }
        }
    }

    fishingAnimFrameId = requestAnimationFrame(fishingLoop);
}

function updateFishingUI() {
    document.getElementById("fishing-score").innerText = fishingScore;
    document.getElementById("fishing-points").innerText = fishingPoints;
}

// === REPLACED ===
function endFishingSession() {
    fishingGameActive = false;
    clearInterval(fishingInterval);
    cancelAnimationFrame(fishingAnimFrameId);
    
    window.removeEventListener('mouseup', () => isReeling = false);
    window.removeEventListener('touchend', () => isReeling = false);
    
    fCtx.clearRect(0, 0, fCanvas.width, fCanvas.height);
    document.getElementById("fishing-start-btn").style.display = "block";
    document.getElementById("fishing-start-btn").innerText = "CAST AGAIN";
    
    let fb = document.getElementById("fishing-feedback");
    
    if (fishingScore > 0) {
        // THE FIX: Removed the raw fish text!
        fb.innerHTML = `<span style="color:#2ecc71;">Session Ended! Secured ${fishingPoints} Pts!</span>`;
        if (typeof playRetroSound === 'function') playRetroSound('victory');
        claimMinigameSession('fishing', 'claimFishingMinigame', { points: fishingPoints, fishCaught: fishingScore });
    } else {
        fb.innerHTML = `<span style="color:#e74c3c;">Session Ended. Nothing was biting...</span>`;
        if (typeof playRetroSound === 'function') playRetroSound('error');
    }
}
// ============================================

// === REPLACED ===
function leaveFishingMinigame() {
    // THE FIX: Remove the confirm dialogue and silently bank whatever they earned!
    if (fishingGameActive && (fishingPoints > 0 || fishingScore > 0)) {
        claimMinigameSession('fishing', 'claimFishingMinigame', { points: fishingPoints, fishCaught: fishingScore });
        if (typeof playRetroSound === 'function') playRetroSound('victory');
    }
    
    fishingGameActive = false;
    clearInterval(fishingInterval);
    cancelAnimationFrame(fishingAnimFrameId);
    
    document.getElementById("fishing-start-btn").style.display = "block";
    setGameState('ADVENTURES');
}
// ============================================

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
    requestMinigameSession('hops');
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
                recordMinigameEvent('hops', 'harvest');
                cell.state = 0; 
                if (typeof playRetroSound === 'function') playRetroSound('coin');
            }
            else if (cell.state === 1 || cell.state === 3) { 
                // Miss/Bad click!
                hopsPoints = Math.max(0, hopsPoints - 5); 
                recordMinigameEvent('hops', 'badPick');
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

// === REPLACED ===
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
        // THE FIX: Removed the raw hops text!
        fb.innerHTML = `<span style="color:#2ecc71;">Harvest Ended! Secured ${hopsPoints} Pts!</span>`;
        if (typeof playRetroSound === 'function') playRetroSound('victory');
        claimMinigameSession('hops', 'claimHopsMinigame', { points: hopsPoints, hopsHarvested: hopsScore });
    } else {
        fb.innerHTML = `<span style="color:#e74c3c;">Harvest Ended. The crops withered...</span>`;
        if (typeof playRetroSound === 'function') playRetroSound('error');
    }
}
// ============================================

// === REPLACED ===
function leaveHopsMinigame() {
    // THE FIX: Remove the confirm dialogue and silently bank whatever they earned!
    if (hopsGameActive && (hopsPoints > 0 || hopsScore > 0)) {
        claimMinigameSession('hops', 'claimHopsMinigame', { points: hopsPoints, hopsHarvested: hopsScore });
        if (typeof playRetroSound === 'function') playRetroSound('victory');
    }
    
    hopsGameActive = false;
    clearInterval(hopsInterval);
    cancelAnimationFrame(hopsAnimFrameId);
    
    document.getElementById("hops-start-btn").style.display = "block";
    setGameState('ADVENTURES');
}
// ============================================
