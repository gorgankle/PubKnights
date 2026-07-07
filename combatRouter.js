// --- combatRouter.js ---
// Handles server-authoritative combat, AI, pathfinding, and loot distribution.

const { ItemDatabase } = require('./public/js/items.js');
const { LootTables } = require('./public/js/lootTables.js');
const { NpcDatabase, createEnemy } = require('./public/js/npc-database.js');
const { SpellDatabase } = require('./public/js/spells.js');

function getGridDistance(x1, y1, x2, y2, size2 = 1) {
    let closeX = Math.max(x2, Math.min(x1, x2 + size2 - 1));
    let closeY = Math.max(y2, Math.min(y1, y2 + size2 - 1));
    return Math.max(Math.abs(x1 - closeX), Math.abs(y1 - closeY));
}

function checkLineOfSight(x1, y1, x2, y2, combatState) {
    let dx = Math.abs(x2 - x1); let dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1; let sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy; let cx = x1; let cy = y1;
    
    while (true) {
        if (cx === x2 && cy === y2) return true;
        if (cx !== x1 || cy !== y1) {
            if (combatState.obstacles.some(o => o.x === cx && o.y === cy)) return false;
        }
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
    }
}
	
function getLineOfEffectPath(x1, y1, x2, y2, maxRange, stopsAtWalls, combatState) {
    let path = [];
    let dx = Math.abs(x2 - x1); let dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1; let sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy; let cx = x1; let cy = y1;
    let distanceTraveled = 0;
    
    while (distanceTraveled <= maxRange) {
        if (cx !== x1 || cy !== y1) {
            path.push({ x: cx, y: cy });
            if (stopsAtWalls && combatState.obstacles.some(o => o.x === cx && o.y === cy)) break; 
        }
        if (cx === x2 && cy === y2) break; 
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
        distanceTraveled++;
    }
    return path;
}

