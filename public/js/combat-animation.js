// Shared battlefield timing for side-facing player actions and their hit events.

const COMBAT_ANIMATION_EVENT_TYPES = Object.freeze({
    slash: 'contact',
    bash: 'contact',
    shoot: 'release',
    cast: 'release'
});

const COMBAT_ANIMATION_FALLBACK_CLIPS = Object.freeze({
    idle: Object.freeze({
        fps: 2,
        loop: true,
        actionFrame: null,
        frames: Object.freeze(['idle_a', 'idle_b'])
    }),
    walk: Object.freeze({
        fps: 7,
        loop: true,
        actionFrame: null,
        frames: Object.freeze(['walk_a', 'walk_b', 'walk_c', 'walk_d'])
    }),
    slash: Object.freeze({
        fps: 8,
        loop: false,
        actionFrame: 2,
        frames: Object.freeze(['slash_a', 'slash_b', 'slash_c', 'slash_d'])
    }),
    bash: Object.freeze({
        fps: 7,
        loop: false,
        actionFrame: 2,
        frames: Object.freeze(['bash_a', 'bash_b', 'bash_c', 'bash_d'])
    }),
    shoot: Object.freeze({
        fps: 7,
        loop: false,
        actionFrame: 3,
        frames: Object.freeze(['shoot_a', 'shoot_b', 'shoot_c', 'shoot_d'])
    }),
    cast: Object.freeze({
        fps: 6,
        loop: false,
        actionFrame: 3,
        frames: Object.freeze(['cast_a', 'cast_b', 'cast_c', 'cast_d'])
    })
});

function getCombatAnimationClipDefinition(clipId) {
    const registry = typeof SidePlayerAnimationClips !== 'undefined'
        ? SidePlayerAnimationClips
        : COMBAT_ANIMATION_FALLBACK_CLIPS;
    return registry[clipId] || registry.idle;
}

function getCombatAnimationNow() {
    if (
        typeof performance !== 'undefined'
        && typeof performance.now === 'function'
    ) {
        return performance.now();
    }
    return Date.now();
}

function getCombatAnimationActorUid(actor) {
    if (!actor) return null;
    if (actor.uid) return String(actor.uid);
    if (actor.kind === 'player' || actor === globalThis.player) {
        return 'player_0';
    }
    return null;
}

function getCombatAnimationTimeline(clipId) {
    const clip = getCombatAnimationClipDefinition(clipId);
    const frameDurationMs = 1000 / Math.max(1, Number(clip.fps) || 1);
    const actionFrame = Number.isInteger(clip.actionFrame)
        ? clip.actionFrame
        : null;

    return {
        clipId: Object.prototype.hasOwnProperty.call(
            COMBAT_ANIMATION_EVENT_TYPES,
            clipId
        ) ? clipId : 'idle',
        eventType: COMBAT_ANIMATION_EVENT_TYPES[clipId] || null,
        frameDurationMs,
        frameCount: clip.frames.length,
        actionFrame,
        actionTimeMs: actionFrame === null
            ? null
            : actionFrame * frameDurationMs,
        durationMs: clip.frames.length * frameDurationMs,
        loop: clip.loop === true
    };
}

function getCombatWeaponAnimationStyle(weapon) {
    if (!weapon) return '';
    if (
        weapon.spriteId
        && typeof EquipmentOverhaulSpecs !== 'undefined'
        && EquipmentOverhaulSpecs.weapon
        && EquipmentOverhaulSpecs.weapon[weapon.spriteId]
    ) {
        return EquipmentOverhaulSpecs.weapon[weapon.spriteId].style || '';
    }

    return [
        weapon.type,
        weapon.weaponType,
        weapon.name,
        weapon.spriteId
    ].filter(Boolean).join(' ').toLowerCase();
}

function resolveCombatAnimationClip(options = {}) {
    if (options.source === 'spell' || options.actionType === 'spell') {
        return 'cast';
    }
    if (options.isProjectile || (options.weapon && options.weapon.projectileSprite)) {
        return 'shoot';
    }

    const animType = String(options.animType || '').toLowerCase();
    if (animType.includes('bash') || animType.includes('smash')) return 'bash';
    if (animType.includes('slash')) return 'slash';

    const style = getCombatWeaponAnimationStyle(options.weapon);
    if (style.includes('bow') || style.includes('crossbow')) return 'shoot';
    if (style.includes('staff') || style.includes('wand')) return 'cast';

    const bashStyles = [
        'club',
        'greatclub',
        'mace',
        'maul',
        'knuckle',
        'tankard'
    ];
    if (bashStyles.some(value => style.includes(value))) return 'bash';
    return 'slash';
}

