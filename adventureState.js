// --- adventureState.js ---
// Pure, server-owned exploration, journey, and bounty progression.

const crypto = require('crypto');
const {
    LocationCatalog,
    RouteCatalog,
    AuthoredEncounterCatalog,
    BountyCatalog
} = require('./adventureCatalog.js');

const ADVENTURE_SCHEMA_VERSION = 1;
const JOURNEY_PHASES = new Set(['OUTBOUND_COMBAT', 'AT_DESTINATION', 'RETURN_COMBAT']);
const CONTRACT_STATUSES = new Set(['active', 'claimable']);

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function nonNegativeInt(value, fallback = 0) {
    const parsed = Math.trunc(Number(value));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function cleanTimestamp(value) {
    const parsed = nonNegativeInt(value, 0);
    return parsed > 0 ? parsed : undefined;
}

function uniqueKnownIds(values, catalog) {
    const result = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach(value => {
        if (typeof value !== 'string' || !catalog[value] || seen.has(value)) return;
        seen.add(value);
        result.push(value);
    });
    return result;
}

function createInitialAdventureState() {
    const discoveredLocationIds = [];
    const unlockedLocationIds = [];
    Object.values(LocationCatalog).forEach(location => {
        if (location.initiallyDiscovered) discoveredLocationIds.push(location.id);
        if (location.initiallyUnlocked) unlockedLocationIds.push(location.id);
    });

    const routeStats = {};
    Object.keys(RouteCatalog).forEach(routeId => {
        routeStats[routeId] = {
            successfulRoundTrips: 0,
            failedTrips: 0
        };
    });

    return {
        schemaVersion: ADVENTURE_SCHEMA_VERSION,
        discoveredLocationIds,
        unlockedLocationIds,
        totalSafeReturns: 0,
        routeStats,
        activeJourney: null,
        latestReturnReport: null,
        contracts: {
            active: {},
            completed: {}
        }
    };
}

function normalizeRouteStats(source) {
    const normalized = {};
    Object.keys(RouteCatalog).forEach(routeId => {
        const record = source && source[routeId] && typeof source[routeId] === 'object'
            ? source[routeId]
            : {};
        normalized[routeId] = {
            successfulRoundTrips: nonNegativeInt(record.successfulRoundTrips),
            failedTrips: nonNegativeInt(record.failedTrips)
        };
        const lastReturnedAt = cleanTimestamp(record.lastReturnedAt);
        const lastFailedAt = cleanTimestamp(record.lastFailedAt);
        if (lastReturnedAt) normalized[routeId].lastReturnedAt = lastReturnedAt;
        if (lastFailedAt) normalized[routeId].lastFailedAt = lastFailedAt;
        if (typeof record.lastFailureReason === 'string' && record.lastFailureReason) {
            normalized[routeId].lastFailureReason = record.lastFailureReason.slice(0, 40);
        }
    });
    return normalized;
}

function normalizeContracts(source) {
    const sourceContracts = source && typeof source === 'object' ? source : {};
    const active = {};
    const completed = {};

    Object.entries(sourceContracts.active && typeof sourceContracts.active === 'object'
        ? sourceContracts.active
        : {}).forEach(([bountyId, record]) => {
        const bounty = BountyCatalog[bountyId];
        if (!bounty || !record || typeof record !== 'object') return;
        const target = Math.max(1, nonNegativeInt(bounty.targetRoundTrips, 1));
        const progress = Math.min(target, nonNegativeInt(record.progress != null ? record.progress : record.roundTrips));
        const requestedStatus = String(record.status || '').toLowerCase();
        active[bountyId] = {
            status: progress >= target || requestedStatus === 'claimable' ? 'claimable' : 'active',
            progress,
            acceptedAt: cleanTimestamp(record.acceptedAt) || Date.now()
        };
    });

    Object.entries(sourceContracts.completed && typeof sourceContracts.completed === 'object'
        ? sourceContracts.completed
        : {}).forEach(([bountyId, record]) => {
        if (!BountyCatalog[bountyId] || !record || typeof record !== 'object') return;
        completed[bountyId] = {
            count: Math.max(1, nonNegativeInt(record.count, 1)),
            lastCompletedAt: cleanTimestamp(record.lastCompletedAt) || Date.now()
        };
    });

    return { active, completed };
}

function normalizeActiveJourney(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
    const route = RouteCatalog[source.routeId];
    const phase = String(source.phase || '').toUpperCase();
    const encounterId = typeof source.currentEncounterId === 'string'
        ? source.currentEncounterId
        : source.encounterId;
    if (!route || !JOURNEY_PHASES.has(phase)) return null;
    if (phase !== 'AT_DESTINATION' && !AuthoredEncounterCatalog[encounterId]) return null;

    return {
        journeyId: typeof source.journeyId === 'string' && source.journeyId
            ? source.journeyId.slice(0, 80)
            : `journey_${crypto.randomBytes(8).toString('hex')}`,
        routeId: route.id,
        originLocationId: route.fromLocationId,
        destinationLocationId: route.toLocationId,
        phase,
        direction: phase === 'RETURN_COMBAT' ? 'RETURN' : (phase === 'OUTBOUND_COMBAT' ? 'OUTBOUND' : null),
        reachedDestination: phase !== 'OUTBOUND_COMBAT',
        currentEncounterId: phase === 'AT_DESTINATION' ? null : encounterId,
        startedAt: cleanTimestamp(source.startedAt) || Date.now()
    };
}

function getEncounterPublicSummary(encounterId) {
    const encounter = AuthoredEncounterCatalog[encounterId];
    if (!encounter) return null;
    return {
        name: encounter.name,
        difficulty: Math.max(1, nonNegativeInt(encounter.difficulty, 1)),
        tags: (Array.isArray(encounter.tags) ? encounter.tags : [])
            .filter(tag => typeof tag === 'string' && tag)
            .slice(0, 6),
        enemyNames: (Array.isArray(encounter.enemies) ? encounter.enemies : [])
            .map(enemy => enemy && enemy.name)
            .filter(name => typeof name === 'string' && name)
            .slice(0, 6)
    };
}

function createReturnReport(journey, outcome, details = {}, now = Date.now()) {
    const route = journey && RouteCatalog[journey.routeId];
    if (!route || !['safe_return', 'expedition_failed'].includes(outcome)) return null;
    const encounter = getEncounterPublicSummary(journey.currentEncounterId);
    const contractUpdates = (Array.isArray(details.contractUpdates) ? details.contractUpdates : [])
        .map(update => {
            const bounty = update && BountyCatalog[update.bountyId];
            if (!bounty) return null;
            const target = Math.max(1, nonNegativeInt(bounty.targetRoundTrips, 1));
            const progress = Math.min(target, nonNegativeInt(update.progress));
            return {
                bountyId: bounty.id,
                title: bounty.title,
                progress,
                target,
                status: progress >= target || update.status === 'claimable'
                    ? 'claimable'
                    : 'active'
            };
        })
        .filter(Boolean);

    return {
        reportId: `return_${crypto.randomBytes(8).toString('hex')}`,
        outcome,
        routeId: route.id,
        routeName: route.name,
        dangerLabel: route.dangerLabel,
        encounterName: encounter ? encounter.name : 'Unrecorded encounter',
        encounterDifficulty: encounter ? encounter.difficulty : null,
        encounterTags: encounter ? encounter.tags : [],
        enemyNames: encounter ? encounter.enemyNames : [],
        rewardGold: outcome === 'safe_return'
            ? nonNegativeInt(details.rewardGold)
            : 0,
        firstReturn: outcome === 'safe_return' && details.firstReturn === true,
        contractUpdates,
        failureReason: outcome === 'expedition_failed'
            ? String(details.failureReason || 'failed').slice(0, 40)
            : null,
        returnedAt: cleanTimestamp(now) || Date.now()
    };
}

function normalizeReturnReport(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
    const route = RouteCatalog[source.routeId];
    const outcome = String(source.outcome || '').toLowerCase();
    if (!route || !['safe_return', 'expedition_failed'].includes(outcome)) return null;
    const reportId = typeof source.reportId === 'string' && /^return_[a-z0-9_:-]+$/i.test(source.reportId)
        ? source.reportId.slice(0, 80)
        : null;
    if (!reportId) return null;

    const contractUpdates = (Array.isArray(source.contractUpdates) ? source.contractUpdates : [])
        .map(update => {
            const bounty = update && BountyCatalog[update.bountyId];
            if (!bounty || bounty.routeId !== route.id) return null;
            const target = Math.max(1, nonNegativeInt(bounty.targetRoundTrips, 1));
            const progress = Math.min(target, nonNegativeInt(update.progress));
            return {
                bountyId: bounty.id,
                title: bounty.title,
                progress,
                target,
                status: progress >= target || update.status === 'claimable'
                    ? 'claimable'
                    : 'active'
            };
        })
        .filter(Boolean);

    return {
        reportId,
        outcome,
        routeId: route.id,
        routeName: route.name,
        dangerLabel: route.dangerLabel,
        encounterName: typeof source.encounterName === 'string' && source.encounterName
            ? source.encounterName.slice(0, 80)
            : 'Unrecorded encounter',
        encounterDifficulty: source.encounterDifficulty == null
            ? null
            : Math.max(1, nonNegativeInt(source.encounterDifficulty, 1)),
        encounterTags: (Array.isArray(source.encounterTags) ? source.encounterTags : [])
            .filter(tag => typeof tag === 'string' && tag)
            .slice(0, 6),
        enemyNames: (Array.isArray(source.enemyNames) ? source.enemyNames : [])
            .filter(name => typeof name === 'string' && name)
            .map(name => name.slice(0, 60))
            .slice(0, 6),
        rewardGold: outcome === 'safe_return' ? nonNegativeInt(source.rewardGold) : 0,
        firstReturn: outcome === 'safe_return' && source.firstReturn === true,
        contractUpdates,
        failureReason: outcome === 'expedition_failed'
            ? String(source.failureReason || 'failed').slice(0, 40)
            : null,
        returnedAt: cleanTimestamp(source.returnedAt) || Date.now()
    };
}

function applyContractLocationUnlocks(adventure) {
    Object.keys(adventure.contracts.active).forEach(bountyId => {
        const bounty = BountyCatalog[bountyId];
        if (!bounty) return;
        adventure.discoveredLocationIds.push(...(bounty.revealLocationIdsOnAccept || []));
        adventure.unlockedLocationIds.push(...(bounty.unlockLocationIdsOnAccept || []));
    });
    adventure.discoveredLocationIds = uniqueKnownIds(adventure.discoveredLocationIds, LocationCatalog);
    adventure.unlockedLocationIds = uniqueKnownIds(adventure.unlockedLocationIds, LocationCatalog);
}

function failJourneyRecord(adventure, reason, now = Date.now()) {
    const journey = adventure.activeJourney;
    if (!journey) return null;
    const stats = adventure.routeStats[journey.routeId];
    if (stats) {
        stats.failedTrips += 1;
        stats.lastFailedAt = now;
        stats.lastFailureReason = String(reason || 'failed').slice(0, 40);
    }
    adventure.latestReturnReport = createReturnReport(
        journey,
        'expedition_failed',
        { failureReason: reason },
        now
    );
    adventure.activeJourney = null;
    return journey;
}

function normalizeAdventureState(player, options = {}) {
    if (!player || typeof player !== 'object') return createInitialAdventureState();
    const initial = createInitialAdventureState();
    const source = player.adventure && typeof player.adventure === 'object'
        ? player.adventure
        : {};

    const adventure = {
        schemaVersion: ADVENTURE_SCHEMA_VERSION,
        discoveredLocationIds: uniqueKnownIds([
            ...initial.discoveredLocationIds,
            ...(Array.isArray(source.discoveredLocationIds) ? source.discoveredLocationIds : [])
        ], LocationCatalog),
        unlockedLocationIds: uniqueKnownIds([
            ...initial.unlockedLocationIds,
            ...(Array.isArray(source.unlockedLocationIds) ? source.unlockedLocationIds : [])
        ], LocationCatalog),
        totalSafeReturns: nonNegativeInt(source.totalSafeReturns != null
            ? source.totalSafeReturns
            : source.safeReturns),
        routeStats: normalizeRouteStats(source.routeStats),
        activeJourney: normalizeActiveJourney(source.activeJourney),
        latestReturnReport: normalizeReturnReport(source.latestReturnReport),
        contracts: normalizeContracts(source.contracts)
    };

    applyContractLocationUnlocks(adventure);
    if (options.recoverInterruptedJourney === true && adventure.activeJourney) {
        failJourneyRecord(adventure, 'interrupted');
    }
    player.adventure = adventure;
    return adventure;
}

function hasActiveJourney(player) {
    return !!(player && player.adventure && player.adventure.activeJourney);
}

function getRandomFunction(options) {
    if (typeof options === 'function') return options;
    if (options && typeof options.random === 'function') return options.random;
    return Math.random;
}

function chooseRouteEncounter(route, options) {
    const encounterIds = (route && Array.isArray(route.encounterIds) ? route.encounterIds : [])
        .filter(encounterId => AuthoredEncounterCatalog[encounterId]);
    if (!encounterIds.length) return null;
    const random = getRandomFunction(options);
    const roll = Number(random());
    const bounded = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999, roll)) : 0;
    return encounterIds[Math.floor(bounded * encounterIds.length)];
}

