// === js/dialogue.js ===
// TYPEWRITER DIALOGUE ENGINE & PROCEDURAL PORTRAITS

let dialogueSequence = [];
let currentDialoguePage = 0;
let currentDialogueText = "";
let typeIndex = 0;
let typeTimer = null;
let isTyping = false;
let dialogueCompleteCallback = null;
let currentDialogueChoices = [];
let dialoguePreviousFocus = null;
let dialogueCancelCallback = null;

function playDialogueSequence(sequence, onComplete = null, options = {}) {
    if (!sequence || sequence.length === 0) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }
    
    dialogueSequence = sequence;
    currentDialoguePage = 0;
    dialogueCompleteCallback = typeof onComplete === 'function' ? onComplete : null;
    dialogueCancelCallback = typeof options.onCancel === 'function' ? options.onCancel : null;
    
    const overlay = document.getElementById('dialogue-overlay');
    if (overlay) {
        if (overlay.style.display !== 'flex') dialoguePreviousFocus = document.activeElement;
        overlay.style.display = 'flex';
        overlay.addEventListener('keydown', handleDialogueKeydown);
        if (typeof overlay.focus === 'function') overlay.focus({ preventScroll: true });
        showNextDialoguePage();
    }
}

function showNextDialoguePage() {
    if (currentDialoguePage >= dialogueSequence.length) {
        closeDialogueOverlay(true);
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
    const textContent = document.getElementById('dialogue-text-content');
    textContent.textContent = '';
    textContent.setAttribute('aria-busy', 'true');
    document.getElementById('dialogue-next-indicator').style.display = 'none';
    hideDialogueChoices();
    
    renderDialoguePortrait(page.portraitId);
    
    currentDialogueText = page.text || "...";
    typeIndex = 0;
    isTyping = true;
    
    clearInterval(typeTimer);
    const reducedMotion = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
        textContent.textContent = currentDialogueText;
        textContent.setAttribute('aria-busy', 'false');
        typeIndex = currentDialogueText.length;
        isTyping = false;
        if (Array.isArray(page.choices) && page.choices.length) showDialogueChoices(page.choices);
        else document.getElementById('dialogue-next-indicator').style.display = 'block';
        return;
    }
    typeTimer = setInterval(typewriterTick, 35);
}

function typewriterTick() {
    if (typeIndex < currentDialogueText.length) {
        document.getElementById('dialogue-text-content').textContent = currentDialogueText.substring(0, typeIndex + 1);
        typeIndex++;
        
        // Play a retro blip sound every 3 characters so it doesn't overwhelm the audio engine
        if (typeIndex % 3 === 0 && typeof playRetroSound === 'function') {
            playRetroSound('step'); 
        }
    } else {
        // Typing finished. Menu pages reveal their choices; normal story pages
        // keep the classic blinking advance arrow.
        clearInterval(typeTimer);
        isTyping = false;
        document.getElementById('dialogue-text-content').setAttribute('aria-busy', 'false');
        const page = dialogueSequence[currentDialoguePage] || {};
        if (Array.isArray(page.choices) && page.choices.length) {
            showDialogueChoices(page.choices);
        } else {
            document.getElementById('dialogue-next-indicator').style.display = 'block';
        }
    }
}

function advanceDialogue() {
    if (isTyping) {
        // The player clicked while it was typing! Skip the animation and show all text instantly.
        clearInterval(typeTimer);
        document.getElementById('dialogue-text-content').textContent = currentDialogueText;
        document.getElementById('dialogue-text-content').setAttribute('aria-busy', 'false');
        isTyping = false;
        const page = dialogueSequence[currentDialoguePage] || {};
        if (Array.isArray(page.choices) && page.choices.length) {
            showDialogueChoices(page.choices);
        } else {
            document.getElementById('dialogue-next-indicator').style.display = 'block';
        }
    } else {
        const page = dialogueSequence[currentDialoguePage] || {};
        if (Array.isArray(page.choices) && page.choices.length) return;
        // The text was already done. Move to the next page!
        if (typeof playRetroSound === 'function') playRetroSound('menu');
        currentDialoguePage++;
        showNextDialoguePage();
    }
}

function hideDialogueChoices() {
    currentDialogueChoices = [];
    const menu = document.getElementById('dialogue-choice-menu');
    if (!menu) return;
    menu.hidden = true;
    menu.innerHTML = '';
}

