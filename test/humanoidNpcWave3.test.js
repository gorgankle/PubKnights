const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { ItemDatabase } = require('../public/js/items.js');
const {
    HUMANOID_VISUAL_EQUIPMENT_SLOTS,
    HUMANOID_VISUAL_ANCHOR_KEYS,
    SPECIAL_HUMANOID_NPC_PROFILE_IDS,
    ADVANCED_HUMANOID_PROTOTYPE_PROFILE_IDS,
    HUMANOID_NPC_STUDIO_PROFILE_IDS,
    HumanoidStanceProfiles,
    HumanoidActorVisualProfiles,
    resolveHumanoidActorVisualProfile,
    isHumanoidActor
} = require('../public/js/humanoid-actor-visuals.js');
const {
    createEnemyActor,
    createKregActor,
    createCellarDwellerActor
} = require('../combatActors.js');
const { createEnemy } = require('../public/js/npc-database.js');
const {
    COMBAT_ANIMATION_EVENT_TYPES,
    resolveCombatAnimationClip,
    CombatSpriteAnimation
} = require('../public/js/combat-animation.js');

const projectRoot = path.join(__dirname, '..');
const NEW_CLIP_IDS = Object.freeze([
    'thrust',
    'heavy',
    'dagger',
    'scythe',
    'shield_block',
    'shield_bash',
    'dual_wield'
]);
const EXPECTED_CLIPS = Object.freeze({
    thrust: Object.freeze({
        frameCount: 5,
        fps: 8,
        actionFrame: 2,
        eventType: 'contact',
        actionTimeMs: 250,
        durationMs: 625,
        phases: Object.freeze({
            windupEnd: 1,
            contact: 2,
            recoveryStart: 3
        })
    }),
    heavy: Object.freeze({
        frameCount: 6,
        fps: 6,
        actionFrame: 3,
        eventType: 'contact',
        actionTimeMs: 500,
        durationMs: 1000,
        powerful: true,
        phases: Object.freeze({
            windupEnd: 2,
            contact: 3,
            recoveryStart: 4
        })
    }),
    dagger: Object.freeze({
        frameCount: 5,
        fps: 10,
        actionFrame: 2,
        eventType: 'contact',
        actionTimeMs: 200,
        durationMs: 500,
        phases: Object.freeze({
            windupEnd: 1,
            contact: 2,
            recoveryStart: 3
        })
    }),
    scythe: Object.freeze({
        frameCount: 6,
        fps: 7,
        actionFrame: 3,
        eventType: 'contact',
        actionTimeMs: 3000 / 7,
        durationMs: 6000 / 7,
        powerful: true,
        phases: Object.freeze({
            windupEnd: 2,
            contact: 3,
            recoveryStart: 4
        })
    }),
    shield_block: Object.freeze({
        frameCount: 4,
        fps: 8,
        actionFrame: 1,
        eventType: 'guard',
        actionTimeMs: 125,
        durationMs: 500,
        phases: Object.freeze({
            windupEnd: 0,
            guardStart: 1,
            guardEnd: 2,
            recoveryStart: 3
        })
    }),
    shield_bash: Object.freeze({
        frameCount: 5,
        fps: 8,
        actionFrame: 2,
        eventType: 'contact',
        actionTimeMs: 250,
        durationMs: 625,
        phases: Object.freeze({
            windupEnd: 1,
            contact: 2,
            recoveryStart: 3
        })
    }),
    dual_wield: Object.freeze({
        frameCount: 6,
        fps: 10,
        actionFrame: 2,
        eventType: 'contact',
        actionTimeMs: 200,
        durationMs: 600,
        phases: Object.freeze({
            windupEnd: 1,
            contact: 2,
            visualSecondStrike: 3,
            recoveryStart: 4
        })
    })
});
const EXPECTED_WEAPONS = Object.freeze({
    hunter_bow: ['two', 'shoot', 'shoot', 'shoot'],
    bone_fetch_club: ['one', 'bash', 'bash', 'bash'],
    rusty_mace: ['one', 'bash', 'bash', 'bash'],
    behemoth_maw_crusher: ['two', 'heavy', 'heavy', 'heavy'],
    scavenged_machete: ['one', 'slash', 'slash', 'slash'],
    hunters_spear: ['two', 'thrust', 'thrust', 'thrust'],
    mimic_fang_dagger: ['one', 'dagger', 'dagger', 'dagger'],
    brewmasters_club: ['two', 'heavy', 'heavy', 'heavy'],
    silverback_greatclub: ['two', 'heavy', 'heavy', 'heavy'],
    pubserker_knuckles: ['one', 'bash', 'bash', 'bash'],
    beerglass_shiv: ['one', 'dagger', 'dagger', 'dagger'],
    tankard_maul: ['two', 'heavy', 'heavy', 'heavy'],
    blackout_axe: ['two', 'heavy', 'heavy', 'heavy'],
    axe_timberlord: ['two', 'heavy', 'heavy', 'heavy'],
    sawblade_chakram: ['one', 'slash', 'slash', 'slash'],
    harpoon_trident: ['two', 'thrust', 'thrust', 'thrust'],
    pitchfork_spear: ['two', 'thrust', 'thrust', 'thrust'],
    scythe_of_reaping: ['two', 'scythe', 'scythe', 'scythe'],
    apprentice_staff: ['two', 'cast', 'cast', 'cast'],
    bogwood_staff: ['two', 'cast', 'cast', 'cast'],
    stormcaller_staff: ['two', 'cast', 'cast', 'cast'],
    last_call_voidstaff: ['two', 'cast', 'cast', 'cast']
});

function readProjectFile(relativePath) {
    return fs.readFileSync(
        path.join(projectRoot, ...relativePath.split('/')),
        'utf8'
    );
}

function toPlain(value) {
    return JSON.parse(JSON.stringify(value));
}

function loadWave3VisualContext({ includeWorld = false } = {}) {
    const context = vm.createContext({
        window: { addEventListener() {} },
        setTimeout() {},
        clearTimeout() {},
        player: {
            appearance: {
                gender: 'male',
                skin: 'light',
                hair: 'hair_bald',
                hairColor: 'brown',
                eyes: 'eyes_blue',
                shirtColor: 'blue',
                pantsColor: 'dark',
                bootsColor: 'leather'
            },
            equipment: {}
        }
    });
    const filenames = [
        'character-creator.js',
        'items.js',
        'sprite-overhaul.js',
        'sprite-overhaul-equipment.js',
        'sprite-overhaul-animation.js',
        'humanoid-actor-visuals.js',
        'combat-animation.js'
    ];
    if (includeWorld) filenames.push('sprite-overhaul-world.js');

    filenames.forEach(filename => {
        vm.runInContext(
            readProjectFile(`public/js/${filename}`),
            context,
            { filename }
        );
    });
    return context;
}

