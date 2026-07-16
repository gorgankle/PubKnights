// --- spells.js ---
const SpellDatabase = {
    "arcane_bolt": {
        name: "Arcane Bolt",
        type: "single",
        cost: 6,
        range: 5,
        damageFlat: 10,
        powerScale: 1.15,
        ignoresLoS: false,
        desc: "Fire a focused bolt of tavern-blue arcane force at one enemy.",
        fx: { type: 'beam', style: 'arcane', density: 10, spread: 8, speed: 8 }
    },
    "fireball_breath": {
        name: "Fireball Breath",
        type: "line",
        cost: 20,
        range: 5,
        damageFlat: 35,
        powerScale: 0.45,
        ignoresLoS: false,
        desc: "Exhale a scorching beam of fire that burns everything in a straight path.",
        fx: { type: 'beam', style: 'fire', density: 12, spread: 15, speed: 15 }
    },
    "poison_shot": {
        name: "Poison Shot",
        type: "line",
        cost: 15,
        range: 5,
        damageFlat: 24,
        powerScale: 0.35,
        poisonChance: 0.45,
        poisonTurns: 3,
        ignoresLoS: false,
        desc: "Launch a toxic beam that splashes venom through a straight line.",
        fx: { type: 'beam', style: 'poison', density: 8, spread: 10, speed: 10 }
    },
    "frost_lance": {
        name: "Frost Lance",
        type: "line",
        cost: 16,
        range: 5,
        damageFlat: 22,
        powerScale: 0.55,
        ignoresLoS: false,
        desc: "Thread a cold lance through a lane, punishing lined-up enemies.",
        fx: { type: 'beam', style: 'frost', density: 9, spread: 6, speed: 9 }
    },
    "storm_burst": {
        name: "Storm Burst",
        type: "aoe",
        cost: 28,
        range: 4,
        damageFlat: 18,
        powerScale: 0.85,
        aoeRadius: 1,
        ignoresLoS: false,
        desc: "Call down a crackling burst that hits everything in a 3x3 area.",
        fx: { type: 'burst', style: 'storm', radius: 1.45, density: 5, spread: 18, speed: 6, frames: 24 }
    },
    "shadow_sear": {
        name: "Shadow Sear",
        type: "single",
        cost: 14,
        range: 5,
        damageFlat: 18,
        powerScale: 1.35,
        ignoresLoS: false,
        desc: "Brand one enemy with a heavy pulse of dark pub magic.",
        fx: { type: 'beam', style: 'shadow', density: 7, spread: 12, speed: 7 }
    }
};

// Ensure export for Node.js backend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpellDatabase };
}
