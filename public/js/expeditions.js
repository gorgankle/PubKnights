// --- EXPEDITION MAP & TOWN QUESTS ---
// The browser selects only catalog IDs. Routes, encounters, progress, and rewards
// are always resolved by the server.

let adventureViewSnapshot = null;
let selectedAdventureRouteId = null;
let adventureRequestPending = false;
let worldMapPreviousFocus = null;

function asAdventureList(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
}

function hasAdventureProperty(value, key) {
    return !!(
        value
        && typeof value === 'object'
        && Object.prototype.hasOwnProperty.call(value, key)
    );
}

function isCurrentChapterCatalogItem(item) {
    return !!(item && String(item.chapterStatus || 'active').toLowerCase() !== 'deferred');
}

function getSnapshotWorld(snapshot) {
    return snapshot && snapshot.world && typeof snapshot.world === 'object'
        ? snapshot.world
        : null;
}

function getSnapshotContracts(snapshot, catalog) {
    if (hasAdventureProperty(snapshot, 'contracts')) return asAdventureList(snapshot.contracts);
    const world = getSnapshotWorld(snapshot);
    if (hasAdventureProperty(world, 'contracts')) return asAdventureList(world.contracts);
    if (hasAdventureProperty(catalog, 'contracts')) return asAdventureList(catalog.contracts);
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

function applyAdventurePayload(payload, options = {}) {
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
    const rawLocations = asAdventureList(catalog && (catalog.locations || catalog.locationCatalog));
    const rawRoutes = asAdventureList(catalog && (catalog.routes || catalog.routeCatalog));
    const locations = rawLocations.filter(isCurrentChapterCatalogItem);
    const routes = rawRoutes.filter(isCurrentChapterCatalogItem);
    const contracts = getSnapshotContracts(snapshot, catalog);
    const world = getSnapshotWorld(snapshot);
    const hasContractCatalog = hasAdventureProperty(snapshot, 'contracts')
        || hasAdventureProperty(world, 'contracts')
        || hasAdventureProperty(catalog, 'contracts');

    if (rawLocations.length || rawRoutes.length || hasContractCatalog || world) {
        adventureViewSnapshot = {
            schemaVersion: Number(snapshot && snapshot.schemaVersion) || 1,
            adventure: adventure || getClientAdventureState(),
            locations,
            routes,
            allLocations: rawLocations,
            allRoutes: rawRoutes,
            contracts,
            world,
            partyPower: snapshot && snapshot.partyPower && typeof snapshot.partyPower === 'object'
                ? snapshot.partyPower
                : null
        };
        if (selectedAdventureRouteId && !getAdventureRoute(selectedAdventureRouteId)) {
            selectedAdventureRouteId = null;
        }
    } else if (adventureViewSnapshot && adventure) {
        adventureViewSnapshot.adventure = adventure;
    }

    adventureRequestPending = false;
    if (options.persist === true && typeof saveGame === 'function') saveGame();
    renderTownWorldState();
    renderAdventureScreen();
    renderTavernReturnReport();
    if (typeof renderWalkableTown === 'function') renderWalkableTown();
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

function getAdventureRoutesToLocation(locationId) {
    return (adventureViewSnapshot ? adventureViewSnapshot.routes : [])
        .filter(route => route && getRouteDestinationId(route) === locationId);
}

function choosePreferredRouteToLocation(locationId) {
    const routes = getAdventureRoutesToLocation(locationId);
    const unlocked = routes.filter(isRouteUnlocked);
    const candidates = unlocked.length ? unlocked : routes;
    return candidates.sort((left, right) => (
        (Number(left.distance) || 999) - (Number(right.distance) || 999)
    ))[0] || null;
}

function getAdventureEncounterReports(route) {
    return asAdventureList(route && route.encounterReports)
        .filter(report => report && typeof report === 'object');
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
    return companions.find(companion => (
        companion
        && (activeIds.includes(companion.instanceId) || companion.active === true)
    )) || null;
}

function getReturnNpcReactions(snapshot, report = {}) {
    const world = snapshot && snapshot.world && typeof snapshot.world === 'object'
        ? snapshot.world
        : {};
    const priorityIds = [];
    const addPriority = npcId => {
        if (npcId && npcId !== 'kreg' && !priorityIds.includes(npcId)) priorityIds.push(npcId);
    };
    const contracts = asAdventureList(world.contracts);
    asAdventureList(report.worldContractUpdates).forEach(updateId => {
        const contractId = String(updateId || '').split(':')[0];
        const contract = contracts.find(candidate => candidate && candidate.id === contractId);
        addPriority(contract && contract.issuerNpcId);
    });
    const routeReactionNpcIds = {
        route_old_road: ['mara'],
        route_pine_trail: ['elowen'],
        route_burnt_heath: ['tilda'],
        route_toll_crossing: ['marlow'],
        route_heath_watchhouse: ['tilda', 'marlow'],
        route_toll_watchhouse: ['marlow', 'tilda']
    };
    asAdventureList(routeReactionNpcIds[report.routeId]).forEach(addPriority);

    return asAdventureList(world.npcs)
        .filter(npc => npc && npc.id !== 'kreg' && (npc.returnReaction || npc.reaction))
        .map(npc => ({
            npcId: npc.id,
            name: npc.name || npc.id || 'Pub regular',
            line: npc.returnReaction || npc.reaction,
            stageId: npc.stageId || null
        }))
        .sort((left, right) => {
            const leftRank = priorityIds.includes(left.npcId) ? priorityIds.indexOf(left.npcId) : 999;
            const rightRank = priorityIds.includes(right.npcId) ? priorityIds.indexOf(right.npcId) : 999;
            return leftRank - rightRank;
        })
        .slice(0, 4);
}

function getWorldContractUpdates(report, snapshot) {
    const contracts = getSnapshotContracts(snapshot, snapshot);
    return asAdventureList(report && report.worldContractUpdates).map(updateId => {
        const token = String(updateId || '');
        const separator = token.indexOf(':');
        const contractId = separator >= 0 ? token.slice(0, separator) : token;
        const objectiveId = separator >= 0 ? token.slice(separator + 1) : '';
        const contract = contracts.find(candidate => candidate && candidate.id === contractId) || {};
        const objective = asAdventureList(contract.objectives)
            .find(candidate => candidate && candidate.id === objectiveId) || {};
        return {
            kind: 'world-objective',
            contractId,
            objectiveId,
            title: contract.title || contractId || 'Contract',
            objectiveDescription: objective.description || 'Contract objective completed.',
            progress: Math.max(0, Number(objective.progress) || (objective.complete ? 1 : 0)),
            target: Math.max(1, Number(objective.target) || 1),
            status: contract.status || 'active',
            currentStatus: String(contract.status || 'active').toLowerCase()
        };
    }).filter(update => update.contractId);
}

function isFirstReturnChoiceAvailable(report, snapshot) {
    const world = snapshot && snapshot.world;
    const currentChoice = asAdventureList(world && world.rewardChoices)
        .find(choice => choice && choice.id === 'first_return_kit');
    if (currentChoice) {
        return String(currentChoice.status || '').toLowerCase() === 'available';
    }
    return !!(report && report.rewardChoiceOffered === true);
}

function buildTavernReturnPresentation(report, snapshot, playerState) {
    if (!report || typeof report !== 'object') return null;
    const route = getSnapshotRoute(snapshot, report.routeId) || {};
    const failed = report.outcome === 'expedition_failed';
    const contractUpdates = getWorldContractUpdates(report, snapshot);
    const contractReady = contractUpdates.some(update => update && update.currentStatus === 'claimable');
    const rewardChoiceAvailable = isFirstReturnChoiceAvailable(report, snapshot);
    const npcReactions = getReturnNpcReactions(snapshot, report);
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
    } else if (rewardChoiceAvailable) {
        kregLine = 'Mara set aside a first-return kit. Choose the tool that fits the road you want to master.';
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
        summary: (failed
            ? `The ${danger} road reward was not secured. Existing contract progress remains intact.`
            : `${rewardGold}g in return pay was secured after ${report.encounterName || 'the road encounter'}.`)
            + (!failed && rewardChoiceAvailable ? ' Mara has a first-return equipment choice waiting.' : ''),
        routeName,
        danger: String(danger),
        encounterName: report.encounterName || 'Unrecorded encounter',
        enemies,
        rewardGold,
        contractUpdates,
        rewardChoiceAvailable,
        kregLine,
        companionName: companion && (companion.name || 'Mercenary'),
        companionLine,
        npcReactions,
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

function openTavernKregConversation() {
    if (typeof setGameState === 'function') setGameState('TOWN');
    if (typeof setTimeout !== 'function') return;
    setTimeout(() => {
        if (typeof walkToTownNpc === 'function') walkToTownNpc('kreg');
    }, 0);
}

function openChapterOneTownService(actionId) {
    if (actionId !== 'review_watchhouse_preparations') return;
    if (typeof setGameState === 'function') setGameState('TOWN');
    if (typeof logMessage === 'function') logMessage('Review the watchhouse plan with Tilda, Marlow, or Kreg.');
}

function reviewTavernCrewGear() {
    if (typeof setGameState === 'function') setGameState('TOWN');
    if (typeof setTimeout === 'function') setTimeout(() => {
        if (typeof walkToTownNpc === 'function') walkToTownNpc('mara');
    }, 0);
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

    panel.hidden = true;
    panel.classList.toggle('is-failed', presentation.failed);
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    setText('tavern-return-outcome', presentation.failed ? 'Run ended' : 'Safe return');
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

    const reactionDetails = document.getElementById('tavern-return-reactions-details');
    const reactionList = document.getElementById('tavern-return-npc-reactions');
    const reactionCount = document.getElementById('tavern-return-reaction-count');
    if (reactionDetails) reactionDetails.hidden = presentation.npcReactions.length === 0;
    if (reactionCount) {
        reactionCount.textContent = `(${presentation.npcReactions.length})`;
    }
    if (reactionList) {
        reactionList.innerHTML = presentation.npcReactions.map(reaction => `
            <div class="tavern-return-npc-reaction">
                <strong>${escapeAdventureHtml(reaction.name)}</strong>
                ${escapeAdventureHtml(reaction.line)}
            </div>
        `).join('');
    }

    const contractList = document.getElementById('tavern-return-contracts');
    const contractBlock = document.getElementById('tavern-return-contract-block');
    if (contractList) {
        contractList.innerHTML = '';
        presentation.contractUpdates.forEach(update => {
            const item = document.createElement('li');
            item.className = update.currentStatus === 'claimable' ? 'is-claimable' : '';
            item.textContent = update.kind === 'world-objective'
                ? `${update.title}: ${update.objectiveDescription}${update.currentStatus === 'claimable' ? ' — ready to claim' : ' — completed'}`
                : `${update.title}: ${update.progress}/${update.target}${update.currentStatus === 'claimable' ? ' — ready to claim' : ' on this return'}`;
            contractList.appendChild(item);
        });
        if (presentation.rewardChoiceAvailable) {
            const item = document.createElement('li');
            item.className = 'is-claimable';
            item.textContent = 'First-Return Kit: choose one piece of road gear at Mara\'s stall.';
            contractList.appendChild(item);
        }
        const hasNextActions = presentation.contractUpdates.length > 0
            || presentation.rewardChoiceAvailable;
        contractList.hidden = !hasNextActions;
        if (contractBlock) contractBlock.hidden = !hasNextActions;
    }
    renderTavernReturnPortrait();
    panel.hidden = false;
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
    if (!route || route.locked === true || route.unlocked === false || route.available === false) return false;
    return route.unlocked === true || route.available === true;
}

function getRouteAvailabilityPresentation(route) {
    const unlocked = isRouteUnlocked(route);
    const reportCount = getAdventureEncounterReports(route).length;
    const unconfirmedCount = Math.max(0, Number(route && route.unconfirmedEncounterCount) || 0);
    const scouted = reportCount > 0 && unconfirmedCount === 0;
    if (!unlocked) {
        return {
            unlocked: false,
            scouted,
            label: 'Locked',
            className: 'is-locked',
            description: 'This road needs another discovery or town preparation before departure.'
        };
    }
    if (reportCount === 0) {
        return {
            unlocked: true,
            scouted: false,
            label: 'Open - Unscouted',
            className: 'is-open-unscouted',
            description: 'This road is unlocked. Travel it to turn rumor into a reliable enemy report.'
        };
    }
    if (unconfirmedCount > 0) {
        return {
            unlocked: true,
            scouted: false,
            label: 'Open - Partial Intel',
            className: 'is-open-partial',
            description: `${reportCount} threat report${reportCount === 1 ? '' : 's'} confirmed; ${unconfirmedCount} remain unverified.`
        };
    }
    return {
        unlocked: true,
        scouted: true,
        label: 'Open - Scouted',
        className: 'is-open-scouted',
        description: 'This road is open and its observed opposition is listed below.'
    };
}

function selectAdventureRoute(routeId) {
    const route = getAdventureRoute(routeId);
    if (!route) return;
    selectedAdventureRouteId = route.id;
    if (typeof playRetroSound === 'function') playRetroSound('menu');
    renderAdventureScreen();
    if (
        typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(max-width: 820px)').matches
        && typeof setTimeout === 'function'
    ) {
        setTimeout(() => {
            const detail = document.getElementById('exploration-detail');
            if (!detail) return;
            const heading = detail.querySelector('h3');
            const focusTarget = heading || detail;
            focusTarget.setAttribute('tabindex', '-1');
            if (typeof focusTarget.focus === 'function') focusTarget.focus({ preventScroll: true });
            if (typeof detail.scrollIntoView === 'function') {
                const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                detail.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
            }
        }, 0);
    }
}

function selectExpandedWorldMapRoute(routeId) {
    const activeJourney = getClientAdventureState().activeJourney || null;
    closeWorldMap();
    if (!activeJourney && typeof setGameState === 'function') {
        setGameState('ADVENTURES');
    }
    selectAdventureRoute(routeId);
    if (typeof setTimeout !== 'function') return;
    setTimeout(() => {
        const detail = document.getElementById('exploration-detail');
        if (!detail) return;
        const focusTarget = detail.querySelector('h3') || detail;
        focusTarget.setAttribute('tabindex', '-1');
        if (typeof focusTarget.focus === 'function') {
            focusTarget.focus({ preventScroll: true });
        }
        if (typeof detail.scrollIntoView === 'function') {
            detail.scrollIntoView({ block: 'start' });
        }
    }, 0);
}

function startSelectedExpedition() {
    const route = getAdventureRoute(selectedAdventureRouteId);
    if (!route || !isRouteUnlocked(route) || adventureRequestPending) return;
    adventureRequestPending = true;
    renderAdventureScreen();
    socket.emit('startExpedition', { routeId: route.id });
}

function beginExpeditionReturn() {
    if (adventureRequestPending) return;
    adventureRequestPending = true;
    renderAdventureScreen();
    socket.emit('beginExpeditionReturn');
}

function continueAdventureJourney() {
    if (adventureRequestPending) return;
    const journey = getClientAdventureState().activeJourney;
    if (!journey || journey.combatPending !== true) return;
    adventureRequestPending = true;
    renderAdventureScreen();
    socket.emit('continueJourney');
}

function resolveAdventureJourneyInstance(optionId) {
    if (!optionId || adventureRequestPending) return;
    const journey = getClientAdventureState().activeJourney;
    if (!journey || !journey.currentInstance || journey.currentInstance.kind === 'combat') return;
    adventureRequestPending = true;
    renderAdventureScreen();
    socket.emit('resolveJourneyInstance', { optionId });
}

function abandonExpedition() {
    const adventure = getClientAdventureState();
    if (!adventure.activeJourney || adventureRequestPending) return;
    if (!confirm('Abandon this expedition? The safe-return bonus and current contract delivery will be forfeited.')) return;
    adventureRequestPending = true;
    renderAdventureScreen();
    socket.emit('abandonExpedition');
}

function acceptAdventureContract(contractId) {
    if (!contractId || adventureRequestPending) return;
    adventureRequestPending = true;
    renderAdventureScreen();
    socket.emit('acceptContract', { contractId });
}

function claimAdventureContract(contractId) {
    if (!contractId || adventureRequestPending) return;
    adventureRequestPending = true;
    renderAdventureScreen();
    socket.emit('claimContract', { contractId });
}

function resolveAdventureDestinationInteraction(interactionId) {
    if (!interactionId || adventureRequestPending) return;
    adventureRequestPending = true;
    renderAdventureScreen();
    socket.emit('resolveDestinationInteraction', { interactionId });
}

function claimAdventureWorldRewardChoice(rewardChoiceId, optionId) {
    if (!rewardChoiceId || !optionId || adventureRequestPending) return;
    adventureRequestPending = true;
    renderTownWorldState();
    socket.emit('claimWorldRewardChoice', { rewardChoiceId, optionId });
}

function purchaseChapterOneStock(stockId) {
    if (!stockId || adventureRequestPending || getClientAdventureState().activeJourney) return;
    adventureRequestPending = true;
    renderTownWorldState();
    socket.emit('purchaseChapterOneStock', { stockId });
}

function recruitChapterOneNpc(npcId) {
    if (!npcId || adventureRequestPending || getClientAdventureState().activeJourney) return;
    adventureRequestPending = true;
    renderTownWorldState();
    socket.emit('recruitChapterOneNpc', { npcId });
}

function selectChapterOneFinalePreparation(optionId) {
    if (!optionId || adventureRequestPending || getClientAdventureState().activeJourney) return;
    adventureRequestPending = true;
    renderTownWorldState();
    socket.emit('selectChapterOneFinalePreparation', { optionId });
}

function getExpeditionEscrowSummary(playerState) {
    const gold = Math.max(0, Number(playerState && playerState.pendingGold) || 0);
    const xp = Math.max(0, Number(playerState && playerState.pendingXp) || 0);
    const lootCount = asAdventureList(playerState && playerState.pendingLoot).length;
    return { gold, xp, lootCount };
}

function restoreUnclaimedRewardClaim(playerState) {
    const rewards = getExpeditionEscrowSummary(playerState);
    if (rewards.gold <= 0 && rewards.xp <= 0 && rewards.lootCount <= 0) return false;

    // pendingLoot is only the loot overlay's visual mirror. The login payload
    // and every take/sell/claim operation remain server-authoritative.
    if (typeof pendingLoot !== 'undefined' && Array.isArray(pendingLoot)) {
        pendingLoot.length = 0;
        pendingLoot.push(...asAdventureList(playerState && playerState.pendingLoot));
    }
    if (typeof showLootScreen !== 'function') return false;
    showLootScreen();
    return true;
}

function getChapterOneWorldView() {
    return adventureViewSnapshot
        && adventureViewSnapshot.world
        && typeof adventureViewSnapshot.world === 'object'
        ? adventureViewSnapshot.world
        : null;
}

function getDestinationInteractions(destinationId) {
    const world = getChapterOneWorldView();
    return asAdventureList(world && world.destinationInteractions)
        .filter(interaction => interaction && interaction.destinationId === destinationId);
}

function renderDestinationInteractionsMarkup(destinationId) {
    const interactions = getDestinationInteractions(destinationId);
    if (!interactions.length) {
        return '<p class="adventure-muted">Nothing else here has drawn the party\'s attention yet.</p>';
    }
    return `<div class="destination-interactions"><h4>Investigate the Area</h4>${interactions.map(interaction => {
        const completed = interaction.completed === true || Number(interaction.completionCount) > 0;
        const available = !completed && interaction.available !== false;
        return `
            <div class="destination-interaction-card${completed ? ' is-completed' : ''}">
                <strong>${escapeAdventureHtml(interaction.name || 'Unmarked object')}</strong>
                <p>${escapeAdventureHtml(interaction.description || 'Take a closer look before returning.')}</p>
                ${completed
                    ? '<span>Clue recorded</span>'
                    : (available
                        ? `<button type="button" data-destination-interaction-id="${escapeAdventureHtml(interaction.id)}">Investigate</button>`
                        : '<span>Unavailable on this visit</span>')}
            </div>
        `;
    }).join('')}</div>`;
}

function renderTownWorldState() {
    if (typeof document === 'undefined') return;
    const world = getChapterOneWorldView();
    const npcs = asAdventureList(world && world.npcs);
    const facts = asAdventureList(world && world.facts);
    const milestones = asAdventureList(world && world.town && world.town.milestones);
    const services = asAdventureList(world && world.town && world.town.services);
    const stock = asAdventureList(world && world.town && (world.town.stock || world.town.shopStock));
    const rewardChoices = asAdventureList(world && world.rewardChoices);
    const chapter = world && world.chapter && typeof world.chapter === 'object' ? world.chapter : {};
    const preparations = asAdventureList(chapter.preparations);
    const preparationOptions = asAdventureList(chapter.finale && chapter.finale.preparationOptions);

    const milestoneSummary = document.getElementById('town-milestone-summary');
    if (milestoneSummary) {
        const openMilestone = milestones.find(milestone => (
            milestone && ['unlocked', 'completed'].includes(String(milestone.status || '').toLowerCase())
        ));
        milestoneSummary.textContent = openMilestone
            ? `${openMilestone.name}: ${openMilestone.description}`
            : (world
                ? 'The pub is steady, but its next service depends on a safe road home.'
                : 'Listening for news from the roads...');
    }

    const milestoneList = document.getElementById('town-milestone-list');
    if (milestoneList) {
        milestoneList.innerHTML = milestones.map(milestone => `
            <div class="town-milestone-card">
                <strong>${escapeAdventureHtml(milestone.name || milestone.id)}</strong>
                <span>${escapeAdventureHtml(milestone.description || milestone.status || 'Town changed')}</span>
            </div>
        `).join('');
    }

    const npcList = document.getElementById('town-npc-list');
    if (npcList) {
        npcList.innerHTML = npcs.length
            ? npcs.map(npc => `
                <div class="town-npc-card${npc.progressed ? ' is-progressed' : ''}">
                    <strong>${escapeAdventureHtml(npc.name || npc.id)}</strong>
                    <span>${escapeAdventureHtml(npc.role || 'Pub regular')}</span>
                    <span>${escapeAdventureHtml(npc.stageName || npc.stageId || 'Waiting for news')}</span>
                    ${npc.reaction || npc.returnReaction
                        ? `<span>“${escapeAdventureHtml(npc.reaction || npc.returnReaction)}”</span>`
                        : ''}
                </div>
            `).join('')
            : '<p class="adventure-muted">The regulars have not gathered yet.</p>';
    }

    const serviceList = document.getElementById('town-service-list');
    if (serviceList) {
        serviceList.innerHTML = services.map(service => {
            const recruitNpcId = service.recruitNpcId
                || (service.id === 'marlow_recruitment' || service.id === 'marlow_party_service' ? 'marlow' : null);
            return `
                <div class="town-service-card">
                    <strong>${escapeAdventureHtml(service.name || service.id)}</strong>
                    <span>${escapeAdventureHtml(service.description || 'A new town service is available.')}</span>
                    ${service.actionId
                        ? `<button type="button" data-town-service-action="${escapeAdventureHtml(service.actionId)}">${escapeAdventureHtml(service.actionLabel || 'Review')}</button>`
                        : ''}
                    ${recruitNpcId && service.claimed !== true
                        ? `<button type="button" data-recruit-chapter-npc="${escapeAdventureHtml(recruitNpcId)}">${escapeAdventureHtml(service.actionLabel || 'Invite to Party')}</button>`
                        : ''}
                </div>
            `;
        }).join('');
        serviceList.querySelectorAll('[data-recruit-chapter-npc]').forEach(button => {
            button.disabled = adventureRequestPending || !!getClientAdventureState().activeJourney;
            button.onclick = () => recruitChapterOneNpc(button.getAttribute('data-recruit-chapter-npc'));
        });
        serviceList.querySelectorAll('[data-town-service-action]').forEach(button => {
            button.disabled = adventureRequestPending || !!getClientAdventureState().activeJourney;
            button.onclick = () => openChapterOneTownService(
                button.getAttribute('data-town-service-action')
            );
        });
    }

    const factList = document.getElementById('world-fact-list');
    if (factList) {
        factList.innerHTML = facts.length
            ? facts.map(fact => `
                <div class="world-fact-card${fact.discovered ? '' : ' is-undiscovered'}">
                    <strong>${escapeAdventureHtml(fact.name || 'Undiscovered clue')}</strong>
                    <span>${escapeAdventureHtml(fact.description || 'Investigate destinations to uncover this clue.')}</span>
                </div>
            `).join('')
            : '<p class="adventure-muted">No road clues have been recorded.</p>';
    }

    const preparationList = document.getElementById('chapter-preparation-list');
    if (preparationList) {
        preparationList.hidden = preparations.length === 0;
        preparationList.innerHTML = preparations.length
            ? `<h4>Watchhouse Preparations</h4>${preparations.map(preparation => `
                <div class="chapter-preparation-card${preparation.ready ? ' is-ready' : ''}">
                    <strong>${preparation.ready ? 'Ready' : 'Missing'}: ${escapeAdventureHtml(preparation.name || preparation.id)}</strong>
                    <span>${escapeAdventureHtml(preparation.description || 'Follow the branch clue to prepare this advantage.')}</span>
                </div>
            `).join('')}${preparationOptions.length ? `
                <h4>Choose the Approach</h4>
                ${preparationOptions.map(option => {
                    const selectable = option.ready && option.selectable !== false;
                    return `
                        <div class="chapter-preparation-card${option.selected ? ' is-ready' : ''}">
                            <strong>${escapeAdventureHtml(option.name || option.id)}${option.selected ? ' — selected' : ''}</strong>
                            <span>${escapeAdventureHtml(option.description || 'This plan changes the watchhouse encounter.')}</span>
                            <button type="button" data-finale-preparation-id="${escapeAdventureHtml(option.id)}"
                                ${!selectable || option.selected || adventureRequestPending || getClientAdventureState().activeJourney ? 'disabled' : ''}>
                                ${option.selected
                                    ? 'Plan Selected'
                                    : (!option.ready
                                        ? 'Preparation Missing'
                                        : (selectable ? 'Use This Plan' : 'Accept Finale Contract First'))}
                            </button>
                        </div>
                    `;
                }).join('')}
            ` : ''}`
            : '';
        preparationList.querySelectorAll('[data-finale-preparation-id]').forEach(button => {
            button.onclick = () => selectChapterOneFinalePreparation(
                button.getAttribute('data-finale-preparation-id')
            );
        });
    }

    const quartermasterStatus = document.getElementById('quartermaster-status');
    if (quartermasterStatus) {
        const service = services.find(candidate => candidate && candidate.id === 'quartermaster_stock');
        const milestone = milestones.find(candidate => candidate && candidate.id === 'quartermaster_stall_open');
        if (service && service.available) {
            quartermasterStatus.textContent = `${service.name} is open. ${service.description}`;
        } else if (milestone && String(milestone.status || '').toLowerCase() !== 'locked') {
            quartermasterStatus.textContent = 'Mara is opening the stall and sorting the first returned supplies.';
        } else {
            quartermasterStatus.textContent = 'The shutters stay closed until a reliable supply route returns.';
        }
    }

    const stockPanel = document.getElementById('quartermaster-stock');
    if (stockPanel) {
        stockPanel.hidden = stock.length === 0;
        stockPanel.innerHTML = stock.map(entry => `
            <div class="quartermaster-stock-card">
                <div>
                    <strong>${escapeAdventureHtml(entry.name || entry.itemName || entry.stockId || entry.id)}</strong>
                    <span>${escapeAdventureHtml(entry.description || entry.summary || 'Reliable road equipment.')}</span>
                </div>
                <button type="button" data-town-stock-id="${escapeAdventureHtml(entry.stockId || entry.id)}"
                    ${adventureRequestPending || getClientAdventureState().activeJourney ? 'disabled' : ''}>
                    Buy ${Math.max(0, Number(entry.priceGold || entry.price) || 0)}g
                </button>
            </div>
        `).join('');
        stockPanel.querySelectorAll('[data-town-stock-id]').forEach(button => {
            button.onclick = () => purchaseChapterOneStock(button.getAttribute('data-town-stock-id'));
        });
    }

    const epiloguePanel = document.getElementById('chapter-epilogue-panel');
    if (epiloguePanel) {
        const completed = chapter.completed === true || String(chapter.status || '').toLowerCase() === 'completed';
        epiloguePanel.hidden = !completed;
        const epilogueCopy = document.getElementById('chapter-epilogue-copy');
        const nextRegionCopy = document.getElementById('chapter-next-region-copy');
        if (epilogueCopy) {
            epilogueCopy.textContent = chapter.epilogue && chapter.epilogue.description
                ? chapter.epilogue.description
                : 'The false toll is broken and the roads near the pub are open again.';
        }
        if (nextRegionCopy) {
            nextRegionCopy.textContent = chapter.nextRegion && chapter.nextRegion.description
                ? `${chapter.nextRegion.name || 'The next road'}: ${chapter.nextRegion.description}`
                : 'The recovered orders point beyond the Chapter One map.';
        }
    }

    const rewardPanel = document.getElementById('first-return-reward');
    if (!rewardPanel) return;
    const choice = rewardChoices.find(candidate => candidate && candidate.id === 'first_return_kit');
    const status = String(choice && choice.status || 'locked').toLowerCase();
    rewardPanel.hidden = !choice || status === 'locked';
    if (!choice || status === 'locked') {
        rewardPanel.innerHTML = '';
        return;
    }

    if (status === 'claimed') {
        const claimed = asAdventureList(choice.options)
            .find(option => option && option.id === choice.claimedOptionId);
        rewardPanel.innerHTML = `
            <strong>${escapeAdventureHtml(choice.name || 'First-Return Kit')}</strong>
            <p>Collected: ${escapeAdventureHtml(claimed ? claimed.name : choice.claimedOptionId || 'road gear')}</p>
        `;
        return;
    }

    const awayFromPub = !!getClientAdventureState().activeJourney;
    rewardPanel.innerHTML = `
        <strong>${escapeAdventureHtml(choice.name || 'First-Return Kit')}</strong>
        <p>${escapeAdventureHtml(choice.description || 'Choose one tool for the roads ahead.')}</p>
        <div class="first-return-reward-options">
            ${asAdventureList(choice.options).map(option => `
                <button type="button"
                    data-reward-choice-id="${escapeAdventureHtml(choice.id)}"
                    data-reward-option-id="${escapeAdventureHtml(option.id)}"
                    ${adventureRequestPending || awayFromPub ? 'disabled' : ''}>
                    ${escapeAdventureHtml(option.name || option.id)} — ${escapeAdventureHtml(option.summary || '')}
                </button>
            `).join('')}
        </div>
    `;
    rewardPanel.querySelectorAll('[data-reward-option-id]').forEach(button => {
        button.onclick = () => claimAdventureWorldRewardChoice(
            button.getAttribute('data-reward-choice-id'),
            button.getAttribute('data-reward-option-id')
        );
    });
}

function renderExplorationMapInto(map, activeJourney, options = {}) {
    if (!map) return;
    map.innerHTML = '';

    const expanded = options.expanded === true;
    const locations = adventureViewSnapshot
        ? (expanded
            ? (adventureViewSnapshot.allLocations || adventureViewSnapshot.locations)
            : adventureViewSnapshot.locations)
        : [];
    const routes = adventureViewSnapshot
        ? (expanded
            ? (adventureViewSnapshot.allRoutes || adventureViewSnapshot.routes)
            : adventureViewSnapshot.routes)
        : [];
    if (!locations || locations.length === 0) {
        map.innerHTML = '<div class="exploration-map-empty">Road records are unavailable. Ask around town and try again.</div>';
        return;
    }

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
        if (!isCurrentChapterCatalogItem(route) || !isRouteUnlocked(route)) className += ' is-locked';
        if (activeJourney && activeJourney.routeId === route.id) className += ' is-active';
        line.setAttribute('class', className);
        svg.appendChild(line);
    });
    map.appendChild(svg);

    locations.forEach(location => {
        const position = positions.get(location.id);
        const destinationRoutes = routes.filter(route => getRouteDestinationId(route) === location.id);
        const destinationRoute = choosePreferredRouteToLocation(location.id);
        const isHome = !!(location.isHome || /pub|tavern/i.test(location.id || ''));
        const currentChapter = isCurrentChapterCatalogItem(location);
        const discovered = currentChapter && location.discovered !== false;
        const unlocked = discovered && (isHome || destinationRoutes.some(route => (
            isCurrentChapterCatalogItem(route) && isRouteUnlocked(route)
        )));
        const isSelected = destinationRoutes.some(route => route.id === selectedAdventureRouteId);
        const isActive = activeJourney && (
            activeJourney.destinationLocationId === location.id
            || activeJourney.destinationId === location.id
        );
        const node = document.createElement('button');
        const availability = destinationRoute
            ? getRouteAvailabilityPresentation(destinationRoute)
            : null;
        node.type = 'button';
        node.className = 'adventure-location-node';
        if (isHome) node.className += ' is-home';
        if (isSelected) node.className += ' is-selected';
        if (isActive) node.className += ' is-active';
        if (!unlocked) node.className += ' is-locked';
        if (availability) node.className += ` ${availability.className}`;
        if (!discovered) node.className += ' is-hidden';
        if (expanded && !discovered) node.className += ' is-silhouetted';
        node.style.left = `${position.x}%`;
        node.style.top = `${position.y}%`;
        node.disabled = !discovered || isHome || !destinationRoute;
        const symbol = discovered ? (location.symbol || location.icon || (isHome ? 'PUB' : 'X')) : '◆';
        const name = discovered ? (location.name || location.id) : 'Undiscovered Area';
        const status = isHome
            ? 'Home'
            : (discovered
                ? (availability ? availability.label : (unlocked ? 'Open' : 'Locked'))
                : 'Silhouette');
        const canSelect = discovered && !isHome && !!destinationRoute;
        node.setAttribute('aria-label', `${name}. ${status}.${canSelect ? ' Select for route details.' : ''}`);
        node.innerHTML = `<span class="node-symbol">${escapeAdventureHtml(symbol)}</span><span class="node-name">${escapeAdventureHtml(name)}</span><span class="node-status">${escapeAdventureHtml(status)}</span>`;
        if (destinationRoute && discovered) {
            node.onclick = expanded
                ? () => selectExpandedWorldMapRoute(destinationRoute.id)
                : () => selectAdventureRoute(destinationRoute.id);
        }
        map.appendChild(node);
    });
}

function renderExplorationMap(activeJourney) {
    renderExplorationMapInto(document.getElementById('exploration-map'), activeJourney);
    const overlay = document.getElementById('world-map-overlay');
    if (overlay && !overlay.hidden) {
        renderExplorationMapInto(
            document.getElementById('world-map-expanded'),
            activeJourney,
            { expanded: true }
        );
    }
}

function handleWorldMapKeydown(event) {
    const overlay = document.getElementById('world-map-overlay');
    if (!overlay || overlay.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeWorldMap();
        return;
    }
    if (event.key !== 'Tab') return;
    const focusables = Array.from(overlay.querySelectorAll('button:not(:disabled)'));
    if (!focusables.length) return;
    const activeIndex = focusables.indexOf(document.activeElement);
    if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault();
        focusables[focusables.length - 1].focus({ preventScroll: true });
    } else if (!event.shiftKey && activeIndex === focusables.length - 1) {
        event.preventDefault();
        focusables[0].focus({ preventScroll: true });
    }
}

