// --- socialRouter.js ---
// Handles all Community Square logic: Zone instancing, chat, and movement.
const mongoose = require('mongoose');
const {
    normalizeUsername,
    sanitizeChatMessage,
    sanitizeTitle,
    sanitizeZoneId,
    sanitizeUGCContent,
    clampInt,
    getArrayIndex,
    escapeRegExp
} = require('./serverSecurity.js');

module.exports = function(socket, io, activePlayers) {
	
// === REPLACED: GLOBAL PRIVATE MESSAGE ROUTER (LIVE ONLY) ===
    socket.on('sendPrivateMessage', async (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.username) return;

        let targetName = normalizeUsername(data && data.target);
        let msg = sanitizeChatMessage(data && data.message, 240);
        if (!targetName || !msg) {
            return socket.emit('zoneNotification', { message: 'Invalid private message.' });
        }

        // 1. Check if the target is online by scanning ALL active sockets globally
        let targetSocketId = Object.keys(activePlayers).find(key => (activePlayers[key].username || '').toLowerCase() === targetName.toLowerCase());

        if (targetSocketId) {
            let targetPlayer = activePlayers[targetSocketId];
            
            if (targetPlayer.ignored && targetPlayer.ignored.some(i => i.toLowerCase() === p.username.toLowerCase())) {
                return socket.emit('zoneNotification', { message: `❌ Cannot send message to ${targetPlayer.username}.` });
            }
            
            io.to(targetSocketId).emit('receivePM', { from: p.username, message: msg, timestamp: Date.now() });
            socket.emit('zoneNotification', { message: `✉️ Message sent to ${targetPlayer.username}.` });
            
        } else {
            // 2. Target is OFFLINE. Reject the message!
            socket.emit('zoneNotification', { message: `❌ ${targetName} is offline or does not exist.` });
        }
    });
