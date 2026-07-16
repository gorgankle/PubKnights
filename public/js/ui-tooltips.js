// --- UI: TOOLTIPS & OVERLAYS ---

function showSystemTooltip(type, event) {
    let html = "";
    // FIX: Safely define 'item' so the script doesn't crash on hover!
    let item = typeof type === 'object' ? type : null;

    if (type === 'tavern_enter') {
        html = `<h3>🍻 The Tavern</h3>Step inside to visit the Provisioner and Brewmaster. Brew combat drinks, trade on the Black Market, and prepare for expeditions.`;
    }
	else if (type === 'trade_routes') {
        html = `<h3>🗺️ Expand Trade Routes</h3>Fund a massive infrastructure project to clear roads and build merchant cargo ships. <br><br>🔓 <b>Unlocks:</b> Bulk Fish Exports (Sell 1,000 Fish at once).<br>💰 Cost: 25,000 Gold`;
    }
	else if (type === 'monument') {
        html = `<h3>🗽 The Golden Monument</h3>Erect a breathtaking statue in the center of town declaring yourself the ultimate Guildmaster.<br><br>🏆 <b>Reward:</b> Permanently DOUBLES all XP and Gold yields from combat!<br>💰 Cost: 1,000,000 Gold`;
    }
else if (type === 'pet_train') {
        let cost = getPetTrainingCost();
        html = `<h3>Companion Kibble</h3>Train your companion's scavenging instincts.<br><b>Reward:</b> +1% cumulative chance per level to dig up exclusive Pet-Only Loot after every combat victory!<br>Cost: ${cost.gold}g`;
    }
	
else if (item && item.slot === "consumable") {
        if (item.type === "crate") {
            html += `📦 <b>Mystery Box:</b> Click to break the seal and reveal the loot inside.<br>`;
            html += `<span style="color: #bbaaa0; font-style: italic; font-size: 10px;">${item.desc}</span><br>`;
        }
	} 	
    else if (type === 'adventures_enter') {
        html = `<h3>⚔️ Adventure Board</h3>Check the latest local bounties, adjust map difficulty levels, and deploy your Knight into combat zones.`;
    }
	else if (type === 'cellars_enter') {
        html = `<h3>🍷 Forbidden Cellars</h3>Descend into the forgotten, mold-covered storage vaults. Enemies here have thicker armor and hit harder than those in the Wilds.<br>⚠️ Danger: Beware of Mimics disguising themselves among the casks!`;
    }
    else if (type === 'vault_up') {
        let cost = getVaultUpgradeCost();
        html = `<h3>Structural Expansion</h3>Adds <b>+5 secure vault frames</b>.<br>Cost: ${cost.gold}g`;
    }
    else if (type === 'craft_stout') {
        html = `<h3>Craft Combat Stout</h3>Buy a battle-ready healing brew from the Brewmaster.<br>Cost: 25g`;
    }
 // === REPLACED ===
    else if (type === 'ipa') {
        html = `<h3>Furious IPA</h3>Drink it from the combat backpack to gain a <b>1.25x Offense Multiplier</b> for that fight.<br>Cost: 75g`;
    }
    else if (type === 'lager') {
        html = `<h3>Swift Lager</h3>Drink it from the combat backpack to gain <b>+1 Speed Level</b> and an <b>ATB surge</b> for that fight.<br>Cost: 75g`;
    }
	else if (type === 'reserve') {
        html = `<h3>Grandmaster Reserve</h3>Heavily mends wounds in battle and cleanses negative effects.<br>Cost: 1000g`;
    }
	else if (type === 'gilded_tavern') {
        html = `<h3>✨ Gilded Tavern Metamorphosis</h3>Pay the ultimate tribute to the Guild. Imbues the pub walls with gold filigree and automates supply clearing.<br>💰 Cost: <b>10,000 Gold</b>`;
    }
    else if (type === 'happy_hour') {
        html = `<h3>🎉 Host Happy Hour</h3>Throw a massive festival to double your team's morale! Woodcutters, Fishermen, and Farmers harvest at <b>2x speed vectors for the next 3 minutes</b>.<br>⚖️ Requires: 40 Hops, 100 Gold Pieces`;
    }
    else if (type === 'black_market') {
        html = `<h3>Removed</h3>Black market trading has been removed.`;
    }
    else if (type === 'fish_wholesale') {
        html = `<h3>Retired</h3>Fish exports have been retired in the gold economy.`;
    }
    else if (type === 'chum_cellars') {
        html = `<h3>Retired</h3>Cellar chumming has been retired for now.`;
    }
   else if (type === 'stat_vitality') {
        html = `<h3>❤️ Vitality</h3>Increases your maximum health pool.<br>📈 Gain <b>+25 Max HP</b> per level.`;
    }
    else if (type === 'stat_stamina') {
        html = `<h3>⚡ Stamina</h3>Expands your energy reserves for attacks and movement.<br>📈 Gain <b>+25 Max Stamina</b> per level.`;
    }
    else if (type === 'stat_power') {
        html = `<h3>💥 Offense</h3>Governs your hit chance and maximum damage potential.<br>📈 Pitted against Evasion (Speed) and Absorption (Defense).`;
    }
    else if (type === 'stat_resilience') {
        html = `<h3>🛡️ Defense</h3>Your ability to absorb and deflect incoming physical trauma.<br>📈 Drastically mitigates incoming Offense rolls.`;
    }
    else if (type === 'stat_swiftness') {
        html = `<h3>🏃 Speed</h3>Increases your evasion and mobility across the tactical grid.<br>📈 Governs grid distance limits and dodge chances.`;
    }
// ============================================
	// === NEW: RESET TOOLTIP ===
    else if (type === 'stat_reset') {
        html = `<h3>🔄 Amnesia Draft</h3>Wipe your Knight's physical memory to reassign all previously spent Skill Points.<br>💰 Cost: 1000 Gold Pieces`;
    }
	else if (type === 'stats_panel') {
        html = `<h3>Knight Attributes</h3>Click to expand your Knight's profile to view and allocate your core statistics.`;
    }
    else if (type === 'idle_rest') {
        html = `<h3>💤 Rest Bar</h3>Take a break in the tavern to passively regenerate <b>+5 HP</b> per tick.`;
    }
    else if (type === 'idle_wood') {
        html = `<h3>🪓 Gather Wood</h3>Venture into the forest to passively collect <b>Timber</b> for upgrades and trade.`;
    }
    else if (type === 'idle_fish') {
        html = `<h3>🎣 Catch Fish</h3>Relax by the lake to passively reel in <b>Fish</b> for trading and zone bait.`;
    }
    else if (type === 'idle_hops') {
        html = `<h3>🌾 Harvest Hops</h3>Work the fields to passively gather <b>Hops</b> for brewing and black market deals.`;
    }
    else if (type === 'bait_wilds') {
        html = `<h3>Retired</h3>Wilds baiting has been retired for now.`;
    }
    else if (type === 'pack_up') {
        let pCost = getBackpackUpgradeCost();
        html = `<h3>Expand Backpack</h3>Adds <b>+1 slot</b> to your personal combat inventory.<br>Cost: ${pCost.gold}g`;
    }
    else if (type === 'claim_cart') {
        html = `<h3>🧺 Claim Supplies</h3>Empty the town's production cart and deposit all gathered Timber, Fish, and Hops directly into your vault balance.`;
    }
    // === NEW: COMBAT ACTIONS ===
    else if (type === 'combat_slash') {
        html = `<h3>⚔️ Standard Attack</h3>Execute a standard melee strike against your locked target.<br>⚡ Cost: <b>5 Stamina</b>`;
    }
    else if (type === 'combat_brew') {
        html = `<h3>🍺 Chug Brew</h3>Quickly down a Combat Stout to mend wounds during battle.<br>❤️ Restores: <b>10% Max HP</b>`;
    }
    else if (type === 'combat_pass') {
        html = `<h3>💨 Pass Turn</h3>Hold your ground and catch your breath to recover energy.<br>⚡ Restores: <b>15% Max Stamina</b>`;
    }
    
    showTooltip(html, event);
}

