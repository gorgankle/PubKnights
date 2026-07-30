const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
    HUMANOID_VISUAL_EQUIPMENT_SLOTS,
    HUMANOID_VISUAL_APPEARANCE_KEYS,
    HUMANOID_STANDARD_ANIMATION_SET,
    HUMANOID_VISUAL_ANCHOR_KEYS,
    STANDARD_HUMANOID_NPC_PROFILE_IDS,
    HumanoidActorVisualProfiles,
    getHumanoidActorVisualProfile,
    resolveHumanoidActorVisualProfile,
    isHumanoidActor,
    resolveHumanoidActorActionClip,
    resolveHumanoidProfileAnchorOffsets
} = require('../public/js/humanoid-actor-visuals.js');
const {
    NpcDatabase,
    createEnemy
} = require('../public/js/npc-database.js');
const {
    createEnemyActor,
    createKregActor,
    createCellarDwellerActor
} = require('../combatActors.js');
const {
    createCombatEncounter,
    getWildernessEnemyId,
    WILDERNESS_STANDARD_ENEMY_ROTATIONS
} = require('../combatEncounters.js');
const { LootTables } = require('../public/js/lootTables.js');
const { ItemDatabase } = require('../public/js/items.js');
const {
    getCombatAnimationTimeline,
    resolveCombatAnimationClip,
    getCombatAnimationReleaseOrigin,
    CombatSpriteAnimation
} = require('../public/js/combat-animation.js');

const projectRoot = path.join(__dirname, '..');
const STANDARD_PROFILE_IDS = [
    'goblin_axeling',
    'melee_bandit',
    'bandit_archer',
    'hedge_mage',
    'alpha_poacher'
];
const EXPECTED_ATTACK_CLIPS = Object.freeze({
    goblin_axeling: 'slash',
    melee_bandit: 'slash',
    bandit_archer: 'shoot',
    hedge_mage: 'cast',
    alpha_poacher: 'shoot'
});
const GAMEPLAY_PROFILE_KEYS = new Set([
    'hp',
    'maxHp',
    'stamina',
    'maxStamina',
    'offense',
    'defense',
    'speed',
    'attackRange',
    'attackStaminaCost',
    'poisonChance',
    'poisonTurns',
    'xpDrop',
    'dropChance',
    'controller',
    'teamId',
    'rewardsEligible'
]);

function makeEncounterPlayer(overrides = {}) {
    return {
        username: 'Wave Two Tester',
        hp: 100,
        stamina: 50,
        vitality: 4,
        offense: 4,
        defense: 4,
        speed: 4,
        wildernessLevel: 20,
        equipment: {},
        inventory: [],
        roster: { companions: [], activeIds: [] },
        ...overrides
    };
}

function assertDeeplyFrozen(value, label) {
    if (!value || typeof value !== 'object') return;
    assert.equal(Object.isFrozen(value), true, `${label} is mutable`);
    Object.entries(value).forEach(([key, child]) => {
        assertDeeplyFrozen(child, `${label}.${key}`);
    });
}

function assertNoGameplayProfileKeys(value, profileId, trail = []) {
    if (!value || typeof value !== 'object') return;
    Object.entries(value).forEach(([key, child]) => {
        const nextTrail = [...trail, key];
        assert.equal(
            GAMEPLAY_PROFILE_KEYS.has(key),
            false,
            `${profileId} leaks gameplay field ${nextTrail.join('.')}`
        );
        assertNoGameplayProfileKeys(child, profileId, nextTrail);
    });
}

function withTemporaryGlobal(name, value, callback) {
    const hadValue = Object.prototype.hasOwnProperty.call(globalThis, name);
    const previousValue = globalThis[name];
    globalThis[name] = value;
    try {
        return callback();
    } finally {
        if (hadValue) globalThis[name] = previousValue;
        else delete globalThis[name];
    }
}

