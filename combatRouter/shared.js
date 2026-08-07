// Cross-domain combat primitives shared by the socket handler factories.

const {
    getGridDistance,
    checkLineOfSight,
    getEffectiveStat,
    getMaxHp
} = require('../combatMath.js');
const { getActorStamina: getActorStaminaValue } = require('../combatResources.js');
const { ensureActionTurn, consumeAction } = require('../combatTurns.js');
const { interruptActorIntent } = require('../combatIntents.js');
const { beginCombatPlayback } = require('../combatPlayback.js');
const {
    syncCombatViews,
    getHostileActorsFor,
    isActorAlive,
    isPlayerActor,
    getOccupiedTileKeys
} = require('../combatActors.js');
const {
    PARTY_PLAYER,
    CONTROL_MANUAL,
    getActivePartyActor,
    clearActivePartyActor
} = require('../combatParties.js');

function getCombatTurnActor(combat, player) {
    syncCombatViews(combat, player);
    const actor = getActivePartyActor(combat, {
        partyId: PARTY_PLAYER,
        controlMode: CONTROL_MANUAL,
        isEligible: isActorAlive
    });
    return actor && ensureActionTurn(combat, actor.uid) ? actor : null;
}

function getActorStatValue(actor, player, statKey) {
    if (isPlayerActor(actor)) return getEffectiveStat(player, statKey);
    return Math.max(1, Math.trunc(Number(actor[statKey]) || 1));
}

function getActorMaxHpValue(actor, player) {
    return isPlayerActor(actor) ? getMaxHp(player) : (actor.maxHp || actor.hp || 1);
}

function getActorAttackTargets(combat, actor) {
    return getHostileActorsFor(actor, combat).filter(target => target.targetableByPlayer !== false);
}

function hasLineOfSightToActorFootprint(originX, originY, target, combat) {
    if (!target) return false;
    const targetSize = Math.max(1, Math.trunc(Number(target.size) || 1));
    for (let x = target.x; x < target.x + targetSize; x++) {
        for (let y = target.y; y < target.y + targetSize; y++) {
            if (checkLineOfSight(originX, originY, x, y, combat)) return true;
        }
    }
    return false;
}

function emitAnimatedCombatResult(socket, combat, payload) {
    const result = {
        ...payload,
        turnSequence: Number.isSafeInteger(combat && combat.turnSequence)
            ? combat.turnSequence
            : 0
    };
    if (combat && payload.combatComplete !== true) {
        result.playbackId = beginCombatPlayback(combat);
    }
    return socket.emit('combatResult', result);
}

function finishPlayerControlledTurn(combat, player, actor) {
    if (!actor) return;
    actor.atbCharge = 0;
    if (isPlayerActor(actor) && combat.player) combat.player.atbCharge = 0;
    clearActivePartyActor(combat, actor.uid);
    syncCombatViews(combat, player);
}

function completePlayerControlledAction(combat, player, actor) {
    const actionResult = consumeAction(combat, actor && actor.uid);
    if (!actionResult.consumed) return actionResult;
    if (actionResult.turnComplete) finishPlayerControlledTurn(combat, player, actor);
    else syncCombatViews(combat, player);
    return actionResult;
}

function commitPlayerControlledAction(combat, player, actor, rules = {}) {
    if (rules && rules.endsTurn === true) {
        finishPlayerControlledTurn(combat, player, actor);
        return { consumed: true, actionsRemaining: 0, turnComplete: true };
    }
    return completePlayerControlledAction(combat, player, actor);
}

function getReactionMissDetails(reaction) {
    if (!reaction || !reaction.state) return null;
    if (reaction.type === 'shield_block') {
        return {
            deflectReason: 'shield_block',
            guarded: true,
            guardActionId: reaction.state.actionId || 'shield_block',
            guardEquipmentSlot: reaction.state.equipmentSlot || 'offhand',
            guardItemId: reaction.state.itemId || null
        };
    }
    if (reaction.type === 'evade') {
        return {
            deflectReason: 'evade_stance',
            evaded: true,
            reactionActionId: reaction.state.actionId || 'evasive_feint',
            reactionEquipmentSlot: reaction.state.equipmentSlot || 'weapon',
            reactionItemId: reaction.state.itemId || null
        };
    }
    return null;
}

