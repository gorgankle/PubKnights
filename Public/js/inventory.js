// --- LOGIC: INVENTORY & VAULT ---

// === DRAG & DROP REORDERING ACTIONS ===
function handleItemDragStart(event, index, listType) {
    event.dataTransfer.setData("text/plain", JSON.stringify({ index: index, type: listType }));
    event.dataTransfer.effectAllowed = "move";
}

function handleItemDragOver(event) {
    event.preventDefault(); // Essential to allow drop vectors
    event.dataTransfer.dropEffect = "move";
}

function handleItemDrop(event, toIndex, toType) {
    event.preventDefault();
    try {
        const dragData = JSON.parse(event.dataTransfer.getData("text/plain"));
        const fromIndex = dragData.index;
        const fromType = dragData.type;

        // 1. Reordering items within the Backpack array
        if (fromType === 'backpack' && toType === 'backpack') {
            if (fromIndex === toIndex) return;
            socket.emit('inventoryAction', { action: 'reorderBackpack', fromIndex: fromIndex, toIndex: toIndex });
        }
        // 2. Reordering items within the Vault array
        else if (fromType === 'vault' && toType === 'vault') {
            if (fromIndex === toIndex) return;
            socket.emit('inventoryAction', { action: 'reorderVault', fromIndex: fromIndex, toIndex: toIndex });
        }
        // 3. Dragging from Backpack directly into Vault rows (Deposit Shortcut!)
        else if (fromType === 'backpack' && toType === 'vault') {
            depositToVault(fromIndex);
        }
        // 4. Dragging from Vault directly into Backpack rows (Withdraw Shortcut!)
        else if (fromType === 'vault' && toType === 'backpack') {
            withdrawFromVault(fromIndex);
        }
    } catch (err) {
        console.error("Data transfer stream failure:", err);
    }
}

// === LOBOTOMIZED ACTIONS ===

function depositToVault(idx) { 
    socket.emit('inventoryAction', { action: 'deposit', index: idx });
}

function withdrawFromVault(idx) { 
    socket.emit('inventoryAction', { action: 'withdraw', index: idx });
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