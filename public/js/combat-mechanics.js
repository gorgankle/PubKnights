// --- COMBAT CORE MECHANICS & ACTIONS ---

// Make sure these three lines only appear ONCE at the top of the file!
let activeTargetIndex   = -1;
let previousCombatPhase = 'ACTION_READY';
let pendingLoot = [];
let equipmentAttackMenuOpen = false;
let equipmentAttackMenuActorUid = null;

function getActiveCombatant() {
    const activeUid = activeCombatActorUid || 'player_0';
    if (typeof getCombatActorByUid === 'function') {
        const actor = getCombatActorByUid(activeUid);
        if (actor) return actor;
    }
    return { uid: 'player_0', kind: 'player', name: player.username || 'Knight', x: player.x, y: player.y, stamina: player.stamina, equipment: player.equipment, speed: getPlayerSwiftness() };
}

function getActiveCombatantEquipment() {
    const actor = getActiveCombatant();
    if (actor && actor.equipment && typeof actor.equipment === 'object') {
        return actor.equipment;
    }
    if (
        !actor
        || actor.uid === 'player_0'
        || actor.kind === 'player'
        || actor === player
    ) {
        return player && player.equipment ? player.equipment : {};
    }
    return {};
}

function getActiveCombatantPosition() {
    const actor = getActiveCombatant();
    return { x: actor.x, y: actor.y, size: actor.size || 1 };
}

function getActiveCombatantWeapon() {
    return getActiveCombatantEquipment().weapon || null;
}

function getActiveCombatantOffhand() {
    return getActiveCombatantEquipment().offhand || null;
}

function getActiveCombatantStamina() {
    const actor = getActiveCombatant();
    return actor && typeof actor.stamina === 'number' ? actor.stamina : player.stamina;
}

function getActiveCombatantMoveRange() {
    const actor = getActiveCombatant();
    return Math.max(1, Math.min(12, actor && actor.speed ? actor.speed : getPlayerSwiftness()));
}

function getActiveCombatantName() {
    const actor = getActiveCombatant();
    return actor && actor.name ? actor.name : 'Knight';
}

function getActiveCompanionRosterEntry() {
    const actor = getActiveCombatant();
    if (!actor || actor.uid === 'player_0' || actor.kind === 'player') return null;
    const instanceId = actor.companionInstanceId;
    const companions = player && player.roster && Array.isArray(player.roster.companions)
        ? player.roster.companions
        : [];
    return companions.find(companion => companion.instanceId === instanceId) || null;
}

function normalizeCombatItemReference(reference) {
    if (reference && typeof reference === 'object') {
        if (reference.source === 'pocket') return { source: 'pocket', pocketIndex: Math.trunc(Number(reference.pocketIndex)) };
        return { source: 'backpack', index: Math.trunc(Number(reference.index)) };
    }
    return { source: 'backpack', index: Math.trunc(Number(reference)) };
}

function getActiveCombatantItem(activeIndex) {
    if (activeIndex === 'weapon') return getActiveCombatantWeapon();
    if (
        activeIndex
        && typeof activeIndex === 'object'
        && activeIndex.kind === 'equipmentAttack'
    ) {
        return getActiveCombatantEquipment()[activeIndex.equipmentSlot] || null;
    }
    const reference = normalizeCombatItemReference(activeIndex);
    if (reference.source === 'pocket') {
        const companion = getActiveCompanionRosterEntry();
        return companion && Array.isArray(companion.pockets) ? companion.pockets[reference.pocketIndex] : null;
    }
    return player.inventory[reference.index];
}

function getCombatItemDispatchPayload(reference) {
    const normalized = normalizeCombatItemReference(reference);
    return normalized.source === 'pocket'
        ? { pocketIndex: normalized.pocketIndex }
        : { invIndex: normalized.index };
}

