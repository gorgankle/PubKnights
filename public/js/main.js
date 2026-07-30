// --- CORE GAME ENGINE & GLOBALS ---

// Establish secure connection to the Node server
const socket = io();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function syncCombatCollectionsFromState(serverCombatState) {
    if (!serverCombatState) return;
    const selectedEnemyUid = selectedEnemy && selectedEnemy.uid ? selectedEnemy.uid : null;
    if (serverCombatState.player) {
        player.x = serverCombatState.player.x;
        player.y = serverCombatState.player.y;
    }
    enemies = serverCombatState.enemies || [];
    allies = serverCombatState.allies || [];
    rogues = serverCombatState.rogues || [];
    selectedEnemy = selectedEnemyUid
        ? [...enemies, ...rogues].find(actor => actor && actor.uid === selectedEnemyUid && actor.alive !== false) || null
        : null;
    mapObstacles = serverCombatState.obstacles || mapObstacles || [];
    if (serverCombatState.parties && typeof serverCombatState.parties === "object") {
        combatParties = serverCombatState.parties;
    }
    if (Object.prototype.hasOwnProperty.call(serverCombatState, "activeActorUid")) {
        activeCombatActorUid = serverCombatState.activeActorUid || null;
    }
    if (Number.isInteger(serverCombatState.actionsRemaining)) {
        combatActionsRemaining = serverCombatState.actionsRemaining;
    }
}

function settleCombatActionState(serverCombatState = null) {
    if (serverCombatState) syncCombatCollectionsFromState(serverCombatState);
    selectedEnemy = selectedEnemy && selectedEnemy.alive ? selectedEnemy : null;
    pendingMove = null;

    if (activeCombatActorUid && combatActionsRemaining > 0) {
        currentTurn = 'PLAYER';
        combatPhase = 'ACTION_READY';
    } else {
        currentTurn = 'ENEMY';
        combatPhase = 'WAITING_FOR_ATB';
        activeCombatActorUid = null;
        combatActionsRemaining = 0;
    }

    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid();
}

function getCombatActorByUid(uid) {
    if (!uid) return null;
    if (uid === 'player_0') {
        player.uid = 'player_0';
        player.kind = 'player';
        player.name = player.username || 'Knight';
        return player;
    }
    return [...(enemies || []), ...(allies || []), ...(rogues || [])].find(actor => actor.uid === uid) || null;
}

function getPlayerAttackables() {
    return [...(enemies || []), ...(rogues || [])].filter(actor => actor && actor.alive);
}

let combatVictoryPresentationStarted = false;

function presentCombatVictory() {
    if (combatVictoryPresentationStarted || gameState !== "COMBAT") return;
    combatVictoryPresentationStarted = true;
    currentTurn = "ENEMY";
    combatPhase = "VICTORY";
    activeCombatActorUid = null;
    combatActionsRemaining = 0;
    selectedEnemy = null;
    pendingMove = null;

    logMessage("🏆 VICTORY Conditions verified.");
    if (typeof playRetroSound === "function") playRetroSound("victory");

    const returnButton = document.querySelector("#loot-screen button");
    if (returnButton) returnButton.style.display = "block";
    refreshSystemUI();
    if (typeof drawGrid === "function") drawGrid();

    setTimeout(() => {
        if (gameState === "COMBAT" && typeof showLootScreen === "function") showLootScreen();
    }, 1200);
}

function getCombatEventActorUid(event) {
    if (!event) return null;
    if (event.sourceUid) return event.sourceUid;
    if (["move", "hit", "deflect", "rest", "statusTick"].includes(event.type)) return event.uid || null;
    return null;
}

function getCombatResultWeapon(sourceActor) {
    if (
        sourceActor
        && sourceActor.equipment
        && sourceActor.equipment.weapon
    ) {
        return sourceActor.equipment.weapon;
    }
    if (
        sourceActor
        && typeof getHumanoidActorWeapon === 'function'
    ) {
        const visualWeapon = getHumanoidActorWeapon(sourceActor);
        if (visualWeapon) return visualWeapon;
    }
    if (
        sourceActor
        && (
            sourceActor.kind === 'player'
            || sourceActor === player
        )
    ) {
        return player && player.equipment
            ? player.equipment.weapon
            : null;
    }
    return null;
}

function playHumanoidImpactReaction(
    actor,
    defeated = false,
    options = {}
) {
    if (
        !actor
        || typeof CombatSpriteAnimation === 'undefined'
        || (
            typeof isHumanoidActor === 'function'
            && !isHumanoidActor(actor)
        )
    ) {
        return null;
    }

    if (
        defeated
        && typeof CombatSpriteAnimation.startDefeat === 'function'
    ) {
        return CombatSpriteAnimation.startDefeat(actor, options);
    }
    if (
        !defeated
        && typeof CombatSpriteAnimation.startHitReaction === 'function'
    ) {
        return CombatSpriteAnimation.startHitReaction(actor, options);
    }
    return null;
}

function getHumanoidShieldDefenseProfile(actor) {
    if (!actor) return null;
    const visual = typeof resolveHumanoidActorVisualProfile === 'function'
        ? resolveHumanoidActorVisualProfile(actor)
        : null;
    const offhand = visual
        && visual.equipment
        && visual.equipment.offhand;
    const offhandSpec = (
        offhand
        && typeof EquipmentOverhaulSpecs !== 'undefined'
        && EquipmentOverhaulSpecs.offhand
    )
        ? EquipmentOverhaulSpecs.offhand[offhand.spriteId]
        : null;
    if (!offhandSpec || offhandSpec.offhandType !== 'shield') {
        return null;
    }
    return {
        visual,
        clipId: visual.defensiveClip || 'shield_block'
    };
}

function playHumanoidDefensiveReaction(
    actor,
    attacker = null,
    options = {}
) {
    if (
        !actor
        || typeof CombatSpriteAnimation === 'undefined'
        || typeof CombatSpriteAnimation.startDefensiveReaction
            !== 'function'
    ) {
        return null;
    }
    const defenseProfile = getHumanoidShieldDefenseProfile(actor);
    if (!defenseProfile) return null;
    const attackerSize = Math.max(
        1,
        Number(attacker && attacker.size) || 1
    );
    return CombatSpriteAnimation.startDefensiveReaction(actor, {
        ...options,
        clipId: defenseProfile.clipId,
        interrupt: true,
        targetX: attacker
            ? Number(attacker.x) + ((attackerSize - 1) / 2)
            : undefined
    });
}

function getHumanoidDeflectPlaybackOptions(
    targetActor,
    impactTimeMs
) {
    const defenseProfile = getHumanoidShieldDefenseProfile(targetActor);
    const defensiveClip = defenseProfile
        ? defenseProfile.clipId
        : 'shield_block';
    const blockTimeline = (
        typeof getCombatAnimationTimeline === 'function'
    )
        ? getCombatAnimationTimeline(defensiveClip)
        : { frameDurationMs: 125 };
    const guardMidpointMs = Math.max(
        1,
        (Number(blockTimeline.frameDurationMs) || 125) * 2
    );
    const resolvedImpactTimeMs = Math.max(
        34,
        Number(impactTimeMs) || 0
    );

    return {
        playbackRate: Math.min(
            8,
            Math.max(0.1, guardMidpointMs / resolvedImpactTimeMs)
        )
    };
}

let combatSpriteActionRetryGeneration = 0;
const pendingCombatSpriteActionRetries = new Set();

