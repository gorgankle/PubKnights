// --- UI: RENDER & REFRESH MANAGER ---

// --- UI: RENDER & REFRESH MANAGER ---
let uiMemory = { gold: -1, wood: -1, fish: -1, hops: -1, cWood: -1, cFish: -1, cHops: -1 }

// === UI NAVIGATION ENGINE ===
function switchTab(tabId) {
    // 1. GHOSTING: Auto-leave the multiplayer zone if we navigate away to any other tab!
    if (tabId !== 'social-view' && typeof currentSocialZone !== 'undefined' && currentSocialZone) {
        if (typeof leaveMultiplayerZone === 'function') {
            leaveMultiplayerZone(true); // True prevents an infinite loop!
        }
    }

    // 2. DOM ESCAPE HATCH: If social-view is trapped inside the Knight panel wrapper, break it out!
    const socialView = document.getElementById('social-view');
    if (socialView && socialView.parentElement !== document.body) {
        document.body.appendChild(socialView); // Moves it safely to the top level!
    }

    // 3. Hide all individual game screens
    document.querySelectorAll('.game-screen').forEach(screen => {
        screen.style.display = 'none';
    });

    // 4. Hide the entire master Town/Knight layout when in Social or Combat
    const mainContainer = document.getElementById('main-game-container');
    if (mainContainer) {
        if (tabId === 'social-view' || tabId === 'combat-screen') {
            mainContainer.style.display = 'none';
        } else {
            mainContainer.style.display = 'flex'; // Restore the Knight & Town panels
        }
    }

    // 5. Remove active highlight from all nav buttons
    document.querySelectorAll('.nav-bar button').forEach(btn => {
        btn.classList.remove('active-tab');
    });

    // 6. Show the requested screen
    let targetScreen = document.getElementById(tabId);
    if (targetScreen) {
        if (tabId === 'social-view') {
            targetScreen.style.display = 'grid';
        } else {
            targetScreen.style.display = 'flex';
        }
    }

    // 7. Light up the clicked button
    let btnId = '';
    if (tabId === 'town-vault-view') btnId = 'tab-town';
    else if (tabId === 'combat-screen') btnId = 'tab-combat';
    else if (tabId === 'social-view') btnId = 'tab-social';
    
    if (btnId) {
        let btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active-tab');
    }
}

function getItemSpriteURL(item) {
    if (!item) return "";
    
    let dbTemplate = Object.values(ItemDatabase).find(i => i.name === item.name);
    let sId = item.spriteId || (dbTemplate ? dbTemplate.spriteId : null);
    let iId = item.id || (dbTemplate ? dbTemplate.id : null);
    
    let targetSprite = "icon_" + (sId || iId);
    
    if (!SpriteMatrices[targetSprite]) {
        targetSprite = sId;
        
        if (item.slot === 'armor' && targetSprite) {
            let gSuffix = player.appearance.gender === 'female' ? '_female' : '_male';
            if (SpriteMatrices[targetSprite + gSuffix]) {
                targetSprite += gSuffix;
            }
        }
    }
    
    if (!targetSprite || !SpriteMatrices[targetSprite]) return "";

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 24;
    tempCanvas.height = 24;
    const ctx = tempCanvas.getContext('2d');

    if (typeof drawProceduralSprite === 'function') {
        drawProceduralSprite(ctx, SpriteMatrices[targetSprite], 0, 0, 24);
    }

    return tempCanvas.toDataURL();
}

function refreshCombatSidebar() {
    const sidebar = document.getElementById("combat-status-sidebar");
    if (!sidebar) return;

    let hpPct = Math.max(0, Math.min(100, (player.hp / player.vitality) * 100));
    let stPct = Math.max(0, Math.min(100, (player.stamina / player.maxStamina) * 100));
    
    let hImg = getItemSpriteURL(player.equipment.helmet);
    let aImg = getItemSpriteURL(player.equipment.armor);
    let wImg = getItemSpriteURL(player.equipment.weapon);
    let gImg = getItemSpriteURL(player.equipment.gloves);
    let bImg = getItemSpriteURL(player.equipment.boots);

    let helmDesc = player.equipment.helmet ? `<img src="${hImg}" style="width:24px;height:24px;image-rendering:pixelated;vertical-align:middle;margin-right:4px;"> <span class="${player.equipment.helmet.rarity === 'Gorilla' ? 'GorillaTier' : player.equipment.helmet.rarity}">${player.equipment.helmet.name}</span>` : "<span style='color:#55443a;'>Bare Headed</span>";
    let armDesc = player.equipment.armor ? `<img src="${aImg}" style="width:24px;height:24px;image-rendering:pixelated;vertical-align:middle;margin-right:4px;"> <span class="${player.equipment.armor.rarity === 'Gorilla' ? 'GorillaTier' : player.equipment.armor.rarity}">${player.equipment.armor.name}</span>` : "<span style='color:#55443a;'>Bare Torso</span>";
    let weapDesc = player.equipment.weapon ? `<img src="${wImg}" style="width:24px;height:24px;image-rendering:pixelated;vertical-align:middle;margin-right:4px;"> <span class="${player.equipment.weapon.rarity === 'Gorilla' ? 'GorillaTier' : player.equipment.weapon.rarity}">${player.equipment.weapon.name}</span>` : "<span style='color:#55443a;'>Unarmed</span>";
    let gloveDesc = player.equipment.gloves ? `<img src="${gImg}" style="width:24px;height:24px;image-rendering:pixelated;vertical-align:middle;margin-right:4px;"> <span class="${player.equipment.gloves.rarity === 'Gorilla' ? 'GorillaTier' : player.equipment.gloves.rarity}">${player.equipment.gloves.name}</span>` : "<span style='color:#55443a;'>Bare Hands</span>";
    let bootDesc = player.equipment.boots ? `<img src="${bImg}" style="width:24px;height:24px;image-rendering:pixelated;vertical-align:middle;margin-right:4px;"> <span class="${player.equipment.boots.rarity === 'Gorilla' ? 'GorillaTier' : player.equipment.boots.rarity}">${player.equipment.boots.name}</span>` : "<span style='color:#55443a;'>Bare Feet</span>";

    // === NEW: MULTI-BUFF TOOLTIP GENERATOR ===
    let buffHTML = '';
    if (player.activeBuffs && player.activeBuffs.length > 0) {
        buffHTML += `<div style="margin-top: 6px; border-top:1px dashed #443a32; padding-top:4px; display: flex; flex-direction: column; gap: 4px;">`;
        player.activeBuffs.forEach(buff => {
            let tooltipDesc = buff === 'IPA' ? "<b>Furious IPA:</b> Amplifies damage multipliers (+10% ATK) for the remainder of this deployment." : "<b>Swift Lager:</b> Expands stride movement capabilities (+1 Stride) for the remainder of this deployment.";
            buffHTML += `<div style="font-size: 10px; color:#2ecc71; cursor:help; width:max-content;" onmouseenter="showTooltip('${tooltipDesc}', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">🌿 <b>ACTIVE BREW PERK:</b> ${buff}</div>`;
        });
        buffHTML += `</div>`;
    } else if (player.activeCombatBuff) {
        // Fallback catch for legacy save files
        buffHTML = `<div style="margin-top: 6px; font-size: 10px; color:#2ecc71; border-top:1px dashed #443a32; padding-top:4px;">🌿 <b>ACTIVE BREW PERK:</b> ${player.activeCombatBuff}</div>`;
    }

    sidebar.innerHTML = `
        <h3 style="font-size: 14px; margin-bottom: 12px; color: #ffcc66; text-transform: uppercase; border-bottom: 2px solid #634e3d; padding-bottom: 5px;">🛡️ Tactical Combat Monitor</h3>
        <div style="background: #1a1512; padding: 10px; border-radius: 4px; border: 1px solid #4a3b2c; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-bottom: 4px;">
                <span style="color: #ffcc66;">VITALITY:</span>
                <span style="color: #2ecc71;">${player.hp} / ${player.vitality} HP</span>
            </div>
            <div style="width: 100%; background: #110d0a; height: 12px; border-radius: 3px; overflow: hidden; border: 1px solid #55443a;">
                <div style="width: ${hpPct}%; background: ${hpPct > 45 ? '#27ae60' : '#c0392b'}; height: 100%; transition: width 0.2s;"></div>
            </div>
        </div>
        <div style="background: #1a1512; padding: 10px; border-radius: 4px; border: 1px solid #4a3b2c; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-bottom: 4px;">
                <span style="color: #ffcc66;">STAMINA:</span>
                <span style="color: #f1c40f;">${player.stamina} / ${player.maxStamina} STAM</span>
            </div>
            <div style="width: 100%; background: #110d0a; height: 12px; border-radius: 3px; overflow: hidden; border: 1px solid #55443a;">
                <div style="width: ${stPct}%; background: #e67e22; height: 100%; transition: width 0.2s;"></div>
            </div>
        </div>
        <div style="background: #1a1512; padding: 12px; border-radius: 4px; border: 1px solid #4a3b2c; margin-bottom: 15px;">
            <h4 style="margin: 0 0 8px 0; font-size: 11px; color: #ffcc66; text-transform: uppercase; border-bottom: 1px dashed #4a3b2c; padding-bottom: 4px;">Active Loadout Parameters</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; line-height: 1.4;">
                <div style="cursor:help; width:max-content;" onmouseenter="showTooltip(getItemTooltip(player.equipment.helmet), event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Helmet:</b> ${helmDesc}</div>
                <div style="cursor:help; width:max-content;" onmouseenter="showTooltip(getItemTooltip(player.equipment.armor), event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Armor:</b> ${armDesc}</div>
                <div style="cursor:help; width:max-content;" onmouseenter="showTooltip(getItemTooltip(player.equipment.weapon), event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Weapon:</b> ${weapDesc}</div>
                <div style="cursor:help; width:max-content;" onmouseenter="showTooltip(getItemTooltip(player.equipment.gloves), event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Gloves:</b> ${gloveDesc}</div>
                <div style="cursor:help; width:max-content;" onmouseenter="showTooltip(getItemTooltip(player.equipment.boots), event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Boots:</b>  ${bootDesc}</div>
            </div>
            ${buffHTML}
        </div>
        <div style="background: #1a1512; padding: 10px; border-radius: 4px; border: 1px solid #4a3b2c; font-size: 11px; color: #bbaaa0; line-height: 1.5;">
            💥 <b>Power Output:</b> ${getPlayerTotalPower()} DMG<br>
            🎯 <b>Accuracy Rating:</b> ${player.accuracy}<br>
            🛡️ <b>Resilience (Passive Deflect):</b> ${getPlayerDeflectChance()}%<br>
            🏃 <b>Swiftness (Stride):</b> ${getPlayerSwiftness()} Steps
        </div>
    `;
}