function buildExpeditionContext(journey) {
    return {
        journeyId: journey.journeyId,
        routeId: journey.routeId,
        fromLocationId: journey.direction === 'RETURN'
            ? journey.destinationLocationId
            : journey.originLocationId,
        toLocationId: journey.direction === 'RETURN'
            ? journey.originLocationId
            : journey.destinationLocationId,
        destinationId: journey.destinationLocationId,
        direction: journey.direction,
        encounterId: journey.currentEncounterId
    };
}

function beginExpedition(player, routeId, options = {}) {
    const adventure = normalizeAdventureState(player, { recoverInterruptedJourney: false });
    if (adventure.activeJourney) {
        return { success: false, code: 'ACTIVE_JOURNEY', message: 'Finish or abandon the current expedition first.' };
    }
    const route = RouteCatalog[routeId];
    if (!route) return { success: false, code: 'UNKNOWN_ROUTE', message: 'That road is not in the guild ledger.' };
    if (!adventure.unlockedLocationIds.includes(route.toLocationId)) {
        return { success: false, code: 'LOCKED_ROUTE', message: 'That road has not been unlocked.' };
    }
    const encounterId = chooseRouteEncounter(route, options);
    if (!encounterId) {
        return { success: false, code: 'EMPTY_ROUTE', message: 'That route has no valid encounter reports.' };
    }

    const journey = {
        journeyId: `journey_${crypto.randomBytes(8).toString('hex')}`,
        routeId: route.id,
        originLocationId: route.fromLocationId,
        destinationLocationId: route.toLocationId,
        phase: 'OUTBOUND_COMBAT',
        direction: 'OUTBOUND',
        reachedDestination: false,
        currentEncounterId: encounterId,
        startedAt: Date.now()
    };
    adventure.activeJourney = journey;
    return {
        success: true,
        outcome: 'outbound_started',
        message: `The party sets out for ${LocationCatalog[route.toLocationId].name}.`,
        journey: clone(journey),
        encounterId,
        expeditionContext: buildExpeditionContext(journey)
    };
}

