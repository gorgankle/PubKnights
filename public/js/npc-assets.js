// --- js/npc-assets.js ---
// Procedural Matrix definitions for NPCs (Upgraded to 24x24)

Object.assign(PALETTE, {
    'V': '#8e44ad',     // Vivid Purple (Ravager Base)
    'M': '#2c3e50',     // Midnight Blue (Ravager Contrast)
    'r': '#c0392b',     // Deep Red (Ravager Mouth/Highlights)
    'T': '#e67e22',     // Poacher Tunic Orange
    'f': '#2ecc71',     // Green Accents / Quiver
    'w': '#f4ebd9',     // Wood / String Color
    'b': '#5d4037',     // Boar Brown Fur
    'o': '#3e2723',     // Dark Shadows / Outline
    't': '#f4ebd9',     // Ivory Tusks
    'x': '#e74c3c',     // Glowing Red Eyes
    'c': '#8b5a2b',     // Cask Light Wood
    'C': '#5c3a21',     // Cask Dark Wood
    'i': '#bdc3c7',     // Iron Bands
    'g': '#2ecc71',     // Corrupted Green Glow
    'm': '#f1c40f',     // Beer / Mimic Gold
    'W': '#ffffff',     // Foam / Teeth / Eyes
    'G': '#222222',     // Gorilla Dark Fur
    'A': '#7f8c8d'      // Gorilla Skin / Highlights
});

