// --- combatParties.js ---
// Canonical combat party membership and turn ownership helpers.

const PARTY_PLAYER = 'PLAYER';
const PARTY_ENEMY = 'ENEMY';
const PARTY_ROGUE = 'ROGUE';
const CONTROL_MANUAL = 'MANUAL';
const CONTROL_AUTO = 'AUTO';

const PARTY_IDS = Object.freeze([PARTY_PLAYER, PARTY_ENEMY, PARTY_ROGUE]);

function getActorPartyId(actor) {
    if (!actor) return null;
    const partyId = actor.partyId || actor.teamId || null;
    return PARTY_IDS.includes(partyId) ? partyId : null;
}

function getActorControlMode(actor) {
    if (!actor) return null;
    if (actor.controlMode === CONTROL_MANUAL || actor.controlMode === CONTROL_AUTO) {
        return actor.controlMode;
    }
    return actor.kind === 'player' || actor.controller === 'player_companion'
        ? CONTROL_MANUAL
        : CONTROL_AUTO;
}

function normalizePartyActor(actor) {
    if (!actor) return actor;
    const partyId = getActorPartyId(actor);
    if (partyId) {
        actor.partyId = partyId;
        actor.teamId = partyId;
    }
    actor.controlMode = getActorControlMode(actor);
    return actor;
}

function syncCombatParties(combat) {
    if (!combat) return null;
    const parties = {
        [PARTY_PLAYER]: { id: PARTY_PLAYER, memberUids: [] },
        [PARTY_ENEMY]: { id: PARTY_ENEMY, memberUids: [] },
        [PARTY_ROGUE]: { id: PARTY_ROGUE, memberUids: [] }
    };

    (Array.isArray(combat.actors) ? combat.actors : []).forEach(actor => {
        normalizePartyActor(actor);
        const partyId = getActorPartyId(actor);
        if (partyId && actor.uid && !parties[partyId].memberUids.includes(actor.uid)) {
            parties[partyId].memberUids.push(actor.uid);
        }
    });

    combat.parties = parties;
    return parties;
}

function getPartyActors(combat, partyId) {
    if (!combat || !PARTY_IDS.includes(partyId)) return [];
    syncCombatParties(combat);
    const memberUids = new Set(combat.parties[partyId].memberUids);
    return combat.actors.filter(actor => memberUids.has(actor.uid));
}

function isManualPartyActor(actor, partyId = PARTY_PLAYER) {
    return getActorPartyId(actor) === partyId && getActorControlMode(actor) === CONTROL_MANUAL;
}

function getActivePartyActor(combat, options = {}) {
    if (!combat || typeof combat.activeActorUid !== 'string' || !combat.activeActorUid) return null;
    const partyId = options.partyId || PARTY_PLAYER;
    const actor = (Array.isArray(combat.actors) ? combat.actors : [])
        .find(candidate => candidate && candidate.uid === combat.activeActorUid) || null;
    if (!actor || getActorPartyId(actor) !== partyId) return null;
    if (options.controlMode && getActorControlMode(actor) !== options.controlMode) return null;
    if (typeof options.isEligible === 'function' && !options.isEligible(actor)) return null;
    return actor;
}

function activatePartyActor(combat, actor) {
    if (!combat || !actor || typeof actor.uid !== 'string' || !actor.uid) return null;
    normalizePartyActor(actor);
    syncCombatParties(combat);
    const partyId = getActorPartyId(actor);
    if (!partyId || !combat.parties[partyId].memberUids.includes(actor.uid)) return null;
    combat.activeActorUid = actor.uid;
    combat.atbPaused = true;
    return actor;
}

function clearActivePartyActor(combat, expectedUid = null) {
    if (!combat) return false;
    if (expectedUid && combat.activeActorUid !== expectedUid) return false;
    combat.activeActorUid = null;
    combat.atbPaused = false;
    return true;
}

module.exports = {
    PARTY_PLAYER,
    PARTY_ENEMY,
    PARTY_ROGUE,
    CONTROL_MANUAL,
    CONTROL_AUTO,
    getActorPartyId,
    getActorControlMode,
    normalizePartyActor,
    syncCombatParties,
    getPartyActors,
    isManualPartyActor,
    getActivePartyActor,
    activatePartyActor,
    clearActivePartyActor
};
