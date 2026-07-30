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

    assert.equal(result.matrixCount, 113);
    assert.equal(result.allNative, true);
    assert.equal(result.missingPaletteKeys.length, 0);
});

test('front armor establishes a complete and distinct design language for every set', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const requiredProfileFields = [
            'material',
            'silhouette',
            'weight',
            'length',
            'sleeves',
            'shoulders'
        ];
        const audits = Object.entries(EquipmentOverhaulSpecs.armor)
            .map(([spriteId, spec]) => {
                const profile = ArmorDesignProfiles[spec.style];
                const male = EquipmentOverhaulMatrices[\`\${spriteId}_male\`];
                const female = EquipmentOverhaulMatrices[\`\${spriteId}_female\`];
                const occupiedRows = matrix => matrix.flatMap((row, y) =>
                    row.some(key => key !== '.') ? [y] : []
                );
                const maleRows = occupiedRows(male);
                const femaleRows = occupiedRows(female);

                return {
                    spriteId,
                    style: spec.style,
                    profilePresent: Boolean(profile),
                    profileComplete: Boolean(profile) && requiredProfileFields
                        .every(field =>
                            typeof profile[field] === 'string'
                            && profile[field].length > 0
                        ),
                    native: [male, female].every(matrix =>
                        matrix.length === 32
                        && matrix.every(row => row.length === 32)
                    ),
                    outlined: [male, female].every(matrix =>
                        matrix.some(row => row.includes('X'))
                    ),
                    faceClear: [male, female].every(matrix =>
                        matrix.slice(0, 10)
                            .every(row => row.every(key => key === '.'))
                    ),
                    maleMaxY: Math.max(...maleRows),
                    femaleMaxY: Math.max(...femaleRows),
                    maleFemaleDistinct:
                        JSON.stringify(male) !== JSON.stringify(female),
                    preservesShirtUnderOveralls:
                        spec.style !== 'overalls'
                        || [male, female].every(matrix =>
                            matrix.some(row => row.includes('U'))
                        ),
                    signature: male.map(row => row.join('')).join('\\n')
                };
            });

        return {
            audits,
            specCount: Object.keys(EquipmentOverhaulSpecs.armor).length,
            profileCount: Object.keys(ArmorDesignProfiles).length,
            uniqueCount: new Set(audits.map(audit => audit.signature)).size
        };
    })()`, context);

    assert.equal(result.specCount, 15);
    assert.equal(result.profileCount, result.specCount);
    assert.equal(result.uniqueCount, result.specCount);

    result.audits.forEach(audit => {
        assert.equal(audit.profilePresent, true, `${audit.spriteId} has no design profile`);
        assert.equal(
            audit.profileComplete,
            true,
            `${audit.spriteId} has an incomplete design profile`
        );
        assert.equal(audit.native, true, `${audit.spriteId} is not native 32x32`);
        assert.equal(audit.outlined, true, `${audit.spriteId} has no dark outline`);
        assert.equal(audit.faceClear, true, `${audit.spriteId} covers the hero face`);
        assert.equal(
            audit.maleFemaleDistinct,
            true,
            `${audit.spriteId} collapses both hero builds into one shape`
        );
        assert.equal(
            audit.preservesShirtUnderOveralls,
            true,
            `${audit.spriteId} paints over the shirt beneath the bib`
        );

        const profile = vm.runInContext(
            `ArmorDesignProfiles[EquipmentOverhaulSpecs.armor[
                '${audit.spriteId}'
            ].style]`,
            context
        );
        if (profile.length === 'long') {
            assert.ok(audit.maleMaxY >= 24, `${audit.spriteId} loses its long hem`);
            assert.ok(audit.femaleMaxY >= 24, `${audit.spriteId} loses its long hem`);
        } else {
            assert.ok(audit.maleMaxY <= 23, `${audit.spriteId} grows an unintended coat tail`);
            assert.ok(audit.femaleMaxY <= 23, `${audit.spriteId} grows an unintended coat tail`);
        }
    });
});

test('front gloves and boots fit the rebuilt 32x32 hands and separated feet', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const bounds = matrix => {
            const pixels = matrix.flatMap((row, y) =>
                row.flatMap((key, x) =>
                    key === '.' ? [] : [{ x, y, key }]
                )
            );
            return {
                minY: Math.min(...pixels.map(pixel => pixel.y)),
                maxY: Math.max(...pixels.map(pixel => pixel.y)),
                occupied: pixels.length
            };
        };
        const occupiedNear = (matrix, point, radius = 2) => {
            for (let y = point.y - radius; y <= point.y + radius; y++) {
                for (let x = point.x - radius; x <= point.x + radius; x++) {
                    if (matrix[y]?.[x] && matrix[y][x] !== '.') return true;
                }
            }
            return false;
        };
        const gloveFields = ['material', 'silhouette', 'coverage', 'bulk'];
        const bootFields = ['material', 'silhouette', 'height', 'bulk', 'sole'];
        const gloveAudits = Object.entries(EquipmentOverhaulSpecs.gloves)
            .map(([spriteId, spec]) => {
                const matrix = EquipmentOverhaulMatrices[spriteId];
                const profile = GloveDesignProfiles[spec.style];
                return {
                    spriteId,
                    style: spec.style,
                    profileComplete: Boolean(profile) && gloveFields.every(field =>
                        typeof profile[field] === 'string'
                        && profile[field].length > 0
                    ),
                    native: matrix.length === 32
                        && matrix.every(row => row.length === 32),
                    shoulderClear: matrix.slice(0, 15)
                        .every(row => row.every(key => key === '.')),
                    leftHandAttached: occupiedNear(
                        matrix,
                        { x: 8, y: 20 }
                    ),
                    rightHandAttached: occupiedNear(
                        matrix,
                        { x: 24, y: 20 }
                    ),
                    outlined: matrix.some(row => row.includes('X')),
                    ...bounds(matrix),
                    signature: matrix.map(row => row.join('')).join('\\n')
                };
            });
        const bootAudits = Object.entries(EquipmentOverhaulSpecs.boots)
            .map(([spriteId, spec]) => {
                const matrix = EquipmentOverhaulMatrices[spriteId];
                const profile = BootDesignProfiles[spec.style];
                return {
                    spriteId,
                    style: spec.style,
                    height: profile?.height,
                    profileComplete: Boolean(profile) && bootFields.every(field =>
                        typeof profile[field] === 'string'
                        && profile[field].length > 0
                    ),
                    native: matrix.length === 32
                        && matrix.every(row => row.length === 32),
                    centerGap: matrix.slice(24)
                        .every(row =>
                            row[15] === '.'
                            && row[16] === '.'
                        ),
                    leftFootAttached: occupiedNear(
                        matrix,
                        { x: 12, y: 30 }
                    ),
                    rightFootAttached: occupiedNear(
                        matrix,
                        { x: 20, y: 30 }
                    ),
                    outlined: matrix.some(row => row.includes('X')),
                    ...bounds(matrix),
                    signature: matrix.map(row => row.join('')).join('\\n')
                };
            });

        return {
            gloveAudits,
            bootAudits,
            gloveProfileCount: Object.keys(GloveDesignProfiles).length,
            gloveStyleCount: new Set(
                Object.values(EquipmentOverhaulSpecs.gloves)
                    .map(spec => spec.style)
            ).size,
            bootProfileCount: Object.keys(BootDesignProfiles).length,
            bootStyleCount: new Set(
                Object.values(EquipmentOverhaulSpecs.boots)
                    .map(spec => spec.style)
            ).size,
            uniqueGloves: new Set(
                gloveAudits.map(audit => audit.signature)
            ).size,
            uniqueBoots: new Set(
                bootAudits.map(audit => audit.signature)
            ).size
        };
    })()`, context);

    assert.equal(result.gloveProfileCount, result.gloveStyleCount);
    assert.equal(result.bootProfileCount, result.bootStyleCount);
    assert.equal(result.uniqueGloves, result.gloveAudits.length);
    assert.equal(result.uniqueBoots, result.bootAudits.length);

    result.gloveAudits.forEach(audit => {
        assert.equal(audit.profileComplete, true, `${audit.spriteId} lacks a glove profile`);
        assert.equal(audit.native, true, `${audit.spriteId} is not native 32x32`);
        assert.equal(audit.shoulderClear, true, `${audit.spriteId} reaches the shoulder`);
        assert.equal(audit.leftHandAttached, true, `${audit.spriteId} misses the left hand`);
        assert.equal(audit.rightHandAttached, true, `${audit.spriteId} misses the right hand`);
        assert.equal(audit.outlined, true, `${audit.spriteId} has no dark outline`);
        assert.ok(audit.minY >= 15, `${audit.spriteId} starts above the wrist`);
        assert.ok(audit.maxY <= 22, `${audit.spriteId} hangs below the hand`);
        assert.ok(audit.occupied >= 8, `${audit.spriteId} is visually empty`);
    });

    result.bootAudits.forEach(audit => {
        assert.equal(audit.profileComplete, true, `${audit.spriteId} lacks a boot profile`);
        assert.equal(audit.native, true, `${audit.spriteId} is not native 32x32`);
        assert.equal(audit.centerGap, true, `${audit.spriteId} bridges the two legs`);
        assert.equal(audit.leftFootAttached, true, `${audit.spriteId} misses the left foot`);
        assert.equal(audit.rightFootAttached, true, `${audit.spriteId} misses the right foot`);
        assert.equal(audit.outlined, true, `${audit.spriteId} has no dark outline`);
        assert.equal(audit.maxY, 31, `${audit.spriteId} floats above the baseline`);
        assert.ok(audit.occupied >= 12, `${audit.spriteId} is visually empty`);

        if (audit.height === 'high') {
            assert.equal(audit.minY, 24, `${audit.spriteId} loses its wader height`);
        } else if (audit.height === 'mid') {
            assert.ok(
                audit.minY >= 26 && audit.minY <= 27,
                `${audit.spriteId} loses its mid-calf silhouette`
            );
        } else {
            assert.ok(audit.minY >= 28, `${audit.spriteId} grows above the ankle`);
        }
    });
});

test('centered weapon assets stay separate from front paperdoll transforms', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const audits = Object.entries(EquipmentOverhaulCenteredWeaponMatrices)
            .map(([spriteId, centered]) => {
                const spec = EquipmentOverhaulSpecs.weapon[spriteId];
                const blueprint =
                    FRONT_CENTERED_WEAPON_BLUEPRINTS[spec.style];
                const front =
                    EquipmentOverhaulFrontWeaponMatrices[spriteId];
                const transformed =
                    transformCenteredWeaponMatrixForFront(
                        centered,
                        blueprint,
                        FRONT_WEAPON_PAPERDOLL_PIVOT
                    );
                const pixels = [];

                centered.forEach((row, y) => row.forEach((value, x) => {
                    if (value !== '.') pixels.push({ x, y });
                }));
                const occupiedXs = pixels.map(pixel => pixel.x);
                const minX = Math.min(...occupiedXs);
                const maxX = Math.max(...occupiedXs);
                const projectedOutsideCount = pixels.filter(pixel => {
                    const projected =
                        projectCenteredWeaponPointForFront(
                            pixel,
                            blueprint
                        );
                    return (
                        projected.x < 0
                        || projected.x >= 32
                        || projected.y < 0
                        || projected.y >= 32
                    );
                }).length;

                return {
                    spriteId,
                    style: spec.style,
                    canonicalPublished:
                        EquipmentOverhaulMatrices[spriteId] === centered
                        && SpriteMatrices[spriteId] === centered,
                    resolverUsesFront:
                        getFrontPaperdollWeaponMatrix(spriteId) === front,
                    transformMatches:
                        JSON.stringify(transformed) === JSON.stringify(front),
                    frontDiffers:
                        JSON.stringify(front) !== JSON.stringify(centered),
                    centeredCrossesAxis:
                        minX <= 16 && maxX >= 16,
                    centerOffset:
                        Math.abs(((minX + maxX) / 2) - 16),
                    projectedOutsideCount,
                    tiltDegrees: blueprint.tiltDegrees,
                    sourceAxisStartX: blueprint.shaft.start.x,
                    sourceAxisEndX: blueprint.shaft.end.x,
                    projectedGrip:
                        projectCenteredWeaponPointForFront(
                            blueprint.grip,
                            blueprint
                        ),
                    centeredGripKey:
                        centered[blueprint.grip.y][blueprint.grip.x],
                    frontGripKey:
                        front[FRONT_WEAPON_HAND_ANCHOR.y]
                            [FRONT_WEAPON_HAND_ANCHOR.x]
                };
            });

        return {
            audits,
            frontCount:
                Object.keys(EquipmentOverhaulFrontWeaponMatrices).length
        };
    })()`, context);

    assert.equal(result.audits.length, 23);
    assert.equal(result.frontCount, 23);

    result.audits.forEach(audit => {
        assert.equal(audit.canonicalPublished, true);
        assert.equal(audit.resolverUsesFront, true);
        assert.equal(audit.transformMatches, true);
        assert.equal(audit.frontDiffers, true);
        assert.equal(audit.centeredCrossesAxis, true);
        assert.equal(
            audit.sourceAxisStartX,
            audit.style === 'bow' ? 19 : 16,
            `${audit.spriteId} has an off-center source axis`
        );
        assert.equal(audit.sourceAxisEndX, audit.sourceAxisStartX);
        if (audit.style === 'knuckles') {
            assert.equal(audit.tiltDegrees, 0);
        } else {
            assert.ok(audit.tiltDegrees > 0);
        }
        assert.equal(
            audit.projectedOutsideCount,
            0,
            `${audit.spriteId} clips after rotation`
        );
        assert.equal(audit.projectedGrip.x, 24);
        assert.equal(audit.projectedGrip.y, 21);
        assert.notEqual(audit.centeredGripKey, '.');
        assert.equal(audit.frontGripKey, '.');
    });
});

