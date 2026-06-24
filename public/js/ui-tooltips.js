// --- UI: TOOLTIPS & OVERLAYS ---

function showSystemTooltip(type, event) {
    let html = "";
    // FIX: Safely define 'item' so the script doesn't crash on hover!
    let item = typeof type === 'object' ? type : null;

    if (type === 'tavern_enter') {
        html = `<h3>🍻 The Tavern</h3>Step inside to visit the Provisioner and Brewmaster. Craft bombs, brew combat drinks, and trade on the Black Market.`;
    }
	else if (type === 'trade_routes') {
        html = `<h3>🗺️ Expand Trade Routes</h3>Fund a massive infrastructure project to clear roads and build merchant cargo ships. <br><br>🔓 <b>Unlocks:</b> Bulk Fish Exports (Sell 1,000 Fish at once).<br>💰 Cost: 25,000 Gold`;
    }
	else if (type === 'monument') {
        html = `<h3>🗽 The Golden Monument</h3>Erect a breathtaking statue in the center of town declaring yourself the ultimate Guildmaster.<br><br>🏆 <b>Reward:</b> Permanently DOUBLES all XP and Gold yields from combat!<br>💰 Cost: 1,000,000 Gold`;
    }
else if (type === 'pet_train') {
        let cost = getPetTrainingCost();
        html = `<h3>🦴 Hop-Infused Kibble</h3>Formulate a nutrient-dense superfood for your companion.<br>📈 <b>Reward:</b> +1% cumulative chance per level to dig up exclusive Pet-Only Loot after every combat victory!<br>💰 Cost: ${cost.hops} Hops, ${cost.fish} Fish, ${cost.gold}g`;
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
        let gCost = player.vaultSlots * 5; let wCost = player.vaultSlots * 2;
        html = `<h3>🏦 Structural Expansion</h3>Adds <b>+5 secure vault frames</b>.<br>💰 Cost: ${gCost}g, ${wCost} Wood`;
    }
    else if (type === 'craft_stout') {
        html = `<h3>🍺 Craft Combat Stout</h3>Hire the Brewmaster to ferment your hops into a vital healing action charge for battle maps.<br>⚖️ Requires: 1 Hops, 10 Gold Pieces`;
    }
    else if (type === 'ipa') {
        html = `<h3>🔥 Furious IPA</h3>Concoct a strong, oak-aged specialty ale. Your <b>NEXT</b> expedition run gains a permanent <b>+10% Output Damage multiplier</b>.<br>⚖️ Requires: 1 Hops, 5 Timber`;
    }
    else if (type === 'lager') {
        html = `<h3>🏃 Swift Lager</h3>Ferment a light, refreshing utility lager. Your <b>NEXT</b> expedition run awards <b>+1 Tactical Move Range (Stride step)</b>.<br>⚖️ Requires: 2 Hops, 5 Fish`;
    }
	else if (type === 'reserve') {
        html = `<h3>🍷 Grandmaster Reserve</h3>Ferment a legendary, ultra-dense vintage that heavily mends wounds in battle.<br>❤️ Restores: <b>25% Max HP</b><br>⚖️ Requires: 200 Hops, 50 Gold Pieces`;
    }
	else if (type === 'gilded_tavern') {
    html = `<h3>✨ Gilded Tavern Metamorphosis</h3>Pay the ultimate tribute to the Guild. Imbues the pub walls with gold filigree and automates supply clearing.<br>💰 Cost: <b>10,000 Gold</b>`;
}
    else if (type === 'happy_hour') {
        html = `<h3>🎉 Host Happy Hour</h3>Throw a massive festival to double your team's morale! Woodcutters, Fishermen, and Farmers harvest at <b>2x speed vectors for the next 3 minutes</b>.<br>⚖️ Requires: 40 Hops, 100 Gold Pieces`;
    }
    else if (type === 'black_market') {
        html = `<h3>🦝 Black Market Cargo</h3>Trade a large shipment of raw hops to a shady traveling merchant for hidden smuggler gear.<br>🎁 Reward: 1 Guaranteed <b>Rare, Epic, or Unique piece of equipment</b>.<br>⚖️ Requires: 50 Hops`;
    }
    else if (type === 'fish_wholesale') {
        html = `<h3>🐟 Wholesale Fish Export</h3>Ship 100 surplus Fish cargo units to passing merchant fleets in exchange for quick liquid capital.<br>💰 Yields: 150 Gold Pieces`;
    }
    else if (type === 'chum_cellars') {
        html = `<h3>🛢️ Chum Subterranean Vaults</h3>Dump 100 ground Fish down the drainage pipes. Your next Forbidden Cellars exploration run will draw out <b>5 additional treasure-bearing Mimics</b>.<br>⚠️ Danger: Grid matrix crowding scales up intensely.`;
    }
    else if (type === 'stat_vitality') {
        html = `<h3>❤️ Vitality</h3>Increases your maximum health pool.<br>📈 Gain <b>+10 Max HP</b> per point.`;
    }
    else if (type === 'stat_stamina') {
        html = `<h3>⚡ Stamina</h3>Expands your energy reserves for attacks and movement.<br>📈 Gain <b>+5 Max Stamina</b> per point.`;
    }
    else if (type === 'stat_power') {
        html = `<h3>🗡️ Power</h3>Boosts the brute force of your physical strikes.<br>📈 Gain <b>+2 Base Damage</b> per point.`;
    }
    else if (type === 'stat_accuracy') {
        html = `<h3>🎯 Accuracy</h3>Enhances your ability to pierce enemy defenses and hit targets.<br>📈 Gain <b>+2 Hit Chance</b> per point.`;
    }
    else if (type === 'stat_resilience') {
        html = `<h3>🛡️ Resilience</h3>Improves your natural ability to deflect incoming blows.<br>📈 Gain <b>+1% Passive Deflection</b> per point.`;
    }
    else if (type === 'stat_swiftness') {
        html = `<h3>🏃 Swiftness</h3>Increases your mobility across the tactical grid.<br>📈 Gain <b>+1 Tactical Stride</b> per point.`;
    }
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
        html = `<h3>🪓 Gather Wood</h3>Venture into the forest to passively collect <b>Timber</b> for crafting bombs and upgrades.`;
    }
    else if (type === 'idle_fish') {
        html = `<h3>🎣 Catch Fish</h3>Relax by the lake to passively reel in <b>Fish</b> for trading and zone bait.`;
    }
    else if (type === 'idle_hops') {
        html = `<h3>🌾 Harvest Hops</h3>Work the fields to passively gather <b>Hops</b> for brewing and black market deals.`;
    }
    else if (type === 'bait_wilds') {
        html = `<h3>🎣 Bait the Wilds</h3>Scatter 15 Fish to draw out larger, frenzied monster swarms.<br>⚠️ Danger: Enemies gain increased Health and Attack power.<br>💰 Reward: Increased gold bounties per kill.`;
    }
    else if (type === 'pack_up') {
        let pCost = getBackpackUpgradeCost();
        html = `<h3>🎒 Expand Backpack</h3>Adds <b>+1 slot</b> to your personal combat inventory.<br>💰 Cost: ${pCost.gold}g, ${pCost.wood} Wood`;
    }
    else if (type === 'cart_up') {
        let cCost = getCartUpgradeCost();
        html = `<h3>📦 Expand Cart Capacity</h3>Increases the maximum storage limit of your town's production cart by <b>+50 units</b>.<br>💰 Cost: ${cCost.gold}g, ${cCost.wood} Wood`;
    }
    else if (type === 'claim_cart') {
        html = `<h3>🧺 Claim Supplies</h3>Empty the town's production cart and deposit all gathered Timber, Fish, and Hops directly into your vault balance.`;
    }
    else if (type === 'bomb_small') {
        html = `<h3>🧨 Small Keg Bomb</h3>Craft a volatile explosive dealing <b>45 DMG</b> across a 3x3 radius upon detonation.<br>⚖️ Requires: 10 Wood, 25 Hops`;
    }
    else if (type === 'bomb_heavy') {
        html = `<h3>💣 Heavy Keg Bomb</h3>Craft a massive destructive payload dealing <b>120 DMG</b> across a 3x3 radius upon detonation.<br>⚖️ Requires: 25 Wood, 100 Hops`;
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
               
    // === NEW: UNIVERSAL STAT CHECKING ===
    // Instead of checking the item slot, we check if the stat itself exists!
    if (item.slot !== "consumable") {
        if (item.atkBonus) {
            html += `💥 <b>Attack Modifier:</b> +${item.atkBonus} ATK<br>`;
        }
        if (item.deflectChance) {
            html += `🛡️ <b>Deflection:</b> +${item.deflectChance}% Rate<br>`;
            if (item.rarity === "Gorilla") {
                html += `<span style="color: #ff3333; font-size: 9px;">⚠️ Deflection capped at 75%</span><br>`; 
            }
        }
        if (item.moveBonus) {
            html += `👟 <b>Action Field Extension:</b> +${item.moveBonus} Tile(s)<br>`;
        }
        if (item.attackRange) {
            html += `📏 <b>Weapon Strike Radius:</b> ${item.attackRange} Tile(s)<br>`;
        }
        
        // Append weapon skill descriptions if it is a weapon
        if (item.slot === "weapon") {
            html += `<div style='margin-top:4px; padding:4px; background:#1e1712; font-size:10px; border-left:2px solid #ffcc66; color:#e0caad;'>` + 
                    `${getWeaponSpecialDesc(item)}</div>`;
        }
    } 
    else if (item.slot === "consumable") {
        if (item.type === "bomb") {
            html += `🧨 <b>Explosive Yield:</b> ${item.damage} DMG<br>` +
                    `📏 <b>Blast Radius:</b> 3x3 Grid Area<br>`;
} else if (item.type === "brew") {
            if (item.id === 'ipa') {
                html += `🍺 <b>Combat Effect:</b> +10% Damage Output for the duration of the battle.<br>`;
            } else if (item.id === 'lager') {
                html += `🍺 <b>Combat Effect:</b> +1 Tactical Stride movement for the duration of the battle.<br>`;
            } else if (item.id === 'reserve') {
                html += `🍷 <b>Combat Effect:</b> Instantly restores 25% of Maximum Vitality.<br>`;
            } else {
                html += `🍺 <b>Combat Effect:</b> Instantly restores 10% of Maximum Vitality.<br>`;
            }
        }
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

function showInventoryTooltip(idx, e) { showTooltip(getItemTooltip(player.inventory[idx]), e); }
function showVaultTooltip(idx, e) { showTooltip(getItemTooltip(player.stash[idx]), e); }


			//The Tooltip Logic & Combat Safety

function showItemTooltip(event, item, index, location) {
    const tooltip = document.getElementById('game-tooltip');
    if (!tooltip || !item) return;

    let rarityColor = "#7f8c8d"; // Default Common
    if (item.rarity === 'Uncommon') rarityColor = "#2ecc71";
    if (item.rarity === 'Rare') rarityColor = "#3498db";
    if (item.rarity === 'Epic') rarityColor = "#9b59b6";
    if (item.rarity === 'Gorilla' || item.rarity === 'Jackpot') rarityColor = "#f1c40f";

    // 1. Build the Stat Block
    let html = `
        <div style="border-bottom: 2px solid ${rarityColor}; margin-bottom: 8px; padding-bottom: 5px;">
            <strong style="color: ${rarityColor}; font-size: 16px;">${item.name}</strong>
            <div style="font-size: 11px; color: #bbaaa0;">${item.type.toUpperCase()} | Value: ${item.value || 0}g</div>
        </div>
        <div style="font-size: 12px; margin-bottom: 10px; color: #ecf0f1;">
            ${item.description || "A mysterious item."}
        </div>
    `;

    // 2. Build Contextual Actions based on Location AND Game State
    let actionsHtml = `<div style="display: flex; gap: 5px; flex-wrap: wrap;">`;
    
    // Check if we are actively in combat
    const isCombat = (typeof gameState !== 'undefined' && gameState === 'COMBAT');

    if (location === 'backpack') {
        if (item.type === 'gear' && !isCombat) {
            actionsHtml += `<button onclick="emitInventoryAction('equip', ${index})" style="background: #27ae60;">Equip</button>`;
        }
        if (item.type === 'brew') {
            actionsHtml += `<button onclick="emitInventoryAction('drinkBrew', ${index})" style="background: #3498db;">Consume</button>`;
        }
        if (item.id && item.id.includes('crate') && !isCombat) {
            actionsHtml += `<button onclick="emitInventoryAction('openCrate', ${index}, '${item.id}')" style="background: #e67e22;">Unbox</button>`;
        }
        // ONLY allow selling/depositing if we are in Town and NOT in combat
        if (!isCombat && gameState === 'TOWN') {
            actionsHtml += `<button onclick="emitInventoryAction('deposit', ${index})" style="background: #8e44ad;">Vault</button>`;
            actionsHtml += `<button onclick="emitInventoryAction('sell', ${index})" style="background: #c0392b;">Sell</button>`;
        }
    } else if (location === 'vault' && !isCombat) {
        actionsHtml += `<button onclick="emitInventoryAction('withdraw', ${index})" style="background: #2980b9;">Withdraw</button>`;
    } else if (location === 'equipment' && !isCombat) {
        actionsHtml += `<button onclick="emitInventoryAction('unequip', null, '${index}')" style="background: #c0392b;">Unequip</button>`;
    }

    if (isCombat) {
        actionsHtml += `<div style="color: #e74c3c; font-size: 10px; font-weight: bold; width: 100%;">Actions locked during combat!</div>`;
    }

    actionsHtml += `</div>`;
    html += actionsHtml;

    // 3. Render and Position
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    
    // Position tooltip near cursor but keep it on screen
    let x = event.pageX + 15;
    let y = event.pageY + 15;
    
    if (x + 250 > window.innerWidth) x = window.innerWidth - 260;
    if (y + tooltip.offsetHeight > window.innerHeight) y = window.innerHeight - tooltip.offsetHeight - 10;
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

function hideItemTooltip() {
    const tooltip = document.getElementById('game-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}