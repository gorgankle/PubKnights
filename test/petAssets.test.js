const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPetAssets(player) {
    const context = vm.createContext({
        player,
        window: { addEventListener() {} },
        setTimeout() {}
    });
    ['character-creator.js', 'pet-assets.js'].forEach(filename => {
        const source = fs.readFileSync(
            path.join(__dirname, '..', 'public', 'js', filename),
            'utf8'
        );
        vm.runInContext(source, context, { filename });
    });
    return context;
}

function createCanvas() {
    const calls = { clears: [], fills: [] };
    const context = {
        fillStyle: '',
        clearRect: (...args) => calls.clears.push(args),
        fillRect: (...args) => calls.fills.push(args)
    };
    return {
        calls,
        canvas: {
            width: 64,
            height: 64,
            getContext: () => context
        }
    };
}

test('pet renderer safely clears and exits before new-account pet data is hydrated', () => {
    const context = loadPetAssets({});
    const { canvas, calls } = createCanvas();
    context.__canvas = canvas;

    assert.doesNotThrow(() => vm.runInContext('renderPetCanvas(__canvas)', context));
    assert.deepEqual(calls.clears, [[0, 0, 64, 64]]);
    assert.equal(calls.fills.length, 0);
});

test('pet renderer still draws a resolved pet after the guard', () => {
    const context = loadPetAssets({
        pet: { type: 'dog', furColor: 'brown', collarColor: 'red' }
    });
    const { canvas, calls } = createCanvas();
    context.__canvas = canvas;

    vm.runInContext('renderPetCanvas(__canvas)', context);

    assert.equal(calls.clears.length, 1);
    assert.ok(calls.fills.length > 0);
});
