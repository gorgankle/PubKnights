const test = require('node:test');
const assert = require('node:assert/strict');

const {
    HUMANOID_VISUAL_EQUIPMENT_SLOTS,
    HUMANOID_VISUAL_APPEARANCE_KEYS,
    STANDARD_HUMANOID_NPC_PROFILE_IDS,
    SPECIAL_HUMANOID_NPC_PROFILE_IDS,
    ADVANCED_HUMANOID_PROTOTYPE_PROFILE_IDS,
    HUMANOID_NPC_STUDIO_PROFILE_IDS,
    HumanoidStanceProfiles,
    HumanoidActorVisualProfiles,
    resolveHumanoidActorVisualProfile,
    isHumanoidActor,
    getHumanoidActorWeapon,
    resolveHumanoidProfileAnchorOffsets,
    resolveHumanoidActorActionClip
} = require('../public/js/humanoid-actor-visuals.js');
const {
    NpcDatabase,
    createEnemy
} = require('../public/js/npc-database.js');
const {
    createCompanionActor,
    createEnemyActor
} = require('../combatActors.js');

const PROFILE_IDS = [
    'mercenary_default',
    'goblin_axeling',
    'melee_bandit',
    'bandit_archer',
    'hedge_mage',
    'alpha_poacher',
    'npc_kreg',
    'npc_mara',
    'npc_elowen',
    'npc_tilda',
    'npc_marlow',
    'shield_guard_captain',
    'tankard_brute',
    'harvest_champion',
    'cellar_dweller',
    'cult_champion'
];
const GAMEPLAY_STAT_KEYS = new Set([
    'hp',
    'maxHp',
    'stamina',
    'maxStamina',
    'offense',
    'defense',
    'speed',
    'attackRange',
    'attackStaminaCost'
]);

test('humanoid visual profiles are deeply immutable and visual-only', () => {
    assert.equal(Object.isFrozen(HumanoidActorVisualProfiles), true);
    assert.deepEqual(
        [...STANDARD_HUMANOID_NPC_PROFILE_IDS],
        [
            'goblin_axeling',
            'melee_bandit',
            'bandit_archer',
            'hedge_mage',
            'alpha_poacher'
        ]
    );
    assert.deepEqual(
        Object.keys(HumanoidActorVisualProfiles).sort(),
        PROFILE_IDS.slice().sort()
    );

    PROFILE_IDS.forEach(profileId => {
        const profile = HumanoidActorVisualProfiles[profileId];
        assert.equal(Object.isFrozen(profile), true, profileId);
        assert.equal(Object.isFrozen(profile.appearance), true, profileId);
        assert.equal(Object.isFrozen(profile.equipment), true, profileId);
        assert.deepEqual(
            Object.keys(profile.appearance),
            [...HUMANOID_VISUAL_APPEARANCE_KEYS]
        );
        assert.deepEqual(
            Object.keys(profile.equipment),
            [...HUMANOID_VISUAL_EQUIPMENT_SLOTS]
        );
        assert.equal(typeof profile.label, 'string');
        assert.ok([
            'slash',
            'bash',
            'shoot',
            'cast',
            'thrust',
            'heavy',
            'dagger',
            'scythe',
            'shield_bash',
            'dual_wield'
        ].includes(profile.attackClip));

        Object.keys(profile).forEach(key => {
            assert.equal(
                GAMEPLAY_STAT_KEYS.has(key),
                false,
                `${profileId} leaks gameplay field ${key}`
            );
        });
        Object.values(profile.equipment).forEach(item => {
            if (!item) return;
            assert.equal(Object.isFrozen(item), true);
            assert.deepEqual(Object.keys(item), ['spriteId']);
        });
    });
});

test('Wave 3 profiles share stance, offhand, and advanced motion contracts', () => {
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
    assert.deepEqual(
        Object.keys(HumanoidStanceProfiles),
        ['standard', 'armored', 'agile', 'heavy']
    );
    Object.values(HumanoidStanceProfiles).forEach(stance => {
        assert.equal(Object.isFrozen(stance), true);
        assert.equal(stance.visualScale, 1);
        assert.equal(Object.isFrozen(stance.overrides), true);
    });
    assert.deepEqual(
        [...HUMANOID_VISUAL_EQUIPMENT_SLOTS],
        ['helmet', 'armor', 'gloves', 'boots', 'weapon', 'offhand']
    );

    const captain = HumanoidActorVisualProfiles.shield_guard_captain;
    const brute = HumanoidActorVisualProfiles.tankard_brute;
    const lancer = HumanoidActorVisualProfiles.harvest_champion;
    const duelist = HumanoidActorVisualProfiles.cellar_dweller;
    const cultist = HumanoidActorVisualProfiles.cult_champion;

    assert.equal(captain.stanceProfileId, 'armored');
    assert.equal(captain.defensiveClip, 'shield_block');
    assert.deepEqual(captain.equipment.offhand, {
        spriteId: 'offhand_captains_shield'
    });
    assert.equal(brute.stanceProfileId, 'heavy');
    assert.equal(brute.attackClip, 'heavy');
    assert.equal(brute.equipment.offhand, null);
    assert.equal(lancer.attackClip, 'thrust');
    assert.equal(lancer.equipment.offhand, null);
    assert.equal(duelist.stanceProfileId, 'agile');
    assert.equal(duelist.attackClip, 'dual_wield');
    assert.deepEqual(duelist.equipment.offhand, {
        spriteId: 'offhand_parrying_dagger'
    });
    assert.equal(cultist.attackClip, 'scythe');
    assert.equal(cultist.equipment.offhand, null);
});

