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
    renderTavernReturnReport();
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

function getAdventureEncounterReports(route) {
    const reports = asAdventureList(route && route.encounterReports)
        .filter(report => report && typeof report === 'object');
    if (reports.length) return reports;
    return asAdventureList(route && (
        route.possibleEncounterNames
        || route.encounterNames
        || route.possibleEncounters
    )).map(name => ({ name: String(name), difficulty: null, tags: [], enemyNames: [] }));
}

function getAdventureRouteEnemyNames(route) {
    const names = [];
    getAdventureEncounterReports(route).forEach(report => {
        asAdventureList(report.enemyNames || report.enemies).forEach(enemy => {
            const name = typeof enemy === 'string' ? enemy : enemy && enemy.name;
            if (name && !names.includes(name)) names.push(name);
        });
    });
    return names;
}

function getSnapshotRoute(snapshot, routeId) {
    return asAdventureList(snapshot && snapshot.routes)
        .find(route => route && route.id === routeId) || null;
}

function getReturnCompanion(playerState) {
    const roster = playerState && playerState.roster && typeof playerState.roster === 'object'
        ? playerState.roster
        : {};
    const companions = asAdventureList(roster.companions);
    const activeIds = asAdventureList(roster.activeIds);
    return companions.find(companion => companion && activeIds.includes(companion.instanceId))
        || companions[0]
        || null;
}

function buildTavernReturnPresentation(report, snapshot, playerState) {
    if (!report || typeof report !== 'object') return null;
    const route = getSnapshotRoute(snapshot, report.routeId) || {};
    const failed = report.outcome === 'expedition_failed';
    const snapshotBounties = asAdventureList(snapshot && snapshot.bounties);
    const contractUpdates = asAdventureList(report.contractUpdates).map(update => {
        const current = snapshotBounties.find(bounty => bounty && bounty.id === update.bountyId);
        return {
            ...update,
            currentStatus: current && current.status ? String(current.status).toLowerCase() : update.status
        };
    });
    const contractReady = contractUpdates.some(update => update && update.currentStatus === 'claimable');
    const tags = asAdventureList(report.encounterTags).map(tag => String(tag).toLowerCase());
    const enemies = asAdventureList(report.enemyNames).filter(Boolean);
    const companion = getReturnCompanion(playerState);
    const routeName = report.routeName || route.name || 'the road';
    const danger = report.dangerLabel || route.dangerLabel || route.danger || 'Uncertain';
    const rewardGold = failed ? 0 : Math.max(0, Number(report.rewardGold) || 0);

    let kregLine;
    if (failed) {
        const reason = String(report.failureReason || 'failed');
        if (reason === 'fled_combat') {
            kregLine = 'Running is cheaper than a funeral. Tell me what chased you home.';
        } else if (reason === 'combat_defeat') {
            kregLine = 'Sit down. Pride can wait; breathing cannot.';
        } else if (reason === 'interrupted') {
            kregLine = 'The road went quiet. I kept your earlier contract marks and closed this run.';
        } else {
            kregLine = 'No safe return, no road pay. Catch your breath and decide what changes next time.';
        }
    } else if (contractReady) {
        kregLine = 'That is the run the board was waiting for. Your contract is ready to claim.';
    } else if (report.firstReturn) {
        kregLine = 'The first round trip turns a rumor into a road. Drinks are on the honest ledger tonight.';
    } else if (tags.includes('mage') || tags.includes('telegraph')) {
        kregLine = 'Spell-light on the road again. At least now you know what the wind-up looks like.';
    } else if (tags.includes('ranged') || tags.includes('cover')) {
        kregLine = 'Poachers dislike travelers who make it home. Expect them to change their perches.';
    } else {
        kregLine = 'Boots back under my roof and coin back in the till. That counts as a good road.';
    }

    let companionLine = null;
    if (companion) {
        if (failed) {
            companionLine = 'We got home. Next run, we leave ourselves a cleaner way back.';
        } else if (tags.includes('mage') || tags.includes('interrupt')) {
            companionLine = 'You could see the spell building. Give me one clean opening and I can stop the next one.';
        } else if (tags.includes('ranged') || tags.includes('cover')) {
            companionLine = 'Their archers owned the long lanes. Next time I want cover between us and them.';
        } else if (tags.includes('melee') || tags.includes('close-quarters')) {
            companionLine = 'They wanted a close brawl. We made them pay for every step.';
        } else {
            companionLine = 'The road taught us something. Let us change the loadout before it teaches us twice.';
        }
    }

    return {
        failed,
        title: failed
            ? `Expedition Cut Short: ${routeName}`
            : `${report.firstReturn ? 'First Safe Return' : 'Back at the Pub'}: ${routeName}`,
        summary: failed
            ? `The ${danger} road reward was not secured. Existing contract progress remains intact.`
            : `${rewardGold}g in return pay was secured after ${report.encounterName || 'the road encounter'}.`,
        routeName,
        danger: String(danger),
        encounterName: report.encounterName || 'Unrecorded encounter',
        enemies,
        rewardGold,
        contractUpdates,
        kregLine,
        companionName: companion && (companion.name || 'Mercenary'),
        companionLine,
        returnedAt: Number(report.returnedAt) || 0
    };
}

function getAdventureLocation(locationId) {
    const locations = adventureViewSnapshot ? adventureViewSnapshot.locations : [];
    return locations.find(location => location && location.id === locationId) || null;
}

