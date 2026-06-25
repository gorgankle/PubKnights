// --- combatRouter.js ---
// Handles server-authoritative combat, AI, pathfinding, and loot distribution.

const { ItemDatabase } = require('./public/js/items.js');
const { LootTables } = require('./public/js/lootTables.js');
const { NpcDatabase, createEnemy } = require('./public/js/npc-database.js');

function getGridDistance(x1, y1, x2, y2, size2 = 1) {
    let closeX = Math.max(x2, Math.min(x1, x2 + size2 - 1));
    let closeY = Math.max(y2, Math.min(y1, y2 + size2 - 1));
    return Math.max(Math.abs(x1 - closeX), Math.abs(y1 - closeY));
}

module.exports = function(socket, io, activePlayers, activeCombats) {

    // --- SECURE ENTITY LIFECYCLE & GARBAGE COLLECTION ---
    function processEntityDeath(socketId, serverEnemy, player, combatState) {
        serverEnemy.hp = 0;
        serverEnemy.alive = false;
        
        let multiplier = player.monumentBuilt ? 2 : 1;
        let isGorilla = (combatState.zone === 'GORILLA_ARENA'); 
        let isBaited = (combatState.zone === 'WILDERNESS' && player.mapBaited);

        let goldReward = ((isGorilla ? 500 : (isBaited ? 60 : 25)) * multiplier);
        let xpReward = 0;
        let droppedItemObj = null;
        let table = LootTables[serverEnemy.id];
        
        if (table) {
            xpReward = (table.xpDrop || 0) * multiplier;
            if (Math.random() <= table.dropChance) {
                let totalWeight = table.pools.reduce((sum, entry) => sum + entry.weight, 0);
                let roll = Math.random() * totalWeight;
                let droppedItemId = null;
                for (let entry of table.pools) {
                    if (roll < entry.weight) { droppedItemId = entry.itemId; break; }
                    roll -= entry.weight;
                }
                if (droppedItemId && ItemDatabase[droppedItemId]) {
                    droppedItemObj = JSON.parse(JSON.stringify(ItemDatabase[droppedItemId]));
                }
            }
        }

        player.pendingGold = (player.pendingGold || 0) + goldReward;
        player.pendingXp = (player.pendingXp || 0) + xpReward;
        player.pendingLoot = player.pendingLoot || [];
        if (droppedItemObj) player.pendingLoot.push(droppedItemObj);

        io.to(socketId).emit('killConfirmed', { 
            uid: serverEnemy.uid, 
            gold: goldReward, 
            xp: xpReward, 
            item: droppedItemObj, 
            enemyName: serverEnemy.name 
        });

        let allDead = combatState.enemies.every(e => !e.alive);
        if (allDead) {
            let zoneGoldReward = 0;
            if (combatState.zone === 'GORILLA_ARENA') zoneGoldReward += 5000;
            else if (combatState.zone === 'ABYSS') {
                player.abyssDepth = (player.abyssDepth || 1) + 1;
                zoneGoldReward += (50 + (10 * player.abyssDepth));
            } else if (combatState.zone === 'WILDERNESS') {
                if (player.wildernessLevel === 20 && !player.cellarsUnlocked) player.cellarsUnlocked = true;
                else if (combatState.activeLevel === player.wildernessLevel) player.wildernessLevel = Math.min(20, player.wildernessLevel + 1);
            } else if (combatState.zone === 'CELLARS') {
                if (player.cellarLevel === 20 && !player.abyssUnlocked) player.abyssUnlocked = true;
                else if (combatState.activeLevel === player.cellarLevel) player.cellarLevel = Math.min(20, player.cellarLevel + 1);
            }
            
            if (zoneGoldReward > 0) player.pendingGold = (player.pendingGold || 0) + zoneGoldReward;
            
            delete activeCombats[socketId];
        }
    }

    // --- UNIFIED SERVER-AUTHORITATIVE COMBAT ENGINE ---
    socket.on('combatAction', (data) => {
        let p = activePlayers[socket.id];
        let combat = activeCombats[socket.id];
        
        if (!p || !combat) {
            return socket.emit('combatResult', { type: 'error', message: '❌ Server connection lost.' });
        }

        switch (data.category) {
            case 'attack':
                let staminaCost = data.subType === 'special' ? 15 : 5;
                if (p.stamina < staminaCost) {
                    return socket.emit('combatResult', { type: 'error', message: `❌ Insufficient stamina.` });
                }
                
                p.stamina -= staminaCost; 
                
                let serverEnemy = combat.enemies.find(e => e.uid === data.target.uid && e.alive);
                if (!serverEnemy) {
                    return socket.emit('combatResult', { type: 'error', message: '❌ Target lost or already dead.' });
                }

                let wpn = p.equipment.weapon;
                let basePower = (p.power || 12) + (wpn ? (wpn.atkBonus || 0) : 0);
                
                let dmgMult = 1.0;
                if (p.activeBuffs && p.activeBuffs.includes('IPA')) dmgMult += 0.10;

                let ignoresRes = false;
                if (data.subType === 'special') {
                    if (wpn && wpn.rarity === 'Gorilla') { dmgMult *= 4.0; ignoresRes = true; }
                    else if (wpn && (wpn.type === 'Axe' || wpn.type === 'Mace' || wpn.type === 'Club')) dmgMult *= 1.5;
                    else dmgMult *= 1.2;
                }

                let finalDmg = Math.floor(basePower * dmgMult);
                let isCrit = Math.random() < 0.15; 
                if (isCrit) finalDmg = Math.floor(finalDmg * 1.5);

                if (!ignoresRes && serverEnemy.resilience) {
                    finalDmg -= serverEnemy.resilience;
                }
                
                finalDmg = Math.max(1, finalDmg);

                serverEnemy.hp -= finalDmg;
                
                if (serverEnemy.hp <= 0) {
                    processEntityDeath(socket.id, serverEnemy, p, combat);
                }
                
                socket.emit('combatResult', { type: 'hit', actionType: data.subType, damage: finalDmg, isCrit: isCrit, newStamina: p.stamina });
                break;

            case 'throw_bomb':
                let bomb = p.inventory[data.invIndex];
                if (!bomb || bomb.type !== 'bomb') return;
                p.inventory.splice(data.invIndex, 1);

                combat.enemies.forEach(e => {
                    if (!e.alive) return;
                    let dist = getGridDistance(data.tx, data.ty, e.x, e.y, e.size || 1);
                    if (dist <= bomb.aoe) {
                        e.hp -= bomb.damage;
                        if (e.hp <= 0) processEntityDeath(socket.id, e, p, combat);
                    }
                });

                socket.emit('bombResult', { bombId: bomb.id, damage: bomb.damage, tx: data.tx, ty: data.ty });
                break;
                
            case 'end_turn':
                let recover = Math.floor((p.maxStamina || 50) * 0.15); 
                p.stamina = Math.min(p.maxStamina || 50, (p.stamina || 0) + recover);
                socket.emit('combatResult', { type: 'pass', newStamina: p.stamina, recovered: recover });
                break;
                
            case 'item':
                let itemIdx = data.index;
                let itemObj = p.inventory[itemIdx];
                
                if (!itemObj) return socket.emit('combatResult', { type: 'error', message: '❌ Item not found.' });

                if (data.action === 'brew') {
                    if (itemObj.type !== 'brew') return socket.emit('combatResult', { type: 'error', message: '❌ You cannot drink this.' });
                    
                    p.inventory.splice(itemIdx, 1);
                    p.activeBuffs = p.activeBuffs || [];
                    let buffName = itemObj.id.toUpperCase();
                    if (!p.activeBuffs.includes(buffName)) p.activeBuffs.push(buffName);
                    
                    let amount = 0;
                    if (itemObj.id === 'stout') { amount = 25; p.hp = Math.min(p.vitality || 70, (p.hp || 0) + 25); }
                    else if (itemObj.id === 'ipa') { amount = 40; p.hp = Math.min(p.vitality || 70, (p.hp || 0) + 40); }
                    else if (itemObj.id === 'lager') { amount = 30; p.stamina = Math.min(p.maxStamina || 50, (p.stamina || 0) + 30); }
                    else if (itemObj.id === 'reserve') { amount = 100; p.hp = Math.min(p.vitality || 70, (p.hp || 0) + 100); }

                    socket.emit('combatResult', { type: 'heal', amount: amount, newStamina: p.stamina });
                } 
                else if (data.action === 'equip') {
                    let currentEquip = p.equipment[itemObj.slot];
                    p.equipment[itemObj.slot] = itemObj;
                    p.inventory.splice(itemIdx, 1);
                    if (currentEquip) p.inventory.push(currentEquip);
                    
                    socket.emit('combatResult', { type: 'pass', newStamina: p.stamina }); 
                }
                break;
        }
    });

    socket.on('deployToCombat', (data) => {
        // (Keep your deployToCombat logic exactly as it is in your project memory)
    });

    socket.on('movePlayer', (data) => {
        // (Keep your movePlayer logic exactly as it is in your project memory)
    });

    socket.on('sellLoot', (data) => {
        // (Keep your sellLoot logic exactly as it is in your project memory)
    });

    socket.on('claimCombatRewards', () => {
        // (Keep your claimCombatRewards logic exactly as it is in your project memory)
    });
};