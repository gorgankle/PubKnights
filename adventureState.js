// --- adventureState.js ---
// Pure, server-owned exploration and journey progression.

const crypto = require('crypto');
const {
    LocationCatalog,
    RouteCatalog,
    AuthoredEncounterCatalog
} = require('./adventureCatalog.js');
const { getChapterOneWorldSnapshot } = require('./chapterOneWorld.js');
const { WorldContractCatalog } = require('./worldCatalog.js');

const ADVENTURE_SCHEMA_VERSION = 2;
const MAX_ROUTE_ENCOUNTER_HISTORY = 3;
const JOURNEY_PHASES = new Set(['OUTBOUND_COMBAT', 'AT_DESTINATION', 'RETURN_COMBAT']);
const RESOLVED_FINALE_STATUSES = new Set(['defeated', 'completed']);
const RESOLVED_CHAPTER_STATUSES = new Set(['epilogue', 'completed']);
const PARTY_POWER_STAT_KEYS = Object.freeze(['vitality', 'maxStamina', 'offense', 'defense', 'speed']);
const PartyPowerBandCatalog = Object.freeze([
    Object.freeze({ id: 'scouting', minimum: 0, maximum: 11 }),
    Object.freeze({ id: 'seasoned', minimum: 12, maximum: 24 }),
    Object.freeze({ id: 'company', minimum: 25, maximum: Number.POSITIVE_INFINITY })
]);

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

function nonNegativeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function sumEquipmentPower(equipment) {
    if (!equipment || typeof equipment !== 'object' || Array.isArray(equipment)) return 0;
    return Object.values(equipment).reduce((total, item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return total;
        return total + PARTY_POWER_STAT_KEYS.reduce(
            (itemTotal, statKey) => itemTotal + nonNegativeNumber(item[statKey]),
            0
        );
    }, 0);
}

function sumActorPower(actor, usesNestedStats = false) {
    if (!actor || typeof actor !== 'object' || Array.isArray(actor)) return 0;
    const stats = usesNestedStats && actor.stats && typeof actor.stats === 'object'
        ? actor.stats
        : actor;
    return PARTY_POWER_STAT_KEYS.reduce(
        (total, statKey) => total + nonNegativeNumber(stats[statKey]),
        sumEquipmentPower(actor.equipment)
    );
}

function getActiveCompanions(player) {
    const roster = player && player.roster && typeof player.roster === 'object'
        ? player.roster
        : {};
    const companions = Array.isArray(roster.companions) ? roster.companions : [];
    const byId = new Map();
    companions.forEach(companion => {
        const instanceId = companion && typeof companion.instanceId === 'string'
            ? companion.instanceId
            : null;
        if (instanceId && companion.hired !== false && !byId.has(instanceId)) {
            byId.set(instanceId, companion);
        }
    });
    const hasCanonicalActiveIds = Object.prototype.hasOwnProperty.call(roster, 'activeIds');
    const activeIds = hasCanonicalActiveIds
        ? (Array.isArray(roster.activeIds) ? roster.activeIds : [])
        : companions
            .filter(companion => companion && companion.active === true)
            .map(companion => companion.instanceId);
    const seen = new Set();
    return activeIds.reduce((active, instanceId) => {
        if (typeof instanceId !== 'string' || seen.has(instanceId) || !byId.has(instanceId)) return active;
        seen.add(instanceId);
        active.push(byId.get(instanceId));
        return active;
    }, []);
}

function calculatePartyPower(player) {
    if (!player || typeof player !== 'object' || Array.isArray(player)) return 0;
    const power = sumActorPower(player)
        + getActiveCompanions(player).reduce(
            (total, companion) => total + sumActorPower(companion, true),
            0
        );
    return Math.max(0, Math.floor(power));
}

