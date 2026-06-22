// --- js/social.js ---
// Handles all Community Square multiplayer logic, rendering, and interaction.

let currentSocialZone = null;
let playersInRoom = {};
let socialAnimationLoop = null;

// === 1. CORE ROUTING & UI ===
function joinMultiplayerZone(zoneId) {
    if (currentSocialZone === zoneId) return; 
    document.getElementById('social-view').style.display = 'grid'; 
    socket.emit('joinZone', { zoneId: zoneId });
}

function leaveMultiplayerZone() {
    socket.emit('joinZone', { zoneId: null }); 
    currentSocialZone = null;
    playersInRoom = {};
    document.getElementById('social-chat-box').innerHTML = '<span style="color:#7f8c8d; font-style:italic;">Disconnected from zone.</span><br>';
    updateSocialPlayerList();
    stopSocialRenderLoop();
    closeInspect();
    switchTab('town-vault-view'); 
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
    box.scrollTop = box.scrollHeight; 
}

function updateSocialPlayerList() {
    const list = document.getElementById('social-player-list');
    const count = document.getElementById('social-player-count');
    let keys = Object.keys(playersInRoom);
    count.innerText = keys.length;
    list.innerHTML = '';
    keys.forEach(id => {
        let p = playersInRoom[id];
        let color = id === socket.id ? '#f1c40f' : '#bdc3c7'; // Gold for self
        list.innerHTML += `<div style="padding: 3px 0; border-bottom: 1px solid #3e3126; cursor: pointer;" onclick="forceInspect('${id}')">
            <span style="color: ${color};">${p.name}</span>
        </div>`;
    });
}

// === 2. CANVAS RENDERER ===
function startSocialRenderLoop() {
    if (socialAnimationLoop) cancelAnimationFrame(socialAnimationLoop);
    function loop() {
        renderSocialZone();
        socialAnimationLoop = requestAnimationFrame(loop);
    }
    loop();
}

function stopSocialRenderLoop() {
    if (socialAnimationLoop) cancelAnimationFrame(socialAnimationLoop);
}

function renderSocialZone() {
    const canvas = document.getElementById('social-canvas');
    if (!canvas || !currentSocialZone) return;
    const ctx = canvas.getContext('2d');

    // 1. Draw Map Background (Central Hub Dark Stone)
    ctx.fillStyle = PALETTE['3'] || '#2a221f'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Loop through all players and draw their procedural avatars
    for (let id in playersInRoom) {
        let p = playersInRoom[id];
        let drawX = p.x * 24; 
        let drawY = p.y * 24;

        // Base Anatomy
        let bodySprite = p.appearance.gender === 'female' ? 'body_female' : 'body_male';
        if (SpriteMatrices[bodySprite]) drawProceduralSprite(ctx, SpriteMatrices[bodySprite], drawX, drawY, 24);
        if (SpriteMatrices[p.appearance.eyes]) drawProceduralSprite(ctx, SpriteMatrices[p.appearance.eyes], drawX, drawY, 24);
        
        let hidesHair = p.equipment.helmet && p.equipment.helmet.hidesHair;
        if (!hidesHair && SpriteMatrices[p.appearance.hair]) drawProceduralSprite(ctx, SpriteMatrices[p.appearance.hair], drawX, drawY, 24);

        // Equipment Layers
        let gSuffix = p.appearance.gender === 'female' ? '_female' : '_male';
        if (p.equipment.armor && p.equipment.armor.spriteId) {
            let sId = p.equipment.armor.spriteId + gSuffix;
            if (SpriteMatrices[sId]) drawProceduralSprite(ctx, SpriteMatrices[sId], drawX, drawY, 24);
            else if (SpriteMatrices[p.equipment.armor.spriteId]) drawProceduralSprite(ctx, SpriteMatrices[p.equipment.armor.spriteId], drawX, drawY, 24);
        }
        
        if (p.equipment.boots && p.equipment.boots.spriteId) drawProceduralSprite(ctx, SpriteMatrices[p.equipment.boots.spriteId], drawX, drawY, 24);
        if (p.equipment.gloves && p.equipment.gloves.spriteId) drawProceduralSprite(ctx, SpriteMatrices[p.equipment.gloves.spriteId], drawX, drawY, 24);
        if (p.equipment.helmet && p.equipment.helmet.spriteId) drawProceduralSprite(ctx, SpriteMatrices[p.equipment.helmet.spriteId], drawX, drawY, 24);
        
        // Weapon with Pivot scaling
        if (p.equipment.weapon && p.equipment.weapon.spriteId) {
            ctx.save();
            let wPivotX = drawX + (24 * 0.58);
            let wPivotY = drawY + (24 * 0.5); 
            ctx.translate(wPivotX, wPivotY);
            let scaleMult = p.equipment.weapon.oversizeScale || 1.0;
            ctx.scale(scaleMult, scaleMult);
            ctx.translate(-wPivotX, -wPivotY);
            drawProceduralSprite(ctx, SpriteMatrices[p.equipment.weapon.spriteId], drawX, drawY, 24);
            ctx.restore();
        }

        // Draw Player Nameplate
        ctx.fillStyle = id === socket.id ? '#f1c40f' : '#f4ebd9';
        ctx.font = "bold 10px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(p.name, drawX + 12, drawY - 4);
    }
}