test('all seven Wave 3 clips expose native frames and authored event timing', () => {
    const context = loadWave3VisualContext();
    const audit = toPlain(vm.runInContext(`(() => {
        const native = matrix => (
            Array.isArray(matrix)
            && matrix.length === 32
            && matrix.every(row => Array.isArray(row) && row.length === 32)
        );
        return Object.fromEntries(${JSON.stringify(NEW_CLIP_IDS)}.map(clipId => {
            const clip = SidePlayerAnimationClips[clipId];
            const timeline = getCombatAnimationTimeline(clipId);
            return [clipId, {
                fps: clip.fps,
                frames: [...clip.frames],
                actionFrame: clip.actionFrame,
                phases: { ...clip.phases },
                powerful: clip.powerful === true,
                eventType: timeline.eventType,
                actionTimeMs: timeline.actionTimeMs,
                durationMs: timeline.durationMs,
                allBodiesNative: ['male', 'female'].every(gender =>
                    clip.frames.every(poseId =>
                        native(SidePlayerAnimationMatrices[
                            gender + '_' + poseId
                        ])
                    )
                ),
                allPosesPresent: clip.frames.every(poseId =>
                    Boolean(SidePlayerPoseDefinitions[poseId])
                )
            }];
        }));
    })()`, context));

    assert.deepEqual(
        Object.keys(audit),
        NEW_CLIP_IDS
    );
    NEW_CLIP_IDS.forEach(clipId => {
        const expected = EXPECTED_CLIPS[clipId];
        const actual = audit[clipId];
        assert.equal(actual.frames.length, expected.frameCount, clipId);
        assert.equal(actual.fps, expected.fps, clipId);
        assert.equal(actual.actionFrame, expected.actionFrame, clipId);
        assert.equal(actual.eventType, expected.eventType, clipId);
        assert.ok(
            Math.abs(actual.actionTimeMs - expected.actionTimeMs) < 1e-9,
            `${clipId} action time changed`
        );
        assert.ok(
            Math.abs(actual.durationMs - expected.durationMs) < 1e-9,
            `${clipId} duration changed`
        );
        assert.deepEqual(actual.phases, expected.phases, clipId);
        assert.equal(
            actual.powerful,
            expected.powerful === true,
            `${clipId} powerful marker changed`
        );
        assert.equal(actual.allBodiesNative, true, clipId);
        assert.equal(actual.allPosesPresent, true, clipId);
        assert.equal(
            COMBAT_ANIMATION_EVENT_TYPES[clipId],
            expected.eventType,
            clipId
        );
    });
});

test('all 22 main-hand items declare exact family and handedness mappings', () => {
    const weapons = Object.values(ItemDatabase)
        .filter(item => item.slot === 'weapon');

    assert.equal(weapons.length, 22);
    assert.deepEqual(
        weapons.map(item => item.id).sort(),
        Object.keys(EXPECTED_WEAPONS).sort()
    );
    weapons.forEach(item => {
        const [
            handedness,
            family,
            standardAnim,
            specialAnim
        ] = EXPECTED_WEAPONS[item.id];
        assert.equal(item.handedness, handedness, item.id);
        assert.equal(item.animationFamily, family, item.id);
        assert.equal(
            item.twoHanded === true,
            handedness === 'two',
            `${item.id} twoHanded disagrees with handedness`
        );
        assert.equal(
            item.combat.standard.animType,
            standardAnim,
            `${item.id} standard animation`
        );
        assert.equal(
            item.combat.special.animType,
            specialAnim,
            `${item.id} special animation`
        );
    });

    const expectedOffhands = {
        round_shield: {
            slot: 'offhand',
            type: 'Shield',
            offhandType: 'shield',
            rarity: 'Uncommon',
            defense: 3,
            value: 35,
            spriteId: 'offhand_round_shield'
        },
        captains_shield: {
            slot: 'offhand',
            type: 'Shield',
            offhandType: 'shield',
            rarity: 'Rare',
            defense: 7,
            value: 90,
            spriteId: 'offhand_captains_shield'
        },
        tower_shield: {
            slot: 'offhand',
            type: 'Shield',
            offhandType: 'shield',
            rarity: 'Epic',
            defense: 14,
            speed: -1,
            value: 180,
            spriteId: 'offhand_tower_shield'
        },
        parrying_dagger: {
            slot: 'offhand',
            type: 'Dagger',
            offhandType: 'weapon',
            rarity: 'Epic',
            offense: 5,
            speed: 1,
            value: 140,
            spriteId: 'offhand_parrying_dagger',
            handedness: 'one',
            animationFamily: 'dual_wield'
        }
    };
    Object.entries(expectedOffhands).forEach(([itemId, expected]) => {
        assert.deepEqual(
            Object.fromEntries(
                Object.keys(expected).map(key => [
                    key,
                    ItemDatabase[itemId][key]
                ])
            ),
            expected,
            `${itemId} production fields`
        );
    });
});

test('offhand weapons select dual wield without stealing two-handed families', () => {
    const offhand = ItemDatabase.parrying_dagger;
    const dagger = ItemDatabase.mimic_fang_dagger;

    assert.equal(
        resolveCombatAnimationClip({
            weapon: dagger,
            offhand,
            animType: dagger.combat.standard.animType
        }),
        'dual_wield'
    );

    [
        ['tankard_maul', 'heavy'],
        ['hunters_spear', 'thrust'],
        ['scythe_of_reaping', 'scythe']
    ].forEach(([weaponId, expectedClip]) => {
        const weapon = ItemDatabase[weaponId];
        assert.equal(
            resolveCombatAnimationClip({
                weapon,
                offhand,
                animType: weapon.combat.standard.animType
            }),
            expectedClip,
            weaponId
        );

        // Handedness is part of the public equipment contract even when a
        // caller supplies a lightweight weapon descriptor without twoHanded.
        assert.equal(
            resolveCombatAnimationClip({
                weapon: {
                    handedness: 'two',
                    animationFamily: expectedClip
                },
                offhand,
                animType: expectedClip
            }),
            expectedClip,
            `${expectedClip} handedness-only descriptor`
        );
    });
});