module.exports = function(socket, io, activePlayers, activeCombats) {
	
    function getEffectiveStat(player, statKey) {
        let base = player[statKey] || 1; 
        let flatBonus = 0;
        let multiplier = 1.0;

        for (let slot in player.equipment) {
            let item = player.equipment[slot];
            if (item) {
                if (statKey === 'offense' && item.offense) flatBonus += item.offense;
                if (statKey === 'defense' && item.defense) flatBonus += item.defense;
                if (statKey === 'speed' && item.speed) flatBonus += item.speed;
                if (statKey === 'vitality' && item.vitality) flatBonus += item.vitality;
                if (statKey === 'maxStamina' && item.stamina) flatBonus += item.stamina; 
            }
        }

        if (player.activeBuffs && player.activeBuffs.length > 0) {
            player.activeBuffs.forEach(buffId => {
                let buffData = ItemDatabase[buffId.toLowerCase()];
                if (buffData && buffData.combat && buffData.combat.effectCategory === statKey) {
                    if (buffData.combat.effectType === 'flat') {
                        flatBonus += buffData.combat.effectValue;
                    } else if (buffData.combat.effectType === 'multiplier') {
                        multiplier *= buffData.combat.effectValue;
                    }
                }
            });
        }
        return Math.floor((base + flatBonus) * multiplier);
    }

    function getMaxHp(player) { return getEffectiveStat(player, 'vitality') * 25; }
    function getMaxStamina(player) { return getEffectiveStat(player, 'maxStamina') * 25; }

    function processSecureKill(socketId, serverEnemy) {
        let p = activePlayers[socketId];
        let combat = activeCombats[socketId];
        if (!p || !combat) return;

        // Ensure cinematic/quest enemies don't drop real gold or trigger normal victory math
        if (combat.zone === 'CINEMATIC' || p.activeQuest) return;

        let multiplier = p.monumentBuilt ? 2 : 1;
        let isGorilla = (combat.zone === 'GORILLA_ARENA'); 
        let isBaited = (combat.zone === 'WILDERNESS' && p.mapBaited);

        let goldReward = 0;
        let xpReward = 0;
        let droppedItemObj = null;

        goldReward = ((isGorilla ? 500 : (isBaited ? 60 : 25)) * multiplier);
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

        p.pendingGold = (p.pendingGold || 0) + goldReward;
        p.pendingXp = (p.pendingXp || 0) + xpReward;
        p.pendingLoot = p.pendingLoot || [];
        if (droppedItemObj) p.pendingLoot.push(droppedItemObj);

        io.to(socketId).emit('killConfirmed', { 
            gold: goldReward, xp: xpReward, item: droppedItemObj, isPet: false, enemyName: serverEnemy.name 
        });

        // Check for normal zone victory
        let allDead = combat.enemies.every(e => !e.alive);
        
        if (allDead) {
            let zoneGoldReward = 0;
            if (combat.zone === 'GORILLA_ARENA') zoneGoldReward += 5000;
            else if (combat.zone === 'ABYSS') {
                p.abyssDepth = (p.abyssDepth || 1) + 1;
                zoneGoldReward += (50 + (10 * p.abyssDepth));
            } else if (combat.zone === 'WILDERNESS') {
                if (p.wildernessLevel === 20 && !p.cellarsUnlocked) p.cellarsUnlocked = true;
                else if (combat.activeLevel === p.wildernessLevel) p.wildernessLevel = Math.min(20, p.wildernessLevel + 1);
            } else if (combat.zone === 'CELLARS') {
                if (p.cellarLevel === 20 && !p.abyssUnlocked) p.abyssUnlocked = true;
                else if (combat.activeLevel === p.cellarLevel) p.cellarLevel = Math.min(20, p.cellarLevel + 1);
            }
            if (zoneGoldReward > 0) p.pendingGold = (p.pendingGold || 0) + zoneGoldReward;
            
            delete activeCombats[socketId];
        }
    }

    socket.on('dispatchCombatAction', (data) => {
        let p = activePlayers[socket.id];
        let combat = activeCombats[socket.id];
        
        if (!p) return socket.emit('combatResult', { type: 'error', message: '❌ Server connection lost. Please refresh the page.' });

        if (data.actionCategory !== 'flee' && (!combat || combat.atbPaused !== true)) {
            return socket.emit('combatResult', { type: 'error', message: '❌ Tactical Error: It is not your turn.', newStamina: p.stamina });
        }

        if (data.actionCategory === 'flee') {
            p.pendingGold = 0;
            p.pendingXp = 0;
            p.pendingLoot = [];
            
            p.hp = getMaxHp(p);
            p.stamina = getMaxStamina(p);
            
            delete activeCombats[socket.id];
            return socket.emit('combatResult', { type: 'flee', updatedPlayer: p });
        }

        if (data.actionCategory === 'pass') {
            let maxStam = getMaxStamina(p);
            let recover = Math.floor(maxStam * 0.15); 
            p.stamina = Math.min(maxStam, (p.stamina || 0) + recover);
            socket.emit('combatResult', { type: 'pass', updatedPlayer: p, recovered: recover });
            return;
        }
        
        if (data.actionCategory === 'weapon') {
            let weapon = p.equipment.weapon;
            
            if (!weapon || !weapon.combat) {
                weapon = {
                    spriteId: "icon_punch",
                    combat: {
                        standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
                        special: { name: "Haymaker", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false }
                    }
                };
            }

            let combatRules = data.subType === 'special' ? weapon.combat.special : weapon.combat.standard;
            if (!combatRules) return socket.emit('combatResult', { type: 'error', message: '❌ Server: Action not supported by weapon.', newStamina: p.stamina });

			let staminaCost = combatRules.staminaCost;
            if (p.stamina < staminaCost) {
                return socket.emit('combatResult', { type: 'error', message: `❌ Server: Insufficient stamina (${Math.floor(p.stamina)}/${staminaCost}).`, newStamina: p.stamina });
            }

            if (data.subType === 'special' && combatRules.targetType === 'aoe') {
                if (data.tx === undefined || data.ty === undefined) return;
                
                let castDist = getGridDistance(combat.player.x, combat.player.y, data.tx, data.ty, 1);
                if (castDist > combatRules.range) {
                    return socket.emit('combatResult', { type: 'error', message: '❌ Server: Target out of range.', newStamina: p.stamina });
                }

                if (!combatRules.ignoresLoS && !checkLineOfSight(combat.player.x, combat.player.y, data.tx, data.ty, combat)) {
                    return socket.emit('combatResult', { type: 'error', message: '❌ Server: No line of sight to target area.', newStamina: p.stamina });
                }

                p.stamina -= staminaCost;
                
                let serverPower = getEffectiveStat(p, 'offense');
                let finalBaseDmg = Math.floor(serverPower * combatRules.multiplier);
                let hitTargets = [];

                if (combat) {
                    combat.enemies.forEach(e => {
                        if (!e.alive) return;
                        
                        let eDist = getGridDistance(data.tx, data.ty, e.x, e.y, e.size || 1);
                        
                        if (eDist <= (combatRules.aoeRadius || 1)) {
                            let minDmg = Math.ceil(finalBaseDmg * 0.85);
                            let maxDmg = finalBaseDmg;
                            let variedDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
                            let isCrit = variedDmg >= Math.floor(finalBaseDmg * 0.95);

                            e.hp -= variedDmg;
                            let killed = false;
                            if (e.hp <= 0) { e.hp = 0; e.alive = false; killed = true; processSecureKill(socket.id, e); }
                            
                            hitTargets.push({ uid: e.uid, damage: variedDmg, isCrit: isCrit, killed: killed });
                        }
                    });
                }

                return socket.emit('combatResult', { 
                    type: 'hit', source: 'weapon', actionName: data.subType, targets: hitTargets,
                    fx: { tx: data.tx, ty: data.ty, spriteId: weapon.spriteId, isAoE: true, radius: combatRules.aoeRadius || 1 },
                    updatedPlayer: p 
                });
            }

            let serverEnemy = null;
            if (combat && data.targetEnemy) {
                serverEnemy = combat.enemies.find(e => e.uid === data.targetEnemy.uid && e.alive);
            }

            if (!serverEnemy) return socket.emit('combatResult', { type: 'error', message: '❌ Server: Target lost or already deceased.', newStamina: p.stamina });

            let dist = getGridDistance(combat.player.x, combat.player.y, serverEnemy.x, serverEnemy.y, serverEnemy.size || 1);
            if (dist > combatRules.range) return socket.emit('combatResult', { type: 'error', message: '❌ Server: Target out of confirmed range.', newStamina: p.stamina });
			
			if (!combatRules.ignoresLoS) {
                const hasLOS = checkLineOfSight(combat.player.x, combat.player.y, serverEnemy.x, serverEnemy.y, combat);
                if (!hasLOS) return socket.emit('combatResult', { type: 'error', message: '❌ Server: Target is obscured by an obstacle.', newStamina: p.stamina });
            }

            p.stamina -= staminaCost; 

            let attackerOffense = getEffectiveStat(p, 'offense') * 10;
            let defenderSpeed = (serverEnemy.speed || 1) * 10;
            let defenderDefense = combatRules.ignoresDefense ? 0 : (serverEnemy.defense || 1) * 10;

            let offenseHitPower = (attackerOffense * 0.5) + (Math.random() * attackerOffense * 0.5);
            let speedMitigation = Math.random() * defenderSpeed;

            if ((offenseHitPower - speedMitigation) <= 0) {
                socket.emit('combatResult', { type: 'miss', hitChance: 0, newStamina: p.stamina });
                return;
            }

            let rawDamageRoll = Math.sqrt(Math.random()) * attackerOffense;
            let armorAbsorption = Math.pow(Math.random(), 2) * defenderDefense;
            let mitigatedDmg = Math.floor(rawDamageRoll - armorAbsorption);

            if (mitigatedDmg <= 0) {
                socket.emit('combatResult', { type: 'miss', hitChance: 100, newStamina: p.stamina });
                return;
            }

            let isCrit = mitigatedDmg >= Math.floor(attackerOffense * 0.90); 
            let finalDmg = Math.floor(mitigatedDmg * combatRules.multiplier);

            serverEnemy.hp -= finalDmg;
            let killed = false;
            if (serverEnemy.hp <= 0) {
                serverEnemy.hp = 0; serverEnemy.alive = false; killed = true;
                processSecureKill(socket.id, serverEnemy);
            }
            
            const isRanged = !!weapon.projectileSprite; 
            
            socket.emit('combatResult', { 
                type: 'hit', source: 'weapon', actionName: data.subType, 
                targets: [{ uid: serverEnemy.uid, damage: finalDmg, isCrit: isCrit, killed: killed }],
                fx: { tx: serverEnemy.x, ty: serverEnemy.y, spriteId: isRanged ? weapon.projectileSprite : weapon.spriteId, isProjectile: isRanged, isAoE: false },
                updatedPlayer: p 
            });
            return;
        } 

        if (data.actionCategory === 'consumable') {
            let invIndex = data.invIndex;
            let item = p.inventory[invIndex];
            
            if (!item || !item.combat) return socket.emit('combatItemReceipt', { success: false, message: "❌ Invalid item data." });

            let rules = item.combat;

            if (rules.staminaCost > 0 && p.stamina < rules.staminaCost) {
                return socket.emit('combatItemReceipt', { success: false, message: `❌ Server: Insufficient stamina.` });
            }

            if (rules.actionType === 'heal') {
                let maxVitalityCalc = getMaxHp(p);
                let healAmount = Math.floor(maxVitalityCalc * rules.healPercent);
                p.hp = Math.min(maxVitalityCalc, p.hp + healAmount);
                p.inventory.splice(invIndex, 1);
                p.stamina -= rules.staminaCost || 0;
                return socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: `🍺 Chugged ${item.name}. Restored ${healAmount} HP.` });
            }

            if (rules.actionType === 'buff') {
                p.activeBuffs = p.activeBuffs || [];
                let buffName = rules.buffType; 
                
                if (!p.activeBuffs.includes(buffName)) {
                    p.activeBuffs.push(buffName);
                    p.inventory.splice(invIndex, 1);
                    p.stamina -= rules.staminaCost || 0;
                    return socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: rules.msg });
                } else {
                    return socket.emit('combatItemReceipt', { success: false, message: "❌ Buff already active." });
                }
            }
            
            if (rules.actionType === 'throwable') {
                if (data.tx === undefined || data.ty === undefined) return;
                
                let throwDist = getGridDistance(combat.player.x, combat.player.y, data.tx, data.ty, 1);
                let maxRange = rules.range || 4; 
                
                if (throwDist > maxRange) return socket.emit('combatItemReceipt', { success: false, message: '❌ Server: Target out of range.' });
                if (!rules.ignoresLoS && !checkLineOfSight(combat.player.x, combat.player.y, data.tx, data.ty, combat)) {
                    return socket.emit('combatItemReceipt', { success: false, message: '❌ Server: No line of sight to target area.' });
                }

                p.inventory.splice(invIndex, 1);
                p.stamina -= rules.staminaCost || 0;

                let hitTargets = [];
                if (combat) {
                    combat.enemies.forEach(e => {
                        if (!e.alive) return;
                        let dist = getGridDistance(data.tx, data.ty, e.x, e.y, e.size || 1);
                        if (dist <= rules.aoeRadius) {
                            e.hp -= rules.damageFlat;
                            let killed = false;
                            if (e.hp <= 0) { e.hp = 0; e.alive = false; killed = true; processSecureKill(socket.id, e); }
                            hitTargets.push({ uid: e.uid, damage: rules.damageFlat, isCrit: false, killed: killed });
                        }
                    });
                }
                
                return socket.emit('combatResult', { 
                    type: 'hit', source: 'throwable', actionName: item.name, targets: hitTargets,
                    fx: { tx: data.tx, ty: data.ty, spriteId: item.spriteId || "icon_bomb_small", isAoE: true, radius: rules.aoeRadius },
                    updatedPlayer: p 
                });
            }
            
            if (rules.actionType === 'spell') {
                if (data.tx === undefined || data.ty === undefined) return;

                let spellData = SpellDatabase[rules.spellId];
                if (!spellData) return socket.emit('combatItemReceipt', { success: false, message: "❌ Server: Invalid spell logic." });

                if (p.stamina < spellData.cost) return socket.emit('combatItemReceipt', { success: false, message: '❌ Server: Insufficient stamina to cast.' });
                
                let castDist = getGridDistance(combat.player.x, combat.player.y, data.tx, data.ty, 1);
                if (castDist > spellData.range) return socket.emit('combatItemReceipt', { success: false, message: '❌ Server: Target out of spell range.' });

                p.stamina -= spellData.cost;

                let hitTargets = [];
                if (spellData.type === 'line') {
                    let blastPath = getLineOfEffectPath(combat.player.x, combat.player.y, data.tx, data.ty, spellData.range, !spellData.ignoresLoS, combat);
                    
                    if (combat) {
                        combat.enemies.forEach(e => {
                            if (!e.alive) return;
                            let isHit = false;
                            let s = e.size || 1;
                            for (let bx = e.x; bx < e.x + s; bx++) {
                                for (let by = e.y; by < e.y + s; by++) {
                                    if (blastPath.some(tile => tile.x === bx && tile.y === by)) isHit = true;
                                }
                            }

                            if (isHit) {
                                e.hp -= spellData.damageFlat;
                                let killed = false;
                                if (e.hp <= 0) { e.hp = 0; e.alive = false; killed = true; processSecureKill(socket.id, e); }
                                hitTargets.push({ uid: e.uid, damage: spellData.damageFlat, isCrit: false, killed: killed });
                            }
                        });
                    }
                }

                return socket.emit('combatResult', { 
                    type: 'hit', source: 'spell', actionName: spellData.name, targets: hitTargets,
                    fx: { 
                        type: spellData.fx ? spellData.fx.type : 'beam', style: spellData.fx ? spellData.fx.style : 'fire',
                        density: spellData.fx ? spellData.fx.density : 12, spread: spellData.fx ? spellData.fx.spread : 15,
                        speed: spellData.fx ? spellData.fx.speed : 15, tx: data.tx, ty: data.ty 
                    }, 
                    updatedPlayer: p 
                });
            }
        } 

        if (data.actionCategory === 'equip') {
            let invIndex = data.invIndex;
            let item = p.inventory[invIndex];
            if (!item) return;

            const validSlots = ["weapon", "helmet", "armor", "gloves", "boots"];
            if (!validSlots.includes(item.slot)) {
                return socket.emit('combatItemReceipt', { success: false, message: "❌ This item cannot be equipped." });
            }

            let slotKey = item.slot;
            let worn = p.equipment[slotKey];
            
            p.equipment[slotKey] = item;
            if (worn) p.inventory[invIndex] = worn; 
            else p.inventory.splice(invIndex, 1);
            
            return socket.emit('combatItemReceipt', { success: true, updatedPlayer: p, message: "⚙️ Swapped gear mid-combat." });
        }
    });

    socket.on('deployToCombat', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

        p.idleJob = 'NONE';
        p.pendingXp = 0;

        let zone = data.zoneChoice;
        let requestedLvl = data.activeLevel || 1;
        let runLvl = 1;
        
        if (zone === 'WILDERNESS') runLvl = Math.min(requestedLvl, p.wildernessLevel || 1);
        if (zone === 'CELLARS') runLvl = Math.min(requestedLvl, p.cellarLevel || 1);

        let combatState = {
            zone: zone, activeLevel: runLvl, 
            turn: 'PLAYER', phase: 'MOVE',
            gridSize: { cols: data.customCols || 16, rows: data.customRows || 10 },
            tileSize: data.customTileSize || 54,
            player: { x: 1, y: 4, atbCharge: 0 }, enemies: [], obstacles: [],
            atbPaused: (data.customCols !== undefined || zone === 'CINEMATIC') 
        };

        let baitMultiplier = (zone === 'WILDERNESS' && p.mapBaited) ? 1.4 : 1.0;
        let prefixLabel = (zone === 'WILDERNESS' && p.mapBaited) ? "Frenzied " : "";

        if (zone === 'CINEMATIC') {
            // DO NOTHING - QuestRouter will spawn the actors via the SPAWN_ACTOR JSON event
        }
        else if (zone === 'GORILLA_ARENA') {
            combatState.player.x = 2; combatState.player.y = 4;
            for (let i = 0; i < 100; i++) {
                let sx, sy;
                if (Math.random() > 0.5) { sx = Math.random() > 0.5 ? 0 : 15; sy = Math.floor(Math.random() * 10); } 
                else { sx = Math.floor(Math.random() * 16); sy = Math.random() > 0.5 ? 0 : 9; }
                
                let newGorilla = createEnemy("enraged_gorilla", sx, sy);
                newGorilla.name = `Enraged Gorilla #${i+1}`; 
                combatState.enemies.push(newGorilla);
            }
        }
        else if (zone === 'ABYSS') {
            combatState.player.x = 0; combatState.player.y = 4;
            let depth = p.abyssDepth || 1;
            let statMult = 1 + (depth * 0.15) + (Math.pow(depth, 2) * 0.005);
            let enemyCount = Math.min(12, 3 + Math.floor(depth / 3));

            for (let i = 0; i < enemyCount; i++) {
                let rng = Math.random();
                let ex = Math.floor(Math.random() * 10) + 5; 
                let ey = Math.floor(Math.random() * 10);     
                while(combatState.enemies.some(e => e.x === ex && e.y === ey)) {
                    ex = Math.floor(Math.random() * 10) + 5; ey = Math.floor(Math.random() * 10);
                }
                if (rng > 0.7) combatState.enemies.push(createEnemy("spectral_barfly", ex, ey, "", statMult));
                else if (rng > 0.3) combatState.enemies.push(createEnemy("mash_crawler", ex, ey, "", statMult));
                else combatState.enemies.push(createEnemy("eldritch_keg", ex, ey, "", statMult));
            }
        }
        else if (zone === 'CELLARS') {
            if (runLvl === 20) {
                combatState.enemies.push(createEnemy("vintage_behemoth", 13, 4));
            } else {
                let swarmSize = Math.min(6, 1 + Math.floor(runLvl / 2)); 
                for (let i = 0; i < swarmSize; i++) {
                    let spawnX = 14 - Math.floor(i / 3); let spawnY = 3 + (i % 3);
                    combatState.enemies.push(createEnemy("corrupted_cask", spawnX, spawnY));
                }
                if (p.cellarsChummed) {
                    for (let i = 0; i < 5; i++) combatState.enemies.push(createEnemy("pub_crawl_mimic", 8 + i, 5, "Chummed "));
                } else if (runLvl >= 5) combatState.enemies.push(createEnemy("pub_crawl_mimic", 12, 6));
            }
        }
        else { // WILDERNESS
            if (runLvl === 20) {
                combatState.enemies.push(createEnemy("wilderness_overlord", 13, 4, prefixLabel, baitMultiplier));
            } else {
                let swarmSize = Math.min(6, 1 + Math.floor(runLvl / 2)); 
                let publingsToSpawn = (runLvl === 5) ? 1 : (runLvl === 10) ? 2 : (runLvl === 15) ? 3 : 0;

                for (let i = 0; i < swarmSize; i++) {
                    let spawnX = 14 - Math.floor(i / 3); let spawnY = 3 + (i % 3);           
                    
                    if (publingsToSpawn > 0) {
                        combatState.enemies.push(createEnemy("publing", spawnX, spawnY, prefixLabel, baitMultiplier));
                        publingsToSpawn--;
                    } else {
                        combatState.enemies.push(createEnemy("wild_ravager", spawnX, spawnY, prefixLabel, baitMultiplier));
                    }
                }
                if (p.mapBaited) combatState.enemies.push(createEnemy("alpha_poacher", 6, 5));
            }
        }

        let obsIcon = "🪨"; let obsSprite = "map_boulder";
        if (zone === 'WILDERNESS') { obsIcon = "🌲"; obsSprite = "map_tree"; } 
        else if (zone === 'CELLARS') { obsIcon = "🛢️"; obsSprite = "map_broken_cask"; }
        else if (zone === 'ABYSS') { obsIcon = "🔮"; obsSprite = "map_pillar"; }
        
        if (zone === 'WILDERNESS' && runLvl === 20) {
            combatState.player.x = 1; combatState.player.y = 4;
            let pillars = [{x: 5, y: 1}, {x: 5, y: 8}, {x: 14, y: 1}, {x: 14, y: 8}];
            pillars.forEach(p => combatState.obstacles.push({ x: p.x, y: p.y, icon: obsIcon, spriteId: obsSprite }));
        } else if (zone !== 'CINEMATIC') { 
            let obsCount = (zone === 'ABYSS') ? 20 : 10;
            for (let i = 0; i < obsCount; i++) {
                let ox = Math.floor(Math.random() * combatState.gridSize.cols); 
                let oy = Math.floor(Math.random() * combatState.gridSize.rows);
                let blocked = (ox === combatState.player.x && oy === combatState.player.y);
                combatState.enemies.forEach(em => {
                    let s = em.size || 1;
                    if (ox >= em.x && ox < em.x + s && oy >= em.y && oy < em.y + s) blocked = true;
                });
                if (!blocked) combatState.obstacles.push({ x: ox, y: oy, icon: obsIcon, spriteId: obsSprite });
            }
        }

        combatState.enemies.forEach((e, idx) => { 
            e.uid = `mob_${idx}`; 
            e.atbCharge = 0; 
        });
        
        activeCombats[socket.id] = combatState;
        io.to(socket.id).emit('combatDeployed', combatState);
    });

   socket.on('endPlayerTurn', (data) => {
        let p = activePlayers[socket.id];
        let combat = activeCombats[socket.id];
        if (!p || !combat) return;

        if (data && data.playerPos) {
            combat.player.x = data.playerPos.x;
            combat.player.y = data.playerPos.y;
        }

        combat.player.atbCharge = 0;
        combat.atbPaused = false;
    });

    socket.on('clientPlaybackComplete', () => {
        let combat = activeCombats[socket.id];
        if (combat) combat.playbackLock = false; 
    });

    function executeEnemyTurn(socketId, combat, p, e) {
        if (!e.alive || p.hp <= 0) return;
        let turnEvents = [];
        
        let cols = combat.gridSize.cols || 16;
        let rows = combat.gridSize.rows || 10;
        let collisionMatrix = Array(cols).fill(null).map(() => Array(rows).fill(0));
        
        combat.obstacles.forEach(o => { if (o.x >= 0 && o.x < cols && o.y >= 0 && o.y < rows) collisionMatrix[o.x][o.y] = 1; });
        combat.enemies.forEach(en => {
            if (en.alive) {
                let enSize = en.size || 1;
                for (let bx = en.x; bx < en.x + enSize; bx++) {
                    for (let by = en.y; by < en.y + enSize; by++) {
                        if (bx >= 0 && bx < cols && by >= 0 && by < rows) collisionMatrix[bx][by] = 2;
                    }
                }
            }
        });

        if (combat.player.x >= 0 && combat.player.x < cols && combat.player.y >= 0 && combat.player.y < rows) {
            collisionMatrix[combat.player.x][combat.player.y] = 2; 
        }

        function hasLineOfSightMatrix(x1, y1, x2, y2) {
            let dx = Math.abs(x2 - x1); let dy = Math.abs(y2 - y1);
            let sx = (x1 < x2) ? 1 : -1; let sy = (y1 < y2) ? 1 : -1;
            let err = dx - dy; let cx = x1; let cy = y1;
            while (true) {
                if (cx === x2 && cy === y2) return true;
                if (cx !== x1 || cy !== y1) {
                    if (collisionMatrix[cx] === undefined || collisionMatrix[cx][cy] === 1) return false; 
                }
                let e2 = 2 * err;
                if (e2 > -dy) { err -= dy; cx += sx; }
                if (e2 < dx) { err += dx; cy += sy; }
            }
        }

        function getEnemyPathStep(entity) {
            let eSize = entity.size || 1;
            let queue = [{x: entity.x, y: entity.y}];
            let visited = new Set([`${entity.x},${entity.y}`]);
            let parent = {};
            let dirs = [{x:0, y:-1}, {x:1, y:0}, {x:0, y:1}, {x:-1, y:0}];
            let targetNode = null; let closestNode = {x: entity.x, y: entity.y}; let minDist = Infinity;
            let searchCount = 0; let searchLimit = 30; 
            
            while(queue.length > 0 && searchCount < searchLimit) {
                searchCount++; let curr = queue.shift();
                let d = getGridDistance(combat.player.x, combat.player.y, curr.x, curr.y, eSize);
                let hasLos = false;
                if (d <= entity.attackRange) {
                    for (let bx = curr.x; bx < curr.x + eSize; bx++) {
                        for (let by = curr.y; by < curr.y + eSize; by++) if (hasLineOfSightMatrix(bx, by, combat.player.x, combat.player.y)) hasLos = true;
                    }
                }

                if (d < minDist) { minDist = d; closestNode = curr; }
                if (d <= entity.attackRange && hasLos) { targetNode = curr; break; }

                for (let dir of dirs) {
                    let nx = curr.x + dir.x; let ny = curr.y + dir.y; let key = `${nx},${ny}`;
                    if (!visited.has(key)) {
                        visited.add(key); let blocked = false;
                        for (let bx = nx; bx < nx + eSize; bx++) {
                            for (let by = ny; by < ny + eSize; by++) {
                                if (bx < 0 || bx >= cols || by < 0 || by >= rows) blocked = true;
                                else if (collisionMatrix[bx][by] === 2 && !(bx >= entity.x && bx < entity.x + eSize && by >= entity.y && by < entity.y + eSize)) blocked = true; 
                                else if (collisionMatrix[bx][by] === 1 && eSize === 1) blocked = true; 
                            }
                        }
                        if (!blocked) { parent[key] = curr; queue.push({x: nx, y: ny}); }
                    }
                }
            }
            if (!targetNode) targetNode = closestNode;
            if (targetNode.x === entity.x && targetNode.y === entity.y) return null;
            let step = targetNode;
            while (parent[`${step.x},${step.y}`] && (parent[`${step.x},${step.y}`].x !== entity.x || parent[`${step.x},${step.y}`].y !== entity.y)) { step = parent[`${step.x},${step.y}`]; }
            return step;
        }

        let eSize = e.size || 1;
        let dist = getGridDistance(combat.player.x, combat.player.y, e.x, e.y, eSize);
        let hasLos = false;
        
        if (dist <= e.attackRange) {
            for (let bx = e.x; bx < e.x + eSize; bx++) {
                for (let by = e.y; by < e.y + eSize; by++) if (hasLineOfSightMatrix(bx, by, combat.player.x, combat.player.y)) hasLos = true;
            }
        }

        if (dist > e.attackRange || !hasLos) {
            let steps = e.speed;
            while (steps > 0) {
                dist = getGridDistance(combat.player.x, combat.player.y, e.x, e.y, eSize);
                hasLos = false;
                if (dist <= e.attackRange) {
                    for (let bx = e.x; bx < e.x + eSize; bx++) {
                        for (let by = e.y; by < e.y + eSize; by++) if (hasLineOfSightMatrix(bx, by, combat.player.x, combat.player.y)) hasLos = true; 
                    }
                }
                if (dist <= e.attackRange && hasLos) break;

                let nextStep = getEnemyPathStep(e);
                if (nextStep) {
                    e.x = nextStep.x; e.y = nextStep.y;
                    turnEvents.push({ type: 'move', uid: e.uid, enemyId: e.id, name: e.name, finalX: e.x, finalY: e.y });
                } else break;
                steps--;
            }
        }

        dist = getGridDistance(combat.player.x, combat.player.y, e.x, e.y, eSize);
        hasLos = false;
        if (dist <= e.attackRange) {
            for (let bx = e.x; bx < e.x + eSize; bx++) {
                for (let by = e.y; by < e.y + eSize; by++) if (hasLineOfSightMatrix(bx, by, combat.player.x, combat.player.y)) hasLos = true; 
            }
        }

        if (dist <= e.attackRange && hasLos) {
            let isPoacher = e.attackRange > 1;
            let eOffense = e.offense * 10;
            let playerSpeed = getEffectiveStat(p, 'speed') * 10; 
            let enemyHitPower = (eOffense * 0.5) + (Math.random() * eOffense * 0.5);
            let playerSpeedMitigation = Math.random() * playerSpeed;

            if ((enemyHitPower - playerSpeedMitigation) <= 0) {
                turnEvents.push({ type: 'deflect', enemyName: e.name }); 
            } else {
                let rawDamageRoll = Math.sqrt(Math.random()) * eOffense;
                let playerDef = getEffectiveStat(p, 'defense') * 10;
                let playerAbsorption = Math.pow(Math.random(), 2) * playerDef;
                let mitigatedDmg = Math.floor(rawDamageRoll - armorAbsorption);

                if (mitigatedDmg <= 0) turnEvents.push({ type: 'deflect', enemyName: e.name }); 
                else {
                    let isCrit = mitigatedDmg >= Math.floor(eOffense * 0.90);
                    p.hp -= mitigatedDmg;
                    turnEvents.push({ type: 'hit', uid: e.uid, enemyName: e.name, damage: mitigatedDmg, isCrit: isCrit, isPoacher: isPoacher, ex: e.x, ey: e.y });
                    
                    if (p.hp <= 0) { 
                        p.hp = 0; 
                        
                        // NORMAL COMBAT DEATH PENALTY
                        // Destroy all gear and wipe the inventory!
                        p.equipment = {
                            helmet: null,
                            armor: null,
                            weapon: JSON.parse(JSON.stringify(ItemDatabase["rusty_mace"])),
                            gloves: null,
                            boots: null
                        };
                        p.inventory = [];
                        p.pendingLoot = [];
                        p.pendingGold = 0;
                        p.pendingXp = 0;

                        delete activeCombats[socketId]; 
                        turnEvents.push({ type: 'death' }); 
                    }
                }
            } 
        } 
        
        return turnEvents;
    }

    socket.on('combatMove', (data) => {
        let p = activePlayers[socket.id];
        let combat = activeCombats[socket.id];
        
        if (!p || !combat) return socket.emit('moveReceipt', { success: false, message: '❌ Server connection lost. Please refresh the page.' });

        if (combat.atbPaused !== true) {
            return socket.emit('moveReceipt', { success: false, message: '❌ Tactical Error: Cannot move out of turn.', x: combat.player.x, y: combat.player.y });
        }

        let speed = getEffectiveStat(p, 'speed');
        speed = Math.max(1, Math.min(12, speed));
        
        let dist = getGridDistance(combat.player.x, combat.player.y, data.tx, data.ty, 1);
        
       if (data.tx < 0 || data.tx >= combat.gridSize.cols || data.ty < 0 || data.ty >= combat.gridSize.rows) {
            return socket.emit('moveReceipt', { success: false, message: '❌ Server: Coordinates out of bounds.', x: combat.player.x, y: combat.player.y });
        }
        let hitWall = combat.obstacles.some(o => o.x === data.tx && o.y === data.ty);
        if (hitWall) {
            return socket.emit('moveReceipt', { success: false, message: '❌ Server: Obstacle collision detected.', x: combat.player.x, y: combat.player.y });
        }
        let hitEnemy = combat.enemies.some(e => {
            let s = e.size || 1;
            return e.alive && data.tx >= e.x && data.tx < e.x + s && data.ty >= e.y && data.ty < e.y + s;
        });
        if (hitEnemy) {
            return socket.emit('moveReceipt', { success: false, message: '❌ Server: Entity collision detected.', x: combat.player.x, y: combat.player.y });
        }

        let moveStaminaCost = Math.floor((dist / speed) * 10);

        if (p.stamina >= moveStaminaCost) {
            p.stamina -= moveStaminaCost;
            combat.player.x = data.tx;
            combat.player.y = data.ty;
            socket.emit('moveReceipt', { success: true, updatedPlayer: p });
        } else {
            socket.emit('moveReceipt', { success: false, message: `❌ Server: Not enough stamina to move (${p.stamina}/${moveStaminaCost}).`, x: combat.player.x, y: combat.player.y });
        }
    });

    socket.on('takePendingLoot', (idx) => {
        let p = activePlayers[socket.id];
        if (!p || !p.pendingLoot || !p.pendingLoot[idx]) return;

        p.maxInventorySlots = p.maxInventorySlots || 5;
        if (p.inventory.length < p.maxInventorySlots) {
            let securedItem = p.pendingLoot.splice(idx, 1)[0];
            p.inventory.push(securedItem);
            socket.emit('inventoryReceipt', { success: true, action: 'takeLoot', updatedPlayer: p, message: `🎒 Secured ${securedItem.name} in backpack.` });
        } else {
            socket.emit('inventoryReceipt', { success: false, message: "❌ Backpack is full!" });
        }
    });

    socket.on('sellPendingLoot', (idx) => {
        let p = activePlayers[socket.id];
        if (!p || !p.pendingLoot || !p.pendingLoot[idx]) return;

        let itemToSell = p.pendingLoot.splice(idx, 1)[0];
        let val = itemToSell.value || (itemToSell.rarity === "Gorilla" ? 500 : 15);
        p.gold += val;
        
        socket.emit('inventoryReceipt', { success: true, action: 'sell', updatedPlayer: p, message: `💰 Sold dropped item for ${val}g.` });
    });
	
    socket.on('claimCombatRewards', () => {
        let p = activePlayers[socket.id];
        if (!p) return;

        const MAX_PLAYER_LEVEL = 50;
        const SP_PER_LEVEL = 5;

        p.gold = p.gold || 0; p.xp = p.xp || 0; p.level = p.level || 1; p.xpToNext = p.xpToNext || 100;

        if (p.pendingGold > 0) p.gold += p.pendingGold;
        
        if (p.pendingXp > 0) {
            p.xp += p.pendingXp;
            
            while (p.xp >= p.xpToNext && p.level < MAX_PLAYER_LEVEL) {
                p.xp -= p.xpToNext; 
                p.level += 1; 
                p.skillPoints = (p.skillPoints || 0) + SP_PER_LEVEL;
                
                let base = 100; let multiplier = Math.pow(1.15, p.level - 1); let flatBump = p.level * 50;
                p.xpToNext = Math.floor((base * multiplier) + flatBump);
                
                p.hp = getMaxHp(p);
                p.stamina = getMaxStamina(p);
            }
            
            if (p.level >= MAX_PLAYER_LEVEL) {
                p.xp = 0;
                p.xpToNext = "MAX";
            }
        }
        
        p.hp = getMaxHp(p);
        p.stamina = getMaxStamina(p);
        
        p.pendingGold = 0; p.pendingXp = 0; p.pendingLoot = [];
        p.activeBuffs = []; p.activeCombatBuff = null;
        p.mapBaited = false; p.cellarsChummed = false;

        socket.emit('combatRewardsReceipt', { updatedPlayer: p });
    });
	
    if (!global.atbEngineStarted) {
        global.atbEngineStarted = true;
        
        setInterval(() => {
            for (let socketId in activeCombats) {
                let combat = activeCombats[socketId];
                let p = activePlayers[socketId];

                if (!p || !combat || combat.atbPaused) continue;

                let playerSpeed = (getEffectiveStat(p, 'speed') * 3) + 5;
                combat.player.atbCharge = Math.min(100, (combat.player.atbCharge || 0) + playerSpeed);

                combat.enemies.forEach(e => {
                    if (e.alive) {
                        let eSpeed = ((e.speed || 1) * 3) + 5;
                        e.atbCharge = Math.min(100, (e.atbCharge || 0) + eSpeed);
                    }
                });

                if (combat.player.atbCharge >= 100) {
                    combat.atbPaused = true; 
                    io.to(socketId).emit('ATB_READY'); 
                } else {
                    let readyEnemies = combat.enemies.filter(e => e.alive && e.atbCharge >= 100);
                    
                    if (readyEnemies.length > 0) {
                        let masterEventList = [];
                        
                        readyEnemies.forEach(e => {
                            e.atbCharge = 0; 
                            let events = executeEnemyTurn(socketId, combat, p, e);
                            if (events && events.length > 0) masterEventList.push(...events); 
                        });
                        
                        if (masterEventList.length > 0) {
                            combat.playbackLock = true; 
                            io.to(socketId).emit('enemyTurnReceipt', { 
                                events: masterEventList, 
                                updatedPlayer: p, 
                                updatedCombatState: combat 
                            });
                        }
                    }
                }
            }
        }, 200);
    }
};