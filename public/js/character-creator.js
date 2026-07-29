// --- js/character-creator.js ---
// Procedural Matrix Sprite Engine (32x32 runtime contract)

// THE UNIFIED MASTER PALETTE (Single Source of Truth)
const PALETTE = {
    // --- 1. CORE BODY & ANATOMY ---
    '.': 'transparent', 
    'S': '#f1c27d',     // Skin Tone (Dynamic)
    '@': '#c0392b',     // Lips / Deep Red
    'H': '#5c3a21',     // Hair Tone (Dynamic)
    'B': '#111111',     // Black / Bald
    'Z': '#ffffff',     // Eye Tone (Dynamic)
    'X': '#171310',     // Shared Sprite Outline
    'F': '#b87850',     // Skin Shadow (Dynamic)
    'Q': '#ffd29d',     // Skin Highlight (Dynamic)
    'M': '#382114',     // Hair Shadow (Dynamic)
    'T': '#805234',     // Hair Highlight (Dynamic)

    // --- 2. DEFAULT CLOTHING ---
    'U': '#2980b9',     // Blue Tunic
    'P': '#2c3e50',     // Dark Pants / Midnight Blue
    'D': '#3e2723',     // Dark Leather Boots / Shadow
    'u': '#174d66',     // Tunic Shadow (Dynamic)
    'r': '#56a5c8',     // Tunic Highlight (Dynamic)
    'n': '#18242c',     // Pants Shadow (Dynamic)
    'x': '#4b6270',     // Pants Highlight (Dynamic)
    'g': '#6c493a',     // Boot Highlight (Dynamic)

    // --- 3. MASTER MATERIALS & METALS ---
    'I': '#7f8c8d',     // Iron Plate Armor Gray
    'Y': '#f1c40f',     // Golden Trim / Mimic Gold
    'R': '#e74c3c',     // Crimson Ruby / Glowing Red Eyes
    's': '#bdc3c7',     // Silver / Iron Bands
    'c': '#8b5a2b',     // Light Wood / Cask Light
    'd': '#5c3a21',     // Dark Wood / Cask Dark
    'l': '#8d5524',     // Standard Leather
    'b': '#f4ebd9',     // Bone / Teeth / Ivory / Bow String
    'h': '#2ecc71',     // Hops / Green Leaves / Corrupted Glow
    'v': '#8e44ad',     // Vivid Purple / Epic Glow
    'W': '#ffffff',     // White / Foam / Glass

    // --- 4. TAVERN FOOD & BREWS ---
    'm': '#f39c12',     // Amber / Stout Beer
    'K': '#d35400',     // Deep Orange / IPA Beer
    'p': '#e8c396',     // Flatbread Dough / Pastry Base
    't': '#cb4335',     // Tomato Sauce
    'C': '#f4d03f',     // Melted Cheese
    'w': '#722f37',     // Vintage Wine / Burgundy

    // --- 5. ENVIRONMENT & MAP TILES ---
    '1': '#273c24',     // Wilderness Dark Grass
    '2': '#344e31',     // Wilderness Light Grass
    '3': '#2a221f',     // Cellar Dark Stone
    '4': '#3b312b',     // Cellar Light Stone
    '5': '#6b543f',     // Arena Sand/Dirt
    '6': '#4a3b2c',     // Arena Dark Dirt
    '7': '#5f6a6a',     // Boulder Dark Gray
    '8': '#839192',     // Boulder Light Gray
    '9': '#1a1512',     // Deep Shadow
    'q': '#1e5128',     // Dark Tree Leaves
    'e': '#4caf50',     // Light Tree Leaves
    'y': '#5c4033',     // Tree Bark
    '[': '#27ae60',     // Plant Stem
    '{': '#1a0f2e',     // Void Mid-Tone
    '}': '#3a1f5c',     // Eldritch Swirl
    'A': '#110a1f',     // Void Deep Shadow

    // --- 6. BEAST FUR & NPC HIDES ---
    '-': '#5d4037',     // Boar Brown
    'G': '#222222',     // Gorilla Dark Fur
    '~': '#2c2c2e',     // Bandit Black / Deep Fur
    '*': '#ff9eaa',     // Princess Pink
    '+': '#f5deb3',     // Consuela Cream
    'a': '#a6acaf',     // Silver Wolf Fur
    'o': '#d35400',     // Fox Orange / Poacher Tunic

    // --- 7. SPECIAL TRIMS & MAGIC GLOWS ---
    'N': '#cd7f32',     // Bronze / Copper Trim 
    'O': '#fdfefe',     // Platinum / Bright Silver 
    'J': '#212f3c',     // Dark Steel / Gunmetal 
    '0': '#0b0b0b',     // Obsidian / True Black Trim 
    'k': '#1a0f2e',     // Abyssal Void Trim 
    '!': '#ff4500',     // Hellfire Orange
    '^': '#00ffff',     // Pure Cyan / Lightning
    '&': '#9932cc',     // Dark Void Purple
    '%': '#ffd700',     // Holy Radiance
    '$': '#00ff00',     // Pure Emerald Glow

    // --- 8. NATIVE 32x32 OVERHAUL MATERIALS ---
    'z': '#315d7d',     // Denim Blue
    '?': '#4f7f9f',     // Denim Highlight
    ':': '#d8b45d',     // Straw / Dry Grass
	
	// === NEW: ENGINE CLIPPING MASK ===
    '_': 'ERASE'        // Magic Masking Pixel (Hides layers beneath it)
	
};
const SkinTones = { 
    'light': '#f1c27d', 'tan': '#d3a068', 'dark': '#8d5524', 'orc': '#556b2f',
    // --- NEW ---
    'pale': '#ffebcd',     // Very fair/alabaster
    'deep': '#4a2511',     // Rich, deep brown
    'goblin': '#7a9c59',   // A lighter, yellower green than the dark orc
    'undead': '#87939a'    // Ashy, pale grey-blue for that crypt aesthetic
};

