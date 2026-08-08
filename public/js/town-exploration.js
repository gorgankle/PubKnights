// --- WALKABLE PUB TOWN ---
// This scene is deliberately client-only: movement chooses which existing NPC
// UI to open, while every contract, purchase, and reward stays server-owned.

const TOWN_SCENE = Object.freeze({ columns: 30, rows: 18, tileSize: 24 });
const TOWN_INTERACTION_RANGE = 2;
const TOWN_NPC_PLACEMENTS = Object.freeze({
    kreg: Object.freeze({ x: 14, y: 3 }),
    elowen: Object.freeze({ x: 5, y: 7 }),
    mara: Object.freeze({ x: 25, y: 6 }),
    tilda: Object.freeze({ x: 8, y: 15 }),
    marlow: Object.freeze({ x: 22, y: 15 })
});

const TOWN_DESTINATION_PLACEMENTS = Object.freeze({
    roads: Object.freeze({
        id: 'roads',
        name: 'Roads',
        description: 'Review routes and set out on an expedition.',
        x: 15,
        y: 17,
        hitX: 15,
        hitY: 15.5,
        state: 'ADVENTURES'
    }),
    vault: Object.freeze({
        id: 'vault',
        name: 'Vault',
        description: 'Store equipment and manage the town vault.',
        x: 29,
        y: 8,
        hitX: 27,
        hitY: 8,
        state: 'VAULT'
    }),
    community: Object.freeze({
        id: 'community',
        name: 'Community',
        description: 'Meet other knights in the community square.',
        x: 0,
        y: 8,
        hitX: 2,
        hitY: 8,
        state: 'COMMUNITY'
    })
});

const TOWN_STATIC_NPCS = Object.freeze({
    kreg: Object.freeze({ id: 'kreg', name: 'Kreg', role: 'Innkeeper and contract keeper' }),
    elowen: Object.freeze({ id: 'elowen', name: 'Elowen', role: 'Trail warden and field observer' }),
    mara: Object.freeze({ id: 'mara', name: 'Mara', role: 'Quartermaster' }),
    tilda: Object.freeze({ id: 'tilda', name: 'Tilda', role: 'Hedge scholar and wardwright' }),
    marlow: Object.freeze({ id: 'marlow', name: 'Marlow', role: 'Retired road sergeant' })
});

let townPlayerPosition = { x: 15, y: 8 };
let townSelectedNpcId = null;
let townSelectedDestinationId = null;
let townPathTimer = null;
let townPendingArrival = null;
let townOpenShopNpcId = null;
let townShopPreviousFocus = null;
let townAwaitingNpcReceiptId = null;
let townPointerGesture = null;

function asTownList(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
}

function escapeTownHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getTownWorldSnapshot() {
    if (typeof getChapterOneWorldView === 'function') {
        return getChapterOneWorldView() || {};
    }
    return {};
}

function getTownNpcRecords() {
    const byId = new Map(
        asTownList(getTownWorldSnapshot().npcs)
            .filter(Boolean)
            .map(npc => [npc.id, npc])
    );
    return Object.keys(TOWN_NPC_PLACEMENTS).map(npcId => ({
        ...TOWN_STATIC_NPCS[npcId],
        ...(byId.get(npcId) || {}),
        ...TOWN_NPC_PLACEMENTS[npcId]
    }));
}

function getTownDestinationRecords() {
    return Object.values(TOWN_DESTINATION_PLACEMENTS).map(destination => ({ ...destination }));
}

function getTownBlockedTileSet() {
    const blocked = new Set();
    const block = (x, y) => blocked.add(`${x},${y}`);
    for (let x = 0; x < TOWN_SCENE.columns; x += 1) {
        block(x, 0);
        block(x, TOWN_SCENE.rows - 1);
    }
    for (let y = 0; y < TOWN_SCENE.rows; y += 1) {
        block(0, y);
        block(TOWN_SCENE.columns - 1, y);
    }
    // Bar, tables, quartermaster counter, hearth, and stacked casks.
    for (let x = 8; x <= 20; x += 1) block(x, 4);
    [[3, 11, 3, 2], [12, 10, 3, 2], [20, 9, 3, 2], [24, 4, 4, 1], [26, 12, 2, 3], [2, 2, 2, 2]]
        .forEach(([startX, startY, width, height]) => {
            for (let y = startY; y < startY + height; y += 1) {
                for (let x = startX; x < startX + width; x += 1) block(x, y);
            }
        });
    getTownNpcRecords().forEach(npc => block(npc.x, npc.y));
    getTownDestinationRecords().forEach(destination => block(destination.x, destination.y));
    return blocked;
}

function isTownTileWalkable(x, y, blocked = getTownBlockedTileSet()) {
    return Number.isInteger(x)
        && Number.isInteger(y)
        && x > 0
        && y > 0
        && x < TOWN_SCENE.columns - 1
        && y < TOWN_SCENE.rows - 1
        && !blocked.has(`${x},${y}`);
}

