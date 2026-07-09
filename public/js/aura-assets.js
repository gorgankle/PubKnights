// --- aura-assets.js ---
// Data-driven combat aura configurations for statuses and temporary buffs.

const AuraDatabase = {
    poison: {
        id: "poison",
        style: "rise",
        radius: 0.2,
        intensity: 1,
        opacity: 0.22,
        colors: ["#273c24", "#8e44ad"]
    },
    IPA: {
        id: "IPA",
        style: "rise",
        radius: 0.16,
        intensity: 0.85,
        opacity: 0.26,
        colors: ["#d35400", "#f1c40f"]
    },
    LAGER: {
        id: "LAGER",
        style: "rise",
        radius: 0.14,
        intensity: 0.8,
        opacity: 0.24,
        colors: ["#1abc9c", "#3498db"]
    }
};

function getAura(auraId) {
    const aura = AuraDatabase[auraId];
    return aura ? JSON.parse(JSON.stringify(aura)) : null;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuraDatabase, getAura };
}