function selectCombatItem(reference) {
    const item = getActiveCombatantItem(reference);
    if (!item) return;
    if (['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'boots'].includes(item.slot)) {
        const normalized = normalizeCombatItemReference(reference);
        const actor = getActiveCombatant();
        if (normalized.source === 'backpack' && actor && (actor.uid === 'player_0' || actor.kind === 'player')) {
            handleCombatEquip(normalized.index);
        } else {
            logMessage('Mercenary equipment can only be changed from the Knight paperdoll outside combat.');
            if (typeof playRetroSound === 'function') playRetroSound('error');
        }
        return;
    }
    if (!item.combat) return;

    const targetType = item.combat.targetType || 'self';
    if (['single', 'enemy', 'tile', 'aoe'].includes(targetType)) {
        window.prepTargetAction(reference);
        return;
    }
    consumeCombatItem(reference);
}

function applyActiveCombatantLocalMove(tx, ty, staminaCost) {
    const actor = getActiveCombatant();
    if (!actor || actor.uid === 'player_0' || actor.kind === 'player') {
        player.stamina = Math.max(0, (player.stamina || 0) - staminaCost);
        player.x = tx;
        player.y = ty;
        return;
    }
    actor.stamina = Math.max(0, (actor.stamina || 0) - staminaCost);
    actor.x = tx;
    actor.y = ty;
}


// Data-Driven Special Descriptions
function getWeaponSpecialDesc(item) {
    if (!item || item.slot !== "weapon" || !item.combat || !item.combat.special) return "";
    return `<b>[${item.combat.special.name}]:</b> ${item.combat.special.desc}`;
}

function listActiveEquipmentAttacks() {
    if (
        typeof EquipmentActionContract === 'undefined'
        || typeof EquipmentActionContract.listEquipmentAttacks !== 'function'
    ) {
        return [];
    }
    const attacks = EquipmentActionContract.listEquipmentAttacks(
        getActiveCombatantEquipment()
    );
    return Array.isArray(attacks) ? attacks : [];
}

function resolveActiveEquipmentAttack(equipmentSlot, actionId) {
    if (
        typeof EquipmentActionContract === 'undefined'
        || typeof EquipmentActionContract.resolveEquipmentAttack !== 'function'
    ) {
        return null;
    }
    return EquipmentActionContract.resolveEquipmentAttack(
        getActiveCombatantEquipment(),
        equipmentSlot,
        actionId
    );
}

function isEquipmentAttackTargetReference(reference = activeTargetIndex) {
    return Boolean(
        reference
        && typeof reference === 'object'
        && reference.kind === 'equipmentAttack'
        && reference.equipmentSlot
        && reference.actionId
    );
}

function resolvePendingEquipmentAttack() {
    if (!isEquipmentAttackTargetReference()) return null;
    const action = resolveActiveEquipmentAttack(
        activeTargetIndex.equipmentSlot,
        activeTargetIndex.actionId
    );
    if (
        !action
        || String(action.itemId || '') !== String(activeTargetIndex.itemId || '')
    ) {
        return null;
    }
    return action;
}

function getPendingEquipmentAttackTargetInstruction() {
    const action = resolvePendingEquipmentAttack();
    if (!action) return 'TARGETING: Select a highlighted tile';
    const profile = getEquipmentAttackTargetProfile(action);
    return ['tile', 'aoe', 'area'].includes(profile.targetType)
        ? `TARGETING ${action.name}: Select a highlighted tile`
        : `TARGETING ${action.name}: Select an enemy`;
}

function getEquipmentAttackTargetProfile(action) {
    if (!action) return null;
    const rules = action.rules && typeof action.rules === 'object'
        ? action.rules
        : action;
    const targetType = String(
        action.targetType || rules.targetType || 'enemy'
    ).toLowerCase();
    const isArea = ['tile', 'aoe', 'area'].includes(targetType);
    return {
        range: Math.max(0, Number(action.range ?? rules.range) || 0),
        ignoresLoS: Boolean(action.ignoresLoS ?? rules.ignoresLoS),
        shape: rules.aoeShape || (isArea ? targetType : 'single'),
        radius: Math.max(0, Number(rules.aoeRadius) || 0),
        targetType
    };
}

function getEquipmentAttackTargetValidity(action, target) {
    if (!action || !target || target.alive === false) {
        return { inRange: false, lineClear: false, valid: false };
    }
    const origin = getActiveCombatantPosition();
    const profile = getEquipmentAttackTargetProfile(action);
    if (typeof getCombatActorTargetValidity === 'function') {
        return getCombatActorTargetValidity(target, origin, profile);
    }
    const inRange = getGridDistance(
        origin.x,
        origin.y,
        target.x,
        target.y,
        target.size || 1
    ) <= profile.range;
    let lineClear = profile.ignoresLoS;
    const targetSize = target.size || 1;
    for (let x = target.x; x < target.x + targetSize && !lineClear; x++) {
        for (let y = target.y; y < target.y + targetSize; y++) {
            if (hasLineOfSight(origin.x, origin.y, x, y)) {
                lineClear = true;
                break;
            }
        }
    }
    return { inRange, lineClear, valid: inRange && lineClear };
}

function getEquipmentAttackDisabledReason(action, options = {}) {
    if (!action) return 'Action unavailable.';
    const validActionPhase = combatPhase === 'ACTION_READY' || (
        options.allowTargeting === true
        && combatPhase === 'TARGETING'
        && isEquipmentAttackTargetReference()
    );
    if (
        gameState !== 'COMBAT'
        || currentTurn !== 'PLAYER'
        || !validActionPhase
        || (combatActionsRemaining || 0) <= 0
    ) {
        return 'Awaiting action phase.';
    }
    const activeActor = getActiveCombatant();
    if (activeActor) {
        const rules = action.rules && typeof action.rules === 'object'
            ? action.rules
            : action;
        const guardType = String(
            action.guardType || rules.guardType || ''
        ).toLowerCase();
        const reactionState = guardType === 'evasion'
            ? activeActor.evasionState
            : activeActor.guardState;
        if (
            action.actionType === 'guard'
            && reactionState
            && Math.max(
                0,
                Math.trunc(Number(reactionState.charges) || 0)
            ) > 0
        ) {
            return `${action.name} is already active.`;
        }
    }
    const staminaCost = Math.max(0, Number(action.staminaCost) || 0);
    const stamina = Math.max(0, Number(getActiveCombatantStamina()) || 0);
    if (stamina < staminaCost) {
        return `Needs ${staminaCost} STAM; ${Math.floor(stamina)} available.`;
    }
    return '';
}

function updateEquipmentAttackMenuDom(open) {
    const menu = document.getElementById('equipment-attack-menu');
    const button = document.getElementById('equipment-attacks-btn');
    if (menu) menu.hidden = !open;
    if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeEquipmentAttackMenu() {
    equipmentAttackMenuOpen = false;
    equipmentAttackMenuActorUid = null;
    updateEquipmentAttackMenuDom(false);
}

function getEquipmentAttackMenuItems() {
    const menu = document.getElementById('equipment-attack-menu');
    if (!menu || typeof menu.querySelectorAll !== 'function') return [];
    return Array.from(menu.querySelectorAll('[role="menuitem"]'));
}

function focusEquipmentAttackMenuItem(index = 0) {
    const items = getEquipmentAttackMenuItems();
    if (items.length === 0) return false;
    const normalizedIndex = ((Math.trunc(Number(index)) || 0) % items.length + items.length) % items.length;
    items.forEach((item, itemIndex) => {
        item.tabIndex = itemIndex === normalizedIndex ? 0 : -1;
    });
    const item = items[normalizedIndex];
    if (item && typeof item.focus === 'function') item.focus();
    return true;
}

function handleEquipmentAttackPopoverDocumentClick(event) {
    if (!equipmentAttackMenuOpen) return;
    const control = document.getElementById('equipment-attack-control');
    if (
        control
        && event
        && typeof control.contains === 'function'
        && control.contains(event.target)
    ) {
        return;
    }
    closeEquipmentAttackMenu();
    if (typeof refreshSystemUI === 'function') refreshSystemUI();
}

function handleEquipmentAttackPopoverKeydown(event) {
    if (!equipmentAttackMenuOpen || !event) return;
    if (event.key === 'Escape') {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        closeEquipmentAttackMenu();
        if (typeof refreshSystemUI === 'function') refreshSystemUI();
        const button = document.getElementById('equipment-attacks-btn');
        if (button && typeof button.focus === 'function') button.focus();
        return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = getEquipmentAttackMenuItems();
    if (items.length === 0) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement);
    if (event.key === 'Home') focusEquipmentAttackMenuItem(0);
    else if (event.key === 'End') focusEquipmentAttackMenuItem(items.length - 1);
    else if (event.key === 'ArrowDown') focusEquipmentAttackMenuItem(currentIndex < 0 ? 0 : currentIndex + 1);
    else focusEquipmentAttackMenuItem(currentIndex < 0 ? items.length - 1 : currentIndex - 1);
}

if (
    typeof document !== 'undefined'
    && typeof document.addEventListener === 'function'
) {
    document.addEventListener(
        'click',
        handleEquipmentAttackPopoverDocumentClick
    );
    document.addEventListener(
        'keydown',
        handleEquipmentAttackPopoverKeydown
    );
}

function resetEquipmentAttackUiState(options = {}) {
    closeEquipmentAttackMenu();
    if (options.clearTarget !== false && isEquipmentAttackTargetReference()) {
        activeTargetIndex = -1;
        hoverTile = { x: -1, y: -1 };
        pendingMove = null;
        if (options.restorePhase === true && combatPhase === 'TARGETING') {
            combatPhase = 'ACTION_READY';
        }
    }
}

function isEquipmentAttackMenuOpen() {
    const actor = getActiveCombatant();
    const actorUid = actor && actor.uid ? actor.uid : null;
    if (
        equipmentAttackMenuOpen
        && equipmentAttackMenuActorUid !== actorUid
    ) {
        closeEquipmentAttackMenu();
    }
    return equipmentAttackMenuOpen;
}

function toggleEquipmentAttackMenu() {
    if (
        gameState !== 'COMBAT'
        || currentTurn !== 'PLAYER'
        || combatPhase !== 'ACTION_READY'
        || (combatActionsRemaining || 0) <= 0
    ) {
        return;
    }
    if (equipmentAttackMenuOpen) {
        closeEquipmentAttackMenu();
    } else {
        const actor = getActiveCombatant();
        if (listActiveEquipmentAttacks().length === 0) return;
        equipmentAttackMenuOpen = true;
        equipmentAttackMenuActorUid = actor && actor.uid ? actor.uid : null;
        updateEquipmentAttackMenuDom(true);
        if (typeof playRetroSound === 'function') playRetroSound('menu');
    }
    refreshSystemUI();
    if (equipmentAttackMenuOpen) {
        focusEquipmentAttackMenuItem(0);
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                if (equipmentAttackMenuOpen) focusEquipmentAttackMenuItem(0);
            });
        }
    }
}

