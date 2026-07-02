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

            p.hp = 5; // Start heavily wounded!

            // THE FIX: Added massive stamina to the armor so they never run out during the tutorial!
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
            let bomb = ItemDatabase["bomb_small"] || ItemDatabase["keg_bomb_1"] || Object.values(ItemDatabase).find(i => i && i.name && i.name.includes("Bomb"));

            p.inventory = [];
            if (stout) p.inventory.push(JSON.parse(JSON.stringify(stout)));
            if (bomb) p.inventory.push(JSON.parse(JSON.stringify(bomb)));
            
            p.pendingLoot = []; p.pendingGold = 0; p.pendingXp = 0;

            io.to(socketId).emit('inventoryReceipt', { success: true, updatedPlayer: p });

            setTimeout(() => {
                io.to(socketId).emit('serverDialogue', [
                    { speaker: "PLAYER", text: "Phew... all this traveling got me beat. I need to recover.", portraitId: "player" },
                    { speaker: "Tutorial", text: "Click the 🎒 BACKPACK button below, then click the 🍺 STOUT to drink it!", portraitId: "icon_stout" }
                ]);
            }, 1000);
        }
    },

    // 2. Prevent the player from doing anything except what we want them to do
    checkActionLock: function(combat, data) {
        if (combat && combat.zone === 'TUTORIAL') {
            
            if (data.actionCategory === 'flee') return "🗣️ Director: 'There is no escape...'";
            if (data.actionCategory === 'pass') return "🗣️ Director: 'Now is not the time to rest!'";
            if (data.actionCategory === 'equip') return "🗣️ Director: 'Focus on the battle, not your wardrobe!'";

            if (combat.tutorialStep === 1 && data.actionCategory !== 'consumable') {
                return "🗣️ Director: 'Click the 🎒 BACKPACK button below and drink the 🍺 STOUT to recover!'";
            }
            if (combat.tutorialStep === 2 && data.actionCategory !== 'weapon') {
                return "🗣️ Director: 'Use your Standard Attack to defeat the Publing!'";
            }
            if (combat.tutorialStep === 3 && data.actionCategory !== 'consumable') {
                return "🗣️ Director: 'Too many! Open your Backpack and throw the Keg Bomb!'";
            }
        }
        return null; 
    },

    // 3. Triggered immediately after they drink the stout
    handleConsumableStep: function(combat, io, socketId) {
        if (combat && combat.zone === 'TUTORIAL' && combat.tutorialStep === 1) {
            combat.tutorialStep = 2;
            combat.enemies.push(createEnemy("publing", 2, 0, "Tutorial "));
            
            combat.atbPaused = false;
            combat.player.atbCharge = 0;

            setTimeout(() => {
                io.to(socketId).emit('combatDeployed', combat); 
                // THE FIX: Explicit movement guidance
                io.to(socketId).emit('serverDialogue', [{ speaker: "Tutorial", text: "A Wild Publing appeared! Click a green tile to move close, then use Standard Attack!", portraitId: "publing" }]);
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

            combat.atbPaused = false;
            combat.player.atbCharge = 0;

            setTimeout(() => {
                io.to(socketId).emit('combatDeployed', combat);
                // THE FIX: Explicit movement and tab guidance
                io.to(socketId).emit('serverDialogue', [{ speaker: "Tutorial", text: "Three more appeared! Click a tile to back away, then open your Backpack and use the 💣 KEG BOMB!", portraitId: "icon_bomb_small" }]);
            }, 1500);
            return true; 
        }
        
        if (combat.tutorialStep === 3) {
            combat.tutorialStep = 4;

            let shinyLoot = JSON.parse(JSON.stringify(ItemDatabase["stout"])); 
            shinyLoot.name = "Flawless Sapphire";
            shinyLoot.rarity = "Gorilla";
            shinyLoot.spriteId = "icon_reserve";
            p.pendingLoot.push(shinyLoot);
            io.to(socketId).emit('killConfirmed', { gold: 500, xp: 100, item: shinyLoot, isPet: false, enemyName: "Publing Swarm" });

            combat.atbPaused = false;
            combat.player.atbCharge = 0;

            setTimeout(() => {
                io.to(socketId).emit('screenShake');

                let boss = createEnemy("wilderness_overlord", 1, 0, "True ");
                boss.offense = 9999;
                boss.speed = 999;
                boss.hp = 99999;
                combat.enemies = [boss];

                io.to(socketId).emit('combatDeployed', combat);
                io.to(socketId).emit('serverDialogue', [{ speaker: "Overlord", text: "FOOLISH MORTAL... YOU DARE TOUCH MY GEMS?", portraitId: "wilderness_overlord" }]);
                io.to(socketId).emit('playTrack', "The True Overlord"); 
            }, 2500);
            
            return true; 
        }
        return false;
    }
};