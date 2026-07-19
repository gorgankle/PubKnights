// --- UI: COMPANION ROSTER, PAPERDOLL, POCKETS & PROGRESSION ---

const COMPANION_UI_EQUIPMENT_SLOTS = ['weapon', 'helmet', 'armor', 'gloves', 'boots'];
const COMPANION_UI_SLOT_LABELS = { weapon: 'Weapon', helmet: 'Helmet', armor: 'Armor', gloves: 'Gloves', boots: 'Boots' };
const COMPANION_UI_LEVEL_GROWTH = Object.freeze({ vitality: 0.5, offense: 0.5, defense: 0.4, speed: 0.2 });
const COMPANION_UI_MAX_SELECTED = 3;
const COMPANION_UI_MAX_ROSTER = 6;
const COMPANION_UI_TRAINING_GOLD_PER_TARGET_LEVEL = 150;

function getCompanionRequiredIds() {
    if (typeof getClientRequiredCompanionIds === 'function') {
        return new Set(getClientRequiredCompanionIds(player));
    }

    const requiredIds = [];
    const sources = [
        player && player.activeQuestSession,
        player && player.quests && player.quests.active
    ];
    sources.forEach(source => {
        if (!source || !Array.isArray(source.requiredCompanionIds)) return;
        source.requiredCompanionIds.forEach(instanceId => {
            if (instanceId && !requiredIds.includes(instanceId)) requiredIds.push(instanceId);
        });
    });
    return new Set(requiredIds);
}

function getSelectedCompanionIds(activeIds, requiredIds = getCompanionRequiredIds()) {
    const sourceIds = Array.isArray(activeIds) ? activeIds : [];
    return [...new Set(sourceIds.filter(instanceId => instanceId && !requiredIds.has(instanceId)))];
}

function isCompanionPocketEligible(item) {
    return Boolean(item && (
        COMPANION_UI_EQUIPMENT_SLOTS.includes(item.slot)
        || (item.slot === 'consumable' && item.combat)
    ));
}

