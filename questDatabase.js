// questDatabase.js
module.exports = {
    // ==========================================
    // PART 1: THE COMBAT ONBOARDING
    // Triggered upon new account creation
    // ==========================================
module.exports = {
    "tutorial_combat_intro": [
        // 1. Blackout the screen immediately upon login
        { type: "FADE", direction: "OUT", duration: 500, color: "#000000" },
        
        // 2. Force the client to load the Tutorial map in the background
        { type: "SET_SCENE", zone: "TUTORIAL" },
        { type: "DELAY", duration: 800 }, // Give the server a moment to build the map
        
        // 3. Fade back in to reveal the combat board
        { type: "FADE", direction: "IN", duration: 500, color: "#000000" },
        
        // 4. The Arrival & Pass Turn
        { type: "DIALOGUE", sequence: [
            { speaker: "PLAYER", text: "Phew... all this traveling got me beat.", portraitId: "player" },
            { speaker: "Kreg", text: "Click the orange ⌛ PASS TURN button below to catch your breath and recover Stamina!", portraitId: "npc_kreg" }
        ]},
        { type: "HIGHLIGHT_UI", elementId: "end-btn" },
        { type: "DELAY", duration: 500 },

        // 2. Drinking the Stout
        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "Great! Now open your 🎒 BACKPACK and click the 🍺 STOUT to heal!", portraitId: "npc_kreg" }
        ]},
        { type: "HIGHLIGHT_UI", elementId: "combat-bag-btn" }, // Simulating opening bag
        { type: "HIGHLIGHT_UI", elementId: "inventory-slot-0" }, // Simulating clicking stout
        { type: "DELAY", duration: 800 },

        // 3. First Publing (Movement & Attack)
        { type: "SPAWN_ACTOR", actorId: "npc_publing", uid: "mob_tut_1", x: 2, y: 0 },
        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "A Wild Publing appeared! Click the green tile to move close, then use Standard Attack!", portraitId: "npc_kreg" }
        ]},
        { type: "HIGHLIGHT_TILE", targetX: 1, targetY: 1, style: "GOAL" },
        { type: "HIGHLIGHT_UI", elementId: "slash-btn" },
        { type: "PLAY_FX", fxType: "MELEE", startX: 1, startY: 1, targetX: 2, targetY: 0 },
        { type: "DELAY", duration: 1000 },

        // 4. The Bomb & Swarm
        { type: "SPAWN_ACTOR", actorId: "npc_publing", uid: "mob_tut_2", x: 1, y: 0 },
        { type: "SPAWN_ACTOR", actorId: "npc_publing", uid: "mob_tut_3", x: 2, y: 0 },
        { type: "SPAWN_ACTOR", actorId: "npc_publing", uid: "mob_tut_4", x: 3, y: 0 },
        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "Three more! Click a tile to back away, then open your Backpack and use the 💣 HEAVY KEG BOMB!", portraitId: "npc_kreg" }
        ]},
        { type: "HIGHLIGHT_TILE", targetX: 1, targetY: 3, style: "GOAL" },
        { type: "HIGHLIGHT_UI", elementId: "inventory-slot-1" }, // Bomb slot
        { type: "HIGHLIGHT_TILE", targetX: 2, targetY: 0, style: "AIM" }, // Aiming the bomb
        { type: "PLAY_FX", fxType: "EXPLOSION", startX: 1, startY: 3, targetX: 2, targetY: 0 },
        { type: "DELAY", duration: 1500 },

        // 5. The Boss Ambush
        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "Whoa, look at the size of that gem they dropped! Click it to stash it!", portraitId: "npc_kreg" }
        ]},
        { type: "HIGHLIGHT_UI", elementId: "loot-take-btn" },
        { type: "SHAKE" },
        { type: "SPAWN_ACTOR", actorId: "npc_overlord", uid: "mob_tut_boss", x: 1, y: 0 },
        { type: "AUDIO", action: "PLAY", trackName: "DOOM OF THE OVERLORD" },
        { type: "DIALOGUE", sequence: [
            { speaker: "Overlord", text: "FOOLISH MORTAL... YOU DARE TOUCH MY GEMS?", portraitId: "wilderness_overlord" },
            { speaker: "Kreg", text: "Oh no... It's the Overlord! Try to hit it, run, do something!!", portraitId: "npc_kreg" }
        ]},
        
        // Unlocks the screen and lets the player fight (and die) normally
        { type: "END_SCENE", action: "START_COMBAT" } 
    ],

    // ==========================================
    // PART 2: THE REBIRTH
    // Triggered when combatRouter detects a tutorial_death
    // ==========================================
    "tutorial_post_death": [
        { type: "FADE", direction: "IN", duration: 2000, color: "#000000" },
        { type: "AUDIO", action: "PLAY", trackName: "Tavern Loop" },
        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "Whoa there, buddy! You got absolutely clobbered out in the Wilds.", portraitId: "npc_kreg" },
            { speaker: "Kreg", text: "When you fall in combat, you drop all the unbanked loot you were carrying. That shiny gem? Gone.", portraitId: "npc_kreg" },
            { speaker: "Kreg", text: "Even worse, your gear was destroyed. I managed to scrounge up this Rusty Mace for you.", portraitId: "npc_kreg" },
            { speaker: "Kreg", text: "I'm Kreg. My mom meant to name me Craig, but spelling is hard. Welcome to the Guild!", portraitId: "npc_kreg" },
            { speaker: "Kreg", text: "Gather resources, upgrade the town, and trade for gear here. Get stronger, then go get your revenge!", portraitId: "npc_kreg" }
        ]},
        { type: "END_SCENE", action: "RETURN_TOWN" }
    ]
};