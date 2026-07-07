// --- combatEncounters.js ---
// Server-side encounter and combat map construction.

const { createEnemy } = require('./public/js/npc-database.js');
const { sanitizeToken, clampInt } = require('./serverSecurity.js');

const VALID_ZONES = Object.freeze(['WILDERNESS', 'CELLARS', 'ABYSS', 'GORILLA_ARENA']);

function createCombatEncounter(player, data) {
    const zone = sanitizeToken(data.zoneChoice, 'WILDERNESS');
    if (!VALID_ZONES.includes(zone)) return null;
    if (zone === 'CELLARS' && !player.cellarsUnlocked) return null;
    if (zone === 'ABYSS' && !player.abyssUnlocked) return null;

    const requestedLvl = clampInt(data.activeLevel, 1, 20, 1);
    let runLvl = 1;

    if (zone === 'WILDERNESS') runLvl = Math.min(requestedLvl, player.wildernessLevel || 1);
    if (zone === 'CELLARS') runLvl = Math.min(requestedLvl, player.cellarLevel || 1);

    const combatState = {
        zone: zone,
        activeLevel: runLvl,
        turn: 'PLAYER',
        phase: 'MOVE',
        gridSize: { cols: clampInt(data.customCols, 8, 24, 16), rows: clampInt(data.customRows, 6, 18, 10) },
        tileSize: clampInt(data.customTileSize, 32, 96, 54),
        player: { x: 1, y: 4, atbCharge: 0 },
        enemies: [],
        obstacles: [],
        atbPaused: false
    };

    const baitMultiplier = (zone === 'WILDERNESS' && player.mapBaited) ? 1.4 : 1.0;
    const prefixLabel = (zone === 'WILDERNESS' && player.mapBaited) ? "Frenzied " : "";
    const cols = combatState.gridSize.cols || 16;
    const rows = combatState.gridSize.rows || 10;

    if (zone === 'GORILLA_ARENA') {
        combatState.player.x = 2;
        combatState.player.y = Math.floor(rows / 2);
        for (let i = 0; i < 100; i++) {
            let sx, sy;
            if (Math.random() > 0.5) { sx = Math.random() > 0.5 ? 0 : cols - 1; sy = Math.floor(Math.random() * rows); }
            else { sx = Math.floor(Math.random() * cols); sy = Math.random() > 0.5 ? 0 : rows - 1; }

            const newGorilla = createEnemy("enraged_gorilla", sx, sy);
            newGorilla.name = `Enraged Gorilla #${i + 1}`;
            combatState.enemies.push(newGorilla);
        }
    } else if (zone === 'ABYSS') {
        combatState.player.x = 0;
        combatState.player.y = rows - 1;
        const depth = player.abyssDepth || 1;
        const statMult = 1 + (depth * 0.15) + (Math.pow(depth, 2) * 0.005);
        const enemyCount = Math.min(12, 3 + Math.floor(depth / 3));

        for (let i = 0; i < enemyCount; i++) {
            const rng = Math.random();
            let ex = Math.floor(Math.random() * (cols - 4)) + 4;
            let ey = Math.floor(Math.random() * rows);

            while (combatState.enemies.some(e => e.x === ex && e.y === ey)) {
                ex = Math.floor(Math.random() * (cols - 4)) + 4;
                ey = Math.floor(Math.random() * rows);
            }

            if (rng > 0.7) combatState.enemies.push(createEnemy("spectral_barfly", ex, ey, "", statMult));
            else if (rng > 0.3) combatState.enemies.push(createEnemy("mash_crawler", ex, ey, "", statMult));
            else combatState.enemies.push(createEnemy("eldritch_keg", ex, ey, "", statMult));
        }
    } else if (zone === 'CELLARS') {
        if (runLvl === 20) {
            combatState.enemies.push(createEnemy("vintage_behemoth", cols - 6, Math.floor(rows / 2)));
        } else {
            const swarmSize = Math.min(6, 1 + Math.floor(runLvl / 2));
            for (let i = 0; i < swarmSize; i++) {
                const spawnX = (cols - 4) - Math.floor(i / 3);
                const spawnY = 2 + (i % 3);
                combatState.enemies.push(createEnemy("corrupted_cask", spawnX, spawnY));
            }
            if (player.cellarsChummed) {
                for (let i = 0; i < 5; i++) combatState.enemies.push(createEnemy("pub_crawl_mimic", (cols - 8) + i, 5, "Chummed "));
            } else if (runLvl >= 5) {
                combatState.enemies.push(createEnemy("pub_crawl_mimic", cols - 5, 6));
            }
        }
    } else {
        if (runLvl === 20) {
            combatState.enemies.push(createEnemy("wilderness_overlord", cols - 6, Math.floor(rows / 2), prefixLabel, baitMultiplier));
        } else {
            const swarmSize = Math.min(6, 1 + Math.floor(runLvl / 2));
            let publingsToSpawn = 0;
            if (runLvl === 5) publingsToSpawn = 1;
            else if (runLvl === 10) publingsToSpawn = 2;
            else if (runLvl === 15) publingsToSpawn = 3;

            for (let i = 0; i < swarmSize; i++) {
                const spawnX = (cols - 4) - Math.floor(i / 3);
                const spawnY = 2 + (i % 3);

                if (publingsToSpawn > 0) {
                    combatState.enemies.push(createEnemy("publing", spawnX, spawnY, prefixLabel, baitMultiplier));
                    publingsToSpawn--;
                } else {
                    combatState.enemies.push(createEnemy("wild_ravager", spawnX, spawnY, prefixLabel, baitMultiplier));
                }
            }
            if (player.mapBaited) combatState.enemies.push(createEnemy("alpha_poacher", cols - 8, 5));
        }
    }

    let obsIcon = "boulder";
    let obsSprite = "map_boulder";
    if (zone === 'WILDERNESS') { obsIcon = "tree"; obsSprite = "map_tree"; }
    else if (zone === 'CELLARS') { obsIcon = "cask"; obsSprite = "map_broken_cask"; }
    else if (zone === 'ABYSS') { obsIcon = "pillar"; obsSprite = "map_pillar"; }

    if (zone === 'WILDERNESS' && runLvl === 20) {
        combatState.player.x = 1;
        combatState.player.y = 4;
        const pillars = [{ x: 5, y: 1 }, { x: 5, y: 8 }, { x: 14, y: 1 }, { x: 14, y: 8 }];
        pillars.forEach(pillar => combatState.obstacles.push({ x: pillar.x, y: pillar.y, icon: obsIcon, spriteId: obsSprite }));
    } else {
        const obsCount = (zone === 'ABYSS') ? 20 : 10;
        for (let i = 0; i < obsCount; i++) {
            const ox = Math.floor(Math.random() * combatState.gridSize.cols);
            const oy = Math.floor(Math.random() * combatState.gridSize.rows);
            let blocked = (ox === combatState.player.x && oy === combatState.player.y);
            combatState.enemies.forEach(enemy => {
                const s = enemy.size || 1;
                if (ox >= enemy.x && ox < enemy.x + s && oy >= enemy.y && oy < enemy.y + s) blocked = true;
            });
            if (!blocked) combatState.obstacles.push({ x: ox, y: oy, icon: obsIcon, spriteId: obsSprite });
        }
    }

    combatState.enemies.forEach((enemy, idx) => {
        enemy.uid = `mob_${idx}`;
        enemy.atbCharge = 0;
    });

    return combatState;
}

module.exports = {
    createCombatEncounter,
    VALID_ZONES
};