function getItemTooltip(item) {
    if (!item) return `<span style='color:#777;'>Empty Core Slot</span>`;
    let rarityClass = item.rarity === "Gorilla" ? "GorillaTier" : item.rarity || "Common";
    let itemValue = item.value || (item.rarity === "Gorilla" ? 500 : 15);
    
    let html = `<div style='border-bottom: 1px dashed #634e3d; padding-bottom: 4px; margin-bottom: 4px;'>` +
               `<span class='${rarityClass}' style='font-size: 12px;'><b>${item.name}</b></span><br>` +
               `<span style='font-size: 9px; color: #bbaaa0;'>Type: ${item.slot.toUpperCase()} [${item.rarity}]</span></div>`;
               
    // === REPLACED ===
    if (item.slot !== "consumable") {
        if (item.offense) html += `💥 <b>Offense:</b> Lvl +${item.offense}<br>`;
        if (item.defense) {
            html += `🛡️ <b>Defense:</b> Lvl +${item.defense}<br>`;
        }
        if (item.speed) html += `🏃 <b>Speed:</b> Lvl ${item.speed > 0 ? '+' : ''}${item.speed}<br>`;
        
        // Dynamically pull range from the combat object
        if (item.combat && item.combat.standard) {
            html += `📏 <b>Weapon Strike Radius:</b> ${item.combat.standard.range} Tile(s)<br>`;
        }
        
        // Dynamically pull the special attack description
        if (item.slot === "weapon" && typeof getWeaponSpecialDesc === 'function') {
            html += `<div style='margin-top:4px; padding:4px; background:#1e1712; font-size:10px; border-left:2px solid #ffcc66; color:#e0caad;'>` + 
                    `${getWeaponSpecialDesc(item)}</div>`;
        }
    } 
// ============================================
    else if (item.slot === "consumable" && item.combat) {
            html += `🍺 <b>Combat Effect:</b> ${item.combat.desc}<br>`;
        }
    
    html += `<div class='meta-value'>💰 Trader Appraisal Value: ${itemValue} Gold Pieces</div>`;
    return html;
}

