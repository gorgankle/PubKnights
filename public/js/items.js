// --- items.js ---
// A master dictionary of all items in the game. 

const ItemDatabase = {
	
	// === THE RANGED ARSENAL ===
    "hunter_bow": {
        id: "hunter_bow", name: "Hunter's Bow", slot: "weapon", 
        type: "Bow", // Keeps your item typings intact
        rarity: "Common", offense: 6, attackRange: 5, value: 75, spriteId: "weap_bow",
        projectileSprite: "icon_arrow", // <-- THIS becomes our universal flag
        combat: {
            standard: { range: 5, staminaCost: 5, multiplier: 1.0, animType: "shoot" },
            special: { name: "Piercing Shot", range: 5, staminaCost: 15, multiplier: 1.5, ignoresDefense: true, desc: "A high-velocity shot that pierces armor." }
        }
    },
	
	
    // === PET DROPS ===
    "bone_fetch_club": { 
        id: "bone_fetch_club", name: "Ancient Fetching Bone", slot: "weapon", type: "Club", rarity: "Unique", 
        offense: 30, attackRange: 1, value: 500, spriteId: "weap_bone",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Heavy Smash", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false, animType: "jump_smash", desc: "Converts weight momentum into a heavy attack producing 1.5x standard power." }
        }
    },
    "scavengers_mitts": { id: "scavengers_mitts", name: "Scavenger's Muddy Mitts", slot: "gloves", rarity: "Unique", offense: 13, defense: 3, value: 350, spriteId: "gloves_scavenger" },
    "chewed_stompers": { id: "chewed_stompers", name: "Chewed Leather Stompers", slot: "boots", rarity: "Rare", speed: 2, defense: 1, value: 450, spriteId: "boots_chewed" },
    "beastmaster_tunic": { id: "beastmaster_tunic", name: "Beastmaster's Tunic", slot: "armor", rarity: "Epic", defense: 13, speed: 1, value: 1500, spriteId: "armor_beastmaster" },
    "alpha_collar": { id: "alpha_collar", name: "Alpha's Spiked Collar", slot: "helmet", rarity: "Relic", defense: 18, offense: 13, value: 4500, spriteId: "helm_alpha" },
	
    // === BASIC GEAR ===
    "rusty_mace": { 
        id: "rusty_mace", name: "Rusty Mace", slot: "weapon", type: "Mace", rarity: "Common", 
        offense: 1, attackRange: 1, value: 15, spriteId: "weap_rusty_mace", // <--- Converted to Offense
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Heavy Smash", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false, desc: "Converts weight momentum into a heavy attack producing 1.5x standard power." }
        }
    },
    "rusty_coif": { id: "rusty_coif", name: "Rusty Coif", slot: "helmet", rarity: "common", defense: 3, value: 15, spriteId: "helm_rusty_coif" },
    "sturdy_boots": { id: "sturdy_boots", name: "Sturdy Boots", slot: "boots", rarity: "Common", speed: 1, value: 15, spriteId: "sturdy_boots" },
    "leather_tunic": { id: "leather_tunic", name: "Leather Tunic", slot: "armor", rarity: "Common", defense: 1, value: 10, spriteId: "armor_tunic" },
    "leather_mitts": { id: "leather_mitts", name: "Leather Mitts", slot: "gloves", rarity: "Common", offense: 1, value: 10, spriteId: "gloves_leather_mitts" },
    "hide_boots": { id: "hide_boots", name: "Hide Boots", slot: "boots", rarity: "Common", speed: 1, value: 10, spriteId: "boots_hide" },
	
    "behemoth_maw_crusher": { 
        id: "behemoth_maw_crusher", name: "Behemoth's Splintered Maw", slot: "weapon", type: "Club", rarity: "Unique", 
        offense: 28, attackRange: 1, value: 450, spriteId: "weap_behemoth_maw",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Heavy Smash", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false, desc: "Converts weight momentum into a heavy attack producing 1.5x standard power." }
        }
    },
    "vintage_cask_plate": { id: "vintage_cask_plate", name: "Iron-Banded Cask Plate", slot: "armor", rarity: "Unique", defense: 15, speed: -1, value: 400, spriteId: "armor_cask_plate" },
	
    // === WILDERNESS TIER GEAR ===
    "scavenged_machete": { 
        id: "scavenged_machete", name: "Scavenged Machete", slot: "weapon", type: "Sword", rarity: "Common", 
        offense: 7, attackRange: 1, value: 25, spriteId: "weap_machete",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Flurry", range: 1, staminaCost: 15, multiplier: 1.2, ignoresDefense: false, desc: "Strike rapidly targeting weak structural thresholds for 1.2x weapon value." }
        }
    },
    "hunters_spear": { 
        id: "hunters_spear", name: "Hunter's Spear", slot: "weapon", type: "Spear", rarity: "Rare", 
        offense: 4, attackRange: 2, value: 40, spriteId: "weap_spear",
        combat: {
            standard: { range: 2, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Flurry", range: 2, staminaCost: 15, multiplier: 1.2, ignoresDefense: false, desc: "Strike rapidly targeting weak structural thresholds for 1.2x weapon value." }
        }
    },
    "boar_hide_armor": { id: "boar_hide_armor", name: "Boar-Hide Cuirass", slot: "armor", rarity: "Common", defense: 3, value: 30, spriteId: "armor_boar_hide" },
    "poachers_grips": { id: "poachers_grips", name: "Poacher's Grips", slot: "gloves", rarity: "Rare", offense: 3, value: 35, spriteId: "poachers_grips" },
    "wilderness_cloak": { id: "wilderness_cloak", name: "Wilderness Cloak", slot: "helmet", rarity: "Rare", defense: 6, value: 40, spriteId: "wilderness_cloak" },
	
    // === CELLAR TIER GEAR ===
    "oak_barrel_cuirass": { id: "oak_barrel_cuirass", name: "Oak Barrel Cuirass", slot: "armor", rarity: "Epic", defense: 8, value: 120, spriteId: "armor_oak_barrel" },
    "mimic_fang_dagger": { 
        id: "mimic_fang_dagger", name: "Mimic Fang Dagger", slot: "weapon", type: "Sword", rarity: "Epic", 
        offense: 10, attackRange: 1, value: 150, spriteId: "weap_mimic_dagger",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash", poisonChance: 0.25, poisonTurns: 3 },
            special: { name: "Flurry", range: 1, staminaCost: 15, multiplier: 1.2, ignoresDefense: false, poisonChance: 0.45, poisonTurns: 3, desc: "Strike rapidly targeting weak structural thresholds for 1.2x weapon value." }
        }
    },
    "cellar_striders": { id: "cellar_striders", name: "Cellar Striders", slot: "boots", rarity: "Epic", speed: 1, value: 100, spriteId: "boots_cellar" },
    "cellar_guard": { id: "cellar_guard", name: "Cellar Guard Gauntlets", slot: "gloves", rarity: "Epic", offense: 8, value: 75, spriteId: "cellar_guard" },

    // === THEMATIC / PREMIUM GEAR ===
    "brewmasters_club": { 
        id: "brewmasters_club", name: "Brewmaster's Great-Club", slot: "weapon", type: "Mace", rarity: "Rare", 
        offense: 13, attackRange: 1, value: 120, spriteId: "brewmasters_club",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Heavy Smash", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false, desc: "Converts weight momentum into a heavy attack producing 1.5x standard power." }
        }
    },
    "hop_infused_boots": { id: "hop_infused_boots", name: "Hop-Infused Boots", slot: "boots", rarity: "Rare", speed: 2, value: 80, spriteId: "hop_infused_boots" },

    // === GORILLA BOSS GEAR ===
    "silverback_greatclub": { 
        id: "silverback_greatclub", name: "🍌 Silverback Great-Club", slot: "weapon", type: "Mace", rarity: "Gorilla", 
        offense: 225, attackRange: 2, value: 500, spriteId: "silverback_greatclub",
        combat: {
            standard: { range: 2, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Primate Cataclysm", range: 2, staminaCost: 15, multiplier: 4.0, ignoresDefense: true, desc: "Unleashes a crushing blow dealing 4.0x damage. Ignores resilience mechanics entirely." }
        }
    },
    "primate_armor": { id: "primate_armor", name: "🍌 Primate-Armor Skullplate", slot: "helmet", rarity: "Gorilla", defense: 38, value: 500, spriteId: "primate_armor" },
	
    // === THE PUBSERKER SET (Warrior / Balanced Brawler - Rare) ===
    "pubserker_flatcap": { id: "pubserker_flatcap", name: "Pubserker's Flatcap", slot: "helmet", rarity: "Rare", defense: 8, value: 50, spriteId: "helm_pubserker" },
    "pubserker_suspenders": { id: "pubserker_suspenders", name: "Pubserker's Suspenders", slot: "armor", rarity: "Rare", defense: 10, value: 75, spriteId: "armor_pubserker" },
    "pubserker_knuckles": { 
        id: "pubserker_knuckles", name: "Pubserker Brass Knuckles", slot: "weapon", type: "Club", rarity: "Rare", 
        offense: 11, attackRange: 1, value: 100, spriteId: "weap_knuckles",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Heavy Smash", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false, desc: "Converts weight momentum into a heavy attack producing 1.5x standard power." }
        }
    },
    "pubserker_wraps": { id: "pubserker_wraps", name: "Pubserker Knuckle Wraps", slot: "gloves", rarity: "Rare", offense: 6, value: 60, spriteId: "gloves_pubserker" },
    "pubserker_stompers": { id: "pubserker_stompers", name: "Pubserker Stompers", slot: "boots", rarity: "Rare", speed: 1, value: 60, spriteId: "boots_pubserker" },

    // === THE BEERGLASS SET (Glass Cannon / Evasion - Epic) ===
    "beerglass_visor": { id: "beerglass_visor", name: "Beerglass Visor", slot: "helmet", rarity: "Epic", defense: 3, value: 80, spriteId: "helm_beerglass" },
    "beerglass_cuirass": { id: "beerglass_cuirass", name: "Beerglass Cuirass", slot: "armor", rarity: "Epic", defense: 5, value: 120, spriteId: "armor_beerglass" },
    "beerglass_shiv": { 
        id: "beerglass_shiv", name: "Jagged Beerglass Shiv", slot: "weapon", type: "Sword", rarity: "Epic", 
        offense: 23, attackRange: 1, value: 150, spriteId: "weap_beerglass",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Flurry", range: 1, staminaCost: 15, multiplier: 1.2, ignoresDefense: false, desc: "Strike rapidly targeting weak structural thresholds for 1.2x weapon value." }
        }
    },
    "beerglass_gloves": { id: "beerglass_gloves", name: "Beerglass Shard Gloves", slot: "gloves", rarity: "Epic", offense: 13, value: 90, spriteId: "gloves_beerglass" },
    "beerglass_cleats": { id: "beerglass_cleats", name: "Beerglass Cleats", slot: "boots", rarity: "Epic", speed: 2, value: 110, spriteId: "boots_beerglass" },

    // === THE TANKARD SET (Heavy Defense / Juggernaut - Epic) ===
    "tankard_helm": { id: "tankard_helm", name: "Heavy Tankard Helm", slot: "helmet", rarity: "Epic", defense: 18, value: 100, spriteId: "helm_tankard" },
    "tankard_plating": { id: "tankard_plating", name: "Tankard Oak Plating", slot: "armor", rarity: "Epic", defense: 23, value: 150, spriteId: "armor_tankard" },
    "tankard_maul": { 
        id: "tankard_maul", name: "Iron-Banded Tankard Maul", slot: "weapon", type: "Mace", rarity: "Epic", 
        offense: 8, attackRange: 1, value: 120, spriteId: "weap_tankard",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Heavy Smash", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false, desc: "Converts weight momentum into a heavy attack producing 1.5x standard power." }
        }
    },
    "tankard_gauntlets": { id: "tankard_gauntlets", name: "Tankard Iron Gauntlets", slot: "gloves", rarity: "Epic", offense: 3, value: 80, spriteId: "gloves_tankard" },
    "tankard_sabatons": { id: "tankard_sabatons", name: "Tankard Sabatons", slot: "boots", rarity: "Epic", speed: -1, value: 90, spriteId: "boots_tankard" },
	
    // === CONSUMABLES ===
    "stout": {
        id: "stout", name: "Combat Stout", slot: "consumable", type: "brew", rarity: "Common", value: 12, spriteId: "stout",
        desc: "A battlefield stout for staying upright. Restores 40% Max HP immediately.",
        combat: { actionType: "heal", targetType: "self", futureTarget: "ally", healPercent: 0.40, staminaCost: 0, desc: "Restores 40% of maximum Vitality." }
    },
    "reserve": {
        id: "reserve", name: "Grandmaster Reserve", slot: "consumable", type: "brew", rarity: "Epic", value: 120, spriteId: "icon_reserve",
        desc: "A scarce emergency vintage. Restores nearly all wounds and purges poison.",
        combat: { actionType: "heal", targetType: "self", futureTarget: "ally", healPercent: 0.90, cleanse: true, staminaCost: 0, desc: "Restores 90% Max HP and cleanses negative status." }
    },
    "ipa": {
        id: "ipa", name: "Furious IPA", slot: "consumable", type: "brew", rarity: "Uncommon", value: 55, spriteId: "icon_ipa",
        desc: "A strong, oak-aged specialty ale. Grants +25% outgoing damage for the deployment.",
        combat: {
            actionType: "buff", staminaCost: 0, buffType: "IPA",
            effectCategory: "offense", effectType: "multiplier", effectValue: 1.25,
            msg: "🍺 Drank a Furious IPA! Damage output increased by 25%."
        }
    },
    "lager": {
        id: "lager", name: "Swift Lager", slot: "consumable", type: "brew", rarity: "Uncommon", value: 55, spriteId: "icon_lager",
        desc: "A light, crisp lager brewed for tempo. Grants +1 Speed and immediately charges ATB.",
        combat: {
            actionType: "buff", staminaCost: 0, buffType: "LAGER",
            effectCategory: "speed", effectType: "flat", effectValue: 1, atbBoost: 35,
            msg: "🍺 Drank a Swift Lager! Movement improved and initiative surged."
        }
    },
    "ironwall_porter": {
        id: "ironwall_porter", name: "Ironwall Porter", slot: "consumable", type: "brew", rarity: "Rare", value: 70, spriteId: "icon_reserve",
        desc: "A dense defensive porter. Grants +25% Defense for the deployment.",
        combat: {
            actionType: "buff", staminaCost: 0, buffType: "IRONWALL_PORTER",
            effectCategory: "defense", effectType: "multiplier", effectValue: 1.25,
            msg: "🛡️ Drank an Ironwall Porter! Defense increased by 25%."
        }
    },
    "clearwater_tonic": {
        id: "clearwater_tonic", name: "Clearwater Tonic", slot: "consumable", type: "brew", rarity: "Uncommon", value: 35, spriteId: "icon_lager",
        desc: "A clean bitter tonic that removes poison and other negative status effects.",
        combat: { actionType: "cleanse", targetType: "self", futureTarget: "ally", staminaCost: 0, desc: "Cleanses negative combat status effects." }
    },
    "staunching_bitter": {
        id: "staunching_bitter", name: "Staunching Bitter", slot: "consumable", type: "brew", rarity: "Rare", value: 80, spriteId: "icon_ipa",
        desc: "A harsh emergency brew for when the fight is slipping away. Cleanses and restores at least 30% Max HP.",
        combat: { actionType: "staunch", targetType: "self", futureTarget: "downedAlly", healFloorPercent: 0.30, cleanse: true, staminaCost: 0, desc: "Emergency staunch: cleanse and raise HP to at least 30% Max HP." }
    },

    // === THE BLACKED-OUT SET (Abyssal Relic Tier) ===
    "blackout_blinders": { id: "blackout_blinders", name: "Blackout Blinders", slot: "helmet", rarity: "Relic", defense: 13, value: 2500, spriteId: "helm_blackout" },
    "blackout_trench": { id: "blackout_trench", name: "Bouncer's Blackout Trench", slot: "armor", rarity: "Relic", defense: 23, value: 3500, spriteId: "armor_blackout" },
    "blackout_axe": { 
        id: "blackout_axe", name: "Void-Forged Keg-Splitter", slot: "weapon", type: "Axe", rarity: "Relic", 
        offense: 73, attackRange: 1, value: 5000, spriteId: "weap_blackout",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Execute", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false, desc: "Brings down a devastating vertical chop producing 1.5x standard power." }
        }
    },
    "blackout_wraps": { id: "blackout_wraps", name: "Numbed Knuckle Wraps", slot: "gloves", rarity: "Relic", offense: 38, value: 2000, spriteId: "gloves_blackout" },
    "blackout_staggers": { id: "blackout_staggers", name: "The Spins (Staggering Boots)", slot: "boots", rarity: "Relic", speed: 2, value: 2200, spriteId: "boots_blackout" },

    // === CRATE DROPS & JUNK ===
    "junk_splinters": { id: "junk_splinters", name: "Handful of Splinters", slot: "consumable", type: "junk", rarity: "Common", value: 1, spriteId: "icon_junk" },
    "junk_boots": { id: "junk_boots", name: "Waterlogged Boot", slot: "consumable", type: "junk", rarity: "Common", value: 1, spriteId: "icon_junk" },
    "junk_vine": { id: "junk_vine", name: "Rotten Vine", slot: "consumable", type: "junk", rarity: "Common", value: 1, spriteId: "icon_junk" },
    "fish_wholesale": { id: "fish_wholesale", name: "Wholesale Export Voucher", slot: "consumable", type: "voucher", rarity: "Rare", value: 1500, spriteId: "icon_voucher" },
    
    // === CRATE JACKPOT GEAR ===
    "axe_timberlord": { 
        id: "axe_timberlord", name: "Timber-Lord's Axe", slot: "weapon", type: "Axe", rarity: "Relic", 
        offense: 48, attackRange: 1, value: 800, spriteId: "weap_timberlord",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Execute", range: 1, staminaCost: 15, multiplier: 1.5, ignoresDefense: false, desc: "Brings down a devastating vertical chop producing 1.5x standard power." }
        }
    },
    "waders_angler": { id: "waders_angler", name: "The Angler's Waders", slot: "boots", rarity: "Relic", speed: 1, defense: 8, value: 800, spriteId: "boots_angler" },
    "hat_harvester": { id: "hat_harvester", name: "Harvester's Straw Hat", slot: "helmet", rarity: "Relic", defense: 13, value: 800, spriteId: "helm_harvester" },

    // === NEW TIMBER CRATE EXPANSION ===
    "junk_pinecone": { id: "junk_pinecone", name: "Crushed Pinecone", slot: "consumable", type: "junk", rarity: "Common", value: 2, spriteId: "junk_pinecone" },
    "junk_petrified_leaf": { id: "junk_petrified_leaf", name: "Petrified Leaf", slot: "consumable", type: "junk", rarity: "Common", value: 3, spriteId: "junk_petrified_leaf" },
    "flannel_shirt": { id: "flannel_shirt", name: "Lumberjack's Flannel", slot: "armor", rarity: "Uncommon", defense: 2, value: 25, spriteId: "flannel_shirt" },
    "beanie_hat": { id: "beanie_hat", name: "Wool Beanie", slot: "helmet", rarity: "Uncommon", defense: 1, value: 20, spriteId: "beanie_hat" },
    "bark_wraps": { id: "bark_wraps", name: "Rough Bark Wraps", slot: "gloves", rarity: "Rare", offense: 5, value: 55, spriteId: "bark_wraps" },
    "stump_stompers": { id: "stump_stompers", name: "Stump Stompers", slot: "boots", rarity: "Rare", speed: 1, value: 65, spriteId: "stump_stompers" },
    "sawblade_chakram": { 
        id: "sawblade_chakram", name: "Rusty Sawblade", slot: "weapon", type: "Sword", rarity: "Epic", 
        offense: 14, attackRange: 1, value: 140, spriteId: "sawblade_chakram",
        combat: {
            standard: { range: 1, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Flurry", range: 1, staminaCost: 15, multiplier: 1.2, ignoresDefense: false, desc: "Strike rapidly targeting weak structural thresholds for 1.2x weapon value." }
        }
    },
    "heartwood_cuirass": { id: "heartwood_cuirass", name: "Heartwood Cuirass", slot: "armor", rarity: "Epic", defense: 11, value: 160, spriteId: "heartwood_cuirass" },
    "heartwood_crown": { id: "heartwood_crown", name: "Heartwood Crown", slot: "helmet", rarity: "Relic", defense: 18, value: 1200, spriteId: "heartwood_crown" },

    // === NEW ANGLER CRATE EXPANSION ===
    "junk_seaweed": { id: "junk_seaweed", name: "Soggy Seaweed", slot: "consumable", type: "junk", rarity: "Common", value: 2, spriteId: "junk_seaweed" },
    "junk_fishbones": { id: "junk_fishbones", name: "Old Fishbones", slot: "consumable", type: "junk", rarity: "Common", value: 3, spriteId: "junk_fishbones" },
    "slicker_jacket": { id: "slicker_jacket", name: "Yellow Rain Slicker", slot: "armor", rarity: "Uncommon", defense: 3, value: 30, spriteId: "slicker_jacket" },
    "fishermans_hat": { id: "fishermans_hat", name: "Fisherman's Bucket Hat", slot: "helmet", rarity: "Uncommon", defense: 2, value: 25, spriteId: "fishermans_hat" },
    "barnacle_bracers": { id: "barnacle_bracers", name: "Barnacle Bracers", slot: "gloves", rarity: "Rare", offense: 6, value: 60, spriteId: "barnacle_bracers" },
    "coral_sabatons": { id: "coral_sabatons", name: "Coral Sabatons", slot: "boots", rarity: "Rare", speed: 1, value: 70, spriteId: "coral_sabatons" },
    "harpoon_trident": { 
        id: "harpoon_trident", name: "Whaler's Harpoon", slot: "weapon", type: "Spear", rarity: "Epic", 
        offense: 12, attackRange: 2, value: 150, spriteId: "harpoon_trident",
        combat: {
            standard: { range: 2, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Flurry", range: 2, staminaCost: 15, multiplier: 1.2, ignoresDefense: false, desc: "Strike rapidly targeting weak structural thresholds for 1.2x weapon value." }
        }
    },
    "abyssal_diving_suit": { id: "abyssal_diving_suit", name: "Abyssal Diving Suit", slot: "armor", rarity: "Epic", defense: 13, value: 180, spriteId: "abyssal_diving_suit" },
    "abyssal_lantern": { id: "abyssal_lantern", name: "Lantern of the Deep", slot: "helmet", rarity: "Relic", defense: 15, value: 1300, spriteId: "abyssal_lantern" },

    // === NEW HARVEST CRATE EXPANSION ===
    "junk_horseshoe": { id: "junk_horseshoe", name: "Rusted Horseshoe", slot: "consumable", type: "junk", rarity: "Common", value: 2, spriteId: "junk_horseshoe" },
    "junk_corncob": { id: "junk_corncob", name: "Gnawed Corncob", slot: "consumable", type: "junk", rarity: "Common", value: 3, spriteId: "junk_corncob" },
    "denim_overalls": { id: "denim_overalls", name: "Denim Overalls", slot: "armor", rarity: "Uncommon", defense: 2, value: 25, spriteId: "denim_overalls" },
    "straw_hat": { id: "straw_hat", name: "Woven Straw Hat", slot: "helmet", rarity: "Uncommon", defense: 1, value: 20, spriteId: "straw_hat" },
    "work_gloves": { id: "work_gloves", name: "Sturdy Work Gloves", slot: "gloves", rarity: "Rare", offense: 6, value: 50, spriteId: "work_gloves" },
    "muddy_boots": { id: "muddy_boots", name: "Mud-Caked Boots", slot: "boots", rarity: "Rare", speed: 1, value: 65, spriteId: "muddy_boots" },
    "pitchfork_spear": { 
        id: "pitchfork_spear", name: "Farmer's Pitchfork", slot: "weapon", type: "Spear", rarity: "Epic", 
        offense: 11, attackRange: 2, value: 130, spriteId: "pitchfork_spear",
        combat: {
            standard: { range: 2, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { name: "Flurry", range: 2, staminaCost: 15, multiplier: 1.2, ignoresDefense: false, desc: "Strike rapidly targeting weak structural thresholds for 1.2x weapon value." }
        }
    },
    "burlap_sack_mask": { id: "burlap_sack_mask", name: "Scarecrow's Sack", slot: "helmet", rarity: "Epic", defense: 9, value: 140, spriteId: "burlap_sack_mask" },
    "scythe_of_reaping": { 
        id: "scythe_of_reaping", name: "Scythe of Reaping", slot: "weapon", type: "Axe", rarity: "Relic", 
        offense: 58, attackRange: 2, value: 1600, spriteId: "scythe_of_reaping",
        combat: {
            standard: { range: 2, staminaCost: 5, multiplier: 1.0, animType: "lunge_bash" },
            special: { 
                name: "Scythe Spin", 
                targetType: "aoe",       // NEW: Triggers Targeting Phase
                aoeShape: "radius",      // NEW: Draws the 3x3 red box
                aoeRadius: 1,            // NEW: 1 tile radius = 3x3 grid
                range: 2, 
                staminaCost: 30, 
                multiplier: 1.2, 
                ignoresDefense: false, 
                animType: "lunge_slash", // Physically whirlwinds to the target center!
                desc: "Whirlwinds to a target location, striking all entities in a 3x3 radius." 
            }
        }
    },

    // === STAFF WEAPONS ===
    "apprentice_staff": {
        id: "apprentice_staff", name: "Apprentice Tapstaff", slot: "weapon", type: "Staff", rarity: "Uncommon",
        offense: 6, attackRange: 5, value: 90, spriteId: "weap_apprentice_staff",
        combat: {
            standard: { actionType: "spell", spellId: "arcane_bolt", range: 5, staminaCost: 6, multiplier: 1.0, animType: "cast", desc: "Cast a reliable single-target Arcane Bolt." },
            special: { name: "Fireball Breath", actionType: "spell", spellId: "fireball_breath", range: 5, staminaCost: 20, multiplier: 1.0, targetType: "single", desc: "Burn a straight lane with a fiery beam from the staff." }
        }
    },
    "bogwood_staff": {
        id: "bogwood_staff", name: "Bogwood Hex Staff", slot: "weapon", type: "Staff", rarity: "Rare",
        offense: 9, attackRange: 5, value: 180, spriteId: "weap_bogwood_staff",
        combat: {
            standard: { actionType: "spell", spellId: "arcane_bolt", range: 5, staminaCost: 6, multiplier: 1.0, animType: "cast", desc: "Cast a reliable single-target Arcane Bolt." },
            special: { name: "Poison Shot", actionType: "spell", spellId: "poison_shot", range: 5, staminaCost: 15, multiplier: 1.0, targetType: "single", desc: "Thread poison through a line and try to infect each target hit." }
        }
    },
    "stormcaller_staff": {
        id: "stormcaller_staff", name: "Stormcaller Tapstaff", slot: "weapon", type: "Staff", rarity: "Epic",
        offense: 14, attackRange: 5, value: 360, spriteId: "weap_stormcaller_staff",
        combat: {
            standard: { actionType: "spell", spellId: "frost_lance", range: 5, staminaCost: 16, multiplier: 1.0, animType: "cast", desc: "Pierce a lane with a cold lance." },
            special: { name: "Storm Burst", actionType: "spell", spellId: "storm_burst", targetType: "aoe", aoeShape: "radius", aoeRadius: 1, range: 4, staminaCost: 28, multiplier: 1.0, animType: "cast", desc: "Call lightning into a 3x3 target area." }
        }
    },
    "last_call_voidstaff": {
        id: "last_call_voidstaff", name: "Last Call Voidstaff", slot: "weapon", type: "Staff", rarity: "Relic",
        offense: 24, attackRange: 5, value: 1500, spriteId: "weap_last_call_voidstaff",
        combat: {
            standard: { actionType: "spell", spellId: "shadow_sear", range: 5, staminaCost: 14, multiplier: 1.0, animType: "cast", desc: "Sear one enemy with dark magic." },
            special: { name: "Storm Burst", actionType: "spell", spellId: "storm_burst", targetType: "aoe", aoeShape: "radius", aoeRadius: 1, range: 4, staminaCost: 28, multiplier: 1.0, animType: "cast", desc: "Open a violent 3x3 storm at target location." }
        }
    },
    // === GAMBLE CRATES ===
    "timber_crate": {
        id: "timber_crate", name: "Sealed Timber Crate", slot: "consumable", type: "crate", rarity: "Epic", value: 1000, spriteId: "icon_crate_timber", 
        desc: "A heavy, splintering box smelling of pine. Who knows what the Quartermaster packed inside?"
    },
    "angler_crate": {
        id: "angler_crate", name: "Waterlogged Angler Crate", slot: "consumable", type: "crate", rarity: "Epic", value: 1000, spriteId: "icon_crate_angler",
        desc: "A damp, barnacle-covered crate. It sloshes slightly when shaken."
    },
    "harvest_crate": {
        id: "harvest_crate", name: "Overgrown Harvest Crate", slot: "consumable", type: "crate", rarity: "Epic", value: 1000, spriteId: "icon_crate_harvest",
        desc: "A crate wrapped in thick vines. Smells faintly of fermenting hops."
    },
};

// The helper function stays safely OUTSIDE the database
function getItem(itemId) {
    if (!ItemDatabase[itemId]) return null;
    return { ...ItemDatabase[itemId] }; 
}

// === NODE.JS EXPORT BRIDGE ===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ItemDatabase, getItem };
}