function beginReturnTrip(player, options = {}) {
    const adventure = normalizeAdventureState(player, { recoverInterruptedJourney: false });
    const journey = adventure.activeJourney;
    if (!journey) return { success: false, code: 'NO_ACTIVE_JOURNEY', message: 'There is no expedition to return from.' };
    if (journey.phase !== 'AT_DESTINATION' || !journey.reachedDestination) {
        return { success: false, code: 'NOT_AT_DESTINATION', message: 'The party has not reached its destination.' };
    }
    const route = RouteCatalog[journey.routeId];
    const encounterId = chooseRouteEncounter(route, options);
    if (!encounterId) return { success: false, code: 'EMPTY_ROUTE', message: 'The return route has no valid encounter reports.' };

    journey.phase = 'RETURN_COMBAT';
    journey.direction = 'RETURN';
    journey.currentEncounterId = encounterId;
    return {
        success: true,
        outcome: 'return_started',
        message: `The party begins the return from ${LocationCatalog[route.toLocationId].name}.`,
        journey: clone(journey),
        encounterId,
        expeditionContext: buildExpeditionContext(journey)
    };
}

function contextMatchesJourney(journey, context) {
    if (!journey || !context || typeof context !== 'object') return false;
    return context.journeyId === journey.journeyId
        && context.routeId === journey.routeId
        && String(context.direction || '').toUpperCase() === journey.direction
        && context.encounterId === journey.currentEncounterId;
}

