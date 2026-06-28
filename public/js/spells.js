// --- spells.js ---
const SpellDatabase = {
    "fireball_breath": {
        name: "Fireball Breath",
        type: "line",       
        cost: 20,           
        range: 5,           
        damageFlat: 35,     
        ignoresLoS: false,  
        desc: "Exhale a scorching beam of fire that burns everything in a straight path.",
        
        // === NEW: DATA-DRIVEN FX SETTINGS ===
        fx: {
            type: 'beam',
            style: 'fire',   // Maps to your color palettes
            density: 12,     // Distance between overlapping particles
            spread: 15,      // How wild the fire looks
            speed: 15        // Travel speed (ms per frame)
        }
    }
};

// Ensure export for Node.js backend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpellDatabase };
}