const ShirtTones = {
    'blue': '#2980b9', 'red': '#c0392b', 'green': '#27ae60', 'black': '#2c3e50',
    'white': '#ecf0f1', 'purple': '#8e44ad', 'brown': '#8b5a2b',
    // --- NEW ---
    'navy': '#1a252f',     // Deep midnight blue
    'olive': '#6b8e23',    // Earthy ranger green
    'gold': '#f1c40f',     // Bright tavern yellow/gold
    'burgundy': '#722f37', // Deep, warm wine red
    'teal': '#16a085',     // A nice muted cyan/teal
    'ale': '#c98b2e',      // Warm tavern amber
    'moss': '#3f6b46',     // Muted woodland cloth
    'claret': '#8f3442',   // Brighter wine-red cloth
    'pewter': '#556168'    // Cool neutral work cloth
};

const PantsTones = { 
    'dark': '#2c3e50', 'brown': '#5c3a21', 'grey': '#7f8c8d', 'tan': '#d3a068', 'blue': '#2980b9',
    // --- NEW ---
    'olive': '#556b2f',    // Matches well with woodland themes
    'khaki': '#c3b091',    // Lighter than tan, good for merchants
    'charcoal': '#24272b', // Near-black charcoal that preserves the sprite silhouette
    'maroon': '#641e16',   // Deep reddish-brown
    'umber': '#4a342b',    // Warm work-trouser brown
    'navy': '#1f3342'      // Cool deep blue
};
const BootsTones = { 
    'leather': '#3e2723', 'black': '#111111', 'grey': '#95a5a6',
    // --- NEW ---
    'suede': '#8b5a2b',    // Lighter, warm brown leather
    'iron': '#7f8c8d',     // Matches the plate armor grey perfectly
    'burgundy': '#641e16', // Dyed noble leather
    'olive': '#556b2f',    // Muted woodland trapper boots
    'oxblood': '#552a2a'   // Deep red-brown polished leather
};

const HairTones = {
    'brown': '#5c3a21', 'blonde': '#f1c40f', 'black': '#111111', 'white': '#ecf0f1',
    'orange': '#d35400', 'red': '#c0392b', 'blue': '#2980b9', 'purple': '#8e44ad',
    // --- NEW ---
    'auburn': '#8a3324',  // Deep reddish-brown
    'silver': '#bdc3c7',  // Veteran knight grey/silver
    'pink': '#ffb6c1',    // Classic JRPG fantasy trope
    'teal': '#1abc9c',    // Bright, magical blue-green
    'green': '#27ae60',   // Woodland ranger green
    'straw': '#d8b45d',   // Weathered golden blonde
    'raven': '#201b22'    // Soft blue-black
};



// === NEW: DYNAMIC EYE TONES ===
const EyeTones = {
    'blue': '#3498db', 'green': '#2ecc71', 'brown': '#8b5a2b', 'red': '#e74c3c',
    'purple': '#8e44ad', 'gold': '#f1c40f', 'grey': '#7f8c8d', 'black': '#111111', 'white': '#ffffff'
};