function findTownPath(start, target, blocked = getTownBlockedTileSet()) {
    if (!start || !target || !isTownTileWalkable(target.x, target.y, blocked)) return [];
    const startKey = `${start.x},${start.y}`;
    const targetKey = `${target.x},${target.y}`;
    if (startKey === targetKey) return [];
    const queue = [{ x: start.x, y: start.y }];
    const previous = new Map([[startKey, null]]);
    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    while (queue.length) {
        const current = queue.shift();
        for (const [dx, dy] of directions) {
            const next = { x: current.x + dx, y: current.y + dy };
            const nextKey = `${next.x},${next.y}`;
            if (previous.has(nextKey) || !isTownTileWalkable(next.x, next.y, blocked)) continue;
            previous.set(nextKey, `${current.x},${current.y}`);
            if (nextKey === targetKey) {
                const path = [next];
                let cursorKey = previous.get(nextKey);
                while (cursorKey && cursorKey !== startKey) {
                    const [x, y] = cursorKey.split(',').map(Number);
                    path.unshift({ x, y });
                    cursorKey = previous.get(cursorKey);
                }
                return path;
            }
            queue.push(next);
        }
    }
    return [];
}

function getTownInteractionDistance(target, position = townPlayerPosition) {
    return target ? Math.abs(target.x - position.x) + Math.abs(target.y - position.y) : Infinity;
}

function getTownNpcDistance(npc, position = townPlayerPosition) {
    return getTownInteractionDistance(npc, position);
}

function getTownApproachPath(target) {
    if (!target) return [];
    const blocked = getTownBlockedTileSet();
    const targets = [];
    for (let y = target.y - TOWN_INTERACTION_RANGE; y <= target.y + TOWN_INTERACTION_RANGE; y += 1) {
        for (let x = target.x - TOWN_INTERACTION_RANGE; x <= target.x + TOWN_INTERACTION_RANGE; x += 1) {
            const distance = Math.abs(target.x - x) + Math.abs(target.y - y);
            if (distance > TOWN_INTERACTION_RANGE || !isTownTileWalkable(x, y, blocked)) continue;
            const path = findTownPath(townPlayerPosition, { x, y }, blocked);
            if (path.length || (x === townPlayerPosition.x && y === townPlayerPosition.y)) {
                targets.push({ path, distance: path.length, x, y });
            }
        }
    }
    targets.sort((left, right) => left.distance - right.distance || left.y - right.y || left.x - right.x);
    return targets.length ? targets[0].path : [];
}

function getTownNpcApproachPath(npc) {
    return getTownApproachPath(npc);
}

function stopTownWalking() {
    if (townPathTimer && typeof clearTimeout === 'function') clearTimeout(townPathTimer);
    townPathTimer = null;
}

function updateTownStatus(message) {
    if (typeof document === 'undefined') return;
    const status = document.getElementById('town-scene-status');
    if (status) status.textContent = message;
}

function activateTownDestination(destinationId) {
    const destination = getTownDestinationRecords()
        .find(candidate => candidate.id === destinationId);
    if (!destination) return;
    if (getTownInteractionDistance(destination) > TOWN_INTERACTION_RANGE) {
        walkToTownDestination(destinationId);
        return;
    }
    townSelectedDestinationId = destinationId;
    updateTownStatus(`Entering ${destination.name}.`);
    if (typeof setGameState === 'function') setGameState(destination.state);
}

function dispatchTownArrival(arrival) {
    if (!arrival || !arrival.id) return;
    if (arrival.kind === 'destination') activateTownDestination(arrival.id);
    else if (arrival.kind === 'npc') openTownNpcDialogue(arrival.id);
}

function startTownPath(path, arrival = null) {
    stopTownWalking();
    townPendingArrival = arrival;
    const remaining = Array.isArray(path) ? [...path] : [];
    if (!remaining.length) {
        const immediateArrival = townPendingArrival;
        townPendingArrival = null;
        dispatchTownArrival(immediateArrival);
        return;
    }
    const step = () => {
        const next = remaining.shift();
        if (!next) {
            townPathTimer = null;
            const arrivalTarget = townPendingArrival;
            townPendingArrival = null;
            dispatchTownArrival(arrivalTarget);
            return;
        }
        townPlayerPosition = { x: next.x, y: next.y };
        renderWalkableTown();
        townPathTimer = setTimeout(step, 68);
    };
    step();
}

function walkToTownNpc(npcId) {
    const npc = getTownNpcRecords().find(candidate => candidate.id === npcId);
    if (!npc) return;
    stopTownWalking();
    townPendingArrival = null;
    townSelectedDestinationId = null;
    townSelectedNpcId = npcId;
    if (typeof closeDialogueOverlay === 'function') closeDialogueOverlay(false);
    closeTownShop(false);
    const path = getTownNpcApproachPath(npc);
    updateTownStatus(`Walking to ${npc.name}.`);
    if (!path.length && getTownNpcDistance(npc) > TOWN_INTERACTION_RANGE) {
        updateTownStatus(`There is no clear path to ${npc.name}.`);
        return;
    }
    startTownPath(path, { kind: 'npc', id: npcId });
}

function walkToTownDestination(destinationId) {
    const destination = getTownDestinationRecords()
        .find(candidate => candidate.id === destinationId);
    if (!destination) return;
    stopTownWalking();
    townPendingArrival = null;
    townSelectedNpcId = null;
    townSelectedDestinationId = destinationId;
    if (typeof closeDialogueOverlay === 'function') closeDialogueOverlay(false);
    closeTownShop(false);
    const path = getTownApproachPath(destination);
    updateTownStatus(`Walking to ${destination.name}.`);
    if (!path.length && getTownInteractionDistance(destination) > TOWN_INTERACTION_RANGE) {
        updateTownStatus(`There is no clear path to ${destination.name}.`);
        renderWalkableTown();
        return;
    }
    renderWalkableTown();
    startTownPath(path, { kind: 'destination', id: destinationId });
}

function getTownContractStatus(contract) {
    return typeof getContractStatus === 'function'
        ? getContractStatus(contract)
        : String(contract && contract.status || 'available').toLowerCase();
}

