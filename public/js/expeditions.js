// --- EXPEDITION MAP & BOUNTY BOARD ---
// The browser selects only catalog IDs. Routes, encounters, progress, and rewards
// are always resolved by the server.

let adventureViewSnapshot = null;
let selectedAdventureRouteId = null;
let adventureRequestPending = false;

function asAdventureList(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
}

function escapeAdventureHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getAdventurePayloadSnapshot(payload) {
    if (!payload || typeof payload !== 'object') return null;
    return payload.snapshot
        || payload.adventureSnapshot
        || payload.adventureState
        || payload.state
        || payload;
}

function getClientAdventureState() {
    if (player && player.adventure && typeof player.adventure === 'object') return player.adventure;
    const snapshot = adventureViewSnapshot;
    return snapshot && snapshot.adventure && typeof snapshot.adventure === 'object'
        ? snapshot.adventure
        : {};
}

function applyAdventurePayload(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (payload.updatedPlayer && player) Object.assign(player, payload.updatedPlayer);

    const snapshot = getAdventurePayloadSnapshot(payload);
    const adventure = payload.adventure
        || (snapshot && snapshot.adventure)
        || (payload.updatedPlayer && payload.updatedPlayer.adventure);
    if (adventure && player) player.adventure = adventure;

    const catalog = snapshot && snapshot.catalog && typeof snapshot.catalog === 'object'
        ? snapshot.catalog
        : snapshot;
    const locations = asAdventureList(catalog && (catalog.locations || catalog.locationCatalog));
    const routes = asAdventureList(catalog && (catalog.routes || catalog.routeCatalog));
    const bounties = asAdventureList(catalog && (catalog.bounties || catalog.contracts || catalog.bountyCatalog));

    if (locations.length || routes.length || bounties.length) {
        adventureViewSnapshot = {
            schemaVersion: Number(snapshot && snapshot.schemaVersion) || 1,
            adventure: adventure || getClientAdventureState(),
            locations,
            routes,
            bounties
        };
    } else if (adventureViewSnapshot && adventure) {
        adventureViewSnapshot.adventure = adventure;
    }

    adventureRequestPending = false;
    renderAdventureBoard();
}

function requestAdventureState() {
    if (typeof socket === 'undefined' || !socket || adventureRequestPending) return;
    adventureRequestPending = true;
    socket.emit('requestAdventureState');
}

function getAdventureRoute(routeId) {
    const routes = adventureViewSnapshot ? adventureViewSnapshot.routes : [];
    return routes.find(route => route && route.id === routeId) || null;
}

function getAdventureLocation(locationId) {
    const locations = adventureViewSnapshot ? adventureViewSnapshot.locations : [];
    return locations.find(location => location && location.id === locationId) || null;
}

function getRouteDestinationId(route) {
    return route && (
        route.toLocationId
        || route.destinationLocationId
        || route.destinationId
        || route.to
    );
}

function getRouteOriginId(route) {
    return route && (
        route.fromLocationId
        || route.originLocationId
        || route.originId
        || route.from
    );
}

function getLocationPosition(location, index, count) {
    const source = location && (location.mapPosition || location.position);
    const x = Number(source && source.x);
    const y = Number(source && source.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
        return {
            x: Math.max(7, Math.min(93, x)),
            y: Math.max(10, Math.min(90, y))
        };
    }

    if (location && (location.isHome || /pub|tavern/i.test(location.id || ''))) {
        return { x: 13, y: 50 };
    }
    const spread = Math.max(1, count - 1);
    return {
        x: 38 + ((index % 2) * 42),
        y: 18 + ((index / spread) * 64)
    };
}

function isRouteUnlocked(route) {
    return !!(route && route.unlocked !== false && route.available !== false && route.locked !== true);
}

function selectAdventureRoute(routeId) {
    const route = getAdventureRoute(routeId);
    if (!route) return;
    selectedAdventureRouteId = route.id;
    if (typeof playRetroSound === 'function') playRetroSound('menu');
    renderAdventureBoard();
}

function startSelectedExpedition() {
    const route = getAdventureRoute(selectedAdventureRouteId);
    if (!route || !isRouteUnlocked(route) || adventureRequestPending) return;
    adventureRequestPending = true;
    renderAdventureBoard();
    socket.emit('startExpedition', { routeId: route.id });
}

