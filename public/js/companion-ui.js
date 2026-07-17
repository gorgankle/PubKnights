// --- UI: COMPANION ROSTER & EQUIPMENT ---

const COMPANION_UI_EQUIPMENT_SLOTS = ['weapon', 'helmet', 'armor', 'gloves', 'boots'];
const COMPANION_UI_SLOT_LABELS = {
    weapon: 'Weapon',
    helmet: 'Helmet',
    armor: 'Armor',
    gloves: 'Gloves',
    boots: 'Boots'
};

function getCompanionUiStat(companion, statKey) {
    const stats = companion && companion.stats ? companion.stats : {};
    const equipment = companion && companion.equipment ? companion.equipment : {};
    let value = Math.trunc(Number(stats[statKey]) || 0);
    COMPANION_UI_EQUIPMENT_SLOTS.forEach(slotKey => {
        const item = equipment[slotKey];
        if (item && item[statKey]) value += Math.trunc(Number(item[statKey]) || 0);
    });
    return Math.max(1, value);
}

function getCompanionRarityClass(item) {
    if (!item) return '';
    if (item.rarity === 'Gorilla') return 'slot-jackpot';
    const rarity = String(item.rarity || 'common').toLowerCase().replace(/[^a-z]/g, '');
    return ['common', 'uncommon', 'rare', 'epic'].includes(rarity) ? 'slot-' + rarity : 'slot-common';
}

function makeCompanionButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
}

function renderCompanionRosterUI(companions, activeIds) {
    const partyList = document.getElementById('party-roster-list');
    if (!partyList) return;

    partyList.innerHTML = '';
    if (companions.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'companion-empty-state';
        empty.textContent = 'No party members hired yet.';
        partyList.appendChild(empty);
        renderCompanionEquipmentPanel(companions, activeIds);
        return;
    }

    companions.forEach(companion => {
        const isActive = activeIds.includes(companion.instanceId);
        const isSelected = window.selectedCompanionInstanceId === companion.instanceId;
        const row = document.createElement('div');
        row.className = 'companion-roster-row' + (isActive ? ' is-active' : '') + (isSelected ? ' is-selected' : '');

        const summary = document.createElement('div');
        summary.className = 'companion-roster-summary';

        const name = document.createElement('div');
        name.className = 'companion-roster-name';
        name.textContent = (companion.name || 'Companion') + (isActive ? ' (Active)' : ' (Inactive)');

        const stats = document.createElement('div');
        stats.className = 'companion-roster-stats';
        stats.textContent = (companion.role || 'Companion')
            + ' | HP ' + (getCompanionUiStat(companion, 'vitality') * 25)
            + ' | ATK ' + getCompanionUiStat(companion, 'offense')
            + ' | DEF ' + getCompanionUiStat(companion, 'defense');

        summary.append(name, stats);

        const controls = document.createElement('div');
        controls.className = 'companion-roster-controls';
        controls.appendChild(makeCompanionButton('Gear', 'companion-gear-button', () => selectCompanionEquipment(companion.instanceId)));
        controls.appendChild(isActive
            ? makeCompanionButton('Bench', 'companion-bench-button', () => benchCompanion(companion.instanceId))
            : makeCompanionButton('Activate', 'companion-activate-button', () => setActiveCompanion(companion.instanceId)));

        row.append(summary, controls);
        partyList.appendChild(row);
    });

    renderCompanionEquipmentPanel(companions, activeIds);
}

