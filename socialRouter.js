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

    // Clean up if the player disconnects or refreshes the page entirely
    socket.on('disconnect', () => {
        leaveCurrentZone();
    });
};