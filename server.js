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
const injectAdventureRouter = require('./adventureRouter.js');
const { normalizeAdventureState } = require('./adventureState.js');
const {
    CURRENT_SAVE_VERSION,
    needsSaveMigration,
    migrateSaveData
} = require('./saveMigrations.js');
const { createAuthoritativeSaveQueue } = require('./authoritativeSaveQueue.js');
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
const { normalizeRosterState } = require('./companionRoster.js');
const {
    normalizeEquipmentLoadoutState
} = require('./equipmentHandRules.js');
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
    .then(() => console.log('ðŸ›¡ï¸  MongoDB Secured, Indexed & Connected'))
    .catch(err => console.error('âŒ MongoDB Connection Error:', err));
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
    delete snapshot.currentZone;
    delete snapshot.socialX;
    delete snapshot.socialY;
    migrateSaveData(snapshot);

    return snapshot;
}

const authoritativeSaveQueue = createAuthoritativeSaveQueue({
    createSnapshot: createSaveSnapshot,
    writeSnapshot: (username, saveData) => Player.findOneAndUpdate(
        { username },
        { saveData }
    ),
    onError: (error, context) => {
        console.error(`Error persisting authoritative state for ${context.username}:`, error);
    }
});

function persistAuthoritativePlayer(player, metadata = {}) {
    return authoritativeSaveQueue.enqueue(player, metadata);
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
    const saveData = {
        saveVersion: CURRENT_SAVE_VERSION,
        username,
        level: 1, xp: 0, xpToNext: getTotalXpForNextLevel(1), skillPoints: 0,
        vitality: 1, hp: 25, stamina: 25, maxStamina: 1,
        offense: 1, defense: 1, speed: 1,
        vaultSlots: 10, gold: 0,
        pendingGold: 0, pendingXp: 0, pendingLoot: [],
        wildernessLevel: 1, cellarLevel: 1, abyssDepth: 1,
        appearance: { ...DEFAULT_APPEARANCE },
        equipment: {
            weapon: JSON.parse(JSON.stringify(ItemDatabase["rusty_mace"])),
            offhand: null,
        },
        // A first expedition is an outward fight plus a return fight. Two
        // starter drinks let a new Knight learn that rhythm without one rough
        // damage roll turning the discovery loop into a consumable death spiral.
        inventory: [
            JSON.parse(JSON.stringify(ItemDatabase["stout"])),
            JSON.parse(JSON.stringify(ItemDatabase["stout"]))
        ], stash: [],
        roster: { companions: [], activeIds: [] },
        maxInventorySlots: 5, backpackUpgrades: 0,
        pet: { adopted: false, level: 1 }
    };
    normalizeAdventureState(saveData, { recoverInterruptedJourney: false });
    migrateSaveData(saveData);
    return saveData;
}


function normalizeSavedRoster(pd) {
    normalizeRosterState(pd, { sanitizeItem: sanitizeItemSchema });
}

function hydratePlayerData(playerDoc) {
    const migration = migrateSaveData(playerDoc && playerDoc.saveData);
    playerDoc.saveData = migration.saveData;
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
    delete pd.currentZone;
    delete pd.socialX;
    delete pd.socialY;
    if (!pd.equipment || typeof pd.equipment !== 'object') {
        pd.equipment = {};
    }
    for (let slot in pd.equipment) {
            pd.equipment[slot] = sanitizeItemSchema(pd.equipment[slot]);
    }

    pd.inventory = Array.isArray(pd.inventory)
        ? pd.inventory.map(item => sanitizeItemSchema(item)).filter(Boolean)
        : [];

    if (pd.stash) {
        pd.stash = pd.stash.map(item => sanitizeItemSchema(item)).filter(Boolean);
    }

    normalizeEquipmentLoadoutState(pd);
    normalizeSavedRoster(pd);
    // An in-progress journey has no durable combat instance after a process
    // restart or reconnect. Hydration converts it into a failed expedition
    // while retaining completed routes, discoveries, and contract progress.
    normalizeAdventureState(pd, { recoverInterruptedJourney: true });
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
    if (process.env.PUBKNIGHTS_CREATOR_TOOLS !== '1') return res.sendStatus(404);
    res.json(getPublicCombatMapTemplates());
});

// === SOCKET.IO COMMUNICATION HUB ===
io.on('connection', (socket) => {
    console.log(`âš”ï¸  A Knight has connected: ${socket.id}`);

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
            const playerData = rememberSocketLogin(socket, newPlayer);
            // ====================================================

            socket.emit('registerSuccess', {
                username: newPlayer.username,
                playerData
            });
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
                // Allow pet cosmetic updates, but fiercely protect the level and adoption status!
                if (data.saveData.pet) {
                    p.pet = sanitizePetCosmetics(data.saveData.pet, p.pet);
                }
            }

            // 3. Save the SERVER'S secure memory state to MongoDB, completely ignoring the client's economy data.
            await persistAuthoritativePlayer(p, { reason: 'client_save' });
            console.log(`ðŸ’¾ Secure save synced for Knight: ${p.username}`);
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

                const savedRoster = playerDoc.saveData && playerDoc.saveData.roster;
                const hadSavedCompanions = !!(savedRoster && Array.isArray(savedRoster.companions) && savedRoster.companions.length > 0);
                const savedRosterJson = hadSavedCompanions ? JSON.stringify(savedRoster) : '';
                const saveMigrationRequired = needsSaveMigration(playerDoc.saveData);
                const hadInterruptedJourney = !!(
                    playerDoc.saveData
                    && playerDoc.saveData.adventure
                    && playerDoc.saveData.adventure.activeJourney
                );
                const pd = rememberSocketLogin(socket, playerDoc);
                const rosterChanged = hadSavedCompanions && JSON.stringify(pd.roster) !== savedRosterJson;
                if (saveMigrationRequired || hadInterruptedJourney || rosterChanged) {
                    await Player.updateOne(
                        { _id: playerDoc._id },
                        { $set: { saveData: createSaveSnapshot(pd) } }
                    );
                }
                socket.emit('loginSuccess', pd);
            } catch (err) {
                console.error(err);
                socket.emit('loginError', 'Server error during login.');
            }
        });

        // === RESTORED: MODULAR ROUTER INJECTIONS ===
        // This plugs your other files into the main server connection!
        injectTownRouter(socket, io, activePlayers, activeCombats);
        injectAdventureRouter(socket, io, activePlayers, activeCombats, persistAuthoritativePlayer);
        injectCombatRouter(socket, io, activePlayers, activeCombats, persistAuthoritativePlayer);
        injectSocialRouter(socket, io, activePlayers, activeCombats);


        // === RESTORED: DISCONNECT HANDLER ===
        socket.on('disconnect', () => {
            console.log(`âŒ A Knight disconnected: ${socket.id}`);
            const player = activePlayers[socket.id];
            if (player && player.username) {
                void persistAuthoritativePlayer(player, { reason: 'disconnect' });
            }
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

        io.to(socketId).emit('serverTick', {
            hp: p.hp,
            gold: p.gold
        });
    }
}, 3000);



// === SERVER BOOT ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`ðŸ» Pub Knights Server running on http://localhost:${PORT}`);
});
