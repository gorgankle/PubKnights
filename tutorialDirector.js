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
            p.stamina = 0; // THE FIX: Start with 0 stamina to force a Pass Turn!

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
            if (bomb) p.inventory.push(JSON.parse(JSON.stringify(bomb))); // Gives the massive bomb!
            
            p.pendingLoot = []; p.pendingGold = 0; p.pendingXp = 0;

            io.to(socketId).emit('inventoryReceipt', { success: true, updatedPlayer: p });

            setTimeout(() => {
                io.to(socketId).emit('serverDialogue', [
                    { speaker: "PLAYER", text: "Phew... all this traveling got me beat.", portraitId: "player" },
                    { speaker: "Tutorial", text: "Click the orange ⌛ PASS TURN button below to catch your breath and recover Stamina!", portraitId: "icon_stout" }
                ]);
            }, 1000);
        }
    },

    checkActionLock: function(combat, data) {
        if (combat && combat.zone === 'TUTORIAL') {
            if (data.actionCategory === 'flee') return "🗣️ Director: 'There is no escape...'";
            if (data.actionCategory === 'equip') return "🗣️ Director: 'Focus on the battle, not your wardrobe!'";

            // UPDATED STEP LOCKS
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

    // NEW STEP: Triggered when they click Pass Turn on Step 1
    handlePassStep: function(combat, io, socketId) {
        if (combat && combat.zone === 'TUTORIAL' && combat.tutorialStep === 1) {
            combat.tutorialStep = 2;
            combat.atbPaused = false;
            combat.player.atbCharge = 0;
            setTimeout(() => {
                io.to(socketId).emit('serverDialogue', [{ speaker: "Tutorial", text: "Great! Now open your 🎒 BACKPACK and click the 🍺 STOUT to heal!", portraitId: "icon_stout" }]);
            }, 500);
        }
    },

    handleConsumableStep: function(combat, io, socketId) {
        if (combat && combat.zone === 'TUTORIAL' && combat.tutorialStep === 2) {
            combat.tutorialStep = 3;
            combat.enemies.push(createEnemy("publing", 2, 0, "Tutorial "));
            
            combat.atbPaused = false;
            combat.player.atbCharge = 0;

            setTimeout(() => {
                io.to(socketId).emit('combatDeployed', combat); 
                io.to(socketId).emit('serverDialogue', [{ speaker: "Tutorial", text: "A Wild Publing appeared! Click a green tile to move close, then use Standard Attack!", portraitId: "publing" }]);
            }, 800);
        }
    },

    handleVictoryStep: function(p, combat, io, socketId) {
        if (combat.tutorialStep === 3) {
            combat.tutorialStep = 4;
            combat.enemies = [
                createEnemy("publing", 0, 0, "Tutorial "),
                createEnemy("publing", 2, 0, "Tutorial "),
                createEnemy("publing", 3, 0, "Tutorial ")
            ];

            combat.atbPaused = false;
            combat.player.atbCharge = 0;

            setTimeout(() => {
                io.to(socketId).emit('combatDeployed', combat);
                io.to(socketId).emit('serverDialogue', [{ speaker: "Tutorial", text: "Three more! Click a tile to back away, then open your Backpack and use the 💣 HEAVY KEG BOMB!", portraitId: "icon_bomb_heavy" }]);
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

            combat.atbPaused = false;
            combat.player.atbCharge = 0;

            setTimeout(() => {
                io.to(socketId).emit('screenShake');
                let boss = createEnemy("wilderness_overlord", 1, 0, "True ");
                boss.offense = 9999; boss.speed = 999; boss.hp = 99999;
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