function refreshSystemUI() {
    try {
        const topNavBar = document.getElementById("top-nav-bar");
        const townVaultView = document.getElementById("town-vault-view");
        const combatScreen = document.getElementById("combat-screen");
        const vaultScreen = document.getElementById("vault-screen");
        const wallet = document.getElementById("wallet-display");

        // Tab Panels
        const knightScreen = document.getElementById("knight-screen");
        const townScreen = document.getElementById("town-screen");
        const merchantScreen = document.getElementById("merchant-screen");
        const adventuresScreen = document.getElementById("adventures-screen");
        const upgradesScreen = document.getElementById("upgrades-screen");

        if (!townVaultView || !combatScreen || !vaultScreen || !wallet || !townScreen || !merchantScreen) return;

        // === CLEANED UP WALLET - ECONOMY ONLY ===
        let animG = (uiMemory.gold !== -1 && player.gold > uiMemory.gold) ? 'resource-pop' : '';
        let animW = (uiMemory.wood !== -1 && player.wood > uiMemory.wood) ? 'resource-pop' : '';
        let animF = (uiMemory.fish !== -1 && player.fish > uiMemory.fish) ? 'resource-pop' : '';
        let animH = (uiMemory.hops !== -1 && player.hops > uiMemory.hops) ? 'resource-pop' : '';
        
        uiMemory.gold = player.gold; uiMemory.wood = player.wood; 
        uiMemory.fish = player.fish; uiMemory.hops = player.hops;

        wallet.innerHTML = `
            <div style="display: flex; justify-content: space-around; font-family: monospace; font-size: 12px; padding: 4px;">
                <span class="${animG}">💰 <b>Gold:</b> ${(player.gold || 0).toLocaleString()}g</span>
                <span class="${animW}">🌲 <b>Timber:</b> ${(player.wood || 0).toLocaleString()}</span>
                <span class="${animF}">🐟 <b>Fish:</b> ${(player.fish || 0).toLocaleString()}</span>
                <span class="${animH}">🌿 <b>Hops:</b> ${(player.hops || 0).toLocaleString()}</span>
            </div>`;

        if (gameState === 'COMBAT' && currentTurn === 'PLAYER') {
            if (combatPhase === 'MOVE' || combatPhase === 'ACTION') combatPhase = 'PHASE_1';
        }

// === QUARTERMASTER POINTS UI UPDATE ===
        let timberUi = document.getElementById('ui-timber-pts');
        if (timberUi) timberUi.innerText = (player.lumberPoints || 0).toLocaleString();
        
        let fishUi = document.getElementById('ui-fish-pts');
        if (fishUi) fishUi.innerText = (player.fishingPoints || 0).toLocaleString();
        
        let hopsUi = document.getElementById('ui-hops-pts');
        if (hopsUi) hopsUi.innerText = (player.hopsPoints || 0).toLocaleString();


// === FULL SCREEN EXCLUSIVE VIEWS ===
const lumberScreen = document.getElementById("minigame-lumber-screen");
const fishingScreen = document.getElementById("minigame-fishing-screen");
const hopsScreen = document.getElementById("minigame-hops-screen"); // NEW

if (gameState === 'COMBAT' || gameState === 'MINIGAME_LUMBER' || gameState === 'MINIGAME_FISHING' || gameState === 'MINIGAME_HOPS') {
    if (topNavBar) topNavBar.style.display = "none"; 
    townVaultView.style.display = "none"; 
    vaultScreen.style.display = "none"; 

    if (gameState === 'MINIGAME_LUMBER') {
        if (combatScreen) combatScreen.style.display = "none";
        if (fishingScreen) fishingScreen.style.display = "none";
        if (hopsScreen) hopsScreen.style.display = "none";
        if (lumberScreen) lumberScreen.style.display = "flex";
    }
    else if (gameState === 'MINIGAME_FISHING') {
        if (combatScreen) combatScreen.style.display = "none";
        if (lumberScreen) lumberScreen.style.display = "none";
        if (hopsScreen) hopsScreen.style.display = "none";
        if (fishingScreen) fishingScreen.style.display = "flex";
    }
    else if (gameState === 'MINIGAME_HOPS') {
        if (combatScreen) combatScreen.style.display = "none";
        if (lumberScreen) lumberScreen.style.display = "none";
        if (fishingScreen) fishingScreen.style.display = "none";
        if (hopsScreen) hopsScreen.style.display = "flex";
    }
    else if (gameState === 'COMBAT') {
        if (lumberScreen) lumberScreen.style.display = "none";
        if (fishingScreen) fishingScreen.style.display = "none";
        if (hopsScreen) hopsScreen.style.display = "none";
        combatScreen.style.display = "block";
            
            let dynamicBg = "none";
            if (activeCombatZone === 'WILDERNESS') dynamicBg = "url('assets/images/wilds-bg.png')";
            else if (activeCombatZone === 'CELLARS') dynamicBg = "url('assets/images/cellars-bg.png')";
            else if (activeCombatZone === 'GORILLA_ARENA') dynamicBg = "url('assets/images/arena-bg.png')";
            combatScreen.style.setProperty('--active-combat-bg', dynamicBg);

            const uiHeader = document.getElementById("target-ui-header");
            
            if (currentTurn === 'PLAYER') {
                if (combatPhase === 'TARGET_BOMB') {
                    if (uiHeader) {
                        uiHeader.innerHTML = `💣 TARGETING BOMB: Click anywhere to detonate 3x3 blast!`;
                        uiHeader.style.color = "#e74c3c";
                    }
                    document.getElementById("slash-btn").disabled = true;
                    document.getElementById("heavy-btn").disabled = true;
                    document.getElementById("combat-brew-btn").disabled = true;
                    document.getElementById("end-btn").disabled = true;
                } else {
                    // === INSTANT AUTO-TARGETING LOGIC ===
                    let range = (player.equipment.weapon && player.equipment.weapon.attackRange) || 1;
                    let hasTarget = selectedEnemy && selectedEnemy.alive;
                    let withinRange = false; let losClear = false;
                    let isAttackPhase = (combatPhase === 'PHASE_2');
                    
                    if (hasTarget) {
                        let dist = getGridDistance(player.x, player.y, selectedEnemy.x, selectedEnemy.y, selectedEnemy.size || 1);
                        withinRange = (dist <= range);
                        let sSize = selectedEnemy.size || 1;
                        for (let bx = selectedEnemy.x; bx < selectedEnemy.x + sSize; bx++) {
                            for (let by = selectedEnemy.y; by < selectedEnemy.y + sSize; by++) if (hasLineOfSight(player.x, player.y, bx, by)) losClear = true;
                        }
                    }
                    
                    if (isAttackPhase && (!hasTarget || !withinRange || !losClear)) {
                        let autoEnemy = enemies.find(e => {
                            if (!e.alive) return false;
                            let d = getGridDistance(player.x, player.y, e.x, e.y, e.size || 1);
                            if (d > range) return false;
                            let lClear = false;
                            let cSize = e.size || 1;
                            for (let bx = e.x; bx < e.x + cSize; bx++) {
                                for (let by = e.y; by < e.y + cSize; by++) if (hasLineOfSight(player.x, player.y, bx, by)) lClear = true;
                            }
                            return lClear;
                        });
                        
                        if (autoEnemy) {
                            selectedEnemy = autoEnemy;
                            hasTarget = true;
                            withinRange = true;
                            losClear = true;
                        }
                    }

                    let phaseLabel = combatPhase.replace('_', ' '); 
                    let instructions = (combatPhase === 'PHASE_2') ? "Select Target or Bomb" : "Select Tile to Stride";
                    
                    if (uiHeader) {
                        if (pendingMove) {
                            uiHeader.innerHTML = `🏃 CONFIRM MOVE - Click green highlighted tile to jump`;
                            uiHeader.style.color = "#2ecc71";
                        } else if (selectedEnemy && selectedEnemy.alive && combatPhase === 'PHASE_2') {
                            uiHeader.innerHTML = `🎯 FOCUS: ${selectedEnemy.name} (${selectedEnemy.hp}/${selectedEnemy.maxHp} HP) - [${phaseLabel}]`;
                            uiHeader.style.color = "#2ecc71";
                        } else {
                            uiHeader.innerHTML = `⚔️ ${phaseLabel} - ${instructions}`;
                            uiHeader.style.color = "#3498db";
                        }
                    }
                    
                    let hasStout = player.inventory.some(i => i.id === 'stout' || i.id === 'reserve');
                    
                    document.getElementById("slash-btn").disabled = !(hasTarget && withinRange && losClear && isAttackPhase);
                    document.getElementById("heavy-btn").disabled = !(hasTarget && withinRange && losClear && isAttackPhase);
                    document.getElementById("combat-brew-btn").disabled = !hasStout; 
                    
                    let endBtn = document.getElementById("end-btn");
                    endBtn.disabled = false;
                    endBtn.style.opacity = (hasTarget && withinRange && losClear && isAttackPhase) ? "0.6" : "1.0";
                }
            } else {
                if (uiHeader) {
                    uiHeader.innerHTML = "🤖 MONSTERS EXECUTING TACTICAL ENGINE";
                    uiHeader.style.color = "#e74c3c";
                }
                document.getElementById("slash-btn").disabled = true;
                document.getElementById("heavy-btn").disabled = true;
                document.getElementById("combat-brew-btn").disabled = true;
                document.getElementById("end-btn").disabled = true;
                document.getElementById("end-btn").style.opacity = "1.0";
            }
            
            refreshCombatSidebar();

            const combatInvList = document.getElementById("combat-inventory-list");
            if (combatInvList) {
                combatInvList.innerHTML = "";
                
                if (player.inventory.length === 0) {
                    combatInvList.innerHTML = "<span style='font-size:10px;color:#776c62;'>Backpack is empty.</span>";
                } else {
                    player.inventory.forEach((item, idx) => {
                        let rc = item.rarity === "Gorilla" ? "GorillaTier" : item.rarity;
                        let btnText = ""; let onclickStr = ""; let bgColor = "";
                        
                        let imgUrl = getItemSpriteURL(item);
                        let imgHtml = imgUrl ? `<img src="${imgUrl}" style="width:28px;height:28px;image-rendering:pixelated;margin-right:6px;vertical-align:middle;">` : ``;
                        
                        if (item.type === "bomb") {
                            btnText = `Throw (${item.damage} DMG)`;
                            onclickStr = `prepBomb(${idx})`;
                            bgColor = "#c0392b";
						} else if (item.type === "brew") {
                            if (item.id === 'ipa') btnText = `Drink (+10% ATK)`;
                            else if (item.id === 'lager') btnText = `Drink (+1 Stride)`;
                            else btnText = `Chug (+10% HP)`; 
                            
                            onclickStr = `consumeBrew(${idx})`;
                            bgColor = "#2980b9";
                        } else if (item.type === "crate") {
                            btnText = `Sealed`;
                            onclickStr = ``;
                            bgColor = "#55443a";
                        } else {
                            btnText = `Equip`;
                            onclickStr = `handleCombatEquip(${idx})`;
                            bgColor = "#27ae60";
                        }
                        
                        let disabledStr = "";
                        if (currentTurn !== 'PLAYER' || combatPhase === 'TARGET_BOMB') {
                            disabledStr = "disabled";
                        } else if (item.type === "bomb" && combatPhase !== 'PHASE_2') {
                            disabledStr = "disabled";
                        }

                        combatInvList.innerHTML += `
                            <div style="margin-bottom:4px; font-size:11px; display:flex; justify-content:space-between; align-items:center; background:#1e1712; padding:3px; border-radius:3px; width: 100%;">
                                <div>${imgHtml}<span class="${rc}" style="cursor:help; text-decoration: underline dashed;" onmouseenter="showInventoryTooltip(${idx}, event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">[${item.slot.toUpperCase()}] ${item.name}</span></div>
                                <button onclick="${onclickStr}" style="padding: 2px 6px; font-size: 9px; background: ${bgColor};" ${disabledStr}>${btnText}</button>
                            </div>`;
                    });
                }
                
if (combatPhase === 'TARGET_BOMB') {
                    let cancelBtn = document.createElement("button");
                    cancelBtn.innerText = "✖ Cancel Throw";
                    cancelBtn.style.background = "#443a32"; cancelBtn.style.width = "100%"; cancelBtn.style.marginTop = "4px";
                    cancelBtn.onclick = () => cancelBomb();
                    combatInvList.appendChild(cancelBtn);
                }
            }
        }
        } 
        else { 
            // --- CONSOLIDATED TABBED VIEWS ---
            // We are out of combat, show the Nav Bar
            if (topNavBar) topNavBar.style.display = "flex";
            combatScreen.style.display = "none";

            // Only show the column container if we are NOT in the Vault
            if (townVaultView) townVaultView.style.display = (gameState === 'VAULT') ? "none" : "flex"; 
// Hide ALL tabs first to ensure a clean slate
            if (knightScreen) knightScreen.style.display = "none";
            townScreen.style.display = "none";
            merchantScreen.style.display = "none";
            if (adventuresScreen) adventuresScreen.style.display = "none";
            vaultScreen.style.display = "none";
            if (upgradesScreen) upgradesScreen.style.display = "none";
            
			// === NEW: Hide Studio ===
            const studioScreen = document.getElementById("studio-screen");
            if (studioScreen) studioScreen.style.display = "none";
			
			
            // ADD THIS TO HIDE THE MINIGAME
// Hide Minigames
let lumberScreen = document.getElementById("minigame-lumber-screen");
if (lumberScreen) lumberScreen.style.display = "none"; 
let fishingScreen = document.getElementById("minigame-fishing-screen");
if (fishingScreen) fishingScreen.style.display = "none";
let hopsScreen = document.getElementById("minigame-hops-screen");
if (hopsScreen) hopsScreen.style.display = "none";
			
            document.querySelectorAll('.nav-bar button').forEach(btn => btn.classList.remove('active-tab'));

            // === UPDATED STATE ROUTER ===
            if (gameState === 'KNIGHT') {
                if (knightScreen) knightScreen.style.display = "block";
                document.getElementById('nav-knight').classList.add('active-tab');
            } else if (gameState === 'TOWN') {
                townScreen.style.display = "block";
                document.getElementById('nav-town').classList.add('active-tab');
            } else if (gameState === 'MERCHANT') {
                merchantScreen.style.display = "flex";
                document.getElementById('nav-tavern').classList.add('active-tab');
            } else if (gameState === 'ADVENTURES') {
                if (adventuresScreen) adventuresScreen.style.display = "flex";
                document.getElementById('nav-adventures').classList.add('active-tab');
            } else if (gameState === 'VAULT') {
                vaultScreen.style.display = "block";
                document.getElementById('nav-vault').classList.add('active-tab');

                document.getElementById("vault-screen-count").innerText = player.stash.length;
                document.getElementById("vault-screen-max").innerText = player.vaultSlots;
                document.getElementById("vault-inv-count").innerText = player.inventory.length;

				let vaultCost = getVaultUpgradeCost();
                let vaultBtn = document.getElementById("upgrade-vault-btn");
                if (vaultBtn) {
                    vaultBtn.innerText = `Expand Vault Slots (+5 Slots) (Costs ${vaultCost.gold}g, ${vaultCost.wood}W)`;
                    vaultBtn.disabled = (player.gold < vaultCost.gold || player.wood < vaultCost.wood);
                }

                renderVaultStorageList();
                renderBackpackList(document.getElementById("vault-inventory-list"), true);
			} else if (gameState === 'UPGRADES') {
                if (upgradesScreen) upgradesScreen.style.display = "flex";
                document.getElementById('nav-town').classList.add('active-tab');
            } else if (gameState === 'STUDIO') {
                // === NEW: Show the Studio iframe ===
                if (studioScreen) studioScreen.style.display = "block";
                document.getElementById('nav-town').classList.add('active-tab'); // Keep Town tab highlighted
            }

            // --- NEW: DYNAMIC KNIGHT HEADER & STATS ---
            const knightHeader = document.getElementById("knight-header-name");
            if (knightHeader) {
                const nameInput = document.getElementById("char-name-input");
                knightHeader.innerText = (nameInput && nameInput.value.trim() !== "") ? nameInput.value.trim() : "Your Knight";
            }

            const knightStats = document.getElementById("knight-town-stats");
            if (knightStats) {
                knightStats.innerHTML = `
                    <div style="color: #2ecc71; margin-bottom: 2px; font-weight: bold;">❤️ ${player.hp} / ${player.vitality} HP</div>
                    <div style="color: #f1c40f; margin-bottom: 4px; font-weight: bold;">⚡ ${player.stamina} / ${player.maxStamina} STAM</div>
                    <div style="color: #bbaaa0; border-top: 1px dashed #3a2f26; padding-top: 4px; line-height: 1.3;">
                        💥 <b>PWR:</b> ${getPlayerTotalPower()} DMG<br>
                        🎯 <b>ACC:</b> ${player.accuracy}<br>
                        🛡️ <b>DEF:</b> ${getPlayerDeflectChance()}%<br>
                        🏃 <b>SPD:</b> ${getPlayerSwiftness()} Steps
                    </div>`;
            }

            const slots = ['helmet', 'armor', 'weapon', 'gloves', 'boots'];
            slots.forEach(slotKey => {
                const el = document.getElementById(`slot-${slotKey}`);
                if (el) {
                    const item = player.equipment[slotKey];
                    if (item) {
                        let rc = item.rarity === "Gorilla" ? "GorillaTier" : item.rarity;
                        let imgUrl = getItemSpriteURL(item);
                        let imgHtml = imgUrl ? `<img src="${imgUrl}" style="width:36px;height:36px;image-rendering:pixelated;display:block;margin:6px auto;">` : ``;
                        
                        // Removed the hardcoded button - the tooltip handles it now!
                        el.innerHTML = `
                            <div class="slot-title">${slotKey}</div>
                            ${imgHtml}
                            <span class="${rc}">${item.name}</span>
                        `;
                        
                        // === NEW: Pass the equipment item to the smart tooltip ===
                        el.onmouseenter = (e) => showItemTooltip(e, item, slotKey, 'equipment');
                        el.onmouseleave = hideItemTooltip;
                    } else {
                        el.innerHTML = `<div class="slot-title">${slotKey}</div><div style="height:48px;"></div><span style="color:#55443a;">Empty</span>`;
                        el.onmouseenter = null;
                        el.onmouseleave = null;
                    }
                }
            });



            const gateBtn = document.getElementById("gate-btn");
            if (gateBtn) {
                let activeWildLvl = player.selectedWildernessLevel || player.wildernessLevel;
                if (activeWildLvl === 20) {
                    gateBtn.innerText = "💥 Wilds (Lvl 20 BOSS)";
                    gateBtn.style.background = "#b33939";
                } else {
                    gateBtn.innerText = `Deploy Wilds (Lvl ${activeWildLvl})`;
                    gateBtn.style.background = "#8b5a2b";
                }
            }
            
            const statusBanner = document.getElementById("bait-status-banner");
            if (statusBanner) {
                if (player.mapBaited) {
                    statusBanner.innerText = "% PLACEMENT LAYER BUFFER ACTIVATED: SCALED RARITIES INDUCTION VECTORS";
                    statusBanner.style.color = "#ff9f43"; statusBanner.style.borderColor = "#d35400";
                } else if (player.cellarsChummed) {
                    statusBanner.innerText = "🛢️ CELLAR ALERT: SEAFOOD DISCHARGE DETECTED. HIGH DENSITY MIMIC ARRAYS ACTIVE";
                    statusBanner.style.color = "#1abc9c"; statusBanner.style.borderColor = "#16a085";
                } else {
                    statusBanner.innerText = "TRACKING SIGNAL: NORMAL SURFACE RADAR";
                    statusBanner.style.color = "#bbaaa0"; statusBanner.style.borderColor = "#443a32";
                }
            }

            let packCost = getBackpackUpgradeCost();

            const bomb1Btn = document.getElementById("craft-bomb-1-btn");
            if (bomb1Btn) bomb1Btn.disabled = (player.wood < 5 || player.hops < 15 || player.inventory.length >= (player.maxInventorySlots || 5));

            const bomb2Btn = document.getElementById("craft-bomb-2-btn");
            if (bomb2Btn) bomb2Btn.disabled = (player.wood < 10 || player.hops < 30 || player.inventory.length >= (player.maxInventorySlots || 5));
                   
            let brewBtn = document.getElementById("brewmaster-btn");
            if (brewBtn) brewBtn.disabled = (player.hops < 1 || player.gold < 10 || player.inventory.length >= (player.maxInventorySlots || 5)); 
            
            const resBtn = document.getElementById("reserve-btn");
            if (resBtn) resBtn.disabled = (player.hops < 200 || player.gold < 50 || player.inventory.length >= (player.maxInventorySlots || 5));

            let baitBtn = document.getElementById("bait-btn");
            if(baitBtn) baitBtn.disabled = (player.fish < 15 || player.mapBaited); 

            let wsBtn = document.getElementById("wholesale-btn");
            if(wsBtn) wsBtn.disabled = (player.fish < 100);
            
            let chumBtn = document.getElementById("chum-btn");
            if(chumBtn) chumBtn.disabled = (player.fish < 100 || player.cellarsChummed || !player.cellarsUnlocked);

            let ipaBtn = document.getElementById("ipa-btn");
            if(ipaBtn) ipaBtn.disabled = (player.hops < 1 || player.wood < 5);
            
            let lagBtn = document.getElementById("lager-btn");
            if(lagBtn) lagBtn.disabled = (player.hops < 2 || player.fish < 5);
            
            let hhBtn = document.getElementById("happy-hour-btn");
            if(hhBtn) hhBtn.disabled = (player.hops < 40 || player.gold < 100);
            
            let markBtn = document.getElementById("market-trader-btn");
            if(markBtn) markBtn.disabled = (player.hops < 50);

            const hhTimer = document.getElementById("happy-hour-timer");
            if (hhTimer) {
                if (player.happyHourTicks > 0) hhTimer.style.display = "inline";
                else hhTimer.style.display = "none";
            }

            let tavernBtn = document.getElementById("job-tavern-btn");
            if (tavernBtn) tavernBtn.className = player.idleJob === 'TAVERN' ? "active-job" : "";
            
            let forestBtn = document.getElementById("job-forest-btn");
            if (forestBtn) forestBtn.className = player.idleJob === 'FOREST' ? "active-job" : "";
            
            let lakeBtn = document.getElementById("job-lake-btn");
            if (lakeBtn) lakeBtn.className = player.idleJob === 'LAKE' ? "active-job" : "";
            
            let hopsBtn = document.getElementById("job-hops-btn");
            if (hopsBtn) hopsBtn.className = player.idleJob === 'HOPS' ? "active-job" : "";

            const cellarGate = document.getElementById("cellar-gate-btn");
            if(cellarGate) {
                let activeCellarLvl = player.selectedCellarLevel || player.cellarLevel;
                if (player.cellarsUnlocked) {
                    cellarGate.disabled = false; cellarGate.style.background = "#7b1fa2";
                    cellarGate.innerText = `🍷 Cellars (Lvl ${activeCellarLvl})`;
                } else { 
                    cellarGate.disabled = true; cellarGate.style.background = "#443a32";
                    cellarGate.innerText = "🔒 Defeat Lvl 20 Wilds";
                }
            }

            const abyssBtn = document.getElementById("abyss-btn");
            if (abyssBtn) {
                if (player.abyssUnlocked) {
                    abyssBtn.disabled = false;
                    abyssBtn.style.background = "#190a2e"; 
                    abyssBtn.innerText = `🌌 Descend into the Procedural Abyss (Depth ${player.abyssDepth || 1})`;
                } else {
                    abyssBtn.disabled = true;
                    abyssBtn.style.background = "#443a32"; 
                    abyssBtn.innerText = "🔒 Defeat Lvl 20 Cellars";
                }
            }
            
            let totalCart = player.supplyCart.wood + player.supplyCart.fish + (player.supplyCart.hops || 0);
            let cartTotEl = document.getElementById("cart-total");
            if(cartTotEl) cartTotEl.innerText = totalCart;
            let cartMaxEl = document.getElementById("cart-max");
            if(cartMaxEl) cartMaxEl.innerText = player.supplyCart.max;
            
            // --- NEW: DYNAMIC CART ANIMATIONS ---
            function updateAndFlash(id, newValue, memKey) {
                let el = document.getElementById(id);
                if (el) {
                    el.innerText = newValue;
                    if (uiMemory[memKey] !== -1 && newValue > uiMemory[memKey]) {
                        el.classList.remove('resource-pop');
                        void el.offsetWidth; 
                        el.classList.add('resource-pop');
                    }
                    uiMemory[memKey] = newValue;
                }
            }

            updateAndFlash("cart-wood", player.supplyCart.wood, 'cWood');
            updateAndFlash("cart-fish", player.supplyCart.fish, 'cFish');
            updateAndFlash("cart-hops", player.supplyCart.hops || 0, 'cHops');
            
            let claimBtn = document.getElementById("claim-cart-btn");
            if (claimBtn) {
                claimBtn.disabled = (totalCart === 0);
                if (totalCart >= player.supplyCart.max) {
                    claimBtn.classList.add("pulse-gold-btn");
                    claimBtn.innerText = "🧺 CART FULL - Claim Now!";
                } else {
                    claimBtn.classList.remove("pulse-gold-btn");
                    claimBtn.innerText = "🧺 Claim Supplies";
                }
            }

            let cartCost = getCartUpgradeCost();
            let upCartBtn = document.getElementById("upgrade-cart-btn");
            if (upCartBtn) {
                upCartBtn.innerText = `📦 Expand Cart Capacity (Costs ${cartCost.gold}g, ${cartCost.wood}W)`;
                upCartBtn.disabled = (player.gold < cartCost.gold || player.wood < cartCost.wood);
            }

            let wWood = document.getElementById("worker-wood-count");
            if(wWood) wWood.innerText = player.workers.woodcutters;
            let wFish = document.getElementById("worker-fish-count");
            if(wFish) wFish.innerText = player.workers.fishermen;
            let wHop = document.getElementById("worker-hop-count");
            if(wHop) wHop.innerText = player.workers.farmers || 0;
            
            let hwBtn = document.getElementById("hire-wood-btn");
            if(hwBtn) hwBtn.disabled = (player.gold < 75);
            let hfBtn = document.getElementById("hire-fish-btn");
            if(hfBtn) hfBtn.disabled = (player.gold < 75);
            let hhBtn2 = document.getElementById("hire-hop-btn");
            if(hhBtn2) hhBtn2.disabled = (player.gold < 75);

            let invC = document.getElementById("inv-count");
            if(invC) invC.innerText = player.inventory.length;
            renderBackpackList(document.getElementById("inventory-list"), false);

            let backpackHeader = document.querySelector("#main-backpack-panel h3");
            if (backpackHeader) {
                backpackHeader.innerHTML = `🎒 Knight's Backpack (<span id="inv-count">${player.inventory.length}</span>/${player.maxInventorySlots || 5} Slots) ` +
                `<button onclick="upgradeBackpackCapacity()" style="font-size:8px; padding:2px; margin-left:5px; background:#e67e22;" ${player.gold < packCost.gold || player.wood < packCost.wood ? 'disabled' : ''} onmouseenter="showSystemTooltip('pack_up', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">➕ Expand (+1 Slot: ${packCost.gold}g, ${packCost.wood}W)</button>` +
                `<button onclick="sortInventory()" style="font-size:8px; padding:2px; margin-left:5px; background:#2980b9;" onmouseenter="showSystemTooltip('inv_sort', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">🔀 Sort</button>`;
            }

            const lvlPanel = document.getElementById("level-up-panel");
            if (lvlPanel) {
                lvlPanel.style.display = "block";
                
                let sp = player.skillPoints || 0;
                let btnDisabled = sp > 0 ? "" : "disabled";
                let xpPct = Math.floor((player.xp / player.xpToNext) * 100);
                
                let totalSP = (player.level - 1) * 3;
                let canReset = player.gold >= 1000 && sp < totalSP;
                let resetDisabledStr = canReset ? "" : "disabled";
                
                let chevron = statsExpanded ? "🔼" : "🔽";
                let pulseClass = (sp > 0 && !statsExpanded) ? "pulse-sp-active" : ""; 
                
                lvlPanel.innerHTML = `
                    <button class="${pulseClass}" onclick="toggleStatsPanel()" style="width: 100%; background: #2c1e16; border: 1px solid #d35400; padding: 10px; text-align: left; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; margin-bottom: ${statsExpanded ? '0' : '10px'}; cursor: pointer;" onmouseenter="showSystemTooltip('stats_panel', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">
                        <span style="color: #ff9f43; font-weight: bold; font-family: 'Courier New', monospace; font-size: 13px;">🌟 Lvl ${player.level} Knight (${player.xp}/${player.xpToNext} XP - ${xpPct}%)</span>
                        <span style="font-size: 11px; color: #f1c40f;"><span id="unspent-sp">${sp}</span> SP Available ${chevron}</span>
                    </button>
                    
                    <div id="stats-dropdown" style="display: ${statsExpanded ? 'block' : 'none'}; padding: 12px; border: 1px solid #d35400; border-top: none; background: #1a110c; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; margin-bottom: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; font-size: 12px;">
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_vitality', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Vitality:</b> ${player.vitality} HP</div> 
                            <button ${btnDisabled} onclick="allocateStat('vitality')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_vitality', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                            
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_stamina', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Stamina:</b> ${player.maxStamina} STAM</div> 
                            <button ${btnDisabled} onclick="allocateStat('maxStamina')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_stamina', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                            
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_power', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Power:</b> ${player.power} DMG</div> 
                            <button ${btnDisabled} onclick="allocateStat('power')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_power', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                            
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_accuracy', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Accuracy:</b> ${player.accuracy}</div> 
                            <button ${btnDisabled} onclick="allocateStat('accuracy')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_accuracy', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                            
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_resilience', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Resilience:</b> ${player.resilience}%</div> 
                            <button ${btnDisabled} onclick="allocateStat('resilience')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_resilience', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                            
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_swiftness', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Swiftness:</b> ${player.swiftness} Steps</div> 
                            <button ${btnDisabled} onclick="allocateStat('swiftness')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_swiftness', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                        </div>
                        <button ${resetDisabledStr} onclick="resetStats()" style="width: 100%; margin-top: 10px; background: #8e44ad; padding: 4px 0; border-color: #9b59b6;" onmouseenter="showSystemTooltip('stat_reset', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">🔄 Reset Stats (1000g)</button>
                    </div>
                `;
            }
            
            const toggleContainer = document.getElementById("auto-claim-toggle-container");
            const gildedBtn = document.getElementById("gilded-tavern-btn");
            const upgradesPanel = document.querySelector("#upgrades-screen .dashboard-panel:nth-child(2)");

            if (player.gildedTavernUnlocked) {
                if (toggleContainer) toggleContainer.style.display = "flex";
                if (gildedBtn) {
                    gildedBtn.style.background = "#f1c40f";
                    gildedBtn.style.color = "#000";
                    gildedBtn.innerText = "✨ Gilded Tavern (Acquired)";
                    gildedBtn.onclick = null; 
                }
                if (upgradesPanel) {
                    upgradesPanel.style.border = "2px solid #f1c40f";
                    upgradesPanel.style.boxShadow = "0 0 20px rgba(241, 196, 15, 0.3)";
                }
                const checkbox = document.getElementById("auto-claim-checkbox");
                if (checkbox) checkbox.checked = player.autoClaimEnabled || false;
                
                const townView = document.getElementById("town-vault-view");
                if (townView) townView.style.setProperty("--active-town-bg", "url('assets/images/gilded-bg.png')");
            }

            const tradeUpgradeBtn = document.getElementById("btn-upgrade-trade");
            const bulkFishBtn = document.getElementById("btn-sell-fish-bulk");
            const monumentBtn = document.getElementById("btn-upgrade-monument");

            if (tradeUpgradeBtn) {
                if (player.tradeRoutesExpanded) {
                    tradeUpgradeBtn.style.background = "#27ae60";
                    tradeUpgradeBtn.innerText = "🗺️ Trade Routes (Expanded)";
                    tradeUpgradeBtn.onclick = null;
                }
            }
            
            if (bulkFishBtn) {
                bulkFishBtn.style.display = player.tradeRoutesExpanded ? "block" : "none";
            }

            if (monumentBtn) {
                if (player.monumentBuilt) {
                    monumentBtn.style.background = "#f1c40f";
                    monumentBtn.style.color = "#000";
                    monumentBtn.innerText = "🗽 The Golden Monument (Built)";
                    monumentBtn.onclick = null;
                }
            }

            if (gameState === 'KNIGHT' || gameState === 'TOWN' || gameState === 'VAULT' || gameState === 'MERCHANT' || gameState === 'ADVENTURES') {
                if (typeof renderMainScreenSprites === 'function') renderMainScreenSprites();
            }


            if (player.tutorialCompleted === false) {
                player.tutorialCompleted = 'active'; 
                setTimeout(() => {
                    if (typeof renderTutorialStep === 'function') renderTutorialStep();
                }, 500);
            }
        } 
    } catch(e) { console.error(e); }
}