// === NEW: DATABASE SOCIAL LIST MANAGER ===
    socket.on('manageSocialList', async (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.username) return;
        
        try {
            const PlayerModel = mongoose.model('Player');
            let dbUser = await PlayerModel.findOne({ username: p.username });
            if (!dbUser) return;
            
            const allowedActions = ['addFriend', 'removeFriend', 'addIgnore', 'removeIgnore'];
            if (!data || !allowedActions.includes(data.action)) return;

            let targetInput = normalizeUsername(data && data.target);
            if (!targetInput) {
                return socket.emit('zoneNotification', { message: 'Invalid Knight name.' });
            }
            
            // Cannot add/block yourself
            if (targetInput.toLowerCase() === p.username.toLowerCase()) {
                return socket.emit('zoneNotification', { message: `❌ You cannot target yourself.` });
            }

            // 1. Case-Insensitive Database Lookup!
            // We do this to ensure we grab the EXACT spelling/casing of their name from the DB.
            let targetUser = await PlayerModel
                .findOne({ username: new RegExp('^' + escapeRegExp(targetInput) + '$', 'i') })
                .collation({ locale: 'en', strength: 2 });

            // Ensure the user actually exists before trying to friend OR ignore them
            if (data.action === 'addFriend' || data.action === 'addIgnore') {
                if (!targetUser) {
                    return socket.emit('zoneNotification', { message: `❌ User '${targetInput}' does not exist.` });
                }
            }

            if (data.action === 'addFriend') {
                if (!dbUser.friends.includes(targetUser.username)) {
                    dbUser.friends.push(targetUser.username);
                    socket.emit('zoneNotification', { message: `🤝 Added ${targetUser.username} to Friends List.` });
                } else {
                    socket.emit('zoneNotification', { message: `ℹ️ ${targetUser.username} is already your friend.` });
                }
            } else if (data.action === 'removeFriend') {
                dbUser.friends = dbUser.friends.filter(f => f.toLowerCase() !== targetInput.toLowerCase());
            } else if (data.action === 'addIgnore') {
                if (!dbUser.ignored.includes(targetUser.username)) {
                    dbUser.ignored.push(targetUser.username);
                    // Remove from friends if ignored
                    dbUser.friends = dbUser.friends.filter(f => f !== targetUser.username);
                    socket.emit('zoneNotification', { message: `🚫 Ignored ${targetUser.username}.` });
                } else {
                    socket.emit('zoneNotification', { message: `ℹ️ ${targetUser.username} is already ignored.` });
                }
            } else if (data.action === 'removeIgnore') {
                dbUser.ignored = dbUser.ignored.filter(i => i.toLowerCase() !== targetInput.toLowerCase());
            }
            
            await dbUser.save();
            
           // === NEW: Sync to RAM and Emit Online Status ===
            p.friends = dbUser.friends;
            p.ignored = dbUser.ignored;
            
            let activeNames = Object.values(activePlayers).map(player => (player.username || "").toLowerCase());
            let onlineFriends = (p.friends || []).filter(f => activeNames.includes(f.toLowerCase()));
            
            socket.emit('socialListsData', { friends: p.friends, ignored: p.ignored, onlineFriends: onlineFriends });
            // ===============================================
            
        } catch(err) {
            console.error("Social List Error:", err);
        }
    }); 
    // =========================================
	
	socket.on('fetchSocialLists', async () => {
         let p = activePlayers[socket.id];
         if (!p || !p.username) return;
         
         try {
             const PlayerModel = mongoose.model('Player');
             let dbUser = await PlayerModel.findOne({ username: p.username });
             if (dbUser) {
                 p.friends = dbUser.friends || [];
                 p.ignored = dbUser.ignored || [];
             }
         } catch (err) {}
         
         let activeNames = Object.values(activePlayers).map(player => (player.username || "").toLowerCase());
         let onlineFriends = (p.friends || []).filter(f => activeNames.includes(f.toLowerCase()));
         
         socket.emit('socialListsData', { friends: p.friends || [], ignored: p.ignored || [], onlineFriends: onlineFriends });
    });
	
	
	// --- RENAISSANCE CORNER: UGC HANDLING ---

    // 1. Save Art/Music
    socket.on('saveUGC', async (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.username) return;

        try {
            const UGC = mongoose.model('UGC');
            const type = data && ['ART', 'MUSIC'].includes(data.type) ? data.type : null;
            const contentData = sanitizeUGCContent(type, data && data.contentData);

            // STRICT VALIDATION
            if (!type) {
                return socket.emit('zoneNotification', { message: '❌ Invalid creation type.' });
            }

            if (!contentData) {
                return socket.emit('zoneNotification', { message: '❌ Creation payload is corrupted or too large.' });
            }

            if (type === 'ART') {
                // Validate 24x24 matrix payload bounds to prevent memory bloat
                if (!Array.isArray(contentData) || contentData.length > 576) { // 24 * 24 = 576
                    return socket.emit('zoneNotification', { message: '❌ Art matrix is corrupted or exceeds 24x24 limits.' });
                }
            }

            if (type === 'MUSIC') {
                // Validate sequence bounds (e.g., 32 steps max)
                if (!Array.isArray(contentData) || contentData.length > 32) {
                    return socket.emit('zoneNotification', { message: '❌ Composition exceeds 32 steps.' });
                }
            }

            // Save to MongoDB
            const newCreation = new UGC({
                authorUsername: p.username,
                type,
                title: sanitizeTitle(data && data.title),
                contentData
            });

            await newCreation.save();
            socket.emit('zoneNotification', { message: `🎨 Successfully archived your ${type.toLowerCase()}!` });
            
        } catch (err) {
            console.error("UGC Save Error:", err);
            socket.emit('zoneNotification', { message: '❌ The canvas tore! Failed to save creation.' });
        }
    });

    // 2. Fetch Player's Personal Gallery
    socket.on('fetchMyUGC', async () => {
        let p = activePlayers[socket.id];
        if (!p || !p.username) return;

        try {
            const UGC = mongoose.model('UGC');
            // Retrieve only the requesting Knight's creations
            const myCreations = await UGC.find({ authorUsername: p.username }).sort({ createdAt: -1 });
            socket.emit('ugcGalleryLoaded', myCreations);
        } catch (err) {
            console.error("UGC Fetch Error:", err);
        }
    });
	

    // Helper to cleanly remove a player from their current multiplayer instance
    function leaveCurrentZone() {
        let p = activePlayers[socket.id];
        if (!p || !p.currentZone) return;

        socket.leave(p.currentZone);
        // Alert the room they left
        io.to(p.currentZone).emit('zoneNotification', { message: `💨 ${p.username} departed.` });
        
        // Tell the room to remove their 24x24 sprite from the Canvas (For Phase 2)
        io.to(p.currentZone).emit('playerLeftZone', { id: socket.id });
        
        p.currentZone = null;
    }

    socket.on('joinZone', (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.username) return;

        // 1. Leave any existing zone first
        leaveCurrentZone();

        // 2. Assign the new zone and default spawn coordinates
        let zoneId = sanitizeZoneId(data && data.zoneId);
        if (!zoneId) return;

        p.currentZone = zoneId;
        p.socialX = 12; // Default spawn X
        p.socialY = 12; // Default spawn Y

        // 3. Native Socket.io Room Join
        socket.join(zoneId);

        // 4. Securely gather data of all players currently in this specific room
        // We package their appearance and equipment so the dumb terminal can draw their 24x24 matrices
        let playersInZone = Object.keys(activePlayers)
            .filter(key => activePlayers[key].currentZone === zoneId)
            .map(key => {
                let ap = activePlayers[key];
                return { id: key, name: ap.username, x: ap.socialX, y: ap.socialY, equipment: ap.equipment, appearance: ap.appearance };
            });

        // 5. Send the full room state down to the player who just joined
        socket.emit('zoneJoined', { zoneId: zoneId, players: playersInZone });

        // 6. Notify everyone else in the room that a new player arrived
        socket.to(zoneId).emit('zoneNotification', { message: `✨ ${p.username} entered the Hub.` });
        socket.to(zoneId).emit('playerJoinedZone', { 
            id: socket.id, name: p.username, x: p.socialX, y: p.socialY, equipment: p.equipment, appearance: p.appearance 
        });
    });

    socket.on('sendSocialChat', (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.currentZone) return;

        // Securely sanitize and cap the message length
        let safeMsg = sanitizeChatMessage(data && data.message, 100);
        if (!safeMsg) return;
        
        // Broadcast strictly to the player's current room
        io.to(p.currentZone).emit('socialMessage', { sender: p.username, message: safeMsg });
    });

