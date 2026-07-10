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
const { processSecureKill, claimCombatRewards } = require('./combatRewards.js');
const { createCombatEncounter } = require('./combatEncounters.js');
const { executeActorTurn } = require('./combatAI.js');
const { applyPoison, tickPoison } = require('./combatStatus.js');
const { applyPlayerCombatDefeat } = require('./combatDefeat.js');
const {
    syncCombatViews,
    syncPlayerActor,
    getPlayerActor,
    getAliveActors,
    getEnemyActors,
    getPlayerAttackTargets,
    isActorAlive,
    isBlockingActor
} = require('./combatActors.js');

module.exports = function(socket, io, activePlayers, activeCombats) {
    const combatContext = { activePlayers, activeCombats, io };

    function secureKill(serverEnemy) {
        return processSecureKill(socket.id, serverEnemy, combatContext);
    }

    socket.on('dispatchCombatAction', (data) => {
        const p = activePlayers[socket.id];
        const combat = activeCombats[socket.id];
        if (!data || typeof data !== 'object') return;

        data.actionCategory = sanitizeToken(data.actionCategory, '');
        data.subType = sanitizeToken(data.subType, 'standard');

        if (combat && data.tx !== undefined && data.ty !== undefined) {
            data.tx = clampInt(data.tx, 0, combat.gridSize.cols - 1, combat.player.x);
            data.ty = clampInt(data.ty, 0, combat.gridSize.rows - 1, combat.player.y);
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
            p.hp = getMaxHp(p);
            p.stamina = getMaxStamina(p);
            delete activeCombats[socket.id];
            return socket.emit('combatResult', { type: 'flee', updatedPlayer: p });
        }

        if (data.actionCategory === 'pass') {
            const maxStam = getMaxStamina(p);
            const recover = Math.floor(maxStam * 0.15);
            p.stamina = Math.min(maxStam, (p.stamina || 0) + recover);
            socket.emit('combatResult', { type: 'pass', updatedPlayer: p, recovered: recover });
            return;
        }

        if (data.actionCategory === 'weapon') {
            handleWeaponAction(socket, p, combat, data, secureKill);
            return;
        }

        if (data.actionCategory === 'consumable') {
            handleConsumableAction(socket, p, combat, data, secureKill);
            return;
        }

        if (data.actionCategory === 'equip') {
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
        if (p.activeCombatBuff) {
            p.activeBuffs = Array.isArray(p.activeBuffs) ? p.activeBuffs : [];
            if (!p.activeBuffs.includes(p.activeCombatBuff)) p.activeBuffs.push(p.activeCombatBuff);
            p.activeCombatBuff = null;
        }

        const combatState = createCombatEncounter(p, data);
        if (!combatState) return;

        activeCombats[socket.id] = syncCombatViews(combatState, p);
        io.to(socket.id).emit('combatDeployed', activeCombats[socket.id]);
    });

    socket.on('endPlayerTurn', () => {
        const p = activePlayers[socket.id];
        const combat = activeCombats[socket.id];
        if (!p || !combat) return;

        syncPlayerActor(combat, p);
        combat.player.atbCharge = 0;
        const playerActor = getPlayerActor(combat);
        if (playerActor) playerActor.atbCharge = 0;
        combat.atbPaused = false;
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

        let speed = getEffectiveStat(p, 'speed');
        speed = Math.max(1, Math.min(12, speed));
        const tx = clampInt(data.tx, 0, combat.gridSize.cols - 1, combat.player.x);
        const ty = clampInt(data.ty, 0, combat.gridSize.rows - 1, combat.player.y);
        const dist = getGridDistance(combat.player.x, combat.player.y, tx, ty, 1);

        if (tx < 0 || tx >= combat.gridSize.cols || ty < 0 || ty >= combat.gridSize.rows) {
            return socket.emit('moveReceipt', { success: false, message: 'Server: Coordinates out of bounds.', x: combat.player.x, y: combat.player.y });
        }
        if (combat.obstacles.some(o => o.x === tx && o.y === ty)) {
            return socket.emit('moveReceipt', { success: false, message: 'Server: Obstacle collision detected.', x: combat.player.x, y: combat.player.y });
        }
        syncCombatViews(combat, p);
        const hitActor = getAliveActors(combat).some(actor => {
            if (!isBlockingActor(actor) || actor.kind === 'player') return false;
            const s = actor.size || 1;
            return tx >= actor.x && tx < actor.x + s && ty >= actor.y && ty < actor.y + s;
        });
        if (hitActor) {
            return socket.emit('moveReceipt', { success: false, message: 'Server: Entity collision detected.', x: combat.player.x, y: combat.player.y });
        }

        const moveStaminaCost = Math.floor((dist / speed) * 10);

        if (p.stamina >= moveStaminaCost) {
            p.stamina -= moveStaminaCost;
            combat.player.x = tx;
            combat.player.y = ty;
            const playerActor = getPlayerActor(combat);
            if (playerActor) {
                playerActor.x = tx;
                playerActor.y = ty;
            }
            socket.emit('moveReceipt', { success: true, updatedPlayer: p, updatedCombatState: syncCombatViews(combat, p) });
        } else {
            socket.emit('moveReceipt', { success: false, message: `Server: Not enough stamina to move (${p.stamina}/${moveStaminaCost}).`, x: combat.player.x, y: combat.player.y });
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

                const playerSpeed = (getEffectiveStat(p, 'speed') * 3) + 5;
                playerActor.atbCharge = Math.min(100, (playerActor.atbCharge || 0) + playerSpeed);
                combat.player.atbCharge = playerActor.atbCharge;

                getAliveActors(combat).forEach(actor => {
                    if (actor.controller === 'player') return;
                    const actorSpeed = (((actor.speed || 1) * 3) + 5);
                    actor.atbCharge = Math.min(100, (actor.atbCharge || 0) + actorSpeed);
                });

                if (playerActor.atbCharge >= 100) {
                    const poisonTick = tickPoison(p);
                    if (poisonTick) {
                        io.to(socketId).emit('statusEffectReceipt', {
                            events: [{
                                type: 'statusTick',
                                targetType: 'player',
                                status: 'poison',
                                damage: poisonTick.damage,
                                killed: poisonTick.killed
                            }],
                            updatedPlayer: p,
                            updatedCombatState: syncCombatViews(combat, p)
                        });
                    }

                    if (p.hp <= 0) {
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

                    combat.atbPaused = true;
                    io.to(socketId).emit('ATB_READY');
                } else {
                    const readyActors = getAliveActors(combat)
                        .filter(actor => actor.controller !== 'player' && actor.atbCharge >= 100);

                    if (readyActors.length > 0) {
                        const masterEventList = [];
                        const onActorDefeated = (actor) => {
                            if (!actor || actor.rewardsEligible === false) {
                                syncCombatViews(combat, p);
                                return { combatComplete: false };
                            }
                            return processSecureKill(socketId, actor, combatContext);
                        };

                        readyActors.forEach(actor => {
                            if (!activeCombats[socketId]) return;
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
                                    actor.alive = false;
                                    if (actor.deathBehavior === 'retreat') {
                                        actor.retreated = true;
                                        masterEventList.push({ type: 'retreat', uid: actor.uid, actorName: actor.name, teamId: actor.teamId });
                                    } else {
                                        onActorDefeated(actor);
                                    }
                                }
                                if (poisonTick.killed) return;
                            }
                            const events = executeActorTurn(socketId, combat, p, actor, activeCombats, onActorDefeated);
                            if (events && events.length > 0) masterEventList.push(...events);
                        });

                        if (masterEventList.length > 0) {
                            const combatDefeated = masterEventList.some(ev => ev && ev.type === 'death');
                            if (!combatDefeated) combat.playbackLock = true;
                            io.to(socketId).emit('enemyTurnReceipt', {
                                events: masterEventList,
                                updatedPlayer: p,
                                updatedCombatState: combatDefeated ? null : syncCombatViews(combat, p),
                                combatDefeated
                            });
                        }
                    }
                }
            }
        }, 200);
    }
};

