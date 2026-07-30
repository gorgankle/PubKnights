const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const testerSource = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'sprite-tester.html'),
    'utf8'
);

function loadSideAnimationContext(options = {}) {
    const context = vm.createContext({
        window: { addEventListener() {} },
        setTimeout() {},
        player: {
            appearance: {
                gender: 'male',
                skin: 'light',
                hairColor: 'brown',
                eyes: 'eyes_blue',
                shirtColor: 'claret',
                pantsColor: 'charcoal',
                bootsColor: 'leather'
            },
            equipment: {}
        }
    });

    const filenames = options.includeEquipment
        ? [
            'character-creator.js',
            'items.js',
            'sprite-overhaul.js',
            'sprite-overhaul-equipment.js',
            'sprite-overhaul-animation.js'
        ]
        : [
            'character-creator.js',
            'sprite-overhaul.js',
            'sprite-overhaul-animation.js'
        ];

    filenames.forEach(filename => {
        const source = fs.readFileSync(
            path.join(__dirname, '..', 'public', 'js', filename),
            'utf8'
        );
        vm.runInContext(source, context, { filename });
    });

    return context;
}

test('side animation registry provides every approved motion as native palette-safe art', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => {
        const matrices = [
            ...Object.values(SidePlayerAnimationMatrices),
            ...Object.values(SidePlayerPlaceholderWeaponMatrices)
        ];
        const usedKeys = new Set(matrices.flat(2));

        return {
            clipIds: Object.keys(SidePlayerAnimationClips),
            poseCount: Object.keys(SidePlayerPoseDefinitions).length,
            bodyCount: Object.keys(SidePlayerAnimationMatrices).length,
            weaponCount: Object.keys(SidePlayerPlaceholderWeaponMatrices).length,
            loopingClips: Object.entries(SidePlayerAnimationClips)
                .filter(([, clip]) => clip.loop)
                .map(([clipId]) => clipId),
            actionFrames: Object.fromEntries(
                Object.entries(SidePlayerAnimationClips)
                    .filter(([, clip]) => clip.actionFrame !== null)
                    .map(([clipId, clip]) => [clipId, clip.actionFrame])
            ),
            allNative: matrices.every(matrix =>
                matrix.length === SIDE_PLAYER_ANIMATION_SIZE
                && matrix.every(row => row.length === SIDE_PLAYER_ANIMATION_SIZE)
            ),
            missingPaletteKeys: Array.from(usedKeys)
                .filter(key => !Object.prototype.hasOwnProperty.call(PALETTE, key))
                .sort()
        };
    })()`, context);

    assert.deepEqual(
        Array.from(result.clipIds),
        [
            'idle',
            'walk',
            'slash',
            'bash',
            'shoot',
            'cast',
            'thrust',
            'heavy',
            'dagger',
            'scythe',
            'shield_block',
            'shield_bash',
            'dual_wield',
            'hit',
            'defeat'
        ]
    );
    assert.equal(result.poseCount, 66);
    assert.equal(result.bodyCount, 132);
    assert.equal(result.weaponCount, 66);
    assert.deepEqual(Array.from(result.loopingClips), ['idle', 'walk']);
    assert.deepEqual(
        Object.fromEntries(Object.entries(result.actionFrames)),
        {
            slash: 2,
            bash: 2,
            shoot: 3,
            cast: 3,
            thrust: 2,
            heavy: 3,
            dagger: 2,
            scythe: 3,
            shield_block: 1,
            shield_bash: 2,
            dual_wield: 2
        }
    );
    assert.equal(result.allNative, true);
    assert.deepEqual(Array.from(result.missingPaletteKeys), []);
});

test('humanoid aliases expose reusable hit reactions and a terminal defeat clip', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => {
        const hit = HumanoidAnimationClips.hit;
        const defeat = HumanoidAnimationClips.defeat;
        const reactionPoseIds = [...hit.frames, ...defeat.frames];
        const matrices = reactionPoseIds.flatMap(poseId => [
            SidePlayerAnimationMatrices[\`male_\${poseId}\`],
            SidePlayerAnimationMatrices[\`female_\${poseId}\`]
        ]);
        const rotations = defeat.frames.map(poseId =>
            getSidePlayerRigTransform(
                SidePlayerPoseDefinitions[poseId]
            ).rotateDegrees
        );
        const mirrored = getMirroredHumanoidAnchor([7, 11], 'left');

        return {
            sizeAlias:
                HUMANOID_ANIMATION_SIZE === SIDE_PLAYER_ANIMATION_SIZE,
            clipsAlias: HumanoidAnimationClips === SidePlayerAnimationClips,
            frameAlias:
                getHumanoidAnimationFrame === getSidePlayerAnimationFrame,
            drawAlias:
                drawHumanoidAnimationFrame === drawSidePlayerAnimationFrame,
            mirrorAlias:
                getMirroredHumanoidAnchor === getMirroredSidePlayerAnchor,
            hit: {
                fps: hit.fps,
                loop: hit.loop,
                actionFrame: hit.actionFrame,
                frames: [...hit.frames]
            },
            defeat: {
                fps: defeat.fps,
                loop: defeat.loop,
                actionFrame: defeat.actionFrame,
                terminal: defeat.terminal,
                holdLastFrame: defeat.holdLastFrame,
                frames: [...defeat.frames]
            },
            rotations,
            mirrored,
            nativeBodies: matrices.every(matrix =>
                matrix.length === HUMANOID_ANIMATION_SIZE
                && matrix.every(row =>
                    row.length === HUMANOID_ANIMATION_SIZE
                )
            )
        };
    })()`, context);

    assert.equal(result.sizeAlias, true);
    assert.equal(result.clipsAlias, true);
    assert.equal(result.frameAlias, true);
    assert.equal(result.drawAlias, true);
    assert.equal(result.mirrorAlias, true);
    assert.deepEqual(
        {
            ...result.hit,
            frames: Array.from(result.hit.frames)
        },
        {
            fps: 10,
            loop: false,
            actionFrame: null,
            frames: ['hit_a', 'hit_b', 'hit_c']
        }
    );
    assert.deepEqual(
        {
            ...result.defeat,
            frames: Array.from(result.defeat.frames)
        },
        {
            fps: 6,
            loop: false,
            actionFrame: null,
            terminal: true,
            holdLastFrame: true,
            frames: ['defeat_a', 'defeat_b', 'defeat_c', 'defeat_d']
        }
    );
    assert.deepEqual(Array.from(result.rotations), [-12, -30, -58, -90]);
    assert.deepEqual(
        { x: result.mirrored.x, y: result.mirrored.y },
        { x: 24, y: 11 }
    );
    assert.equal(result.nativeBodies, true);
});

