// --- combatRouter.js ---
// Socket wiring for server-authoritative combat.

const { SpellDatabase } = require('./public/js/spells.js');
const { sanitizeToken, clampInt, getArrayIndex } = require('./serverSecurity.js');
const {
    getGridDistance,
    checkLineOfSight,
    getLineOfEffectPath,
    getEffectiveStat,
    getMaxHp,
    getMaxStamina
} = require('./combatMath.js');
const {
    getActorMaxStamina,
    getActorStamina: getActorStaminaValue,
    spendActorStamina,
    recoverActorStamina,
    getMoveStaminaCost
} = require('./combatResources.js');
const { ensureActionTurn, consumeAction } = require('./combatTurns.js');
const { recoverUnusedActionStamina } = require('./combatTurnRecovery.js');
const { findCompanionByInstanceId } = require('./companionRoster.js');
const { claimCombatRewards } = require('./combatRewards.js');
const { resolveActorDefeat } = require('./combatResolution.js');
const { createCombatEncounter } = require('./combatEncounters.js');
const {
    getAdventureSnapshot,
    failActiveExpedition,
    hasActiveJourney
} = require('./adventureState.js');
const { executeActorTurn } = require('./combatAI.js');
const { applyPoison, tickPoison } = require('./combatStatus.js');
const { applyPlayerCombatDefeat } = require('./combatDefeat.js');
const {
    beginCombatPlayback,
    acknowledgeCombatPlayback,
    isCombatPlaybackLocked
} = require('./combatPlayback.js');
const {
    EQUIPMENT_SLOTS,
    equipItemWithHandRules
} = require('./equipmentHandRules.js');
const {
    resolveEquipmentAttack
} = require('./public/js/equipment-actions.js');
const {
    syncCombatViews,
    syncPlayerActor,
    getPlayerActor,
    getAliveActors,
    getHostileActorsFor,
    getPlayerAttackTargets,
    isActorAlive,
    isPlayerActor,
    isBlockingActor
} = require('./combatActors.js');
const {
    PARTY_PLAYER,
    CONTROL_MANUAL,
    isManualPartyActor,
    getActivePartyActor,
    activatePartyActor,
    clearActivePartyActor
} = require('./combatParties.js');

function getCombatTurnActor(combat, player) {
    syncCombatViews(combat, player);
    const actor = getActivePartyActor(combat, {
        partyId: PARTY_PLAYER,
        controlMode: CONTROL_MANUAL,
        isEligible: isActorAlive
    });
    return actor && ensureActionTurn(combat, actor.uid) ? actor : null;
}

function getActorEquipment(actor, player) {
    return isPlayerActor(actor) ? (player.equipment || {}) : (actor.equipment || {});
}

function getResolvedEquipmentAction(equipment, equipmentSlot, actionId) {
    if (!equipment || !EQUIPMENT_SLOTS.includes(equipmentSlot) || !actionId) {
        return null;
    }

    const action = resolveEquipmentAttack(equipment, equipmentSlot, actionId);
    if (!action || action.equipmentSlot !== equipmentSlot || action.id !== actionId) {
        return null;
    }
    return action;
}

function getEquipmentActionRules(action) {
    return action && action.rules && typeof action.rules === 'object'
        ? action.rules
        : action;
}

function isShieldBlockAction(action) {
    return !!action && (
        action.actionType === 'guard'
        || action.id === 'shield_block'
        || action.clipId === 'shield_block'
    );
}

function getActorStatValue(actor, player, statKey) {
    if (isPlayerActor(actor)) return getEffectiveStat(player, statKey);
    return Math.max(1, Math.trunc(Number(actor[statKey]) || 1));
}

function getActorMaxHpValue(actor, player) {
    return isPlayerActor(actor) ? getMaxHp(player) : (actor.maxHp || actor.hp || 1);
}

function getActorStatusContainer(actor, player) {
    if (isPlayerActor(actor)) {
        player.statusEffects = player.statusEffects || {};
        return player.statusEffects;
    }
    actor.statusEffects = actor.statusEffects || {};
    return actor.statusEffects;
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

function buildFallbackWeapon() {
    return {
        spriteId: 'icon_punch',
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: 'lunge_bash' },
            special: { name: 'Haymaker', range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false }
        }
    };
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

