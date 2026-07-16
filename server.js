require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// Import our new modular routers
const injectTownRouter = require('./townRouter.js');
const injectCombatRouter = require('./combatRouter.js');
const injectSocialRouter = require('./socialRouter.js');
const injectQuestRouter = require('./questRouter.js');
const { CombatMapTemplates, obstacleStyleForZone } = require('./combatMapTemplates.js');
const { ItemDatabase } = require('./public/js/items.js');
const {
    MAX_PLAYER_LEVEL,
    normalizeLevel,
    sanitizeLifetimeXp,
    getXpRequirementForLevel,
    getTotalXpForLevel,
    getTotalXpForNextLevel
} = require('./xpMath.js');
const { applyLifetimeXpLevelUps } = require('./playerProgression.js');
const {
    DEFAULT_APPEARANCE,
    normalizeUsername,
    validatePassword,
    hashPassword,
    verifyPassword,
    needsPasswordUpgrade,
    sanitizeAppearance,
    sanitizePetCosmetics,
    sanitizeToken
} = require('./serverSecurity.js');


// Initialize the Express app and wrap it in an HTTP server for Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Global in-memory state
const activePlayers = {};
const activeCombats = {};
const activeUserSockets = {};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// === REPLACED: PRODUCTION MONGODB CONNECTION ===
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/pubknights';

mongoose.connect(dbURI, {
    autoIndex: process.env.NODE_ENV !== 'production', // <--- THE OPTIMIZATION
})
    .then(() => console.log('🛡️  MongoDB Secured, Indexed & Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
// ===============================================

const playerSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    saveData: { type: Object, default: {} },
    
// === NEW: SOCIAL INFRASTRUCTURE ===
    friends: { type: [String], default: [] },
    ignored: { type: [String], default: [] },
    // ==================================
	
}, { timestamps: true });

// === NEW: CASE-INSENSITIVE COLLATION INDEX ===
// Strength 2 tells MongoDB to ignore capitalization when searching this index!
playerSchema.index(
    { username: 1 }, 
    { collation: { locale: 'en', strength: 2 } }
);

const Player = mongoose.model('Player', playerSchema);

// === USER GENERATED CONTENT (UGC) SCHEMA ===
const ugcSchema = new mongoose.Schema({
    authorUsername: { type: String, required: true },
    type: { type: String, enum: ['ART', 'MUSIC'], required: true },
    title: { type: String, default: 'Untitled Masterpiece' },
    // data payload: For ART, this will be your 24x24 matrix. For MUSIC, the 32-step track sequence.
    contentData: { type: mongoose.Schema.Types.Mixed, required: true },
    likes: { type: Number, default: 0 }, // Future-proofing for social sharing
}, { timestamps: true });

// === NEW: COMPOUND GALLERY INDEX ===
// This perfectly matches your .find().sort() query, making gallery loads instant.
ugcSchema.index({ authorUsername: 1, createdAt: -1 });

// Future-proofing: In case you ever want a "Global Recent Art" feed
ugcSchema.index({ type: 1, createdAt: -1 });
// ===================================

const UGC = mongoose.model('UGC', ugcSchema);

const RETIRED_ITEM_IDS = new Set(['bomb_small', 'bomb_heavy', 'scroll_fireball', 'scroll_poison_shot']);

// === THE AUTOMATED ITEM LONGEVITY SANITIZER (STRICT HYDRATION) ===
function sanitizeItemSchema(savedItem) {
    if (!savedItem || !savedItem.id) return savedItem;
    if (RETIRED_ITEM_IDS.has(savedItem.id)) return null;
    
    // 1. Grab the fresh, 100% up-to-date template from items.js
    let masterTemplate = ItemDatabase[savedItem.id];
    
    // Failsafe: If you deleted the item from the game entirely, keep the old ghost item
    if (!masterTemplate) return savedItem;

    // 2. THE OVERWRITE: We ignore EVERYTHING in the player's save file except the ID.
    // We return a 100% perfect, pristine clone directly from the live database.
    let hydratedItem = JSON.parse(JSON.stringify(masterTemplate));
    
    // (Optional) If you ever add item quantities/stacks later, you would preserve ONLY the amount here:
    // if (savedItem.quantity) hydratedItem.quantity = savedItem.quantity;

    return hydratedItem;
}