function renderBackpackList(domContainer, showVaultOption) {
    if (!domContainer) return; 
    
    domContainer.innerHTML = "";
    domContainer.className = "inventory-grid"; // Apply the new grid CSS

    let maxSlots = player.maxInventorySlots || 5;

    for (let idx = 0; idx < maxSlots; idx++) {
        let item = player.inventory[idx];
        let slotDiv = document.createElement('div');

        if (item) {
            let rc = item.rarity === "Gorilla" ? "slot-jackpot" : (item.rarity ? `slot-${item.rarity.toLowerCase()}` : 'slot-common');
            slotDiv.className = `item-slot ${rc}`;
            
            // Drag and Drop Hooks
            slotDiv.draggable = true;
            slotDiv.ondragstart = (e) => handleItemDragStart(e, idx, 'backpack');
            slotDiv.ondragover = handleItemDragOver;
            slotDiv.ondrop = (e) => handleItemDrop(e, idx, 'backpack');
            
            // The New Tooltip Hook
            slotDiv.onmouseenter = (e) => showItemTooltip(e, item, idx, 'backpack');
            slotDiv.onmouseleave = hideTooltip;

            // Render the 24x24 Sprite Matrix!
            let imgUrl = getItemSpriteURL(item);
            if (imgUrl) {
                // pointer-events: none ensures the drag/drop fires on the slot, not the image!
                slotDiv.innerHTML = `<img src="${imgUrl}" style="width:36px;height:36px;image-rendering:pixelated;pointer-events:none;">`;
            } else {
                slotDiv.innerHTML = `<span style="font-size:20px;pointer-events:none;">${item.type === 'crate' ? '📦' : '🛡️'}</span>`;
            }
        } else {
            // Render Empty Slots for structure
            slotDiv.className = 'item-slot';
            slotDiv.ondragover = handleItemDragOver;
            slotDiv.ondrop = (e) => handleItemDrop(e, idx, 'backpack'); // Allow dropping into empty slots!
        }
        
        domContainer.appendChild(slotDiv);
    }
}