function getTownNpcContracts(npcId) {
    const snapshotContracts = typeof adventureViewSnapshot !== 'undefined' && adventureViewSnapshot
        ? asTownList(adventureViewSnapshot.contracts)
        : asTownList(getTownWorldSnapshot().contracts);
    return snapshotContracts.filter(contract => contract && contract.issuerNpcId === npcId);
}

function getTownNpcMarker(npcId) {
    const contracts = getTownNpcContracts(npcId);
    if (contracts.some(contract => getTownContractStatus(contract) === 'claimable')) return { symbol: '!', tone: '#78e690' };
    if (contracts.some(contract => getTownContractStatus(contract) === 'available')) return { symbol: '!', tone: '#f5d267' };
    if (contracts.some(contract => getTownContractStatus(contract) === 'active')) return { symbol: '?', tone: '#75c7f0' };
    return null;
}

function drawTownRect(context, x, y, width, height, fill, border) {
    context.fillStyle = fill;
    context.fillRect(
        x * TOWN_SCENE.tileSize,
        y * TOWN_SCENE.tileSize,
        width * TOWN_SCENE.tileSize,
        height * TOWN_SCENE.tileSize
    );
    if (border) {
        context.strokeStyle = border;
        context.lineWidth = 2;
        context.strokeRect(
            x * TOWN_SCENE.tileSize + 1,
            y * TOWN_SCENE.tileSize + 1,
            width * TOWN_SCENE.tileSize - 2,
            height * TOWN_SCENE.tileSize - 2
        );
    }
}

function drawTownSceneBackground(context, canvas) {
    context.fillStyle = '#211813';
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 1; y < TOWN_SCENE.rows - 1; y += 1) {
        for (let x = 1; x < TOWN_SCENE.columns - 1; x += 1) {
            context.fillStyle = (x + y) % 2 ? '#38291e' : '#3d2d21';
            context.fillRect(x * 24, y * 24, 24, 24);
            context.fillStyle = 'rgba(255, 216, 148, 0.025)';
            context.fillRect(x * 24 + 2, y * 24 + 2, 20, 1);
        }
    }
    drawTownRect(context, 0, 0, 30, 1, '#1a120e', '#6a4a32');
    drawTownRect(context, 0, 17, 13, 1, '#1a120e', '#6a4a32');
    drawTownRect(context, 17, 17, 13, 1, '#1a120e', '#6a4a32');
    drawTownRect(context, 0, 0, 1, 18, '#1a120e', '#6a4a32');
    drawTownRect(context, 29, 0, 1, 18, '#1a120e', '#6a4a32');
    drawTownRect(context, 8, 4, 13, 1, '#6b3f22', '#b47a3e');
    drawTownRect(context, 3, 11, 3, 2, '#4a2c1d', '#865c37');
    drawTownRect(context, 12, 10, 3, 2, '#4a2c1d', '#865c37');
    drawTownRect(context, 20, 9, 3, 2, '#4a2c1d', '#865c37');
    drawTownRect(context, 24, 4, 4, 1, '#554334', '#9f7a4c');
    drawTownRect(context, 26, 12, 2, 3, '#281712', '#9a4d2b');
    drawTownRect(context, 2, 2, 2, 2, '#4b2b18', '#8e6438');
    context.fillStyle = '#e98234';
    context.fillRect(26 * 24 + 13, 12 * 24 + 20, 20, 42);
    context.fillStyle = '#ffd06a';
    context.fillRect(26 * 24 + 18, 12 * 24 + 28, 10, 28);
    context.fillStyle = '#7b2630';
    context.fillRect(10 * 24, 13 * 24, 9 * 24, 3 * 24);
    context.strokeStyle = '#b56d42';
    context.lineWidth = 2;
    context.strokeRect(10 * 24, 13 * 24, 9 * 24, 3 * 24);
    context.fillStyle = '#d8b56f';
    context.font = 'bold 9px monospace';
    context.textAlign = 'center';
    context.fillText('THE WAYWARD TANKARD', canvas.width / 2, 18);
}

function drawTownDestination(context, destination) {
    if (!destination) return;
    const tile = TOWN_SCENE.tileSize;
    const centerX = destination.x * tile + tile / 2;
    const centerY = destination.y * tile + tile / 2;
    context.save();
    context.lineWidth = 2;
    context.font = 'bold 9px monospace';
    context.textAlign = 'center';
    if (destination.id === 'roads') {
        context.fillStyle = '#213847';
        context.strokeStyle = '#76a9c9';
        context.fillRect(centerX - 45, centerY - 29, 90, 27);
        context.strokeRect(centerX - 45, centerY - 29, 90, 27);
        context.fillStyle = '#d7edf6';
        context.fillText('ROADS', centerX, centerY - 11);
    } else if (destination.id === 'vault') {
        context.fillStyle = '#3f3824';
        context.strokeStyle = '#d2b85f';
        context.fillRect(TOWN_SCENE.columns * tile - 23, centerY - 31, 22, 62);
        context.strokeRect(TOWN_SCENE.columns * tile - 23, centerY - 31, 22, 62);
        context.fillStyle = '#f0d98b';
        context.fillText('VAULT', centerX - 52, centerY + 3);
    } else {
        context.fillStyle = '#283a31';
        context.strokeStyle = '#75c998';
        context.fillRect(1, centerY - 31, 22, 62);
        context.strokeRect(1, centerY - 31, 22, 62);
        context.fillStyle = '#b9efd0';
        context.fillText('COMMUNITY', centerX + 58, centerY + 3);
    }
    context.restore();
}

