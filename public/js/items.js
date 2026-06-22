// --- items.js ---
// A master dictionary of all items in the game. 

const ItemDatabase = {
	// Pet drops
	"bone_fetch_club": { 
        id: "bone_fetch_club", name: "Ancient Fetching Bone", slot: "weapon", type: "Club", rarity: "Unique", 
        atkBonus: 60, attackRange: 1, value: 500, spriteId: "weap_bone" 
    },
    "scavengers_mitts": { 
        id: "scavengers_mitts", name: "Scavenger's Muddy Mitts", slot: "gloves", rarity: "Unique", 
        atkBonus: 25, deflectChance: 5, value: 350, spriteId: "gloves_scavenger" 
    },
	
	"chewed_stompers": { 
        id: "chewed_stompers", name: "Chewed Leather Stompers", slot: "boots", rarity: "Rare", 
        moveBonus: 3, deflectChance: 2, value: 450, spriteId: "boots_chewed" 
    },
    "beastmaster_tunic": { 
        id: "beastmaster_tunic", name: "Beastmaster's Tunic", slot: "armor", rarity: "Epic", 
        deflectChance: 25, moveBonus: 1, value: 1500, spriteId: "armor_beastmaster" 
    },
    "alpha_collar": { 
        id: "alpha_collar", name: "Alpha's Spiked Collar", slot: "helmet", rarity: "Relic", 
        deflectChance: 35, atkBonus: 25, value: 4500, spriteId: "helm_alpha" 
    },
	
    // Basic Gear
    "rusty_mace": { 
        id: "rusty_mace", 
        name: "Rusty Mace", 
        slot: "weapon", 
        type: "Mace", 
        rarity: "Common", 
        atkBonus: 8, 
        attackRange: 1, 
        value: 15,
        spriteId: "weap_rusty_mace" 
    },
	    "rusty_coif": { 
        id: "rusty_coif", 
        name: "Rusty Coif", 
        slot: "helmet", 
        rarity: "common", 
        deflectChance: 5, 
        value: 15,
        spriteId: "helm_rusty_coif"
    },
	
    "sturdy_boots": { 
        id: "sturdy_boots", 
        name: "Sturdy Boots", 
        slot: "boots", 
        rarity: "Common", 
        moveBonus: 1, 
        value: 15,
        spriteId: "sturdy_boots"
    },
	
"behemoth_maw_crusher": { 
        id: "behemoth_maw_crusher", 
        name: "Behemoth's Splintered Maw", 
        slot: "weapon", 
        type: "Club", 
        rarity: "Unique", 
        atkBonus: 55, // Buffed from 38 to 55 to compete with Gorilla gear
        attackRange: 1, 
        value: 450, 
        spriteId: "weap_behemoth_maw" 
    },
    "vintage_cask_plate": { 
        id: "vintage_cask_plate", 
        name: "Iron-Banded Cask Plate", 
        slot: "armor", 
        rarity: "Unique", 
        deflectChance: 30, // Buffed from 18 to 30. Massive defense for the Abyss!
        moveBonus: -1, // NEW: Heavy iron restricts movement
        value: 400, 
        spriteId: "armor_cask_plate" 
    },
	
	// --- Wilderness Tier Gear ---
    "scavenged_machete": { 
        id: "scavenged_machete", 
        name: "Scavenged Machete", 
        slot: "weapon", 
        type: "Sword", 
        rarity: "Common", 
        atkBonus: 14, 
        attackRange: 1, 
        value: 25, 
        spriteId: "weap_machete" 
    },
"hunters_spear": { 
        id: "hunters_spear", 
        name: "Hunter's Spear", 
        slot: "weapon", 
        type: "Spear", 
        rarity: "Rare", 
        atkBonus: 8, 
        attackRange: 2, 
        value: 40, 
        spriteId: "weap_spear",

    },
    "boar_hide_armor": { 
        id: "boar_hide_armor", 
        name: "Boar-Hide Cuirass", 
        slot: "armor", 
        rarity: "Common", 
        deflectChance: 6, 
        value: 30, 
        spriteId: "armor_boar_hide" 
    },
    "poachers_grips": { 
        id: "poachers_grips", 
        name: "Poacher's Grips", 
        slot: "gloves", 
        rarity: "Rare", 
        atkBonus: 6, 
        value: 35, 
        spriteId: "poachers_grips" 
    },
    "wilderness_cloak": { 
        id: "wilderness_cloak", 
        name: "Wilderness Cloak", 
        slot: "helmet", 
        rarity: "Rare", 
        deflectChance: 12, 
        value: 40,
        spriteId: "wilderness_cloak"
    },
	
	// --- Cellar Tier Gear ---
    "oak_barrel_cuirass": { 
        id: "oak_barrel_cuirass", 
        name: "Oak Barrel Cuirass", 
        slot: "armor", 
        rarity: "Epic", 
        deflectChance: 15, 
        value: 120, 
        spriteId: "armor_oak_barrel" 
    },
    "mimic_fang_dagger": { 
        id: "mimic_fang_dagger", 
        name: "Mimic Fang Dagger", 
        slot: "weapon", 
        type: "Sword", 
        rarity: "Epic", 
        atkBonus: 20, 
        attackRange: 1, 
        value: 150, 
        spriteId: "weap_mimic_dagger" 
    },
    "cellar_striders": { 
        id: "cellar_striders", 
        name: "Cellar Striders", 
        slot: "boots", 
        rarity: "Epic", 
        moveBonus: 2, 
        value: 100, 
        spriteId: "boots_cellar" 
    },
    "cellar_guard": { 
        id: "cellar_guard", 
        name: "Cellar Guard Gauntlets", 
        slot: "gloves", 
        rarity: "Epic", 
        atkBonus: 15, 
        value: 75,
        spriteId: "cellar_guard"
    },

    // --- Thematic / Premium Gear ---
    "brewmasters_club": { 
        id: "brewmasters_club", 
        name: "Brewmaster's Great-Club", 
        slot: "weapon", 
        type: "Mace", 
        rarity: "Rare", 
        atkBonus: 25, 
        attackRange: 1, 
        value: 120,
        spriteId: "brewmasters_club"
    },
    "hop_infused_boots": { 
        id: "hop_infused_boots", 
        name: "Hop-Infused Boots", 
        slot: "boots", 
        rarity: "Rare", 
        moveBonus: 3, 
        value: 80,
        spriteId: "hop_infused_boots"
    },

    // --- Gorilla Boss Gear ---
    "silverback_greatclub": { 
        id: "silverback_greatclub", 
        name: "🍌 Silverback Great-Club", 
        slot: "weapon", 
        type: "Mace", 
        rarity: "Gorilla", 
        atkBonus: 450, 
        attackRange: 2, 
        value: 500,
        spriteId: "silverback_greatclub"
    },
    "primate_armor": { 
        id: "primate_armor", 
        name: "🍌 Primate-Armor Skullplate", 
        slot: "helmet", 
        rarity: "Gorilla", 
        deflectChance: 75, 
        value: 500,
        spriteId: "primate_armor"
    },
	
// --- THE PUBSERKER SET (Warrior / Balanced Brawler - Rare) ---
    "pubserker_flatcap": { id: "pubserker_flatcap", name: "Pubserker's Flatcap", slot: "helmet", rarity: "Rare", deflectChance: 15, value: 50, spriteId: "helm_pubserker" },
    "pubserker_suspenders": { id: "pubserker_suspenders", name: "Pubserker's Suspenders", slot: "armor", rarity: "Rare", deflectChance: 20, value: 75, spriteId: "armor_pubserker" },
    "pubserker_knuckles": { id: "pubserker_knuckles", name: "Pubserker Brass Knuckles", slot: "weapon", type: "Club", rarity: "Rare", atkBonus: 22, attackRange: 1, value: 100, spriteId: "weap_knuckles" },
    "pubserker_wraps": { id: "pubserker_wraps", name: "Pubserker Knuckle Wraps", slot: "gloves", rarity: "Rare", atkBonus: 12, value: 60, spriteId: "gloves_pubserker" },
    "pubserker_stompers": { id: "pubserker_stompers", name: "Pubserker Stompers", slot: "boots", rarity: "Rare", moveBonus: 1, value: 60, spriteId: "boots_pubserker" },

    // --- THE BEERGLASS SET (Glass Cannon / Evasion - Epic) ---
    "beerglass_visor": { id: "beerglass_visor", name: "Beerglass Visor", slot: "helmet", rarity: "Epic", deflectChance: 5, value: 80, spriteId: "helm_beerglass" }, // Very squishy!
    "beerglass_cuirass": { id: "beerglass_cuirass", name: "Beerglass Cuirass", slot: "armor", rarity: "Epic", deflectChance: 10, value: 120, spriteId: "armor_beerglass" }, // Very squishy!
    "beerglass_shiv": { id: "beerglass_shiv", name: "Jagged Beerglass Shiv", slot: "weapon", type: "Sword", rarity: "Epic", atkBonus: 45, attackRange: 1, value: 150, spriteId: "weap_beerglass" }, // Massive Damage
    "beerglass_gloves": { id: "beerglass_gloves", name: "Beerglass Shard Gloves", slot: "gloves", rarity: "Epic", atkBonus: 25, value: 90, spriteId: "gloves_beerglass" }, // Massive Damage
    "beerglass_cleats": { id: "beerglass_cleats", name: "Beerglass Cleats", slot: "boots", rarity: "Epic", moveBonus: 3, value: 110, spriteId: "boots_beerglass" }, // High Mobility

    // --- THE TANKARD SET (Heavy Defense / Juggernaut - Epic) ---
    "tankard_helm": { id: "tankard_helm", name: "Heavy Tankard Helm", slot: "helmet", rarity: "Epic", deflectChance: 35, value: 100, spriteId: "helm_tankard" }, // Huge Defense
    "tankard_plating": { id: "tankard_plating", name: "Tankard Oak Plating", slot: "armor", rarity: "Epic", deflectChance: 45, value: 150, spriteId: "armor_tankard" }, // Huge Defense
    "tankard_maul": { id: "tankard_maul", name: "Iron-Banded Tankard Maul", slot: "weapon", type: "Mace", rarity: "Epic", atkBonus: 15, attackRange: 1, value: 120, spriteId: "weap_tankard" }, // Low Damage
    "tankard_gauntlets": { id: "tankard_gauntlets", name: "Tankard Iron Gauntlets", slot: "gloves", rarity: "Epic", atkBonus: 5, value: 80, spriteId: "gloves_tankard" }, // Low Damage
    "tankard_sabatons": { id: "tankard_sabatons", name: "Tankard Sabatons", slot: "boots", rarity: "Epic", moveBonus: -1, value: 90, spriteId: "boots_tankard" }, // Heavy armor slows you down!
	
	// --- Consumables ---
    "stout": { 
        id: "stout", 
        name: "Combat Stout", 
        slot: "consumable", 
        type: "brew", 
        rarity: "Common", 
        value: 5,
        spriteId: "stout" 
    },
	"reserve": { 
        id: "reserve", 
        name: "Grandmaster Reserve", 
        slot: "consumable", 
        type: "brew", 
        rarity: "Epic", 
        value: 45,
        spriteId: "icon_reserve" // You can map a custom pixel art icon to this later!
    },

	"ipa": { 
        id: "ipa", 
        name: "Furious IPA", 
        slot: "consumable", 
        type: "brew", 
        rarity: "Rare", 
        value: 15,
        spriteId: "ipa" // Change this from "icon_ipa" to "ipa"
    },
"lager": { 
        id: "lager", 
        name: "Swift Lager", 
        slot: "consumable", 
        type: "brew", 
        rarity: "Rare", 
        value: 15,
        spriteId: "lager" 
    }, // Make sure there is a comma here!

    // --- THE BLACKED-OUT SET (Abyssal Relic Tier) ---
    "blackout_blinders": { 
        id: "blackout_blinders", name: "Blackout Blinders", slot: "helmet", rarity: "Relic", 
        deflectChance: 25, value: 2500, spriteId: "helm_blackout" 
    },
    "blackout_trench": { 
        id: "blackout_trench", name: "Bouncer's Blackout Trench", slot: "armor", rarity: "Relic", 
        deflectChance: 45, value: 3500, spriteId: "armor_blackout" 
    },
"blackout_axe": { 
        id: "blackout_axe", name: "Void-Forged Keg-Splitter", slot: "weapon", type: "Axe", rarity: "Relic", 
        atkBonus: 145, attackRange: 1, value: 5000, spriteId: "weap_blackout" 
    },
    "blackout_wraps": { 
        id: "blackout_wraps", name: "Numbed Knuckle Wraps", slot: "gloves", rarity: "Relic", 
        atkBonus: 75, value: 2000, spriteId: "gloves_blackout" 
    },
    "blackout_staggers": { 
        id: "blackout_staggers", name: "The Spins (Staggering Boots)", slot: "boots", rarity: "Relic", 
        moveBonus: 3, value: 2200, spriteId: "boots_blackout" 
    }
};
	
