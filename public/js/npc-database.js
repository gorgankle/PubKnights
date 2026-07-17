// === REPLACED ===
// --- npc-database.js ---
// A master dictionary of all base enemy stats.

const NpcDatabase = {
    // Wilderness
    "goblin_axeling": { name: "Goblin Axeling", type: "MELEE", hp: 18, maxHp: 18, attackRange: 1, offense: 1, defense: 1, speed: 3, icon: "G", size: 1 },
    "peanut_slinger": { name: "Peanut Slinger", type: "RANGED", hp: 14, maxHp: 14, attackRange: 5, offense: 1, defense: 0, speed: 3, icon: "S", size: 1, projectileSprite: "icon_peanut" },
    "magic_banana": { name: "Magic Banana", type: "RANGED", hp: 22, maxHp: 22, attackRange: 5, offense: 2, defense: 1, speed: 2, icon: "B", size: 1, spellId: "poison_shot", spellFx: { type: "beam", style: "poison", density: 8, spread: 10, speed: 10 }, poisonChance: 0.45, poisonTurns: 3 },
    "wild_ravager": { name: "Wild Ravager", type: "MELEE", hp: 15, maxHp: 15, attackRange: 1, offense: 1, defense: 1, speed: 3, icon: "👾", size: 1 },
    "publing": { name: "Wild Publing", type: "MELEE", hp: 50, maxHp: 50, attackRange: 1, offense: 2, defense: 2, speed: 3, icon: "🐻", size: 1 },
    "alpha_poacher": { name: "Wilderness Alpha-Poacher", type: "RANGED", hp: 75, maxHp: 75, attackRange: 10, offense: 2, defense: 1, speed: 3, icon: "🏹", size: 1 },
    "wilderness_overlord": { name: "Wilderness Apex Overlord (BOSS)", type: "MELEE", hp: 150, maxHp: 150, attackRange: 2, offense: 5, defense: 5, speed: 5, icon: "🐗", size: 2 },
    
    // Cellars
    "corrupted_cask": { name: "Corrupted Wine-Cask", type: "MELEE", hp: 250, maxHp: 250, attackRange: 1, offense: 30, defense: 15, speed: 3, icon: "🛢️", size: 1 },
    "pub_crawl_mimic": { name: "Pub-Crawl Mimic", type: "MELEE", hp: 100, maxHp: 100, attackRange: 1, offense: 20, defense: 20, speed: 4, icon: "🍺", size: 1, poisonChance: 0.3, poisonTurns: 3 },
    "vintage_behemoth": { name: "The Grand Vintage Behemoth (BOSS)", type: "MELEE", hp: 1200, maxHp: 1200, attackRange: 1, offense: 70, defense: 45, speed: 2, icon: "🏺", size: 2 },

    // Gorilla Event
    "enraged_gorilla": { name: "Enraged Gorilla", type: "MELEE", hp: 12000, maxHp: 12000, attackRange: 1, offense: 100, defense: 50, speed: 2, icon: "🦍", size: 1 },

    // Abyss Base Templates (These will be dynamically scaled by the map script)
    "spectral_barfly": { name: "Spectral Barfly", type: "RANGED", hp: 80, maxHp: 80, attackRange: 4, offense: 25, defense: 5, speed: 2, icon: "👻", size: 1 },
    "mash_crawler": { name: "Blighted Mash-Crawler", type: "MELEE", hp: 120, maxHp: 120, attackRange: 1, offense: 30, defense: 15, speed: 4, icon: "🦠", size: 1 },
    "eldritch_keg": { name: "Eldritch Keg-Walker", type: "MELEE", hp: 180, maxHp: 180, attackRange: 1, offense: 45, defense: 25, speed: 2, icon: "🗿", size: 1 }
};

// Global helper function to spawn enemies easily
function createEnemy(id, x, y, customPrefix = "", statMult = 1.0) {
    let template = NpcDatabase[id];
    if (!template) {
        console.error("Enemy ID not found in database:", id);
        return null;
    }
    
    // Create a deep copy of the template and apply scaling
    return {
        id: id,
        name: customPrefix + template.name,
        type: template.type,
        hp: Math.floor(template.hp * statMult),
        maxHp: Math.floor(template.maxHp * statMult),
        maxStamina: template.maxStamina || 25,
        stamina: template.maxStamina || 25,
        attackStaminaCost: template.attackStaminaCost || 5,
        attackRange: template.attackRange,
        offense: Math.floor(template.offense * statMult),
        // Defense remains unscaled linearly to prevent unkillable abyssal tanks
        defense: template.defense, 
        speed: template.speed,
        projectileSprite: template.projectileSprite,
        spellId: template.spellId,
        spellFx: template.spellFx,
        poisonChance: template.poisonChance,
        poisonTurns: template.poisonTurns,
        alive: true,
        icon: template.icon,
        x: x,
        y: y,
        size: template.size
    };
}

// Make file readable by Node.js server
if (typeof module !== 'undefined' && module.exports) module.exports = { NpcDatabase, createEnemy };