function openWorldMap() {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('world-map-overlay');
    if (!overlay) return;
    worldMapPreviousFocus = document.activeElement;
    overlay.hidden = false;
    renderExplorationMapInto(
        document.getElementById('world-map-expanded'),
        getClientAdventureState().activeJourney || null,
        { expanded: true }
    );
    overlay.addEventListener('keydown', handleWorldMapKeydown);
    const closeButton = document.getElementById('world-map-close');
    if (closeButton && typeof closeButton.focus === 'function') closeButton.focus({ preventScroll: true });
}

function closeWorldMap() {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('world-map-overlay');
    if (!overlay) return;
    overlay.hidden = true;
    overlay.removeEventListener('keydown', handleWorldMapKeydown);
    if (worldMapPreviousFocus && typeof worldMapPreviousFocus.focus === 'function') {
        worldMapPreviousFocus.focus({ preventScroll: true });
    }
    worldMapPreviousFocus = null;
}

function renderEncounterReportsMarkup(route) {
    const reports = getAdventureEncounterReports(route);
    const unconfirmedCount = Math.max(0, Number(route && route.unconfirmedEncounterCount) || 0);
    if (!reports.length) {
        const availability = getRouteAvailabilityPresentation(route);
        return `<div class="route-intel-empty ${escapeAdventureHtml(availability.className)}">
            <strong>${escapeAdventureHtml(availability.label)}</strong>
            <span>${escapeAdventureHtml(availability.description)}</span>
        </div>`;
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
    }).join('')}</div>${unconfirmedCount > 0
        ? `<p class="adventure-muted">${unconfirmedCount} additional road report${unconfirmedCount === 1 ? '' : 's'} remain unverified.</p>`
        : ''}`;
}

function getJourneyProgressPresentation(journey) {
    const legCount = Math.max(1, Number(journey && journey.legCount) || 1);
    const legIndex = Math.max(1, Math.min(legCount, Number(journey && journey.legIndex) || 1));
    const direction = String(journey && journey.direction || 'OUTBOUND').toUpperCase() === 'RETURN'
        ? 'Return journey'
        : 'Outward journey';
    return {
        legIndex,
        legCount,
        direction,
        percent: Math.max(4, Math.round((legIndex / legCount) * 100))
    };
}

function renderJourneyProgressMarkup(journey) {
    const progress = getJourneyProgressPresentation(journey);
    return `
        <div class="journey-progress-card" aria-label="${escapeAdventureHtml(progress.direction)}, leg ${progress.legIndex} of ${progress.legCount}">
            <div class="journey-progress-heading"><strong>${escapeAdventureHtml(progress.direction)}</strong><span>Leg ${progress.legIndex} / ${progress.legCount}</span></div>
            <div class="journey-progress-track" aria-hidden="true"><span style="width:${progress.percent}%"></span></div>
            <small>${progress.legCount === 1 ? 'A short road with one travel instance.' : `${progress.legCount - progress.legIndex} travel instance${progress.legCount - progress.legIndex === 1 ? '' : 's'} remain on this leg.`}</small>
        </div>`;
}

function renderJourneyInstanceMarkup(journey) {
    const instance = journey && journey.currentInstance;
    if (!instance) return '';
    const type = String(instance.type || instance.kind || 'event').replace(/[-_]+/g, ' ');
    const isCombat = instance.kind === 'combat' || instance.type === 'combat';
    const options = asAdventureList(instance.options);
    return `
        <section class="journey-instance-card" aria-labelledby="journey-instance-title">
            <div class="journey-instance-header">
                <h4 id="journey-instance-title">${escapeAdventureHtml(instance.title || 'Road Encounter')}</h4>
                <span class="journey-instance-type">${escapeAdventureHtml(type)}</span>
            </div>
            <p>${escapeAdventureHtml(instance.description || 'Something on the road needs the party’s attention.')}</p>
            ${isCombat && journey.combatPending === true
                ? '<button type="button" id="continue-journey-btn" class="journey-continue-button">Continue to Encounter</button>'
                : ''}
            ${!isCombat && options.length ? `<div class="journey-instance-options">${options.map(option => `
                <button type="button" data-journey-option-id="${escapeAdventureHtml(option.id)}">
                    <strong>${escapeAdventureHtml(option.label || option.id)}</strong>
                    ${option.description ? `<span>${escapeAdventureHtml(option.description)}</span>` : ''}
                    ${Math.max(0, Number(option.costGold) || 0) > 0 ? `<small>Costs ${Math.max(0, Number(option.costGold) || 0)}g</small>` : ''}
                </button>`).join('')}</div>` : ''}
            ${isCombat && journey.combatPending !== true
                ? '<p class="adventure-muted">The combat encounter is being resolved.</p>'
                : ''}
        </section>`;
}

function renderExplorationDetail(activeJourney) {
    const detail = document.getElementById('exploration-detail');
    if (!detail) return;

    if (activeJourney) {
        const destinationId = activeJourney.destinationLocationId || activeJourney.destinationId;
        const destination = getAdventureLocation(destinationId);
        const destinationName = destination ? destination.name : 'the destination';
        const phase = String(activeJourney.phase || '').toUpperCase();
        const atDestination = phase === 'AT_DESTINATION';
        const escrow = getExpeditionEscrowSummary(
            typeof player !== 'undefined' ? player : null
        );
        const lootLabel = `${escrow.lootCount} item${escrow.lootCount === 1 ? '' : 's'}`;
        detail.innerHTML = `
            <h3>${atDestination ? 'Destination Reached' : 'Expedition Underway'}</h3>
            <p><b>${escapeAdventureHtml(destinationName)}</b></p>
            <p>${atDestination
                ? 'The outward leg is complete. Rewards and contract progress are secured only after the party survives the return to the pub.'
                : `${String(activeJourney.direction || 'OUTBOUND').toUpperCase() === 'RETURN' ? 'The party is making its way home.' : 'The party is advancing toward its destination.'} Resolve each road instance to continue.`}</p>
            ${atDestination ? '' : renderJourneyProgressMarkup(activeJourney)}
            ${atDestination ? '' : renderJourneyInstanceMarkup(activeJourney)}
            ${atDestination ? `
                <div class="expedition-escrow-summary">
                    <strong>Expedition escrow at risk</strong><br>
                    ${escrow.gold}g · ${escrow.xp} XP · ${escapeAdventureHtml(lootLabel)}.
                    These rewards are banked only after a safe return.
                </div>
                ${renderDestinationInteractionsMarkup(destinationId)}
            ` : ''}
            ${atDestination ? '<button type="button" id="begin-return-trip-btn">Begin Return Journey</button>' : ''}
            <button type="button" id="abandon-expedition-btn" class="adventure-abandon-button">Abandon Expedition</button>
        `;
        detail.querySelectorAll('[data-destination-interaction-id]').forEach(button => {
            button.disabled = adventureRequestPending;
            button.onclick = () => resolveAdventureDestinationInteraction(
                button.getAttribute('data-destination-interaction-id')
            );
        });
        detail.querySelectorAll('[data-journey-option-id]').forEach(button => {
            button.disabled = adventureRequestPending;
            button.onclick = () => resolveAdventureJourneyInstance(
                button.getAttribute('data-journey-option-id')
            );
        });
        const continueButton = document.getElementById('continue-journey-btn');
        if (continueButton) {
            continueButton.disabled = adventureRequestPending;
            continueButton.onclick = continueAdventureJourney;
        }
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
    const availability = getRouteAvailabilityPresentation(route);
    const reward = Number(route.safeReturnGold || route.roundTripRewardGold || route.roundTripReward || 0);
    const firstReward = Number(route.firstReturnGold || route.firstReturnBonusGold || 0);
    const routeChoices = getAdventureRoutesToLocation(getRouteDestinationId(route));
    const firstTrip = Number(getClientAdventureState().totalSafeReturns || 0) === 0;
    const destinationName = destination ? destination.name : route.name || route.id;

    detail.innerHTML = `
        <h3>${escapeAdventureHtml(destination ? destination.name : route.name || route.id)}</h3>
        <p>${escapeAdventureHtml((destination && destination.description) || route.description || 'Route description unavailable. Reopen the journey screen to refresh its road record.')}</p>
        ${unlocked ? `<div class="route-open-callout ${escapeAdventureHtml(availability.className)}">
            <strong>${escapeAdventureHtml(availability.label)}</strong>
            <span>No contract is required for this route. Use Set Out below to begin the trip.</span>
        </div>` : ''}
        ${firstTrip && route.newcomerHint ? `<div class="route-newcomer-hint">
            <strong>${escapeAdventureHtml(route.newcomerLabel || 'First-trip note')}</strong>
            <span>${escapeAdventureHtml(route.newcomerHint)}</span>
            <small>Travel out, inspect anything interesting, then survive the return to bank road rewards.</small>
        </div>` : ''}
        <dl>
            <dt>Distance</dt><dd>${escapeAdventureHtml(route.distanceLabel || route.distance || 'Unknown')}</dd>
            <dt>Danger</dt><dd class="${dangerClass}">${escapeAdventureHtml(danger)}</dd>
            <dt>Return</dt><dd>${reward}g${firstReward > 0 ? ` + ${firstReward}g first-return bonus` : ''}</dd>
        </dl>
        ${routeChoices.length > 1 ? `
            <h4>Approach</h4>
            <div class="adventure-route-choices">
                ${routeChoices.map(choice => `
                    <button type="button" data-adventure-route-choice="${escapeAdventureHtml(choice.id)}"
                        class="${choice.id === route.id ? 'is-selected' : ''}"
                        ${isRouteUnlocked(choice) ? '' : 'disabled'}>
                        ${escapeAdventureHtml(choice.name)} · ${escapeAdventureHtml(choice.distanceLabel || choice.distance)}
                    </button>
                `).join('')}
            </div>
        ` : ''}
        <h4>Road Reports</h4>
        ${renderEncounterReportsMarkup(route)}
        <button type="button" id="start-expedition-btn">${unlocked ? `Set Out for ${escapeAdventureHtml(destinationName)}` : 'Route Locked'}</button>
    `;
    detail.querySelectorAll('[data-adventure-route-choice]').forEach(button => {
        button.onclick = () => selectAdventureRoute(button.getAttribute('data-adventure-route-choice'));
    });
    const startButton = document.getElementById('start-expedition-btn');
    if (startButton) {
        startButton.disabled = !unlocked || adventureRequestPending;
        startButton.onclick = startSelectedExpedition;
    }
}

function getContractStatus(contract) {
    if (contract.status) return String(contract.status).toLowerCase();
    return 'available';
}

function getContractStatusPresentation(contract) {
    const status = getContractStatus(contract);
    const repeatable = !!(contract && (contract.repeatable === true || contract.type === 'repeatable'));
    if (status === 'claimable') {
        return { status, label: 'Ready to claim', className: 'status-claimable', sortRank: 0 };
    }
    if (status === 'active') {
        return { status, label: 'In progress', className: 'status-active', sortRank: 1 };
    }
    if (status === 'available') {
        return {
            status,
            label: 'Available',
            className: 'status-available',
            sortRank: repeatable ? 3 : 2
        };
    }
    if (status === 'completed') {
        return { status, label: 'Completed', className: 'status-completed', sortRank: 5 };
    }
    return { status: 'locked', label: 'Locked', className: 'status-locked', sortRank: 4 };
}

function sortAdventureContracts(contracts) {
    return asAdventureList(contracts)
        .map((contract, index) => ({ contract, index, view: getContractStatusPresentation(contract) }))
        .sort((left, right) => left.view.sortRank - right.view.sortRank || left.index - right.index)
        .map(entry => entry.contract);
}

function getContractRoutePayPresentation(routes) {
    const rewards = [...new Set(asAdventureList(routes)
        .map(route => Math.max(0, Number(route && route.safeReturnGold) || 0))
        .filter(reward => reward > 0))]
        .sort((left, right) => left - right);
    if (!rewards.length) return 'Safe-return pay varies by route';
    if (rewards.length === 1) return `${rewards[0]}g safe-return pay`;
    return `${rewards[0]}-${rewards[rewards.length - 1]}g safe-return pay`;
}

function getContractObjectivePresentation(contract) {
    return asAdventureList(contract && contract.objectives).map(objective => {
        const target = Math.max(1, Number(objective && objective.target) || 1);
        const progress = Math.min(
            target,
            Math.max(0, Number(objective && objective.progress) || (objective && objective.complete ? target : 0))
        );
        return {
            id: objective && objective.id,
            type: objective && objective.type || 'objective',
            description: objective && objective.description || 'Complete the contract objective.',
            progress,
            target,
            complete: !!(objective && objective.complete) || progress >= target
        };
    });
}

function updateAdventureNavigation(activeJourney) {
    ['nav-town', 'nav-vault'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.disabled = !!activeJourney;
    });
    const returnButton = document.getElementById('adventure-return-town-btn');
    if (returnButton) {
        returnButton.disabled = !!activeJourney;
        returnButton.textContent = activeJourney ? 'Return trip required' : 'Return to Town';
    }
    document.querySelectorAll('.adventure-guild-actions button').forEach(button => {
        button.disabled = !!activeJourney;
    });
}

function renderAdventureScreen() {
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
        const power = adventureViewSnapshot.partyPower && typeof adventureViewSnapshot.partyPower === 'object'
            ? adventureViewSnapshot.partyPower
            : null;
        const powerSummary = power
            ? ` Party power ${Math.max(0, Number(power.score) || 0)} (${escapeAdventureHtml(String(power.bandId || 'scouting').replace(/[_-]+/g, ' '))} encounters).`
            : '';
        const selectedRoute = getAdventureRoute(selectedAdventureRouteId);
        const selectedDestination = selectedRoute
            ? getAdventureLocation(getRouteDestinationId(selectedRoute))
            : null;
        const selectedName = selectedDestination && selectedDestination.name
            ? selectedDestination.name
            : (selectedRoute && selectedRoute.name);
        banner.textContent = activeJourney
            ? `The party is away from the pub. Resolve the current road instance and complete the return journey to bank its rewards.${powerSummary}`
            : (safeReturns === 0
                ? `Both roads marked Open are available from the start. ${selectedName ? `${selectedName} is selected; review its briefing and press Set Out.` : 'Select either road to review it.'} Speak with townsfolk for quests before departing.${powerSummary}`
                : `Choose a road freely. Encounter reports describe possibilities; townsfolk handle quests and payment.${powerSummary}`);
    }

    renderExplorationMap(activeJourney);
    renderExplorationDetail(activeJourney);
    updateAdventureNavigation(activeJourney);
}

if (typeof socket !== 'undefined' && socket) {
    socket.on('adventureState', applyAdventurePayload);
    socket.on('adventureReceipt', payload => {
        applyAdventurePayload(payload);
        if (typeof resumeTownNpcConversationAfterReceipt === 'function') {
            resumeTownNpcConversationAfterReceipt();
        }
        if (payload && payload.message && typeof logMessage === 'function') logMessage(payload.message);
        if (payload && payload.success === false && typeof playRetroSound === 'function') playRetroSound('error');
        if (payload && payload.success !== false && typeof saveGame === 'function') saveGame();
        const activeJourney = getClientAdventureState().activeJourney || null;
        if (
            payload
            && payload.success !== false
            && payload.outcome === 'safe_return'
            && !activeJourney
        ) {
            const rewardState = payload.updatedPlayer || player;
            const rewards = getExpeditionEscrowSummary(rewardState);
            const hasUnclaimedRewards = rewards.gold > 0
                || rewards.xp > 0
                || rewards.lootCount > 0;
            if (hasUnclaimedRewards && typeof expeditionRewardReturnPending !== 'undefined') {
                expeditionRewardReturnPending = true;
            }
            if (typeof setGameState === 'function') setGameState('TOWN');
            const restoreReturnRewards = () => {
                const restored = restoreUnclaimedRewardClaim(rewardState);
                if (!restored && typeof expeditionRewardReturnPending !== 'undefined') {
                    expeditionRewardReturnPending = false;
                }
            };
            if (typeof setTimeout === 'function') {
                setTimeout(restoreReturnRewards, 0);
            } else {
                restoreReturnRewards();
            }
        }
    });
    socket.on('adventureProgress', payload => {
        // The server owns the actual save data. Trigger its secure persistence
        // after applying the fresh adventure state and before rendering it.
        applyAdventurePayload(payload, { persist: true });
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
    socket.on('loginSuccess', serverSaveData => {
        setTimeout(requestAdventureState, 0);
        // A safe return is persisted before its rewards are claimed. Reopen
        // the normal claim overlay after login so those rewards cannot become
        // invisible or be mistaken for fresh expedition escrow.
        const loginRewards = getExpeditionEscrowSummary(serverSaveData);
        const hasLoginRewards = loginRewards.gold > 0
            || loginRewards.xp > 0
            || loginRewards.lootCount > 0;
        const canRestorePendingRewards = !!(
            serverSaveData
            && serverSaveData.adventure
            && !serverSaveData.adventure.activeJourney
            && hasLoginRewards
        );
        const returningFromExpedition = canRestorePendingRewards
            && !!serverSaveData.adventure.latestReturnReport;
        if (returningFromExpedition && typeof expeditionRewardReturnPending !== 'undefined') {
            expeditionRewardReturnPending = true;
        }
        setTimeout(() => {
            if (!canRestorePendingRewards) return;
            const restored = restoreUnclaimedRewardClaim(serverSaveData);
            if (!restored && typeof expeditionRewardReturnPending !== 'undefined') {
                expeditionRewardReturnPending = false;
            }
        }, 0);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildTavernReturnPresentation,
        getAdventureEncounterReports,
        getAdventureRoutesToLocation,
        getAdventureRouteEnemyNames,
        getContractObjectivePresentation,
        getContractRoutePayPresentation,
        getContractStatusPresentation,
        getExpeditionEscrowSummary,
        getRouteAvailabilityPresentation,
        getReturnNpcReactions,
        getSnapshotContracts,
        getWorldContractUpdates,
        isCurrentChapterCatalogItem,
        restoreUnclaimedRewardClaim,
        sortAdventureContracts
    };
}
