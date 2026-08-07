// Combat action dispatch, turn lifecycle, playback acknowledgement, and ATB loop.

const { sanitizeToken, clampInt } = require('../serverSecurity.js');
const { getMaxHp, getMaxStamina } = require('../combatMath.js');
const { recoverActorStamina } = require('../combatResources.js');
const { recoverUnusedActionStamina } = require('../combatTurnRecovery.js');
const { resolveActorDefeat } = require('../combatResolution.js');
const {
    getAdventureSnapshot,
    failActiveExpedition,
    hasActiveJourney
} = require('../adventureState.js');
const { executeActorTurn } = require('../combatAI.js');
const { tickPoison } = require('../combatStatus.js');
const { applyPlayerCombatDefeat } = require('../combatDefeat.js');
const {
    beginCombatPlayback,
    acknowledgeCombatPlayback,
    isCombatPlaybackLocked
} = require('../combatPlayback.js');
const {
    syncCombatViews,
    syncPlayerActor,
    getPlayerActor,
    getAliveActors,
    isPlayerActor
} = require('../combatActors.js');
const {
    PARTY_PLAYER,
    isManualPartyActor,
    activatePartyActor,
    clearActivePartyActor
} = require('../combatParties.js');

module.exports = function registerTurnHandlers({
    socket,
    io,
    activePlayers,
    activeCombats,
    persistPlayer,
    shared,
    weaponActions,
    consumableActions
}) {
    const {
        getCombatTurnActor,
        getActorStatValue,
        emitCombatResultError,
        finishPlayerControlledTurn,
        completePlayerControlledAction
    } = shared;
    const {
        handleWeaponAction,
        handleActorWeaponAction,
        handleEquipmentAttackAction
    } = weaponActions;
    const {
        handleConsumableAction,
        handleActorConsumableAction,
        handleCombatEquip,
        emitCombatEquipError
    } = consumableActions;
    const combatContext = { activePlayers, activeCombats, io, persistPlayer };

    function persistCombatMutation(player, reason) {
        if (!player || typeof persistPlayer !== 'function') return;
        void Promise.resolve(persistPlayer(player, { reason })).catch(() => undefined);
    }

    function resolveDefeat(target, details = {}) {
        return resolveActorDefeat(socket.id, target, combatContext, details);
    }

    socket.on('dispatchCombatAction', data => {
        const player = activePlayers[socket.id];
        const combat = activeCombats[socket.id];
        if (!data || typeof data !== 'object') {
            return emitCombatResultError(
                socket,
                player,
                combat,
                null,
                'Server: Invalid combat action payload.'
            );
        }

        data.actionCategory = sanitizeToken(data.actionCategory, '');
        data.subType = sanitizeToken(data.subType, 'standard');
        data.equipmentSlot = sanitizeToken(data.equipmentSlot, '');
        data.actionId = sanitizeToken(data.actionId, '');
        data.itemId = sanitizeToken(data.itemId, '');
        if (combat && data.tx !== undefined && data.ty !== undefined) {
            data.tx = clampInt(data.tx, 0, combat.gridSize.cols - 1, 0);
            data.ty = clampInt(data.ty, 0, combat.gridSize.rows - 1, 0);
        }

        if (!player) {
            return emitCombatResultError(
                socket,
                null,
                combat,
                null,
                'Server connection lost. Please refresh the page.'
            );
        }
        if (
            data.actionCategory !== 'flee'
            && combat
            && isCombatPlaybackLocked(combat)
        ) {
            return emitCombatResultError(
                socket,
                player,
                combat,
                null,
                'Tactical Error: Wait for the current action to finish.'
            );
        }
        if (data.actionCategory !== 'flee' && (!combat || combat.atbPaused !== true)) {
            return emitCombatResultError(
                socket,
                player,
                combat,
                null,
                'Tactical Error: It is not your turn.'
            );
        }

        if (data.actionCategory === 'flee') {
            const adventureOutcome = hasActiveJourney(player)
                ? failActiveExpedition(player, 'fled_combat')
                : null;
            player.pendingGold = 0;
            player.pendingXp = 0;
            player.pendingLoot = [];
            player.statusEffects = {};
            player.activeBuffs = [];
            player.activeCombatBuff = null;
            player.hp = getMaxHp(player);
            player.stamina = getMaxStamina(player);
            delete player.pendingMercenaryXpContext;
            delete activeCombats[socket.id];
            persistCombatMutation(
                player,
                adventureOutcome ? 'expedition_fled' : 'combat_fled'
            );
            if (adventureOutcome) {
                socket.emit('adventureProgress', {
                    ...adventureOutcome,
                    reason: 'fled_combat',
                    adventureState: getAdventureSnapshot(player)
                });
            }
            return socket.emit('combatResult', {
                type: 'flee',
                updatedPlayer: player,
                adventureOutcome,
                adventureState: getAdventureSnapshot(player)
            });
        }

        const activeActor = getCombatTurnActor(combat, player);
        if (!activeActor) {
            clearActivePartyActor(combat, combat.activeActorUid || null);
            return emitCombatResultError(
                socket,
                player,
                combat,
                null,
                'Tactical turn resynchronized. Waiting for the next party member.'
            );
        }

        if (data.actionCategory === 'rest') {
            const recovered = recoverActorStamina(activeActor, player);
            const actionResult = completePlayerControlledAction(combat, player, activeActor);
            socket.emit('combatResult', {
                type: 'rest',
                actorUid: activeActor.uid,
                actorName: activeActor.name,
                updatedPlayer: player,
                updatedCombatState: combat,
                recovered,
                actionsRemaining: actionResult.actionsRemaining,
                turnComplete: actionResult.turnComplete
            });
            return;
        }

        if (data.actionCategory === 'endTurn' || data.actionCategory === 'pass') {
            const recovery = recoverUnusedActionStamina(combat, activeActor, player);
            finishPlayerControlledTurn(combat, player, activeActor);
            socket.emit('combatResult', {
                type: 'endTurn',
                actorUid: activeActor.uid,
                actorName: activeActor.name,
                updatedPlayer: player,
                updatedCombatState: combat,
                recovered: recovery.recovered,
                unusedActionCredits: recovery.unusedActionCredits,
                actionsRemaining: 0,
                turnComplete: true
            });
            return;
        }

        if (data.actionCategory === 'weapon') {
            if (isPlayerActor(activeActor)) {
                handleWeaponAction(
                    socket,
                    player,
                    combat,
                    data,
                    resolveDefeat,
                    activeActor
                );
            } else {
                handleActorWeaponAction(
                    socket,
                    player,
                    combat,
                    data,
                    resolveDefeat,
                    activeActor
                );
            }
            return;
        }

        if (data.actionCategory === 'equipmentAttack') {
            return handleEquipmentAttackAction(
                socket,
                player,
                combat,
                data,
                resolveDefeat,
                activeActor
            );
        }

        if (data.actionCategory === 'consumable') {
            if (isPlayerActor(activeActor)) {
                handleConsumableAction(
                    socket,
                    player,
                    combat,
                    data,
                    resolveDefeat,
                    activeActor
                );
            } else {
                handleActorConsumableAction(socket, player, combat, data, activeActor);
            }
            return;
        }

        if (data.actionCategory === 'equip') {
            if (!isPlayerActor(activeActor)) {
                return emitCombatEquipError(
                    socket,
                    player,
                    combat,
                    activeActor,
                    `${activeActor.name} cannot swap gear mid-combat yet.`
                );
            }
            return handleCombatEquip(socket, player, combat, data, activeActor);
        }

        return emitCombatResultError(
            socket,
            player,
            combat,
            activeActor,
            'Server: Unsupported combat action.'
        );
    });

    // Kept for older clients; this follows the same recovery path as Pass.
    socket.on('endPlayerTurn', (data = {}) => {
        const player = activePlayers[socket.id];
        const combat = activeCombats[socket.id];
        if (!player || !combat) return;
        if (isCombatPlaybackLocked(combat)) {
            return emitCombatResultError(
                socket,
                player,
                combat,
                null,
                'Tactical Error: Wait for the current action to finish.'
            );
        }
        syncPlayerActor(combat, player);
        const activeActor = getCombatTurnActor(combat, player);
        if (!activeActor) return;
        recoverUnusedActionStamina(combat, activeActor, player);
        finishPlayerControlledTurn(combat, player, activeActor);
    });

    socket.on('clientPlaybackComplete', (payload = {}) => {
        const combat = activeCombats[socket.id];
        const playbackId = typeof payload === 'string'
            ? payload
            : payload && payload.playbackId;
        acknowledgeCombatPlayback(combat, playbackId);
    });

    return function startAtbEngine() {
        if (global.atbEngineStarted) return;
        global.atbEngineStarted = true;
        setInterval(runAtbTick, 200);
    };

    function runAtbTick() {
        for (const socketId in activeCombats) {
            runCombatAtbTick(socketId);
        }
    }

    function runCombatAtbTick(socketId) {
        const combat = activeCombats[socketId];
        const player = activePlayers[socketId];
        if (!player || !combat) return;
        const playbackLocked = isCombatPlaybackLocked(combat);
        if (combat.atbPaused || playbackLocked) return;

        syncCombatViews(combat, player);
        const playerActor = getPlayerActor(combat);
        if (!playerActor) return;

        const controlledActors = getAliveActors(combat).filter(actor => (
            isManualPartyActor(actor, PARTY_PLAYER)
        ));
        controlledActors.forEach(actor => {
            const actorSpeed = (getActorStatValue(actor, player, 'speed') * 3) + 5;
            actor.atbCharge = Math.min(100, (actor.atbCharge || 0) + actorSpeed);
            if (isPlayerActor(actor)) combat.player.atbCharge = actor.atbCharge;
        });

        getAliveActors(combat).forEach(actor => {
            if (isManualPartyActor(actor, PARTY_PLAYER)) return;
            const actorSpeed = ((actor.speed || 1) * 3) + 5;
            actor.atbCharge = Math.min(100, (actor.atbCharge || 0) + actorSpeed);
        });

        const readyControlledActor = controlledActors.find(actor => actor.atbCharge >= 100);
        if (readyControlledActor) {
            handleReadyControlledActor(socketId, combat, player, readyControlledActor);
            return;
        }
        handleReadyAiActors(socketId, combat, player);
    }

    function handleReadyControlledActor(socketId, combat, player, readyActor) {
        const poisonTarget = isPlayerActor(readyActor) ? player : readyActor;
        const poisonTick = tickPoison(poisonTarget);
        let poisonResolution = null;
        if (poisonTick && poisonTick.killed && !isPlayerActor(readyActor)) {
            poisonResolution = resolveActorDefeat(socketId, readyActor, combatContext, {
                cause: 'poison',
                sourceUid: poisonTick.sourceUid,
                sourceName: poisonTick.sourceName,
                sourceKind: poisonTick.sourceKind
            });
        }
        if (poisonTick) {
            io.to(socketId).emit('statusEffectReceipt', {
                events: [{
                    type: 'statusTick',
                    targetType: isPlayerActor(readyActor) ? 'player' : 'actor',
                    uid: readyActor.uid,
                    actorName: readyActor.name,
                    status: 'poison',
                    damage: poisonTick.damage,
                    killed: poisonTick.killed
                }],
                updatedPlayer: player,
                updatedCombatState: poisonResolution && poisonResolution.combatComplete
                    ? null
                    : syncCombatViews(combat, player),
                combatComplete: !!(poisonResolution && poisonResolution.combatComplete)
            });
        }

        if (isPlayerActor(readyActor) && player.hp <= 0) {
            applyPlayerCombatDefeat(player);
            delete activeCombats[socketId];
            persistCombatMutation(player, 'combat_defeat');
            io.to(socketId).emit('enemyTurnReceipt', {
                events: [{ type: 'death' }],
                updatedPlayer: player,
                updatedCombatState: null,
                combatDefeated: true
            });
            return;
        }
        if (!isPlayerActor(readyActor) && readyActor.hp <= 0) return;
        if (!activatePartyActor(combat, readyActor)) return;
        io.to(socketId).emit('ATB_READY', {
            actorUid: readyActor.uid,
            actorName: readyActor.name,
            actorKind: readyActor.kind,
            actionsRemaining: combat.actionsRemaining,
            turnSequence: combat.turnSequence
        });
    }

    function handleReadyAiActors(socketId, combat, player) {
        const readyActors = getAliveActors(combat).filter(actor => (
            !isManualPartyActor(actor, PARTY_PLAYER) && actor.atbCharge >= 100
        ));
        if (readyActors.length === 0) return;

        const masterEventList = [];
        let combatComplete = false;
        const onActorDefeated = (actor, details = {}) => {
            const result = resolveActorDefeat(socketId, actor, combatContext, details);
            combatComplete = combatComplete || !!(result && result.combatComplete);
            return result;
        };

        for (const actor of readyActors) {
            if (!activeCombats[socketId] || combatComplete) break;
            actor.atbCharge = 0;
            const poisonTick = tickPoison(actor);
            if (poisonTick) {
                masterEventList.push({
                    type: 'statusTick',
                    targetType: actor.kind === 'player' ? 'player' : 'actor',
                    uid: actor.uid,
                    actorName: actor.name,
                    enemyName: actor.name,
                    status: 'poison',
                    damage: poisonTick.damage,
                    killed: poisonTick.killed
                });
                if (poisonTick.killed) {
                    const resolution = onActorDefeated(actor, {
                        cause: 'poison',
                        sourceUid: poisonTick.sourceUid,
                        sourceName: poisonTick.sourceName,
                        sourceKind: poisonTick.sourceKind
                    });
                    if (resolution && resolution.retreated) {
                        masterEventList.push({
                            type: 'retreat',
                            uid: actor.uid,
                            actorName: actor.name,
                            teamId: actor.teamId
                        });
                    }
                }
                if (poisonTick.killed) continue;
            }
            const events = executeActorTurn(
                socketId,
                combat,
                player,
                actor,
                activeCombats,
                onActorDefeated
            );
            if (events && events.length > 0) masterEventList.push(...events);
        }

        if (masterEventList.length === 0) return;
        const combatDefeated = masterEventList.some(event => event && event.type === 'death');
        const encounterEnded = combatDefeated || combatComplete;
        const playbackId = encounterEnded ? null : beginCombatPlayback(combat);
        io.to(socketId).emit('enemyTurnReceipt', {
            events: masterEventList,
            updatedPlayer: player,
            updatedCombatState: encounterEnded ? null : syncCombatViews(combat, player),
            combatDefeated,
            combatComplete,
            turnSequence: Number.isSafeInteger(combat.turnSequence)
                ? combat.turnSequence
                : 0,
            ...(playbackId ? { playbackId } : {})
        });
    }
};
