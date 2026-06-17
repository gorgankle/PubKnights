// --- js/pet-assets.js ---
// Procedural Matrix definitions specifically for customizable Tavern Pets (Classic 24x24 RPG Style)

const PetFurTones = {
    'gray': '#7f8c8d',   
    'orange': '#d35400',
    'white': '#ecf0f1',
    'brown': '#5c3a21',
    'black': '#2c2c2c',   // Dark charcoal so the #111111 outline still shows
    'golden': '#e67e22',  // Classic golden retriever/tabby yellow
    'cream': '#f5deb3'    // A warmer wheat/light option
};

const PetCollarTones = {
    'red': '#c0392b',
    'blue': '#2980b9',
    'green': '#27ae60',
    'yellow': '#f1c40f',
    'purple': '#8e44ad',
    'pink': '#ff7979'   // <-- Added this!
};

const petAppearanceOptions = {
    type: ['dog', 'cat'],
    furColor: ['brown', 'gray', 'orange', 'white', 'black', 'golden', 'cream'], 
    collarColor: ['red', 'blue', 'green', 'yellow', 'purple', 'pink'] // <-- Added this!
};

// Pads the sprites to 24x24 and pushes them to the floor
function buildPetSprite(stringArray) {
    let paddedArray = [...stringArray];
    let emptyRow = "........................"; // 24 empty dots
    while(paddedArray.length < 24) {
        paddedArray.unshift(emptyRow);
    }
    return paddedArray.map(row => row.split(''));
}

const PetMatrices = {
// Cute, Scaled-Down Proportional Dog (Floppy Ears, Front-Facing)
    'dog': buildPetSprite([
        ".........oooooo.........",
        "........offffffo........",
        "......oooffffffooo......",
        "......ofofbffbfofo......",
        "......ofoffwwffofo......",
        "......ofofwbbwfofo......",
        "......oooccccccooo......",
        "........offffffo........",
        "........offffffofo......",
        "........owwoowwo........",
        "........oooooooo........"]),
    
// Cute, Scaled-Down Proportional Cat (Pointy Ears, Front-Facing, Curled Tail)
    'cat': buildPetSprite([
        ".....oo..........oo.....",
        ".....ofo........ofo.....",
        "......offooooooffo......",
        "......offffffffffo......",
        "......offbffffbffo......",
        "......offffwwffffo......",
        ".......ooccccccoo.......",
        "........offffffo..oo....",
        "........offffffo.ofo....",
        "........owwoowwooofo....",
        "........oooooooooooo...."
    ])
};

function renderPetCanvas(canvasEl) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    
    let matrix = PetMatrices[player.pet.type];
    if (!matrix) return;

    const gridCount = 24; 
    const pixelSize = Math.floor(canvasEl.width / gridCount);

    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            const colorKey = matrix[row][col];
            let color = 'transparent';
            
            if (colorKey === 'f') {
                color = PetFurTones[player.pet.furColor] || PetFurTones['gray'];
            }
            else if (colorKey === 'c') color = PetCollarTones[player.pet.collarColor];
            else if (colorKey === 'b') color = '#111111'; 
            else if (colorKey === 'o') color = '#111111'; 
            else if (colorKey === 'w') {
                color = (player.pet.furColor === 'white') ? '#d1ccc0' : '#f4ebd9';
            }

            // --- THE MISSING LOGIC: ACTUALLY DRAWING THE PIXEL ---
            if (color && color !== 'transparent') {
                ctx.fillStyle = color;
                // Using Math.ceil prevents tiny sub-pixel gaps between your matrix blocks
                ctx.fillRect(col * pixelSize, row * pixelSize, Math.ceil(pixelSize), Math.ceil(pixelSize));
            }
        }
    }
}

function cyclePetAppearance(part) {
    if (player.pet.adopted) return; 
    
    let currentIdx = petAppearanceOptions[part].indexOf(player.pet[part]);
    let nextIdx = (currentIdx + 1) % petAppearanceOptions[part].length;
    player.pet[part] = petAppearanceOptions[part][nextIdx];
    
    if (typeof playRetroSound === 'function') playRetroSound('menu');
    
    const petCanvas = document.getElementById('main-pet-canvas');
    renderPetCanvas(petCanvas);
}

function adoptPet() {
    // Prevent double adoption
    if (player.pet && player.pet.adopted) return;
    
    if (player.gold >= 10) {
        player.gold -= 10;
        player.pet.adopted = true;
        
        let nameInput = document.getElementById('pet-name-input');
        if (nameInput && nameInput.value.trim() !== "") {
            player.pet.name = nameInput.value.trim();
        }
        
        // --- THE CRITICAL FIX: Close the adoption panel! ---
        let adoptionUI = document.getElementById('pet-adoption-ui');
        if (adoptionUI) adoptionUI.style.display = "none";
        // ---------------------------------------------------
        
        logMessage(`🐕 You have officially adopted ${player.pet.name}!`);
        if (typeof playRetroSound === 'function') playRetroSound('coin');
        
        saveGame();
        
        // Now that the panel is closed, this will properly trigger the Edit & Train buttons!
        refreshSystemUI(); 
    } else {
        logMessage("❌ Insufficient funds to adopt a companion (Requires 10 Gold).");
        if (typeof playRetroSound === 'function') playRetroSound('error');
    }
}