function drawTownActor(context, actor, x, y, label, marker) {
    const size = TOWN_SCENE.tileSize * 1.35;
    const drawX = x * TOWN_SCENE.tileSize - (size - TOWN_SCENE.tileSize) / 2;
    const drawY = y * TOWN_SCENE.tileSize - (size - TOWN_SCENE.tileSize);
    let renderer = null;
    if (typeof drawWorldActorSprite === 'function') {
        renderer = drawWorldActorSprite(context, actor, drawX, drawY, size);
    }
    if (!renderer) {
        context.fillStyle = actor && actor.kind === 'player' ? '#f1c40f' : '#79aeb8';
        context.fillRect(x * 24 + 6, y * 24 + 3, 12, 18);
        context.fillStyle = '#e3bd95';
        context.fillRect(x * 24 + 8, y * 24, 8, 8);
    }
    context.font = 'bold 9px monospace';
    context.textAlign = 'center';
    context.fillStyle = actor && actor.kind === 'player' ? '#fff1a8' : '#f4eadb';
    context.fillText(label, x * 24 + 12, y * 24 - 9);
    if (marker) {
        context.fillStyle = '#16110d';
        context.fillRect(x * 24 + 8, y * 24 - 29, 9, 12);
        context.fillStyle = marker.tone;
        context.font = 'bold 13px monospace';
        context.fillText(marker.symbol, x * 24 + 12, y * 24 - 19);
    }
}

function renderTownQuickNpcButtons(npcs) {
    if (typeof document === 'undefined') return;
    const list = document.getElementById('town-nearby-npcs');
    if (!list) return;
    const previouslyFocused = document.activeElement;
    const focusedNpcId = previouslyFocused && list.contains(previouslyFocused)
        ? previouslyFocused.getAttribute('data-town-npc-id')
        : null;
    list.innerHTML = npcs.map(npc => {
        const marker = getTownNpcMarker(npc.id);
        return `<button type="button" data-town-npc-id="${escapeTownHtml(npc.id)}"${townSelectedNpcId === npc.id ? ' class="is-selected"' : ''}>${marker ? `<span aria-hidden="true">${marker.symbol}</span> ` : ''}${escapeTownHtml(npc.name)}</button>`;
    }).join('');
    list.querySelectorAll('[data-town-npc-id]').forEach(button => {
        button.onclick = () => walkToTownNpc(button.getAttribute('data-town-npc-id'));
    });
    if (focusedNpcId) {
        const replacement = Array.from(list.querySelectorAll('[data-town-npc-id]'))
            .find(button => button.getAttribute('data-town-npc-id') === focusedNpcId);
        if (replacement && typeof replacement.focus === 'function') {
            replacement.focus({ preventScroll: true });
        }
    }
}

function renderTownDestinationShortcuts(destinations) {
    if (typeof document === 'undefined') return;
    const list = document.getElementById('town-destination-shortcuts');
    if (!list) return;
    const previouslyFocused = document.activeElement;
    const focusedDestinationId = previouslyFocused && list.contains(previouslyFocused)
        ? previouslyFocused.getAttribute('data-town-destination-id')
        : null;
    list.innerHTML = destinations.map(destination => (
        `<button type="button" data-town-destination-id="${escapeTownHtml(destination.id)}"${townSelectedDestinationId === destination.id ? ' class="is-selected"' : ''} aria-label="${escapeTownHtml(`${destination.name}: ${destination.description}`)}">${escapeTownHtml(destination.name)}</button>`
    )).join('');
    list.querySelectorAll('[data-town-destination-id]').forEach(button => {
        button.onclick = () => walkToTownDestination(
            button.getAttribute('data-town-destination-id')
        );
    });
    if (focusedDestinationId) {
        const replacement = Array.from(list.querySelectorAll('[data-town-destination-id]'))
            .find(button => button.getAttribute('data-town-destination-id') === focusedDestinationId);
        if (replacement && typeof replacement.focus === 'function') {
            replacement.focus({ preventScroll: true });
        }
    }
}

function renderWalkableTown() {
    if (typeof document === 'undefined') return;
    const canvas = document.getElementById('town-exploration-canvas');
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.imageSmoothingEnabled = false;
    drawTownSceneBackground(context, canvas);
    const destinations = getTownDestinationRecords();
    destinations.forEach(destination => drawTownDestination(context, destination));
    const npcs = getTownNpcRecords();
    const actors = npcs.map(npc => ({
        x: npc.x,
        y: npc.y,
        label: npc.name,
        marker: getTownNpcMarker(npc.id),
        actor: { id: npc.id, kind: 'npc', name: npc.name, visualProfileId: `npc_${npc.id}` }
    }));
    const playerActor = typeof player !== 'undefined' && player
        ? { ...player, kind: 'player', uid: player.uid || 'player_0' }
        : {
            kind: 'player',
            uid: 'player_0',
            name: 'Knight',
            appearance: {},
            equipment: {}
        };
    actors.push({
        x: townPlayerPosition.x,
        y: townPlayerPosition.y,
        label: playerActor.username || playerActor.name || 'Knight',
        marker: null,
        actor: playerActor
    });
    actors.sort((left, right) => left.y - right.y || left.x - right.x);
    actors.forEach(entry => drawTownActor(
        context,
        entry.actor,
        entry.x,
        entry.y,
        entry.label,
        entry.marker
    ));
    renderTownQuickNpcButtons(npcs);
    renderTownDestinationShortcuts(destinations);
    if (townOpenShopNpcId) renderOpenTownShop();
}

