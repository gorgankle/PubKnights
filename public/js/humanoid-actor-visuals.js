// Shared visual-only profiles for 32x32 humanoid paper-doll actors.

const HUMANOID_VISUAL_EQUIPMENT_SLOTS = Object.freeze([
    'helmet',
    'armor',
    'gloves',
    'boots',
    'weapon',
    'offhand'
]);

const HUMANOID_VISUAL_APPEARANCE_KEYS = Object.freeze([
    'gender',
    'skin',
    'hairStyle',
    'hairColor',
    'eyes',
    'shirtColor',
    'pantsColor',
    'bootsColor'
]);

const HUMANOID_STANDARD_ANIMATION_SET = 'humanoid_standard_32';
const HUMANOID_VISUAL_ANCHOR_KEYS = Object.freeze([
    'weapon',
    'release',
    'frontWeapon',
    'offhand',
    'frontOffhand'
]);

function makeHumanoidSpriteDescriptor(spriteId) {
    return spriteId
        ? Object.freeze({ spriteId: String(spriteId) })
        : null;
}

function makeHumanoidAppearance(appearance) {
    const resolved = {};
    HUMANOID_VISUAL_APPEARANCE_KEYS.forEach(key => {
        resolved[key] = String(appearance[key]);
    });
    return Object.freeze(resolved);
}

function makeHumanoidEquipment(equipment = {}) {
    const resolved = {};
    HUMANOID_VISUAL_EQUIPMENT_SLOTS.forEach(slot => {
        resolved[slot] = makeHumanoidSpriteDescriptor(
            equipment[slot] && equipment[slot].spriteId
        );
    });
    return Object.freeze(resolved);
}

function makeHumanoidAnchorOffset(offset) {
    const source = Array.isArray(offset) ? offset : [0, 0];
    return Object.freeze([
        Number.isFinite(Number(source[0])) ? Number(source[0]) : 0,
        Number.isFinite(Number(source[1])) ? Number(source[1]) : 0
    ]);
}

function makeHumanoidAnchorOverrideSet(overrides = {}) {
    const resolved = {};
    HUMANOID_VISUAL_ANCHOR_KEYS.forEach(anchorId => {
        resolved[anchorId] = makeHumanoidAnchorOffset(overrides[anchorId]);
    });
    return Object.freeze(resolved);
}

function makeHumanoidVisualOverrides(overrides = {}) {
    const sourceAnchors = (
        overrides.anchors
        && typeof overrides.anchors === 'object'
    ) ? overrides.anchors : {};
    const anchors = {};
    Object.entries(sourceAnchors).forEach(([clipId, clipOverrides]) => {
        anchors[String(clipId)] = makeHumanoidAnchorOverrideSet(
            clipOverrides
        );
    });
    if (!anchors.default) {
        anchors.default = makeHumanoidAnchorOverrideSet();
    }

    const sourceLayers = (
        overrides.layers
        && typeof overrides.layers === 'object'
    ) ? overrides.layers : {};
    const weaponLayer = ['front', 'back', 'underHands'].includes(
        sourceLayers.weapon
    )
        ? sourceLayers.weapon
        : 'front';
    const offhandLayer = ['front', 'back', 'underHands'].includes(
        sourceLayers.offhand
    )
        ? sourceLayers.offhand
        : 'back';
    const layers = Object.freeze({
        weapon: weaponLayer,
        offhand: offhandLayer,
        hair: sourceLayers.hair === 'hidden' ? 'hidden' : 'auto'
    });

    return Object.freeze({
        anchors: Object.freeze(anchors),
        layers
    });
}

function makeHumanoidLocalVisualOverrides(overrides = {}) {
    const sourceAnchors = (
        overrides.anchors
        && typeof overrides.anchors === 'object'
    ) ? overrides.anchors : {};
    const anchors = {};
    Object.entries(sourceAnchors).forEach(([clipId, clipOverrides]) => {
        anchors[String(clipId)] = makeHumanoidAnchorOverrideSet(
            clipOverrides
        );
    });

    const sourceLayers = (
        overrides.layers
        && typeof overrides.layers === 'object'
    ) ? overrides.layers : {};
    const layers = {};
    ['weapon', 'offhand'].forEach(layerId => {
        if (
            Object.prototype.hasOwnProperty.call(sourceLayers, layerId)
            && ['front', 'back', 'underHands'].includes(
                sourceLayers[layerId]
            )
        ) {
            layers[layerId] = sourceLayers[layerId];
        }
    });
    if (
        Object.prototype.hasOwnProperty.call(sourceLayers, 'hair')
        && ['auto', 'hidden'].includes(sourceLayers.hair)
    ) {
        layers.hair = sourceLayers.hair;
    }

    return Object.freeze({
        anchors: Object.freeze(anchors),
        layers: Object.freeze(layers)
    });
}

function mergeHumanoidLocalVisualOverrides(
    baseOverrides = {},
    requestedOverrides = {}
) {
    const base = makeHumanoidLocalVisualOverrides(baseOverrides);
    const requested = makeHumanoidLocalVisualOverrides(
        requestedOverrides
    );
    const anchorIds = new Set([
        ...Object.keys(base.anchors),
        ...Object.keys(requested.anchors)
    ]);
    const anchors = {};
    anchorIds.forEach(clipId => {
        const combined = {};
        const baseSet = base.anchors[clipId]
            || makeHumanoidAnchorOverrideSet();
        const requestedSet = requested.anchors[clipId]
            || makeHumanoidAnchorOverrideSet();
        HUMANOID_VISUAL_ANCHOR_KEYS.forEach(anchorId => {
            combined[anchorId] = addHumanoidAnchorOffsets(
                baseSet[anchorId],
                requestedSet[anchorId]
            );
        });
        anchors[clipId] = combined;
    });
    return makeHumanoidLocalVisualOverrides({
        anchors,
        layers: {
            ...base.layers,
            ...requested.layers
        }
    });
}

const HumanoidStanceProfiles = Object.freeze({
    standard: Object.freeze({
        id: 'standard',
        label: 'Standard',
        visualScale: 1,
        overrides: makeHumanoidVisualOverrides()
    }),
    armored: Object.freeze({
        id: 'armored',
        label: 'Armored',
        visualScale: 1,
        overrides: makeHumanoidVisualOverrides({
            anchors: {
                default: {
                    offhand: [-1, 0],
                    frontOffhand: [-1, 0]
                },
                shield_block: {
                    offhand: [0, -1]
                },
                shield_bash: {
                    offhand: [2, 0]
                }
            }
        })
    }),
    agile: Object.freeze({
        id: 'agile',
        label: 'Agile',
        visualScale: 1,
        overrides: makeHumanoidVisualOverrides({
            anchors: {
                dagger: {
                    weapon: [1, 0]
                },
                dual_wield: {
                    weapon: [1, 0],
                    offhand: [-1, 0]
                }
            }
        })
    }),
    heavy: Object.freeze({
        id: 'heavy',
        label: 'Heavy',
        visualScale: 1,
        overrides: makeHumanoidVisualOverrides({
            anchors: {
                heavy: {
                    weapon: [0, -1]
                },
                scythe: {
                    weapon: [-1, 0]
                }
            }
        })
    })
});

