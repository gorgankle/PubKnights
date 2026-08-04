// Shared battlefield timing for side-facing player actions and their hit events.

const COMBAT_ANIMATION_EVENT_TYPES = Object.freeze({
    slash: 'contact',
    bash: 'contact',
    shoot: 'release',
    cast: 'release',
    thrust: 'contact',
    heavy: 'contact',
    dagger: 'contact',
    scythe: 'contact',
    shield_block: 'guard',
    shield_bash: 'contact',
    dual_wield: 'contact'
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
    }),
    thrust: Object.freeze({
        fps: 8,
        loop: false,
        actionFrame: 2,
        frames: Object.freeze([
            'thrust_a', 'thrust_b', 'thrust_c', 'thrust_d', 'thrust_e'
        ])
    }),
    heavy: Object.freeze({
        fps: 6,
        loop: false,
        actionFrame: 3,
        powerful: true,
        frames: Object.freeze([
            'heavy_a', 'heavy_b', 'heavy_c',
            'heavy_d', 'heavy_e', 'heavy_f'
        ])
    }),
    dagger: Object.freeze({
        fps: 10,
        loop: false,
        actionFrame: 2,
        frames: Object.freeze([
            'dagger_a', 'dagger_b', 'dagger_c', 'dagger_d', 'dagger_e'
        ])
    }),
    scythe: Object.freeze({
        fps: 7,
        loop: false,
        actionFrame: 3,
        powerful: true,
        frames: Object.freeze([
            'scythe_a', 'scythe_b', 'scythe_c',
            'scythe_d', 'scythe_e', 'scythe_f'
        ])
    }),
    shield_block: Object.freeze({
        fps: 8,
        loop: false,
        actionFrame: 1,
        holdFrame: 2,
        phases: Object.freeze({
            windupEnd: 0,
            guardStart: 1,
            guardEnd: 2,
            recoveryStart: 3
        }),
        frames: Object.freeze([
            'shield_block_a',
            'shield_block_b',
            'shield_block_c',
            'shield_block_d'
        ])
    }),
    shield_bash: Object.freeze({
        fps: 8,
        loop: false,
        actionFrame: 2,
        frames: Object.freeze([
            'shield_bash_a',
            'shield_bash_b',
            'shield_bash_c',
            'shield_bash_d',
            'shield_bash_e'
        ])
    }),
    dual_wield: Object.freeze({
        fps: 10,
        loop: false,
        actionFrame: 2,
        frames: Object.freeze([
            'dual_wield_a', 'dual_wield_b', 'dual_wield_c',
            'dual_wield_d', 'dual_wield_e', 'dual_wield_f'
        ])
    }),
    hit: Object.freeze({
        fps: 10,
        loop: false,
        actionFrame: null,
        frames: Object.freeze(['hit_a', 'hit_b', 'hit_c'])
    }),
    defeat: Object.freeze({
        fps: 6,
        loop: false,
        actionFrame: null,
        terminal: true,
        holdLastFrame: true,
        frames: Object.freeze([
            'defeat_a',
            'defeat_b',
            'defeat_c',
            'defeat_d'
        ])
    })
});

function getCombatAnimationClipRegistry() {
    return typeof SidePlayerAnimationClips !== 'undefined'
        ? SidePlayerAnimationClips
        : COMBAT_ANIMATION_FALLBACK_CLIPS;
}

function hasCombatAnimationClip(clipId) {
    const registry = getCombatAnimationClipRegistry();
    return (
        typeof clipId === 'string'
        && (
            Object.prototype.hasOwnProperty.call(registry, clipId)
            || Object.prototype.hasOwnProperty.call(
                COMBAT_ANIMATION_FALLBACK_CLIPS,
                clipId
            )
        )
    );
}