function renderCompanionEquipmentPanel(companions, activeIds) {
    const panel = document.getElementById('companion-equipment-panel');
    if (!panel) return;

    panel.innerHTML = '';
    if (companions.length === 0) {
        panel.hidden = true;
        return;
    }

    let selected = companions.find(companion => companion.instanceId === window.selectedCompanionInstanceId);
    if (!selected) {
        selected = companions.find(companion => activeIds.includes(companion.instanceId)) || companions[0];
        window.selectedCompanionInstanceId = selected.instanceId;
    }

    panel.hidden = false;

    const header = document.createElement('div');
    header.className = 'companion-equipment-header';
    const title = document.createElement('strong');
    title.textContent = selected.name || 'Companion';
    const identity = document.createElement('span');
    identity.textContent = selected.role || selected.templateId || 'Mercenary';
    header.append(title, identity);

    const statLine = document.createElement('div');
    statLine.className = 'companion-equipment-stats';
    statLine.textContent = 'HP ' + (getCompanionUiStat(selected, 'vitality') * 25)
        + ' | ATK ' + getCompanionUiStat(selected, 'offense')
        + ' | DEF ' + getCompanionUiStat(selected, 'defense')
        + ' | SPD ' + getCompanionUiStat(selected, 'speed');

    const slots = document.createElement('div');
    slots.className = 'companion-equipment-slots';
    COMPANION_UI_EQUIPMENT_SLOTS.forEach(slotKey => {
        const item = selected.equipment && selected.equipment[slotKey];
        const slot = document.createElement('div');
        slot.className = 'companion-equipment-slot ' + getCompanionRarityClass(item);

        const label = document.createElement('div');
        label.className = 'companion-equipment-slot-label';
        label.textContent = COMPANION_UI_SLOT_LABELS[slotKey];

        const media = document.createElement('div');
        media.className = 'companion-equipment-slot-media';
        const imageUrl = item && typeof getItemSpriteURL === 'function' ? getItemSpriteURL(item) : '';
        if (imageUrl) {
            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = '';
            media.appendChild(image);
        } else {
            media.textContent = item ? '?' : '-';
        }

        const itemName = document.createElement('div');
        itemName.className = 'companion-equipment-item-name';
        itemName.textContent = item ? item.name : 'Empty';

        const unequip = makeCompanionButton('Unequip', 'companion-unequip-button', () => unequipCompanionItem(selected.instanceId, slotKey));
        unequip.disabled = !item;

        if (item && typeof showTooltip === 'function' && typeof getItemTooltip === 'function') {
            slot.addEventListener('mouseenter', event => showTooltip(getItemTooltip(item), event));
            slot.addEventListener('mousemove', moveTooltip);
            slot.addEventListener('mouseleave', hideTooltip);
        }

        slot.append(label, media, itemName, unequip);
        slots.appendChild(slot);
    });

    const backpackHeader = document.createElement('div');
    backpackHeader.className = 'companion-backpack-header';
    backpackHeader.textContent = 'Shared Backpack Gear';

    const backpackGear = document.createElement('div');
    backpackGear.className = 'companion-backpack-gear';
    const equippableItems = player.inventory
        .map((item, index) => ({ item, index }))
        .filter(entry => entry.item && COMPANION_UI_EQUIPMENT_SLOTS.includes(entry.item.slot));

    if (equippableItems.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'companion-empty-state';
        empty.textContent = 'No compatible gear in the backpack.';
        backpackGear.appendChild(empty);
    } else {
        equippableItems.forEach(entry => {
            const row = document.createElement('div');
            row.className = 'companion-backpack-item';

            const imageUrl = typeof getItemSpriteURL === 'function' ? getItemSpriteURL(entry.item) : '';
            if (imageUrl) {
                const image = document.createElement('img');
                image.src = imageUrl;
                image.alt = '';
                row.appendChild(image);
            }

            const details = document.createElement('div');
            details.className = 'companion-backpack-item-details';
            const itemName = document.createElement('strong');
            itemName.textContent = entry.item.name;
            const itemSlot = document.createElement('span');
            itemSlot.textContent = COMPANION_UI_SLOT_LABELS[entry.item.slot];
            details.append(itemName, itemSlot);

            row.append(details, makeCompanionButton('Equip', 'companion-equip-button', () => equipCompanionItem(selected.instanceId, entry.index)));
            if (typeof showTooltip === 'function' && typeof getItemTooltip === 'function') {
                row.addEventListener('mouseenter', event => showTooltip(getItemTooltip(entry.item), event));
                row.addEventListener('mousemove', moveTooltip);
                row.addEventListener('mouseleave', hideTooltip);
            }
            backpackGear.appendChild(row);
        });
    }

    panel.append(header, statLine, slots, backpackHeader, backpackGear);
}
