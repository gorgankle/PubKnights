// === js/dialogue.js ===
// TYPEWRITER DIALOGUE ENGINE & PROCEDURAL PORTRAITS

let dialogueSequence = [];
let currentDialoguePage = 0;
let currentDialogueText = "";
let typeIndex = 0;
let typeTimer = null;
let isTyping = false;
let dialogueCompleteCallback = null;

function playDialogueSequence(sequence, onComplete = null) {
    if (!sequence || sequence.length === 0) return;
    
    dialogueSequence = sequence;
    currentDialoguePage = 0;
    dialogueCompleteCallback = typeof onComplete === 'function' ? onComplete : null;
    
    const overlay = document.getElementById('dialogue-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        showNextDialoguePage();
    }
}

function showNextDialoguePage() {
    if (currentDialoguePage >= dialogueSequence.length) {
        document.getElementById('dialogue-overlay').style.display = 'none';
        const onComplete = dialogueCompleteCallback;
        dialogueCompleteCallback = null;
        if (onComplete) onComplete();
        return;
    }
    
    let page = dialogueSequence[currentDialoguePage];
    
    // --- THE FIX: DYNAMIC PLAYER NAME ---
    let displaySpeaker = page.speaker || "Unknown";
    // If this is the player talking, automatically grab their actual login name!
    if (page.portraitId === 'player' || displaySpeaker === 'PLAYER') {
        displaySpeaker = typeof currentUsername !== 'undefined' ? currentUsername : "Knight";
    }
    
    document.getElementById('dialogue-speaker-name').innerText = displaySpeaker;
    document.getElementById('dialogue-text-content').innerHTML = "";
    document.getElementById('dialogue-next-indicator').style.display = 'none';
    
    renderDialoguePortrait(page.portraitId);
    
    currentDialogueText = page.text || "...";
    typeIndex = 0;
    isTyping = true;
    
    clearInterval(typeTimer);
    typeTimer = setInterval(typewriterTick, 35); 
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
        // --- THE FIX: BETTER ZOOM & CENTERING ---
        const zoomSize = 180; // 6x scale of a 24x24 sprite (gives breathing room!)
        const ox = -30;       // Perfect horizontal center
        const oy = -20;       // Crops just the legs out, keeping shoulders and head
        
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
        
        if (eq.helmet && eq.helmet.spriteId && SpriteMatrices[eq.helmet.spriteId]) {
            drawOptimizedSprite(pCtx, eq.helmet.spriteId, SpriteMatrices[eq.helmet.spriteId], ox, oy, zoomSize);
        }
        
    } else if (portraitId) {
        if (SpriteMatrices[portraitId]) {
            // === THE FIX: ZOOM IN ON NPCs ===
            if (portraitId.startsWith('npc_')) {
                // Apply the exact same zoom and cropping coordinates as the player!
                const zoomSize = 180; 
                const ox = -30;       
                const oy = -20;
                drawOptimizedSprite(pCtx, portraitId, SpriteMatrices[portraitId], ox, oy, zoomSize);
            } else {
                // Standard items and monsters render fully centered and uncropped
                drawOptimizedSprite(pCtx, portraitId, SpriteMatrices[portraitId], 0, 0, 96);
            }
            // ================================
        }
    }
}
// ====================================
