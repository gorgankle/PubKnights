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
        baitedEnemies: [{ id: "alpha_poacher", x: 8, y: 5 }],
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
        chummedEnemies: [
            { id: "pub_crawl_mimic", x: 8, y: 5 }, { id: "pub_crawl_mimic", x: 9, y: 5 },
            { id: "pub_crawl_mimic", x: 10, y: 5 }, { id: "pub_crawl_mimic", x: 11, y: 5 },
            { id: "pub_crawl_mimic", x: 12, y: 5 }
        ],
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
            { id: "mash_crawler", x: 10, y: 7 }, { id: "spectral_barfly", x: 14, y: 2 }, { id: "eldritch_keg", x: 9, y: 4 },
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
    getTemplateForEncounter,
    obstacleStyleForZone
};
