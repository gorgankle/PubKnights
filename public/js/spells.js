// --- spells.js ---
const SpellDatabase = {
    "fireball_breath": {
        name: "Fireball Breath",
        type: "line",       // Tells the server to use Line of Effect math
        cost: 20,           // Stamina drain
        range: 5,           // Maximum tiles away the player can target
        damageFlat: 35,     // Base damage before modifiers
        ignoresLoS: false,  // If false, the fireball stops when it hits a wall
        desc: "Exhale a scorching beam of fire that burns everything in a straight path."
    }
    // Future spells like "arcane_nova" (type: 'burst') or "mend" (type: 'heal') go here!
};

// Ensure export for Node.js backend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpellDatabase };
}