test('full appearance overrides color side actors without mutating the Knight', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => {
        const originalAppearance = JSON.stringify(player.appearance);
        const makeContext = () => {
            let currentFill = null;
            const colors = [];
            return {
                colors,
                imageSmoothingEnabled: true,
                save() {},
                restore() {},
                translate() {},
                scale() {},
                rotate() {},
                set fillStyle(value) {
                    currentFill = value;
                },
                get fillStyle() {
                    return currentFill;
                },
                fillRect() {
                    colors.push(currentFill);
                },
                clearRect() {}
            };
        };
        const bandit = {
            gender: 'male',
            skin: 'orc',
            hair: 'hair_mohawk',
            hairColor: 'pink',
            eyes: 'eyes_red',
            shirtColor: 'red',
            pantsColor: 'brown',
            bootsColor: 'black'
        };
        const mage = {
            gender: 'female',
            skin: 'deep',
            hairStyle: 'hair_topknot',
            hairColor: 'silver',
            eyes: 'eyes_purple',
            shirtColor: 'teal',
            pantsColor: 'navy',
            bootsColor: 'oxblood'
        };
        const banditContext = makeContext();
        const mageContext = makeContext();

        drawHumanoidAnimationFrame(
            banditContext,
            bandit.gender,
            'hit',
            0,
            HUMANOID_ANIMATION_SIZE,
            { appearance: bandit, weaponItem: null }
        );
        drawHumanoidAnimationFrame(
            mageContext,
            mage.gender,
            'hit',
            0,
            HUMANOID_ANIMATION_SIZE,
            { appearance: mage, weaponItem: null }
        );

        return {
            banditHasSkin: banditContext.colors.includes(SkinTones.orc),
            banditHasHair: banditContext.colors.includes(HairTones.pink),
            banditHasShirt: banditContext.colors.includes(ShirtTones.red),
            mageHasSkin: mageContext.colors.includes(SkinTones.deep),
            mageHasHair: mageContext.colors.includes(HairTones.silver),
            mageHasShirt: mageContext.colors.includes(ShirtTones.teal),
            palettesDiffer:
                JSON.stringify([...new Set(banditContext.colors)].sort())
                !== JSON.stringify([...new Set(mageContext.colors)].sort()),
            knightUnchanged:
                JSON.stringify(player.appearance) === originalAppearance
        };
    })()`, context);

    Object.entries(result).forEach(([key, value]) => {
        assert.equal(value, true, key);
    });
});

test('appearance-aware weapon bitmaps cache each humanoid palette separately', () => {
    const context = loadSideAnimationContext({ includeEquipment: true });
    const result = vm.runInContext(`(() => {
        const canvases = [];
        globalThis.document = {
            createElement() {
                let currentFill = null;
                const canvas = {
                    width: 0,
                    height: 0,
                    colors: [],
                    getContext() {
                        return {
                            imageSmoothingEnabled: true,
                            set fillStyle(value) {
                                currentFill = value;
                            },
                            get fillStyle() {
                                return currentFill;
                            },
                            fillRect() {
                                canvas.colors.push(currentFill);
                            }
                        };
                    }
                };
                canvases.push(canvas);
                return canvas;
            }
        };
        const matrix = Array.from(
            { length: HUMANOID_ANIMATION_SIZE },
            () => Array(HUMANOID_ANIMATION_SIZE).fill('.')
        );
        matrix[0][0] = 'S';
        const orc = { skin: 'orc' };
        const deep = { skin: 'deep' };
        const firstOrc = getFrontPaperdollWeaponBitmap(
            'humanoid_palette_probe',
            matrix,
            HUMANOID_ANIMATION_SIZE,
            orc
        );
        const secondOrc = getFrontPaperdollWeaponBitmap(
            'humanoid_palette_probe',
            matrix,
            HUMANOID_ANIMATION_SIZE,
            orc
        );
        const firstDeep = getFrontPaperdollWeaponBitmap(
            'humanoid_palette_probe',
            matrix,
            HUMANOID_ANIMATION_SIZE,
            deep
        );

        return {
            orcCacheHit: firstOrc === secondOrc,
            palettesSeparate: firstOrc !== firstDeep,
            canvasCount: canvases.length,
            orcColor: firstOrc.colors[0],
            deepColor: firstDeep.colors[0],
            expectedOrc: SkinTones.orc,
            expectedDeep: SkinTones.deep
        };
    })()`, context);

    assert.equal(result.orcCacheHit, true);
    assert.equal(result.palettesSeparate, true);
    assert.equal(result.canvasCount, 2);
    assert.equal(result.orcColor, result.expectedOrc);
    assert.equal(result.deepColor, result.expectedDeep);
});

test('side hair registry covers every selectable style with native palette-safe layers', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => {
        const allowedKeys = new Set(['.', 'X', 'H', 'M', 'T']);
        const layeredStyles = new Set([
            'hair_long',
            'hair_bob',
            'hair_braid',
            'hair_ponytail',
            'hair_curly',
            'hair_twintails',
            'hair_waves',
            'hair_halfup',
            'hair_locs'
        ]);
        const audits = CorePlayerHairStyleOptions.map(({ runtimeId }) => {
            const layers = SidePlayerHairMatrices[runtimeId];
            const matrices = layers ? [layers.back, layers.front] : [];
            const usedKeys = new Set(matrices.flat(2));
            const signature = matrices
                .flatMap(matrix => matrix.map(row => row.join('')))
                .join('\\n');
            const visiblePixels = matrices
                .flat(2)
                .filter(key => key !== '.')
                .length;

            return {
                runtimeId,
                present: Boolean(layers),
                native: matrices.length === 2 && matrices.every(matrix =>
                    matrix.length === SIDE_PLAYER_ANIMATION_SIZE
                    && matrix.every(row =>
                        row.length === SIDE_PLAYER_ANIMATION_SIZE
                    )
                ),
                paletteSafe: Array.from(usedKeys).every(key =>
                    allowedKeys.has(key)
                ),
                faceClear: matrices.length === 2 && [
                    [19, 6],
                    [21, 8],
                    [20, 9]
                ].every(([x, y]) => layers.front[y][x] === '.'),
                layeredWhenExpected:
                    !layeredStyles.has(runtimeId)
                    || layers.back.flat().some(key => key !== '.'),
                visiblePixels,
                signature
            };
        });

        return {
            audits,
            optionCount: CorePlayerHairStyleOptions.length,
            registryCount: Object.keys(SidePlayerHairMatrices).length,
            distinctCount: new Set(audits.map(audit => audit.signature)).size,
            unknownFallsBackToBald:
                getSidePlayerHairLayers('hair_missing')
                === SidePlayerHairMatrices.hair_bald
        };
    })()`, context);

    assert.equal(result.optionCount, 17);
    assert.equal(result.registryCount, result.optionCount);
    assert.equal(result.distinctCount, result.optionCount);
    assert.equal(result.unknownFallsBackToBald, true);

    result.audits.forEach(audit => {
        assert.equal(audit.present, true, `${audit.runtimeId} is missing`);
        assert.equal(audit.native, true, `${audit.runtimeId} is not native 32x32`);
        assert.equal(
            audit.paletteSafe,
            true,
            `${audit.runtimeId} uses a non-hair palette key`
        );
        assert.equal(
            audit.faceClear,
            true,
            `${audit.runtimeId} covers the side eye, nose, or mouth`
        );
        assert.equal(
            audit.layeredWhenExpected,
            true,
            `${audit.runtimeId} is missing its rear silhouette`
        );
        assert.equal(
            audit.visiblePixels > 0,
            audit.runtimeId !== 'hair_bald',
            `${audit.runtimeId} has the wrong bald/non-bald silhouette`
        );
    });
});