function cancelPendingCombatSpriteActions() {
    combatSpriteActionRetryGeneration += 1;
    pendingCombatSpriteActionRetries.forEach(token => {
        token.cancelled = true;
        if (token.timerId !== null) {
            clearTimeout(token.timerId);
            token.timerId = null;
        }
    });
    pendingCombatSpriteActionRetries.clear();
}

function isCurrentCombatSpriteActor(actor) {
    if (!actor) return false;
    if (
        typeof gameState !== 'undefined'
        && gameState !== 'COMBAT'
    ) {
        return false;
    }
    if (typeof player !== 'undefined' && actor === player) return true;

    const collections = [];
    if (typeof allies !== 'undefined' && Array.isArray(allies)) {
        collections.push(allies);
    }
    if (typeof enemies !== 'undefined' && Array.isArray(enemies)) {
        collections.push(enemies);
    }
    if (typeof rogues !== 'undefined' && Array.isArray(rogues)) {
        collections.push(rogues);
    }
    if (collections.length === 0) return true;

    const uid = actor.uid || actor.id;
    return collections.some(collection => collection.some(candidate => (
        candidate === actor
        || (
            uid
            && candidate
            && (candidate.uid || candidate.id) === uid
        )
    )));
}

function startCombatSpriteActionWhenReady(
    actor,
    options,
    onUnavailable,
    onStarted
) {
    let bypassed = false;
    let retryCount = 0;
    const token = {
        cancelled: false,
        generation: combatSpriteActionRetryGeneration,
        timerId: null
    };
    pendingCombatSpriteActionRetries.add(token);

    function finishPendingRetry() {
        if (token.timerId !== null) {
            clearTimeout(token.timerId);
            token.timerId = null;
        }
        pendingCombatSpriteActionRetries.delete(token);
    }

    function bypassAnimation() {
        if (bypassed || token.cancelled) return;
        bypassed = true;
        finishPendingRetry();
        if (typeof onUnavailable === 'function') onUnavailable();
    }

    function attemptStart() {
        token.timerId = null;
        if (
            token.cancelled
            || token.generation !== combatSpriteActionRetryGeneration
            || !isCurrentCombatSpriteActor(actor)
        ) {
            token.cancelled = true;
            finishPendingRetry();
            return;
        }
        if (
            !actor
            || typeof CombatSpriteAnimation === 'undefined'
            || typeof CombatSpriteAnimation.startAction !== 'function'
        ) {
            bypassAnimation();
            return;
        }

        if (typeof CombatSpriteAnimation.update === 'function') {
            CombatSpriteAnimation.update();
        }
        const started = CombatSpriteAnimation.startAction(actor, options);
        if (started) {
            finishPendingRetry();
            if (typeof onStarted === 'function') {
                onStarted(started);
            }
            return;
        }

        const activeState = (
            typeof CombatSpriteAnimation.getActionState === 'function'
        )
            ? CombatSpriteAnimation.getActionState(actor)
            : null;
        const terminal = (
            typeof CombatSpriteAnimation.hasTerminalState === 'function'
            && CombatSpriteAnimation.hasTerminalState(actor)
        );
        if (
            activeState
            && !terminal
            && actor.alive !== false
            && retryCount < 4
        ) {
            retryCount += 1;
            const remainingMs = Math.max(
                0,
                (activeState.timeline?.durationMs || 0)
                    - (activeState.elapsedMs || 0)
            );
            token.timerId = setTimeout(
                attemptStart,
                Math.max(16, Math.ceil(remainingMs) + 1)
            );
            return;
        }

        bypassAnimation();
    }

    attemptStart();
    return Object.freeze({
        cancel() {
            if (token.cancelled) return;
            token.cancelled = true;
            finishPendingRetry();
        }
    });
}

function getCombatResultAnimationProfile(
    result,
    weapon,
    sourceActor = null
) {
    const profileKey = result.actionName === 'special'
        ? 'special'
        : 'standard';
    const profile = (
        weapon
        && weapon.combat
        && weapon.combat[profileKey]
    ) || {};
    const fx = result.fx || {};
    const clipId = typeof resolveCombatAnimationClip === 'function'
        ? resolveCombatAnimationClip({
            source: result.source,
            actionType: profile.actionType,
            isProjectile: fx.isProjectile,
            animType: profile.animType,
            weapon,
            offhand: sourceActor
                && sourceActor.equipment
                ? sourceActor.equipment.offhand
                : null
        })
        : (
            result.source === 'spell'
                ? 'cast'
                : (fx.isProjectile ? 'shoot' : 'slash')
        );

    return {
        clipId,
        animType: profile.animType || (
            clipId === 'bash' ? 'lunge_bash' : 'lunge_slash'
        ),
        lift: String(profile.animType || '').includes('jump')
    };
}

function getCombatResultTarget(result, sourceActor) {
    const fx = result.fx || {};
    const firstTarget = Array.isArray(result.targets)
        ? result.targets[0]
        : null;
    const targetActor = firstTarget
        ? getCombatActorByUid(firstTarget.uid)
        : null;
    if (targetActor && result.source === 'weapon' && !fx.isAoE) {
        return {
            x: targetActor.x + ((targetActor.size || 1) / 2) - 0.5,
            y: targetActor.y + ((targetActor.size || 1) / 2) - 0.5
        };
    }

    if (Number.isFinite(fx.tx) && Number.isFinite(fx.ty)) {
        return { x: fx.tx, y: fx.ty };
    }

    const fallbackTarget = targetActor || selectedEnemy;
    if (fallbackTarget) {
        return {
            x: fallbackTarget.x + ((fallbackTarget.size || 1) / 2) - 0.5,
            y: fallbackTarget.y + ((fallbackTarget.size || 1) / 2) - 0.5
        };
    }

    return {
        x: (Number(sourceActor && sourceActor.x) || 0) + 1,
        y: Number(sourceActor && sourceActor.y) || 0
    };
}

function applyOutgoingCombatImpact(result) {
    const targets = Array.isArray(result.targets) ? result.targets : [];

    if (result.source === 'spell') {
        if (typeof playRetroSound === 'function') playRetroSound('explosion');
        if (targets.length === 0) {
            logMessage("💨 Spell scorched nothing but the earth.");
        }
    } else {
        const isCrit = targets.length > 0 && targets[0].isCrit;
        if (typeof playRetroSound === 'function') {
            playRetroSound(
                isCrit
                    ? 'playerCrit'
                    : (result.actionName === 'special' ? 'heavyAttack' : 'attack')
            );
        }
    }

    targets.forEach(targetData => {
        const target = getCombatActorByUid(targetData.uid);
        if (!target) return;

        target.hp = Math.max(0, target.hp - targetData.damage);
        if (targetData.killed) {
            target.hp = 0;
            target.alive = false;
        }
        if (targetData.statusEffects) {
            target.statusEffects = targetData.statusEffects;
        }
        playHumanoidImpactReaction(target, targetData.killed === true);

        if (result.source === 'spell') {
            logMessage(
                `🔥 ${target.name} caught in blast for ${targetData.damage} DMG!`
            );
            FXEngine.spawnText(
                target.x,
                target.y,
                `-${targetData.damage}`,
                { color: "#e74c3c" }
            );
        } else if (targetData.isCrit) {
            logMessage(
                `💥 CRITICAL STRIKE! Executed ${result.actionName.toUpperCase()} onto ${target.name} for ${targetData.damage} DMG!`
            );
            FXEngine.spawnText(
                target.x,
                target.y,
                `-${targetData.damage}!`,
                { color: "#f1c40f", isCrit: true }
            );
        } else {
            logMessage(
                `⚔️ Executed ${result.actionName.toUpperCase()} strike onto ${target.name} for ${targetData.damage} DMG!`
            );
            FXEngine.spawnText(
                target.x,
                target.y,
                `-${targetData.damage}`,
                { color: "#e74c3c" }
            );
        }

        if (targetData.statusApplied === 'poison') {
            logMessage(`${target.name} is poisoned!`);
            FXEngine.spawnText(
                target.x,
                target.y,
                "POISON",
                { color: "#8e44ad" }
            );
        }
    });

    if (selectedEnemy && !selectedEnemy.alive) selectedEnemy = null;
    refreshSystemUI();
}

