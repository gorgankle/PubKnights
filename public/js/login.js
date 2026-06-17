/// --- LOGIN & UI ROUTING ---

let currentUsername = "";

function enterGameUI() {
    // Hide both initial screens, show main wrapper
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('char-creation-screen').style.display = 'none';
    document.getElementById('main-game-container').style.display = 'flex';
    
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
    // 1. Save the new appearance settings to the database
    if (typeof saveGame === 'function') saveGame(true); 
    
    // 2. Transition from the Character Creator screen to the Main Game UI
    enterGameUI();
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
    // Save the username they just logged in with
    currentUsername = document.getElementById("char-name-input").value.trim();
    
    // Merge the database save over our local variables
    Object.assign(player, serverSaveData);
    enterGameUI();
});