// === GAMBLE CRATES ===
const GAMBLE_CRATES = {
    timber_crate: {
        id: "timber_crate",
        name: "Sealed Timber Crate",
        slot: "consumable",
        type: "crate",
        rarity: "Epic",
        value: 1000, 
        spriteId: "icon_crate_timber", // Your 24x24 sprite mapping
        desc: "A heavy, splintering box smelling of pine. Who knows what the Quartermaster packed inside?"
    },
    angler_crate: {
        id: "angler_crate",
        name: "Waterlogged Angler Crate",
        slot: "consumable",
        type: "crate",
        rarity: "Epic",
        value: 1000,
        spriteId: "icon_crate_angler",
        desc: "A damp, barnacle-covered crate. It sloshes slightly when shaken."
    },
    harvest_crate: {
        id: "harvest_crate",
        name: "Overgrown Harvest Crate",
        slot: "consumable",
        type: "crate",
        rarity: "Epic",
        value: 1000,
        spriteId: "icon_crate_harvest",
        desc: "A crate wrapped in thick vines. Smells faintly of fermenting hops."
    }
	
// --- CRATE DROPS & JUNK ---
    "junk_splinters": { id: "junk_splinters", name: "Handful of Splinters", slot: "consumable", type: "junk", rarity: "Common", value: 1, spriteId: "icon_junk" },
    "junk_boots": { id: "junk_boots", name: "Waterlogged Boot", slot: "consumable", type: "junk", rarity: "Common", value: 1, spriteId: "icon_junk" },
    "junk_vine": { id: "junk_vine", name: "Rotten Vine", slot: "consumable", type: "junk", rarity: "Common", value: 1, spriteId: "icon_junk" },
    "bomb_small": { id: "bomb_small", name: "Small Keg Bomb", slot: "consumable", type: "bomb", rarity: "Rare", damage: 45, aoe: 1, value: 10, spriteId: "icon_bomb" },
    "bomb_heavy": { id: "bomb_heavy", name: "Heavy Keg Bomb", slot: "consumable", type: "bomb", rarity: "Epic", damage: 120, aoe: 1, value: 30, spriteId: "icon_bomb_heavy" },
    "fish_wholesale": { id: "fish_wholesale", name: "Wholesale Export Voucher", slot: "consumable", type: "voucher", rarity: "Rare", value: 1500, spriteId: "icon_voucher" },
    
    // --- CRATE JACKPOT GEAR ---
    "axe_timberlord": { id: "axe_timberlord", name: "Timber-Lord's Axe", slot: "weapon", type: "Axe", rarity: "Relic", atkBonus: 95, attackRange: 1, value: 800, spriteId: "weap_timberlord" },
    "waders_angler": { id: "waders_angler", name: "The Angler's Waders", slot: "boots", rarity: "Relic", moveBonus: 2, deflectChance: 15, value: 800, spriteId: "boots_angler" },
    "hat_harvester": { id: "hat_harvester", name: "Harvester's Straw Hat", slot: "helmet", rarity: "Relic", deflectChance: 25, value: 800, spriteId: "helm_harvester" }	
	
}; // <--- THIS CLOSES THE ITEM DATABASE!

// The helper function stays safely OUTSIDE the database
function getItem(itemId) {
    if (!ItemDatabase[itemId]) return null;
    return { ...ItemDatabase[itemId] }; 
}
// Make file readable by Node.js server
if (typeof module !== 'undefined' && module.exports) module.exports = { ItemDatabase, getItem };

// === EXPORT FOR NODE.JS SERVER ===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        GAMBLE_CRATES 
    };
}