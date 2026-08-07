// Weapon, equipment-attack, guard, and evasion combat actions.

const {
    getGridDistance,
    checkLineOfSight,
    getEffectiveStat
} = require('../combatMath.js');
const {
    getActorStamina: getActorStaminaValue,
    spendActorStamina
} = require('../combatResources.js');
const {
    EQUIPMENT_SLOTS
} = require('../equipmentHandRules.js');
const { resolveEquipmentAttack } = require('../public/js/equipment-actions.js');
const {
    syncCombatViews,
    getPlayerActor,
    getPlayerAttackTargets,
    isActorAlive,
    isPlayerActor
} = require('../combatActors.js');
const { consumeActorReaction } = require('../combatIntents.js');
const { applyPoison } = require('../combatStatus.js');

module.exports = function createWeaponActions(shared, spellActions) {
    const {
        getActorStatValue,
        getActorAttackTargets,
        hasLineOfSightToActorFootprint,
        emitAnimatedCombatResult,
        finishPlayerControlledTurn,
        completePlayerControlledAction,
        commitPlayerControlledAction,
        getReactionMissDetails,
        interruptTargetIntent,
        rollAreaWeaponDamage,
        repositionActorAway,
        emitCombatResultError
    } = shared;
    const { handleWeaponSpellAction, handleActorSpellAction } = spellActions;

    function getActorEquipment(actor, player) {
        return isPlayerActor(actor) ? (player.equipment || {}) : (actor.equipment || {});
    }

    function getResolvedEquipmentAction(equipment, equipmentSlot, actionId) {
        if (!equipment || !EQUIPMENT_SLOTS.includes(equipmentSlot) || !actionId) return null;
        const action = resolveEquipmentAttack(equipment, equipmentSlot, actionId);
        if (!action || action.equipmentSlot !== equipmentSlot || action.id !== actionId) return null;
        return action;
    }

    function getEquipmentActionRules(action) {
        return action && action.rules && typeof action.rules === 'object'
            ? action.rules
            : action;
    }

    function isShieldBlockAction(action) {
        const rules = getEquipmentActionRules(action);
        return !!action && action.actionType === 'guard' && (
            String(action.guardType || rules.guardType || '') === 'shield_block'
            || action.id === 'shield_block'
            || action.clipId === 'shield_block'
        );
    }

    function getEquipmentDefenseType(action) {
        if (!action || action.actionType !== 'guard') return null;
        const rules = getEquipmentActionRules(action);
        const guardType = String(
            action.guardType
            || rules.guardType
            || (isShieldBlockAction(action) ? 'shield_block' : '')
        ).toLowerCase();
        if (guardType === 'evasion' || guardType === 'evade') return 'evade';
        return guardType === 'shield_block' ? 'shield_block' : null;
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

    function emitEquipmentActionError(socket, player, combat, actor, message) {
        return emitCombatResultError(
            socket,
            player,
            combat,
            actor,
            message,
            { actorUid: actor && actor.uid }
        );
    }

    function handleEquipmentAttackAction(
        socket,
        player,
        combat,
        data,
        resolveDefeat,
        actor
    ) {
        const equipment = getActorEquipment(actor, player);
        const item = equipment && EQUIPMENT_SLOTS.includes(data.equipmentSlot)
            ? equipment[data.equipmentSlot]
            : null;
        if (!data.itemId || !item || String(item.id || '') !== data.itemId) {
            return emitEquipmentActionError(
                socket,
                player,
                combat,
                actor,
                'Server: That equipment attack does not match the active loadout.'
            );
        }

        const action = getResolvedEquipmentAction(equipment, data.equipmentSlot, data.actionId);
        if (!action) {
            return emitEquipmentActionError(
                socket,
                player,
                combat,
                actor,
                'Server: That equipment attack is no longer available.'
            );
        }
        if (String(item.id || '') !== action.itemId) {
            return emitEquipmentActionError(
                socket,
                player,
                combat,
                actor,
                'Server: That equipment attack does not match the active loadout.'
            );
        }

        const staminaCost = Math.max(0, Math.trunc(Number(action.staminaCost) || 0));
        if (getActorStaminaValue(actor, player) < staminaCost) {
            return emitEquipmentActionError(
                socket,
                player,
                combat,
                actor,
                `Server: ${actor.name} lacks stamina (${Math.floor(getActorStaminaValue(actor, player))}/${staminaCost}).`
            );
        }

        const defenseType = getEquipmentDefenseType(action);
        if (defenseType) {
            const reactionProperty = defenseType === 'shield_block' ? 'guardState' : 'evasionState';
            if (actor[reactionProperty] && actor[reactionProperty].charges > 0) {
                return emitEquipmentActionError(
                    socket,
                    player,
                    combat,
                    actor,
                    `${actor.name} already has that defensive stance readied.`
                );
            }
            if (!spendActorStamina(actor, player, staminaCost)) {
                return emitEquipmentActionError(
                    socket,
                    player,
                    combat,
                    actor,
                    `Server: ${actor.name} lacks stamina.`
                );
            }

            const actionRules = getEquipmentActionRules(action);
            actor[reactionProperty] = {
                type: defenseType,
                charges: Math.max(1, Math.trunc(Number(action.charges || actionRules.charges) || 1)),
                actionId: action.id,
                equipmentSlot: action.equipmentSlot,
                itemId: action.itemId,
                createdTurnSequence: Number.isSafeInteger(combat.turnSequence)
                    ? combat.turnSequence
                    : 0
            };
            const actionResult = actionRules.endsTurn === true
                ? (
                    finishPlayerControlledTurn(combat, player, actor),
                    { actionsRemaining: 0, turnComplete: true }
                )
                : completePlayerControlledAction(combat, player, actor);

            return emitAnimatedCombatResult(socket, combat, {
                type: 'guard',
                source: 'equipment',
                actionName: action.name,
                action,
                actorUid: actor.uid,
                actorName: actor.name,
                reactionType: defenseType,
                guarded: defenseType === 'shield_block',
                evading: defenseType === 'evade',
                newStamina: getActorStaminaValue(actor, player),
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
                updatedPlayer: player,
                updatedCombatState: syncCombatViews(combat, player),
                combatComplete: false
            });
        }

        if (!['attack', 'spell'].includes(action.actionType)) {
            return emitEquipmentActionError(
                socket,
                player,
                combat,
                actor,
                'Server: That equipment action is not supported in combat.'
            );
        }

        const actionData = { ...data, subType: action.id };
        const options = { action, item };
        if (isPlayerActor(actor)) {
            return handleWeaponAction(
                socket,
                player,
                combat,
                actionData,
                resolveDefeat,
                actor,
                options
            );
        }
        return handleActorWeaponAction(
            socket,
            player,
            combat,
            actionData,
            resolveDefeat,
            actor,
            options
        );
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
        if (!weapon || (!resolvedAction && !weapon.combat)) weapon = buildFallbackWeapon();

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
            if (
                !combatRules.ignoresLoS
                && !checkLineOfSight(actor.x, actor.y, data.tx, data.ty, combat)
            ) {
                return reject('Server: No line of sight to target area.');
            }

            spendActorStamina(actor, p, staminaCost);
            commitPlayerControlledAction(combat, p, actor, combatRules);
            const resolvedBaseDmg = Math.floor(
                getActorStatValue(actor, p, 'offense') * combatRules.multiplier
            );
            const finalBaseDmg = resolvedAction ? Math.max(1, resolvedBaseDmg) : resolvedBaseDmg;
            const hitTargets = [];
            let combatComplete = false;
            getActorAttackTargets(combat, actor).forEach(enemy => {
                if (!isActorAlive(enemy)) return;
                const distance = getGridDistance(
                    data.tx,
                    data.ty,
                    enemy.x,
                    enemy.y,
                    enemy.size || 1
                );
                if (distance <= (combatRules.aoeRadius || 1)) {
                    const areaDamage = rollAreaWeaponDamage(
                        finalBaseDmg,
                        enemy,
                        p,
                        combatRules.ignoresDefense
                    );
                    enemy.hp -= areaDamage.damage;
                    const interruptedIntent = interruptTargetIntent(
                        enemy,
                        actor,
                        combatRules,
                        areaDamage.damage
                    );
                    let killed = false;
                    if (enemy.hp <= 0) {
                        killed = true;
                        const killResult = resolveDefeat(enemy, {
                            sourceActor: actor,
                            cause: 'weapon'
                        });
                        combatComplete = combatComplete || !!(killResult && killResult.combatComplete);
                    }
                    hitTargets.push({
                        uid: enemy.uid,
                        damage: areaDamage.damage,
                        isCrit: areaDamage.isCrit,
                        killed,
                        interruptedIntent
                    });
                }
            });

            return emitAnimatedCombatResult(socket, combat, {
                type: 'hit',
                source: 'weapon',
                actionName: resolvedAction ? resolvedAction.name : data.subType,
                action: resolvedAction || undefined,
                actorUid: actor.uid,
                actorName: actor.name,
                targets: hitTargets,
                fx: {
                    tx: data.tx,
                    ty: data.ty,
                    sx: actor.x,
                    sy: actor.y,
                    sourceUid: actor.uid,
                    spriteId: weapon.spriteId,
                    isAoE: true,
                    radius: combatRules.aoeRadius || 1
                },
                updatedPlayer: p,
                updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
                combatComplete
            });
        }

        let serverEnemy = null;
        if (combat && data.targetEnemy) {
            serverEnemy = getActorAttackTargets(combat, actor).find(enemy => (
                enemy.uid === data.targetEnemy.uid && isActorAlive(enemy)
            ));
        }
        if (!serverEnemy) return reject('Server: Target lost or already defeated.');

        const distance = getGridDistance(
            actor.x,
            actor.y,
            serverEnemy.x,
            serverEnemy.y,
            serverEnemy.size || 1
        );
        if (distance > combatRules.range) return reject('Server: Target out of confirmed range.');
        if (
            !combatRules.ignoresLoS
            && !hasLineOfSightToActorFootprint(actor.x, actor.y, serverEnemy, combat)
        ) {
            return reject('Server: Target is obscured by an obstacle.');
        }

        const attackOrigin = { x: actor.x, y: actor.y };
        spendActorStamina(actor, p, staminaCost);
        commitPlayerControlledAction(combat, p, actor, combatRules);
        const reposition = repositionActorAway(
            combat,
            actor,
            serverEnemy,
            combatRules.repositionAway
        );
        const reactionMiss = getReactionMissDetails(consumeActorReaction(serverEnemy));
        if (reactionMiss) {
            const isRanged = !!weapon.projectileSprite;
            return emitAnimatedCombatResult(socket, combat, {
                type: 'miss',
                source: 'weapon',
                actionName: resolvedAction ? resolvedAction.name : data.subType,
                action: resolvedAction || undefined,
                actorUid: actor.uid,
                actorName: actor.name,
                targetUid: serverEnemy.uid,
                hitChance: 100,
                ...reactionMiss,
                reposition,
                newStamina: getActorStaminaValue(actor, p),
                fx: {
                    tx: serverEnemy.x,
                    ty: serverEnemy.y,
                    sx: attackOrigin.x,
                    sy: attackOrigin.y,
                    sourceUid: actor.uid,
                    spriteId: isRanged ? weapon.projectileSprite : weapon.spriteId,
                    isProjectile: isRanged,
                    isAoE: false
                },
                updatedPlayer: p,
                updatedCombatState: syncCombatViews(combat, p)
            });
        }

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
                reposition,
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
                reposition,
                newStamina: getActorStaminaValue(actor, p),
                updatedCombatState: syncCombatViews(combat, p)
            });
        }

        const isCrit = mitigatedDmg >= Math.floor(attackerOffense * 0.90);
        const resolvedDamage = Math.floor(mitigatedDmg * combatRules.multiplier);
        const finalDmg = resolvedAction ? Math.max(1, resolvedDamage) : resolvedDamage;
        serverEnemy.hp -= finalDmg;
        const interruptedIntent = interruptTargetIntent(serverEnemy, actor, combatRules, finalDmg);
        const pushed = serverEnemy.hp > 0
            ? repositionActorAway(combat, serverEnemy, actor, combatRules.pushTarget)
            : null;
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
        return emitAnimatedCombatResult(socket, combat, {
            type: 'hit',
            source: 'weapon',
            actionName: resolvedAction ? resolvedAction.name : data.subType,
            action: resolvedAction || undefined,
            actorUid: actor.uid,
            actorName: actor.name,
            targets: [{
                uid: serverEnemy.uid,
                damage: finalDmg,
                isCrit,
                killed,
                statusApplied: poisonApplied ? 'poison' : null,
                statusEffects: serverEnemy.statusEffects,
                interruptedIntent,
                pushed
            }],
            reposition,
            newStamina: getActorStaminaValue(actor, p),
            fx: {
                tx: serverEnemy.x,
                ty: serverEnemy.y,
                sx: attackOrigin.x,
                sy: attackOrigin.y,
                sourceUid: actor.uid,
                spriteId: isRanged ? weapon.projectileSprite : weapon.spriteId,
                isProjectile: isRanged,
                isAoE: false
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
        if (!weapon || (!resolvedAction && !weapon.combat)) weapon = buildFallbackWeapon();

        const combatRules = resolvedAction
            ? getEquipmentActionRules(resolvedAction)
            : (data.subType === 'special' ? weapon.combat.special : weapon.combat.standard);
        if (!combatRules) return reject('Server: Action not supported by weapon.');

        const staminaCost = combatRules.staminaCost;
        if (p.stamina < staminaCost) {
            return reject(`Server: Insufficient stamina (${Math.floor(p.stamina)}/${staminaCost}).`);
        }

        if (combatRules.actionType === 'spell') {
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
            if (castDist > combatRules.range) return reject('Server: Target out of range.');
            if (
                !combatRules.ignoresLoS
                && !checkLineOfSight(combat.player.x, combat.player.y, data.tx, data.ty, combat)
            ) {
                return reject('Server: No line of sight to target area.');
            }

            p.stamina -= staminaCost;
            commitPlayerControlledAction(combat, p, getPlayerActor(combat), combatRules);
            const serverPower = getEffectiveStat(p, 'offense');
            const resolvedBaseDmg = Math.floor(serverPower * combatRules.multiplier);
            const finalBaseDmg = resolvedAction ? Math.max(1, resolvedBaseDmg) : resolvedBaseDmg;
            const hitTargets = [];
            let combatComplete = false;

            getPlayerAttackTargets(combat).forEach(enemy => {
                if (!isActorAlive(enemy)) return;
                const distance = getGridDistance(
                    data.tx,
                    data.ty,
                    enemy.x,
                    enemy.y,
                    enemy.size || 1
                );
                if (distance <= (combatRules.aoeRadius || 1)) {
                    const areaDamage = rollAreaWeaponDamage(
                        finalBaseDmg,
                        enemy,
                        p,
                        combatRules.ignoresDefense
                    );
                    enemy.hp -= areaDamage.damage;
                    const interruptedIntent = interruptTargetIntent(
                        enemy,
                        getPlayerActor(combat),
                        combatRules,
                        areaDamage.damage
                    );
                    let killed = false;
                    if (enemy.hp <= 0) {
                        killed = true;
                        const killResult = resolveDefeat(enemy, {
                            sourceActor: getPlayerActor(combat),
                            cause: 'weapon'
                        });
                        combatComplete = combatComplete || !!(killResult && killResult.combatComplete);
                    }
                    hitTargets.push({
                        uid: enemy.uid,
                        damage: areaDamage.damage,
                        isCrit: areaDamage.isCrit,
                        killed,
                        interruptedIntent
                    });
                }
            });

            return emitAnimatedCombatResult(socket, combat, {
                type: 'hit',
                source: 'weapon',
                actionName: resolvedAction ? resolvedAction.name : data.subType,
                action: resolvedAction || undefined,
                actorUid: actor && actor.uid,
                actorName: actor && actor.name,
                targets: hitTargets,
                fx: {
                    tx: data.tx,
                    ty: data.ty,
                    spriteId: weapon.spriteId,
                    isAoE: true,
                    radius: combatRules.aoeRadius || 1
                },
                updatedPlayer: p,
                updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
                combatComplete
            });
        }

        let serverEnemy = null;
        if (combat && data.targetEnemy) {
            serverEnemy = getPlayerAttackTargets(combat).find(enemy => (
                enemy.uid === data.targetEnemy.uid && isActorAlive(enemy)
            ));
        }
        if (!serverEnemy) return reject('Server: Target lost or already defeated.');

        const distance = getGridDistance(
            combat.player.x,
            combat.player.y,
            serverEnemy.x,
            serverEnemy.y,
            serverEnemy.size || 1
        );
        if (distance > combatRules.range) return reject('Server: Target out of confirmed range.');
        if (
            !combatRules.ignoresLoS
            && !hasLineOfSightToActorFootprint(
                combat.player.x,
                combat.player.y,
                serverEnemy,
                combat
            )
        ) {
            return reject('Server: Target is obscured by an obstacle.');
        }

        const attackOrigin = { x: combat.player.x, y: combat.player.y };
        p.stamina -= staminaCost;
        commitPlayerControlledAction(combat, p, getPlayerActor(combat), combatRules);
        const reposition = repositionActorAway(
            combat,
            getPlayerActor(combat),
            serverEnemy,
            combatRules.repositionAway
        );
        const reactionMiss = getReactionMissDetails(consumeActorReaction(serverEnemy));
        if (reactionMiss) {
            const isRanged = !!weapon.projectileSprite;
            return emitAnimatedCombatResult(socket, combat, {
                type: 'miss',
                source: 'weapon',
                actionName: resolvedAction ? resolvedAction.name : data.subType,
                action: resolvedAction || undefined,
                actorUid: actor && actor.uid,
                actorName: actor && actor.name,
                targetUid: serverEnemy.uid,
                hitChance: 100,
                ...reactionMiss,
                reposition,
                newStamina: p.stamina,
                fx: {
                    tx: serverEnemy.x,
                    ty: serverEnemy.y,
                    sx: attackOrigin.x,
                    sy: attackOrigin.y,
                    sourceUid: actor && actor.uid,
                    spriteId: isRanged ? weapon.projectileSprite : weapon.spriteId,
                    isProjectile: isRanged,
                    isAoE: false
                },
                updatedPlayer: p,
                updatedCombatState: syncCombatViews(combat, p)
            });
        }

        const attackerOffense = getEffectiveStat(p, 'offense') * 10;
        const defenderSpeed = (serverEnemy.speed || 1) * 10;
        const defenderDefense = combatRules.ignoresDefense ? 0 : (serverEnemy.defense || 1) * 10;
        const offenseHitPower = (attackerOffense * 0.5) + (Math.random() * attackerOffense * 0.5);
        const speedMitigation = Math.random() * defenderSpeed;
        if ((offenseHitPower - speedMitigation) <= 0) {
            return emitAnimatedCombatResult(socket, combat, {
                type: 'miss',
                actionName: resolvedAction ? resolvedAction.name : data.subType,
                action: resolvedAction || undefined,
                actorUid: 'player_0',
                targetUid: serverEnemy.uid,
                deflectReason: 'evasion',
                hitChance: 0,
                reposition,
                newStamina: p.stamina,
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
                actorUid: 'player_0',
                targetUid: serverEnemy.uid,
                deflectReason: 'armor',
                hitChance: 100,
                reposition,
                newStamina: p.stamina,
                updatedCombatState: syncCombatViews(combat, p)
            });
        }

        const isCrit = mitigatedDmg >= Math.floor(attackerOffense * 0.90);
        const resolvedDamage = Math.floor(mitigatedDmg * combatRules.multiplier);
        const finalDmg = resolvedAction ? Math.max(1, resolvedDamage) : resolvedDamage;
        serverEnemy.hp -= finalDmg;
        const interruptedIntent = interruptTargetIntent(
            serverEnemy,
            getPlayerActor(combat),
            combatRules,
            finalDmg
        );
        const pushed = serverEnemy.hp > 0
            ? repositionActorAway(
                combat,
                serverEnemy,
                getPlayerActor(combat),
                combatRules.pushTarget
            )
            : null;
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
            const killResult = resolveDefeat(serverEnemy, {
                sourceActor: getPlayerActor(combat),
                cause: 'weapon'
            });
            combatComplete = !!(killResult && killResult.combatComplete);
        }

        const isRanged = !!weapon.projectileSprite;
        return emitAnimatedCombatResult(socket, combat, {
            type: 'hit',
            source: 'weapon',
            actionName: resolvedAction ? resolvedAction.name : data.subType,
            action: resolvedAction || undefined,
            actorUid: actor && actor.uid,
            actorName: actor && actor.name,
            targets: [{
                uid: serverEnemy.uid,
                damage: finalDmg,
                isCrit,
                killed,
                statusApplied: poisonApplied ? 'poison' : null,
                statusEffects: serverEnemy.statusEffects,
                interruptedIntent,
                pushed
            }],
            reposition,
            fx: {
                tx: serverEnemy.x,
                ty: serverEnemy.y,
                sx: attackOrigin.x,
                sy: attackOrigin.y,
                sourceUid: actor && actor.uid,
                spriteId: isRanged ? weapon.projectileSprite : weapon.spriteId,
                isProjectile: isRanged,
                isAoE: false
            },
            updatedPlayer: p,
            updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
            combatComplete
        });
    }

    return { handleWeaponAction, handleActorWeaponAction, handleEquipmentAttackAction };
};
