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
            targetShape: 'line',
            range: 5,
            effectType: 'area_damage',
            hazardType: 'fire',
            hazardous: true,
            effectSummary: 'Damages every opposing actor left in the marked line.',
            accessibilityLabel: 'Hedge Fire. A marked line attack. Damage the caster to interrupt it, evade, or leave the marked tiles.',
            targetingMode: 'locked_tiles',
            powerful: true,
            damageMultiplier: 1.5,
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
    chapter_one_shield_captain: {
        id: 'chapter_one_shield_captain',
        role: 'captain',
        guard: {
            every: 3,
            staminaCost: 5,
            label: 'Hold the Line',
            effectSummary: 'Raises a shield that blocks the next blockable attack.',
            accessibilityLabel: 'Hold the Line. The captain is defending and will block the next blockable attack.'
        },
        intents: [
            {
                actionId: 'captains_bash',
                label: "Captain's Bash",
                clipId: 'shield_bash',
                targetShape: 'single',
                effectType: 'single_damage',
                effectSummary: 'A committed shield strike against the marked target.',
                accessibilityLabel: "Captain's Bash. One marked target. Block, evade, interrupt, or move away.",
                targetingMode: 'locked_tiles',
                powerful: true,
                damageMultiplier: 1.25,
                interruptible: true,
                blockable: true,
                evadable: true,
                repositionable: true,
                counterplay: ['interrupt', 'block', 'evade', 'reposition']
            },
            {
                actionId: 'sweeping_rebuke',
                label: 'Sweeping Rebuke',
                clipId: 'slash',
                targetShape: 'radius',
                radius: 1,
                effectType: 'area_damage',
                effectSummary: 'Strikes every opposing actor left in the marked 3 by 3 area.',
                accessibilityLabel: 'Sweeping Rebuke. A marked 3 by 3 area attack. Block, evade, interrupt, or leave the marked tiles.',
                targetingMode: 'locked_tiles',
                powerful: true,
                damageMultiplier: 1.1,
                interruptible: true,
                blockable: true,
                evadable: true,
                repositionable: true,
                counterplay: ['interrupt', 'block', 'evade', 'reposition']
            }
        ]
    },
    heavy_telegraph: {
        id: 'heavy_telegraph',
        role: 'heavy',
        intent: {
            actionId: 'crushing_swing',
            label: 'Crushing Swing',
            clipId: 'heavy',
            targetShape: 'single',
            effectType: 'single_damage',
            effectSummary: 'A crushing strike against the marked target.',
            accessibilityLabel: 'Crushing Swing. One marked target. Block, evade, or leave the marked tile.',
            targetingMode: 'locked_tiles',
            powerful: true,
            damageMultiplier: 1.5,
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
            actionId: 'reaping_strike',
            label: 'Reaping Strike',
            clipId: 'scythe',
            targetShape: 'single',
            effectType: 'single_damage',
            effectSummary: 'A committed scythe strike against the marked target.',
            accessibilityLabel: 'Reaping Strike. One marked target. Interrupt, block, evade, or leave the marked tile.',
            targetingMode: 'locked_tiles',
            powerful: true,
            damageMultiplier: 1.5,
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

function getCombatGridBounds(combat) {
    return {
        cols: Math.max(1, Math.trunc(Number(combat && combat.gridSize && combat.gridSize.cols) || 16)),
        rows: Math.max(1, Math.trunc(Number(combat && combat.gridSize && combat.gridSize.rows) || 10))
    };
}

function isIntentTileAvailable(combat, x, y) {
    const bounds = getCombatGridBounds(combat);
    if (x < 0 || x >= bounds.cols || y < 0 || y >= bounds.rows) return false;
    return !Array.isArray(combat && combat.obstacles) || !combat.obstacles.some(
        obstacle => obstacle && obstacle.x === x && obstacle.y === y
    );
}

function projectLineIntentTiles(combat, actor, target, range) {
    const tiles = [];
    let currentX = Math.trunc(Number(actor && actor.x) || 0);
    let currentY = Math.trunc(Number(actor && actor.y) || 0);
    const selectedTargetX = Math.trunc(Number(target && target.x) || 0);
    const selectedTargetY = Math.trunc(Number(target && target.y) || 0);
    const directionX = selectedTargetX - currentX;
    const directionY = selectedTargetY - currentY;
    const selectedDistance = Math.max(
        Math.abs(directionX),
        Math.abs(directionY)
    );
    if (selectedDistance <= 0) return getTargetFootprintTiles(target);
    const projectedRange = Math.max(
        selectedDistance,
        Math.trunc(Number(range) || selectedDistance)
    );
    const targetX = currentX + Math.round(
        (directionX / selectedDistance) * projectedRange
    );
    const targetY = currentY + Math.round(
        (directionY / selectedDistance) * projectedRange
    );
    const deltaX = Math.abs(targetX - currentX);
    const deltaY = Math.abs(targetY - currentY);
    const stepX = currentX < targetX ? 1 : -1;
    const stepY = currentY < targetY ? 1 : -1;
    let error = deltaX - deltaY;
    const bounds = getCombatGridBounds(combat);
    const safetyLimit = bounds.cols * bounds.rows;

    for (let step = 0; step < safetyLimit; step++) {
        if (currentX === targetX && currentY === targetY) break;
        const doubledError = 2 * error;
        if (doubledError > -deltaY) {
            error -= deltaY;
            currentX += stepX;
        }
        if (doubledError < deltaX) {
            error += deltaX;
            currentY += stepY;
        }
        if (!isIntentTileAvailable(combat, currentX, currentY)) break;
        tiles.push({ x: currentX, y: currentY });
    }
    return tiles;
}

function projectRadiusIntentTiles(combat, target, radius) {
    const tiles = [];
    const centerX = Math.trunc(Number(target && target.x) || 0);
    const centerY = Math.trunc(Number(target && target.y) || 0);
    const resolvedRadius = Math.max(0, Math.trunc(Number(radius) || 0));
    for (let x = centerX - resolvedRadius; x <= centerX + resolvedRadius; x++) {
        for (let y = centerY - resolvedRadius; y <= centerY + resolvedRadius; y++) {
            if (isIntentTileAvailable(combat, x, y)) tiles.push({ x, y });
        }
    }
    return tiles;
}

function projectIntentTargetTiles(combat, actor, target, intentProfile = {}) {
    const targetShape = String(intentProfile.targetShape || 'single').toLowerCase();
    if (targetShape === 'line') {
        const lineTiles = projectLineIntentTiles(
            combat,
            actor,
            target,
            intentProfile.range || (actor && actor.attackRange)
        );
        return lineTiles.length > 0 ? lineTiles : getTargetFootprintTiles(target);
    }
    if (targetShape === 'radius') {
        return projectRadiusIntentTiles(combat, target, intentProfile.radius);
    }
    return getTargetFootprintTiles(target).filter(tile => (
        isIntentTileAvailable(combat, tile.x, tile.y)
    ));
}

function cloneIntentTiles(tiles) {
    return Array.isArray(tiles)
        ? tiles.map(tile => ({ x: tile.x, y: tile.y }))
        : [];
}

function cloneIntent(intent) {
    if (!intent || typeof intent !== 'object') return null;
    return {
        ...intent,
        targetTiles: cloneIntentTiles(intent.targetTiles),
        affectedTiles: cloneIntentTiles(intent.affectedTiles),
        hazardTiles: cloneIntentTiles(intent.hazardTiles),
        counterplay: Array.isArray(intent.counterplay)
            ? [...intent.counterplay]
            : []
    };
}

function prepareActorIntent(combat, actor, target, intentProfile) {
    if (!combat || !actor || !target || !intentProfile) return null;
    const configuredDamageMultiplier = Number(intentProfile.damageMultiplier);
    const targetShape = ['single', 'line', 'radius'].includes(
        String(intentProfile.targetShape || '').toLowerCase()
    )
        ? String(intentProfile.targetShape).toLowerCase()
        : 'single';
    const targetTiles = projectIntentTargetTiles(
        combat,
        actor,
        target,
        { ...intentProfile, targetShape }
    );
    const counterplay = Array.isArray(intentProfile.counterplay)
        ? [...intentProfile.counterplay]
        : [];
    const effectSummary = String(
        intentProfile.effectSummary || 'Damages the marked target.'
    );
    const label = String(
        intentProfile.label || actor.name || 'Telegraphed Attack'
    );
    const intent = {
        intentId: getNextIntentId(combat, actor),
        actionId: String(intentProfile.actionId || 'telegraphed_attack'),
        label,
        clipId: String(intentProfile.clipId || 'slash'),
        sourceUid: actor.uid,
        targetUid: target.uid,
        targetX: Number(target.x) || 0,
        targetY: Number(target.y) || 0,
        targetShape,
        radius: targetShape === 'radius'
            ? Math.max(0, Math.trunc(Number(intentProfile.radius) || 0))
            : 0,
        targetTiles,
        affectedTiles: cloneIntentTiles(targetTiles),
        hazardTiles: intentProfile.hazardous === true
            ? cloneIntentTiles(targetTiles)
            : [],
        affectedTileCount: targetTiles.length,
        effectType: String(intentProfile.effectType || 'single_damage'),
        effectSummary,
        hazardType: intentProfile.hazardType
            ? String(intentProfile.hazardType)
            : null,
        hazardous: intentProfile.hazardous === true,
        accessibilityLabel: String(
            intentProfile.accessibilityLabel
            || `${label}. ${effectSummary}${counterplay.length > 0 ? ` Counterplay: ${counterplay.join(', ')}.` : ''}`
        ),
        targetingMode: intentProfile.targetingMode === 'tracked_actor'
            ? 'tracked_actor'
            : 'locked_tiles',
        powerful: intentProfile.powerful === true,
        damageMultiplier: Number.isFinite(configuredDamageMultiplier)
            ? Math.max(1, configuredDamageMultiplier)
            : 1,
        interruptible: intentProfile.interruptible === true,
        blockable: intentProfile.blockable !== false,
        evadable: intentProfile.evadable !== false,
        repositionable: intentProfile.repositionable !== false,
        counterplay,
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
        targetShape: snapshot.targetShape,
        affectedTiles: cloneIntentTiles(snapshot.affectedTiles),
        effectSummary: snapshot.effectSummary,
        accessibilityLabel: snapshot.accessibilityLabel,
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
    projectIntentTargetTiles,
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