function mergeHumanoidVisualOverrides(
    baseOverrides,
    requestedOverrides = {}
) {
    const requested = makeHumanoidVisualOverrides(requestedOverrides);
    const base = baseOverrides || makeHumanoidVisualOverrides();
    const anchorIds = new Set([
        ...Object.keys(base.anchors || {}),
        ...Object.keys(requested.anchors || {})
    ]);
    const anchors = {};
    anchorIds.forEach(clipId => {
        const baseSet = base.anchors[clipId]
            || makeHumanoidAnchorOverrideSet();
        const requestedSet = requested.anchors[clipId]
            || makeHumanoidAnchorOverrideSet();
        const combined = {};
        HUMANOID_VISUAL_ANCHOR_KEYS.forEach(anchorId => {
            combined[anchorId] = [
                Number(baseSet[anchorId] && baseSet[anchorId][0] || 0)
                    + Number(
                        requestedSet[anchorId]
                        && requestedSet[anchorId][0] || 0
                    ),
                Number(baseSet[anchorId] && baseSet[anchorId][1] || 0)
                    + Number(
                        requestedSet[anchorId]
                        && requestedSet[anchorId][1] || 0
                    )
            ];
        });
        anchors[clipId] = combined;
    });

    const requestedLayers = (
        requestedOverrides.layers
        && typeof requestedOverrides.layers === 'object'
    ) ? requestedOverrides.layers : {};
    return makeHumanoidVisualOverrides({
        anchors,
        layers: {
            weapon: Object.prototype.hasOwnProperty.call(
                requestedLayers,
                'weapon'
            )
                ? requested.layers.weapon
                : base.layers.weapon,
            offhand: Object.prototype.hasOwnProperty.call(
                requestedLayers,
                'offhand'
            )
                ? requested.layers.offhand
                : base.layers.offhand,
            hair: Object.prototype.hasOwnProperty.call(
                requestedLayers,
                'hair'
            )
                ? requested.layers.hair
                : base.layers.hair
        }
    });
}

function makeHumanoidVisualProfile(profile) {
    const appearance = makeHumanoidAppearance(profile.appearance);
    const stanceProfileId = Object.prototype.hasOwnProperty.call(
        HumanoidStanceProfiles,
        profile.stanceProfile
    )
        ? profile.stanceProfile
        : 'standard';
    const stanceProfile = HumanoidStanceProfiles[stanceProfileId];
    const profileOverrides = makeHumanoidLocalVisualOverrides(
        profile.overrides
    );
    return Object.freeze({
        label: profile.label,
        attackClip: profile.attackClip,
        defensiveClip: profile.defensiveClip || null,
        profileGroup: profile.profileGroup || 'standard',
        stanceProfileId,
        stanceProfile,
        animationSet: profile.animationSet
            || HUMANOID_STANDARD_ANIMATION_SET,
        body: Object.freeze({
            gender: appearance.gender,
            spriteId: appearance.gender === 'female'
                ? 'body_female'
                : 'body_male'
        }),
        hair: Object.freeze({
            spriteId: appearance.hairStyle,
            color: appearance.hairColor
        }),
        face: Object.freeze({
            eyesSpriteId: appearance.eyes
        }),
        palette: Object.freeze({
            skin: appearance.skin,
            hair: appearance.hairColor,
            eyes: appearance.eyes,
            shirt: appearance.shirtColor,
            pants: appearance.pantsColor,
            boots: appearance.bootsColor
        }),
        appearance,
        equipment: makeHumanoidEquipment(profile.equipment),
        profileOverrides,
        overrides: mergeHumanoidVisualOverrides(
            stanceProfile.overrides,
            profileOverrides
        )
    });
}

