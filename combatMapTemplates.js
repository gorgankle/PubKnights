// --- combatMapTemplates.js ---
// Fixed combat map templates for server-side encounter construction and editor exports.

const DEFAULT_TILE_SIZE = 54;

const OBSTACLE_STYLE_BY_ZONE = Object.freeze({
    WILDERNESS: { icon: "tree", spriteId: "map_tree" },
    CELLARS: { icon: "cask", spriteId: "map_broken_cask" },
    ABYSS: { icon: "pillar", spriteId: "map_pillar" },
    GORILLA_ARENA: { icon: "boulder", spriteId: "map_boulder" }
});

function fixedArenaRingSlots(cols, rows, count) {
    const blocked = new Set(["2,5", "5,3", "5,6", "8,2", "8,7", "11,3", "11,6"]);
    const slots = [];

    function pushSlot(x, y) {
        const key = `${x},${y}`;
        if (blocked.has(key) || slots.some(slot => slot.x === x && slot.y === y)) return;
        slots.push({ x, y });
    }

    for (let x = 0; x < cols && slots.length < count; x++) pushSlot(x, 0);
    for (let y = 1; y < rows && slots.length < count; y++) pushSlot(cols - 1, y);
    for (let x = cols - 2; x >= 0 && slots.length < count; x--) pushSlot(x, rows - 1);
    for (let y = rows - 2; y > 0 && slots.length < count; y--) pushSlot(0, y);

    for (let y = 1; y < rows - 1 && slots.length < count; y++) {
        for (let x = cols - 2; x > 0 && slots.length < count; x--) pushSlot(x, y);
    }

    return slots.slice(0, count);
}

