// --- combatResolution.js ---
// One authoritative path for actor defeat and encounter victory.

const {
    TEAM_ENEMY,
    getEnemyActors,
    isActorAlive,
    syncCombatViews
} = require('./combatActors.js');
const {
    grantActorDefeatRewards,
    finalizeCombatVictory
} = require('./combatRewards.js');

function getDefeatSource(details = {}) {
    const sourceActor = details.sourceActor || null;
    return {
        uid: sourceActor ? sourceActor.uid : (details.sourceUid || null),
        name: sourceActor ? sourceActor.name : (details.sourceName || null),
        kind: sourceActor ? sourceActor.kind : (details.sourceKind || null),
        cause: details.cause || 'damage'
    };
}

function resolveActorDefeat(socketId, target, context, details = {}) {
    const { activePlayers, activeCombats } = context || {};
    const player = activePlayers && activePlayers[socketId];
    const combat = activeCombats && activeCombats[socketId];
    if (!player || !combat || !target) {
        return { combatComplete: false, resolved: false };
    }

    if (target.defeatResolved) {
        return {
            combatComplete: combat.victoryResolved === true,
            resolved: false,
            retreated: target.retreated === true,
            targetUid: target.uid
        };
    }

    target.hp = 0;
    target.alive = false;
    target.atbCharge = 0;
    target.defeatResolved = true;
    target.defeatedBy = getDefeatSource(details);

    if (target.deathBehavior === 'retreat') {
        target.retreated = true;
        syncCombatViews(combat, player);
        return {
            combatComplete: false,
            resolved: true,
            retreated: true,
            targetUid: target.uid
        };
    }

    let reward = null;
    if (target.teamId === TEAM_ENEMY && target.rewardsEligible !== false) {
        reward = grantActorDefeatRewards(socketId, target, context);
    }

    const enemies = getEnemyActors(combat);
    const combatComplete = enemies.length > 0 && enemies.every(enemy => !isActorAlive(enemy));

    if (combatComplete) {
        combat.victoryResolved = true;
        const victory = finalizeCombatVictory(socketId, context);
        return {
            combatComplete: true,
            resolved: true,
            retreated: false,
            targetUid: target.uid,
            reward,
            victory
        };
    }

    syncCombatViews(combat, player);
    return {
        combatComplete: false,
        resolved: true,
        retreated: false,
        targetUid: target.uid,
        reward
    };
}

module.exports = {
    resolveActorDefeat
};
