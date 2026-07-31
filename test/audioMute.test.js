const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const audioSource = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'audio.js'),
    'utf8'
);

function readStartingVolumes(search) {
    const context = vm.createContext({
        window: { location: { search } },
        URLSearchParams,
        setTimeout() {}
    });
    vm.runInContext(
        `${audioSource}\nthis.startingVolumes = { musicVolume, sfxVolume };`,
        context
    );
    return context.startingVolumes;
}

test('mute query mode silences music and effects before the first interaction', () => {
    assert.deepEqual(
        JSON.parse(JSON.stringify(readStartingVolumes('?mute=1'))),
        { musicVolume: 0, sfxVolume: 0 }
    );
});

test('normal game sessions keep their existing default audio levels', () => {
    assert.deepEqual(
        JSON.parse(JSON.stringify(readStartingVolumes(''))),
        { musicVolume: 1, sfxVolume: 1 }
    );
});
