// --- UI: COMPANION ROSTER, PAPERDOLL, POCKETS & PROGRESSION ---

const COMPANION_UI_EQUIPMENT_SLOTS = [
    'weapon',
    'offhand',
    'helmet',
    'armor',
    'gloves',
    'boots'
];
const COMPANION_UI_SLOT_LABELS = {
    weapon: 'Weapon',
    offhand: 'Offhand',
    helmet: 'Helmet',
    armor: 'Armor',
    gloves: 'Gloves',
    boots: 'Boots'
};
const COMPANION_UI_LEVEL_GROWTH = Object.freeze({ vitality: 0.5, offense: 0.5, defense: 0.4, speed: 0.2 });
const COMPANION_UI_MAX_SELECTED = 3;
const COMPANION_UI_MAX_ROSTER = 6;
const COMPANION_UI_TRAINING_GOLD_PER_TARGET_LEVEL = 150;
let partyInventoryActionPending = false;
let partyInventoryPendingRequest = null;

function getSelectedCompanionIds(activeIds) {
    const sourceIds = Array.isArray(activeIds) ? activeIds : [];
    return [...new Set(sourceIds.filter(Boolean))];
}

function isCompanionPocketEligible(item) {
    return Boolean(item && (
        COMPANION_UI_EQUIPMENT_SLOTS.includes(item.slot)
        || (item.slot === 'consumable' && item.combat)
    ));
}

function isPartyRosterManagementLocked() {
    return !!(
        typeof player !== 'undefined'
        && player
        && player.adventure
        && player.adventure.activeJourney
    );
}

function getSelectedPartyCompanion() {
    const roster = typeof player !== 'undefined' && player && player.roster;
    const companions = roster && Array.isArray(roster.companions) ? roster.companions : [];
    if (!companions.length) return null;
    return companions.find(companion => companion.instanceId === window.selectedCompanionInstanceId)
        || companions.find(companion => Array.isArray(roster.activeIds) && roster.activeIds.includes(companion.instanceId))
        || companions[0];
}

function getPartyBackpackActionPresentations(item) {
    if (!item) return [];
    const actions = [];
    if (COMPANION_UI_EQUIPMENT_SLOTS.includes(item.slot)) {
        actions.push({ action: 'equip', label: `Equip ${COMPANION_UI_SLOT_LABELS[item.slot] || 'Gear'}` });
    }
    if (isCompanionPocketEligible(item)) {
        actions.push({ action: 'pocket', label: 'Put in Pocket' });
    }
    return actions;
}

function getPartyBackpackActionPresentation(item) {
    return getPartyBackpackActionPresentations(item)[0] || null;
}

function restorePartyFocus(...focusKeys) {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
    const candidates = Array.from(document.querySelectorAll('[data-party-focus-key]'));
    const target = focusKeys
        .filter(Boolean)
        .map(key => candidates.find(candidate => (
            candidate.dataset.partyFocusKey === key
            && candidate.disabled !== true
            && candidate.getAttribute('aria-disabled') !== 'true'
        )))
        .find(Boolean);
    if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
}

function setPartyInventoryActionPending(isPending, message) {
    partyInventoryActionPending = !!isPending;
    if (typeof document === 'undefined') return;
    const list = document.getElementById('party-inventory-list');
    if (list) {
        list.setAttribute('aria-busy', partyInventoryActionPending ? 'true' : 'false');
        list.querySelectorAll('.party-backpack-action').forEach(button => {
            button.disabled = partyInventoryActionPending || button.dataset.partyActionUnavailable === 'true';
        });
        list.querySelectorAll('[data-party-draggable="true"]').forEach(slot => {
            slot.draggable = !partyInventoryActionPending;
        });
    }
    const equipmentPanel = document.getElementById('companion-equipment-panel');
    if (equipmentPanel && typeof equipmentPanel.querySelectorAll === 'function') {
        equipmentPanel.setAttribute('aria-busy', partyInventoryActionPending ? 'true' : 'false');
        equipmentPanel.querySelectorAll('[data-party-inventory-control="true"]').forEach(control => {
            control.setAttribute('aria-disabled', partyInventoryActionPending ? 'true' : 'false');
            control.draggable = !partyInventoryActionPending && control.dataset.hasStoredItem === 'true';
        });
    }
    const status = document.getElementById('party-inventory-status');
    if (status && message) status.textContent = message;
}

