require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
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
app.set('trust proxy', 1);

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
    password: { type: String },
    authProviders: {
        type: [{
            provider: { type: String, required: true },
            subject: { type: String, required: true },
            email: { type: String },
            displayName: { type: String }
        }],
        default: []
    },
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
playerSchema.index({ 'authProviders.provider': 1, 'authProviders.subject': 1 }, { unique: true, sparse: true });

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

const googleOAuthStates = new Map();
const ssoLoginTokens = new Map();
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let googleJwksCache = { expiresAt: 0, keys: [] };

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
        workers: { total: 0, assigned: { wood: 0, fish: 0, hops: 0 } },
        supplyCart: { wood: 0, fish: 0, hops: 0, max: 100, level: 1 },
        maxInventorySlots: 5, backpackUpgrades: 0,
        pet: { adopted: false, level: 1 },
        quests: { completed: {} }
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
        pd.inventory = pd.inventory.map(item => sanitizeItemSchema(item));
    }

    if (pd.stash) {
        pd.stash = pd.stash.map(item => sanitizeItemSchema(item));
    }

    if (!pd.buildings) pd.buildings = { workerCabin: 1 };
    if (!pd.quests) pd.quests = { completed: {} };
    if (!pd.quests.completed) pd.quests.completed = {};
    if (pd.workers && pd.workers.woodcutters !== undefined) {
        let w = pd.workers.woodcutters || 0;
        let f = pd.workers.fishermen || 0;
        let h = pd.workers.farmers || 0;
        pd.workers = { total: w + f + h, assigned: { wood: w, fish: f, hops: h } };
    }

    pd.hp = (pd.vitality || 1) * 25;
    pd.stamina = (pd.maxStamina || 1) * 25;
    return pd;
}

function rememberSocketLogin(socket, playerDoc) {
    const pd = hydratePlayerData(playerDoc);
    socket.data.username = playerDoc.username;
    activePlayers[socket.id] = pd;
    return pd;
}

function getPublicBaseUrl(req) {
    return process.env.SSO_CALLBACK_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

function getGoogleRedirectUri(req) {
    return `${getPublicBaseUrl(req)}/auth/google/callback`;
}

function isGoogleSsoConfigured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function base64UrlToBuffer(value) {
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='), 'base64');
}

function parseJwt(token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) throw new Error('Malformed identity token.');
    return {
        header: JSON.parse(base64UrlToBuffer(parts[0]).toString('utf8')),
        payload: JSON.parse(base64UrlToBuffer(parts[1]).toString('utf8')),
        signingInput: `${parts[0]}.${parts[1]}`,
        signature: base64UrlToBuffer(parts[2])
    };
}

async function getGoogleJwks() {
    const now = Date.now();
    if (googleJwksCache.expiresAt > now && googleJwksCache.keys.length) {
        return googleJwksCache.keys;
    }

    const response = await fetch(GOOGLE_CERTS_URL);
    if (!response.ok) throw new Error('Could not load Google signing keys.');
    const body = await response.json();
    googleJwksCache = {
        keys: body.keys || [],
        expiresAt: now + 60 * 60 * 1000
    };
    return googleJwksCache.keys;
}

async function verifyGoogleIdToken(idToken, expectedNonce) {
    const parsed = parseJwt(idToken);
    if (parsed.header.alg !== 'RS256') throw new Error('Unexpected Google token signature algorithm.');

    const keys = await getGoogleJwks();
    const jwk = keys.find(key => key.kid === parsed.header.kid);
    if (!jwk) throw new Error('Google signing key not found.');

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const valid = crypto.verify(
        'RSA-SHA256',
        Buffer.from(parsed.signingInput),
        publicKey,
        parsed.signature
    );
    if (!valid) throw new Error('Invalid Google identity token signature.');

    const claims = parsed.payload;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!GOOGLE_ISSUERS.has(claims.iss)) throw new Error('Unexpected Google token issuer.');
    if (claims.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('Google token audience mismatch.');
    if (claims.exp <= nowSeconds) throw new Error('Google identity token expired.');
    if (claims.nonce !== expectedNonce) throw new Error('Google sign-in nonce mismatch.');
    if (claims.email_verified !== true && claims.email_verified !== 'true') {
        throw new Error('Google account email is not verified.');
    }

    return claims;
}