const HumanoidActorVisualProfiles = Object.freeze({
    mercenary_default: makeHumanoidVisualProfile({
        label: 'Mercenary',
        attackClip: 'bash',
        appearance: {
            gender: 'male',
            skin: 'tan',
            hairStyle: 'hair_buzzcut',
            hairColor: 'brown',
            eyes: 'eyes_brown',
            shirtColor: 'brown',
            pantsColor: 'dark',
            bootsColor: 'leather'
        },
        equipment: {
            helmet: { spriteId: 'helm_rusty_coif' },
            armor: { spriteId: 'armor_tunic' },
            gloves: { spriteId: 'gloves_leather_mitts' },
            boots: { spriteId: 'boots_hide' },
            weapon: { spriteId: 'weap_rusty_mace' }
        }
    }),
    melee_bandit: makeHumanoidVisualProfile({
        label: 'Melee Bandit',
        attackClip: 'slash',
        appearance: {
            gender: 'male',
            skin: 'tan',
            hairStyle: 'hair_messy',
            hairColor: 'black',
            eyes: 'eyes_brown',
            shirtColor: 'burgundy',
            pantsColor: 'charcoal',
            bootsColor: 'leather'
        },
        equipment: {
            helmet: { spriteId: 'helm_pubserker' },
            armor: { spriteId: 'armor_tunic' },
            gloves: { spriteId: 'gloves_leather_mitts' },
            boots: { spriteId: 'boots_hide' },
            weapon: { spriteId: 'weap_machete' }
        },
        overrides: {
            anchors: {
                slash: {
                    weapon: [-1.5, 0]
                }
            }
        }
    }),
    bandit_archer: makeHumanoidVisualProfile({
        label: 'Bandit Archer',
        attackClip: 'shoot',
        appearance: {
            gender: 'female',
            skin: 'deep',
            hairStyle: 'hair_braid',
            hairColor: 'auburn',
            eyes: 'eyes_green',
            shirtColor: 'olive',
            pantsColor: 'brown',
            bootsColor: 'suede'
        },
        equipment: {
            helmet: { spriteId: 'wilderness_cloak' },
            armor: { spriteId: 'armor_boar_hide' },
            gloves: { spriteId: 'poachers_grips' },
            boots: { spriteId: 'boots_hide' },
            weapon: { spriteId: 'weap_bow' }
        },
        overrides: {
            anchors: {
                shoot: {
                    release: [1, 0]
                }
            }
        }
    }),
    hedge_mage: makeHumanoidVisualProfile({
        label: 'Hedge Mage',
        attackClip: 'cast',
        appearance: {
            gender: 'female',
            skin: 'pale',
            hairStyle: 'hair_waves',
            hairColor: 'silver',
            eyes: 'eyes_purple',
            shirtColor: 'purple',
            pantsColor: 'navy',
            bootsColor: 'black'
        },
        equipment: {
            helmet: { spriteId: 'helm_harvester' },
            armor: { spriteId: 'flannel_shirt' },
            gloves: { spriteId: 'work_gloves' },
            boots: { spriteId: 'muddy_boots' },
            weapon: { spriteId: 'weap_apprentice_staff' }
        },
        overrides: {
            anchors: {
                slash: {
                    weapon: [-1, 0]
                },
                cast: {
                    release: [0, -1]
                }
            },
            layers: {
                weapon: 'underHands'
            }
        }
    }),
    goblin_axeling: makeHumanoidVisualProfile({
        label: 'Goblin Axeling',
        attackClip: 'slash',
        appearance: {
            gender: 'male',
            skin: 'goblin',
            hairStyle: 'hair_mohawk',
            hairColor: 'black',
            eyes: 'eyes_red',
            shirtColor: 'moss',
            pantsColor: 'olive',
            bootsColor: 'leather'
        },
        equipment: {
            helmet: { spriteId: 'helm_goblin_ears' },
            armor: { spriteId: 'armor_tunic' },
            gloves: { spriteId: 'gloves_leather_mitts' },
            boots: { spriteId: 'boots_hide' },
            weapon: { spriteId: 'weap_goblin_axe' }
        },
        overrides: {
            anchors: {
                slash: {
                    weapon: [-1, 1]
                }
            }
        }
    }),
    alpha_poacher: makeHumanoidVisualProfile({
        label: 'Alpha Poacher',
        attackClip: 'shoot',
        appearance: {
            gender: 'female',
            skin: 'tan',
            hairStyle: 'hair_braid',
            hairColor: 'auburn',
            eyes: 'eyes_gold',
            shirtColor: 'olive',
            pantsColor: 'umber',
            bootsColor: 'olive'
        },
        equipment: {
            helmet: { spriteId: 'wilderness_cloak' },
            armor: { spriteId: 'armor_beastmaster' },
            gloves: { spriteId: 'poachers_grips' },
            boots: { spriteId: 'hop_infused_boots' },
            weapon: { spriteId: 'weap_bow' }
        },
        overrides: {
            anchors: {
                shoot: {
                    weapon: [0, -1],
                    release: [1, 0]
                }
            }
        }
    }),
    npc_kreg: makeHumanoidVisualProfile({
        label: 'Kreg',
        profileGroup: 'special',
        stanceProfile: 'standard',
        attackClip: 'cast',
        appearance: {
            gender: 'male',
            skin: 'pale',
            hairStyle: 'hair_buzzcut',
            hairColor: 'silver',
            eyes: 'eyes_brown',
            shirtColor: 'burgundy',
            pantsColor: 'dark',
            bootsColor: 'leather'
        },
        equipment: {
            helmet: { spriteId: 'helm_innkeeper' },
            armor: { spriteId: 'armor_innkeeper_apron' },
            gloves: null,
            boots: { spriteId: 'sturdy_boots' },
            weapon: null,
            offhand: null
        },
        overrides: {
            anchors: {
                cast: {
                    release: [1, -1]
                }
            }
        }
    }),
    npc_mara: makeHumanoidVisualProfile({
        label: 'Mara',
        profileGroup: 'special',
        stanceProfile: 'standard',
        attackClip: 'bash',
        appearance: {
            gender: 'female',
            skin: 'deep',
            hairStyle: 'hair_braid',
            hairColor: 'black',
            eyes: 'eyes_gold',
            shirtColor: 'brown',
            pantsColor: 'umber',
            bootsColor: 'leather'
        },
        equipment: {
            helmet: null,
            armor: { spriteId: 'armor_tunic' },
            gloves: { spriteId: 'work_gloves' },
            boots: { spriteId: 'sturdy_boots' },
            weapon: null,
            offhand: null
        }
    }),
    npc_elowen: makeHumanoidVisualProfile({
        label: 'Elowen',
        profileGroup: 'special',
        stanceProfile: 'agile',
        attackClip: 'shoot',
        appearance: {
            gender: 'female',
            skin: 'tan',
            hairStyle: 'hair_braid',
            hairColor: 'auburn',
            eyes: 'eyes_green',
            shirtColor: 'olive',
            pantsColor: 'brown',
            bootsColor: 'suede'
        },
        equipment: {
            helmet: { spriteId: 'wilderness_cloak' },
            armor: { spriteId: 'armor_beastmaster' },
            gloves: { spriteId: 'poachers_grips' },
            boots: { spriteId: 'boots_hide' },
            weapon: { spriteId: 'weap_bow' },
            offhand: null
        }
    }),
    npc_tilda: makeHumanoidVisualProfile({
        label: 'Tilda',
        profileGroup: 'special',
        stanceProfile: 'standard',
        attackClip: 'cast',
        appearance: {
            gender: 'female',
            skin: 'pale',
            hairStyle: 'hair_waves',
            hairColor: 'silver',
            eyes: 'eyes_purple',
            shirtColor: 'purple',
            pantsColor: 'navy',
            bootsColor: 'black'
        },
        equipment: {
            helmet: null,
            armor: { spriteId: 'flannel_shirt' },
            gloves: { spriteId: 'work_gloves' },
            boots: { spriteId: 'muddy_boots' },
            weapon: { spriteId: 'weap_apprentice_staff' },
            offhand: null
        },
        overrides: {
            layers: { weapon: 'underHands' },
            anchors: { cast: { release: [0, -1] } }
        }
    }),
    npc_marlow: makeHumanoidVisualProfile({
        label: 'Marlow',
        profileGroup: 'special',
        stanceProfile: 'armored',
        attackClip: 'slash',
        defensiveClip: 'shield_block',
        appearance: {
            gender: 'male',
            skin: 'deep',
            hairStyle: 'hair_buzzcut',
            hairColor: 'silver',
            eyes: 'eyes_brown',
            shirtColor: 'burgundy',
            pantsColor: 'charcoal',
            bootsColor: 'black'
        },
        equipment: {
            helmet: { spriteId: 'helm_rusty_coif' },
            armor: { spriteId: 'armor_tankard' },
            gloves: { spriteId: 'gloves_leather_mitts' },
            boots: { spriteId: 'sturdy_boots' },
            weapon: { spriteId: 'weap_machete' },
            offhand: { spriteId: 'offhand_captains_shield' }
        }
    }),
    shield_guard_captain: makeHumanoidVisualProfile({
        label: 'Shielded Guard Captain',
        profileGroup: 'advanced',
        stanceProfile: 'armored',
        attackClip: 'slash',
        defensiveClip: 'shield_block',
        appearance: {
            gender: 'male',
            skin: 'pale',
            hairStyle: 'hair_buzzcut',
            hairColor: 'black',
            eyes: 'eyes_brown',
            shirtColor: 'burgundy',
            pantsColor: 'charcoal',
            bootsColor: 'black'
        },
        equipment: {
            helmet: { spriteId: 'helm_tankard' },
            armor: { spriteId: 'armor_tankard' },
            gloves: { spriteId: 'gloves_tankard' },
            boots: { spriteId: 'boots_tankard' },
            weapon: { spriteId: 'weap_machete' },
            offhand: { spriteId: 'offhand_captains_shield' }
        },
        overrides: {
            layers: {
                offhand: 'underHands'
            }
        }
    }),
    tankard_brute: makeHumanoidVisualProfile({
        label: 'Tankard Maul Brute',
        profileGroup: 'advanced',
        stanceProfile: 'heavy',
        attackClip: 'heavy',
        appearance: {
            gender: 'male',
            skin: 'deep',
            hairStyle: 'hair_mohawk',
            hairColor: 'black',
            eyes: 'eyes_red',
            shirtColor: 'brown',
            pantsColor: 'dark',
            bootsColor: 'leather'
        },
        equipment: {
            helmet: { spriteId: 'helm_tankard' },
            armor: { spriteId: 'armor_oak_barrel' },
            gloves: { spriteId: 'cellar_guard' },
            boots: { spriteId: 'boots_tankard' },
            weapon: { spriteId: 'weap_tankard' },
            offhand: null
        },
        overrides: {
            layers: {
                weapon: 'underHands'
            }
        }
    }),
    harvest_champion: makeHumanoidVisualProfile({
        label: 'Harvest Pitchfork Champion',
        profileGroup: 'advanced',
        stanceProfile: 'armored',
        attackClip: 'thrust',
        appearance: {
            gender: 'female',
            skin: 'tan',
            hairStyle: 'hair_braid',
            hairColor: 'auburn',
            eyes: 'eyes_green',
            shirtColor: 'olive',
            pantsColor: 'navy',
            bootsColor: 'leather'
        },
        equipment: {
            helmet: { spriteId: 'straw_hat' },
            armor: { spriteId: 'denim_overalls' },
            gloves: { spriteId: 'work_gloves' },
            boots: { spriteId: 'muddy_boots' },
            weapon: { spriteId: 'pitchfork_spear' },
            offhand: null
        },
        overrides: {
            layers: {
                weapon: 'underHands'
            }
        }
    }),
    cellar_dweller: makeHumanoidVisualProfile({
        label: 'Cellar Dweller',
        profileGroup: 'special',
        stanceProfile: 'agile',
        attackClip: 'dual_wield',
        appearance: {
            gender: 'female',
            skin: 'pale',
            hairStyle: 'hair_messy',
            hairColor: 'black',
            eyes: 'eyes_red',
            shirtColor: 'burgundy',
            pantsColor: 'charcoal',
            bootsColor: 'black'
        },
        equipment: {
            helmet: { spriteId: 'helm_beerglass' },
            armor: { spriteId: 'armor_beerglass' },
            gloves: { spriteId: 'gloves_beerglass' },
            boots: { spriteId: 'boots_cellar' },
            weapon: { spriteId: 'weap_mimic_dagger' },
            offhand: { spriteId: 'offhand_parrying_dagger' }
        },
        overrides: {
            layers: {
                offhand: 'back'
            }
        }
    }),
    cult_champion: makeHumanoidVisualProfile({
        label: 'Cult Scythe Champion',
        profileGroup: 'advanced',
        stanceProfile: 'heavy',
        attackClip: 'scythe',
        appearance: {
            gender: 'male',
            skin: 'deep',
            hairStyle: 'hair_bald',
            hairColor: 'black',
            eyes: 'eyes_purple',
            shirtColor: 'purple',
            pantsColor: 'dark',
            bootsColor: 'black'
        },
        equipment: {
            helmet: { spriteId: 'burlap_sack_mask' },
            armor: { spriteId: 'armor_blackout' },
            gloves: { spriteId: 'gloves_blackout' },
            boots: { spriteId: 'boots_blackout' },
            weapon: { spriteId: 'scythe_of_reaping' },
            offhand: null
        },
        overrides: {
            layers: {
                weapon: 'underHands'
            }
        }
    })
});