module.exports = function(socket, io, activePlayers, activeCombats) {
    const combatContext = { activePlayers, activeCombats, io };
    function resolveDefeat(target, details = {}) {
        return resolveActorDefeat(socket.id, target, combatContext, details);
    }

    socket.on('dispatchCombatAction', (data) => {
        const p = activePlayers[socket.id];
        const combat = activeCombats[socket.id];
        if (!data || typeof data !== 'object') {
            return emitCombatResultError(
                socket,
                p,
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

        if (!p) {
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
                p,
                combat,
                null,
                'Tactical Error: Wait for the current action to finish.'
            );
        }

        if (data.actionCategory !== 'flee' && (!combat || combat.atbPaused !== true)) {
            return emitCombatResultError(
                socket,
                p,
                combat,
                null,
                'Tactical Error: It is not your turn.'
            );
        }

        if (data.actionCategory === 'flee') {
            const adventureOutcome = hasActiveJourney(p)
                ? failActiveExpedition(p, 'fled_combat')
                : null;
            p.pendingGold = 0;
            p.pendingXp = 0;
            p.pendingLoot = [];
            p.cellarsChummed = false;
            p.statusEffects = {};
            p.activeBuffs = [];
            p.activeCombatBuff = null;
            p.hp = getMaxHp(p);
            p.stamina = getMaxStamina(p);
            delete p.pendingMercenaryXpContext;
            delete activeCombats[socket.id];
            if (adventureOutcome) {
                socket.emit('adventureProgress', {
                    ...adventureOutcome,
                    reason: 'fled_combat',
                    adventureState: getAdventureSnapshot(p)
                });
            }
            return socket.emit('combatResult', {
                type: 'flee',
                updatedPlayer: p,
                adventureOutcome,
                adventureState: getAdventureSnapshot(p)
            });
        }

        const activeActor = getCombatTurnActor(combat, p);
        if (!activeActor) {
            clearActivePartyActor(combat, combat.activeActorUid || null);
            return emitCombatResultError(
                socket,
                p,
                combat,
                null,
                'Tactical turn resynchronized. Waiting for the next party member.'
            );
        }

        if (data.actionCategory === 'rest') {
            const recovered = recoverActorStamina(activeActor, p);
            const actionResult = completePlayerControlledAction(combat, p, activeActor);
            socket.emit('combatResult', {
                type: 'rest',
                actorUid: activeActor.uid,
                actorName: activeActor.name,
                updatedPlayer: p,
                updatedCombatState: combat,
                recovered,
                actionsRemaining: actionResult.actionsRemaining,
                turnComplete: actionResult.turnComplete
            });
            return;
        }

        if (data.actionCategory === 'endTurn' || data.actionCategory === 'pass') {
            const recovery = recoverUnusedActionStamina(combat, activeActor, p);
            finishPlayerControlledTurn(combat, p, activeActor);
            socket.emit('combatResult', {
                type: 'endTurn',
                actorUid: activeActor.uid,
                actorName: activeActor.name,
                updatedPlayer: p,
                updatedCombatState: combat,
                recovered: recovery.recovered,
                unusedActionCredits: recovery.unusedActionCredits,
                actionsRemaining: 0,
                turnComplete: true
            });
            return;
        }


        if (data.actionCategory === 'weapon') {
            if (isPlayerActor(activeActor)) handleWeaponAction(socket, p, combat, data, resolveDefeat, activeActor);
            else handleActorWeaponAction(socket, p, combat, data, resolveDefeat, activeActor);
            return;
        }

        if (data.actionCategory === 'equipmentAttack') {
            return handleEquipmentAttackAction(
                socket,
                p,
                combat,
                data,
                resolveDefeat,
                activeActor
            );
        }

        if (data.actionCategory === 'consumable') {
            if (isPlayerActor(activeActor)) handleConsumableAction(socket, p, combat, data, resolveDefeat, activeActor);
            else handleActorConsumableAction(socket, p, combat, data, activeActor);
            return;
        }

        if (data.actionCategory === 'equip') {
            if (!isPlayerActor(activeActor)) {
                return emitCombatEquipError(
                    socket,
                    p,
                    combat,
                    activeActor,
                    `${activeActor.name} cannot swap gear mid-combat yet.`
                );
            }
            return handleCombatEquip(socket, p, combat, data, activeActor);
        }

        return emitCombatResultError(
            socket,
            p,
            combat,
            activeActor,
            'Server: Unsupported combat action.'
        );
    });

    socket.on('deployToCombat', (data) => {
        const p = activePlayers[socket.id];
        if (!p) return;
        if (!data || typeof data !== 'object') return;

        if (hasActiveJourney(p)) {
            return socket.emit('adventureReceipt', {
                action: 'legacyDeploy',
                success: false,
                code: 'ACTIVE_JOURNEY',
                message: 'Finish or abandon the active expedition before using legacy deployments.',
                adventureState: getAdventureSnapshot(p)
            });
        }

        p.idleJob = 'NONE';
        p.pendingXp = 0;
        delete p.pendingMercenaryXpContext;
        p.statusEffects = {};
        p.activeBuffs = [];
        p.activeCombatBuff = null;

        const combatState = createCombatEncounter(p, data);
        if (!combatState) return;

        activeCombats[socket.id] = syncCombatViews(combatState, p);
        io.to(socket.id).emit('combatDeployed', activeCombats[socket.id]);
    });

    socket.on('endPlayerTurn', (data = {}) => {
        const p = activePlayers[socket.id];
        const combat = activeCombats[socket.id];
        if (!p || !combat) return;

        if (isCombatPlaybackLocked(combat)) {
            return emitCombatResultError(
                socket,
                p,
                combat,
                null,
                'Tactical Error: Wait for the current action to finish.'
            );
        }

        syncPlayerActor(combat, p);
        const activeActor = getCombatTurnActor(combat, p);
        if (!activeActor) return;
        recoverUnusedActionStamina(combat, activeActor, p);
        finishPlayerControlledTurn(combat, p, activeActor);
    });

    socket.on('clientPlaybackComplete', (payload = {}) => {
        const combat = activeCombats[socket.id];
        const playbackId = typeof payload === 'string'
            ? payload
            : payload && payload.playbackId;
        acknowledgeCombatPlayback(combat, playbackId);
    });

    socket.on('combatMove', (data) => {
        const p = activePlayers[socket.id];
        const combat = activeCombats[socket.id];
        if (!data || typeof data !== 'object') {
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Server: Invalid movement payload.',
                updatedCombatState: combat && p
                    ? syncCombatViews(combat, p)
                    : null
            });
        }

        if (!p || !combat) return socket.emit('moveReceipt', { success: false, message: 'Server connection lost. Please refresh the page.' });

        if (isCombatPlaybackLocked(combat)) {
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Tactical Error: Wait for the current action to finish.',
                x: combat.player.x,
                y: combat.player.y,
                updatedCombatState: syncCombatViews(combat, p)
            });
        }

        if (combat.atbPaused !== true) {
            return socket.emit('moveReceipt', { success: false, message: 'Tactical Error: Cannot move out of turn.', x: combat.player.x, y: combat.player.y });
        }

        const activeActor = getCombatTurnActor(combat, p);
        if (!activeActor) {
            clearActivePartyActor(combat, combat.activeActorUid || null);
            return socket.emit('moveReceipt', {
                success: false,
                message: 'Tactical turn resynchronized. Waiting for the next party member.',
                x: combat.player.x,
                y: combat.player.y,
                updatedCombatState: syncCombatViews(combat, p)
            });
        }
        let speed = getActorStatValue(activeActor, p, 'speed');
        speed = Math.max(1, Math.min(12, speed));
        const tx = clampInt(data.tx, 0, combat.gridSize.cols - 1, activeActor.x);
        const ty = clampInt(data.ty, 0, combat.gridSize.rows - 1, activeActor.y);
        const dist = getGridDistance(activeActor.x, activeActor.y, tx, ty, activeActor.size || 1);

        if (tx < 0 || tx >= combat.gridSize.cols || ty < 0 || ty >= combat.gridSize.rows) {
            return socket.emit('moveReceipt', { success: false, message: 'Server: Coordinates out of bounds.', x: activeActor.x, y: activeActor.y, actorUid: activeActor.uid });
        }
        if (combat.obstacles.some(o => o.x === tx && o.y === ty)) {
            return socket.emit('moveReceipt', { success: false, message: 'Server: Obstacle collision detected.', x: activeActor.x, y: activeActor.y, actorUid: activeActor.uid });
        }
        syncCombatViews(combat, p);
        const hitActor = getAliveActors(combat).some(actor => {
            if (!isBlockingActor(actor) || actor.uid === activeActor.uid) return false;
            const s = actor.size || 1;
            return tx >= actor.x && tx < actor.x + s && ty >= actor.y && ty < actor.y + s;
        });
        if (hitActor) {
            return socket.emit('moveReceipt', { success: false, message: 'Server: Entity collision detected.', x: activeActor.x, y: activeActor.y, actorUid: activeActor.uid });
        }

        const moveStaminaCost = getMoveStaminaCost(dist, speed);

        if (getActorStaminaValue(activeActor, p) >= moveStaminaCost) {
            spendActorStamina(activeActor, p, moveStaminaCost);
            activeActor.x = tx;
            activeActor.y = ty;
            if (isPlayerActor(activeActor)) {
                combat.player.x = tx;
                combat.player.y = ty;
            }
            const actionResult = completePlayerControlledAction(combat, p, activeActor);
            socket.emit('moveReceipt', {
                success: true,
                actorUid: activeActor.uid,
                updatedPlayer: p,
                updatedCombatState: combat,
                actionsRemaining: actionResult.actionsRemaining,
                turnComplete: actionResult.turnComplete
            });
        } else {
            socket.emit('moveReceipt', { success: false, message: `Server: Not enough stamina to move (${Math.floor(getActorStaminaValue(activeActor, p))}/${moveStaminaCost}).`, x: activeActor.x, y: activeActor.y, actorUid: activeActor.uid });
        }
    });

    socket.on('takePendingLoot', (idx) => {
        const p = activePlayers[socket.id];
        const lootIndex = getArrayIndex(idx, p && p.pendingLoot);
        if (!p || lootIndex < 0) return;

        p.maxInventorySlots = p.maxInventorySlots || 5;
        if (p.inventory.length < p.maxInventorySlots) {
            const securedItem = p.pendingLoot.splice(lootIndex, 1)[0];
            p.inventory.push(securedItem);
            socket.emit('inventoryReceipt', { success: true, action: 'takeLoot', updatedPlayer: p, message: `Secured ${securedItem.name} in backpack.` });
        } else {
            socket.emit('inventoryReceipt', { success: false, message: "Backpack is full!" });
        }
    });

    socket.on('sellPendingLoot', (idx) => {
        const p = activePlayers[socket.id];
        const lootIndex = getArrayIndex(idx, p && p.pendingLoot);
        if (!p || lootIndex < 0) return;

        const itemToSell = p.pendingLoot.splice(lootIndex, 1)[0];
        const val = itemToSell.value || (itemToSell.rarity === "Gorilla" ? 500 : 15);
        p.gold += val;

        socket.emit('inventoryReceipt', { success: true, action: 'sell', updatedPlayer: p, message: `Sold dropped item for ${val}g.` });
    });

    socket.on('claimCombatRewards', () => {
        const p = activePlayers[socket.id];
        if (!p) return;
        if (activeCombats[socket.id]) {
            return socket.emit('combatRewardsReceipt', { success: false, message: 'Combat rewards can only be claimed after victory.' });
        }

        claimCombatRewards(p);
        p.statusEffects = {};
        socket.emit('combatRewardsReceipt', {
            success: true,
            updatedPlayer: p,
            adventureState: getAdventureSnapshot(p)
        });
    });

    if (!global.atbEngineStarted) {
        global.atbEngineStarted = true;

        setInterval(() => {
            for (const socketId in activeCombats) {
                const combat = activeCombats[socketId];
                const p = activePlayers[socketId];

                if (!p || !combat) continue;
                const playbackLocked = isCombatPlaybackLocked(combat);
                if (combat.atbPaused || playbackLocked) continue;

                syncCombatViews(combat, p);
                const playerActor = getPlayerActor(combat);
                if (!playerActor) continue;

                const controlledActors = getAliveActors(combat).filter(actor => isManualPartyActor(actor, PARTY_PLAYER));
                controlledActors.forEach(actor => {
                    const actorSpeed = ((getActorStatValue(actor, p, 'speed') * 3) + 5);
                    actor.atbCharge = Math.min(100, (actor.atbCharge || 0) + actorSpeed);
                    if (isPlayerActor(actor)) combat.player.atbCharge = actor.atbCharge;
                });

                getAliveActors(combat).forEach(actor => {
                    if (isManualPartyActor(actor, PARTY_PLAYER)) return;
                    const actorSpeed = (((actor.speed || 1) * 3) + 5);
                    actor.atbCharge = Math.min(100, (actor.atbCharge || 0) + actorSpeed);
                });

                const readyControlledActor = controlledActors.find(actor => actor.atbCharge >= 100);
                if (readyControlledActor) {
                    const poisonTarget = isPlayerActor(readyControlledActor) ? p : readyControlledActor;
                    const poisonTick = tickPoison(poisonTarget);
                    let poisonResolution = null;
                    if (poisonTick && poisonTick.killed && !isPlayerActor(readyControlledActor)) {
                        poisonResolution = resolveActorDefeat(socketId, readyControlledActor, combatContext, {
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
                                targetType: isPlayerActor(readyControlledActor) ? 'player' : 'actor',
                                uid: readyControlledActor.uid,
                                actorName: readyControlledActor.name,
                                status: 'poison',
                                damage: poisonTick.damage,
                                killed: poisonTick.killed
                            }],
                            updatedPlayer: p,
                            updatedCombatState: poisonResolution && poisonResolution.combatComplete
                                ? null
                                : syncCombatViews(combat, p),
                            combatComplete: !!(poisonResolution && poisonResolution.combatComplete)
                        });
                    }

                    if (isPlayerActor(readyControlledActor) && p.hp <= 0) {
                        applyPlayerCombatDefeat(p);
                        delete activeCombats[socketId];
                        io.to(socketId).emit('enemyTurnReceipt', {
                            events: [{ type: 'death' }],
                            updatedPlayer: p,
                            updatedCombatState: null,
                            combatDefeated: true
                        });
                        continue;
                    }
                    if (!isPlayerActor(readyControlledActor) && readyControlledActor.hp <= 0) {
                        continue;
                    }

                    if (!activatePartyActor(combat, readyControlledActor)) continue;
                    io.to(socketId).emit('ATB_READY', {
                        actorUid: readyControlledActor.uid,
                        actorName: readyControlledActor.name,
                        actorKind: readyControlledActor.kind,
                        actionsRemaining: combat.actionsRemaining,
                        turnSequence: combat.turnSequence
                    });
                } else {
                    const readyActors = getAliveActors(combat)
                        .filter(actor => !isManualPartyActor(actor, PARTY_PLAYER) && actor.atbCharge >= 100);

                    if (readyActors.length > 0) {
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
                                        masterEventList.push({ type: 'retreat', uid: actor.uid, actorName: actor.name, teamId: actor.teamId });
                                    }
                                }
                                if (poisonTick.killed) continue;
                            }
                            const events = executeActorTurn(socketId, combat, p, actor, activeCombats, onActorDefeated);
                            if (events && events.length > 0) masterEventList.push(...events);
                        }
                        if (masterEventList.length > 0) {
                            const combatDefeated = masterEventList.some(ev => ev && ev.type === 'death');
                            const encounterEnded = combatDefeated || combatComplete;
                            const playbackId = encounterEnded
                                ? null
                                : beginCombatPlayback(combat);
                            io.to(socketId).emit('enemyTurnReceipt', {
                                events: masterEventList,
                                updatedPlayer: p,
                                updatedCombatState: encounterEnded ? null : syncCombatViews(combat, p),
                                combatDefeated,
                                combatComplete,
                                turnSequence: Number.isSafeInteger(combat.turnSequence)
                                    ? combat.turnSequence
                                    : 0,
                                ...(playbackId ? { playbackId } : {})
                            });
                        }
                    }
                }
            }
        }, 200);
    }
};