const CombatMapTemplates = Object.freeze({
    WILDERNESS_STANDARD: {
        id: "WILDERNESS_STANDARD",
        zone: "WILDERNESS",
        name: "Wilderness Trail",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_wilderness",
        playerStart: { x: 1, y: 4 },
        enemySlots: [
            { x: 12, y: 2 }, { x: 12, y: 3 }, { x: 12, y: 4 },
            { x: 11, y: 2 }, { x: 11, y: 3 }, { x: 11, y: 4 }
        ],
        obstacles: [
            { x: 4, y: 1 }, { x: 4, y: 8 }, { x: 6, y: 3 }, { x: 6, y: 6 }, { x: 8, y: 1 },
            { x: 8, y: 8 }, { x: 10, y: 4 }, { x: 10, y: 6 }, { x: 13, y: 1 }, { x: 13, y: 8 }
        ]
    },
    WILDERNESS_BOSS: {
        id: "WILDERNESS_BOSS",
        zone: "WILDERNESS",
        name: "Overlord Grove",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_wilderness",
        playerStart: { x: 1, y: 4 },
        enemies: [{ id: "wilderness_overlord", x: 10, y: 4 }],
        obstacles: [{ x: 5, y: 1 }, { x: 5, y: 8 }, { x: 14, y: 1 }, { x: 14, y: 8 }]
    },
    EXPEDITION_ALLEY: {
        id: "EXPEDITION_ALLEY",
        zone: "WILDERNESS",
        name: "Alley Robbery",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_wilderness",
        playerStart: { x: 1, y: 4 },
        deploymentZone: [
            { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 },
            { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }
        ],
        enemySpawns: {
            bandit_front: { x: 10, y: 4 },
            bandit_flank: { x: 11, y: 6 },
            bandit_rear: { x: 13, y: 3 }
        },
        obstacles: [
            { x: 3, y: 1, spriteId: "map_boulder" }, { x: 5, y: 1, spriteId: "map_boulder" },
            { x: 7, y: 1, spriteId: "map_boulder" }, { x: 9, y: 1, spriteId: "map_boulder" },
            { x: 11, y: 1, spriteId: "map_boulder" }, { x: 13, y: 1, spriteId: "map_boulder" },
            { x: 3, y: 8, spriteId: "map_boulder" }, { x: 5, y: 8, spriteId: "map_boulder" },
            { x: 7, y: 8, spriteId: "map_boulder" }, { x: 9, y: 8, spriteId: "map_boulder" },
            { x: 11, y: 8, spriteId: "map_boulder" }, { x: 13, y: 8, spriteId: "map_boulder" },
            { x: 7, y: 3, spriteId: "map_broken_cask" }, { x: 7, y: 6, spriteId: "map_broken_cask" }
        ]
    },
    EXPEDITION_PINE_TRAIL: {
        id: "EXPEDITION_PINE_TRAIL",
        zone: "WILDERNESS",
        name: "Poacher's Trail",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_wilderness",
        playerStart: { x: 1, y: 4 },
        deploymentZone: [
            { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 },
            { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }
        ],
        enemySpawns: {
            archer_ridge: { x: 13, y: 2 },
            bandit_path: { x: 10, y: 6 },
            poacher_flank: { x: 13, y: 7 }
        },
        obstacles: [
            { x: 3, y: 1 }, { x: 3, y: 7 }, { x: 5, y: 3 }, { x: 5, y: 8 },
            { x: 7, y: 1 }, { x: 7, y: 5 }, { x: 9, y: 3 }, { x: 9, y: 8 },
            { x: 11, y: 1 }, { x: 11, y: 4 }, { x: 12, y: 6 }, { x: 14, y: 4 },
            { x: 14, y: 8 }
        ]
    },
    EXPEDITION_HEDGE_FIRE: {
        id: "EXPEDITION_HEDGE_FIRE",
        zone: "WILDERNESS",
        name: "Hedge Fire",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_wilderness",
        playerStart: { x: 2, y: 4 },
        deploymentZone: [
            { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 },
            { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 }
        ],
        enemySpawns: {
            mage_center: { x: 11, y: 4 },
            bandit_guard: { x: 9, y: 6 },
            mage_rear: { x: 13, y: 5 }
        },
        obstacles: [
            { x: 4, y: 1 }, { x: 6, y: 1 }, { x: 8, y: 1 }, { x: 10, y: 1 }, { x: 12, y: 1 },
            { x: 4, y: 8 }, { x: 6, y: 8 }, { x: 8, y: 8 }, { x: 10, y: 8 }, { x: 12, y: 8 },
            { x: 5, y: 3 }, { x: 5, y: 6 }, { x: 13, y: 3 }, { x: 13, y: 7 }
        ]
    },
    EXPEDITION_ROAD_TOLL: {
        id: "EXPEDITION_ROAD_TOLL",
        zone: "WILDERNESS",
        name: "Road Toll",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_wilderness",
        playerStart: { x: 1, y: 4 },
        deploymentZone: [
            { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 },
            { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }
        ],
        enemySpawns: {
            bandit_blocker: { x: 10, y: 4 },
            archer_flank: { x: 12, y: 2 },
            bandit_rear: { x: 12, y: 7 },
            toll_rear: { x: 14, y: 5 }
        },
        obstacles: [
            { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 10, y: 1 }, { x: 11, y: 1 },
            { x: 4, y: 2 }, { x: 11, y: 2 }, { x: 4, y: 7 }, { x: 11, y: 7 },
            { x: 4, y: 8 }, { x: 5, y: 8 }, { x: 10, y: 8 }, { x: 11, y: 8 },
            { x: 7, y: 2, spriteId: "map_boulder" }, { x: 8, y: 7, spriteId: "map_boulder" },
            { x: 13, y: 4, spriteId: "map_broken_cask" }
        ]
    },
    EXPEDITION_RUINED_WATCHHOUSE: {
        id: "EXPEDITION_RUINED_WATCHHOUSE",
        zone: "WILDERNESS",
        name: "Ruined Watchhouse",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_wilderness",
        playerStart: { x: 1, y: 4 },
        deploymentZone: [
            { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 },
            { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }
        ],
        enemySpawns: {
            captain_gate: { x: 10, y: 4 },
            mage_tower: { x: 13, y: 2 },
            archer_wall: { x: 12, y: 7 },
            guard_courtyard: { x: 8, y: 6 },
            guard_rear: { x: 14, y: 5 }
        },
        obstacles: [
            { x: 4, y: 1, spriteId: "map_boulder" }, { x: 6, y: 1, spriteId: "map_boulder" },
            { x: 8, y: 1, spriteId: "map_boulder" }, { x: 10, y: 1, spriteId: "map_boulder" },
            { x: 12, y: 1, spriteId: "map_boulder" }, { x: 14, y: 1, spriteId: "map_boulder" },
            { x: 4, y: 8, spriteId: "map_boulder" }, { x: 6, y: 8, spriteId: "map_boulder" },
            { x: 8, y: 8, spriteId: "map_boulder" }, { x: 10, y: 8, spriteId: "map_boulder" },
            { x: 12, y: 8, spriteId: "map_boulder" }, { x: 14, y: 8, spriteId: "map_boulder" },
            { x: 5, y: 3, spriteId: "map_broken_cask" }, { x: 5, y: 6, spriteId: "map_broken_cask" },
            { x: 11, y: 3, spriteId: "map_broken_cask" }, { x: 11, y: 6, spriteId: "map_broken_cask" }
        ]
    },
    CELLARS_STANDARD: {
        id: "CELLARS_STANDARD",
        zone: "CELLARS",
        name: "Broken Cask Cellar",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_cellars",
        playerStart: { x: 1, y: 4 },
        enemySlots: [
            { x: 12, y: 2 }, { x: 12, y: 3 }, { x: 12, y: 4 },
            { x: 11, y: 2 }, { x: 11, y: 3 }, { x: 11, y: 4 }
        ],
        mimicEnemies: [{ id: "pub_crawl_mimic", x: 11, y: 6 }],
        obstacles: [
            { x: 3, y: 2 }, { x: 3, y: 7 }, { x: 5, y: 4 }, { x: 6, y: 1 }, { x: 6, y: 8 },
            { x: 8, y: 3 }, { x: 8, y: 6 }, { x: 10, y: 1 }, { x: 13, y: 3 }, { x: 13, y: 7 }
        ]
    },
    CELLARS_BOSS: {
        id: "CELLARS_BOSS",
        zone: "CELLARS",
        name: "Vintage Behemoth Vat",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_cellars",
        playerStart: { x: 1, y: 4 },
        enemies: [{ id: "vintage_behemoth", x: 10, y: 4 }],
        obstacles: [
            { x: 4, y: 2 }, { x: 4, y: 7 }, { x: 7, y: 1 }, { x: 7, y: 8 },
            { x: 12, y: 1 }, { x: 12, y: 8 }
        ]
    },
    ABYSS_STANDARD: {
        id: "ABYSS_STANDARD",
        zone: "ABYSS",
        name: "Abyssal Taproom",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_abyss",
        playerStart: { x: 0, y: 9 },
        enemySlots: [
            { id: "spectral_barfly", x: 11, y: 1 }, { id: "mash_crawler", x: 12, y: 3 }, { id: "eldritch_keg", x: 13, y: 5 },
            { id: "cult_champion", x: 10, y: 7 }, { id: "spectral_barfly", x: 14, y: 2 }, { id: "eldritch_keg", x: 9, y: 4 },
            { id: "mash_crawler", x: 12, y: 8 }, { id: "spectral_barfly", x: 8, y: 2 }, { id: "eldritch_keg", x: 14, y: 6 },
            { id: "mash_crawler", x: 7, y: 7 }, { id: "spectral_barfly", x: 10, y: 0 }, { id: "eldritch_keg", x: 15, y: 8 }
        ],
        obstacles: [
            { x: 2, y: 1 }, { x: 2, y: 4 }, { x: 2, y: 7 }, { x: 4, y: 2 }, { x: 4, y: 6 },
            { x: 5, y: 8 }, { x: 6, y: 1 }, { x: 6, y: 5 }, { x: 7, y: 3 }, { x: 8, y: 8 },
            { x: 9, y: 1 }, { x: 9, y: 6 }, { x: 11, y: 4 }, { x: 11, y: 9 }, { x: 13, y: 0 },
            { x: 13, y: 7 }, { x: 14, y: 4 }, { x: 15, y: 1 }, { x: 5, y: 4 }, { x: 0, y: 6 }
        ]
    },
    GORILLA_ARENA: {
        id: "GORILLA_ARENA",
        zone: "GORILLA_ARENA",
        name: "Gorilla Pit",
        gridSize: { cols: 16, rows: 10 },
        tileSize: DEFAULT_TILE_SIZE,
        floorSpriteId: "ground_arena",
        playerStart: { x: 2, y: 5 },
        enemySlots: fixedArenaRingSlots(16, 10, 100),
        obstacles: [
            { x: 5, y: 3 }, { x: 5, y: 6 }, { x: 8, y: 2 }, { x: 8, y: 7 },
            { x: 11, y: 3 }, { x: 11, y: 6 }
        ]
    }
});