test('side hair preserves front-view length and distinguishes loose from tied styles', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => {
        const looseEarCoveringStyles = new Set([
            'hair_long',
            'hair_bob',
            'hair_curly',
            'hair_waves',
            'hair_halfup',
            'hair_locs'
        ]);
        const tiedEarClearingStyles = new Set([
            'hair_braid',
            'hair_ponytail',
            'hair_twintails'
        ]);
        const maxOccupiedRow = matrices => Math.max(
            -1,
            ...matrices.flatMap(matrix =>
                matrix.flatMap((row, y) =>
                    row.some(key => key !== '.') ? [y] : []
                )
            )
        );

        return CorePlayerHairStyleOptions.map(({ runtimeId, sampleId }) => {
            const front = CorePlayerSampleMatrices[sampleId];
            const layers = SidePlayerHairMatrices[runtimeId];
            const earCoverage = [8, 9, 10].filter(y =>
                layers.front[y][11] !== '.'
            ).length;
            const frontMaxY = maxOccupiedRow([front]);
            const sideMaxY = maxOccupiedRow([layers.back, layers.front]);

            return {
                runtimeId,
                lengthDelta: sideMaxY - frontMaxY,
                looseEarCovered:
                    !looseEarCoveringStyles.has(runtimeId)
                    || earCoverage === 3,
                tiedEarClear:
                    !tiedEarClearingStyles.has(runtimeId)
                    || earCoverage === 0
            };
        });
    })()`, context);

    result.forEach(audit => {
        assert.ok(
            Math.abs(audit.lengthDelta) <= 2,
            `${audit.runtimeId} side length no longer matches its front view`
        );
        assert.equal(
            audit.looseEarCovered,
            true,
            `${audit.runtimeId} should fall over the visible side ear`
        );
        assert.equal(
            audit.tiedEarClear,
            true,
            `${audit.runtimeId} should read as tied away from the ear`
        );
    });
});

test('side bodies preserve the shared face and remain distinct across every pose', () => {
    const context = loadSideAnimationContext();
    const audits = vm.runInContext(`(() => (
        Object.keys(SidePlayerPoseDefinitions).map(poseId => {
            const male = SidePlayerAnimationMatrices[\`male_\${poseId}\`];
            const female = SidePlayerAnimationMatrices[\`female_\${poseId}\`];
            return {
                poseId,
                maleEye: male[6][19],
                femaleEye: female[6][19],
                maleMouth: male[9][20],
                femaleMouth: female[9][20],
                maleOldNoseTip: male[8][23],
                femaleOldNoseTip: female[8][23],
                maleOldMouth: male[9][21],
                femaleOldMouth: female[9][21],
                differences: male.flatMap((row, y) =>
                    row.filter((value, x) => value !== female[y][x])
                ).length
            };
        })
    ))()`, context);

    audits.forEach(audit => {
        assert.equal(audit.maleEye, 'Z', `${audit.poseId} loses the male profile eye`);
        assert.equal(audit.femaleEye, 'Z', `${audit.poseId} loses the female profile eye`);
        assert.equal(audit.maleMouth, '@', `${audit.poseId} loses the male profile mouth`);
        assert.equal(audit.femaleMouth, '@', `${audit.poseId} loses the female profile mouth`);
        assert.equal(audit.maleOldNoseTip, '.', `${audit.poseId} restores the pointed male nose`);
        assert.equal(audit.femaleOldNoseTip, '.', `${audit.poseId} restores the pointed female nose`);
        assert.notEqual(audit.maleOldMouth, '@', `${audit.poseId} moves the male mouth forward`);
        assert.notEqual(audit.femaleOldMouth, '@', `${audit.poseId} moves the female mouth forward`);
        assert.ok(
            audit.differences >= 1,
            `${audit.poseId} makes the male and female bodies identical`
        );
    });
});

test('side idle bodies keep a straight athletic back instead of the old shoulder hump', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => (
        ['male', 'female'].map(gender => {
            const matrix = SidePlayerAnimationMatrices[\`\${gender}_idle_a\`];
            return {
                gender,
                oldHumpClear: matrix[14][8] === '.' && matrix[15][8] === '.',
                shoulderSetBack: matrix[14][11] !== '.',
                lowerBackFilled: matrix[20][11] !== '.'
            };
        })
    ))()`, context);

    result.forEach(body => {
        assert.equal(body.oldHumpClear, true, `${body.gender} restores the back hump`);
        assert.equal(body.shoulderSetBack, true, `${body.gender} loses the rear shoulder`);
        assert.equal(body.lowerBackFilled, true, `${body.gender} hollows the lower back`);
    });
});

test('idle frames use a relaxed side profile with compact aligned feet', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => (
        SidePlayerAnimationClips.idle.frames.map(poseId => {
            const pose = SidePlayerPoseDefinitions[poseId];
            const armXs = pose.nearArm.map(point => point[0]);
            return {
                poseId,
                stance: pose.stance,
                rearShoulderX: pose.nearArm[0][0],
                armTravel: Math.max(...armXs) - Math.min(...armXs),
                handY: pose.nearArm.at(-1)[1],
                hipSpacing: Math.abs(pose.nearLeg[0][0] - pose.farLeg[0][0]),
                footSpacing: Math.abs(pose.nearLeg.at(-1)[0] - pose.farLeg.at(-1)[0]),
                frontFootLeadsLeft: pose.nearLeg.at(-1)[0] < pose.farLeg.at(-1)[0],
                feetShareBaseline: pose.nearLeg.at(-1)[1] === 31
                    && pose.farLeg.at(-1)[1] === 31
            };
        })
    ))()`, context);

    result.forEach(pose => {
        assert.equal(pose.stance, 'profile', `${pose.poseId} loses its side stance`);
        assert.ok(pose.rearShoulderX <= 14, `${pose.poseId} pushes the shoulder forward`);
        assert.ok(pose.armTravel <= 2, `${pose.poseId} bends the hand back onto the hip`);
        assert.equal(pose.handY, 22, `${pose.poseId} raises the resting hand`);
        assert.ok(pose.hipSpacing <= 2, `${pose.poseId} turns the hips toward camera`);
        assert.ok(pose.footSpacing <= 4, `${pose.poseId} spreads the idle feet too far`);
        assert.equal(
            pose.frontFootLeadsLeft,
            true,
            `${pose.poseId} puts the far foot in front`
        );
        assert.equal(pose.feetShareBaseline, true, `${pose.poseId} staggers the feet`);
    });
});

test('idle and walk carry the equipped weapon forward and upward', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => {
        const poseIds = [
            ...SidePlayerAnimationClips.idle.frames,
            ...SidePlayerAnimationClips.walk.frames
        ];

        return {
            hasBitmapRenderer:
                typeof drawSidePlayerEquippedWeaponBitmap === 'function',
            poses: poseIds.map(poseId => {
                const weapon = SidePlayerPoseDefinitions[poseId].weapon;
                const aim = getSidePoseWeaponAim(weapon);
                const deltaX = aim[0] - weapon.grip[0];
                const deltaY = aim[1] - weapon.grip[1];
                const length = Math.hypot(deltaX, deltaY);
                const projectedHeadX = weapon.grip[0]
                    + ((deltaX / length) * 22 * 0.68);

                return {
                    poseId,
                    rises: aim[1] < weapon.grip[1],
                    pointsForward: aim[0] > weapon.grip[0],
                    projectedHeadX
                };
            })
        };
    })()`, context);

    assert.equal(result.hasBitmapRenderer, true);
    result.poses.forEach(pose => {
        assert.equal(
            pose.rises,
            true,
            `${pose.poseId} lets the resting weapon hang downward`
        );
        assert.equal(
            pose.pointsForward,
            true,
            `${pose.poseId} points the resting weapon behind the hero`
        );
        assert.ok(
            pose.projectedHeadX < 31,
            `${pose.poseId} clips the raised weapon at the canvas edge`
        );
    });
});

test('idle torsos keep flat backs, fitted fronts, and short inset belts', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => (
        SidePlayerAnimationClips.idle.frames.flatMap(poseId =>
            ['male', 'female'].map(gender => {
                const matrix = SidePlayerAnimationMatrices[\`\${gender}_\${poseId}\`];
                const beltPixels = matrix[22]
                    .map((key, x) => key === 'l' || key === 'N' ? x : null)
                    .filter(Number.isInteger);
                return {
                    poseId,
                    gender,
                    flatBack: Array.from({ length: 9 }, (_, index) => index + 14)
                        .every(y => matrix[y][10] === '.' && matrix[y][11] !== '.'),
                    fittedLowerFront:
                        Array.from({ length: 5 }, (_, index) => index + 18)
                            .every(y => matrix[y][19] === '.' && matrix[y][20] === '.'),
                    beltInset: beltPixels.length > 0
                        && beltPixels.every(x => x >= 12 && x <= 18),
                    maleFrontFlat: gender !== 'male'
                        || (matrix[15][19] !== '.' && matrix[15][20] === '.'),
                    femaleChestTaper: gender !== 'female'
                        || (matrix[15][20] !== '.' && matrix[18][18] === '.')
                };
            })
        )
    ))()`, context);

    result.forEach(body => {
        assert.equal(body.flatBack, true, `${body.gender} ${body.poseId} bends its back`);
        assert.equal(
            body.fittedLowerFront,
            true,
            `${body.gender} ${body.poseId} restores the lower belly`
        );
        assert.equal(body.beltInset, true, `${body.gender} ${body.poseId} widens its belt`);
        assert.equal(
            body.maleFrontFlat,
            true,
            `${body.poseId} rounds the male front`
        );
        assert.equal(
            body.femaleChestTaper,
            true,
            `${body.poseId} loses the female front taper`
        );
    });
});

test('every motion inherits the fitted belt and intended foot depth', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => (
        Object.entries(SidePlayerAnimationClips).flatMap(([clipId, clip]) =>
            clip.frames.flatMap((poseId, frameIndex) =>
                ['male', 'female'].map(gender => {
                    const frame = getSidePlayerAnimationFrame(
                        gender,
                        clipId,
                        frameIndex
                    );
                    const beltPixels = frame.body[22]
                        .map((key, x) => key === 'l' || key === 'N' ? x : null)
                        .filter(Number.isInteger);
                    return {
                        clipId,
                        poseId,
                        gender,
                        footDepthCorrect: clipId === 'walk' && frameIndex < 2
                            ? frame.anchors.frontFoot[0] > frame.anchors.backFoot[0]
                            : frame.anchors.frontFoot[0] <= frame.anchors.backFoot[0],
                        beltInset: beltPixels.length > 0
                            && beltPixels.every(x => x >= 12 && x <= 18),
                        legacyBeltClear: [11, 19, 20]
                            .every(x => !['l', 'N'].includes(frame.body[22][x]))
                    };
                })
            )
        )
    ))()`, context);

    result.forEach(frame => {
        const label = `${frame.gender} ${frame.poseId}`;
        assert.equal(
            frame.footDepthCorrect,
            true,
            `${label} reverses its intended foot depth`
        );
        assert.equal(frame.beltInset, true, `${label} loses its fitted belt`);
        assert.equal(frame.legacyBeltClear, true, `${label} restores the wide belt`);
    });
});

test('every motion roots its arms at the idle shoulder without a rear leak', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => ({
        shoulderX: SIDE_PLAYER_PROFILE_SHOULDER_X,
        idleShoulderX:
            SidePlayerPoseDefinitions.idle_a.nearArm[0][0] - 1,
        frames: Object.keys(SidePlayerPoseDefinitions).flatMap(poseId =>
            ['male', 'female'].map(gender => {
                const matrix = SidePlayerAnimationMatrices[
                    \`\${gender}_\${poseId}\`
                ];
                return {
                    poseId,
                    gender,
                    rearShoulderClear:
                        matrix[14][10] === '.' && matrix[15][10] === '.',
                    fittedBackPresent:
                        matrix[14][11] !== '.' && matrix[15][11] !== '.'
                };
            })
        )
    }))()`, context);

    assert.equal(result.shoulderX, result.idleShoulderX);
    result.frames.forEach(frame => {
        const label = `${frame.gender} ${frame.poseId}`;
        assert.equal(
            frame.rearShoulderClear,
            true,
            `${label} restores the stray rear shoulder pixel`
        );
        assert.equal(
            frame.fittedBackPresent,
            true,
            `${label} cuts into the fitted back`
        );
    });
});

test('walk arms stay straight and trailing boots point forward', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => {
        const armDeviation = poseId => {
            const pose = SidePlayerPoseDefinitions[poseId];
            const shoulder = [
                SIDE_PLAYER_PROFILE_SHOULDER_X,
                pose.nearArm[0][1]
            ];
            const elbow = pose.nearArm[1];
            const hand = pose.nearArm[2];
            return Math.abs(
                (elbow[0] - shoulder[0]) * (hand[1] - shoulder[1])
                - (elbow[1] - shoulder[1]) * (hand[0] - shoulder[0])
            );
        };
        const bootPointsForward = leg => {
            const ankle = leg.at(-2);
            const toe = leg.at(-1);
            return toe[0] > ankle[0] && toe[1] === 31;
        };
        const plantedStride = poseId => {
            const pose = SidePlayerPoseDefinitions[poseId];
            return {
                grounded: pose.bobY === 0,
                expandedPants: [pose.farLeg, pose.nearLeg].every(leg =>
                    leg.at(-2)[1] === 30 && leg.at(-2)[1] - leg.at(-3)[1] >= 5
                ),
                flatBoots: [pose.farLeg, pose.nearLeg].every(leg =>
                    leg.at(-1)[1] - leg.at(-2)[1] === 1
                    && leg.at(-1)[0] > leg.at(-2)[0]
                )
            };
        };

        return {
            walkAArmDeviation: armDeviation('walk_a'),
            walkBArmDeviation: armDeviation('walk_b'),
            walkATrailingBoot:
                bootPointsForward(SidePlayerPoseDefinitions.walk_a.farLeg),
            walkCTrailingBoot:
                bootPointsForward(SidePlayerPoseDefinitions.walk_c.nearLeg),
            walkBStride: plantedStride('walk_b'),
            walkDStride: plantedStride('walk_d')
        };
    })()`, context);

    assert.ok(result.walkAArmDeviation <= 3);
    assert.ok(result.walkBArmDeviation <= 3);
    assert.equal(result.walkATrailingBoot, true);
    assert.equal(result.walkCTrailingBoot, true);
    [result.walkBStride, result.walkDStride].forEach(stride => {
        assert.equal(stride.grounded, true);
        assert.equal(stride.expandedPants, true);
        assert.equal(stride.flatBoots, true);
    });
});

test('weapon grip frames keep their foreground arms straight', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => {
        const expectedHands = {
            bash_a: [20, 21],
            shoot_a: [19, 21],
            cast_a: [20, 21],
            slash_d: [22, 20],
            bash_d: [21, 20]
        };

        return Object.entries(expectedHands).map(([poseId, expectedHand]) => {
            const pose = SidePlayerPoseDefinitions[poseId];
            const shoulder = [
                SIDE_PLAYER_PROFILE_SHOULDER_X,
                pose.nearArm[0][1]
            ];
            const elbow = pose.nearArm[1];
            const hand = pose.nearArm[2];
            const deviation = Math.abs(
                (elbow[0] - shoulder[0]) * (hand[1] - shoulder[1])
                - (elbow[1] - shoulder[1]) * (hand[0] - shoulder[0])
            );

            return {
                poseId,
                deviation,
                elbowBetweenShoulderAndHand:
                    elbow[0] > shoulder[0]
                    && elbow[0] < hand[0]
                    && elbow[1] > shoulder[1]
                    && elbow[1] < hand[1],
                handPreserved:
                    hand[0] === expectedHand[0]
                    && hand[1] === expectedHand[1]
            };
        });
    })()`, context);

    result.forEach(frame => {
        assert.ok(
            frame.deviation <= 3,
            `${frame.poseId} foreground elbow bends away from the hand`
        );
        assert.equal(
            frame.elbowBetweenShoulderAndHand,
            true,
            `${frame.poseId} foreground elbow falls outside the arm path`
        );
        assert.equal(
            frame.handPreserved,
            true,
            `${frame.poseId} moves the equipped-weapon hand anchor`
        );
    });
});

