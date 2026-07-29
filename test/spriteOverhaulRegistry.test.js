const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runScript(context, filename) {
    const source = fs.readFileSync(
        path.join(__dirname, '..', 'public', 'js', filename),
        'utf8'
    );
    vm.runInContext(source, context, { filename });
}

function loadCompleteOverhaul() {
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
            equipment: {},
            pet: {
                type: 'dog',
                furColor: 'brown',
                collarColor: 'red'
            }
        }
    });

    [
        'character-creator.js',
        'items.js',
        'item-assets.js',
        'npc-assets.js',
        'map-assets.js',
        'icon-assets.js',
        'pet-assets.js'
    ].forEach(filename => runScript(context, filename));

    vm.runInContext(`
        globalThis.__legacySpriteRefs = Object.fromEntries(Object.entries(SpriteMatrices));
        globalThis.__legacyPetRefs = Object.fromEntries(Object.entries(PetMatrices));
    `, context);

    [
        'sprite-overhaul.js',
        'sprite-overhaul-equipment.js',
        'sprite-overhaul-world.js',
        'sprite-overhaul-icons.js'
    ].forEach(filename => runScript(context, filename));

    return context;
}

test('the native overhaul replaces every legacy sprite and pet matrix', () => {
    const context = loadCompleteOverhaul();
    const result = vm.runInContext(`(() => ({
        legacySpriteCount: Object.keys(__legacySpriteRefs).length,
        unchangedSprites: Object.keys(__legacySpriteRefs)
            .filter(key => __legacySpriteRefs[key] === SpriteMatrices[key]),
        unchangedPets: Object.keys(__legacyPetRefs)
            .filter(key => __legacyPetRefs[key] === PetMatrices[key])
    }))()`, context);

    assert.equal(result.legacySpriteCount, 170);
    assert.equal(result.unchangedSprites.length, 0);
    assert.equal(result.unchangedPets.length, 0);
});

test('the complete sprite registry is native 32x32 and palette-valid', () => {
    const context = loadCompleteOverhaul();
    const result = vm.runInContext(`(() => {
        const matrices = Object.values(SpriteMatrices);
        const usedKeys = new Set(matrices.flat(2));
        return {
            registryCount: matrices.length,
            allNative: matrices.every(matrix =>
                matrix.length === 32 && matrix.every(row => row.length === 32)
            ),
            missingPaletteKeys: Array.from(usedKeys)
                .filter(key => !Object.prototype.hasOwnProperty.call(PALETTE, key))
        };
    })()`, context);

    assert.ok(result.registryCount >= 260);
    assert.equal(result.allNative, true);
    assert.equal(result.missingPaletteKeys.length, 0);
});

test('every inventory item resolves to a rebuilt icon', () => {
    const context = loadCompleteOverhaul();
    const missingIcons = vm.runInContext(`Object.values(ItemDatabase)
        .map(item => 'icon_' + (item.spriteId || item.id))
        .filter(iconId => !IconOverhaulMatrices[iconId] || !SpriteMatrices[iconId])`, context);

    assert.equal(missingIcons.length, 0);
});

test('world and pet overhaul registries cover their complete legacy families', () => {
    const context = loadCompleteOverhaul();
    const result = vm.runInContext(`(() => ({
        worldCount: Object.keys(WorldOverhaulMatrices).length,
        iconCount: Object.keys(IconOverhaulMatrices).length,
        petCount: Object.keys(PetOverhaulMatrices).length,
        petKeys: Array.from(new Set(Object.values(PetOverhaulMatrices).flat(2))).sort()
    }))()`, context);

    assert.equal(result.worldCount, 32);
    assert.ok(result.iconCount >= 100);
    assert.equal(result.petCount, 2);
    assert.equal(
        result.petKeys.every(key => ['.', 'b', 'c', 'f', 'o', 'w'].includes(key)),
        true
    );
});