Object.assign(SpriteMatrices, {
    // --- 24x24 Wild Ravager ---
    "wild_ravager": buildSprite([
        "........................",
        "........................",
        "......MMMM........MMMM..",
        ".....VVVVMMMMMMMMVVVV...",
        ".....VVVVVVVVVVVVVVVV...",
        "......VVVVVVVVVVVVVV....",
        "........VrrrrrrrrV......",
        ".........r......r.......",
        ".......VVVVVVVVVVVV.....",
        ".....VVVVVVVVVVVVVVVV...",
        "...VVVVVVMMMMVVMMMMVVVV.",
        "..VVVVVVM....MM....MVVVV",
        "....VVVM............MVV.",
        "....VVVM............MVV.",
        ".......M............M...",
        "......VV............VV..",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................"
    ]),

    // --- 24x24 Alpha Poacher ---
    "alpha_poacher": buildSprite([
        "........................",
        ".........WWWWWW.........",
        "........SSSSSSSS........",
        "........SWSSSSWS........",
        "........SSSSSSSS........",
        ".......wTTTTTTTT........",
        ".......wfwTTTTTTTTf.....",
        "......wfffwTTTTTTTfff...",
        "......wffffwTTTTTffff...",
        ".......wffffwTTTffff....",
        "........wffffwTffff.....",
        "..........PPPPPPPP......",
        "..........PP....PP......",
        "..........PP....PP......",
        ".........DDDD..DDDD.....",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................"
    ]),
    
    // --- 24x24 Wilderness Overlord (BOSS) ---
    "wilderness_overlord": buildSprite([
        "........................",
        "........................",
        ".........ooooooooo......",
        ".......obbbbbbbbbbo.....",
        "......obbbxbbbbxbbbo....",
        "......obbbbbbbbbbbbo....",
        "....ttoboooooooboottt...",
        "...t..oobbbbbbbboo..t...",
        "......obbbbbbbbbbbo.....",
        ".....obbbbbbbbbbbbbo....",
        ".....obboobbbbbboobo....",
        ".....obooobbbbbbooob....",
        ".....oo..obbbbbbo..oo...",
        ".........obooobbo.......",
        ".........obooobbo.......",
        "........obbooobboo......",
        "........ooo...ooo.......",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................"
    ]),

    // --- 24x24 Corrupted Cask ---
    "corrupted_cask": buildSprite([
        "........................",
        "........................",
        "........CCCCCCCC........",
        "......CccccccccccC......",
        ".....CiiiiiiiiiiiiC.....",
        ".....CccccccccccccC.....",
        ".....CcgcccggcccccC.....",
        ".....CcggcgggccgcgC.....",
        ".....CcccggcgcgcccC.....",
        ".....CccccccccccccC.....",
        ".....CccccccccccccC.....",
        ".....CiiiiiiiiiiiiC.....",
        ".....CccccccccccccC.....",
        "......CccccccccccC......",
        "........CCCCCCCC........",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................"
    ]),

    // --- 24x24 Pub-Crawl Mimic ---
    "pub_crawl_mimic": buildSprite([
        "........................",
        "........................",
        "........WWWWWWWW........",
        "......WWWWWWWWWWWW......",
        "......WmmmmmmmmmmWW.....",
        "......WmxmmmxmmxmmWWW...",
        "......WmxmmmxmmxmmWmW...",
        "......WmmmmmmmmmmmWmW...",
        "......WmCCCCCCCCmmWmW...",
        "......WmWxxWxxWmmmWmW...",
        "......WmWWWWWWWWmmWmW...",
        "......WmmmmmmmmmmmWmW...",
        "......WmmmmmmmmmmmWW....",
        "......WWWWWWWWWWWW......",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................"
    ]),

    "chummed_mimic": buildSprite([
        "........................",
        "........................",
        "........WWWWWWWW........",
        "......WWWWWWWWWWWW......",
        "......WmmmmmmmmmmWW.....",
        "......WmxmmmxmmxmmWWW...",
        "......WmxmmmxmmxmmWmW...",
        "......WmmmmmmmmmmmWmW...",
        "......WmCCCCCCCCmmWmW...",
        "......WmWxxWxxWmmmWmW...",
        "......WmWWWWWWWWmmWmW...",
        "......WmmmmmmmmmmmWmW...",
        "......WmmmmmmmmmmmWW....",
        "......WWWWWWWWWWWW......",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................"
    ]),
	
	// --- 24x24 Vintage Behemoth (CELLAR BOSS - SIZE 2) ---
    "vintage_behemoth": buildSprite([
        "........................",
        ".....CCCCCC..CCCCCC.....",
        "....CccccccCCccccccC....",
        "...CiiiiiiiiiiiiiiiiC...", // Top Iron Band
        "..CccccccccccccccccccC..",
        ".CccccccccccccccccccccC.",
        ".CcgcccgccgccgccgcccgcC.", // Some corrupted green glow creeping in
        ".CccccccCccccCccccccccC.",
        ".CcccCccCccccCccCcccccC.",
        ".CiiiiiiiiiiiiiiiiiiiiC.", // Mid-Top Iron Band
        ".CcccWWWccCcccWWWcccccC.", // Yellow/White Glowing Eyes
        ".CccWWxWWcCccWWxWWccccC.", 
        ".CcccWWWccCcccWWWcccccC.",
        ".CcccWWWWWWWWWWWWWWcccC.", // Upper Teeth
        ".CcccVVVVVVVVVVVVVVcccC.", // The massive open purple maw
        ".CcccVVVVVVMMMMVVVVcccC.", 
        ".CcccVVVVVMMMMMMVVVcccC.", 
        ".CcccWWWWWWWWWWWWWWcccC.", // Lower Teeth
        ".CiiiiiiiiiiiiiiiiiiiiC.", // Mid-Bottom Iron Band
        ".CccccccccccccccccccccC.",
        "..CccccccccccccccccccC..",
		"...CiiiiiiiiiiiiiiiiC...", // Bottom Iron Band
        "....CccccccCCccccccC....",
        ".....CCCCCC..CCCCCC....."
    ]), // <--- ADD THIS COMMA RIGHT HERE!

    // --- 24x24 Enraged Gorilla ---
    "enraged_gorilla": buildSprite([
        "........................",
        ".........GGGGGGGG.......",
        ".......GGAAAAAAAAGG.....",
        "......GGAxAATxAxAAGG....",
        "......GGAAAAAAAAAAGG....",
        "....GGGGAAAWWWWAAGGGG...",
        "....GGGGGAAAAAAAAGGGG...",
        "..GGGGGGGGGGGGGGGGGGGG..",
        "..GGAAGGGGGGGGGGGGGAAG..",
        "GGAAGGGGGGGGGGGGGGGAAGG.",
        "GGGGGGGGGGGGGGGGGGGGGGG.",
        "GG..GGGGGGGGGGGGGG..GG..",
        "GG..GG..........GG..GG..",
        "....GG..........GG......",
        "....AA..........AA......",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................"
    ]),
	// --- 24x24 Spectral Barfly (ABYSS RANGED) ---
    // A floating, ghostly patron holding a shattered, ethereal glass.
    "spectral_barfly": buildSprite([
        "........................",
        "........................",
        ".........PPPPPP.........",
        ".......PPPBBBBPPP.......",
        "......PPBBPWWPBBP.......",
        ".....PPBPBxWWxBPBPP.....",
        ".....PBPBBWWWWBBBPB.....",
        ".....PBPPBBBBBBPPBP.....",
        "......PBPPPPPPPPBP......",
        ".....PPPBBBBBBBBPPP.....",
        "....PBPBPPPPPPPPBPBP....",
        "...PBPBPPPVVVVPPPBPBP...",
        "..PBPBPBPPVVVVPPBPBPBP..",
        ".PBP..PBPPVVVVPPBP..PBP.",
        ".VV...PBPPVVVVPPBP...VV.", // Glowing hands throwing spectral shards
        "......PBPPPVVPPPBP......",
        ".......BPPPPPPPPB.......",
        ".......BPPPVVPPPB.......",
        "........BPPPPPPB........",
        "........BPPVVPPB........",
        ".........BPPPPB.........",
        "..........BPPB..........",
        "...........BB...........",
        "........................"
    ]),

    // --- 24x24 Blighted Mash-Crawler (ABYSS SWARM) ---
    // A mutated, crawling pile of corrupted yeast and glowing ooze.
    "mash_crawler": buildSprite([
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "..........BBBB..........",
        "........BBmmmmBB........",
        "......BBmmmmmmmmBB......",
        ".....BmmgmmmmmmgmmB.....",
        "....BmmgWWmgmmWWgmmB....",
        "...BmmmgxWmgmgxWmmmB...", // Multiple wandering red eyes
        "..BmmmmWWWmgggWWWmmmmB..",
        ".BmmgmmmmmmmmmmmmmgmmB..",
        ".BmmmmggmmmmmmmmmgmmmB..",
        ".BmmmmmmmmmggmmmmmmmmB..",
        ".BmmgmmmmmmmmmmmmmgmmB..",
        "..BBmmmmmgmmmmmgmmmmBB..",
        "....BBBBBBBBBBBBBBBB....",
        "........................",
        "........................"
    ]),

    // --- 24x24 Eldritch Keg-Walker (ABYSS HEAVY) ---
    // A shattered keg being puppeteered by terrifying void-spider legs.
    "eldritch_keg": buildSprite([
        "........................",
        "........................",
        "........BBBBBBBB........",
        "......BBCCCCCCCCBB......",
        ".....BCciiiiiiiicCB.....", // Top Iron Band
        "....BCccCCCCCCCCccCB....",
        "....BCcCcVVVVVVcCcCB....", // The wood splitting open...
        "....BCcCVVMMMMVVcCcB....",
        "....BCcCVMMxxMMVcCcB....", // ...Revealing glowing void eyes inside!
        "....BCcCVVMMMMVVcCcB....",
        "....BCcCcVVVVVVcCcCB....",
        "....BCciiiiiiiiiiCcB....", // Bottom Iron Band
        "....BCccCCCCCCCCccCB....",
        ".....BCciiiiiiiicCB.....",
        "......BBCCCCCCCCBB......",
        "........BBBBBBBB........",
        "........B.B..B.B........",
        ".......BV.B..B.VB.......", // Void-energy legs dripping out the bottom
        "......BV..B..B..VB......",
        ".....BV...B..B...VB.....",
        "....BV...B....B...VB....",
        "...BV....B....B....VB...",
        "..BV....BV....VB....VB..",
        ".BB.....BB....BB.....BB."
    ])
});