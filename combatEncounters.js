// --- combatEncounters.js ---
// Server-side encounter and combat map construction.

const { createEnemy } = require('./public/js/npc-database.js');
const { sanitizeToken, clampInt } = require('./serverSecurity.js');
const {
    getCombatMapTemplateById,
    getTemplateForEncounter,
    obstacleStyleForZone
} = require('./combatMapTemplates.js');
const { MAX_SELECTED_COMPANIONS } = require('./companionRoster.js');
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
const WILDERNESS_STANDARD_ENEMY_ROTATIONS = Object.freeze({
    early: Object.freeze([
        'goblin_axeling',
        'melee_bandit',
        'bandit_archer'
    ]),
    mid: Object.freeze([
        'goblin_axeling',
        'melee_bandit',
        'bandit_archer',
        'hedge_mage',
        'peanut_slinger',
        'wild_ravager',
        'magic_banana'
    ]),
    late: Object.freeze([
        'melee_bandit',
        'bandit_archer',
        'hedge_mage',
        'alpha_poacher',
        'goblin_axeling',
        'wild_ravager',
        'peanut_slinger',
        'magic_banana'
    ])
});
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

function getDeployedCompanions(player) {
    const roster = player && player.roster && typeof player.roster === 'object' ? player.roster : {};
    const companions = Array.isArray(roster.companions) ? roster.companions : [];
    const companionsById = new Map();
    companions.forEach(companion => {
        const instanceId = sanitizeToken(companion && companion.instanceId, '');
        if (instanceId && companion.hired !== false && !companionsById.has(instanceId)) {
            companionsById.set(instanceId, companion);
        }
    });

    const hasCanonicalActiveIds = Object.prototype.hasOwnProperty.call(roster, 'activeIds');
    const activeCandidates = hasCanonicalActiveIds
        ? (Array.isArray(roster.activeIds) ? roster.activeIds : [])
        : companions.filter(companion => companion && companion.active === true).map(companion => companion.instanceId);
    const selectedCompanions = [];
    const selectedIds = new Set();
    activeCandidates.forEach(value => {
        const instanceId = sanitizeToken(value, '');
        if (!instanceId
            || selectedIds.has(instanceId)
            || !companionsById.has(instanceId)
            || selectedCompanions.length >= MAX_SELECTED_COMPANIONS) return;
        selectedIds.add(instanceId);
        selectedCompanions.push(companionsById.get(instanceId));
    });

    return selectedCompanions;
}

function getCompanionFormationTiles(origin) {
    return PARTY_FORMATION_OFFSETS.map(offset => ({
        x: origin.x + offset.x,
        y: origin.y + offset.y
    }));
}

function addEnemyFromSlot(combatState, slot, prefix = "", statMult = 1) {
    const enemyId = slot.id;
    if (!enemyId) return null;

    const enemy = createEnemy(enemyId, slot.x, slot.y, slot.prefix ?? prefix, slot.statMult ?? statMult);
    if (!enemy) return null;
    if (slot.name) enemy.name = slot.name;
    return addCombatActor(combatState, createEnemyActor(enemy));
}

function createCombatStateFromTemplate(zone, activeLevel, template) {
    const defaultObstacleStyle = obstacleStyleForZone(zone);
    return {
        zone,
        activeLevel,
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
        turnSequence: 0,
        playbackLock: false,
        playbackId: null,
        playbackExpiresAt: 0,
        obstacles: (template.obstacles || []).map(obstacle => ({
            x: obstacle.x,
            y: obstacle.y,
            icon: obstacle.icon || defaultObstacleStyle.icon,
            spriteId: obstacle.spriteId || defaultObstacleStyle.spriteId
        })),
        atbPaused: false
    };
}

function deployPlayerParty(combatState, player, template) {
    addCombatActor(combatState, createPlayerActor(player, template.playerStart));

    const companionFormationTiles = getCompanionFormationTiles(template.playerStart);
    getDeployedCompanions(player).forEach(companion => {
        const companionTile = findOpenTileNear(combatState, template.playerStart, companionFormationTiles);
        if (companionTile) addCombatActor(combatState, createCompanionActor(companion, companionTile));
    });
}

function assignStableEnemyUids(combatState) {
    getEnemyActors(combatState).forEach((enemy, index) => {
        enemy.uid = `mob_${index}`;
        enemy.atbCharge = 0;
    });
}

function getWildernessEnemyId(runLvl, spawnIndex) {
    const roster = runLvl <= 2
        ? WILDERNESS_STANDARD_ENEMY_ROTATIONS.early
        : (
            runLvl < 10
                ? WILDERNESS_STANDARD_ENEMY_ROTATIONS.mid
                : WILDERNESS_STANDARD_ENEMY_ROTATIONS.late
        );
    const index = Math.max(0, Number(spawnIndex) || 0);
    return roster[index % roster.length];
}