const STANDARD_HUMANOID_NPC_PROFILE_IDS = Object.freeze([
    'goblin_axeling',
    'melee_bandit',
    'bandit_archer',
    'hedge_mage',
    'alpha_poacher'
]);

const SPECIAL_HUMANOID_NPC_PROFILE_IDS = Object.freeze([
    'npc_kreg',
    'npc_mara',
    'npc_elowen',
    'npc_tilda',
    'npc_marlow',
    'cellar_dweller'
]);

const ADVANCED_HUMANOID_PROTOTYPE_PROFILE_IDS = Object.freeze([
    'shield_guard_captain',
    'tankard_brute',
    'harvest_champion',
    'cellar_dweller',
    'cult_champion'
]);

const HUMANOID_NPC_STUDIO_PROFILE_IDS = Object.freeze(Array.from(new Set([
    ...STANDARD_HUMANOID_NPC_PROFILE_IDS,
    ...SPECIAL_HUMANOID_NPC_PROFILE_IDS,
    ...ADVANCED_HUMANOID_PROTOTYPE_PROFILE_IDS
])));

const EMPTY_HUMANOID_VISUAL_EQUIPMENT = makeHumanoidEquipment();

function isPlayerHumanoidActor(actor) {
    if (!actor) return false;
    if (actor.kind === 'player' || actor.uid === 'player_0') return true;
    return (
        typeof globalThis !== 'undefined'
        && globalThis.player
        && actor === globalThis.player
    );
}

function isCompanionHumanoidActor(actor) {
    return Boolean(
        actor
        && (
            actor.kind === 'companion'
            || actor.controller === 'player_companion'
        )
    );
}

function getHumanoidVisualProfileTemplate(actor) {
    if (!actor) return null;
    if (isPlayerHumanoidActor(actor)) return null;

    const profileId = isCompanionHumanoidActor(actor)
        ? (actor.visualProfileId || 'mercenary_default')
        : actor.visualProfileId;
    return HumanoidActorVisualProfiles[profileId] || null;
}

function getHumanoidActorVisualProfile(profileId) {
    return HumanoidActorVisualProfiles[String(profileId || '')] || null;
}

function normalizeHumanoidLiveAppearance(appearance = {}, fallback) {
    const source = appearance && typeof appearance === 'object'
        ? appearance
        : {};
    return makeHumanoidAppearance({
        gender: source.gender || fallback.gender,
        skin: source.skin || fallback.skin,
        hairStyle: source.hairStyle || source.hair || fallback.hairStyle,
        hairColor: source.hairColor || fallback.hairColor,
        eyes: source.eyes || fallback.eyes,
        shirtColor: source.shirtColor || fallback.shirtColor,
        pantsColor: source.pantsColor || fallback.pantsColor,
        bootsColor: source.bootsColor || fallback.bootsColor
    });
}

