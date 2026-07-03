// --- tutorialDirector.js ---
// Cinematic State Machine for the Onboarding Sequence

const { ItemDatabase } = require('./public/js/items.js');
const { createEnemy } = require('./public/js/npc-database.js');

module.exports = {
    
    // 1. Setup the Tiny Map and give the player their gear
    handleDeployment: function(p, combatState, zone, io, socketId) {
        if (zone === 'TUTORIAL') {
            combatState.gridSize = 4;
            combatState.tileSize = 90; 
            combatState.player.x = 1;
            combatState.player.y = 2;
            combatState.tutorialStep = 1;

            p.hp = 5; 
            p.stamina = 0; 

            p.equipment = {
                helmet: { name: "Initiate Helm", slot: "helmet", defense: 10, spriteId: "icon_iron_helm" },
                armor: { name: "Initiate Plate", slot: "armor", defense: 15, stamina: 100, spriteId: "icon_iron_armor" },
                weapon: {
                    name: "Initiate Broadsword", slot: "weapon", offense: 30, spriteId: "icon_iron_sword",
                    combat: {
                        standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: 'lunge_slash' },
                        special: { name: "Heavy Slash", range: 1, staminaCost: 10, multiplier: 1.5, animType: 'lunge_slash' }
                    }
                },
                gloves: null, boots: null
            };

            let stout = ItemDatabase["stout"] || Object.values(ItemDatabase).find(i => i && i.name && i.name.includes("Stout"));
            let bomb = ItemDatabase["bomb_heavy"] || ItemDatabase["keg_bomb_2"] || Object.values(ItemDatabase).find(i => i && i.name && i.name.includes("Heavy"));

            p.inventory = [];
            if (stout) p.inventory.push(JSON.parse(JSON.stringify(stout)));
            if (bomb) p.inventory.push(JSON.parse(JSON.stringify(bomb))); 
            
            p.pendingLoot = []; p.pendingGold = 0; p.pendingXp = 0;
            
            // FIX: Pre-pause the ATB so it doesn't tick during the intro dialogue!
            combatState.atbPaused = true;

            io.to(socketId).emit('inventoryReceipt', { success: true, updatedPlayer: p });

            setTimeout(() => {
                io.to(socketId).emit('serverDialogue', [
                    { speaker: "PLAYER", text: "Phew... all this traveling got me beat.", portraitId: "player" },
                    { speaker: "Kreg", text: "Click the orange ⌛ PASS TURN button below to catch your breath and recover Stamina!", portraitId: "npc_kreg" }
                ]);
                
                // Only let them tick ATB once the cinematic is finished!
                combatState.atbPaused = false;
                combatState.player.atbCharge = 0;
            }, 1000);
        }
    },

    checkActionLock: function(combat, data) {
        if (combat && combat.zone === 'TUTORIAL') {
            if (data.actionCategory === 'flee') return "🗣️ Director: 'There is no escape...'";
            if (data.actionCategory === 'equip') return "🗣️ Director: 'Focus on the battle, not your wardrobe!'";

            if (combat.tutorialStep === 1 && data.actionCategory !== 'pass') {
                return "🗣️ Director: 'Click the ⌛ PASS TURN button to recover Stamina!'";
            }
            if (combat.tutorialStep === 2 && data.actionCategory !== 'consumable') {
                return "🗣️ Director: 'Click the 🎒 BACKPACK button below and drink the 🍺 STOUT!'";
            }
            if (combat.tutorialStep === 3 && data.actionCategory !== 'weapon') {
                return "🗣️ Director: 'Use your Standard Attack to defeat the Publing!'";
            }
            if (combat.tutorialStep === 4 && data.actionCategory !== 'consumable') {
                return "🗣️ Director: 'Too many! Open your Backpack and throw the Heavy Keg Bomb!'";
            }
        }
        return null; 
    },

    // Triggered when they click Pass Turn on Step 1
    handlePassStep: function(combat, io, socketId) {
        if (combat && combat.zone === 'TUTORIAL' && combat.tutorialStep === 1) {
            combat.tutorialStep = 2;
            
            setTimeout(() => {
                io.to(socketId).emit('combatDeployed', combat);
                io.to(socketId).emit('serverDialogue', [{ 
                    speaker: "Kreg", 
                    text: "Great! Now open your 🎒 BACKPACK and click the 🍺 STOUT to heal!", 
                    portraitId: "npc_kreg" 
                }]);
                
                // FIX: Unpause ATB *AFTER* the client has fully locked onto the new cinematic state!
                combat.atbPaused = false;
                combat.player.atbCharge = 0;
            }, 500);
        }
    },

    // Triggered when they drink the Stout on Step 2
    handleConsumableStep: function(combat, io, socketId) {
        if (combat && combat.zone === 'TUTORIAL' && combat.tutorialStep === 2) {
            combat.tutorialStep = 3;
            
            // FIX: Dynamically generated enemies MUST have UIDs or targeting/animations break!
            let publing = createEnemy("publing", 2, 0, "Tutorial ");
            publing.uid = "mob_tut_1";
            publing.atbCharge = 0;
            combat.enemies.push(publing);

            setTimeout(() => {
                io.to(socketId).emit('combatDeployed', combat); 
                io.to(socketId).emit('serverDialogue', [{ speaker: "Kreg", text: "A Wild Publing appeared! Click a green tile to move close, then use Standard Attack!", portraitId: "npc_kreg" }]);
                
                // FIX: Unpause ATB *AFTER* the cinematic delay to prevent race conditions!
                combat.atbPaused = false;
                combat.player.atbCharge = 0;
            }, 800);
        }
    },

