// --- combatDefeat.js ---
// Shared server-side player defeat cleanup.

const { getMaxHp, getMaxStamina } = require('./combatMath.js');

function applyPlayerCombatDefeat(player) {
    if (!player) return player;

    player.equipment = {
        helmet: null,
        armor: null,
        weapon: null,
        gloves: null,
        boots: null
    };
    player.inventory = [];
    player.pendingLoot = [];
    player.pendingGold = 0;
    player.pendingXp = 0;
    player.statusEffects = {};
    player.activeBuffs = [];
    player.activeCombatBuff = null;

    player.hp = getMaxHp(player);
    player.stamina = getMaxStamina(player);
    return player;
}

module.exports = {
    applyPlayerCombatDefeat
};
