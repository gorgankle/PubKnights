// --- combatActors.js ---
// Server-side combat actor helpers. Keeps party/hostile/rogue logic centralized.

const { getMaxHp, getMaxStamina } = require('./combatMath.js');
const { ensureActorStamina } = require('./combatResources.js');

const {
    PARTY_PLAYER: TEAM_PLAYER,
    PARTY_ENEMY: TEAM_ENEMY,
    PARTY_ROGUE: TEAM_ROGUE,
    normalizePartyActor,
    syncCombatParties,
    getActorPartyId,
    getPartyActors
} = require('./combatParties.js');

function isActorAlive(actor) {
    return !!actor && actor.alive !== false && actor.hp !== 0 && actor.retreated !== true;
}

function isPlayerActor(actor) {
    return actor && actor.kind === 'player';
}

function isBlockingActor(actor) {
    return isActorAlive(actor) && actor.blocksMovement !== false;
}

function nextActorUid(combat, prefix = 'actor') {
    combat.nextActorId = combat.nextActorId || 0;
    const uid = `${prefix}_${combat.nextActorId}`;
    combat.nextActorId += 1;
    return uid;
}

function addCombatActor(combat, actor) {
    combat.actors = Array.isArray(combat.actors) ? combat.actors : [];
    if (!actor.uid) actor.uid = nextActorUid(combat, actor.kind || 'actor');
    if (actor.alive === undefined) actor.alive = true;
    if (actor.size === undefined) actor.size = 1;
    if (actor.blocksMovement === undefined) actor.blocksMovement = true;
    if (actor.targetable === undefined) actor.targetable = true;
    if (actor.atbCharge === undefined) actor.atbCharge = 0;
    normalizePartyActor(actor);
    ensureActorStamina(actor);
    combat.actors.push(actor);
    return actor;
}

function createPlayerActor(player, start) {
    return {
        uid: 'player_0',
        id: 'player',
        kind: 'player',
        controller: 'player',
        teamId: TEAM_PLAYER,
        disposition: 'party',
        name: player.username || 'Knight',
        x: start.x,
        y: start.y,
        size: 1,
        hp: player.hp || getMaxHp(player),
        maxHp: getMaxHp(player),
        stamina: player.stamina || getMaxStamina(player),
        maxStamina: getMaxStamina(player),
        alive: true,
        blocksMovement: true,
        targetable: true,
        targetableByEnemies: true,
        targetableByPlayer: false,
        rewardsEligible: false,
        atbCharge: 0
    };
}

function createEnemyActor(enemy) {
    return Object.assign(enemy, {
        kind: enemy.kind || 'monster',
        controller: enemy.controller || 'ai_enemy',
        teamId: TEAM_ENEMY,
        disposition: 'hostile',
        targetable: true,
        targetableByEnemies: false,
        targetableByPlayer: true,
        rewardsEligible: true,
        blocksMovement: true
    });
}

function getCompanionEquipmentStat(companion, statKey, fallback = 1) {
    const stats = companion && companion.stats && typeof companion.stats === 'object' ? companion.stats : {};
    const equipment = companion && companion.equipment && typeof companion.equipment === 'object' ? companion.equipment : {};
    let value = Math.max(0, Math.trunc(Number(stats[statKey]) || fallback));

    Object.values(equipment).forEach(item => {
        if (!item) return;
        if (statKey === 'maxStamina' && item.stamina) value += Math.trunc(Number(item.stamina) || 0);
        else if (item[statKey]) value += Math.trunc(Number(item[statKey]) || 0);
    });

    return Math.max(1, value);
}