function getCombatAnimationReleaseOrigin(
    actor,
    clipId,
    frameIndex,
    facing = 'right'
) {
    if (
        !actor
        || typeof getSidePlayerAnimationFrame !== 'function'
    ) {
        return {
            x: Number(actor && actor.x) || 0,
            y: Number(actor && actor.y) || 0
        };
    }

    const gender = (
        actor.appearance
        && actor.appearance.gender === 'female'
    ) ? 'female' : 'male';
    const frame = getSidePlayerAnimationFrame(
        gender,
        clipId,
        frameIndex
    );
    const weapon = frame.pose.weapon || {};
    let anchor = frame.anchors.weaponHand;

    if (clipId === 'shoot') {
        anchor = weapon.arrowTip || weapon.grip || anchor;
    } else if (clipId === 'cast') {
        anchor = weapon.top || weapon.grip || anchor;
    }

    const gridSize = typeof SIDE_PLAYER_ANIMATION_SIZE === 'number'
        ? SIDE_PLAYER_ANIMATION_SIZE
        : 32;
    const anchorX = facing === 'left'
        ? gridSize - 1 - anchor[0]
        : anchor[0];
    const actorSize = Math.max(1, Number(actor.size) || 1);

    return {
        x: (Number(actor.x) || 0)
            + ((anchorX + 0.5) / gridSize) * actorSize
            - 0.5,
        y: (Number(actor.y) || 0)
            + ((anchor[1] + 0.5) / gridSize) * actorSize
            - 0.5
    };
}

function createCombatPlaybackBarrier(onFinished) {
    let actionComplete = false;
    let impactComplete = false;
    let finished = false;

    function finishWhenReady() {
        if (finished || !actionComplete || !impactComplete) return;
        finished = true;
        onFinished();
    }

    return Object.freeze({
        markActionComplete() {
            actionComplete = true;
            finishWhenReady();
        },
        markImpactComplete() {
            impactComplete = true;
            finishWhenReady();
        }
    });
}

