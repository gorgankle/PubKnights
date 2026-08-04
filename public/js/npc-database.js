// === REPLACED ===
// --- npc-database.js ---
// A master dictionary of all base enemy stats.

const NpcDatabase = {
    // Shared-rig standard humanoids (statistics remain independent of visuals)
    "melee_bandit": { name: "Melee Bandit", type: "MELEE", hp: 28, maxHp: 28, attackRange: 1, offense: 3, defense: 2, speed: 3, icon: "B", size: 1, visualProfileId: "melee_bandit", aiProfileId: "melee_pursuer" },
    "bandit_archer": { name: "Bandit Archer", type: "RANGED", hp: 22, maxHp: 22, attackRange: 5, offense: 3, defense: 1, speed: 3, icon: "A", size: 1, projectileSprite: "icon_arrow", visualProfileId: "bandit_archer", aiProfileId: "ranged_skirmisher" },
    "hedge_mage": { name: "Hedge Mage", type: "RANGED", hp: 24, maxHp: 24, attackRange: 5, offense: 3, defense: 1, speed: 2, icon: "H", size: 1, spellId: "arcane_bolt", spellFx: { type: "beam", style: "arcane", density: 10, spread: 8, speed: 8 }, visualProfileId: "hedge_mage", aiProfileId: "telegraph_caster" },

    // Shared-rig advanced humanoids (production encounter statistics)
    "harvest_champion": { name: "Harvest Pitchfork Champion", type: "MELEE", hp: 90, maxHp: 90, attackRange: 2, offense: 5, defense: 5, speed: 3, icon: "H", size: 1, visualProfileId: "harvest_champion", aiProfileId: "polearm_pursuer" },
    "shield_guard_captain": { name: "Shielded Guard Captain", type: "MELEE", hp: 220, maxHp: 220, attackRange: 1, offense: 22, defense: 25, speed: 2, icon: "C", size: 1, visualProfileId: "shield_guard_captain", aiProfileId: "shield_guard" },
    "cellar_duelist": { name: "Cellar Knife-Duelist", type: "MELEE", hp: 130, maxHp: 130, attackRange: 1, offense: 28, defense: 12, speed: 5, icon: "D", size: 1, poisonChance: 0.2, poisonTurns: 3, visualProfileId: "cellar_dweller", aiProfileId: "agile_duelist" },
    "tankard_brute": { name: "Tankard Maul Brute", type: "MELEE", hp: 340, maxHp: 340, attackRange: 1, offense: 34, defense: 18, speed: 1, icon: "T", size: 1, visualProfileId: "tankard_brute", aiProfileId: "heavy_telegraph" },
    "cult_champion": { name: "Cult Scythe Champion", type: "MELEE", hp: 165, maxHp: 165, attackRange: 2, offense: 38, defense: 18, speed: 3, icon: "C", size: 1, visualProfileId: "cult_champion", aiProfileId: "scythe_telegraph" },

    // Wilderness
    "goblin_axeling": { name: "Goblin Axeling", type: "MELEE", hp: 18, maxHp: 18, attackRange: 1, offense: 1, defense: 1, speed: 3, icon: "G", size: 1, visualProfileId: "goblin_axeling" },
    "peanut_slinger": { name: "Peanut Slinger", type: "RANGED", hp: 14, maxHp: 14, attackRange: 5, offense: 1, defense: 0, speed: 3, icon: "S", size: 1, projectileSprite: "icon_peanut" },
    "magic_banana": { name: "Magic Banana", type: "RANGED", hp: 22, maxHp: 22, attackRange: 5, offense: 2, defense: 1, speed: 2, icon: "B", size: 1, spellId: "poison_shot", spellFx: { type: "beam", style: "poison", density: 8, spread: 10, speed: 10 }, poisonChance: 0.45, poisonTurns: 3 },
    "wild_ravager": { name: "Wild Ravager", type: "MELEE", hp: 15, maxHp: 15, attackRange: 1, offense: 1, defense: 1, speed: 3, icon: "👾", size: 1 },
    "publing": { name: "Wild Publing", type: "MELEE", hp: 50, maxHp: 50, attackRange: 1, offense: 2, defense: 2, speed: 3, icon: "🐻", size: 1 },
    "alpha_poacher": { name: "Wilderness Alpha-Poacher", type: "RANGED", hp: 75, maxHp: 75, attackRange: 10, offense: 2, defense: 1, speed: 3, icon: "🏹", size: 1, projectileSprite: "icon_arrow", visualProfileId: "alpha_poacher", aiProfileId: "ranged_skirmisher" },
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
        visualProfileId: template.visualProfileId,
        aiProfileId: template.aiProfileId,
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