function rollSpellDamage(p, spellData, combatRules) {
    const offense = getEffectiveStat(p, "offense");
    const scale = spellData.powerScale !== undefined ? spellData.powerScale : 0;
    const multiplier = combatRules.multiplier || 1;
    const base = Math.max(1, Math.floor(((spellData.damageFlat || 0) + (offense * scale)) * multiplier));
    const minDmg = Math.max(1, Math.ceil(base * 0.85));
    const damage = Math.floor(Math.random() * (base - minDmg + 1)) + minDmg;
    return { damage, isCrit: damage >= Math.floor(base * 0.95) };
}

function rollActorSpellDamage(actor, p, spellData, combatRules) {
    const offense = getActorStatValue(actor, p, 'offense');
    const scale = spellData.powerScale !== undefined ? spellData.powerScale : 0;
    const multiplier = combatRules.multiplier || 1;
    const base = Math.max(1, Math.floor(((spellData.damageFlat || 0) + (offense * scale)) * multiplier));
    const minDmg = Math.max(1, Math.ceil(base * 0.85));
    const damage = Math.floor(Math.random() * (base - minDmg + 1)) + minDmg;
    return { damage, isCrit: damage >= Math.floor(base * 0.95) };
}

function getEnemyAtTile(combat, tx, ty) {
    return getPlayerAttackTargets(combat).find(enemy => {
        if (!isActorAlive(enemy)) return false;
        const s = enemy.size || 1;
        return tx >= enemy.x && tx < enemy.x + s && ty >= enemy.y && ty < enemy.y + s;
    });
}

function getActorEnemyAtTile(combat, actor, tx, ty) {
    return getActorAttackTargets(combat, actor).find(enemy => {
        if (!isActorAlive(enemy)) return false;
        const s = enemy.size || 1;
        return tx >= enemy.x && tx < enemy.x + s && ty >= enemy.y && ty < enemy.y + s;
    });
}

function emitEquipmentActionError(socket, p, combat, actor, message) {
    return emitCombatResultError(
        socket,
        p,
        combat,
        actor,
        message,
        { actorUid: actor && actor.uid }
    );
}

function handleEquipmentAttackAction(
    socket,
    p,
    combat,
    data,
    resolveDefeat,
    actor
) {
    const equipment = getActorEquipment(actor, p);
    const item = equipment
        && EQUIPMENT_SLOTS.includes(data.equipmentSlot)
        ? equipment[data.equipmentSlot]
        : null;
    if (
        !data.itemId
        || !item
        || String(item.id || '') !== data.itemId
    ) {
        return emitEquipmentActionError(
            socket,
            p,
            combat,
            actor,
            'Server: That equipment attack does not match the active loadout.'
        );
    }

    const action = getResolvedEquipmentAction(
        equipment,
        data.equipmentSlot,
        data.actionId
    );
    if (!action) {
        return emitEquipmentActionError(
            socket,
            p,
            combat,
            actor,
            'Server: That equipment attack is no longer available.'
        );
    }

    if (String(item.id || '') !== action.itemId) {
        return emitEquipmentActionError(
            socket,
            p,
            combat,
            actor,
            'Server: That equipment attack does not match the active loadout.'
        );
    }

    const staminaCost = Math.max(
        0,
        Math.trunc(Number(action.staminaCost) || 0)
    );
    if (getActorStaminaValue(actor, p) < staminaCost) {
        return emitEquipmentActionError(
            socket,
            p,
            combat,
            actor,
            `Server: ${actor.name} lacks stamina (${Math.floor(getActorStaminaValue(actor, p))}/${staminaCost}).`
        );
    }

    if (isShieldBlockAction(action)) {
        if (actor.guardState && actor.guardState.charges > 0) {
            return emitEquipmentActionError(
                socket,
                p,
                combat,
                actor,
                `${actor.name} is already guarding.`
            );
        }

        if (!spendActorStamina(actor, p, staminaCost)) {
            return emitEquipmentActionError(
                socket,
                p,
                combat,
                actor,
                `Server: ${actor.name} lacks stamina.`
            );
        }

        actor.guardState = {
            type: 'shield_block',
            charges: 1,
            actionId: action.id,
            equipmentSlot: action.equipmentSlot,
            itemId: action.itemId,
            createdTurnSequence: Number.isSafeInteger(combat.turnSequence)
                ? combat.turnSequence
                : 0
        };
        const actionResult = completePlayerControlledAction(
            combat,
            p,
            actor
        );

        return emitAnimatedCombatResult(socket, combat, {
            type: 'guard',
            source: 'equipment',
            actionName: action.name,
            action,
            actorUid: actor.uid,
            actorName: actor.name,
            guarded: true,
            newStamina: getActorStaminaValue(actor, p),
            actionsRemaining: actionResult.actionsRemaining,
            turnComplete: actionResult.turnComplete,
            fx: {
                sx: actor.x,
                sy: actor.y,
                sourceUid: actor.uid,
                spriteId: item.spriteId || null,
                isProjectile: false,
                isAoE: false
            },
            updatedPlayer: p,
            updatedCombatState: syncCombatViews(combat, p),
            combatComplete: false
        });
    }

    if (!['attack', 'spell'].includes(action.actionType)) {
        return emitEquipmentActionError(
            socket,
            p,
            combat,
            actor,
            'Server: That equipment action is not supported in combat.'
        );
    }

    const actionData = {
        ...data,
        subType: action.id
    };
    const options = { action, item };
    if (isPlayerActor(actor)) {
        return handleWeaponAction(
            socket,
            p,
            combat,
            actionData,
            resolveDefeat,
            actor,
            options
        );
    }
    return handleActorWeaponAction(
        socket,
        p,
        combat,
        actionData,
        resolveDefeat,
        actor,
        options
    );
}

