// --- combatDefeat.js ---
// Shared server-side player defeat cleanup.

const { ItemDatabase } = require('./public/js/items.js');
const { getMaxHp, getMaxStamina } = require('./combatMath.js');

function applyPlayerCombatDefeat(player) {
    if (!player) return player;

    player.equipment = {
        helmet: null,
        armor: null,
        weapon: JSON.parse(JSON.stringify(ItemDatabase["rusty_mace"])),
        gloves: null,
        boots: null
    };
    player.inventory = [];
    player.pendingLoot = [];
    player.pendingGold = 0;
    player.pendingXp = 0;
    player.statusEffects = {};

    player.hp = getMaxHp(player);
    player.stamina = getMaxStamina(player);
    return player;
}

module.exports = {
    applyPlayerCombatDefeat
};