function getCombatAnimationClipDefinition(clipId) {
    const registry = getCombatAnimationClipRegistry();
    if (Object.prototype.hasOwnProperty.call(registry, clipId)) {
        return registry[clipId];
    }
    if (
        Object.prototype.hasOwnProperty.call(
            COMBAT_ANIMATION_FALLBACK_CLIPS,
            clipId
        )
    ) {
        return COMBAT_ANIMATION_FALLBACK_CLIPS[clipId];
    }
    return registry.idle || COMBAT_ANIMATION_FALLBACK_CLIPS.idle;
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
    const resolvedClipId = hasCombatAnimationClip(clipId)
        ? clipId
        : 'idle';
    const clip = getCombatAnimationClipDefinition(resolvedClipId);
    const frames = Array.isArray(clip && clip.frames)
        ? clip.frames
        : COMBAT_ANIMATION_FALLBACK_CLIPS.idle.frames;
    const frameDurationMs = 1000 / Math.max(1, Number(clip.fps) || 1);
    const actionFrame = (
        Number.isInteger(clip.actionFrame)
        && clip.actionFrame >= 0
        && clip.actionFrame < frames.length
    )
        ? clip.actionFrame
        : null;
    const phases = clip.phases && typeof clip.phases === 'object'
        ? Object.freeze({ ...clip.phases })
        : Object.freeze({});
    const requestedHoldFrame = Number.isInteger(clip.holdFrame)
        ? clip.holdFrame
        : phases.guardEnd;
    const holdFrame = Number.isInteger(requestedHoldFrame)
        ? Math.max(0, Math.min(frames.length - 1, requestedHoldFrame))
        : null;

    return {
        clipId: resolvedClipId,
        eventType: COMBAT_ANIMATION_EVENT_TYPES[resolvedClipId] || null,
        frameDurationMs,
        frameCount: frames.length,
        actionFrame,
        holdFrame,
        actionTimeMs: actionFrame === null
            ? null
            : actionFrame * frameDurationMs,
        durationMs: frames.length * frameDurationMs,
        loop: clip.loop === true,
        terminal: clip.terminal === true,
        holdLastFrame: clip.holdLastFrame === true,
        powerful: clip.powerful === true,
        phases
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

function getCombatWeaponAnimationFamily(weapon) {
    if (!weapon) return '';
    if (weapon.animationFamily) {
        return String(weapon.animationFamily).toLowerCase();
    }
    if (
        weapon.spriteId
        && typeof EquipmentOverhaulSpecs !== 'undefined'
        && EquipmentOverhaulSpecs.weapon
        && EquipmentOverhaulSpecs.weapon[weapon.spriteId]
    ) {
        return String(
            EquipmentOverhaulSpecs.weapon[weapon.spriteId]
                .animationFamily || ''
        ).toLowerCase();
    }
    return '';
}

function getCombatOffhandType(offhand) {
    if (!offhand) return '';
    if (offhand.offhandType) {
        return String(offhand.offhandType).toLowerCase();
    }
    if (
        offhand.spriteId
        && typeof EquipmentOverhaulSpecs !== 'undefined'
        && EquipmentOverhaulSpecs.offhand
        && EquipmentOverhaulSpecs.offhand[offhand.spriteId]
    ) {
        return String(
            EquipmentOverhaulSpecs.offhand[offhand.spriteId]
                .offhandType || ''
        ).toLowerCase();
    }
    return '';
}

function isCombatWeaponTwoHanded(weapon) {
    if (!weapon) return false;
    if (weapon.twoHanded === true) return true;
    const handedness = String(weapon.handedness || '').toLowerCase();
    if (['two', 'two-handed', '2h'].includes(handedness)) return true;
    if (
        weapon.spriteId
        && typeof EquipmentOverhaulSpecs !== 'undefined'
        && EquipmentOverhaulSpecs.weapon
        && EquipmentOverhaulSpecs.weapon[weapon.spriteId]
    ) {
        const spec = EquipmentOverhaulSpecs.weapon[weapon.spriteId];
        return (
            spec.twoHanded === true
            || ['two', 'two-handed', '2h'].includes(
                String(spec.handedness || '').toLowerCase()
            )
        );
    }
    return false;
}

function resolveCombatAnimationClip(options = {}) {
    const actionType = String(options.actionType || '').toLowerCase();
    const animType = String(options.animType || '').toLowerCase();
    if (
        actionType === 'block'
        || actionType === 'guard'
        || animType === 'block'
        || animType.includes('shield_block')
    ) {
        return 'shield_block';
    }
    if (
        actionType === 'shield_bash'
        || animType.includes('shield_bash')
    ) {
        return 'shield_bash';
    }
    if (options.source === 'spell' || actionType === 'spell') {
        return 'cast';
    }
    if (
        options.isProjectile
        || (options.weapon && options.weapon.projectileSprite)
    ) {
        return 'shoot';
    }
    if (
        animType.includes('shoot')
        || animType.includes('bow')
        || actionType === 'shoot'
    ) {
        return 'shoot';
    }
    if (
        animType.includes('cast')
        || animType.includes('spell')
        || actionType === 'cast'
    ) {
        return 'cast';
    }

    if (animType.includes('dual_wield')) return 'dual_wield';

    // A compatible offhand weapon changes the whole attack stance. Resolve it
    // before a one-handed main-hand family such as dagger/slash/bash so live
    // loadouts actually use the shared dual-wield clip.
    if (
        getCombatOffhandType(options.offhand) === 'weapon'
        && !isCombatWeaponTwoHanded(options.weapon)
    ) {
        return 'dual_wield';
    }

    const authoredFamilies = [
        'thrust',
        'heavy',
        'dagger',
        'scythe'
    ];
    const authoredFamily = authoredFamilies.find(
        family => animType.includes(family)
    );
    if (authoredFamily) return authoredFamily;

    const animationFamily = getCombatWeaponAnimationFamily(
        options.weapon
    );
    if (hasCombatAnimationClip(animationFamily)) {
        return animationFamily;
    }

    const style = getCombatWeaponAnimationStyle(options.weapon);
    if (style.includes('bow') || style.includes('crossbow')) return 'shoot';
    if (style.includes('staff') || style.includes('wand')) return 'cast';
    if (
        ['spear', 'trident', 'pitchfork', 'polearm', 'halberd', 'glaive']
            .some(value => style.includes(value))
    ) {
        return 'thrust';
    }
    if (style.includes('dagger') || style.includes('shiv')) {
        return 'dagger';
    }
    if (style.includes('scythe')) return 'scythe';
    if (
        ['greatclub', 'maul', 'greataxe', 'greatsword']
            .some(value => style.includes(value))
    ) {
        return 'heavy';
    }

    const bashStyles = [
        'club',
        'mace',
        'knuckle',
        'tankard',
        'hammer'
    ];
    if (bashStyles.some(value => style.includes(value))) return 'bash';

    const slashStyles = [
        'sword',
        'blade',
        'axe',
        'machete',
        'rapier',
        'scimitar'
    ];
    if (slashStyles.some(value => style.includes(value))) return 'slash';

    if (animType.includes('bash') || animType.includes('smash')) return 'bash';
    if (animType.includes('slash')) return 'slash';
    return 'slash';
}

function getCombatAnimationVisualProfile(actor) {
    let profile = null;
    const resolver = typeof resolveHumanoidActorVisualProfile === 'function'
        ? resolveHumanoidActorVisualProfile
        : (
            typeof globalThis !== 'undefined'
            && typeof globalThis.resolveHumanoidActorVisualProfile === 'function'
                ? globalThis.resolveHumanoidActorVisualProfile
                : null
        );

    if (resolver) {
        try {
            profile = resolver(actor);
        } catch (_error) {
            profile = null;
        }
    }
    return profile || (actor && actor.visualProfile) || null;
}

function getCombatAnimationVisualGender(actor, profile) {
    const appearance = (
        profile
        && profile.appearance
        && typeof profile.appearance === 'object'
    ) ? profile.appearance : profile;
    const gender = (
        appearance
        && appearance.gender
    ) || (
        actor
        && actor.appearance
        && actor.appearance.gender
    ) || (actor && actor.gender);
    return gender === 'female' ? 'female' : 'male';
}

function getCombatAnimationVisualWeapon(actor, profile) {
    if (profile && typeof profile === 'object') {
        if (Object.prototype.hasOwnProperty.call(profile, 'weaponItem')) {
            return profile.weaponItem;
        }
        if (Object.prototype.hasOwnProperty.call(profile, 'weapon')) {
            return profile.weapon;
        }
        if (
            profile.equipment
            && Object.prototype.hasOwnProperty.call(
                profile.equipment,
                'weapon'
            )
        ) {
            return profile.equipment.weapon;
        }
    }
    if (actor && actor.equipment && actor.equipment.weapon) {
        return actor.equipment.weapon;
    }
    return actor && (actor.weaponItem || actor.weapon) || null;
}

function isCombatAnimationAnchor(anchor) {
    return (
        Array.isArray(anchor)
        && Number.isFinite(Number(anchor[0]))
        && Number.isFinite(Number(anchor[1]))
    );
}

function getCombatAnimationActorFxOrigin(actor, preferVisual = false) {
    const actorSize = Math.max(1, Number(actor && actor.size) || 1);
    const logicalX = Number(actor && actor.x);
    const logicalY = Number(actor && actor.y);
    const visualX = Number(actor && actor.visualX);
    const visualY = Number(actor && actor.visualY);
    const x = preferVisual && Number.isFinite(visualX)
        ? visualX
        : (Number.isFinite(logicalX) ? logicalX : 0);
    const y = preferVisual && Number.isFinite(visualY)
        ? visualY
        : (Number.isFinite(logicalY) ? logicalY : 0);
    const visualProfile = getCombatAnimationVisualProfile(actor);
    const requestedVisualScale = Number(
        visualProfile
        && visualProfile.stanceProfile
        && visualProfile.stanceProfile.visualScale
    );
    const visualSize = visualProfile
        && Number.isFinite(requestedVisualScale)
        && requestedVisualScale > 0
        ? requestedVisualScale
        : actorSize;
    const visualInset = (actorSize - visualSize) / 2;

    return {
        x: x + (actorSize / 2) - 0.5,
        y: y + (actorSize / 2) - 0.5,
        topLeftX: x + visualInset,
        topLeftY: y + visualInset,
        size: visualSize,
        collisionSize: actorSize
    };
}

function getCombatAnimationReleaseOrigin(
    actor,
    clipId,
    frameIndex,
    facing = 'right'
) {
    const actorOrigin = getCombatAnimationActorFxOrigin(actor, true);
    if (
        !actor
        || typeof getSidePlayerAnimationFrame !== 'function'
    ) {
        return {
            x: actorOrigin.x,
            y: actorOrigin.y
        };
    }

    const profile = getCombatAnimationVisualProfile(actor);
    const gender = getCombatAnimationVisualGender(actor, profile);
    const visualWeapon = getCombatAnimationVisualWeapon(actor, profile);
    let frame = null;
    try {
        frame = getSidePlayerAnimationFrame(
            gender,
            clipId,
            frameIndex
        );
    } catch (_error) {
        frame = null;
    }
    const pose = frame && frame.pose ? frame.pose : {};
    const weapon = pose.weapon || {};
    const anchors = frame && frame.anchors ? frame.anchors : {};
    const weaponHand = isCombatAnimationAnchor(anchors.weaponHand)
        ? anchors.weaponHand
        : null;
    let anchor = weaponHand;
    const weaponStyle = getCombatWeaponAnimationStyle(visualWeapon);

    if (
        clipId === 'shoot'
        && visualWeapon
        && (
            weaponStyle.includes('bow')
            || weaponStyle.includes('crossbow')
            || visualWeapon.projectileSprite
        )
    ) {
        anchor = weapon.arrowTip || weapon.grip || weaponHand;
    } else if (
        clipId === 'cast'
        && visualWeapon
        && (
            weaponStyle.includes('staff')
            || weaponStyle.includes('wand')
        )
    ) {
        anchor = weapon.top || weapon.grip || weaponHand;
    }
    if (!isCombatAnimationAnchor(anchor)) {
        return {
            x: actorOrigin.x,
            y: actorOrigin.y
        };
    }

    const gridSize = typeof SIDE_PLAYER_ANIMATION_SIZE === 'number'
        ? SIDE_PLAYER_ANIMATION_SIZE
        : 32;
    let releaseOffset = [0, 0];
    const offsetResolver = (
        typeof resolveHumanoidProfileAnchorOffsets === 'function'
    )
        ? resolveHumanoidProfileAnchorOffsets
        : (
            typeof globalThis !== 'undefined'
            && typeof globalThis.resolveHumanoidProfileAnchorOffsets
                === 'function'
                ? globalThis.resolveHumanoidProfileAnchorOffsets
                : null
        );
    if (offsetResolver) {
        try {
            const resolvedOffsets = offsetResolver(profile || actor, clipId);
            if (
                resolvedOffsets
                && isCombatAnimationAnchor(resolvedOffsets.release)
            ) {
                releaseOffset = resolvedOffsets.release;
            }
        } catch (_error) {
            releaseOffset = [0, 0];
        }
    }
    const resolvedAnchor = [
        anchor[0] + Number(releaseOffset[0] || 0),
        anchor[1] + Number(releaseOffset[1] || 0)
    ];
    const anchorX = facing === 'left'
        ? gridSize - 1 - resolvedAnchor[0]
        : resolvedAnchor[0];
    const bobY = Number(pose.bobY) || 0;

    return {
        x: actorOrigin.topLeftX
            + ((anchorX + 0.5) / gridSize) * actorOrigin.size
            - 0.5,
        y: actorOrigin.topLeftY
            + (
                (
                    resolvedAnchor[1]
                    + bobY
                    + 0.5
                ) / gridSize
            ) * actorOrigin.size
            - 0.5
    };
}

function createCombatPlaybackBarrier(onFinished) {
    let actionComplete = false;
    let impactComplete = false;
    let finished = false;
    let cancelled = false;

    function finishWhenReady() {
        if (
            finished
            || cancelled
            || !actionComplete
            || !impactComplete
        ) {
            return;
        }
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
        },
        cancel() {
            if (finished || cancelled) return;
            cancelled = true;
            finished = true;
        }
    });
}

