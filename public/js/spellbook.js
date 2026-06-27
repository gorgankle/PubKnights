// --- magic.js ---

function renderSpellbookModal() {
    const modal = document.getElementById('combat-backpack-modal');
    const title = document.getElementById('combat-modal-title');
    const grid = document.getElementById('combat-modal-grid');
    
    title.innerText = "📖 Active Scrolls";
    
    // Switch from the visual grid to the vertical text list
    grid.style.display = "flex";
    grid.style.flexDirection = "column";
    grid.style.gap = "4px";
    grid.innerHTML = '';

    let foundSpells = false;

    // === THE FIX: Scan the physical inventory for scrolls ===
    player.inventory.forEach((item, index) => {
        if (item && item.combat && item.combat.actionType === 'spell') {
            let spell = SpellDatabase[item.combat.spellId];
            if (!spell) return;
            
            foundSpells = true;

            let btn = document.createElement("button");
            btn.innerText = spell.name;
            btn.style.width = "100%";
            btn.style.padding = "8px";
            btn.style.background = "#8e44ad"; 
            btn.style.borderColor = "#9b59b6";
            btn.style.color = "#fff";
            btn.style.textAlign = "left";
            btn.style.fontWeight = "bold";

            // Tooltip Hook
            btn.onmouseenter = (e) => showSystemTooltip({ isSpell: true, data: spell }, e);
            btn.onmouseleave = hideTooltip;

            // Click Hook inside spellbook.js
            btn.onclick = () => {
                if (player.stamina < spell.cost) {
                    logMessage(`❌ Not enough stamina! (${spell.cost} required)`);
                    if (typeof playRetroSound === 'function') playRetroSound('error');
                    return;
                }
                closeCombatModal();
                
                // === THE FIX: Route directly into your universal bomb dispatcher! ===
                prepTargetAction(index); 
            };
            grid.appendChild(btn);
        }
    });

    if (!foundSpells) {
        grid.innerHTML = `<div style="color: #bbaaa0; text-align: center; padding: 15px; font-size: 11px;">No magic scrolls currently equipped in backpack.</div>`;
    }

    modal.style.display = 'block';
    if (typeof playRetroSound === 'function') playRetroSound('menu');
}