function getCellarEnemyId(runLvl, spawnIndex, swarmSize) {
    const indexFromEnd = Math.max(
        0,
        (Math.max(1, Number(swarmSize) || 1) - 1)
            - Math.max(0, Number(spawnIndex) || 0)
    );

    if (runLvl >= 12) {
        if (indexFromEnd === 0) return 'shield_guard_captain';
        if (indexFromEnd === 1) return 'cellar_duelist';
        if (indexFromEnd === 2) return 'tankard_brute';
    } else if (runLvl >= 9) {
        if (indexFromEnd === 0) return 'shield_guard_captain';
        if (indexFromEnd === 1) return 'cellar_duelist';
    } else if (runLvl >= 6 && indexFromEnd === 0) {
        return 'shield_guard_captain';
    }

    return 'corrupted_cask';
}

const EXPEDITION_CONTEXT_TOKEN_KEYS = Object.freeze([
    'journeyId',
    'routeId',
    'fromLocationId',
    'from',
    'toLocationId',
    'to',
    'originId',
    'destinationId',
    'direction',
    'encounterId',
    'instanceId',
    'travelId',
    'legId'
]);
const EXPEDITION_CONTEXT_INTEGER_KEYS = Object.freeze([
    'legIndex',
    'legCount',
    'encounterIndex'
]);

function sanitizeExpeditionContext(context) {
    const source = context && typeof context === 'object' && !Array.isArray(context)
        ? context
        : {};
    const sanitized = {};

    EXPEDITION_CONTEXT_TOKEN_KEYS.forEach(key => {
        const value = sanitizeToken(source[key], null);
        if (value) sanitized[key] = value;
    });
    EXPEDITION_CONTEXT_INTEGER_KEYS.forEach(key => {
        if (source[key] === undefined || source[key] === null) return;
        sanitized[key] = clampInt(source[key], 0, 1000000, 0);
    });
    if (typeof source.returning === 'boolean') sanitized.returning = source.returning;

    return sanitized;
}

function getAuthoredEncounterDefinition(encounterId) {
    const safeEncounterId = sanitizeToken(encounterId, null);
    if (!safeEncounterId) return null;

    // Kept lazy so the legacy combat constructor remains independently usable.
    // The expedition route is the only path that loads the authored catalog.
    const { AuthoredEncounterCatalog } = require('./adventureCatalog.js');
    const catalog = AuthoredEncounterCatalog;
    if (Array.isArray(catalog)) {
        return catalog.find(entry => entry && entry.id === safeEncounterId) || null;
    }
    if (!catalog || typeof catalog !== 'object') return null;

    return catalog[safeEncounterId]
        || Object.values(catalog).find(entry => entry && entry.id === safeEncounterId)
        || null;
}

function getNamedEnemySpawn(template, spawnId) {
    const safeSpawnId = sanitizeToken(spawnId, null);
    if (!safeSpawnId || !template || !template.enemySpawns) return null;

    if (Array.isArray(template.enemySpawns)) {
        const spawn = template.enemySpawns.find(entry => entry && entry.id === safeSpawnId);
        return spawn || null;
    }

    return template.enemySpawns[safeSpawnId] || null;
}

function tileKey(tile) {
    return `${tile.x},${tile.y}`;
}

function isTileInsideTemplate(template, tile) {
    return !!(
        template
        && template.gridSize
        && tile
        && Number.isInteger(tile.x)
        && Number.isInteger(tile.y)
        && tile.x >= 0
        && tile.x < template.gridSize.cols
        && tile.y >= 0
        && tile.y < template.gridSize.rows
    );
}

function validateAuthoredTemplate(template) {
    if (!template || template.zone !== 'WILDERNESS') return false;
    if (!template.gridSize || template.gridSize.cols !== 16 || template.gridSize.rows !== 10) return false;
    if (!isTileInsideTemplate(template, template.playerStart)) return false;
    if (!Array.isArray(template.deploymentZone) || template.deploymentZone.length === 0) return false;

    const obstacleKeys = new Set();
    for (const obstacle of template.obstacles || []) {
        if (!isTileInsideTemplate(template, obstacle)) return false;
        const key = tileKey(obstacle);
        if (obstacleKeys.has(key)) return false;
        obstacleKeys.add(key);
    }

    const deploymentKeys = new Set();
    for (const tile of template.deploymentZone) {
        if (!isTileInsideTemplate(template, tile)) return false;
        const key = tileKey(tile);
        if (obstacleKeys.has(key) || deploymentKeys.has(key)) return false;
        deploymentKeys.add(key);
    }

    return deploymentKeys.has(tileKey(template.playerStart));
}

