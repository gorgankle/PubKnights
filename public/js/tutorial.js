// --- NEW: TABBED GUI TUTORIAL SEQUENCE ---

let currentTutorialStep = 0;

const tutorialSequence = [
    {
        title: "🛡️ The Knight",
        text: "Your journey begins here. Equip gear, monitor your combat stats, and level up.<br><br><i>Goal: Replace that rusty mace with proper Pubserker gear.</i>",
        targetState: "KNIGHT"
    },
    {
        title: "🏕️ The Town",
        text: "The engine of your economy. Set an <b>Idle Job</b> here before logging off to gather resources while you sleep.<br><br><i>Tip: Hire workers later to automate gathering.</i>",
        targetState: "TOWN"
    },
    {
        title: "🍻 The Tavern",
        text: "Spend your resources here. The Brewmaster ferments combat potions, and the Provisioner crafts Keg Bombs.<br><br><i>Warning: Black Market gear is powerful, but costs heavy Hops.</i>",
        targetState: "MERCHANT"
    },
    {
        title: "⚔️ Adventures",
        text: "Deploy to the grid. Combat is strictly turn-based. Manage your stamina wisely, strike hard, and don't get cornered.<br><br><i>Goal: Defeat the Level 20 Wilderness Boss to unlock the Cellars.</i>",
        targetState: "ADVENTURES"
    },
    {
        title: "🏦 The Vault",
        text: "Your backpack only holds 5 items. Stash excess gear and crafting materials here to keep them safe.<br><br><i>Note: Expanding vault slots gets exponentially expensive.</i>",
        targetState: "VAULT"
    }
];

function renderTutorialStep() {
	const overlay = document.getElementById("tutorial-wrapper");
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
    document.getElementById("tutorial-wrapper").style.display = "none";
        
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