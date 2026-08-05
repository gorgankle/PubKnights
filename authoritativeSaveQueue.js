// --- authoritativeSaveQueue.js ---
// Serializes server-authored save snapshots per account so an older async
// database write can never finish after and overwrite a newer transition.

function createAuthoritativeSaveQueue({ createSnapshot, writeSnapshot, onError } = {}) {
    if (typeof createSnapshot !== 'function' || typeof writeSnapshot !== 'function') {
        throw new TypeError('Authoritative save queue requires snapshot and write functions.');
    }

    const pendingByUser = new Map();

    function enqueue(player, metadata = {}) {
        const username = String(player && player.username || '').trim();
        if (!username) return Promise.resolve({ saved: false, code: 'NO_AUTHENTICATED_PLAYER' });

        // Capture immediately. The queued write may start later, after the live
        // player object has moved through several additional transitions.
        const snapshot = createSnapshot(player);
        const key = username.toLowerCase();
        const previous = pendingByUser.get(key) || Promise.resolve();
        const write = previous
            .catch(() => undefined)
            .then(() => writeSnapshot(username, snapshot, metadata));
        const tracked = write
            .then(result => ({ saved: true, result }))
            .catch(error => {
                if (typeof onError === 'function') onError(error, { username, metadata });
                return { saved: false, code: 'SAVE_WRITE_FAILED', error };
            })
            .finally(() => {
                if (pendingByUser.get(key) === tracked) pendingByUser.delete(key);
            });
        pendingByUser.set(key, tracked);
        return tracked;
    }

    function flush(username) {
        const key = String(username || '').trim().toLowerCase();
        return pendingByUser.get(key) || Promise.resolve({ saved: true, idle: true });
    }

    return { enqueue, flush };
}

module.exports = { createAuthoritativeSaveQueue };