function advanceBountiesForSafeReturn(adventure, routeId) {
    const advanced = [];
    Object.entries(adventure.contracts.active).forEach(([bountyId, record]) => {
        const bounty = BountyCatalog[bountyId];
        if (!bounty || bounty.routeId !== routeId || !CONTRACT_STATUSES.has(record.status)) return;
        if (record.status === 'claimable') return;
        const target = Math.max(1, nonNegativeInt(bounty.targetRoundTrips, 1));
        record.progress = Math.min(target, nonNegativeInt(record.progress) + 1);
        if (record.progress >= target) record.status = 'claimable';
        advanced.push({ bountyId, progress: record.progress, target, status: record.status });
    });
    return advanced;
}

function applyFirstReturnUnlocks(adventure, route) {
    adventure.discoveredLocationIds.push(...(route.firstReturnDiscoverLocationIds || []));
    adventure.unlockedLocationIds.push(...(route.firstReturnUnlockLocationIds || []));
    adventure.discoveredLocationIds = uniqueKnownIds(adventure.discoveredLocationIds, LocationCatalog);
    adventure.unlockedLocationIds = uniqueKnownIds(adventure.unlockedLocationIds, LocationCatalog);
}

function resolveExpeditionCombatVictory(player, context) {
    const adventure = normalizeAdventureState(player, { recoverInterruptedJourney: false });
    const journey = adventure.activeJourney;
    if (!journey || !contextMatchesJourney(journey, context)) {
        return { success: false, code: 'STALE_JOURNEY', message: 'This combat no longer belongs to the active expedition.' };
    }

    if (journey.phase === 'OUTBOUND_COMBAT' && journey.direction === 'OUTBOUND') {
        journey.phase = 'AT_DESTINATION';
        journey.direction = null;
        journey.reachedDestination = true;
        journey.currentEncounterId = null;
        if (!adventure.discoveredLocationIds.includes(journey.destinationLocationId)) {
            adventure.discoveredLocationIds.push(journey.destinationLocationId);
        }
        return {
            success: true,
            outcome: 'destination_reached',
            message: `${LocationCatalog[journey.destinationLocationId].name} reached. The return reward is not secured yet.`,
            journey: clone(journey)
        };
    }

    if (journey.phase !== 'RETURN_COMBAT' || journey.direction !== 'RETURN') {
        return { success: false, code: 'INVALID_JOURNEY_PHASE', message: 'This expedition leg cannot be completed.' };
    }

    const route = RouteCatalog[journey.routeId];
    const stats = adventure.routeStats[route.id];
    const firstReturn = stats.successfulRoundTrips === 0;
    stats.successfulRoundTrips += 1;
    stats.lastReturnedAt = Date.now();
    adventure.totalSafeReturns += 1;
    const rewardGold = nonNegativeInt(route.safeReturnGold)
        + (firstReturn ? nonNegativeInt(route.firstReturnGold) : 0);
    player.pendingGold = nonNegativeInt(player.pendingGold) + rewardGold;
    const advancedBounties = advanceBountiesForSafeReturn(adventure, route.id);
    if (firstReturn) applyFirstReturnUnlocks(adventure, route);
    adventure.latestReturnReport = createReturnReport(
        journey,
        'safe_return',
        {
            rewardGold,
            firstReturn,
            contractUpdates: advancedBounties
        }
    );
    adventure.activeJourney = null;

    return {
        success: true,
        outcome: 'safe_return',
        message: `Safe return completed. ${rewardGold}g was added to the deployment rewards.`,
        routeId: route.id,
        rewardGold,
        firstReturn,
        advancedBounties
    };
}