function getAuthoredEnemySlots(encounter, template) {
    if (!encounter || !Array.isArray(encounter.enemies) || encounter.enemies.length === 0) return null;

    const obstacleKeys = new Set((template.obstacles || []).map(tileKey));
    const deploymentKeys = new Set((template.deploymentZone || []).map(tileKey));
    const usedSpawnKeys = new Set();
    const slots = [];

    for (const definition of encounter.enemies) {
        if (!definition || typeof definition !== 'object') return null;
        const enemyId = sanitizeToken(definition.id, null);
        const spawnId = sanitizeToken(definition.spawnId, null);
        const spawn = getNamedEnemySpawn(template, spawnId);
        if (!enemyId || !spawn || !isTileInsideTemplate(template, spawn)) return null;

        const key = tileKey(spawn);
        if (obstacleKeys.has(key) || deploymentKeys.has(key) || usedSpawnKeys.has(key)) return null;
        usedSpawnKeys.add(key);

        const requestedMultiplier = Number(definition.statMult);
        slots.push({
            id: enemyId,
            spawnId,
            x: spawn.x,
            y: spawn.y,
            name: typeof definition.name === 'string'
                ? definition.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 64)
                : null,
            statMult: Number.isFinite(requestedMultiplier) && requestedMultiplier > 0
                ? Math.max(0.1, Math.min(10, requestedMultiplier))
                : 1,
            aiProfileId: sanitizeToken(definition.aiProfileId, null)
        });
    }

    return slots;
}

function createAuthoredCombatEncounter(player, encounterId, expeditionContext = {}) {
    if (!player || typeof player !== 'object') return null;

    const encounter = getAuthoredEncounterDefinition(encounterId);
    if (!encounter) return null;

    const canonicalEncounterId = sanitizeToken(encounter.id, null);
    const mapTemplateId = sanitizeToken(encounter.mapTemplateId, null);
    if (!canonicalEncounterId || !mapTemplateId || !mapTemplateId.startsWith('EXPEDITION_')) return null;

    const template = getCombatMapTemplateById(mapTemplateId);
    if (!validateAuthoredTemplate(template)) return null;

    const enemySlots = getAuthoredEnemySlots(encounter, template);
    if (!enemySlots) return null;

    const enemies = [];
    for (const slot of enemySlots) {
        const enemy = createEnemy(slot.id, slot.x, slot.y, '', slot.statMult);
        if (!enemy) return null;
        if (slot.name) enemy.name = slot.name;
        if (slot.aiProfileId) enemy.aiProfileId = slot.aiProfileId;
        enemy.spawnId = slot.spawnId;
        enemies.push(enemy);
    }

    const difficulty = clampInt(encounter.difficulty, 1, 20, 1);
    const combatState = createCombatStateFromTemplate('WILDERNESS', difficulty, template);
    combatState.mode = 'EXPEDITION';
    combatState.mapTemplateId = template.id;
    combatState.encounterId = canonicalEncounterId;
    combatState.encounterName = typeof encounter.name === 'string'
        ? encounter.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 64)
        : template.name;
    combatState.expeditionContext = sanitizeExpeditionContext(expeditionContext);
    combatState.expeditionContext.encounterId = canonicalEncounterId;
    combatState.deploymentZone = template.deploymentZone.map(tile => ({ x: tile.x, y: tile.y }));

    deployPlayerParty(combatState, player, template);
    enemies.forEach((enemy, index) => {
        enemy.uid = `mob_${index}`;
        enemy.atbCharge = 0;
        addCombatActor(combatState, createEnemyActor(enemy));
    });

    return syncCombatViews(combatState, player);
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

    const combatState = createCombatStateFromTemplate(zone, runLvl, template);
    deployPlayerParty(combatState, player, template);

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
            template.enemySlots.slice(0, swarmSize).forEach((slot, spawnIndex) => {
                addEnemyFromSlot(combatState, {
                    ...slot,
                    id: getCellarEnemyId(runLvl, spawnIndex, swarmSize)
                });
            });
            if (runLvl >= 5) {
                (template.mimicEnemies || []).forEach(slot => addEnemyFromSlot(combatState, slot));
            }
        }
    } else {
        if (runLvl === 20) {
            (template.enemies || []).forEach(slot => {
                addEnemyFromSlot(combatState, slot);
            });
        } else {
            const swarmSize = Math.min(template.enemySlots.length, 1 + Math.floor(runLvl / 2));
            let publingsToSpawn = 0;
            if (runLvl === 5) publingsToSpawn = 1;
            else if (runLvl === 10) publingsToSpawn = 2;
            else if (runLvl === 15) publingsToSpawn = 3;

            template.enemySlots.slice(0, swarmSize).forEach((slot, spawnIndex) => {
                if (publingsToSpawn > 0) {
                    addEnemyFromSlot(
                        combatState,
                        { ...slot, id: "publing" }
                    );
                    publingsToSpawn--;
                } else {
                    addEnemyFromSlot(combatState, {
                        ...slot,
                        id: (
                            runLvl >= 12
                            && spawnIndex === swarmSize - 1
                        )
                            ? 'harvest_champion'
                            : getWildernessEnemyId(runLvl, spawnIndex)
                    });
                }
            });
        }
    }

    assignStableEnemyUids(combatState);

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
    createAuthoredCombatEncounter,
    createCombatEncounter,
    getDeployedCompanions,
    getCompanionFormationTiles,
    getWildernessEnemyId,
    getCellarEnemyId,
    WILDERNESS_STANDARD_ENEMY_ROTATIONS,
    MAX_STANDARD_PLAYER_ACTORS,
    VALID_ZONES
};
