// --- clientDirector.js ---
// Handles scripted client-side UI overrides for Tutorials, Quests, and Cutscenes.

window.ClientDirector = {

    // 1. Hook into the Canvas Renderer (Replaces the one in main.js)
    drawTacticalHighlights: function(ctx) {
        if (typeof activeCombatZone === 'undefined' || activeCombatZone !== 'TUTORIAL' || gameState !== 'COMBAT') return;
        
        ctx.save();
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "rgba(46, 204, 113, 1.0)"; 
        ctx.fillStyle = "rgba(46, 204, 113, 0.3)";   
        
        let targetX = -1, targetY = -1;
        if (currentTutorialStep === 3 && combatPhase === 'PHASE_1') {
            targetX = 1; targetY = 1; 
        } else if (currentTutorialStep === 4 && combatPhase === 'PHASE_1') {
            targetX = 1; targetY = 3; 
        }

        if (targetX !== -1 && targetY !== -1) {
            ctx.beginPath();
            ctx.rect(targetX * currentTileSize, targetY * currentTileSize, currentTileSize, currentTileSize);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    },

    // 2. Hook into the System UI to lock buttons
    applyCombatLocks: function(bagBtn, spellBtn) {
        if (typeof activeCombatZone === 'undefined' || activeCombatZone !== 'TUTORIAL') return;
        
        let tSlash = document.getElementById("slash-btn");
        let tHeavy = document.getElementById("heavy-btn");
        let tEnd = document.getElementById("end-btn");
        let tFlee = document.getElementById("flee-btn");

        // Lock EVERYTHING by default
        if (tSlash) tSlash.disabled = true;
        if (tHeavy) tHeavy.disabled = true;
        if (tEnd) tEnd.disabled = true;
        if (tFlee) tFlee.disabled = true;
        if (bagBtn) bagBtn.disabled = true;
        if (spellBtn) spellBtn.disabled = true;
        
        if (currentTutorialStep === 1 && tEnd) { 
            tEnd.disabled = false;
            tEnd.style.boxShadow = "0 0 15px #e67e22"; 
            tEnd.style.border = "2px solid #e67e22";
        } 
        else if ((currentTutorialStep === 2 || currentTutorialStep === 4) && bagBtn) { 
            bagBtn.disabled = false;
            bagBtn.style.boxShadow = "0 0 15px #2ecc71";
            bagBtn.style.border = "2px solid #2ecc71";
        }
        else if (currentTutorialStep === 3 && tSlash) { 
            let hasTarget = selectedEnemy && selectedEnemy.alive;
            tSlash.disabled = !(hasTarget && combatPhase === 'PHASE_2');
            tSlash.style.boxShadow = "0 0 15px #2ecc71";
            tSlash.style.border = "2px solid #2ecc71";
        }
        else if (currentTutorialStep >= 5) { 
            let hasTarget = selectedEnemy && selectedEnemy.alive;
            let isAttackPhase = (combatPhase === 'PHASE_2');
            
            if (tSlash) {
                tSlash.disabled = !(hasTarget && isAttackPhase);
                if (!tSlash.disabled) {
                    tSlash.style.boxShadow = "0 0 15px #e74c3c";
                    tSlash.style.border = "2px solid #e74c3c";
                }
            }
            if (tHeavy) tHeavy.disabled = !(hasTarget && isAttackPhase);
            if (tEnd) tEnd.disabled = false;
            if (bagBtn) bagBtn.disabled = false;
        }
    },

    // 3. Hook into the Item Modal to lock specific items
    applyModalLocks: function(item, slotDiv, filter) {
        if (typeof activeCombatZone === 'undefined' || activeCombatZone !== 'TUTORIAL') return false;

        let isLocked = true;
        if (currentTutorialStep === 2 && item.combat && item.combat.actionType === 'heal') isLocked = false;
        if (currentTutorialStep === 4 && item.combat && item.combat.actionType === 'throwable') isLocked = false;
        
        if (isLocked) {
            slotDiv.style.pointerEvents = 'none';
            slotDiv.style.opacity = '0.3';
            slotDiv.style.filter = 'grayscale(100%)';
            slotDiv.style.boxShadow = "none";
            slotDiv.style.border = "none";
        } else {
            slotDiv.style.pointerEvents = 'auto';
            slotDiv.style.opacity = '1.0';
            slotDiv.style.filter = 'none';
            slotDiv.style.boxShadow = "0 0 15px #2ecc71";
            slotDiv.style.border = "2px solid #2ecc71";
        }
        return true; // Tells the UI loop that the Director handled the styling
    },
	// 4. Hook into the Loot Screen to hide the Sell buttons
    applyLootScreenLocks: function() {
        if (typeof activeCombatZone === 'undefined' || activeCombatZone !== 'TUTORIAL') return;
        
        const lootScreen = document.getElementById("loot-screen");
        if (lootScreen) {
            // Find every button inside the loot screen
            const buttons = lootScreen.querySelectorAll("button");
            buttons.forEach(btn => {
                // If the button says "Sell", completely hide it from the DOM
                if (btn.innerText.toLowerCase().includes("sell")) {
                    btn.style.display = "none";
                }
            });
        }
    }
	
};

