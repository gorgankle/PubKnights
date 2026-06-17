// --- lootManager.js ---



// Keeping your economy logic intact from the original file
function getSharpeningStoneCost() { return Math.floor(40 * Math.pow(1.20, player.sharpeningStoneBought || 0)); }
function getIronPlatingCost() { return Math.floor(60 * Math.pow(1.20, player.ironPlatingBought || 0)); }

function getBackpackUpgradeCost() {
    let ups = player.backpackUpgrades || 0;
    return { gold: Math.floor(100 * Math.pow(1.5, ups)), wood: Math.floor(50 * Math.pow(1.4, ups)) };
}

function getCartUpgradeCost() {
    let lvl = player.supplyCart.level || 1;
    return { wood: Math.floor(40 * Math.pow(1.5, lvl - 1)), gold: Math.floor(80 * Math.pow(1.6, lvl - 1)) };
}