function beginExpeditionReturn() {
    if (adventureRequestPending) return;
    adventureRequestPending = true;
    renderAdventureBoard();
    socket.emit('beginExpeditionReturn');
}

function abandonExpedition() {
    const adventure = getClientAdventureState();
    if (!adventure.activeJourney || adventureRequestPending) return;
    if (!confirm('Abandon this expedition? The safe-return bonus and current contract delivery will be forfeited.')) return;
    adventureRequestPending = true;
    renderAdventureBoard();
    socket.emit('abandonExpedition');
}

function acceptAdventureBounty(bountyId) {
    if (!bountyId || adventureRequestPending) return;
    adventureRequestPending = true;
    renderAdventureBoard();
    socket.emit('acceptBounty', { bountyId });
}

function claimAdventureBounty(bountyId) {
    if (!bountyId || adventureRequestPending) return;
    adventureRequestPending = true;
    renderAdventureBoard();
    socket.emit('claimBounty', { bountyId });
}

function renderExplorationMap(activeJourney) {
    const map = document.getElementById('exploration-map');
    if (!map) return;
    map.innerHTML = '';

    if (!adventureViewSnapshot || adventureViewSnapshot.locations.length === 0) {
        map.innerHTML = '<div class="exploration-map-empty">Road records are unavailable. Reopen the Adventure Board to try again.</div>';
        return;
    }

    const locations = adventureViewSnapshot.locations;
    const routes = adventureViewSnapshot.routes;
    const positions = new Map();
    locations.forEach((location, index) => {
        positions.set(location.id, getLocationPosition(location, index, locations.length));
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'exploration-route-layer');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    routes.forEach(route => {
        const from = positions.get(getRouteOriginId(route));
        const to = positions.get(getRouteDestinationId(route));
        if (!from || !to) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);
        let className = 'exploration-route-line';
        if (!isRouteUnlocked(route)) className += ' is-locked';
        if (activeJourney && activeJourney.routeId === route.id) className += ' is-active';
        line.setAttribute('class', className);
        svg.appendChild(line);
    });
    map.appendChild(svg);

    locations.forEach(location => {
        const position = positions.get(location.id);
        const destinationRoute = routes.find(route => getRouteDestinationId(route) === location.id);
        const isHome = !!(location.isHome || /pub|tavern/i.test(location.id || ''));
        const discovered = location.discovered !== false;
        const unlocked = isHome || (destinationRoute && isRouteUnlocked(destinationRoute));
        const isSelected = destinationRoute && destinationRoute.id === selectedAdventureRouteId;
        const isActive = activeJourney && (
            activeJourney.destinationLocationId === location.id
            || activeJourney.destinationId === location.id
        );
        const node = document.createElement('button');
        node.type = 'button';
        node.className = 'adventure-location-node';
        if (isHome) node.className += ' is-home';
        if (isSelected) node.className += ' is-selected';
        if (isActive) node.className += ' is-active';
        if (!unlocked) node.className += ' is-locked';
        if (!discovered) node.className += ' is-hidden';
        node.style.left = `${position.x}%`;
        node.style.top = `${position.y}%`;
        node.disabled = !discovered || isHome || !destinationRoute;
        const symbol = discovered ? (location.symbol || location.icon || (isHome ? 'PUB' : 'X')) : '?';
        const name = discovered ? (location.name || location.id) : 'Unknown Road';
        node.innerHTML = `<span class="node-symbol">${escapeAdventureHtml(symbol)}</span><span class="node-name">${escapeAdventureHtml(name)}</span>`;
        if (destinationRoute && discovered) node.onclick = () => selectAdventureRoute(destinationRoute.id);
        map.appendChild(node);
    });
}

