const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPetAssets(player, includeWorldOverhaul = false) {
    const context = vm.createContext({
        player,
        window: { addEventListener() {} },
        setTimeout() {}
    });
    const filenames = ['character-creator.js', 'pet-assets.js'];
    if (includeWorldOverhaul) {
        filenames.push('sprite-overhaul.js', 'sprite-overhaul-world.js');
    }
    filenames.forEach(filename => {
        const source = fs.readFileSync(
            path.join(__dirname, '..', 'public', 'js', filename),
            'utf8'
        );
        vm.runInContext(source, context, { filename });
    });
    return context;
}

test('pet compatibility keys stay ordered and empty before the world overhaul', () => {
    const context = loadPetAssets({});
    const result = vm.runInContext(`({
        keys: Object.keys(PetMatrices),
        values: Object.values(PetMatrices)
    })`, context);

    assert.deepEqual(Array.from(result.keys), ['dog', 'cat']);
    assert.equal(Array.from(result.values).every(value => value === undefined), true);
});

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
    }, true);
    const { canvas, calls } = createCanvas();
    context.__canvas = canvas;

    vm.runInContext('renderPetCanvas(__canvas)', context);

    assert.equal(calls.clears.length, 1);
    assert.ok(calls.fills.length > 0);
    assert.equal(vm.runInContext(`
        PetMatrices.dog === PetOverhaulMatrices.dog
        && PetMatrices.cat === PetOverhaulMatrices.cat
    `, context), true);
});