test('one-handed specials stay bash and heavy actions require two hands', () => {
    ['bone_fetch_club', 'rusty_mace'].forEach(weaponId => {
        const weapon = ItemDatabase[weaponId];
        assert.equal(weapon.handedness, 'one', weaponId);
        assert.equal(weapon.twoHanded === true, false, weaponId);
        assert.equal(
            weapon.combat.standard.animType,
            'bash',
            `${weaponId} standard`
        );
        assert.equal(
            weapon.combat.special.animType,
            'bash',
            `${weaponId} special`
        );
    });

    const heavyActions = Object.values(ItemDatabase)
        .filter(item => item.slot === 'weapon')
        .flatMap(item => ['standard', 'special'].map(actionId => ({
            item,
            actionId,
            action: item.combat[actionId]
        })))
        .filter(entry => entry.action.animType === 'heavy');

    assert.ok(heavyActions.length > 0);
    heavyActions.forEach(({ item, actionId }) => {
        assert.equal(
            item.handedness,
            'two',
            `${item.id}.${actionId} uses heavy with one hand`
        );
        assert.equal(
            item.twoHanded,
            true,
            `${item.id}.${actionId} lacks twoHanded`
        );
    });
});

test('four stance profiles merge sparse anchors into six-slot visual profiles', () => {
    assert.deepEqual(
        Object.keys(HumanoidStanceProfiles),
        ['standard', 'armored', 'agile', 'heavy']
    );
    assert.deepEqual(
        [...HUMANOID_VISUAL_EQUIPMENT_SLOTS],
        ['helmet', 'armor', 'gloves', 'boots', 'weapon', 'offhand']
    );
    assert.deepEqual(
        [...HUMANOID_VISUAL_ANCHOR_KEYS],
        ['weapon', 'release', 'frontWeapon', 'offhand', 'frontOffhand']
    );

    Object.entries(HumanoidStanceProfiles).forEach(([stanceId, stance]) => {
        assert.equal(stance.id, stanceId);
        assert.equal(stance.visualScale, 1);
        assert.equal(Object.isFrozen(stance), true);
        assert.equal(Object.isFrozen(stance.overrides), true);
        assert.deepEqual(
            Object.keys(stance.overrides.anchors.default),
            [...HUMANOID_VISUAL_ANCHOR_KEYS]
        );
    });
    Object.values(HumanoidActorVisualProfiles).forEach(profile => {
        assert.deepEqual(
            Object.keys(profile.equipment),
            [...HUMANOID_VISUAL_EQUIPMENT_SLOTS],
            profile.label
        );
        assert.ok(
            Object.hasOwn(HumanoidStanceProfiles, profile.stanceProfileId),
            profile.label
        );
    });

    assert.deepEqual(
        HumanoidStanceProfiles.armored.overrides.anchors.default.offhand,
        [-1, 0]
    );
    assert.deepEqual(
        HumanoidStanceProfiles.agile.overrides.anchors.dual_wield.offhand,
        [-1, 0]
    );
    assert.deepEqual(
        HumanoidStanceProfiles.heavy.overrides.anchors.heavy.weapon,
        [0, -1]
    );
});

test('advanced prototypes and named town NPCs expose their intended shared loadouts', () => {
    assert.deepEqual(
        [...SPECIAL_HUMANOID_NPC_PROFILE_IDS],
        [
            'npc_kreg',
            'npc_mara',
            'npc_elowen',
            'npc_tilda',
            'npc_marlow',
            'cellar_dweller'
        ]
    );
    assert.deepEqual(
        [...ADVANCED_HUMANOID_PROTOTYPE_PROFILE_IDS],
        [
            'shield_guard_captain',
            'tankard_brute',
            'harvest_champion',
            'cellar_dweller',
            'cult_champion'
        ]
    );
    assert.equal(
        new Set(HUMANOID_NPC_STUDIO_PROFILE_IDS).size,
        HUMANOID_NPC_STUDIO_PROFILE_IDS.length
    );

    const expected = {
        npc_kreg: {
            group: 'special',
            stance: 'standard',
            clip: 'cast',
            defensiveClip: null,
            weapon: null,
            offhand: null
        },
        shield_guard_captain: {
            group: 'advanced',
            stance: 'armored',
            clip: 'slash',
            defensiveClip: 'shield_block',
            weapon: 'weap_machete',
            offhand: 'offhand_captains_shield'
        },
        tankard_brute: {
            group: 'advanced',
            stance: 'heavy',
            clip: 'heavy',
            defensiveClip: null,
            weapon: 'weap_tankard',
            offhand: null
        },
        harvest_champion: {
            group: 'advanced',
            stance: 'armored',
            clip: 'thrust',
            defensiveClip: null,
            weapon: 'pitchfork_spear',
            offhand: null
        },
        cellar_dweller: {
            group: 'special',
            stance: 'agile',
            clip: 'dual_wield',
            defensiveClip: null,
            weapon: 'weap_mimic_dagger',
            offhand: 'offhand_parrying_dagger'
        },
        cult_champion: {
            group: 'advanced',
            stance: 'heavy',
            clip: 'scythe',
            defensiveClip: null,
            weapon: 'scythe_of_reaping',
            offhand: null
        }
    };

    Object.entries(expected).forEach(([profileId, loadout]) => {
        const profile = HumanoidActorVisualProfiles[profileId];
        assert.ok(profile, profileId);
        assert.equal(profile.profileGroup, loadout.group, profileId);
        assert.equal(profile.stanceProfileId, loadout.stance, profileId);
        assert.equal(profile.attackClip, loadout.clip, profileId);
        assert.equal(
            profile.defensiveClip,
            loadout.defensiveClip,
            profileId
        );
        assert.equal(
            profile.equipment.weapon
                ? profile.equipment.weapon.spriteId
                : null,
            loadout.weapon,
            profileId
        );
        assert.equal(
            profile.equipment.offhand
                ? profile.equipment.offhand.spriteId
                : null,
            loadout.offhand,
            profileId
        );
    });

    const kreg = createKregActor({ x: 1, y: 2 });
    const dweller = createCellarDwellerActor({ x: 7, y: 4 });
    assert.equal(kreg.visualProfileId, 'npc_kreg');
    assert.equal(dweller.visualProfileId, 'cellar_dweller');
    assert.equal(
        resolveHumanoidActorVisualProfile(kreg),
        HumanoidActorVisualProfiles.npc_kreg
    );
    assert.equal(
        resolveHumanoidActorVisualProfile(dweller),
        HumanoidActorVisualProfiles.cellar_dweller
    );
    assert.equal(isHumanoidActor(kreg), true);
    assert.equal(isHumanoidActor(dweller), true);

    const context = loadWave3VisualContext();
    const validation = toPlain(vm.runInContext(
        'validateHumanoidVisualProfileRegistry()',
        context
    ));
    Object.keys(expected).forEach(profileId => {
        assert.equal(validation[profileId].valid, true, profileId);
        assert.deepEqual(validation[profileId].errors, [], profileId);
    });
});

