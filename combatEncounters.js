// --- combatEncounters.js ---
// Server-side encounter and combat map construction.

const { createEnemy } = require('./public/js/npc-database.js');
const { sanitizeToken, clampInt } = require('./serverSecurity.js');
const { getTemplateForEncounter, obstacleStyleForZone } = require('./combatMapTemplates.js');
const {
    MAX_SELECTED_COMPANIONS,
    getRequiredCompanionIds
} = require('./companionRoster.js');
const {
    addCombatActor,
    createPlayerActor,
    createEnemyActor,
    createCompanionActor,
    createKregActor,
    createCellarDwellerActor,
    getEnemyActors,
    findOpenTileNear,
    syncCombatViews
} = require('./combatActors.js');

const VALID_ZONES = Object.freeze(['WILDERNESS', 'CELLARS', 'ABYSS', 'GORILLA_ARENA']);
const MAX_STANDARD_PLAYER_ACTORS = 1 + MAX_SELECTED_COMPANIONS;
const MAX_PLAYER_TEAM_ACTORS = 6;
const MAX_QUEST_BONUS_ALLIES = MAX_PLAYER_TEAM_ACTORS - MAX_STANDARD_PLAYER_ACTORS;
const PARTY_FORMATION_OFFSETS = Object.freeze([
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
    { x: 0, y: -2 },
    { x: 2, y: 1 },
    { x: 2, y: -1 },
    { x: 1, y: 2 },
    { x: 1, y: -2 },
    { x: -2, y: 0 },
    { x: -2, y: 1 },
    { x: -2, y: -1 }
].map(offset => Object.freeze(offset)));

function getDeployedCompanions(player, options = {}) {
    const roster = player && player.roster && typeof player.roster === 'object' ? player.roster : {};
    const companions = Array.isArray(roster.companions) ? roster.companions : [];
    const companionsById = new Map();
    companions.forEach(companion => {
        const instanceId = sanitizeToken(companion && companion.instanceId, '');
        if (instanceId && companion.hired !== false && !companionsById.has(instanceId)) {
            companionsById.set(instanceId, companion);
        }
    });

    const requiredIds = getRequiredCompanionIds(player);
    const requiredIdSet = new Set(requiredIds);
    const requestedRequiredLimit = Number(options.maxRequiredCompanions);
    const maxRequiredCompanions = Number.isFinite(requestedRequiredLimit)
        ? Math.max(0, Math.min(MAX_QUEST_BONUS_ALLIES, Math.trunc(requestedRequiredLimit)))
        : MAX_QUEST_BONUS_ALLIES;
    const requiredCompanions = requiredIds
        .slice(0, maxRequiredCompanions)
        .map(instanceId => companionsById.get(instanceId))
        .filter(Boolean);

    const hasCanonicalActiveIds = Object.prototype.hasOwnProperty.call(roster, 'activeIds');
    const activeCandidates = hasCanonicalActiveIds
        ? (Array.isArray(roster.activeIds) ? roster.activeIds : [])
        : companions.filter(companion => companion && companion.active === true).map(companion => companion.instanceId);
    const selectedCompanions = [];
    const selectedIds = new Set();
    activeCandidates.forEach(value => {
        const instanceId = sanitizeToken(value, '');
        if (!instanceId
            || requiredIdSet.has(instanceId)
            || selectedIds.has(instanceId)
            || !companionsById.has(instanceId)
            || selectedCompanions.length >= MAX_SELECTED_COMPANIONS) return;
        selectedIds.add(instanceId);
        selectedCompanions.push(companionsById.get(instanceId));
    });

    return [...selectedCompanions, ...requiredCompanions];
}

function getCompanionFormationTiles(origin) {
    return PARTY_FORMATION_OFFSETS.map(offset => ({
        x: origin.x + offset.x,
        y: origin.y + offset.y
    }));
}

function getRequiredCompanionCapacity(zone, runLvl) {
    const reservedQuestAllies = zone === 'WILDERNESS' && runLvl === 20 ? 1 : 0;
    return Math.max(0, MAX_QUEST_BONUS_ALLIES - reservedQuestAllies);
}
function addEnemyFromSlot(combatState, slot, prefix = "", statMult = 1) {
    const enemyId = slot.id;
    if (!enemyId) return;

    const enemy = createEnemy(enemyId, slot.x, slot.y, slot.prefix ?? prefix, slot.statMult ?? statMult);
    if (!enemy) return;
    if (slot.name) enemy.name = slot.name;
    addCombatActor(combatState, createEnemyActor(enemy));
}

function getWildernessEnemyId(runLvl, spawnIndex) {
    if (runLvl <= 2) return spawnIndex % 3 === 1 ? "peanut_slinger" : "goblin_axeling";
    if (runLvl < 10) return ["goblin_axeling", "peanut_slinger", "wild_ravager", "magic_banana"][spawnIndex % 4];
    if (spawnIndex % 5 === 2) return "peanut_slinger";
    if (spawnIndex % 7 === 3) return "magic_banana";
    return "wild_ravager";
}

