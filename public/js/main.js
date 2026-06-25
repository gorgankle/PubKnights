// --- CORE GAME ENGINE & GLOBALS ---

// Establish secure connection to the Node server
const socket = io('https://pubknights.onrender.com');

const canvas = document.getElementById(\"gameCanvas\");\nconst ctx = canvas.getContext(\"2d\");

// === SERVER-AUTHORITATIVE SYNC ===

socket.on('serverTick', (serverData) => {
    if (document.getElementById('main-game-container').style.display !== 'flex') return;

    if (gameState === 'TOWN' || gameState === 'VAULT') {
        player.hp = serverData.hp;
        player.wood = serverData.wood;
        player.fish = serverData.fish;
        player.hops = serverData.hops;
    }

    player.supplyCart = serverData.supplyCart;
    player.happyHourTicks = serverData.happyTicks;

    if (typeof runAutoClaimCheck === 'function') runClaimCheck();

    refreshSystemUI();
    updateTownUI(serverData);
});

socket.on('combatResult', (result) => {
    if (gameState !== 'COMBAT') return;

    // Avert Stamina corruption: only accept server stamina updates if they are valid numbers
    if (result.newStamina !== undefined && result.newStamina !== null) {
        player.stamina = result.newStamina;
    }

    if (result.type === 'error') {
        if (typeof logMessage === 'function') logMessage(result.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        try { window.isAnimating = false; } catch(e) {}
        refreshSystemUI();
        return;
    }

    if (result.type === 'hit') {
        if (result.damage) {
            let dmgStr = result.damage.toString();
            if (result.isCrit) dmgStr += " CRIT!";
            if (typeof spawnCombatFloat === 'function') {
                spawnCombatFloat(selectedEnemy, dmgStr, { color: result.isCrit ? "#f1c40f" : "#e74c3c", fontSize: 24 });
            }
        }
        
        selectedEnemy.hp -= result.damage;
        if (selectedEnemy.hp <= 0) {
            selectedEnemy.alive = false;
            selectedEnemy.hp = 0;
        }

        combatPhase = 'PHASE_3';
        refreshSystemUI();
        
        setTimeout(() => {
            if (typeof runEnemyAILoop === 'function') runEnemyAILoop();
        }, 800);
    }
    else if (result.type === 'pass' || result.type === 'heal') {
        combatPhase = 'PHASE_3';
        refreshSystemUI();
        
        setTimeout(() => {
            if (typeof runEnemyAILoop === 'function') runEnemyAILoop();
        }, 800);
    }
});

socket.on('bombResult', (result) => {
    if (gameState !== 'COMBAT') return;
    
    if (result.updatedPlayer && result.updatedPlayer.stamina !== undefined) {
        player.inventory = result.updatedPlayer.inventory;
    }

    if (typeof triggerBombAnimation === 'function') {
        triggerBombAnimation(result.tx, result.ty, result.aoe || 1, () => {
            combatPhase = 'PHASE_3';
            refreshSystemUI();
            setTimeout(() => {
                if (typeof runEnemyAILoop === 'function') runEnemyAILoop();
            }, 500);
        });
    }
});

socket.on('enemyTurnResults', (data) => {
    if (gameState !== 'COMBAT') return;
    
    if (data.damage && typeof spawnCombatFloat === 'function') {
        spawnCombatFloat(player, "-" + data.damage, { color: "#e74c3c", fontSize: 22 });
    }
    
    if (data.newHp !== undefined) player.hp = data.newHp;

    currentTurn = 'PLAYER';
    combatPhase = 'PHASE_2';
    refreshSystemUI();
});

socket.on('killConfirmed', (data) => {
    if (gameState !== 'COMBAT') return;
    if (typeof removeTargetFromArray === 'function') removeTargetFromArray(data.uid);
    
    if (typeof spawnMarkerText === 'function') {
        spawnMarkerText(player, `🎉 Slain ${data.enemyName || 'Foe'}! +${data.gold}g +${data.xp}xp`, "#f1c40f");
    }
    
    if (typeof pendingLoot === 'object' && data.item) {
        pendingLoot.push(data.item);
    }
});

socket.on('combatOverNotice', (data) => {
    if (gameState !== 'COMBAT') return;
    
    if (data.rewardSummary) {
        player.pendingGold = data.rewardSummary.gold;
        player.pendingXp = data.rewardSummary.xp;
    }
    
    if (typeof executeCombatEndSequence === 'function') executeCombatEndSequence();
});

// Top-Level Keyboard Inputs
window.addEventListener("keydown", function(e) {
    if (document.activeElement.tagName === 'INPUT') return;
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER') return;
    if (combatPhase === 'ACTION' || combatPhase === 'PHASE_2') {
        if (e.key === '1') dispatchCombatAction('attack', { subType: 'slash' });
        else if (e.key === '2') dispatchCombatAction('attack', { subType: 'special' });
        else if (e.key === '3') { window.combatSubmenuState = 'ITEMS'; refreshSystemUI(); }
        else if (e.key === '4' || e.key === ' ') dispatchCombatAction('end_turn');
    }
});

document.addEventListener("touchstart", function(e) {
    if (!e.target.closest('[onmouseenter]')) {
        if (typeof hideTooltip === 'function') hideTooltip();
    }
}, {passive: true});

document.addEventListener("click", function startMusicOnce() {
    if (typeof startBackgroundMusic === 'function') {
        startBackgroundMusic();
    }
    document.removeEventListener("click", startMusicOnce);
}, { once: true });

// Heartbeat ping
setInterval(() => {
    socket.emit('heartbeat');
}, 600000);