function finalizeOutgoingCombatAction(result, resultCombatState) {
    if (resultCombatState) syncCombatCollectionsFromState(resultCombatState);
    if (selectedEnemy && !selectedEnemy.alive) selectedEnemy = null;

    if (result.combatComplete) {
        presentCombatVictory();
    } else {
        settleCombatActionState(resultCombatState);
    }
    refreshSystemUI();
}

function playOutgoingCombatHit(result, sourceActor, resultCombatState) {
    const fx = result.fx || {};
    const weapon = getCombatResultWeapon(sourceActor);
    const animation = getCombatResultAnimationProfile(
        result,
        weapon,
        sourceActor
    );
    const target = getCombatResultTarget(result, sourceActor);
    const barrier = createCombatPlaybackBarrier(() => {
        finalizeOutgoingCombatAction(result, resultCombatState);
    });
    let impactApplied = false;
    let presentationCancelled = false;

    function cancelPresentation() {
        if (presentationCancelled) return;
        presentationCancelled = true;
        barrier.cancel();
    }

    function applyImpact() {
        if (impactApplied || presentationCancelled) return;
        impactApplied = true;
        applyOutgoingCombatImpact(result);
        barrier.markImpactComplete();
    }

    function launchAtActionFrame(event = {}) {
        if (presentationCancelled) return;
        const releaseOrigin = event.releaseOrigin || {
            x: Number.isFinite(fx.sx) ? fx.sx : sourceActor.x,
            y: Number.isFinite(fx.sy) ? fx.sy : sourceActor.y
        };

        if (result.source === 'spell' && fx.type === 'burst') {
            FXEngine.spawnMagicBurst(target.x, target.y, fx);
            applyImpact();
            return;
        }

        if (result.source === 'spell') {
            FXEngine.spawnBeam(
                releaseOrigin.x,
                releaseOrigin.y,
                target.x,
                target.y,
                { ...fx, onComplete: applyImpact }
            );
            return;
        }

        if (fx.isProjectile) {
            FXEngine.spawnProjectile(
                releaseOrigin.x,
                releaseOrigin.y,
                target.x,
                target.y,
                fx.spriteId,
                {
                    arc: 0,
                    spin: false,
                    frames: 15,
                    onComplete: applyImpact
                }
            );
            return;
        }

        if (typeof FXEngine.spawnMeleeImpact === 'function') {
            FXEngine.spawnMeleeImpact(
                target.x,
                target.y,
                animation.clipId
            );
        }
        applyImpact();
    }

    startCombatSpriteActionWhenReady(
        sourceActor,
        {
            clipId: animation.clipId,
            targetX: target.x,
            targetY: target.y,
            lift: animation.lift,
            onEvent: launchAtActionFrame,
            onComplete: barrier.markActionComplete,
            onCancel: cancelPresentation
        },
        () => {
            launchAtActionFrame();
            barrier.markActionComplete();
        }
    );
}

function playOutgoingCombatMiss(result, sourceActor, resultCombatState) {
    const weapon = getCombatResultWeapon(sourceActor);
    const isProjectile = Boolean(weapon && weapon.projectileSprite);
    const animation = getCombatResultAnimationProfile(
        {
            ...result,
            source: 'weapon',
            fx: { isProjectile }
        },
        weapon,
        sourceActor
    );
    const targetActor = (
        result.targetUid
            ? getCombatActorByUid(result.targetUid)
            : null
    ) || selectedEnemy;
    const target = targetActor
        ? {
            x: targetActor.x + ((targetActor.size || 1) / 2) - 0.5,
            y: targetActor.y + ((targetActor.size || 1) / 2) - 0.5
        }
        : getCombatResultTarget(result, sourceActor);
    const targetX = Number(target.x) || 0;
    const targetY = Number(target.y) || 0;
    const attackTimeline = (
        typeof getCombatAnimationTimeline === 'function'
    )
        ? getCombatAnimationTimeline(animation.clipId)
        : { actionTimeMs: 250 };
    const estimatedProjectileTravelMs = isProjectile ? 270 : 0;
    const defenseImpactTimeMs = (
        Number(attackTimeline.actionTimeMs) || 0
    ) + estimatedProjectileTravelMs;
    const defenseProfile = result.deflectReason === 'armor'
        ? getHumanoidShieldDefenseProfile(targetActor)
        : null;
    const barrier = createCombatPlaybackBarrier(() => {
        finalizeOutgoingCombatAction(result, resultCombatState);
    });
    let missShown = false;
    let presentationCancelled = false;
    let sourceComplete = false;
    let defenseComplete = true;
    let defenseStarted = false;
    let defenseState = null;

    function markCombinedActionComplete() {
        if (
            presentationCancelled
            || !sourceComplete
            || !defenseComplete
        ) {
            return;
        }
        barrier.markActionComplete();
    }

    function markSourceComplete() {
        sourceComplete = true;
        markCombinedActionComplete();
    }

    function markDefenseComplete() {
        defenseComplete = true;
        defenseState = null;
        markCombinedActionComplete();
    }

    function startTargetDefense() {
        if (
            defenseStarted
            || presentationCancelled
            || !targetActor
            || !defenseProfile
        ) {
            return null;
        }
        defenseStarted = true;
        defenseComplete = false;
        defenseState = playHumanoidDefensiveReaction(
            targetActor,
            sourceActor,
            {
                ...getHumanoidDeflectPlaybackOptions(
                    targetActor,
                    defenseImpactTimeMs
                ),
                onComplete: markDefenseComplete,
                onCancel: markDefenseComplete
            }
        );
        if (!defenseState) markDefenseComplete();
        return defenseState;
    }

    function cancelTargetDefense() {
        const state = defenseState;
        defenseState = null;
        defenseComplete = true;
        if (
            state
            && targetActor
            && typeof CombatSpriteAnimation !== 'undefined'
            && typeof CombatSpriteAnimation.getActionState === 'function'
            && typeof CombatSpriteAnimation.clear === 'function'
            && CombatSpriteAnimation.getActionState(targetActor) === state
        ) {
            CombatSpriteAnimation.clear(targetActor);
        }
    }

    function cancelPresentation() {
        if (presentationCancelled) return;
        presentationCancelled = true;
        cancelTargetDefense();
        barrier.cancel();
    }

    function showMiss() {
        if (missShown || presentationCancelled) return;
        missShown = true;
        const armorDeflect = result.deflectReason === 'armor';
        const guardedDeflect = armorDeflect && Boolean(defenseProfile);
        if (armorDeflect) {
            logMessage(
                guardedDeflect
                    ? `${targetActor.name} blocked the strike!`
                    : 'The strike was deflected by armor!'
            );
        } else {
            logMessage(
                `💨 Strike MISSED! Target evaded (${result.hitChance}% Hit Chance).`
            );
        }
        if (typeof playRetroSound === 'function') {
            playRetroSound(armorDeflect ? 'deflect' : 'error');
        }
        if (targetActor) {
            FXEngine.spawnText(
                targetActor.x,
                targetActor.y,
                armorDeflect
                    ? (guardedDeflect ? "BLOCK" : "DEFLECT")
                    : "MISS",
                { color: "#3498db" }
            );
        }
        barrier.markImpactComplete();
    }

    function releaseMiss(event = {}) {
        if (presentationCancelled) return;
        if (!isProjectile) {
            showMiss();
            return;
        }

        const releaseOrigin = event.releaseOrigin || {
            x: sourceActor.x,
            y: sourceActor.y
        };
        FXEngine.spawnProjectile(
            releaseOrigin.x,
            releaseOrigin.y,
            targetX,
            targetY,
            weapon.projectileSprite,
            {
                arc: 0,
                spin: false,
                frames: 15,
                onComplete: showMiss
            }
        );
    }

    startCombatSpriteActionWhenReady(
        sourceActor,
        {
            clipId: animation.clipId,
            targetX,
            targetY,
            onEvent: releaseMiss,
            onComplete: markSourceComplete,
            onCancel: cancelPresentation
        },
        () => {
            startTargetDefense();
            releaseMiss();
            markSourceComplete();
        },
        startTargetDefense
    );
}