function beginPartyInventoryAction(request, invoke) {
    if (partyInventoryActionPending || !request || typeof invoke !== 'function') return false;
    partyInventoryPendingRequest = request;
    setPartyInventoryActionPending(true, request.message);
    try {
        invoke();
        return true;
    } catch (error) {
        partyInventoryPendingRequest = null;
        setPartyInventoryActionPending(false, 'The party equipment request could not be sent.');
        throw error;
    }
}

function activatePartyBackpackItem(inventoryIndex, requestedAction = null) {
    if (partyInventoryActionPending) return false;
    if (typeof gameState !== 'undefined' && gameState === 'COMBAT') {
        reportCompanionDropError('Party equipment cannot be changed during combat.');
        return false;
    }
    const companion = getSelectedPartyCompanion();
    const inventory = typeof player !== 'undefined' && player && Array.isArray(player.inventory)
        ? player.inventory
        : [];
    const item = inventory[inventoryIndex];
    const presentations = getPartyBackpackActionPresentations(item);
    const presentation = presentations.find(entry => entry.action === requestedAction)
        || (!requestedAction ? presentations[0] : null);
    if (!companion) {
        reportCompanionDropError('Select a companion before assigning backpack items.');
        return false;
    }
    if (!item || !presentation) {
        reportCompanionDropError('That item cannot be assigned to a companion.');
        return false;
    }

    const receiptAction = presentation.action === 'equip' ? 'equipCompanion' : 'storeCompanionPocket';
    const focusKey = `party-backpack:${inventoryIndex}:${presentation.action}`;
    const fallbackFocusKey = presentation.action === 'equip'
        ? `companion:${companion.instanceId}:slot:${item.slot}`
        : `companion:${companion.instanceId}:pocket:0`;
    return beginPartyInventoryAction({
        action: receiptAction,
        focusKey,
        fallbackFocusKey,
        message: `${presentation.label}: ${item.name || 'item'} for ${companion.name || 'companion'}...`
    }, () => {
        if (presentation.action === 'equip') equipCompanionItem(companion.instanceId, inventoryIndex);
        else storeCompanionPocketItem(companion.instanceId, inventoryIndex, 0);
    });
}

function requestCompanionEquip(instanceId, inventoryIndex, slotKey, itemName = 'gear') {
    return beginPartyInventoryAction({
        action: 'equipCompanion',
        focusKey: `companion:${instanceId}:slot:${slotKey}`,
        fallbackFocusKey: `companion:${instanceId}:equipment`,
        message: `Equipping ${itemName}...`
    }, () => equipCompanionItem(instanceId, inventoryIndex));
}

function requestCompanionUnequip(instanceId, slotKey) {
    return beginPartyInventoryAction({
        action: 'unequipCompanion',
        focusKey: `companion:${instanceId}:slot:${slotKey}`,
        fallbackFocusKey: `companion:${instanceId}:equipment`,
        message: `Returning ${COMPANION_UI_SLOT_LABELS[slotKey] || 'gear'} to the shared backpack...`
    }, () => unequipCompanionItem(instanceId, slotKey));
}

function requestCompanionPocketStore(instanceId, inventoryIndex, pocketIndex = 0, itemName = 'item') {
    return beginPartyInventoryAction({
        action: 'storeCompanionPocket',
        focusKey: `companion:${instanceId}:pocket:${pocketIndex}`,
        fallbackFocusKey: `companion:${instanceId}:pocket:${pocketIndex}`,
        message: `Storing ${itemName} in the companion pocket...`
    }, () => storeCompanionPocketItem(instanceId, inventoryIndex, pocketIndex));
}

