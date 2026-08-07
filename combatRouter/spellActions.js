// Staff and equipment-spell resolution for player and companion actors.

const { SpellDatabase } = require('../public/js/spells.js');
const {
    getGridDistance,
    checkLineOfSight,
    getLineOfEffectPath,
    getEffectiveStat
} = require('../combatMath.js');
const {
    getActorStamina: getActorStaminaValue,
    spendActorStamina
} = require('../combatResources.js');
const {
    syncCombatViews,
    getPlayerActor,
    getPlayerAttackTargets,
    isActorAlive
} = require('../combatActors.js');
const { applyPoison } = require('../combatStatus.js');

module.exports = function createSpellActions(shared) {
    const {
        getActorStatValue,
        getActorAttackTargets,
        emitCombatResultError,
        commitPlayerControlledAction,
        interruptTargetIntent,
        emitAnimatedCombatResult
    } = shared;

    function rollSpellDamage(player, spellData, combatRules) {
        const offense = getEffectiveStat(player, 'offense');
        const scale = spellData.powerScale !== undefined ? spellData.powerScale : 0;
        const multiplier = combatRules.multiplier || 1;
        const base = Math.max(1, Math.floor(((spellData.damageFlat || 0) + (offense * scale)) * multiplier));
        const minDmg = Math.max(1, Math.ceil(base * 0.85));
        const damage = Math.floor(Math.random() * (base - minDmg + 1)) + minDmg;
        return { damage, isCrit: damage >= Math.floor(base * 0.95) };
    }

    function rollActorSpellDamage(actor, player, spellData, combatRules) {
        const offense = getActorStatValue(actor, player, 'offense');
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
            const size = enemy.size || 1;
            return tx >= enemy.x && tx < enemy.x + size && ty >= enemy.y && ty < enemy.y + size;
        });
    }

    function getActorEnemyAtTile(combat, actor, tx, ty) {
        return getActorAttackTargets(combat, actor).find(enemy => {
            if (!isActorAlive(enemy)) return false;
            const size = enemy.size || 1;
            return tx >= enemy.x && tx < enemy.x + size && ty >= enemy.y && ty < enemy.y + size;
        });
    }

    function handleWeaponSpellAction(
        socket,
        player,
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
            player,
            combat,
            actor,
            message,
            { action: resolvedAction || undefined }
        );
        const spellData = SpellDatabase[combatRules.spellId];
        if (!spellData) return reject('Server: Staff spell is not configured.');

        let serverEnemy = null;
        if (combat && data.targetEnemy) {
            serverEnemy = getPlayerAttackTargets(combat).find(enemy => (
                enemy.uid === data.targetEnemy.uid && isActorAlive(enemy)
            ));
        }

        const hasTileTarget = data.tx !== undefined && data.ty !== undefined;
        const tx = hasTileTarget ? data.tx : (serverEnemy ? serverEnemy.x : undefined);
        const ty = hasTileTarget ? data.ty : (serverEnemy ? serverEnemy.y : undefined);
        if (tx === undefined || ty === undefined) return reject('Server: Spell target lost.');

        const spellRange = combatRules.range || spellData.range || weapon.attackRange || 1;
        const castDist = getGridDistance(combat.player.x, combat.player.y, tx, ty, 1);
        if (castDist > spellRange) return reject('Server: Target out of spell range.');

        if (
            !spellData.ignoresLoS
            && !combatRules.ignoresLoS
            && !checkLineOfSight(combat.player.x, combat.player.y, tx, ty, combat)
        ) {
            return reject('Server: No line of sight for staff spell.');
        }

        player.stamina -= combatRules.staminaCost || spellData.cost || 0;
        commitPlayerControlledAction(combat, player, getPlayerActor(combat), combatRules);

        const hitTargets = [];
        let combatComplete = false;
        const hitEnemy = enemy => {
            if (!enemy || !isActorAlive(enemy)) return;
            const roll = rollSpellDamage(player, spellData, combatRules);
            enemy.hp -= roll.damage;
            const interruptedIntent = interruptTargetIntent(
                enemy,
                getPlayerActor(combat),
                combatRules,
                roll.damage
            );
            const poisonApplied = applyPoison(enemy, {
                chance: spellData.poisonChance || combatRules.poisonChance || 0,
                turns: spellData.poisonTurns || combatRules.poisonTurns || 3,
                fallbackDamage: Math.max(2, Math.floor(roll.damage * 0.25)),
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
                damage: roll.damage,
                isCrit: roll.isCrit,
                killed,
                statusApplied: poisonApplied ? 'poison' : null,
                statusEffects: enemy.statusEffects,
                interruptedIntent
            });
        };

        if (spellData.type === 'single') {
            hitEnemy(serverEnemy || getEnemyAtTile(combat, tx, ty));
        } else if (spellData.type === 'line') {
            const blastPath = getLineOfEffectPath(
                combat.player.x,
                combat.player.y,
                tx,
                ty,
                spellRange,
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
                if (isHit) hitEnemy(enemy);
            });
        } else if (spellData.type === 'aoe') {
            const radius = spellData.aoeRadius || combatRules.aoeRadius || 1;
            getPlayerAttackTargets(combat).forEach(enemy => {
                if (!isActorAlive(enemy)) return;
                const distance = getGridDistance(tx, ty, enemy.x, enemy.y, enemy.size || 1);
                if (distance <= radius) hitEnemy(enemy);
            });
        }

        return emitAnimatedCombatResult(socket, combat, {
            type: 'hit',
            source: 'spell',
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
                tx,
                ty
            },
            updatedPlayer: player,
            updatedCombatState: combatComplete ? null : syncCombatViews(combat, player),
            combatComplete
        });
    }

    function handleActorSpellAction(
        socket,
        player,
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
            player,
            combat,
            actor,
            message,
            { action: resolvedAction || undefined }
        );
        const spellData = SpellDatabase[combatRules.spellId];
        if (!spellData) return reject('Server: Staff spell is not configured.');

        let serverEnemy = null;
        if (combat && data.targetEnemy) {
            serverEnemy = getActorAttackTargets(combat, actor).find(enemy => (
                enemy.uid === data.targetEnemy.uid && isActorAlive(enemy)
            ));
        }

        const hasTileTarget = data.tx !== undefined && data.ty !== undefined;
        const tx = hasTileTarget ? data.tx : (serverEnemy ? serverEnemy.x : undefined);
        const ty = hasTileTarget ? data.ty : (serverEnemy ? serverEnemy.y : undefined);
        if (tx === undefined || ty === undefined) return reject('Server: Spell target lost.');

        const spellRange = combatRules.range || spellData.range || weapon.attackRange || 1;
        const castDist = getGridDistance(actor.x, actor.y, tx, ty, actor.size || 1);
        if (castDist > spellRange) return reject('Server: Target out of spell range.');
        if (
            !spellData.ignoresLoS
            && !combatRules.ignoresLoS
            && !checkLineOfSight(actor.x, actor.y, tx, ty, combat)
        ) {
            return reject('Server: No line of sight for staff spell.');
        }

        const staminaCost = combatRules.staminaCost || spellData.cost || 0;
        if (getActorStaminaValue(actor, player) < staminaCost) {
            return reject(`Server: ${actor.name} lacks stamina.`);
        }

        spendActorStamina(actor, player, staminaCost);
        commitPlayerControlledAction(combat, player, actor, combatRules);
        const hitTargets = [];
        let combatComplete = false;
        const hitEnemy = enemy => {
            if (!enemy || !isActorAlive(enemy)) return;
            const roll = rollActorSpellDamage(actor, player, spellData, combatRules);
            enemy.hp -= roll.damage;
            const interruptedIntent = interruptTargetIntent(enemy, actor, combatRules, roll.damage);
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
            hitTargets.push({
                uid: enemy.uid,
                damage: roll.damage,
                isCrit: roll.isCrit,
                killed,
                statusApplied: poisonApplied ? 'poison' : null,
                statusEffects: enemy.statusEffects,
                interruptedIntent
            });
        };

        if (spellData.type === 'single') {
            hitEnemy(serverEnemy || getActorEnemyAtTile(combat, actor, tx, ty));
        } else if (spellData.type === 'line') {
            const blastPath = getLineOfEffectPath(
                actor.x,
                actor.y,
                tx,
                ty,
                spellRange,
                !spellData.ignoresLoS,
                combat
            );
            getActorAttackTargets(combat, actor).forEach(enemy => {
                if (!isActorAlive(enemy)) return;
                let isHit = false;
                const size = enemy.size || 1;
                for (let bx = enemy.x; bx < enemy.x + size; bx++) {
                    for (let by = enemy.y; by < enemy.y + size; by++) {
                        if (blastPath.some(tile => tile.x === bx && tile.y === by)) isHit = true;
                    }
                }
                if (isHit) hitEnemy(enemy);
            });
        } else if (spellData.type === 'aoe') {
            const radius = spellData.aoeRadius || combatRules.aoeRadius || 1;
            getActorAttackTargets(combat, actor).forEach(enemy => {
                if (!isActorAlive(enemy)) return;
                const distance = getGridDistance(tx, ty, enemy.x, enemy.y, enemy.size || 1);
                if (distance <= radius) hitEnemy(enemy);
            });
        }

        return emitAnimatedCombatResult(socket, combat, {
            type: 'hit',
            source: 'spell',
            actionName: resolvedAction ? resolvedAction.name : spellData.name,
            action: resolvedAction || undefined,
            actorUid: actor.uid,
            actorName: actor.name,
            targets: hitTargets,
            newStamina: getActorStaminaValue(actor, player),
            fx: {
                type: spellData.fx ? spellData.fx.type : 'beam',
                style: spellData.fx ? spellData.fx.style : 'arcane',
                density: spellData.fx ? spellData.fx.density : 12,
                spread: spellData.fx ? spellData.fx.spread : 12,
                speed: spellData.fx ? spellData.fx.speed : 10,
                radius: spellData.fx ? spellData.fx.radius : spellData.aoeRadius,
                frames: spellData.fx ? spellData.fx.frames : 22,
                tx,
                ty,
                sx: actor.x,
                sy: actor.y,
                sourceUid: actor.uid
            },
            updatedPlayer: player,
            updatedCombatState: combatComplete ? null : syncCombatViews(combat, player),
            combatComplete
        });
    }

    return { handleWeaponSpellAction, handleActorSpellAction };
};
