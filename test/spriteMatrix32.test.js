const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
    LEGACY_PROCEDURAL_SPRITE_SIZE,
    PROCEDURAL_SPRITE_GRID_SIZE,
    getAuthoredSpriteSize,
    normalizeSpriteMatrix,
    buildSprite,
    drawProceduralSprite
} = require('../public/js/character-creator.js');

function legacyRows(pixels = []) {
    const rows = Array.from(
        { length: LEGACY_PROCEDURAL_SPRITE_SIZE },
        () => Array(LEGACY_PROCEDURAL_SPRITE_SIZE).fill('.')
    );
    pixels.forEach(({ row, column, value }) => {
        rows[row][column] = value;
    });
    return rows.map(row => row.join(''));
}

function occupiedCoordinates(matrix) {
    const coordinates = [];
    matrix.forEach((row, rowIndex) => {
        row.forEach((value, columnIndex) => {
            if (value !== '.') coordinates.push([rowIndex, columnIndex]);
        });
    });
    return coordinates;
}

test('procedural sprite runtime contract is 32x32', () => {
    assert.equal(LEGACY_PROCEDURAL_SPRITE_SIZE, 24);
    assert.equal(PROCEDURAL_SPRITE_GRID_SIZE, 32);

    const matrix = buildSprite(legacyRows());
    assert.equal(matrix.length, 32);
    assert.equal(matrix.every(row => row.length === 32), true);
});

test('legacy 24x24 art is nearest-neighbour remapped without shrinking its visual scale', () => {
    const source = legacyRows([
        { row: 3, column: 6, value: 'R' },
        { row: 23, column: 17, value: 'R' }
    ]);
    const matrix = buildSprite(source);
    const occupied = occupiedCoordinates(matrix);

    assert.equal(getAuthoredSpriteSize(source), 24);
    assert.deepEqual(occupied[0], [4, 8]);
    assert.deepEqual(occupied.at(-1), [31, 23]);
});

test('body and equipment pixels authored at the same coordinates remain aligned', () => {
    const body = buildSprite(legacyRows([{ row: 9, column: 6, value: 'S' }]));
    const equipment = buildSprite(legacyRows([{ row: 9, column: 6, value: 'I' }]));

    assert.deepEqual(occupiedCoordinates(body), occupiedCoordinates(equipment));
    assert.deepEqual(occupiedCoordinates(body), [[12, 8], [12, 9], [13, 8], [13, 9]]);
});

test('native 32x32 coded sprites pass through without another scale conversion', () => {
    const rows = Array.from({ length: 32 }, () => '.'.repeat(32));
    rows[31] = `${'.'.repeat(31)}R`;

    assert.equal(getAuthoredSpriteSize(rows), 32);
    const matrix = normalizeSpriteMatrix(rows);
    assert.equal(matrix[31][31], 'R');
    assert.equal(occupiedCoordinates(matrix).length, 1);
});

test('overwide legacy rows stay on the legacy contract unless 32 is explicit', () => {
    const oldAssetWithOverflow = [`${'.'.repeat(24)}R`];

    assert.equal(getAuthoredSpriteSize(oldAssetWithOverflow), 24);
    assert.equal(normalizeSpriteMatrix(oldAssetWithOverflow).flat().includes('R'), false);
    assert.equal(normalizeSpriteMatrix(oldAssetWithOverflow, { sourceSize: 32 })[0][24], 'R');
});

test('bottom-anchored coded sprites keep their feet on the final runtime row', () => {
    const matrix = normalizeSpriteMatrix(['R'], { verticalAnchor: 'bottom' });

    assert.equal(matrix[31][0], 'R');
    assert.equal(matrix[30][0], '.');
});

test('drawProceduralSprite renders against the 32-cell grid', () => {
    const matrix = Array.from({ length: 32 }, () => Array(32).fill('.'));
    matrix[31][31] = 'R';
    const fills = [];
    const context = {
        fillStyle: '',
        fillRect: (...args) => fills.push(args),
        clearRect() {}
    };

    drawProceduralSprite(context, matrix, 0, 0, 64);

    assert.deepEqual(fills, [[62, 62, 2, 2]]);
});

test('character, equipment, NPC, map, icon, and pet registries all expose 32x32 matrices', () => {
    const scripts = [
        'character-creator.js',
        'item-assets.js',
        'npc-assets.js',
        'map-assets.js',
        'icon-assets.js',
        'pet-assets.js'
    ];
    const context = vm.createContext({
        window: { addEventListener() {} },
        setTimeout() {}
    });

    scripts.forEach(filename => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', filename), 'utf8');
        vm.runInContext(source, context, { filename });
    });

    const result = vm.runInContext(`(() => {
        const is32 = matrix => matrix.length === 32 && matrix.every(row => row.length === 32);
        return {
            spriteCount: Object.keys(SpriteMatrices).length,
            petCount: Object.keys(PetMatrices).length,
            spritesAre32: Object.values(SpriteMatrices).every(is32),
            petsAre32: Object.values(PetMatrices).every(is32)
        };
    })()`, context);

    assert.ok(result.spriteCount > 50);
    assert.equal(result.petCount, 2);
    assert.equal(result.spritesAre32, true);
    assert.equal(result.petsAre32, true);
});