// Triggered on Kills
    handleVictoryStep: function(p, combat, io, socketId) {
        if (combat.tutorialStep === 3) {
            combat.tutorialStep = 4;
            
            // === THE FIX: TIGHTLY CLUSTER THE PUBLINGS ===
            // We moved them to (1,0), (2,0), and (1,1) and set HP to 1
            let p1 = createEnemy("publing", 1, 0, "Tutorial "); p1.uid = "mob_tut_2"; p1.atbCharge = 0; p1.hp = 1;
            let p2 = createEnemy("publing", 2, 0, "Tutorial "); p2.uid = "mob_tut_3"; p2.atbCharge = 0; p2.hp = 1;
            let p3 = createEnemy("publing", 1, 1, "Tutorial "); p3.uid = "mob_tut_4"; p3.atbCharge = 0; p3.hp = 1;
            
            combat.enemies = [p1, p2, p3];
            // =============================================

            setTimeout(() => {
                io.to(socketId).emit('combatDeployed', combat);
                io.to(socketId).emit('serverDialogue', [{ speaker: "Kreg", text: "Three more! Click a tile to back away, then open your Backpack and use the 💣 HEAVY KEG BOMB!", portraitId: "npc_kreg" }]);
                
                combat.atbPaused = false;
                combat.player.atbCharge = 0;
            }, 1500);
            return true; 
        }
        
        if (combat.tutorialStep === 4) {
            combat.tutorialStep = 5;

            let shinyLoot = JSON.parse(JSON.stringify(ItemDatabase["stout"])); 
            shinyLoot.name = "Flawless Sapphire";
            shinyLoot.rarity = "Gorilla";
            shinyLoot.spriteId = "icon_reserve";
            p.pendingLoot.push(shinyLoot);
            io.to(socketId).emit('killConfirmed', { gold: 500, xp: 100, item: shinyLoot, isPet: false, enemyName: "Publing Swarm" });

            // FIX: Just prompt them to loot it. The boss will spawn when they click it!
            setTimeout(() => {
                io.to(socketId).emit('serverDialogue', [{ 
                    speaker: "Kreg", 
                    text: "Whoa, look at the size of that gem! Click it to stash it in your backpack!", 
                    portraitId: "npc_kreg" 
                }]);
            }, 1000);
            
            return true; 
        }
        return false;
    },

    // === NEW: STANDALONE BOSS DEPLOYMENT ===
    handleBossSpawn: function(p, combat, io, socketId) {
        combat.tutorialStep = 6; // Move to final step
        combat.atbPaused = true; // Pause time while deploying

        io.to(socketId).emit('screenShake');
        
        let boss = createEnemy("wilderness_overlord", 1, 0, "True ");
        boss.uid = "mob_tut_boss"; 
        boss.offense = 9999; 
        boss.hp = 99999;
        
        // FIX: Make the boss insanely slow so the player gets the first few turns!
        boss.speed = 1; 
        boss.atbCharge = -200; 
        
        combat.enemies = [boss];

        // This emit will automatically rip the Loot Screen away on the client!
        io.to(socketId).emit('combatDeployed', combat);
        
        setTimeout(() => {
            io.to(socketId).emit('serverDialogue', [
                { speaker: "Overlord", text: "FOOLISH MORTAL... YOU DARE TOUCH MY GEMS?", portraitId: "wilderness_overlord" },
                { speaker: "Kreg", text: "Oh no... It's the Overlord! Try to hit it, run, do something!!", portraitId: "npc_kreg" }
            ]);
            io.to(socketId).emit('playTrack', "DOOM OF THE OVERLORD"); 
            
            // Instantly hand the player a turn so they can fight back!
            combat.atbPaused = false;
            combat.player.atbCharge = 100;
            io.to(socketId).emit('ATB_READY');
        }, 1500);
    }
};