function renderTavernReturnPortrait() {
    const canvas = document.getElementById('tavern-return-kreg-canvas');
    if (!canvas) return;
    const context = canvas.getContext && canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (typeof drawHumanoidActorFront === 'function') {
        const profile = drawHumanoidActorFront(
            context,
            { id: 'npc_kreg', kind: 'npc', name: 'Kreg', visualProfileId: 'npc_kreg' },
            0,
            0,
            canvas.width
        );
        if (profile) return;
    }
    if (
        typeof drawOptimizedSprite === 'function'
        && typeof SpriteMatrices !== 'undefined'
        && SpriteMatrices.npc_kreg
    ) {
        drawOptimizedSprite(context, 'npc_kreg', SpriteMatrices.npc_kreg, 0, 0, canvas.width);
    }
}

function openTavernAdventureBoard() {
    if (typeof setGameState === 'function') setGameState('ADVENTURES');
}

function reviewTavernCrewGear() {
    if (typeof setGameState === 'function') setGameState('KNIGHT');
    const roster = document.getElementById('party-roster-panel');
    if (roster && typeof roster.scrollIntoView === 'function') {
        roster.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function renderTavernReturnReport() {
    const panel = document.getElementById('tavern-return-report');
    if (!panel) return;
    const adventure = getClientAdventureState();
    const presentation = buildTavernReturnPresentation(
        adventure.latestReturnReport,
        adventureViewSnapshot,
        typeof player !== 'undefined' ? player : null
    );
    if (!presentation) {
        panel.hidden = true;
        return;
    }

    panel.hidden = false;
    panel.classList.toggle('is-failed', presentation.failed);
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    setText('tavern-return-title', presentation.title);
    setText('tavern-return-summary', presentation.summary);
    setText('tavern-return-route', presentation.routeName);
    setText('tavern-return-danger', presentation.danger);
    setText('tavern-return-encounter', presentation.encounterName);
    setText(
        'tavern-return-enemies',
        presentation.enemies.length ? presentation.enemies.join(', ') : 'No reliable names'
    );
    setText('tavern-return-kreg-copy', presentation.kregLine);

    const companion = document.getElementById('tavern-return-companion');
    if (companion) {
        companion.hidden = !presentation.companionLine;
        if (presentation.companionLine) {
            setText('tavern-return-companion-name', presentation.companionName || 'Mercenary');
            setText('tavern-return-companion-copy', presentation.companionLine);
        }
    }

    const contractList = document.getElementById('tavern-return-contracts');
    if (contractList) {
        contractList.innerHTML = '';
        presentation.contractUpdates.forEach(update => {
            const item = document.createElement('li');
            item.className = update.currentStatus === 'claimable' ? 'is-claimable' : '';
            item.textContent = `${update.title}: ${update.progress}/${update.target}${update.currentStatus === 'claimable' ? ' — ready to claim' : ' on this return'}`;
            contractList.appendChild(item);
        });
        contractList.hidden = presentation.contractUpdates.length === 0;
    }
    renderTavernReturnPortrait();
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

function renderEncounterReportsMarkup(route) {
    const reports = getAdventureEncounterReports(route);
    if (!reports.length) {
        return '<p class="adventure-muted">The encounter pool has not been charted.</p>';
    }
    return `<div class="adventure-encounter-reports">${reports.map(report => {
        const enemyNames = asAdventureList(report.enemyNames || report.enemies)
            .map(enemy => typeof enemy === 'string' ? enemy : enemy && enemy.name)
            .filter(Boolean);
        const tags = asAdventureList(report.tags)
            .map(tag => String(tag).replace(/[-_]+/g, ' '));
        const difficulty = Number(report.difficulty);
        return `
            <div class="adventure-encounter-report">
                <div><strong>${escapeAdventureHtml(report.name || 'Unverified encounter')}</strong>${Number.isFinite(difficulty) ? `<span>Threat ${difficulty}</span>` : ''}</div>
                <p>${enemyNames.length ? `Enemies: ${enemyNames.map(escapeAdventureHtml).join(', ')}` : 'Enemy identities uncertain.'}</p>
                ${tags.length ? `<small>${tags.map(escapeAdventureHtml).join(' · ')}</small>` : ''}
            </div>
        `;
    }).join('')}</div>`;
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
        ${renderEncounterReportsMarkup(route)}
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
        const route = getAdventureRoute(bounty.routeId);
        const routeName = route ? route.name : 'Unlisted route';
        const danger = route && (route.dangerLabel || route.danger) || 'Uncertain';
        const routeReward = Number(route && route.safeReturnGold) || 0;
        const enemyNames = getAdventureRouteEnemyNames(route);
        copy.innerHTML = `
            <h4>${escapeAdventureHtml(bounty.title || bounty.name || bounty.id)}</h4>
            <p>${escapeAdventureHtml(bounty.description || 'Complete the posted journey and return safely.')}</p>
            <p class="bounty-risk"><b>${escapeAdventureHtml(routeName)}</b> · ${escapeAdventureHtml(danger)} danger</p>
            <p class="bounty-enemies">Expected: ${enemyNames.length ? enemyNames.map(escapeAdventureHtml).join(', ') : 'Unconfirmed opposition'}</p>
            <p class="bounty-progress">${status === 'completed' ? 'Completed' : `${progress}/${target} safe returns`} · Contract ${rewardGold}g · Road ${routeReward}g</p>
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
    socket.on('enemyTurnReceipt', payload => {
        if (!payload || payload.combatDefeated !== true || !payload.updatedPlayer) return;
        if (player) Object.assign(player, payload.updatedPlayer);
        if (adventureViewSnapshot && payload.updatedPlayer.adventure) {
            adventureViewSnapshot.adventure = payload.updatedPlayer.adventure;
        }
        renderTavernReturnReport();
    });
    socket.on('loginSuccess', () => {
        setTimeout(requestAdventureState, 0);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildTavernReturnPresentation,
        getAdventureEncounterReports,
        getAdventureRouteEnemyNames
    };
}