function handleWeaponSpellAction(
    socket,
    p,
    combat,
    data,
    weapon,
    combatRules,
    resolveDefeat,
    resolvedAction = null
) {
    const actor = getPlayerActor(combat);
    const reject = message => emitCombatResultError(
        socket,
        p,
        combat,
        actor,
        message,
        { action: resolvedAction || undefined }
    );
    const spellData = SpellDatabase[combatRules.spellId];
    if (!spellData) {
        return reject('Server: Staff spell is not configured.');
    }

    let serverEnemy = null;
    if (combat && data.targetEnemy) {
        serverEnemy = getPlayerAttackTargets(combat).find(enemy => enemy.uid === data.targetEnemy.uid && isActorAlive(enemy));
    }

    const hasTileTarget = data.tx !== undefined && data.ty !== undefined;
    const tx = hasTileTarget ? data.tx : (serverEnemy ? serverEnemy.x : undefined);
    const ty = hasTileTarget ? data.ty : (serverEnemy ? serverEnemy.y : undefined);

    if (tx === undefined || ty === undefined) {
        return reject('Server: Spell target lost.');
    }

    const spellRange = combatRules.range || spellData.range || weapon.attackRange || 1;
    const castDist = getGridDistance(combat.player.x, combat.player.y, tx, ty, 1);
    if (castDist > spellRange) {
        return reject('Server: Target out of spell range.');
    }

    if (!spellData.ignoresLoS && !combatRules.ignoresLoS && !checkLineOfSight(combat.player.x, combat.player.y, tx, ty, combat)) {
        return reject('Server: No line of sight for staff spell.');
    }

    p.stamina -= combatRules.staminaCost || spellData.cost || 0;
    completePlayerControlledAction(combat, p, getPlayerActor(combat));

    const hitTargets = [];
    let combatComplete = false;
    const hitEnemy = (enemy) => {
        if (!enemy || !isActorAlive(enemy)) return;
        const roll = rollSpellDamage(p, spellData, combatRules);
        enemy.hp -= roll.damage;
        const poisonApplied = applyPoison(enemy, {
            chance: spellData.poisonChance || combatRules.poisonChance || 0,
            turns: spellData.poisonTurns || combatRules.poisonTurns || 3,
            fallbackDamage: Math.max(2, Math.floor(roll.damage * 0.25)),
            sourceActor: getPlayerActor(combat)
        });
        let killed = false;
        if (enemy.hp <= 0) {
            killed = true;
            const killResult = resolveDefeat(enemy, { sourceActor: getPlayerActor(combat), cause: 'spell' });
            combatComplete = combatComplete || !!(killResult && killResult.combatComplete);
        }
        hitTargets.push({ uid: enemy.uid, damage: roll.damage, isCrit: roll.isCrit, killed: killed, statusApplied: poisonApplied ? 'poison' : null, statusEffects: enemy.statusEffects });
    };

    if (spellData.type === 'single') {
        hitEnemy(serverEnemy || getEnemyAtTile(combat, tx, ty));
    } else if (spellData.type === 'line') {
        const blastPath = getLineOfEffectPath(combat.player.x, combat.player.y, tx, ty, spellRange, !spellData.ignoresLoS, combat);
        getPlayerAttackTargets(combat).forEach(enemy => {
            if (!isActorAlive(enemy)) return;
            let isHit = false;
            const s = enemy.size || 1;
            for (let bx = enemy.x; bx < enemy.x + s; bx++) {
                for (let by = enemy.y; by < enemy.y + s; by++) {
                    if (blastPath.some(tile => tile.x === bx && tile.y === by)) isHit = true;
                }
            }
            if (isHit) hitEnemy(enemy);
        });
    } else if (spellData.type === 'aoe') {
        const radius = spellData.aoeRadius || combatRules.aoeRadius || 1;
        getPlayerAttackTargets(combat).forEach(enemy => {
            if (!isActorAlive(enemy)) return;
            const eDist = getGridDistance(tx, ty, enemy.x, enemy.y, enemy.size || 1);
            if (eDist <= radius) hitEnemy(enemy);
        });
    }

    return emitAnimatedCombatResult(socket, combat, {
        type: 'hit', source: 'spell',
        actionName: resolvedAction ? resolvedAction.name : spellData.name,
        action: resolvedAction || undefined,
        targets: hitTargets,
        fx: {
            type: spellData.fx ? spellData.fx.type : 'beam',
            style: spellData.fx ? spellData.fx.style : 'arcane',
            density: spellData.fx ? spellData.fx.density : 12,
            spread: spellData.fx ? spellData.fx.spread : 12,
            speed: spellData.fx ? spellData.fx.speed : 10,
            radius: spellData.fx ? spellData.fx.radius : spellData.aoeRadius,
            frames: spellData.fx ? spellData.fx.frames : 22,
            tx: tx, ty: ty
        },
        updatedPlayer: p,
        updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
        combatComplete
    });
}
function handleActorWeaponAction(
    socket,
    p,
    combat,
    data,
    resolveDefeat,
    actor,
    options = {}
) {
    const equipment = getActorEquipment(actor, p);
    const resolvedAction = options.action || null;
    const reject = message => emitCombatResultError(
        socket,
        p,
        combat,
        actor,
        message,
        { action: resolvedAction || undefined }
    );
    let weapon = options.item || equipment.weapon;
    if (!weapon || (!resolvedAction && !weapon.combat)) {
        weapon = buildFallbackWeapon();
    }

    const combatRules = resolvedAction
        ? getEquipmentActionRules(resolvedAction)
        : (data.subType === 'special' ? weapon.combat.special : weapon.combat.standard);
    if (!combatRules) return reject('Server: Action not supported by weapon.');

    const staminaCost = combatRules.staminaCost || 0;
    if (getActorStaminaValue(actor, p) < staminaCost) {
        return reject(`Server: ${actor.name} lacks stamina (${Math.floor(getActorStaminaValue(actor, p))}/${staminaCost}).`);
    }

    if (combatRules.actionType === 'spell') {
        return handleActorSpellAction(
            socket,
            p,
            combat,
            data,
            actor,
            weapon,
            combatRules,
            resolveDefeat,
            resolvedAction
        );
    }

    if (combatRules.targetType === 'aoe') {
        if (data.tx === undefined || data.ty === undefined) {
            return reject('Server: A target tile is required for this area attack.');
        }
        const castDist = getGridDistance(actor.x, actor.y, data.tx, data.ty, actor.size || 1);
        if (castDist > combatRules.range) return reject('Server: Target out of range.');
        if (!combatRules.ignoresLoS && !checkLineOfSight(actor.x, actor.y, data.tx, data.ty, combat)) {
            return reject('Server: No line of sight to target area.');
        }

        spendActorStamina(actor, p, staminaCost);
        completePlayerControlledAction(combat, p, actor);
        const resolvedBaseDmg = Math.floor(
            getActorStatValue(actor, p, 'offense') * combatRules.multiplier
        );
        const finalBaseDmg = resolvedAction
            ? Math.max(1, resolvedBaseDmg)
            : resolvedBaseDmg;
        const hitTargets = [];
        let combatComplete = false;
        getActorAttackTargets(combat, actor).forEach(enemy => {
            if (!isActorAlive(enemy)) return;
            const eDist = getGridDistance(data.tx, data.ty, enemy.x, enemy.y, enemy.size || 1);
            if (eDist <= (combatRules.aoeRadius || 1)) {
                const minDmg = Math.ceil(finalBaseDmg * 0.85);
                const maxDmg = Math.max(minDmg, finalBaseDmg);
                const variedDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
                const isCrit = variedDmg >= Math.floor(finalBaseDmg * 0.95);
                enemy.hp -= variedDmg;
                let killed = false;
                if (enemy.hp <= 0) {
                    killed = true;
                    const killResult = resolveDefeat(enemy, { sourceActor: actor, cause: 'weapon' });
                    combatComplete = combatComplete || !!(killResult && killResult.combatComplete);
                }
                hitTargets.push({ uid: enemy.uid, damage: variedDmg, isCrit, killed });
            }
        });

        return emitAnimatedCombatResult(socket, combat, {
            type: 'hit', source: 'weapon',
            actionName: resolvedAction ? resolvedAction.name : data.subType,
            action: resolvedAction || undefined,
            actorUid: actor.uid, actorName: actor.name, targets: hitTargets,
            fx: { tx: data.tx, ty: data.ty, sx: actor.x, sy: actor.y, sourceUid: actor.uid, spriteId: weapon.spriteId, isAoE: true, radius: combatRules.aoeRadius || 1 },
            updatedPlayer: p,
            updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
            combatComplete
        });
    }

    let serverEnemy = null;
    if (combat && data.targetEnemy) {
        serverEnemy = getActorAttackTargets(combat, actor).find(enemy => enemy.uid === data.targetEnemy.uid && isActorAlive(enemy));
    }
    if (!serverEnemy) return reject('Server: Target lost or already defeated.');

    const dist = getGridDistance(actor.x, actor.y, serverEnemy.x, serverEnemy.y, serverEnemy.size || 1);
    if (dist > combatRules.range) return reject('Server: Target out of confirmed range.');
    if (!combatRules.ignoresLoS && !hasLineOfSightToActorFootprint(actor.x, actor.y, serverEnemy, combat)) {
        return reject('Server: Target is obscured by an obstacle.');
    }

    spendActorStamina(actor, p, staminaCost);
    completePlayerControlledAction(combat, p, actor);
    const attackerOffense = getActorStatValue(actor, p, 'offense') * 10;
    const defenderSpeed = (serverEnemy.speed || 1) * 10;
    const defenderDefense = combatRules.ignoresDefense ? 0 : (serverEnemy.defense || 1) * 10;
    const offenseHitPower = (attackerOffense * 0.5) + (Math.random() * attackerOffense * 0.5);
    const speedMitigation = Math.random() * defenderSpeed;

    if ((offenseHitPower - speedMitigation) <= 0) {
        return emitAnimatedCombatResult(socket, combat, {
            type: 'miss',
            actionName: resolvedAction ? resolvedAction.name : data.subType,
            action: resolvedAction || undefined,
            actorUid: actor.uid,
            actorName: actor.name,
            targetUid: serverEnemy.uid,
            deflectReason: 'evasion',
            hitChance: 0,
            newStamina: getActorStaminaValue(actor, p),
            updatedCombatState: syncCombatViews(combat, p)
        });
    }

    const rawDamageRoll = Math.sqrt(Math.random()) * attackerOffense;
    const armorAbsorption = Math.pow(Math.random(), 2) * defenderDefense;
    const mitigatedDmg = Math.floor(rawDamageRoll - armorAbsorption);

    if (mitigatedDmg <= 0) {
        return emitAnimatedCombatResult(socket, combat, {
            type: 'miss',
            actionName: resolvedAction ? resolvedAction.name : data.subType,
            action: resolvedAction || undefined,
            actorUid: actor.uid,
            actorName: actor.name,
            targetUid: serverEnemy.uid,
            deflectReason: 'armor',
            hitChance: 100,
            newStamina: getActorStaminaValue(actor, p),
            updatedCombatState: syncCombatViews(combat, p)
        });
    }

    const isCrit = mitigatedDmg >= Math.floor(attackerOffense * 0.90);
    const resolvedDamage = Math.floor(
        mitigatedDmg * combatRules.multiplier
    );
    const finalDmg = resolvedAction
        ? Math.max(1, resolvedDamage)
        : resolvedDamage;
    serverEnemy.hp -= finalDmg;
    const poisonApplied = applyPoison(serverEnemy, {
        chance: combatRules.poisonChance || 0,
        turns: combatRules.poisonTurns || 3,
        fallbackDamage: Math.max(2, Math.floor(finalDmg * 0.25)),
        sourceActor: actor
    });

    let combatComplete = false;
    let killed = false;
    if (serverEnemy.hp <= 0) {
        killed = true;
        const killResult = resolveDefeat(serverEnemy, { sourceActor: actor, cause: 'weapon' });
        combatComplete = !!(killResult && killResult.combatComplete);
    }

    const isRanged = !!weapon.projectileSprite;

    emitAnimatedCombatResult(socket, combat, {
        type: 'hit', source: 'weapon',
        actionName: resolvedAction ? resolvedAction.name : data.subType,
        action: resolvedAction || undefined,
        actorUid: actor.uid, actorName: actor.name,
        targets: [{ uid: serverEnemy.uid, damage: finalDmg, isCrit, killed, statusApplied: poisonApplied ? 'poison' : null, statusEffects: serverEnemy.statusEffects }],
        newStamina: getActorStaminaValue(actor, p),
        fx: { tx: serverEnemy.x, ty: serverEnemy.y, sx: actor.x, sy: actor.y, sourceUid: actor.uid, spriteId: isRanged ? weapon.projectileSprite : weapon.spriteId, isProjectile: isRanged, isAoE: false },
        updatedPlayer: p,
        updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
        combatComplete
    });
}

