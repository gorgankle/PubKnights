// Shared-backpack, companion-pocket, spell-item, and mid-combat equip actions.

const { SpellDatabase } = require('../public/js/spells.js');
const { getArrayIndex } = require('../serverSecurity.js');
const {
    getGridDistance,
    getLineOfEffectPath,
    getMaxHp
} = require('../combatMath.js');
const {
    getActorStamina: getActorStaminaValue,
    spendActorStamina
} = require('../combatResources.js');
const { findCompanionByInstanceId } = require('../companionRoster.js');
const { EQUIPMENT_SLOTS, equipItemWithHandRules } = require('../equipmentHandRules.js');
const {
    syncCombatViews,
    getPlayerActor,
    getPlayerAttackTargets,
    isActorAlive
} = require('../combatActors.js');
const { applyPoison } = require('../combatStatus.js');

module.exports = function createConsumableActions(shared) {
    const {
        getActorMaxHpValue,
        completePlayerControlledAction,
        emitAnimatedCombatResult
    } = shared;

    function emitItemReceipt(socket, player, combat, actor, receipt) {
        if (receipt.success) {
            completePlayerControlledAction(combat, player, actor);
            receipt.updatedPlayer = player;
            receipt.updatedCombatState = combat;
        }
        return socket.emit('combatItemReceipt', {
            actorUid: actor.uid,
            actorName: actor.name,
            newStamina: getActorStaminaValue(actor, player),
            ...receipt
        });
    }

    function getActorConsumableSource(player, actor, data) {
        if (data.pocketIndex !== undefined && data.pocketIndex !== null) {
            const companion = findCompanionByInstanceId(
                player,
                actor && actor.companionInstanceId
            );
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

    function handleActorConsumableAction(socket, player, combat, data, actor) {
        const source = getActorConsumableSource(player, actor, data);
        if (source.error) {
            return emitItemReceipt(socket, player, combat, actor, {
                success: false,
                message: source.error
            });
        }
        const item = source.item;
        if (!item || !item.combat) {
            return emitItemReceipt(socket, player, combat, actor, {
                success: false,
                message: 'Invalid item data.'
            });
        }

        const rules = item.combat;
        if (rules.staminaCost > 0 && getActorStaminaValue(actor, player) < rules.staminaCost) {
            return emitItemReceipt(socket, player, combat, actor, {
                success: false,
                message: `${actor.name} lacks stamina.`
            });
        }

        const sourceReceipt = {
            itemSource: source.itemSource,
            pocketIndex: source.pocketIndex
        };
        if (rules.actionType === 'heal') {
            const maxHp = getActorMaxHpValue(actor, player);
            const healAmount = Math.floor(maxHp * rules.healPercent);
            actor.hp = Math.min(maxHp, (actor.hp || 0) + healAmount);
            if (rules.cleanse) actor.statusEffects = {};
            source.consume();
            spendActorStamina(actor, player, rules.staminaCost || 0);
            return emitItemReceipt(socket, player, combat, actor, {
                success: true,
                ...sourceReceipt,
                updatedPlayer: player,
                updatedCombatState: syncCombatViews(combat, player),
                message: `${actor.name} used ${item.name}. Restored ${healAmount} HP.${rules.cleanse ? ' Negative effects cleansed.' : ''}`
            });
        }

        if (rules.actionType === 'cleanse') {
            actor.statusEffects = {};
            source.consume();
            spendActorStamina(actor, player, rules.staminaCost || 0);
            return emitItemReceipt(socket, player, combat, actor, {
                success: true,
                ...sourceReceipt,
                updatedPlayer: player,
                updatedCombatState: syncCombatViews(combat, player),
                message: `${actor.name} used ${item.name}. Negative effects cleansed.`
            });
        }

        if (rules.actionType === 'staunch') {
            const maxHp = getActorMaxHpValue(actor, player);
            const floorHp = Math.floor(maxHp * (rules.healFloorPercent || 0.3));
            actor.hp = Math.min(maxHp, Math.max(actor.hp || 0, floorHp));
            if (rules.cleanse) actor.statusEffects = {};
            source.consume();
            spendActorStamina(actor, player, rules.staminaCost || 0);
            return emitItemReceipt(socket, player, combat, actor, {
                success: true,
                ...sourceReceipt,
                updatedPlayer: player,
                updatedCombatState: syncCombatViews(combat, player),
                message: `${actor.name} used ${item.name}. HP set to at least ${floorHp}.${rules.cleanse ? ' Negative effects cleansed.' : ''}`
            });
        }

        if (rules.actionType === 'buff') {
            actor.activeBuffs = actor.activeBuffs || [];
            const buffName = rules.buffType;
            if (actor.activeBuffs.includes(buffName)) {
                return emitItemReceipt(socket, player, combat, actor, {
                    success: false,
                    message: `${actor.name} already has that buff.`
                });
            }
            actor.activeBuffs.push(buffName);
            if (rules.effectCategory === 'offense' && rules.effectType === 'multiplier') {
                actor.offense = Math.max(1, Math.floor((actor.offense || 1) * rules.effectValue));
            }
            if (rules.effectCategory === 'defense' && rules.effectType === 'multiplier') {
                actor.defense = Math.max(1, Math.floor((actor.defense || 1) * rules.effectValue));
            }
            if (rules.effectCategory === 'speed' && rules.effectType === 'flat') {
                actor.speed = Math.max(1, (actor.speed || 1) + rules.effectValue);
            }
            if (rules.atbBoost) {
                actor.atbCharge = Math.min(
                    100,
                    (actor.atbCharge || 0) + Math.max(0, Math.min(100, Number(rules.atbBoost) || 0))
                );
            }
            source.consume();
            spendActorStamina(actor, player, rules.staminaCost || 0);
            return emitItemReceipt(socket, player, combat, actor, {
                success: true,
                ...sourceReceipt,
                updatedPlayer: player,
                updatedCombatState: syncCombatViews(combat, player),
                message: `${actor.name} used ${item.name}. ${rules.msg || 'Buff applied.'}`
            });
        }

        if (rules.actionType === 'throwable') {
            return emitItemReceipt(socket, player, combat, actor, {
                success: false,
                message: 'Throwables have been retired. Use ranged or AOE weapons instead.'
            });
        }
        return emitItemReceipt(socket, player, combat, actor, {
            success: false,
            message: `${actor.name} cannot use that item yet.`
        });
    }

    function handleConsumableAction(socket, p, combat, data, resolveDefeat, actor) {
        const invIndex = getArrayIndex(data.invIndex, p.inventory);
        if (invIndex < 0) {
            return socket.emit('combatItemReceipt', {
                success: false,
                message: 'Invalid inventory slot.'
            });
        }
        const item = p.inventory[invIndex];
        if (!item || !item.combat) {
            return socket.emit('combatItemReceipt', {
                success: false,
                message: 'Invalid item data.'
            });
        }

        const rules = item.combat;
        if (rules.staminaCost > 0 && p.stamina < rules.staminaCost) {
            return socket.emit('combatItemReceipt', {
                success: false,
                message: 'Server: Insufficient stamina.'
            });
        }

        if (rules.actionType === 'heal') {
            const maxVitalityCalc = getMaxHp(p);
            const healAmount = Math.floor(maxVitalityCalc * rules.healPercent);
            p.hp = Math.min(maxVitalityCalc, p.hp + healAmount);
            if (rules.cleanse) p.statusEffects = {};
            p.inventory.splice(invIndex, 1);
            p.stamina -= rules.staminaCost || 0;
            const cleanseText = rules.cleanse ? ' Negative effects cleansed.' : '';
            return emitItemReceipt(socket, p, combat, actor, {
                success: true,
                message: `Chugged ${item.name}. Restored ${healAmount} HP.${cleanseText}`
            });
        }

        if (rules.actionType === 'cleanse') {
            p.statusEffects = {};
            p.inventory.splice(invIndex, 1);
            p.stamina -= rules.staminaCost || 0;
            return emitItemReceipt(socket, p, combat, actor, {
                success: true,
                message: `${item.name} cleansed negative combat effects.`
            });
        }

        if (rules.actionType === 'staunch') {
            const maxVitalityCalc = getMaxHp(p);
            const floorHp = Math.floor(maxVitalityCalc * (rules.healFloorPercent || 0.3));
            const beforeHp = p.hp || 0;
            p.hp = Math.min(maxVitalityCalc, Math.max(beforeHp, floorHp));
            if (rules.cleanse) p.statusEffects = {};
            p.inventory.splice(invIndex, 1);
            p.stamina -= rules.staminaCost || 0;
            return emitItemReceipt(socket, p, combat, actor, {
                success: true,
                message: `${item.name} staunched the bleeding. HP set to at least ${floorHp}.${rules.cleanse ? ' Negative effects cleansed.' : ''}`
            });
        }

        if (rules.actionType === 'buff') {
            p.activeBuffs = p.activeBuffs || [];
            const buffName = rules.buffType;
            if (!p.activeBuffs.includes(buffName)) {
                p.activeBuffs.push(buffName);
                if (rules.atbBoost) {
                    const playerActor = getPlayerActor(combat);
                    const boost = Math.max(0, Math.min(100, Number(rules.atbBoost) || 0));
                    if (playerActor) {
                        playerActor.atbCharge = Math.min(100, (playerActor.atbCharge || 0) + boost);
                    }
                    if (combat.player) {
                        combat.player.atbCharge = playerActor
                            ? playerActor.atbCharge
                            : Math.min(100, (combat.player.atbCharge || 0) + boost);
                    }
                }
                p.inventory.splice(invIndex, 1);
                p.stamina -= rules.staminaCost || 0;
                return emitItemReceipt(socket, p, combat, actor, {
                    success: true,
                    message: rules.msg
                });
            }
            return socket.emit('combatItemReceipt', {
                success: false,
                message: 'Buff already active.'
            });
        }

        if (rules.actionType === 'throwable') {
            return socket.emit('combatItemReceipt', {
                success: false,
                message: 'Throwables have been retired. Use ranged or AOE weapons instead.'
            });
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
            if (!spellData) {
                return socket.emit('combatItemReceipt', {
                    success: false,
                    message: 'Server: Invalid spell logic.'
                });
            }
            if (p.stamina < spellData.cost) {
                return socket.emit('combatItemReceipt', {
                    success: false,
                    message: 'Server: Insufficient stamina to cast.'
                });
            }

            const castDist = getGridDistance(
                combat.player.x,
                combat.player.y,
                data.tx,
                data.ty,
                1
            );
            if (castDist > spellData.range) {
                return socket.emit('combatItemReceipt', {
                    success: false,
                    message: 'Server: Target out of spell range.'
                });
            }

            p.stamina -= spellData.cost;
            completePlayerControlledAction(combat, p, actor);
            const hitTargets = [];
            let combatComplete = false;
            if (spellData.type === 'line') {
                const blastPath = getLineOfEffectPath(
                    combat.player.x,
                    combat.player.y,
                    data.tx,
                    data.ty,
                    spellData.range,
                    !spellData.ignoresLoS,
                    combat
                );
                getPlayerAttackTargets(combat).forEach(enemy => {
                    if (!isActorAlive(enemy)) return;
                    let isHit = false;
                    const size = enemy.size || 1;
                    for (let bx = enemy.x; bx < enemy.x + size; bx++) {
                        for (let by = enemy.y; by < enemy.y + size; by++) {
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
                            const killResult = resolveDefeat(enemy, {
                                sourceActor: getPlayerActor(combat),
                                cause: 'spell'
                            });
                            combatComplete = combatComplete || !!(killResult && killResult.combatComplete);
                        }
                        hitTargets.push({
                            uid: enemy.uid,
                            damage: spellData.damageFlat,
                            isCrit: false,
                            killed,
                            statusApplied: poisonApplied ? 'poison' : null,
                            statusEffects: enemy.statusEffects
                        });
                    }
                });
            }

            return emitAnimatedCombatResult(socket, combat, {
                type: 'hit',
                source: 'spell',
                actionName: spellData.name,
                targets: hitTargets,
                fx: {
                    type: spellData.fx ? spellData.fx.type : 'beam',
                    style: spellData.fx ? spellData.fx.style : 'fire',
                    density: spellData.fx ? spellData.fx.density : 12,
                    spread: spellData.fx ? spellData.fx.spread : 15,
                    speed: spellData.fx ? spellData.fx.speed : 15,
                    tx: data.tx,
                    ty: data.ty
                },
                updatedPlayer: p,
                updatedCombatState: combatComplete ? null : syncCombatViews(combat, p),
                combatComplete
            });
        }
    }

    function emitCombatEquipError(socket, player, combat, actor, message) {
        return socket.emit('combatItemReceipt', {
            success: false,
            message,
            actorUid: actor && actor.uid,
            newStamina: actor ? getActorStaminaValue(actor, player) : player.stamina,
            updatedCombatState: syncCombatViews(combat, player)
        });
    }

    function handleCombatEquip(socket, player, combat, data, actor) {
        const invIndex = getArrayIndex(data.invIndex, player.inventory);
        if (invIndex < 0) {
            return emitCombatEquipError(socket, player, combat, actor, 'Invalid inventory slot.');
        }
        const item = player.inventory[invIndex];
        if (!item) {
            return emitCombatEquipError(socket, player, combat, actor, 'Invalid item data.');
        }
        if (!EQUIPMENT_SLOTS.includes(item.slot)) {
            return emitCombatEquipError(
                socket,
                player,
                combat,
                actor,
                'This item cannot be equipped.'
            );
        }

        player.maxInventorySlots = player.maxInventorySlots || 5;
        const equipResult = equipItemWithHandRules({
            equipment: player.equipment,
            inventory: player.inventory,
            inventoryIndex: invIndex,
            maxInventorySlots: player.maxInventorySlots
        });
        if (!equipResult.success) {
            return emitCombatEquipError(socket, player, combat, actor, equipResult.message);
        }

        const handMessage = equipResult.conflictSlot
            ? ' Conflicting hand gear was stowed.'
            : '';
        if (actor && actor.guardState) {
            const guardedSlot = actor.guardState.equipmentSlot;
            const guardedItem = guardedSlot && player.equipment[guardedSlot];
            if (!guardedItem || String(guardedItem.id || '') !== actor.guardState.itemId) {
                delete actor.guardState;
            }
        }
        if (actor && actor.evasionState) {
            const reactionSlot = actor.evasionState.equipmentSlot;
            const reactionItem = reactionSlot && player.equipment[reactionSlot];
            if (!reactionItem || String(reactionItem.id || '') !== actor.evasionState.itemId) {
                delete actor.evasionState;
            }
        }
        return emitItemReceipt(socket, player, combat, actor, {
            success: true,
            message: `Swapped gear mid-combat.${handMessage}`
        });
    }

    return {
        handleConsumableAction,
        handleActorConsumableAction,
        handleCombatEquip,
        emitCombatEquipError
    };
};