test('weapon animations share grounded combat legs and forward boots', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => (
        ['slash', 'bash', 'shoot', 'cast'].flatMap(clipId =>
            SidePlayerAnimationClips[clipId].frames.map((poseId, frameIndex) => {
                const pose = SidePlayerPoseDefinitions[poseId];
                const frame = getSidePlayerAnimationFrame(
                    'male',
                    clipId,
                    frameIndex
                );
                const legs = [pose.farLeg, pose.nearLeg];
                return {
                    poseId,
                    usesSharedStance:
                        pose.farLeg === SIDE_PLAYER_COMBAT_FAR_LEG
                        && pose.nearLeg === SIDE_PLAYER_COMBAT_NEAR_LEG,
                    grounded: pose.bobY === 0,
                    expandedPants: legs.every(leg =>
                        leg.at(-2)[1] === 30
                        && leg.at(-2)[1] - leg.at(-3)[1] >= 5
                    ),
                    flatForwardBoots: legs.every(leg =>
                        leg.at(-1)[1] - leg.at(-2)[1] === 1
                        && leg.at(-1)[0] > leg.at(-2)[0]
                    ),
                    foregroundLeft:
                        frame.anchors.frontFoot[0] < frame.anchors.backFoot[0]
                };
            })
        )
    ))()`, context);

    assert.equal(result.length, 16);
    result.forEach(pose => {
        assert.equal(pose.usesSharedStance, true, `${pose.poseId} changes leg placement`);
        assert.equal(pose.grounded, true, `${pose.poseId} lifts off the ground`);
        assert.equal(pose.expandedPants, true, `${pose.poseId} shortens a pant leg`);
        assert.equal(
            pose.flatForwardBoots,
            true,
            `${pose.poseId} tilts or reverses a boot`
        );
        assert.equal(
            pose.foregroundLeft,
            true,
            `${pose.poseId} reverses combat foot depth`
        );
    });
});

test('every side pose keeps hands, feet, and placeholder weapons on their declared anchors', () => {
    const context = loadSideAnimationContext();
    const audits = vm.runInContext(`(() => {
        const occupiedNear = (matrix, point, radius = 2) => {
            for (let y = point[1] - radius; y <= point[1] + radius; y++) {
                for (let x = point[0] - radius; x <= point[0] + radius; x++) {
                    if (matrix[y]?.[x] && matrix[y][x] !== '.') return true;
                }
            }
            return false;
        };

        return Object.entries(SidePlayerPoseDefinitions).flatMap(([poseId]) =>
            ['male', 'female'].map(gender => {
                const frame = getSidePlayerAnimationFrame(
                    gender,
                    Object.keys(SidePlayerAnimationClips).find(clipId =>
                        SidePlayerAnimationClips[clipId].frames.includes(poseId)
                    ),
                    0
                );
                const poseIndex = SidePlayerAnimationClips[frame.clipId].frames.indexOf(poseId);
                const resolvedFrame = getSidePlayerAnimationFrame(
                    gender,
                    frame.clipId,
                    poseIndex
                );
                return {
                    poseId,
                    gender,
                    supportHand: occupiedNear(
                        resolvedFrame.body,
                        resolvedFrame.anchors.supportHand
                    ),
                    weaponHand: occupiedNear(
                        resolvedFrame.body,
                        resolvedFrame.anchors.weaponHand
                    ),
                    weaponGrip: occupiedNear(
                        resolvedFrame.weapon,
                        resolvedFrame.anchors.weaponHand
                    ),
                    backFoot:
                        resolvedFrame.anchors.backFoot[1] === 31
                        && occupiedNear(
                            resolvedFrame.body,
                            resolvedFrame.anchors.backFoot,
                            1
                        ),
                    frontFoot:
                        resolvedFrame.anchors.frontFoot[1] === 31
                        && occupiedNear(
                            resolvedFrame.body,
                            resolvedFrame.anchors.frontFoot,
                            1
                        )
                };
            })
        );
    })()`, context);

    audits.forEach(audit => {
        assert.equal(audit.supportHand, true, `${audit.poseId} misses its support hand`);
        assert.equal(audit.weaponHand, true, `${audit.poseId} misses its weapon hand`);
        assert.equal(audit.weaponGrip, true, `${audit.poseId} detaches its placeholder weapon`);
        assert.equal(audit.backFoot, true, `${audit.poseId} loses the back-foot baseline`);
        assert.equal(audit.frontFoot, true, `${audit.poseId} loses the front-foot baseline`);
    });
});

test('each clip has distinct readable keyframes and exact horizontal mirroring', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => {
        const clips = Object.entries(SidePlayerAnimationClips).map(([clipId, clip]) => {
            const signatures = clip.frames.map((poseId, frameIndex) => {
                const frame = getSidePlayerAnimationFrame('male', clipId, frameIndex);
                return [
                    ...frame.body.map(row => row.join('')),
                    ...frame.weapon.map(row => row.join(''))
                ].join('\\n');
            });
            return {
                clipId,
                frameCount: clip.frames.length,
                uniqueCount: new Set(signatures).size
            };
        });

        const anchors = Object.values(SidePlayerPoseDefinitions).flatMap(pose => [
            pose.farArm.at(-1),
            pose.nearArm.at(-1),
            pose.farLeg.at(-1),
            pose.nearLeg.at(-1)
        ]);
        const mirrorRoundTrips = anchors.every(anchor => {
            const left = getMirroredSidePlayerAnchor(anchor, 'left');
            const right = getMirroredSidePlayerAnchor([left.x, left.y], 'left');
            return right.x === anchor[0] && right.y === anchor[1];
        });

        return { clips, mirrorRoundTrips };
    })()`, context);

    result.clips.forEach(clip => {
        assert.equal(
            clip.uniqueCount,
            clip.frameCount,
            `${clip.clipId} contains a duplicate keyframe`
        );
    });
    assert.equal(result.mirrorRoundTrips, true);
});