function getTownNpcServices(npcId) {
    const world = getTownWorldSnapshot();
    return asTownList(world.town && world.town.services)
        .filter(service => service && service.providerNpcId === npcId);
}

function getTownShopEntries(npcId) {
    if (npcId === 'kreg') {
        return [
            { id: 'STOUT', name: 'Craft Stout', price: 25, description: 'The house staple.' },
            { id: 'IPA', name: 'Furious IPA', price: 75, description: 'A strong offensive brew.' },
            { id: 'LAGER', name: 'Swift Lager', price: 75, description: 'A light brew for quick feet.' },
            { id: 'IRONWALL', name: 'Ironwall Porter', price: 150, description: 'A dark defensive porter.' },
            { id: 'CLEARWATER', name: 'Clearwater Tonic', price: 150, description: 'A restorative tavern tonic.' },
            { id: 'STAUNCH', name: 'Staunching Bitter', price: 250, description: 'A bitter brewed for hard roads.' },
            { id: 'RESERVE', name: 'Grandmaster Reserve', price: 1000, description: 'Kreg’s rarest cellar bottle.' }
        ].map(entry => ({
            ...entry,
            purchase() {
                if (entry.id === 'STOUT' && typeof hireBrewmasterServices === 'function') hireBrewmasterServices();
                else if (entry.id === 'RESERVE' && typeof craftReserveBrew === 'function') craftReserveBrew();
                else if (typeof craftSpecialtyBrew === 'function') craftSpecialtyBrew(entry.id);
            }
        }));
    }
    if (npcId !== 'mara') return [];
    const world = getTownWorldSnapshot();
    return asTownList(world.town && (world.town.stock || world.town.shopStock)).map(entry => ({
        id: entry.stockId || entry.id,
        name: entry.name || entry.itemName || entry.stockId || entry.id,
        price: Math.max(0, Number(entry.priceGold || entry.price) || 0),
        description: entry.description || entry.summary || 'Reliable road equipment.',
        purchase() {
            if (typeof purchaseChapterOneStock === 'function') {
                purchaseChapterOneStock(entry.stockId || entry.id);
            }
        }
    }));
}

function leaveTownNpcConversation() {
    townSelectedNpcId = null;
    townAwaitingNpcReceiptId = null;
    if (typeof closeDialogueOverlay === 'function') closeDialogueOverlay(false);
    updateTownStatus('Tap the floor to walk, or tap a townsfolk to approach them.');
    renderWalkableTown();
    const canvas = typeof document !== 'undefined'
        ? document.getElementById('town-exploration-canvas')
        : null;
    if (canvas && typeof canvas.focus === 'function') canvas.focus({ preventScroll: true });
}

function showTownNpcConversation(npcId) {
    const npc = getTownNpcRecords().find(candidate => candidate.id === npcId);
    if (!npc || typeof playDialogueSequence !== 'function') return;
    const reaction = npc.reaction || npc.returnReaction || `${npc.name} listens for news from the road.`;
    playDialogueSequence([
        {
            speaker: npc.name,
            portraitId: `npc_${npc.id}`,
            text: reaction
        },
        {
            speaker: npc.name,
            portraitId: `npc_${npc.id}`,
            text: npc.stageName || npc.stageId || 'The pub has a way of changing whenever the party returns.'
        }
    ], () => showTownNpcMainMenu(npcId), { onCancel: leaveTownNpcConversation });
}

function showTownNpcServices(npcId) {
    const npc = getTownNpcRecords().find(candidate => candidate.id === npcId);
    if (!npc || typeof playDialogueMenu !== 'function') return;
    const services = getTownNpcServices(npcId);
    const choices = [];
    if (npcId === 'mara') {
        const rewardChoice = asTownList(getTownWorldSnapshot().rewardChoices)
            .find(choice => choice && choice.id === 'first_return_kit');
        if (rewardChoice && String(rewardChoice.status || '').toLowerCase() === 'available') {
            asTownList(rewardChoice.options).forEach(option => {
                choices.push({
                    id: `reward-${option.id}`,
                    label: `Choose ${option.name || option.id}`,
                    description: option.summary || rewardChoice.description || 'Take one tool for the roads ahead.',
                    tone: 'turn-in',
                    onSelect: () => {
                        townAwaitingNpcReceiptId = npcId;
                        if (typeof claimAdventureWorldRewardChoice === 'function') {
                            claimAdventureWorldRewardChoice(rewardChoice.id, option.id);
                        }
                    }
                });
            });
        }
    }
    services.forEach(service => {
        const recruitNpcId = service.recruitNpcId
            || (service.id === 'marlow_recruitment' || service.id === 'marlow_party_service' ? 'marlow' : null);
        if (recruitNpcId && service.claimed !== true) {
            choices.push({
                id: `recruit-${recruitNpcId}`,
                label: service.actionLabel || `Invite ${npc.name} to the party`,
                description: service.description,
                tone: 'quest',
                onSelect: () => {
                    townAwaitingNpcReceiptId = npcId;
                    if (typeof recruitChapterOneNpc === 'function') recruitChapterOneNpc(recruitNpcId);
                }
            });
        } else if (service.actionId && service.actionId !== 'review_watchhouse_preparations') {
            choices.push({
                id: service.actionId,
                label: service.actionLabel || service.name || 'Review service',
                description: service.description,
                onSelect: () => {
                    if (typeof openChapterOneTownService === 'function') {
                        openChapterOneTownService(service.actionId);
                    }
                }
            });
        }
    });
    const chapter = getTownWorldSnapshot().chapter || {};
    const preparationOptions = asTownList(chapter.finale && chapter.finale.preparationOptions);
    if (['kreg', 'tilda', 'marlow'].includes(npcId)) {
        preparationOptions.filter(option => !option.selected).forEach(option => {
            choices.push({
                id: `preparation-${option.id}`,
                label: `Plan: ${option.name || option.id}`,
                description: option.description || 'Choose this watchhouse approach.',
                disabled: !option.ready || option.selectable === false,
                tone: option.ready ? 'quest' : '',
                onSelect: () => {
                    townAwaitingNpcReceiptId = npcId;
                    if (typeof selectChapterOneFinalePreparation === 'function') {
                        selectChapterOneFinalePreparation(option.id);
                    }
                }
            });
        });
    }
    if (!choices.length) {
        choices.push({
            id: 'nothing-new',
            label: 'Nothing new right now',
            description: 'Return after the town or road changes.',
            disabled: true
        });
    }
    choices.push({ id: 'back', label: 'Back', onSelect: () => showTownNpcMainMenu(npcId) });
    choices.push({ id: 'leave', label: 'Leave', onSelect: leaveTownNpcConversation });
    playDialogueMenu({
        speaker: npc.name,
        portraitId: `npc_${npc.id}`,
        text: 'What do you need help with?'
    }, choices, leaveTownNpcConversation);
}