function failActiveExpedition(player, reason = 'failed') {
    const adventure = normalizeAdventureState(player, { recoverInterruptedJourney: false });
    const journey = failJourneyRecord(adventure, reason);
    if (!journey) return { success: false, code: 'NO_ACTIVE_JOURNEY', message: 'There is no active expedition.' };
    return {
        success: true,
        outcome: 'expedition_failed',
        reason: String(reason || 'failed').slice(0, 40),
        routeId: journey.routeId,
        message: 'The expedition ended without a safe return. Existing bounty progress was preserved.'
    };
}

function acceptBounty(player, bountyId) {
    const adventure = normalizeAdventureState(player, { recoverInterruptedJourney: false });
    if (adventure.activeJourney) {
        return { success: false, code: 'AWAY_FROM_PUB', message: 'New contracts can only be accepted at the pub.' };
    }
    const bounty = BountyCatalog[bountyId];
    if (!bounty) return { success: false, code: 'UNKNOWN_BOUNTY', message: 'That bounty is not posted.' };
    if (adventure.contracts.active[bountyId]) {
        return { success: false, code: 'ALREADY_ACTIVE', message: 'That bounty is already active.' };
    }
    if (adventure.contracts.completed[bountyId] && bounty.repeatable === false) {
        return { success: false, code: 'ALREADY_COMPLETED', message: 'That bounty has already been completed.' };
    }

    adventure.contracts.active[bountyId] = {
        status: 'active',
        progress: 0,
        acceptedAt: Date.now()
    };
    adventure.discoveredLocationIds.push(...(bounty.revealLocationIdsOnAccept || []));
    adventure.unlockedLocationIds.push(...(bounty.unlockLocationIdsOnAccept || []));
    adventure.discoveredLocationIds = uniqueKnownIds(adventure.discoveredLocationIds, LocationCatalog);
    adventure.unlockedLocationIds = uniqueKnownIds(adventure.unlockedLocationIds, LocationCatalog);
    return {
        success: true,
        outcome: 'bounty_accepted',
        bountyId,
        message: `${bounty.title} accepted.`
    };
}

