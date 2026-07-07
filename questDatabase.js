module.exports = {
    "tutorial_combat_intro": [
        { type: "FADE", direction: "OUT", duration: 500, color: "#000000" },
        
        // Build the fake movie set
        { type: "SET_SCENE", zone: "WILDERNESS", cols: 16, rows: 10, tileSize: 54 },
        { type: "DELAY", duration: 800 },
        { type: "FADE", direction: "IN", duration: 500, color: "#000000" },
        
        // Spawn the visual actor representing the player
        { type: "SPAWN_ACTOR", actorId: "player", uid: "fake_player", x: 1, y: 4 },
        
        { type: "DIALOGUE", sequence: [
            { speaker: "PLAYER", text: "Phew... all this traveling got me beat.", portraitId: "player" },
            { speaker: "Kreg", text: "Click the orange ⌛ PASS TURN button below to catch your breath and recover Stamina!", portraitId: "npc_kreg" }
        ]},
        { type: "HIGHLIGHT_UI", elementId: "end-btn" },
        { type: "DELAY", duration: 500 },

        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "Great! Now open your 🎒 BACKPACK and use the 🍺 STOUT to heal!", portraitId: "npc_kreg" }
        ]},
        // Highlight the UI for the player to follow along with the "Movie"
        { type: "HIGHLIGHT_UI", elementId: "combat-inventory-list" }, 
        { type: "HIGHLIGHT_UI", elementId: "combat-modal-grid" }, 
        { type: "DELAY", duration: 800 },

        { type: "SPAWN_ACTOR", actorId: "publing", uid: "mob_tut_1", x: 7, y: 5 },
        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "A Wild Publing appeared! Click the green tile to move close, then use Standard Attack!", portraitId: "npc_kreg" }
        ]},
        
        // Visual ghost clicks
        { type: "HIGHLIGHT_TILE", targetX: 6, targetY: 5, style: "GOAL" },
        { type: "HIGHLIGHT_UI", elementId: "slash-btn" },
        { type: "PLAY_FX", fxType: "MELEE", startX: 6, startY: 5, targetX: 7, targetY: 5 },
        { type: "DELAY", duration: 1000 },
        { type: "DESPAWN_ACTOR", uid: "mob_tut_1" },

        { type: "SPAWN_ACTOR", actorId: "publing", uid: "mob_tut_2", x: 6, y: 3 },
        { type: "SPAWN_ACTOR", actorId: "publing", uid: "mob_tut_3", x: 7, y: 3 },
        { type: "SPAWN_ACTOR", actorId: "publing", uid: "mob_tut_4", x: 8, y: 3 },
        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "Three more! Click a tile to back away, then open your Backpack and use the 💣 HEAVY KEG BOMB!", portraitId: "npc_kreg" }
        ]},
        
        { type: "HIGHLIGHT_TILE", targetX: 6, targetY: 7, style: "GOAL" },
        { type: "HIGHLIGHT_UI", elementId: "combat-inventory-list" }, 
        { type: "HIGHLIGHT_TILE", targetX: 7, targetY: 3, style: "AIM" }, 
        { type: "PLAY_FX", fxType: "EXPLOSION", startX: 6, startY: 7, targetX: 7, targetY: 3 },
        { type: "DELAY", duration: 1500 },
        
        { type: "DESPAWN_ACTOR", uid: "mob_tut_2" },
        { type: "DESPAWN_ACTOR", uid: "mob_tut_3" },
        { type: "DESPAWN_ACTOR", uid: "mob_tut_4" },

        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "Whoa, look at the size of that gem they dropped! Click it to stash it!", portraitId: "npc_kreg" }
        ]},
        
        { type: "HIGHLIGHT_UI", elementId: "loot-take-btn" },
        { type: "SHAKE" },
        { type: "SPAWN_ACTOR", actorId: "wilderness_overlord", uid: "mob_tut_boss", x: 7, y: 3 },
        { type: "AUDIO", action: "PLAY", trackName: "DOOM OF THE OVERLORD" },
        { type: "DIALOGUE", sequence: [
            { speaker: "Overlord", text: "FOOLISH MORTAL... YOU DARE TOUCH MY GEMS?", portraitId: "wilderness_overlord" },
            { speaker: "Kreg", text: "Oh no... It's the Overlord! Try to hit it, run, do something!!", portraitId: "npc_kreg" }
        ]},
        
        // The scene drops the shield, erases the fake actors, and builds a real server-authoritative map!
        { type: "END_SCENE", action: "START_COMBAT", targetZone: "WILDERNESS", targetLevel: 1 } 
    ]
};