function showTownNpcMainMenu(npcId) {
    const npc = getTownNpcRecords().find(candidate => candidate.id === npcId);
    if (!npc || typeof playDialogueMenu !== 'function') return;
    const choices = [];
    getTownNpcContracts(npcId).forEach(contract => {
        const status = getTownContractStatus(contract);
        const title = contract.title || contract.id || 'Quest';
        if (status === 'available') {
            choices.push({
                id: `accept-${contract.id}`,
                label: `Accept quest: ${title}`,
                description: contract.description || 'Hear the task and add it to the journey log.',
                tone: 'quest',
                onSelect: () => {
                    townAwaitingNpcReceiptId = npcId;
                    if (typeof acceptAdventureContract === 'function') acceptAdventureContract(contract.id);
                }
            });
        } else if (status === 'claimable') {
            choices.push({
                id: `claim-${contract.id}`,
                label: `Turn in quest: ${title}`,
                description: `${Math.max(0, Number(contract.rewardGold) || 0)}g contract pay`,
                tone: 'turn-in',
                onSelect: () => {
                    townAwaitingNpcReceiptId = npcId;
                    if (typeof claimAdventureContract === 'function') claimAdventureContract(contract.id);
                }
            });
        } else if (status === 'active') {
            const objectives = typeof getContractObjectivePresentation === 'function'
                ? getContractObjectivePresentation(contract)
                : [];
            const next = objectives.find(objective => !objective.complete);
            choices.push({
                id: `active-${contract.id}`,
                label: `Quest underway: ${title}`,
                description: next ? `Next: ${next.description}` : 'Continue this quest on the road.',
                disabled: true
            });
        }
    });
    choices.push({
        id: 'talk',
        label: 'Talk',
        description: 'Ask what has changed around town.',
        onSelect: () => showTownNpcConversation(npcId)
    });
    if (getTownNpcServices(npcId).length || ['kreg', 'tilda', 'marlow'].includes(npcId)) {
        choices.push({
            id: 'services',
            label: 'Services',
            description: 'Review preparations and personal services.',
            onSelect: () => showTownNpcServices(npcId)
        });
    }
    if (getTownShopEntries(npcId).length) {
        choices.push({
            id: 'shop',
            label: 'Shop',
            description: npcId === 'kreg' ? 'Browse Kreg’s brews.' : 'Browse Mara’s road supplies.',
            onSelect: () => openTownShop(npcId)
        });
    }
    choices.push({ id: 'leave', label: 'Leave', onSelect: leaveTownNpcConversation });
    playDialogueMenu({
        speaker: npc.name,
        portraitId: `npc_${npc.id}`,
        text: npc.returnReaction || npc.reaction || `Good to see you. What brings you over?`
    }, choices, leaveTownNpcConversation);
}

function renderOpenTownShop() {
    if (typeof document === 'undefined' || !townOpenShopNpcId) return;
    const overlay = document.getElementById('town-shop-overlay');
    const list = document.getElementById('town-shop-list');
    const title = document.getElementById('town-shop-title');
    const gold = document.getElementById('town-shop-gold');
    const npc = getTownNpcRecords().find(candidate => candidate.id === townOpenShopNpcId);
    if (!overlay || !list || !npc) return;
    const previouslyFocused = document.activeElement;
    const hadListFocus = !!(previouslyFocused && list.contains(previouslyFocused));
    const focusedEntryId = hadListFocus
        ? previouslyFocused.getAttribute('data-town-shop-id')
        : null;
    if (title) title.textContent = townOpenShopNpcId === 'kreg' ? 'Kreg’s Cellar' : 'Mara’s Road Stock';
    if (gold) gold.textContent = `${Math.max(0, Number(typeof player !== 'undefined' && player && player.gold) || 0)}g`;
    const entries = getTownShopEntries(townOpenShopNpcId);
    list.innerHTML = entries.length ? entries.map((entry, index) => `
        <button type="button" class="town-shop-item" data-town-shop-index="${index}" data-town-shop-id="${escapeTownHtml(entry.id)}">
            <span class="town-shop-item-icon" aria-hidden="true">${townOpenShopNpcId === 'kreg' ? 'B' : 'G'}</span>
            <span class="town-shop-item-copy"><strong>${escapeTownHtml(entry.name)}</strong><small>${escapeTownHtml(entry.description)}</small></span>
            <span class="town-shop-item-price">${entry.price}g</span>
        </button>`).join('') : '<p class="adventure-muted">Nothing is in stock yet.</p>';
    list.querySelectorAll('[data-town-shop-index]').forEach(button => {
        button.onclick = event => {
            event.stopPropagation();
            const entry = entries[Number(button.getAttribute('data-town-shop-index'))];
            if (entry && typeof entry.purchase === 'function') entry.purchase();
        };
    });
    overlay.hidden = false;
    if (hadListFocus) {
        const matchingEntry = Array.from(list.querySelectorAll('[data-town-shop-id]'))
            .find(button => button.getAttribute('data-town-shop-id') === focusedEntryId);
        const fallback = list.querySelector('button') || document.getElementById('town-shop-close');
        const focusTarget = matchingEntry || fallback;
        if (focusTarget && typeof focusTarget.focus === 'function') {
            focusTarget.focus({ preventScroll: true });
        }
    }
}