function normalizeHumanoidLiveEquipment(equipment, fallbackEquipment) {
    const source = equipment && typeof equipment === 'object'
        ? equipment
        : {};
    const resolved = {};

    HUMANOID_VISUAL_EQUIPMENT_SLOTS.forEach(slot => {
        if (Object.prototype.hasOwnProperty.call(source, slot)) {
            const item = source[slot];
            resolved[slot] = makeHumanoidSpriteDescriptor(
                typeof item === 'string'
                    ? item
                    : (item && item.spriteId)
            );
            return;
        }
        resolved[slot] = fallbackEquipment[slot];
    });
    if (isHumanoidWeaponTwoHanded(resolved.weapon)) {
        resolved.offhand = null;
    }

    return Object.freeze(resolved);
}

function getHumanoidWeaponVisualSpec(weapon) {
    const spriteId = weapon && weapon.spriteId
        ? String(weapon.spriteId)
        : '';
    if (
        !spriteId
        || typeof EquipmentOverhaulSpecs === 'undefined'
        || !EquipmentOverhaulSpecs.weapon
    ) {
        return null;
    }
    return EquipmentOverhaulSpecs.weapon[spriteId] || null;
}

function getHumanoidOffhandVisualSpec(offhand) {
    const spriteId = offhand && offhand.spriteId
        ? String(offhand.spriteId)
        : '';
    if (
        !spriteId
        || typeof EquipmentOverhaulSpecs === 'undefined'
        || !EquipmentOverhaulSpecs.offhand
    ) {
        return null;
    }
    return EquipmentOverhaulSpecs.offhand[spriteId] || null;
}

function isHumanoidWeaponTwoHanded(weapon) {
    const spec = getHumanoidWeaponVisualSpec(weapon);
    return Boolean(
        weapon
        && (
            weapon.twoHanded === true
            || weapon.handedness === 'two'
            || (spec && spec.twoHanded === true)
        )
    );
}

function getHumanoidWeaponStyle(weapon) {
    const spriteId = weapon && weapon.spriteId
        ? String(weapon.spriteId)
        : '';
    if (!spriteId) return '';

    if (
        typeof EquipmentOverhaulSpecs !== 'undefined'
        && EquipmentOverhaulSpecs.weapon
        && EquipmentOverhaulSpecs.weapon[spriteId]
    ) {
        return String(
            EquipmentOverhaulSpecs.weapon[spriteId].style || spriteId
        ).toLowerCase();
    }
    return spriteId.toLowerCase();
}

function getHumanoidWeaponAttackClip(
    weapon,
    fallback = 'slash',
    offhand = null
) {
    const spec = getHumanoidWeaponVisualSpec(weapon);
    const offhandSpec = getHumanoidOffhandVisualSpec(offhand);
    const offhandStyle = String(
        offhand && offhand.spriteId || ''
    ).toLowerCase();
    if (
        (
            (offhandSpec && offhandSpec.offhandType === 'weapon')
            || offhandStyle.includes('dagger')
            || offhandStyle.includes('shiv')
        )
        && !isHumanoidWeaponTwoHanded(weapon)
    ) {
        return 'dual_wield';
    }
    if (spec && spec.animationFamily) {
        return String(spec.animationFamily);
    }
    const style = getHumanoidWeaponStyle(weapon);
    if (style.includes('bow') || style.includes('crossbow')) return 'shoot';
    if (style.includes('staff') || style.includes('wand')) return 'cast';
    if (
        ['spear', 'pitchfork', 'polearm', 'halberd']
            .some(value => style.includes(value))
    ) {
        return 'thrust';
    }
    if (style.includes('scythe')) return 'scythe';
    if (style.includes('dagger') || style.includes('shiv')) return 'dagger';
    if (
        [
            'greataxe',
            'great_axe',
            'greatsword',
            'great_sword',
            'heavy_sword',
            'two_hand',
            'twohand',
            'maul'
        ].some(value => style.includes(value))
    ) {
        return 'heavy';
    }
    if (
        [
            'mace',
            'club',
            'greatclub',
            'knuckle',
            'tankard'
        ].some(value => style.includes(value))
    ) {
        return 'bash';
    }
    return fallback;
}

function getHumanoidStanceProfileId(equipment = {}) {
    const offhandSpec = getHumanoidOffhandVisualSpec(equipment.offhand);
    const offhandStyle = String(
        equipment.offhand && equipment.offhand.spriteId || ''
    ).toLowerCase();
    const attackClip = getHumanoidWeaponAttackClip(
        equipment.weapon,
        'slash',
        equipment.offhand
    );
    if (
        (offhandSpec && offhandSpec.offhandType === 'shield')
        || offhandStyle.includes('shield')
    ) {
        return 'armored';
    }
    if (attackClip === 'heavy' || attackClip === 'scythe') {
        return 'heavy';
    }
    if (attackClip === 'dagger' || attackClip === 'dual_wield') {
        return 'agile';
    }
    return 'standard';
}

function resolveHumanoidActorVisualProfile(actor) {
    if (!actor) return null;
    if (typeof actor === 'string') {
        return getHumanoidActorVisualProfile(actor);
    }

    if (isPlayerHumanoidActor(actor)) {
        const fallback = HumanoidActorVisualProfiles.mercenary_default;
        const equipment = normalizeHumanoidLiveEquipment(
            actor.equipment,
            EMPTY_HUMANOID_VISUAL_EQUIPMENT
        );
        return makeHumanoidVisualProfile({
            label: actor.name || actor.username || 'Knight',
            attackClip: getHumanoidWeaponAttackClip(
                equipment.weapon,
                'slash',
                equipment.offhand
            ),
            profileGroup: 'player',
            stanceProfile: getHumanoidStanceProfileId(equipment),
            appearance: normalizeHumanoidLiveAppearance(
                actor.appearance,
                fallback.appearance
            ),
            equipment,
        overrides: actor.visualOverrides
        });
    }

    const template = getHumanoidVisualProfileTemplate(actor);
    if (!template) return null;
    if (!isCompanionHumanoidActor(actor)) return template;

    const equipment = normalizeHumanoidLiveEquipment(
        actor.equipment,
        template.equipment
    );
    return makeHumanoidVisualProfile({
        label: template.label,
        attackClip: equipment.weapon
            ? getHumanoidWeaponAttackClip(
                equipment.weapon,
                'slash',
                equipment.offhand
            )
            : template.attackClip,
        defensiveClip: template.defensiveClip,
        profileGroup: 'companion',
        stanceProfile: getHumanoidStanceProfileId(equipment),
        appearance: template.appearance,
        equipment,
        animationSet: template.animationSet,
        overrides: mergeHumanoidLocalVisualOverrides(
            template.profileOverrides,
            actor.visualOverrides
        )
    });
}