function createSaveSnapshot(playerState) {
    const snapshot = JSON.parse(JSON.stringify(playerState || {}));

    delete snapshot.activeMinigame;
    delete snapshot._lastMinigameClaim;
    delete snapshot.tradeStaging;
    delete snapshot.tradeResources;
    delete snapshot.tradeLocked;
    delete snapshot.tradeConfirmed;
    delete snapshot.activeTradePartner;
    delete snapshot.activeQuestSession;
    delete snapshot.currentZone;
    delete snapshot.socialX;
    delete snapshot.socialY;

    return snapshot;
}

function migrateLifetimeXp(pd) {
    if (!pd || typeof pd !== 'object') return;

    pd.level = normalizeLevel(pd.level);
    const storedXp = sanitizeLifetimeXp(pd.xp);
    const storedNext = Number(pd.xpToNext);
    const levelStartXp = getTotalXpForLevel(pd.level);

    pd.xp = storedXp;

    if (pd.level >= MAX_PLAYER_LEVEL) {
        if (pd.xp < levelStartXp) {
            pd.xp += levelStartXp;
        }
        pd.xpToNext = "MAX";
        return;
    }

    const cumulativeNextXp = getTotalXpForNextLevel(pd.level);
    const oldPerLevelNextXp = getXpRequirementForLevel(pd.level);
    const hasOldPerLevelThreshold = Number.isFinite(storedNext)
        && storedNext > 0
        && storedNext < cumulativeNextXp;
    const looksLikeOldPerLevelProgress = pd.level > 1
        && hasOldPerLevelThreshold
        && storedXp < Math.max(storedNext, oldPerLevelNextXp);
    const isBelowLifetimeFloor = pd.level > 1 && storedXp < levelStartXp;

    if (looksLikeOldPerLevelProgress || isBelowLifetimeFloor) {
        pd.xp = levelStartXp + storedXp;
    }

    applyLifetimeXpLevelUps(pd, { restoreVitals: false });
}

function createDefaultSaveData(username) {
    return {
        username,
        level: 1, xp: 0, xpToNext: getTotalXpForNextLevel(1), skillPoints: 0,
        vitality: 1, hp: 25, stamina: 25, maxStamina: 1,
        offense: 1, defense: 1, speed: 1,
        vaultSlots: 10, gold: 0, hops: 0, wood: 0, fish: 0,
        lumberPoints: 0, fishingPoints: 0, hopsPoints: 0,
        pendingGold: 0, pendingXp: 0, pendingLoot: [],
        wildernessLevel: 1, cellarLevel: 1, abyssDepth: 1,
        appearance: { ...DEFAULT_APPEARANCE },
        equipment: {
            weapon: JSON.parse(JSON.stringify(ItemDatabase["rusty_mace"])),
        },
        inventory: [], stash: [],
        buildings: { workerCabin: 1 },
        workers: { total: 0, assigned: { wood: 0, fish: 0, hops: 0 }, retired: true },
        tavernContacts: { total: 0, refundGold: 0 },
        economyMigrationVersion: 3,
        supplyCart: { wood: 0, fish: 0, hops: 0, max: 100, level: 1 },
        maxInventorySlots: 5, backpackUpgrades: 0,
        pet: { adopted: false, level: 1 },
        quests: { completed: {} }
    };
}