test('defeat fall transforms the complete paper doll and mirrors visual anchors exactly', () => {
    const context = loadSideAnimationContext();
    const result = vm.runInContext(`(() => {
        const appearance = {
            gender: 'female',
            skin: 'tan',
            hair: 'hair_braid',
            hairColor: 'auburn',
            eyes: 'eyes_green',
            shirtColor: 'claret',
            pantsColor: 'charcoal',
            bootsColor: 'leather'
        };
        const render = facing => {
            const operations = [];
            const context = {
                imageSmoothingEnabled: true,
                fillStyle: null,
                save() { operations.push(['save']); },
                restore() { operations.push(['restore']); },
                translate(x, y) {
                    operations.push(['translate', x, y]);
                },
                scale(x, y) {
                    operations.push(['scale', x, y]);
                },
                rotate(radians) {
                    operations.push(['rotate', radians]);
                },
                fillRect() {
                    operations.push(['fill']);
                },
                clearRect() {}
            };
            drawHumanoidAnimationFrame(
                context,
                appearance.gender,
                'defeat',
                3,
                HUMANOID_ANIMATION_SIZE,
                {
                    appearance,
                    facing,
                    showAnchors: true,
                    weaponItem: null
                }
            );
            return operations;
        };
        const rightOperations = render('right');
        const leftOperations = render('left');
        const frame = getHumanoidAnimationFrame('female', 'defeat', 3);
        const rawAnchors = Object.values(frame.anchors);
        const mirroredAnchors = rawAnchors.map(anchor => {
            const right = getTransformedSidePlayerAnchor(
                anchor,
                frame.pose,
                'right'
            );
            const left = getTransformedSidePlayerAnchor(
                anchor,
                frame.pose,
                'left'
            );
            return {
                horizontalSum: right.x + left.x,
                sameY: Math.abs(right.y - left.y) < 1e-9
            };
        });
        const operationAudit = operations => {
            const rotateIndex = operations.findIndex(
                operation => operation[0] === 'rotate'
            );
            const fillIndexes = operations
                .map((operation, index) =>
                    operation[0] === 'fill' ? index : -1
                )
                .filter(index => index >= 0);
            const restoreIndexes = operations
                .map((operation, index) =>
                    operation[0] === 'restore' ? index : -1
                )
                .filter(index => index >= 0);
            const restoreIndex = restoreIndexes[
                restoreIndexes.length - 1
            ];
            return {
                rotateIndex,
                rotateRadians:
                    rotateIndex >= 0
                        ? operations[rotateIndex][1]
                        : null,
                everyLayerAfterRotation:
                    fillIndexes.length > 0
                    && fillIndexes.every(index => index > rotateIndex),
                everyLayerBeforeRestore:
                    fillIndexes.every(index => index < restoreIndex),
                restoreIsLast: restoreIndex === operations.length - 1
            };
        };

        return {
            transform: frame.rigTransform,
            right: operationAudit(rightOperations),
            left: operationAudit(leftOperations),
            leftMirrorApplied:
                leftOperations.some(operation =>
                    operation[0] === 'scale'
                    && operation[1] === -1
                    && operation[2] === 1
                ),
            mirroredAnchors
        };
    })()`, context);

    assert.deepEqual(
        {
            pivot: Array.from(result.transform.pivot),
            translate: Array.from(result.transform.translate),
            rotateDegrees: result.transform.rotateDegrees,
            scale: result.transform.scale
        },
        {
            pivot: [16, 16],
            translate: [0, 3],
            rotateDegrees: -90,
            scale: 0.82
        }
    );
    [result.right, result.left].forEach(audit => {
        assert.equal(audit.rotateRadians, -Math.PI / 2);
        assert.equal(audit.everyLayerAfterRotation, true);
        assert.equal(audit.everyLayerBeforeRestore, true);
        assert.equal(audit.restoreIsLast, true);
    });
    assert.equal(result.leftMirrorApplied, true);
    result.mirroredAnchors.forEach(anchor => {
        assert.ok(Math.abs(anchor.horizontalSum - 31) < 1e-9);
        assert.equal(anchor.sameY, true);
    });
});

test('side studies transform the genuinely equipped weapon and preserve empty hands', () => {
    const context = loadSideAnimationContext({ includeEquipment: true });
    const result = vm.runInContext(`(() => {
        const occupiedNear = (matrix, point, radius = 2) => {
            for (let y = point[1] - radius; y <= point[1] + radius; y++) {
                for (let x = point[0] - radius; x <= point[0] + radius; x++) {
                    if (matrix[y]?.[x] && matrix[y][x] !== '.') return true;
                }
            }
            return false;
        };
        const weapons = Object.values(ItemDatabase)
            .filter(item => item.slot === 'weapon')
            .map(item => {
                const matrix = getSidePlayerEquippedWeaponMatrix(item, 'walk', 0);
                const sourceMatrix = SpriteMatrices[item.spriteId];
                const sourceKeys = new Set(sourceMatrix.flat());
                const transformedKeys = new Set(matrix.flat());
                const frame = getSidePlayerAnimationFrame('male', 'walk', 0);
                return {
                    itemId: item.id,
                    hasMatrix: Boolean(matrix),
                    gripAttached: occupiedNear(matrix, frame.pose.weapon.grip),
                    palettePreserved: Array.from(transformedKeys).every(key =>
                        key === '.' || sourceKeys.has(key)
                    ),
                    occupied: matrix.flat().filter(key => key !== '.').length,
                    signature: matrix.map(row => row.join('')).join('\\n')
                };
            });

        return {
            weapons,
            uniqueCount: new Set(weapons.map(weapon => weapon.signature)).size,
            emptyWeapon: getSidePlayerEquippedWeaponMatrix(null, 'walk', 0)
        };
    })()`, context);

    assert.equal(result.emptyWeapon, null);
    assert.equal(result.weapons.length, 22);
    assert.ok(result.uniqueCount >= 20);
    result.weapons.forEach(weapon => {
        assert.equal(weapon.hasMatrix, true, `${weapon.itemId} has no side transform`);
        assert.equal(weapon.gripAttached, true, `${weapon.itemId} misses the side hand`);
        assert.equal(weapon.palettePreserved, true, `${weapon.itemId} changes material keys`);
        assert.ok(weapon.occupied >= 4, `${weapon.itemId} disappears after transformation`);
    });
});