test('front paperdoll consumers use the shared bitmap renderer', () => {
    const consumers = [
        'public/js/character-creator.js',
        'public/js/renderer.js',
        'public/js/ui-render.js',
        'public/js/social.js',
        'public/sprite-tester.html'
    ];

    consumers.forEach(relativePath => {
        const source = fs.readFileSync(
            path.join(__dirname, '..', relativePath),
            'utf8'
        );

        assert.match(
            source,
            /drawFrontPaperdollWeapon/,
            `${relativePath} bypasses the front weapon bitmap renderer`
        );
        assert.doesNotMatch(
            source,
            /getFrontPaperdollWeaponMatrix/,
            `${relativePath} still paints a rotated weapon matrix`
        );
    });
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
    assert.equal(result.waderRow, 24);
});

test('every rebuilt weapon occupies the shared hand anchor', () => {
    const context = loadEquipmentContext();
    const missingAnchor = vm.runInContext(`(() => {
        const anchorX = Math.round(PLAYER_SPRITE_ANCHORS.weaponHand.x * 32);
        const anchorY = Math.round(PLAYER_SPRITE_ANCHORS.weaponHand.y * 32);

        return Object.keys(EquipmentOverhaulSpecs.weapon).filter(spriteId => {
            const matrix = EquipmentOverhaulFrontWeaponMatrices[spriteId];
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

test('front-facing weapons use compact size tiers without crowding the hero face', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const tierByStyle = {
            dagger: 'compact',
            shiv: 'compact',
            knuckles: 'compact',
            bow: 'standard',
            club: 'standard',
            mace: 'standard',
            machete: 'standard',
            axe: 'standard',
            sawblade: 'standard',
            greatclub: 'heavy',
            maul: 'heavy',
            spear: 'long',
            trident: 'long',
            pitchfork: 'long',
            scythe: 'long',
            staff: 'long'
        };
        const customHeadStyles = new Set([
            'axe',
            'sawblade',
            'scythe'
        ]);
        const bounds = matrix => {
            const pixels = [];
            matrix.forEach((row, y) => row.forEach((value, x) => {
                if (value !== '.') pixels.push({ x, y });
            }));
            const xs = pixels.map(pixel => pixel.x);
            const ys = pixels.map(pixel => pixel.y);
            return {
                minX: Math.min(...xs),
                maxX: Math.max(...xs),
                minY: Math.min(...ys),
                maxY: Math.max(...ys),
                width: Math.max(...xs) - Math.min(...xs) + 1,
                height: Math.max(...ys) - Math.min(...ys) + 1
            };
        };

        const audits = Object.entries(EquipmentOverhaulSpecs.weapon)
            .map(([spriteId, spec]) => {
                const matrix = EquipmentOverhaulFrontWeaponMatrices[spriteId];
                const source = EquipmentOverhaulWeaponSourceMatrices[spriteId];
                const upperPixels = [];
                matrix.forEach((row, y) => row.forEach((value, x) => {
                    if (value !== '.' && y <= 11) upperPixels.push(x);
                }));

                return {
                    spriteId,
                    style: spec.style,
                    tier: tierByStyle[spec.style],
                    front: bounds(matrix),
                    source: bounds(source),
                    sourceMatchesFactory:
                        JSON.stringify(source) === JSON.stringify(makeWeaponOverhaulSprite(spec)),
                    changedForFront:
                        JSON.stringify(source) !== JSON.stringify(matrix),
                    upperMinX: upperPixels.length ? Math.min(...upperPixels) : null,
                    customHead: customHeadStyles.has(spec.style)
                };
            });

        return { audits };
    })()`, context);

    assert.equal(result.audits.length, 23);

    result.audits.forEach(audit => {
        assert.ok(audit.tier, `${audit.spriteId} has no front-view size tier`);
        assert.equal(
            audit.sourceMatchesFactory,
            true,
            `${audit.spriteId} no longer preserves its animation source matrix`
        );
        assert.equal(
            audit.changedForFront,
            true,
            `${audit.spriteId} skipped its front-view resize`
        );
        assert.ok(
            audit.front.height < audit.source.height,
            `${audit.spriteId} did not become shorter after resizing`
        );
        assert.ok(audit.front.width <= 10, `${audit.spriteId} is too wide`);

        if (audit.tier === 'compact') {
            assert.ok(audit.front.height <= 15, `${audit.spriteId} is not compact`);
        } else if (audit.tier === 'standard') {
            assert.ok(audit.front.height <= 23, `${audit.spriteId} is oversized`);
        } else if (audit.tier === 'heavy') {
            assert.ok(
                audit.front.height >= 18 && audit.front.height <= 21,
                `${audit.spriteId} is outside the heavy-weapon tier`
            );
        } else {
            assert.ok(
                audit.front.height >= 27 && audit.front.height <= 29,
                `${audit.spriteId} is outside the long-weapon tier`
            );
        }

        if (audit.upperMinX !== null) {
            assert.ok(audit.upperMinX >= 22, `${audit.spriteId} crosses the hero face`);
        }
        if (audit.customHead) {
            assert.ok(
                audit.upperMinX >= 24,
                `${audit.spriteId} custom head crowds the hero face`
            );
        }
    });
});