function getLegacyWorkerSnapshot(pd) {
    const workers = pd.workers && typeof pd.workers === 'object' ? pd.workers : {};

    if (workers.woodcutters !== undefined || workers.fishermen !== undefined || workers.farmers !== undefined) {
        const wood = Math.max(0, Math.trunc(Number(workers.woodcutters) || 0));
        const fish = Math.max(0, Math.trunc(Number(workers.fishermen) || 0));
        const hops = Math.max(0, Math.trunc(Number(workers.farmers) || 0));
        return { total: wood + fish + hops, assigned: { wood, fish, hops } };
    }

    const assigned = workers.assigned && typeof workers.assigned === 'object' ? workers.assigned : {};
    const total = Math.max(0, Math.trunc(Number(workers.total) || 0));
    let wood = Math.max(0, Math.min(total, Math.trunc(Number(assigned.wood) || 0)));
    let fish = Math.max(0, Math.min(total, Math.trunc(Number(assigned.fish) || 0)));
    let hops = Math.max(0, Math.min(total, Math.trunc(Number(assigned.hops) || 0)));

    if (wood + fish + hops > total) {
        let remaining = total;
        wood = Math.min(wood, remaining);
        remaining -= wood;
        fish = Math.min(fish, remaining);
        remaining -= fish;
        hops = Math.min(hops, remaining);
    }

    return { total, assigned: { wood, fish, hops } };
}

function calculateLegacyCabinRefund(cabinLevel) {
    let refund = 0;
    const level = Math.max(1, Math.trunc(Number(cabinLevel) || 1));
    for (let lvl = 1; lvl < level; lvl++) {
        refund += Math.floor(100 * Math.pow(1.3, lvl));
    }
    return refund;
}

function normalizeSavedWorkerState(pd) {
    if (!pd.buildings || typeof pd.buildings !== 'object') pd.buildings = { workerCabin: 1 };

    const snapshot = getLegacyWorkerSnapshot(pd);
    const cabinLevel = Math.max(1, Math.trunc(Number(pd.buildings.workerCabin) || 1));
    const migrationVersion = Math.max(0, Math.trunc(Number(pd.economyMigrationVersion) || 0));

    if (migrationVersion < 3) {
        const refundGold = (snapshot.total * 100) + calculateLegacyCabinRefund(cabinLevel);
        if (refundGold > 0) {
            pd.gold = Math.max(0, Math.trunc(Number(pd.gold) || 0)) + refundGold;
            pd.workerRefundGold = Math.max(0, Math.trunc(Number(pd.workerRefundGold) || 0)) + refundGold;
        }
        pd.tavernContacts = { total: snapshot.total, refundGold };
        pd.economyMigrationVersion = 3;
    } else if (!pd.tavernContacts || typeof pd.tavernContacts !== 'object') {
        pd.tavernContacts = { total: 0, refundGold: Math.max(0, Math.trunc(Number(pd.workerRefundGold) || 0)) };
    }

    pd.workers = { total: 0, assigned: { wood: 0, fish: 0, hops: 0 }, retired: true };
    pd.buildings.workerCabin = 1;
}