function isHumanoidActor(actor) {
    if (!actor) return false;
    if (isPlayerHumanoidActor(actor) || isCompanionHumanoidActor(actor)) {
        return true;
    }
    return Boolean(
        actor.visualProfileId
        && HumanoidActorVisualProfiles[actor.visualProfileId]
    );
}

function getHumanoidActorWeapon(actor) {
    const profile = resolveHumanoidActorVisualProfile(actor);
    return profile ? profile.equipment.weapon : null;
}

function addHumanoidAnchorOffsets(first, second) {
    return Object.freeze([
        Number(first && first[0] || 0) + Number(second && second[0] || 0),
        Number(first && first[1] || 0) + Number(second && second[1] || 0)
    ]);
}

function resolveHumanoidProfileAnchorOffsets(profileOrActor, clipId = 'idle') {
    const profile = (
        profileOrActor
        && profileOrActor.appearance
        && profileOrActor.equipment
        && profileOrActor.overrides
    )
        ? profileOrActor
        : resolveHumanoidActorVisualProfile(profileOrActor);
    const anchors = profile && profile.overrides
        ? profile.overrides.anchors
        : null;
    const defaults = anchors && anchors.default
        ? anchors.default
        : makeHumanoidAnchorOverrideSet();
    const clip = anchors && anchors[clipId]
        ? anchors[clipId]
        : makeHumanoidAnchorOverrideSet();
    const weapon = addHumanoidAnchorOffsets(
        defaults.weapon,
        clip.weapon
    );
    const releaseAdjustment = addHumanoidAnchorOffsets(
        defaults.release,
        clip.release
    );
    const offhand = addHumanoidAnchorOffsets(
        defaults.offhand,
        clip.offhand
    );

    return Object.freeze({
        weapon,
        release: addHumanoidAnchorOffsets(weapon, releaseAdjustment),
        frontWeapon: addHumanoidAnchorOffsets(
            defaults.frontWeapon,
            clip.frontWeapon
        ),
        offhand,
        frontOffhand: addHumanoidAnchorOffsets(
            defaults.frontOffhand,
            clip.frontOffhand
        )
    });
}

function drawHumanoidActorFront(
    context,
    actorOrProfile,
    startX,
    startY,
    size,
    options = {}
) {
    if (!context || !size) return null;
    const destinationContext = context;
    const destinationStartX = startX;
    const destinationStartY = startY;
    const destinationSize = size;
    let actorBuffer = null;
    if (
        typeof document !== 'undefined'
        && typeof document.createElement === 'function'
    ) {
        actorBuffer = document.createElement('canvas');
        actorBuffer.width = Math.max(1, Math.round(size));
        actorBuffer.height = Math.max(1, Math.round(size));
        const bufferContext = actorBuffer.getContext('2d');
        if (bufferContext) {
            context = bufferContext;
            startX = 0;
            startY = 0;
            size = actorBuffer.width;
        } else {
            actorBuffer = null;
        }
    }
    const profile = (
        actorOrProfile
        && actorOrProfile.appearance
        && actorOrProfile.equipment
        && actorOrProfile.body
    )
        ? actorOrProfile
        : resolveHumanoidActorVisualProfile(actorOrProfile);
    if (
        !profile
        || typeof SpriteMatrices === 'undefined'
        || typeof drawProceduralSprite !== 'function'
    ) {
        return null;
    }

    const appearance = profile.appearance;
    const equipment = profile.equipment;
    const layers = profile.overrides
        ? profile.overrides.layers
        : { weapon: 'front', offhand: 'back', hair: 'auto' };
    const offsets = resolveHumanoidProfileAnchorOffsets(
        profile,
        options.clipId || 'idle'
    );
    const gridSize = typeof PROCEDURAL_SPRITE_GRID_SIZE === 'number'
        ? PROCEDURAL_SPRITE_GRID_SIZE
        : 32;
    const cellSize = size / gridSize;
    const frontWeaponOffset = offsets.frontWeapon;
    const frontOffhandOffset = offsets.frontOffhand;
    const offhandSpec = getHumanoidOffhandVisualSpec(
        equipment.offhand
    );
    const offhandIsShield = Boolean(
        offhandSpec && offhandSpec.offhandType === 'shield'
    );
    const helmetSpec = (
        equipment.helmet
        && typeof EquipmentOverhaulSpecs !== 'undefined'
        && EquipmentOverhaulSpecs.helmet
    )
        ? EquipmentOverhaulSpecs.helmet[equipment.helmet.spriteId]
        : null;
    const helmetHidesHair = Boolean(
        helmetSpec && helmetSpec.hidesHair
    );

    function drawLayer(spriteId) {
        if (!spriteId || !SpriteMatrices[spriteId]) return false;
        drawProceduralSprite(
            context,
            SpriteMatrices[spriteId],
            startX,
            startY,
            size,
            appearance
        );
        return true;
    }

    function drawWeapon() {
        const weapon = equipment.weapon;
        if (!weapon || !weapon.spriteId) return false;
        const pivot = (
            typeof FRONT_WEAPON_PAPERDOLL_PIVOT !== 'undefined'
            && FRONT_WEAPON_PAPERDOLL_PIVOT
        ) || { x: 24, y: 22 };
        if (typeof drawFrontPaperdollWeapon === 'function') {
            return drawFrontPaperdollWeapon(
                context,
                weapon.spriteId,
                startX,
                startY,
                size,
                {
                    appearance,
                    targetGrip: {
                        x: pivot.x + frontWeaponOffset[0],
                        y: pivot.y + frontWeaponOffset[1]
                    }
                }
            );
        }
        context.save();
        context.translate(
            frontWeaponOffset[0] * cellSize,
            frontWeaponOffset[1] * cellSize
        );
        const drawn = drawLayer(weapon.spriteId);
        context.restore();
        return drawn;
    }

    function drawOffhand() {
        const offhand = equipment.offhand;
        if (!offhand || !offhand.spriteId) return false;
        context.save();
        context.translate(
            frontOffhandOffset[0] * cellSize,
            frontOffhandOffset[1] * cellSize
        );
        const drawn = drawLayer(offhand.spriteId);
        context.restore();
        return drawn;
    }

    context.save();
    context.imageSmoothingEnabled = false;
    if (layers.offhand === 'back') drawOffhand();
    if (layers.weapon === 'back') drawWeapon();

    drawLayer(profile.body.spriteId);
    drawLayer(profile.face.eyesSpriteId);
    if (
        layers.hair !== 'hidden'
        && !helmetHidesHair
    ) {
        drawLayer(profile.hair.spriteId);
    }

    const genderSuffix = appearance.gender === 'female'
        ? '_female'
        : '_male';
    if (
        equipment.armor
        && !drawLayer(equipment.armor.spriteId + genderSuffix)
    ) {
        drawLayer(equipment.armor.spriteId);
    }
    if (equipment.boots) drawLayer(equipment.boots.spriteId);
    if (layers.weapon === 'underHands') drawWeapon();
    if (
        layers.offhand === 'underHands'
        || (layers.offhand === 'front' && offhandIsShield)
    ) {
        drawOffhand();
    }
    if (equipment.gloves) drawLayer(equipment.gloves.spriteId);
    if (equipment.helmet) drawLayer(equipment.helmet.spriteId);

    if (layers.offhand === 'front' && !offhandIsShield) {
        drawOffhand();
    }
    if (
        layers.weapon !== 'back'
        && layers.weapon !== 'underHands'
    ) {
        drawWeapon();
    }
    if (options.showAnchors) {
        const pivot = (
            typeof FRONT_WEAPON_PAPERDOLL_PIVOT !== 'undefined'
            && FRONT_WEAPON_PAPERDOLL_PIVOT
        ) || { x: 24, y: 22 };
        context.fillStyle = '#ff5f68';
        context.fillRect(
            startX + (
                pivot.x
                + frontWeaponOffset[0]
            ) * cellSize,
            startY + (
                pivot.y
                + frontWeaponOffset[1]
            ) * cellSize,
            Math.max(1, cellSize),
            Math.max(1, cellSize)
        );
        context.fillStyle = '#9e72e8';
        context.fillRect(
            startX + (8 + frontOffhandOffset[0]) * cellSize,
            startY + (21 + frontOffhandOffset[1]) * cellSize,
            Math.max(1, cellSize),
            Math.max(1, cellSize)
        );
    }
    context.restore();
    if (actorBuffer) {
        destinationContext.save();
        destinationContext.imageSmoothingEnabled = false;
        destinationContext.drawImage(
            actorBuffer,
            destinationStartX,
            destinationStartY,
            destinationSize,
            destinationSize
        );
        destinationContext.restore();
    }
    return profile;
}

