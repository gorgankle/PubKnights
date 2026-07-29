const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadSampleContext() {
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

    ['character-creator.js', 'sprite-overhaul.js'].forEach(filename => {
        const source = fs.readFileSync(
            path.join(__dirname, '..', 'public', 'js', filename),
            'utf8'
        );
        vm.runInContext(source, context, { filename });
    });

    return context;
}

test('core player studies are native 32x32 matrices', () => {
    const context = loadSampleContext();
    const result = vm.runInContext(`(() => ({
        sampleSize: CORE_PLAYER_SAMPLE_SIZE,
        matrixCount: Object.keys(CorePlayerSampleMatrices).length,
        allNative: Object.values(CorePlayerSampleMatrices).every(matrix =>
            matrix.length === 32 && matrix.every(row => row.length === 32)
        )
    }))()`, context);

    assert.equal(result.sampleSize, 32);
    assert.equal(result.matrixCount, 24);
    assert.equal(result.allNative, true);
});

test('every core player pixel resolves through the shared palette', () => {
    const context = loadSampleContext();
    const missingKeys = vm.runInContext(`(() => {
        const usedKeys = new Set(Object.values(CorePlayerSampleMatrices).flat(2));
        return Array.from(usedKeys)
            .filter(key => !Object.prototype.hasOwnProperty.call(PALETTE, key))
            .sort();
    })()`, context);

    assert.equal(missingKeys.length, 0);
});

test('sample presets reference valid interchangeable layers and color tones', () => {
    const context = loadSampleContext();
    const invalidReferences = vm.runInContext(`(() => {
        const invalid = [];
        CorePlayerSamplePresets.forEach(preset => {
            [preset.body, preset.hair, preset.outfit, 'face_core'].forEach(spriteId => {
                if (!CorePlayerSampleMatrices[spriteId]) invalid.push(spriteId);
            });

            const appearance = preset.appearance;
            if (!SkinTones[appearance.skin]) invalid.push(appearance.skin);
            if (!HairTones[appearance.hairColor]) invalid.push(appearance.hairColor);
            if (!EyeTones[appearance.eyes.replace('eyes_', '')]) invalid.push(appearance.eyes);
            if (!ShirtTones[appearance.shirtColor]) invalid.push(appearance.shirtColor);
            if (!PantsTones[appearance.pantsColor]) invalid.push(appearance.pantsColor);
            if (!BootsTones[appearance.bootsColor]) invalid.push(appearance.bootsColor);
        });
        return invalid;
    })()`, context);

    assert.equal(invalidReferences.length, 0);
});

test('hero bodies occupy the shared head, hand, and foot anchors', () => {
    const context = loadSampleContext();
    const result = vm.runInContext(`(() => {
        const anchors = Object.fromEntries(
            Object.entries(PLAYER_SPRITE_ANCHORS).map(([name, anchor]) => [
                name,
                {
                    x: Math.round(anchor.x * CORE_PLAYER_SAMPLE_SIZE),
                    y: Math.round(anchor.y * CORE_PLAYER_SAMPLE_SIZE)
                }
            ])
        );
        const isOccupiedNear = (matrix, anchor, radius = 1) => {
            for (let y = anchor.y - radius; y <= anchor.y + radius; y++) {
                for (let x = anchor.x - radius; x <= anchor.x + radius; x++) {
                    if (matrix[y]?.[x] && matrix[y][x] !== '.') return true;
                }
            }
            return false;
        };

        return ['body_core_male', 'body_core_female'].map(spriteId => {
            const matrix = CorePlayerSampleMatrices[spriteId];
            return {
                spriteId,
                head: isOccupiedNear(matrix, anchors.headCenter, 2),
                leftHand: isOccupiedNear(matrix, anchors.leftHand),
                weaponHand: isOccupiedNear(matrix, anchors.weaponHand),
                leftFoot: isOccupiedNear(matrix, anchors.leftFoot),
                rightFoot: isOccupiedNear(matrix, anchors.rightFoot)
            };
        });
    })()`, context);

    result.forEach(body => {
        assert.equal(body.head, true, `${body.spriteId} misses the head anchor`);
        assert.equal(body.leftHand, true, `${body.spriteId} misses the left hand anchor`);
        assert.equal(body.weaponHand, true, `${body.spriteId} misses the weapon hand anchor`);
        assert.equal(body.leftFoot, true, `${body.spriteId} misses the left foot anchor`);
        assert.equal(body.rightFoot, true, `${body.spriteId} misses the right foot anchor`);
    });
});