function normalizeSavedRoster(pd) {
    const roster = pd.roster && typeof pd.roster === 'object' ? pd.roster : {};
    const companions = Array.isArray(roster.companions) ? roster.companions : [];
    const seen = new Set();

    const normalizedCompanions = companions
        .filter(companion => companion && typeof companion === 'object' && companion.id)
        .map(companion => {
            const id = sanitizeToken(companion.id, '');
            if (!id || seen.has(id)) return null;
            seen.add(id);

            const equipment = companion.equipment && typeof companion.equipment === 'object' ? companion.equipment : {};
            const normalizedEquipment = {
                weapon: sanitizeItemSchema(equipment.weapon) || null,
                helmet: sanitizeItemSchema(equipment.helmet) || null,
                armor: sanitizeItemSchema(equipment.armor) || null,
                accessory: sanitizeItemSchema(equipment.accessory) || null
            };

            return {
                id,
                name: String(companion.name || 'Companion').slice(0, 32),
                role: String(companion.role || 'Companion').slice(0, 32),
                level: Math.max(1, Math.min(50, Math.trunc(Number(companion.level) || 1))),
                hired: companion.hired !== false,
                active: companion.active === true,
                icon: String(companion.icon || 'M').slice(0, 2),
                spriteId: sanitizeToken(companion.spriteId, ''),
                stats: {
                    vitality: Math.max(1, Math.trunc(Number(companion.stats && companion.stats.vitality) || 3)),
                    offense: Math.max(1, Math.trunc(Number(companion.stats && companion.stats.offense) || 2)),
                    defense: Math.max(1, Math.trunc(Number(companion.stats && companion.stats.defense) || 2)),
                    speed: Math.max(1, Math.trunc(Number(companion.stats && companion.stats.speed) || 3))
                },
                equipment: normalizedEquipment
            };
        })
        .filter(Boolean);

    const activeIds = Array.isArray(roster.activeIds) ? roster.activeIds.map(id => sanitizeToken(id, '')).filter(Boolean) : [];
    const validIds = new Set(normalizedCompanions.map(companion => companion.id));
    pd.roster = {
        companions: normalizedCompanions,
        activeIds: activeIds.filter((id, index) => validIds.has(id) && activeIds.indexOf(id) === index).slice(0, 1)
    };
    pd.roster.companions.forEach(companion => { companion.active = pd.roster.activeIds.includes(companion.id); });
}
function normalizeSavedSupplyCart(pd) {
    const cart = pd.supplyCart && typeof pd.supplyCart === 'object' ? pd.supplyCart : {};
    pd.supplyCart = {
        wood: Math.max(0, Math.trunc(Number(cart.wood) || 0)),
        fish: Math.max(0, Math.trunc(Number(cart.fish) || 0)),
        hops: Math.max(0, Math.trunc(Number(cart.hops) || 0)),
        max: Math.max(1, Math.trunc(Number(cart.max) || 100)),
        level: Math.max(1, Math.trunc(Number(cart.level) || 1))
    };
}

function hydratePlayerData(playerDoc) {
    if (!playerDoc.saveData.appearance) {
        playerDoc.saveData.appearance = { ...DEFAULT_APPEARANCE };
    }

    let pd = playerDoc.saveData;
    pd.username = playerDoc.username;
    pd.appearance = sanitizeAppearance(pd.appearance);
    pd.friends = playerDoc.friends || [];
    pd.ignored = playerDoc.ignored || [];
    migrateLifetimeXp(pd);
    delete pd.activeMinigame;
    delete pd._lastMinigameClaim;
    delete pd.tradeStaging;
    delete pd.tradeResources;
    delete pd.tradeLocked;
    delete pd.tradeConfirmed;
    delete pd.activeTradePartner;
    delete pd.activeQuestSession;
    delete pd.currentZone;
    delete pd.socialX;
    delete pd.socialY;

    if (pd.equipment) {
        for (let slot in pd.equipment) {
            pd.equipment[slot] = sanitizeItemSchema(pd.equipment[slot]);
        }
    }

    if (pd.inventory) {
        pd.inventory = pd.inventory.map(item => sanitizeItemSchema(item)).filter(Boolean);
    }

    if (pd.stash) {
        pd.stash = pd.stash.map(item => sanitizeItemSchema(item)).filter(Boolean);
    }

    if (!pd.quests) pd.quests = { completed: {} };
    if (!pd.quests.completed) pd.quests.completed = {};
    normalizeSavedWorkerState(pd);
    normalizeSavedSupplyCart(pd);
    pd.activeBuffs = [];
    pd.activeCombatBuff = null;
    pd.hp = (pd.vitality || 1) * 25;
    pd.stamina = (pd.maxStamina || 1) * 25;
    return pd;
}