function handleActorSpellAction(
    socket,
    p,
    combat,
    data,
    actor,
    weapon,
    combatRules,
    resolveDefeat,
    resolvedAction = null
) {
    const reject = message => emitCombatResultError(
        socket,
        p,
        combat,
        actor,
        message,
        { action: resolvedAction || undefined }
    );
    const spellData = SpellDatabase[combatRules.spellId];
    if (!spellData) {
        return reject('Server: Staff spell is not configured.');
    }

    let serverEnemy = null;
    if (combat && data.targetEnemy) {
        serverEnemy = getActorAttackTargets(combat, actor).find(enemy => enemy.uid === data.targetEnemy.uid && isActorAlive(enemy));
    }

    const hasTileTarget = data.tx !== undefined && data.ty !== undefined;
    const tx = hasTileTarget ? data.tx : (serverEnemy ? serverEnemy.x : undefined);
    const ty = hasTileTarget ? data.ty : (serverEnemy ? serverEnemy.y : undefined);
    if (tx === undefined || ty === undefined) {
        return reject('Server: Spell target lost.');
    }

    const spellRange = combatRules.range || spellData.range || weapon.attackRange || 1;
    const castDist = getGridDistance(actor.x, actor.y, tx, ty, actor.size || 1);
    if (castDist > spellRange) {
        return reject('Server: Target out of spell range.');
    }
    if (!spellData.ignoresLoS && !combatRules.ignoresLoS && !checkLineOfSight(actor.x, actor.y, tx, ty, combat)) {
        return reject('Server: No line of sight for staff spell.');
    }

    const staminaCost = combatRules.staminaCost || spellData.cost || 0;
    if (getActorStaminaValue(actor, p) < staminaCost) {
        return reject(`Server: ${actor.name} lacks stamina.`);
    }

    spendActorStamina(actor, p, staminaCost);
    completePlayerControlledAction(combat, p, actor);
    const hitTargets = [];
    let combatComplete = false;
    const hitEnemy = (enemy) => {
        if (!enemy || !isActorAlive(enemy)) return;
        const roll = rollActorSpellDamage(actor, p, spellData, combatRules);
        enemy.hp -= roll.damage;
        const poisonApplied = applyPoison(enemy, {
            chance: spellData.poisonChance || combatRules.poisonChance || 0,
            turns: spellData.poisonTurns || combatRules.poisonTurns || 3,
            fallbackDamage: Math.max(2, Math.floor(roll.damage * 0.25)),
            sourceActor: actor
        });
        let killed = false;
        if (enemy.hp <= 0) {
            killed = true;
            const killResult = resolveDefeat(enemy, { sourceActor: actor, cause: 'spell' });
            combatComplete = combatComplete || !!(killResult && killResult.combatComplete);
        }
        hitTargets.push({ uid: enemy.uid, damage: roll.damage, isCrit: roll.isCrit, killed, statusApplied: poisonApplied ? 'poison' : null, statusEffects: enemy.statusEffects });
    };

    if (spellData.type === 'single') {
        hitEnemy(serverEnemy || getActorEnemyAtTile(combat, actor, tx, ty));
    } else if (spellData.type === 'line') {
        const blastPath = getLineOfEffectPath(actor.x, actor.y, tx, ty, spellRange, !spellData.ignoresLoS, combat);
        getActorAttackTargets(combat, actor).forEach(enemy => {
            if (!isActorAlive(enemy)) return;
            let isHit = false;
            const s = enemy.size || 1;
            for (let bx = enemy.x; bx < enemy.x + s; bx++) {
                for (let by = enemy.y; by < enemy.y + s; by++) {
                    if (blastPath.some(tile => tile.x === bx && tile.y === by)) isHit = true;
                }
            }
            if (isHit) hitEnemy(enemy);
        });
    } else if (spellData.type === 'aoe') {
        const radius = spellData.aoeRadius || combatRules.aoeRadius || 1;
        getActorAttackTargets(combat, actor).forEach(enemy => {
            if (!isActorAlive(enemy)) return;
            const eDist = getGridDistance(tx, ty, enemy.x, enemy.y, enemy.size || 1);
            if (eDist <= radius) hitEnemy(enemy);
        });
    }

    return emitAnimatedCombatResult(socket, combat, {
        type: 'hit', source: 'spell',
        actionName: resolvedAction ? resolvedAction.name : spellData.name,
        action: resolvedAction || undefined,
        actorUid: actor.uid, actorName: actor.name, targets: hitTargets,
        newStamina: getActorStaminaValue(actor, p),
        fx: {
            type: spellData.fx ? spellData.fx.type : 'beam',
            style: spellData.fx ? spellData.fx.style : 'arcane',
            density: spellData.fx ? spellData.fx.density : 12,
            spread: spellData.fx ? spellData.fx.spread : 12,
            speed: spellData.fx ? spellData.fx.speed : 10,
            radius: spellData.fx ? spellData.fx.radius : spellData.aoeRadius,
            frames: spellData.fx ? spellData.fx.frames : 22,
            tx, ty, sx: actor.x, sy: actor.y, sourceUid: actor.uid
        },
        updatedPlayer: p,
        updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
        combatComplete
    });
}
function handleWeaponAction(
    socket,
    p,
    combat,
    data,
    resolveDefeat,
    actor = getPlayerActor(combat),
    options = {}
) {
    const resolvedAction = options.action || null;
    const reject = message => emitCombatResultError(
        socket,
        p,
        combat,
        actor,
        message,
        { action: resolvedAction || undefined }
    );
    let weapon = options.item || p.equipment.weapon;

    if (!weapon || (!resolvedAction && !weapon.combat)) {
        weapon = {
            spriteId: "icon_punch",
            combat: {
                standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
                special: { name: "Haymaker", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false }
            }
        };
    }

    const combatRules = resolvedAction
        ? getEquipmentActionRules(resolvedAction)
        : (data.subType === 'special' ? weapon.combat.special : weapon.combat.standard);
    if (!combatRules) return reject('Server: Action not supported by weapon.');

    const staminaCost = combatRules.staminaCost;
    if (p.stamina < staminaCost) {
        return reject(`Server: Insufficient stamina (${Math.floor(p.stamina)}/${staminaCost}).`);
    }

    if (combatRules.actionType === "spell") {
        return handleWeaponSpellAction(
            socket,
            p,
            combat,
            data,
            weapon,
            combatRules,
            resolveDefeat,
            resolvedAction
        );
    }


    if (combatRules.targetType === 'aoe') {
        if (data.tx === undefined || data.ty === undefined) {
            return reject('Server: A target tile is required for this area attack.');
        }

        const castDist = getGridDistance(combat.player.x, combat.player.y, data.tx, data.ty, 1);
        if (castDist > combatRules.range) {
            return reject('Server: Target out of range.');
        }

        if (!combatRules.ignoresLoS && !checkLineOfSight(combat.player.x, combat.player.y, data.tx, data.ty, combat)) {
            return reject('Server: No line of sight to target area.');
        }

        p.stamina -= staminaCost;
        completePlayerControlledAction(combat, p, getPlayerActor(combat));

        const serverPower = getEffectiveStat(p, 'offense');
        const resolvedBaseDmg = Math.floor(
            serverPower * combatRules.multiplier
        );
        const finalBaseDmg = resolvedAction
            ? Math.max(1, resolvedBaseDmg)
            : resolvedBaseDmg;
        const hitTargets = [];

        let combatComplete = false;
        getPlayerAttackTargets(combat).forEach(enemy => {
            if (!isActorAlive(enemy)) return;

            const eDist = getGridDistance(data.tx, data.ty, enemy.x, enemy.y, enemy.size || 1);

            if (eDist <= (combatRules.aoeRadius || 1)) {
                const minDmg = Math.ceil(finalBaseDmg * 0.85);
                const maxDmg = finalBaseDmg;
                const variedDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
                const isCrit = variedDmg >= Math.floor(finalBaseDmg * 0.95);

                enemy.hp -= variedDmg;
                let killed = false;
                if (enemy.hp <= 0) {
                    killed = true;
                    const killResult = resolveDefeat(enemy, { sourceActor: getPlayerActor(combat), cause: 'weapon' });
                    combatComplete = combatComplete || !!(killResult && killResult.combatComplete);
                }

                hitTargets.push({ uid: enemy.uid, damage: variedDmg, isCrit: isCrit, killed: killed });
            }
        });

        return emitAnimatedCombatResult(socket, combat, {
            type: 'hit', source: 'weapon',
            actionName: resolvedAction ? resolvedAction.name : data.subType,
            action: resolvedAction || undefined,
            actorUid: actor && actor.uid,
            actorName: actor && actor.name,
            targets: hitTargets,
            fx: { tx: data.tx, ty: data.ty, spriteId: weapon.spriteId, isAoE: true, radius: combatRules.aoeRadius || 1 },
            updatedPlayer: p,
            updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
            combatComplete
        });
    }

    let serverEnemy = null;
    if (combat && data.targetEnemy) {
        serverEnemy = getPlayerAttackTargets(combat).find(enemy => enemy.uid === data.targetEnemy.uid && isActorAlive(enemy));
    }

    if (!serverEnemy) return reject('Server: Target lost or already defeated.');

    const dist = getGridDistance(combat.player.x, combat.player.y, serverEnemy.x, serverEnemy.y, serverEnemy.size || 1);
    if (dist > combatRules.range) return reject('Server: Target out of confirmed range.');

    if (!combatRules.ignoresLoS) {
        if (!hasLineOfSightToActorFootprint(combat.player.x, combat.player.y, serverEnemy, combat)) {
            return reject('Server: Target is obscured by an obstacle.');
        }
    }

    p.stamina -= staminaCost;
    completePlayerControlledAction(combat, p, getPlayerActor(combat));

    const attackerOffense = getEffectiveStat(p, 'offense') * 10;
    const defenderSpeed = (serverEnemy.speed || 1) * 10;
    const defenderDefense = combatRules.ignoresDefense ? 0 : (serverEnemy.defense || 1) * 10;
    const offenseHitPower = (attackerOffense * 0.5) + (Math.random() * attackerOffense * 0.5);
    const speedMitigation = Math.random() * defenderSpeed;

    if ((offenseHitPower - speedMitigation) <= 0) {
        emitAnimatedCombatResult(socket, combat, {
            type: 'miss',
            actionName: resolvedAction ? resolvedAction.name : data.subType,
            action: resolvedAction || undefined,
            actorUid: 'player_0',
            targetUid: serverEnemy.uid,
            deflectReason: 'evasion',
            hitChance: 0,
            newStamina: p.stamina,
            updatedCombatState: syncCombatViews(combat, p)
        });
        return;
    }

    const rawDamageRoll = Math.sqrt(Math.random()) * attackerOffense;
    const armorAbsorption = Math.pow(Math.random(), 2) * defenderDefense;
    const mitigatedDmg = Math.floor(rawDamageRoll - armorAbsorption);

    if (mitigatedDmg <= 0) {
        emitAnimatedCombatResult(socket, combat, {
            type: 'miss',
            actionName: resolvedAction ? resolvedAction.name : data.subType,
            action: resolvedAction || undefined,
            actorUid: 'player_0',
            targetUid: serverEnemy.uid,
            deflectReason: 'armor',
            hitChance: 100,
            newStamina: p.stamina,
            updatedCombatState: syncCombatViews(combat, p)
        });
        return;
    }

    const isCrit = mitigatedDmg >= Math.floor(attackerOffense * 0.90);
    const resolvedDamage = Math.floor(
        mitigatedDmg * combatRules.multiplier
    );
    const finalDmg = resolvedAction
        ? Math.max(1, resolvedDamage)
        : resolvedDamage;

    serverEnemy.hp -= finalDmg;
    const poisonApplied = applyPoison(serverEnemy, {
        chance: combatRules.poisonChance || 0,
        turns: combatRules.poisonTurns || 3,
        fallbackDamage: Math.max(2, Math.floor(getEffectiveStat(p, 'offense') * 2)),
        sourceActor: getPlayerActor(combat)
    });
    let killed = false;
    let combatComplete = false;
    if (serverEnemy.hp <= 0) {
        killed = true;
        const killResult = resolveDefeat(serverEnemy, { sourceActor: getPlayerActor(combat), cause: 'weapon' });
        combatComplete = !!(killResult && killResult.combatComplete);
    }

    const isRanged = !!weapon.projectileSprite;

    emitAnimatedCombatResult(socket, combat, {
        type: 'hit', source: 'weapon',
        actionName: resolvedAction ? resolvedAction.name : data.subType,
        action: resolvedAction || undefined,
        actorUid: actor && actor.uid,
        actorName: actor && actor.name,
        targets: [{ uid: serverEnemy.uid, damage: finalDmg, isCrit: isCrit, killed: killed, statusApplied: poisonApplied ? "poison" : null, statusEffects: serverEnemy.statusEffects }],
        fx: { tx: serverEnemy.x, ty: serverEnemy.y, spriteId: isRanged ? weapon.projectileSprite : weapon.spriteId, isProjectile: isRanged, isAoE: false },
        updatedPlayer: p,
        updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
        combatComplete
    });
}

