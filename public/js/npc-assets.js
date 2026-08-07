// Compatibility registry for the public sprite tools.
// sprite-overhaul-world.js rebuilds every NPC matrix except icon_peanut.
// Humanoid NPC Studio intentionally omits the icon activation entry point, so
// the projectile keeps its legacy matrix here while all other keys are stubs.

Object.assign(SpriteMatrices, {
    "npc_kreg": undefined,
    "goblin_axeling": undefined,
    "peanut_slinger": undefined,
    "icon_peanut": buildSprite([
        "........................",
        "........................",
        "........................",
        ".........ddddddd........",
        "........ddNNNNNdd.......",
        "........dNNNNNNNdd......",
        "........dNccNNNNNd......",
        "........dNNcNNNNNd......",
        "........ddNccNNNNd......",
        ".........dNNNNNddd......",
        ".........dNNNNddNd......",
        ".........dNddddNNd......",
        "........ddddNNNNNd......",
        ".......ddNNNNNNNdd......",
        ".......dNNNNNcNNd.......",
        ".......dNNNNccNdd.......",
        ".......dNNNccNNd........",
        ".......ddNNcNNNd........",
        ".......ddNNcNNNd........",
        "........dddNNNNd........",
        "..........dddNdd........",
        "............ddd.........",
        "........................",
        "........................"
    ]),
    "magic_banana": undefined,
    "wild_ravager": undefined,
    "publing": undefined,
    "alpha_poacher": undefined,
    "wilderness_overlord": undefined,
    "corrupted_cask": undefined,
    "pub_crawl_mimic": undefined,
    "chummed_mimic": undefined,
    "vintage_behemoth": undefined,
    "enraged_gorilla": undefined,
    "spectral_barfly": undefined,
    "mash_crawler": undefined,
    "eldritch_keg": undefined
});