function resumeTownNpcConversationAfterReceipt() {
    const npcId = townAwaitingNpcReceiptId;
    if (!npcId) return false;
    townAwaitingNpcReceiptId = null;
    if (
        typeof gameState === 'undefined'
        || gameState !== 'TOWN'
        || townSelectedNpcId !== npcId
        || townOpenShopNpcId
    ) return false;
    const npc = getTownNpcRecords().find(candidate => candidate.id === npcId);
    if (!npc || getTownNpcDistance(npc) > TOWN_INTERACTION_RANGE) return false;
    setTimeout(() => showTownNpcMainMenu(npcId), 0);
    return true;
}

function openTownShop(npcId) {
    townOpenShopNpcId = npcId;
    if (typeof document !== 'undefined') townShopPreviousFocus = document.activeElement;
    if (typeof closeDialogueOverlay === 'function') closeDialogueOverlay(false);
    renderOpenTownShop();
    const overlay = typeof document !== 'undefined'
        ? document.getElementById('town-shop-overlay')
        : null;
    if (overlay) overlay.addEventListener('keydown', handleTownShopKeydown);
    const firstItem = typeof document !== 'undefined'
        ? document.querySelector('#town-shop-list button, #town-shop-close')
        : null;
    if (firstItem && typeof firstItem.focus === 'function') firstItem.focus({ preventScroll: true });
}

function closeTownShop(reopenDialogue = true) {
    if (typeof document === 'undefined') return;
    const npcId = townOpenShopNpcId;
    townOpenShopNpcId = null;
    const overlay = document.getElementById('town-shop-overlay');
    if (overlay) {
        overlay.hidden = true;
        overlay.removeEventListener('keydown', handleTownShopKeydown);
    }
    if (reopenDialogue && npcId) showTownNpcMainMenu(npcId);
    else if (townShopPreviousFocus && typeof townShopPreviousFocus.focus === 'function') {
        townShopPreviousFocus.focus({ preventScroll: true });
    }
    townShopPreviousFocus = null;
}

function handleTownShopKeydown(event) {
    const overlay = document.getElementById('town-shop-overlay');
    if (!overlay || overlay.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeTownShop(true);
        return;
    }
    const focusables = Array.from(overlay.querySelectorAll('button:not(:disabled)'));
    if (!focusables.length || event.key !== 'Tab') return;
    const activeIndex = focusables.indexOf(document.activeElement);
    if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault();
        focusables[focusables.length - 1].focus({ preventScroll: true });
    } else if (!event.shiftKey && activeIndex === focusables.length - 1) {
        event.preventDefault();
        focusables[0].focus({ preventScroll: true });
    }
}

function openTownNpcDialogue(npcId) {
    if (typeof document === 'undefined') return;
    const npc = getTownNpcRecords().find(candidate => candidate.id === npcId);
    if (!npc) return;
    if (getTownNpcDistance(npc) > TOWN_INTERACTION_RANGE) {
        walkToTownNpc(npcId);
        return;
    }
    townSelectedNpcId = npcId;
    townSelectedDestinationId = null;
    townPendingArrival = null;
    updateTownStatus(`Talking to ${npc.name}. Choose a response in the dialogue box.`);
    renderWalkableTown();
    showTownNpcMainMenu(npcId);
}

function closeTownNpcDialogue() {
    if (typeof document === 'undefined') return;
    stopTownWalking();
    townPendingArrival = null;
    closeTownShop(false);
    leaveTownNpcConversation();
}

function moveTownPlayerBy(dx, dy) {
    const target = { x: townPlayerPosition.x + dx, y: townPlayerPosition.y + dy };
    if (!isTownTileWalkable(target.x, target.y)) return;
    startTownPath([target]);
}

function activateNearestTownNpc() {
    const nearest = getTownNpcRecords()
        .map(npc => ({ npc, distance: getTownNpcDistance(npc) }))
        .sort((left, right) => left.distance - right.distance)[0];
    if (nearest && nearest.distance <= TOWN_INTERACTION_RANGE) openTownNpcDialogue(nearest.npc.id);
}