test('standard humanoid enemies are createable from stat data and carry only a visual profile reference', () => {
    const goblin = createEnemy('goblin_axeling', 1, 2);
    const melee = createEnemy('melee_bandit', 2, 3, 'Frenzied ', 2);
    const archer = createEnemy('bandit_archer', 4, 5);
    const mage = createEnemy('hedge_mage', 6, 7);
    const poacher = createEnemy('alpha_poacher', 8, 5);

    assert.equal(goblin.visualProfileId, 'goblin_axeling');
    assert.equal(melee.name, 'Frenzied Melee Bandit');
    assert.equal(melee.hp, 44);
    assert.equal(melee.offense, 4);
    assert.equal(melee.visualProfileId, 'melee_bandit');
    assert.equal(archer.projectileSprite, 'icon_arrow');
    assert.equal(archer.visualProfileId, 'bandit_archer');
    assert.equal(mage.spellId, 'arcane_bolt');
    assert.equal(mage.spellFx.style, 'arcane');
    assert.equal(mage.visualProfileId, 'hedge_mage');
    assert.equal(poacher.projectileSprite, 'icon_arrow');
    assert.equal(poacher.visualProfileId, 'alpha_poacher');

    STANDARD_HUMANOID_NPC_PROFILE_IDS.forEach(id => {
        const stats = NpcDatabase[id];
        assert.equal(Object.hasOwn(stats, 'appearance'), false);
        assert.equal(Object.hasOwn(stats, 'equipment'), false);
        assert.equal(Object.hasOwn(stats, 'attackClip'), false);
    });
});

test('enemy visual references resolve to their immutable paper-doll profiles', () => {
    const goblin = createEnemyActor(createEnemy('goblin_axeling', 1, 2));
    const melee = createEnemyActor(createEnemy('melee_bandit', 2, 3));
    const archer = createEnemyActor(createEnemy('bandit_archer', 4, 5));
    const mage = createEnemyActor(createEnemy('hedge_mage', 6, 7));
    const poacher = createEnemyActor(createEnemy('alpha_poacher', 8, 5));

    assert.equal(
        resolveHumanoidActorVisualProfile(goblin),
        HumanoidActorVisualProfiles.goblin_axeling
    );
    assert.equal(
        resolveHumanoidActorVisualProfile(melee),
        HumanoidActorVisualProfiles.melee_bandit
    );
    assert.equal(
        resolveHumanoidActorVisualProfile(archer),
        HumanoidActorVisualProfiles.bandit_archer
    );
    assert.equal(
        resolveHumanoidActorVisualProfile(mage),
        HumanoidActorVisualProfiles.hedge_mage
    );
    assert.equal(
        resolveHumanoidActorVisualProfile(poacher),
        HumanoidActorVisualProfiles.alpha_poacher
    );
    [goblin, melee, archer, mage, poacher].forEach(actor => {
        assert.equal(isHumanoidActor(actor), true);
    });
    assert.equal(resolveHumanoidActorActionClip(goblin), 'slash');
    assert.equal(resolveHumanoidActorActionClip(melee), 'slash');
    assert.equal(resolveHumanoidActorActionClip(archer), 'shoot');
    assert.equal(resolveHumanoidActorActionClip(mage), 'cast');
    assert.equal(resolveHumanoidActorActionClip(poacher), 'shoot');
});

test('players resolve live palette appearance and sprite-only equipment', () => {
    const playerActor = {
        uid: 'player_0',
        kind: 'player',
        name: 'Tester',
        appearance: {
            gender: 'female',
            skin: 'deep',
            hair: 'hair_locs',
            hairColor: 'raven',
            eyes: 'eyes_gold',
            shirtColor: 'teal',
            pantsColor: 'navy',
            bootsColor: 'oxblood'
        },
        equipment: {
            weapon: {
                spriteId: 'weap_machete',
                offense: 999,
                combat: { standard: { range: 10 } }
            },
            helmet: null
        }
    };
    const profile = resolveHumanoidActorVisualProfile(playerActor);

    assert.equal(profile.label, 'Tester');
    assert.equal(profile.appearance.hairStyle, 'hair_locs');
    assert.equal(profile.appearance.gender, 'female');
    assert.deepEqual(profile.equipment.weapon, {
        spriteId: 'weap_machete'
    });
    assert.equal(profile.equipment.helmet, null);
    assert.equal(profile.attackClip, 'slash');
    assert.equal(isHumanoidActor(playerActor), true);
});

