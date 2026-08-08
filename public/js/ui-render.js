// --- UI: RENDER & REFRESH MANAGER ---

// --- UI: RENDER & REFRESH MANAGER ---
let uiMemory = { gold: -1 }

// === UI NAVIGATION ENGINE ===
function switchTab(tabId) {
    const stateByLegacyView = {
        'town-vault-view': 'TOWN',
        'social-view': 'COMMUNITY',
        'combat-screen': 'COMBAT'
    };
    const nextState = stateByLegacyView[tabId];
    if (nextState && typeof setGameState === 'function') setGameState(nextState);
}

function setGameScreenVisibility(screen, visible, displayMode = 'flex') {
    if (!screen) return;
    screen.style.display = visible ? displayMode : 'none';
    screen.inert = !visible;
    if (typeof screen.setAttribute === 'function') {
        screen.setAttribute('aria-hidden', visible ? 'false' : 'true');
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

    const spriteGridSize = typeof PROCEDURAL_SPRITE_GRID_SIZE === 'number'
        ? PROCEDURAL_SPRITE_GRID_SIZE
        : 32;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = spriteGridSize;
    tempCanvas.height = spriteGridSize;
    const ctx = tempCanvas.getContext('2d');

    if (typeof drawProceduralSprite === 'function') {
        drawProceduralSprite(ctx, SpriteMatrices[targetSprite], 0, 0, spriteGridSize);
    }

    return tempCanvas.toDataURL();
}

function refreshCombatSidebar() {
    const topBars = document.getElementById("combat-top-bars");
    const bottomStats = document.getElementById("combat-bottom-stats");
    if (!topBars || !bottomStats) return;

    const activeActor = typeof getActiveCombatant === 'function' ? getActiveCombatant() : player;
    const isPlayer = !activeActor || activeActor.uid === 'player_0' || activeActor.kind === 'player';
    const actorEquipment = (activeActor && activeActor.equipment) || player.equipment || {};
    const actorHp = Number.isFinite(activeActor && activeActor.hp) ? activeActor.hp : player.hp;
    const maxHp = isPlayer ? getPlayerMaxHp() : Math.max(1, Number(activeActor.maxHp) || actorHp || 1);
    const actorStamina = Number.isFinite(activeActor && activeActor.stamina) ? activeActor.stamina : player.stamina;
    const maxStamina = isPlayer ? getPlayerMaxStamina() : Math.max(1, Number(activeActor.maxStamina) || actorStamina || 1);
    const hpPct = Math.max(0, Math.min(100, (actorHp / maxHp) * 100));
    const staminaPct = Math.max(0, Math.min(100, (actorStamina / maxStamina) * 100));
    const actorOffense = isPlayer ? getPlayerTotalPower() : Math.max(1, Number(activeActor.offense) || 1);
    const actorDefense = isPlayer ? getPlayerDeflectChance() : Math.max(0, Number(activeActor.defense) || 0);
    const actorSpeed = isPlayer ? getPlayerSwiftness() : Math.max(1, Number(activeActor.speed) || 1);
    const actorBuffs = (activeActor && activeActor.activeBuffs) || [];

    const describeItem = (item, emptyLabel) => {
        if (!item) return `<span style='color:#55443a;'>${emptyLabel}</span>`;
        const imageUrl = getItemSpriteURL(item);
        const image = imageUrl ? `<img src="${imageUrl}" style="width:24px;height:24px;image-rendering:pixelated;vertical-align:middle;margin-right:4px;">` : '';
        const rarity = item.rarity === 'Gorilla' ? 'GorillaTier' : (item.rarity || 'Common');
        return `${image} <span class="${rarity}">${item.name}</span>`;
    };

    const helmetDesc = describeItem(actorEquipment.helmet, 'Bare Headed');
    const armorDesc = describeItem(actorEquipment.armor, 'Bare Torso');
    const weaponDesc = describeItem(actorEquipment.weapon, 'Unarmed');
    const offhandDesc = describeItem(actorEquipment.offhand, 'Empty Offhand');
    const glovesDesc = describeItem(actorEquipment.gloves, 'Bare Hands');
    const bootsDesc = describeItem(actorEquipment.boots, 'Bare Feet');
    const tooltipItem = slot => `onmouseenter="showTooltip(getItemTooltip((getActiveCombatant().equipment || {}).${slot}), event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"`;

    let buffHtml = '';
    if (actorBuffs.length > 0) {
        buffHtml = `<div style="margin-top:10px;border-top:1px dashed #443a32;padding-top:8px;display:flex;flex-direction:column;gap:6px;">` +
            actorBuffs.map(buff => `<div style="font-size:11px;color:#2ecc71;"><b>ACTIVE PERK:</b> ${buff}</div>`).join('') +
            `</div>`;
    }

    topBars.innerHTML = `
        <div class="combat-grid-2-col">
            <div style="background:#1a1512;padding:12px;border-radius:4px;border:1px solid #4a3b2c;">
                <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:bold;margin-bottom:6px;">
                    <span style="color:#ffcc66;">VITALITY:</span>
                    <span style="color:#2ecc71;">${Math.floor(actorHp)} / ${Math.floor(maxHp)} HP</span>
                </div>
                <div style="width:100%;background:#110d0a;height:16px;border-radius:3px;overflow:hidden;border:1px solid #55443a;">
                    <div style="width:${hpPct}%;background:${hpPct > 45 ? '#27ae60' : '#c0392b'};height:100%;transition:width 0.2s;"></div>
                </div>
            </div>
            <div style="background:#1a1512;padding:12px;border-radius:4px;border:1px solid #4a3b2c;">
                <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:bold;margin-bottom:6px;">
                    <span style="color:#ffcc66;">STAMINA:</span>
                    <span style="color:#f1c40f;">${Math.floor(actorStamina)} / ${Math.floor(maxStamina)} STAM</span>
                </div>
                <div style="width:100%;background:#110d0a;height:16px;border-radius:3px;overflow:hidden;border:1px solid #55443a;">
                    <div style="width:${staminaPct}%;background:#e67e22;height:100%;transition:width 0.2s;"></div>
                </div>
            </div>
        </div>`;

    bottomStats.innerHTML = `
        <div style="background:#1a1512;padding:12px;border-radius:4px;border:1px solid #4a3b2c;">
            <h4 style="margin:0 0 10px 0;font-size:12px;color:#ffcc66;text-transform:uppercase;border-bottom:1px dashed #4a3b2c;padding-bottom:6px;">Active Loadout</h4>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;line-height:1.4;">
                <div style="cursor:help;width:max-content;" ${tooltipItem('helmet')}><b>Helmet:</b> ${helmetDesc}</div>
                <div style="cursor:help;width:max-content;" ${tooltipItem('armor')}><b>Armor:</b> ${armorDesc}</div>
                <div style="cursor:help;width:max-content;" ${tooltipItem('weapon')}><b>Weapon:</b> ${weaponDesc}</div>
                <div style="cursor:help;width:max-content;" ${tooltipItem('offhand')}><b>Offhand:</b> ${offhandDesc}</div>
                <div style="cursor:help;width:max-content;" ${tooltipItem('gloves')}><b>Gloves:</b> ${glovesDesc}</div>
                <div style="cursor:help;width:max-content;" ${tooltipItem('boots')}><b>Boots:</b> ${bootsDesc}</div>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="background:#1a1512;padding:12px;border-radius:4px;border:1px solid #4a3b2c;font-size:12px;color:#bbaaa0;line-height:1.6;height:100%;box-sizing:border-box;">
                <b>Offense Output:</b> Lvl ${actorOffense} (Max ${actorOffense * 10} DMG)<br>
                <b>Defense (Absorption):</b> Lvl ${actorDefense}<br>
                <b>Speed (Evasion):</b> Lvl ${actorSpeed}
            </div>
            ${buffHtml}
        </div>`;
}

function renderEquipmentAttackMenu() {
    const menu = document.getElementById('equipment-attack-menu');
    const button = document.getElementById('equipment-attacks-btn');
    if (!menu || !button) return;

    const open = typeof isEquipmentAttackMenuOpen === 'function'
        && isEquipmentAttackMenuOpen();
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.hidden = !open;
    if (!open) {
        menu.innerHTML = '';
        return;
    }

    const actor = typeof getActiveCombatant === 'function'
        ? getActiveCombatant()
        : player;
    const actions = typeof listActiveEquipmentAttacks === 'function'
        ? listActiveEquipmentAttacks()
        : [];

    menu.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'equipment-attack-menu-heading';
    heading.setAttribute('role', 'presentation');
    heading.textContent = `${actor && actor.name ? actor.name : 'Knight'} — Equipment Attacks`;
    menu.appendChild(heading);

    if (actions.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'equipment-attack-menu-empty';
        empty.textContent = 'No equipped items currently provide an equipment attack.';
        menu.appendChild(empty);
        return;
    }

    actions.forEach(action => {
        const targetType = String(action.targetType || 'enemy').toLowerCase();
        const targetLabel = targetType === 'self'
            ? 'Self'
            : (['tile', 'aoe', 'area'].includes(targetType)
                ? `Area · ${action.range} tile range`
                : `Enemy · ${action.range} tile range`);
        const disabledReason = typeof getEquipmentAttackDisabledReason === 'function'
            ? getEquipmentAttackDisabledReason(action)
            : '';
        const option = document.createElement('button');
        option.type = 'button';
        option.setAttribute('role', 'menuitem');
        option.setAttribute('aria-disabled', disabledReason ? 'true' : 'false');
        option.tabIndex = -1;
        option.className = 'equipment-attack-option';
        option.title = action.description || '';
        option.onclick = () => {
            if (disabledReason) {
                if (typeof logMessage === 'function') logMessage(disabledReason);
                if (typeof playRetroSound === 'function') playRetroSound('error');
                return false;
            }
            return selectEquipmentAttack(action.equipmentSlot, action.id);
        };

        const name = document.createElement('span');
        name.className = 'equipment-attack-option-name';
        name.textContent = action.name;
        const meta = document.createElement('span');
        meta.className = 'equipment-attack-option-meta';
        meta.textContent = `${action.itemName || action.equipmentSlot} · ${Math.max(0, Number(action.staminaCost) || 0)} STAM · ${targetLabel}`;
        option.append(name, meta);
        if (action.description) {
            const description = document.createElement('span');
            description.className = 'equipment-attack-option-description';
            description.textContent = action.description;
            option.appendChild(description);
        }
        if (disabledReason) {
            const reason = document.createElement('span');
            reason.className = 'equipment-attack-option-reason';
            reason.textContent = disabledReason;
            option.appendChild(reason);
        }
        menu.appendChild(option);
    });

    const firstOption = menu.querySelector('[role="menuitem"]');
    if (firstOption) firstOption.tabIndex = 0;
}

function refreshSystemUI() {
    try {
        if (typeof normalizeClientPlayerContainers === 'function') normalizeClientPlayerContainers();
        if (typeof updateAdventureNavigation === 'function') {
            const activeJourney = player
                && player.adventure
                && player.adventure.activeJourney;
            updateAdventureNavigation(activeJourney || null);
        }

        const topNavBar = document.getElementById("top-nav-bar");
        const townVaultView = document.getElementById("town-vault-view");
        const combatScreen = document.getElementById("combat-screen");
        const vaultScreen = document.getElementById("vault-screen");
        const wallet = document.getElementById("wallet-display");

        // Tab Panels
        const knightScreen = document.getElementById("knight-screen");
        const partyScreen = document.getElementById("party-screen");
        const townScreen = document.getElementById("town-screen");
        const adventuresScreen = document.getElementById("adventures-screen");
        const socialView = document.getElementById("social-view");

        if (!townVaultView || !combatScreen || !vaultScreen || !wallet || !townScreen) return;

        // === GOLD ECONOMY DISPLAY ===
        let animG = (uiMemory.gold !== -1 && player.gold > uiMemory.gold) ? 'resource-pop' : '';
        uiMemory.gold = player.gold;
        const timberPtsUi = document.getElementById('ui-timber-pts');
        if (timberPtsUi) timberPtsUi.innerText = (player.lumberPoints || 0).toLocaleString();
        const fishPtsUi = document.getElementById('ui-fish-pts');
        if (fishPtsUi) fishPtsUi.innerText = (player.fishingPoints || 0).toLocaleString();
        const hopsPtsUi = document.getElementById('ui-hops-pts');
        if (hopsPtsUi) hopsPtsUi.innerText = (player.hopsPoints || 0).toLocaleString();
        const activityCrateTrades = [
            ['trade-timber-crate', Number(player.lumberPoints) || 0],
            ['trade-angler-crate', Number(player.fishingPoints) || 0],
            ['trade-harvest-crate', Number(player.hopsPoints) || 0]
        ];
        const activityBackpackFull = Array.isArray(player.inventory)
            && player.inventory.length >= (player.maxInventorySlots || 5);
        activityCrateTrades.forEach(([buttonId, points]) => {
            const button = document.getElementById(buttonId);
            if (!button) return;
            button.disabled = points < 2500 || activityBackpackFull;
            button.title = activityBackpackFull
                ? 'Make room in the backpack before trading.'
                : (points < 2500
                    ? `${(2500 - points).toLocaleString()} more points needed.`
                    : 'Ready to trade.');
        });
        const staticGold = document.getElementById('static-gold-display');
        if (staticGold) {
            staticGold.className = animG;
            staticGold.innerHTML = `Gold: <b style="color:#fff;">${(player.gold || 0).toLocaleString()}g</b>`;
        }
        if (wallet) wallet.style.display = 'none';


const lumberScreen = document.getElementById("minigame-lumber-screen");
const fishingScreen = document.getElementById("minigame-fishing-screen");
const hopsScreen = document.getElementById("minigame-hops-screen");

if (gameState === 'COMBAT' || gameState === 'MINIGAME_LUMBER' || gameState === 'MINIGAME_FISHING' || gameState === 'MINIGAME_HOPS') {
    if (topNavBar) topNavBar.style.display = "none"; 
    townVaultView.style.display = "none"; 
    setGameScreenVisibility(vaultScreen, false);
    setGameScreenVisibility(socialView, false);
    
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
        let activeZoneToUse = activeCombatZone;

        if (activeZoneToUse === 'WILDERNESS') dynamicBg = "url('assets/images/wilds-bg.png')";
        else if (activeZoneToUse === 'CELLARS') dynamicBg = "url('assets/images/cellars-bg.png')";
        else if (activeZoneToUse === 'GORILLA_ARENA') dynamicBg = "url('assets/images/arena-bg.png')";
        combatScreen.style.setProperty('--active-combat-bg', dynamicBg);

        const uiHeader = document.getElementById("target-ui-header");
        const activeActorHeader = document.getElementById("combat-active-actor");
        const activeUiActor = (typeof activeCombatActorUid !== "undefined" && activeCombatActorUid && typeof getCombatActorByUid === "function")
            ? getCombatActorByUid(activeCombatActorUid)
            : null;
        const activeUiName = activeUiActor && activeUiActor.name ? activeUiActor.name : "Knight";

        if (activeActorHeader) {
            if (combatPhase === "VICTORY") activeActorHeader.textContent = "COMBAT COMPLETE";
            else if (activeUiActor) activeActorHeader.textContent = `ACTIVE: ${activeUiName} | ACTIONS: ${combatActionsRemaining}/2`;
            else activeActorHeader.textContent = "ATB: CHARGING";
        }
        
        const canIssueAction = currentTurn === 'PLAYER' && !!activeUiActor && combatActionsRemaining > 0 && !['WAITING_FOR_SERVER', 'WAITING_FOR_ATB', 'VICTORY'].includes(combatPhase);
        const actionReady = canIssueAction && combatPhase === 'ACTION_READY';
        const targeting = canIssueAction && combatPhase === 'TARGETING';
        const equipmentMenuOpen = typeof isEquipmentAttackMenuOpen === 'function'
            && isEquipmentAttackMenuOpen();

        if (currentTurn === 'PLAYER') {
            const activeUiPos = typeof getActiveCombatantPosition === 'function' ? getActiveCombatantPosition() : { x: player.x, y: player.y, size: 1 };
            const activeUiWeapon = typeof getActiveCombatantWeapon === 'function' ? getActiveCombatantWeapon() : player.equipment.weapon;
            const range = (activeUiWeapon && activeUiWeapon.combat && activeUiWeapon.combat.standard.range) || 1;
            let hasTarget = !!(selectedEnemy && selectedEnemy.alive);
            let withinRange = false;
            let losClear = false;
            const validateTarget = target => {
                if (!target || !target.alive) return false;
                const dist = getGridDistance(activeUiPos.x, activeUiPos.y, target.x, target.y, target.size || 1);
                if (dist > range) return false;
                const targetSize = target.size || 1;
                for (let bx = target.x; bx < target.x + targetSize; bx++) {
                    for (let by = target.y; by < target.y + targetSize; by++) {
                        if (hasLineOfSight(activeUiPos.x, activeUiPos.y, bx, by)) return true;
                    }
                }
                return false;
            };
            if (hasTarget) {
                withinRange = getGridDistance(activeUiPos.x, activeUiPos.y, selectedEnemy.x, selectedEnemy.y, selectedEnemy.size || 1) <= range;
                losClear = validateTarget(selectedEnemy);
            }
            if (actionReady && (!hasTarget || !withinRange || !losClear)) {
                const autoEnemy = getPlayerAttackables().find(validateTarget);
                if (autoEnemy) { selectedEnemy = autoEnemy; hasTarget = true; withinRange = true; losClear = true; }
            }
            if (uiHeader) {
                if (targeting) {
                    uiHeader.textContent = typeof getPendingEquipmentAttackTargetInstruction === 'function'
                        ? getPendingEquipmentAttackTargetInstruction()
                        : 'TARGETING: Select a highlighted tile';
                    uiHeader.style.color = '#e74c3c';
                }
                else if (pendingMove) { uiHeader.textContent = 'CONFIRM MOVE: Click the green tile again'; uiHeader.style.color = '#2ecc71'; }
                else if (equipmentMenuOpen) { uiHeader.textContent = `${activeUiName}: Choose an equipment attack`; uiHeader.style.color = '#ffcc66'; }
                else if (selectedEnemy && selectedEnemy.alive) { uiHeader.textContent = `${activeUiName} FOCUS: ${selectedEnemy.name} (${selectedEnemy.hp}/${selectedEnemy.maxHp} HP)`; uiHeader.style.color = '#2ecc71'; }
                else if (actionReady) { uiHeader.textContent = `${activeUiName}: Choose Move, Attack, Item, Rest, or Pass`; uiHeader.style.color = '#3498db'; }
                else { uiHeader.textContent = 'WAITING FOR SERVER'; uiHeader.style.color = '#bbaaa0'; }
            }
            const slashBtn = document.getElementById('slash-btn');
            const equipmentAttacksBtn = document.getElementById('equipment-attacks-btn');
            const endBtn = document.getElementById('end-btn');
            const fleeBtn = document.getElementById('flee-btn');
            const standardAttackCost = activeUiWeapon && activeUiWeapon.combat && activeUiWeapon.combat.standard
                ? Math.max(0, Number(activeUiWeapon.combat.standard.staminaCost) || 0)
                : 5;
            const activeStamina = typeof getActiveCombatantStamina === 'function'
                ? Math.max(0, Number(getActiveCombatantStamina()) || 0)
                : Math.max(0, Number(player.stamina) || 0);
            const attackEnabled = actionReady
                && hasTarget
                && withinRange
                && losClear
                && activeStamina >= standardAttackCost;
            if (slashBtn) {
                slashBtn.disabled = !attackEnabled;
                slashBtn.innerText = activeUiWeapon
                    ? `Attack (${standardAttackCost} STAM)`
                    : `Unarmed Strike (${standardAttackCost} STAM)`;
                slashBtn.setAttribute('aria-label', activeStamina < standardAttackCost
                    ? `Attack unavailable: ${Math.floor(activeStamina)} of ${standardAttackCost} stamina`
                    : `Attack for ${standardAttackCost} stamina`);
            }
            if (equipmentAttacksBtn) {
                const equipmentAttacks = typeof listActiveEquipmentAttacks === 'function'
                    ? listActiveEquipmentAttacks()
                    : [];
                equipmentAttacksBtn.disabled = !actionReady || equipmentAttacks.length === 0;
                equipmentAttacksBtn.innerText = 'Equipment Attacks';
            }
            if (endBtn) {
                const passRecovery = Math.max(0, Math.min(2, combatActionsRemaining || 0)) * 15;
                endBtn.disabled = !canIssueAction;
                endBtn.innerText = passRecovery > 0 ? `Pass Turn (+${passRecovery}% Stamina)` : 'Pass Turn';
                endBtn.style.opacity = '1.0';
            }
            if (fleeBtn) { fleeBtn.disabled = !actionReady; fleeBtn.style.opacity = '1.0'; }
        } else {
            if (uiHeader) { uiHeader.textContent = activeUiActor ? `${activeUiName} EXECUTING TURN` : 'ATB GAUGES CHARGING'; uiHeader.style.color = '#e74c3c'; }
            ['slash-btn', 'equipment-attacks-btn', 'end-btn', 'flee-btn'].forEach(id => {
                const button = document.getElementById(id);
                if (button) { button.disabled = true; button.style.opacity = '1.0'; }
            });
        }

        renderEquipmentAttackMenu();
        refreshCombatSidebar();

const combatInvList = document.getElementById("combat-inventory-list");
        if (combatInvList) {
            combatInvList.innerHTML = '';
            const bagBtn = document.createElement('button');
            bagBtn.innerText = `Backpack (${player.inventory.length}/${player.maxInventorySlots || 5})`;
            bagBtn.style.padding = '10px';
            bagBtn.style.background = '#8b5a2b';
            bagBtn.disabled = currentTurn !== 'PLAYER' || combatPhase !== 'ACTION_READY' || combatActionsRemaining <= 0;
            bagBtn.onclick = () => renderCombatModal();
            const restBtn = document.createElement('button');
            restBtn.innerText = 'Rest (+15% Stamina)';
            restBtn.style.padding = '10px';
            restBtn.style.background = '#287a69';
            restBtn.style.borderColor = '#35a48c';
            restBtn.disabled = currentTurn !== 'PLAYER' || combatActionsRemaining <= 0 || ['WAITING_FOR_SERVER', 'WAITING_FOR_ATB', 'VICTORY'].includes(combatPhase);
            restBtn.onclick = () => executeCombatAction('rest');
            restBtn.onmouseenter = event => showSystemTooltip('combat_rest', event);
            restBtn.onmousemove = moveTooltip;
            restBtn.onmouseleave = hideTooltip;
            combatInvList.appendChild(bagBtn);
            combatInvList.appendChild(restBtn);
            if (combatPhase === 'TARGETING') {
                const cancelBtn = document.createElement('button');
                cancelBtn.innerText = 'Cancel Action';
                cancelBtn.style.background = '#443a32';
                cancelBtn.style.gridColumn = 'span 2';
                cancelBtn.style.padding = '10px';
                cancelBtn.onclick = () => cancelTarget();
                combatInvList.appendChild(cancelBtn);
            }
        }
    } // Closes the gameState === 'COMBAT' check
} // Closes the exclusive full-screen views check

        else {
            // --- CONSOLIDATED TABBED VIEWS ---
            // We are out of combat, show the Nav Bar
            if (topNavBar) topNavBar.style.display = "flex";
            combatScreen.style.display = "none";

            // Location screens share one router. The Vault and Community are
            // siblings of the Town/Knight/Party screen container.
            if (townVaultView) townVaultView.style.display = (gameState === 'VAULT' || gameState === 'COMMUNITY') ? "none" : "flex";
// Hide ALL tabs first to ensure a clean slate
            [knightScreen, partyScreen, townScreen, adventuresScreen, vaultScreen, socialView]
                .forEach(screen => setGameScreenVisibility(screen, false));
			
			
            // ADD THIS TO HIDE THE MINIGAME
// Hide Minigames
let lumberScreen = document.getElementById("minigame-lumber-screen");
if (lumberScreen) lumberScreen.style.display = "none"; 
let fishingScreen = document.getElementById("minigame-fishing-screen");
if (fishingScreen) fishingScreen.style.display = "none";
let hopsScreen = document.getElementById("minigame-hops-screen");
if (hopsScreen) hopsScreen.style.display = "none";
			
            document.querySelectorAll('.nav-bar button').forEach(btn => {
                btn.classList.remove('active-tab');
                btn.removeAttribute('aria-current');
            });

            // === UPDATED STATE ROUTER ===
            if (gameState === 'KNIGHT') {
                setGameScreenVisibility(knightScreen, true);
                const navKnight = document.getElementById('nav-knight');
                if (navKnight) {
                    navKnight.classList.add('active-tab');
                    navKnight.setAttribute('aria-current', 'page');
                }
                if (typeof renderKnightQuestLog === 'function') renderKnightQuestLog();
            } else if (gameState === 'PARTY') {
                setGameScreenVisibility(partyScreen, true);
                const navParty = document.getElementById('nav-party');
                if (navParty) {
                    navParty.classList.add('active-tab');
                    navParty.setAttribute('aria-current', 'page');
                }
            } else if (gameState === 'TOWN') {
                setGameScreenVisibility(townScreen, true);
                if (typeof renderTownWorldState === 'function') renderTownWorldState();
                if (typeof renderWalkableTown === 'function') renderWalkableTown();
            } else if (gameState === 'ADVENTURES') {
                setGameScreenVisibility(adventuresScreen, true);
                if (typeof renderAdventureScreen === 'function') renderAdventureScreen();
            } else if (gameState === 'VAULT') {
                setGameScreenVisibility(vaultScreen, true);

                const vaultCountEl = document.getElementById("vault-screen-count");
                const vaultMaxEl = document.getElementById("vault-screen-max");
                const vaultInvCountEl = document.getElementById("vault-inv-count");
                if (vaultCountEl) vaultCountEl.innerText = player.stash.length;
                if (vaultMaxEl) vaultMaxEl.innerText = player.vaultSlots;
                if (vaultInvCountEl) vaultInvCountEl.innerText = player.inventory.length;

                let vaultCost = getVaultUpgradeCost();
                let vaultBtn = document.getElementById("upgrade-vault-btn");
                if (vaultBtn) {
                    // === THE FIX: Condense the text so it fits beautifully in the header ===
                    vaultBtn.innerText = `Expand (+5: ${vaultCost.gold}g)`;
                    vaultBtn.disabled = (player.gold < vaultCost.gold);
                }

                renderVaultStorageList();
                renderBackpackList(document.getElementById("vault-inventory-list"), true);
            } else if (gameState === 'COMMUNITY') {
                setGameScreenVisibility(socialView, true, 'grid');
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
                    <div style="color: #2ecc71; margin-bottom: 2px; font-weight: bold;">\u2764\uFE0F ${player.hp} / ${getPlayerMaxHp()} HP</div>
                    <div style="color: #f1c40f; margin-bottom: 4px; font-weight: bold;">\u26A1 ${player.stamina} / ${getPlayerMaxStamina()} STAM</div>
                    <div style="color: #bbaaa0; border-top: 1px dashed #3a2f26; padding-top: 4px; line-height: 1.3;">
                        \u2694\uFE0F <b>Offense:</b> Total ${getPlayerTotalPower()}<br>
                        \u{1F6E1}\uFE0F <b>Defense:</b> Total ${getPlayerDeflectChance()}<br>
                        \u{1F3C3} <b>Speed:</b> Total ${getPlayerSwiftness()}
                    </div>`;
            }

            const slots = [
                'helmet',
                'armor',
                'weapon',
                'offhand',
                'gloves',
                'boots'
            ];
            
            // Dictionary mapping slots to their designated placeholder letters
            const slotPlaceholders = {
                'helmet': 'H',
                'armor': 'A',
                'weapon': 'W',
                'offhand': 'O',
                'gloves': 'G',
                'boots': 'B'
            };

            slots.forEach(slotKey => {
                // Fetch BOTH the Knight tab slot and the Vault tab slot
                const domElements = [
                    document.getElementById(`slot-${slotKey}`),
                    document.getElementById(`vault-slot-${slotKey}`)
                ];

                domElements.forEach(el => {
                    if (el) {
                        // Universal drop hooks for empty or full slots
                        el.ondragover = handleItemDragOver;
                        el.ondrop = (e) => handleItemDrop(e, slotKey, 'equipment');

                        const item = player.equipment[slotKey];
                        if (item) {
                            // Activate drag-away for equipped items
                            el.draggable = true;
                            el.ondragstart = (e) => handleItemDragStart(e, slotKey, 'equipment');

                            // Apply standard or Gorilla rarity borders
                            let rc = item.rarity === "Gorilla" ? "slot-jackpot" : (item.rarity ? `slot-${item.rarity.toLowerCase()}` : 'slot-common');
                            el.className = `equip-slot ${rc}`;

                            // Extract and render the canonical 32x32 procedural sprite
                            let imgUrl = getItemSpriteURL(item);
                            let imgHtml = imgUrl ? `<img src="${imgUrl}" style="width:32px;height:32px;image-rendering:pixelated;pointer-events:none;">` : ``;
                            
                            // Clear the placeholder letter and inject the image
                            el.innerHTML = imgHtml;
                            
                            // Re-hook the tooltip logic
                            el.onmouseenter = (e) => showItemTooltip(e, item, slotKey, 'equipment');
                            el.onmouseleave = hideTooltip;
                            bindInventoryDoubleClick(el, (e) => handleEquipmentDoubleClick(e, slotKey, el.id && el.id.indexOf('vault-slot-') === 0));
                        } else {
                            // Slot is empty - restore the vanilla placeholder state
                            el.draggable = false;
                            el.ondragstart = null;
                            el.className = 'equip-slot'; 
                            el.innerHTML = slotPlaceholders[slotKey];
                            el.onmouseenter = null;
                            el.onmouseleave = null;
                            bindInventoryDoubleClick(el, null);
                        }
                    }
                });
            });



            let packCost = getBackpackUpgradeCost();

                   
            let brewBtn = document.getElementById("brewmaster-btn");
            if (brewBtn) brewBtn.disabled = (player.gold < 25 || player.inventory.length >= (player.maxInventorySlots || 5)); 
            
            const resBtn = document.getElementById("reserve-btn");
            if (resBtn) resBtn.disabled = (player.gold < 1000 || player.inventory.length >= (player.maxInventorySlots || 5)); 

            let ipaBtn = document.getElementById("ipa-btn");
            if(ipaBtn) ipaBtn.disabled = (player.gold < 75 || player.inventory.length >= (player.maxInventorySlots || 5));
            
            let lagBtn = document.getElementById("lager-btn");
            if(lagBtn) lagBtn.disabled = (player.gold < 75 || player.inventory.length >= (player.maxInventorySlots || 5));
            
            let ironBtn = document.getElementById("ironwall-btn");
            if(ironBtn) ironBtn.disabled = (player.gold < 150 || player.inventory.length >= (player.maxInventorySlots || 5));

            let clearBtn = document.getElementById("clearwater-btn");
            if(clearBtn) clearBtn.disabled = (player.gold < 150 || player.inventory.length >= (player.maxInventorySlots || 5));

            let staunchBtn = document.getElementById("staunch-btn");
            if(staunchBtn) staunchBtn.disabled = (player.gold < 250 || player.inventory.length >= (player.maxInventorySlots || 5));


            const roster = player.roster && typeof player.roster === 'object' ? player.roster : { companions: [], activeIds: [] };
            const companions = Array.isArray(roster.companions) ? roster.companions : [];
            const activeIds = Array.isArray(roster.activeIds) ? roster.activeIds : [];
            if (typeof renderCompanionRosterUI === 'function') renderCompanionRosterUI(companions, activeIds);

            const activeJourney = !!(player.adventure && player.adventure.activeJourney);
            const awayNotice = document.getElementById('party-away-notice');
            if (awayNotice) awayNotice.hidden = !activeJourney;
            ['knight-return-hub-btn', 'party-return-hub-btn'].forEach(buttonId => {
                const button = document.getElementById(buttonId);
                if (button) button.textContent = activeJourney ? 'Resume Journey' : 'Return to Town';
            });

            const selectedCompanion = typeof getSelectedPartyCompanion === 'function'
                ? getSelectedPartyCompanion()
                : null;
            const partyHelp = document.getElementById('party-backpack-help');
            if (partyHelp) {
                partyHelp.textContent = selectedCompanion
                    ? `Assign gear or one combat item to ${selectedCompanion.name || 'the selected companion'}.`
                    : 'Select a companion, then use Equip or Pocket on an item.';
            }
            const partyCount = document.getElementById('party-inv-count');
            if (partyCount) partyCount.textContent = player.inventory.length;
            renderBackpackList(document.getElementById('party-inventory-list'), 'party');

            let invC = document.getElementById("inv-count");
            if(invC) invC.innerText = player.inventory.length;
            renderBackpackList(document.getElementById("inventory-list"), false);

           let backpackHeader = document.querySelector("#main-backpack-panel h3");
            if (backpackHeader) {
                backpackHeader.innerHTML = `\u{1F392} Knight's Backpack (<span id="inv-count">${player.inventory.length}</span>/${player.maxInventorySlots || 5} Slots) ` +
`<button onclick="upgradeBackpackCapacity()" style="font-size:8px; padding:2px; margin-left:5px; background:#e67e22;" ${player.gold < packCost.gold ? 'disabled' : ''} onmouseenter="showSystemTooltip('pack_up', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">Expand (+1 Slot: ${packCost.gold}g)</button>`;
            }

            const lvlPanel = document.getElementById("level-up-panel");
            if (lvlPanel) {
                lvlPanel.style.display = "block";
                
                let sp = player.skillPoints || 0;
                let btnDisabled = sp > 0 ? "" : "disabled";
                
                let xpString = "";
                let xpPct = 0;
                let lifetimeXp = sanitizeLifetimeXp(player.xp || 0);
                
                if (player.level >= MAX_PLAYER_LEVEL) {
                    xpString = `${lifetimeXp.toLocaleString()} Total XP - MAX`;
                    xpPct = 100;
                } else {
                    const progress = getLevelXpProgress(lifetimeXp, player.level || 1);
                    xpPct = progress.pct;
                    xpString = `${lifetimeXp.toLocaleString()} Total XP - ${xpPct}% to next`;
                }
                
                // === UPDATED: Calculate total SP correctly based on the new 5 SP limit ===
                let totalSP = (player.level - 1) * SP_PER_LEVEL;
                let canReset = player.gold >= 1000 && sp < totalSP;
                let resetDisabledStr = canReset ? "" : "disabled";
                
                let chevron = statsExpanded ? "\u{1F53C}" : "\u{1F53D}";
                let pulseClass = (sp > 0 && !statsExpanded) ? "pulse-sp-active" : ""; 
                
                lvlPanel.innerHTML = `
                    <button class="${pulseClass}" onclick="toggleStatsPanel()" style="width: 100%; background: #2c1e16; border: 1px solid #d35400; padding: 10px; text-align: left; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; margin-bottom: ${statsExpanded ? '0' : '10px'}; cursor: pointer;" onmouseenter="showSystemTooltip('stats_panel', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">
                        <span style="color: #ff9f43; font-weight: bold; font-family: 'Courier New', monospace; font-size: 13px;">\u{1F31F} Lvl ${player.level} Knight (${xpString})</span>
                        <span style="font-size: 11px; color: #f1c40f;"><span id="unspent-sp">${sp}</span> SP Available ${chevron}</span>
                    </button>
                    
                    <div id="stats-dropdown" style="display: ${statsExpanded ? 'block' : 'none'}; padding: 12px; border: 1px solid #d35400; border-top: none; background: #1a110c; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; margin-bottom: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; font-size: 12px;">
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_vitality', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Vitality:</b> Lvl ${player.vitality}</div> 
                            <button ${btnDisabled} onclick="allocateStat('vitality')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_vitality', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                            
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_stamina', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Stamina:</b> Lvl ${player.maxStamina}</div> 
                            <button ${btnDisabled} onclick="allocateStat('maxStamina')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_stamina', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                            
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_power', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Offense:</b> Lvl ${player.offense}</div> 
                            <button ${btnDisabled} onclick="allocateStat('offense')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_power', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                            
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_resilience', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Defense:</b> Lvl ${player.defense}</div> 
                            <button ${btnDisabled} onclick="allocateStat('defense')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_resilience', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                            
                            <div style="cursor:help;" onmouseenter="showSystemTooltip('stat_swiftness', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()"><b>Speed:</b> Lvl ${player.speed}</div> 
                            <button ${btnDisabled} onclick="allocateStat('speed')" style="padding: 2px 10px;" onmouseenter="showSystemTooltip('stat_swiftness', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">+1</button>
                        </div>
                        <button ${resetDisabledStr} onclick="resetStats()" style="width: 100%; margin-top: 10px; background: #8e44ad; padding: 4px 0; border-color: #9b59b6;" onmouseenter="showSystemTooltip('stat_reset', event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">\u{1F504} Reset Stats (1000g)</button>
                    </div>
                `;
            }

            if (gameState === 'KNIGHT' || gameState === 'PARTY' || gameState === 'TOWN' || gameState === 'VAULT' || gameState === 'ADVENTURES') {
                if (typeof renderMainScreenSprites === 'function') renderMainScreenSprites();
            }


     
        } 
    } catch(e) { console.error(e); }
}

