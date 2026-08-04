// --- combatIntents.js ---
// Server-owned AI roles, telegraphed-action state, and reaction defenses.
// Visual profiles deliberately do not participate in these decisions.

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
}

const DEFAULT_AI_PROFILE = deepFreeze({
    id: 'melee_pursuer',
    role: 'melee'
});

const AI_PROFILE_CATALOG = deepFreeze({
    melee_pursuer: DEFAULT_AI_PROFILE,
    polearm_pursuer: {
        id: 'polearm_pursuer',
        role: 'melee'
    },
    agile_duelist: {
        id: 'agile_duelist',
        role: 'melee'
    },
    ranged_skirmisher: {
        id: 'ranged_skirmisher',
        role: 'ranged',
        preferredMinRange: 3
    },
    telegraph_caster: {
        id: 'telegraph_caster',
        role: 'channel',
        preferredMinRange: 3,
        intent: {
            actionId: 'hedge_fire',
            label: 'Hedge Fire',
            clipId: 'cast',
            targetingMode: 'locked_tiles',
            powerful: true,
            interruptible: true,
            blockable: false,
            evadable: true,
            repositionable: true,
            counterplay: ['interrupt', 'evade', 'reposition']
        }
    },
    shield_guard: {
        id: 'shield_guard',
        role: 'defender',
        guard: {
            every: 2,
            staminaCost: 5
        }
    },
    heavy_telegraph: {
        id: 'heavy_telegraph',
        role: 'heavy',
        intent: {
            actionId: 'crushing_swing',
            label: 'Crushing Swing',
            clipId: 'heavy',
            targetingMode: 'locked_tiles',
            powerful: true,
            interruptible: false,
            blockable: true,
            evadable: true,
            repositionable: true,
            counterplay: ['block', 'evade', 'reposition']
        }
    },
    scythe_telegraph: {
        id: 'scythe_telegraph',
        role: 'heavy',
        intent: {
            actionId: 'reaping_sweep',
            label: 'Reaping Sweep',
            clipId: 'scythe',
            targetingMode: 'locked_tiles',
            powerful: true,
            interruptible: true,
            blockable: true,
            evadable: true,
            repositionable: true,
            counterplay: ['interrupt', 'block', 'evade', 'reposition']
        }
    }
});

function getActorAiProfile(actor) {
    const profileId = actor && typeof actor.aiProfileId === 'string'
        ? actor.aiProfileId
        : DEFAULT_AI_PROFILE.id;
    return AI_PROFILE_CATALOG[profileId] || DEFAULT_AI_PROFILE;
}

function getNextIntentId(combat, actor) {
    const current = Math.max(0, Math.trunc(Number(combat && combat.nextIntentId) || 0));
    const next = current >= Number.MAX_SAFE_INTEGER ? 1 : current + 1;
    if (combat) combat.nextIntentId = next;
    return `intent_${String(actor && actor.uid || 'actor')}_${next}`;
}

function getTargetFootprintTiles(target) {
    if (!target) return [];
    const size = Math.max(1, Math.trunc(Number(target.size) || 1));
    const tiles = [];
    for (let x = target.x; x < target.x + size; x++) {
        for (let y = target.y; y < target.y + size; y++) {
            tiles.push({ x, y });
        }
    }
    return tiles;
}

function cloneIntent(intent) {
    if (!intent || typeof intent !== 'object') return null;
    return {
        ...intent,
        targetTiles: Array.isArray(intent.targetTiles)
            ? intent.targetTiles.map(tile => ({ x: tile.x, y: tile.y }))
            : [],
        counterplay: Array.isArray(intent.counterplay)
            ? [...intent.counterplay]
            : []
    };
}

function prepareActorIntent(combat, actor, target, intentProfile) {
    if (!combat || !actor || !target || !intentProfile) return null;
    const intent = {
        intentId: getNextIntentId(combat, actor),
        actionId: String(intentProfile.actionId || 'telegraphed_attack'),
        label: String(intentProfile.label || actor.name || 'Powerful Attack'),
        clipId: String(intentProfile.clipId || 'slash'),
        sourceUid: actor.uid,
        targetUid: target.uid,
        targetX: Number(target.x) || 0,
        targetY: Number(target.y) || 0,
        targetTiles: getTargetFootprintTiles(target),
        targetingMode: intentProfile.targetingMode === 'tracked_actor'
            ? 'tracked_actor'
            : 'locked_tiles',
        powerful: intentProfile.powerful === true,
        interruptible: intentProfile.interruptible === true,
        blockable: intentProfile.blockable !== false,
        evadable: intentProfile.evadable !== false,
        repositionable: intentProfile.repositionable !== false,
        counterplay: Array.isArray(intentProfile.counterplay)
            ? [...intentProfile.counterplay]
            : [],
        createdTurnSequence: Number.isSafeInteger(combat.turnSequence)
            ? Math.max(0, combat.turnSequence)
            : 0
    };
    actor.pendingIntent = intent;
    return cloneIntent(intent);
}