function showSpecialSkillTooltip(e) {
    if (player.equipment.weapon) {
        let text = `<h3>⚔️ Weapon Skill Deployment</h3>` + getWeaponSpecialDesc(player.equipment.weapon) + `<br><br>⚡ Cost: <b>15 Stamina</b>`;
        showTooltip(text, e);
    } else {
        showTooltip(`<h3>⚔️ Fists Burst</h3>No weapon profile map locked.<br><br>⚡ Cost: <b>15 Stamina</b>`, e);
    }
}

function showTooltip(htmlContent, e) {
    const tt = document.getElementById("game-tooltip");
    if (tt) { tt.innerHTML = htmlContent; tt.style.display = "block"; moveTooltip(e); }
}

function moveTooltip(e) {
    const tt = document.getElementById("game-tooltip");
    if (!tt) return;

    // 1. Get reliable coordinates (supports both mouse and touch screens)
    let pageX = e.pageX;
    let pageY = e.pageY;
    
    if (pageX === undefined && e.changedTouches && e.changedTouches.length > 0) {
        pageX = e.changedTouches[0].pageX;
        pageY = e.changedTouches[0].pageY;
    }

    // 2. Default position: slightly below and to the right
    let posX = pageX + 15;
    let posY = pageY + 15;

    // 3. Get window boundaries and tooltip dimensions
    const rightEdge = window.innerWidth + window.scrollX;
    const bottomEdge = window.innerHeight + window.scrollY;
    const ttWidth = tt.offsetWidth;
    const ttHeight = tt.offsetHeight;

    // 4. Boundary Check: Right Edge
    // If it bleeds off the right edge, flip it to the left of the cursor
    if (posX + ttWidth > rightEdge - 10) {
        posX = pageX - ttWidth - 15;
        
        // Failsafe: if the screen is super narrow, stick it to the absolute left edge
        if (posX < window.scrollX + 5) {
            posX = window.scrollX + 5;
        }
    }

    // 5. Boundary Check: Bottom Edge
    // If it bleeds off the bottom edge, flip it above the cursor
    if (posY + ttHeight > bottomEdge - 10) {
        posY = pageY - ttHeight - 15;
        
        // Failsafe: stick to absolute top edge if needed
        if (posY < window.scrollY + 5) {
            posY = window.scrollY + 5;
        }
    }

    // Apply the smart coordinates
    tt.style.left = posX + "px";
    tt.style.top = posY + "px";
}