function createCombatEncounter(player, data) {
    const zone = sanitizeToken(data.zoneChoice, 'WILDERNESS');
    if (!VALID_ZONES.includes(zone)) return null;
    if (zone === 'CELLARS' && !player.cellarsUnlocked) return null;
    if (zone === 'ABYSS' && !player.abyssUnlocked) return null;

    const requestedLvl = clampInt(data.activeLevel, 1, 20, 1);
    let runLvl = 1;

    if (zone === 'WILDERNESS') runLvl = Math.min(requestedLvl, player.wildernessLevel || 1);
    if (zone === 'CELLARS') runLvl = Math.min(requestedLvl, player.cellarLevel || 1);

    const template = getTemplateForEncounter(zone, runLvl);
    if (!template) return null;

    const defaultObstacleStyle = obstacleStyleForZone(zone);
    const combatState = {
        zone: zone,
        activeLevel: runLvl,
        turn: 'PLAYER',
        phase: 'MOVE',
        gridSize: template.gridSize,
        tileSize: template.tileSize,
        floorSpriteId: template.floorSpriteId || "ground_wilderness",
        floorTiles: template.floorTiles || [],
        player: { x: template.playerStart.x, y: template.playerStart.y, atbCharge: 0 },
        actors: [],
        enemies: [],
        allies: [],
        rogues: [],
        nextActorId: 0,
        obstacles: (template.obstacles || []).map(obstacle => ({
            x: obstacle.x,
            y: obstacle.y,
            icon: obstacle.icon || defaultObstacleStyle.icon,
            spriteId: obstacle.spriteId || defaultObstacleStyle.spriteId
        })),
        atbPaused: false
    };
    addCombatActor(combatState, createPlayerActor(player, template.playerStart));

    const companionFormationTiles = getCompanionFormationTiles(template.playerStart);
    getDeployedCompanions(player, {
        maxRequiredCompanions: getRequiredCompanionCapacity(zone, runLvl)
    }).forEach(companion => {
        const companionTile = findOpenTileNear(combatState, template.playerStart, companionFormationTiles);
        if (companionTile) addCombatActor(combatState, createCompanionActor(companion, companionTile));
    });

    const baitMultiplier = (zone === 'WILDERNESS' && player.mapBaited) ? 1.4 : 1.0;
    const prefixLabel = (zone === 'WILDERNESS' && player.mapBaited) ? "Frenzied " : "";

    if (zone === 'GORILLA_ARENA') {
        (template.enemySlots || []).forEach((slot, index) => {
            addEnemyFromSlot(combatState, { ...slot, id: "enraged_gorilla", name: `Enraged Gorilla #${index + 1}` });
        });
    } else if (zone === 'ABYSS') {
        const depth = player.abyssDepth || 1;
        const statMult = 1 + (depth * 0.15) + (Math.pow(depth, 2) * 0.005);
        const enemyCount = Math.min(template.enemySlots.length, 3 + Math.floor(depth / 3));
        template.enemySlots.slice(0, enemyCount).forEach(slot => addEnemyFromSlot(combatState, slot, "", statMult));
    } else if (zone === 'CELLARS') {
        if (runLvl === 20) {
            (template.enemies || []).forEach(slot => addEnemyFromSlot(combatState, slot));
        } else {
            const swarmSize = Math.min(template.enemySlots.length, 1 + Math.floor(runLvl / 2));
            template.enemySlots.slice(0, swarmSize).forEach(slot => {
                addEnemyFromSlot(combatState, { ...slot, id: "corrupted_cask" });
            });
            if (runLvl >= 5) {
                (template.mimicEnemies || []).forEach(slot => addEnemyFromSlot(combatState, slot));
            }
        }
    } else {
        if (runLvl === 20) {
            (template.enemies || []).forEach(slot => addEnemyFromSlot(combatState, slot, prefixLabel, baitMultiplier));
        } else {
            const swarmSize = Math.min(template.enemySlots.length, 1 + Math.floor(runLvl / 2));
            let publingsToSpawn = 0;
            if (runLvl === 5) publingsToSpawn = 1;
            else if (runLvl === 10) publingsToSpawn = 2;
            else if (runLvl === 15) publingsToSpawn = 3;

            template.enemySlots.slice(0, swarmSize).forEach((slot, spawnIndex) => {
                if (publingsToSpawn > 0) {
                    addEnemyFromSlot(combatState, { ...slot, id: "publing" }, prefixLabel, baitMultiplier);
                    publingsToSpawn--;
                } else {
                    addEnemyFromSlot(combatState, { ...slot, id: getWildernessEnemyId(runLvl, spawnIndex) }, prefixLabel, baitMultiplier);
                }
            });
        }
    }

    getEnemyActors(combatState).forEach((enemy, idx) => {
        enemy.uid = `mob_${idx}`;
        enemy.atbCharge = 0;
    });

    if (zone === 'WILDERNESS' && runLvl === 20) {
        const kregTile = findOpenTileNear(combatState, template.playerStart, [
            { x: template.playerStart.x + 1, y: template.playerStart.y + 1 },
            { x: template.playerStart.x + 1, y: template.playerStart.y - 1 }
        ]);
        if (kregTile) addCombatActor(combatState, createKregActor(kregTile));
    }

    if (zone === 'CELLARS' && runLvl === 20) {
        const rogueTile = findOpenTileNear(combatState, { x: 7, y: 4 }, [
            { x: 7, y: 4 },
            { x: 8, y: 4 },
            { x: 7, y: 5 }
        ]);
        if (rogueTile) addCombatActor(combatState, createCellarDwellerActor(rogueTile));
    }

    return syncCombatViews(combatState, player);
}

module.exports = {
    createCombatEncounter,
    getDeployedCompanions,
    getCompanionFormationTiles,
    MAX_STANDARD_PLAYER_ACTORS,
    MAX_PLAYER_TEAM_ACTORS,
    MAX_QUEST_BONUS_ALLIES,
    VALID_ZONES
};
