// --- UI: RENDER & REFRESH MANAGER ---
let uiMemory = { gold: -1, wood: -1, fish: -1, hops: -1, cWood: -1, cFish: -1, cHops: -1 }

// === UI NAVIGATION ENGINE ===
function switchTab(tabId) {
    if (tabId !== 'social-view' && typeof currentSocialZone !== 'undefined' && currentSocialZone) {
        if (typeof leaveMultiplayerZone === 'function') leaveMultiplayerZone(true); 
    }

    const socialView = document.getElementById('social-view');
    if (socialView && socialView.parentElement !== document.body) {
        document.body.appendChild(socialView); 
    }

    document.querySelectorAll('.game-screen').forEach(screen => {
        screen.style.display = 'none';
    });

    const mainContainer = document.getElementById('main-game-container');
    if (mainContainer) {
        if (tabId === 'social-view' || tabId === 'combat-screen') {
            mainContainer.style.display = 'none';
        } else {
            mainContainer.style.display = 'flex'; 
        }
    }

    document.querySelectorAll('.nav-bar button').forEach(btn => {
        btn.classList.remove('active-tab');
    });

    let targetScreen = document.getElementById(tabId);
    if (targetScreen) {
        if (tabId === 'social-view' || tabId === 'combat-screen') {
            targetScreen.style.display = 'block';
        } else {
            targetScreen.style.display = 'block'; 
        }
        btn.classList.add('active-tab');
    }

    if (tabId === 'town-vault-view') {
        requestServerCartState();
        refreshSystemUI(true);
    }
    if (tabId === 'combat-screen') {
        // ...
    }
}

function refreshSystemUI() {
    // Dynamically building the combat GUI, making sure buttons call dispatchCombatAction correctly
    const controlPanel = document.getElementById('combat-controls-container');
    if (controlPanel) {
        let btnDisabled = (currentTurn !== 'PLAYER' || combatPhase !== 'PHASE_2') ? "disabled" : "";
        let passOpacity = (currentTurn !== 'PLAYER') ? "0.5" : "1.0";

        if (!window.combatSubmenuState) window.combatSubmenuState = 'MAIN';

        if (window.combatSubmenuState === 'MAIN') {
            controlPanel.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button onclick="dispatchCombatAction('attack', { subType: 'slash' })" ${btnDisabled} style="padding: 12px; font-size: 14px; background:#c0392b; border: 2px solid #e74c3c;">⚔️ Attack</button>
                <button onclick="window.combatSubmenuState='SPECIAL'; refreshSystemUI();" style="padding: 12px; font-size: 14px; background:#8e44ad; border: 2px solid #9b59b6;">💫 Special Attack</button>
                <button onclick="window.combatSubmenuState='ITEMS'; refreshSystemUI();" style="padding: 12px; font-size: 14px; background:#2980b9; border: 2px solid #3498db;">🎒 Items</button>
                <button onclick="dispatchCombatAction('end_turn')" style="padding: 12px; font-size: 14px; background:#7f8c8d; border: 2px solid #95a5a6; opacity: ${passOpacity};">⏳ Pass Turn</button>
            </div>`;
        }
        else if (window.combatSubmenuState === 'SPECIAL') {
            controlPanel.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                <button onclick="dispatchCombatAction('attack', { subType: 'special' })" ${btnDisabled} style="padding: 12px; background:#8e44ad; border: 2px solid #9b59b6; font-size: 13px;">⚔️ Weapon Special</button>
                <button disabled style="padding: 12px; background:#2c3e50; border: 2px solid #34495e; color:#7f8c8d; font-size: 13px;">🔮 Magic (Locked)</button>
            </div>
            <button onclick="window.combatSubmenuState='MAIN'; refreshSystemUI();" style="width: 100%; background: #4a3b2c; border: 1px solid #634e3d; padding: 8px; font-size: 12px;">↩ Back to Main Menu</button>`;
        }
        else if (window.combatSubmenuState === 'ITEMS') {
            // Draws active combat backpack consumables
            let validItems = [];
            if (player.inventory && player.inventory.length > 0) {
                player.inventory.forEach((item, idx) => {
                    if (item && (item.type === 'brew' || item.type === 'bomb')) {
                        validItems.push({ idx: idx, item: item });
                    }
                });
            }
            
            let gridHTML = `<div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 8px;">`;
            
            validItems.forEach(obj => {
                let filterType = obj.item.type;
                let btnAction = ''; 
                let btnText = ''; 
                let bgColor = ''; 
                let itemDisabled = '';
                
                if (filterType === 'brew') {
                    btnAction = `dispatchCombatAction('item', { action: 'brew', index: ${obj.idx} })`; 
                    btnText = (obj.item.id === 'ipa' || obj.item.id === 'lager') ? 'Drink' : 'Chug'; 
                    bgColor = "#27ae60";
                } else if (filterType === 'bomb') {
                    btnAction = `prepBomb(${obj.idx})`; 
                    btnText = `Target`; 
                    bgColor = "#d35400";
                    if (combatPhase !== 'PHASE_2') itemDisabled = "disabled";
                }
                
                gridHTML += `<button onclick="${btnAction}" ${itemDisabled} style="background:${bgColor}; font-size:11px; padding:6px 2px; border-radius:3px; border:1px solid #fff;">${btnText} ${obj.item.name}</button>`;
            });
            
            gridHTML += `</div>`;

            controlPanel.innerHTML = `
            <div style="background:#221a14; padding:6px; border:1px solid #4a3b2c; border-radius:4px;">
                ${gridHTML}
                <button onclick="window.combatSubmenuState='MAIN'; refreshSystemUI();" style="width:100%; background:#4a3b2c; border:1px solid #634e3d; padding:6px; font-size:12px;">↩ Back</button>
            </div>`;
        }
    }
}