test('offhand equipment and animated side matrices remain native and anchored', () => {
    const context = loadWave3VisualContext();
    const audit = toPlain(vm.runInContext(`(() => {
        const native = matrix => (
            Array.isArray(matrix)
            && matrix.length === 32
            && matrix.every(row => Array.isArray(row) && row.length === 32)
        );
        const paletteSafe = matrix => matrix.flat().every(key =>
            key === '.'
            || key === '_'
            || Object.prototype.hasOwnProperty.call(PALETTE, key)
        );
        const occupiedNear = (matrix, point, radius = 2) => {
            for (let y = point[1] - radius; y <= point[1] + radius; y++) {
                for (let x = point[0] - radius; x <= point[0] + radius; x++) {
                    if (
                        matrix[y]
                        && matrix[y][x]
                        && matrix[y][x] !== '.'
                        && matrix[y][x] !== '_'
                    ) return true;
                }
            }
            return false;
        };
        const specs = Object.entries(EquipmentOverhaulSpecs.offhand)
            .map(([spriteId, spec]) => {
                const matrix = EquipmentOverhaulMatrices[spriteId];
                return {
                    spriteId,
                    offhandType: spec.offhandType,
                    native: native(matrix),
                    paletteSafe: paletteSafe(matrix),
                    occupied: matrix.flat().filter(key =>
                        key !== '.' && key !== '_'
                    ).length
                };
            });
        const studies = [
            ['shield_block', 'offhand_captains_shield'],
            ['shield_bash', 'offhand_captains_shield'],
            ['dual_wield', 'offhand_parrying_dagger']
        ].flatMap(([clipId, spriteId]) =>
            SidePlayerAnimationClips[clipId].frames.map(
                (_poseId, frameIndex) => {
                    const frame = getSidePlayerAnimationFrame(
                        'male',
                        clipId,
                        frameIndex
                    );
                    const matrix = getSidePlayerOffhandMatrix(
                        { spriteId },
                        frame
                    );
                    const pose = getSidePlayerOffhandPose(
                        frame,
                        { spriteId }
                    );
                    return {
                        clipId,
                        frameIndex,
                        poseId: frame.poseId,
                        native: native(matrix),
                        paletteSafe: paletteSafe(matrix),
                        attached: occupiedNear(
                            matrix,
                            frame.anchors.offhandHand
                        ),
                        rawAuthored: Boolean(frame.pose.offhand),
                        anchorMatchesGrip:
                            frame.anchors.offhandHand[0] === pose.grip[0]
                            && frame.anchors.offhandHand[1] === pose.grip[1],
                        layer: pose.layer,
                        kind: pose.kind
                    };
                }
            )
        );
        return { specs, studies };
    })()`, context));

    assert.equal(audit.specs.length, 4);
    assert.deepEqual(
        audit.specs.map(entry => entry.spriteId).sort(),
        [
            'offhand_captains_shield',
            'offhand_parrying_dagger',
            'offhand_round_shield',
            'offhand_tower_shield'
        ]
    );
    audit.specs.forEach(spec => {
        assert.ok(['shield', 'weapon'].includes(spec.offhandType));
        assert.equal(spec.native, true, spec.spriteId);
        assert.equal(spec.paletteSafe, true, spec.spriteId);
        assert.ok(spec.occupied >= 4, spec.spriteId);
    });
    audit.studies.forEach(frame => {
        const label = `${frame.clipId} frame ${frame.frameIndex}`;
        assert.equal(frame.native, true, label);
        assert.equal(frame.paletteSafe, true, label);
        assert.equal(frame.attached, true, label);
        assert.equal(frame.rawAuthored, true, label);
        assert.equal(frame.anchorMatchesGrip, true, label);
        assert.ok(['front', 'back', 'underHands'].includes(frame.layer), label);
        assert.equal(
            frame.kind,
            frame.clipId === 'dual_wield' ? 'weapon' : 'shield',
            label
        );
    });
});

test('profile offhand depth beats defaults while authored defense depth wins', () => {
    const context = loadWave3VisualContext();
    const audit = toPlain(vm.runInContext(`(() => {
        const sentinel = Array.from(
            { length: 32 },
            () => Array(32).fill('.')
        );
        const originalOffhandMatrix = getSidePlayerOffhandMatrix;
        const originalDraw = drawProceduralSprite;
        const mockContext = {
            save() {},
            restore() {},
            translate() {},
            scale() {},
            rotate() {},
            beginPath() {},
            rect() {},
            clip() {}
        };
        const shield = { spriteId: 'offhand_captains_shield' };

        const renderOrder = (clipId, frameIndex, profileLayer) => {
            const frame = getSidePlayerAnimationFrame(
                'male',
                clipId,
                frameIndex
            );
            const calls = [];
            getSidePlayerOffhandMatrix = () => sentinel;
            drawProceduralSprite = (_context, matrix) => {
                if (matrix === sentinel) calls.push('offhand');
                if (matrix === frame.body) calls.push('body');
            };
            drawSidePlayerAnimationFrame(
                mockContext,
                'male',
                clipId,
                frameIndex,
                32,
                {
                    showHair: false,
                    helmetItem: null,
                    armorItem: null,
                    gloveItem: null,
                    bootItem: null,
                    weaponItem: null,
                    offhandItem: shield,
                    layerOverrides: { offhand: profileLayer }
                }
            );
            return {
                calls,
                authoredLayer: getSidePlayerOffhandPose(
                    frame,
                    shield
                ).layer
            };
        };

        try {
            return {
                idleDefault: renderOrder('idle', 0, null),
                idleProfile: renderOrder('idle', 0, 'underHands'),
                block: renderOrder('shield_block', 1, 'back'),
                bash: renderOrder('shield_bash', 2, 'back')
            };
        } finally {
            getSidePlayerOffhandMatrix = originalOffhandMatrix;
            drawProceduralSprite = originalDraw;
        }
    })()`, context));

    assert.deepEqual(audit.idleDefault.calls, ['offhand', 'body']);
    assert.equal(audit.idleDefault.authoredLayer, null);

    assert.deepEqual(audit.idleProfile.calls, ['body', 'offhand']);
    assert.equal(audit.idleProfile.authoredLayer, null);

    ['block', 'bash'].forEach(actionId => {
        assert.deepEqual(
            audit[actionId].calls,
            ['body', 'offhand'],
            actionId
        );
        assert.equal(audit[actionId].authoredLayer, 'front', actionId);
    });
});