const appearanceOptions = {
    gender: ['male', 'female'],
    skin: ['light', 'tan', 'dark', 'deep', 'pale', 'orc', 'goblin', 'undead'],
    hair: [
        'hair_messy', 'hair_spiky', 'hair_long', 'hair_bob', 
        'hair_braid', 'hair_buzzcut', 'hair_mohawk', 'hair_ponytail', 
        'hair_undercut', 'hair_topknot', 'hair_curly', 'hair_twintails', 
        'hair_waves', 'hair_halfup', 'hair_slickback', 'hair_locs',
        'hair_bald'
    ],
    
    // Added: auburn, silver, pink, teal, green
    hairColor: ['brown', 'blonde', 'black', 'white', 'orange', 'red', 'blue', 'purple', 'auburn', 'silver', 'pink', 'teal', 'green', 'straw', 'raven'],
    
    eyes: ['eyes_blue', 'eyes_green', 'eyes_brown', 'eyes_red', 'eyes_purple', 'eyes_gold', 'eyes_grey', 'eyes_black', 'eyes_white'],
    shirtColor: ['blue', 'red', 'green', 'black', 'white', 'purple', 'brown', 'navy', 'olive', 'gold', 'burgundy', 'teal', 'ale', 'moss', 'claret', 'pewter'],
    pantsColor: ['dark', 'brown', 'grey', 'tan', 'blue', 'olive', 'khaki', 'charcoal', 'maroon', 'umber', 'navy'],
    
    // Added: suede, iron, burgundy, olive
    bootsColor: ['leather', 'black', 'grey', 'suede', 'iron', 'burgundy', 'olive', 'oxblood']
};

function shiftProceduralColor(hex, amount) {
    const normalized = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return hex;

    const channels = [0, 2, 4].map(offset => {
        const value = parseInt(normalized.slice(offset, offset + 2), 16);
        return Math.max(0, Math.min(255, value + amount))
            .toString(16)
            .padStart(2, '0');
    });

    return `#${channels.join('')}`;
}

function createProceduralDynamicPalette(appearance = {}) {
    const skin = SkinTones[appearance.skin] || SkinTones.light;
    const hair = HairTones[appearance.hairColor] || HairTones.brown;
    const shirt = ShirtTones[appearance.shirtColor] || ShirtTones.blue;
    const pants = PantsTones[appearance.pantsColor] || PantsTones.dark;
    const boots = BootsTones[appearance.bootsColor] || BootsTones.leather;
    const eyeKey = String(appearance.eyes || 'eyes_blue').replace('eyes_', '');
    const eyes = EyeTones[eyeKey] || EyeTones.blue;

    return {
        S: skin,
        F: shiftProceduralColor(skin, -34),
        Q: shiftProceduralColor(skin, 28),
        H: hair,
        M: shiftProceduralColor(hair, -38),
        T: shiftProceduralColor(hair, 34),
        U: shirt,
        u: shiftProceduralColor(shirt, -38),
        r: shiftProceduralColor(shirt, 30),
        P: pants,
        n: shiftProceduralColor(pants, -30),
        x: shiftProceduralColor(pants, 26),
        D: boots,
        g: shiftProceduralColor(boots, 34),
        Z: eyes
    };
}

// Existing coded art is authored on the legacy 24x24 grid. Keep those source
// strings readable while exposing one 32x32 matrix contract everywhere else.
// Native 32x32 art passes through unchanged; legacy art is nearest-neighbour
// resampled so paperdoll and equipment layers retain the same alignment.
const LEGACY_PROCEDURAL_SPRITE_SIZE = 24;
const PROCEDURAL_SPRITE_GRID_SIZE = 32;

function getAuthoredSpriteSize(stringArray) {
    const rows = Array.isArray(stringArray) ? stringArray : [];
    const widestRow = rows.reduce((width, row) => {
        const rowWidth = Array.isArray(row) ? row.length : String(row || '').length;
        return Math.max(width, rowWidth);
    }, 0);

    return rows.length === PROCEDURAL_SPRITE_GRID_SIZE || widestRow === PROCEDURAL_SPRITE_GRID_SIZE
        ? PROCEDURAL_SPRITE_GRID_SIZE
        : LEGACY_PROCEDURAL_SPRITE_SIZE;
}