test('five standard NPC profiles expose the shared immutable paper-doll contract', () => {
    assert.deepEqual(
        [...STANDARD_HUMANOID_NPC_PROFILE_IDS],
        STANDARD_PROFILE_IDS
    );
    assert.equal(Object.isFrozen(STANDARD_HUMANOID_NPC_PROFILE_IDS), true);

    STANDARD_PROFILE_IDS.forEach(profileId => {
        const profile = getHumanoidActorVisualProfile(profileId);
        const enemy = createEnemyActor(createEnemy(profileId, 2, 3));

        assert.ok(profile, `${profileId} has no visual profile`);
        assert.equal(profile, HumanoidActorVisualProfiles[profileId]);
        assert.equal(resolveHumanoidActorVisualProfile(profileId), profile);
        assert.equal(resolveHumanoidActorVisualProfile(enemy), profile);
        assert.equal(isHumanoidActor(enemy), true);
        assert.equal(profile.animationSet, HUMANOID_STANDARD_ANIMATION_SET);
        assert.equal(profile.body.gender, profile.appearance.gender);
        assert.equal(
            profile.body.spriteId,
            profile.appearance.gender === 'female'
                ? 'body_female'
                : 'body_male'
        );
        assert.equal(profile.hair.spriteId, profile.appearance.hairStyle);
        assert.equal(profile.hair.color, profile.appearance.hairColor);
        assert.equal(profile.face.eyesSpriteId, profile.appearance.eyes);
        assert.deepEqual(
            Object.keys(profile.appearance),
            [...HUMANOID_VISUAL_APPEARANCE_KEYS]
        );
        assert.deepEqual(
            Object.keys(profile.equipment),
            [...HUMANOID_VISUAL_EQUIPMENT_SLOTS]
        );
        assert.ok(profile.overrides.anchors.default);
        assert.deepEqual(
            Object.keys(profile.overrides.anchors.default),
            [...HUMANOID_VISUAL_ANCHOR_KEYS]
        );
        assertDeeplyFrozen(profile, profileId);
    });
});

