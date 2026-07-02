// --- tutorialDirector.js ---
// Cinematic State Machine for the Onboarding Sequence

const { ItemDatabase } = require('./public/js/items.js');
const { createEnemy } = require('./public/js/npc-database.js');

module.exports = {
    
    // 1. Setup the Tiny Map and give the player their gear
    handleDeployment: function(p, combatState, zone, io, socketId) {
        if (zone === 'TUTORIAL') {
            combatState.gridSize = 4;
            combatState.tileSize = 90; // Bigger tiles for a smaller map
            combatState.player.x = 1;
            combatState.player.y = 2;
            combatState.tutorialStep = 1;

            let stout = ItemDatabase["stout"] || Object.values(ItemDatabase).find(i => i && i.name && i.name.includes("Stout"));
            let bomb = ItemDatabase["bomb_small"] || ItemDatabase["keg_bomb_1"] || Object.values(ItemDatabase).find(i => i && i.name && i.name.includes("Bomb"));

            p.inventory = [];
            if (stout) p.inventory.push(JSON.parse(JSON.stringify(stout)));
            if (bomb) p.inventory.push(JSON.parse(JSON.stringify(bomb)));
            
            p.pendingLoot = []; p.pendingGold = 0; p.pendingXp = 0;

            // === THE FIX 1: PUSH THE INVENTORY TO THE BROWSER UI ===
            io.to(socketId).emit('inventoryReceipt', { 
                success: true, 
                updatedPlayer: p 
            });
            // ========================================================

            // Trigger the opening text
            setTimeout(() => {
                io.to(socketId).emit('serverDialogue', [
                    { speaker: "PLAYER", text: "Phew... all this traveling got me beat. I need to recover.", portraitId: "player" }
                ]);
            }, 1000);
        }
    },

    // 2. Prevent the player from doing anything except what we want them to do
    checkActionLock: function(combat, data) {
        if (combat && combat.zone === 'TUTORIAL') {
            if (combat.tutorialStep === 1 && data.actionCategory !== 'consumable') {
                return "🗣️ Director: 'Open your Backpack and drink the Stout to recover!'";
            }
            if (combat.tutorialStep === 2 && data.actionCategory !== 'weapon') {
                return "🗣️ Director: 'Use your Standard Attack to defeat the Publing!'";
            }
            if (combat.tutorialStep === 3 && data.actionCategory !== 'consumable') {
                return "🗣️ Director: 'Too many! Throw your Keg Bomb into the center of them!'";
            }
            if (combat.tutorialStep === 4 && data.actionCategory === 'flee') {
                return "🗣️ Director: 'There is no escape...'";
            }
        }
        return null; 
    },

    // 3. Triggered immediately after they drink the stout
    handleConsumableStep: function(combat, io, socketId) {
        if (combat && combat.zone === 'TUTORIAL' && combat.tutorialStep === 1) {
            combat.tutorialStep = 2;
            combat.enemies.push(createEnemy("publing", 2, 0, "Tutorial "));
            
            // === THE FIX 2: UNFREEZE THE SERVER ATB ENGINE ===
            // Since the server restarts the map mid-turn, we must unpause the battle manually!
            combat.atbPaused = false;
            combat.player.atbCharge = 0;
            // =================================================

            setTimeout(() => {
                io.to(socketId).emit('combatDeployed', combat); // Force client to redraw
                io.to(socketId).emit('serverDialogue', [{ speaker: "Tutorial", text: "A Wild Publing appeared! Select the Standard Attack to strike it!", portraitId: "publing" }]);
            }, 800);
        }
    },

    // 4. Manages what happens when enemies die
    handleVictoryStep: function(p, combat, io, socketId) {
        if (combat.tutorialStep === 2) {
            combat.tutorialStep = 3;
            combat.enemies = [
                createEnemy("publing", 0, 0, "Tutorial "),
                createEnemy("publing", 2, 0, "Tutorial "),
                createEnemy("publing", 3, 0, "Tutorial ")
            ];

            // === THE FIX 2: UNFREEZE THE SERVER ATB ENGINE ===
            combat.atbPaused = false;
            combat.player.atbCharge = 0;

            setTimeout(() => {
                io.to(socketId).emit('combatDeployed', combat);
                io.to(socketId).emit('serverDialogue', [{ speaker: "Tutorial", text: "Three more appeared! Back up and throw your bomb into the center!", portraitId: "icon_bomb_small" }]);
            }, 1500);
            return true; // Tells the combatRouter to keep the battle going
        }
        
        if (combat.tutorialStep === 3) {
            combat.tutorialStep = 4;

            // Spawn the Shiny Loot Tease
            let shinyLoot = JSON.parse(JSON.stringify(ItemDatabase["stout"])); 
            shinyLoot.name = "Flawless Sapphire";
            shinyLoot.rarity = "Gorilla";
            shinyLoot.spriteId = "icon_reserve";
            p.pendingLoot.push(shinyLoot);
            io.to(socketId).emit('killConfirmed', { gold: 500, xp: 100, item: shinyLoot, isPet: false, enemyName: "Publing Swarm" });

            // === THE FIX 2: UNFREEZE THE SERVER ATB ENGINE ===
            combat.atbPaused = false;
            combat.player.atbCharge = 0;

            // Launch the Unbeatable Boss Phase
            setTimeout(() => {
                io.to(socketId).emit('screenShake');

                let boss = createEnemy("wilderness_overlord", 1, 0, "True ");
                boss.offense = 9999;
                boss.speed = 999;
                boss.hp = 99999;
                combat.enemies = [boss];

                io.to(socketId).emit('combatDeployed', combat);
                io.to(socketId).emit('serverDialogue', [{ speaker: "Overlord", text: "FOOLISH MORTAL... YOU DARE TOUCH MY GEMS?", portraitId: "wilderness_overlord" }]);
                io.to(socketId).emit('playTrack', "The True Overlord"); // Cue the dreadful music
            }, 2500);
            
            return true; // Keep the battle going
        }
        return false;
    }
};