function defeatCombatTarget(combat, p, target, secureKill) {
    target.hp = 0;
    target.alive = false;

    if (target.deathBehavior === 'retreat') {
        target.retreated = true;
        return { combatComplete: false };
    }

    if (target.rewardsEligible === false) {
        syncCombatViews(combat, p);
        return { combatComplete: getEnemyActors(combat).every(enemy => !enemy.alive) };
    }

    return secureKill(target) || { combatComplete: false };
}

function handleWeaponAction(socket, p, combat, data, secureKill) {
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
                    const killResult = defeatCombatTarget(combat, p, enemy, secureKill);
                    combatComplete = combatComplete || !!(killResult && killResult.combatComplete);
                }

                hitTargets.push({ uid: enemy.uid, damage: variedDmg, isCrit: isCrit, killed: killed });
            }
        });

        return socket.emit('combatResult', {
            type: 'hit', source: 'weapon', actionName: data.subType, targets: hitTargets,
            fx: { tx: data.tx, ty: data.ty, spriteId: weapon.spriteId, isAoE: true, radius: combatRules.aoeRadius || 1 },
            updatedPlayer: p,
            updatedCombatState: syncCombatViews(combat, p),
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
        fallbackDamage: Math.max(2, Math.floor(getEffectiveStat(p, 'offense') * 2))
    });
    let killed = false;
    let killResult = { combatComplete: false };
    if (serverEnemy.hp <= 0) {
        killed = true;
        killResult = defeatCombatTarget(combat, p, serverEnemy, secureKill);
    }

    const isRanged = !!weapon.projectileSprite;

    socket.emit('combatResult', {
        type: 'hit', source: 'weapon', actionName: data.subType,
        targets: [{ uid: serverEnemy.uid, damage: finalDmg, isCrit: isCrit, killed: killed, statusApplied: poisonApplied ? "poison" : null, statusEffects: serverEnemy.statusEffects }],
        fx: { tx: serverEnemy.x, ty: serverEnemy.y, spriteId: isRanged ? weapon.projectileSprite : weapon.spriteId, isProjectile: isRanged, isAoE: false },
        updatedPlayer: p,
        updatedCombatState: syncCombatViews(combat, p),
        combatComplete: !!(killResult && killResult.combatComplete)
    });
}