function createCompanionActor(companion, tile) {
    const equipment = companion && companion.equipment && typeof companion.equipment === 'object' ? companion.equipment : {};
    const weapon = equipment.weapon || {};
    const standardAttack = weapon.combat && weapon.combat.standard ? weapon.combat.standard : {};
    const maxHp = getCompanionEquipmentStat(companion, 'vitality', 3) * 25;
    const maxStamina = getCompanionEquipmentStat(companion, 'maxStamina', 2) * 25;

    return {
        uid: `ally_${(companion && companion.instanceId) || 'companion'}`,
        id: (companion && companion.spriteId) || 'companion_marlow',
        kind: 'companion',
        controller: 'player_companion',
        teamId: TEAM_PLAYER,
        disposition: 'party',
        name: (companion && companion.name) || 'Companion',
        x: tile.x,
        y: tile.y,
        size: 1,
        hp: maxHp,
        maxHp,
        stamina: maxStamina,
        maxStamina,
        offense: getCompanionEquipmentStat(companion, 'offense', 2),
        defense: getCompanionEquipmentStat(companion, 'defense', 2),
        speed: getCompanionEquipmentStat(companion, 'speed', 3),
        attackRange: Math.max(1, Math.trunc(Number(standardAttack.range || weapon.attackRange) || 1)),
        projectileSprite: weapon.projectileSprite || null,
        spellFx: weapon.spellFx || null,
        icon: (companion && companion.icon) || 'M',
        alive: true,
        deathBehavior: 'retreat',
        targetable: true,
        targetableByEnemies: true,
        targetableByPlayer: false,
        rewardsEligible: false,
        blocksMovement: true,
        companionInstanceId: companion && companion.instanceId,
        companionTemplateId: companion && companion.templateId,
        equipment
    };
}
function createKregActor(tile) {
    return {
        uid: 'ally_kreg',
        id: 'npc_kreg',
        kind: 'npc',
        controller: 'ai_healer',
        teamId: TEAM_PLAYER,
        disposition: 'party',
        name: 'Kreg',
        x: tile.x,
        y: tile.y,
        size: 1,
        hp: 180,
        maxHp: 180,
        stamina: 25,
        maxStamina: 25,
        attackStaminaCost: 5,
        healStaminaCost: 10,
        offense: 1,
        defense: 8,
        speed: 5,
        attackRange: 1,
        healRange: 6,
        healCooldown: 0,
        icon: 'K',
        alive: true,
        deathBehavior: 'retreat',
        targetable: true,
        targetableByEnemies: true,
        targetableByPlayer: false,
        rewardsEligible: false,
        blocksMovement: true
    };
}

function createCellarDwellerActor(tile) {
    return {
        uid: 'rogue_cellar_dweller',
        id: 'cellar_dweller',
        kind: 'rogue',
        controller: 'ai_rogue',
        teamId: TEAM_ROGUE,
        disposition: 'rogue',
        name: 'Cellar Dweller',
        x: tile.x,
        y: tile.y,
        size: 1,
        hp: 140,
        maxHp: 140,
        stamina: 25,
        maxStamina: 25,
        attackStaminaCost: 5,
        offense: 18,
        defense: 8,
        speed: 5,
        attackRange: 1,
        icon: 'D',
        alive: true,
        targetable: true,
        targetableByEnemies: true,
        targetableByPlayer: true,
        rewardsEligible: false,
        blocksMovement: true,
        stealsBossLoot: true
    };
}

function ensureCombatActors(combat, player) {
    combat.actors = Array.isArray(combat.actors) ? combat.actors : [];
    combat.actors.forEach(actor => {
        normalizePartyActor(actor);
        ensureActorStamina(actor, isPlayerActor(actor) ? player : null);
    });
    let playerActor = getPlayerActor(combat);
    if (!playerActor && combat.player) {
        playerActor = createPlayerActor(player || {}, combat.player);
        combat.actors.unshift(playerActor);
    }
    return combat.actors;
}

function getPlayerActor(combat) {
    return combat && Array.isArray(combat.actors)
        ? combat.actors.find(actor => actor.kind === 'player')
        : null;
}

function syncPlayerActor(combat, player) {
    if (!combat || !player) return null;
    ensureCombatActors(combat, player);
    const actor = getPlayerActor(combat);
    if (!actor) return null;

    actor.x = combat.player ? combat.player.x : actor.x;
    actor.y = combat.player ? combat.player.y : actor.y;
    actor.hp = player.hp || 0;
    actor.maxHp = getMaxHp(player);
    actor.stamina = player.stamina || 0;
    actor.maxStamina = getMaxStamina(player);
    actor.alive = player.hp > 0;
    actor.atbCharge = combat.player ? (combat.player.atbCharge || actor.atbCharge || 0) : (actor.atbCharge || 0);
    return actor;
}