function getPartyPowerBand(power) {
    const normalizedPower = Math.max(0, Math.floor(nonNegativeNumber(power)));
    return PartyPowerBandCatalog.find(band => (
        normalizedPower >= band.minimum && normalizedPower <= band.maximum
    )) || PartyPowerBandCatalog[0];
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
    const discoveredRouteIds = [];
    const unlockedRouteIds = [];
    Object.values(LocationCatalog).forEach(location => {
        if (location.initiallyDiscovered) discoveredLocationIds.push(location.id);
        if (location.initiallyUnlocked) unlockedLocationIds.push(location.id);
    });

    const routeStats = {};
    const routeEncounterHistory = {};
    Object.keys(RouteCatalog).forEach(routeId => {
        const route = RouteCatalog[routeId];
        if (route.initiallyDiscovered) discoveredRouteIds.push(routeId);
        if (route.initiallyUnlocked) unlockedRouteIds.push(routeId);
        routeStats[routeId] = {
            successfulRoundTrips: 0,
            failedTrips: 0
        };
        routeEncounterHistory[routeId] = [];
    });

    return {
        schemaVersion: ADVENTURE_SCHEMA_VERSION,
        discoveredLocationIds,
        unlockedLocationIds,
        discoveredRouteIds,
        unlockedRouteIds,
        totalSafeReturns: 0,
        routeStats,
        routeEncounterHistory,
        observedEncounterIdsByRoute: normalizeObservedEncounterIds(null, routeEncounterHistory),
        activeJourney: null,
        latestReturnReport: null
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

function getRouteEncounterIds(route) {
    return (route && Array.isArray(route.encounterIds) ? route.encounterIds : [])
        .filter(encounterId => AuthoredEncounterCatalog[encounterId]);
}

function getWorldFactSet(player, options = {}) {
    const source = Object.prototype.hasOwnProperty.call(options, 'worldFacts')
        && options.worldFacts != null
        ? options.worldFacts
        : (player && player.world && player.world.facts);
    const facts = new Set();
    if (Array.isArray(source)) {
        source.forEach(entry => {
            if (typeof entry === 'string' && entry) facts.add(entry);
            if (entry && typeof entry === 'object' && typeof entry.id === 'string') facts.add(entry.id);
        });
        return facts;
    }
    if (source && typeof source === 'object') {
        Object.entries(source).forEach(([factId, value]) => {
            if (value === true) facts.add(factId);
        });
    }
    return facts;
}

function getSelectedChapterPreparationOptionId(player, options = {}) {
    if (typeof options.preparationOptionId === 'string') return options.preparationOptionId;
    const finale = player
        && player.world
        && player.world.chapters
        && player.world.chapters.chapter_one
        && player.world.chapters.chapter_one.finale;
    return finale && typeof finale.selectedPreparationOptionId === 'string'
        ? finale.selectedPreparationOptionId
        : null;
}

function getWorldChapterRecord(player, chapterId = 'chapter_one') {
    const chapters = player
        && player.world
        && player.world.chapters
        && typeof player.world.chapters === 'object'
        ? player.world.chapters
        : {};
    const chapter = chapters[chapterId];
    return chapter && typeof chapter === 'object' ? chapter : null;
}

function getWorldActiveContract(player, contractId) {
    const active = player
        && player.world
        && player.world.contracts
        && player.world.contracts.active
        && typeof player.world.contracts.active === 'object'
        ? player.world.contracts.active
        : {};
    const contract = active[contractId];
    return contract && typeof contract === 'object' ? contract : null;
}

function isAdventureRequirementMet(requirement, player, adventure, options = {}) {
    if (!requirement || typeof requirement !== 'object' || Array.isArray(requirement)) return false;
    const type = String(requirement.type || '').toLowerCase();
    if (type === 'world_fact') {
        return getWorldFactSet(player, options).has(requirement.factId);
    }
    if (type === 'route_safe_returns') {
        const stats = adventure && adventure.routeStats && adventure.routeStats[requirement.routeId];
        const minimum = Math.max(1, nonNegativeInt(requirement.minimum, 1));
        return nonNegativeInt(stats && stats.successfulRoundTrips) >= minimum;
    }
    if (type === 'chapter_preparation_option') {
        return getSelectedChapterPreparationOptionId(player, options) === requirement.optionId;
    }
    if (type === 'chapter_finale_status') {
        const chapter = getWorldChapterRecord(player, requirement.chapterId);
        const finaleStatus = String(chapter && chapter.finale && chapter.finale.status || '').toLowerCase();
        return finaleStatus === String(requirement.status || '').toLowerCase();
    }
    if (type === 'world_contract_active') {
        return !!getWorldActiveContract(player, requirement.contractId);
    }
    if (type === 'total_safe_returns') {
        const minimum = Math.max(1, nonNegativeInt(requirement.minimum, 1));
        return nonNegativeInt(adventure && adventure.totalSafeReturns) >= minimum;
    }
    if (type === 'location_discovered') {
        return !!(adventure
            && Array.isArray(adventure.discoveredLocationIds)
            && adventure.discoveredLocationIds.includes(requirement.locationId));
    }
    if (type === 'route_unlocked') {
        return !!(adventure
            && Array.isArray(adventure.unlockedRouteIds)
            && adventure.unlockedRouteIds.includes(requirement.routeId));
    }
    return false;
}

function areAdventureRequirementsMet(requirements, player, adventure, options = {}) {
    if (!requirements) return true;
    if (Array.isArray(requirements)) {
        return requirements.every(requirement => (
            isAdventureRequirementMet(requirement, player, adventure, options)
        ));
    }
    if (typeof requirements !== 'object') return false;
    if (requirements.type) {
        return isAdventureRequirementMet(requirements, player, adventure, options);
    }
    const all = Array.isArray(requirements.all) ? requirements.all : [];
    const any = Array.isArray(requirements.any) ? requirements.any : [];
    return all.every(requirement => (
        isAdventureRequirementMet(requirement, player, adventure, options)
    )) && (any.length === 0 || any.some(requirement => (
        isAdventureRequirementMet(requirement, player, adventure, options)
    )));
}

function getFinaleRouteLaunchGate(player, route) {
    if (!route || route.routeRole !== 'finale') return { allowed: true, resolved: false };

    const chapterId = route.finaleChapterId || 'chapter_one';
    const contractId = route.requiredActiveContractId || 'watchhouse_reckoning';
    const chapter = getWorldChapterRecord(player, chapterId);
    const finale = chapter && chapter.finale && typeof chapter.finale === 'object'
        ? chapter.finale
        : {};
    const finaleStatus = String(finale.status || 'locked').toLowerCase();
    const chapterStatus = String(chapter && chapter.status || 'active').toLowerCase();
    const activeContract = getWorldActiveContract(player, contractId);
    const completedContract = !!(
        player
        && player.world
        && player.world.contracts
        && player.world.contracts.completed
        && player.world.contracts.completed[contractId]
    );
    const captainObjective = activeContract
        && activeContract.objectives
        && activeContract.objectives.defeat_watchhouse_captain;
    const resolved = RESOLVED_FINALE_STATUSES.has(finaleStatus)
        || RESOLVED_CHAPTER_STATUSES.has(chapterStatus)
        || completedContract
        || !!(captainObjective && captainObjective.complete === true);

    if (resolved) {
        return {
            allowed: false,
            resolved: true,
            code: 'FINALE_RESOLVED',
            message: 'The Watchhouse Captain has already been defeated. That assault cannot be repeated.'
        };
    }
    if (finaleStatus !== 'prepared' || !finale.selectedPreparationOptionId || !activeContract) {
        return {
            allowed: false,
            resolved: false,
            code: 'FINALE_NOT_READY',
            message: 'Accept the Watchhouse contract and choose a prepared approach at the pub first.'
        };
    }
    return { allowed: true, resolved: false };
}

function addUniqueId(target, id) {
    if (!Array.isArray(target) || typeof id !== 'string' || target.includes(id)) return false;
    target.push(id);
    return true;
}

function applyAdventureProgressionRequirements(player, adventure, options = {}) {
    const changes = {
        discoveredLocationIds: [],
        unlockedLocationIds: [],
        discoveredRouteIds: [],
        unlockedRouteIds: []
    };
    if (!adventure || typeof adventure !== 'object') return changes;

    const maxPasses = Object.keys(LocationCatalog).length + Object.keys(RouteCatalog).length + 1;
    for (let pass = 0; pass < maxPasses; pass++) {
        let changed = false;
        Object.values(LocationCatalog).forEach(location => {
            if (location.chapterStatus !== 'active') return;
            if (location.discoveryRequirements
                && areAdventureRequirementsMet(location.discoveryRequirements, player, adventure, options)
                && addUniqueId(adventure.discoveredLocationIds, location.id)) {
                changes.discoveredLocationIds.push(location.id);
                changed = true;
            }
            if (location.unlockRequirements
                && areAdventureRequirementsMet(location.unlockRequirements, player, adventure, options)) {
                if (addUniqueId(adventure.unlockedLocationIds, location.id)) {
                    changes.unlockedLocationIds.push(location.id);
                    changed = true;
                }
                if (addUniqueId(adventure.discoveredLocationIds, location.id)) {
                    changes.discoveredLocationIds.push(location.id);
                    changed = true;
                }
            }
        });
        Object.values(RouteCatalog).forEach(route => {
            if (route.chapterStatus !== 'active') return;
            if (route.discoveryRequirements
                && areAdventureRequirementsMet(route.discoveryRequirements, player, adventure, options)
                && addUniqueId(adventure.discoveredRouteIds, route.id)) {
                changes.discoveredRouteIds.push(route.id);
                changed = true;
            }
            if (route.unlockRequirements
                && areAdventureRequirementsMet(route.unlockRequirements, player, adventure, options)) {
                if (addUniqueId(adventure.unlockedRouteIds, route.id)) {
                    changes.unlockedRouteIds.push(route.id);
                    changed = true;
                }
                if (addUniqueId(adventure.discoveredRouteIds, route.id)) {
                    changes.discoveredRouteIds.push(route.id);
                    changed = true;
                }
            }
        });
        if (!changed) break;
    }
    return changes;
}

function normalizeRouteEncounterHistory(source) {
    const sourceHistory = source && typeof source === 'object' && !Array.isArray(source)
        ? source
        : {};
    const normalized = {};

    Object.values(RouteCatalog).forEach(route => {
        const eligibleEncounterIds = new Set(getRouteEncounterIds(route));
        const savedHistory = Array.isArray(sourceHistory[route.id])
            ? sourceHistory[route.id]
            : (typeof sourceHistory[route.id] === 'string' ? [sourceHistory[route.id]] : []);
        normalized[route.id] = savedHistory
            .filter(encounterId => typeof encounterId === 'string' && eligibleEncounterIds.has(encounterId))
            .slice(-MAX_ROUTE_ENCOUNTER_HISTORY);
    });

    return normalized;
}

function normalizeObservedEncounterIds(source, routeHistory) {
    const sourceObserved = source && typeof source === 'object' && !Array.isArray(source)
        ? source
        : {};
    const normalized = {};
    Object.values(RouteCatalog).forEach(route => {
        const eligibleEncounterIds = new Set(getRouteEncounterIds(route));
        normalized[route.id] = uniqueKnownIds([
            ...(Array.isArray(sourceObserved[route.id]) ? sourceObserved[route.id] : []),
            ...(Array.isArray(routeHistory && routeHistory[route.id]) ? routeHistory[route.id] : [])
        ], AuthoredEncounterCatalog).filter(encounterId => eligibleEncounterIds.has(encounterId));
    });
    return normalized;
}

function recordRouteEncounter(adventure, routeId, encounterId) {
    const route = RouteCatalog[routeId];
    if (!adventure || !route || !getRouteEncounterIds(route).includes(encounterId)) return;
    if (!adventure.routeEncounterHistory || typeof adventure.routeEncounterHistory !== 'object') {
        adventure.routeEncounterHistory = normalizeRouteEncounterHistory(null);
    }
    const history = Array.isArray(adventure.routeEncounterHistory[routeId])
        ? adventure.routeEncounterHistory[routeId]
        : [];
    history.push(encounterId);
    adventure.routeEncounterHistory[routeId] = history.slice(-MAX_ROUTE_ENCOUNTER_HISTORY);
    adventure.observedEncounterIdsByRoute = normalizeObservedEncounterIds(
        adventure.observedEncounterIdsByRoute,
        adventure.routeEncounterHistory
    );
}

function normalizeActiveJourney(source, player) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
    const route = RouteCatalog[source.routeId];
    const phase = String(source.phase || '').toUpperCase();
    const encounterId = typeof source.currentEncounterId === 'string'
        ? source.currentEncounterId
        : source.encounterId;
    if (!route || !JOURNEY_PHASES.has(phase)) return null;
    if (phase !== 'AT_DESTINATION' && !AuthoredEncounterCatalog[encounterId]) return null;

    const partyPower = Number.isFinite(Number(source.partyPower))
        ? Math.max(0, Math.floor(Number(source.partyPower)))
        : calculatePartyPower(player);
    const requestedBandId = typeof source.partyPowerBandId === 'string'
        ? source.partyPowerBandId
        : null;
    const partyPowerBandId = PartyPowerBandCatalog.some(band => band.id === requestedBandId)
        ? requestedBandId
        : getPartyPowerBand(partyPower).id;
    const preparationId = typeof source.preparationId === 'string'
        ? source.preparationId.slice(0, 40)
        : null;

    return {
        journeyId: typeof source.journeyId === 'string' && source.journeyId
            ? source.journeyId.slice(0, 80)
            : `journey_${crypto.randomBytes(8).toString('hex')}`,
        routeId: route.id,
        originLocationId: route.expeditionOriginLocationId || route.fromLocationId,
        destinationLocationId: route.toLocationId,
        phase,
        direction: phase === 'RETURN_COMBAT' ? 'RETURN' : (phase === 'OUTBOUND_COMBAT' ? 'OUTBOUND' : null),
        reachedDestination: phase !== 'OUTBOUND_COMBAT',
        currentEncounterId: phase === 'AT_DESTINATION' ? null : encounterId,
        partyPower,
        partyPowerBandId,
        preparationId,
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

function normalizeWorldContractUpdates(source) {
    const updates = [];
    const seen = new Set();
    (Array.isArray(source) ? source.slice(0, 48) : []).forEach(value => {
        if (typeof value !== 'string' || value.length > 160) return;
        const match = /^([a-z0-9_]+):([a-z0-9_]+)$/i.exec(value.trim());
        if (!match) return;
        const contract = WorldContractCatalog[match[1]];
        if (!contract || !Array.isArray(contract.objectives)) return;
        const objective = contract.objectives.find(candidate => candidate.id === match[2]);
        if (!objective) return;
        const updateId = `${contract.id}:${objective.id}`;
        if (seen.has(updateId)) return;
        seen.add(updateId);
        updates.push(updateId);
    });
    return updates.slice(0, 12);
}

function createReturnReport(journey, outcome, details = {}, now = Date.now()) {
    const route = journey && RouteCatalog[journey.routeId];
    if (!route || !['safe_return', 'expedition_failed'].includes(outcome)) return null;
    const encounter = getEncounterPublicSummary(journey.currentEncounterId);

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
        worldContractUpdates: outcome === 'safe_return'
            ? normalizeWorldContractUpdates(details.worldContractUpdates)
            : [],
        rewardChoiceOffered: outcome === 'safe_return' && details.rewardChoiceOffered === true,
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
        worldContractUpdates: outcome === 'safe_return'
            ? normalizeWorldContractUpdates(source.worldContractUpdates)
            : [],
        rewardChoiceOffered: outcome === 'safe_return' && source.rewardChoiceOffered === true,
        failureReason: outcome === 'expedition_failed'
            ? String(source.failureReason || 'failed').slice(0, 40)
            : null,
        returnedAt: cleanTimestamp(source.returnedAt) || Date.now()
    };
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

function clearExpeditionEscrow(player) {
    if (!player || typeof player !== 'object') return;
    player.pendingGold = 0;
    player.pendingXp = 0;
    player.pendingLoot = [];
    delete player.pendingMercenaryXpContext;
}

function normalizeAdventureState(player, options = {}) {
    if (!player || typeof player !== 'object') return createInitialAdventureState();
    const initial = createInitialAdventureState();
    const source = player.adventure && typeof player.adventure === 'object'
        ? player.adventure
        : {};
    const routeEncounterHistory = normalizeRouteEncounterHistory(source.routeEncounterHistory);

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
        discoveredRouteIds: uniqueKnownIds([
            ...initial.discoveredRouteIds,
            ...(Array.isArray(source.discoveredRouteIds) ? source.discoveredRouteIds : [])
        ], RouteCatalog),
        unlockedRouteIds: uniqueKnownIds([
            ...initial.unlockedRouteIds,
            ...(Array.isArray(source.unlockedRouteIds) ? source.unlockedRouteIds : [])
        ], RouteCatalog),
        totalSafeReturns: nonNegativeInt(source.totalSafeReturns != null
            ? source.totalSafeReturns
            : source.safeReturns),
        routeStats: normalizeRouteStats(source.routeStats),
        routeEncounterHistory,
        observedEncounterIdsByRoute: normalizeObservedEncounterIds(
            source.observedEncounterIdsByRoute,
            routeEncounterHistory
        ),
        activeJourney: normalizeActiveJourney(source.activeJourney, player),
        latestReturnReport: normalizeReturnReport(source.latestReturnReport)
    };

    if (options.skipProgressionReconcile !== true) {
        applyAdventureProgressionRequirements(player, adventure, options);
    }

    if (adventure.activeJourney && adventure.activeJourney.currentEncounterId) {
        const routeHistory = adventure.routeEncounterHistory[adventure.activeJourney.routeId] || [];
        if (routeHistory[routeHistory.length - 1] !== adventure.activeJourney.currentEncounterId) {
            recordRouteEncounter(
                adventure,
                adventure.activeJourney.routeId,
                adventure.activeJourney.currentEncounterId
            );
        }
    }

    if (options.recoverInterruptedJourney === true && adventure.activeJourney) {
        if (failJourneyRecord(adventure, 'interrupted')) clearExpeditionEscrow(player);
    }
    player.adventure = adventure;
    return adventure;
}

function reconcileAdventureProgression(player, options = {}) {
    if (!player || typeof player !== 'object') {
        return {
            adventure: createInitialAdventureState(),
            changes: {
                discoveredLocationIds: [],
                unlockedLocationIds: [],
                discoveredRouteIds: [],
                unlockedRouteIds: []
            }
        };
    }
    const existingAdventure = player.adventure && typeof player.adventure === 'object'
        && player.adventure.schemaVersion === ADVENTURE_SCHEMA_VERSION
        && player.adventure.routeStats && typeof player.adventure.routeStats === 'object'
        ? player.adventure
        : null;
    const adventure = options.adventure && typeof options.adventure === 'object'
        ? options.adventure
        : (existingAdventure || normalizeAdventureState(player, {
            recoverInterruptedJourney: false,
            skipProgressionReconcile: true,
            worldFacts: options.worldFacts
        }));
    const changes = applyAdventureProgressionRequirements(player, adventure, options);
    player.adventure = adventure;
    return { adventure, changes };
}

function hasActiveJourney(player) {
    return !!(player && player.adventure && player.adventure.activeJourney);
}

function hasUnclaimedCombatRewards(player) {
    if (!player || typeof player !== 'object') return false;
    return nonNegativeInt(player.pendingGold) > 0
        || nonNegativeInt(player.pendingXp) > 0
        || (Array.isArray(player.pendingLoot) && player.pendingLoot.length > 0);
}

function getRandomFunction(options) {
    if (typeof options === 'function') return options;
    if (options && typeof options.random === 'function') return options.random;
    return Math.random;
}

function getRequestedPartyPower(player, options = {}) {
    if (Number.isFinite(Number(options.partyPower))) {
        return Math.max(0, Math.floor(Number(options.partyPower)));
    }
    return calculatePartyPower(player);
}

function getRequestedPartyPowerBand(partyPower, options = {}) {
    const requestedBandId = typeof options.partyPowerBandId === 'string'
        ? options.partyPowerBandId
        : null;
    return PartyPowerBandCatalog.find(band => band.id === requestedBandId)
        || getPartyPowerBand(partyPower);
}

function filterRouteEncounterIds(route, encounterIds) {
    const routeEncounterIds = new Set(getRouteEncounterIds(route));
    return (Array.isArray(encounterIds) ? encounterIds : [])
        .filter(encounterId => routeEncounterIds.has(encounterId));
}

function resolveRouteEncounterSelection(routeOrId, player, options = {}) {
    const route = typeof routeOrId === 'string' ? RouteCatalog[routeOrId] : routeOrId;
    if (!route) {
        return {
            encounterIds: [],
            partyPower: getRequestedPartyPower(player, options),
            partyPowerBandId: 'scouting',
            preparationId: null
        };
    }
    const partyPower = getRequestedPartyPower(player, options);
    const partyPowerBand = getRequestedPartyPowerBand(partyPower, options);
    const direction = String(options.direction || 'OUTBOUND').toUpperCase();
    const adventure = options.adventure || (player && player.adventure) || createInitialAdventureState();

    if (direction === 'RETURN') {
        const returnEncounterIds = filterRouteEncounterIds(route, route.returnEncounterIds);
        if (returnEncounterIds.length) {
            return {
                encounterIds: returnEncounterIds,
                partyPower,
                partyPowerBandId: partyPowerBand.id,
                preparationId: null
            };
        }
    }

    if (direction !== 'RETURN' && Array.isArray(route.preparationVariants)) {
        const variant = route.preparationVariants.find(candidate => (
            candidate
            && areAdventureRequirementsMet(candidate.requirements, player, adventure, options)
            && filterRouteEncounterIds(route, candidate.outboundEncounterIds).length > 0
        ));
        if (variant) {
            return {
                encounterIds: filterRouteEncounterIds(route, variant.outboundEncounterIds),
                partyPower,
                partyPowerBandId: partyPowerBand.id,
                preparationId: variant.id || null
            };
        }
    }

    const bandEncounterIds = filterRouteEncounterIds(
        route,
        route.encounterBands && route.encounterBands[partyPowerBand.id]
    );
    return {
        encounterIds: bandEncounterIds.length ? bandEncounterIds : getRouteEncounterIds(route),
        partyPower,
        partyPowerBandId: partyPowerBand.id,
        preparationId: null
    };
}

function resolveRouteEncounterPool(routeOrId, player, options = {}) {
    return resolveRouteEncounterSelection(routeOrId, player, options).encounterIds.slice();
}

function chooseRouteEncounter(route, player, options, history = []) {
    const selection = resolveRouteEncounterSelection(route, player, options);
    const encounterIds = selection.encounterIds;
    if (!encounterIds.length) return null;
    const lastEncounterId = Array.isArray(history) ? history[history.length - 1] : null;
    const eligibleEncounterIds = encounterIds.length > 1 && encounterIds.includes(lastEncounterId)
        ? encounterIds.filter(encounterId => encounterId !== lastEncounterId)
        : encounterIds;
    const random = getRandomFunction(options);
    const roll = Number(random());
    const bounded = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999, roll)) : 0;
    return {
        encounterId: eligibleEncounterIds[Math.floor(bounded * eligibleEncounterIds.length)],
        partyPower: selection.partyPower,
        partyPowerBandId: selection.partyPowerBandId,
        preparationId: selection.preparationId
    };
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
        encounterId: journey.currentEncounterId,
        partyPower: journey.partyPower,
        partyPowerBandId: journey.partyPowerBandId,
        preparationId: journey.preparationId
    };
}