function renderBackpackList(domContainer, showVaultOption) {
    if (!domContainer) return; 
    const isPartyContext = showVaultOption === 'party';
    const isVaultContext = showVaultOption === true;
    const isPartyActionPending = typeof partyInventoryActionPending !== 'undefined'
        && partyInventoryActionPending;
    const activePartyFocusKey = isPartyContext
        && typeof document !== 'undefined'
        && document.activeElement
        && typeof domContainer.contains === 'function'
        && domContainer.contains(document.activeElement)
        && document.activeElement.dataset
        ? document.activeElement.dataset.partyFocusKey
        : '';
    
    domContainer.innerHTML = "";
    domContainer.className = `inventory-grid${isPartyContext ? ' party-inventory-grid' : ''}`;
    if (isPartyContext) {
        domContainer.setAttribute('aria-busy', isPartyActionPending ? 'true' : 'false');
    }
    
    // NEW: Fallback drop zone on the container background itself!
    domContainer.ondragover = handleItemDragOver;
    domContainer.ondrop = (e) => {
        if (e.target === domContainer) {
            // If dropped in the dead space between slots, toss it in the first empty slot
            let nextSlot = player.inventory.length; 
            if (nextSlot < (player.maxInventorySlots || 5)) handleItemDrop(e, nextSlot, 'backpack');
        }
    };

    // Hydration may return retired equipment/pocket items to a full backpack.
    // Render that temporary overflow so migrated items are never hidden.
    let maxSlots = Math.max(player.maxInventorySlots || 5, player.inventory.length);

    for (let idx = 0; idx < maxSlots; idx++) {
        let item = player.inventory[idx];
        let slotDiv = document.createElement('div');

        if (item) {
            let rc = item.rarity === "Gorilla" ? "slot-jackpot" : (item.rarity ? `slot-${item.rarity.toLowerCase()}` : 'slot-common');
            slotDiv.className = `item-slot ${rc}`;
            
            // Drag and Drop Hooks
            slotDiv.draggable = !isPartyContext || !isPartyActionPending;
            if (isPartyContext) slotDiv.dataset.partyDraggable = 'true';
            slotDiv.ondragstart = (e) => handleItemDragStart(e, idx, 'backpack');
            slotDiv.ondragover = handleItemDragOver;
            slotDiv.ondrop = (e) => handleItemDrop(e, idx, 'backpack');
            
            // The New Tooltip Hook
            slotDiv.onmouseenter = (e) => showItemTooltip(e, item, idx, 'backpack');
            slotDiv.onmouseleave = hideTooltip;
            if (!isPartyContext) {
                bindInventoryDoubleClick(slotDiv, (e) => handleBackpackDoubleClick(e, idx, item, isVaultContext));
            }

            // Render the canonical 32x32 sprite matrix.
            let imgUrl = getItemSpriteURL(item);
            if (imgUrl) {
                // pointer-events: none ensures the drag/drop fires on the slot, not the image!
                slotDiv.innerHTML = `<img src="${imgUrl}" style="width:36px;height:36px;image-rendering:pixelated;pointer-events:none;">`;
            } else {
                slotDiv.innerHTML = `<span style="font-size:20px;pointer-events:none;">${item.type === 'crate' ? '\u{1F4E6}' : '\u{1F6E1}\uFE0F'}</span>`;
            }

            if (isPartyContext) {
                const itemName = document.createElement('span');
                itemName.className = 'party-backpack-item-name';
                itemName.textContent = item.name || 'Backpack item';
                slotDiv.appendChild(itemName);

                const selectedCompanion = typeof getSelectedPartyCompanion === 'function'
                    ? getSelectedPartyCompanion()
                    : null;
                const presentations = typeof getPartyBackpackActionPresentations === 'function'
                    ? getPartyBackpackActionPresentations(item)
                    : (typeof getPartyBackpackActionPresentation === 'function'
                        ? [getPartyBackpackActionPresentation(item)].filter(Boolean)
                        : []);
                if (presentations.length) {
                    presentations.forEach(presentation => {
                    const action = document.createElement('button');
                    action.type = 'button';
                    action.className = 'party-backpack-action';
                    action.textContent = presentation.label;
                    action.dataset.inventoryIndex = String(idx);
                    action.dataset.partyFocusKey = `party-backpack:${idx}:${presentation.action}`;
                    action.dataset.partyActionUnavailable = selectedCompanion ? 'false' : 'true';
                    action.disabled = !selectedCompanion || isPartyActionPending;
                    action.setAttribute('aria-label', selectedCompanion
                        ? `${presentation.label}: ${item.name || 'item'} for ${selectedCompanion.name || 'selected companion'}`
                        : `${presentation.label}: ${item.name || 'item'}. Select a companion first.`);
                    action.onclick = event => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (typeof activatePartyBackpackItem === 'function') {
                            activatePartyBackpackItem(idx, presentation.action);
                        }
                    };
                    slotDiv.appendChild(action);
                    });
                } else {
                    const unavailable = document.createElement('span');
                    unavailable.className = 'party-backpack-unavailable';
                    unavailable.textContent = 'Knight use';
                    slotDiv.appendChild(unavailable);
                }
                slotDiv.setAttribute('aria-label', `${item.name || 'Backpack item'} in the shared backpack`);
            }
        } else {
            // Render Empty Slots for structure
            slotDiv.className = 'item-slot';
            slotDiv.ondragover = handleItemDragOver;
            slotDiv.ondrop = (e) => handleItemDrop(e, idx, 'backpack'); // Allow dropping into empty slots!
        }
        
        domContainer.appendChild(slotDiv);
    }
    if (activePartyFocusKey && typeof restorePartyFocus === 'function') {
        restorePartyFocus(activePartyFocusKey);
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
            bindInventoryDoubleClick(slotDiv, (e) => handleVaultItemDoubleClick(e, idx));

            // Render the canonical 32x32 sprite matrix.
            let imgUrl = getItemSpriteURL(item);
            if (imgUrl) {
                slotDiv.innerHTML = `<img src="${imgUrl}" style="width:36px;height:36px;image-rendering:pixelated;pointer-events:none;">`;
            } else {
                slotDiv.innerHTML = `<span style="font-size:20px;pointer-events:none;">${item.type === 'crate' ? '\u{1F4E6}' : '\u{1F6E1}\uFE0F'}</span>`;
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

        const sharedProfile = (
            typeof drawHumanoidActorFront === 'function'
        )
            ? drawHumanoidActorFront(
                pCtx,
                player,
                0,
                0,
                pCanvas.width
            )
            : null;

        if (!sharedProfile) {
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
            if (eq.weapon && eq.weapon.spriteId) {
                if (typeof drawFrontPaperdollWeapon === 'function') {
                    drawFrontPaperdollWeapon(
                        pCtx,
                        eq.weapon.spriteId,
                        0,
                        0,
                        pCanvas.width
                    );
                } else if (SpriteMatrices[eq.weapon.spriteId]) {
                    drawProceduralSprite(
                        pCtx,
                        SpriteMatrices[eq.weapon.spriteId],
                        0,
                        0,
                        pCanvas.width
                    );
                }
            }
        }
    }

}

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
    
    // === THE FIX: FLUSH THE GPU CACHE SO NEW COLORS BAKE ===
    if (typeof clearSpriteCache === 'function') clearSpriteCache(); 
    
    if (typeof renderMainScreenSprites === 'function') renderMainScreenSprites();
    saveGame();
    if (typeof playRetroSound === 'function') playRetroSound('menu');
}

