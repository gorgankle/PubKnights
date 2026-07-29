const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const studioSource = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'pixel-studio.html'),
    'utf8'
);

function loadCharacterPaletteContext() {
    const context = vm.createContext({
        window: { addEventListener() {} },
        setTimeout() {},
        player: { appearance: {}, equipment: {} }
    });
    const source = fs.readFileSync(
        path.join(__dirname, '..', 'public', 'js', 'character-creator.js'),
        'utf8'
    );
    vm.runInContext(source, context, { filename: 'character-creator.js' });
    return context;
}

function brightness(hex) {
    const normalized = hex.replace('#', '');
    return [0, 2, 4]
        .map(offset => parseInt(normalized.slice(offset, offset + 2), 16))
        .reduce((sum, channel) => sum + channel, 0);
}

test('Pixel Studio exposes the complete character shader palette and appearance controls', () => {
    const expectedShaders = {
        X: 'Shared outline',
        F: 'Skin shadow',
        S: 'Skin base',
        Q: 'Skin highlight',
        M: 'Hair shadow',
        H: 'Hair base',
        T: 'Hair highlight',
        u: 'Tunic shadow',
        U: 'Tunic base',
        r: 'Tunic highlight',
        n: 'Trouser shadow',
        P: 'Trouser base',
        x: 'Trouser highlight',
        D: 'Boot base',
        g: 'Boot highlight',
        Z: 'Eye color'
    };

    Object.entries(expectedShaders).forEach(([key, label]) => {
        assert.ok(
            studioSource.includes(`'${key}': '${label}'`),
            `Pixel Studio is missing the ${label} shader`
        );
    });

    ['skin', 'hair', 'eyes', 'shirt', 'pants', 'boots'].forEach(control => {
        assert.ok(studioSource.includes(`id="studio-${control}"`));
    });

    const resolverUsages = studioSource.match(/resolveStudioColor\(char\)/g) || [];
    assert.ok(resolverUsages.length >= 3);
});

test('dynamic character shader ramps remain darker and lighter than their base tones', () => {
    const context = loadCharacterPaletteContext();
    const palette = vm.runInContext(`createProceduralDynamicPalette({
        skin: 'tan',
        hairColor: 'auburn',
        eyes: 'eyes_green',
        shirtColor: 'claret',
        pantsColor: 'charcoal',
        bootsColor: 'suede'
    })`, context);

    [
        ['F', 'S', 'Q'],
        ['M', 'H', 'T'],
        ['u', 'U', 'r'],
        ['n', 'P', 'x']
    ].forEach(([shadow, base, highlight]) => {
        assert.ok(brightness(palette[shadow]) < brightness(palette[base]));
        assert.ok(brightness(palette[highlight]) > brightness(palette[base]));
    });

    assert.ok(brightness(palette.g) > brightness(palette.D));
    assert.equal(palette.Z, '#2ecc71');
});