function syncCombatViews(combat, player) {
    if (!combat) return combat;
    ensureCombatActors(combat, player || {});
    const playerActor = syncPlayerActor(combat, player || {}) || getPlayerActor(combat);

    if (playerActor) {
        combat.player = {
            x: playerActor.x,
            y: playerActor.y,
            atbCharge: playerActor.atbCharge || 0
        };
    }

    syncCombatParties(combat);
    combat.enemies = combat.actors.filter(actor => getActorPartyId(actor) === TEAM_ENEMY);
    combat.allies = combat.actors.filter(actor => getActorPartyId(actor) === TEAM_PLAYER && !isPlayerActor(actor));
    combat.rogues = combat.actors.filter(actor => getActorPartyId(actor) === TEAM_ROGUE);
    return combat;
}

function getActorByUid(combat, uid) {
    if (!combat || !Array.isArray(combat.actors)) return null;
    return combat.actors.find(actor => actor.uid === uid) || null;
}

function getAliveActors(combat) {
    return (combat && Array.isArray(combat.actors) ? combat.actors : []).filter(isActorAlive);
}

function getEnemyActors(combat) {
    return getPartyActors(combat, TEAM_ENEMY);
}

function getAliveRogueActors(combat) {
    return getPartyActors(combat, TEAM_ROGUE).filter(isActorAlive);
}

function isHostileTo(source, target) {
    if (!source || !target || source.uid === target.uid) return false;
    return getActorPartyId(source) !== getActorPartyId(target);
}

function canActorTarget(source, target) {
    if (!isActorAlive(source) || !isActorAlive(target)) return false;
    if (!isHostileTo(source, target)) return false;
    if (target.targetable === false) return false;
    const sourcePartyId = getActorPartyId(source);
    if (sourcePartyId === TEAM_PLAYER && target.targetableByPlayer === false) return false;
    if (sourcePartyId === TEAM_ENEMY && target.targetableByEnemies === false) return false;
    if (sourcePartyId === TEAM_ROGUE && target.targetableByRogues === false) return false;
    return true;
}

function getHostileActorsFor(source, combat) {
    return getAliveActors(combat).filter(target => canActorTarget(source, target));
}

function getPlayerAttackTargets(combat) {
    const playerActor = getPlayerActor(combat);
    if (!playerActor) return [];
    return getHostileActorsFor(playerActor, combat).filter(target => target.targetableByPlayer !== false);
}

function getOccupiedTileKeys(combat, exceptUid = null) {
    const occupied = new Set();
    (combat.obstacles || []).forEach(obstacle => occupied.add(`${obstacle.x},${obstacle.y}`));

    (combat.actors || []).forEach(actor => {
        if (!isBlockingActor(actor) || actor.uid === exceptUid) return;
        const size = actor.size || 1;
        for (let x = actor.x; x < actor.x + size; x++) {
            for (let y = actor.y; y < actor.y + size; y++) {
                occupied.add(`${x},${y}`);
            }
        }
    });

    return occupied;
}

function findOpenTileNear(combat, origin, preferredTiles = []) {
    const cols = combat.gridSize.cols || 16;
    const rows = combat.gridSize.rows || 10;
    const occupied = getOccupiedTileKeys(combat);
    const candidates = [
        ...preferredTiles,
        { x: origin.x, y: origin.y + 1 },
        { x: origin.x, y: origin.y - 1 },
        { x: origin.x + 1, y: origin.y },
        { x: origin.x - 1, y: origin.y },
        { x: origin.x + 1, y: origin.y + 1 },
        { x: origin.x + 1, y: origin.y - 1 },
        { x: origin.x - 1, y: origin.y + 1 },
        { x: origin.x - 1, y: origin.y - 1 }
    ];

    return candidates.find(tile =>
        tile &&
        tile.x >= 0 && tile.x < cols &&
        tile.y >= 0 && tile.y < rows &&
        !occupied.has(`${tile.x},${tile.y}`)
    ) || null;
}

module.exports = {
    TEAM_PLAYER,
    TEAM_ENEMY,
    TEAM_ROGUE,
    syncCombatParties,
    getActorPartyId,
    getPartyActors,
    addCombatActor,
    createPlayerActor,
    createEnemyActor,
    createCompanionActor,
    createKregActor,
    createCellarDwellerActor,
    ensureCombatActors,
    syncPlayerActor,
    syncCombatViews,
    getPlayerActor,
    getActorByUid,
    getAliveActors,
    getEnemyActors,
    getAliveRogueActors,
    getHostileActorsFor,
    getPlayerAttackTargets,
    canActorTarget,
    isActorAlive,
    isPlayerActor,
    isBlockingActor,
    getOccupiedTileKeys,
    findOpenTileNear
};