function beginEquipmentAttackTargeting(action) {
    if (!action) return false;
    closeEquipmentAttackMenu();
    activeTargetIndex = {
        kind: 'equipmentAttack',
        equipmentSlot: action.equipmentSlot,
        actionId: action.id,
        itemId: action.itemId
    };
    selectedEnemy = null;
    hoverTile = { x: -1, y: -1 };
    pendingMove = null;
    combatPhase = 'TARGETING';
    const profile = getEquipmentAttackTargetProfile(action);
    logMessage(
        profile && ['tile', 'aoe', 'area'].includes(profile.targetType)
            ? `Select a target tile for ${action.name}.`
            : `Select an enemy for ${action.name}.`
    );
    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid();
    return true;
}

function dispatchEquipmentAttack(action, target = null, tile = null) {
    const fromTargeting = (
        combatPhase === 'TARGETING'
        && isEquipmentAttackTargetReference()
    );
    if (
        !action
        || getEquipmentAttackDisabledReason(action, {
            allowTargeting: fromTargeting
        })
    ) {
        return false;
    }
    const payload = {
        actorUid: activeCombatActorUid,
        actionCategory: 'equipmentAttack',
        equipmentSlot: action.equipmentSlot,
        actionId: action.id,
        itemId: action.itemId
    };
    if (target) {
        payload.targetEnemy = {
            id: target.id,
            uid: target.uid,
            x: target.x,
            y: target.y
        };
    }
    if (tile) {
        payload.tx = tile.x;
        payload.ty = tile.y;
    }

    resetEquipmentAttackUiState();
    combatPhase = 'WAITING_FOR_SERVER';
    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid();
    socket.emit('dispatchCombatAction', payload);
    return true;
}