function renderExplorationDetail(activeJourney) {
    const detail = document.getElementById('exploration-detail');
    if (!detail) return;

    if (activeJourney) {
        const destinationId = activeJourney.destinationLocationId || activeJourney.destinationId;
        const destination = getAdventureLocation(destinationId);
        const destinationName = destination ? destination.name : 'the destination';
        const phase = String(activeJourney.phase || '').toUpperCase();
        const atDestination = phase === 'AT_DESTINATION' || activeJourney.reachedDestination === true;
        detail.innerHTML = `
            <h3>${atDestination ? 'Destination Reached' : 'Expedition Underway'}</h3>
            <p><b>${escapeAdventureHtml(destinationName)}</b></p>
            <p>${atDestination
                ? 'The outward leg is complete. Rewards and contract progress are secured only after the party survives the return to the pub.'
                : 'The party is committed to this travel leg.'}</p>
            ${atDestination ? '<button type="button" id="begin-return-trip-btn">Begin Return Journey</button>' : ''}
            <button type="button" id="abandon-expedition-btn" class="adventure-abandon-button">Abandon Expedition</button>
        `;
        const returnButton = document.getElementById('begin-return-trip-btn');
        if (returnButton) {
            returnButton.disabled = adventureRequestPending;
            returnButton.onclick = beginExpeditionReturn;
        }
        const abandonButton = document.getElementById('abandon-expedition-btn');
        if (abandonButton) {
            abandonButton.disabled = adventureRequestPending;
            abandonButton.onclick = abandonExpedition;
        }
        return;
    }

    const route = getAdventureRoute(selectedAdventureRouteId);
    if (!route) {
        detail.innerHTML = '<h3>Choose a Road</h3><p>Select an unlocked location to inspect its distance, danger, and possible encounters.</p>';
        return;
    }

    const destination = getAdventureLocation(getRouteDestinationId(route));
    const danger = route.dangerLabel || route.danger || 'Uncertain';
    const dangerClass = `danger-${String(danger).toLowerCase().replace(/[^a-z]+/g, '-')}`;
    const encounters = asAdventureList(route.possibleEncounterNames || route.encounterNames || route.possibleEncounters);
    const unlocked = isRouteUnlocked(route);
    const reward = Number(route.safeReturnGold || route.roundTripRewardGold || route.roundTripReward || 0);
    const firstReward = Number(route.firstReturnGold || route.firstReturnBonusGold || 0);

    detail.innerHTML = `
        <h3>${escapeAdventureHtml(destination ? destination.name : route.name || route.id)}</h3>
        <p>${escapeAdventureHtml((destination && destination.description) || route.description || 'An uncharted road beyond the pub.')}</p>
        <dl>
            <dt>Distance</dt><dd>${escapeAdventureHtml(route.distanceLabel || route.distance || 'Unknown')}</dd>
            <dt>Danger</dt><dd class="${dangerClass}">${escapeAdventureHtml(danger)}</dd>
            <dt>Return</dt><dd>${reward}g${firstReward > 0 ? ` + ${firstReward}g first-return bonus` : ''}</dd>
        </dl>
        <h4>Road Reports</h4>
        <p>${encounters.length ? encounters.map(escapeAdventureHtml).join(' · ') : 'The encounter pool has not been charted.'}</p>
        <button type="button" id="start-expedition-btn">${unlocked ? 'Travel This Route' : 'Route Locked'}</button>
    `;
    const startButton = document.getElementById('start-expedition-btn');
    if (startButton) {
        startButton.disabled = !unlocked || adventureRequestPending;
        startButton.onclick = startSelectedExpedition;
    }
}

function getBountyStatus(bounty, adventure) {
    if (bounty.status) return String(bounty.status).toLowerCase();
    const contracts = adventure.contracts || {};
    const active = contracts.active || {};
    const completed = contracts.completed || {};
    if (completed[bounty.id]) return 'completed';
    if (active[bounty.id]) return active[bounty.id].status === 'claimable' ? 'claimable' : 'active';
    if (bounty.available === false || bounty.locked === true) return 'locked';
    return 'available';
}