test('hero proportions extend the lower torso and keep clean shortened legs', () => {
    const context = loadSampleContext();
    const result = vm.runInContext(`(() => (
        ['body_core_male', 'body_core_female'].map(spriteId => {
            const matrix = CorePlayerSampleMatrices[spriteId];
            return {
                spriteId,
                continuousInnerOutline: Array.from(
                    { length: 9 },
                    (_, index) => index + 23
                ).every(y => matrix[y][15] === 'X' && matrix[y][16] === 'X'),
                extendedLowerTorso:
                    matrix[21][15] === 'U'
                    && matrix[22][14] === 'l',
                hasLowerShadowBlock: matrix
                    .slice(23, 29)
                    .some(row => row.includes('n'))
            };
        })
    ))()`, context);

    result.forEach(body => {
        assert.equal(
            body.continuousInnerOutline,
            true,
            `${body.spriteId} loses the outlined leg separation`
        );
        assert.equal(
            body.extendedLowerTorso,
            true,
            `${body.spriteId} loses the one-pixel lower-torso extension`
        );
        assert.equal(
            body.hasLowerShadowBlock,
            false,
            `${body.spriteId} restores the blocky trouser shadow`
        );
    });
});

test('hero hairstyles use only recolorable hair and outline keys', () => {
    const context = loadSampleContext();
    const invalidHairPixels = vm.runInContext(`(() => {
        const allowedKeys = new Set(['.', 'X', 'H', 'M', 'T']);
        return Object.entries(CorePlayerSampleMatrices)
            .filter(([spriteId]) => spriteId.startsWith('hair_core_'))
            .flatMap(([spriteId, matrix]) => matrix.flatMap((row, y) =>
                row.flatMap((key, x) => allowedKeys.has(key)
                    ? []
                    : [{ spriteId, key, x, y }]
                )
            ));
    })()`, context);

    assert.equal(invalidHairPixels.length, 0);
});

test('every selectable hairstyle fits the shared face and forms a clean silhouette', () => {
    const context = loadSampleContext();
    const result = vm.runInContext(`(() => {
        const allowedKeys = new Set(['.', 'X', 'H', 'M', 'T']);
        const head = CorePlayerSampleMatrices.body_core_male;

        const countComponents = matrix => {
            const occupied = new Set();
            matrix.forEach((row, y) => row.forEach((value, x) => {
                if (value !== '.') occupied.add(\`\${x},\${y}\`);
            }));

            const visited = new Set();
            let components = 0;
            occupied.forEach(coordinate => {
                if (visited.has(coordinate)) return;
                components++;
                visited.add(coordinate);
                const queue = [coordinate];

                while (queue.length) {
                    const current = queue.pop();
                    const [x, y] = current.split(',').map(Number);
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const neighbor = \`\${x + dx},\${y + dy}\`;
                            if (occupied.has(neighbor) && !visited.has(neighbor)) {
                                visited.add(neighbor);
                                queue.push(neighbor);
                            }
                        }
                    }
                }
            });

            return components;
        };

        const audits = CorePlayerHairStyleOptions.map(option => {
            const matrix = CorePlayerSampleMatrices[option.sampleId];
            const occupied = matrix.flatMap((row, y) =>
                row.flatMap((value, x) => value === '.' ? [] : [{ value, x, y }])
            );
            return {
                ...option,
                runtimeMatches: SpriteMatrices[option.runtimeId] === matrix,
                components: countComponents(matrix),
                overlap: occupied.filter(({ x, y }) => head[y][x] !== '.').length,
                faceClear:
                    matrix[7][13] === '.'
                    && matrix[7][18] === '.'
                    && matrix[10][15] === '.'
                    && matrix[10][16] === '.',
                paletteSafe: occupied.every(({ value }) => allowedKeys.has(value)),
                lowestPixel: occupied.length
                    ? Math.max(...occupied.map(({ y }) => y))
                    : -1,
                signature: matrix.map(row => row.join('')).join('\\n')
            };
        });

        return {
            audits,
            optionCount: CorePlayerHairStyleOptions.length,
            uniqueCount: new Set(audits.map(audit => audit.signature)).size,
            appearanceOrderMatches:
                appearanceOptions.hair.length === CorePlayerHairStyleOptions.length
                && appearanceOptions.hair.every(
                    (runtimeId, index) =>
                        runtimeId === CorePlayerHairStyleOptions[index].runtimeId
                )
        };
    })()`, context);

    assert.equal(result.optionCount, 17);
    assert.equal(result.uniqueCount, 17);
    assert.equal(result.appearanceOrderMatches, true);

    result.audits.forEach(audit => {
        assert.equal(audit.runtimeMatches, true, `${audit.runtimeId} misses its core matrix`);
        assert.equal(audit.faceClear, true, `${audit.runtimeId} obscures the face`);
        assert.equal(audit.paletteSafe, true, `${audit.runtimeId} uses a non-hair color`);
        assert.ok(audit.lowestPixel <= 18, `${audit.runtimeId} extends below the shoulders`);

        if (audit.runtimeId === 'hair_bald') {
            assert.equal(audit.components, 0);
            assert.equal(audit.overlap, 0);
        } else {
            assert.equal(audit.components, 1, `${audit.runtimeId} has a detached pixel cluster`);
            assert.ok(audit.overlap >= 35, `${audit.runtimeId} does not seat on the scalp`);
        }
    });
});

