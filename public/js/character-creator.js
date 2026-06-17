// --- js/character-creator.js ---
// Procedural Matrix Sprite Engine (Upgraded 24x24 Anatomy)

const PALETTE = {
    '.': 'transparent', 
    'S': '#f1c27d',     // Base Skin Tone (Dynamically Overridden)
    '@': '#c0392b',     // Mouth / Lips (Protected from NPC Overrides!)
    'H': '#5c3a21',     // Base Hair Tone (Dynamically Overridden)
    'B': '#111111',     // Black/Bald
    'Z': '#ffffff',     // Dynamic Eye Tone (Protected!)
    'U': '#2980b9',     // Blue Tunic (Dynamically Overridden)
    'P': '#2c3e50',     // Dark Pants (Dynamically Overridden)
    'D': '#3e2723',     // Leather Boots (Dynamically Overridden)

    // --- MASTER ITEM & GEAR PALETTE ---
    'I': '#7f8c8d',     // Iron Plate Armor Gray
    'Y': '#f1c40f',     // Golden Trim / Accent
    'R': '#e74c3c',     // Crimson Weapon Ruby
    's': '#bdc3c7',     // Silver / Iron Blade
    'c': '#8b5a2b',     // Cask Light Wood (Safe replacement for 'w')
    'd': '#5c3a21',     // Dark Wood
    'l': '#8d5524',     // Leather
    'b': '#f4ebd9',     // Bone / Teeth
    'h': '#2ecc71',     // Hops / Green Leaves
    'v': '#8e44ad',     // Epic Purple Glow
    'j': '#f1c40f',     // Gold / Mimic Gem
    'W': '#ffffff',     // White / Foam / Glass
    'm': '#f39c12',     // Amber / Stout Beer
    'K': '#d35400',     // Deep Orange / IPA Beer 
    'k': '#1a0f2e'      // Static Abyssal Void Trim 
};

const SkinTones = { 'light': '#f1c27d', 'tan': '#d3a068', 'dark': '#8d5524', 'orc': '#556b2f' };
const PantsTones = { 'dark': '#2c3e50', 'brown': '#5c3a21', 'grey': '#7f8c8d', 'tan': '#d3a068', 'blue': '#2980b9' };
const BootsTones = { 'leather': '#3e2723', 'black': '#111111', 'grey': '#95a5a6' };

const HairTones = {
    'brown': '#5c3a21', 'blonde': '#f1c40f', 'black': '#111111', 'white': '#ecf0f1',
    'orange': '#d35400', 'red': '#c0392b', 'blue': '#2980b9', 'purple': '#8e44ad'
};

const ShirtTones = {
    'blue': '#2980b9', 'red': '#c0392b', 'green': '#27ae60', 'black': '#2c3e50',
    'white': '#ecf0f1', 'purple': '#8e44ad', 'brown': '#8b5a2b'
};

// === NEW: DYNAMIC EYE TONES ===
const EyeTones = {
    'blue': '#3498db', 'green': '#2ecc71', 'brown': '#8b5a2b', 'red': '#e74c3c',
    'purple': '#8e44ad', 'gold': '#f1c40f', 'grey': '#7f8c8d', 'black': '#111111', 'white': '#ffffff'
};

const appearanceOptions = {
    gender: ['male', 'female'],
    skin: ['light', 'tan', 'dark', 'orc'],
    hair: ['hair_messy', 'hair_spiky', 'hair_long', 'hair_bob', 'hair_braid', 'hair_buzzcut', 'hair_mohawk', 'hair_ponytail', 'hair_bald'],
    hairColor: ['brown', 'blonde', 'black', 'white', 'orange', 'red', 'blue', 'purple'],
    eyes: ['eyes_blue', 'eyes_green', 'eyes_brown', 'eyes_red', 'eyes_purple', 'eyes_gold', 'eyes_grey', 'eyes_black', 'eyes_white'],
    shirtColor: ['blue', 'red', 'green', 'black', 'white', 'purple', 'brown'],
    pantsColor: ['dark', 'brown', 'grey', 'tan', 'blue'],
    bootsColor: ['leather', 'black', 'grey']
};

function buildSprite(stringArray) {
    let paddedArray = [...stringArray];
    while(paddedArray.length < 24) { paddedArray.push("........................"); }
    return paddedArray.map(row => row.split(''));
}

const eyeMatrix = buildSprite([
    "........................",
    "........................",
    "........................",
    ".........Z....Z........."
]);