test('shield defenses keep the weapon behind the leading shield in both facings', () => {
    const context = loadWave3VisualContext();
    const audit = toPlain(vm.runInContext(`(() => {
        const profile =
            HumanoidActorVisualProfiles.shield_guard_captain;
        const weaponSentinel = Array.from(
            { length: 32 },
            () => Array(32).fill('W')
        );
        const offhandSentinel = Array.from(
            { length: 32 },
            () => Array(32).fill('S')
        );
        const originalWeaponBitmap =
            drawSidePlayerEquippedWeaponBitmap;
        const originalWeaponMatrix =
            getSidePlayerEquippedWeaponMatrix;
        const originalOffhandMatrix =
            getSidePlayerOffhandMatrix;
        const originalDraw = drawProceduralSprite;

        const renderOrder = (clipId, frameIndex, facing) => {
            const frame = getSidePlayerAnimationFrame(
                'male',
                clipId,
                frameIndex
            );
            const calls = [];
            const scales = [];
            const mockContext = {
                save() {},
                restore() {},
                translate() {},
                scale(x, y) {
                    scales.push([x, y]);
                },
                rotate() {},
                beginPath() {},
                rect() {},
                clip() {}
            };

            drawSidePlayerEquippedWeaponBitmap = () => false;
            getSidePlayerEquippedWeaponMatrix =
                () => weaponSentinel;
            getSidePlayerOffhandMatrix = () => offhandSentinel;
            drawProceduralSprite = (_context, matrix) => {
                if (matrix === frame.body) calls.push('body');
                if (matrix === weaponSentinel) calls.push('weapon');
                if (matrix === offhandSentinel) calls.push('offhand');
            };
            drawSidePlayerAnimationFrame(
                mockContext,
                'male',
                clipId,
                frameIndex,
                32,
                {
                    facing,
                    showHair: false,
                    helmetItem: null,
                    armorItem: null,
                    gloveItem: null,
                    bootItem: null,
                    weaponItem: profile.equipment.weapon,
                    offhandItem: profile.equipment.offhand,
                    anchorOffsets:
                        resolveHumanoidProfileAnchorOffsets(
                            profile,
                            clipId
                        ),
                    layerOverrides: profile.overrides.layers
                }
            );
            return {
                calls,
                mirrored: scales.some(
                    scale => scale[0] === -1 && scale[1] === 1
                )
            };
        };

        try {
            const actionFrame =
                SidePlayerAnimationClips.shield_bash.actionFrame;
            const contactFrame = getSidePlayerAnimationFrame(
                'male',
                'shield_bash',
                actionFrame
            );
            const contactShield = originalOffhandMatrix(
                profile.equipment.offhand,
                contactFrame
            );
            const offsets = resolveHumanoidProfileAnchorOffsets(
                profile,
                'shield_bash'
            );
            const occupiedX = contactShield.flatMap(row =>
                row.flatMap((key, x) =>
                    key === '.' || key === '_' ? [] : [x]
                )
            );
            const right = {
                minX: Math.min(...occupiedX) + offsets.offhand[0],
                maxX: Math.max(...occupiedX) + offsets.offhand[0]
            };
            const left = {
                minX: 31 - right.maxX,
                maxX: 31 - right.minX
            };

            return {
                offsets,
                right,
                left,
                idle: renderOrder('idle', 0, 'right'),
                blockRight: renderOrder(
                    'shield_block',
                    SidePlayerAnimationClips.shield_block.actionFrame,
                    'right'
                ),
                blockLeft: renderOrder(
                    'shield_block',
                    SidePlayerAnimationClips.shield_block.actionFrame,
                    'left'
                ),
                bashRight: renderOrder(
                    'shield_bash',
                    actionFrame,
                    'right'
                ),
                bashLeft: renderOrder(
                    'shield_bash',
                    actionFrame,
                    'left'
                )
            };
        } finally {
            drawSidePlayerEquippedWeaponBitmap =
                originalWeaponBitmap;
            getSidePlayerEquippedWeaponMatrix =
                originalWeaponMatrix;
            getSidePlayerOffhandMatrix = originalOffhandMatrix;
            drawProceduralSprite = originalDraw;
        }
    })()`, context));

    assert.deepEqual(audit.offsets.offhand, [1, 0]);
    assert.deepEqual(audit.right, { minX: 19, maxX: 30 });
    assert.deepEqual(audit.left, { minX: 1, maxX: 12 });
    assert.deepEqual(audit.idle.calls, [
        'body',
        'offhand',
        'weapon'
    ]);
    [
        audit.blockRight,
        audit.blockLeft,
        audit.bashRight,
        audit.bashLeft
    ].forEach(action => {
        assert.deepEqual(action.calls, [
            'body',
            'weapon',
            'offhand'
        ]);
    });
    assert.equal(audit.blockRight.mirrored, false);
    assert.equal(audit.bashRight.mirrored, false);
    assert.equal(audit.blockLeft.mirrored, true);
    assert.equal(audit.bashLeft.mirrored, true);
});

test('advanced equipment matrices retain a transparent 32x32 safety border', () => {
    const context = loadWave3VisualContext();
    const audit = toPlain(vm.runInContext(`(() => {
        const blank = value => value === '.' || value === '_';
        const inspect = (label, matrix) => {
            const native = (
                Array.isArray(matrix)
                && matrix.length === 32
                && matrix.every(
                    row => Array.isArray(row) && row.length === 32
                )
            );
            if (!native) return { label, native, occupied: 0, borderClear: false };

            const occupied = matrix.flat().filter(value => !blank(value)).length;
            const border = [
                ...matrix[0],
                ...matrix[31],
                ...matrix.map(row => row[0]),
                ...matrix.map(row => row[31])
            ];
            return {
                label,
                native,
                occupied,
                borderClear: border.every(blank)
            };
        };

        const mainStudies = [
            ['hunters_spear', 'thrust'],
            ['pitchfork_spear', 'thrust'],
            ['tankard_maul', 'heavy'],
            ['blackout_axe', 'heavy'],
            ['mimic_fang_dagger', 'dagger'],
            ['mimic_fang_dagger', 'dual_wield'],
            ['scythe_of_reaping', 'scythe']
        ].flatMap(([weaponId, clipId]) =>
            SidePlayerAnimationClips[clipId].frames.map(
                (_poseId, frameIndex) => inspect(
                    'main:' + weaponId + ':' + clipId + ':' + frameIndex,
                    getSidePlayerEquippedWeaponMatrix(
                        ItemDatabase[weaponId],
                        clipId,
                        frameIndex
                    )
                )
            )
        );

        const offhandStudies = [
            ['offhand_captains_shield', 'idle'],
            ['offhand_captains_shield', 'walk'],
            ['offhand_captains_shield', 'shield_block'],
            ['offhand_captains_shield', 'shield_bash'],
            ['offhand_captains_shield', 'hit'],
            ['offhand_captains_shield', 'defeat'],
            ['offhand_parrying_dagger', 'idle'],
            ['offhand_parrying_dagger', 'walk'],
            ['offhand_parrying_dagger', 'dual_wield'],
            ['offhand_parrying_dagger', 'hit'],
            ['offhand_parrying_dagger', 'defeat']
        ].flatMap(([spriteId, clipId]) =>
            SidePlayerAnimationClips[clipId].frames.map(
                (_poseId, frameIndex) => {
                    const frame = getSidePlayerAnimationFrame(
                        'female',
                        clipId,
                        frameIndex
                    );
                    return inspect(
                        'offhand:' + spriteId + ':' + clipId + ':' + frameIndex,
                        getSidePlayerOffhandMatrix({ spriteId }, frame)
                    );
                }
            )
        );

        return [...mainStudies, ...offhandStudies];
    })()`, context));

    audit.forEach(entry => {
        assert.equal(entry.native, true, entry.label);
        assert.ok(entry.occupied > 0, entry.label);
    });
    assert.deepEqual(
        audit.filter(entry => !entry.borderClear).map(entry => entry.label),
        [],
        'equipment touching an outer edge is at risk of clipped pixels'
    );
});