test('male and female heroes remain distinct named base sprites', () => {
    const context = loadSampleContext();
    const result = vm.runInContext(`(() => {
        const male = CorePlayerSampleMatrices.body_core_male;
        const female = CorePlayerSampleMatrices.body_core_female;
        const countOccupied = (matrix, row, startX, endX) =>
            matrix[row]
                .slice(startX, endX + 1)
                .filter(value => value !== '.').length;

        return {
            hasMale: Boolean(male),
            hasFemale: Boolean(female),
            hasDeprecatedBroad: Boolean(CorePlayerSampleMatrices.body_core_broad),
            hasDeprecatedLithe: Boolean(CorePlayerSampleMatrices.body_core_lithe),
            matrixDifferences: male.flatMap((row, y) =>
                row.filter((value, x) => value !== female[y][x])
            ).length,
            maleShoulderPixels: countOccupied(male, 14, 8, 23),
            maleWaistPixels: countOccupied(male, 20, 10, 21),
            maleHipPixels: countOccupied(male, 22, 10, 21),
            femaleShoulderPixels: countOccupied(female, 14, 8, 23),
            femaleWaistPixels: countOccupied(female, 20, 10, 21),
            femaleHipPixels: countOccupied(female, 22, 10, 21),
            maleBeltPixels: male[22].filter(value => value === 'l' || value === 'N').length,
            femaleBeltPixels: female[22].filter(value => value === 'l' || value === 'N').length,
            maleUpperLegPixels: countOccupied(male, 23, 8, 23),
            maleLowerLegPixels: countOccupied(male, 28, 8, 23),
            femaleUpperLegPixels: countOccupied(female, 23, 8, 23),
            femaleLowerLegPixels: countOccupied(female, 28, 8, 23),
            maleSplitLegRows: Array.from({ length: 6 }, (_, offset) => 23 + offset)
                .filter(y =>
                    male[y].slice(9, 16).some(value => value !== '.')
                    && male[y].slice(16, 23).some(value => value !== '.')
                ).length,
            femaleSplitLegRows: Array.from({ length: 6 }, (_, offset) => 23 + offset)
                .filter(y =>
                    female[y].slice(9, 16).some(value => value !== '.')
                    && female[y].slice(16, 23).some(value => value !== '.')
                ).length,
            runtimeMaleMatches: SpriteMatrices.body_male === male,
            runtimeFemaleMatches: SpriteMatrices.body_female === female
        };
    })()`, context);

    assert.equal(result.hasMale, true);
    assert.equal(result.hasFemale, true);
    assert.equal(result.hasDeprecatedBroad, false);
    assert.equal(result.hasDeprecatedLithe, false);
    assert.ok(result.matrixDifferences >= 20);
    assert.ok(result.maleShoulderPixels > result.maleWaistPixels);
    assert.ok(result.maleHipPixels > result.maleWaistPixels);
    assert.ok(result.femaleShoulderPixels > result.femaleWaistPixels);
    assert.ok(result.femaleHipPixels > result.femaleWaistPixels);
    assert.ok(result.maleWaistPixels > result.femaleWaistPixels);
    assert.equal(result.maleBeltPixels, 10);
    assert.equal(result.femaleBeltPixels, 8);
    assert.equal(result.maleUpperLegPixels, 12);
    assert.equal(result.maleLowerLegPixels, 10);
    assert.equal(result.femaleUpperLegPixels, 12);
    assert.equal(result.femaleLowerLegPixels, 10);
    assert.equal(result.maleSplitLegRows, 6);
    assert.equal(result.femaleSplitLegRows, 6);
    assert.equal(result.runtimeMaleMatches, true);
    assert.equal(result.runtimeFemaleMatches, true);
});