function selectEquipmentAttack(equipmentSlot, actionId) {
    const action = resolveActiveEquipmentAttack(equipmentSlot, actionId);
    const disabledReason = getEquipmentAttackDisabledReason(action);
    if (disabledReason) {
        logMessage(disabledReason);
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return false;
    }
    const profile = getEquipmentAttackTargetProfile(action);
    if (profile.targetType === 'self') {
        return dispatchEquipmentAttack(action);
    }
    if (['tile', 'aoe', 'area'].includes(profile.targetType)) {
        return beginEquipmentAttackTargeting(action);
    }
    if (
        selectedEnemy
        && getEquipmentAttackTargetValidity(action, selectedEnemy).valid
    ) {
        return dispatchEquipmentAttack(action, selectedEnemy);
    }
    return beginEquipmentAttackTargeting(action);
}

// The Unified Client Dispatcher
function executeCombatAction(actionType) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER') return;
    if (combatPhase === 'WAITING_FOR_SERVER' || combatPhase === 'WAITING_FOR_ATB' || combatPhase === 'VICTORY') return;
    if (combatPhase === 'TARGETING') {
        if (actionType !== 'rest' && actionType !== 'end') return;
        activeTargetIndex = -1;
        hoverTile = {x: -1, y: -1};
        pendingMove = null;
        closeEquipmentAttackMenu();
    }
    if (actionType !== 'end' && (combatActionsRemaining || 0) <= 0) return;

    if (actionType === 'special') {
        const legacyWeaponAction = listActiveEquipmentAttacks().find(
            action => action && action.equipmentSlot === 'weapon'
        );
        if (legacyWeaponAction) {
            selectEquipmentAttack(
                legacyWeaponAction.equipmentSlot,
                legacyWeaponAction.id
            );
        }
        return;
    }

    if (actionType === 'end' || actionType === 'rest' || actionType === 'slash') {
        closeEquipmentAttackMenu();
        
        // Client-side UX validation (Server will verify this again)
        if (actionType === 'slash') {
           if (!selectedEnemy || !selectedEnemy.alive) return;
            
            let weapon = getActiveCombatantWeapon();
            
            // === PHASE 0: UNARMED CLIENT FALLBACK ===
            // Injects a mock weapon dynamically so it passes validation and emits to the server
            if (!weapon || !weapon.combat) {
                weapon = {
                    combat: {
                        standard: { range: 1, staminaCost: 5 }
                    }
                };
            }
            // ========================================
            // Pull dynamic rules directly from the item schema
            let combatRules = weapon.combat.standard;
            let staminaCost = combatRules.staminaCost;
            let range = combatRules.range;
            
            if (getActiveCombatantStamina() < staminaCost) {
                logMessage(`❌ Legs are too heavy. Not enough stamina (${staminaCost} required).`);
                if (typeof playRetroSound === 'function') playRetroSound('error');
                return;
            }
            const activePosForAttack = getActiveCombatantPosition();
            let dist = getGridDistance(activePosForAttack.x, activePosForAttack.y, selectedEnemy.x, selectedEnemy.y, selectedEnemy.size || 1);
            if (dist > range) { 
                logMessage(`❌ Target outside weapon scope range (Max Range: ${range}).`); 
                if (typeof playRetroSound === 'function') playRetroSound('error'); 
                return; 
            }
            
            let losClear = false; 
            let sSize = selectedEnemy.size || 1;
            for (let bx = selectedEnemy.x; bx < selectedEnemy.x + sSize; bx++) {
                for (let by = selectedEnemy.y; by < selectedEnemy.y + sSize; by++) {
                    if (hasLineOfSight(activePosForAttack.x, activePosForAttack.y, bx, by)) losClear = true;
                }
            }
            if (!losClear) { 
                logMessage("❌ Line of sight blocked by obstruction."); 
                if (typeof playRetroSound === 'function') playRetroSound('error'); 
                return; 
            }
            
        }

        combatPhase = 'WAITING_FOR_SERVER';
        refreshSystemUI();

        // ONE unified payload to rule them all
        socket.emit('dispatchCombatAction', { 
            actorUid: activeCombatActorUid,
            actionCategory: actionType === 'end' ? 'endTurn' : (actionType === 'rest' ? 'rest' : 'weapon'),
            subType: actionType, 
            targetEnemy: selectedEnemy ? { 
                id: selectedEnemy.id, 
                uid: selectedEnemy.uid,
                x: selectedEnemy.x,
                y: selectedEnemy.y
            } : null 
        });
        
        return; 
    }
}

