// === REPLACED ===
// --- npc-database.js ---
// A master dictionary of all base enemy stats.

const NpcDatabase = {
    // Wilderness
    "wild_ravager": { name: "Wild Ravager", type: "MELEE", hp: 45, maxHp: 45, attackRange: 1, offense: 10, defense: 5, speed: 2, icon: "👾", size: 1 },
    "publing": { name: "Wild Publing", type: "MELEE", hp: 65, maxHp: 65, attackRange: 1, offense: 15, defense: 8, speed: 2, icon: "🐻", size: 1 },
    "alpha_poacher": { name: "Wilderness Alpha-Poacher", type: "RANGED", hp: 110, maxHp: 110, attackRange: 3, offense: 25, defense: 10, speed: 1, icon: "🏹", size: 1 },
    "wilderness_overlord": { name: "Wilderness Apex Overlord (BOSS)", type: "MELEE", hp: 650, maxHp: 650, attackRange: 1, offense: 45, defense: 30, speed: 3, icon: "🐗", size: 2 },
    
    // Cellars
    "corrupted_cask": { name: "Corrupted Wine-Cask", type: "MELEE", hp: 250, maxHp: 250, attackRange: 1, offense: 30, defense: 15, speed: 3, icon: "🛢️", size: 1 },
    "pub_crawl_mimic": { name: "Pub-Crawl Mimic", type: "MELEE", hp: 100, maxHp: 100, attackRange: 1, offense: 20, defense: 20, speed: 4, icon: "🍺", size: 1 },
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
        attackRange: template.attackRange,
        offense: Math.floor(template.offense * statMult),
        // Defense remains unscaled linearly to prevent unkillable abyssal tanks
        defense: template.defense, 
        speed: template.speed,
        alive: true,
        icon: template.icon,
        x: x,
        y: y,
        size: template.size
    };
}

// Make file readable by Node.js server
if (typeof module !== 'undefined' && module.exports) module.exports = { NpcDatabase, createEnemy };