test('champion contact weapons stay readable and mirror as native silhouettes', () => {
    const context = loadWave3VisualContext();
    const audit = toPlain(vm.runInContext(`(() => {
        const blank = value => value === '.' || value === '_';
        const inspect = profileId => {
            const profile = HumanoidActorVisualProfiles[profileId];
            const clipId = profile.attackClip;
            const frameIndex =
                SidePlayerAnimationClips[clipId].actionFrame;
            const frame = getSidePlayerAnimationFrame(
                profile.appearance.gender,
                clipId,
                frameIndex
            );
            const matrix = getSidePlayerEquippedWeaponMatrix(
                profile.equipment.weapon,
                clipId,
                frameIndex
            );
            const offsets = resolveHumanoidProfileAnchorOffsets(
                profile,
                clipId
            );
            const coordinates = [];
            matrix.forEach((row, y) => {
                row.forEach((key, x) => {
                    if (blank(key)) return;
                    coordinates.push([
                        x + offsets.weapon[0],
                        y + offsets.weapon[1]
                    ]);
                });
            });
            const xs = coordinates.map(point => point[0]);
            const ys = coordinates.map(point => point[1]);
            const rightBounds = {
                minX: Math.min(...xs),
                maxX: Math.max(...xs),
                minY: Math.min(...ys),
                maxY: Math.max(...ys)
            };
            const leftBounds = {
                minX: 31 - rightBounds.maxX,
                maxX: 31 - rightBounds.minX,
                minY: rightBounds.minY,
                maxY: rightBounds.maxY
            };
            const outsideBody = coordinates.filter(([x, y]) => (
                !frame.body[y]
                || blank(frame.body[y][x])
            )).length;
            const aboveGrip = coordinates.filter(([_x, y]) => (
                y <= frame.anchors.weaponHand[1] - 5
            )).length;
            const forwardRows = new Set(
                coordinates
                    .filter(([x]) => x >= 27)
                    .map(([_x, y]) => y)
            ).size;

            const originalDraw = drawProceduralSprite;
            const renderFacing = facing => {
                let weaponDraws = 0;
                let mirrored = false;
                const mockContext = {
                    save() {},
                    restore() {},
                    translate() {},
                    scale(x, y) {
                        if (x === -1 && y === 1) mirrored = true;
                    },
                    rotate() {},
                    beginPath() {},
                    rect() {},
                    clip() {},
                    fillRect() {}
                };
                drawProceduralSprite = (_context, candidate) => {
                    if (candidate === matrix) weaponDraws += 1;
                };
                drawHumanoidActorAnimationFrame(
                    mockContext,
                    profile,
                    clipId,
                    frameIndex,
                    32,
                    {
                        facing,
                        appearance: profile.appearance,
                        hairStyle: profile.appearance.hairStyle,
                        helmetItem: profile.equipment.helmet,
                        armorItem: profile.equipment.armor,
                        gloveItem: profile.equipment.gloves,
                        bootItem: profile.equipment.boots,
                        weaponItem: profile.equipment.weapon,
                        offhandItem: profile.equipment.offhand,
                        anchorOffsets: offsets,
                        layerOverrides: profile.overrides.layers
                    }
                );
                return { weaponDraws, mirrored };
            };

            try {
                return {
                    profileId,
                    spriteId: profile.equipment.weapon.spriteId,
                    rightBounds,
                    leftBounds,
                    width: rightBounds.maxX - rightBounds.minX + 1,
                    height: rightBounds.maxY - rightBounds.minY + 1,
                    outsideBody,
                    aboveGrip,
                    forwardRows,
                    right: renderFacing('right'),
                    left: renderFacing('left')
                };
            } finally {
                drawProceduralSprite = originalDraw;
            }
        };

        return {
            harvest: inspect('harvest_champion'),
            cult: inspect('cult_champion')
        };
    })()`, context));

    assert.equal(audit.harvest.spriteId, 'pitchfork_spear');
    assert.ok(audit.harvest.width >= 13);
    assert.ok(audit.harvest.height >= 5);
    assert.ok(audit.harvest.rightBounds.minX <= 18);
    assert.ok(audit.harvest.rightBounds.maxX >= 29);
    assert.ok(audit.harvest.outsideBody >= 18);
    assert.ok(audit.harvest.forwardRows >= 5);

    assert.equal(audit.cult.spriteId, 'scythe_of_reaping');
    assert.ok(audit.cult.width >= 14);
    assert.ok(audit.cult.height >= 12);
    assert.ok(audit.cult.rightBounds.minY <= 11);
    assert.ok(audit.cult.aboveGrip >= 5);
    assert.ok(audit.cult.outsideBody >= 12);

    [audit.harvest, audit.cult].forEach(entry => {
        assert.equal(entry.right.weaponDraws, 1, entry.profileId);
        assert.equal(entry.right.mirrored, false, entry.profileId);
        assert.equal(entry.left.weaponDraws, 1, entry.profileId);
        assert.equal(entry.left.mirrored, true, entry.profileId);
        assert.equal(
            entry.leftBounds.minX,
            31 - entry.rightBounds.maxX,
            entry.profileId
        );
        assert.equal(
            entry.leftBounds.maxX,
            31 - entry.rightBounds.minX,
            entry.profileId
        );
        assert.ok(entry.leftBounds.minX >= 1, entry.profileId);
        assert.ok(entry.leftBounds.maxX <= 30, entry.profileId);
    });
});