function handleTownCanvasPointer(event) {
    const canvas = event.currentTarget;
    if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return;
    if (event.isPrimary === false || (Number.isFinite(event.button) && event.button !== 0)) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0) || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    stopTownWalking();
    townPendingArrival = null;
    const logicalX = (event.clientX - rect.left) * canvas.width / rect.width;
    const logicalY = (event.clientY - rect.top) * canvas.height / rect.height;
    const x = Math.floor(logicalX / TOWN_SCENE.tileSize);
    const y = Math.floor(logicalY / TOWN_SCENE.tileSize);
    const minimumHitRadius = Math.max(24, 22 * canvas.width / rect.width);
    const destination = getTownDestinationRecords()
        .map(candidate => ({
            candidate,
            distance: Math.hypot(
                logicalX - ((candidate.hitX ?? candidate.x) * TOWN_SCENE.tileSize + TOWN_SCENE.tileSize / 2),
                logicalY - ((candidate.hitY ?? candidate.y) * TOWN_SCENE.tileSize + TOWN_SCENE.tileSize / 2)
            )
        }))
        .filter(entry => entry.distance <= minimumHitRadius)
        .sort((left, right) => left.distance - right.distance)[0];
    if (destination) {
        walkToTownDestination(destination.candidate.id);
        return;
    }
    const npc = getTownNpcRecords()
        .map(candidate => ({
            candidate,
            distance: Math.hypot(
                logicalX - (candidate.x * TOWN_SCENE.tileSize + TOWN_SCENE.tileSize / 2),
                logicalY - (candidate.y * TOWN_SCENE.tileSize + TOWN_SCENE.tileSize / 3)
            )
        }))
        .filter(entry => entry.distance <= minimumHitRadius)
        .sort((left, right) => left.distance - right.distance)[0];
    if (npc) {
        walkToTownNpc(npc.candidate.id);
        return;
    }
    townSelectedNpcId = null;
    townSelectedDestinationId = null;
    closeTownNpcDialogue();
    const path = findTownPath(townPlayerPosition, { x, y });
    if (path.length || (x === townPlayerPosition.x && y === townPlayerPosition.y)) {
        updateTownStatus(`Walking to ${x}, ${y}.`);
        startTownPath(path);
    } else {
        updateTownStatus('That spot is blocked. Tap an open floor tile.');
    }
}

function handleTownCanvasPointerDown(event) {
    if (!event || event.isPrimary === false || (Number.isFinite(event.button) && event.button !== 0)) return;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    townPointerGesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false
    };
}

function handleTownCanvasPointerMove(event) {
    if (!townPointerGesture || !event || event.pointerId !== townPointerGesture.pointerId) return;
    const distance = Math.hypot(
        event.clientX - townPointerGesture.startX,
        event.clientY - townPointerGesture.startY
    );
    if (distance > 10) townPointerGesture.moved = true;
}

function handleTownCanvasPointerUp(event) {
    if (!townPointerGesture || !event || event.pointerId !== townPointerGesture.pointerId) return;
    const gesture = townPointerGesture;
    townPointerGesture = null;
    if (gesture.moved) return;
    handleTownCanvasPointer(event);
}

function handleTownCanvasPointerCancel(event) {
    if (!townPointerGesture || !event || event.pointerId !== townPointerGesture.pointerId) return;
    townPointerGesture = null;
}

function teardownWalkableTown() {
    stopTownWalking();
    townPendingArrival = null;
    townPointerGesture = null;
    townSelectedNpcId = null;
    townSelectedDestinationId = null;
    townAwaitingNpcReceiptId = null;
    if (typeof closeDialogueOverlay === 'function') closeDialogueOverlay(false);
    closeTownShop(false);
}

function handleTownCanvasKeydown(event) {
    const movement = {
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
    }[event.key];
    if (movement) {
        event.preventDefault();
        moveTownPlayerBy(movement[0], movement[1]);
        return;
    }
    if (event.key === 'Enter' || event.key === 'e' || event.key === 'E' || event.key === ' ') {
        event.preventDefault();
        activateNearestTownNpc();
    }
}

function initializeWalkableTown() {
    if (typeof document === 'undefined') return;
    const canvas = document.getElementById('town-exploration-canvas');
    if (!canvas || canvas.dataset.townInputReady === 'true') return;
    canvas.dataset.townInputReady = 'true';
    canvas.addEventListener('pointerdown', handleTownCanvasPointerDown);
    canvas.addEventListener('pointermove', handleTownCanvasPointerMove);
    canvas.addEventListener('pointerup', handleTownCanvasPointerUp);
    canvas.addEventListener('pointercancel', handleTownCanvasPointerCancel);
    canvas.addEventListener('keydown', handleTownCanvasKeydown);
    renderWalkableTown();
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWalkableTown, { once: true });
    } else {
        initializeWalkableTown();
    }
}

if (typeof window !== 'undefined') {
    window.renderWalkableTown = renderWalkableTown;
    window.walkToTownNpc = walkToTownNpc;
    window.walkToTownDestination = walkToTownDestination;
    window.openTownNpcDialogue = openTownNpcDialogue;
    window.closeTownNpcDialogue = closeTownNpcDialogue;
    window.openTownShop = openTownShop;
    window.closeTownShop = closeTownShop;
    window.resumeTownNpcConversationAfterReceipt = resumeTownNpcConversationAfterReceipt;
    window.initializeWalkableTown = initializeWalkableTown;
    window.teardownWalkableTown = teardownWalkableTown;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TOWN_SCENE,
        TOWN_INTERACTION_RANGE,
        TOWN_DESTINATION_PLACEMENTS,
        TOWN_NPC_PLACEMENTS,
        findTownPath,
        getTownBlockedTileSet,
        isTownTileWalkable
    };
}