function hideTooltip() { 
    const tt = document.getElementById("game-tooltip"); 
    if (tt) tt.style.display = "none"; 
}

			//The Tooltip Logic & Combat Safety

let tooltipHideTimer = null;

function showItemTooltip(event, item, index, location) {
    clearTimeout(tooltipHideTimer); // Cancel any pending hides!

    const tooltip = document.getElementById('game-tooltip');
    if (!tooltip || !item) return;

    // Allow the user to hover inside the tooltip without it closing
    tooltip.style.pointerEvents = "auto";
    tooltip.onmouseenter = () => clearTimeout(tooltipHideTimer);
    tooltip.onmouseleave = () => hideItemTooltip();

    let rarityColor = "#7f8c8d";
    if (item.rarity === 'Uncommon') rarityColor = "#2ecc71";
    if (item.rarity === 'Rare') rarityColor = "#3498db";
    if (item.rarity === 'Epic') rarityColor = "#9b59b6";
    if (item.rarity === 'Gorilla' || item.rarity === 'Jackpot' || item.rarity === 'Relic') rarityColor = "#f1c40f";

    // === REPLACED ===
    // Build the dynamic stat block
    let statsHtml = "";
    if (item.slot !== "consumable") {
        if (item.offense) {
            statsHtml += `💥 <b>Offense:</b> Lvl +${item.offense}<br>`;
        }
        if (item.defense) {
            statsHtml += `🛡️ <b>Defense:</b> Lvl +${item.defense}<br>`;
        }
        if (item.speed) {
            statsHtml += `🏃 <b>Speed:</b> Lvl ${item.speed > 0 ? '+' : ''}${item.speed}<br>`;
        }
        if (item.attackRange || (item.combat && item.combat.standard && item.combat.standard.range)) {
            let rng = item.attackRange || (item.combat && item.combat.standard && item.combat.standard.range) || 1;
            statsHtml += `📏 <b>Weapon Strike Radius:</b> ${rng} Tile(s)<br>`;
        }
        
        // Append weapon skill descriptions if it is a weapon
        if (item.slot === "weapon" && typeof getWeaponSpecialDesc === 'function') {
            statsHtml += `<div style='margin-top:6px; padding:6px; background:#1e1712; border-radius: 3px; font-size:10px; border-left:2px solid ${rarityColor}; color:#e0caad; line-height: 1.4;'>` + 
                         `${getWeaponSpecialDesc(item)}</div>`;
        }
    } else if (item.slot === 'consumable') {
        if (item.type === 'brew') {
            if (item.id === 'ipa') statsHtml += 'Combat Effect: +1.25x Offense Multiplier.<br>';
            else if (item.id === 'lager') statsHtml += 'Combat Effect: +1 Speed Level and +35 ATB.<br>';
            else if (item.id === 'reserve') statsHtml += 'Combat Effect: Restores 90% Max HP and cleanses status.<br>';
            else if (item.id === 'ironwall_porter') statsHtml += 'Combat Effect: +1.25x Defense Multiplier.<br>';
            else if (item.id === 'clearwater_tonic') statsHtml += 'Combat Effect: Cleanses negative status effects.<br>';
            else if (item.id === 'staunching_bitter') statsHtml += 'Combat Effect: Sets HP to at least 30% and cleanses status.<br>';
            else statsHtml += 'Combat Effect: Instantly restores 40% of Maximum Vitality.<br>';
        }
    }
// ============================================

    let itemDesc = item.desc || item.description || "";
    let descHtml = itemDesc ? `<div style="margin-bottom: 8px; font-style: italic; color: #bbaaa0; line-height: 1.3;">${itemDesc}</div>` : "";

    let html = `
        <div style="border-bottom: 2px solid ${rarityColor}; margin-bottom: 8px; padding-bottom: 5px;">
            <strong style="color: ${rarityColor}; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${item.name}</strong>
            <div style="font-size: 11px; color: #bbaaa0; margin-top: 2px; text-transform: uppercase;">${(item.type || item.slot)} | Value: ${item.value || 0}g</div>
        </div>
        <div style="font-size: 11px; margin-bottom: 12px; color: #ecf0f1; line-height: 1.5;">
            ${descHtml}
            ${statsHtml}
        </div>
    `;

    let actionsHtml = `<div style="display: flex; gap: 5px; flex-wrap: wrap; border-top: 1px dashed #634e3d; padding-top: 8px;">`;
    const isCombat = (typeof gameState !== 'undefined' && gameState === 'COMBAT');

    // Check against valid equippable database slots
    const equippableSlots = ['weapon', 'helmet', 'armor', 'gloves', 'boots'];

    if (location === 'backpack') {
        if (equippableSlots.includes(item.slot) && !isCombat) {
            actionsHtml += `<button onclick="equipItem(${index})" style="background: #27ae60; border-color: #2ecc71; padding: 6px; flex-grow: 1;">Equip</button>`;
        }
        if (item.id && item.id.includes('crate') && !isCombat) {
            actionsHtml += `<button disabled style="background: #443a32; border-color: #634e3d; padding: 6px; flex-grow: 1;">Retired</button>`;
        }
        // Universally allow Vaulting and Selling outside of combat
        if (!isCombat) {
            actionsHtml += `<button onclick="depositToVault(${index})" style="background: #8e44ad; border-color: #9b59b6; padding: 6px; flex-grow: 1;">Vault</button>`;
            actionsHtml += `<button onclick="sellItem(${index})" style="background: #c0392b; border-color: #e74c3c; padding: 6px; flex-grow: 1;">Sell</button>`;
        }
    } else if (location === 'vault' && !isCombat) {
        actionsHtml += `<button onclick="withdrawFromVault(${index})" style="background: #2980b9; border-color: #3498db; padding: 6px; flex-grow: 1;">Withdraw to Bag</button>`;
    } else if (location === 'equipment' && !isCombat) {
        actionsHtml += `<button onclick="unequipItem('${index}')" style="background: #c0392b; border-color: #e74c3c; padding: 6px; flex-grow: 1;">Unequip</button>`;
    }

    if (isCombat) {
        if (location === 'combat') {
            // Ensure phase locks are respected
            if (currentTurn !== 'PLAYER' || combatPhase === 'TARGETING') {
                actionsHtml += `<div style="color: #e74c3c; font-size: 10px; font-weight: bold; width: 100%; text-align: center;">Awaiting Action Phase...</div>`;
            } else {
                // Parse items.js data definitions
                const combatActionType = item.combat ? item.combat.actionType : null;
                let actionAdded = false;

                if (combatActionType === "heal" || combatActionType === "buff") {
                    actionsHtml += `<button onclick="closeCombatModal(); consumeBrew(${index})" style="background: #2980b9; border-color: #3498db; padding: 6px; flex-grow: 1;">Drink</button>`;
                    actionAdded = true;
                }

                if (!actionAdded && equippableSlots.includes(item.slot)) {
                    actionsHtml += `<button onclick="closeCombatModal(); handleCombatEquip(${index})" style="background: #27ae60; border-color: #2ecc71; padding: 6px; flex-grow: 1;">Equip</button>`;
                }
            }
        } else {
            // Lock out Vault and Paperdoll gear actions during combat
            actionsHtml += `<div style="color: #e74c3c; font-size: 10px; font-weight: bold; width: 100%; text-align: center;">Actions locked during combat!</div>`;
        }
    }

    // === RESTORED: Close the HTML string and inject it into the DOM ===
    actionsHtml += `</div>`;
    tooltip.innerHTML = html + actionsHtml;
    tooltip.style.display = 'block';
    moveTooltip(event);

} // <--- RESTORED: This closing brace finishes showItemTooltip()!


// Ensure the old hideTooltip acts as an alias so we don't break existing game elements
function hideTooltip() { hideItemTooltip(); }

function hideItemTooltip() {
    // === NEW: 250ms grace period so the mouse can physically reach the buttons ===
    tooltipHideTimer = setTimeout(() => {
        const tooltip = document.getElementById('game-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
            tooltip.style.pointerEvents = "none"; // Lock it back up so it doesn't block UI clicks
        }
    }, 250);
}