function getPendingActorIntent(actor) {
    return actor && actor.pendingIntent && typeof actor.pendingIntent === 'object'
        ? actor.pendingIntent
        : null;
}

function canResolveActorIntent(combat, actor) {
    const intent = getPendingActorIntent(actor);
    if (!intent) return false;
    const currentSequence = Number.isSafeInteger(combat && combat.turnSequence)
        ? Math.max(0, combat.turnSequence)
        : 0;
    const createdSequence = Number.isSafeInteger(intent.createdTurnSequence)
        ? Math.max(0, intent.createdTurnSequence)
        : 0;
    return currentSequence > createdSequence;
}

function actorOccupiesIntentTiles(actor, intent) {
    if (!actor || !intent || !Array.isArray(intent.targetTiles)) return false;
    const marked = new Set(intent.targetTiles.map(tile => `${tile.x},${tile.y}`));
    return getTargetFootprintTiles(actor).some(tile => marked.has(`${tile.x},${tile.y}`));
}

function consumeActorIntent(actor) {
    const intent = getPendingActorIntent(actor);
    if (!intent) return null;
    delete actor.pendingIntent;
    return cloneIntent(intent);
}

function clearActorIntent(actor) {
    if (!getPendingActorIntent(actor)) return false;
    delete actor.pendingIntent;
    return true;
}

function interruptActorIntent(actor, details = {}) {
    const intent = getPendingActorIntent(actor);
    const forced = details.force === true || details.interruptsIntent === true;
    if (!intent || (intent.interruptible !== true && !forced)) return null;
    const damage = Math.max(0, Number(details.damage) || 0);
    if (damage <= 0 && !forced) return null;
    if (details.damageOverTime === true && !forced) return null;

    delete actor.pendingIntent;
    const sourceActor = details.sourceActor || null;
    return {
        ...cloneIntent(intent),
        interrupted: true,
        interruptionReason: details.reason || 'damage',
        interruptedByUid: sourceActor ? sourceActor.uid : (details.sourceUid || null),
        interruptedByName: sourceActor ? sourceActor.name : (details.sourceName || null)
    };
}

function consumeReactionState(target, property, acceptedType) {
    const state = target && target[property];
    const acceptedTypes = Array.isArray(acceptedType)
        ? acceptedType
        : [acceptedType];
    if (
        !state
        || !acceptedTypes.includes(state.type)
        || Math.max(0, Math.trunc(Number(state.charges) || 0)) < 1
    ) {
        return null;
    }
    const consumed = { ...state };
    const remaining = Math.max(0, Math.trunc(Number(state.charges) || 0) - 1);
    if (remaining > 0) target[property] = { ...state, charges: remaining };
    else delete target[property];
    return consumed;
}

function consumeActorReaction(target, options = {}) {
    if (options.blockable !== false) {
        const guard = consumeReactionState(target, 'guardState', 'shield_block');
        if (guard) return { type: 'shield_block', state: guard };
    }
    if (options.evadable !== false) {
        const evasion = consumeReactionState(
            target,
            'evasionState',
            ['evade', 'evasion']
        );
        if (evasion) return { type: 'evade', state: evasion };
    }
    return null;
}

function clearExpiredActorReactions(actor) {
    if (!actor) return false;
    const hadReaction = Boolean(actor.guardState || actor.evasionState);
    delete actor.guardState;
    delete actor.evasionState;
    return hadReaction;
}

function createIntentEvent(actor, intent) {
    const snapshot = cloneIntent(intent);
    return {
        type: 'intent',
        uid: actor.uid,
        actorId: actor.id,
        name: actor.name,
        clipId: snapshot.clipId,
        intent: snapshot
    };
}

function createIntentOutcomeEvent(actor, intent, outcome, details = {}) {
    return {
        type: 'intentOutcome',
        uid: actor && actor.uid,
        actorId: actor && actor.id,
        name: actor && actor.name,
        outcome,
        intent: cloneIntent(intent),
        ...details
    };
}

module.exports = {
    AI_PROFILE_CATALOG,
    DEFAULT_AI_PROFILE,
    getActorAiProfile,
    getTargetFootprintTiles,
    prepareActorIntent,
    getPendingActorIntent,
    canResolveActorIntent,
    actorOccupiesIntentTiles,
    consumeActorIntent,
    clearActorIntent,
    interruptActorIntent,
    consumeActorReaction,
    clearExpiredActorReactions,
    createIntentEvent,
    createIntentOutcomeEvent
};