// --- PHASE 2: SOCIAL MOVEMENT ---
    socket.on('socialMove', (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.currentZone) return;

        // The canvas is 600x400. With 24x24 sprites, the grid is roughly 25x16.
        // Securely clamp the movement so players can't walk off the screen!
        let tx = clampInt(data && data.tx, 0, 24, p.socialX || 12);
        let ty = clampInt(data && data.ty, 0, 15, p.socialY || 12);

        p.socialX = tx;
        p.socialY = ty;

        // Broadcast the movement instantly to everyone standing in the room
        io.to(p.currentZone).emit('playerMoved', { id: socket.id, x: tx, y: ty });
    });
	
// --- PHASE 3: SECURE TRADING ENGINE ---
    
    // Internal helper to cancel an active trade securely
    function abortTrade(p1Id, p2Id, reason) {
        let p1 = activePlayers[p1Id];
        let p2 = activePlayers[p2Id];

        // Refund any items AND resources sitting in the staging escrow
        if (p1 && p1.tradeStaging) {
            p1.inventory = p1.inventory.concat(p1.tradeStaging);
            p1.gold = (p1.gold || 0) + (p1.tradeResources?.gold || 0);
            p1.wood = (p1.wood || 0) + (p1.tradeResources?.wood || 0);
            p1.fish = (p1.fish || 0) + (p1.tradeResources?.fish || 0);
            p1.hops = (p1.hops || 0) + (p1.tradeResources?.hops || 0);
            p1.tradeStaging = null; p1.tradeResources = null; p1.activeTradePartner = null;
        }
        if (p2 && p2.tradeStaging) {
            p2.inventory = p2.inventory.concat(p2.tradeStaging);
            p2.gold = (p2.gold || 0) + (p2.tradeResources?.gold || 0);
            p2.wood = (p2.wood || 0) + (p2.tradeResources?.wood || 0);
            p2.fish = (p2.fish || 0) + (p2.tradeResources?.fish || 0);
            p2.hops = (p2.hops || 0) + (p2.tradeResources?.hops || 0);
            p2.tradeStaging = null; p2.tradeResources = null; p2.activeTradePartner = null;
        }

        io.to(p1Id).emit('tradeCanceled', { reason });
        io.to(p2Id).emit('tradeCanceled', { reason });
    }

    // 1. The Handshake Request
    socket.on('requestTrade', (data) => {
        let p = activePlayers[socket.id];
        let targetId = data && typeof data.targetId === 'string' ? data.targetId : null;
        let target = targetId ? activePlayers[targetId] : null;
        if (!p || !p.username || !target || targetId === socket.id || p.activeTradePartner || target.activeTradePartner) return;
        if (!p.currentZone || p.currentZone !== target.currentZone) return;

        io.to(targetId).emit('incomingTradeRequest', { requesterId: socket.id, requesterName: p.username });
    });

    // 2. Accept & Create Escrow
    socket.on('acceptTrade', (data) => {
        let p = activePlayers[socket.id];
        let requesterId = data && typeof data.requesterId === 'string' ? data.requesterId : null;
        let requester = requesterId ? activePlayers[requesterId] : null;
        if (!p || !requester || p.activeTradePartner || requester.activeTradePartner) return;
        if (!p.currentZone || p.currentZone !== requester.currentZone) return;

        // Lock them into a session
        p.activeTradePartner = requesterId;
        requester.activeTradePartner = socket.id;
        
        // Initialize secure staging arrays and states
        p.tradeStaging = []; p.tradeResources = { gold: 0, wood: 0, fish: 0, hops: 0 }; p.tradeLocked = false; p.tradeConfirmed = false;
        requester.tradeStaging = []; requester.tradeResources = { gold: 0, wood: 0, fish: 0, hops: 0 }; requester.tradeLocked = false; requester.tradeConfirmed = false;

        io.to(socket.id).emit('tradeStarted', { partnerId: requesterId, partnerName: requester.username, myInventory: p.inventory });
        io.to(requesterId).emit('tradeStarted', { partnerId: socket.id, partnerName: p.username, myInventory: requester.inventory });
    });

    socket.on('declineTrade', (data) => {
        let requesterId = data && typeof data.requesterId === 'string' ? data.requesterId : null;
        if (requesterId && activePlayers[requesterId]) {
            io.to(requesterId).emit('zoneNotification', { message: `❌ Your trade request was declined.` });
        }
    });