function claimBounty(player, bountyId) {
    const adventure = normalizeAdventureState(player, { recoverInterruptedJourney: false });
    if (adventure.activeJourney) {
        return { success: false, code: 'AWAY_FROM_PUB', message: 'Bounty rewards can only be claimed at the pub.' };
    }
    const bounty = BountyCatalog[bountyId];
    const record = adventure.contracts.active[bountyId];
    if (!bounty || !record) return { success: false, code: 'NOT_ACTIVE', message: 'That bounty is not active.' };
    if (record.status !== 'claimable') {
        return { success: false, code: 'NOT_COMPLETE', message: 'That bounty is not complete yet.' };
    }

    const rewardGold = nonNegativeInt(bounty.rewardGold);
    player.gold = nonNegativeInt(player.gold) + rewardGold;
    delete adventure.contracts.active[bountyId];
    const previous = adventure.contracts.completed[bountyId];
    adventure.contracts.completed[bountyId] = {
        count: previous ? nonNegativeInt(previous.count, 1) + 1 : 1,
        lastCompletedAt: Date.now()
    };
    return {
        success: true,
        outcome: 'bounty_claimed',
        bountyId,
        rewardGold,
        message: `${bounty.title} paid ${rewardGold}g.`
    };
}

function getBountyPublicStatus(adventure, bounty) {
    const active = adventure.contracts.active[bounty.id];
    if (active) return active.status;
    if (adventure.contracts.completed[bounty.id] && bounty.repeatable === false) return 'completed';
    return 'available';
}

function getAdventureSnapshot(player) {
    const adventure = normalizeAdventureState(player, { recoverInterruptedJourney: false });
    const locations = Object.values(LocationCatalog).map(location => ({
        id: location.id,
        name: location.name,
        symbol: location.symbol,
        mapPosition: clone(location.mapPosition),
        description: location.description,
        isHome: location.id === 'pub_hub',
        discovered: adventure.discoveredLocationIds.includes(location.id),
        unlocked: adventure.unlockedLocationIds.includes(location.id)
    }));
    const routes = Object.values(RouteCatalog).map(route => ({
        id: route.id,
        name: route.name,
        fromLocationId: route.fromLocationId,
        toLocationId: route.toLocationId,
        distance: route.distance,
        distanceLabel: route.distanceLabel,
        danger: route.danger,
        dangerLabel: route.dangerLabel,
        description: route.description,
        safeReturnGold: route.safeReturnGold,
        firstReturnGold: route.firstReturnGold,
        unlocked: adventure.unlockedLocationIds.includes(route.toLocationId),
        possibleEncounterNames: route.encounterIds
            .map(encounterId => AuthoredEncounterCatalog[encounterId])
            .filter(Boolean)
            .map(encounter => encounter.name),
        encounterReports: route.encounterIds
            .map(getEncounterPublicSummary)
            .filter(Boolean),
        stats: clone(adventure.routeStats[route.id])
    }));
    const bounties = Object.values(BountyCatalog).map(bounty => {
        const active = adventure.contracts.active[bounty.id];
        const completed = adventure.contracts.completed[bounty.id];
        return {
            id: bounty.id,
            title: bounty.title,
            description: bounty.description,
            routeId: bounty.routeId,
            targetRoundTrips: bounty.targetRoundTrips,
            rewardGold: bounty.rewardGold,
            repeatable: bounty.repeatable !== false,
            status: getBountyPublicStatus(adventure, bounty),
            progress: active ? active.progress : 0,
            completedCount: completed ? completed.count : 0,
            available: !active && !(completed && bounty.repeatable === false)
        };
    });

    return {
        schemaVersion: ADVENTURE_SCHEMA_VERSION,
        adventure: clone(adventure),
        locations,
        routes,
        bounties
    };
}

module.exports = {
    ADVENTURE_SCHEMA_VERSION,
    createInitialAdventureState,
    normalizeAdventureState,
    getAdventureSnapshot,
    beginExpedition,
    beginReturnTrip,
    resolveExpeditionCombatVictory,
    failActiveExpedition,
    acceptBounty,
    claimBounty,
    hasActiveJourney
};