test('offhand and two-hand anchors mirror exactly in both facings', () => {
    const context = loadWave3VisualContext();
    const audit = toPlain(vm.runInContext(`(() => (
        ${JSON.stringify(NEW_CLIP_IDS)}.flatMap(clipId =>
            SidePlayerAnimationClips[clipId].frames.map(
                (_poseId, frameIndex) => {
                    const frame = getSidePlayerAnimationFrame(
                        'female',
                        clipId,
                        frameIndex
                    );
                    return {
                        clipId,
                        frameIndex,
                        anchors: [
                            'weaponHand',
                            'supportWeaponHand',
                            'offhandHand'
                        ].map(anchorId => {
                            const source = frame.anchors[anchorId];
                            const right = getMirroredSidePlayerAnchor(
                                source,
                                'right'
                            );
                            const left = getMirroredSidePlayerAnchor(
                                source,
                                'left'
                            );
                            const roundTrip = getMirroredSidePlayerAnchor(
                                [left.x, left.y],
                                'left'
                            );
                            return {
                                anchorId,
                                exactMirror:
                                    right.x + left.x === 31
                                    && right.y === left.y,
                                roundTrip:
                                    roundTrip.x === source[0]
                                    && roundTrip.y === source[1]
                            };
                        })
                    };
                }
            )
        )
    ))()`, context));

    audit.forEach(frame => {
        frame.anchors.forEach(anchor => {
            const label = (
                `${frame.clipId} frame ${frame.frameIndex} ${anchor.anchorId}`
            );
            assert.equal(anchor.exactMirror, true, label);
            assert.equal(anchor.roundTrip, true, label);
        });
    });
});

test('two-handed weapons suppress visual offhands while one-handed sets retain them', () => {
    const context = loadWave3VisualContext();
    const result = toPlain(vm.runInContext(`(() => {
        const appearance = {
            gender: 'male',
            skin: 'light',
            hair: 'hair_bald',
            hairColor: 'brown',
            eyes: 'eyes_blue',
            shirtColor: 'blue',
            pantsColor: 'dark',
            bootsColor: 'leather'
        };
        const resolve = (uid, weaponId, offhandId) => {
            const profile = resolveHumanoidActorVisualProfile({
                uid,
                kind: 'player',
                name: uid,
                appearance,
                equipment: {
                    weapon: ItemDatabase[weaponId],
                    offhand: ItemDatabase[offhandId]
                }
            });
            return {
                weapon: profile.equipment.weapon
                    && profile.equipment.weapon.spriteId,
                offhand: profile.equipment.offhand
                    && profile.equipment.offhand.spriteId,
                attackClip: profile.attackClip,
                stance: profile.stanceProfileId
            };
        };
        return {
            spear: resolve(
                'two_spear',
                'hunters_spear',
                'parrying_dagger'
            ),
            heavy: resolve(
                'two_heavy',
                'tankard_maul',
                'captains_shield'
            ),
            duelist: resolve(
                'one_duelist',
                'mimic_fang_dagger',
                'parrying_dagger'
            ),
            captain: resolve(
                'one_captain',
                'scavenged_machete',
                'captains_shield'
            )
        };
    })()`, context));

    assert.equal(result.spear.offhand, null);
    assert.equal(result.spear.attackClip, 'thrust');
    assert.equal(result.heavy.offhand, null);
    assert.equal(result.heavy.attackClip, 'heavy');
    assert.equal(result.heavy.stance, 'heavy');
    assert.equal(result.duelist.offhand, 'offhand_parrying_dagger');
    assert.equal(result.duelist.attackClip, 'dual_wield');
    assert.equal(result.duelist.stance, 'agile');
    assert.equal(result.captain.offhand, 'offhand_captains_shield');
    assert.equal(result.captain.attackClip, 'slash');
    assert.equal(result.captain.stance, 'armored');

    const animationSource = readProjectFile(
        'public/js/sprite-overhaul-animation.js'
    );
    assert.match(
        animationSource,
        /const offhandItem = mainWeaponIsTwoHanded\s*\?\s*null\s*:\s*requestedOffhandItem/
    );
});

test('advanced actors keep independent controller timing, facing, and cleanup', () => {
    const heavy = {
        uid: 'wave3_heavy',
        kind: 'enemy',
        x: 2,
        y: 3,
        size: 1,
        alive: true
    };
    const duelist = {
        uid: 'wave3_duelist',
        kind: 'enemy',
        x: 8,
        y: 3,
        size: 1,
        alive: true
    };
    const events = [];

    CombatSpriteAnimation.clear();
    try {
        const heavyState = CombatSpriteAnimation.startAction(heavy, {
            clipId: 'heavy',
            startTime: 0,
            targetX: 10,
            targetY: 3,
            onEvent: event => events.push([
                event.actor.uid,
                event.clipId,
                event.frameIndex
            ])
        });
        const duelState = CombatSpriteAnimation.startAction(duelist, {
            clipId: 'dual_wield',
            startTime: 0,
            targetX: 1,
            targetY: 3,
            onEvent: event => events.push([
                event.actor.uid,
                event.clipId,
                event.frameIndex
            ])
        });

        assert.ok(heavyState);
        assert.ok(duelState);
        assert.notEqual(heavyState, duelState);
        assert.equal(heavyState.facing, 'right');
        assert.equal(duelState.facing, 'left');
        assert.equal(CombatSpriteAnimation.isActionLocked(heavy), true);
        assert.equal(CombatSpriteAnimation.isActionLocked(duelist), true);

        CombatSpriteAnimation.update(199);
        assert.deepEqual(events, []);
        CombatSpriteAnimation.update(200);
        assert.deepEqual(events, [
            ['wave3_duelist', 'dual_wield', 2]
        ]);
        assert.equal(
            CombatSpriteAnimation.getActionState(heavy).eventFired,
            false
        );
        assert.equal(
            CombatSpriteAnimation.getActionState(duelist).eventFired,
            true
        );

        CombatSpriteAnimation.update(500);
        assert.deepEqual(events, [
            ['wave3_duelist', 'dual_wield', 2],
            ['wave3_heavy', 'heavy', 3]
        ]);
        CombatSpriteAnimation.update(600);
        assert.equal(CombatSpriteAnimation.getActionState(duelist), null);
        assert.ok(CombatSpriteAnimation.getActionState(heavy));
        CombatSpriteAnimation.update(1000);
        assert.equal(CombatSpriteAnimation.getActionState(heavy), null);
        assert.equal(CombatSpriteAnimation.isActionLocked(heavy), false);
        assert.equal(CombatSpriteAnimation.isActionLocked(duelist), false);
    } finally {
        CombatSpriteAnimation.clear();
    }
});