function endPlayerTurn() {
    executeCombatAction('end');
}

function fleeCombat() {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER' || combatPhase !== 'ACTION_READY') return;
    closeEquipmentAttackMenu();
    
    let confirmFlee = confirm("Are you sure you want to run away? You will forfeit all pending loot and return to town.");
    if (!confirmFlee) return;

    // Lock the phase so they can't spam buttons while fleeing
    combatPhase = 'WAITING_FOR_SERVER';
    refreshSystemUI();
    
    socket.emit('dispatchCombatAction', { actionCategory: 'flee' });
}

function handleCombatEquip(idx) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER' || combatPhase !== 'ACTION_READY' || combatActionsRemaining <= 0) return;
    resetEquipmentAttackUiState();
    combatPhase = 'WAITING_FOR_SERVER';
    refreshSystemUI();
    socket.emit('dispatchCombatAction', { actorUid: activeCombatActorUid, actionCategory: 'equip', invIndex: idx });
}

function consumeCombatItem(reference) {
    if (gameState !== 'COMBAT' || currentTurn !== 'PLAYER' || combatPhase !== 'ACTION_READY' || combatActionsRemaining <= 0) return;
    resetEquipmentAttackUiState();
    combatPhase = 'WAITING_FOR_SERVER';
    refreshSystemUI();
    socket.emit('dispatchCombatAction', {
        actorUid: activeCombatActorUid,
        actionCategory: 'consumable',
        ...getCombatItemDispatchPayload(reference)
    });
}

function consumeBrew(invIndex) { consumeCombatItem(invIndex); }