function normalizeSsoUsername(value) {
    const cleaned = String(value || 'Knight')
        .replace(/[^A-Za-z0-9 _-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 18);
    return normalizeUsername(cleaned) || 'Knight';
}

async function createUniqueSsoUsername(claims) {
    const emailName = claims.email ? claims.email.split('@')[0] : '';
    const base = normalizeSsoUsername(claims.name || emailName || 'Knight');

    for (let attempt = 0; attempt < 8; attempt++) {
        const suffix = attempt === 0 ? '' : ` ${crypto.randomInt(1000, 9999)}`;
        const candidate = normalizeUsername(`${base}${suffix}`.substring(0, 24));
        if (!candidate) continue;
        const existing = await Player.findOne({ username: candidate }).collation({ locale: 'en', strength: 2 });
        if (!existing) return candidate;
    }

    return `Knight ${crypto.randomInt(100000, 999999)}`;
}

async function findOrCreateGooglePlayer(claims) {
    const existing = await Player.findOne({
        authProviders: { $elemMatch: { provider: 'google', subject: claims.sub } }
    });
    if (existing) return existing;

    const username = await createUniqueSsoUsername(claims);
    const newPlayer = new Player({
        username,
        authProviders: [{
            provider: 'google',
            subject: claims.sub,
            email: claims.email,
            displayName: claims.name
        }],
        saveData: createDefaultSaveData(username)
    });
    await newPlayer.save();
    return newPlayer;
}

function createSsoLoginToken(playerDoc) {
    const token = crypto.randomBytes(32).toString('base64url');
    ssoLoginTokens.set(token, {
        playerId: playerDoc._id.toString(),
        expiresAt: Date.now() + 2 * 60 * 1000
    });
    return token;
}

function pruneExpiredSsoState() {
    const now = Date.now();
    for (const [key, value] of googleOAuthStates) {
        if (value.expiresAt <= now) googleOAuthStates.delete(key);
    }
    for (const [key, value] of ssoLoginTokens) {
        if (value.expiresAt <= now) ssoLoginTokens.delete(key);
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

app.get('/auth/google', (req, res) => {
    if (!isGoogleSsoConfigured()) {
        return res.status(503).send('Google SSO is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }

    pruneExpiredSsoState();
    const state = crypto.randomBytes(24).toString('base64url');
    const nonce = crypto.randomBytes(24).toString('base64url');
    googleOAuthStates.set(state, {
        nonce,
        expiresAt: Date.now() + 10 * 60 * 1000
    });

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: getGoogleRedirectUri(req),
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce,
        prompt: 'select_account'
    });

    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

app.get('/auth/google/callback', async (req, res) => {
    try {
        if (!isGoogleSsoConfigured()) {
            return res.status(503).send('Google SSO is not configured.');
        }

        pruneExpiredSsoState();
        const code = typeof req.query.code === 'string' ? req.query.code : '';
        const state = typeof req.query.state === 'string' ? req.query.state : '';
        const savedState = googleOAuthStates.get(state);
        googleOAuthStates.delete(state);

        if (!code || !savedState || savedState.expiresAt <= Date.now()) {
            return res.status(400).send('Google sign-in expired. Please try again.');
        }

        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: getGoogleRedirectUri(req),
                grant_type: 'authorization_code'
            })
        });

        if (!tokenResponse.ok) {
            throw new Error(`Google token exchange failed with ${tokenResponse.status}.`);
        }

        const tokenPayload = await tokenResponse.json();
        const claims = await verifyGoogleIdToken(tokenPayload.id_token, savedState.nonce);
        const playerDoc = await findOrCreateGooglePlayer(claims);
        const loginToken = createSsoLoginToken(playerDoc);
        res.redirect(`/?ssoToken=${encodeURIComponent(loginToken)}`);
    } catch (err) {
        console.error('Google SSO error:', err);
        res.status(500).send('Google sign-in failed. Please return to Pub Knights and try again.');
    }
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

        socket.on('ssoLogin', async (data) => {
            try {
                pruneExpiredSsoState();
                const token = data && typeof data.token === 'string' ? data.token : '';
                const savedToken = ssoLoginTokens.get(token);
                ssoLoginTokens.delete(token);

                if (!savedToken || savedToken.expiresAt <= Date.now()) {
                    return socket.emit('loginError', 'Single sign-on expired. Please sign in again.');
                }

                const playerDoc = await Player.findById(savedToken.playerId);
                if (!playerDoc) {
                    return socket.emit('loginError', 'Single sign-on account was not found.');
                }

                const pd = rememberSocketLogin(socket, playerDoc);
                socket.emit('loginSuccess', pd);
            } catch (err) {
                console.error(err);
                socket.emit('loginError', 'Server error during single sign-on.');
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

