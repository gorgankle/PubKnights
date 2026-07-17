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
const { claimCombatRewards } = require('./combatRewards.js');
const { resolveActorDefeat } = require('./combatResolution.js');
const { createCombatEncounter } = require('./combatEncounters.js');
const { executeActorTurn } = require('./combatAI.js');
const { applyPoison, tickPoison } = require('./combatStatus.js');
const { applyPlayerCombatDefeat } = require('./combatDefeat.js');
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
    return getActivePartyActor(combat, {
        partyId: PARTY_PLAYER,
        controlMode: CONTROL_MANUAL,
        isEligible: isActorAlive
    });
}

function getActorEquipment(actor, player) {
    return isPlayerActor(actor) ? (player.equipment || {}) : (actor.equipment || {});
}

function getActorStatValue(actor, player, statKey) {
    if (isPlayerActor(actor)) return getEffectiveStat(player, statKey);
    return Math.max(1, Math.trunc(Number(actor[statKey]) || 1));
}

function getActorStaminaValue(actor, player) {
    return isPlayerActor(actor) ? (player.stamina || 0) : (actor.stamina || 0);
}

function spendActorStamina(actor, player, amount) {
    const cost = Math.max(0, Math.trunc(Number(amount) || 0));
    if (isPlayerActor(actor)) {
        player.stamina = Math.max(0, (player.stamina || 0) - cost);
        actor.stamina = player.stamina;
        return player.stamina;
    }
    actor.stamina = Math.max(0, (actor.stamina || 0) - cost);
    return actor.stamina;
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

function buildFallbackWeapon() {
    return {
        spriteId: 'icon_punch',
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: 'lunge_bash' },
            special: { name: 'Haymaker', range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false }
        }
    };
}