const drawHumanoidActorWorld = drawHumanoidActorFront;

function validateHumanoidVisualProfile(profileId, profile) {
    const errors = [];
    const appearance = profile && profile.appearance || {};
    const equipment = profile && profile.equipment || {};
    const expectRegistryValue = (registry, value, field) => {
        if (
            !registry
            || !Object.prototype.hasOwnProperty.call(registry, value)
        ) {
            errors.push(`${field}: ${value}`);
        }
    };

    expectRegistryValue(
        typeof HumanoidAnimationSets === 'undefined'
            ? null
            : HumanoidAnimationSets,
        profile && profile.animationSet,
        'animationSet'
    );
    expectRegistryValue(
        HumanoidStanceProfiles,
        profile && profile.stanceProfileId,
        'stanceProfile'
    );
    expectRegistryValue(
        typeof SidePlayerAnimationClips === 'undefined'
            ? null
            : SidePlayerAnimationClips,
        profile && profile.attackClip,
        'attackClip'
    );
    if (profile && profile.defensiveClip) {
        expectRegistryValue(
            typeof SidePlayerAnimationClips === 'undefined'
                ? null
                : SidePlayerAnimationClips,
            profile.defensiveClip,
            'defensiveClip'
        );
    }
    [
        [
            typeof SkinTones === 'undefined' ? null : SkinTones,
            appearance.skin,
            'skin'
        ],
        [
            typeof HairTones === 'undefined' ? null : HairTones,
            appearance.hairColor,
            'hairColor'
        ],
        [
            typeof EyeTones === 'undefined' ? null : EyeTones,
            String(appearance.eyes || '').replace('eyes_', ''),
            'eyes'
        ],
        [
            typeof ShirtTones === 'undefined' ? null : ShirtTones,
            appearance.shirtColor,
            'shirtColor'
        ],
        [
            typeof PantsTones === 'undefined' ? null : PantsTones,
            appearance.pantsColor,
            'pantsColor'
        ],
        [
            typeof BootsTones === 'undefined' ? null : BootsTones,
            appearance.bootsColor,
            'bootsColor'
        ],
        [
            typeof SpriteMatrices === 'undefined'
                ? null
                : SpriteMatrices,
            appearance.hairStyle,
            'frontHair'
        ],
        [
            typeof SidePlayerHairStyleProfiles === 'undefined'
                ? null
                : SidePlayerHairStyleProfiles,
            appearance.hairStyle,
            'sideHair'
        ]
    ].forEach(([registry, value, field]) => {
        expectRegistryValue(registry, value, field);
    });

    HUMANOID_VISUAL_EQUIPMENT_SLOTS.forEach(slot => {
        const item = equipment[slot];
        if (!item) return;
        const registry = (
            typeof EquipmentOverhaulSpecs === 'undefined'
        ) ? null : EquipmentOverhaulSpecs[slot];
        expectRegistryValue(
            registry,
            item.spriteId,
            `equipment.${slot}`
        );
        expectRegistryValue(
            typeof SpriteMatrices === 'undefined'
                ? null
                : SpriteMatrices,
            item.spriteId,
            `sprite.${slot}`
        );
    });

    const anchorSets = profile
        && profile.overrides
        && profile.overrides.anchors || {};
    Object.entries(anchorSets).forEach(([clipId, anchors]) => {
        if (
            clipId !== 'default'
            && (
                typeof SidePlayerAnimationClips === 'undefined'
                || !SidePlayerAnimationClips[clipId]
            )
        ) {
            errors.push(`anchorClip: ${clipId}`);
        }
        HUMANOID_VISUAL_ANCHOR_KEYS.forEach(anchorId => {
            const offset = anchors[anchorId];
            if (
                !Array.isArray(offset)
                || offset.length !== 2
                || offset.some(value => (
                    !Number.isFinite(value)
                    || Math.abs(value) > 4
                ))
            ) {
                errors.push(
                    `anchor.${clipId}.${anchorId}: ${offset}`
                );
            }
        });
    });

    const layers = profile && profile.overrides
        ? profile.overrides.layers
        : {};
    if (!['front', 'back', 'underHands'].includes(layers.weapon)) {
        errors.push(`layers.weapon: ${layers.weapon}`);
    }
    if (!['front', 'back', 'underHands'].includes(layers.offhand)) {
        errors.push(`layers.offhand: ${layers.offhand}`);
    }
    if (!['auto', 'hidden'].includes(layers.hair)) {
        errors.push(`layers.hair: ${layers.hair}`);
    }
    if (
        equipment.offhand
        && isHumanoidWeaponTwoHanded(equipment.weapon)
    ) {
        errors.push('equipment.hands: two-handed weapon with offhand');
    }

    return Object.freeze({
        profileId,
        valid: errors.length === 0,
        errors: Object.freeze(errors)
    });
}