function beginExpedition(player, routeId, options = {}) {
    const adventure = normalizeAdventureState(player, {
        recoverInterruptedJourney: false,
        worldFacts: options.worldFacts
    });
    if (adventure.activeJourney) {
        return { success: false, code: 'ACTIVE_JOURNEY', message: 'Finish or abandon the current expedition first.' };
    }
    if (hasUnclaimedCombatRewards(player)) {
        return {
            success: false,
            code: 'UNCLAIMED_REWARDS',
            message: 'Claim the rewards waiting at the pub before beginning another expedition.'
        };
    }
    const route = RouteCatalog[routeId];
    if (!route) return { success: false, code: 'UNKNOWN_ROUTE', message: 'That road is not in the guild ledger.' };
    if (route.chapterStatus !== 'active') {
        return { success: false, code: 'INACTIVE_ROUTE', message: 'That road is not available in this chapter.' };
    }
    const finaleGate = getFinaleRouteLaunchGate(player, route);
    if (!finaleGate.allowed) {
        return {
            success: false,
            code: finaleGate.code,
            message: finaleGate.message
        };
    }
    if (!adventure.unlockedRouteIds.includes(route.id)) {
        return { success: false, code: 'LOCKED_ROUTE', message: 'That road has not been unlocked.' };
    }
    const selection = chooseRouteEncounter(
        route,
        player,
        {
            ...options,
            adventure,
            direction: 'OUTBOUND'
        },
        adventure.routeEncounterHistory[route.id]
    );
    if (!selection) {
        return { success: false, code: 'EMPTY_ROUTE', message: 'That route has no valid encounter reports.' };
    }
    const { encounterId } = selection;

    const journey = {
        journeyId: `journey_${crypto.randomBytes(8).toString('hex')}`,
        routeId: route.id,
        originLocationId: route.expeditionOriginLocationId || route.fromLocationId,
        destinationLocationId: route.toLocationId,
        phase: 'OUTBOUND_COMBAT',
        direction: 'OUTBOUND',
        reachedDestination: false,
        currentEncounterId: encounterId,
        partyPower: selection.partyPower,
        partyPowerBandId: selection.partyPowerBandId,
        preparationId: selection.preparationId,
        startedAt: Date.now()
    };
    recordRouteEncounter(adventure, route.id, encounterId);
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
    const adventure = normalizeAdventureState(player, {
        recoverInterruptedJourney: false,
        worldFacts: options.worldFacts
    });
    const journey = adventure.activeJourney;
    if (!journey) return { success: false, code: 'NO_ACTIVE_JOURNEY', message: 'There is no expedition to return from.' };
    if (journey.phase !== 'AT_DESTINATION' || !journey.reachedDestination) {
        return { success: false, code: 'NOT_AT_DESTINATION', message: 'The party has not reached its destination.' };
    }
    const route = RouteCatalog[journey.routeId];
    const selection = chooseRouteEncounter(
        route,
        player,
        {
            ...options,
            adventure,
            direction: 'RETURN',
            partyPower: journey.partyPower,
            partyPowerBandId: journey.partyPowerBandId
        },
        adventure.routeEncounterHistory[route.id]
    );
    if (!selection) return { success: false, code: 'EMPTY_ROUTE', message: 'The return route has no valid encounter reports.' };
    const { encounterId } = selection;

    recordRouteEncounter(adventure, route.id, encounterId);
    journey.phase = 'RETURN_COMBAT';
    journey.direction = 'RETURN';
    journey.currentEncounterId = encounterId;
    journey.preparationId = selection.preparationId;
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

function applyFirstReturnUnlocks(adventure, route) {
    adventure.discoveredLocationIds.push(...(route.firstReturnDiscoverLocationIds || []));
    adventure.unlockedLocationIds.push(...(route.firstReturnUnlockLocationIds || []));
    adventure.discoveredRouteIds.push(...(route.firstReturnDiscoverRouteIds || []));
    adventure.unlockedRouteIds.push(...(route.firstReturnUnlockRouteIds || []));
    adventure.discoveredLocationIds = uniqueKnownIds(adventure.discoveredLocationIds, LocationCatalog);
    adventure.unlockedLocationIds = uniqueKnownIds(adventure.unlockedLocationIds, LocationCatalog);
    adventure.discoveredRouteIds = uniqueKnownIds(adventure.discoveredRouteIds, RouteCatalog);
    adventure.unlockedRouteIds = uniqueKnownIds(adventure.unlockedRouteIds, RouteCatalog);
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
    if (firstReturn) applyFirstReturnUnlocks(adventure, route);
    const progressionChanges = applyAdventureProgressionRequirements(player, adventure);
    adventure.latestReturnReport = createReturnReport(
        journey,
        'safe_return',
        {
            rewardGold,
            firstReturn
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
        progressionChanges
    };
}

function failActiveExpedition(player, reason = 'failed') {
    const adventure = normalizeAdventureState(player, { recoverInterruptedJourney: false });
    const journey = failJourneyRecord(adventure, reason);
    if (!journey) return { success: false, code: 'NO_ACTIVE_JOURNEY', message: 'There is no active expedition.' };
    // Every reward earned between departure and safe return is one expedition
    // escrow. Any failure path—including abandonment and reconnect recovery—
    // forfeits it atomically.
    clearExpeditionEscrow(player);
    return {
        success: true,
        outcome: 'expedition_failed',
        reason: String(reason || 'failed').slice(0, 40),
        routeId: journey.routeId,
        message: 'The expedition ended without a safe return. Existing discoveries were preserved.'
    };
}

function getAdventureSnapshot(player) {
    const adventure = normalizeAdventureState(player, { recoverInterruptedJourney: false });
    const publicAdventure = clone(adventure);
    delete publicAdventure.routeEncounterHistory;
    delete publicAdventure.observedEncounterIdsByRoute;
    publicAdventure.unlockedRouteIds = publicAdventure.unlockedRouteIds.filter(routeId => {
        const route = RouteCatalog[routeId];
        return route && getFinaleRouteLaunchGate(player, route).allowed;
    });
    publicAdventure.unlockedLocationIds = publicAdventure.unlockedLocationIds.filter(locationId => {
        const finaleRoutes = Object.values(RouteCatalog).filter(route => (
            route.routeRole === 'finale' && route.toLocationId === locationId
        ));
        return finaleRoutes.length === 0 || finaleRoutes.some(route => (
            adventure.unlockedRouteIds.includes(route.id)
            && getFinaleRouteLaunchGate(player, route).allowed
        ));
    });
    const discoveredLocationIds = new Set(adventure.discoveredLocationIds);
    const discoveredRouteIds = new Set(adventure.discoveredRouteIds);
    publicAdventure.routeStats = Object.fromEntries(
        Object.entries(publicAdventure.routeStats || {})
            .filter(([routeId]) => discoveredRouteIds.has(routeId))
    );
    const locations = Object.values(LocationCatalog)
        .filter(location => (
            location.chapterStatus === 'active'
            && discoveredLocationIds.has(location.id)
        ))
        .map(location => ({
            id: location.id,
            name: location.name,
            symbol: location.symbol,
            mapPosition: clone(location.mapPosition),
            description: location.description,
            isHome: location.id === 'pub_hub',
            discovered: true,
            unlocked: publicAdventure.unlockedLocationIds.includes(location.id)
        }));
    const routes = Object.values(RouteCatalog)
        .filter(route => (
            route.chapterStatus === 'active'
            && discoveredRouteIds.has(route.id)
            && discoveredLocationIds.has(route.fromLocationId)
            && discoveredLocationIds.has(route.toLocationId)
        ))
        .map(route => {
            const observedIds = new Set(adventure.observedEncounterIdsByRoute[route.id] || []);
            const finaleGate = getFinaleRouteLaunchGate(player, route);
            const encounterReports = route.encounterIds
                .filter(encounterId => observedIds.has(encounterId))
                .map(getEncounterPublicSummary)
                .filter(Boolean);
            return {
                id: route.id,
                name: route.name,
                fromLocationId: route.fromLocationId,
                toLocationId: route.toLocationId,
                distance: route.distance,
                distanceLabel: route.distanceLabel,
                danger: route.danger,
                dangerLabel: route.dangerLabel,
                routeRole: route.routeRole || 'expedition',
                bidirectional: route.bidirectional === true,
                description: route.description,
                newcomerLabel: route.newcomerLabel,
                newcomerHint: route.newcomerHint,
                safeReturnGold: route.safeReturnGold,
                firstReturnGold: route.firstReturnGold,
                unlocked: adventure.unlockedRouteIds.includes(route.id) && finaleGate.allowed,
                resolved: finaleGate.resolved,
                encounterReports,
                unconfirmedEncounterCount: Math.max(0, route.encounterIds.length - encounterReports.length),
                stats: clone(adventure.routeStats[route.id])
            };
        });

    const world = getChapterOneWorldSnapshot(player);
    const partyPower = calculatePartyPower(player);
    return {
        schemaVersion: ADVENTURE_SCHEMA_VERSION,
        partyPower: {
            score: partyPower,
            bandId: getPartyPowerBand(partyPower).id
        },
        adventure: publicAdventure,
        locations,
        routes,
        contracts: world.contracts,
        world
    };
}

module.exports = {
    ADVENTURE_SCHEMA_VERSION,
    PartyPowerBandCatalog,
    createInitialAdventureState,
    normalizeAdventureState,
    reconcileAdventureProgression,
    isAdventureRequirementMet,
    areAdventureRequirementsMet,
    calculatePartyPower,
    getPartyPowerBand,
    resolveRouteEncounterPool,
    resolveRouteEncounterSelection,
    getAdventureSnapshot,
    beginExpedition,
    beginReturnTrip,
    resolveExpeditionCombatVictory,
    failActiveExpedition,
    hasActiveJourney,
    hasUnclaimedCombatRewards
};
