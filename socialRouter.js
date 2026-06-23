// --- socialRouter.js ---
// Handles all Community Square logic: Zone instancing, chat, and movement.

module.exports = function(socket, io, activePlayers) {

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
        if (!p) return;
		
		// NEW: Grab the username directly from the client's packet!
        if (data.username) p.username = data.username;

        // 1. Leave any existing zone first
        leaveCurrentZone();

        // 2. Assign the new zone and default spawn coordinates
        let zoneId = data.zoneId;
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
        let safeMsg = data.message.substring(0, 100);
        
        // Broadcast strictly to the player's current room
        io.to(p.currentZone).emit('socialMessage', { sender: p.username, message: safeMsg });
    });

// --- PHASE 2: SOCIAL MOVEMENT ---
    socket.on('socialMove', (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.currentZone) return;

        // The canvas is 600x400. With 24x24 sprites, the grid is roughly 25x16.
        // Securely clamp the movement so players can't walk off the screen!
        let tx = Math.max(0, Math.min(24, data.tx));
        let ty = Math.max(0, Math.min(15, data.ty));

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
        let target = activePlayers[data.targetId];
        if (!p || !target || target.activeTradePartner) return;

        io.to(data.targetId).emit('incomingTradeRequest', { requesterId: socket.id, requesterName: p.username });
    });

    // 2. Accept & Create Escrow
    socket.on('acceptTrade', (data) => {
        let p = activePlayers[socket.id];
        let requester = activePlayers[data.requesterId];
        if (!p || !requester || p.activeTradePartner || requester.activeTradePartner) return;

        // Lock them into a session
        p.activeTradePartner = data.requesterId;
        requester.activeTradePartner = socket.id;
        
        // Initialize secure staging arrays and states
        p.tradeStaging = []; p.tradeResources = { gold: 0, wood: 0, fish: 0, hops: 0 }; p.tradeLocked = false; p.tradeConfirmed = false;
        requester.tradeStaging = []; requester.tradeResources = { gold: 0, wood: 0, fish: 0, hops: 0 }; requester.tradeLocked = false; requester.tradeConfirmed = false;

        io.to(socket.id).emit('tradeStarted', { partnerId: data.requesterId, partnerName: requester.username, myInventory: p.inventory });
        io.to(data.requesterId).emit('tradeStarted', { partnerId: socket.id, partnerName: p.username, myInventory: requester.inventory });
    });

    socket.on('declineTrade', (data) => {
        io.to(data.requesterId).emit('zoneNotification', { message: `❌ Your trade request was declined.` });
    });

// 3a. Modifying Escrow (ITEMS)
    socket.on('modifyTradeOffer', (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.activeTradePartner) return;
        let partner = activePlayers[p.activeTradePartner];

        // SHATTER THE LOCKS!
        p.tradeLocked = false; p.tradeConfirmed = false;
        partner.tradeLocked = false; partner.tradeConfirmed = false;

        if (data.action === 'offer' && p.inventory[data.index]) {
            let item = p.inventory.splice(data.index, 1)[0];
            p.tradeStaging.push(item);
        } 
        else if (data.action === 'revoke' && p.tradeStaging[data.index]) {
            let item = p.tradeStaging.splice(data.index, 1)[0];
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

        // SHATTER LOCKS!
        p.tradeLocked = false; p.tradeConfirmed = false;
        partner.tradeLocked = false; partner.tradeConfirmed = false;

        // Secure Refund: Put the currently offered resources back in their wallet first
        p.gold = (p.gold || 0) + p.tradeResources.gold; p.tradeResources.gold = 0;
        p.wood = (p.wood || 0) + p.tradeResources.wood; p.tradeResources.wood = 0;
        p.fish = (p.fish || 0) + p.tradeResources.fish; p.tradeResources.fish = 0;
        p.hops = (p.hops || 0) + p.tradeResources.hops; p.tradeResources.hops = 0;

        // Secure Deduction: Check limits and pull the new requested amounts
        let reqG = Math.max(0, Math.min(p.gold, parseInt(data.gold) || 0));
        let reqW = Math.max(0, Math.min(p.wood, parseInt(data.wood) || 0));
        let reqF = Math.max(0, Math.min(p.fish, parseInt(data.fish) || 0));
        let reqH = Math.max(0, Math.min(p.hops, parseInt(data.hops) || 0));

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
	

    /// Clean up if the player disconnects or refreshes the page entirely
    socket.on('disconnect', () => {
        let p = activePlayers[socket.id];
        
        // CRITICAL: Prevent orphaned items if they disconnect during a trade!
        if (p && p.activeTradePartner) {
            abortTrade(socket.id, p.activeTradePartner, "Trade partner disconnected.");
        }
        
        leaveCurrentZone();
    });