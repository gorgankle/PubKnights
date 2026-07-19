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
        controls.appendChild(makeCompanionButton('Equipment', 'companion-gear-button', () => selectCompanionEquipment(companion.instanceId)));
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

function readCompanionBackpackDrop(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    if (typeof readPubKnightsItemDrag !== 'function') return null;

    const dragData = readPubKnightsItemDrag(event);
    if (!dragData || dragData.type !== 'backpack' || !Number.isInteger(dragData.index)) return null;

    const inventory = player && Array.isArray(player.inventory) ? player.inventory : [];
    const item = inventory[dragData.index];
    return item ? { item, index: dragData.index } : null;
}

function reportCompanionDropError(message) {
    if (typeof logMessage === 'function') logMessage(message);
    if (typeof playRetroSound === 'function') playRetroSound('error');
}

function handleCompanionEquipmentDrop(event, instanceId, slotKey) {
    const dropped = readCompanionBackpackDrop(event);
    if (!dropped) return;
    if (!COMPANION_UI_EQUIPMENT_SLOTS.includes(slotKey) || dropped.item.slot !== slotKey) {
        reportCompanionDropError('Drop ' + (COMPANION_UI_SLOT_LABELS[slotKey] || 'matching gear') + ' into this slot.');
        return;
    }
    equipCompanionItem(instanceId, dropped.index);
}

function handleCompanionPocketDrop(event, instanceId, pocketIndex) {
    const dropped = readCompanionBackpackDrop(event);
    if (!dropped) return;
    if (!isCompanionPocketEligible(dropped.item)) {
        reportCompanionDropError('Pockets hold equipment or combat consumables.');
        return;
    }
    storeCompanionPocketItem(instanceId, dropped.index, pocketIndex);
}

function createCompanionPaperdollEmptyCell() {
    const slot = document.createElement('div');
    slot.className = 'equip-slot empty-cell';
    slot.setAttribute('aria-hidden', 'true');
    return slot;
}

function bindCompanionStoredItemSlot(slot, item, dragIndex, dragType, dragMetadata, removeItem) {
    if (!item) return;

    slot.draggable = true;
    if (typeof handleItemDragStart === 'function') {
        slot.ondragstart = event => handleItemDragStart(event, dragIndex, dragType, dragMetadata);
    }

    const remove = event => {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
        removeItem();
    };

    if (typeof bindInventoryDoubleClick === 'function') bindInventoryDoubleClick(slot, remove);
    else slot.ondblclick = remove;

    slot.tabIndex = 0;
    slot.onkeydown = event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        remove(event);
    };
}

function createCompanionPaperdollSlot(selected, slotKey) {
    const item = selected.equipment && selected.equipment[slotKey];
    const label = COMPANION_UI_SLOT_LABELS[slotKey];
    const slot = document.createElement('div');
    slot.className = ['equip-slot', 'companion-equipment-slot', getCompanionRarityClass(item)].filter(Boolean).join(' ');
    slot.dataset.companionSlot = slotKey;
    slot.ondragover = typeof handleItemDragOver === 'function'
        ? handleItemDragOver
        : event => event.preventDefault();
    slot.ondrop = event => handleCompanionEquipmentDrop(event, selected.instanceId, slotKey);
    slot.setAttribute('role', 'button');
    slot.setAttribute('aria-label', item
        ? label + ': ' + item.name + '. Double-click or drag to the Knight\'s backpack to remove.'
        : label + ': empty. Drag matching gear here from the Knight\'s backpack.');
    slot.title = slot.getAttribute('aria-label');

    const imageUrl = item && typeof getItemSpriteURL === 'function' ? getItemSpriteURL(item) : '';
    if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = '';
        slot.appendChild(image);
    } else {
        slot.textContent = item ? '?' : label.charAt(0);
    }

    bindCompanionStoredItemSlot(
        slot,
        item,
        slotKey,
        'companion-equipment',
        { instanceId: selected.instanceId, slotKey },
        () => unequipCompanionItem(selected.instanceId, slotKey)
    );
    addCompanionItemTooltip(slot, item);
    return slot;
}

function createCompanionPocketSlot(selected, pocketIndex) {
    const item = selected.pockets && selected.pockets[pocketIndex];
    const pocketNumber = pocketIndex + 1;
    const slot = document.createElement('div');
    slot.className = ['equip-slot', 'companion-pocket-slot', getCompanionRarityClass(item)].filter(Boolean).join(' ');
    slot.dataset.companionPocketIndex = String(pocketIndex);
    slot.ondragover = typeof handleItemDragOver === 'function'
        ? handleItemDragOver
        : event => event.preventDefault();
    slot.ondrop = event => handleCompanionPocketDrop(event, selected.instanceId, pocketIndex);
    slot.setAttribute('role', 'button');
    slot.setAttribute('aria-label', item
        ? 'Pocket ' + pocketNumber + ': ' + item.name + '. Double-click or drag to the Knight\'s backpack to remove.'
        : 'Pocket ' + pocketNumber + ': empty. Drag equipment or a combat consumable here.');
    slot.title = slot.getAttribute('aria-label');

    const imageUrl = item && typeof getItemSpriteURL === 'function' ? getItemSpriteURL(item) : '';
    if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = '';
        slot.appendChild(image);
    } else {
        slot.textContent = item ? '?' : 'P' + pocketNumber;
    }

    bindCompanionStoredItemSlot(
        slot,
        item,
        pocketIndex,
        'companion-pocket',
        { instanceId: selected.instanceId, pocketIndex },
        () => removeCompanionPocketItem(selected.instanceId, pocketIndex)
    );
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
    slots.className = 'paper-doll-grid companion-paper-doll-grid';
    slots.append(
        createCompanionPaperdollEmptyCell(),
        createCompanionPaperdollSlot(selected, 'helmet'),
        createCompanionPaperdollEmptyCell(),
        createCompanionPaperdollSlot(selected, 'gloves'),
        createCompanionPaperdollSlot(selected, 'armor'),
        createCompanionPaperdollSlot(selected, 'weapon'),
        createCompanionPocketSlot(selected, 0),
        createCompanionPaperdollSlot(selected, 'boots'),
        createCompanionPocketSlot(selected, 1)
    );

    const equipmentHelp = document.createElement('p');
    equipmentHelp.className = 'companion-equipment-help';
    equipmentHelp.textContent = 'Drag matching gear or pocket items from the Knight\'s backpack. Double-click or drag equipped items back to remove them.';

    const equipmentLayout = document.createElement('div');
    equipmentLayout.className = 'companion-equipment-layout';
    equipmentLayout.append(slots, equipmentHelp);

    panel.append(header, statLine, training, equipmentLayout);
}
