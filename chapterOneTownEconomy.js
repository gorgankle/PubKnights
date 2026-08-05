// --- chapterOneTownEconomy.js ---
// Small, server-authoritative purchase primitive for world-gated Chapter One
// stock. Availability remains narrative data; item stats remain ItemDatabase.

const { ItemDatabase } = require('./public/js/items.js');

function nonNegativeInt(value) {
    const parsed = Math.trunc(Number(value));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function purchaseChapterOneStockItem(player, stockEntry) {
    if (!player || typeof player !== 'object') {
        return { success: false, code: 'PLAYER_NOT_FOUND', message: 'The quartermaster ledger is unavailable.' };
    }
    if (!stockEntry || typeof stockEntry !== 'object') {
        return { success: false, code: 'STOCK_LOCKED', message: 'That equipment has not reached town.' };
    }
    const item = ItemDatabase[stockEntry.itemId];
    const priceGold = nonNegativeInt(stockEntry.priceGold ?? stockEntry.price);
    if (!item || priceGold < 1) {
        return { success: false, code: 'INVALID_STOCK', message: 'That stock entry is unavailable.' };
    }

    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const capacity = Math.max(1, nonNegativeInt(player.maxInventorySlots) || 5);
    if (player.inventory.length >= capacity) {
        return { success: false, code: 'BACKPACK_FULL', message: 'Make one backpack space before buying road gear.' };
    }
    player.gold = nonNegativeInt(player.gold);
    if (player.gold < priceGold) {
        return {
            success: false,
            code: 'INSUFFICIENT_GOLD',
            priceGold,
            message: `${item.name} costs ${priceGold}g.`
        };
    }

    const purchasedItem = JSON.parse(JSON.stringify(item));
    player.gold -= priceGold;
    player.inventory.push(purchasedItem);
    return {
        success: true,
        code: 'PURCHASED',
        stockId: stockEntry.stockId || stockEntry.id,
        item: purchasedItem,
        priceGold,
        message: `${item.name} was added to the backpack for ${priceGold}g.`
    };
}

module.exports = { purchaseChapterOneStockItem };