function emitActorItemReceipt(socket, p, combat, actor, receipt) {
    if (receipt.success) {
        completePlayerControlledAction(combat, p, actor);
        receipt.updatedPlayer = p;
        receipt.updatedCombatState = combat;
    }
    return socket.emit('combatItemReceipt', {
        actorUid: actor.uid,
        actorName: actor.name,
        newStamina: getActorStaminaValue(actor, p),
        ...receipt
    });
}

function emitPlayerItemReceipt(socket, p, combat, actor, receipt) {
    if (receipt.success) {
        completePlayerControlledAction(combat, p, actor);
        receipt.updatedPlayer = p;
        receipt.updatedCombatState = combat;
    }
    return socket.emit('combatItemReceipt', {
        actorUid: actor.uid,
        actorName: actor.name,
        newStamina: getActorStaminaValue(actor, p),
        ...receipt
    });
}

function getActorConsumableSource(player, actor, data) {
    if (data.pocketIndex !== undefined && data.pocketIndex !== null) {
        const companion = findCompanionByInstanceId(player, actor && actor.companionInstanceId);
        if (!companion || companion.instanceId !== actor.companionInstanceId) {
            return { error: 'That mercenary pocket is unavailable.' };
        }
        const pocketIndex = getArrayIndex(data.pocketIndex, companion.pockets);
        if (pocketIndex < 0) return { error: 'Invalid mercenary pocket.' };
        const item = companion.pockets[pocketIndex];
        if (!item) return { error: `${actor.name}'s pocket is empty.` };
        return {
            item,
            itemSource: 'pocket',
            pocketIndex,
            consume: () => { companion.pockets[pocketIndex] = null; }
        };
    }

    const invIndex = getArrayIndex(data.invIndex, player.inventory);
    if (invIndex < 0) return { error: 'Invalid inventory slot.' };
    const item = player.inventory[invIndex];
    if (!item) return { error: 'Invalid item data.' };
    return {
        item,
        itemSource: 'backpack',
        invIndex,
        consume: () => { player.inventory.splice(invIndex, 1); }
    };
}