// === 3. INPUT (MOVEMENT & INSPECTION) ===
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('social-canvas').addEventListener('mousedown', (e) => {
        if (!currentSocialZone) return;
        
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        
        // Ensure scale is correct regardless of CSS sizing
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // Convert raw pixels to grid coordinates (24x24 tiles)
        const gridX = Math.floor(clickX / 24);
        const gridY = Math.floor(clickY / 24);

        // Check if we clicked on another player
        let clickedPlayerId = null;
        for (let id in playersInRoom) {
            if (playersInRoom[id].x === gridX && playersInRoom[id].y === gridY) {
                clickedPlayerId = id; break;
            }
        }

        if (clickedPlayerId) {
            forceInspect(clickedPlayerId);
        } else {
            // Clicked empty ground -> Walk there!
            socket.emit('socialMove', { tx: gridX, ty: gridY });
            closeInspect();
        }
    });
});

function forceInspect(playerId) {
    let p = playersInRoom[playerId];
    if (!p) return;
    
    document.getElementById('inspect-name').innerText = p.name;
    
    let html = "";
    const slots = ['weapon', 'helmet', 'armor', 'gloves', 'boots'];
    slots.forEach(slot => {
        let item = p.equipment[slot];
        if (item) {
            let color = item.rarity === 'Relic' ? '#e74c3c' : item.rarity === 'Epic' ? '#9b59b6' : '#3498db';
            html += `<b>${slot.charAt(0).toUpperCase() + slot.slice(1)}:</b> <span style="color:${color}">${item.name}</span><br>`;
        } else {
            html += `<b>${slot.charAt(0).toUpperCase() + slot.slice(1)}:</b> <span style="color:#7f8c8d">None</span><br>`;
        }
    });
    
    document.getElementById('inspect-gear-list').innerHTML = html;
    document.getElementById('social-inspect-panel').style.display = 'block';
}

function closeInspect() {
    document.getElementById('social-inspect-panel').style.display = 'none';
}

// === 4. SOCKET LISTENERS ===
socket.on('zoneJoined', (data) => {
    currentSocialZone = data.zoneId;
    playersInRoom = {};
    data.players.forEach(p => playersInRoom[p.id] = p);
    
    document.getElementById('social-chat-box').innerHTML = `<span style="color:#2ecc71; font-weight:bold;">Welcome to the ${data.zoneId}!</span><br>`;
    updateSocialPlayerList();
    startSocialRenderLoop(); // Boot up the rendering engine!
});

socket.on('playerJoinedZone', (playerData) => {
    playersInRoom[playerData.id] = playerData;
    updateSocialPlayerList();
});

socket.on('playerLeftZone', (data) => {
    delete playersInRoom[data.id];
    updateSocialPlayerList();
});

// NEW: Catch movement and update coordinates!
socket.on('playerMoved', (data) => {
    if (playersInRoom[data.id]) {
        playersInRoom[data.id].x = data.x;
        playersInRoom[data.id].y = data.y;
    }
});

socket.on('zoneNotification', (data) => {
    appendChatLog(`<span style="color:#bdc3c7; font-style:italic;">${data.message}</span>`);
});

socket.on('socialMessage', (data) => {
    appendChatLog(`<b style="color:#f1c40f;">[${data.sender}]:</b> <span style="color:#f4ebd9;">${data.message}</span>`);
});