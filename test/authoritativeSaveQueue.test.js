const test = require('node:test');
const assert = require('node:assert/strict');

const { createAuthoritativeSaveQueue } = require('../authoritativeSaveQueue.js');

test('authoritative snapshots are captured immediately and written in account order', async () => {
    const writes = [];
    let releaseFirst;
    const firstGate = new Promise(resolve => { releaseFirst = resolve; });
    const queue = createAuthoritativeSaveQueue({
        createSnapshot: player => structuredClone(player),
        writeSnapshot: async (_username, snapshot) => {
            if (writes.length === 0) await firstGate;
            writes.push(snapshot.gold);
        }
    });
    const player = { username: 'OrderedKnight', gold: 10 };

    const first = queue.enqueue(player, { reason: 'purchase' });
    player.gold = 25;
    const second = queue.enqueue(player, { reason: 'contract_claim' });
    player.gold = 999;

    releaseFirst();
    await Promise.all([first, second]);
    assert.deepEqual(writes, [10, 25]);
    assert.equal((await queue.flush(player.username)).idle, true);
});

test('a failed write does not block the next authoritative snapshot', async () => {
    const writes = [];
    const errors = [];
    const queue = createAuthoritativeSaveQueue({
        createSnapshot: player => structuredClone(player),
        writeSnapshot: async (_username, snapshot) => {
            writes.push(snapshot.gold);
            if (snapshot.gold === 1) throw new Error('transient');
        },
        onError: error => errors.push(error.message)
    });
    const player = { username: 'ResilientKnight', gold: 1 };

    const failed = queue.enqueue(player);
    player.gold = 2;
    const recovered = queue.enqueue(player);

    assert.equal((await failed).saved, false);
    assert.equal((await recovered).saved, true);
    assert.deepEqual(writes, [1, 2]);
    assert.deepEqual(errors, ['transient']);
});
