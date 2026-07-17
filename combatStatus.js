// --- combatStatus.js ---
// Shared server-side combat status helpers.

const { getAura } = require('./public/js/aura-assets.js');

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
    const sourceActor = config.sourceActor || null;

    statusEffects.poison = {
        id: "poison",
        name: "Poisoned",
        turns: existing ? Math.max(existing.turns || 0, turns) : turns,
        damage: existing ? Math.max(existing.damage || 0, damage) : damage,
        auraId: "poison",
        aura: getAura("poison"),
        sourceUid: (sourceActor && sourceActor.uid) || config.sourceUid || (existing && existing.sourceUid) || null,
        sourceName: (sourceActor && sourceActor.name) || config.sourceName || (existing && existing.sourceName) || null,
        sourceKind: (sourceActor && sourceActor.kind) || config.sourceKind || (existing && existing.sourceKind) || null
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
        killed: target.hp <= 0,
        sourceUid: poison.sourceUid || null,
        sourceName: poison.sourceName || null,
        sourceKind: poison.sourceKind || null
    };
}

module.exports = {
    applyPoison,
    tickPoison
};