function validateHumanoidVisualProfileRegistry() {
    return Object.freeze(Object.fromEntries(
        Object.entries(HumanoidActorVisualProfiles).map(
            ([profileId, profile]) => [
                profileId,
                validateHumanoidVisualProfile(profileId, profile)
            ]
        )
    ));
}

function resolveHumanoidActorActionClip(
    actor,
    event = {},
    options = {}
) {
    const explicitClip = options.clipId
        || options.actionClip
        || options.attackClip
        || event.clipId
        || event.actionClip
        || event.attackClip;
    if (explicitClip) return String(explicitClip);

    const source = String(options.source || event.source || '').toLowerCase();
    const actionType = String(
        options.actionType || event.actionType || ''
    ).toLowerCase();
    const animType = String(
        options.animType || event.animType || ''
    ).toLowerCase();
    const fx = options.fx || event.fx || {};
    const spellFx = options.spellFx
        || event.spellFx
        || fx.spellFx
        || (actor && actor.spellFx);
    const projectileSprite = options.projectileSprite
        || event.projectileSprite
        || fx.projectileSprite
        || (actor && actor.projectileSprite);

    if (
        actionType === 'block'
        || actionType === 'guard'
        || animType.includes('shield_block')
        || animType === 'block'
    ) {
        return 'shield_block';
    }
    if (
        actionType === 'shield_bash'
        || animType.includes('shield_bash')
    ) {
        return 'shield_bash';
    }

    if (
        source === 'spell'
        || actionType === 'spell'
        || spellFx
        || animType.includes('cast')
    ) {
        return 'cast';
    }
    if (
        options.isProjectile === true
        || event.isProjectile === true
        || fx.isProjectile === true
        || projectileSprite
        || (
            (options.isRangedAttack === true || event.isRangedAttack === true)
            && !spellFx
        )
        || animType.includes('shoot')
    ) {
        return 'shoot';
    }
    const authoredFamilies = [
        'dual_wield',
        'thrust',
        'heavy',
        'dagger',
        'scythe'
    ];
    const authoredFamily = authoredFamilies.find(
        family => animType.includes(family)
    );
    if (authoredFamily) return authoredFamily;
    if (animType.includes('bash') || animType.includes('smash')) {
        return 'bash';
    }
    if (animType.includes('slash')) return 'slash';

    const requestedWeapon = options.weapon || event.weapon;
    if (requestedWeapon) {
        const requestedOffhand = options.offhand || event.offhand;
        return getHumanoidWeaponAttackClip(
            makeHumanoidSpriteDescriptor(
                typeof requestedWeapon === 'string'
                    ? requestedWeapon
                    : requestedWeapon.spriteId
            ),
            'slash',
            requestedOffhand
                ? makeHumanoidSpriteDescriptor(
                    typeof requestedOffhand === 'string'
                        ? requestedOffhand
                        : requestedOffhand.spriteId
                )
                : null
        );
    }

    const profile = resolveHumanoidActorVisualProfile(actor);
    if (!profile) return 'slash';
    return getHumanoidWeaponAttackClip(
        profile.equipment.weapon,
        profile.attackClip,
        profile.equipment.offhand
    );
}

if (typeof window !== 'undefined') {
    const validation = validateHumanoidVisualProfileRegistry();
    const invalidProfiles = Object.values(validation)
        .filter(result => !result.valid);
    if (invalidProfiles.length) {
        throw new Error(
            `Invalid humanoid visual profiles: ${
                invalidProfiles.map(result => (
                    `${result.profileId} (${result.errors.join(', ')})`
                )).join('; ')
            }`
        );
    }
    window.HumanoidActorVisualProfiles = HumanoidActorVisualProfiles;
    window.STANDARD_HUMANOID_NPC_PROFILE_IDS =
        STANDARD_HUMANOID_NPC_PROFILE_IDS;
    window.SPECIAL_HUMANOID_NPC_PROFILE_IDS =
        SPECIAL_HUMANOID_NPC_PROFILE_IDS;
    window.ADVANCED_HUMANOID_PROTOTYPE_PROFILE_IDS =
        ADVANCED_HUMANOID_PROTOTYPE_PROFILE_IDS;
    window.HUMANOID_NPC_STUDIO_PROFILE_IDS =
        HUMANOID_NPC_STUDIO_PROFILE_IDS;
    window.HumanoidStanceProfiles = HumanoidStanceProfiles;
    window.getHumanoidActorVisualProfile =
        getHumanoidActorVisualProfile;
    window.resolveHumanoidActorVisualProfile =
        resolveHumanoidActorVisualProfile;
    window.isHumanoidActor = isHumanoidActor;
    window.getHumanoidActorWeapon = getHumanoidActorWeapon;
    window.getHumanoidWeaponAttackClip =
        getHumanoidWeaponAttackClip;
    window.getHumanoidStanceProfileId =
        getHumanoidStanceProfileId;
    window.isHumanoidWeaponTwoHanded =
        isHumanoidWeaponTwoHanded;
    window.resolveHumanoidActorActionClip =
        resolveHumanoidActorActionClip;
    window.resolveHumanoidProfileAnchorOffsets =
        resolveHumanoidProfileAnchorOffsets;
    window.drawHumanoidActorFront = drawHumanoidActorFront;
    window.drawHumanoidActorWorld = drawHumanoidActorWorld;
    window.validateHumanoidVisualProfile =
        validateHumanoidVisualProfile;
    window.validateHumanoidVisualProfileRegistry =
        validateHumanoidVisualProfileRegistry;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        HUMANOID_VISUAL_EQUIPMENT_SLOTS,
        HUMANOID_VISUAL_APPEARANCE_KEYS,
        HUMANOID_STANDARD_ANIMATION_SET,
        HUMANOID_VISUAL_ANCHOR_KEYS,
        STANDARD_HUMANOID_NPC_PROFILE_IDS,
        SPECIAL_HUMANOID_NPC_PROFILE_IDS,
        ADVANCED_HUMANOID_PROTOTYPE_PROFILE_IDS,
        HUMANOID_NPC_STUDIO_PROFILE_IDS,
        HumanoidStanceProfiles,
        HumanoidActorVisualProfiles,
        getHumanoidActorVisualProfile,
        resolveHumanoidActorVisualProfile,
        isHumanoidActor,
        getHumanoidActorWeapon,
        getHumanoidWeaponVisualSpec,
        getHumanoidOffhandVisualSpec,
        isHumanoidWeaponTwoHanded,
        getHumanoidWeaponAttackClip,
        getHumanoidStanceProfileId,
        resolveHumanoidActorActionClip,
        resolveHumanoidProfileAnchorOffsets,
        drawHumanoidActorFront,
        drawHumanoidActorWorld,
        validateHumanoidVisualProfile,
        validateHumanoidVisualProfileRegistry
    };
}