function cloneMapTemplate(template) {
    return JSON.parse(JSON.stringify(template));
}

function getCombatMapTemplateById(templateId) {
    if (typeof templateId !== 'string') return null;
    const template = CombatMapTemplates[templateId];
    return template ? cloneMapTemplate(template) : null;
}

function getTemplateForEncounter(zone, level) {
    if (zone === "WILDERNESS" && level === 20) return cloneMapTemplate(CombatMapTemplates.WILDERNESS_BOSS);
    if (zone === "WILDERNESS") return cloneMapTemplate(CombatMapTemplates.WILDERNESS_STANDARD);
    if (zone === "CELLARS" && level === 20) return cloneMapTemplate(CombatMapTemplates.CELLARS_BOSS);
    if (zone === "CELLARS") return cloneMapTemplate(CombatMapTemplates.CELLARS_STANDARD);
    if (zone === "ABYSS") return cloneMapTemplate(CombatMapTemplates.ABYSS_STANDARD);
    if (zone === "GORILLA_ARENA") return cloneMapTemplate(CombatMapTemplates.GORILLA_ARENA);
    return null;
}

function obstacleStyleForZone(zone) {
    return OBSTACLE_STYLE_BY_ZONE[zone] || OBSTACLE_STYLE_BY_ZONE.GORILLA_ARENA;
}

module.exports = {
    CombatMapTemplates,
    getCombatMapTemplateById,
    getTemplateForEncounter,
    obstacleStyleForZone
};
