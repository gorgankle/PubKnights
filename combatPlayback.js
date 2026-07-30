// --- combatPlayback.js ---
// Tokenized, bounded presentation locks for server-authoritative combat.

const DEFAULT_COMBAT_PLAYBACK_TIMEOUT_MS = 15000;

let nextPlaybackSerial = 1;

function normalizeNow(now) {
    const numeric = Number(now);
    return Number.isFinite(numeric) ? numeric : Date.now();
}

function normalizeTimeout(timeoutMs) {
    const numeric = Number(timeoutMs);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return DEFAULT_COMBAT_PLAYBACK_TIMEOUT_MS;
    }
    return Math.max(250, Math.trunc(numeric));
}

function createPlaybackId() {
    const serial = nextPlaybackSerial;
    nextPlaybackSerial = nextPlaybackSerial >= Number.MAX_SAFE_INTEGER
        ? 1
        : nextPlaybackSerial + 1;
    return `combat-playback-${serial}`;
}

function clearCombatPlaybackLock(combat) {
    if (!combat) return false;
    combat.playbackLock = false;
    combat.playbackId = null;
    combat.playbackExpiresAt = 0;
    return true;
}

function beginCombatPlayback(combat, options = {}) {
    if (!combat) return null;
    const now = normalizeNow(options.now);
    const timeoutMs = normalizeTimeout(options.timeoutMs);
    const playbackId = createPlaybackId();

    combat.playbackLock = true;
    combat.playbackId = playbackId;
    combat.playbackExpiresAt = now + timeoutMs;
    return playbackId;
}

function releaseExpiredCombatPlayback(combat, now = Date.now()) {
    if (!combat || combat.playbackLock !== true) return false;
    const expiresAt = Number(combat.playbackExpiresAt);
    if (!Number.isFinite(expiresAt) || normalizeNow(now) < expiresAt) {
        return false;
    }
    clearCombatPlaybackLock(combat);
    return true;
}

function isCombatPlaybackLocked(combat, now = Date.now()) {
    releaseExpiredCombatPlayback(combat, now);
    return Boolean(combat && combat.playbackLock === true);
}

function acknowledgeCombatPlayback(combat, playbackId, now = Date.now()) {
    if (!combat) {
        return { released: false, reason: 'missing-combat' };
    }

    if (releaseExpiredCombatPlayback(combat, now)) {
        return { released: false, reason: 'expired' };
    }

    if (combat.playbackLock !== true || !combat.playbackId) {
        return { released: false, reason: 'not-locked' };
    }

    if (
        typeof playbackId !== 'string'
        || playbackId.length === 0
        || playbackId !== combat.playbackId
    ) {
        return { released: false, reason: 'stale-playback' };
    }

    clearCombatPlaybackLock(combat);
    return { released: true, reason: 'acknowledged' };
}

module.exports = {
    DEFAULT_COMBAT_PLAYBACK_TIMEOUT_MS,
    beginCombatPlayback,
    acknowledgeCombatPlayback,
    releaseExpiredCombatPlayback,
    isCombatPlaybackLocked,
    clearCombatPlaybackLock
};