test('centered pole blueprints rotate cleanly around the hand anchor', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const rasterLine = (start, end) => {
            const points = [];
            let x = start.x;
            let y = start.y;
            const deltaX = Math.abs(end.x - x);
            const stepX = x < end.x ? 1 : -1;
            const deltaY = -Math.abs(end.y - y);
            const stepY = y < end.y ? 1 : -1;
            let error = deltaX + deltaY;

            while (true) {
                points.push({ x, y });
                if (x === end.x && y === end.y) break;
                const doubledError = 2 * error;
                if (doubledError >= deltaY) {
                    error += deltaY;
                    x += stepX;
                }
                if (doubledError <= deltaX) {
                    error += deltaX;
                    y += stepY;
                }
            }

            return points;
        };
        const { x: handX, y: handY } = FRONT_WEAPON_HAND_ANCHOR;
        const audits = Object.entries(EquipmentOverhaulCenteredWeaponMatrices)
            .filter(([spriteId]) => {
                const spec = EquipmentOverhaulSpecs.weapon[spriteId];
                return Boolean(FRONT_POLE_WEAPON_BLUEPRINTS[spec.style]);
            })
            .map(([spriteId, centered]) => {
                const spec = EquipmentOverhaulSpecs.weapon[spriteId];
                const blueprint = FRONT_POLE_WEAPON_BLUEPRINTS[spec.style];
                const front = EquipmentOverhaulFrontWeaponMatrices[spriteId];
                const source = EquipmentOverhaulWeaponSourceMatrices[spriteId];
                const shaftKey =
                    spec.frontShaft || spec[blueprint.shaft.material];
                const centeredShaftX = blueprint.shaft.start.x;
                const projectedGrip =
                    projectCenteredWeaponPointForFront(
                        blueprint.grip,
                        blueprint
                    );
                const projectedStart =
                    projectCenteredWeaponPointForFront(
                        blueprint.shaft.start,
                        blueprint
                    );
                const projectedEnd =
                    projectCenteredWeaponPointForFront(
                        blueprint.shaft.end,
                        blueprint
                    );
                const frontLine = rasterLine(
                    projectedStart,
                    projectedEnd
                );
                const centeredMissingRows = [];
                const frontMissingPoints = frontLine.filter(({ x, y }) => {
                    const handGap = (
                        x === handX
                        && (y === handY || y === handY - 1)
                    );
                    return (
                        !handGap
                        && (!front[y] || front[y][x] === '.')
                    );
                });

                for (
                    let y = blueprint.shaft.end.y + 2;
                    y < blueprint.shaft.start.y;
                    y += 1
                ) {
                    if (centered[y][centeredShaftX] !== shaftKey) {
                        centeredMissingRows.push(y);
                    }
                }

                const usedKeys = new Set(centered.flat());
                return {
                    spriteId,
                    style: spec.style,
                    centeredShaftX,
                    tiltDegrees: blueprint.tiltDegrees,
                    projectedGrip,
                    projectedStart,
                    projectedEnd,
                    centeredMissingRows,
                    frontMissingPoints,
                    centeredGripKey:
                        centered[blueprint.grip.y][blueprint.grip.x],
                    frontGripKey:
                        front[handY][handX],
                    frontUpperGripKey:
                        front[handY - 1][handX],
                    sourcePreserved:
                        JSON.stringify(source)
                        === JSON.stringify(makeWeaponOverhaulSprite(spec)),
                    centeredDiffersFromSource:
                        JSON.stringify(centered) !== JSON.stringify(source),
                    allNative:
                        centered.length === 32
                        && centered.every(row => row.length === 32),
                    missingPaletteKeys: Array.from(usedKeys)
                        .filter(key => (
                            !Object.prototype.hasOwnProperty.call(PALETTE, key)
                        ))
                };
            });

        return { audits };
    })()`, context);

    assert.equal(result.audits.length, 12);
    assert.deepEqual(
        Array.from(new Set(result.audits.map(audit => audit.style))).sort(),
        [
            'axe',
            'pitchfork',
            'sawblade',
            'scythe',
            'spear',
            'staff',
            'trident'
        ]
    );

    result.audits.forEach(audit => {
        assert.equal(audit.centeredShaftX, 16);
        assert.ok(audit.tiltDegrees > 0);
        assert.equal(audit.projectedGrip.x, 24);
        assert.equal(audit.projectedGrip.y, 21);
        assert.ok(audit.projectedEnd.x > audit.projectedStart.x);
        assert.ok(audit.projectedEnd.y < 21);
        assert.ok(audit.projectedStart.y > 21);
        assert.equal(
            audit.centeredMissingRows.length,
            0,
            `${audit.spriteId} has a broken centered shaft`
        );
        assert.equal(
            audit.frontMissingPoints.length,
            0,
            `${audit.spriteId} has a broken rotated shaft`
        );
        assert.notEqual(audit.centeredGripKey, '.');
        assert.equal(audit.frontGripKey, '.');
        assert.equal(audit.frontUpperGripKey, '.');
        assert.equal(audit.sourcePreserved, true);
        assert.equal(audit.centeredDiffersFromSource, true);
        assert.equal(audit.allNative, true);
        assert.equal(audit.missingPaletteKeys.length, 0);
    });
});

test('centered handheld blueprints pivot straight handles through clean grips', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const rasterLine = (start, end) => {
            const points = [];
            let x = start.x;
            let y = start.y;
            const deltaX = Math.abs(end.x - x);
            const stepX = x < end.x ? 1 : -1;
            const deltaY = -Math.abs(end.y - y);
            const stepY = y < end.y ? 1 : -1;
            let error = deltaX + deltaY;

            while (true) {
                points.push({ x, y });
                if (x === end.x && y === end.y) break;
                const doubledError = 2 * error;
                if (doubledError >= deltaY) {
                    error += deltaY;
                    x += stepX;
                }
                if (doubledError <= deltaX) {
                    error += deltaX;
                    y += stepY;
                }
            }

            return points;
        };
        const { x: handX, y: handY } = FRONT_WEAPON_HAND_ANCHOR;
        const audits = Object.entries(EquipmentOverhaulCenteredWeaponMatrices)
            .filter(([spriteId]) => {
                const spec = EquipmentOverhaulSpecs.weapon[spriteId];
                return Boolean(FRONT_HANDHELD_WEAPON_BLUEPRINTS[spec.style]);
            })
            .map(([spriteId, centered]) => {
                const spec = EquipmentOverhaulSpecs.weapon[spriteId];
                const blueprint =
                    FRONT_HANDHELD_WEAPON_BLUEPRINTS[spec.style];
                const front = EquipmentOverhaulFrontWeaponMatrices[spriteId];
                const source = EquipmentOverhaulWeaponSourceMatrices[spriteId];
                const shaftKey =
                    spec.frontShaft || spec[blueprint.shaft.material];
                const centeredShaftX = blueprint.shaft.start.x;
                const projectedGrip =
                    projectCenteredWeaponPointForFront(
                        blueprint.grip,
                        blueprint
                    );
                const projectedStart =
                    projectCenteredWeaponPointForFront(
                        blueprint.shaft.start,
                        blueprint
                    );
                const projectedEnd =
                    projectCenteredWeaponPointForFront(
                        blueprint.shaft.end,
                        blueprint
                    );
                const frontLine = rasterLine(
                    projectedStart,
                    projectedEnd
                );
                const centeredMissingRows = [];
                const frontMissingPoints = frontLine.filter(({ x, y }) => {
                    const handGap = (
                        x === handX
                        && (y === handY || y === handY - 1)
                    );
                    return (
                        !handGap
                        && (!front[y] || front[y][x] === '.')
                    );
                });
                let frontMaxY = -1;

                for (
                    let y = blueprint.shaft.end.y + 2;
                    y < blueprint.shaft.start.y;
                    y += 1
                ) {
                    if (centered[y][centeredShaftX] === '.') {
                        centeredMissingRows.push(y);
                    }
                }
                front.forEach((row, y) => row.forEach(value => {
                    if (value !== '.') frontMaxY = Math.max(frontMaxY, y);
                }));

                const usedKeys = new Set(centered.flat());
                return {
                    spriteId,
                    style: spec.style,
                    centeredShaftX,
                    tiltDegrees: blueprint.tiltDegrees,
                    projectedGrip,
                    projectedStart,
                    projectedEnd,
                    centeredMissingRows,
                    frontMissingPoints,
                    centeredGripKey:
                        centered[blueprint.grip.y][blueprint.grip.x],
                    frontGripKey:
                        front[handY][handX],
                    frontUpperGripKey:
                        front[handY - 1][handX],
                    frontMaxY,
                    frontHandleLimit: FRONT_WEAPON_HAND_ANCHOR.y + 3,
                    sourcePreserved:
                        JSON.stringify(source)
                        === JSON.stringify(makeWeaponOverhaulSprite(spec)),
                    centeredDiffersFromSource:
                        JSON.stringify(centered) !== JSON.stringify(source),
                    allNative:
                        centered.length === 32
                        && centered.every(row => row.length === 32),
                    missingPaletteKeys: Array.from(usedKeys)
                        .filter(key => (
                            !Object.prototype.hasOwnProperty.call(PALETTE, key)
                        ))
                };
            });

        return { audits };
    })()`, context);

    assert.equal(result.audits.length, 9);
    assert.deepEqual(
        Array.from(new Set(result.audits.map(audit => audit.style))).sort(),
        ['club', 'dagger', 'greatclub', 'mace', 'machete', 'maul', 'shiv']
    );

    result.audits.forEach(audit => {
        assert.equal(audit.centeredShaftX, 16);
        assert.ok(audit.tiltDegrees > 0);
        assert.equal(audit.projectedGrip.x, 24);
        assert.equal(audit.projectedGrip.y, 21);
        assert.ok(audit.projectedEnd.x > audit.projectedStart.x);
        assert.ok(audit.projectedEnd.y < 21);
        assert.ok(audit.projectedStart.y > 21);
        assert.equal(
            audit.centeredMissingRows.length,
            0,
            `${audit.spriteId} has a broken centered handle`
        );
        assert.equal(
            audit.frontMissingPoints.length,
            0,
            `${audit.spriteId} has a broken rotated handle`
        );
        assert.notEqual(audit.centeredGripKey, '.');
        assert.equal(audit.frontGripKey, '.');
        assert.equal(audit.frontUpperGripKey, '.');
        assert.ok(
            audit.frontMaxY <= audit.frontHandleLimit,
            `${audit.spriteId} hangs too far below the hand`
        );
        assert.equal(audit.sourcePreserved, true);
        assert.equal(audit.centeredDiffersFromSource, true);
        assert.equal(audit.allNative, true);
        assert.equal(audit.missingPaletteKeys.length, 0);
    });
});

