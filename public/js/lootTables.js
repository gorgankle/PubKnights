// --- lootTables.js ---
// Maps enemy IDs to their specific loot pools, drop chances, and guaranteed XP rewards.

const LootTables = {
// === WILDERNESS MOBS ===
    "wild_ravager": {
        xpDrop: 20,
        dropChance: 0.9, 
        pools: [
            { itemId: "boar_hide_armor", weight: 5 },   
            { itemId: "scavenged_machete", weight: 10 },
            { itemId: "rusty_mace", weight: 10 },        
            { itemId: "sturdy_boots", weight: 15 },
            { itemId: "rusty_coif", weight: 15 },
            // Added Starter Leather Gear
            { itemId: "leather_tunic", weight: 15 },
            { itemId: "leather_mitts", weight: 15 },
            { itemId: "hide_boots", weight: 15 }
        ]
    },
	"publing": {
        xpDrop: 35,
        dropChance: 0.65, 
        pools: [
            { itemId: "boar_hide_armor", weight: 20 },
            { itemId: "leather_tunic", weight: 20 },
            { itemId: "leather_mitts", weight: 15 },
            { itemId: "hide_boots", weight: 15 },
            { itemId: "scavenged_machete", weight: 15 },
            // Small chance for mid-game gear 
            { itemId: "brewmasters_club", weight: 15 }
        ]
    },
    "alpha_poacher": {
        xpDrop: 45,
        dropChance: 0.75, 
        pools: [
            { itemId: "hunters_spear", weight: 20},     
            { itemId: "poachers_grips", weight: 20},    
            { itemId: "wilderness_cloak", weight: 20},  
            { itemId: "hop_infused_boots", weight: 21},
            // Early tease of the Pubserker defensive pieces
            { itemId: "pubserker_flatcap", weight: 3 },
            { itemId: "pubserker_suspenders", weight: 3 },
            { itemId: "pubserker_stompers", weight: 3 },
        ]
    },
    "wilderness_overlord": {
        xpDrop: 300,
        dropChance: 1.0, 
        pools: [
            // The Overlord heavily supplies the aggressive Pubserker set for Cellar prep
            { itemId: "brewmasters_club", weight: 20 },  
            { itemId: "pubserker_knuckles", weight: 20 },
            { itemId: "pubserker_wraps", weight: 20 },
            { itemId: "pubserker_suspenders", weight: 15 },
            { itemId: "pubserker_flatcap", weight: 15 },
            { itemId: "pubserker_stompers", weight: 10 }
        ]
    },

    // === CELLAR MOBS ===
    "corrupted_cask": {
        xpDrop: 60,
        dropChance: 0.60, 
        pools: [
            // Casks drop baseline Epic gear and the defensive/mobility set pieces
            { itemId: "oak_barrel_cuirass", weight: 20 }, 
            { itemId: "cellar_striders", weight: 20 },    
            { itemId: "cellar_guard", weight: 20 },
            { itemId: "tankard_plating", weight: 10 },
            { itemId: "tankard_sabatons", weight: 10 },
            { itemId: "beerglass_cuirass", weight: 10 },
            { itemId: "beerglass_cleats", weight: 10 },
            // Occasional healing drop
            { itemId: "stout", weight: 5 }
        ]
    },
    "pub_crawl_mimic": {
        xpDrop: 50,
        dropChance: 0.85, 
        pools: [
            // Mimics hoard the most dangerous Epic weapons and helmets!
            { itemId: "mimic_fang_dagger", weight: 15 },  
            { itemId: "beerglass_shiv", weight: 15 },
            { itemId: "tankard_maul", weight: 15 },
            { itemId: "beerglass_visor", weight: 10 },
            { itemId: "beerglass_gloves", weight: 10 },
            { itemId: "tankard_helm", weight: 10 },
            { itemId: "tankard_gauntlets", weight: 10 },
            // Ultimate healing brew
            { itemId: "reserve", weight: 5 }
        ]
    },
    "vintage_behemoth": {
        xpDrop: 450,
        dropChance: 1.0, 
        pools: [
            // Boss table is highly focused on its Unique drops
            { itemId: "behemoth_maw_crusher", weight: 48 },
            { itemId: "vintage_cask_plate", weight: 47 },
            // 20% chance to secure Gorilla tier gear early to help scale the Abyss!
            { itemId: "silverback_greatclub", weight: 3 },
            { itemId: "primate_armor", weight: 2 }
        ]
    },

    // === GORILLA BOSSES ===
    "enraged_gorilla": {
        xpDrop: 150,
        dropChance: 0.35, 
        pools: [
            { itemId: "silverback_greatclub", weight: 50 },
            { itemId: "primate_armor", weight: 50 }
        ]
    },
	
// === BLACK MARKET GAMBLES ===
    "black_market": {
        xpDrop: 0,
        dropChance: 1.0, 
        pools: [
            // Reverted back to mostly early-game gear for the 50 Hops price tag
            { itemId: "rusty_mace", weight: 25 },
            { itemId: "sturdy_boots", weight: 20 },
            { itemId: "boar_hide_armor", weight: 20 },
            { itemId: "scavenged_machete", weight: 15 },
            { itemId: "wilderness_cloak", weight: 10 },
            { itemId: "leather_tunic", weight: 5 },
            { itemId: "leather_mitts", weight: 5 },
            // A microscopic tease for mid-game gear to keep them gambling
            { itemId: "brewmasters_club", weight: 2 },
            { itemId: "hop_infused_boots", weight: 2 },
            { itemId: "pubserker_flatcap", weight: 1 }
        ]
    },

    // === PROCEDURAL ABYSS MOBS ===
    "spectral_barfly": {
        xpDrop: 120, // Base XP (Note: We can scale this dynamically later if needed)
        dropChance: 0.65,
        pools: [
            // Drops the Evasion/Glass Cannon gear and IPAs
            { itemId: "beerglass_shiv", weight: 30 },
            { itemId: "beerglass_visor", weight: 30 },
            { itemId: "ipa", weight: 20 },
            // The elusive Relic Drop: 2% relative chance!
            { itemId: "blackout_blinders", weight: 2 }
        ]
    },
    "mash_crawler": {
        xpDrop: 150,
        dropChance: 0.65,
        pools: [
            // Drops the Brawler gear and standard Stouts
            { itemId: "pubserker_knuckles", weight: 30 },
            { itemId: "pubserker_stompers", weight: 30 },
            { itemId: "stout", weight: 20 },
            // The elusive Relic Drops!
            { itemId: "blackout_staggers", weight: 2 },
            { itemId: "blackout_wraps", weight: 2 }
        ]
    },
"eldritch_keg": {
        xpDrop: 220,
        dropChance: 0.75,
        pools: [
            { itemId: "tankard_plating", weight: 30 },
            { itemId: "tankard_maul", weight: 30 },
            { itemId: "reserve", weight: 20 },
            { itemId: "blackout_trench", weight: 2 },
            { itemId: "blackout_axe", weight: 2 } 
        ]
    },

// === PET SCAVENGING ===
"pet_scavenge": {
        xpDrop: 0,
        dropChance: 1.0, 
        pools: [
            { itemId: "scavengers_mitts", weight: 45 },   // 45% - Most common find
            { itemId: "chewed_stompers", weight: 25 },    // 25% - Uncommon
            { itemId: "bone_fetch_club", weight: 15 },    // 15% - Rare
            { itemId: "beastmaster_tunic", weight: 10 },  // 10% - Epic
            { itemId: "alpha_collar", weight: 5 }         // 5% - The Relic Jackpot!
        ]
    }
};