function normalizeSpriteMatrix(stringArray, options = {}) {
    const rows = Array.isArray(stringArray) ? stringArray : [];
    const sourceSize = options.sourceSize === PROCEDURAL_SPRITE_GRID_SIZE
        ? PROCEDURAL_SPRITE_GRID_SIZE
        : options.sourceSize === LEGACY_PROCEDURAL_SPRITE_SIZE
            ? LEGACY_PROCEDURAL_SPRITE_SIZE
            : getAuthoredSpriteSize(rows);
    const verticalAnchor = options.verticalAnchor === 'bottom' ? 'bottom' : 'top';
    const sourceMatrix = Array.from(
        { length: sourceSize },
        () => Array(sourceSize).fill('.')
    );
    const rowOffset = verticalAnchor === 'bottom'
        ? Math.max(0, sourceSize - Math.min(rows.length, sourceSize))
        : 0;

    rows.slice(0, sourceSize).forEach((row, rowIndex) => {
        const sourceRow = Array.isArray(row) ? row : String(row || '').split('');
        sourceRow.slice(0, sourceSize).forEach((value, columnIndex) => {
            sourceMatrix[rowOffset + rowIndex][columnIndex] = value || '.';
        });
    });

    if (sourceSize === PROCEDURAL_SPRITE_GRID_SIZE) return sourceMatrix;

    return Array.from({ length: PROCEDURAL_SPRITE_GRID_SIZE }, (_, row) => {
        const sourceRow = Math.floor(row * sourceSize / PROCEDURAL_SPRITE_GRID_SIZE);
        return Array.from({ length: PROCEDURAL_SPRITE_GRID_SIZE }, (_, column) => {
            const sourceColumn = Math.floor(column * sourceSize / PROCEDURAL_SPRITE_GRID_SIZE);
            return sourceMatrix[sourceRow][sourceColumn];
        });
    });
}

function buildSprite(stringArray, options) {
    return normalizeSpriteMatrix(stringArray, options);
}

const eyeMatrix = buildSprite([
    "........................",
    "........................",
    "........................",
    "........................",
    "........................",
    "......Z....Z............"
]);