test('front weapon grips meet the hand at their handles instead of their striking ends', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const { x: handX, y: handY } = FRONT_WEAPON_HAND_ANCHOR;
        const bowSpec = EquipmentOverhaulSpecs.weapon.weap_bow;
        const bow =
            EquipmentOverhaulCenteredWeaponMatrices.weap_bow;
        const bowFront =
            EquipmentOverhaulFrontWeaponMatrices.weap_bow;
        const bowBlueprint =
            FRONT_SPECIAL_WEAPON_BLUEPRINTS.bow;
        const stringCounts = new Map();

        bow.forEach(row => row.forEach((value, x) => {
            if (value === bowSpec.accent) {
                stringCounts.set(x, (stringCounts.get(x) || 0) + 1);
            }
        }));

        const dominantStringX = Array.from(stringCounts.entries())
            .sort((left, right) => right[1] - left[1])[0][0];
        const gripStyles = new Set([
            'club',
            'greatclub',
            'mace',
            'machete',
            'dagger',
            'shiv',
            'maul'
        ]);
        const audits = Object.entries(EquipmentOverhaulSpecs.weapon)
            .filter(([, spec]) => gripStyles.has(spec.style))
            .map(([spriteId, spec]) => {
                const matrix = EquipmentOverhaulFrontWeaponMatrices[spriteId];
                const blueprint =
                    FRONT_HANDHELD_WEAPON_BLUEPRINTS[spec.style];
                let maxY = -1;
                let gripNeighborCount = 0;

                matrix.forEach((row, y) => row.forEach((value, x) => {
                    if (value === '.') return;
                    maxY = Math.max(maxY, y);
                    if (
                        Math.abs(x - handX) <= 2
                        && Math.abs(y - handY) <= 2
                    ) {
                        gripNeighborCount += 1;
                    }
                }));

                return {
                    spriteId,
                    style: spec.style,
                    anchorKey: matrix[handY][handX],
                    upperAnchorKey: matrix[handY - 1][handX],
                    pixelsBelowHand: maxY - handY,
                    gripNeighborCount,
                    projectedTop:
                        projectCenteredWeaponPointForFront(
                            {
                                x: blueprint.grip.x,
                                y: 0
                            },
                            blueprint
                        )
                };
            });

        return {
            bowFrontAnchorKey: bowFront[handY][handX],
            bowGripKey:
                bow[bowBlueprint.grip.y][bowBlueprint.grip.x],
            bowWoodKey: bowSpec.primary,
            dominantStringX,
            bowGripX: bowBlueprint.grip.x,
            handX,
            audits
        };
    })()`, context);

    assert.equal(result.bowFrontAnchorKey, '.');
    assert.equal(result.bowGripKey, result.bowWoodKey);
    assert.ok(result.dominantStringX < result.bowGripX);

    result.audits.forEach(audit => {
        assert.equal(audit.anchorKey, '.');
        assert.equal(audit.upperAnchorKey, '.');
        assert.ok(
            audit.pixelsBelowHand <= 3,
            `${audit.spriteId} is still held too high on its striking end`
        );
        assert.ok(
            audit.gripNeighborCount > 0,
            `${audit.spriteId} no longer meets the hand`
        );
        assert.ok(
            audit.projectedTop.x > result.handX,
            `${audit.spriteId} does not tilt outward from the hand`
        );
    });
});

test('the bitmap renderer rotates the untouched centered weapon image', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const spriteId = 'weap_rusty_mace';
        const blueprint = FRONT_HANDHELD_WEAPON_BLUEPRINTS.mace;
        const matrix = SpriteMatrices[spriteId];
        const before = JSON.stringify(matrix);
        const bitmapCalls = [];
        const drawCalls = [];
        let createdBitmap = null;

        globalThis.document = {
            createElement(tagName) {
                bitmapCalls.push(['createElement', tagName]);
                createdBitmap = {
                    width: 0,
                    height: 0,
                    getContext() {
                        return {
                            imageSmoothingEnabled: true,
                            fillStyle: '',
                            fillRect(x, y, width, height) {
                                bitmapCalls.push([
                                    'fillRect',
                                    x,
                                    y,
                                    width,
                                    height
                                ]);
                            }
                        };
                    }
                };
                return createdBitmap;
            }
        };
        const drawContext = {
            imageSmoothingEnabled: true,
            save() { drawCalls.push(['save']); },
            restore() { drawCalls.push(['restore']); },
            beginPath() { drawCalls.push(['beginPath']); },
            rect(...args) { drawCalls.push(['rect', ...args]); },
            clip(rule) { drawCalls.push(['clip', rule]); },
            translate(...args) {
                drawCalls.push(['translate', ...args]);
            },
            rotate(radians) {
                drawCalls.push(['rotate', radians]);
            },
            scale(...args) { drawCalls.push(['scale', ...args]); },
            drawImage(...args) {
                drawCalls.push(['drawImage', ...args.slice(1)]);
            }
        };
        const drawn = drawFrontPaperdollWeapon(
            drawContext,
            spriteId,
            0,
            0,
            256
        );
        const rotateCall = drawCalls.find(call => call[0] === 'rotate');
        const scaleCall = drawCalls.find(call => call[0] === 'scale');
        const clipCall = drawCalls.find(call => call[0] === 'clip');
        const drawImageCall =
            drawCalls.find(call => call[0] === 'drawImage');

        return {
            drawn,
            canonicalUnchanged: JSON.stringify(matrix) === before,
            bitmapCreated:
                bitmapCalls.some(call =>
                    call[0] === 'createElement'
                    && call[1] === 'canvas'
                ),
            bitmapSize: createdBitmap
                ? [createdBitmap.width, createdBitmap.height]
                : null,
            paintedSourcePixels:
                bitmapCalls.filter(call => call[0] === 'fillRect').length,
            paintedCellSize:
                bitmapCalls.find(call => call[0] === 'fillRect')
                    ?.slice(3),
            rotateRadians: rotateCall && rotateCall[1],
            scale: scaleCall && scaleCall.slice(1),
            clipRule: clipCall && clipCall[1],
            drewBitmap: Boolean(drawImageCall),
            smoothingEnabled: drawContext.imageSmoothingEnabled
        };
    })()`, context);

    assert.equal(result.drawn, true);
    assert.equal(result.canonicalUnchanged, true);
    assert.equal(result.bitmapCreated, true);
    assert.deepEqual(Array.from(result.bitmapSize), [256, 256]);
    assert.ok(result.paintedSourcePixels > 0);
    assert.deepEqual(Array.from(result.paintedCellSize), [8, 8]);
    assert.equal(
        result.rotateRadians,
        20 * Math.PI / 180
    );
    assert.deepEqual(
        Array.from(result.scale),
        [0.6, 0.6]
    );
    assert.equal(result.clipRule, 'evenodd');
    assert.equal(result.drewBitmap, true);
    assert.equal(result.smoothingEnabled, false);
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