function requestCompanionPocketRemoval(instanceId, pocketIndex = 0) {
    return beginPartyInventoryAction({
        action: 'removeCompanionPocket',
        focusKey: `companion:${instanceId}:pocket:${pocketIndex}`,
        fallbackFocusKey: `companion:${instanceId}:equipment`,
        message: 'Returning the pocket item to the shared backpack...'
    }, () => removeCompanionPocketItem(instanceId, pocketIndex));
}

function completePartyInventoryAction(receipt) {
    if (!partyInventoryPendingRequest || !receipt || receipt.action !== partyInventoryPendingRequest.action) {
        return false;
    }
    const completedRequest = partyInventoryPendingRequest;
    partyInventoryPendingRequest = null;
    const message = receipt && receipt.message
        ? receipt.message
        : (receipt && receipt.success === false ? 'The item could not be assigned.' : 'Party equipment updated.');
    setPartyInventoryActionPending(false, message);
    if (receipt.success === false) {
        restorePartyFocus(completedRequest.focusKey, completedRequest.fallbackFocusKey);
    } else {
        restorePartyFocus(completedRequest.fallbackFocusKey, completedRequest.focusKey);
    }
    return true;
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

function identifyPartyFocusTarget(element, focusKey, companionId = '') {
    if (!element) return element;
    if (!element.dataset) element.dataset = {};
    element.dataset.partyFocusKey = focusKey;
    if (companionId) element.dataset.partyCompanionId = companionId;
    return element;
}

function capturePartyFocus(...roots) {
    if (typeof document === 'undefined' || !document.activeElement) return null;
    const active = document.activeElement;
    const ownsFocus = roots.filter(Boolean).some(root => (
        root === active || (typeof root.contains === 'function' && root.contains(active))
    ));
    if (!ownsFocus) return null;
    const owner = typeof active.closest === 'function'
        ? active.closest('[data-party-companion-id]')
        : null;
    return {
        focusKey: active.dataset && active.dataset.partyFocusKey,
        companionId: (active.dataset && active.dataset.partyCompanionId)
            || (owner && owner.dataset.partyCompanionId)
            || ''
    };
}

function restoreRenderedPartyFocus(focusState) {
    if (!focusState) return;
    restorePartyFocus(
        focusState.focusKey,
        focusState.companionId ? `companion:${focusState.companionId}:equipment` : '',
        focusState.companionId ? `companion:${focusState.companionId}:status` : '',
        'party-roster:fill'
    );
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
    const equipmentPanel = document.getElementById('companion-equipment-panel');
    const focusState = capturePartyFocus(partyList, equipmentPanel);
    partyList.innerHTML = '';
    activeIds = getSelectedCompanionIds(activeIds);
    const managementLocked = isPartyRosterManagementLocked();

    const toolbar = document.createElement('div');
    toolbar.className = 'companion-roster-toolbar';
    const status = document.createElement('span');
    status.textContent = `Active ${activeIds.length}/${COMPANION_UI_MAX_SELECTED} • Roster ${companions.length}/${COMPANION_UI_MAX_ROSTER}`;
    const fillButton = makeCompanionButton('Fill Party', 'companion-activate-button', fillActiveCompanions);
    identifyPartyFocusTarget(fillButton, 'party-roster:fill');
    fillButton.disabled = managementLocked || activeIds.length >= COMPANION_UI_MAX_SELECTED
        || !companions.some(companion => !activeIds.includes(companion.instanceId));
    const benchAllButton = makeCompanionButton('Bench All', 'companion-bench-button', benchAllCompanions);
    identifyPartyFocusTarget(benchAllButton, 'party-roster:bench-all');
    benchAllButton.disabled = managementLocked || activeIds.length === 0;
    toolbar.append(status, fillButton, benchAllButton);
    partyList.appendChild(toolbar);

    if (companions.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'companion-empty-state';
        empty.textContent = 'No companions have joined your company yet. Meet people in town and on the roads.';
        partyList.appendChild(empty);
        renderCompanionEquipmentPanel(companions, activeIds);
        restoreRenderedPartyFocus(focusState);
        return;
    }

    companions.forEach(companion => {
        const isActive = activeIds.includes(companion.instanceId);
        const isSelected = window.selectedCompanionInstanceId === companion.instanceId;
        const row = document.createElement('div');
        row.className = 'companion-roster-row' + (isActive ? ' is-active' : '') + (isSelected ? ' is-selected' : '');
        row.dataset.partyCompanionId = companion.instanceId;

        const summary = document.createElement('div');
        summary.className = 'companion-roster-summary';
        const name = document.createElement('div');
        name.className = 'companion-roster-name';
        const partyLabel = isActive ? 'Active' : 'Benched';
        name.textContent = `${companion.name || 'Mercenary'} • Lv ${companion.level || 1} (${partyLabel})`;
        const stats = document.createElement('div');
        stats.className = 'companion-roster-stats';
        stats.textContent = `${companion.role || 'Mercenary'} | HP ${getCompanionUiStat(companion, 'vitality') * 25} | ATK ${getCompanionUiStat(companion, 'offense')} | DEF ${getCompanionUiStat(companion, 'defense')}`;
        summary.append(name, stats);

        const controls = document.createElement('div');
        controls.className = 'companion-roster-controls';
        const equipmentButton = makeCompanionButton('Equipment', 'companion-gear-button', () => selectCompanionEquipment(companion.instanceId));
        identifyPartyFocusTarget(equipmentButton, `companion:${companion.instanceId}:equipment`, companion.instanceId);
        equipmentButton.setAttribute('aria-label', `${companion.name || 'Mercenary'}: show equipment`);
        equipmentButton.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        controls.appendChild(equipmentButton);
        if (isActive) {
            const bench = makeCompanionButton('Bench', 'companion-bench-button', () => benchCompanion(companion.instanceId));
            identifyPartyFocusTarget(bench, `companion:${companion.instanceId}:status`, companion.instanceId);
            bench.setAttribute('aria-label', `${companion.name || 'Mercenary'}: bench companion`);
            bench.disabled = managementLocked;
            controls.appendChild(bench);
        } else {
            const activate = makeCompanionButton('Activate', 'companion-activate-button', () => setActiveCompanion(companion.instanceId));
            identifyPartyFocusTarget(activate, `companion:${companion.instanceId}:status`, companion.instanceId);
            activate.setAttribute('aria-label', `${companion.name || 'Mercenary'}: activate companion`);
            activate.disabled = managementLocked || activeIds.length >= COMPANION_UI_MAX_SELECTED;
            controls.appendChild(activate);
        }
        const dismiss = makeCompanionButton('Dismiss', 'companion-danger-button', () => dismissCompanion(companion.instanceId, companion.name));
        identifyPartyFocusTarget(dismiss, `companion:${companion.instanceId}:dismiss`, companion.instanceId);
        dismiss.setAttribute('aria-label', `${companion.name || 'Mercenary'}: dismiss companion`);
        dismiss.disabled = managementLocked;
        controls.appendChild(dismiss);

        row.append(summary, controls);
        partyList.appendChild(row);
    });

    renderCompanionEquipmentPanel(companions, activeIds);
    restoreRenderedPartyFocus(focusState);
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
    if (partyInventoryActionPending) return;
    const dropped = readCompanionBackpackDrop(event);
    if (!dropped) return;
    if (!COMPANION_UI_EQUIPMENT_SLOTS.includes(slotKey) || dropped.item.slot !== slotKey) {
        reportCompanionDropError('Drop ' + (COMPANION_UI_SLOT_LABELS[slotKey] || 'matching gear') + ' into this slot.');
        return;
    }
    requestCompanionEquip(instanceId, dropped.index, slotKey, dropped.item.name || 'gear');
}

function handleCompanionPocketDrop(event, instanceId, pocketIndex) {
    if (partyInventoryActionPending) return;
    const dropped = readCompanionBackpackDrop(event);
    if (!dropped) return;
    if (!isCompanionPocketEligible(dropped.item)) {
        reportCompanionDropError('Pockets hold equipment or combat consumables.');
        return;
    }
    requestCompanionPocketStore(instanceId, dropped.index, pocketIndex, dropped.item.name || 'item');
}

function createCompanionPaperdollEmptyCell() {
    const slot = document.createElement('div');
    slot.className = 'equip-slot empty-cell';
    slot.setAttribute('aria-hidden', 'true');
    return slot;
}

function bindCompanionStoredItemSlot(slot, item, dragIndex, dragType, dragMetadata, removeItem) {
    if (!item) return;

    slot.draggable = !partyInventoryActionPending;
    if (typeof handleItemDragStart === 'function') {
        slot.ondragstart = event => handleItemDragStart(event, dragIndex, dragType, dragMetadata);
    }

    const remove = event => {
        if (partyInventoryActionPending) return;
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
        removeItem();
    };

    slot.onclick = remove;

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
    slot.setAttribute('role', item ? 'button' : 'group');
    slot.tabIndex = item ? 0 : -1;
    slot.dataset.partyInventoryControl = 'true';
    slot.dataset.hasStoredItem = item ? 'true' : 'false';
    identifyPartyFocusTarget(slot, `companion:${selected.instanceId}:slot:${slotKey}`, selected.instanceId);
    slot.setAttribute('aria-label', item
        ? label + ': ' + item.name + '. Tap, click, or press Enter to return it to the shared backpack.'
        : label + ': empty. Use a matching item\'s Equip action in the shared backpack.');
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
        () => requestCompanionUnequip(selected.instanceId, slotKey)
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
    slot.setAttribute('role', item ? 'button' : 'group');
    slot.tabIndex = item ? 0 : -1;
    slot.dataset.partyInventoryControl = 'true';
    slot.dataset.hasStoredItem = item ? 'true' : 'false';
    identifyPartyFocusTarget(slot, `companion:${selected.instanceId}:pocket:${pocketIndex}`, selected.instanceId);
    slot.setAttribute('aria-label', item
        ? 'Pocket ' + pocketNumber + ': ' + item.name + '. Tap, click, or press Enter to return it to the shared backpack.'
        : 'Pocket ' + pocketNumber + ': empty. Use an item\'s Put in Pocket action in the shared backpack.');
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
        () => requestCompanionPocketRemoval(selected.instanceId, pocketIndex)
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
    identifyPartyFocusTarget(train, `companion:${selected.instanceId}:train`, selected.instanceId);
    train.disabled = isPartyRosterManagementLocked() || level >= trainingCap || player.gold < trainingCost;
    training.append(progressWrap, train);

    const slots = document.createElement('div');
    slots.className = 'paper-doll-grid companion-paper-doll-grid';
    slots.append(
        createCompanionPaperdollEmptyCell(),
        createCompanionPaperdollSlot(selected, 'helmet'),
        createCompanionPaperdollEmptyCell(),
        createCompanionPaperdollSlot(selected, 'offhand'),
        createCompanionPaperdollSlot(selected, 'armor'),
        createCompanionPaperdollSlot(selected, 'weapon'),
        createCompanionPaperdollSlot(selected, 'gloves'),
        createCompanionPaperdollSlot(selected, 'boots'),
        createCompanionPocketSlot(selected, 0)
    );

    const equipmentHelp = document.createElement('p');
    equipmentHelp.className = 'companion-equipment-help';
    equipmentHelp.textContent = 'Use the shared backpack actions or drag matching gear into a slot. Press Enter on equipped items to return them.';

    const equipmentLayout = document.createElement('div');
    equipmentLayout.className = 'companion-equipment-layout';
    equipmentLayout.append(slots, equipmentHelp);

    panel.append(header, statLine, training, equipmentLayout);
}

if (typeof window !== 'undefined') {
    window.activatePartyBackpackItem = activatePartyBackpackItem;
    window.completePartyInventoryAction = completePartyInventoryAction;
    window.getPartyBackpackActionPresentation = getPartyBackpackActionPresentation;
    window.getPartyBackpackActionPresentations = getPartyBackpackActionPresentations;
    window.requestCompanionUnequip = requestCompanionUnequip;
    window.requestCompanionPocketRemoval = requestCompanionPocketRemoval;
}