function renderBountyBoard(adventure) {
    const list = document.getElementById('bounty-list');
    if (!list) return;
    const bounties = adventureViewSnapshot ? adventureViewSnapshot.bounties : [];
    if (!bounties.length) {
        list.innerHTML = '<p class="adventure-muted">No contracts have been posted yet.</p>';
        return;
    }

    list.innerHTML = '';
    bounties.forEach(bounty => {
        const status = getBountyStatus(bounty, adventure);
        const target = Math.max(1, Number(bounty.targetRoundTrips || bounty.requiredRoundTrips || bounty.target || 1));
        const activeRecord = adventure.contracts && adventure.contracts.active
            ? adventure.contracts.active[bounty.id]
            : null;
        const progress = Math.max(0, Number(bounty.progress != null ? bounty.progress : activeRecord && (activeRecord.progress || activeRecord.roundTrips)) || 0);
        const card = document.createElement('div');
        card.className = `bounty-card is-${status}`;
        const copy = document.createElement('div');
        const rewardGold = Number(bounty.rewardGold || (bounty.reward && bounty.reward.gold) || 0);
        copy.innerHTML = `
            <h4>${escapeAdventureHtml(bounty.title || bounty.name || bounty.id)}</h4>
            <p>${escapeAdventureHtml(bounty.description || 'Complete the posted journey and return safely.')}</p>
            <p class="bounty-progress">${status === 'completed' ? 'Completed' : `${progress}/${target} safe returns`} · ${rewardGold}g</p>
        `;
        const button = document.createElement('button');
        button.type = 'button';
        if (status === 'active') {
            button.textContent = 'In Progress';
            button.disabled = true;
        } else if (status === 'claimable') {
            button.textContent = 'Claim';
            button.onclick = () => claimAdventureBounty(bounty.id);
        } else if (status === 'completed') {
            button.textContent = 'Paid';
            button.disabled = true;
        } else if (status === 'locked') {
            button.textContent = 'Locked';
            button.disabled = true;
        } else {
            button.textContent = 'Accept';
            button.onclick = () => acceptAdventureBounty(bounty.id);
        }
        if (adventureRequestPending || adventure.activeJourney) button.disabled = true;
        card.appendChild(copy);
        card.appendChild(button);
        list.appendChild(card);
    });
}

function updateAdventureNavigation(activeJourney) {
    ['nav-town', 'nav-tavern', 'nav-vault'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.disabled = !!activeJourney;
    });
    const returnButton = document.getElementById('adventure-return-town-btn');
    if (returnButton) {
        returnButton.disabled = !!activeJourney;
        returnButton.textContent = activeJourney ? 'Return trip required' : 'Return to Town';
    }
    const legacy = document.getElementById('legacy-deployments');
    if (legacy) {
        legacy.querySelectorAll('button').forEach(button => { button.disabled = !!activeJourney; });
    }
    document.querySelectorAll('.adventure-guild-actions button').forEach(button => {
        button.disabled = !!activeJourney;
    });
}

function renderAdventureBoard() {
    const map = document.getElementById('exploration-map');
    if (!map) return;
    if (!adventureViewSnapshot) {
        requestAdventureState();
        return;
    }

    const adventure = getClientAdventureState();
    const activeJourney = adventure.activeJourney || null;
    const safeReturns = Number(adventure.totalSafeReturns || adventure.safeReturns || 0);
    const count = document.getElementById('adventure-safe-returns');
    if (count) count.textContent = `${safeReturns} safe return${safeReturns === 1 ? '' : 's'}`;

    if (!selectedAdventureRouteId) {
        const firstOpenRoute = adventureViewSnapshot.routes.find(isRouteUnlocked);
        selectedAdventureRouteId = firstOpenRoute ? firstOpenRoute.id : null;
    }

    const banner = document.getElementById('adventure-status-banner');
    if (banner) {
        banner.className = `adventure-status-banner${activeJourney ? ' is-traveling' : ''}`;
        banner.textContent = activeJourney
            ? 'The party is away from the pub. Complete the return leg to bank its travel reward and advance delivery contracts.'
            : 'Choose a road freely. Encounter reports describe possibilities, not a prescribed order.';
    }

    renderExplorationMap(activeJourney);
    renderExplorationDetail(activeJourney);
    renderBountyBoard(adventure);
    updateAdventureNavigation(activeJourney);
}

if (typeof socket !== 'undefined' && socket) {
    socket.on('adventureState', applyAdventurePayload);
    socket.on('adventureReceipt', payload => {
        applyAdventurePayload(payload);
        if (payload && payload.message && typeof logMessage === 'function') logMessage(payload.message);
        if (payload && payload.success === false && typeof playRetroSound === 'function') playRetroSound('error');
        if (payload && payload.success !== false && typeof saveGame === 'function') saveGame();
    });
    socket.on('adventureProgress', payload => {
        applyAdventurePayload(payload);
        if (payload && payload.message && typeof logMessage === 'function') logMessage(payload.message);
    });
    socket.on('loginSuccess', () => {
        setTimeout(requestAdventureState, 0);
    });
}