test('helmet eraser masks trim stress hairstyles without cutting into either hero body', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const stressHairIds = [
            'hair_spiky',
            'hair_curly',
            'hair_twintails',
            'hair_waves'
        ];
        const stressHair = stressHairIds.map(spriteId => SpriteMatrices[spriteId]);
        const bodies = [
            CorePlayerSampleMatrices.body_core_male,
            CorePlayerSampleMatrices.body_core_female
        ];

        const audits = Object.entries(EquipmentOverhaulSpecs.helmet)
            .filter(([, spec]) => spec.hairMask)
            .map(([spriteId, spec]) => {
                const matrix = EquipmentOverhaulMatrices[spriteId];
                const erasePixels = matrix.flatMap((row, y) =>
                    row.flatMap((value, x) => value === '_' ? [{ x, y }] : [])
                );

                return {
                    spriteId,
                    profile: spec.hairMask,
                    eraseCount: erasePixels.length,
                    unsafeCount: erasePixels.filter(({ x, y }) =>
                        bodies.some(body => body[y][x] !== '.')
                    ).length,
                    intersectsStressHair: erasePixels.some(({ x, y }) =>
                        stressHair.some(hair => hair[y][x] !== '.')
                    )
                };
            });

        const openAccessoriesWithErasers = Object.entries(EquipmentOverhaulSpecs.helmet)
            .filter(([, spec]) => !spec.hairMask)
            .filter(([spriteId]) =>
                EquipmentOverhaulMatrices[spriteId]
                    .some(row => row.includes('_'))
            )
            .map(([spriteId]) => spriteId);

        return {
            audits,
            maskedCount: audits.length,
            fullMaskCount: audits.filter(audit => audit.profile === 'full').length,
            openAccessoriesWithErasers
        };
    })()`, context);

    assert.equal(result.maskedCount, 12);
    assert.equal(result.fullMaskCount, 6);
    assert.equal(result.openAccessoriesWithErasers.length, 0);

    result.audits.forEach(audit => {
        assert.ok(audit.eraseCount > 0, `${audit.spriteId} has an empty eraser mask`);
        assert.equal(audit.unsafeCount, 0, `${audit.spriteId} erases the hero body`);
        assert.equal(
            audit.intersectsStressHair,
            true,
            `${audit.spriteId} misses every stress hairstyle`
        );
    });
});

test('every polished helmet keeps a distinct outlined silhouette', () => {
    const context = loadEquipmentContext();
    const result = vm.runInContext(`(() => {
        const matrices = Object.entries(EquipmentOverhaulSpecs.helmet)
            .map(([spriteId]) => [spriteId, EquipmentOverhaulMatrices[spriteId]]);
        return {
            helmetCount: matrices.length,
            uniqueCount: new Set(
                matrices.map(([, matrix]) => matrix.map(row => row.join('')).join('\\n'))
            ).size,
            missingOutline: matrices
                .filter(([, matrix]) => !matrix.some(row => row.includes('X')))
                .map(([spriteId]) => spriteId)
        };
    })()`, context);

    assert.equal(result.helmetCount, 17);
    assert.equal(result.uniqueCount, 17);
    assert.equal(result.missingOutline.length, 0);
});
