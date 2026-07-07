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
const { ItemDatabase } = require('./public/js/items.js');
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

// === THE AUTOMATED ITEM LONGEVITY SANITIZER (STRICT HYDRATION) ===
function sanitizeItemSchema(savedItem) {
    if (!savedItem || !savedItem.id) return savedItem;
    
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

    return snapshot;
}

// Serve the index.html file from the root directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

// Generate a secure default template on the server
// === REPLACED ===
const defaultTemplate = {
                username,
                level: 1, xp: 0, xpToNext: 100, skillPoints: 0,
                vitality: 1, hp: 25, stamina: 25, maxStamina: 1, 
                offense: 1, defense: 1, speed: 1,
                vaultSlots: 10, gold: 0, hops: 0, wood: 0, fish: 0,
                lumberPoints: 0, fishingPoints: 0, hopsPoints: 0,
                pendingGold: 0, pendingXp: 0, pendingLoot: [],
                wildernessLevel: 1, cellarLevel: 1, abyssDepth: 1,
                appearance: { ...DEFAULT_APPEARANCE },
                equipment: { 
                    // PULL SECURELY FROM ITEM DATABASE!
                    weapon: JSON.parse(JSON.stringify(ItemDatabase["rusty_mace"])),
                },
                inventory: [], stash: [], 
                buildings: { workerCabin: 1 },
                workers: { total: 0, assigned: { wood: 0, fish: 0, hops: 0 } },
                supplyCart: { wood: 0, fish: 0, hops: 0, max: 100, level: 1 },
                maxInventorySlots: 5, backpackUpgrades: 0,
                pet: { adopted: false, level: 1 }
            };
// ===================

            const newPlayer = new Player({
                username,
                password: hashPassword(password), 
                saveData: defaultTemplate 
            });

            await newPlayer.save();

            // === THE FIX: LOG THE PLAYER INTO RAM IMMEDIATELY ===
            // This ensures the server knows who they are when they click "Begin Adventure"
            let pd = newPlayer.saveData;
            pd.username = newPlayer.username;
            pd.friends = [];
            pd.ignored = [];
            pd.hp = (pd.vitality || 1) * 25;
            pd.stamina = (pd.maxStamina || 1) * 25;
            socket.data.username = newPlayer.username;
            activePlayers[socket.id] = pd;
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

                if (needsPasswordUpgrade(playerDoc.password)) {
                    playerDoc.password = hashPassword(password);
                    await playerDoc.save();
                }

                if (!playerDoc.saveData.appearance) {
                    playerDoc.saveData.appearance = { ...DEFAULT_APPEARANCE };
                }

                // ============================================
                // === AUTOMATED LONGEVITY: SANITIZE LOADOUT ===
                // ============================================
                let pd = playerDoc.saveData;
                pd.username = playerDoc.username;
                pd.appearance = sanitizeAppearance(pd.appearance);
                pd.friends = playerDoc.friends || [];
                pd.ignored = playerDoc.ignored || [];
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
                
                // 1. Sanitize Equipped Gear
                if (pd.equipment) {
                    for (let slot in pd.equipment) {
                        pd.equipment[slot] = sanitizeItemSchema(pd.equipment[slot]);
                    }
                }
                // 2. Sanitize Backpack
                if (pd.inventory) {
                    pd.inventory = pd.inventory.map(item => sanitizeItemSchema(item));
                }
              
          // 3. Sanitize Stash/Vault
                if (pd.stash) {
                    pd.stash = pd.stash.map(item => sanitizeItemSchema(item));
                }
                // ============================================


                // --- LEGACY SCHEMA MIGRATION ---
                if (!pd.buildings) pd.buildings = { workerCabin: 1 };
                if (pd.workers && pd.workers.woodcutters !== undefined) {
                    let w = pd.workers.woodcutters || 0;
                    let f = pd.workers.fishermen || 0;
                    let h = pd.workers.farmers || 0;
                    pd.workers = { total: w + f + h, assigned: { wood: w, fish: f, hops: h } };
                }

                // === PHASE 0: RECONNECT SAFETY NET ===
                // Recalculate true maxes to heal them instantly upon logging into the hub
                pd.hp = (pd.vitality || 1) * 25;
                pd.stamina = (pd.maxStamina || 1) * 25;
                // =====================================

                socket.data.username = playerDoc.username;
                activePlayers[socket.id] = pd;
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


        // === RESTORED: DISCONNECT HANDLER ===
        socket.on('disconnect', () => {
            console.log(`❌ A Knight disconnected: ${socket.id}`);
            delete activePlayers[socket.id];
            delete activeCombats[socket.id];
        });

    }); // <--- This is the TRUE end of the master connection hub!

// === THE SERVER TICK (Runs every 3 seconds) ===
setInterval(() => {
    for (let socketId in activePlayers) {
        let p = activePlayers[socketId];
        if (!p) continue;

        // 1. Process Workers & Supply Cart
        let productionCycles = (p.happyHourTicks > 0) ? 2 : 1;
        if (p.happyHourTicks > 0) p.happyHourTicks--;

        for (let cycle = 0; cycle < productionCycles; cycle++) {
            if (p.workers && p.workers.assigned && p.supplyCart) {
                // Exponential generation math for long-term balance
                let genWood = p.workers.assigned.wood > 0 ? Math.floor(Math.pow(1.15, p.workers.assigned.wood)) : 0;
                let genFish = p.workers.assigned.fish > 0 ? Math.floor(Math.pow(1.15, p.workers.assigned.fish)) : 0;
                let genHops = p.workers.assigned.hops > 0 ? Math.floor(Math.pow(1.15, p.workers.assigned.hops)) : 0;
                
                let currentTotal = p.supplyCart.wood + p.supplyCart.fish + (p.supplyCart.hops || 0);
                
                if (currentTotal < p.supplyCart.max) p.supplyCart.wood = Math.min(p.supplyCart.wood + genWood, p.supplyCart.max);
                currentTotal = p.supplyCart.wood + p.supplyCart.fish + (p.supplyCart.hops || 0);
                if (currentTotal < p.supplyCart.max) p.supplyCart.fish = Math.min(p.supplyCart.fish + genFish, p.supplyCart.max);
                currentTotal = p.supplyCart.wood + p.supplyCart.fish + (p.supplyCart.hops || 0);
                if (currentTotal < p.supplyCart.max) p.supplyCart.hops = Math.min(p.supplyCart.hops + genHops, p.supplyCart.max);
            }
        }

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

