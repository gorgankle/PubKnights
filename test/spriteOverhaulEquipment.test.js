const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadEquipmentContext() {
    const context = vm.createContext({
        window: { addEventListener() {} },
        setTimeout() {},
        player: {
            appearance: {
                gender: 'male',
                skin: 'light',
                hairColor: 'brown',
                eyes: 'eyes_blue',
                shirtColor: 'blue',
                pantsColor: 'dark',
                bootsColor: 'leather'
            },
            equipment: {}
        }
    });

    [
        'character-creator.js',
        'sprite-overhaul.js',
        'items.js',
        'sprite-overhaul-equipment.js'
    ].forEach(filename => {
        const source = fs.readFileSync(
            path.join(__dirname, '..', 'public', 'js', filename),
            'utf8'
        );
        vm.runInContext(source, context, { filename });
    });

    return context;
}

test('the equipment overhaul covers every equipable ItemDatabase sprite id', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const slots = new Set(['weapon', 'armor', 'helmet', 'gloves', 'boots']);
        const items = Object.values(ItemDatabase).filter(item => slots.has(item.slot));
        const missing = [];

        items.forEach(item => {
            const specGroup = item.slot === 'weapon'
                ? EquipmentOverhaulSpecs.weapon
                : EquipmentOverhaulSpecs[item.slot];
            if (!specGroup[item.spriteId]) missing.push(item.spriteId);
            if (!SpriteMatrices[item.spriteId]) missing.push(item.spriteId);

            if (item.slot === 'armor') {
                if (!SpriteMatrices[item.spriteId + '_male']) missing.push(item.spriteId + '_male');
                if (!SpriteMatrices[item.spriteId + '_female']) missing.push(item.spriteId + '_female');
            }
        });

        return {
            itemCount: items.length,
            uniqueSpriteCount: new Set(items.map(item => item.spriteId)).size,
            missing
        };
    })()`, context);

    assert.equal(result.itemCount, 75);
    assert.equal(result.uniqueSpriteCount, 75);
    assert.equal(result.missing.length, 0);
});

test('all overhaul equipment matrices are native 32x32 and palette-complete', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const matrices = Object.values(EquipmentOverhaulMatrices);
        const usedKeys = new Set(matrices.flat(2));
        return {
            matrixCount: matrices.length,
            allNative: matrices.every(matrix =>
                matrix.length === 32 && matrix.every(row => row.length === 32)
            ),
            missingPaletteKeys: Array.from(usedKeys)
                .filter(key => !Object.prototype.hasOwnProperty.call(PALETTE, key))
        };
    })()`, context);

    assert.equal(result.matrixCount, 103);
    assert.equal(result.allNative, true);
    assert.equal(result.missingPaletteKeys.length, 0);
});

test('standard boots preserve the lower JRPG leg proportions', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const firstOccupiedRow = matrix =>
            matrix.findIndex(row => row.some(value => value !== '.'));
        const standardBootIds = Object.entries(EquipmentOverhaulSpecs.boots)
            .filter(([, spec]) => spec.style === 'boots')
            .map(([spriteId]) => spriteId);

        return {
            standardBootIds,
            standardBootRows: standardBootIds.map(spriteId =>
                firstOccupiedRow(EquipmentOverhaulMatrices[spriteId])
            ),
            waderRow: firstOccupiedRow(EquipmentOverhaulMatrices.boots_angler)
        };
    })()`, context);

    assert.ok(result.standardBootIds.length > 0);
    assert.deepEqual(result.standardBootRows, result.standardBootIds.map(() => 29));
    assert.equal(result.waderRow, 23);
});

test('every rebuilt weapon occupies the shared hand anchor', () => {
    const context = loadEquipmentContext();
    const missingAnchor = vm.runInContext(`(() => {
        const anchorX = Math.round(PLAYER_SPRITE_ANCHORS.weaponHand.x * 32);
        const anchorY = Math.round(PLAYER_SPRITE_ANCHORS.weaponHand.y * 32);

        return Object.keys(EquipmentOverhaulSpecs.weapon).filter(spriteId => {
            const matrix = EquipmentOverhaulMatrices[spriteId];
            for (let y = anchorY - 3; y <= anchorY + 3; y++) {
                for (let x = anchorX - 3; x <= anchorX + 3; x++) {
                    if (matrix[y] && matrix[y][x] && matrix[y][x] !== '.') return false;
                }
            }
            return true;
        });
    })()`, context);

    assert.equal(missingAnchor.length, 0);
});

test('full-coverage helmets consistently hide underlying hair', () => {
    const context = loadEquipmentContext();
    const missingFlags = vm.runInContext(`(() => {
        const hiddenIds = Object.entries(EquipmentOverhaulSpecs.helmet)
            .filter(([, spec]) => spec.hidesHair)
            .map(([spriteId]) => spriteId);

        return hiddenIds.filter(spriteId => {
            const item = Object.values(ItemDatabase).find(entry => entry.spriteId === spriteId);
            return !item || item.hidesHair !== true;
        });
    })()`, context);

    assert.equal(missingFlags.length, 0);
});
