// --- LOGIC: INVENTORY & VAULT ---

const EQUIPPABLE_ITEM_SLOTS = ['weapon', 'helmet', 'armor', 'gloves', 'boots'];

function isLootCrate(item) {
    return !!(item && (item.type === 'crate' || (item.id && item.id.includes('crate'))));
}

function isVaultInteractionContext(explicitVaultContext) {
    return !!explicitVaultContext || (typeof gameState !== 'undefined' && gameState === 'VAULT');
}

function bindInventoryDoubleClick(element, handler) {
    if (!element) return;

    if (typeof handler !== 'function') {
        element.onpointerdown = null;
        element.onpointerup = null;
        element.onmousedown = null;
        element.onmouseup = null;
        element.ondblclick = null;
        return;
    }

    let downX = 0;
    let downY = 0;
    let lastUpTime = 0;
    let lastUpX = 0;
    let lastUpY = 0;
    let lastHandledAt = 0;

    const getPoint = (event) => {
        const touch = event.changedTouches && event.changedTouches[0];
        return {
            x: touch ? touch.clientX : event.clientX,
            y: touch ? touch.clientY : event.clientY
        };
    };

    const runHandler = (event) => {
        const now = Date.now();
        if (now - lastHandledAt < 250) return;
        lastHandledAt = now;
        handler(event);
    };

    const onDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const point = getPoint(event);
        downX = point.x;
        downY = point.y;
    };

    const onUp = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const point = getPoint(event);
        if (Math.abs(point.x - downX) > 10 || Math.abs(point.y - downY) > 10) return;

        const now = Date.now();
        const closeEnough = Math.abs(point.x - lastUpX) <= 14 && Math.abs(point.y - lastUpY) <= 14;
        if (now - lastUpTime <= 450 && closeEnough) {
            lastUpTime = 0;
            runHandler(event);
            return;
        }

        lastUpTime = now;
        lastUpX = point.x;
        lastUpY = point.y;
    };

    if (window.PointerEvent) {
        element.onpointerdown = onDown;
        element.onpointerup = onUp;
        element.onmousedown = null;
        element.onmouseup = null;
    } else {
        element.onmousedown = onDown;
        element.onmouseup = onUp;
        element.onpointerdown = null;
        element.onpointerup = null;
    }

    element.ondblclick = (event) => {
        runHandler(event);
    };
}

// === DRAG & DROP REORDERING ACTIONS ===
const PUBKNIGHTS_ITEM_DRAG_TYPE = "application/x-pubknights-item";

function handleItemDragStart(event, index, listType, metadata) {
    const extraData = metadata && typeof metadata === 'object' ? metadata : {};
    const payload = JSON.stringify(Object.assign({}, extraData, { index: index, type: listType }));
    event.dataTransfer.setData(PUBKNIGHTS_ITEM_DRAG_TYPE, payload);
    event.dataTransfer.setData("text/plain", payload);
    event.dataTransfer.effectAllowed = "move";
}

function readPubKnightsItemDrag(event) {
    if (!event || !event.dataTransfer) return null;
    const rawDragData = event.dataTransfer.getData(PUBKNIGHTS_ITEM_DRAG_TYPE);
    if (!rawDragData) return null;

    try {
        const dragData = JSON.parse(rawDragData);
        const allowedTypes = ['backpack', 'vault', 'equipment', 'companion-equipment', 'companion-pocket'];
        return dragData && allowedTypes.includes(dragData.type) ? dragData : null;
    } catch (err) {
        return null;
    }
}

function handleItemDragOver(event) {
    event.preventDefault(); // Essential to allow drop vectors
    event.dataTransfer.dropEffect = "move";
}