test('reentrant cancellation cannot orphan accepted animation states', () => {
    let uidCounter = 0;
    const makeActor = label => ({
        uid: `wave3_reentrant_${label}_${uidCounter++}`,
        kind: 'enemy',
        x: 0,
        y: 0,
        size: 1,
        alive: true
    });
    const assertRejectedOrSettled = (state, label) => {
        if (state === null) return;
        assert.equal(
            state.lifecycleSettled,
            true,
            `${label} returned an accepted state that no controller owns`
        );
        assert.equal(state.cancelled, true, label);
    };

    CombatSpriteAnimation.clear();
    try {
        [
            [
                'hit',
                (actor, options) => (
                    CombatSpriteAnimation.startHitReaction(actor, options)
                )
            ],
            [
                'defense',
                (actor, options) => (
                    CombatSpriteAnimation.startDefensiveReaction(actor, options)
                )
            ]
        ].forEach(([label, replace]) => {
            const actor = makeActor(label);
            let reentrantState = null;
            const interrupted = CombatSpriteAnimation.startAction(actor, {
                clipId: 'heavy',
                startTime: 0,
                onCancel: () => {
                    reentrantState = CombatSpriteAnimation.startAction(actor, {
                        clipId: 'dagger',
                        startTime: 1
                    });
                }
            });

            const replacement = replace(actor, {
                startTime: 2,
                interrupt: true
            });

            assert.ok(replacement, `${label} replacement was rejected`);
            assert.equal(
                CombatSpriteAnimation.getActionState(actor),
                replacement,
                `${label} returned a state it does not own`
            );
            assert.equal(interrupted.lifecycleSettled, true, label);
            assertRejectedOrSettled(reentrantState, label);
            CombatSpriteAnimation.clear(actor);
        });

        const invalidActor = makeActor('invalid_defense');
        let invalidCancelCount = 0;
        const original = CombatSpriteAnimation.startAction(invalidActor, {
            clipId: 'heavy',
            startTime: 0,
            onCancel: () => {
                invalidCancelCount += 1;
            }
        });
        const invalid = CombatSpriteAnimation.startDefensiveReaction(
            invalidActor,
            {
                clipId: 'shield_bash',
                startTime: 1,
                interrupt: true
            }
        );
        assert.equal(invalid, null);
        assert.equal(invalidCancelCount, 0);
        assert.equal(original.lifecycleSettled, false);
        assert.equal(
            CombatSpriteAnimation.getActionState(invalidActor),
            original
        );
        CombatSpriteAnimation.clear(invalidActor);

        const clearActor = makeActor('actor_clear');
        let actorClearState = null;
        CombatSpriteAnimation.startAction(clearActor, {
            clipId: 'heavy',
            startTime: 0,
            onCancel: () => {
                actorClearState = CombatSpriteAnimation.startAction(
                    clearActor,
                    {
                        clipId: 'dagger',
                        startTime: 1
                    }
                );
            }
        });
        CombatSpriteAnimation.clear(clearActor);
        assert.equal(
            CombatSpriteAnimation.getActionState(clearActor),
            null
        );
        assertRejectedOrSettled(actorClearState, 'actor clear');

        const globalClearActor = makeActor('global_clear');
        const freshActor = makeActor('global_clear_fresh');
        let globalClearState = null;
        CombatSpriteAnimation.startAction(globalClearActor, {
            clipId: 'heavy',
            startTime: 0,
            onCancel: () => {
                globalClearState = CombatSpriteAnimation.startAction(
                    freshActor,
                    {
                        clipId: 'dagger',
                        startTime: 1
                    }
                );
            }
        });
        CombatSpriteAnimation.clear();
        assert.equal(
            CombatSpriteAnimation.getActionState(globalClearActor),
            null
        );
        assert.equal(
            CombatSpriteAnimation.getActionState(freshActor),
            null
        );
        assertRejectedOrSettled(globalClearState, 'global clear');
    } finally {
        CombatSpriteAnimation.clear();
    }
});

test('nonhumanoids retain the legacy renderer fallback', () => {
    const nonhumanoidIds = [
        'wild_ravager',
        'corrupted_cask',
        'enraged_gorilla',
        'spectral_barfly'
    ];
    nonhumanoidIds.forEach(enemyId => {
        const actor = createEnemyActor(createEnemy(enemyId, 0, 0));
        assert.equal(actor.visualProfileId, undefined, enemyId);
        assert.equal(resolveHumanoidActorVisualProfile(actor), null, enemyId);
        assert.equal(isHumanoidActor(actor), false, enemyId);
    });

    const context = loadWave3VisualContext({ includeWorld: true });
    const result = toPlain(vm.runInContext(`(() => {
        let drawCalls = 0;
        const originalDraw = drawProceduralSprite;
        drawProceduralSprite = () => { drawCalls += 1; };
        try {
            return {
                mode: drawWorldActorSprite(
                    {},
                    { id: 'wild_ravager' },
                    0,
                    0,
                    32
                ),
                drawCalls
            };
        } finally {
            drawProceduralSprite = originalDraw;
        }
    })()`, context));
    assert.equal(result.mode, 'legacy-matrix');
    assert.equal(result.drawCalls, 1);
});

test('Humanoid NPC Studio exposes Wave 3 controls, registries, and overlays', () => {
    const studioSource = readProjectFile('public/humanoid-npc-studio.html');

    [
        'id="profile-select"',
        'id="clip-select"',
        'id="main-hand-select"',
        'id="offhand-select"',
        'id="facing-select"',
        'id="frame-range"',
        'id="speed-range"',
        'id="equipment-toggle"',
        'id="anchor-toggle"',
        'id="motion-strip"',
        'id="lineup"',
        'id="study-guard-canvas"',
        'id="study-brute-canvas"'
    ].forEach(fragment => {
        assert.ok(
            studioSource.includes(fragment),
            `Studio is missing ${fragment}`
        );
    });
    [
        'HUMANOID_NPC_STUDIO_PROFILE_IDS',
        'STANDARD_HUMANOID_NPC_PROFILE_IDS',
        'SidePlayerAnimationClips',
        'EquipmentOverhaulSpecs.weapon',
        'EquipmentOverhaulSpecs.offhand',
        'mainHandSelection',
        'offhandSelection',
        'getClipEventMetadata',
        'dataset.eventFrame',
        'profile.profileGroup',
        'CombatSpriteAnimation.startAction',
        'CombatSpriteAnimation.getRenderState',
        'showAnchors'
    ].forEach(fragment => {
        assert.ok(
            studioSource.includes(fragment),
            `Studio is missing registry/control ${fragment}`
        );
    });
    [
        'shield_block',
        'shield_bash',
        'heavy'
    ].forEach(clipId => {
        assert.match(
            studioSource,
            new RegExp(`['"]${clipId}['"]`),
            `Studio controller study is missing ${clipId}`
        );
    });
});
