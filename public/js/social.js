// --- js/social.js ---
// Handles all Community Square multiplayer logic for the client.

let currentSocialZone = null;
let playersInRoom = {};

function joinMultiplayerZone(zoneId) {
    // If we're already here, don't rejoin
    if (currentSocialZone === zoneId) return; 
    
    document.getElementById('social-view').style.display = 'grid'; // Enable the split layout
    socket.emit('joinZone', { zoneId: zoneId });
}

function leaveMultiplayerZone() {
    socket.emit('joinZone', { zoneId: null }); // Passing null forces a clean exit
    currentSocialZone = null;
    playersInRoom = {};
    document.getElementById('social-chat-box').innerHTML = '<span style="color:#7f8c8d; font-style:italic;">Disconnected from zone.</span><br>';
    updateSocialPlayerList();
    switchTab('town-vault-view'); // Kick them back to their private town
}

function sendSocialChat() {
    const input = document.getElementById('social-chat-input');
    const msg = input.value.trim();
    if (msg.length > 0) {
        socket.emit('sendSocialChat', { message: msg });
        input.value = '';
    }
}

function appendChatLog(htmlString) {
    const box = document.getElementById('social-chat-box');
    box.innerHTML += htmlString + '<br>';
    box.scrollTop = box.scrollHeight; // Auto-scroll to bottom
}

function updateSocialPlayerList() {
    const list = document.getElementById('social-player-list');
    const count = document.getElementById('social-player-count');
    
    let keys = Object.keys(playersInRoom);
    count.innerText = keys.length;
    
    list.innerHTML = '';
    keys.forEach(id => {
        let p = playersInRoom[id];
        list.innerHTML += `<div style="padding: 3px 0; border-bottom: 1px solid #3e3126;">
            <span style="color: #f1c40f;">${p.name}</span>
        </div>`;
    });
}

// === SOCKET LISTENERS ===
socket.on('zoneJoined', (data) => {
    currentSocialZone = data.zoneId;
    playersInRoom = {};
    
    // Load all current players into client memory
    data.players.forEach(p => playersInRoom[p.id] = p);
    
    document.getElementById('social-chat-box').innerHTML = `<span style="color:#2ecc71; font-weight:bold;">Welcome to the ${data.zoneId}!</span><br>`;
    updateSocialPlayerList();
});

socket.on('playerJoinedZone', (playerData) => {
    playersInRoom[playerData.id] = playerData;
    updateSocialPlayerList();
});

socket.on('playerLeftZone', (data) => {
    delete playersInRoom[data.id];
    updateSocialPlayerList();
});

socket.on('zoneNotification', (data) => {
    appendChatLog(`<span style="color:#bdc3c7; font-style:italic;">${data.message}</span>`);
});

socket.on('socialMessage', (data) => {
    appendChatLog(`<b style="color:#f1c40f;">[${data.sender}]:</b> <span style="color:#f4ebd9;">${data.message}</span>`);
});