function rememberSocketLogin(socket, playerDoc) {
    const pd = hydratePlayerData(playerDoc);
    claimUsernameSession(socket, playerDoc.username);
    socket.data.username = playerDoc.username;
    activePlayers[socket.id] = pd;
    return pd;
}

function getSessionKey(username) {
    return String(username || '').trim().toLowerCase();
}

function getActiveSocketIdForUsername(username) {
    const key = getSessionKey(username);
    const activeSocketId = activeUserSockets[key];
    if (activeSocketId && io.sockets.sockets.has(activeSocketId)) {
        return activeSocketId;
    }
    delete activeUserSockets[key];
    return null;
}

function isUsernameSignedIn(username, socket) {
    const activeSocketId = getActiveSocketIdForUsername(username);
    return Boolean(activeSocketId && activeSocketId !== socket.id);
}

function claimUsernameSession(socket, username) {
    const previousUsername = socket.data.username;
    const previousKey = getSessionKey(previousUsername);
    if (previousKey && activeUserSockets[previousKey] === socket.id) {
        delete activeUserSockets[previousKey];
    }

    activeUserSockets[getSessionKey(username)] = socket.id;
}

function releaseUsernameSession(socket) {
    const key = getSessionKey(socket.data.username);
    if (key && activeUserSockets[key] === socket.id) {
        delete activeUserSockets[key];
    }
}

function getPublicCombatMapTemplates() {
    const publicTemplates = {};

    Object.entries(CombatMapTemplates).forEach(([templateId, template]) => {
        const defaultObstacle = obstacleStyleForZone(template.zone);
        publicTemplates[templateId] = {
            id: template.id,
            zone: template.zone,
            name: template.name,
            gridSize: template.gridSize,
            tileSize: template.tileSize,
            floorSpriteId: template.floorSpriteId || 'ground_wilderness',
            floorTiles: template.floorTiles || [],
            playerStart: template.playerStart,
            enemies: template.enemies || [],
            enemySlots: template.enemySlots || [],
            obstacles: (template.obstacles || []).map(obstacle => ({
                x: obstacle.x,
                y: obstacle.y,
                spriteId: obstacle.spriteId || defaultObstacle.spriteId,
                icon: obstacle.icon || defaultObstacle.icon
            })),
            interactables: template.interactables || []
        };
    });

    return publicTemplates;
}

// Serve the index.html file from the root directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/combat-map-templates', (req, res) => {
    res.json(getPublicCombatMapTemplates());
});