const CombatSpriteAnimation = (() => {
    const actions = new Map();
    const facings = new Map();
    const movement = new Map();

    function resolveFacing(actor, targetX, fallback = 'right') {
        const uid = getCombatAnimationActorUid(actor);
        const remembered = uid ? facings.get(uid) : null;
        const actorCenterX = Number(actor && actor.x) + (
            Math.max(1, Number(actor && actor.size) || 1) / 2
        );
        const numericTargetX = Number(targetX);

        if (Number.isFinite(actorCenterX) && Number.isFinite(numericTargetX)) {
            if (numericTargetX < actorCenterX) return 'left';
            if (numericTargetX > actorCenterX) return 'right';
        }
        return remembered || fallback;
    }

    function rememberFacing(actor, facing) {
        const uid = getCombatAnimationActorUid(actor);
        if (!uid) return facing === 'left' ? 'left' : 'right';
        const resolved = facing === 'left' ? 'left' : 'right';
        facings.set(uid, resolved);
        if (actor) actor.combatFacing = resolved;
        return resolved;
    }

    function faceActorToward(actor, targetX) {
        return rememberFacing(actor, resolveFacing(actor, targetX));
    }

    function updateActionState(state, now) {
        const elapsedMs = Math.max(0, now - state.startTime);
        state.elapsedMs = elapsedMs;
        state.progress = Math.min(1, elapsedMs / state.timeline.durationMs);

        if (
            !state.eventFired
            && state.timeline.actionTimeMs !== null
            && elapsedMs >= state.timeline.actionTimeMs
        ) {
            state.eventFired = true;
            if (typeof state.onEvent === 'function') {
                state.onEvent({
                    actor: state.actor,
                    clipId: state.clipId,
                    eventType: state.timeline.eventType,
                    frameIndex: state.timeline.actionFrame,
                    facing: state.facing,
                    targetX: state.targetX,
                    targetY: state.targetY,
                    releaseOrigin: getCombatAnimationReleaseOrigin(
                        state.actor,
                        state.clipId,
                        state.timeline.actionFrame,
                        state.facing
                    )
                });
            }
        }

        if (elapsedMs < state.timeline.durationMs) return;

        actions.delete(state.uid);
        state.completed = true;
        if (state.actor) {
            state.actor.lungeOffsetX = 0;
            state.actor.lungeOffsetY = 0;
            state.actor.lungeHop = 0;
        }
        if (typeof state.onComplete === 'function') {
            state.onComplete({
                actor: state.actor,
                clipId: state.clipId,
                facing: state.facing
            });
        }
    }

    function update(now = getCombatAnimationNow()) {
        const resolvedNow = Number.isFinite(now)
            ? now
            : getCombatAnimationNow();
        Array.from(actions.values()).forEach(state => {
            updateActionState(state, resolvedNow);
        });
    }

    function startAction(actor, options = {}) {
        const uid = getCombatAnimationActorUid(actor);
        if (!uid) return null;

        const clipId = Object.prototype.hasOwnProperty.call(
            COMBAT_ANIMATION_EVENT_TYPES,
            options.clipId
        ) ? options.clipId : resolveCombatAnimationClip(options);
        const timeline = getCombatAnimationTimeline(clipId);
        const startTime = Number.isFinite(options.startTime)
            ? options.startTime
            : getCombatAnimationNow();
        const facing = rememberFacing(
            actor,
            resolveFacing(actor, options.targetX, options.facing)
        );
        const state = {
            uid,
            actor,
            clipId,
            timeline,
            startTime,
            elapsedMs: 0,
            progress: 0,
            eventFired: false,
            completed: false,
            facing,
            targetX: Number(options.targetX),
            targetY: Number(options.targetY),
            lift: options.lift === true,
            onEvent: options.onEvent || options.onAction || null,
            onComplete: options.onComplete || null
        };

        actions.set(uid, state);
        movement.delete(uid);
        return state;
    }

    function getActionState(actor) {
        const uid = getCombatAnimationActorUid(actor);
        return uid ? actions.get(uid) || null : null;
    }

    function getRenderState(actor, options = {}) {
        const uid = getCombatAnimationActorUid(actor);
        const now = Number.isFinite(options.now)
            ? options.now
            : getCombatAnimationNow();
        const action = uid ? actions.get(uid) : null;

        if (action) {
            updateActionState(action, now);
            const current = actions.get(uid);
            if (current) {
                const frameIndex = Math.min(
                    current.timeline.frameCount - 1,
                    Math.floor(current.elapsedMs / current.timeline.frameDurationMs)
                );
                return {
                    clipId: current.clipId,
                    frameIndex,
                    facing: current.facing,
                    isAction: true,
                    progress: current.progress
                };
            }
        }

        const deltaX = Number(options.deltaX) || 0;
        const isMoving = options.isMoving === true;
        if (isMoving && Math.abs(deltaX) > 0.001) {
            rememberFacing(actor, deltaX < 0 ? 'left' : 'right');
        }

        const facing = uid
            ? (facings.get(uid) || rememberFacing(actor, 'right'))
            : 'right';
        const clipId = isMoving ? 'walk' : 'idle';
        const timeline = getCombatAnimationTimeline(clipId);
        let movementState = uid ? movement.get(uid) : null;

        if (isMoving) {
            if (!movementState || movementState.clipId !== 'walk') {
                movementState = { clipId: 'walk', startTime: now };
                if (uid) movement.set(uid, movementState);
            }
        } else {
            if (uid) movement.delete(uid);
            movementState = { clipId: 'idle', startTime: 0 };
        }

        const elapsedMs = Math.max(0, now - movementState.startTime);
        return {
            clipId,
            frameIndex: Math.floor(
                elapsedMs / timeline.frameDurationMs
            ) % timeline.frameCount,
            facing,
            isAction: false,
            progress: 0
        };
    }

    function getLungeOffset(actor, tileSize) {
        const state = getActionState(actor);
        if (!state || !['slash', 'bash'].includes(state.clipId)) {
            return { x: 0, y: 0, hop: 0 };
        }

        const actorX = Number(actor && actor.x) || 0;
        const actorY = Number(actor && actor.y) || 0;
        const dx = Number.isFinite(state.targetX)
            ? state.targetX - actorX
            : 0;
        const dy = Number.isFinite(state.targetY)
            ? state.targetY - actorY
            : 0;
        const distance = Math.hypot(dx, dy) || 1;
        const lungeWave = Math.sin(Math.min(1, state.progress) * Math.PI);
        const reach = Math.min(
            Math.max(1, Number(tileSize) || 1) * 0.28,
            distance * (Number(tileSize) || 1) * 0.16
        ) * lungeWave;

        return {
            x: (dx / distance) * reach,
            y: (dy / distance) * reach,
            hop: state.lift ? lungeWave * (Number(tileSize) || 1) * 0.22 : 0
        };
    }

    function clear(actor = null) {
        if (!actor) {
            actions.clear();
            facings.clear();
            movement.clear();
            return;
        }

        const uid = getCombatAnimationActorUid(actor);
        if (!uid) return;
        actions.delete(uid);
        facings.delete(uid);
        movement.delete(uid);
    }

    return Object.freeze({
        startAction,
        update,
        getActionState,
        getRenderState,
        getLungeOffset,
        faceActorToward,
        resolveFacing,
        clear,
        isAnimating(actor) {
            return Boolean(getActionState(actor));
        }
    });
})();

if (typeof window !== 'undefined') {
    window.CombatSpriteAnimation = CombatSpriteAnimation;
    window.PubKnightsCombatAnimationReady = true;
    if (window.document && window.document.documentElement) {
        window.document.documentElement.dataset.combatAnimationReady = 'true';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        COMBAT_ANIMATION_EVENT_TYPES,
        COMBAT_ANIMATION_FALLBACK_CLIPS,
        getCombatAnimationClipDefinition,
        getCombatAnimationTimeline,
        getCombatWeaponAnimationStyle,
        resolveCombatAnimationClip,
        getCombatAnimationReleaseOrigin,
        createCombatPlaybackBarrier,
        CombatSpriteAnimation
    };
}