function renderCombatModal(filter = 'DRINK') {
    const modal = document.getElementById('combat-backpack-modal');
    const grid = document.getElementById('combat-modal-grid');
    if (!modal || !grid) return;

    const actor = typeof getActiveCombatant === 'function' ? getActiveCombatant() : null;
    const isCompanion = Boolean(actor && actor.kind === 'companion');
    const companion = isCompanion && typeof getActiveCompanionRosterEntry === 'function'
        ? getActiveCompanionRosterEntry()
        : null;
    if (isCompanion && filter === 'EQUIP') filter = 'DRINK';

    const title = document.getElementById('combat-modal-title');
    if (title) title.innerText = isCompanion
        ? `${actor.name}'s Pockets + Shared Backpack`
        : 'Combat Backpack';

    let filterContainer = document.getElementById('combat-modal-filters');
    if (!filterContainer) {
        filterContainer = document.createElement('div');
        filterContainer.id = 'combat-modal-filters';
        filterContainer.style.display = 'flex';
        filterContainer.style.gap = '4px';
        filterContainer.style.marginBottom = '10px';
        grid.parentNode.insertBefore(filterContainer, grid);
    }
    filterContainer.innerHTML = '';

    const filters = [{ id: 'DRINK', icon: '\u{1F37A}', text: isCompanion ? 'Pocket & Backpack Drinks' : 'Drinks' }];
    if (!isCompanion) filters.push({ id: 'EQUIP', icon: '\u{1F6E1}\uFE0F', text: 'Gear' });
    filters.forEach(entry => {
        const button = document.createElement('button');
        button.innerText = `${entry.icon} ${entry.text}`;
        button.style.flex = '1';
        button.style.padding = '6px 2px';
        button.style.fontSize = '11px';
        button.style.fontWeight = 'bold';
        button.style.background = filter === entry.id ? '#27ae60' : '#443a32';
        button.style.border = '1px solid #111';
        button.style.color = '#fff';
        button.onclick = () => renderCombatModal(entry.id);
        filterContainer.appendChild(button);
    });

    const isUsableDrink = item => Boolean(item && item.slot === 'consumable' && item.combat
        && ['heal', 'buff', 'cleanse', 'staunch'].includes(item.combat.actionType));
    const entries = [];
    if (isCompanion && companion && filter === 'DRINK') {
        (companion.pockets || []).forEach((item, pocketIndex) => {
            if (isUsableDrink(item)) entries.push({ item, reference: { source: 'pocket', pocketIndex }, sourceLabel: `Pocket ${pocketIndex + 1}` });
        });
    }
    (player.inventory || []).forEach((item, index) => {
        const showItem = filter === 'DRINK'
            ? isUsableDrink(item)
            : Boolean(item && item.slot !== 'consumable' && item.type !== 'crate');
        if (showItem) entries.push({ item, reference: { source: 'backpack', index }, sourceLabel: 'Backpack' });
    });

    grid.innerHTML = '';
    entries.forEach(entry => {
        const slotDiv = document.createElement('button');
        slotDiv.type = 'button';
        const rarityClass = entry.item.rarity === 'Gorilla'
            ? 'slot-jackpot'
            : (entry.item.rarity ? `slot-${entry.item.rarity.toLowerCase()}` : 'slot-common');
        slotDiv.className = `item-slot ${rarityClass}`;
        slotDiv.style.position = 'relative';
        const itemDescription = entry.item.desc
            || (entry.item.combat && entry.item.combat.desc)
            || 'Use this item in combat.';
        slotDiv.setAttribute(
            'aria-label',
            `${entry.item.name || 'Combat item'}. ${itemDescription} ${entry.sourceLabel}. Uses one action.`
        );
        slotDiv.title = `${entry.item.name || 'Combat item'} — ${itemDescription}`;
        slotDiv.onclick = () => {
            closeCombatModal();
            if (typeof selectCombatItem === 'function') selectCombatItem(entry.reference);
        };
        if (typeof showTooltip === 'function' && typeof getItemTooltip === 'function') {
            slotDiv.onmouseenter = event => showTooltip(getItemTooltip(entry.item), event);
            slotDiv.onmousemove = typeof moveTooltip === 'function' ? moveTooltip : null;
            slotDiv.onmouseleave = typeof hideTooltip === 'function' ? hideTooltip : null;
        }

        const imageUrl = typeof getItemSpriteURL === 'function' ? getItemSpriteURL(entry.item) : '';
        if (imageUrl) {
            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = '';
            image.style.cssText = 'width:36px;height:36px;image-rendering:pixelated;pointer-events:none;';
            slotDiv.appendChild(image);
        } else {
            const fallback = document.createElement('span');
            fallback.style.cssText = 'font-size:20px;pointer-events:none;';
            fallback.textContent = filter === 'DRINK' ? '\u{1F37A}' : '\u{1F6E1}\uFE0F';
            slotDiv.appendChild(fallback);
        }
        const badge = document.createElement('span');
        badge.textContent = filter === 'EQUIP'
            ? `${entry.sourceLabel} · 1 Action`
            : entry.sourceLabel;
        badge.style.cssText = 'position:absolute;left:2px;right:2px;bottom:1px;font-size:7px;background:rgba(0,0,0,.8);color:#fff;pointer-events:none;';
        slotDiv.appendChild(badge);
        grid.appendChild(slotDiv);
    });

    if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'color:#bbaaa0;text-align:center;padding:25px 15px;font-size:12px;font-style:italic;width:100%;';
        empty.textContent = isCompanion && filter === 'DRINK'
            ? 'No usable drinks in this mercenary\'s pockets or the shared backpack.'
            : 'No items of this type in the backpack.';
        grid.appendChild(empty);
    }

    if (modal.style.display !== 'block' && typeof playRetroSound === 'function') playRetroSound('menu');
    modal.style.display = 'block';
}

window.closeCombatModal = function() {
    document.getElementById('combat-backpack-modal').style.display = 'none';
    hideTooltip();
}


