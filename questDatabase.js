// --- questDatabase.js ---
// The master JSON manifest for all cinematic scenes. PURELY VISUAL.

module.exports = {
    "tutorial_combat_intro": [
        { type: "FADE", direction: "OUT", duration: 500, color: "#000000" },
        
        // Build the Level 20 Boss Arena visually
        { type: "SET_SCENE", zone: "WILDERNESS", cols: 16, rows: 10, tileSize: 54, obstacles: [
            { x: 5, y: 1, spriteId: "map_tree" },
            { x: 5, y: 8, spriteId: "map_tree" },
            { x: 14, y: 1, spriteId: "map_tree" },
            { x: 14, y: 8, spriteId: "map_tree" }
        ]},
        
        { type: "DELAY", duration: 800 },
        { type: "FADE", direction: "IN", duration: 500, color: "#000000" },
        
        { type: "SPAWN_ACTOR", actorId: "player", uid: "fake_player", x: 1, y: 4 },
        
        { type: "DIALOGUE", sequence: [
            { speaker: "PLAYER", text: "Phew... all this traveling got me beat.", portraitId: "player" },
            { speaker: "Kreg", text: "Click the orange ⌛ PASS TURN button below to catch your breath and recover Stamina!", portraitId: "npc_kreg" }
        ]},
        { type: "HIGHLIGHT_UI", elementId: "end-btn" },
        { type: "DELAY", duration: 500 },

        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "Great! I am opening your Backpack for you. Drink this Stout to heal!", portraitId: "npc_kreg" }
        ]},
        
        // === THE FIX: Use the actual HTML ID "combat-backpack-modal" ===
        // Force the modal open, inject a Movie Prop, and highlight it!
        { type: "SET_UI_STATE", elementId: "combat-backpack-modal", displayState: "block" },
        { type: "INJECT_HTML", elementId: "combat-modal-grid", html: "<div id='fake-stout' style='font-size: 14px; text-align: center; border: 2px solid #f1c40f; padding: 15px; background: #222; cursor: pointer; border-radius: 5px; color: white;'>🍺 Drink Stout</div>" },
        { type: "HIGHLIGHT_UI", elementId: "fake-stout" },
        
        // Once clicked, erase the prop and close the modal
        { type: "INJECT_HTML", elementId: "combat-modal-grid", html: "" },
        { type: "SET_UI_STATE", elementId: "combat-backpack-modal", displayState: "none" },
        
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
            { speaker: "Kreg", text: "Three more! Click a tile to back away, then grab a Heavy Keg Bomb from your bag!", portraitId: "npc_kreg" }
        ]},
        
        { type: "HIGHLIGHT_TILE", targetX: 6, targetY: 7, style: "GOAL" },
        
        // === THE FIX: Repeat the movie prop trick for the Bomb ===
        { type: "SET_UI_STATE", elementId: "combat-backpack-modal", displayState: "block" },
        { type: "INJECT_HTML", elementId: "combat-modal-grid", html: "<div id='fake-bomb' style='font-size: 14px; text-align: center; border: 2px solid #e74c3c; padding: 15px; background: #222; cursor: pointer; border-radius: 5px; color: white;'>💣 Grab Heavy Bomb</div>" },
        { type: "HIGHLIGHT_UI", elementId: "fake-bomb" },
        { type: "INJECT_HTML", elementId: "combat-modal-grid", html: "" },
        { type: "SET_UI_STATE", elementId: "combat-backpack-modal", displayState: "none" },

        { type: "HIGHLIGHT_TILE", targetX: 7, targetY: 3, style: "AIM" }, 
        { type: "PLAY_FX", fxType: "EXPLOSION", startX: 6, startY: 7, targetX: 7, targetY: 3 },
        { type: "DELAY", duration: 1500 },
        
        { type: "DESPAWN_ACTOR", uid: "mob_tut_2" },
        { type: "DESPAWN_ACTOR", uid: "mob_tut_3" },
        { type: "DESPAWN_ACTOR", uid: "mob_tut_4" },

        // === THE FIX: Smoother transition into the boss ambush ===
        { type: "DIALOGUE", sequence: [
            { speaker: "Kreg", text: "Whoa, look at the size of that gem! Let me just grab-- wait, do you feel that shaking?", portraitId: "npc_kreg" }
        ]},
        
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