function renderVaultStorageList() {
    const vaultPanel = document.getElementById("vault-screen-list");
    if (!vaultPanel) return; 
    
    vaultPanel.innerHTML = "";
    vaultPanel.className = "inventory-grid"; // Apply the new grid CSS
    
    let maxSlots = player.vaultSlots || 10;

    for (let idx = 0; idx < maxSlots; idx++) {
        let item = player.stash[idx];
        let slotDiv = document.createElement('div');

        if (item) {
            let rc = item.rarity === "Gorilla" ? "slot-jackpot" : (item.rarity ? `slot-${item.rarity.toLowerCase()}` : 'slot-common');
            slotDiv.className = `item-slot ${rc}`;
            
            // Drag and Drop Hooks
            slotDiv.draggable = true;
            slotDiv.ondragstart = (e) => handleItemDragStart(e, idx, 'vault');
            slotDiv.ondragover = handleItemDragOver;
            slotDiv.ondrop = (e) => handleItemDrop(e, idx, 'vault');
            
            // The New Tooltip Hook
            slotDiv.onmouseenter = (e) => showItemTooltip(e, item, idx, 'vault');
            slotDiv.onmouseleave = hideTooltip;

            // Render the 24x24 Sprite Matrix!
            let imgUrl = getItemSpriteURL(item);
            if (imgUrl) {
                slotDiv.innerHTML = `<img src="${imgUrl}" style="width:36px;height:36px;image-rendering:pixelated;pointer-events:none;">`;
            } else {
                slotDiv.innerHTML = `<span style="font-size:20px;pointer-events:none;">${item.type === 'crate' ? '📦' : '🛡️'}</span>`;
            }
        } else {
            // Render Empty Slots for structure
            slotDiv.className = 'item-slot';
            slotDiv.ondragover = handleItemDragOver;
            slotDiv.ondrop = (e) => handleItemDrop(e, idx, 'vault');
        }
        
        vaultPanel.appendChild(slotDiv);
    }
}
// === NEW: COLLAPSIBLE STATS & SPRITE RENDERER ===
let statsExpanded = false;