function interruptTargetIntent(target, sourceActor, combatRules, damage) {
    return interruptActorIntent(target, {
        damage,
        sourceActor,
        interruptsIntent: combatRules && combatRules.interruptsIntent === true,
        reason: combatRules && combatRules.interruptsIntent === true
            ? 'equipment_disruption'
            : 'direct_damage'
    });
}

function rollAreaWeaponDamage(baseDamage, target, player, ignoresDefense) {
    const maximumDamage = Math.max(1, Math.floor(Number(baseDamage) || 0));
    const minimumDamage = Math.max(1, Math.ceil(maximumDamage * 0.85));
    const rolledDamage = Math.floor(
        Math.random() * (maximumDamage - minimumDamage + 1)
    ) + minimumDamage;
    const targetDefense = ignoresDefense === true
        ? 0
        : getActorStatValue(target, player, 'defense');
    const armorAbsorption = Math.floor(
        Math.pow(Math.random(), 2) * targetDefense
    );
    const damage = Math.max(1, rolledDamage - armorAbsorption);
    return {
        damage,
        isCrit: damage >= Math.floor(maximumDamage * 0.95)
    };
}

function getCardinalRetreatTile(combat, actor, threat) {
    if (!combat || !actor || !threat) return null;
    const cols = Math.max(1, Number(combat.gridSize && combat.gridSize.cols) || 1);
    const rows = Math.max(1, Number(combat.gridSize && combat.gridSize.rows) || 1);
    const occupied = getOccupiedTileKeys(combat, actor.uid);
    const currentDistance = getGridDistance(
        actor.x,
        actor.y,
        threat.x,
        threat.y,
        threat.size || 1
    );
    return [
        { x: actor.x + 1, y: actor.y },
        { x: actor.x - 1, y: actor.y },
        { x: actor.x, y: actor.y + 1 },
        { x: actor.x, y: actor.y - 1 }
    ]
        .filter(tile => (
            tile.x >= 0
            && tile.x < cols
            && tile.y >= 0
            && tile.y < rows
            && !occupied.has(`${tile.x},${tile.y}`)
            && getGridDistance(
                tile.x,
                tile.y,
                threat.x,
                threat.y,
                threat.size || 1
            ) > currentDistance
        ))
        .sort((left, right) => (
            getGridDistance(
                right.x,
                right.y,
                threat.x,
                threat.y,
                threat.size || 1
            ) - getGridDistance(
                left.x,
                left.y,
                threat.x,
                threat.y,
                threat.size || 1
            )
        ))[0] || null;
}

function repositionActorAway(combat, actor, threat, distance) {
    const steps = Math.max(0, Math.trunc(Number(distance) || 0));
    if (!steps) return null;
    const from = { x: actor.x, y: actor.y };
    for (let step = 0; step < steps; step++) {
        const tile = getCardinalRetreatTile(combat, actor, threat);
        if (!tile) break;
        actor.x = tile.x;
        actor.y = tile.y;
        if (isPlayerActor(actor) && combat.player) {
            combat.player.x = actor.x;
            combat.player.y = actor.y;
        }
    }
    if (actor.x === from.x && actor.y === from.y) return null;
    return { fromX: from.x, fromY: from.y, x: actor.x, y: actor.y };
}

function emitCombatResultError(
    socket,
    player,
    combat,
    actor,
    message,
    details = {}
) {
    const updatedCombatState = combat && player
        ? syncCombatViews(combat, player)
        : null;
    const activeActor = actor || (
        updatedCombatState
        && Array.isArray(updatedCombatState.actors)
        && updatedCombatState.actors.find(candidate => (
            candidate
            && candidate.uid === updatedCombatState.activeActorUid
        ))
    ) || null;
    const newStamina = activeActor && player
        ? getActorStaminaValue(activeActor, player)
        : (
            player && Number.isFinite(Number(player.stamina))
                ? Number(player.stamina)
                : 0
        );
    return socket.emit('combatResult', {
        type: 'error',
        message,
        newStamina,
        updatedCombatState,
        ...details
    });
}

module.exports = {
    getCombatTurnActor,
    getActorStatValue,
    getActorMaxHpValue,
    getActorAttackTargets,
    hasLineOfSightToActorFootprint,
    emitAnimatedCombatResult,
    finishPlayerControlledTurn,
    completePlayerControlledAction,
    commitPlayerControlledAction,
    getReactionMissDetails,
    interruptTargetIntent,
    rollAreaWeaponDamage,
    repositionActorAway,
    emitCombatResultError
};