const SpriteMatrices = {
    // --- LEGACY 24x24 SOURCE: MALE ANATOMY (NORMALIZED TO 32x32) ---
    body_male: buildSprite([
        "........................",
        "........................",
        "........................",
        "......SSSSSS............",
        ".....SSSSSSSS...........",
        ".....SSSSSSSS...........",
        ".....SSSSSSSS...........",
        "......SS@@SS............",
        ".......SSSS.............",
        "...UUUUUUUUUUUU.........",
        "...UUUUUUUUUUUU.........",
        "...UU.UUUUUU.UU.........",
        "...SS.UUUUUU.SS.........",
        "...SS.UUUUUU.SS.........",
        "...SS.UUUUUU.SS.........",
        "......UUUUUU............",
        "......PPPPPP............",
        ".....PPPPPPPP...........",
        ".....PPPPPPPP...........",
        ".....PPP..PPP...........",
        ".....PPP..PPP...........",
        ".....PPP..PPP...........",
        "....DDDD..DDDD..........",
        "....DDDD..DDDD.........."
    ]),
    
    // --- LEGACY 24x24 SOURCE: FEMALE ANATOMY (NORMALIZED TO 32x32) ---
    body_female: buildSprite([
        "........................",
        "........................",
        "........................",
        "......SSSSSS............",
        ".....SSSSSSSS...........",
        ".....SSSSSSSS...........",
        ".....SSSSSSSS...........",
        "......SS@@SS............",
        ".......SSSS.............",
        "....UUUUUUUUUU..........",
        "...UUUUUUUUUUUU.........",
        "...UU.UUUUUU.UU.........",
        "...SS.UUUUUU.SS.........",
        "...SS..UUUU..SS.........",
        "...SS..UUUU..SS.........",
        "......PPPPPP............",
        ".....PPPPPPPP...........",
        ".....PPPPPPPP...........",
        ".....PPPPPPPP...........",
        ".....PPP..PPP...........",
        ".....PPP..PPP...........",
        ".....PPP..PPP...........",
        "....DDDD..DDDD..........",
        "....DDDD..DDDD.........."
    ]),

    // --- LEGACY 24x24 SOURCE: HAIRSTYLES (NORMALIZED TO 32x32) ---
    hair_messy: buildSprite([
        "........................",
        "........................",
        "........................",
        ".....HHHHHHHH...........",
        "....HHHHHHHHHH..........",
        "...HH........HH.........",
        "...HH........HH.........",
        "...H..........H........."
    ]),
    hair_long: buildSprite([
    "........................",
    "........................",
    "......HHHHHH............",
    ".....HHHHHHHH...........",
    "....HHHHHHHHHH..........",
    "....HH......HH..........",
    "....HH......HH..........",
    "....HH......HH..........",
    "....HH......HH..........",
    "....HH......HH..........",
    ".....H......H...........",
    ".....H......H...........",

]),
    hair_bob: buildSprite([
        "........................",
        "........................",
        "........................",
        ".....HHHHHHHH...........",
        "....HHHHHHHHHH..........",
        "...HH........HH.........",
        "...HH........HH.........",
        "....H........H.........."
    ]),
    hair_braid: buildSprite([
        "........................",
        "........................",
        "........................",
        ".....HHHHHHHH...........",
        "....HHHHHHHHHH..........",
        "....H........HH.........",
        "....H.........H.........",
        ".............HH.........",
        "............HH..........",
        "............HH..........",
        ".............HH.........",
        "............HH.........."
    ]),
    hair_spiky: buildSprite([
        "........................",
        "........................",
        "..HHH........HHH........",
        "...HHHHHHHHHHHH.........",
        "....H........H..........",
        "...HH........HH.........",
        "...H..........H........."
    ]),
    hair_buzzcut: buildSprite([
        "........................",
        "........................",
        "........................",
        "......HHHHHH............",
        ".....H......H..........."
    ]),
    hair_mohawk: buildSprite([
        "........................",
        "........................",
        "........HH..............",
        "......HHHHHH............",
        ".....H......H..........."
    ]),
    hair_undercut: buildSprite([
        "........................",
        "........................",
        "......HHHHHH............",
        ".....HHHHHHHH...........",
        ".....H......H..........."
    ]),
    hair_topknot: buildSprite([
        "........................",
        "........................",
        ".......HH...............",
        "......HHHHHHHH..........",
        ".....HHHHHHHH...........",
        "...HHH......HH..........",
        "....H........H..........",
        "....H........H.........."
    ]),
    hair_curly: buildSprite([
        "........................",
        "........................",
        "....HHHHHHHHHH..........",
        "...HHHHHHHHHHHH.........",
        "...HH........HH.........",
        "...HH........HH.........",
        "...HH........HH.........",
        "....H........H.........."
    ]),
    hair_twintails: buildSprite([
        "........................",
        "........................",
        "........................",
        ".....HHHHHHHH...........",
        "....HHHHHHHHHH..........",
        "...HHH......HHH.........",
        "....HH......HH..........",
        "....HH......HH..........",
        "..H.HH......HH.H........",
        "..HHH........HHH........",
        "........................"
    ]),
    hair_ponytail: buildSprite([
        "........................",
        "........................",
        "........................",
        ".....HHHHHHHHH..........",
        "....HH.......HH.........",
        "....H........HH.........",
        "....H........HH.........",
        ".....H......HH..........",
        "..........HH............",
        "..........HH............",
        "..........HHH..........."
    ]),
    hair_bald: buildSprite([]),

    // --- LEGACY 24x24 SOURCE: DYNAMIC EYES (NORMALIZED TO 32x32) ---
    eyes_blue: eyeMatrix,
    eyes_green: eyeMatrix,
    eyes_brown: eyeMatrix,
    eyes_red: eyeMatrix,
    eyes_purple: eyeMatrix,
    eyes_gold: eyeMatrix,
    eyes_grey: eyeMatrix,
    eyes_black: eyeMatrix,
    eyes_white: eyeMatrix
};
function drawProceduralSprite(context, matrix, startX, startY, size) {
    if (!matrix) return;
    
    const gridCount = PROCEDURAL_SPRITE_GRID_SIZE;
    const pixelSize = size / gridCount;
    const appearance = typeof player !== 'undefined' && player.appearance
        ? player.appearance
        : {};
    const dynamicPalette = createProceduralDynamicPalette(appearance);

    for (let row = 0; row < matrix.length; row++) {
        if (row >= gridCount) break;
        for (let col = 0; col < matrix[row].length; col++) {
            if (col >= gridCount) break;
            
            const colorKey = matrix[row][col];
            const color = Object.prototype.hasOwnProperty.call(dynamicPalette, colorKey)
                ? dynamicPalette[colorKey]
                : PALETTE[colorKey];

if (color && color !== 'transparent') {
                // === NEW: MAGIC ERASER MASK LOGIC ===
                if (color === 'ERASE') {
                    context.clearRect(startX + (col * pixelSize), startY + (row * pixelSize), Math.ceil(pixelSize), Math.ceil(pixelSize));
                } else {
                    context.fillStyle = color;
                    context.fillRect(startX + (col * pixelSize), startY + (row * pixelSize), Math.ceil(pixelSize), Math.ceil(pixelSize));
                }
            }
        }
    }
}

