// --- minigames.js ---
let lumberGameActive = false;
let lumberTimer = 90;
let lumberInterval = null;
let lumberPoints = 0;
let lumberCombo = 1;

let indicatorPos = 0;
let indicatorDirection = 1; // 1 for right, -1 for left
let baseSpeed = 3; 
let currentSpeed = baseSpeed;
let isFrozen = false;
let animationFrameId = null;

const barWidth = 440; // Approximate width of the container
const targetWidth = 40;
const indicatorWidth = 6;
let targetPos = 200;

function setRandomTarget() {
    // Keep target completely within the bounds of the bar
    let maxPos = barWidth - targetWidth;
    targetPos = Math.floor(Math.random() * maxPos);
    document.getElementById("rhythm-target").style.left = targetPos + "px";
}

function startLumberMinigame() {
    lumberGameActive = true;
    lumberTimer = 90;
    lumberPoints = 0;
    lumberCombo = 1;
    currentSpeed = baseSpeed;
    indicatorPos = 0;
    
    document.getElementById("lumber-start-btn").style.display = "none";
    document.getElementById("lumber-chop-btn").style.display = "block";
    document.getElementById("rhythm-target").style.display = "block";
    document.getElementById("rhythm-indicator").style.display = "block";
    
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
    animateIndicator();
}

function animateIndicator() {
    if (!lumberGameActive || isFrozen) return;

    indicatorPos += (currentSpeed * indicatorDirection);

    // Bounce off walls
    if (indicatorPos >= (barWidth - indicatorWidth)) {
        indicatorPos = barWidth - indicatorWidth;
        indicatorDirection = -1;
    } else if (indicatorPos <= 0) {
        indicatorPos = 0;
        indicatorDirection = 1;
    }

    document.getElementById("rhythm-indicator").style.left = indicatorPos + "px";
    animationFrameId = requestAnimationFrame(animateIndicator);
}

function executeChop() {
    if (!lumberGameActive || isFrozen) return;

    // Freeze the indicator so the player sees exactly where they hit
    isFrozen = true;
    
    // Check overlap (if indicator's left edge or right edge is inside the target zone)
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

    // Thaw after 300ms, pick a new target, and resume moving
    setTimeout(() => {
        if (!lumberGameActive) return;
        setRandomTarget();
        feedbackEl.innerHTML = "";
        isFrozen = false;
        animateIndicator(); // Resume loop
    }, 300);
}

function updateLumberUI() {
    document.getElementById("lumber-points-display").innerText = lumberPoints;
    document.getElementById("lumber-combo-display").innerText = lumberCombo + "x";
}

function endLumberMinigame() {
    lumberGameActive = false;
    clearInterval(lumberInterval);
    cancelAnimationFrame(animationFrameId);
    
    document.getElementById("lumber-chop-btn").style.display = "none";
    document.getElementById("rhythm-target").style.display = "none";
    document.getElementById("rhythm-indicator").style.display = "none";
    
    let feedbackEl = document.getElementById("lumber-feedback");
    feedbackEl.innerHTML = `<span style="color:#f1c40f;">ROUND OVER! Final Score: ${lumberPoints}</span>`;
    
    if (typeof playRetroSound === 'function') playRetroSound('victory');

// Beam the verified score to the server!
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