function getCompanionUiStat(companion, statKey) {
    const stats = companion && companion.stats ? companion.stats : {};
    const equipment = companion && companion.equipment ? companion.equipment : {};
    const level = Math.max(1, Math.min(50, Math.trunc(Number(companion && companion.level) || 1)));
    let value = Math.trunc(Number(stats[statKey]) || 0);
    value += Math.floor((level - 1) * (COMPANION_UI_LEVEL_GROWTH[statKey] || 0));
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

function addCompanionItemTooltip(element, item) {
    if (!item || typeof showTooltip !== 'function' || typeof getItemTooltip !== 'function') return;
    element.addEventListener('mouseenter', event => showTooltip(getItemTooltip(item), event));
    element.addEventListener('mousemove', moveTooltip);
    element.addEventListener('mouseleave', hideTooltip);
}

function renderCompanionRosterUI(companions, activeIds) {
    const partyList = document.getElementById('party-roster-list');
    if (!partyList) return;
    partyList.innerHTML = '';
    const requiredIds = getCompanionRequiredIds();
    activeIds = getSelectedCompanionIds(activeIds, requiredIds);
    const optionalCompanions = companions.filter(companion => !requiredIds.has(companion.instanceId));

    const toolbar = document.createElement('div');
    toolbar.className = 'companion-roster-toolbar';
    const status = document.createElement('span');
    status.textContent = `Active ${activeIds.length}/${COMPANION_UI_MAX_SELECTED} • Roster ${companions.length}/${COMPANION_UI_MAX_ROSTER}`;
    const fillButton = makeCompanionButton('Fill Party', 'companion-activate-button', fillActiveCompanions);
    fillButton.disabled = activeIds.length >= COMPANION_UI_MAX_SELECTED
        || !optionalCompanions.some(companion => !activeIds.includes(companion.instanceId));
    const benchAllButton = makeCompanionButton('Bench All', 'companion-bench-button', benchAllCompanions);
    benchAllButton.disabled = activeIds.length === 0;
    toolbar.append(status, fillButton, benchAllButton);
    partyList.appendChild(toolbar);

    if (companions.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'companion-empty-state';
        empty.textContent = 'No mercenaries hired yet. Hire one from Town.';
        partyList.appendChild(empty);
        renderCompanionEquipmentPanel(companions, activeIds);
        return;
    }

    companions.forEach(companion => {
        const isActive = activeIds.includes(companion.instanceId);
        const isRequired = requiredIds.has(companion.instanceId);
        const isSelected = window.selectedCompanionInstanceId === companion.instanceId;
        const row = document.createElement('div');
        row.className = 'companion-roster-row' + (isActive || isRequired ? ' is-active' : '') + (isSelected ? ' is-selected' : '');

        const summary = document.createElement('div');
        summary.className = 'companion-roster-summary';
        const name = document.createElement('div');
        name.className = 'companion-roster-name';
        const partyLabel = isRequired ? 'Quest Ally' : (isActive ? 'Active' : 'Benched');
        name.textContent = `${companion.name || 'Mercenary'} • Lv ${companion.level || 1} (${partyLabel})`;
        const stats = document.createElement('div');
        stats.className = 'companion-roster-stats';
        stats.textContent = `${companion.role || 'Mercenary'} | HP ${getCompanionUiStat(companion, 'vitality') * 25} | ATK ${getCompanionUiStat(companion, 'offense')} | DEF ${getCompanionUiStat(companion, 'defense')}`;
        summary.append(name, stats);

        const controls = document.createElement('div');
        controls.className = 'companion-roster-controls';
        controls.appendChild(makeCompanionButton('Paperdoll', 'companion-gear-button', () => selectCompanionEquipment(companion.instanceId)));
        if (isActive) {
            controls.appendChild(makeCompanionButton('Bench', 'companion-bench-button', () => benchCompanion(companion.instanceId)));
        } else {
            const activate = makeCompanionButton(isRequired ? 'Quest Locked' : 'Activate', 'companion-activate-button', () => setActiveCompanion(companion.instanceId));
            activate.disabled = isRequired || activeIds.length >= COMPANION_UI_MAX_SELECTED;
            controls.appendChild(activate);
        }
        const dismiss = makeCompanionButton('Dismiss', 'companion-danger-button', () => dismissCompanion(companion.instanceId, companion.name));
        dismiss.disabled = isRequired;
        controls.appendChild(dismiss);

        row.append(summary, controls);
        partyList.appendChild(row);
    });

    renderCompanionEquipmentPanel(companions, activeIds);
}

function createCompanionPaperdollSlot(selected, slotKey) {
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
    } else media.textContent = item ? '?' : '-';
    const itemName = document.createElement('div');
    itemName.className = 'companion-equipment-item-name';
    itemName.textContent = item ? item.name : 'Empty';
    const unequip = makeCompanionButton('Unequip', 'companion-unequip-button', () => unequipCompanionItem(selected.instanceId, slotKey));
    unequip.disabled = !item;
    slot.append(label, media, itemName, unequip);
    addCompanionItemTooltip(slot, item);
    return slot;
}