test('every front armor design adapts to both heroes across all approved side poses', () => {
    const context = loadSideAnimationContext({ includeEquipment: true });
    const result = vm.runInContext(`(() => {
        const poseIds = Object.keys(SidePlayerPoseDefinitions);
        const genders = ['male', 'female'];
        const audits = Object.entries(EquipmentOverhaulSpecs.armor)
            .flatMap(([spriteId, spec]) =>
                genders.flatMap(gender =>
                    poseIds.map(poseId => {
                        const matrix = getSidePlayerArmorMatrix(
                            { spriteId },
                            gender,
                            poseId
                        );
                        const occupied = matrix.flatMap((row, y) =>
                            row.flatMap((key, x) =>
                                key === '.' ? [] : [{ x, y, key }]
                            )
                        );
                        const usedKeys = new Set(matrix.flat());
                        const maxY = Math.max(
                            ...occupied.map(pixel => pixel.y)
                        );
                        const mirrorRoundTrip = occupied.every(({ x, y }) => {
                            const left = getMirroredSidePlayerAnchor(
                                [x, y],
                                'left'
                            );
                            const right = getMirroredSidePlayerAnchor(
                                [left.x, left.y],
                                'left'
                            );
                            return right.x === x
                                && right.y === y
                                && left.x >= 0
                                && left.x < SIDE_PLAYER_ANIMATION_SIZE;
                        });

                        return {
                            spriteId,
                            style: spec.style,
                            gender,
                            poseId,
                            present: Boolean(matrix),
                            native:
                                matrix.length === SIDE_PLAYER_ANIMATION_SIZE
                                && matrix.every(row =>
                                    row.length === SIDE_PLAYER_ANIMATION_SIZE
                                ),
                            paletteSafe: Array.from(usedKeys).every(key =>
                                Object.prototype.hasOwnProperty.call(PALETTE, key)
                            ),
                            faceClear: [
                                [19, 6],
                                [21, 8],
                                [20, 9]
                            ].every(([x, y]) => matrix[y][x] === '.'),
                            torsoPresent: matrix.slice(13, 23)
                                .flat()
                                .some(key => key !== '.'),
                            maxY,
                            occupiedCount: occupied.length,
                            mirrorRoundTrip,
                            signature: matrix
                                .map(row => row.join(''))
                                .join('\\n')
                        };
                    })
                )
            );
        const idleSignatures = Object.keys(EquipmentOverhaulSpecs.armor)
            .map(spriteId =>
                getSidePlayerArmorMatrix(
                    { spriteId },
                    'male',
                    'idle_a'
                ).map(row => row.join('')).join('\\n')
            );
        const genderPairs = Object.keys(EquipmentOverhaulSpecs.armor)
            .map(spriteId => ({
                spriteId,
                distinct:
                    getSidePlayerArmorMatrix(
                        { spriteId },
                        'male',
                        'idle_a'
                    ).map(row => row.join('')).join('\\n')
                    !== getSidePlayerArmorMatrix(
                        { spriteId },
                        'female',
                        'idle_a'
                    ).map(row => row.join('')).join('\\n')
            }));

        return {
            audits,
            poseCount: poseIds.length,
            armorCount: Object.keys(EquipmentOverhaulSpecs.armor).length,
            uniqueIdleCount: new Set(idleSignatures).size,
            genderPairs,
            emptyArmor: getSidePlayerArmorMatrix(null, 'male', 'idle_a'),
            unknownArmor: getSidePlayerArmorMatrix(
                { spriteId: 'armor_missing' },
                'male',
                'idle_a'
            )
        };
    })()`, context);

    assert.equal(result.poseCount, 66);
    assert.equal(result.armorCount, 15);
    assert.equal(result.audits.length, 15 * 2 * 66);
    assert.equal(result.uniqueIdleCount, result.armorCount);
    assert.equal(result.emptyArmor, null);
    assert.equal(result.unknownArmor, null);
    result.genderPairs.forEach(pair => {
        assert.equal(
            pair.distinct,
            true,
            `${pair.spriteId} loses the approved male/female side builds`
        );
    });

    result.audits.forEach(audit => {
        const label = `${audit.spriteId} ${audit.gender} ${audit.poseId}`;
        assert.equal(audit.present, true, `${label} is missing`);
        assert.equal(audit.native, true, `${label} is not native 32x32`);
        assert.equal(audit.paletteSafe, true, `${label} uses an unknown palette key`);
        assert.equal(audit.faceClear, true, `${label} covers the profile face`);
        assert.equal(audit.torsoPresent, true, `${label} loses its torso`);
        assert.ok(audit.occupiedCount >= 24, `${label} is visually empty`);
        assert.equal(audit.mirrorRoundTrip, true, `${label} does not mirror cleanly`);

        const isLong = ['blackout', 'slicker', 'diving'].includes(audit.style);
        if (isLong) {
            assert.ok(audit.maxY >= 25, `${label} loses its coat hem`);
        } else {
            assert.ok(audit.maxY <= 23, `${label} grows an unintended coat hem`);
        }
    });
});

test('closed side coats cover the action-frame shirt collar while overalls stay open', () => {
    const context = loadSideAnimationContext({ includeEquipment: true });
    const result = vm.runInContext(`(() => {
        const poseIds = ['bash_c', 'cast_c'];
        const shirtKeys = new Set(['U', 'u', 'r']);
        const countNeckLeaks = (spriteId, poseId) => {
            const body = SidePlayerAnimationMatrices[\`male_\${poseId}\`];
            const armor = getSidePlayerArmorMatrix(
                { spriteId },
                'male',
                poseId
            );
            return body.flatMap((row, y) =>
                row.flatMap((key, x) =>
                    y >= 10
                    && y <= 14
                    && shirtKeys.has(key)
                    && armor[y][x] === '.'
                        ? [[x, y]]
                        : []
                )
            ).length;
        };

        return {
            closed: [
                'armor_blackout',
                'slicker_jacket'
            ].flatMap(spriteId =>
                poseIds.map(poseId => ({
                    spriteId,
                    poseId,
                    leaks: countNeckLeaks(spriteId, poseId)
                }))
            ),
            open: poseIds.map(poseId => ({
                poseId,
                leaks: countNeckLeaks('denim_overalls', poseId)
            }))
        };
    })()`, context);

    result.closed.forEach(audit => {
        assert.equal(
            audit.leaks,
            0,
            `${audit.spriteId} exposes the shirt collar on ${audit.poseId}`
        );
    });
    result.open.forEach(audit => {
        assert.ok(
            audit.leaks > 0,
            `overalls unexpectedly cover the shirt on ${audit.poseId}`
        );
    });
});

