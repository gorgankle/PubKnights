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

test('compatibility registries preserve legacy order without duplicate matrices', () => {
    const scripts = [
        'character-creator.js',
        'npc-assets.js'
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
            spriteKeys: Object.keys(SpriteMatrices),
            definedSpriteKeys: Object.keys(SpriteMatrices)
                .filter(key => SpriteMatrices[key] !== undefined),
            peanutIs32: is32(SpriteMatrices.icon_peanut)
        };
    })()`, context);

    assert.deepEqual(Array.from(result.spriteKeys), [
        'body_male',
        'body_female',
        'hair_messy',
        'hair_long',
        'hair_bob',
        'hair_braid',
        'hair_spiky',
        'hair_buzzcut',
        'hair_mohawk',
        'hair_undercut',
        'hair_topknot',
        'hair_curly',
        'hair_twintails',
        'hair_ponytail',
        'hair_bald',
        'eyes_blue',
        'eyes_green',
        'eyes_brown',
        'eyes_red',
        'eyes_purple',
        'eyes_gold',
        'eyes_grey',
        'eyes_black',
        'eyes_white',
        'npc_kreg',
        'goblin_axeling',
        'peanut_slinger',
        'icon_peanut',
        'magic_banana',
        'wild_ravager',
        'publing',
        'alpha_poacher',
        'wilderness_overlord',
        'corrupted_cask',
        'pub_crawl_mimic',
        'chummed_mimic',
        'vintage_behemoth',
        'enraged_gorilla',
        'spectral_barfly',
        'mash_crawler',
        'eldritch_keg'
    ]);
    assert.deepEqual(Array.from(result.definedSpriteKeys), ['icon_peanut']);
    assert.equal(result.peanutIs32, true);
});