function showDialogueChoices(choices) {
    const menu = document.getElementById('dialogue-choice-menu');
    if (!menu) return;
    currentDialogueChoices = choices.filter(Boolean);
    menu.innerHTML = '';
    currentDialogueChoices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `dialogue-choice${choice.tone ? ` is-${choice.tone}` : ''}`;
        button.dataset.dialogueChoiceIndex = String(index);
        button.disabled = choice.disabled === true;
        button.innerHTML = `<strong>${escapeDialogueHtml(choice.label || choice.id || 'Continue')}</strong>${choice.description ? `<span>${escapeDialogueHtml(choice.description)}</span>` : ''}`;
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            selectDialogueChoice(index);
        });
        menu.appendChild(button);
    });
    menu.hidden = false;
    const firstEnabled = menu.querySelector('button:not(:disabled)');
    if (firstEnabled && typeof firstEnabled.focus === 'function') {
        firstEnabled.focus({ preventScroll: true });
    }
}

function handleDialogueKeydown(event) {
    const overlay = document.getElementById('dialogue-overlay');
    if (!overlay || overlay.style.display !== 'flex') return;
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        const onCancel = dialogueCancelCallback;
        closeDialogueOverlay(false);
        if (onCancel) onCancel();
        return;
    }
    const menu = document.getElementById('dialogue-choice-menu');
    const buttons = menu && !menu.hidden
        ? Array.from(menu.querySelectorAll('button:not(:disabled)'))
        : [];
    if (buttons.length && ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        const activeIndex = buttons.indexOf(document.activeElement);
        let nextIndex = activeIndex;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = buttons.length - 1;
        else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (Math.max(-1, activeIndex) + 1) % buttons.length;
        else nextIndex = activeIndex <= 0 ? buttons.length - 1 : activeIndex - 1;
        buttons[nextIndex].focus({ preventScroll: true });
        return;
    }
    if (event.key === 'Tab') {
        const focusables = buttons.length ? buttons : [overlay];
        const activeIndex = focusables.indexOf(document.activeElement);
        if (event.shiftKey && activeIndex <= 0) {
            event.preventDefault();
            focusables[focusables.length - 1].focus({ preventScroll: true });
        } else if (!event.shiftKey && activeIndex === focusables.length - 1) {
            event.preventDefault();
            focusables[0].focus({ preventScroll: true });
        }
        return;
    }
    if (!buttons.length && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        event.stopPropagation();
        advanceDialogue();
    }
}

function escapeDialogueHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function selectDialogueChoice(index) {
    const choice = currentDialogueChoices[index];
    if (!choice || choice.disabled === true) return;
    if (typeof playRetroSound === 'function') playRetroSound('menu');
    const onSelect = choice.onSelect;
    closeDialogueOverlay(false);
    if (typeof onSelect === 'function') onSelect(choice.id);
}

function closeDialogueOverlay(runComplete = false) {
    clearInterval(typeTimer);
    typeTimer = null;
    isTyping = false;
    hideDialogueChoices();
    const overlay = document.getElementById('dialogue-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.removeEventListener('keydown', handleDialogueKeydown);
    }
    const onComplete = dialogueCompleteCallback;
    const previousFocus = dialoguePreviousFocus;
    dialogueCompleteCallback = null;
    dialogueCancelCallback = null;
    dialoguePreviousFocus = null;
    dialogueSequence = [];
    currentDialoguePage = 0;
    if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus({ preventScroll: true });
    }
    if (runComplete && onComplete) onComplete();
}

function playDialogueMenu(page, choices, onClose = null) {
    playDialogueSequence([{
        ...(page || {}),
        choices: Array.isArray(choices) ? choices : []
    }], onClose, { onCancel: onClose });
}

function renderDialoguePortrait(portraitId) {
    const pCanvas = document.getElementById('dialogue-portrait-canvas');
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    
    if (portraitId === 'player') {
        const zoomSize = 180; // Enlarged crop of the canonical 32x32 sprite.
        const ox = -30;
        const oy = -20;
        if (typeof drawHumanoidActorFront === 'function') {
            const renderedProfile = drawHumanoidActorFront(
                pCtx,
                player,
                ox,
                oy,
                zoomSize
            );
            if (renderedProfile) return;
        }
        if (typeof drawOptimizedSprite !== 'function') return;
        
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
            drawProceduralSprite(
                pCtx,
                SpriteMatrices[eq.helmet.spriteId],
                ox,
                oy,
                zoomSize
            );
        }
        
    } else if (portraitId) {
        const humanoidProfile = typeof getHumanoidActorVisualProfile === 'function'
            ? getHumanoidActorVisualProfile(portraitId)
            : null;
        if (humanoidProfile && typeof drawHumanoidActorFront === 'function') {
            const renderedProfile = drawHumanoidActorFront(
                pCtx,
                humanoidProfile,
                -30,
                -20,
                180
            );
            if (renderedProfile) return;
        }
        if (typeof drawOptimizedSprite !== 'function') return;
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