// === TARGETING STATE CONTROLLERS ===
window.prepTargetAction = function(idx) {
    if (gameState !== 'COMBAT') return;
    
    // === THE FIX: Enforce Phase 2 for ALL throws and spells! ===
    if (currentTurn !== 'PLAYER' || combatPhase !== 'ACTION_READY' || combatActionsRemaining <= 0) {
        logMessage("❌ Tactical Error: Targeted actions can only be aimed during Phase 2.");
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }

    closeEquipmentAttackMenu();
    selectedEnemy = null;
    hoverTile = {x: -1, y: -1};
    activeTargetIndex = idx;         
    combatPhase = 'TARGETING';       
    refreshSystemUI(); 
    if (typeof drawGrid === 'function') drawGrid(); 
};
window.executeTargetAction = function(tx, ty) {
    if (activeTargetIndex === -1) return;

    if (isEquipmentAttackTargetReference()) {
        const action = resolvePendingEquipmentAttack();
        const profile = getEquipmentAttackTargetProfile(action);
        if (!action || !profile) {
            resetEquipmentAttackUiState({ restorePhase: true });
            refreshSystemUI();
            return;
        }
        if (!['tile', 'aoe', 'area'].includes(profile.targetType)) {
            const target = getPlayerAttackables().find(actor => {
                const size = actor.size || 1;
                return actor.alive !== false
                    && tx >= actor.x
                    && tx < actor.x + size
                    && ty >= actor.y
                    && ty < actor.y + size;
            });
            const validity = getEquipmentAttackTargetValidity(action, target);
            if (!target || !validity.valid) {
                logMessage(!target
                    ? `Select an enemy for ${action.name}.`
                    : (validity.inRange
                        ? 'Target blocked by obstacles.'
                        : 'Target outside action range.'));
                if (typeof playRetroSound === 'function') playRetroSound('error');
                return;
            }
            dispatchEquipmentAttack(action, target);
            return;
        }
        dispatchEquipmentAttack(action, null, { x: tx, y: ty });
        return;
    }

    hoverTile = {x: -1, y: -1};
    
    combatPhase = 'WAITING_FOR_SERVER'; 
    
    // Route Weapon Specials vs Consumables!
    if (activeTargetIndex === 'weapon') {
        socket.emit('dispatchCombatAction', { actorUid: activeCombatActorUid, actionCategory: 'weapon', subType: 'special', tx: tx, ty: ty });
    } else {
        socket.emit('dispatchCombatAction', { actorUid: activeCombatActorUid, actionCategory: 'consumable', ...getCombatItemDispatchPayload(activeTargetIndex), tx: tx, ty: ty });
    }
    
    activeTargetIndex = -1;
    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid();
};

window.cancelTarget = function() {
    hoverTile = {x: -1, y: -1};
    activeTargetIndex = -1;
    pendingMove = null;
    closeEquipmentAttackMenu();
    combatPhase = 'ACTION_READY';
    refreshSystemUI();
    if (typeof drawGrid === 'function') drawGrid(); 
};

// === POST-COMBAT LOOT GUI ENGINE ===

function showLootScreen() {
    document.getElementById("loot-screen").style.display = "block";
    refreshLootUI();
    animateCombatRewards(); // <--- Triggers the new animation!
}

// === NEW: XP BAR ANIMATOR ===
function animateCombatRewards() {
    let goldDisplay = document.getElementById("loot-gold-reward");
    let xpDisplay = document.getElementById("loot-xp-reward");
    let xpBar = document.getElementById("loot-xp-bar");
    let xpText = document.getElementById("loot-xp-text");

    let targetGold = player.pendingGold || 0;
    let targetXp = sanitizeLifetimeXp(player.pendingXp || 0);

    if (goldDisplay) goldDisplay.innerText = `+${targetGold}g`;
    if (xpDisplay) xpDisplay.innerText = `+${targetXp} XP`;

    if (!xpBar || !xpText) return;

    let displayXp = sanitizeLifetimeXp(player.xp || 0);
    let currentLevel = normalizePlayerLevel(player.level || 1);
    let targetTotalXp = displayXp + targetXp;
    const formatXp = value => Math.floor(Number(value) || 0).toLocaleString();

    const updateXpBar = () => {
        if (currentLevel >= MAX_PLAYER_LEVEL) {
            xpText.innerText = `Lvl ${MAX_PLAYER_LEVEL} (MAX) - ${formatXp(displayXp)} Total XP`;
            xpBar.style.width = `100%`;
            xpBar.style.background = `linear-gradient(90deg, #f1c40f, #e67e22)`;
            return;
        }

        const progress = getLevelXpProgress(displayXp, currentLevel);
        xpText.innerText = `Lvl ${currentLevel}: ${formatXp(progress.progress)}/${formatXp(progress.needed)} (${formatXp(progress.total)} total)`;
        xpBar.style.width = `${Math.max(0, Math.min(100, progress.pct))}%`;
        xpBar.style.background = `linear-gradient(90deg, #27ae60, #2ecc71)`;
    };

    const advanceVisualLevel = () => {
        let leveled = false;
        while (currentLevel < MAX_PLAYER_LEVEL) {
            const nextLevelXp = calculateNextLevelXp(currentLevel);
            if (nextLevelXp === "MAX" || displayXp < nextLevelXp) break;
            currentLevel++;
            leveled = true;
            if (typeof playRetroSound === 'function') playRetroSound('statUp');
        }
        return leveled;
    };

    advanceVisualLevel();
    updateXpBar();

    if (targetXp > 0) {
        let ticks = 45; 
        let xpPerTick = targetXp / ticks;
        let tickCount = 0;

        let animInterval = setInterval(() => {
            tickCount++;
            displayXp = tickCount >= ticks ? targetTotalXp : Math.min(targetTotalXp, displayXp + xpPerTick);

            const leveled = advanceVisualLevel();
            if (!leveled && tickCount % 3 === 0) {
                if (typeof playRetroSound === 'function') playRetroSound('xpTick');
            }

            updateXpBar();

            if (tickCount >= ticks) clearInterval(animInterval);
        }, 30);
    }
}