function finishPlayerControlledTurn(combat, player, actor) {
    if (!actor) return;
    actor.atbCharge = 0;
    if (isPlayerActor(actor) && combat.player) combat.player.atbCharge = 0;
    clearActivePartyActor(combat, actor.uid);
    syncCombatViews(combat, player);
}
module.exports = function(socket, io, activePlayers, activeCombats) {
    const combatContext = { activePlayers, activeCombats, io };
    function resolveDefeat(target, details = {}) {
        return resolveActorDefeat(socket.id, target, combatContext, details);
    }

    socket.on('dispatchCombatAction', (data) => {
        const p = activePlayers[socket.id];
        const combat = activeCombats[socket.id];
        if (!data || typeof data !== 'object') return;

        data.actionCategory = sanitizeToken(data.actionCategory, '');
        data.subType = sanitizeToken(data.subType, 'standard');

        if (combat && data.tx !== undefined && data.ty !== undefined) {
            data.tx = clampInt(data.tx, 0, combat.gridSize.cols - 1, 0);
            data.ty = clampInt(data.ty, 0, combat.gridSize.rows - 1, 0);
        }

        if (!p) return socket.emit('combatResult', { type: 'error', message: 'Server connection lost. Please refresh the page.' });

        if (data.actionCategory !== 'flee' && (!combat || combat.atbPaused !== true)) {
            return socket.emit('combatResult', { type: 'error', message: 'Tactical Error: It is not your turn.', newStamina: p.stamina });
        }

        if (data.actionCategory === 'flee') {
            p.pendingGold = 0;
            p.pendingXp = 0;
            p.pendingLoot = [];
            p.mapBaited = false;
            p.cellarsChummed = false;
            p.statusEffects = {};
            p.activeBuffs = [];
            p.activeCombatBuff = null;
            p.hp = getMaxHp(p);
            p.stamina = getMaxStamina(p);
            delete activeCombats[socket.id];
            return socket.emit('combatResult', { type: 'flee', updatedPlayer: p });
        }

        const activeActor = getCombatTurnActor(combat, p);
        if (!activeActor) {
            clearActivePartyActor(combat, combat.activeActorUid || null);
            return socket.emit('combatResult', {
                type: 'error',
                message: 'Tactical turn resynchronized. Waiting for the next party member.',
                newStamina: p.stamina,
                updatedCombatState: syncCombatViews(combat, p)
            });
        }

        if (data.actionCategory === 'pass') {
            const maxStam = isPlayerActor(activeActor) ? getMaxStamina(p) : (activeActor.maxStamina || 25);
            const recover = Math.floor(maxStam * 0.15);
            if (isPlayerActor(activeActor)) p.stamina = Math.min(maxStam, (p.stamina || 0) + recover);
            else activeActor.stamina = Math.min(maxStam, (activeActor.stamina || 0) + recover);
            finishPlayerControlledTurn(combat, p, activeActor);
            socket.emit('combatResult', { type: 'pass', actorUid: activeActor.uid, actorName: activeActor.name, updatedPlayer: p, updatedCombatState: combat, recovered: recover });
            return;
        }

        if (data.actionCategory === 'weapon') {
            if (isPlayerActor(activeActor)) handleWeaponAction(socket, p, combat, data, resolveDefeat);
            else handleActorWeaponAction(socket, p, combat, data, resolveDefeat, activeActor);
            return;
        }

        if (data.actionCategory === 'consumable') {
            if (isPlayerActor(activeActor)) handleConsumableAction(socket, p, combat, data, resolveDefeat);
            else handleActorConsumableAction(socket, p, combat, data, activeActor);
            return;
        }

        if (data.actionCategory === 'equip') {
            if (!isPlayerActor(activeActor)) return socket.emit('combatItemReceipt', { success: false, message: `${activeActor.name} cannot swap gear mid-combat yet.` });
            handleCombatEquip(socket, p, data);
        }
    });

    socket.on('deployToCombat', (data) => {
        const p = activePlayers[socket.id];
        if (!p) return;
        if (!data || typeof data !== 'object') return;

        p.idleJob = 'NONE';
        p.pendingXp = 0;
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

        syncPlayerActor(combat, p);
        const activeActor = getCombatTurnActor(combat, p);
        if (!activeActor) return;
        finishPlayerControlledTurn(combat, p, activeActor);
    });

    socket.on('clientPlaybackComplete', () => {
        const combat = activeCombats[socket.id];
        if (combat) combat.playbackLock = false;
    });

    socket.on('combatMove', (data) => {
        const p = activePlayers[socket.id];
        const combat = activeCombats[socket.id];
        if (!data || typeof data !== 'object') return;

        if (!p || !combat) return socket.emit('moveReceipt', { success: false, message: 'Server connection lost. Please refresh the page.' });

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

        const moveStaminaCost = Math.floor((dist / speed) * 10);

        if (getActorStaminaValue(activeActor, p) >= moveStaminaCost) {
            spendActorStamina(activeActor, p, moveStaminaCost);
            activeActor.x = tx;
            activeActor.y = ty;
            if (isPlayerActor(activeActor)) {
                combat.player.x = tx;
                combat.player.y = ty;
            }
            socket.emit('moveReceipt', { success: true, actorUid: activeActor.uid, updatedPlayer: p, updatedCombatState: syncCombatViews(combat, p) });
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

        claimCombatRewards(p);
        p.statusEffects = {};
        socket.emit('combatRewardsReceipt', { updatedPlayer: p });
    });

    if (!global.atbEngineStarted) {
        global.atbEngineStarted = true;

        setInterval(() => {
            for (const socketId in activeCombats) {
                const combat = activeCombats[socketId];
                const p = activePlayers[socketId];

                if (!p || !combat || combat.atbPaused || combat.playbackLock) continue;

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
                        actorKind: readyControlledActor.kind
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
                            if (!encounterEnded) combat.playbackLock = true;
                            io.to(socketId).emit('enemyTurnReceipt', {
                                events: masterEventList,
                                updatedPlayer: p,
                                updatedCombatState: encounterEnded ? null : syncCombatViews(combat, p),
                                combatDefeated,
                                combatComplete
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

function handleWeaponSpellAction(socket, p, combat, data, weapon, combatRules, resolveDefeat) {
    const spellData = SpellDatabase[combatRules.spellId];
    if (!spellData) {
        return socket.emit('combatResult', { type: 'error', message: 'Server: Staff spell is not configured.', newStamina: p.stamina });
    }

    let serverEnemy = null;
    if (combat && data.targetEnemy) {
        serverEnemy = getPlayerAttackTargets(combat).find(enemy => enemy.uid === data.targetEnemy.uid && isActorAlive(enemy));
    }

    const hasTileTarget = data.tx !== undefined && data.ty !== undefined;
    const tx = hasTileTarget ? data.tx : (serverEnemy ? serverEnemy.x : undefined);
    const ty = hasTileTarget ? data.ty : (serverEnemy ? serverEnemy.y : undefined);

    if (tx === undefined || ty === undefined) {
        return socket.emit('combatResult', { type: 'error', message: 'Server: Spell target lost.', newStamina: p.stamina });
    }

    const spellRange = combatRules.range || spellData.range || weapon.attackRange || 1;
    const castDist = getGridDistance(combat.player.x, combat.player.y, tx, ty, 1);
    if (castDist > spellRange) {
        return socket.emit('combatResult', { type: 'error', message: 'Server: Target out of spell range.', newStamina: p.stamina });
    }

    if (!spellData.ignoresLoS && !combatRules.ignoresLoS && !checkLineOfSight(combat.player.x, combat.player.y, tx, ty, combat)) {
        return socket.emit('combatResult', { type: 'error', message: 'Server: No line of sight for staff spell.', newStamina: p.stamina });
    }

    p.stamina -= combatRules.staminaCost || spellData.cost || 0;

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

    return socket.emit('combatResult', {
        type: 'hit', source: 'spell', actionName: spellData.name, targets: hitTargets,
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
function handleActorWeaponAction(socket, p, combat, data, resolveDefeat, actor) {
    const equipment = getActorEquipment(actor, p);
    let weapon = equipment.weapon;
    if (!weapon || !weapon.combat) weapon = buildFallbackWeapon();

    const combatRules = data.subType === 'special' ? weapon.combat.special : weapon.combat.standard;
    if (!combatRules) return socket.emit('combatResult', { type: 'error', message: 'Server: Action not supported by weapon.', newStamina: getActorStaminaValue(actor, p) });

    const staminaCost = combatRules.staminaCost || 0;
    if (getActorStaminaValue(actor, p) < staminaCost) {
        return socket.emit('combatResult', { type: 'error', message: `Server: ${actor.name} lacks stamina (${Math.floor(getActorStaminaValue(actor, p))}/${staminaCost}).`, newStamina: getActorStaminaValue(actor, p) });
    }

    if (combatRules.actionType === 'spell') {
        return handleActorSpellAction(socket, p, combat, data, actor, weapon, combatRules, resolveDefeat);
    }

    if (data.subType === 'special' && combatRules.targetType === 'aoe') {
        if (data.tx === undefined || data.ty === undefined) return;
        const castDist = getGridDistance(actor.x, actor.y, data.tx, data.ty, actor.size || 1);
        if (castDist > combatRules.range) return socket.emit('combatResult', { type: 'error', message: 'Server: Target out of range.', newStamina: getActorStaminaValue(actor, p) });
        if (!combatRules.ignoresLoS && !checkLineOfSight(actor.x, actor.y, data.tx, data.ty, combat)) {
            return socket.emit('combatResult', { type: 'error', message: 'Server: No line of sight to target area.', newStamina: getActorStaminaValue(actor, p) });
        }

        spendActorStamina(actor, p, staminaCost);
        const finalBaseDmg = Math.floor(getActorStatValue(actor, p, 'offense') * combatRules.multiplier);
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

        return socket.emit('combatResult', {
            type: 'hit', source: 'weapon', actionName: data.subType, actorUid: actor.uid, actorName: actor.name, targets: hitTargets,
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
    if (!serverEnemy) return socket.emit('combatResult', { type: 'error', message: 'Server: Target lost or already defeated.', newStamina: getActorStaminaValue(actor, p) });

    const dist = getGridDistance(actor.x, actor.y, serverEnemy.x, serverEnemy.y, serverEnemy.size || 1);
    if (dist > combatRules.range) return socket.emit('combatResult', { type: 'error', message: 'Server: Target out of confirmed range.', newStamina: getActorStaminaValue(actor, p) });
    if (!combatRules.ignoresLoS && !checkLineOfSight(actor.x, actor.y, serverEnemy.x, serverEnemy.y, combat)) {
        return socket.emit('combatResult', { type: 'error', message: 'Server: Target is obscured by an obstacle.', newStamina: getActorStaminaValue(actor, p) });
    }

    spendActorStamina(actor, p, staminaCost);
    const attackerOffense = getActorStatValue(actor, p, 'offense') * 10;
    const defenderSpeed = (serverEnemy.speed || 1) * 10;
    const defenderDefense = combatRules.ignoresDefense ? 0 : (serverEnemy.defense || 1) * 10;
    const offenseHitPower = (attackerOffense * 0.5) + (Math.random() * attackerOffense * 0.5);
    const speedMitigation = Math.random() * defenderSpeed;

    if ((offenseHitPower - speedMitigation) <= 0) {
        return socket.emit('combatResult', { type: 'miss', actorUid: actor.uid, actorName: actor.name, hitChance: 0, newStamina: getActorStaminaValue(actor, p), updatedCombatState: syncCombatViews(combat, p) });
    }

    const rawDamageRoll = Math.sqrt(Math.random()) * attackerOffense;
    const armorAbsorption = Math.pow(Math.random(), 2) * defenderDefense;
    const mitigatedDmg = Math.floor(rawDamageRoll - armorAbsorption);

    if (mitigatedDmg <= 0) {
        return socket.emit('combatResult', { type: 'miss', actorUid: actor.uid, actorName: actor.name, hitChance: 100, newStamina: getActorStaminaValue(actor, p), updatedCombatState: syncCombatViews(combat, p) });
    }

    const isCrit = mitigatedDmg >= Math.floor(attackerOffense * 0.90);
    const finalDmg = Math.floor(mitigatedDmg * combatRules.multiplier);
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

    socket.emit('combatResult', {
        type: 'hit', source: 'weapon', actionName: data.subType, actorUid: actor.uid, actorName: actor.name,
        targets: [{ uid: serverEnemy.uid, damage: finalDmg, isCrit, killed, statusApplied: poisonApplied ? 'poison' : null, statusEffects: serverEnemy.statusEffects }],
        newStamina: getActorStaminaValue(actor, p),
        fx: { tx: serverEnemy.x, ty: serverEnemy.y, sx: actor.x, sy: actor.y, sourceUid: actor.uid, spriteId: isRanged ? weapon.projectileSprite : weapon.spriteId, isProjectile: isRanged, isAoE: false },
        updatedPlayer: p,
        updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
        combatComplete
    });
}

function handleActorSpellAction(socket, p, combat, data, actor, weapon, combatRules, resolveDefeat) {
    const spellData = SpellDatabase[combatRules.spellId];
    if (!spellData) {
        return socket.emit('combatResult', { type: 'error', message: 'Server: Staff spell is not configured.', newStamina: getActorStaminaValue(actor, p) });
    }

    let serverEnemy = null;
    if (combat && data.targetEnemy) {
        serverEnemy = getActorAttackTargets(combat, actor).find(enemy => enemy.uid === data.targetEnemy.uid && isActorAlive(enemy));
    }

    const hasTileTarget = data.tx !== undefined && data.ty !== undefined;
    const tx = hasTileTarget ? data.tx : (serverEnemy ? serverEnemy.x : undefined);
    const ty = hasTileTarget ? data.ty : (serverEnemy ? serverEnemy.y : undefined);
    if (tx === undefined || ty === undefined) {
        return socket.emit('combatResult', { type: 'error', message: 'Server: Spell target lost.', newStamina: getActorStaminaValue(actor, p) });
    }

    const spellRange = combatRules.range || spellData.range || weapon.attackRange || 1;
    const castDist = getGridDistance(actor.x, actor.y, tx, ty, actor.size || 1);
    if (castDist > spellRange) {
        return socket.emit('combatResult', { type: 'error', message: 'Server: Target out of spell range.', newStamina: getActorStaminaValue(actor, p) });
    }
    if (!spellData.ignoresLoS && !combatRules.ignoresLoS && !checkLineOfSight(actor.x, actor.y, tx, ty, combat)) {
        return socket.emit('combatResult', { type: 'error', message: 'Server: No line of sight for staff spell.', newStamina: getActorStaminaValue(actor, p) });
    }

    const staminaCost = combatRules.staminaCost || spellData.cost || 0;
    if (getActorStaminaValue(actor, p) < staminaCost) {
        return socket.emit('combatResult', { type: 'error', message: `Server: ${actor.name} lacks stamina.`, newStamina: getActorStaminaValue(actor, p) });
    }

    spendActorStamina(actor, p, staminaCost);
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

    return socket.emit('combatResult', {
        type: 'hit', source: 'spell', actionName: spellData.name, actorUid: actor.uid, actorName: actor.name, targets: hitTargets,
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
function handleWeaponAction(socket, p, combat, data, resolveDefeat) {
    let weapon = p.equipment.weapon;

    if (!weapon || !weapon.combat) {
        weapon = {
            spriteId: "icon_punch",
            combat: {
                standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
                special: { name: "Haymaker", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false }
            }
        };
    }

    const combatRules = data.subType === 'special' ? weapon.combat.special : weapon.combat.standard;
    if (!combatRules) return socket.emit('combatResult', { type: 'error', message: 'Server: Action not supported by weapon.', newStamina: p.stamina });

    const staminaCost = combatRules.staminaCost;
    if (p.stamina < staminaCost) {
        return socket.emit('combatResult', { type: 'error', message: `Server: Insufficient stamina (${Math.floor(p.stamina)}/${staminaCost}).`, newStamina: p.stamina });
    }

    if (combatRules.actionType === "spell") {
        return handleWeaponSpellAction(socket, p, combat, data, weapon, combatRules, resolveDefeat);
    }


    if (data.subType === 'special' && combatRules.targetType === 'aoe') {
        if (data.tx === undefined || data.ty === undefined) return;

        const castDist = getGridDistance(combat.player.x, combat.player.y, data.tx, data.ty, 1);
        if (castDist > combatRules.range) {
            return socket.emit('combatResult', { type: 'error', message: 'Server: Target out of range.', newStamina: p.stamina });
        }

        if (!combatRules.ignoresLoS && !checkLineOfSight(combat.player.x, combat.player.y, data.tx, data.ty, combat)) {
            return socket.emit('combatResult', { type: 'error', message: 'Server: No line of sight to target area.', newStamina: p.stamina });
        }

        p.stamina -= staminaCost;

        const serverPower = getEffectiveStat(p, 'offense');
        const finalBaseDmg = Math.floor(serverPower * combatRules.multiplier);
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

        return socket.emit('combatResult', {
            type: 'hit', source: 'weapon', actionName: data.subType, targets: hitTargets,
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

    if (!serverEnemy) return socket.emit('combatResult', { type: 'error', message: 'Server: Target lost or already defeated.', newStamina: p.stamina });

    const dist = getGridDistance(combat.player.x, combat.player.y, serverEnemy.x, serverEnemy.y, serverEnemy.size || 1);
    if (dist > combatRules.range) return socket.emit('combatResult', { type: 'error', message: 'Server: Target out of confirmed range.', newStamina: p.stamina });

    if (!combatRules.ignoresLoS) {
        const hasLOS = checkLineOfSight(combat.player.x, combat.player.y, serverEnemy.x, serverEnemy.y, combat);
        if (!hasLOS) return socket.emit('combatResult', { type: 'error', message: 'Server: Target is obscured by an obstacle.', newStamina: p.stamina });
    }

    p.stamina -= staminaCost;

    const attackerOffense = getEffectiveStat(p, 'offense') * 10;
    const defenderSpeed = (serverEnemy.speed || 1) * 10;
    const defenderDefense = combatRules.ignoresDefense ? 0 : (serverEnemy.defense || 1) * 10;
    const offenseHitPower = (attackerOffense * 0.5) + (Math.random() * attackerOffense * 0.5);
    const speedMitigation = Math.random() * defenderSpeed;

    if ((offenseHitPower - speedMitigation) <= 0) {
        socket.emit('combatResult', { type: 'miss', hitChance: 0, newStamina: p.stamina });
        return;
    }

    const rawDamageRoll = Math.sqrt(Math.random()) * attackerOffense;
    const armorAbsorption = Math.pow(Math.random(), 2) * defenderDefense;
    const mitigatedDmg = Math.floor(rawDamageRoll - armorAbsorption);

    if (mitigatedDmg <= 0) {
        socket.emit('combatResult', { type: 'miss', hitChance: 100, newStamina: p.stamina });
        return;
    }

    const isCrit = mitigatedDmg >= Math.floor(attackerOffense * 0.90);
    const finalDmg = Math.floor(mitigatedDmg * combatRules.multiplier);

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

    socket.emit('combatResult', {
        type: 'hit', source: 'weapon', actionName: data.subType,
        targets: [{ uid: serverEnemy.uid, damage: finalDmg, isCrit: isCrit, killed: killed, statusApplied: poisonApplied ? "poison" : null, statusEffects: serverEnemy.statusEffects }],
        fx: { tx: serverEnemy.x, ty: serverEnemy.y, spriteId: isRanged ? weapon.projectileSprite : weapon.spriteId, isProjectile: isRanged, isAoE: false },
        updatedPlayer: p,
        updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
        combatComplete
    });
}

function emitActorItemReceipt(socket, p, combat, actor, receipt) {
    return socket.emit('combatItemReceipt', {
        actorUid: actor.uid,
        actorName: actor.name,
        newStamina: getActorStaminaValue(actor, p),
        ...receipt
    });
}

function handleActorConsumableAction(socket, p, combat, data, actor) {
    const invIndex = getArrayIndex(data.invIndex, p.inventory);
    if (invIndex < 0) return emitActorItemReceipt(socket, p, combat, actor, { success: false, message: 'Invalid inventory slot.' });
    const item = p.inventory[invIndex];
    if (!item || !item.combat) return emitActorItemReceipt(socket, p, combat, actor, { success: false, message: 'Invalid item data.' });

    const rules = item.combat;
    if (rules.staminaCost > 0 && getActorStaminaValue(actor, p) < rules.staminaCost) {
        return emitActorItemReceipt(socket, p, combat, actor, { success: false, message: `${actor.name} lacks stamina.` });
    }

    if (rules.actionType === 'heal') {
        const maxHp = getActorMaxHpValue(actor, p);
        const healAmount = Math.floor(maxHp * rules.healPercent);
        actor.hp = Math.min(maxHp, (actor.hp || 0) + healAmount);
        if (rules.cleanse) actor.statusEffects = {};
        p.inventory.splice(invIndex, 1);
        spendActorStamina(actor, p, rules.staminaCost || 0);
        return emitActorItemReceipt(socket, p, combat, actor, {
            success: true,
            updatedPlayer: p,
            updatedCombatState: syncCombatViews(combat, p),
            message: `${actor.name} used ${item.name}. Restored ${healAmount} HP.${rules.cleanse ? ' Negative effects cleansed.' : ''}`
        });
    }

    if (rules.actionType === 'cleanse') {
        actor.statusEffects = {};
        p.inventory.splice(invIndex, 1);
        spendActorStamina(actor, p, rules.staminaCost || 0);
        return emitActorItemReceipt(socket, p, combat, actor, {
            success: true,
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
        p.inventory.splice(invIndex, 1);
        spendActorStamina(actor, p, rules.staminaCost || 0);
        return emitActorItemReceipt(socket, p, combat, actor, {
            success: true,
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
        p.inventory.splice(invIndex, 1);
        spendActorStamina(actor, p, rules.staminaCost || 0);
        return emitActorItemReceipt(socket, p, combat, actor, {
            success: true,
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
function handleConsumableAction(socket, p, combat, data, resolveDefeat) {
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
        return socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: `Chugged ${item.name}. Restored ${healAmount} HP.${cleanseText}` });
    }

    if (rules.actionType === 'cleanse') {
        p.statusEffects = {};
        p.inventory.splice(invIndex, 1);
        p.stamina -= rules.staminaCost || 0;
        return socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: `${item.name} cleansed negative combat effects.` });
    }

    if (rules.actionType === 'staunch') {
        const maxVitalityCalc = getMaxHp(p);
        const floorHp = Math.floor(maxVitalityCalc * (rules.healFloorPercent || 0.3));
        const beforeHp = p.hp || 0;
        p.hp = Math.min(maxVitalityCalc, Math.max(beforeHp, floorHp));
        if (rules.cleanse) p.statusEffects = {};
        p.inventory.splice(invIndex, 1);
        p.stamina -= rules.staminaCost || 0;
        return socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: `${item.name} staunched the bleeding. HP set to at least ${floorHp}.${rules.cleanse ? ' Negative effects cleansed.' : ''}` });
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
            return socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, updatedCombatState: syncCombatViews(combat, p), message: rules.msg });
        }
        return socket.emit('combatItemReceipt', { success: false, message: 'Buff already active.' });
    }

    if (rules.actionType === 'throwable') {
        return socket.emit('combatItemReceipt', { success: false, message: 'Throwables have been retired. Use ranged or AOE weapons instead.' });
    }

    if (rules.actionType === 'spell') {
        if (data.tx === undefined || data.ty === undefined) return;

        const spellData = SpellDatabase[rules.spellId];
        if (!spellData) return socket.emit('combatItemReceipt', { success: false, message: "Server: Invalid spell logic." });
        if (p.stamina < spellData.cost) return socket.emit('combatItemReceipt', { success: false, message: 'Server: Insufficient stamina to cast.' });

        const castDist = getGridDistance(combat.player.x, combat.player.y, data.tx, data.ty, 1);
        if (castDist > spellData.range) return socket.emit('combatItemReceipt', { success: false, message: 'Server: Target out of spell range.' });

        p.stamina -= spellData.cost;

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

        return socket.emit('combatResult', {
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

function handleCombatEquip(socket, p, data) {
    const invIndex = getArrayIndex(data.invIndex, p.inventory);
    if (invIndex < 0) return socket.emit('combatItemReceipt', { success: false, message: "Invalid inventory slot." });

    const item = p.inventory[invIndex];
    if (!item) return;

    const validSlots = ["weapon", "helmet", "armor", "gloves", "boots"];
    if (!validSlots.includes(item.slot)) {
        return socket.emit('combatItemReceipt', { success: false, message: "This item cannot be equipped." });
    }

    const slotKey = item.slot;
    const worn = p.equipment[slotKey];

    p.equipment[slotKey] = item;
    if (worn) p.inventory[invIndex] = worn;
    else p.inventory.splice(invIndex, 1);

    return socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: "Swapped gear mid-combat." });
}