const CRATE_LOOT_TABLES = {
    timber_crate: {
		common: [
            { id: "wood", name: "Bundle of Wood", amt: 150, type: "resource" },
            { id: "junk_splinters", name: "Handful of Splinters", amt: 1, type: "junk", desc: "A useless handful of sharp wood." }
        ],
        uncommon: [
            { id: "wood", name: "Lumber Haul", amt: 1500, type: "resource" },
            { id: "bomb_small", name: "Small Keg Bomb", amt: 2, type: "consumable" }
        ],
        rare: [
            { id: "bomb_heavy", name: "Heavy Keg Bomb", amt: 3, type: "consumable" }
        ],
        jackpot: [
            { id: "axe_timberlord", name: "Timber-Lord's Axe", type: "gear", slot: "weapon", desc: "A colossal axe. Guaranteed critical strikes against plant-based enemies." }
        ]
    },
    
    angler_crate: {
		common: [
            { id: "fish", name: "Trawler Catch", amt: 150, type: "resource" },
            { id: "junk_boots", name: "Waterlogged Boot", amt: 1, type: "junk", desc: "Smells awful. Totally unwearable." }
        ],
        uncommon: [
            { id: "fish", name: "Trawler Catch", amt: 1500, type: "resource" },
            { id: "lager", name: "Swift Lager", amt: 2, type: "consumable" }
        ],
        rare: [
            { id: "fish_wholesale", name: "Wholesale Export Voucher", amt: 1, type: "consumable", desc: "Instantly claim 1500 Gold." }
        ],
        jackpot: [
            { id: "waders_angler", name: "The Angler's Waders", type: "gear", slot: "boots", desc: "Grants +20% damage in the deepest levels of the Procedural Abyss." }
        ]
    },

    harvest_crate: {
		common: [
            { id: "hops", name: "Sack of Hops", amt: 150, type: "resource" },
            { id: "junk_vine", name: "Rotten Vine", amt: 1, type: "junk", desc: "Withered and useless." }
        ],
        uncommon: [
            { id: "hops", name: "Bountiful Harvest", amt: 1500, type: "resource" },
            { id: "ipa", name: "Furious IPA", amt: 2, type: "consumable" }
        ],
        rare: [
            { id: "reserve", name: "Grandmaster Reserve", amt: 2, type: "consumable" }
        ],
        jackpot: [
            { id: "hat_harvester", name: "Harvester's Straw Hat", type: "gear", slot: "helmet", desc: "A legendary farmer's hat. Grants a passive +5% to Deflection." }
        ]
    }
};


// Make file readable by Node.js server
if (typeof module !== 'undefined' && module.exports) module.exports = { LootTables, CRATE_LOOT_TABLES };