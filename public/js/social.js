// --- js/social.js ---
// Handles all Community Square multiplayer logic, rendering, and interaction.

let currentSocialZone = null;
let playersInRoom = {};
let socialAnimationLoop = null;

// === 1. CORE ROUTING & UI ===
function joinMultiplayerZone(zoneId) {
    if (currentSocialZone === zoneId) return; 
    document.getElementById('social-view').style.display = 'grid'; 
    
    // FIX: Safely grab the bare variable without the window. prefix!
    let myName = "Unknown Knight";
    if (typeof currentUsername !== 'undefined') {
        myName = currentUsername;
    }

    socket.emit('joinZone', { zoneId: zoneId, username: myName });
}

function leaveMultiplayerZone(skipTabSwitch = false) {
    socket.emit('joinZone', { zoneId: null }); // Passing null forces a clean exit
    currentSocialZone = null;
    playersInRoom = {};
    
    let chatBox = document.getElementById('social-chat-box');
    if (chatBox) chatBox.innerHTML = '<span style="color:#7f8c8d; font-style:italic;">Disconnected from zone.</span><br>';
    
    updateSocialPlayerList();
    stopSocialRenderLoop();
    closeInspect();
    
    // Only force a UI change if we manually clicked the [Leave Zone] button!
    if (!skipTabSwitch) {
        switchTab('town-vault-view'); 
    }
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

    // --- CRITICAL PALETTE FIX: Backup the local player's appearance! ---
    let originalAppearance = JSON.parse(JSON.stringify(player.appearance));

    // 2. Loop through all players and draw their procedural avatars
    for (let id in playersInRoom) {
        let p = playersInRoom[id];
        let drawX = p.x * 24; 
        let drawY = p.y * 24;

        // --- CRITICAL PALETTE FIX: Hijack the global appearance for this render cycle! ---
        player.appearance = p.appearance;

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

    // --- CRITICAL PALETTE FIX: Restore local appearance! ---
    player.appearance = originalAppearance;
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


// === 5. SECURE TRADING MODULE ===

let activeTradeRequester = null;

function requestTradeFromInspect() {
    let targetName = document.getElementById('inspect-name').innerText;
    let targetId = Object.keys(playersInRoom).find(key => playersInRoom[key].name === targetName);
    
    if (targetId && targetId !== socket.id) {
        socket.emit('requestTrade', { targetId: targetId });
        appendChatLog(`<span style="color:#3498db; font-style:italic;">Trade request sent to ${targetName}.</span>`);
        closeInspect();
    }
}

// Format items cleanly for the lists
function drawTradeItemLine(item, index, listType) {
    if (!item) return "";
    let color = item.rarity === 'Relic' ? '#e74c3c' : item.rarity === 'Epic' ? '#9b59b6' : item.rarity === 'Rare' ? '#3498db' : '#bdc3c7';
    
    if (listType === 'inventory') {
        return `<div style="cursor:pointer; padding:2px; border-bottom:1px solid #3e3126;" onclick="socket.emit('modifyTradeOffer', {action: 'offer', index: ${index}})">➕ <span style="color:${color}">${item.name}</span></div>`;
    } else if (listType === 'myOffer') {
        return `<div style="cursor:pointer; padding:2px; border-bottom:1px solid #3e3126;" onclick="socket.emit('modifyTradeOffer', {action: 'revoke', index: ${index}})">➖ <span style="color:${color}">${item.name}</span></div>`;
    } else {
        return `<div style="padding:2px; border-bottom:1px solid #3e3126;">📦 <span style="color:${color}">${item.name}</span></div>`;
    }
}

// Handshake Listeners
socket.on('incomingTradeRequest', (data) => {
    activeTradeRequester = data.requesterId;
    document.getElementById('trade-request-name').innerText = data.requesterName;
    document.getElementById('trade-request-toast').style.display = 'block';
});

function acceptTradeRequest() {
    socket.emit('acceptTrade', { requesterId: activeTradeRequester });
    document.getElementById('trade-request-toast').style.display = 'none';
}

function declineTradeRequest() {
    socket.emit('declineTrade', { requesterId: activeTradeRequester });
    document.getElementById('trade-request-toast').style.display = 'none';
}

// UI Rendering Listeners
socket.on('tradeStarted', (data) => {
    document.getElementById('trade-escrow-window').style.display = 'flex';
    document.getElementById('trade-partner-name').innerText = data.partnerName;
    
    // Reset UI
    document.getElementById('trade-their-offer-list').innerHTML = "";
    document.getElementById('trade-my-offer-list').innerHTML = "";
    
    // Draw personal inventory
    let invHtml = "";
    data.myInventory.forEach((item, i) => invHtml += drawTradeItemLine(item, i, 'inventory'));
    document.getElementById('trade-my-inventory-list').innerHTML = invHtml;
});

function offerTradeResources() {
    socket.emit('modifyTradeResources', {
        gold: document.getElementById('trade-in-gold').value,
        wood: document.getElementById('trade-in-wood').value,
        fish: document.getElementById('trade-in-fish').value,
        hops: document.getElementById('trade-in-hops').value
    });
}

function formatResourceString(res) {
    if (!res) return "";
    let str = [];
    if (res.gold > 0) str.push(`${res.gold}g`);
    if (res.wood > 0) str.push(`<span style="color:#e67e22">${res.wood} Wood</span>`);
    if (res.fish > 0) str.push(`<span style="color:#3498db">${res.fish} Fish</span>`);
    if (res.hops > 0) str.push(`<span style="color:#2ecc71">${res.hops} Hops</span>`);
    return str.join(' | ');
}

socket.on('tradeUpdated', (data) => {
    // 1. Redraw Both Offers
    let myHtml = ""; data.myOffer.forEach((item, i) => myHtml += drawTradeItemLine(item, i, 'myOffer'));
    document.getElementById('trade-my-offer-list').innerHTML = myHtml;
    
    let theirHtml = ""; data.theirOffer.forEach((item, i) => theirHtml += drawTradeItemLine(item, i, 'theirOffer'));
    document.getElementById('trade-their-offer-list').innerHTML = theirHtml;

// Update Resource Display
    document.getElementById('trade-my-resource-display').innerHTML = formatResourceString(data.myRes);
    document.getElementById('trade-their-resource-display').innerHTML = formatResourceString(data.theirRes);

    // 2. Redraw Source Inventory
    let invHtml = ""; data.myInventory.forEach((item, i) => invHtml += drawTradeItemLine(item, i, 'inventory'));
    document.getElementById('trade-my-inventory-list').innerHTML = invHtml;

    // 3. Handle Lock UI State
    document.getElementById('trade-my-status').innerText = data.myLock ? "[🔒 LOCKED]" : "[Unlocking]";
    document.getElementById('trade-my-status').style.color = data.myLock ? "#2ecc71" : "#7f8c8d";
    
    document.getElementById('trade-partner-status').innerText = data.theirLock ? "[🔒 LOCKED]" : "[Unlocking]";
    document.getElementById('trade-partner-status').style.color = data.theirLock ? "#2ecc71" : "#7f8c8d";

    let btnLock = document.getElementById('btn-trade-lock');
    btnLock.innerText = data.myLock ? "Unlock Offer" : "🔒 Lock Offer";
    btnLock.style.background = data.myLock ? "#e67e22" : "#3498db";

    // 4. Handle Confirm Button (Only activates if BOTH are locked)
    let btnConfirm = document.getElementById('btn-trade-confirm');
    if (data.myLock && data.theirLock) {
        btnConfirm.disabled = false;
        btnConfirm.style.background = "#2ecc71";
        btnConfirm.style.cursor = "pointer";
    } else {
        btnConfirm.disabled = true;
        btnConfirm.style.background = "#7f8c8d";
        btnConfirm.style.cursor = "not-allowed";
        btnConfirm.innerText = "✅ Confirm"; // Reset text
    }
});

// Control Button Functions
function toggleTradeLock() { socket.emit('lockTradeOffer'); }
function cancelTrade() { socket.emit('cancelTrade'); }
function confirmTrade() { 
    socket.emit('confirmTradeExecution'); 
    document.getElementById('btn-trade-confirm').innerText = "Waiting...";
    document.getElementById('btn-trade-confirm').style.background = "#f1c40f";
}

// Cleanup Listeners
socket.on('tradeCanceled', (data) => {
    document.getElementById('trade-escrow-window').style.display = 'none';
    appendChatLog(`<span style="color:#e74c3c; font-style:italic;">${data.reason}</span>`);
});

socket.on('tradeCompleted', (data) => {
    document.getElementById('trade-escrow-window').style.display = 'none';
    appendChatLog(`<span style="color:#2ecc71; font-weight:bold;">Trade Completed Successfully!</span>`);
    
    // Update local state to match the new server reality
    player.inventory = data.updatedInventory;
    
    // NEW: Update resources!
    if (data.updatedStats) {
        player.gold = data.updatedStats.gold;
        player.wood = data.updatedStats.wood;
        player.fish = data.updatedStats.fish;
        player.hops = data.updatedStats.hops;
        if (typeof refreshSystemUI === 'function') refreshSystemUI();
    }
    
    if (typeof saveGame === 'function') saveGame();
});


// ==========================================================
// === GLOBAL SOCIAL HUB (PERSISTENT UI) ===
// ==========================================================

let localPMHistory = []; 
let localFriends = []; 
let localIgnored = [];
let localOnlineFriends = []; // NEW!

// Catch incoming Private Messages
socket.on('receivePM', (data) => {
    localPMHistory.push(data);
    
    let modal = document.getElementById('global-social-modal');
    if (modal && modal.style.display === 'none') {
        let btn = document.getElementById('global-social-button');
        if (btn) btn.classList.add('social-glow-alert');
        if (typeof playRetroSound === 'function') playRetroSound('click'); 
    } else {
        let content = document.getElementById('social-hub-content');
        if (content && content.innerHTML.includes("pm-target-input")) {
            switchSocialHubTab('pms'); 
        }
    }
});

// Catch Social List Updates from Server
socket.on('socialListsData', (data) => {
    localFriends = data.friends || [];
    localIgnored = data.ignored || [];
    localOnlineFriends = data.onlineFriends || []; // Catch online friends!
    
    if (document.getElementById('friends-list-container')) renderSocialList('friends');
    if (document.getElementById('ignore-list-container')) renderSocialList('ignore');
});

// --- UI Navigation Helpers ---
window.toggleSocialHub = function() {
    let modal = document.getElementById('global-social-modal');
    if (!modal) return;

    if (modal.style.display === 'none') {
        modal.style.display = 'flex';
        let btn = document.getElementById('global-social-button');
        if (btn) btn.classList.remove('social-glow-alert');
        
        switchSocialHubTab('pms'); 
        socket.emit('fetchSocialLists'); 
    } else {
        modal.style.display = 'none';
    }
};

window.switchSocialHubTab = function(tabName) {
    ['friends', 'pms', 'ignore'].forEach(tab => {
        let btn = document.getElementById(`tab-btn-${tab}`);
        if (btn) {
            btn.style.background = '#2c241d';
            btn.style.color = '#aaa';
        }
    });

    let activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.style.background = '#3a2f26';
        activeBtn.style.color = 'white';
    }

    const content = document.getElementById('social-hub-content');
    if (!content) return;

    if (tabName === 'friends') {
        content.innerHTML = `
            <div style="display:flex; gap: 4px; margin-bottom: 10px;">
                <input type="text" id="add-friend-input" placeholder="Username..." style="flex:1; padding:6px; background:#110d0a; color:white; border:1px solid #4a3b2c;">
                <button onclick="requestSocialAction('addFriend', 'add-friend-input')" style="background:#27ae60; color:white; border:none; padding:6px 12px; cursor:pointer; font-weight:bold;">➕ Add</button>
            </div>
            <div id="friends-list-container"></div>
        `;
        renderSocialList('friends');

    } else if (tabName === 'ignore') {
        content.innerHTML = `
            <div style="display:flex; gap: 4px; margin-bottom: 10px;">
                <input type="text" id="add-ignore-input" placeholder="Username..." style="flex:1; padding:6px; background:#110d0a; color:white; border:1px solid #4a3b2c;">
                <button onclick="requestSocialAction('addIgnore', 'add-ignore-input')" style="background:#c0392b; color:white; border:none; padding:6px 12px; cursor:pointer; font-weight:bold;">🚫 Block</button>
            </div>
            <div id="ignore-list-container"></div>
        `;
        renderSocialList('ignore');

    } else if (tabName === 'pms') {
        let html = `
            <div style="display:flex; gap: 4px; margin-bottom: 10px;">
                <input type="text" id="pm-target-input" placeholder="To..." style="width: 70px; padding:6px; background:#110d0a; color:white; border:1px solid #4a3b2c;">
                <input type="text" id="pm-msg-input" placeholder="Message..." style="flex:1; padding:6px; background:#110d0a; color:white; border:1px solid #4a3b2c;">
                <button onclick="sendHubPM()" style="background:#8e44ad; color:white; border:none; padding:6px 12px; cursor:pointer; font-weight:bold;">✉️ Send</button>
            </div>
        `;

        if (localPMHistory.length === 0) {
            html += `<p style="text-align: center; color: #776c62; margin-top: 20px;">No messages received.</p>`;
        } else {
            html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
            [...localPMHistory].reverse().forEach(pm => {
                let timeStr = new Date(pm.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                html += `
                <div style="background: #1a1410; padding: 6px; border-radius: 4px; border-left: 3px solid #e67e22;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                        <span style="color: #f39c12; font-weight: bold; font-size: 11px;">[${timeStr}] ${pm.from}:</span>
                        <button onclick="replyToPM('${pm.from}')" style="background: #34495e; color: white; border: none; font-size: 10px; padding: 3px 6px; border-radius: 3px; cursor: pointer;">↩ Reply</button>
                    </div>
                    <span style="color: #ddd; word-wrap: break-word;">${pm.message}</span>
                </div>`;
            });
            html += `</div>`;
        }
        content.innerHTML = html;
    }
};

window.renderSocialList = function(type) {
    let container = document.getElementById(`${type}-list-container`);
    if (!container) return;
    
    let list = type === 'friends' ? localFriends : localIgnored;
    
    if (list.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #776c62; margin-top: 20px;">List is empty.</p>`;
        return;
    }

    let html = `<div style="display: flex; flex-direction: column; gap: 4px;">`;
    list.forEach(name => {
        if (type === 'friends') {
            let isOnline = localOnlineFriends.includes(name);
            let statusColor = isOnline ? '#2ecc71' : '#7f8c8d'; // Green for online, Gray for offline
            let statusText = isOnline ? 'Online' : 'Offline';

            html += `
            <div style="background: #110d0a; padding: 6px 10px; border-radius: 4px; display:flex; justify-content:space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: ${statusColor}; font-size: 10px;" title="${statusText}">●</span>
                    <span>${name}</span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button onclick="replyToPM('${name}')" style="background:#34495e; border:none; color:white; padding: 2px 6px; border-radius: 3px; cursor:pointer;" title="Send Message">✉️</button>
                    <button onclick="requestSocialAction('removeFriend', null, '${name}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;" title="Remove Friend">✖</button>
                </div>
            </div>`;
        } else {
            html += `
            <div style="background: #110d0a; padding: 6px 10px; border-radius: 4px; display:flex; justify-content:space-between; align-items: center;">
                <span>🚫 ${name}</span>
                <button onclick="requestSocialAction('removeIgnore', null, '${name}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;">✖</button>
            </div>`;
        }
    });
    html += `</div>`;
    container.innerHTML = html;
};

// --- Action Emitters ---
window.requestSocialAction = function(actionType, inputId, directTarget = null) {
    let target = directTarget;
    if (inputId) {
        let inputEl = document.getElementById(inputId);
        if (inputEl) { target = inputEl.value.trim(); inputEl.value = ""; }
    }
    if (target) socket.emit('manageSocialList', { action: actionType, target: target });
};

window.sendHubPM = function() {
    let target = document.getElementById('pm-target-input').value.trim();
    let msg = document.getElementById('pm-msg-input').value.trim();
    if (target && msg) {
        socket.emit('sendPrivateMessage', { target: target, message: msg });
        document.getElementById('pm-msg-input').value = ""; 

        // THE FIX: Push to our local history so we can see what we sent!
        localPMHistory.push({ from: `You (to ${target})`, message: msg, timestamp: Date.now() });
        switchSocialHubTab('pms'); 
    }
};

window.replyToPM = function(senderName) {
    // THE FIX: Ensure we switch to the Messages tab FIRST so the HTML inputs exist!
    switchSocialHubTab('pms');

    let targetInput = document.getElementById('pm-target-input');
    let msgInput = document.getElementById('pm-msg-input');
    if (targetInput && msgInput) {
        targetInput.value = senderName;
        msgInput.focus();
    }
};

window.replyToPM = function(senderName) {
    let targetInput = document.getElementById('pm-target-input');
    let msgInput = document.getElementById('pm-msg-input');
    if (targetInput && msgInput) {
        targetInput.value = senderName;
        msgInput.focus();
    }
};