// === SERVER-AUTHORITATIVE SYNC ===

socket.on('serverTick', (serverData) => {
    // Failsafe: Ignore background ticks if the player hasn't logged in yet
    if (document.getElementById('main-game-container').style.display !== 'flex') return;

    // Server ticks keep durable town status in sync.
    if (typeof serverData.gold === 'number') player.gold = serverData.gold;
    player.happyHourTicks = serverData.happyHourTicks;

    refreshSystemUI();
    updateTownUI(serverData);
});
// === SERVER-AUTHORITATIVE COMBAT DISPATCH (UNIFIED ENGINE) ===
socket.on('combatResult', (result) => {
    if (!result || gameState !== 'COMBAT') return;

    if (result.updatedPlayer) Object.assign(player, result.updatedPlayer); // Instantly sync stamina
    const resultCombatState = result.updatedCombatState || null;

    // === THE FIX: HANDLE ERRORS & PASS TURN ===
    if (result.type === 'error') {
        logMessage(result.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        settleCombatActionState(resultCombatState);
        return;
    }

    if (result.type === 'rest') {
        logMessage(`${result.actorName || 'Party member'} rested and recovered ${result.recovered} stamina.`);
        settleCombatActionState(resultCombatState);
        return;
    }

    if (result.type === 'endTurn') {
        logMessage(`${result.actorName || 'Party member'} ended their turn.`);
        settleCombatActionState(resultCombatState);
        return;
    }

    if (result.type === 'flee') {
        logMessage(`🏃 You fled the battlefield in terror!`);
        if (typeof playRetroSound === 'function') playRetroSound('step');

        // Clear any pending escrow loot locally
        pendingLoot = [];
        if (player) player.pendingLoot = [];

        setTimeout(transitionToTown, 500);
        return;
    }
    // ==========================================

    // --- 1. HANDLE EVASION ---
    if (result.type === 'miss') {
        const sourceActor = getCombatActorByUid(
            result.actorUid || 'player_0'
        ) || player;
        playOutgoingCombatMiss(
            result,
            sourceActor,
            resultCombatState
        );
        return;
    }

    // --- 2. HANDLE HITS (WEAPONS & MAGIC) ---
    if (result.type === 'hit') {
        let fx = result.fx || {};
        const sourceActor = getCombatActorByUid(result.actorUid || fx.sourceUid || 'player_0') || player;
        playOutgoingCombatHit(
            result,
            sourceActor,
            resultCombatState
        );
    }
});

// === SERVER-AUTHORITATIVE COMBAT ITEM RECEIPT ===
socket.on('combatItemReceipt', (receipt) => {
    if (!receipt.success) {
        logMessage(receipt.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');

        settleCombatActionState(receipt.updatedCombatState || null);

        return;
    }

    if (receipt.updatedPlayer) Object.assign(player, receipt.updatedPlayer); // Magic bullet sync
    if (receipt.updatedCombatState) syncCombatCollectionsFromState(receipt.updatedCombatState);

    logMessage(receipt.message);
    if (receipt.message.includes("gear")) {
        if (typeof playRetroSound === 'function') playRetroSound('equip');
    } else {
        if (typeof playRetroSound === 'function') playRetroSound('chug');
    }

    if (typeof saveGame === 'function') saveGame();

    settleCombatActionState(receipt.updatedCombatState || null);

    // === THE MISSING CANVAS REPAINT ===
    // Forces the physical game board to instantly redraw the new movement/range tiles!
    if (typeof drawGrid === 'function') {
        drawGrid();
    }
    // ==================================
});

// === SERVER-AUTHORITATIVE MOVEMENT RECEIPT ===
socket.on('moveReceipt', (receipt) => {
    if (receipt.updatedPlayer) Object.assign(player, receipt.updatedPlayer);
    if (!receipt.success) {
        logMessage(receipt.message);
        if (receipt.updatedCombatState) syncCombatCollectionsFromState(receipt.updatedCombatState);
        const failedMoveActor = receipt.actorUid && typeof getCombatActorByUid === 'function' ? getCombatActorByUid(receipt.actorUid) : player;
        if (failedMoveActor && Number.isFinite(receipt.x) && Number.isFinite(receipt.y)) {
            failedMoveActor.x = receipt.x;
            failedMoveActor.y = receipt.y;
        }
        if (typeof playRetroSound === 'function') playRetroSound('error');
    }
    settleCombatActionState(receipt.updatedCombatState || null);
});

socket.on('ATB_READY', (payload = {}) => {
    if (gameState !== 'COMBAT') return;
    activeCombatActorUid = payload.actorUid || 'player_0';
    combatActionsRemaining = Number.isInteger(payload.actionsRemaining) ? payload.actionsRemaining : 2;
    combatPhase = 'ACTION_READY';
    currentTurn = 'PLAYER';
    logMessage(`⚡ ${payload.actorName || 'Party'} is ready! Tactical turn begins.`);
    if (typeof playRetroSound === 'function') playRetroSound('equip');
    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid();
});



// === SERVER-AUTHORITATIVE ECONOMY RECEIPT ===
socket.on('townReceipt', (receipt) => {
    // If the server rejected the action
    if (!receipt.success) {
        logMessage(receipt.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }

    // Instantly overwrite our local variables with the server's master copy!
    if (receipt.updatedPlayer) {
        Object.assign(player, receipt.updatedPlayer);
    }

    // Play the correct sound effect based on what we just bought/did
    if (receipt.action === 'gildedTavern' || receipt.action === 'tradeRoutes' || receipt.action === 'monument') {
        if (typeof playRetroSound === 'function') playRetroSound('victory');
    } else if (receipt.action === 'trainPet' || receipt.action === 'resetStats' || receipt.action === 'allocateStat') {
        if (typeof playRetroSound === 'function') playRetroSound('statUp');
    } else if (receipt.action === 'claimCart') {
        if (!receipt.isAuto && typeof playRetroSound === 'function') playRetroSound('claim');
    } else if (receipt.action === 'chumCellars') {
        if (typeof playRetroSound === 'function') playRetroSound('splat');
    } else if (receipt.action === 'drinkBrew') {
        if (typeof playRetroSound === 'function') playRetroSound('chug');
    } else if (receipt.action === 'adoptPet') {
        // === HIDE THE MENU UPON SUCCESSFUL SERVER PURCHASE ===
        if (typeof playRetroSound === 'function') playRetroSound('coin');
        let adoptionUI = document.getElementById('pet-adoption-ui');
        if (adoptionUI) adoptionUI.style.display = "none";
    } else {
        if (typeof playRetroSound === 'function') playRetroSound('coin');
    }

   logMessage(receipt.message);
    if (typeof saveGame === 'function') saveGame();
    refreshSystemUI();
});

// === SERVER-AUTHORITATIVE INVENTORY RECEIPT ===
socket.on('inventoryReceipt', (receipt) => {
    // If the server rejected the action (e.g. bag full)
    if (!receipt.success) {
        if (receipt.message) logMessage(receipt.message);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }

    if (receipt.updatedPlayer) {
        Object.assign(player, receipt.updatedPlayer);
    }

    // UPDATED: Added 'takeLoot' to the coin sound triggers
    if (receipt.action === 'equip' || receipt.action === 'unequip' || receipt.action === 'deposit' || receipt.action === 'withdraw') {
        if (typeof playRetroSound === 'function') playRetroSound('equip');
    } else if (receipt.action === 'sell' || receipt.action === 'takeLoot') {
        if (typeof playRetroSound === 'function') playRetroSound('coin');

        // === THE FIX: VISUALLY CLEAR THE ITEM FROM THE LOOT SCREEN ===
        pendingLoot.length = 0; // Wipe the old visual list
        if (player.pendingLoot) pendingLoot.push(...player.pendingLoot); // Sync with the server's truth
        if (typeof refreshLootUI === 'function') refreshLootUI(); // Force the window to redraw!
    }

    if (receipt.message) logMessage(receipt.message);

    // Save to DB and re-render the visual UI grids
    if (typeof saveGame === 'function') saveGame();
    refreshSystemUI();
});

// === SERVER-AUTHORITATIVE ESCROW CATCHERS ===
socket.on('killConfirmed', (data) => {
    // We only update these variables so the visual UI bar can animate!
    // The server holds the real secured values in its escrow.
    player.pendingGold = (player.pendingGold || 0) + data.gold;
    player.pendingXp = (player.pendingXp || 0) + data.xp;

    if (data.xp > 0) logMessage(`💀 Terminated entity: ${data.enemyName} (Stored ${data.xp} XP)`);

if (data.item) {
        pendingLoot.push(data.item); // For the visual UI

        // === THE FIX: STORE IT IN THE PLAYER'S LOCAL MEMORY TOO ===
        player.pendingLoot = player.pendingLoot || [];
        player.pendingLoot.push(data.item);

        if (data.isPet) logMessage(`🐾 ${data.petName || (player.pet && player.pet.name) || "Companion"} joyfully dug up a hidden treasure!`);
        else logMessage(`🎁 SECURED LOOT: ${data.item.name} [${data.item.rarity}]`);
    }

    if (document.getElementById("loot-screen").style.display === "block") {
        if (typeof refreshLootUI === 'function') refreshLootUI();
    }
});

socket.on('rogueLootTheft', (data) => {
    if (!data) return;
    pendingLoot.length = 0;
    if (Array.isArray(data.pendingLoot)) {
        player.pendingLoot = data.pendingLoot;
        pendingLoot.push(...data.pendingLoot);
    }
    logMessage(`${data.thiefName || 'A rogue'} slipped away with ${data.itemName || 'a prize'}!`);
    if (typeof playRetroSound === 'function') playRetroSound('error');
    if (document.getElementById("loot-screen").style.display === "block" && typeof refreshLootUI === 'function') {
        refreshLootUI();
    }
});

// === REPLACED ===
socket.on('combatRewardsReceipt', (receipt) => {
    if (receipt.updatedPlayer) {
        let oldLevel = player.level;

        // === THE FIX: AUTO-SNAP ZONE UI ===
        // Track the old maximum levels before the magic sync
        let oldWild = player.wildernessLevel || 1;
        let oldCellar = player.cellarLevel || 1;

        Object.assign(player, receipt.updatedPlayer); // Magic bullet sync!

        // If the server pushed your max level forward, snap the UI selector to match!
        if (player.wildernessLevel > oldWild) player.selectedWildernessLevel = player.wildernessLevel;
        if (player.cellarLevel > oldCellar) player.selectedCellarLevel = player.cellarLevel;
        // ==================================

        if (player.level > oldLevel) {
            if (typeof playRetroSound === 'function') playRetroSound('heavyAttack');
            logMessage(`🎉 LEVEL UP! The Guild has verified you are now Level ${player.level}.`);
        }

        // === THE FIX: FORCE A DATABASE COMMIT BEFORE LEAVING THE ARENA ===
        if (typeof saveGame === 'function') saveGame();

        transitionToTown();
    }
});
// ============================================

socket.on('statusEffectReceipt', (receipt) => {
    if (!receipt || gameState !== 'COMBAT') return;
    if (receipt.updatedPlayer) Object.assign(player, receipt.updatedPlayer);
    if (receipt.updatedCombatState) syncCombatCollectionsFromState(receipt.updatedCombatState);

    (receipt.events || []).forEach(ev => {
        if (ev.status === 'poison') {
            if (ev.targetType === 'player') {
                playHumanoidImpactReaction(
                    player,
                    player.hp <= 0 || ev.killed === true
                );
                logMessage(`Poison burns you for ${ev.damage} DMG.`);
                FXEngine.spawnText(player.x, player.y, `-${ev.damage}`, { color: "#8e44ad" });
            } else if (ev.uid) {
                const e = getCombatActorByUid(ev.uid);
                if (e) {
                    playHumanoidImpactReaction(
                        e,
                        e.alive === false || ev.killed === true
                    );
                    logMessage(`${e.name} suffers ${ev.damage} poison DMG.`);
                    FXEngine.spawnText(e.x, e.y, `-${ev.damage}`, { color: "#8e44ad" });
                }
            }
        }
    });

    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid();
});

socket.on('combatDeployed', (serverCombatState) => {
    activeCombatActorUid = null;
    combatActionsRemaining = 0;
    combatVictoryPresentationStarted = false;
    reachableTiles = null;
    hideTooltip();
    cancelPendingCombatSpriteActions();
    if (typeof CombatSpriteAnimation !== 'undefined') {
        CombatSpriteAnimation.clear();
    }
    delete player.visualX;
    delete player.visualY;
    delete player.moveAnimTimer;

    // Sync browser state to the Server's command
    player.idleJob = 'NONE';
    player.statusEffects = {};
    gameState = 'COMBAT';

    // STRICT GAME LOGIC: Always start waiting for the server's ATB tick
    currentTurn = 'ENEMY';
    combatPhase = 'WAITING_FOR_ATB';
    player.visualAtb = 0;

    pendingMove = null;
    player.pendingXp = 0;

    // Load the physical grid variables
    currentGridSize = serverCombatState.gridSize;
    currentTileSize = serverCombatState.tileSize;
    player.x = serverCombatState.player.x;
    player.y = serverCombatState.player.y;
    syncCombatCollectionsFromState(serverCombatState);
    selectedEnemy = null;

    activeCombatZone = serverCombatState.zone;
    activeCombatFloorSpriteId = serverCombatState.floorSpriteId || "ground_wilderness";
    activeCombatFloorTiles = serverCombatState.floorTiles || [];

    // Automatically rip the loot screen away if it's open
    const lootOverlay = document.getElementById("loot-screen");
    if (lootOverlay) lootOverlay.style.display = "none";

    if (typeof playRetroSound === 'function') playRetroSound('combatStart');

    // Display context messages based on zone
    if (activeCombatZone === 'GORILLA_ARENA') logMessage("🚨 GORILLA PIT INITIALIZED. Challenge parameters deployed.");
    else if (activeCombatZone === 'ABYSS') logMessage(`🌌 Descended to Abyss Depth ${player.abyssDepth || 1}. The pressure is crushing.`);
    else if (activeCombatZone === 'CELLARS' && (player.selectedCellarLevel || player.cellarLevel) === 20) logMessage("⚠️ THE FLOOR TREMBLES! An ancient, corrupted mega-cask awakens from its slumber!");
    else if (activeCombatZone === 'CELLARS' && player.cellarsChummed) logMessage("⚠️ SEAFOOD CODES LOADED: 5 Mimics burst out of the structural drain layers!");

    // Force the browser to draw the server's map
    refreshSystemUI();
    drawGrid();
    window.scrollTo(0, 0);
});

// === SERVER-AUTHORITATIVE AI CATCHER (THE MOVIE PLAYER) ===
socket.on('enemyTurnReceipt', (receipt) => {
    // 1. Accept only the player's math instantly (so death checks work)
    if (receipt.updatedPlayer) Object.assign(player, receipt.updatedPlayer);

    let events = receipt.events || [];
    const combatDefeated = !!receipt.combatDefeated || events.some(ev => ev && ev.type === 'death');
    const combatComplete = !!receipt.combatComplete;
    currentTurn = "ENEMY";

    // === NEW: DYNAMIC FAST-FORWARD MATH ===
    // If there are hundreds of events (Gorilla Pit), compress the time!
    let eventCount = events.length;
    let timeCompression = 1.0;

    // If there are more than 15 events, start speeding up the playback
    if (eventCount > 15) {
        // Caps the maximum speed at 15% of normal time (roughly 15ms per move)
        timeCompression = Math.max(0.15, 15 / eventCount);
    }

    let delay = 0; // The playback timer!
    const compressedPlaybackOptions = {
        playbackRate: 1 / Math.max(0.15, timeCompression)
    };

    function getEnemyEventSourceActor(ev) {
        const sourceUid = getCombatEventActorUid(ev);
        return sourceUid ? getCombatActorByUid(sourceUid) : null;
    }

    function getEnemyEventActionClip(ev, sourceActor = null) {
        if (
            sourceActor
            && typeof resolveHumanoidActorActionClip === 'function'
        ) {
            return resolveHumanoidActorActionClip(sourceActor, {
                source: ev.spellFx ? 'spell' : 'weapon',
                actionType: ev.spellFx ? 'spell' : null,
                isProjectile: Boolean(ev.projectileSprite),
                projectileSprite: ev.projectileSprite,
                spellFx: ev.spellFx
            });
        }
        if (typeof resolveCombatAnimationClip === 'function') {
            return resolveCombatAnimationClip({
                source: ev.spellFx ? 'spell' : 'weapon',
                actionType: ev.spellFx ? 'spell' : null,
                isProjectile: Boolean(ev.projectileSprite),
                weapon: getCombatResultWeapon(sourceActor)
            });
        }
        return ev.spellFx
            ? 'cast'
            : (ev.projectileSprite ? 'shoot' : 'slash');
    }

    function getEnemyEventPlaybackDuration(ev) {
        const attackEvent = [
            'hit',
            'deflect',
            'actorHit',
            'actorDeflect',
            'heal'
        ].includes(ev.type);
        const reactionEvent = (
            ev.type === 'statusTick'
            && ev.status === 'poison'
        );
        if (!attackEvent) {
            if (reactionEvent) {
                const reactionClip = ev.killed ? 'defeat' : 'hit';
                const reactionTimeline = (
                    typeof getCombatAnimationTimeline === 'function'
                )
                    ? getCombatAnimationTimeline(reactionClip)
                    : { durationMs: ev.killed ? 667 : 300 };
                return Math.max(
                    50,
                    (reactionTimeline.durationMs || 0) + 34
                );
            }
            return ev.type === 'move' ? 420 : 50;
        }

        const sourceActor = getEnemyEventSourceActor(ev);
        const clipId = ev.type === 'heal'
            ? 'cast'
            : getEnemyEventActionClip(ev, sourceActor);
        const timeline = typeof getCombatAnimationTimeline === 'function'
            ? getCombatAnimationTimeline(clipId)
            : { actionTimeMs: 250, durationMs: 500 };
        let impactTimeMs = timeline.actionTimeMs || 0;
        if (ev.projectileSprite) {
            impactTimeMs += 360;
        } else if (ev.spellFx && ev.spellFx.type === 'beam') {
            impactTimeMs += 500;
        }

        const hasReaction = ev.type === 'hit' || ev.type === 'actorHit';
        if (hasReaction) {
            const reactionClip = ev.killed ? 'defeat' : 'hit';
            const reactionTimeline = (
                typeof getCombatAnimationTimeline === 'function'
            )
                ? getCombatAnimationTimeline(reactionClip)
                : { durationMs: ev.killed ? 667 : 300 };
            impactTimeMs += reactionTimeline.durationMs || 0;
        }
        if (ev.type === 'deflect' || ev.type === 'actorDeflect') {
            const targetActor = ev.type === 'actorDeflect'
                ? getCombatActorByUid(ev.targetUid)
                : player;
            const defenseProfile = getHumanoidShieldDefenseProfile(
                targetActor
            );
            if (defenseProfile) {
                const defenseOptions = getDeflectPlaybackOptions(
                    ev,
                    sourceActor,
                    targetActor
                );
                const defensiveTimeline = (
                    typeof getCombatAnimationTimeline === 'function'
                )
                    ? getCombatAnimationTimeline(
                        defenseProfile.clipId
                    )
                    : { durationMs: 500 };
                const actualDefenseDuration = (
                    Number(defensiveTimeline.durationMs) || 500
                ) / Math.max(0.1, defenseOptions.playbackRate || 1);
                const uncompressedDefenseDuration =
                    actualDefenseDuration
                    / Math.max(0.15, timeCompression);
                impactTimeMs = Math.max(
                    impactTimeMs,
                    uncompressedDefenseDuration
                );
            }
        }
        return Math.max(
            350,
            (timeline.durationMs || 0) + 34,
            impactTimeMs + 34
        );
    }

    function getDeflectPlaybackOptions(
        ev,
        sourceActor,
        targetActor = null
    ) {
        const clipId = getEnemyEventActionClip(ev, sourceActor);
        const attackTimeline = (
            typeof getCombatAnimationTimeline === 'function'
        )
            ? getCombatAnimationTimeline(clipId)
            : { actionTimeMs: 250 };
        let impactTimeMs = Number(attackTimeline.actionTimeMs) || 0;
        if (ev.projectileSprite) {
            impactTimeMs += 360;
        } else if (ev.spellFx && ev.spellFx.type === 'beam') {
            impactTimeMs += 500;
        }
        impactTimeMs = Math.max(
            34,
            impactTimeMs * Math.max(0.15, timeCompression)
        );

        // Put contact near the middle of the authored two-frame guard hold.
        // Slower powerful/ranged attacks therefore produce a longer, readable
        // brace without changing the attack or gameplay-event timeline.
        return getHumanoidDeflectPlaybackOptions(
            targetActor,
            impactTimeMs
        );
    }

    function playEnemyAttackFx(ev, onComplete, targetActor = null) {
        const sourceActor = getEnemyEventSourceActor(ev);
        const resolvedTarget = targetActor || player;
        const targetSize = Math.max(
            1,
            Number(resolvedTarget && resolvedTarget.size) || 1
        );
        const targetX = (Number(resolvedTarget && resolvedTarget.x) || 0)
            + ((targetSize - 1) / 2);
        const targetY = (Number(resolvedTarget && resolvedTarget.y) || 0)
            + ((targetSize - 1) / 2);
        if (
            !targetActor
            && typeof CombatSpriteAnimation !== 'undefined'
            && sourceActor
        ) {
            const sourceSize = Math.max(
                1,
                Number(sourceActor.size) || 1
            );
            CombatSpriteAnimation.faceActorToward(
                player,
                (Number(sourceActor.x) || 0) + ((sourceSize - 1) / 2)
            );
        }

        const clipId = getEnemyEventActionClip(ev, sourceActor);
        let released = false;
        function releaseAttack(event = {}) {
            if (released) return;
            released = true;
            const sourceSize = Math.max(
                1,
                Number(sourceActor && sourceActor.size) || 1
            );
            const releaseOrigin = event.releaseOrigin || {
                x: Number.isFinite(ev.ex)
                    ? ev.ex + ((sourceSize - 1) / 2)
                    : Number(sourceActor && sourceActor.x) || 0,
                y: Number.isFinite(ev.ey)
                    ? ev.ey + ((sourceSize - 1) / 2)
                    : Number(sourceActor && sourceActor.y) || 0
            };

            if (ev.spellFx && ev.spellFx.type === 'beam') {
                FXEngine.spawnBeam(
                    releaseOrigin.x,
                    releaseOrigin.y,
                    targetX,
                    targetY,
                    {
                        ...ev.spellFx,
                        speed: Math.max(
                            1,
                            (Number(ev.spellFx.speed) || 15)
                                * timeCompression
                        ),
                        onComplete
                    }
                );
            } else if (ev.projectileSprite) {
                FXEngine.spawnProjectile(
                    releaseOrigin.x,
                    releaseOrigin.y,
                    targetX,
                    targetY,
                    ev.projectileSprite,
                    {
                        arc: 0,
                        spin: false,
                        frames: Math.max(
                            3,
                            Math.round(20 * timeCompression)
                        ),
                        onComplete
                    }
                );
            } else {
                if (typeof FXEngine.spawnMeleeImpact === 'function') {
                    FXEngine.spawnMeleeImpact(targetX, targetY, clipId);
                }
                onComplete();
            }
        }

        const canAnimateSource = Boolean(
            sourceActor
            && typeof CombatSpriteAnimation !== 'undefined'
            && (
                typeof isHumanoidActor !== 'function'
                || isHumanoidActor(sourceActor)
            )
        );
        if (!canAnimateSource) {
            releaseAttack();
            return;
        }
        startCombatSpriteActionWhenReady(
            sourceActor,
            {
                clipId,
                targetX,
                targetY,
                playbackRate: 1 / Math.max(0.15, timeCompression),
                onEvent: releaseAttack
            },
            releaseAttack
        );
    }

    // 2. Play the events sequentially on the screen
    events.forEach(ev => {
        setTimeout(() => {
            const eventActorUid = getCombatEventActorUid(ev);
            if (eventActorUid) activeCombatActorUid = eventActorUid;
            const eventActor = eventActorUid ? getCombatActorByUid(eventActorUid) : null;
            if (eventActor && Number.isFinite(ev.stamina)) {
                eventActor.stamina = ev.stamina;
                if (Number.isFinite(ev.maxStamina)) eventActor.maxStamina = ev.maxStamina;
            }
            if (ev.type === 'move') {
                let e = ev.uid ? getCombatActorByUid(ev.uid) : [...enemies, ...allies, ...rogues].find(en => en.name === ev.name);
                if (e) {
                    e.x = ev.finalX;
                    e.y = ev.finalY;
                    e.combatMovementRate = Math.min(
                        1,
                        0.15 / Math.max(0.15, timeCompression)
                    );
                }
            }
            else if (ev.type === 'rest') {
                logMessage(`${ev.name || 'Combatant'} rests and recovers ${ev.recovered || 0} stamina.`);
            }
            else if (ev.type === 'crush') {
                if (typeof playRetroSound === 'function') playRetroSound('heavyAttack');
                logMessage(`💥 The massive ${ev.enemyName} crushes an obstacle in its path!`);
            }
            else if (ev.type === 'deflect') {
                const attacker = getEnemyEventSourceActor(ev);
                playHumanoidDefensiveReaction(
                    player,
                    attacker,
                    getDeflectPlaybackOptions(ev, attacker, player)
                );
                playEnemyAttackFx(ev, () => {
                    logMessage(`Deflected attack from ${ev.enemyName}!`);
                    FXEngine.spawnText(player.x, player.y, "DEFLECT", { color: "#3498db" });
                    if (typeof playRetroSound === 'function') playRetroSound('deflect');
                });
            }
            else if (ev.type === 'hit') {
                let executeHit = () => {
                    if (ev.playerStatusEffects) player.statusEffects = ev.playerStatusEffects;
                    playHumanoidImpactReaction(
                        player,
                        false,
                        compressedPlaybackOptions
                    );
                    const rangedLabel = ev.isRangedAttack ? " (Ranged)" : "";
                    if (ev.isCrit) {
                        logMessage(`💥 CRITICAL STRIKE! ${ev.enemyName} hits you for ${ev.damage} DMG!${rangedLabel}`);
                        FXEngine.spawnText(player.x, player.y, `-${ev.damage}!`, { color: "#9b59b6", isCrit: true });
                        if (typeof playRetroSound === 'function') playRetroSound('enemyCrit');
                    } else {
                        logMessage(`⚔️ ${ev.enemyName} hits you for ${ev.damage} DMG.${rangedLabel}`);
                        FXEngine.spawnText(player.x, player.y, `-${ev.damage}`, { color: "#e74c3c" });
                        if (typeof playRetroSound === 'function') playRetroSound('playerHit');
                    }

                    if (ev.statusApplied === 'poison') {
                        logMessage(`You are poisoned by ${ev.enemyName}!`);
                        FXEngine.spawnText(player.x, player.y, "POISON", { color: "#8e44ad" });
                    }
                };

                playEnemyAttackFx(ev, executeHit);
            }
            else if (ev.type === 'statusTick') {
                if (ev.status === 'poison') {
                    if (ev.targetType === 'enemy' || ev.targetType === 'actor') {
                        const e = getCombatActorByUid(ev.uid);
                        if (e) {
                            e.hp = Math.max(0, e.hp - ev.damage);
                            if (ev.killed) e.alive = false;
                            playHumanoidImpactReaction(
                                e,
                                ev.killed === true,
                                compressedPlaybackOptions
                            );
                            logMessage(`${e.name} suffers ${ev.damage} poison DMG.`);
                            FXEngine.spawnText(e.x, e.y, `-${ev.damage}`, { color: "#8e44ad" });
                        }
                    } else if (ev.targetType === 'player') {
                        playHumanoidImpactReaction(
                            player,
                            false,
                            compressedPlaybackOptions
                        );
                        logMessage(`Poison burns you for ${ev.damage} DMG.`);
                        FXEngine.spawnText(player.x, player.y, `-${ev.damage}`, { color: "#8e44ad" });
                    }
                }
            }
            else if (ev.type === 'actorDeflect') {
                const target = getCombatActorByUid(ev.targetUid);
                const attacker = getEnemyEventSourceActor(ev);
                playHumanoidDefensiveReaction(
                    target,
                    attacker,
                    getDeflectPlaybackOptions(ev, attacker, target)
                );
                playEnemyAttackFx(ev, () => {
                    if (target) FXEngine.spawnText(target.x, target.y, "DEFLECT", { color: "#3498db" });
                    logMessage(`${ev.targetName} deflected ${ev.sourceName}'s attack.`);
                    if (typeof playRetroSound === 'function') playRetroSound('deflect');
                }, target);
            }
            else if (ev.type === 'actorHit') {
                const target = getCombatActorByUid(ev.targetUid);
                playEnemyAttackFx(ev, () => {
                    if (target) {
                        target.hp = Math.max(0, target.hp - ev.damage);
                        if (ev.killed) target.alive = false;
                        if (ev.statusEffects) target.statusEffects = ev.statusEffects;
                        playHumanoidImpactReaction(
                            target,
                            ev.killed === true,
                            compressedPlaybackOptions
                        );
                        FXEngine.spawnText(target.x, target.y, ev.isCrit ? `-${ev.damage}!` : `-${ev.damage}`, {
                            color: ev.sourceTeamId === 'PLAYER' ? "#f1c40f" : "#e74c3c",
                            isCrit: ev.isCrit
                        });
                        if (ev.statusApplied === 'poison') FXEngine.spawnText(target.x, target.y, "POISON", { color: "#8e44ad" });
                    }
                    logMessage(`${ev.sourceName} hits ${ev.targetName} for ${ev.damage} DMG.`);
                    if (typeof playRetroSound === 'function') playRetroSound(ev.sourceTeamId === 'PLAYER' ? 'attack' : 'playerHit');
                }, target);
            }
            else if (ev.type === 'heal') {
                const healer = getEnemyEventSourceActor(ev);
                let healApplied = false;
                const applyHeal = () => {
                    if (healApplied) return;
                    healApplied = true;
                    player.hp = ev.hp || player.hp;
                    logMessage(`${ev.sourceName} patches you up for ${ev.amount} HP.`);
                    FXEngine.spawnText(player.x, player.y, `+${ev.amount}`, { color: "#2ecc71" });
                    if (typeof playRetroSound === 'function') playRetroSound('chug');
                };
                if (
                    healer
                    && typeof isHumanoidActor === 'function'
                    && isHumanoidActor(healer)
                ) {
                    startCombatSpriteActionWhenReady(
                        healer,
                        {
                            clipId: 'cast',
                            targetX: player.x,
                            targetY: player.y,
                            playbackRate:
                                compressedPlaybackOptions.playbackRate,
                            onEvent: applyHeal
                        },
                        applyHeal
                    );
                } else {
                    applyHeal();
                }
            }
            else if (ev.type === 'retreat') {
                const actor = getCombatActorByUid(ev.uid);
                if (actor) {
                    actor.alive = false;
                    actor.retreated = true;
                }
                logMessage(`${ev.actorName} retreats to safety.`);
            }
            else if (ev.type === 'steal') {
                logMessage(`🍺 The Mimic intercepts your gear inventory and chugs one of your Stouts!`);
            }
      else if (ev.type === 'death') {
                playHumanoidImpactReaction(
                    player,
                    true,
                    compressedPlaybackOptions
                );
                logMessage("💀 casualty verified. Transporting to safety structures.");
                if (typeof playRetroSound === 'function') playRetroSound('death');
                setTimeout(() => {
                    transitionToTown();
                    if (typeof saveGame === 'function') saveGame();
                    refreshSystemUI();
                }, 1500);
            }
            refreshSystemUI();
        }, delay);

        delay += getEnemyEventPlaybackDuration(ev) * timeCompression;
    });

    // 3. Finally, hand control back to the player!
    setTimeout(() => {
        if (combatDefeated) return;
        if (combatComplete) {
            presentCombatVictory();
            return;
        }

        // We only overwrite the grid with the server's truth AFTER the movie finishes playing!
        if (receipt.updatedCombatState) syncCombatCollectionsFromState(receipt.updatedCombatState);
        activeCombatActorUid = null;
        combatActionsRemaining = 0;

        if (player.hp > 0) {
            reachableTiles = null;
            // (Ghost Unlock remains removed!)
            if (typeof saveGame === 'function') saveGame();
            refreshSystemUI();
            if (typeof drawGrid === 'function') drawGrid();

            // === THE FIX: THE MOVIE HANDSHAKE ===
            // Tell the server the visual animation is finished so it can unpause the ATB Heartbeat!
            socket.emit('clientPlaybackComplete');
        }
    }, delay + 200);
});


// Global Game States
let currentGridSize = 8;
let currentTileSize = 60;
let gameState = 'KNIGHT';
let currentTurn = 'PLAYER';
let combatPhase = 'WAITING_FOR_ATB';
let combatActionsRemaining = 0;
let activeCombatZone = 'WILDERNESS';
let activeCombatFloorSpriteId = 'ground_wilderness';
let activeCombatFloorTiles = [];
let allies = [];
let rogues = [];
let combatParties = {};


// Target Tracking
let pendingMove = null;
let selectedEnemy = null;

function logMessage(msg) {
    const logDiv = document.getElementById("log");
    if (logDiv) {
        logDiv.innerHTML += "<br>" + msg;
        logDiv.scrollTop = logDiv.scrollHeight;
    }
}

function setGameState(state) {
    hideTooltip();

    // Remember where we just came from
    let previousState = gameState;

    gameState = state;

    // Play the door sound when shifting to a non-combat environment
    if (state === 'VAULT' || state === 'TOWN' || state === 'MERCHANT' || state === 'ADVENTURES') {
        if (typeof playRetroSound === 'function') playRetroSound('door');
    }

    refreshSystemUI();

    // NEW: Only auto-scroll for major screen changes, ignoring right-column tab swaps
    if (state === 'VAULT' || previousState === 'VAULT') {
        window.scrollTo(0, 0);
    }
}

// === NEW: MOBILE TOOLTIP DISMISSAL ===
document.addEventListener("touchstart", function(e) {
    // If the player taps somewhere on the screen that does NOT have a tooltip trigger...
    if (!e.target.closest('[onmouseenter]')) {
        // ...force the tooltip to hide!
        if (typeof hideTooltip === 'function') hideTooltip();
    }
}, {passive: true});

// === NEW: GLOBAL MUSIC INITIALIZER ===
// Listens for the very first click on the document to safely start the Audio API
document.addEventListener("click", function startMusicOnce() {
    if (typeof startBackgroundMusic === 'function') {
        startBackgroundMusic();
    }
    // Remove the listener so it doesn't keep firing every time they click
    document.removeEventListener("click", startMusicOnce);
}, { once: true });

// === RENDER WAKE-UP HEARTBEAT ===
// Render free tiers kill servers after 15 mins of HTTP inactivity, ignoring WebSockets.
// This silently pings the server every 10 minutes to keep your session alive and prevent 502s!
setInterval(() => {
    fetch('/').catch(err => console.log('Heartbeat skipped.'));
}, 10 * 60 * 1000);