function cycleAppearance(part) {
    let currentIdx = appearanceOptions[part].indexOf(player.appearance[part]);
    let nextIdx = (currentIdx + 1) % appearanceOptions[part].length;
    player.appearance[part] = appearanceOptions[part][nextIdx];
    
    const isCreating = document.getElementById('char-creation-screen').style.display === 'block';
    renderPaperDoll(isCreating);
}

let randomizeAppearanceTimer = null;

function randomAppearanceValue(part) {
    const options = appearanceOptions[part];
    return options[Math.floor(Math.random() * options.length)];
}

function randomizeAppearance() {
    clearInterval(randomizeAppearanceTimer);

    const parts = ['gender', 'skin', 'hair', 'hairColor', 'eyes', 'shirtColor', 'pantsColor', 'bootsColor'];
    let ticks = 0;

    randomizeAppearanceTimer = setInterval(() => {
        parts.forEach(part => {
            player.appearance[part] = randomAppearanceValue(part);
        });

        const isCreating = document.getElementById('char-creation-screen').style.display === 'block';
        renderPaperDoll(isCreating);

        ticks++;
        if (ticks >= 8) {
            clearInterval(randomizeAppearanceTimer);
            randomizeAppearanceTimer = null;
        }
    }, 60);
}

function renderPaperDoll(isNaked = false) {
    const menuCanvas = document.getElementById('menuCharacterCanvas');
    if (!menuCanvas) return;
    const mCtx = menuCanvas.getContext('2d');
    
    mCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
    
    let bodySprite = player.appearance.gender === 'female' ? 'body_female' : 'body_male';
    drawProceduralSprite(mCtx, SpriteMatrices[bodySprite], 0, 0, menuCanvas.width);
    drawProceduralSprite(mCtx, SpriteMatrices[player.appearance.eyes], 0, 0, menuCanvas.width);
    
    const hidesHair = !isNaked && player.equipment.helmet && player.equipment.helmet.hidesHair;
    if (!hidesHair && SpriteMatrices[player.appearance.hair]) {
        drawProceduralSprite(mCtx, SpriteMatrices[player.appearance.hair], 0, 0, menuCanvas.width);
    }

    if (!isNaked) {
        const eq = player.equipment;
        let gSuffix = player.appearance.gender === 'female' ? '_female' : '_male';
        
        if (eq.armor && eq.armor.spriteId) {
            let sId = eq.armor.spriteId + gSuffix;
            if (SpriteMatrices[sId]) drawProceduralSprite(mCtx, SpriteMatrices[sId], 0, 0, menuCanvas.width);
            else if (SpriteMatrices[eq.armor.spriteId]) drawProceduralSprite(mCtx, SpriteMatrices[eq.armor.spriteId], 0, 0, menuCanvas.width);
        }
        
        if (eq.boots && eq.boots.spriteId) drawProceduralSprite(mCtx, SpriteMatrices[eq.boots.spriteId], 0, 0, menuCanvas.width);
        if (eq.gloves && eq.gloves.spriteId) drawProceduralSprite(mCtx, SpriteMatrices[eq.gloves.spriteId], 0, 0, menuCanvas.width);
        if (eq.helmet && eq.helmet.spriteId) drawProceduralSprite(mCtx, SpriteMatrices[eq.helmet.spriteId], 0, 0, menuCanvas.width);
        if (eq.weapon && eq.weapon.spriteId) drawProceduralSprite(mCtx, SpriteMatrices[eq.weapon.spriteId], 0, 0, menuCanvas.width);
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => { renderPaperDoll(true); }, 100);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LEGACY_PROCEDURAL_SPRITE_SIZE,
        PROCEDURAL_SPRITE_GRID_SIZE,
        getAuthoredSpriteSize,
        normalizeSpriteMatrix,
        buildSprite,
        shiftProceduralColor,
        createProceduralDynamicPalette,
        drawProceduralSprite
    };
}
