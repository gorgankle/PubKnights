// --- spellbook.js ---

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
    let maxSlots = player.maxInventorySlots || 5;

    // === THE FIX: Standard For-Loop (Immune to Array Prototype Errors) ===
    for (let i = 0; i < maxSlots; i++) {
        let item = player.inventory[i];
        
        if (item && item.combat && item.combat.actionType === 'spell') {
            let spell = typeof SpellDatabase !== 'undefined' ? SpellDatabase[item.combat.spellId] : null;
            if (!spell) continue;
            
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
            btn.onmouseenter = (e) => { if (typeof showSystemTooltip === 'function') showSystemTooltip({ isSpell: true, data: spell }, e); };
            btn.onmouseleave = typeof hideTooltip === 'function' ? hideTooltip : null;

            // Click Hook
            btn.onclick = () => {
                if (player.stamina < spell.cost) {
                    logMessage(`❌ Not enough stamina! (${spell.cost} required)`);
                    if (typeof playRetroSound === 'function') playRetroSound('error');
                    return;
                }
                if (typeof closeCombatModal === 'function') closeCombatModal();
                if (typeof prepTargetAction === 'function') prepTargetAction(i); 
            };

            grid.appendChild(btn);
        }
    }

    if (!foundSpells) {
        grid.innerHTML = `<div style="color: #bbaaa0; text-align: center; padding: 25px 15px; font-size: 12px; font-style: italic;">📜 Scroll required for spells.</div>`;
    }

    modal.style.display = 'block';
    if (typeof playRetroSound === 'function') playRetroSound('menu');
}