function handleConsumableAction(socket, p, combat, data, secureKill) {
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
        p.inventory.splice(invIndex, 1);
        p.stamina -= rules.staminaCost || 0;
        return socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: `Chugged ${item.name}. Restored ${healAmount} HP.` });
    }

    if (rules.actionType === 'buff') {
        p.activeBuffs = p.activeBuffs || [];
        const buffName = rules.buffType;

        if (!p.activeBuffs.includes(buffName)) {
            p.activeBuffs.push(buffName);
            p.inventory.splice(invIndex, 1);
            p.stamina -= rules.staminaCost || 0;
            return socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: rules.msg });
        }
        return socket.emit('combatItemReceipt', { success: false, message: "Buff already active." });
    }

    if (rules.actionType === 'throwable') {
        if (data.tx === undefined || data.ty === undefined) return;

        const throwDist = getGridDistance(combat.player.x, combat.player.y, data.tx, data.ty, 1);
        const maxRange = rules.range || 4;

        if (throwDist > maxRange) return socket.emit('combatItemReceipt', { success: false, message: 'Server: Target out of range.' });
        if (!rules.ignoresLoS && !checkLineOfSight(combat.player.x, combat.player.y, data.tx, data.ty, combat)) {
            return socket.emit('combatItemReceipt', { success: false, message: 'Server: No line of sight to target area.' });
        }

        p.inventory.splice(invIndex, 1);
        p.stamina -= rules.staminaCost || 0;

        const hitTargets = [];
        let combatComplete = false;
        getPlayerAttackTargets(combat).forEach(enemy => {
            if (!isActorAlive(enemy)) return;
            const dist = getGridDistance(data.tx, data.ty, enemy.x, enemy.y, enemy.size || 1);
            if (dist <= rules.aoeRadius) {
                enemy.hp -= rules.damageFlat;
                let killed = false;
                if (enemy.hp <= 0) {
                    killed = true;
                    const killResult = defeatCombatTarget(combat, p, enemy, secureKill);
                    combatComplete = combatComplete || !!(killResult && killResult.combatComplete);
                }
                hitTargets.push({ uid: enemy.uid, damage: rules.damageFlat, isCrit: false, killed: killed });
            }
        });

        return socket.emit('combatResult', {
            type: 'hit', source: 'throwable', actionName: item.name, targets: hitTargets,
            fx: { tx: data.tx, ty: data.ty, spriteId: item.spriteId || "icon_bomb_small", isAoE: true, radius: rules.aoeRadius },
            updatedPlayer: p,
            updatedCombatState: syncCombatViews(combat, p),
            combatComplete
        });
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
                        fallbackDamage: Math.max(2, Math.floor(spellData.damageFlat * 0.25))
                    });
                    let killed = false;
                    if (enemy.hp <= 0) {
                        killed = true;
                        const killResult = defeatCombatTarget(combat, p, enemy, secureKill);
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
            updatedCombatState: syncCombatViews(combat, p),
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