function handleActorConsumableAction(socket, p, combat, data, actor) {
    const source = getActorConsumableSource(p, actor, data);
    if (source.error) return emitActorItemReceipt(socket, p, combat, actor, { success: false, message: source.error });
    const item = source.item;
    if (!item || !item.combat) return emitActorItemReceipt(socket, p, combat, actor, { success: false, message: 'Invalid item data.' });

    const rules = item.combat;
    if (rules.staminaCost > 0 && getActorStaminaValue(actor, p) < rules.staminaCost) {
        return emitActorItemReceipt(socket, p, combat, actor, { success: false, message: `${actor.name} lacks stamina.` });
    }

    const sourceReceipt = { itemSource: source.itemSource, pocketIndex: source.pocketIndex };
    if (rules.actionType === 'heal') {
        const maxHp = getActorMaxHpValue(actor, p);
        const healAmount = Math.floor(maxHp * rules.healPercent);
        actor.hp = Math.min(maxHp, (actor.hp || 0) + healAmount);
        if (rules.cleanse) actor.statusEffects = {};
        source.consume();
        spendActorStamina(actor, p, rules.staminaCost || 0);
        return emitActorItemReceipt(socket, p, combat, actor, {
            success: true,
            ...sourceReceipt,
            updatedPlayer: p,
            updatedCombatState: syncCombatViews(combat, p),
            message: `${actor.name} used ${item.name}. Restored ${healAmount} HP.${rules.cleanse ? ' Negative effects cleansed.' : ''}`
        });
    }

    if (rules.actionType === 'cleanse') {
        actor.statusEffects = {};
        source.consume();
        spendActorStamina(actor, p, rules.staminaCost || 0);
        return emitActorItemReceipt(socket, p, combat, actor, {
            success: true,
            ...sourceReceipt,
            updatedPlayer: p,
            updatedCombatState: syncCombatViews(combat, p),
            message: `${actor.name} used ${item.name}. Negative effects cleansed.`
        });
    }

    if (rules.actionType === 'staunch') {
        const maxHp = getActorMaxHpValue(actor, p);
        const floorHp = Math.floor(maxHp * (rules.healFloorPercent || 0.3));
        actor.hp = Math.min(maxHp, Math.max(actor.hp || 0, floorHp));
        if (rules.cleanse) actor.statusEffects = {};
        source.consume();
        spendActorStamina(actor, p, rules.staminaCost || 0);
        return emitActorItemReceipt(socket, p, combat, actor, {
            success: true,
            ...sourceReceipt,
            updatedPlayer: p,
            updatedCombatState: syncCombatViews(combat, p),
            message: `${actor.name} used ${item.name}. HP set to at least ${floorHp}.${rules.cleanse ? ' Negative effects cleansed.' : ''}`
        });
    }

    if (rules.actionType === 'buff') {
        actor.activeBuffs = actor.activeBuffs || [];
        const buffName = rules.buffType;
        if (actor.activeBuffs.includes(buffName)) {
            return emitActorItemReceipt(socket, p, combat, actor, { success: false, message: `${actor.name} already has that buff.` });
        }
        actor.activeBuffs.push(buffName);
        if (rules.effectCategory === 'offense' && rules.effectType === 'multiplier') actor.offense = Math.max(1, Math.floor((actor.offense || 1) * rules.effectValue));
        if (rules.effectCategory === 'defense' && rules.effectType === 'multiplier') actor.defense = Math.max(1, Math.floor((actor.defense || 1) * rules.effectValue));
        if (rules.effectCategory === 'speed' && rules.effectType === 'flat') actor.speed = Math.max(1, (actor.speed || 1) + rules.effectValue);
        if (rules.atbBoost) actor.atbCharge = Math.min(100, (actor.atbCharge || 0) + Math.max(0, Math.min(100, Number(rules.atbBoost) || 0)));
        source.consume();
        spendActorStamina(actor, p, rules.staminaCost || 0);
        return emitActorItemReceipt(socket, p, combat, actor, {
            success: true,
            ...sourceReceipt,
            updatedPlayer: p,
            updatedCombatState: syncCombatViews(combat, p),
            message: `${actor.name} used ${item.name}. ${rules.msg || 'Buff applied.'}`
        });
    }

    if (rules.actionType === 'throwable') {
        return emitActorItemReceipt(socket, p, combat, actor, { success: false, message: 'Throwables have been retired. Use ranged or AOE weapons instead.' });
    }

    return emitActorItemReceipt(socket, p, combat, actor, { success: false, message: `${actor.name} cannot use that item yet.` });
}
function handleConsumableAction(socket, p, combat, data, resolveDefeat, actor) {
    const invIndex = getArrayIndex(data.invIndex, p.inventory);
    if (invIndex < 0) return socket.emit('combatItemReceipt', { success: false, message: "Invalid inventory slot." });

    const item = p.inventory[invIndex];
    if (!item || !item.combat) return socket.emit('combatItemReceipt', { success: false, message: "Invalid item data." });

    const rules = item.combat;

    if (rules.staminaCost > 0 && p.stamina < rules.staminaCost) {
        return socket.emit('combatItemReceipt', { success: false, message: "Server: Insufficient stamina." });
    }

    if (rules.actionType === 'heal') {
        const maxVitalityCalc = getMaxHp(p);
        const healAmount = Math.floor(maxVitalityCalc * rules.healPercent);
        p.hp = Math.min(maxVitalityCalc, p.hp + healAmount);
        if (rules.cleanse) p.statusEffects = {};
        p.inventory.splice(invIndex, 1);
        p.stamina -= rules.staminaCost || 0;
        const cleanseText = rules.cleanse ? ' Negative effects cleansed.' : '';
        return emitPlayerItemReceipt(socket, p, combat, actor, { success: true, message: `Chugged ${item.name}. Restored ${healAmount} HP.${cleanseText}` });
    }

    if (rules.actionType === 'cleanse') {
        p.statusEffects = {};
        p.inventory.splice(invIndex, 1);
        p.stamina -= rules.staminaCost || 0;
        return emitPlayerItemReceipt(socket, p, combat, actor, { success: true, message: `${item.name} cleansed negative combat effects.` });
    }

    if (rules.actionType === 'staunch') {
        const maxVitalityCalc = getMaxHp(p);
        const floorHp = Math.floor(maxVitalityCalc * (rules.healFloorPercent || 0.3));
        const beforeHp = p.hp || 0;
        p.hp = Math.min(maxVitalityCalc, Math.max(beforeHp, floorHp));
        if (rules.cleanse) p.statusEffects = {};
        p.inventory.splice(invIndex, 1);
        p.stamina -= rules.staminaCost || 0;
        return emitPlayerItemReceipt(socket, p, combat, actor, { success: true, message: `${item.name} staunched the bleeding. HP set to at least ${floorHp}.${rules.cleanse ? ' Negative effects cleansed.' : ''}` });
    }

    if (rules.actionType === 'buff') {
        p.activeBuffs = p.activeBuffs || [];
        const buffName = rules.buffType;

        if (!p.activeBuffs.includes(buffName)) {
            p.activeBuffs.push(buffName);
            if (rules.atbBoost) {
                const playerActor = getPlayerActor(combat);
                const boost = Math.max(0, Math.min(100, Number(rules.atbBoost) || 0));
                if (playerActor) playerActor.atbCharge = Math.min(100, (playerActor.atbCharge || 0) + boost);
                if (combat.player) combat.player.atbCharge = playerActor ? playerActor.atbCharge : Math.min(100, (combat.player.atbCharge || 0) + boost);
            }
            p.inventory.splice(invIndex, 1);
            p.stamina -= rules.staminaCost || 0;
            return emitPlayerItemReceipt(socket, p, combat, actor, { success: true, message: rules.msg });
        }
        return socket.emit('combatItemReceipt', { success: false, message: 'Buff already active.' });
    }

    if (rules.actionType === 'throwable') {
        return socket.emit('combatItemReceipt', { success: false, message: 'Throwables have been retired. Use ranged or AOE weapons instead.' });
    }

    if (rules.actionType === 'spell') {
        if (data.tx === undefined || data.ty === undefined) {
            return socket.emit('combatItemReceipt', {
                success: false,
                message: 'Server: A target tile is required for this spell.',
                actorUid: actor && actor.uid,
                updatedCombatState: syncCombatViews(combat, p)
            });
        }

        const spellData = SpellDatabase[rules.spellId];
        if (!spellData) return socket.emit('combatItemReceipt', { success: false, message: "Server: Invalid spell logic." });
        if (p.stamina < spellData.cost) return socket.emit('combatItemReceipt', { success: false, message: 'Server: Insufficient stamina to cast.' });

        const castDist = getGridDistance(combat.player.x, combat.player.y, data.tx, data.ty, 1);
        if (castDist > spellData.range) return socket.emit('combatItemReceipt', { success: false, message: 'Server: Target out of spell range.' });

        p.stamina -= spellData.cost;
        completePlayerControlledAction(combat, p, actor);

        const hitTargets = [];
        let combatComplete = false;
        if (spellData.type === 'line') {
            const blastPath = getLineOfEffectPath(combat.player.x, combat.player.y, data.tx, data.ty, spellData.range, !spellData.ignoresLoS, combat);

            getPlayerAttackTargets(combat).forEach(enemy => {
                if (!isActorAlive(enemy)) return;
                let isHit = false;
                const s = enemy.size || 1;
                for (let bx = enemy.x; bx < enemy.x + s; bx++) {
                    for (let by = enemy.y; by < enemy.y + s; by++) {
                        if (blastPath.some(tile => tile.x === bx && tile.y === by)) isHit = true;
                    }
                }

                if (isHit) {
                    enemy.hp -= spellData.damageFlat;
                    const poisonApplied = applyPoison(enemy, {
                        chance: spellData.poisonChance || 0,
                        turns: spellData.poisonTurns || 3,
                        fallbackDamage: Math.max(2, Math.floor(spellData.damageFlat * 0.25)),
                        sourceActor: getPlayerActor(combat)
                    });
                    let killed = false;
                    if (enemy.hp <= 0) {
                        killed = true;
                        const killResult = resolveDefeat(enemy, { sourceActor: getPlayerActor(combat), cause: 'spell' });
                        combatComplete = combatComplete || !!(killResult && killResult.combatComplete);
                    }
                    hitTargets.push({ uid: enemy.uid, damage: spellData.damageFlat, isCrit: false, killed: killed, statusApplied: poisonApplied ? "poison" : null, statusEffects: enemy.statusEffects });
                }
            });
        }

        return emitAnimatedCombatResult(socket, combat, {
            type: 'hit', source: 'spell', actionName: spellData.name, targets: hitTargets,
            fx: {
                type: spellData.fx ? spellData.fx.type : 'beam', style: spellData.fx ? spellData.fx.style : 'fire',
                density: spellData.fx ? spellData.fx.density : 12, spread: spellData.fx ? spellData.fx.spread : 15,
                speed: spellData.fx ? spellData.fx.speed : 15, tx: data.tx, ty: data.ty
            },
            updatedPlayer: p,
            updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
            combatComplete
        });
    }
}