test('every glove and boot follows both side limbs across every approved pose', () => {
    const context = loadSideAnimationContext({ includeEquipment: true });
    const result = vm.runInContext(`(() => {
        const poseIds = Object.keys(SidePlayerPoseDefinitions);
        const genders = ['male', 'female'];
        const occupiedNear = (matrix, point, radius = 2) => {
            for (let y = point[1] - radius; y <= point[1] + radius; y++) {
                for (let x = point[0] - radius; x <= point[0] + radius; x++) {
                    if (matrix[y]?.[x] && matrix[y][x] !== '.') return true;
                }
            }
            return false;
        };
        const auditMatrix = (
            slot,
            spriteId,
            gender,
            poseId
        ) => {
            const pose = SidePlayerPoseDefinitions[poseId];
            const matrix = slot === 'gloves'
                ? getSidePlayerGloveMatrix({ spriteId }, gender, poseId)
                : getSidePlayerBootMatrix({ spriteId }, gender, poseId);
            const occupied = matrix.flatMap((row, y) =>
                row.flatMap((key, x) =>
                    key === '.' ? [] : [{ x, y, key }]
                )
            );
            const usedKeys = new Set(matrix.flat());
            const targetPoints = slot === 'gloves'
                ? [pose.farArm.at(-1), pose.nearArm.at(-1)]
                : [
                    getSideProfileLegs(pose).farLeg.at(-1),
                    getSideProfileLegs(pose).nearLeg.at(-1)
                ];
            const body = SidePlayerAnimationMatrices[
                \`\${gender}_\${poseId}\`
            ];
            const mirrorRoundTrip = occupied.every(({ x, y }) => {
                const left = getMirroredSidePlayerAnchor([x, y], 'left');
                const right = getMirroredSidePlayerAnchor(
                    [left.x, left.y],
                    'left'
                );
                return right.x === x
                    && right.y === y
                    && left.x >= 0
                    && left.x < SIDE_PLAYER_ANIMATION_SIZE;
            });

            return {
                slot,
                spriteId,
                gender,
                poseId,
                native:
                    matrix.length === SIDE_PLAYER_ANIMATION_SIZE
                    && matrix.every(row =>
                        row.length === SIDE_PLAYER_ANIMATION_SIZE
                    ),
                paletteSafe: Array.from(usedKeys).every(key =>
                    Object.prototype.hasOwnProperty.call(PALETTE, key)
                ),
                attached: targetPoints.every(point => (
                    occupiedNear(
                        matrix,
                        point,
                        slot === 'boots' ? 3 : 2
                    )
                    || (
                        slot === 'gloves'
                        && point[1] <= 11
                        && body[point[1]][point[0]] !== '.'
                    )
                )),
                faceClear: slot !== 'gloves' || [
                    [19, 6],
                    [21, 8],
                    [20, 9]
                ].every(([x, y]) => matrix[y][x] === '.'),
                grounded: slot !== 'boots'
                    || occupied.some(pixel => pixel.y === 31),
                mirrorRoundTrip,
                occupiedCount: occupied.length,
                signature: matrix.map(row => row.join('')).join('\\n')
            };
        };
        const gloveIds = Object.keys(EquipmentOverhaulSpecs.gloves);
        const bootIds = Object.keys(EquipmentOverhaulSpecs.boots);
        const gloveAudits = gloveIds.flatMap(spriteId =>
            genders.flatMap(gender =>
                poseIds.map(poseId =>
                    auditMatrix('gloves', spriteId, gender, poseId)
                )
            )
        );
        const bootAudits = bootIds.flatMap(spriteId =>
            genders.flatMap(gender =>
                poseIds.map(poseId =>
                    auditMatrix('boots', spriteId, gender, poseId)
                )
            )
        );

        return {
            poseCount: poseIds.length,
            gloveIds,
            bootIds,
            gloveAudits,
            bootAudits,
            uniqueIdleGloves: new Set(gloveIds.map(spriteId =>
                getSidePlayerGloveMatrix(
                    { spriteId },
                    'male',
                    'idle_a'
                ).map(row => row.join('')).join('\\n')
            )).size,
            uniqueIdleBoots: new Set(bootIds.map(spriteId =>
                getSidePlayerBootMatrix(
                    { spriteId },
                    'male',
                    'idle_a'
                ).map(row => row.join('')).join('\\n')
            )).size,
            emptyGloves: getSidePlayerGloveMatrix(null, 'male', 'idle_a'),
            emptyBoots: getSidePlayerBootMatrix(null, 'male', 'idle_a')
        };
    })()`, context);

    assert.equal(result.poseCount, 66);
    assert.equal(result.gloveAudits.length, result.gloveIds.length * 2 * 66);
    assert.equal(result.bootAudits.length, result.bootIds.length * 2 * 66);
    assert.equal(result.uniqueIdleGloves, result.gloveIds.length);
    assert.equal(result.uniqueIdleBoots, result.bootIds.length);
    assert.equal(result.emptyGloves, null);
    assert.equal(result.emptyBoots, null);

    [...result.gloveAudits, ...result.bootAudits].forEach(audit => {
        const label = `${audit.spriteId} ${audit.gender} ${audit.poseId}`;
        assert.equal(audit.native, true, `${label} is not native 32x32`);
        assert.equal(audit.paletteSafe, true, `${label} uses an unknown palette key`);
        assert.equal(audit.attached, true, `${label} misses its limb anchor`);
        assert.equal(audit.faceClear, true, `${label} covers the profile face`);
        assert.equal(audit.grounded, true, `${label} floats above the baseline`);
        assert.equal(audit.mirrorRoundTrip, true, `${label} does not mirror cleanly`);
        assert.ok(audit.occupiedCount >= 4, `${label} is visually empty`);
    });
});

test('side helmet registry matches every front helmet with native distinct palette-safe layers', () => {
    const context = loadSideAnimationContext({ includeEquipment: true });
    const result = vm.runInContext(`(() => {
        const visualOnlyHelmetIds = new Set([
            'helm_goblin_ears',
            'helm_innkeeper'
        ]);
        const audits = Object.entries(EquipmentOverhaulSpecs.helmet)
            .map(([spriteId, spec]) => {
                const profile = SidePlayerHelmetProfiles[spriteId];
                const layers = getSidePlayerHelmetLayers({ spriteId });
                const matrices = layers ? [layers.back, layers.front] : [];
                const usedKeys = new Set(matrices.flat(2));
                const allowedKeys = new Set([
                    '.',
                    'X',
                    spec.primary,
                    spec.shadow,
                    spec.highlight,
                    spec.accent
                ]);
                const item = Object.values(ItemDatabase)
                    .find(entry => entry.spriteId === spriteId);

                return {
                    spriteId,
                    present: Boolean(profile && layers),
                    itemPolicyValid: visualOnlyHelmetIds.has(spriteId)
                        ? !item
                        : Boolean(item),
                    styleMatches: profile?.style === spec.style,
                    maskMatches:
                        (profile?.hairMask || null) === (spec.hairMask || null),
                    hideFlagMatches:
                        profile?.hidesHair === Boolean(spec.hidesHair),
                    native: matrices.length === 2 && matrices.every(matrix =>
                        matrix.length === SIDE_PLAYER_ANIMATION_SIZE
                        && matrix.every(row =>
                            row.length === SIDE_PLAYER_ANIMATION_SIZE
                        )
                    ),
                    paletteSafe: Array.from(usedKeys)
                        .every(key => allowedKeys.has(key)),
                    outlined: matrices.some(matrix =>
                        matrix.some(row => row.includes('X'))
                    ),
                    occupied: matrices
                        .flat(2)
                        .filter(key => key !== '.')
                        .length,
                    signature: matrices
                        .flatMap(matrix => matrix.map(row => row.join('')))
                        .join('\\n')
                };
            });

        return {
            audits,
            specCount: Object.keys(EquipmentOverhaulSpecs.helmet).length,
            profileCount: Object.keys(SidePlayerHelmetProfiles).length,
            matrixCount: Object.keys(SidePlayerHelmetMatrices).length,
            uniqueCount: new Set(audits.map(audit => audit.signature)).size
        };
    })()`, context);

    assert.equal(result.specCount, 17);
    assert.equal(result.profileCount, result.specCount);
    assert.equal(result.matrixCount, result.specCount);
    assert.equal(result.uniqueCount, result.specCount);

    result.audits.forEach(audit => {
        assert.equal(audit.present, true, `${audit.spriteId} is missing side art`);
        assert.equal(
            audit.itemPolicyValid,
            true,
            `${audit.spriteId} has the wrong gameplay-item registration policy`
        );
        assert.equal(
            audit.styleMatches,
            true,
            `${audit.spriteId} no longer matches its front style`
        );
        assert.equal(
            audit.maskMatches,
            true,
            `${audit.spriteId} no longer matches its front hair mask`
        );
        assert.equal(
            audit.hideFlagMatches,
            true,
            `${audit.spriteId} no longer matches its front hair coverage`
        );
        assert.equal(audit.native, true, `${audit.spriteId} is not native 32x32`);
        assert.equal(
            audit.paletteSafe,
            true,
            `${audit.spriteId} introduces a foreign material key`
        );
        assert.equal(audit.outlined, true, `${audit.spriteId} has no dark outline`);
        assert.ok(audit.occupied >= 12, `${audit.spriteId} is visually empty`);
    });
});