function toggleStatsPanel() {
    statsExpanded = !statsExpanded;
    if (typeof playRetroSound === 'function') playRetroSound('menu');
    refreshSystemUI();
}

function renderMainScreenSprites() {
    // 1. Render Player onto the new Dashboard Canvas
    const pCanvas = document.getElementById('main-player-canvas');
    if (pCanvas && typeof drawProceduralSprite === 'function') {
        const pCtx = pCanvas.getContext('2d');
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
        
        let bodySprite = player.appearance.gender === 'female' ? 'body_female' : 'body_male';
        if (SpriteMatrices[bodySprite]) drawProceduralSprite(pCtx, SpriteMatrices[bodySprite], 0, 0, pCanvas.width);
        if (SpriteMatrices[player.appearance.eyes]) drawProceduralSprite(pCtx, SpriteMatrices[player.appearance.eyes], 0, 0, pCanvas.width);
        
        const hidesHair = player.equipment.helmet && player.equipment.helmet.hidesHair;
        if (!hidesHair && SpriteMatrices[player.appearance.hair]) {
            drawProceduralSprite(pCtx, SpriteMatrices[player.appearance.hair], 0, 0, pCanvas.width);
        }

        const eq = player.equipment;
        let gSuffix = player.appearance.gender === 'female' ? '_female' : '_male';
        
        if (eq.armor && eq.armor.spriteId) {
            let sId = eq.armor.spriteId + gSuffix;
            if (SpriteMatrices[sId]) drawProceduralSprite(pCtx, SpriteMatrices[sId], 0, 0, pCanvas.width);
            else if (SpriteMatrices[eq.armor.spriteId]) drawProceduralSprite(pCtx, SpriteMatrices[eq.armor.spriteId], 0, 0, pCanvas.width);
        }
        
        if (eq.boots && eq.boots.spriteId && SpriteMatrices[eq.boots.spriteId]) drawProceduralSprite(pCtx, SpriteMatrices[eq.boots.spriteId], 0, 0, pCanvas.width);
        if (eq.gloves && eq.gloves.spriteId && SpriteMatrices[eq.gloves.spriteId]) drawProceduralSprite(pCtx, SpriteMatrices[eq.gloves.spriteId], 0, 0, pCanvas.width);
        if (eq.helmet && eq.helmet.spriteId && SpriteMatrices[eq.helmet.spriteId]) drawProceduralSprite(pCtx, SpriteMatrices[eq.helmet.spriteId], 0, 0, pCanvas.width);
        if (eq.weapon && eq.weapon.spriteId && SpriteMatrices[eq.weapon.spriteId]) drawProceduralSprite(pCtx, SpriteMatrices[eq.weapon.spriteId], 0, 0, pCanvas.width);
    }

    // 2. Render Pet onto Canvas
    const petCanvas = document.getElementById('main-pet-canvas');
    const petAdoptionUI = document.getElementById('pet-adoption-ui');
    const petHeader = document.getElementById('pet-header-name');
    const openAdoptionBtn = document.getElementById('open-adoption-btn');
    
    if (petCanvas && typeof renderPetCanvas === 'function') {
        renderPetCanvas(petCanvas);
        
        // THIS IS THE LINE THAT WAS MISSING!
        if (player.pet && player.pet.adopted) {
            if (openAdoptionBtn) openAdoptionBtn.style.display = "none";
            
            // Show the Edit & Train buttons ONLY if the adoption UI is currently closed
            let editBtn = document.getElementById('edit-pet-btn');
            let trainBtn = document.getElementById('train-pet-btn');
            
            if (editBtn && petAdoptionUI && petAdoptionUI.style.display === "none") {
                editBtn.style.display = "block";
                if (trainBtn) {
                    trainBtn.style.display = "block";
                    trainBtn.innerText = `🦴 Feed Kibble (Lvl ${player.pet.level || 1})`;
                }
            } else {
                if (trainBtn) trainBtn.style.display = "none";
            }
            
            petCanvas.style.display = "block"; 
            if (petHeader) {
                petHeader.innerText = player.pet.name;
                petHeader.style.color = "#ffcc66";
            }
        } else {
            // Keeps the "Companion" default state until the player clicks the button
            if (petHeader && petHeader.innerText !== "Adopt Pet") {
                petHeader.innerText = "Companion";
                petHeader.style.color = "#bbaaa0";
            }
        }
    }
}

