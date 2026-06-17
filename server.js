require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// Import game data dictionaries into the server
const { ItemDatabase } = require('./public/js/items.js');
const { LootTables } = require('./public/js/lootTables.js');
const { NpcDatabase, createEnemy } = require('./public/js/npc-database.js');

// Initialize the Express app and wrap it in an HTTP server for Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const activePlayers = {};
const activeCombats = {};

// --- MAP SPATIAL MATH HELPERS ---
function getGridDistance(x1, y1, x2, y2, size2 = 1) {
    let closeX = Math.max(x2, Math.min(x1, x2 + size2 - 1));
    let closeY = Math.max(y2, Math.min(y1, y2 + size2 - 1));
    return Math.max(Math.abs(x1 - closeX), Math.abs(y1 - closeY));
}

function hasLineOfSight(x1, y1, x2, y2, mapObstacles) {
    let dx = Math.abs(x2 - x1); let dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1; let sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy; let cx = x1; let cy = y1;
    while (true) {
        if (cx === x2 && cy === y2) return true;
        if (cx !== x1 || cy !== y1) {
            if (mapObstacles.some(o => o.x === cx && o.y === cy)) return false;
        }
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
    }
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// === MONGODB DATABASE CONNECTION ===
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/pubknights';

mongoose.connect(dbURI)
    .then(() => console.log('🛡️  MongoDB Secured & Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// === DATABASE SCHEMA ===
const playerSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    saveData: { type: Object, default: {} }     
}, { timestamps: true });

const Player = mongoose.model('Player', playerSchema);

// Serve the index.html file from the root directory
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


// === SOCKET.IO COMMUNICATION HUB ===
io.on('connection', (socket) => {
    console.log(`⚔️  A Knight has connected: ${socket.id}`);

    // --- REGISTER NEW KNIGHT ---
    socket.on('register', async (data) => {
        try {
            const existingPlayer = await Player.findOne({ username: data.username });
            if (existingPlayer) {
                return socket.emit('loginError', 'Name already taken by another Knight.');
            }

            const newPlayer = new Player({
                username: data.username,
                password: data.password, 
                saveData: {} 
            });

            await newPlayer.save();
            socket.emit('registerSuccess');
        } catch (err) {
            console.error(err);
            socket.emit('loginError', 'Server error during registration.');
        }
    });
    
// --- SAVE GAME STATE ---
    socket.on('saveGame', async (data) => {
        try {
            let p = activePlayers[socket.id];
            
            // === NEW: SECURE STATE MERGE ===
            // Prevent the browser from accidentally downgrading server-side progression!
            if (p) {
                activePlayers[socket.id] = {
                    ...data.saveData, // Accept the client's inventory, gold, and stats
                    
                    // Fiercely protect Map Unlocks (Never let them roll backward)
                    wildernessLevel: Math.max(p.wildernessLevel || 1, data.saveData.wildernessLevel || 1),
                    cellarLevel: Math.max(p.cellarLevel || 1, data.saveData.cellarLevel || 1),
                    abyssDepth: Math.max(p.abyssDepth || 1, data.saveData.abyssDepth || 1),
                    cellarsUnlocked: p.cellarsUnlocked || data.saveData.cellarsUnlocked,
                    abyssUnlocked: p.abyssUnlocked || data.saveData.abyssUnlocked,
                    
                    // Fiercely protect the XP/Gold Escrow
                    pendingXp: p.pendingXp !== undefined ? p.pendingXp : data.saveData.pendingXp,
                    pendingGold: p.pendingGold !== undefined ? p.pendingGold : data.saveData.pendingGold
                };
            } else {
                activePlayers[socket.id] = data.saveData; 
            }
            
            await Player.findOneAndUpdate(
                { username: data.username },
                { saveData: activePlayers[socket.id] }
            );
            console.log(`💾 Save file synced for Knight: ${data.username}`);
        } catch (err) {
            console.error('Error saving game data to MongoDB:', err);
        }
    });

    // --- LOGIN EXISTING KNIGHT ---
    socket.on('login', async (data) => {
        try {
            const playerDoc = await Player.findOne({ username: data.username, password: data.password });
            if (!playerDoc) return socket.emit('loginError', 'Invalid Knight Name or Password.');

            activePlayers[socket.id] = playerDoc.saveData;
            socket.emit('loginSuccess', playerDoc.saveData);
        } catch (err) { 
            console.error(err);
            socket.emit('loginError', 'Server error during login.');
        }
    });
	
// --- SERVER-HOSTED MAP GENERATOR ---
    socket.on('deployToCombat', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

        // Force player out of gathering jobs while fighting
        p.idleJob = 'TAVERN';
        p.pendingXp = 0;

        let zone = data.zoneChoice;
        let combatState = {
            zone: zone,
            turn: 'PLAYER',
            phase: 'MOVE',
            gridSize: 8,
            tileSize: 60,
            player: { x: 1, y: 1 },
            enemies: [],
            obstacles: []
        };

        let baitMultiplier = (zone === 'WILDERNESS' && p.mapBaited) ? 1.4 : 1.0;
        let prefixLabel = (zone === 'WILDERNESS' && p.mapBaited) ? "Frenzied " : "";

        // 1. GENERATE ENEMIES SECURELY
        if (zone === 'GORILLA_ARENA') {
            combatState.gridSize = 14; combatState.tileSize = 34; combatState.player.x = 7; combatState.player.y = 7;
            for (let i = 0; i < 100; i++) {
                let sx, sy;
                if (Math.random() > 0.5) { sx = Math.random() > 0.5 ? 0 : 13; sy = Math.floor(Math.random() * 14); } 
                else { sx = Math.floor(Math.random() * 14); sy = Math.random() > 0.5 ? 0 : 13; }
                combatState.enemies.push({ id: "enraged_gorilla", name: `Enraged Gorilla #${i+1}`, type: "MELEE", hp: 12000, maxHp: 12000, moveRange: 2, attackRange: 1, attack: 180, resilience: 30, accuracy: 120, alive: true, icon: "🦍", x: sx, y: sy, size: 1 });
            }
        } 
        else if (zone === 'ABYSS') {
            combatState.gridSize = 12; combatState.tileSize = 40; combatState.player.x = 0; combatState.player.y = 11;
            let depth = p.abyssDepth || 1;
            let statMult = 1 + (depth * 0.15) + (Math.pow(depth, 2) * 0.005);
            let enemyCount = Math.min(12, 3 + Math.floor(depth / 3));

            for (let i = 0; i < enemyCount; i++) {
                let rng = Math.random();
                let ex = Math.floor(Math.random() * 8) + 4; 
                let ey = Math.floor(Math.random() * 12);
                while(combatState.enemies.some(e => e.x === ex && e.y === ey)) {
                    ex = Math.floor(Math.random() * 8) + 4; ey = Math.floor(Math.random() * 12);
                }
                if (rng > 0.7) combatState.enemies.push(createEnemy("spectral_barfly", ex, ey, "", statMult));
                else if (rng > 0.3) combatState.enemies.push(createEnemy("mash_crawler", ex, ey, "", statMult));
                else combatState.enemies.push(createEnemy("eldritch_keg", ex, ey, "", statMult));
            }
        }
        else if (zone === 'CELLARS') {
            let runCLvl = data.activeLevel || p.cellarLevel || 1;
            if (runCLvl === 20) {
                combatState.enemies.push(createEnemy("vintage_behemoth", 5, 4));
            } else {
                let swarmSize = Math.min(6, 1 + Math.floor(runCLvl / 2)); 
                for (let i = 0; i < swarmSize; i++) {
                    let spawnX = 7 - Math.floor(i / 3); let spawnY = 2 + (i % 3);
                    combatState.enemies.push(createEnemy("corrupted_cask", spawnX, spawnY));
                }
                if (p.cellarsChummed) {
                    for (let i = 0; i < 5; i++) combatState.enemies.push(createEnemy("pub_crawl_mimic", 2 + i, 5, "Chummed "));
                } else if (runCLvl >= 5) {
                    combatState.enemies.push(createEnemy("pub_crawl_mimic", 5, 6));
                }
            }
        }
        else { // WILDERNESS
            let runLvl = data.activeLevel || p.wildernessLevel || 1;
            if (runLvl === 20) {
                combatState.enemies.push(createEnemy("wilderness_overlord", 5, 4, prefixLabel, baitMultiplier));
            } else {
                let swarmSize = Math.min(6, 1 + Math.floor(runLvl / 2)); 
                for (let i = 0; i < swarmSize; i++) {
                    let spawnX = 7 - Math.floor(i / 3); let spawnY = 2 + (i % 3);           
                    combatState.enemies.push(createEnemy("wild_ravager", spawnX, spawnY, prefixLabel, baitMultiplier));
                }
                if (p.mapBaited) combatState.enemies.push(createEnemy("alpha_poacher", 2, 5));
            }
        }

        // 2. GENERATE OBSTACLES SECURELY
        let obsIcon = "🪨"; let obsSprite = "map_boulder";
        if (zone === 'WILDERNESS') { obsIcon = "🌲"; obsSprite = "map_tree"; } 
        else if (zone === 'CELLARS') { obsIcon = "🛢️"; obsSprite = "map_broken_cask"; }
        else if (zone === 'ABYSS') { obsIcon = "🔮"; obsSprite = "map_pillar"; }

        let runLvl = data.activeLevel || p.wildernessLevel || 1;
        
        // Static Boss Map
        if (zone === 'WILDERNESS' && runLvl === 20) {
            combatState.player.x = 0; combatState.player.y = 7;
            let boss = combatState.enemies.find(e => e.id === "wilderness_overlord");
            if (boss) { boss.x = 6; boss.y = 0; }
            const bossLayout = [
                [1, 1, 1, 1, 1, 1, 0, 0], [1, 0, 0, 0, 1, 1, 0, 1], [1, 0, 1, 0, 0, 0, 0, 1],
                [1, 0, 1, 1, 1, 1, 1, 1], [1, 0, 0, 0, 0, 0, 1, 1], [1, 1, 1, 1, 1, 0, 1, 1],
                [0, 0, 0, 1, 1, 0, 0, 1], [0, 1, 0, 0, 0, 0, 1, 1]
            ];
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    if (bossLayout[y][x] === 1) combatState.obstacles.push({ x: x, y: y, icon: obsIcon, spriteId: obsSprite });
                }
            }
        } else {
            // Procedural Maps
            let obsCount = (zone === 'ABYSS') ? 25 : 12; 
            for (let i = 0; i < obsCount; i++) {
                let ox = Math.floor(Math.random() * combatState.gridSize); 
                let oy = Math.floor(Math.random() * combatState.gridSize);
                let blocked = (ox === combatState.player.x && oy === combatState.player.y);
                combatState.enemies.forEach(em => {
                    let s = em.size || 1;
                    if (ox >= em.x && ox < em.x + s && oy >= em.y && oy < em.y + s) blocked = true;
                });
                if (!blocked) combatState.obstacles.push({ x: ox, y: oy, icon: obsIcon, spriteId: obsSprite });
            }
        }
		
// Save session to server memory & beam it to the browser
        // === NEW: UNIQUE INSTANCE TRACKING ===
        combatState.enemies.forEach((e, idx) => { e.uid = `mob_${idx}`; });

        activeCombats[socket.id] = combatState;
        socket.emit('combatDeployed', combatState);
    });	
	// --- SERVER-AUTHORITATIVE ENEMY AI ---
    socket.on('endPlayerTurn', (data) => {
        let p = activePlayers[socket.id];
        let combat = activeCombats[socket.id];
        if (!p || !combat) return;

combat.turn = 'ENEMY';
        
        // --- ANTI-TELEPORT SECURITY ---
        if (data && data.playerPos) {
            let reqX = data.playerPos.x;
            let reqY = data.playerPos.y;
            
            // Player can move in Phase 1 AND Phase 3, so multiply their range by 2
            let maxLegalDistance = (p.swiftness || 3) * 2; 
            if (p.activeBuffs && p.activeBuffs.includes('LAGER')) maxLegalDistance += 4;

            let dist = getGridDistance(combat.player.x, combat.player.y, reqX, reqY, 1);
            
            if (dist <= maxLegalDistance) {
                // Move is geometrically legal, accept the coordinates
                combat.player.x = reqX;
                combat.player.y = reqY;
            } else {
                // Hacker detected! Force them back to the server's legal coordinate.
                console.log(`🚨 SECURITY: Rejected anomalous movement for Knight: ${p.username}`);
                socket.emit('moveReceipt', { success: false, x: combat.player.x, y: combat.player.y, message: "🚨 SECURITY: Anomalous movement detected and rejected." });
            }
        }
        let turnEvents = []; // The "Movie Script" we will send to the browser

        // Server-Side BFS Pathfinding
        function getEnemyPathStep(e) {
            let queue = [{x: e.x, y: e.y}];
            let visited = new Set([`${e.x},${e.y}`]);
            let parent = {};
            let eSize = e.size || 1;
            let dirs = [{x:0, y:-1}, {x:1, y:0}, {x:0, y:1}, {x:-1, y:0}];
            let targetNode = null; let closestNode = {x: e.x, y: e.y}; let minDist = Infinity;

            while(queue.length > 0) {
                let curr = queue.shift();
                let dist = getGridDistance(combat.player.x, combat.player.y, curr.x, curr.y, eSize);
                let hasLos = false;
                for (let bx = curr.x; bx < curr.x + eSize; bx++) {
                    for (let by = curr.y; by < curr.y + eSize; by++) {
                        if (hasLineOfSight(bx, by, combat.player.x, combat.player.y, combat.obstacles)) hasLos = true;
                    }
                }
                if (dist < minDist) { minDist = dist; closestNode = curr; }
                if (dist <= e.attackRange && hasLos) { targetNode = curr; break; }

                for (let d of dirs) {
                    let nx = curr.x + d.x; let ny = curr.y + d.y;
                    let key = `${nx},${ny}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        let blocked = false;
                        for (let bx = nx; bx < nx + eSize; bx++) {
                            for (let by = ny; by < ny + eSize; by++) {
                                if (bx < 0 || bx >= combat.gridSize || by < 0 || by >= combat.gridSize) blocked = true;
                                else if (combat.enemies.some(em => em.alive && em !== e && bx >= em.x && bx < em.x + (em.size||1) && by >= em.y && by < em.y + (em.size||1))) blocked = true;
                                else if (combat.obstacles.some(o => o.x === bx && o.y === by)) {
                                    if (eSize === 1) blocked = true; 
                                }
                            }
                        }
                        if (!blocked) { parent[key] = curr; queue.push({x: nx, y: ny}); }
                    }
                }
            }
            if (!targetNode) targetNode = closestNode;
            if (targetNode.x === e.x && targetNode.y === e.y) return null;

            let step = targetNode;
            while (parent[`${step.x},${step.y}`] && (parent[`${step.x},${step.y}`].x !== e.x || parent[`${step.x},${step.y}`].y !== e.y)) { step = parent[`${step.x},${step.y}`]; }
            return step;
        }

        // Loop through living enemies and calculate actions!
        let activeEnemies = combat.enemies.filter(e => e.alive);
        for (let e of activeEnemies) {
            if (!e.alive || p.hp <= 0) break;
            
            let eSize = e.size || 1;
            let dist = getGridDistance(combat.player.x, combat.player.y, e.x, e.y, eSize);
            let hasLos = false;
            for (let bx = e.x; bx < e.x + eSize; bx++) {
                for (let by = e.y; by < e.y + eSize; by++) {
                    if (hasLineOfSight(bx, by, combat.player.x, combat.player.y, combat.obstacles)) hasLos = true;
                }
            }

            // Phase 1: Movement
            if (dist > e.attackRange || !hasLos) {
                let steps = e.moveRange;
                while (steps > 0) {
                    dist = getGridDistance(combat.player.x, combat.player.y, e.x, e.y, eSize);
                    hasLos = false;
                    for (let bx = e.x; bx < e.x + eSize; bx++) {
                        for (let by = e.y; by < e.y + eSize; by++) { if (hasLineOfSight(bx, by, combat.player.x, combat.player.y, combat.obstacles)) hasLos = true; }
                    }
                    if (dist <= e.attackRange && hasLos) break;

                    let nextStep = getEnemyPathStep(e);
                    if (nextStep) {
e.x = nextStep.x; e.y = nextStep.y;
        turnEvents.push({ type: 'move', uid: e.uid, enemyId: e.id, name: e.name, finalX: e.x, finalY: e.y });
                        
                        if (eSize > 1) { // Juggernaut Boss crushing logic
                            let oLen = combat.obstacles.length;
                            combat.obstacles = combat.obstacles.filter(o => !(o.x >= e.x && o.x < e.x + eSize && o.y >= e.y && o.y < e.y + eSize));
                            if (combat.obstacles.length < oLen) turnEvents.push({ type: 'crush', enemyName: e.name });
                        }
                    } else break;
                    steps--;
                }
            }

            // Phase 2: Attack Processing
            dist = getGridDistance(combat.player.x, combat.player.y, e.x, e.y, eSize);
            hasLos = false;
            for (let bx = e.x; bx < e.x + eSize; bx++) {
                for (let by = e.y; by < e.y + eSize; by++) { if (hasLineOfSight(bx, by, combat.player.x, combat.player.y, combat.obstacles)) hasLos = true; }
            }

            if (dist <= e.attackRange && hasLos) {
                let isPoacher = e.attackRange > 1;
                let effectiveDeflect = isPoacher ? 0 : (p.resilience || 5);

                if (!isPoacher && Math.random() * 100 <= effectiveDeflect) {
                    turnEvents.push({ type: 'deflect', enemyName: e.name });
                } else {
                    let minDmg = Math.floor(e.attack * 0.85); let maxDmg = Math.ceil(e.attack * 1.10);
                    let variedDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
                    let isCrit = variedDmg >= Math.floor(e.attack * 1.06);

p.hp -= variedDmg;
        turnEvents.push({ type: 'hit', uid: e.uid, enemyName: e.name, damage: variedDmg, isCrit: isCrit, isPoacher: isPoacher, ex: e.x, ey: e.y });

                    if (e.name.includes("Mimic")) {
                        let bIdx = p.inventory.findIndex(i => i.type === 'brew');
                        if (bIdx !== -1) { p.inventory.splice(bIdx, 1); turnEvents.push({ type: 'steal', enemyName: e.name }); }
                    }

                    if (p.hp <= 0) {
                        p.gold = Math.max(0, p.gold - 100); p.hp = Math.floor((p.vitality || 70) * 0.5);
                        turnEvents.push({ type: 'death' });
                        break; // Stop turn early if player dies
                    }
                }
            }
        }

        combat.turn = 'PLAYER';
        socket.emit('enemyTurnReceipt', { events: turnEvents, updatedPlayer: p, updatedCombatState: combat });
    });
	
	
	

    // --- SERVER-AUTHORITATIVE COMBAT ENGINE ---
    socket.on('combatAction', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

        if (data.actionType === 'end') {
            let recover = Math.floor((p.maxStamina || 50) * 0.15); 
            p.stamina = Math.min(p.maxStamina || 50, (p.stamina || 0) + recover);
            
            return socket.emit('combatResult', { type: 'pass', newStamina: p.stamina, recovered: recover });
        }

        if (data.actionType === 'slash' || data.actionType === 'special') {
            let staminaCost = data.actionType === 'special' ? 15 : 5;
            if (p.stamina < staminaCost) return; 
            
            p.stamina -= staminaCost; 
            
            let enemyResilience = data.targetEnemy ? (data.targetEnemy.resilience || 0) : 0;
            let equipmentBonus = 0;
            for (let slot in p.equipment) {
                let item = p.equipment[slot];
                if (item && item.atkBonus) equipmentBonus += item.atkBonus;
            }
            let baseDmg = (p.power || 12) + equipmentBonus;
            if (p.activeBuffs && p.activeBuffs.includes('IPA')) baseDmg = Math.floor(baseDmg * 1.10);

            let hitChance = (data.actionType === 'special' && p.equipment.weapon?.rarity === "Gorilla") ? 100 : Math.max(5, ((p.accuracy || 85) - enemyResilience));

            if (Math.random() * 100 > hitChance) {
                socket.emit('combatResult', { type: 'miss', hitChance: hitChance, newStamina: p.stamina });
            } else {
                let minDmg = Math.floor(baseDmg * 0.85);
                let maxDmg = Math.ceil(baseDmg * 1.10);
                let variedDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
                
let isCrit = variedDmg >= Math.floor(baseDmg * 1.06);
                let finalDmg = data.actionType === 'special' ? Math.floor(variedDmg * (p.equipment.weapon?.rarity === "Gorilla" ? 4.0 : 1.5)) : variedDmg;

                // === NEW: DEDUCT HP ON THE SERVER ===
                let combat = activeCombats[socket.id];
                if (combat && data.targetEnemy) {
                    // Find the exact enemy in the server's memory using the coordinates
                    let serverEnemy = combat.enemies.find(e => e.x === data.targetEnemy.x && e.y === data.targetEnemy.y && e.alive);
                    
                    if (serverEnemy) {
                        serverEnemy.hp -= finalDmg;
                        if (serverEnemy.hp <= 0) {
                            serverEnemy.hp = 0;
                            serverEnemy.alive = false; // The AI loop will now ignore them!
                        }
                    }
                }

                socket.emit('combatResult', { type: 'hit', actionType: data.actionType, damage: finalDmg, isCrit: isCrit, newStamina: p.stamina });
            }
        }
    });

    // --- SERVER-AUTHORITATIVE BOMB ENGINE ---
    socket.on('bombAction', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

        let invIndex = data.invIndex;
        let bomb = p.inventory[invIndex];

        // Validate that the item exists and is actually a bomb
        if (!bomb || bomb.type !== 'bomb') return;

// Securely remove the bomb from the Server's master inventory
        p.inventory.splice(invIndex, 1);

        // === NEW: DEDUCT AOE BOMB DAMAGE ON THE SERVER ===
        let combat = activeCombats[socket.id];
        if (combat) {
            combat.enemies.forEach(e => {
                if (!e.alive) return;
                // Calculate distance from explosion epicenter (data.tx, data.ty)
                let dist = getGridDistance(data.tx, data.ty, e.x, e.y, e.size || 1);
                if (dist <= bomb.aoe) {
                    e.hp -= bomb.damage;
                    if (e.hp <= 0) {
                        e.hp = 0;
                        e.alive = false;
                    }
                }
            });
        }

// Beam the verified bomb stats back to the browser to trigger the explosion!
        socket.emit('bombResult', {
            bombId: bomb.id,
            bombName: bomb.name,
            damage: bomb.damage,
            aoe: bomb.aoe,
            tx: data.tx,
            ty: data.ty,
            updatedPlayer: p // <--- Force sync the inventory securely!
        });
    });
	
	// --- SERVER-AUTHORITATIVE COMBAT INVENTORY ---
    socket.on('combatItemAction', (data) => {
        let p = activePlayers[socket.id];
        let combat = activeCombats[socket.id];
        if (!p || !combat) return;

        let invIndex = data.index;
        let item = p.inventory[invIndex];
        if (!item) return;

        if (data.action === 'brew' && item.type === 'brew') {
            p.activeBuffs = p.activeBuffs || [];
            
            if (item.id === 'ipa' && !p.activeBuffs.includes('IPA')) {
                p.activeBuffs.push('IPA');
                p.inventory.splice(invIndex, 1);
                socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: "🍺 Drank a Furious IPA! Damage multipliers amplified." });
            } 
            else if (item.id === 'lager' && !p.activeBuffs.includes('LAGER')) {
                p.activeBuffs.push('LAGER');
                p.inventory.splice(invIndex, 1);
                socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: "🍺 Drank a Swift Lager! Stride movement capabilities expanded." });
            }
            else if (item.id === 'stout' || item.id === 'reserve') {
                let healPct = item.id === 'reserve' ? 0.25 : 0.10;
                let heal = Math.floor(p.vitality * healPct);
                p.hp = Math.min(p.vitality, p.hp + heal);
                p.inventory.splice(invIndex, 1);
                socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: `🍺 Chugged ${item.name}. Restored ${heal} HP.` });
            } else {
                socket.emit('combatItemReceipt', { success: false, message: "❌ Buff already active." });
            }
        }
        else if (data.action === 'equip') {
            let slotKey = item.slot || "weapon";
            let worn = p.equipment[slotKey];
            
            p.equipment[slotKey] = item;
            if (worn) p.inventory[invIndex] = worn; 
            else p.inventory.splice(invIndex, 1);
            
            socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: "⚙️ Swapped gear mid-combat." });
        }
    });
	

    // --- SERVER-AUTHORITATIVE ECONOMY (THE BANK) ---
    socket.on('townAction', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

        // 1. GILDED TAVERN
        if (data.action === 'purchaseGildedTavern') {
            if (p.gold >= 10000 && !p.gildedTavernUnlocked) {
                p.gold -= 10000; p.gildedTavernUnlocked = true;
                socket.emit('townReceipt', { success: true, action: 'gildedTavern', updatedPlayer: p, message: "👑 ACHIEVEMENT UNLOCKED: Gilded Tavern Metamorphosis!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient funds. Requires 10,000 Gold Pieces." });
        }
        // 2. TRADE ROUTES
        else if (data.action === 'buyTradeRoutes') {
            if (p.gold >= 25000 && !p.tradeRoutesExpanded) {
                p.gold -= 25000; p.tradeRoutesExpanded = true;
                socket.emit('townReceipt', { success: true, action: 'tradeRoutes', updatedPlayer: p, message: "🗺️ ACHIEVEMENT UNLOCKED: Trade Routes Expanded!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient funds. The crown demands 25,000 Gold Pieces." });
        }
        // 3. THE GOLDEN MONUMENT
        else if (data.action === 'purchaseMonument') {
            if (p.gold >= 1000000 && !p.monumentBuilt) {
                p.gold -= 1000000; p.monumentBuilt = true;
                socket.emit('townReceipt', { success: true, action: 'monument', updatedPlayer: p, message: "🏆 ACHIEVEMENT UNLOCKED: The Golden Monument!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient funds. A million gold pieces are required." });
        }
        // 4. PET TRAINING
        else if (data.action === 'trainPet') {
            p.pet = p.pet || { adopted: false, level: 1 };
            p.pet.level = p.pet.level || 1;
            let costH = p.pet.level * 250; let costF = p.pet.level * 50; let costG = p.pet.level * 500;

            if (p.hops >= costH && p.fish >= costF && p.gold >= costG) {
                p.hops -= costH; p.fish -= costF; p.gold -= costG; p.pet.level++;
                socket.emit('townReceipt', { success: true, action: 'trainPet', updatedPlayer: p, message: `🦴 Fed pet! Scavenging increased to Level ${p.pet.level}!` });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient materials to train your companion." });
        }
        // 5. EXPORT FISH WHOLESALE
        else if (data.action === 'exportFish') {
            if (p.fish >= 100) {
                p.fish -= 100; p.gold += 150;
                socket.emit('townReceipt', { success: true, action: 'exportFish', updatedPlayer: p, message: "🐟 Wholesale Export Complete: Traded 100 fish for 150g!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Wholesalers require a clean batch of 100 Fish." });
        }
        // 6. HIRE WORKER
        else if (data.action === 'hireWorker') {
            if (p.gold >= 75) {
                p.gold -= 75;
                p.workers = p.workers || { woodcutters: 0, fishermen: 0, farmers: 0 };
                if (data.type === 'woodcutter') p.workers.woodcutters++;
                else if (data.type === 'fisherman') p.workers.fishermen++;
                else if (data.type === 'farmer') p.workers.farmers++;
                socket.emit('townReceipt', { success: true, action: 'hireWorker', updatedPlayer: p, message: `👷 Hired a new ${data.type}!` });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient gold reserves to recruit workers." });
        }
        // 7. CLAIM SUPPLY CART
        else if (data.action === 'claimCart') {
            let w = p.supplyCart.wood || 0; let f = p.supplyCart.fish || 0; let h = p.supplyCart.hops || 0;
            if (w === 0 && f === 0 && h === 0) return socket.emit('townReceipt', { success: false, message: "❌ Supply cart is empty." });
            p.wood += w; p.fish += f; p.hops += h;
            p.supplyCart.wood = 0; p.supplyCart.fish = 0; p.supplyCart.hops = 0;
            socket.emit('townReceipt', { success: true, action: 'claimCart', updatedPlayer: p, message: `🧺 Claimed Production Supplies: +${w} Timber, +${f} Fish, +${h} Hops!` });
        }
        // 8. HOST HAPPY HOUR
        else if (data.action === 'happyHour') {
            if (p.hops >= 40 && p.gold >= 100) {
                p.hops -= 40; p.gold -= 100; p.happyHourTicks = 60;
                socket.emit('townReceipt', { success: true, action: 'happyHour', updatedPlayer: p, message: "🎉 HAPPY HOUR ACTIVE! Town production doubled for 3 minutes!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Lacking materials to launch a workforce festival." });
        }
        // 9. BAIT / CHUM MAPS
        else if (data.action === 'baitWilds') {
            if (p.fish >= 15 && !p.mapBaited) {
                p.fish -= 15; p.mapBaited = true;
                socket.emit('townReceipt', { success: true, action: 'baitWilds', updatedPlayer: p, message: "🎣 You scatter 15 Fish down the trails. Monster signals are spiking!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient fish or map already baited." });
        }
        else if (data.action === 'chumCellars') {
            if (p.fish >= 100 && p.cellarsUnlocked && !p.cellarsChummed) {
                p.fish -= 100; p.cellarsChummed = true;
                socket.emit('townReceipt', { success: true, action: 'chumCellars', updatedPlayer: p, message: "🛢️ Chummed the sewer lines! 5 massive mimics are tracking the scent." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient fish or cellars not unlocked/already chummed." });
        }
        // 10. UPGRADE VAULT
        else if (data.action === 'upgradeVault') {
            let goldCost = p.vaultSlots * 5; let woodCost = p.vaultSlots * 2;
            if (p.gold >= goldCost && p.wood >= woodCost) {
                p.gold -= goldCost; p.wood -= woodCost; p.vaultSlots += 5;
                socket.emit('townReceipt', { success: true, action: 'upgradeVault', updatedPlayer: p, message: `🏦 Vault capacity expanded to ${p.vaultSlots} slots!` });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient gold or wood to upgrade vault." });
        }
        // 11. RESET STATS
        else if (data.action === 'resetStats') {
            let totalExpectedSP = ((p.level || 1) - 1) * 3;
            if (p.skillPoints >= totalExpectedSP) return socket.emit('townReceipt', { success: false, message: "❌ Your Knight's memory is already a blank slate." });
            if (p.gold >= 1000) {
                p.gold -= 1000;
                p.vitality = 70; p.hp = Math.min(p.hp, 70);
                p.maxStamina = 50; p.stamina = Math.min(p.stamina, 50);
                p.power = 12; p.accuracy = 85; p.resilience = 5; p.swiftness = 3;
                p.skillPoints = totalExpectedSP;
                socket.emit('townReceipt', { success: true, action: 'resetStats', updatedPlayer: p, message: "🔄 Knight stats reset! Reallocate your Skill Points." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient gold for a stat reset." });
        }
		// 12. ALLOCATE STAT
        else if (data.action === 'allocateStat') {
            if (p.skillPoints > 0) {
                p.skillPoints--;
                switch(data.statKey) {
                    case 'vitality': p.vitality += 10; p.hp += 10; break;
                    case 'maxStamina': p.maxStamina += 5; p.stamina += 5; break;
                    case 'power': p.power += 2; break;
                    case 'accuracy': p.accuracy += 2; break;
                    case 'resilience': p.resilience += 1; break;
                    case 'swiftness': p.swiftness += 1; break; 
                }
                socket.emit('townReceipt', { success: true, action: 'allocateStat', updatedPlayer: p, message: "🌟 Stat point allocated!" });
            } else socket.emit('townReceipt', { success: false, message: "❌ No Skill Points available." });
        }
        // 13. CRAFT BOMB
        else if (data.action === 'craftBomb') {
            let tier = data.tier;
            let costW = tier === 1 ? 10 : 25;   // Fixed to match UI
            let costH = tier === 1 ? 100 : 250; // Fixed to match UI
            
            if (p.wood >= costW && p.hops >= costH) {
                p.maxInventorySlots = p.maxInventorySlots || 5;
                if (p.inventory.length < p.maxInventorySlots) {
                    p.wood -= costW; p.hops -= costH;
                    let bomb = tier === 1 
                        ? { id: "bomb_small", name: "Small Keg Bomb", slot: "consumable", type: "bomb", rarity: "Rare", damage: 45, aoe: 1, icon: "💣", value: 10 }
                        : { id: "bomb_heavy", name: "Heavy Keg Bomb", slot: "consumable", type: "bomb", rarity: "Epic", damage: 120, aoe: 1, icon: "💣", value: 30 };
                    p.inventory.push(bomb);
                    socket.emit('townReceipt', { success: true, action: 'craftBomb', updatedPlayer: p, message: `💣 Crafted ${bomb.name}!` });
                } else socket.emit('townReceipt', { success: false, message: "🎒 Backpack is full." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient materials for bomb." });
        }
        // 14. CRAFT BREWS 
        else if (data.action === 'craftBrew') {
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length >= p.maxInventorySlots) return socket.emit('townReceipt', { success: false, message: "🎒 Backpack is full." });
            
            if (data.brewType === 'STOUT') {
                if (p.hops >= 1 && p.gold >= 10) { p.hops -= 1; p.gold -= 10; p.inventory.push({ id: "stout", name: "Combat Stout", slot: "consumable", type: "brew", rarity: "Common", value: 5 }); socket.emit('townReceipt', { success: true, action: 'craftBrew', updatedPlayer: p, message: "🍺 Crafted a Combat Stout!" }); }
                else socket.emit('townReceipt', { success: false, message: "❌ Lacking resources for Stout." });
            }
            else if (data.brewType === 'IPA') {
                if (p.hops >= 1 && p.wood >= 5) { p.hops -= 1; p.wood -= 5; p.inventory.push({ id: "ipa", name: "Furious IPA", slot: "consumable", type: "brew", rarity: "Rare", value: 15 }); socket.emit('townReceipt', { success: true, action: 'craftBrew', updatedPlayer: p, message: "🍺 Crafted a Furious IPA!" }); }
                else socket.emit('townReceipt', { success: false, message: "❌ Lacking resources for IPA." });
            }
            else if (data.brewType === 'LAGER') {
                if (p.hops >= 2 && p.fish >= 5) { p.hops -= 2; p.fish -= 5; p.inventory.push({ id: "lager", name: "Swift Lager", slot: "consumable", type: "brew", rarity: "Rare", value: 15 }); socket.emit('townReceipt', { success: true, action: 'craftBrew', updatedPlayer: p, message: "🍺 Crafted a Swift Lager!" }); }
                else socket.emit('townReceipt', { success: false, message: "❌ Lacking resources for Lager." });
            }
            else if (data.brewType === 'RESERVE') {
                if (p.hops >= 200 && p.gold >= 50) { p.hops -= 200; p.gold -= 50; p.inventory.push({ id: "reserve", name: "Grandmaster Reserve", slot: "consumable", type: "brew", rarity: "Epic", value: 45 }); socket.emit('townReceipt', { success: true, action: 'craftBrew', updatedPlayer: p, message: "🍷 Crafted Grandmaster Reserve!" }); }
                else socket.emit('townReceipt', { success: false, message: "❌ Lacking resources for Reserve." });
            }
        }
        // 15. DRINK BREW IN TOWN
        else if (data.action === 'drinkBrew') {
            let item = p.inventory[data.idx];
            if (!item || item.type !== 'brew') return;
            if (item.id === 'stout') {
                if (p.hp >= p.vitality) return socket.emit('townReceipt', { success: false, message: "❌ Vitality already at max." });
                p.hp = Math.min(p.vitality, p.hp + Math.floor(p.vitality * 0.1));
                p.inventory.splice(data.idx, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "🍺 Chugged a Stout! Restored 10% HP." });
            }
            else if (item.id === 'ipa') {
                p.activeCombatBuff = 'IPA'; p.inventory.splice(data.idx, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "🍺 Drank Furious IPA! Damage boosted for next run." });
            }
            else if (item.id === 'lager') {
                p.activeCombatBuff = 'LAGER'; p.inventory.splice(data.idx, 1);
                socket.emit('townReceipt', { success: true, action: 'drinkBrew', updatedPlayer: p, message: "🍺 Drank Swift Lager! Movement boosted for next run." });
            }
        }
        // 16. UPGRADES (BACKPACK & CART)
        else if (data.action === 'upgradeBackpack') {
            let upg = p.backpackUpgrades || 0;
            let gCost = 100 + (upg * 50); let wCost = 50 + (upg * 25);
            if (p.gold >= gCost && p.wood >= wCost) {
                p.gold -= gCost; p.wood -= wCost;
                p.maxInventorySlots = (p.maxInventorySlots || 5) + 1; p.backpackUpgrades = upg + 1;
                socket.emit('townReceipt', { success: true, action: 'upgradeBackpack', updatedPlayer: p, message: `🎒 Backpack capacity expanded to ${p.maxInventorySlots}!` });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient gold or wood." });
        }
        else if (data.action === 'upgradeCart') {
            let level = p.supplyCart.level || 1;
            let gCost = level * 150; let wCost = level * 75;
            if (p.gold >= gCost && p.wood >= wCost) {
                p.gold -= gCost; p.wood -= wCost;
                p.supplyCart.max += 50; p.supplyCart.level = level + 1;
                socket.emit('townReceipt', { success: true, action: 'upgradeCart', updatedPlayer: p, message: `📦 Cart upgraded to Level ${p.supplyCart.level}!` });
            } else socket.emit('townReceipt', { success: false, message: "❌ Insufficient funds for Cart upgrade." });
        }
// 17. BLACK MARKET (SERVER-SIDE LOOT ROLL)
        else if (data.action === 'blackMarket') {
            if (p.hops >= 50) {
                p.maxInventorySlots = p.maxInventorySlots || 5;
                if (p.inventory.length < p.maxInventorySlots) {
                    
                    // Fetch your balanced black market table configuration
                    let table = LootTables["black_market"];
                    if (!table) return socket.emit('townReceipt', { success: false, message: "❌ Loot table missing configuration data." });

                    p.hops -= 50;

                    // Execute weighted random matrix extraction calculations
                    let totalWeight = table.pools.reduce((sum, entry) => sum + entry.weight, 0);
                    let roll = Math.random() * totalWeight;
                    let chosenItemId = null;

                    for (let entry of table.pools) {
                        if (roll < entry.weight) {
                            chosenItemId = entry.itemId;
                            break;
                        }
                        roll -= entry.weight;
                    }

                    // Fallback to standard baseline mace if template extraction parameters decay
                    let droppedItemTemplate = ItemDatabase[chosenItemId] || ItemDatabase["rusty_mace"];
                    
                    // Deep clone the master asset dictionary entry to prevent pointer mutation leaks
                    let randomItem = JSON.parse(JSON.stringify(droppedItemTemplate));
                    
                    p.inventory.push(randomItem);
                    socket.emit('townReceipt', { 
                        success: true, 
                        action: 'blackMarket', 
                        updatedPlayer: p, 
                        message: `🪙 Black Market Trader gave you: ${randomItem.name} [${randomItem.rarity}]` 
                    });
                } else socket.emit('townReceipt', { success: false, message: "🎒 Backpack is full." });
            } else socket.emit('townReceipt', { success: false, message: "❌ Trader demands 50 Hops." });
        }
		// 18. SELL FISH BULK
        else if (data.action === 'sellFishBulk') {
            if (!p.tradeRoutesExpanded) {
                return socket.emit('townReceipt', { success: false, message: "❌ Trade routes are not expanded." });
            }
            if (p.fish >= 1000) {
                p.fish -= 1000;
                p.gold += 1500;
                socket.emit('townReceipt', { 
                    success: true, 
                    action: 'sellFishBulk', 
                    updatedPlayer: p, 
                    message: "🚢 Exported 1,000 Fish to distant lands for 1,500 Gold." 
                });
            } else {
                socket.emit('townReceipt', { success: false, message: "❌ Not enough stock. The merchant ships require exactly 1,000 Fish." });
            }
        }
    });

    // --- SERVER-AUTHORITATIVE INVENTORY & VAULT ---
    socket.on('inventoryAction', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

        // 1. EQUIP ITEM
        if (data.action === 'equip') {
            let idx = data.index;
            let toEquip = p.inventory[idx];
            if (!toEquip) return;
            
            let slotKey = toEquip.slot || "weapon";
            let worn = p.equipment[slotKey];
            
            p.equipment[slotKey] = toEquip; // Put the new item on
            
            if (worn) p.inventory[idx] = worn; // Swap the old item back into the bag
            else p.inventory.splice(idx, 1);   // Or just remove the new item from the bag
            
            socket.emit('inventoryReceipt', { success: true, action: 'equip', updatedPlayer: p, message: "⚙️ Gear equipped." });
        }
        // 2. UNEQUIP ITEM
        else if (data.action === 'unequip') {
            let slotKey = data.slotKey;
            let worn = p.equipment[slotKey];
            if (!worn) return;
            
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length < p.maxInventorySlots) {
                p.inventory.push(worn);
                delete p.equipment[slotKey];
                socket.emit('inventoryReceipt', { success: true, action: 'unequip', updatedPlayer: p, message: "⚙️ Gear unequipped." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "🎒 Backpack is full. Make space first." });
            }
        }
        // 3. SELL ITEM
        else if (data.action === 'sell') {
            let idx = data.index;
            let item = p.inventory[idx];
            if (!item) return;
            
            let val = item.value || (item.rarity === "Gorilla" ? 500 : 15);
            p.gold += val;
            p.inventory.splice(idx, 1);
            
            socket.emit('inventoryReceipt', { success: true, action: 'sell', updatedPlayer: p, message: `💰 Sold item for ${val}g.` });
        }
        // 4. DEPOSIT TO VAULT
        else if (data.action === 'deposit') {
            let idx = data.index;
            if (!p.inventory[idx]) return;
            
            if (p.stash.length < (p.vaultSlots || 10)) {
                p.stash.push(p.inventory.splice(idx, 1)[0]);
                socket.emit('inventoryReceipt', { success: true, action: 'deposit', updatedPlayer: p, message: "🏦 Item deposited into Vault." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "🏦 Vault is full." });
            }
        }
        // 5. WITHDRAW FROM VAULT
        else if (data.action === 'withdraw') {
            let idx = data.index;
            if (!p.stash[idx]) return;
            
            p.maxInventorySlots = p.maxInventorySlots || 5;
            if (p.inventory.length < p.maxInventorySlots) {
                p.inventory.push(p.stash.splice(idx, 1)[0]);
                socket.emit('inventoryReceipt', { success: true, action: 'withdraw', updatedPlayer: p, message: "🎒 Item withdrawn to Backpack." });
            } else {
                socket.emit('inventoryReceipt', { success: false, message: "🎒 Backpack is full." });
            }
        }
        // 6. DRAG & DROP REORDERING
        else if (data.action === 'reorderBackpack') {
            const [movedItem] = p.inventory.splice(data.fromIndex, 1);
            p.inventory.splice(data.toIndex, 0, movedItem);
            socket.emit('inventoryReceipt', { success: true, action: 'reorder', updatedPlayer: p });
        }
        else if (data.action === 'reorderVault') {
            const [movedItem] = p.stash.splice(data.fromIndex, 1);
            p.stash.splice(data.toIndex, 0, movedItem);
            socket.emit('inventoryReceipt', { success: true, action: 'reorder', updatedPlayer: p });
        }
    });
// --- SERVER-AUTHORITATIVE COMBAT ESCROW ---
    
    // 1. Process Individual Kills
    socket.on('processEnemyKill', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

        let multiplier = p.monumentBuilt ? 2 : 1;
        let isGorilla = (data.zone === 'GORILLA_ARENA'); 
        let isBaited = (data.zone === 'WILDERNESS' && data.isBaited);

        let goldReward = 0;
        let xpReward = 0;

        if (data.enemyId !== "pet_scavenge") {
            // Server securely calculates Base Gold and XP
            goldReward = ((isGorilla ? 500 : (isBaited ? 60 : 25)) * multiplier);
            let table = LootTables[data.enemyId];
            if (table) xpReward = (table.xpDrop || 0) * multiplier;
        }

        // Add to secure Server Escrow
        p.pendingGold = (p.pendingGold || 0) + goldReward;
        p.pendingXp = (p.pendingXp || 0) + xpReward;

        // Roll Loot
        let droppedItemObj = null;
        let table = LootTables[data.enemyId];
        if (table && Math.random() <= table.dropChance) {
            let totalWeight = table.pools.reduce((sum, entry) => sum + entry.weight, 0);
            let roll = Math.random() * totalWeight;
            let droppedItemId = null;
            for (let entry of table.pools) {
                if (roll < entry.weight) { droppedItemId = entry.itemId; break; }
                roll -= entry.weight;
            }
            if (droppedItemId && ItemDatabase[droppedItemId]) {
                droppedItemObj = JSON.parse(JSON.stringify(ItemDatabase[droppedItemId]));
            }
        }

        socket.emit('killConfirmed', { gold: goldReward, xp: xpReward, item: droppedItemObj, isPet: data.enemyId === "pet_scavenge", enemyName: data.enemyName });
    });

    // 2. Process Map Clear Bonuses
    socket.on('processCombatVictory', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

        let goldReward = 0;
        if (data.zone === 'GORILLA_ARENA') goldReward += 5000;
        else if (data.zone === 'ABYSS') {
            p.abyssDepth = (p.abyssDepth || 1) + 1;
            goldReward += (50 + (10 * p.abyssDepth));
        } else if (data.zone === 'WILDERNESS') {
            if (p.wildernessLevel === 20 && !p.cellarsUnlocked) p.cellarsUnlocked = true;
            else if (data.activeLevel === p.wildernessLevel) p.wildernessLevel = Math.min(20, p.wildernessLevel + 1);
        } else if (data.zone === 'CELLARS') {
            if (p.cellarLevel === 20 && !p.abyssUnlocked) p.abyssUnlocked = true;
            else if (data.activeLevel === p.cellarLevel) p.cellarLevel = Math.min(20, p.cellarLevel + 1);
        }
        
        if (goldReward > 0) p.pendingGold = (p.pendingGold || 0) + goldReward;
    });

// 3. Payout the Escrow!
    socket.on('claimCombatRewards', () => {
        let p = activePlayers[socket.id];
        if (!p) return;

        // === NEW: SAFE INITIALIZATION ===
        // This prevents "NaN" corruption and auto-heals broken save files!
        p.gold = p.gold || 0;
        p.xp = p.xp || 0;
        p.level = p.level || 1;
        p.xpToNext = p.xpToNext || 100;

        if (p.pendingGold > 0) { p.gold += p.pendingGold; }
        if (p.pendingXp > 0) {
            p.xp += p.pendingXp;
            
            while (p.xp >= p.xpToNext) {
                p.xp -= p.xpToNext;
                p.level += 1;
                p.skillPoints = (p.skillPoints || 0) + 3;
                
                // Server securely calculates the next level threshold
                let base = 100; let multiplier = Math.pow(1.15, p.level - 1); let flatBump = p.level * 50;
                p.xpToNext = Math.floor((base * multiplier) + flatBump);
                
                p.hp = p.vitality; p.stamina = p.maxStamina;
            }
        }

        // Zero out the escrow so it can't be claimed twice!
        p.pendingGold = 0; p.pendingXp = 0;

        socket.emit('combatRewardsReceipt', { updatedPlayer: p });
    });
	
    socket.on('disconnect', () => {
        console.log(`💨  Knight disconnected: ${socket.id}`);
        delete activePlayers[socket.id];
    });

}); // <--- THE PROTECTIVE BUBBLE CLOSES HERE!

// === THE SERVER TICK (Runs every 3 seconds) ===
setInterval(() => {
    for (let socketId in activePlayers) {
        let p = activePlayers[socketId];
        if (!p) continue;

        // 1. Process Personal Idle Job
        if (p.idleJob === 'TAVERN') p.hp = Math.min(p.vitality || 70, (p.hp || 0) + 5);
        else if (p.idleJob === 'FOREST') p.wood = (p.wood || 0) + 1;
        else if (p.idleJob === 'LAKE') p.fish = (p.fish || 0) + 1;
        else if (p.idleJob === 'HOPS') p.hops = (p.hops || 0) + 1;

        // 2. Process Workers & Supply Cart
        let productionCycles = (p.happyHourTicks > 0) ? 2 : 1;
        if (p.happyHourTicks > 0) p.happyHourTicks--;

        for (let cycle = 0; cycle < productionCycles; cycle++) {
            if (p.workers && p.supplyCart) {
                for (let i = 0; i < (p.workers.woodcutters || 0); i++) {
                    if (p.supplyCart.wood + p.supplyCart.fish + (p.supplyCart.hops || 0) < p.supplyCart.max) p.supplyCart.wood++;
                }
                for (let i = 0; i < (p.workers.fishermen || 0); i++) {
                    if (p.supplyCart.wood + p.supplyCart.fish + (p.supplyCart.hops || 0) < p.supplyCart.max) p.supplyCart.fish++;
                }
                for (let i = 0; i < (p.workers.farmers || 0); i++) {
                    if (p.supplyCart.wood + p.supplyCart.fish + (p.supplyCart.hops || 0) < p.supplyCart.max) p.supplyCart.hops++;
                }
            }
        }

// Inside server.js
io.to(socketId).emit('serverTick', {
    hp: p.hp, 
    wood: p.wood, 
    fish: p.fish, 
    hops: p.hops,
    supplyCart: p.supplyCart, 
    happyHourTicks: p.happyHourTicks,
    upgrades: p.upgrades // <--- ADD THIS LINE
});
    }
}, 3000);

// === SERVER BOOT ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🍻 Pub Knights Server running on http://localhost:${PORT}`);
});