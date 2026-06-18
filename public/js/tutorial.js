// --- NEW: TABBED GUI TUTORIAL SEQUENCE ---

let currentTutorialStep = 0;

const tutorialSequence = [
    {
        title: "Welcome to the Pub",
        text: "Your journey begins here. This is the <b>Knight</b> tab. Here you manage your stats, change your appearance, and manage your equipped gear. The grind starts with a rusty mace, but you'll be rocking Pubserker gear in no time.",
        targetState: "KNIGHT"
    },
    {
        title: "The Town Economy",
        text: "This is the <b>Town</b> tab. When you log off, make sure to set an Idle Job here so you gather resources while you sleep. You can also hire workers to automatically fill your Supply Cart with Timber, Fish, and Hops.",
        targetState: "TOWN"
    },
    {
        title: "The Tavern & Black Market",
        text: "The <b>Tavern</b> is where you spend those resources. Visit the Brewmaster to ferment combat potions, craft explosive Keg Bombs, or risk your hard-earned hops rolling for rare gear on the Black Market.",
        targetState: "MERCHANT"
    },
    {
        title: "Risk & Reward",
        text: "The <b>Adventures</b> tab is where you shed blood. Deploy to the Wilderness or dive into the Cellars. Combat is strictly turn-based. Manage your stamina wisely, watch your tactical positioning, and don't get cornered.",
        targetState: "ADVENTURES"
    },
    {
        title: "Deep Storage",
        text: "Finally, the <b>Vault</b>. Your backpack can only hold 5 items initially. Stash your valuable crafting materials and backup weapons here to keep them safe. Expanding vault capacity gets exponentially expensive, so hoard your gold!",
        targetState: "VAULT"
    }
];

function renderTutorialStep() {
    const overlay = document.getElementById("tutorial-overlay");
    const titleEl = document.getElementById("tutorial-title");
    const textEl = document.getElementById("tutorial-text");
    const btn = document.getElementById("tutorial-next-btn");

    if (!overlay || !titleEl || !textEl) return;

    let stepData = tutorialSequence[currentTutorialStep];

    // 1. Force the UI to switch tabs behind the modal so they see what they are reading about
    if (typeof setGameState === 'function') {
        setGameState(stepData.targetState);
    }

    // 2. Inject the text
    titleEl.innerText = stepData.title;
    textEl.innerHTML = stepData.text;

    // 3. Update button logic for the final step
    if (currentTutorialStep === tutorialSequence.length - 1) {
        btn.innerText = "Begin the Grind ✔️";
        btn.style.background = "#e67e22"; // Turn it orange for completion
        btn.style.borderColor = "#d35400";
    } else {
        btn.innerText = "Next ➔";
        btn.style.background = "#27ae60"; 
        btn.style.borderColor = "#3498db";
    }

    // 4. Reveal the overlay
    overlay.style.display = "block";
}

function advanceTutorial() {
    currentTutorialStep++;

    if (currentTutorialStep >= tutorialSequence.length) {
        // --- TUTORIAL COMPLETE ---
        document.getElementById("tutorial-overlay").style.display = "none";
        
        // Update the player object so the server knows they graduated
        player.tutorialCompleted = true;
        saveGame(); 
        
        // Return them to the Knight screen to actually start playing
        if (typeof setGameState === 'function') setGameState("KNIGHT");
        
        // Optional: Play a sound or drop a system log
        if (typeof logMessage === 'function') logMessage("🎉 Tutorial complete! Welcome to the Guild.");
        if (typeof playRetroSound === 'function') playRetroSound('coin');
        
    } else {
        // Move to the next screen
        renderTutorialStep();
        if (typeof playRetroSound === 'function') playRetroSound('step');
    }
}