// 3a. Modifying Escrow (ITEMS)
    socket.on('modifyTradeOffer', (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.activeTradePartner) return;
        let partner = activePlayers[p.activeTradePartner];
        if (!partner || !Array.isArray(p.inventory) || !Array.isArray(p.tradeStaging)) return;

        // SHATTER THE LOCKS!
        p.tradeLocked = false; p.tradeConfirmed = false;
        partner.tradeLocked = false; partner.tradeConfirmed = false;

        if (data && data.action === 'offer') {
            let index = getArrayIndex(data.index, p.inventory);
            if (index < 0) return;
            let item = p.inventory.splice(index, 1)[0];
            p.tradeStaging.push(item);
        } 
        else if (data && data.action === 'revoke') {
            let index = getArrayIndex(data.index, p.tradeStaging);
            if (index < 0) return;
            let item = p.tradeStaging.splice(index, 1)[0];
            p.inventory.push(item);
        }

        io.to(socket.id).emit('tradeUpdated', { 
            myOffer: p.tradeStaging, theirOffer: partner.tradeStaging, 
            myRes: p.tradeResources, theirRes: partner.tradeResources,
            myLock: p.tradeLocked, theirLock: partner.tradeLocked, myInventory: p.inventory 
        });
        io.to(p.activeTradePartner).emit('tradeUpdated', { 
            myOffer: partner.tradeStaging, theirOffer: p.tradeStaging, 
            myRes: partner.tradeResources, theirRes: p.tradeResources,
            myLock: partner.tradeLocked, theirLock: p.tradeLocked, myInventory: partner.inventory 
        });
    });

    // 3b. Modifying Escrow (RESOURCES)
    socket.on('modifyTradeResources', (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.activeTradePartner) return;
        let partner = activePlayers[p.activeTradePartner];
        if (!partner || !p.tradeResources || !partner.tradeResources) return;

        // SHATTER LOCKS!
        p.tradeLocked = false; p.tradeConfirmed = false;
        partner.tradeLocked = false; partner.tradeConfirmed = false;

        // Secure Refund: Put the currently offered resources back in their wallet first
        p.gold = (p.gold || 0) + p.tradeResources.gold; p.tradeResources.gold = 0;
        p.wood = (p.wood || 0) + p.tradeResources.wood; p.tradeResources.wood = 0;
        p.fish = (p.fish || 0) + p.tradeResources.fish; p.tradeResources.fish = 0;
        p.hops = (p.hops || 0) + p.tradeResources.hops; p.tradeResources.hops = 0;

        // Secure Deduction: Check limits and pull the new requested amounts
        let reqG = clampInt(data && data.gold, 0, p.gold || 0, 0);
        let reqW = clampInt(data && data.wood, 0, p.wood || 0, 0);
        let reqF = clampInt(data && data.fish, 0, p.fish || 0, 0);
        let reqH = clampInt(data && data.hops, 0, p.hops || 0, 0);

        p.gold -= reqG; p.tradeResources.gold = reqG;
        p.wood -= reqW; p.tradeResources.wood = reqW;
        p.fish -= reqF; p.tradeResources.fish = reqF;
        p.hops -= reqH; p.tradeResources.hops = reqH;

        // Blast updates
        io.to(socket.id).emit('tradeUpdated', { 
            myOffer: p.tradeStaging, theirOffer: partner.tradeStaging, 
            myRes: p.tradeResources, theirRes: partner.tradeResources,
            myLock: p.tradeLocked, theirLock: partner.tradeLocked, myInventory: p.inventory 
        });
        io.to(p.activeTradePartner).emit('tradeUpdated', { 
            myOffer: partner.tradeStaging, theirOffer: p.tradeStaging, 
            myRes: partner.tradeResources, theirRes: p.tradeResources,
            myLock: partner.tradeLocked, theirLock: p.tradeLocked, myInventory: partner.inventory 
        });
    });

    // 4. The Double Lock
    socket.on('lockTradeOffer', () => {
        let p = activePlayers[socket.id];
        if (!p || !p.activeTradePartner) return;
        let partner = activePlayers[p.activeTradePartner];
        if (!partner || !p.tradeResources || !partner.tradeResources) return;

        p.tradeLocked = !p.tradeLocked; // Toggle lock
        p.tradeConfirmed = false; // Always reset confirm if lock is toggled

        io.to(socket.id).emit('tradeUpdated', { 
            myOffer: p.tradeStaging, theirOffer: partner.tradeStaging, 
            myRes: p.tradeResources, theirRes: partner.tradeResources,
            myLock: p.tradeLocked, theirLock: partner.tradeLocked, myInventory: p.inventory 
        });
        io.to(p.activeTradePartner).emit('tradeUpdated', { 
            myOffer: partner.tradeStaging, theirOffer: p.tradeStaging, 
            myRes: partner.tradeResources, theirRes: p.tradeResources,
            myLock: partner.tradeLocked, theirLock: p.tradeLocked, myInventory: partner.inventory 
        });
    });

    // 5. The Final Execution Swap
    socket.on('confirmTradeExecution', () => {
        let p = activePlayers[socket.id];
        if (!p || !p.activeTradePartner) return;
        
        // CRITICAL FIX: Save the partner's socket ID before we wipe the state!
        let partnerSocketId = p.activeTradePartner;
        let partner = activePlayers[partnerSocketId];
        if (!partner) return;
        if (!p.tradeResources || !partner.tradeResources || !Array.isArray(p.tradeStaging) || !Array.isArray(partner.tradeStaging)) return;

        // Security check: Both MUST be locked to confirm!
        if (!p.tradeLocked || !partner.tradeLocked) return;

        p.tradeConfirmed = true;

        if (p.tradeConfirmed && partner.tradeConfirmed) {
            // THE SWAP! Staging arrays dump into the OPPOSITE player's inventory
            p.inventory = p.inventory.concat(partner.tradeStaging || []);
            partner.inventory = partner.inventory.concat(p.tradeStaging || []);

            // RESOURCE SWAP!
            p.gold = (p.gold || 0) + partner.tradeResources.gold;
            p.wood = (p.wood || 0) + partner.tradeResources.wood;
            p.fish = (p.fish || 0) + partner.tradeResources.fish;
            p.hops = (p.hops || 0) + partner.tradeResources.hops;

            partner.gold = (partner.gold || 0) + p.tradeResources.gold;
            partner.wood = (partner.wood || 0) + p.tradeResources.wood;
            partner.fish = (partner.fish || 0) + p.tradeResources.fish;
            partner.hops = (partner.hops || 0) + p.tradeResources.hops;

            // Wipe staging so abortTrade doesn't dupe them
            p.tradeStaging = null; p.tradeResources = null;
            partner.tradeStaging = null; partner.tradeResources = null;
            p.activeTradePartner = null; partner.activeTradePartner = null;

            io.to(socket.id).emit('tradeCompleted', { updatedInventory: p.inventory, updatedStats: {gold: p.gold, wood: p.wood, fish: p.fish, hops: p.hops} });
            io.to(partnerSocketId).emit('tradeCompleted', { updatedInventory: partner.inventory, updatedStats: {gold: partner.gold, wood: partner.wood, fish: partner.fish, hops: partner.hops} });
        }
    });

    socket.on('cancelTrade', () => {
        let p = activePlayers[socket.id];
        if (p && p.activeTradePartner) abortTrade(socket.id, p.activeTradePartner, "Trade was canceled.");
    });	
	

// Clean up if the player disconnects or refreshes the page entirely
    socket.on('disconnect', () => {
        let p = activePlayers[socket.id];
        
        // CRITICAL: Prevent orphaned items if they disconnect during a trade!
        if (p && p.activeTradePartner) {
            abortTrade(socket.id, p.activeTradePartner, "Trade partner disconnected.");
        }
        
        leaveCurrentZone();
    });
};
