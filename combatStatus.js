// --- combatStatus.js ---
// Shared server-side combat status helpers.

const POISON_AURA = Object.freeze({
    style: "rise",
    radius: 0.2,
    intensity: 1,
    colors: ["#273c24", "#8e44ad"]
});

function ensureStatusTarget(target) {
    if (!target.statusEffects || typeof target.statusEffects !== 'object') target.statusEffects = {};
    return target.statusEffects;
}

function getPoisonDamage(target, fallback = 3) {
    const maxHp = target.maxHp || (target.vitality ? target.vitality * 25 : 0);
    if (!maxHp) return Math.max(1, fallback);
    return Math.max(1, Math.floor(maxHp * 0.08), fallback);
}

function applyPoison(target, config = {}) {
    if (!target || target.hp <= 0) return false;
    const chance = config.chance ?? 0;
    if (chance < 1 && Math.random() > chance) return false;

    const statusEffects = ensureStatusTarget(target);
    const turns = config.turns || 3;
    const damage = config.damage || getPoisonDamage(target, config.fallbackDamage || 3);
    const existing = statusEffects.poison;

    statusEffects.poison = {
        id: "poison",
        name: "Poisoned",
        turns: existing ? Math.max(existing.turns || 0, turns) : turns,
        damage: existing ? Math.max(existing.damage || 0, damage) : damage,
        aura: POISON_AURA
    };

    return true;
}

function tickPoison(target) {
    const poison = target && target.statusEffects && target.statusEffects.poison;
    if (!poison || target.hp <= 0) return null;

    const damage = Math.max(1, poison.damage || getPoisonDamage(target));
    target.hp = Math.max(0, target.hp - damage);
    poison.turns = Math.max(0, (poison.turns || 1) - 1);
    if (poison.turns <= 0 || target.hp <= 0) delete target.statusEffects.poison;

    return {
        status: "poison",
        damage,
        remainingTurns: poison.turns || 0,
        killed: target.hp <= 0
    };
}

module.exports = {
    POISON_AURA,
    applyPoison,
    tickPoison
};
