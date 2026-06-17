// --- npc-database.js ---
// A master dictionary of all base enemy stats.

const NpcDatabase = {
    // Wilderness
    "wild_ravager": { name: "Wild Ravager", type: "MELEE", hp: 45, maxHp: 45, moveRange: 2, attackRange: 1, attack: 7, resilience: 5, accuracy: 75, icon: "👾", size: 1 },
    "alpha_poacher": { name: "Wilderness Alpha-Poacher", type: "RANGED", hp: 110, maxHp: 110, moveRange: 1, attackRange: 3, attack: 22, resilience: 10, accuracy: 100, icon: "🏹", size: 1 },
    "wilderness_overlord": { name: "Wilderness Apex Overlord (BOSS)", type: "MELEE", hp: 650, maxHp: 650, moveRange: 3, attackRange: 1, attack: 40, resilience: 30, accuracy: 110, icon: "🐗", size: 2 },
    
    // Cellars
    "corrupted_cask": { name: "Corrupted Wine-Cask", type: "MELEE", hp: 250, maxHp: 250, moveRange: 3, attackRange: 1, attack: 25, resilience: 15, accuracy: 95, icon: "🛢️", size: 1 },
    "pub_crawl_mimic": { name: "Pub-Crawl Mimic", type: "MELEE", hp: 100, maxHp: 100, moveRange: 4, attackRange: 1, attack: 12, resilience: 20, accuracy: 100, icon: "🍺", size: 1 },
    "vintage_behemoth": { name: "The Grand Vintage Behemoth (BOSS)", type: "MELEE", hp: 1200, maxHp: 1200, moveRange: 2, attackRange: 1, attack: 65, resilience: 45, accuracy: 120, icon: "🏺", size: 2 },

    // Gorilla Event
    "enraged_gorilla": { name: "Enraged Gorilla", type: "MELEE", hp: 12000, maxHp: 12000, moveRange: 2, attackRange: 1, attack: 180, resilience: 30, accuracy: 120, icon: "🦍", size: 1 },

    // Abyss Base Templates (These will be dynamically scaled by the map script)
    "spectral_barfly": { name: "Spectral Barfly", type: "RANGED", hp: 80, maxHp: 80, moveRange: 2, attackRange: 4, attack: 18, resilience: 5, accuracy: 95, icon: "👻", size: 1 },
    "mash_crawler": { name: "Blighted Mash-Crawler", type: "MELEE", hp: 120, maxHp: 120, moveRange: 4, attackRange: 1, attack: 20, resilience: 15, accuracy: 85, icon: "🦠", size: 1 },
    "eldritch_keg": { name: "Eldritch Keg-Walker", type: "MELEE", hp: 180, maxHp: 180, moveRange: 2, attackRange: 1, attack: 35, resilience: 25, accuracy: 110, icon: "🗿", size: 1 }
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
        moveRange: template.moveRange,
        attackRange: template.attackRange,
        attack: Math.floor(template.attack * statMult),
        // Resilience doesn't scale linearly, it scales additively in the abyss logic
        resilience: template.resilience, 
        accuracy: template.accuracy,
        alive: true,
        icon: template.icon,
        x: x,
        y: y,
        size: template.size
    };
}

// Make file readable by Node.js server
if (typeof module !== 'undefined' && module.exports) module.exports = { NpcDatabase, createEnemy };