test('profile asset tokens resolve against the live front, side, palette, and animation registries', () => {
    const context = vm.createContext({
        window: { addEventListener() {} },
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
    [
        'character-creator.js',
        'items.js',
        'sprite-overhaul.js',
        'sprite-overhaul-equipment.js',
        'sprite-overhaul-animation.js',
        'humanoid-actor-visuals.js'
    ].forEach(filename => {
        vm.runInContext(
            fs.readFileSync(
                path.join(projectRoot, 'public', 'js', filename),
                'utf8'
            ),
            context,
            { filename }
        );
    });

    const result = vm.runInContext(`(() => {
        const validation = validateHumanoidVisualProfileRegistry();
        let unknownSetError = '';
        try {
            getHumanoidAnimationSet('missing_humanoid_set');
        } catch (error) {
            unknownSetError = error.name;
        }
        const sideAssets = Object.fromEntries(
            STANDARD_HUMANOID_NPC_PROFILE_IDS.map(profileId => {
                const profile = HumanoidActorVisualProfiles[profileId];
                const equipment = profile.equipment;
                return [profileId, {
                    helmet: !equipment.helmet
                        || Boolean(getSidePlayerHelmetLayers(
                            equipment.helmet
                        )),
                    armor: !equipment.armor
                        || Boolean(getSidePlayerArmorMatrix(
                            equipment.armor,
                            profile.body.gender,
                            'idle_a'
                        )),
                    gloves: !equipment.gloves
                        || Boolean(getSidePlayerGloveMatrix(
                            equipment.gloves,
                            profile.body.gender,
                            'idle_a'
                        )),
                    boots: !equipment.boots
                        || Boolean(getSidePlayerBootMatrix(
                            equipment.boots,
                            profile.body.gender,
                            'idle_a'
                        )),
                    weapon: !equipment.weapon
                        || Boolean(getSidePlayerEquippedWeaponMatrix(
                            equipment.weapon,
                            'idle',
                            0
                        ))
                }];
            })
        );
        return {
            validation: Object.fromEntries(
                Object.entries(validation).map(([id, entry]) => [
                    id,
                    {
                        valid: entry.valid,
                        errors: Array.from(entry.errors)
                    }
                ])
            ),
            sideAssets,
            unknownSetError
        };
    })()`, context);

    Object.entries(result.validation).forEach(([profileId, validation]) => {
        assert.equal(
            validation.valid,
            true,
            `${profileId}: ${validation.errors.join(', ')}`
        );
    });
    Object.entries(result.sideAssets).forEach(([profileId, slots]) => {
        Object.entries(slots).forEach(([slot, valid]) => {
            assert.equal(
                valid,
                true,
                `${profileId} has no side ${slot} asset`
            );
        });
    });
    assert.equal(result.unknownSetError, 'RangeError');
});

test('visual profiles contain no gameplay statistics or reward data', () => {
    STANDARD_PROFILE_IDS.forEach(profileId => {
        const profile = HumanoidActorVisualProfiles[profileId];
        const stats = NpcDatabase[profileId];

        assertNoGameplayProfileKeys(profile, profileId);
        assert.equal(stats.visualProfileId, profileId);
        [
            'appearance',
            'equipment',
            'attackClip',
            'animationSet',
            'overrides'
        ].forEach(visualKey => {
            assert.equal(
                Object.hasOwn(stats, visualKey),
                false,
                `${profileId} stat data embeds ${visualKey}`
            );
        });
        assert.equal(typeof stats.hp, 'number');
        assert.equal(typeof stats.offense, 'number');
        assert.equal(typeof stats.defense, 'number');
    });
});

test('Wilderness rotations are deterministic and make every standard humanoid reachable', () => {
    const rotationCases = [
        [1, WILDERNESS_STANDARD_ENEMY_ROTATIONS.early],
        [6, WILDERNESS_STANDARD_ENEMY_ROTATIONS.mid],
        [16, WILDERNESS_STANDARD_ENEMY_ROTATIONS.late]
    ];

    assert.equal(Object.isFrozen(WILDERNESS_STANDARD_ENEMY_ROTATIONS), true);
    rotationCases.forEach(([level, rotation]) => {
        assert.equal(Object.isFrozen(rotation), true);
        assert.deepEqual(
            Array.from(
                { length: rotation.length * 2 },
                (_, index) => getWildernessEnemyId(level, index)
            ),
            [...rotation, ...rotation]
        );
    });

    const rotatedIds = new Set(
        Object.values(WILDERNESS_STANDARD_ENEMY_ROTATIONS).flat()
    );
    [
        'goblin_axeling',
        'melee_bandit',
        'bandit_archer',
        'hedge_mage',
        'alpha_poacher'
    ].forEach(profileId => {
        assert.equal(
            rotatedIds.has(profileId),
            true,
            `${profileId} is absent from normal Wilderness rotations`
        );
    });
    const highLevelEncounter = createCombatEncounter(
        makeEncounterPlayer(),
        { zoneChoice: 'WILDERNESS', activeLevel: 11 }
    );
    const alphaPoachers = highLevelEncounter.enemies.filter(
        enemy => enemy.id === 'alpha_poacher'
    );

    assert.equal(alphaPoachers.length, 1);
    assert.equal(alphaPoachers[0].visualProfileId, 'alpha_poacher');
    assert.equal(alphaPoachers[0].name, 'Wilderness Alpha-Poacher');
    assert.equal(alphaPoachers[0].hp, 75);
});

test('every standard humanoid encounter enemy has valid XP and loot coverage', () => {
    STANDARD_PROFILE_IDS.forEach(profileId => {
        const loot = LootTables[profileId];

        assert.ok(loot, `${profileId} has no loot table`);
        assert.ok(loot.xpDrop > 0, `${profileId} grants no XP`);
        assert.ok(
            loot.dropChance > 0 && loot.dropChance <= 1,
            `${profileId} has an invalid drop chance`
        );
        assert.ok(
            Array.isArray(loot.pools) && loot.pools.length > 0,
            `${profileId} has no loot pool`
        );
        assert.equal(
            new Set(loot.pools.map(entry => entry.itemId)).size,
            loot.pools.length,
            `${profileId} repeats a loot item`
        );
        loot.pools.forEach(entry => {
            assert.ok(
                ItemDatabase[entry.itemId],
                `${profileId} references unknown item ${entry.itemId}`
            );
            assert.ok(
                Number(entry.weight) > 0,
                `${profileId} has invalid weight for ${entry.itemId}`
            );
        });
    });
});

test('standard profiles select their authored melee, bow, and spell attack clips', () => {
    STANDARD_PROFILE_IDS.forEach(profileId => {
        const actor = createEnemyActor(createEnemy(profileId, 2, 3));
        const profile = resolveHumanoidActorVisualProfile(actor);
        const expectedClip = EXPECTED_ATTACK_CLIPS[profileId];

        assert.equal(profile.attackClip, expectedClip);
        assert.equal(resolveHumanoidActorActionClip(actor), expectedClip);
        assert.equal(
            resolveCombatAnimationClip({
                source: actor.spellId ? 'spell' : undefined,
                isProjectile: Boolean(actor.projectileSprite),
                weapon: profile.equipment.weapon
            }),
            expectedClip
        );
    });

    assert.equal(
        resolveCombatAnimationClip({
            weapon: HumanoidActorVisualProfiles.mercenary_default
                .equipment.weapon
        }),
        'bash'
    );
});

test('humanoid actors keep independent controller locks and mirrored facings', () => {
    const goblin = createEnemyActor(createEnemy('goblin_axeling', 2, 3));
    const poacher = createEnemyActor(createEnemy('alpha_poacher', 8, 3));
    goblin.uid = 'wave2_goblin';
    poacher.uid = 'wave2_poacher';

    CombatSpriteAnimation.clear();
    const goblinState = CombatSpriteAnimation.startAction(goblin, {
        clipId: resolveHumanoidActorActionClip(goblin),
        targetX: 8,
        targetY: 3,
        startTime: 0
    });
    const poacherState = CombatSpriteAnimation.startAction(poacher, {
        clipId: resolveHumanoidActorActionClip(poacher),
        targetX: 2,
        targetY: 3,
        startTime: 0
    });

    assert.notEqual(goblinState, poacherState);
    assert.equal(goblinState.clipId, 'slash');
    assert.equal(goblinState.facing, 'right');
    assert.equal(poacherState.clipId, 'shoot');
    assert.equal(poacherState.facing, 'left');
    assert.equal(CombatSpriteAnimation.isActionLocked(goblin), true);
    assert.equal(CombatSpriteAnimation.isActionLocked(poacher), true);
    assert.deepEqual(
        {
            clipId: CombatSpriteAnimation.getRenderState(
                goblin,
                { now: 0 }
            ).clipId,
            facing: CombatSpriteAnimation.getRenderState(
                goblin,
                { now: 0 }
            ).facing
        },
        { clipId: 'slash', facing: 'right' }
    );
    assert.deepEqual(
        {
            clipId: CombatSpriteAnimation.getRenderState(
                poacher,
                { now: 0 }
            ).clipId,
            facing: CombatSpriteAnimation.getRenderState(
                poacher,
                { now: 0 }
            ).facing
        },
        { clipId: 'shoot', facing: 'left' }
    );

    CombatSpriteAnimation.update(
        getCombatAnimationTimeline('slash').durationMs
    );
    assert.equal(CombatSpriteAnimation.getActionState(goblin), null);
    assert.equal(
        CombatSpriteAnimation.getActionState(poacher),
        poacherState
    );
    assert.equal(
        CombatSpriteAnimation.getRenderState(poacher, {
            now: getCombatAnimationTimeline('slash').durationMs
        }).facing,
        'left'
    );
    CombatSpriteAnimation.clear();
});

test('authored action timing and profile release offsets drive mirrored projectile origins', () => {
    const expectedEvents = {
        slash: 'contact',
        bash: 'contact',
        shoot: 'release',
        cast: 'release'
    };
    Object.entries(expectedEvents).forEach(([clipId, eventType]) => {
        const timeline = getCombatAnimationTimeline(clipId);
        assert.equal(timeline.eventType, eventType);
        assert.ok(timeline.actionTimeMs > 0);
        assert.ok(timeline.actionTimeMs < timeline.durationMs);
    });

    const poacher = createEnemyActor(createEnemy('alpha_poacher', 1, 2));
    poacher.uid = 'wave2_release_poacher';
    poacher.visualX = 6;
    poacher.visualY = 4;
    const offsets = resolveHumanoidProfileAnchorOffsets(poacher, 'shoot');
    assert.deepEqual(offsets.weapon, [0, -1]);
    assert.deepEqual(offsets.release, [1, -1]);

    const frameCalls = [];
    withTemporaryGlobal(
        'resolveHumanoidActorVisualProfile',
        resolveHumanoidActorVisualProfile,
        () => withTemporaryGlobal(
            'resolveHumanoidProfileAnchorOffsets',
            resolveHumanoidProfileAnchorOffsets,
            () => withTemporaryGlobal(
                'getSidePlayerAnimationFrame',
                (gender, clipId, frameIndex) => {
                    frameCalls.push({ gender, clipId, frameIndex });
                    return {
                        pose: {
                            bobY: 0,
                            weapon: {
                                grip: [22, 19],
                                arrowTip: [28, 19]
                            }
                        },
                        anchors: { weaponHand: [18, 20] }
                    };
                },
                () => {
                    const right = getCombatAnimationReleaseOrigin(
                        poacher,
                        'shoot',
                        3,
                        'right'
                    );
                    const left = getCombatAnimationReleaseOrigin(
                        poacher,
                        'shoot',
                        3,
                        'left'
                    );

                    assert.equal(right.x, 6.421875);
                    assert.equal(left.x, 5.578125);
                    assert.equal(right.x + left.x, poacher.visualX * 2);
                    assert.equal(right.y, 4.078125);
                    assert.equal(left.y, right.y);

                    const releases = [];
                    CombatSpriteAnimation.clear();
                    const action = CombatSpriteAnimation.startAction(
                        poacher,
                        {
                            clipId: 'shoot',
                            targetX: 10,
                            targetY: 2,
                            startTime: 0,
                            onEvent(event) {
                                releases.push(event);
                            }
                        }
                    );
                    CombatSpriteAnimation.update(
                        action.timeline.actionTimeMs - 0.001
                    );
                    assert.equal(releases.length, 0);
                    CombatSpriteAnimation.update(
                        action.timeline.actionTimeMs
                    );
                    assert.equal(releases.length, 1);
                    assert.equal(releases[0].eventType, 'release');
                    assert.equal(releases[0].frameIndex, 3);
                    assert.deepEqual(releases[0].releaseOrigin, right);
                    CombatSpriteAnimation.update(action.timeline.durationMs);
                    assert.equal(releases.length, 1);
                    CombatSpriteAnimation.clear();
                }
            )
        )
    );

    assert.ok(frameCalls.length >= 3);
    frameCalls.forEach(call => {
        assert.deepEqual(call, {
            gender: 'female',
            clipId: 'shoot',
            frameIndex: 3
        });
    });
});

test('Humanoid NPC Studio exposes the shared lineup and inspection controls', () => {
    const studioPath = path.join(
        projectRoot,
        'public',
        'humanoid-npc-studio.html'
    );
    assert.equal(
        fs.existsSync(studioPath),
        true,
        'public/humanoid-npc-studio.html is missing'
    );
    const studioSource = fs.readFileSync(studioPath, 'utf8');

    [
        'STANDARD_HUMANOID_NPC_PROFILE_IDS',
        'drawHumanoidActorFront',
        'drawWorldActorSprite',
        'resolveHumanoidProfileAnchorOffsets',
        'drawHumanoidActorAnimationFrame',
        'SidePlayerAnimationClips'
    ].forEach(fragment => {
        assert.ok(
            studioSource.includes(fragment),
            `Humanoid NPC Studio is missing ${fragment}`
        );
    });
    [
        'idle',
        'walk',
        'slash',
        'bash',
        'shoot',
        'cast',
        'hit',
        'defeat'
    ].forEach(clipId => {
        assert.match(
            studioSource,
            new RegExp(`['"]${clipId}['"]`),
            `Humanoid NPC Studio is missing ${clipId}`
        );
    });
    [
        /lineup/i,
        /profile/i,
        /clip/i,
        /facing/i,
        /speed/i,
        /anchor/i,
        /play|pause/i,
        /<canvas\b/i,
        /<select\b/i,
        /<button\b/i,
        /type=["']range["']/i
    ].forEach(pattern => {
        assert.match(
            studioSource,
            pattern,
            `Humanoid NPC Studio is missing ${pattern}`
        );
    });
});

test('Wave 3 migrates special humanoids while nonhumanoids retain the legacy fallback', () => {
    const kreg = createKregActor({ x: 1, y: 2 });
    const cellarDweller = createCellarDwellerActor({ x: 7, y: 4 });
    const deferredEnemyIds = [
        'peanut_slinger',
        'magic_banana',
        'wild_ravager',
        'publing',
        'wilderness_overlord',
        'corrupted_cask',
        'pub_crawl_mimic',
        'vintage_behemoth',
        'enraged_gorilla',
        'spectral_barfly',
        'mash_crawler',
        'eldritch_keg'
    ];

    assert.equal(kreg.visualProfileId, 'npc_kreg');
    assert.equal(
        resolveHumanoidActorVisualProfile(kreg),
        HumanoidActorVisualProfiles.npc_kreg
    );
    assert.equal(isHumanoidActor(kreg), true);
    assert.equal(resolveHumanoidActorActionClip(kreg), 'cast');

    assert.equal(cellarDweller.visualProfileId, 'cellar_dweller');
    assert.equal(
        resolveHumanoidActorVisualProfile(cellarDweller),
        HumanoidActorVisualProfiles.cellar_dweller
    );
    assert.equal(isHumanoidActor(cellarDweller), true);
    assert.equal(
        resolveHumanoidActorActionClip(cellarDweller),
        'dual_wield'
    );
    deferredEnemyIds.forEach(enemyId => {
        const enemy = createEnemyActor(createEnemy(enemyId, 0, 0));
        assert.equal(
            enemy.visualProfileId,
            undefined,
            `${enemyId} unexpectedly entered the humanoid rig`
        );
        assert.equal(resolveHumanoidActorVisualProfile(enemy), null);
        assert.equal(isHumanoidActor(enemy), false);
    });

    const rendererSource = fs.readFileSync(
        path.join(projectRoot, 'public', 'js', 'renderer.js'),
        'utf8'
    );
    assert.match(rendererSource, /SpriteMatrices\[e\.id\]/);
    assert.match(rendererSource, /SpriteMatrices\[actor\.id\]/);
});
