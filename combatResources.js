// --- combatResources.js ---
// Shared vitality-adjacent resource rules for every combat actor.

const { getMaxStamina } = require('./combatMath.js');

const DEFAULT_ACTOR_MAX_STAMINA = 25;
const DEFAULT_ATTACK_STAMINA_COST = 5;
const DEFAULT_HEAL_STAMINA_COST = 10;
const REST_STAMINA_RATIO = 0.15;

function isPlayerActor(actor) {
    return !!actor && actor.kind === 'player';
}

function toWholeNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : fallback;
}

function getActorMaxStamina(actor, player) {
    if (isPlayerActor(actor)) {
        const persistentMax = player ? getMaxStamina(player) : 0;
        const actorMax = toWholeNumber(actor && actor.maxStamina, 0);
        return Math.max(1, persistentMax || actorMax || DEFAULT_ACTOR_MAX_STAMINA);
    }
    const explicitMax = toWholeNumber(actor && actor.maxStamina, 0);
    if (explicitMax > 0) return explicitMax;
    const current = toWholeNumber(actor && actor.stamina, 0);
    return Math.max(1, current || DEFAULT_ACTOR_MAX_STAMINA);
}

function getActorStamina(actor, player) {
    if (!actor) return 0;
    if (isPlayerActor(actor)) return toWholeNumber(player && player.stamina, 0);
    return toWholeNumber(actor.stamina, 0);
}

function setActorStamina(actor, player, value) {
    if (!actor) return 0;
    const maxStamina = getActorMaxStamina(actor, player);
    const nextStamina = Math.min(maxStamina, toWholeNumber(value, 0));
    actor.maxStamina = maxStamina;
    actor.stamina = nextStamina;
    if (isPlayerActor(actor) && player) player.stamina = nextStamina;
    return nextStamina;
}

function ensureActorStamina(actor, player) {
    if (!actor) return actor;
    const maxStamina = getActorMaxStamina(actor, player);
    let currentStamina;

    if (isPlayerActor(actor)) {
        currentStamina = Number.isFinite(Number(player && player.stamina))
            ? Number(player.stamina)
            : maxStamina;
    } else {
        currentStamina = Number.isFinite(Number(actor.stamina))
            ? Number(actor.stamina)
            : maxStamina;
    }

    actor.maxStamina = maxStamina;
    actor.attackStaminaCost = Math.max(0, toWholeNumber(actor.attackStaminaCost, DEFAULT_ATTACK_STAMINA_COST));
    setActorStamina(actor, player, currentStamina);
    return actor;
}

function canSpendActorStamina(actor, player, amount) {
    return getActorStamina(actor, player) >= toWholeNumber(amount, 0);
}

function spendActorStamina(actor, player, amount) {
    const cost = toWholeNumber(amount, 0);
    if (!canSpendActorStamina(actor, player, cost)) return false;
    setActorStamina(actor, player, getActorStamina(actor, player) - cost);
    return true;
}

function recoverActorStamina(actor, player, ratio = REST_STAMINA_RATIO) {
    const maxStamina = getActorMaxStamina(actor, player);
    const before = getActorStamina(actor, player);
    const recovery = Math.max(1, Math.floor(maxStamina * Math.max(0, Number(ratio) || 0)));
    const after = setActorStamina(actor, player, before + recovery);
    return after - before;
}

function getMoveStaminaCost(distance, speed) {
    const safeDistance = Math.max(0, Number(distance) || 0);
    const safeSpeed = Math.max(1, Number(speed) || 1);
    return Math.max(0, Math.floor((safeDistance / safeSpeed) * 10));
}

function getActorAttackStaminaCost(actor) {
    const weapon = actor && actor.equipment && actor.equipment.weapon;
    const standardAttack = weapon && weapon.combat && weapon.combat.standard;
    const configuredCost = standardAttack ? standardAttack.staminaCost : actor && actor.attackStaminaCost;
    return Math.max(0, toWholeNumber(configuredCost, DEFAULT_ATTACK_STAMINA_COST));
}

function getActorHealStaminaCost(actor) {
    return Math.max(0, toWholeNumber(actor && actor.healStaminaCost, DEFAULT_HEAL_STAMINA_COST));
}

module.exports = {
    DEFAULT_ACTOR_MAX_STAMINA,
    DEFAULT_ATTACK_STAMINA_COST,
    DEFAULT_HEAL_STAMINA_COST,
    REST_STAMINA_RATIO,
    ensureActorStamina,
    getActorMaxStamina,
    getActorStamina,
    setActorStamina,
    canSpendActorStamina,
    spendActorStamina,
    recoverActorStamina,
    getMoveStaminaCost,
    getActorAttackStaminaCost,
    getActorHealStaminaCost
};