function handleItemDrop(event, toIndex, toType) {
    event.preventDefault();
    try {
        const dragData = readPubKnightsItemDrag(event);
        if (!dragData) return;

        const fromIndex = dragData.index;
        const fromType = dragData.type;

        // 1. Reordering Backpack
        if (fromType === 'backpack' && toType === 'backpack') {
            if (fromIndex === toIndex) return;
            socket.emit('inventoryAction', { action: 'reorderBackpack', fromIndex: fromIndex, toIndex: toIndex });
        }
        // 2. Reordering Vault
        else if (fromType === 'vault' && toType === 'vault') {
            if (fromIndex === toIndex) return;
            socket.emit('inventoryAction', { action: 'reorderVault', fromIndex: fromIndex, toIndex: toIndex });
        }
        // 3. Backpack -> Vault (Deposit Shortcut)
        else if (fromType === 'backpack' && toType === 'vault') {
            depositToVault(fromIndex);
        }
        // 4. Vault -> Backpack (Withdraw Shortcut)
        else if (fromType === 'vault' && toType === 'backpack') {
            withdrawFromVault(fromIndex);
        }
        // 5. Backpack -> Knight equipment
        else if (fromType === 'backpack' && toType === 'equipment') {
            equipItem(fromIndex);
        }
        // 6. Knight equipment -> Backpack or Vault
        else if (fromType === 'equipment' && (toType === 'backpack' || toType === 'vault')) {
            // fromIndex holds the slotKey (e.g., 'weapon') when dragged from the Knight.
            unequipItem(fromIndex);
        }
        // 7. Mercenary equipment -> Knight backpack
        else if (fromType === 'companion-equipment' && toType === 'backpack') {
            if (typeof unequipCompanionItem !== 'function'
                || !dragData.instanceId
                || !EQUIPPABLE_ITEM_SLOTS.includes(dragData.slotKey)) return;
            unequipCompanionItem(dragData.instanceId, dragData.slotKey);
        }
        // 8. Mercenary pocket -> Knight backpack
        else if (fromType === 'companion-pocket' && toType === 'backpack') {
            if (typeof removeCompanionPocketItem !== 'function'
                || !dragData.instanceId
                || !Number.isInteger(dragData.pocketIndex)
                || dragData.pocketIndex < 0
                || dragData.pocketIndex > 1) return;
            removeCompanionPocketItem(dragData.instanceId, dragData.pocketIndex);
        }
    } catch (err) {
        console.error("Data transfer stream failure:", err);
    }
}

// === LOBOTOMIZED ACTIONS ===

function depositToVault(idx) { 
    hideTooltip();
    socket.emit('inventoryAction', { action: 'deposit', index: idx });
}

function withdrawFromVault(idx) { 
    hideTooltip();
    socket.emit('inventoryAction', { action: 'withdraw', index: idx });
}

function depositEquipmentToVault(slotKey) {
    hideTooltip();
    socket.emit('inventoryAction', { action: 'depositEquipment', slotKey: slotKey });
}

function equipItem(index) {
    hideTooltip(); 
    socket.emit('inventoryAction', { action: 'equip', index: index });
}

function sellItem(index) { 
    hideTooltip(); 
    socket.emit('inventoryAction', { action: 'sell', index: index });
}

function unequipItem(slotKey) {
    hideTooltip(); 
    socket.emit('inventoryAction', { action: 'unequip', slotKey: slotKey });
}

function handleBackpackDoubleClick(event, index, item, explicitVaultContext) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!item) return;

    if (isVaultInteractionContext(explicitVaultContext)) {
        depositToVault(index);
        return;
    }

    if (EQUIPPABLE_ITEM_SLOTS.includes(item.slot)) {
        equipItem(index);
    } else if (isLootCrate(item)) {
        openCrate(index, item.id);
    }
}

function handleEquipmentDoubleClick(event, slotKey, explicitVaultContext) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (isVaultInteractionContext(explicitVaultContext)) {
        depositEquipmentToVault(slotKey);
        return;
    }

    unequipItem(slotKey);
}

function handleVaultItemDoubleClick(event, index) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    withdrawFromVault(index);
}