// === WARDROBE & PET EDITING LOGIC ===

window.openAdoptionMenu = function() {
    document.getElementById('open-adoption-btn').style.display = "none";
    document.getElementById('pet-adoption-ui').style.display = "block";
    document.getElementById('main-pet-canvas').style.display = "block";
    
    // Ensure the button says Adopt if they haven't adopted yet
    let confirmBtn = document.getElementById('confirm-pet-btn');
    if (confirmBtn) {
        confirmBtn.innerText = "Adopt (10g)";
        confirmBtn.onclick = adoptPet;
    }

    const petHeader = document.getElementById('pet-header-name');
    if (petHeader) {
        petHeader.innerText = "Adopt Pet";
        petHeader.style.color = "#2ecc71";
    }
};

function toggleWardrobe() {
    const ui = document.getElementById('knight-wardrobe-ui');
    const btn = document.getElementById('knight-wardrobe-btn');
    if (ui.style.display === "none" || ui.style.display === "") {
        ui.style.display = "block";
        btn.style.display = "none";
    } else {
        ui.style.display = "none";
        btn.style.display = "block";
    }
    if (typeof playRetroSound === 'function') playRetroSound('menu');
}

function cycleTownAppearance(part) {
    if (typeof cycleAppearance === 'function') {
        cycleAppearance(part); // This automatically edits player.appearance
    }
    if (typeof renderMainScreenSprites === 'function') renderMainScreenSprites();
    saveGame();
    if (typeof playRetroSound === 'function') playRetroSound('menu');
}

