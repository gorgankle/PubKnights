// === js/dialogue.js ===
// TYPEWRITER DIALOGUE ENGINE & PROCEDURAL PORTRAITS

let dialogueSequence = [];
let currentDialoguePage = 0;
let currentDialogueText = "";
let typeIndex = 0;
let typeTimer = null;
let isTyping = false;

function playDialogueSequence(sequence) {
    if (!sequence || sequence.length === 0) return;
    
    dialogueSequence = sequence;
    currentDialoguePage = 0;
    
    const overlay = document.getElementById('dialogue-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        showNextDialoguePage();
    }
}

function showNextDialoguePage() {
    // If we've reached the end of the sequence, close the box!
    if (currentDialoguePage >= dialogueSequence.length) {
        document.getElementById('dialogue-overlay').style.display = 'none';
        
        // Notify the server we finished reading so it can trigger the next event (like a Boss Fight!)
        if (dialogueSequence.questId) {
            socket.emit('dialogueComplete', { questId: dialogueSequence.questId });
        }
        return;
    }
    
    let page = dialogueSequence[currentDialoguePage];
    
    document.getElementById('dialogue-speaker-name').innerText = page.speaker || "Unknown";
    document.getElementById('dialogue-text-content').innerHTML = "";
    document.getElementById('dialogue-next-indicator').style.display = 'none';
    
    // Draw the Portrait!
    renderDialoguePortrait(page.portraitId);
    
    // Setup the Typewriter
    currentDialogueText = page.text || "...";
    typeIndex = 0;
    isTyping = true;
    
    clearInterval(typeTimer);
    typeTimer = setInterval(typewriterTick, 35); // 35ms delay per letter
}

function typewriterTick() {
    if (typeIndex < currentDialogueText.length) {
        document.getElementById('dialogue-text-content').innerHTML = currentDialogueText.substring(0, typeIndex + 1);
        typeIndex++;
        
        // Play a retro blip sound every 3 characters so it doesn't overwhelm the audio engine
        if (typeIndex % 3 === 0 && typeof playRetroSound === 'function') {
            playRetroSound('step'); 
        }
    } else {
        // Typing finished! Show the blinking arrow.
        clearInterval(typeTimer);
        isTyping = false;
        document.getElementById('dialogue-next-indicator').style.display = 'block';
    }
}

function advanceDialogue() {
    if (isTyping) {
        // The player clicked while it was typing! Skip the animation and show all text instantly.
        clearInterval(typeTimer);
        document.getElementById('dialogue-text-content').innerHTML = currentDialogueText;
        isTyping = false;
        document.getElementById('dialogue-next-indicator').style.display = 'block';
    } else {
        // The text was already done. Move to the next page!
        if (typeof playRetroSound === 'function') playRetroSound('menu');
        currentDialoguePage++;
        showNextDialoguePage();
    }
}

function renderDialoguePortrait(portraitId) {
    const pCanvas = document.getElementById('dialogue-portrait-canvas');
    if (!pCanvas || typeof drawOptimizedSprite !== 'function') return;
    const pCtx = pCanvas.getContext('2d');
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    
    if (portraitId === 'player') {
        // --- THE PROCEDURAL ZOOM & CROP ---
        const zoomSize = 192; // 8x scale of a 24x24 sprite
        const ox = -48; // Shift left to center the 192px sprite inside the 96px canvas
        const oy = -28; // Shift up to crop out the legs and focus on the helmet/face
        
        let bodySprite = player.appearance.gender === 'female' ? 'body_female' : 'body_male';
        if (SpriteMatrices[bodySprite]) drawOptimizedSprite(pCtx, bodySprite, SpriteMatrices[bodySprite], ox, oy, zoomSize);
        if (SpriteMatrices[player.appearance.eyes]) drawOptimizedSprite(pCtx, player.appearance.eyes, SpriteMatrices[player.appearance.eyes], ox, oy, zoomSize);
        
        const hidesHair = player.equipment.helmet && player.equipment.helmet.hidesHair;
        if (!hidesHair && SpriteMatrices[player.appearance.hair]) {
            drawOptimizedSprite(pCtx, player.appearance.hair, SpriteMatrices[player.appearance.hair], ox, oy, zoomSize);
        }

        const eq = player.equipment;
        let gSuffix = player.appearance.gender === 'female' ? '_female' : '_male';
        
        if (eq.armor && eq.armor.spriteId) {
            let sId = eq.armor.spriteId + gSuffix;
            if (SpriteMatrices[sId]) drawOptimizedSprite(pCtx, sId, SpriteMatrices[sId], ox, oy, zoomSize);
            else if (SpriteMatrices[eq.armor.spriteId]) drawOptimizedSprite(pCtx, eq.armor.spriteId, SpriteMatrices[eq.armor.spriteId], ox, oy, zoomSize);
        }
        
        // We draw the helmet last so it overlays the hair/face properly
        if (eq.helmet && eq.helmet.spriteId && SpriteMatrices[eq.helmet.spriteId]) {
            drawOptimizedSprite(pCtx, eq.helmet.spriteId, SpriteMatrices[eq.helmet.spriteId], ox, oy, zoomSize);
        }
        
    } else if (portraitId) {
        // It's an NPC or a Monster! Just draw their normal sprite centered and scaled up.
        // If it's Kreg, we might pass 'icon_stout' for now if he doesn't have a sprite yet!
        if (SpriteMatrices[portraitId]) {
            drawOptimizedSprite(pCtx, portraitId, SpriteMatrices[portraitId], 0, 0, 96);
        }
    }
}
// ====================================