const SpriteMatrices = {
    // --- 24x24 MALE ANATOMY ---
    body_male: buildSprite([
        "........................",
        ".........SSSSSS.........", 
        "........SSSSSSSS........", 
        "........SSSSSSSS........", 
        "........SSSSSSSS........", 
        ".........SS@@SS.........", 
        "..........SSSS..........", 
        "......UUUUUUUUUUUU......", 
        ".....UUUUUUUUUUUUUU.....", 
        ".....UU..UUUUUU..UU.....", 
        ".....SS..UUUUUU..SS.....", 
        ".....SS..UUUUUU..SS.....", 
        ".....SS..UUUUUU..SS.....", 
        ".........UUUUUU.........", 
        "........PPPPPPPP........", 
        "........PPPPPPPP........", 
        "........PPPPPPPP........", 
        "........PPP..PPP........", 
        "........PPP..PPP........", 
        "........PPP..PPP........", 
        ".......DDDD..DDDD.......", 
        ".......DDDD..DDDD......."
    ]),
    
    // --- 24x24 FEMALE ANATOMY ---
    body_female: buildSprite([
        "........................",
        ".........SSSSSS.........", 
        "........SSSSSSSS........", 
        "........SSSSSSSS........", 
        "........SSSSSSSS........", 
        ".........SS@@SS.........", 
        "..........SSSS..........", 
        ".......UUUUUUUUUU.......", 
        "......UUUUUUUUUUUU......", 
        "......UU.UUUUUU.UU......", 
        "......SS.UUUUUU.SS......", 
        "......SS..UUUU..SS......", 
        "......SS..UUUU..SS......", 
        ".........PPPPPP.........", 
        "........PPPPPPPP........", 
        "........PPPPPPPP........", 
        "........PPPPPPPP........", 
        "........PPP..PPP........", 
        "........PPP..PPP........", 
        "........PPP..PPP........", 
        ".......DDDD..DDDD.......", 
        ".......DDDD..DDDD......."
    ]),

    // --- 24x24 HAIRSTYLES ---
    hair_messy: buildSprite([
        "........................",
        "........HHHHHHHH........",
        ".......HHHHHHHHHH.......",
        "......HH........HH......",
        "......HH........HH......",
        "......H..........H......"
    ]),
    hair_long: buildSprite([
        "........................",
        "........HHHHHHHH........",
        ".......HHHHHHHHHH.......",
        "......HH........HH......",
        "......HH........HH......",
        "......HH........HH......",
        "......HH........HH......",
        "......HH........HH......",
        "......H..........H......"
    ]),
    hair_bob: buildSprite([
        "........................",
        "........HHHHHHHH........",
        ".......HHHHHHHHHH.......",
        "......HH........HH......",
        "......HH........HH......",
        ".......H........H......."
    ]),
    hair_braid: buildSprite([
        "........................",
        "........HHHHHHHH........",
        ".......HHHHHHHHHH.......",
        "......HH........HH......",
        "......H..........H......",
        "................HH......",
        "...............HH.......",
        "...............HH.......",
        "................HH......",
        "................H......."
    ]),
    hair_spiky: buildSprite([ 
        ".......H........H.......",
        "......HHHHHHHHHHHH......",
        ".......H........H.......",
        "......HH........HH......",
        "......H..........H......"
    ]),
    hair_buzzcut: buildSprite([
        "........................",
        ".........HHHHHH.........",
        "........H......H........"
    ]),
    hair_mohawk: buildSprite([
        "...........HH...........",
        ".........HHHHHH.........",
        "........H......H........"
    ]),
    hair_ponytail: buildSprite([
        "........................",
        "........HHHHHHHH........",
        ".......HHHHHHHHHH.......",
        ".......H........H.......",
        ".......H........HH......",
        ".................HHHH...",
        "...................HH...",
        "...................HH...",
        "..................HH....",
        "..................H....."
    ]),
    hair_bald: buildSprite([]),

    // --- 24x24 EYES (DYNAMIC) ---
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
    
    const gridCount = 24; 
    const pixelSize = size / gridCount;

    for (let row = 0; row < matrix.length; row++) {
        if (row >= 24) break; 
        for (let col = 0; col < matrix[row].length; col++) {
            if (col >= 24) break; 
            
            const colorKey = matrix[row][col];
            let color = PALETTE[colorKey];
            
            if (colorKey === 'S') color = SkinTones[player.appearance.skin];
            if (colorKey === 'H') color = HairTones[player.appearance.hairColor || 'brown'];
            if (colorKey === 'U') color = ShirtTones[player.appearance.shirtColor || 'blue'];
            if (colorKey === 'P') color = PantsTones[player.appearance.pantsColor || 'dark'];
            if (colorKey === 'D') color = BootsTones[player.appearance.bootsColor || 'leather'];
            
            // --- DYNAMIC EYE RENDERER ---
            if (colorKey === 'Z') {
                let eyeColor = player.appearance.eyes ? player.appearance.eyes.replace('eyes_', '') : 'blue';
                color = EyeTones[eyeColor] || EyeTones['blue'];
            }

            if (color && color !== 'transparent') {
                context.fillStyle = color;
                context.fillRect(startX + (col * pixelSize), startY + (row * pixelSize), Math.ceil(pixelSize), Math.ceil(pixelSize));
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

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { renderPaperDoll(true); }, 100);
});