function emitCombatEquipError(socket, p, combat, actor, message) {
    return socket.emit('combatItemReceipt', {
        success: false,
        message,
        actorUid: actor && actor.uid,
        newStamina: actor ? getActorStaminaValue(actor, p) : p.stamina,
        updatedCombatState: syncCombatViews(combat, p)
    });
}

function handleCombatEquip(socket, p, combat, data, actor) {
    const invIndex = getArrayIndex(data.invIndex, p.inventory);
    if (invIndex < 0) {
        return emitCombatEquipError(
            socket,
            p,
            combat,
            actor,
            'Invalid inventory slot.'
        );
    }

    const item = p.inventory[invIndex];
    if (!item) {
        return emitCombatEquipError(
            socket,
            p,
            combat,
            actor,
            'Invalid item data.'
        );
    }

    if (!EQUIPMENT_SLOTS.includes(item.slot)) {
        return emitCombatEquipError(
            socket,
            p,
            combat,
            actor,
            'This item cannot be equipped.'
        );
    }

    p.maxInventorySlots = p.maxInventorySlots || 5;
    const equipResult = equipItemWithHandRules({
        equipment: p.equipment,
        inventory: p.inventory,
        inventoryIndex: invIndex,
        maxInventorySlots: p.maxInventorySlots
    });
    if (!equipResult.success) {
        return emitCombatEquipError(
            socket,
            p,
            combat,
            actor,
            equipResult.message
        );
    }

    const handMessage = equipResult.conflictSlot
        ? ' Conflicting hand gear was stowed.'
        : '';
    if (actor && actor.guardState) {
        const guardedSlot = actor.guardState.equipmentSlot;
        const guardedItem = guardedSlot && p.equipment[guardedSlot];
        if (
            !guardedItem
            || String(guardedItem.id || '') !== actor.guardState.itemId
        ) {
            delete actor.guardState;
        }
    }
    return emitPlayerItemReceipt(socket, p, combat, actor, {
        success: true,
        message: `Swapped gear mid-combat.${handMessage}`
    });
}