test('companion actors use the mercenary profile and merge live equipment by slot', () => {
    const companion = createCompanionActor({
        instanceId: 'merc_visual',
        templateId: 'starter_mercenary',
        name: 'Marlow',
        stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
        equipment: {
            weapon: {
                spriteId: 'weap_bow',
                offense: 50,
                projectileSprite: 'icon_arrow',
                combat: { standard: { range: 5 } }
            },
            offhand: {
                spriteId: 'offhand_round_shield',
                defense: 50
            },
            helmet: null
        }
    }, { x: 1, y: 2 });
    const profile = resolveHumanoidActorVisualProfile(companion);

    assert.equal(companion.visualProfileId, 'mercenary_default');
    assert.equal(profile.appearance.gender, 'male');
    assert.equal(profile.equipment.helmet, null);
    assert.deepEqual(profile.equipment.weapon, { spriteId: 'weap_bow' });
    assert.deepEqual(profile.equipment.offhand, {
        spriteId: 'offhand_round_shield'
    });
    assert.deepEqual(profile.equipment.armor, { spriteId: 'armor_tunic' });
    assert.deepEqual(getHumanoidActorWeapon(companion), {
        spriteId: 'weap_bow'
    });
    assert.equal(profile.attackClip, 'shoot');
    assert.equal(resolveHumanoidActorActionClip(companion), 'shoot');
    assert.equal(isHumanoidActor(companion), true);

    companion.equipment.weapon = { spriteId: 'weap_machete' };
    companion.equipment.offhand = {
        spriteId: 'offhand_captains_shield'
    };
    const refreshedProfile =
        resolveHumanoidActorVisualProfile(companion);
    assert.equal(
        refreshedProfile.attackClip,
        'slash'
    );
    assert.deepEqual(refreshedProfile.equipment.offhand, {
        spriteId: 'offhand_captains_shield'
    });
});

test('advanced companion templates apply stance and local overrides exactly once', () => {
    const template = HumanoidActorVisualProfiles.shield_guard_captain;
    const companion = {
        uid: 'merc_guard_captain',
        kind: 'companion',
        visualProfileId: 'shield_guard_captain',
        name: 'Captain',
        equipment: {
            ...template.equipment
        }
    };
    const resolved = resolveHumanoidActorVisualProfile(companion);

    assert.deepEqual(
        resolveHumanoidProfileAnchorOffsets(
            resolved,
            'idle'
        ).offhand,
        [-1, 0],
        'armored stance was applied more than once'
    );
    assert.deepEqual(
        resolveHumanoidProfileAnchorOffsets(
            resolved,
            'shield_bash'
        ).offhand,
        [1, 0],
        'armored shield bash did not advance toward its target'
    );

    companion.visualOverrides = {
        anchors: {
            default: {
                offhand: [1, 0]
            }
        }
    };
    const customized = resolveHumanoidActorVisualProfile(companion);
    assert.deepEqual(
        resolveHumanoidProfileAnchorOffsets(
            customized,
            'idle'
        ).offhand,
        [0, 0]
    );
    assert.deepEqual(
        resolveHumanoidProfileAnchorOffsets(
            customized,
            'shield_bash'
        ).offhand,
        [2, 0],
        'actor override discarded the shared armored bash advance'
    );
});

test('action clip resolution honors explicit, spell, projectile, and authored profile signals', () => {
    const bandit = createEnemy('melee_bandit', 0, 0);

    assert.equal(
        resolveHumanoidActorActionClip(
            bandit,
            {},
            { clipId: 'bash' }
        ),
        'bash'
    );
    assert.equal(
        resolveHumanoidActorActionClip(
            bandit,
            { spellFx: { type: 'beam' } }
        ),
        'cast'
    );
    assert.equal(
        resolveHumanoidActorActionClip(
            bandit,
            { projectileSprite: 'icon_arrow' }
        ),
        'shoot'
    );
    assert.equal(
        resolveHumanoidActorActionClip(
            bandit,
            { fx: { isProjectile: true } }
        ),
        'shoot'
    );
    assert.equal(
        resolveHumanoidActorActionClip(
            bandit,
            { isRangedAttack: true }
        ),
        'shoot'
    );
    assert.equal(
        resolveHumanoidActorActionClip(
            bandit,
            { animType: 'jump_smash' }
        ),
        'bash'
    );
});