test('side helmet masks remove only covered hair and preserve tied tails', () => {
    const context = loadSideAnimationContext({ includeEquipment: true });
    const result = vm.runInContext(`(() => {
        const stressHairIds = [
            'hair_spiky',
            'hair_curly',
            'hair_twintails',
            'hair_waves'
        ];
        const bodySignaturesBefore = Object.values(SidePlayerAnimationMatrices)
            .map(matrix => matrix.map(row => row.join('')).join('\\n'));
        const audits = Object.entries(EquipmentOverhaulSpecs.helmet)
            .filter(([, spec]) => spec.hairMask)
            .map(([spriteId, spec]) => {
                const helmet = { spriteId };
                const layers = getSidePlayerHelmetLayers(helmet);
                const removals = stressHairIds.map(hairStyle => {
                    const original = getSidePlayerHairLayers(hairStyle);
                    const masked = getSidePlayerHairLayersForHelmet(
                        hairStyle,
                        helmet
                    );
                    let removed = 0;
                    let unsafeChanges = 0;
                    let leakedErasers = 0;

                    ['back', 'front'].forEach(layerId => {
                        original[layerId].forEach((row, y) => {
                            row.forEach((key, x) => {
                                const nextKey = masked[layerId][y][x];
                                if (key !== nextKey) {
                                    removed += key !== '.' && nextKey === '.'
                                        ? 1
                                        : 0;
                                    if (
                                        !layers.hidesHair
                                        && layers.hairMask[y][x] === '.'
                                    ) {
                                        unsafeChanges += 1;
                                    }
                                }
                                if (nextKey === '_') leakedErasers += 1;
                            });
                        });
                    });

                    return {
                        hairStyle,
                        removed,
                        unsafeChanges,
                        leakedErasers,
                        visibleAfter: [
                            masked.back,
                            masked.front
                        ].flat(2).filter(key => key !== '.').length
                    };
                });
                const ponytail = getSidePlayerHairLayersForHelmet(
                    'hair_ponytail',
                    helmet
                );
                const lowerTailPixels = [
                    ponytail.back,
                    ponytail.front
                ].flatMap(matrix => matrix.slice(8))
                    .flat()
                    .filter(key => key !== '.')
                    .length;

                return {
                    spriteId,
                    profile: spec.hairMask,
                    hidesHair: Boolean(spec.hidesHair),
                    maskPixels: layers.hairMask
                        .flat()
                        .filter(key => key === '_')
                        .length,
                    maskNative:
                        layers.hairMask.length === SIDE_PLAYER_ANIMATION_SIZE
                        && layers.hairMask.every(row =>
                            row.length === SIDE_PLAYER_ANIMATION_SIZE
                        ),
                    removals,
                    lowerTailPixels
                };
            });
        const openAccessoriesReuseHair = Object.entries(
            EquipmentOverhaulSpecs.helmet
        )
            .filter(([, spec]) => !spec.hairMask)
            .every(([spriteId]) =>
                getSidePlayerHairLayersForHelmet(
                    'hair_waves',
                    { spriteId }
                ) === SidePlayerHairMatrices.hair_waves
            );
        const bodySignaturesAfter = Object.values(SidePlayerAnimationMatrices)
            .map(matrix => matrix.map(row => row.join('')).join('\\n'));

        return {
            audits,
            openAccessoriesReuseHair,
            bodyUnchanged:
                bodySignaturesBefore.join('\\n') === bodySignaturesAfter.join('\\n')
        };
    })()`, context);

    assert.equal(result.audits.length, 12);
    assert.equal(result.openAccessoriesReuseHair, true);
    assert.equal(result.bodyUnchanged, true);

    result.audits.forEach(audit => {
        assert.ok(audit.maskPixels > 0, `${audit.spriteId} has an empty hair mask`);
        assert.equal(audit.maskNative, true, `${audit.spriteId} mask is not 32x32`);
        audit.removals.forEach(removal => {
            assert.ok(
                removal.removed > 0,
                `${audit.spriteId} misses ${removal.hairStyle}`
            );
            assert.equal(
                removal.unsafeChanges,
                0,
                `${audit.spriteId} changes hair outside its mask`
            );
            assert.equal(
                removal.leakedErasers,
                0,
                `${audit.spriteId} leaks eraser pixels into rendered hair`
            );
            assert.equal(
                removal.visibleAfter === 0,
                audit.hidesHair,
                `${audit.spriteId} has the wrong full/partial hair coverage`
            );
        });
        if (!audit.hidesHair) {
            assert.ok(
                audit.lowerTailPixels > 0,
                `${audit.spriteId} erases the tied hair below the hat`
            );
        }
    });
});

test('side helmet openings preserve the intended profile face and mirror cleanly', () => {
    const context = loadSideAnimationContext({ includeEquipment: true });
    const result = vm.runInContext(`(() => {
        const openStyles = new Set([
            'goblin_ears',
            'collar',
            'coif',
            'hood',
            'flatcap',
            'widehat',
            'beanie',
            'crown',
            'bucket',
            'strawhat'
        ]);
        const eyeCoveringStyles = new Set(['visor', 'blinders']);
        const enclosedStyles = new Set([
            'skull',
            'tankard',
            'lantern',
            'sack'
        ]);
        const faceAnchors = [
            [19, 6],
            [21, 8],
            [20, 9]
        ];

        return Object.keys(EquipmentOverhaulSpecs.helmet).map(spriteId => {
            const layers = getSidePlayerHelmetLayers({ spriteId });
            const occupiedPixels = [layers.back, layers.front]
                .flatMap(matrix => matrix.flatMap((row, y) =>
                    row.flatMap((key, x) =>
                        key === '.' ? [] : [[x, y]]
                    )
                ));
            const mirrorRoundTrip = occupiedPixels.every(([x, y]) => {
                const left = getMirroredSidePlayerAnchor([x, y], 'left');
                const right = getMirroredSidePlayerAnchor(
                    [left.x, left.y],
                    'left'
                );
                return right.x === x
                    && right.y === y
                    && left.x >= 0
                    && left.x < SIDE_PLAYER_ANIMATION_SIZE;
            });
            const faceCoverage = faceAnchors.map(([x, y]) =>
                layers.front[y][x] !== '.'
            );

            return {
                spriteId,
                style: layers.style,
                openFaceCorrect:
                    !openStyles.has(layers.style)
                    || faceCoverage.every(covered => !covered),
                eyeCoverCorrect:
                    !eyeCoveringStyles.has(layers.style)
                    || faceCoverage[0],
                shellCoverCorrect:
                    !enclosedStyles.has(layers.style)
                    || faceCoverage.some(Boolean),
                mirrorRoundTrip
            };
        });
    })()`, context);

    result.forEach(audit => {
        assert.equal(
            audit.openFaceCorrect,
            true,
            `${audit.spriteId} obstructs an open face`
        );
        assert.equal(
            audit.eyeCoverCorrect,
            true,
            `${audit.spriteId} misses the profile eye`
        );
        assert.equal(
            audit.shellCoverCorrect,
            true,
            `${audit.spriteId} does not read as an enclosed helmet`
        );
        assert.equal(
            audit.mirrorRoundTrip,
            true,
            `${audit.spriteId} does not mirror exactly`
        );
    });
});

test('goblin side ears sweep backward without covering the profile eye', () => {
    const context = loadSideAnimationContext({ includeEquipment: true });
    const result = vm.runInContext(`(() => {
        const body = SidePlayerAnimationMatrices.male_idle_a;
        const layers = getSidePlayerHelmetLayers({
            spriteId: 'helm_goblin_ears'
        });
        const nearEarPixels = layers.front.flatMap((row, y) =>
            row.flatMap((key, x) => key === '.' ? [] : [{ x, y, key }])
        );
        const forwardFacePixels = nearEarPixels.filter(pixel =>
            pixel.x >= 19
            && pixel.y >= 4
            && pixel.y <= 10
        );
        const rearwardPixels = nearEarPixels.filter(pixel =>
            pixel.x <= 10
            && pixel.y >= 3
            && pixel.y <= 9
        );
        const attachmentPixels = nearEarPixels.filter(pixel =>
            pixel.x >= 14
            && pixel.x <= 18
            && pixel.y >= 5
            && pixel.y <= 9
        );

        return {
            bodyEye: body[6][19],
            helmetAtEye: layers.front[6][19],
            maximumNearEarX: Math.max(
                ...nearEarPixels.map(pixel => pixel.x)
            ),
            rearwardPixelCount: rearwardPixels.length,
            attachmentPixelCount: attachmentPixels.length,
            forwardFacePixelCount: forwardFacePixels.length
        };
    })()`, context);

    assert.equal(result.bodyEye, 'Z');
    assert.equal(result.helmetAtEye, '.');
    assert.ok(result.maximumNearEarX <= 18);
    assert.ok(result.rearwardPixelCount > 0);
    assert.ok(result.attachmentPixelCount > 0);
    assert.equal(result.forwardFacePixelCount, 0);
});

test('Sprite Tester exposes side hair, animation, mirroring, anchors, and motion sheets', () => {
    [
        'id="side-study-male"',
        'id="side-study-female"',
        'id="side-study-hair"',
        'id="side-study-clips"',
        'id="side-study-facing"',
        'id="side-study-anchors"',
        'id="side-motion-sheet"',
        'sprite-overhaul-equipment.js?v=',
        'sprite-overhaul-animation.js?v=',
        'CorePlayerHairStyleOptions.forEach',
        'hairStyle: player.appearance.hair',
        'helmetItem: player.equipment.helmet || null',
        'armorItem: player.equipment.armor || null',
        'gloveItem: player.equipment.gloves || null',
        'bootItem: player.equipment.boots || null',
        'weaponItem: player.equipment.weapon || null',
        'const TESTER_PREVIEW_SIZE = TESTER_GRID_SIZE * 8;',
        'const SIDE_STUDY_PREVIEW_SIZE = SIDE_PLAYER_ANIMATION_SIZE * 7;',
        'const SIDE_MOTION_PREVIEW_SIZE = SIDE_PLAYER_ANIMATION_SIZE * 3;',
        'requestAnimationFrame(updateSideStudy)'
    ].forEach(fragment => {
        assert.ok(testerSource.includes(fragment), `Sprite Tester is missing ${fragment}`);
    });
});