function createCompanionPocketSlot(selected, pocketIndex) {
    const item = selected.pockets && selected.pockets[pocketIndex];
    const slot = document.createElement('div');
    slot.className = 'companion-pocket-slot ' + getCompanionRarityClass(item);
    const label = document.createElement('strong');
    label.textContent = `Pocket ${pocketIndex + 1}`;
    const itemName = document.createElement('span');
    itemName.textContent = item ? item.name : 'Empty';
    const remove = makeCompanionButton('To Backpack', 'companion-unequip-button', () => removeCompanionPocketItem(selected.instanceId, pocketIndex));
    remove.disabled = !item;
    slot.append(label, itemName, remove);
    addCompanionItemTooltip(slot, item);
    return slot;
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

    const level = Math.max(1, Math.trunc(Number(selected.level) || 1));
    const header = document.createElement('div');
    header.className = 'companion-equipment-header';
    const title = document.createElement('strong');
    title.textContent = selected.name || 'Mercenary';
    const identity = document.createElement('span');
    identity.textContent = `${selected.role || selected.templateId || 'Mercenary'} • Level ${level}`;
    header.append(title, identity);

    const statLine = document.createElement('div');
    statLine.className = 'companion-equipment-stats';
    statLine.textContent = `HP ${getCompanionUiStat(selected, 'vitality') * 25} | ATK ${getCompanionUiStat(selected, 'offense')} | DEF ${getCompanionUiStat(selected, 'defense')} | SPD ${getCompanionUiStat(selected, 'speed')}`;

    const progressData = typeof getLevelXpProgress === 'function'
        ? getLevelXpProgress(selected.xp || 0, level)
        : { progress: 0, needed: 1, pct: 0 };
    const training = document.createElement('div');
    training.className = 'companion-training-row';
    const progressWrap = document.createElement('div');
    const progressLabel = document.createElement('div');
    progressLabel.textContent = `XP ${progressData.progress}/${progressData.needed} (${progressData.pct}%)`;
    const progress = document.createElement('progress');
    progress.className = 'companion-progress';
    progress.max = progressData.needed;
    progress.value = progressData.progress;
    progressWrap.append(progressLabel, progress);
    const targetLevel = level + 1;
    const trainingCap = Math.max(1, (player.level || 1) - 1);
    const trainingCost = COMPANION_UI_TRAINING_GOLD_PER_TARGET_LEVEL * targetLevel;
    const train = makeCompanionButton(
        level < trainingCap ? `Train Lv ${targetLevel} (${trainingCost}g)` : `Training Cap Lv ${trainingCap}`,
        'companion-activate-button',
        () => trainMercenary(selected.instanceId)
    );
    train.disabled = level >= trainingCap || player.gold < trainingCost;
    training.append(progressWrap, train);

    const slots = document.createElement('div');
    slots.className = 'companion-equipment-slots';
    COMPANION_UI_EQUIPMENT_SLOTS.forEach(slotKey => slots.appendChild(createCompanionPaperdollSlot(selected, slotKey)));

    const pocketHeader = document.createElement('div');
    pocketHeader.className = 'companion-backpack-header';
    pocketHeader.textContent = 'Pockets • Real storage • Combat use costs 1 action';
    const pocketSlots = document.createElement('div');
    pocketSlots.className = 'companion-pocket-slots';
    for (let index = 0; index < 2; index++) pocketSlots.appendChild(createCompanionPocketSlot(selected, index));

    const backpackHeader = document.createElement('div');
    backpackHeader.className = 'companion-backpack-header';
    backpackHeader.textContent = 'Shared Backpack Gear & Consumables';
    const backpackGear = document.createElement('div');
    backpackGear.className = 'companion-backpack-gear';
    const compatibleItems = player.inventory
        .map((item, index) => ({ item, index }))
        .filter(entry => isCompanionPocketEligible(entry.item));

    if (compatibleItems.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'companion-empty-state';
        empty.textContent = 'No equipment or combat consumables in the backpack.';
        backpackGear.appendChild(empty);
    } else {
        compatibleItems.forEach(entry => {
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
            itemSlot.textContent = COMPANION_UI_SLOT_LABELS[entry.item.slot] || 'Combat Consumable';
            details.append(itemName, itemSlot);
            const controls = document.createElement('div');
            controls.className = 'companion-pocket-items';
            if (COMPANION_UI_EQUIPMENT_SLOTS.includes(entry.item.slot)) {
                controls.appendChild(makeCompanionButton('Equip', 'companion-equip-button', () => equipCompanionItem(selected.instanceId, entry.index)));
            }
            for (let pocketIndex = 0; pocketIndex < 2; pocketIndex++) {
                const occupied = selected.pockets && selected.pockets[pocketIndex];
                controls.appendChild(makeCompanionButton(occupied ? `Swap P${pocketIndex + 1}` : `Pocket ${pocketIndex + 1}`, 'companion-gear-button', () => storeCompanionPocketItem(selected.instanceId, entry.index, pocketIndex)));
            }
            row.append(details, controls);
            addCompanionItemTooltip(row, entry.item);
            backpackGear.appendChild(row);
        });
    }

    panel.append(header, statLine, training, slots, pocketHeader, pocketSlots, backpackHeader, backpackGear);
}
