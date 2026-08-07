// Compatibility entry point retained for the public tools and live page.
// The implementation is consolidated in sprite-overhaul-world.js; registration
// stays here to preserve every existing page's asset initialization order.

const {
    IconOverhaulMatrices,
    IconOverhaulAliases
} = registerIconOverhaulMatrices();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IconOverhaulMatrices,
        makeCenteredOverhaulIcon,
        makeBrewOverhaulIcon,
        makeCrateOverhaulIcon,
        makeJunkOverhaulIcon
    };
}
