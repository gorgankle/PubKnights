// --- combatEncounters.js ---
// Server-side encounter and combat map construction.

const { createEnemy } = require('./public/js/npc-database.js');
const { sanitizeToken, clampInt } = require('./serverSecurity.js');
const { getTemplateForEncounter, obstacleStyleForZone } = require('./combatMapTemplates.js');

const VALID_ZONES = Object.freeze(['WILDERNESS', 'CELLARS', 'ABYSS', 'GORILLA_ARENA']);

function addEnemyFromSlot(combatState, slot, prefix = "", statMult = 1) {
    const enemyId = slot.id;
    if (!enemyId) return;

    const enemy = createEnemy(enemyId, slot.x, slot.y, slot.prefix ?? prefix, slot.statMult ?? statMult);
    if (!enemy) return;
    if (slot.name) enemy.name = slot.name;
    combatState.enemies.push(enemy);
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
        enemies: [],
        obstacles: (template.obstacles || []).map(obstacle => ({
            x: obstacle.x,
            y: obstacle.y,
            icon: obstacle.icon || defaultObstacleStyle.icon,
            spriteId: obstacle.spriteId || defaultObstacleStyle.spriteId
        })),
        atbPaused: false
    };

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

            if (player.cellarsChummed) {
                (template.chummedEnemies || []).forEach(slot => addEnemyFromSlot(combatState, slot, "Chummed "));
            } else if (runLvl >= 5) {
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

            template.enemySlots.slice(0, swarmSize).forEach(slot => {
                if (publingsToSpawn > 0) {
                    addEnemyFromSlot(combatState, { ...slot, id: "publing" }, prefixLabel, baitMultiplier);
                    publingsToSpawn--;
                } else {
                    addEnemyFromSlot(combatState, { ...slot, id: "wild_ravager" }, prefixLabel, baitMultiplier);
                }
            });

            if (player.mapBaited) {
                (template.baitedEnemies || []).forEach(slot => addEnemyFromSlot(combatState, slot));
            }
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
