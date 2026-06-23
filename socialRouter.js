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

        // Refund any items sitting in the staging escrow back to original inventories
        if (p1 && p1.tradeStaging) {
            p1.inventory = p1.inventory.concat(p1.tradeStaging);
            p1.tradeStaging = null;
            p1.activeTradePartner = null;
        }
        if (p2 && p2.tradeStaging) {
            p2.inventory = p2.inventory.concat(p2.tradeStaging);
            p2.tradeStaging = null;
            p2.activeTradePartner = null;
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
        p.tradeStaging = []; p.tradeLocked = false; p.tradeConfirmed = false;
        requester.tradeStaging = []; requester.tradeLocked = false; requester.tradeConfirmed = false;

        io.to(socket.id).emit('tradeStarted', { partnerId: data.requesterId, partnerName: requester.username, myInventory: p.inventory });
        io.to(data.requesterId).emit('tradeStarted', { partnerId: socket.id, partnerName: p.username, myInventory: requester.inventory });
    });

    socket.on('declineTrade', (data) => {
        io.to(data.requesterId).emit('zoneNotification', { message: `❌ Your trade request was declined.` });
    });

    // 3. Modifying the Escrow (Moving items to/from staging)
    socket.on('modifyTradeOffer', (data) => {
        let p = activePlayers[socket.id];
        if (!p || !p.activeTradePartner) return;
        let partner = activePlayers[p.activeTradePartner];

        // SHATTER THE LOCKS! If anyone changes anything, safety locks drop instantly.
        p.tradeLocked = false; p.tradeConfirmed = false;
        partner.tradeLocked = false; partner.tradeConfirmed = false;

        if (data.action === 'offer' && p.inventory[data.index]) {
            // Securely move item from inventory to staging array
            let item = p.inventory.splice(data.index, 1)[0];
            p.tradeStaging.push(item);
        } 
        else if (data.action === 'revoke' && p.tradeStaging[data.index]) {
            // Securely move item from staging back to inventory
            let item = p.tradeStaging.splice(data.index, 1)[0];
            p.inventory.push(item);
        }

        // Blast the new synchronized state to both players
        io.to(socket.id).emit('tradeUpdated', { 
            myOffer: p.tradeStaging, theirOffer: partner.tradeStaging, 
            myLock: p.tradeLocked, theirLock: partner.tradeLocked, myInventory: p.inventory 
        });
        io.to(p.activeTradePartner).emit('tradeUpdated', { 
            myOffer: partner.tradeStaging, theirOffer: p.tradeStaging, 
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

        io.to(socket.id).emit('tradeUpdated', { myOffer: p.tradeStaging, theirOffer: partner.tradeStaging, myLock: p.tradeLocked, theirLock: partner.tradeLocked, myInventory: p.inventory });
        io.to(p.activeTradePartner).emit('tradeUpdated', { myOffer: partner.tradeStaging, theirOffer: p.tradeStaging, myLock: partner.tradeLocked, theirLock: p.tradeLocked, myInventory: partner.inventory });
    });

    // 5. The Final Execution Swap
    socket.on('confirmTradeExecution', () => {
        let p = activePlayers[socket.id];
        if (!p || !p.activeTradePartner) return;
        let partner = activePlayers[p.activeTradePartner];

        // Security check: Both MUST be locked to confirm!
        if (!p.tradeLocked || !partner.tradeLocked) return;

        p.tradeConfirmed = true;

        if (p.tradeConfirmed && partner.tradeConfirmed) {
            // THE SWAP! Staging arrays dump into the OPPOSITE player's inventory
            p.inventory = p.inventory.concat(partner.tradeStaging);
            partner.inventory = partner.inventory.concat(p.tradeStaging);

            // Wipe staging so abortTrade doesn't dupe them
            p.tradeStaging = null; partner.tradeStaging = null;
            p.activeTradePartner = null; partner.activeTradePartner = null;

            io.to(socket.id).emit('tradeCompleted', { updatedInventory: p.inventory });
            io.to(partner.id).emit('tradeCompleted', { updatedInventory: partner.inventory });
        }
    });

    socket.on('cancelTrade', () => {
        let p = activePlayers[socket.id];
        if (p && p.activeTradePartner) abortTrade(socket.id, p.activeTradePartner, "Trade was canceled.");
    });	
	

    // Clean up if the player disconnects or refreshes the page entirely
    socket.on('disconnect', () => {
        leaveCurrentZone();
    });
};