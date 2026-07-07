/// --- LOGIN & UI ROUTING ---

let currentUsername = "";

function enterGameUI() {
    // Hide both initial screens, show main wrapper
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('char-creation-screen').style.display = 'none';
    document.getElementById('main-game-container').style.display = 'flex';
    
    // Force the default UI tab and ensure the player starts healing immediately
    gameState = 'KNIGHT';
    player.idleJob = 'TAVERN';
    
    // Kick off the initial UI render now that the engine is active
    refreshSystemUI();
}

function attemptLogin() {
    const username = document.getElementById("char-name-input").value.trim();
    const password = document.getElementById("char-pass-input").value.trim();
    
    if (!username || !password) {
        alert("Please enter both a Knight Name and Password.");
        return; 
    }
    
    // Ask the server to verify our credentials in MongoDB
    socket.emit('login', { username, password });
}

function startNewGame() {
    const username = document.getElementById("char-name-input").value.trim();
    const password = document.getElementById("char-pass-input").value.trim();
    
    if (!username || !password) {
        alert("Please enter both a Knight Name and Password to register.");
        return;
    }
    // Ask the server to create a new profile
    socket.emit('register', { username, password });
}

// Triggered after the player finishes customizing
function finalizeCharacter() {
    if (typeof saveGame === 'function') saveGame(true); 
    
    // Default to the normal Town UI, which flips display: flex
    enterGameUI();
    
    // Give the browser 100ms to paint the DOM before starting the movie
    setTimeout(() => {
        socket.emit('checkQuestTriggers', { triggerType: 'LOGIN' });
    }, 100);
}

// === SOCKET LISTENERS (Catching Server Responses) ===

socket.on('loginError', (message) => {
    alert(message); // Pop up the error from the server
});

socket.on('registerSuccess', () => {
    // Save the username they just registered with
    currentUsername = document.getElementById("char-name-input").value.trim();
    
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('char-creation-screen').style.display = 'block';
    
    if (typeof renderPaperDoll === 'function') renderPaperDoll(true);
});

socket.on('loginSuccess', (serverSaveData) => {
    currentUsername = document.getElementById("char-name-input").value.trim();
    Object.assign(player, serverSaveData);
    
    // Default to the normal Town UI
    enterGameUI();

    // Give the browser 100ms to paint the DOM before starting the movie
    setTimeout(() => {
        socket.emit('checkQuestTriggers', { triggerType: 'LOGIN' });
    }, 100);
});