function editPetMenu() {
    document.getElementById('edit-pet-btn').style.display = "none";
    document.getElementById('pet-adoption-ui').style.display = "block";
    
    // Pre-fill their current name into the box so they can edit it
    document.getElementById('pet-name-input').value = player.pet.name;
    
    // Change the Adopt button into a Save button!
    let confirmBtn = document.getElementById('confirm-pet-btn');
    if (confirmBtn) {
        confirmBtn.innerText = "Save Changes";
        confirmBtn.onclick = savePetEdits;
    }
    
    if (typeof playRetroSound === 'function') playRetroSound('menu');
}

function savePetEdits() {
    let nameVal = document.getElementById('pet-name-input').value.trim();
    if(nameVal) player.pet.name = nameVal;
    
    document.getElementById('pet-adoption-ui').style.display = "none";
    document.getElementById('edit-pet-btn').style.display = "block";
    
    saveGame();
    refreshSystemUI(); // Restores the UI state and updates the headers
    if (typeof playRetroSound === 'function') playRetroSound('coin');
}





// === MISSING: PET CYCLING ENGINE ===
window.cyclePetAppearance = function(part) {
    // 1. Safety check: ensure the pet object exists
    if (!player.pet) player.pet = { adopted: false, name: "Companion" };
    
    // 2. Define the visual options (We can add more of these in pet-assets.js later!)
    const petOptions = {
    type: ['dog', 'cat'],
    furColor: ['brown', 'gray', 'orange', 'white', 'black', 'golden', 'cream'], 
    collarColor: ['red', 'blue', 'green', 'yellow', 'purple', 'pink']
    };

    if (!petOptions[part]) return;

    // 3. Find the current style and cycle to the next one
    let currentVal = player.pet[part];
    
    // If the pet doesn't have a value yet, default to the first one
    if (!currentVal) currentVal = petOptions[part][0];
    
    let currentIndex = petOptions[part].indexOf(currentVal);
    let nextIndex = (currentIndex + 1) % petOptions[part].length;
    
    // 4. Apply the new visual and save
    player.pet[part] = petOptions[part][nextIndex];
    saveGame();

    // 5. REDRAW THE CANVAS! (This is what makes the UI actually update)
    if (typeof renderMainScreenSprites === 'function') renderMainScreenSprites();
    if (typeof playRetroSound === 'function') playRetroSound('menu');
};

function updateTownUI(data) {
    // The core UI refresh now handles cart math directly via getCartUpgradeCost().
    // This function remains available to catch future server-only Town data payloads.
}