const CombatSpriteAnimation = (() => {
    const actions = new Map();
    const terminal = new Map();
    const facings = new Map();
    const movement = new Map();
    let cleanupDepth = 0;

    function rebindActorState(uid, actor) {
        if (!uid || !actor) return;
        const activeState = actions.get(uid);
        const terminalState = terminal.get(uid);
        if (activeState) activeState.actor = actor;
        if (terminalState) terminalState.actor = actor;
    }

    function resolveFacing(actor, targetX, fallback) {
        const uid = getCombatAnimationActorUid(actor);
        const remembered = uid ? facings.get(uid) : null;
        const actorCenterX = getCombatAnimationActorFxOrigin(actor).x;
        const numericTargetX = Number(targetX);
        const explicitFallback = fallback === 'left' || fallback === 'right'
            ? fallback
            : null;
        const actorFacing = actor && actor.combatFacing === 'left'
            ? 'left'
            : (
                actor && actor.combatFacing === 'right'
                    ? 'right'
                    : null
            );

        if (Number.isFinite(actorCenterX) && Number.isFinite(numericTargetX)) {
            if (numericTargetX < actorCenterX - 0.001) return 'left';
            if (numericTargetX > actorCenterX + 0.001) return 'right';
        }
        return explicitFallback || remembered || actorFacing || 'right';
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

    function resolvePlaybackFacing(actor, options) {
        if (options.facing === 'left' || options.facing === 'right') {
            return rememberFacing(actor, options.facing);
        }
        return rememberFacing(
            actor,
            resolveFacing(actor, options.targetX)
        );
    }

    function createPlaybackState(actor, clipId, options, stateType) {
        const uid = getCombatAnimationActorUid(actor);
        const baseTimeline = getCombatAnimationTimeline(clipId);
        const requestedPlaybackRate = Number(options.playbackRate);
        const playbackRate = Number.isFinite(requestedPlaybackRate)
            && requestedPlaybackRate > 0
            ? Math.min(8, Math.max(0.1, requestedPlaybackRate))
            : 1;
        const timeline = {
            ...baseTimeline,
            frameDurationMs:
                baseTimeline.frameDurationMs / playbackRate,
            actionTimeMs: baseTimeline.actionTimeMs === null
                ? null
                : baseTimeline.actionTimeMs / playbackRate,
            durationMs: baseTimeline.durationMs / playbackRate
        };
        const requestedEndFrame = Number(options.endFrameIndex);
        if (
            Number.isInteger(requestedEndFrame)
            && requestedEndFrame >= 0
            && requestedEndFrame < timeline.frameCount - 1
        ) {
            timeline.frameCount = requestedEndFrame + 1;
            timeline.durationMs = timeline.frameCount
                * timeline.frameDurationMs;
            timeline.endFrameIndex = requestedEndFrame;
        }
        return {
            uid,
            actor,
            stateType,
            clipId: timeline.clipId,
            timeline,
            playbackRate,
            startTime: Number.isFinite(options.startTime)
                ? options.startTime
                : getCombatAnimationNow(),
            elapsedMs: 0,
            progress: 0,
            eventFired: false,
            completed: false,
            cancelled: false,
            lifecycleSettled: false,
            facing: resolvePlaybackFacing(actor, options),
            targetX: Number(options.targetX),
            targetY: Number(options.targetY),
            lift: options.lift === true,
            onEvent: options.onEvent || options.onAction || null,
            onComplete: options.onComplete || null,
            onCancel: options.onCancel || null
        };
    }

    function settlePlaybackLifecycle(
        state,
        { cancelled = false, reason = null } = {}
    ) {
        if (!state || state.lifecycleSettled) return;
        state.lifecycleSettled = true;
        state.cancelled = cancelled;
        state.completed = true;
        const payload = {
            actor: state.actor,
            clipId: state.clipId,
            facing: state.facing,
            cancelled,
            reason
        };
        const callback = cancelled
            ? state.onCancel
            : state.onComplete;
        if (typeof callback === 'function') callback(payload);
    }

    function cancelPlaybackState(state, reason) {
        settlePlaybackLifecycle(state, {
            cancelled: true,
            reason: reason || 'cancelled'
        });
    }

    function updateActionState(state, now) {
        if (!state || actions.get(state.uid) !== state) return;
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

        if (actions.get(state.uid) !== state) return;
        if (elapsedMs + 0.000001 < state.timeline.durationMs) return;

        if (actions.get(state.uid) === state) {
            actions.delete(state.uid);
        }
        if (state.stateType !== 'defeat') {
            movement.set(state.uid, {
                clipId: 'idle',
                startTime: now
            });
        }
        if (state.actor) {
            state.actor.lungeOffsetX = 0;
            state.actor.lungeOffsetY = 0;
            state.actor.lungeHop = 0;
        }
        settlePlaybackLifecycle(state);
    }

    function update(now = getCombatAnimationNow()) {
        const resolvedNow = Number.isFinite(now)
            ? now
            : getCombatAnimationNow();
        Array.from(actions.values()).forEach(state => {
            if (actions.get(state.uid) !== state) return;
            updateActionState(state, resolvedNow);
        });
    }

    function actorIsMarkedDefeated(actor) {
        return Boolean(
            actor
            && (
                actor.alive === false
                || actor.defeated === true
            )
        );
    }

    function hasTerminalState(actor) {
        const uid = getCombatAnimationActorUid(actor);
        if (!uid) return false;
        rebindActorState(uid, actor);
        return terminal.has(uid);
    }

    function isActionLocked(actor) {
        const uid = getCombatAnimationActorUid(actor);
        if (!uid) return false;
        rebindActorState(uid, actor);
        return (
            actions.has(uid)
            || terminal.has(uid)
            || actorIsMarkedDefeated(actor)
        );
    }

    function startAction(actor, options = {}) {
        const uid = getCombatAnimationActorUid(actor);
        if (
            !uid
            || cleanupDepth > 0
            || actions.has(uid)
            || terminal.has(uid)
            || actorIsMarkedDefeated(actor)
        ) {
            return null;
        }

        if (
            options.clipId !== undefined
            && !Object.prototype.hasOwnProperty.call(
                COMBAT_ANIMATION_EVENT_TYPES,
                options.clipId
            )
        ) {
            return null;
        }
        const clipId = options.clipId || resolveCombatAnimationClip(options);
        const state = createPlaybackState(
            actor,
            clipId,
            options,
            'action'
        );

        actions.set(uid, state);
        movement.delete(uid);
        return state;
    }

    function startHitReaction(actor, options = {}) {
        const uid = getCombatAnimationActorUid(actor);
        if (
            !uid
            || cleanupDepth > 0
            || terminal.has(uid)
            || actorIsMarkedDefeated(actor)
        ) {
            return null;
        }
        const interruptedState = actions.get(uid) || null;
        if (interruptedState && options.interrupt !== true) return null;

        const state = createPlaybackState(
            actor,
            'hit',
            options,
            'reaction'
        );
        actions.set(uid, state);
        movement.delete(uid);
        if (interruptedState) {
            cancelPlaybackState(interruptedState, 'hit');
        }
        return state;
    }

    function startDefensiveReaction(actor, options = {}) {
        const clipId = options.clipId || 'shield_block';
        if (clipId !== 'shield_block') return null;
        const uid = getCombatAnimationActorUid(actor);
        if (
            !uid
            || cleanupDepth > 0
            || terminal.has(uid)
            || actorIsMarkedDefeated(actor)
        ) {
            return null;
        }
        const interruptedState = actions.get(uid) || null;
        if (interruptedState && options.interrupt !== true) return null;
        const state = createPlaybackState(
            actor,
            clipId,
            options,
            'defense'
        );
        actions.set(uid, state);
        movement.delete(uid);
        if (interruptedState) {
            cancelPlaybackState(interruptedState, 'block');
        }
        return state;
    }

    function startDefeat(actor, options = {}) {
        const uid = getCombatAnimationActorUid(actor);
        if (!uid || cleanupDepth > 0 || terminal.has(uid)) return null;

        const interruptedState = actions.get(uid) || null;
        const state = createPlaybackState(
            actor,
            'defeat',
            options,
            'defeat'
        );

        terminal.set(uid, state);
        actions.set(uid, state);
        movement.delete(uid);
        if (interruptedState && interruptedState !== state) {
            cancelPlaybackState(interruptedState, 'defeat');
        }
        return state;
    }

    function getActionState(actor) {
        const uid = getCombatAnimationActorUid(actor);
        if (!uid) return null;
        rebindActorState(uid, actor);
        return actions.get(uid) || null;
    }

    function getActiveRenderState(state) {
        const frameIndex = Math.min(
            state.timeline.frameCount - 1,
            Math.floor(state.elapsedMs / state.timeline.frameDurationMs)
        );
        return {
            clipId: state.clipId,
            frameIndex,
            facing: state.facing,
            isAction: true,
            isTerminal: state.stateType === 'defeat',
            progress: state.progress
        };
    }

    function getTerminalRenderState(state) {
        return {
            clipId: state.clipId,
            frameIndex: Math.max(0, state.timeline.frameCount - 1),
            facing: state.facing,
            isAction: false,
            isTerminal: true,
            progress: 1
        };
    }

    function getHeldGuardRenderState(actor, uid) {
        const guardState = actor && actor.guardState;
        if (
            !guardState
            || guardState.type !== 'shield_block'
            || Math.max(
                0,
                Math.trunc(Number(guardState.charges) || 0)
            ) < 1
        ) {
            return null;
        }

        const timeline = getCombatAnimationTimeline('shield_block');
        const facing = uid
            ? (facings.get(uid) || rememberFacing(actor, 'right'))
            : resolveFacing(actor);
        return {
            clipId: 'shield_block',
            frameIndex: timeline.holdFrame === null
                ? Math.max(0, timeline.actionFrame || 0)
                : timeline.holdFrame,
            facing,
            isAction: false,
            isTerminal: false,
            isGuarding: true,
            progress: 1
        };
    }

    function getHeldIntentRenderState(actor, uid) {
        const intent = actor && actor.pendingIntent;
        if (!intent || typeof intent !== 'object') return null;

        const clipId = String(intent.clipId || 'slash');
        const timeline = getCombatAnimationTimeline(clipId);
        const actionFrame = Number.isInteger(timeline.actionFrame)
            ? timeline.actionFrame
            : 1;
        const facing = uid
            ? (facings.get(uid) || rememberFacing(actor, 'right'))
            : resolveFacing(actor);
        return {
            clipId,
            // Hold on the last anticipation drawing, before contact/release.
            // The same authored frame therefore communicates the gameplay
            // warning without creating a second telegraph animation engine.
            frameIndex: timeline.holdFrame === null
                ? Math.max(0, actionFrame - 1)
                : timeline.holdFrame,
            facing,
            isAction: false,
            isTerminal: false,
            isIntent: true,
            progress: 1
        };
    }

    function getRenderState(actor, options = {}) {
        const uid = getCombatAnimationActorUid(actor);
        if (uid) rebindActorState(uid, actor);
        const now = Number.isFinite(options.now)
            ? options.now
            : getCombatAnimationNow();
        const action = uid ? actions.get(uid) : null;

        if (action) {
            updateActionState(action, now);
            const current = actions.get(uid);
            if (current) {
                return getActiveRenderState(current);
            }
        }

        const terminalState = uid ? terminal.get(uid) : null;
        if (terminalState) {
            terminalState.actor = actor;
            return getTerminalRenderState(terminalState);
        }

        const heldGuard = getHeldGuardRenderState(actor, uid);
        if (heldGuard) return heldGuard;

        const heldIntent = getHeldIntentRenderState(actor, uid);
        if (heldIntent) return heldIntent;

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
            if (!movementState || movementState.clipId !== 'idle') {
                movementState = { clipId: 'idle', startTime: now };
                if (uid) movement.set(uid, movementState);
            }
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
        if (
            !state
            || state.stateType !== 'action'
            || ![
                'slash',
                'bash',
                'thrust',
                'heavy',
                'dagger',
                'scythe',
                'shield_bash',
                'dual_wield'
            ].includes(state.clipId)
        ) {
            return { x: 0, y: 0, hop: 0 };
        }

        const actorOrigin = getCombatAnimationActorFxOrigin(actor);
        const actorX = actorOrigin.x;
        const actorY = actorOrigin.y;
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
            const states = Array.from(new Set(actions.values()));
            cleanupDepth += 1;
            try {
                actions.clear();
                terminal.clear();
                facings.clear();
                movement.clear();
                states.forEach(state => {
                    cancelPlaybackState(state, 'cleanup');
                });
            } finally {
                cleanupDepth -= 1;
            }
            return;
        }

        const uid = getCombatAnimationActorUid(actor);
        if (!uid) return;
        const action = actions.get(uid);
        cleanupDepth += 1;
        try {
            actions.delete(uid);
            terminal.delete(uid);
            facings.delete(uid);
            movement.delete(uid);
            if (action) cancelPlaybackState(action, 'cleanup');
        } finally {
            cleanupDepth -= 1;
        }
    }

    return Object.freeze({
        startAction,
        startHitReaction,
        startDefensiveReaction,
        startDefeat,
        update,
        getActionState,
        getRenderState,
        getLungeOffset,
        faceActorToward,
        resolveFacing,
        hasTerminalState,
        isActionLocked,
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
        hasCombatAnimationClip,
        getCombatAnimationClipDefinition,
        getCombatAnimationTimeline,
        getCombatWeaponAnimationStyle,
        getCombatWeaponAnimationFamily,
        getCombatOffhandType,
        resolveCombatAnimationClip,
        getCombatAnimationReleaseOrigin,
        createCombatPlaybackBarrier,
        CombatSpriteAnimation
    };
}