// === SOCKET.IO COMMUNICATION HUB ===
io.on('connection', (socket) => {
    console.log(`⚔️  A Knight has connected: ${socket.id}`);

    // --- REGISTER NEW KNIGHT ---
    socket.on('register', async (data) => {
        try {
            const username = normalizeUsername(data && data.username);
            const password = data && data.password;

            if (!username) {
                return socket.emit('loginError', 'Knight names can use letters, numbers, spaces, underscores, or hyphens, up to 24 characters.');
            }

            if (!validatePassword(password)) {
                return socket.emit('loginError', 'Password must be 4-128 characters.');
            }

            const existingPlayer = await Player.findOne({ username }).collation({ locale: 'en', strength: 2 });
            if (existingPlayer) {
                return socket.emit('loginError', 'Name already taken by another Knight.');
            }

            const newPlayer = new Player({
                username,
                password: hashPassword(password), 
                saveData: createDefaultSaveData(username)
            });

            await newPlayer.save();

            // === THE FIX: LOG THE PLAYER INTO RAM IMMEDIATELY ===
            // This ensures the server knows who they are when they click "Begin Adventure"
            rememberSocketLogin(socket, newPlayer);
            // ====================================================

            socket.emit('registerSuccess', { username: newPlayer.username });
        } catch (err) {
            console.error(err);
            socket.emit('loginError', 'Server error during registration.');
        }
    });
// --- SECURE GAME STATE SAVING ---
    socket.on('saveGame', async (data) => {
        try {
            let p = activePlayers[socket.id];
            
            // 1. If the player isn't loaded in server memory, reject the save entirely.
            if (!p || !p.username) return;

            // 2. ONLY accept purely cosmetic updates from the client's payload.
            // We surgically extract ONLY what is safe, ignoring Gold, Items, and Stats.
if (data.saveData) {
                if (data.saveData.appearance) {
                    p.appearance = sanitizeAppearance(data.saveData.appearance);
                }
                // Allow the server to remember their job when logging in!
                if (data.saveData.idleJob) p.idleJob = sanitizeToken(data.saveData.idleJob, p.idleJob || 'TAVERN');
                
                // Allow pet cosmetic updates, but fiercely protect the level and adoption status!
                if (data.saveData.pet) {
                    p.pet = sanitizePetCosmetics(data.saveData.pet, p.pet);
                }
            }

            // 3. Save the SERVER'S secure memory state to MongoDB, completely ignoring the client's economy data.
            const saveSnapshot = createSaveSnapshot(p);
            await Player.findOneAndUpdate(
                { username: p.username },
                { saveData: saveSnapshot }
            );
            console.log(`💾 Secure save synced for Knight: ${p.username}`);
        } catch (err) {
            console.error('Error saving game data to MongoDB:', err);
        }
    });

// --- LOGIN EXISTING KNIGHT ---
        socket.on('login', async (data) => {
            try {
                const username = normalizeUsername(data && data.username);
                const password = data && data.password;

                if (!username || !validatePassword(password)) {
                    return socket.emit('loginError', 'Invalid Knight Name or Password.');
                }

                const playerDoc = await Player.findOne({ username }).collation({ locale: 'en', strength: 2 });
                if (!playerDoc || !verifyPassword(password, playerDoc.password)) {
                    return socket.emit('loginError', 'Invalid Knight Name or Password.');
                }

                if (isUsernameSignedIn(playerDoc.username, socket)) {
                    return socket.emit('loginError', 'That Knight is already signed in. Please log out on the other device first.');
                }

                if (needsPasswordUpgrade(playerDoc.password)) {
                    playerDoc.password = hashPassword(password);
                    await playerDoc.save();
                }

                const pd = rememberSocketLogin(socket, playerDoc);
                socket.emit('loginSuccess', pd);
            } catch (err) {
                console.error(err);
                socket.emit('loginError', 'Server error during login.');
            }
        });

        // === RESTORED: MODULAR ROUTER INJECTIONS ===
        // This plugs your other files into the main server connection!
        injectTownRouter(socket, io, activePlayers, activeCombats);
        injectCombatRouter(socket, io, activePlayers, activeCombats);
        injectSocialRouter(socket, io, activePlayers, activeCombats);
        injectQuestRouter(socket, io, activePlayers);


        // === RESTORED: DISCONNECT HANDLER ===
        socket.on('disconnect', () => {
            console.log(`❌ A Knight disconnected: ${socket.id}`);
            releaseUsernameSession(socket);
            delete activePlayers[socket.id];
            delete activeCombats[socket.id];
        });

    }); // <--- This is the TRUE end of the master connection hub!

// === THE SERVER TICK (Runs every 3 seconds) ===
setInterval(() => {
    for (let socketId in activePlayers) {
        let p = activePlayers[socketId];
        if (!p) continue;

        // Worker production is retired. Minigame points now feed resources, crates, and fish exports.
        if (p.happyHourTicks > 0) p.happyHourTicks--;

        io.to(socketId).emit('serverTick', {
            hp: p.hp, 
            wood: p.wood, 
            fish: p.fish, 
            hops: p.hops,
            supplyCart: p.supplyCart, 
            happyHourTicks: p.happyHourTicks,
            upgrades: p.upgrades
        });
    }
}, 3000);



// === SERVER BOOT ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🍻 Pub Knights Server running on http://localhost:${PORT}`);
});

