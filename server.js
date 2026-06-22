require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// Import our new modular routers
const injectTownRouter = require('./townRouter.js');
const injectCombatRouter = require('./combatRouter.js');
const injectSocialRouter = require('./socialRouter.js');
const { ItemDatabase } = require('./public/js/items.js');

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

// Generate a secure default template on the server
const defaultTemplate = {
                level: 1, xp: 0, xpToNext: 100, skillPoints: 0,
                vitality: 70, hp: 70, stamina: 50, maxStamina: 50,
                power: 12, accuracy: 85, resilience: 5, swiftness: 3,
                vaultSlots: 10, gold: 0, hops: 0, wood: 0, fish: 0,
                lumberPoints: 0, fishingPoints: 0, hopsPoints: 0,
                pendingGold: 0, pendingXp: 0, pendingLoot: [],
                wildernessLevel: 1, cellarLevel: 1, abyssDepth: 1,
appearance: { gender: 'male', skin: 'light', hair: 'hair_messy', hairColor: 'brown', eyes: 'eyes_blue', shirtColor: 'blue', pantsColor: 'dark', bootsColor: 'leather' },
                equipment: { 
                    // PULL SECURELY FROM ITEM DATABASE!
                    weapon: JSON.parse(JSON.stringify(ItemDatabase["rusty_mace"])),
                },
                inventory: [], stash: [], workers: { woodcutters: 0, fishermen: 0, farmers: 0 },
                supplyCart: { wood: 0, fish: 0, hops: 0, max: 100, level: 1 },
                maxInventorySlots: 5, backpackUpgrades: 0,
                pet: { adopted: false, level: 1 }
            };

            const newPlayer = new Player({
                username: data.username,
                password: data.password, 
                saveData: defaultTemplate 
            });

            await newPlayer.save();
            socket.emit('registerSuccess');
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
            if (!p) return;

            // 2. ONLY accept purely cosmetic updates from the client's payload.
            // We surgically extract ONLY what is safe, ignoring Gold, Items, and Stats.
if (data.saveData) {
                if (data.saveData.appearance) {
                    p.appearance = data.saveData.appearance;
                }
                // Allow the server to remember their job when logging in!
                if (data.saveData.idleJob) p.idleJob = data.saveData.idleJob;
                
                // Allow pet cosmetic updates, but fiercely protect the level and adoption status!
                if (data.saveData.pet) {
                    p.pet = p.pet || {};
                    p.pet.name = data.saveData.pet.name || p.pet.name;
                    p.pet.type = data.saveData.pet.type || p.pet.type;
                    p.pet.furColor = data.saveData.pet.furColor || p.pet.furColor;
                    p.pet.collarColor = data.saveData.pet.collarColor || p.pet.collarColor;
                }
            }

            // 3. Save the SERVER'S secure memory state to MongoDB, completely ignoring the client's economy data.
            await Player.findOneAndUpdate(
                { username: data.username },
                { saveData: p }
            );
            console.log(`💾 Secure save synced for Knight: ${data.username}`);
        } catch (err) {
            console.error('Error saving game data to MongoDB:', err);
        }
    });

// --- LOGIN EXISTING KNIGHT ---
    socket.on('login', async (data) => {
        try {
            const playerDoc = await Player.findOne({ username: data.username, password: data.password });
            if (!playerDoc) return socket.emit('loginError', 'Invalid Knight Name or Password.');

            // === SAVE REPAIR SYSTEM ===
            // If the player's save was corrupted by the old missing-payload bug, restore their body!
            if (!playerDoc.saveData.appearance) {
                playerDoc.saveData.appearance = { gender: 'male', skin: 'light', hair: 'hair_messy', hairColor: 'brown', eyes: 'eyes_blue', shirtColor: 'blue', pantsColor: 'dark', bootsColor: 'leather' };
            }

            activePlayers[socket.id] = playerDoc.saveData;
            socket.emit('loginSuccess', playerDoc.saveData);
        } catch (err) {
            console.error(err);
            socket.emit('loginError', 'Server error during login.');
        }
    });

    // --- DELEGATED TOWN & INVENTORY ROUTES ---
    injectTownRouter(socket, activePlayers);

    // --- DELEGATED COMBAT ROUTES ---
    injectCombatRouter(socket, io, activePlayers, activeCombats);
	
	// Inject the Multiplayer Social Router
    injectSocialRouter(socket, io, activePlayers);

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
        console.log(`💨  Knight disconnected: ${socket.id}`);
        delete activePlayers[socket.id];
        delete activeCombats[socket.id]; // Prevent memory leaks for combats!
    });
});

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