function refreshLootUI() {
    const container = document.getElementById("loot-container");
    container.innerHTML = "";

    if (pendingLoot.length === 0) {
        container.innerHTML = "<div style='text-align:center; color:#776c62; font-size: 12px; margin-top: 30px;'>No items dropped during this deployment.</div>";
        return;
    }

    pendingLoot.forEach((item, idx) => {
        let rc = item.rarity === "Gorilla" ? "GorillaTier" : item.rarity;
        let imgUrl = typeof getItemSpriteURL === 'function' ? getItemSpriteURL(item) : "";
        let imgHtml = imgUrl ? `<img src="${imgUrl}" style="width:28px;height:28px;image-rendering:pixelated;margin-right:8px;vertical-align:middle;">` : ``;
        
        let sellValue = item.value || 5;

        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#221a14; padding:8px; border-radius:4px; border: 1px dashed #634e3d;">
                <div style="font-size: 12px;">
                    ${imgHtml}<span class="${rc}" style="cursor:help;" onmouseenter="showTooltip(getItemTooltip(pendingLoot[${idx}]), event)" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()">[${item.slot.toUpperCase()}] ${item.name}</span>
                </div>
                <div style="display:flex; gap: 6px;">
                    <button onclick="takeLoot(${idx})" style="background: #27ae60; padding: 4px 8px; font-size: 11px;">🎒 Take</button>
                    <button onclick="sellLoot(${idx}, ${sellValue})" style="background: #e67e22; padding: 4px 8px; font-size: 11px;">💰 Sell (${sellValue}g)</button>
                </div>
            </div>
        `;
    });
	if (typeof ClientDirector !== 'undefined') ClientDirector.applyLootScreenLocks();
}
function takeLoot(idx) {
    if (player.inventory.length >= (player.maxInventorySlots || 5)) {
        logMessage("❌ Backpack is full! Sell items or expand capacity.");
        if (typeof playRetroSound === 'function') playRetroSound('error');
        return;
    }
    // Ask the server to securely move the item from escrow to inventory
    socket.emit('takePendingLoot', idx);
}

function sellLoot(idx, value) {
    // Ask the server to securely sell the item from escrow
    socket.emit('sellPendingLoot', idx);
}

// === UPDATED: FINALIZE LOOTING ===
function finishLooting() {
    if (pendingLoot.length > 0) {
        let confirmLeave = confirm("You have items left behind. They will be discarded. Return to town anyway?");
        if (!confirmLeave) return;
    }
    
    // Ask server to finalize rewards, level ups, and unlocks!
    socket.emit('claimCombatRewards');

    pendingLoot = []; 
    document.getElementById("loot-screen").style.display = "none";
    // NOTE: We deleted transitionToTown() from here!
}

// === REPLACED ===
// === NEW: TRUE PATHFINDING MOVEMENT VALIDATOR (OPTIMIZED CACHE) ===
// A self-cleaning memory cache that prevents the browser from doing heavy math!
let moveCache = { uid: '', x: -1, y: -1, turn: '', speed: -1, buffs: '', tiles: new Set() };

function isValidPlayerMovePath(targetX, targetY) {
    const activeActor = getActiveCombatant();
    const activeUid = activeActor.uid || 'player_0';
    const activePos = getActiveCombatantPosition();
    let currentSpeed = getActiveCombatantMoveRange();
    let currentBuffs = ((activeActor && activeActor.activeBuffs) || (activeUid === 'player_0' ? player.activeBuffs : []) || []).join(',');
    
    if (moveCache.uid !== activeUid ||
        moveCache.x !== activePos.x || 
        moveCache.y !== activePos.y || 
        moveCache.turn !== currentTurn || 
        moveCache.speed !== currentSpeed ||
        moveCache.buffs !== currentBuffs) {
        
        moveCache.uid = activeUid;
        moveCache.x = activePos.x;
        moveCache.y = activePos.y;
        moveCache.turn = currentTurn;
        moveCache.speed = currentSpeed; 
        moveCache.buffs = currentBuffs;
        moveCache.tiles = new Set();
        
        let maxRange = currentSpeed; 
        let queue = [{ x: activePos.x, y: activePos.y, dist: 0 }];
        let visited = new Set([`${activePos.x},${activePos.y}`]);
        let dirs = [
            {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0},
            {x: -1, y: -1}, {x: 1, y: -1}, {x: 1, y: 1}, {x: -1, y: 1} 
        ];

        let cols = currentGridSize.cols || currentGridSize || 8;
        let rows = currentGridSize.rows || currentGridSize || 8;
        let blockedSet = new Set();

        mapObstacles.forEach(o => blockedSet.add(`${o.x},${o.y}`));
        enemies.forEach(e => {
            if (e.alive) {
                let s = e.size || 1;
                for (let bx = e.x; bx < e.x + s; bx++) {
                    for (let by = e.y; by < e.y + s; by++) blockedSet.add(`${bx},${by}`);
                }
            }
        });
        [...(allies || []), ...(rogues || [])].forEach(actor => {
            if (actor.uid === activeUid) return;
            if (actor.alive && actor.blocksMovement !== false) {
                let s = actor.size || 1;
                for (let bx = actor.x; bx < actor.x + s; bx++) {
                    for (let by = actor.y; by < actor.y + s; by++) blockedSet.add(`${bx},${by}`);
                }
            }
        });
        if (activeUid !== 'player_0') blockedSet.add(`${player.x},${player.y}`);

        while (queue.length > 0) {
            let curr = queue.shift();
            moveCache.tiles.add(`${curr.x},${curr.y}`);
            if (curr.dist >= maxRange) continue;

            for (let d of dirs) {
                let nx = curr.x + d.x; 
                let ny = curr.y + d.y;
                let key = `${nx},${ny}`;

                if (!visited.has(key) && nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    if (!blockedSet.has(key)) {
                        visited.add(key);
                        queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
                    }
                }
            }
        }
    }
    
    return moveCache.tiles.has(`${targetX},${targetY}`);
}
// === RESTORED TRANSITION FUNCTION ===
window.transitionToTown = function() {
    resetEquipmentAttackUiState();
    // Invalidate delayed combat callbacks before clearing animation state.
    // A cancelled presentation must not be able to restore combat controls
    // after the player has already returned to town.
    if (typeof setGameState === 'function') {
        const activeJourney = player
            && player.adventure
            && player.adventure.activeJourney;
        if (activeJourney) setGameState('ADVENTURES');
        else setGameState('KNIGHT');
    }
    if (typeof combatPlaybackGeneration !== 'undefined') {
        combatPlaybackGeneration += 1;
    }
    if (typeof combatAuthorityRevision !== 'undefined') {
        combatAuthorityRevision += 1;
    }
    if (typeof latestCombatTurnSequence !== 'undefined') {
        latestCombatTurnSequence = -1;
    }
    if (typeof cancelPendingCombatPlaybacks === 'function') {
        cancelPendingCombatPlaybacks();
    }
    if (typeof cancelPendingCombatSpriteActions === 'function') {
        cancelPendingCombatSpriteActions();
    }
    if (typeof CombatSpriteAnimation !== 'undefined') {
        CombatSpriteAnimation.clear();
    }
    
    // Failsafe cleanup of combat states
    if (typeof hideTooltip === 'function') hideTooltip();
    
    // Reset combat screen visibility elements
    const combatScreen = document.getElementById('combat-screen');
    if (combatScreen) combatScreen.style.display = 'none';
    
    const mainGameContainer = document.getElementById('main-game-container');
    if (mainGameContainer) mainGameContainer.style.display = 'flex';
    
    const activeJourney = player
        && player.adventure
        && player.adventure.activeJourney;
    logMessage(activeJourney
        ? "The party has reached a travel stop. Choose the next leg from the Adventure Board."
        : "Returned safely to the Knight screen.");
    if (typeof playRetroSound === 'function') playRetroSound('door');
}
