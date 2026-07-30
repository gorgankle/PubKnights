// Native 32x32 paper-doll equipment.
// Every matrix is generated against PLAYER_SPRITE_ANCHORS from sprite-overhaul.js.

const EquipmentOverhaulSpecs = {
    armor: {
        armor_beastmaster: {
            style: 'hide',
            primary: 'l',
            shadow: 'd',
            highlight: 'c',
            accent: 'b'
        },
        armor_tunic: {
            style: 'tunic',
            primary: 'l',
            shadow: 'd',
            highlight: 'c',
            accent: 'N'
        },
        armor_cask_plate: {
            style: 'cask',
            primary: 'c',
            shadow: 'd',
            highlight: 's',
            accent: 'I'
        },
        armor_boar_hide: {
            style: 'boar',
            primary: '-',
            shadow: 'd',
            highlight: 'l',
            accent: 'b'
        },
        armor_oak_barrel: {
            style: 'barrel',
            primary: 'c',
            shadow: 'd',
            highlight: 's',
            accent: 'N'
        },
        armor_pubserker: {
            style: 'suspenders',
            primary: 'W',
            shadow: 'b',
            highlight: 'l',
            accent: 'N'
        },
        armor_beerglass: {
            style: 'glass',
            primary: '^',
            shadow: 's',
            highlight: 'W',
            accent: 'K'
        },
        armor_tankard: {
            style: 'tankard',
            primary: 'c',
            shadow: 'd',
            highlight: 'I',
            accent: '!'
        },
        armor_blackout: {
            style: 'blackout',
            primary: 'J',
            shadow: '0',
            highlight: 'v',
            accent: '&'
        },
        flannel_shirt: {
            style: 'flannel',
            primary: 'R',
            shadow: 'w',
            highlight: 'W',
            accent: 'X'
        },
        heartwood_cuirass: {
            style: 'heartwood',
            primary: 'y',
            shadow: 'd',
            highlight: 'c',
            accent: 'h'
        },
        slicker_jacket: {
            style: 'slicker',
            primary: 'Y',
            shadow: 'K',
            highlight: 'W',
            accent: 's'
        },
        abyssal_diving_suit: {
            style: 'diving',
            primary: 'J',
            shadow: '0',
            highlight: 'I',
            accent: 'N'
        },
        denim_overalls: {
            style: 'overalls',
            primary: 'z',
            shadow: 'J',
            highlight: '?',
            accent: 'N'
        },
        armor_innkeeper_apron: {
            style: 'innkeeper',
            primary: 'W',
            shadow: 'b',
            highlight: 'p',
            accent: 'w'
        }
    },

    helmet: {
        helm_goblin_ears: {
            style: 'goblin_ears',
            primary: 'S',
            shadow: 'F',
            highlight: 'Q',
            accent: 'S'
        },
        helm_alpha: {
            style: 'collar',
            primary: 'l',
            shadow: 'd',
            highlight: 's',
            accent: 'R'
        },
        helm_rusty_coif: {
            style: 'coif',
            primary: 'I',
            shadow: 'J',
            highlight: 's',
            accent: 'N',
            hairMask: 'full',
            hidesHair: true
        },
        wilderness_cloak: {
            style: 'hood',
            primary: 'q',
            shadow: '1',
            highlight: 'e',
            accent: 'l',
            hairMask: 'full',
            hidesHair: true
        },
        primate_armor: {
            style: 'skull',
            primary: 'b',
            shadow: 'a',
            highlight: 'W',
            accent: 'G',
            hairMask: 'full',
            hidesHair: true
        },
        helm_pubserker: {
            style: 'flatcap',
            primary: 'l',
            shadow: 'd',
            highlight: 'c',
            accent: 'N',
            hairMask: 'cap'
        },
        helm_beerglass: {
            style: 'visor',
            primary: '^',
            shadow: 's',
            highlight: 'W',
            accent: 'K'
        },
        helm_tankard: {
            style: 'tankard',
            primary: 'c',
            shadow: 'd',
            highlight: 'I',
            accent: '!',
            hairMask: 'full',
            hidesHair: true
        },
        helm_blackout: {
            style: 'blinders',
            primary: '0',
            shadow: 'k',
            highlight: 'v',
            accent: '&'
        },
        helm_harvester: {
            style: 'widehat',
            primary: ':',
            shadow: 'd',
            highlight: 'Y',
            accent: 'h',
            hairMask: 'brim'
        },
        beanie_hat: {
            style: 'beanie',
            primary: 'w',
            shadow: '0',
            highlight: 'R',
            accent: 'b',
            hairMask: 'cap'
        },
        heartwood_crown: {
            style: 'crown',
            primary: 'y',
            shadow: 'd',
            highlight: 'c',
            accent: 'h'
        },
        fishermans_hat: {
            style: 'bucket',
            primary: 'Y',
            shadow: 'K',
            highlight: 'b',
            accent: '^',
            hairMask: 'brim'
        },
        abyssal_lantern: {
            style: 'lantern',
            primary: 'J',
            shadow: '0',
            highlight: 'N',
            accent: '^',
            hairMask: 'full',
            hidesHair: true
        },
        straw_hat: {
            style: 'strawhat',
            primary: ':',
            shadow: 'd',
            highlight: 'Y',
            accent: 'R',
            hairMask: 'brim'
        },
        burlap_sack_mask: {
            style: 'sack',
            primary: 'c',
            shadow: 'd',
            highlight: 'b',
            accent: '0',
            hairMask: 'full',
            hidesHair: true
        },
        helm_innkeeper: {
            style: 'widehat',
            primary: 'W',
            shadow: 'b',
            highlight: 'p',
            accent: 'w',
            hairMask: 'brim'
        }
    },

    gloves: {
        gloves_scavenger: { style: 'mitts', primary: 'd', shadow: '0', highlight: 'l', accent: '-' },
        gloves_leather_mitts: { style: 'mitts', primary: 'l', shadow: 'd', highlight: 'c', accent: 'N' },
        poachers_grips: { style: 'grips', primary: 'q', shadow: 'd', highlight: 'l', accent: 'h' },
        cellar_guard: { style: 'gauntlets', primary: 'I', shadow: 'J', highlight: 's', accent: 'N' },
        gloves_pubserker: { style: 'wraps', primary: 'W', shadow: 'b', highlight: 'R', accent: 'N' },
        gloves_beerglass: { style: 'shards', primary: '^', shadow: 's', highlight: 'W', accent: 'K' },
        gloves_tankard: { style: 'gauntlets', primary: 'I', shadow: 'd', highlight: 's', accent: '!' },
        gloves_blackout: { style: 'wraps', primary: 'J', shadow: '0', highlight: 'v', accent: '&' },
        bark_wraps: { style: 'bark', primary: 'y', shadow: 'd', highlight: 'c', accent: 'h' },
        barnacle_bracers: { style: 'barnacle', primary: 's', shadow: '7', highlight: 'W', accent: 'R' },
        work_gloves: { style: 'work', primary: 'l', shadow: 'd', highlight: ':', accent: 'N' }
    },

    boots: {
        boots_chewed: { style: 'boots', primary: 'l', shadow: 'd', highlight: 'c', accent: '-' },
        sturdy_boots: { style: 'boots', primary: 'D', shadow: '0', highlight: 'g', accent: 'N' },
        boots_hide: { style: 'boots', primary: '-', shadow: 'd', highlight: 'l', accent: 'b' },
        boots_cellar: { style: 'striders', primary: 'd', shadow: '0', highlight: 's', accent: 'h' },
        hop_infused_boots: { style: 'leaf', primary: 'q', shadow: 'd', highlight: 'h', accent: 'e' },
        boots_pubserker: { style: 'stompers', primary: 'l', shadow: 'd', highlight: 'W', accent: 'N' },
        boots_beerglass: { style: 'cleats', primary: '^', shadow: 's', highlight: 'W', accent: 'K' },
        boots_tankard: { style: 'sabatons', primary: 'I', shadow: 'J', highlight: 's', accent: 'c' },
        boots_blackout: { style: 'stagger', primary: 'J', shadow: '0', highlight: 'v', accent: '&' },
        boots_angler: { style: 'waders', primary: 'q', shadow: '1', highlight: 'e', accent: 'Y' },
        stump_stompers: { style: 'stumps', primary: 'y', shadow: 'd', highlight: 'c', accent: 'h' },
        coral_sabatons: { style: 'coral', primary: 'R', shadow: 'w', highlight: 'K', accent: 'W' },
        muddy_boots: { style: 'muddy', primary: 'l', shadow: '6', highlight: 'c', accent: '5' }
    },

    weapon: {
        weap_bow: { style: 'bow', primary: 'c', shadow: 'd', highlight: ':', accent: 'W' },
        weap_bone: { style: 'club', primary: 'b', shadow: 'a', highlight: 'W', accent: 'd' },
        weap_rusty_mace: { style: 'mace', primary: 'I', shadow: 'J', highlight: 's', accent: 'N' },
        weap_goblin_axe: { style: 'axe', primary: 'I', shadow: 'J', highlight: 's', accent: 'c' },
        weap_behemoth_maw: { style: 'greatclub', primary: 'd', shadow: '0', highlight: 'c', accent: 'I' },
        weap_machete: { style: 'machete', primary: 'I', shadow: 'J', highlight: 's', accent: 'l' },
        weap_spear: { style: 'spear', primary: 'c', shadow: 'd', highlight: 's', accent: 'I' },
        weap_mimic_dagger: { style: 'dagger', primary: 'b', shadow: 'd', highlight: 'W', accent: 'R' },
        brewmasters_club: { style: 'greatclub', primary: 'c', shadow: 'd', highlight: 'N', accent: 'h' },
        silverback_greatclub: {
            style: 'greatclub',
            primary: 'G',
            shadow: '0',
            highlight: 'a',
            accent: 'b',
            frontShaft: 'a',
            frontPrimary: 'a',
            frontHighlight: 'b',
            frontAccent: 'G'
        },
        weap_knuckles: { style: 'knuckles', primary: 'Y', shadow: 'N', highlight: 'W', accent: 'l' },
        weap_beerglass: { style: 'shiv', primary: '^', shadow: 's', highlight: 'W', accent: 'K' },
        weap_tankard: { style: 'maul', primary: 'c', shadow: 'd', highlight: 'I', accent: '!' },
        weap_blackout: { style: 'axe', primary: 'J', shadow: '0', highlight: 'v', accent: '&' },
        weap_timberlord: { style: 'axe', primary: 'y', shadow: 'd', highlight: 'I', accent: 'h' },
        sawblade_chakram: { style: 'sawblade', primary: 'I', shadow: 'J', highlight: 's', accent: 'R' },
        harpoon_trident: { style: 'trident', primary: 'I', shadow: 'J', highlight: 's', accent: '^' },
        pitchfork_spear: { style: 'pitchfork', primary: 'I', shadow: 'J', highlight: 's', accent: 'c' },
        scythe_of_reaping: { style: 'scythe', primary: 'J', shadow: '0', highlight: 's', accent: '&' },
        weap_apprentice_staff: { style: 'staff', primary: 'c', shadow: 'd', highlight: 'N', accent: 'm' },
        weap_bogwood_staff: { style: 'staff', primary: 'y', shadow: 'd', highlight: 'h', accent: '&' },
        weap_stormcaller_staff: { style: 'staff', primary: 'I', shadow: 'J', highlight: '^', accent: 'W' },
        weap_last_call_voidstaff: { style: 'staff', primary: '0', shadow: 'k', highlight: 'v', accent: '&' }
    },

    offhand: {
        offhand_captains_shield: {
            style: 'heater',
            offhandType: 'shield',
            primary: 'I',
            shadow: 'J',
            highlight: 's',
            accent: 'Y'
        },
        offhand_round_shield: {
            style: 'round',
            offhandType: 'shield',
            primary: 'c',
            shadow: 'd',
            highlight: 'l',
            accent: 'I'
        },
        offhand_tower_shield: {
            style: 'tower',
            offhandType: 'shield',
            primary: 'J',
            shadow: '0',
            highlight: 'I',
            accent: 'N'
        },
        offhand_parrying_dagger: {
            style: 'dagger',
            offhandType: 'weapon',
            primary: 'I',
            shadow: 'J',
            highlight: 'W',
            accent: 'Y'
        }
    }
};

const WeaponAnimationContracts = Object.freeze({
    weap_bow: Object.freeze({
        animationFamily: 'shoot',
        handedness: 'two',
        gripMode: 'two_hand'
    }),
    weap_bone: Object.freeze({
        animationFamily: 'bash',
        handedness: 'one',
        gripMode: 'one_hand'
    }),
    weap_rusty_mace: Object.freeze({
        animationFamily: 'bash',
        handedness: 'one',
        gripMode: 'one_hand'
    }),
    weap_goblin_axe: Object.freeze({
        animationFamily: 'slash',
        handedness: 'one',
        gripMode: 'one_hand'
    }),
    weap_behemoth_maw: Object.freeze({
        animationFamily: 'heavy',
        handedness: 'two',
        gripMode: 'two_hand'
    }),
    weap_machete: Object.freeze({
        animationFamily: 'slash',
        handedness: 'one',
        gripMode: 'one_hand'
    }),
    weap_spear: Object.freeze({
        animationFamily: 'thrust',
        handedness: 'two',
        gripMode: 'pole'
    }),
    weap_mimic_dagger: Object.freeze({
        animationFamily: 'dagger',
        handedness: 'one',
        gripMode: 'one_hand'
    }),
    brewmasters_club: Object.freeze({
        animationFamily: 'heavy',
        handedness: 'two',
        gripMode: 'two_hand'
    }),
    silverback_greatclub: Object.freeze({
        animationFamily: 'heavy',
        handedness: 'two',
        gripMode: 'two_hand'
    }),
    weap_knuckles: Object.freeze({
        animationFamily: 'bash',
        handedness: 'one',
        gripMode: 'one_hand'
    }),
    weap_beerglass: Object.freeze({
        animationFamily: 'dagger',
        handedness: 'one',
        gripMode: 'one_hand'
    }),
    weap_tankard: Object.freeze({
        animationFamily: 'heavy',
        handedness: 'two',
        gripMode: 'two_hand'
    }),
    weap_blackout: Object.freeze({
        animationFamily: 'heavy',
        handedness: 'two',
        gripMode: 'two_hand'
    }),
    weap_timberlord: Object.freeze({
        animationFamily: 'heavy',
        handedness: 'two',
        gripMode: 'two_hand'
    }),
    sawblade_chakram: Object.freeze({
        animationFamily: 'slash',
        handedness: 'one',
        gripMode: 'one_hand'
    }),
    harpoon_trident: Object.freeze({
        animationFamily: 'thrust',
        handedness: 'two',
        gripMode: 'pole'
    }),
    pitchfork_spear: Object.freeze({
        animationFamily: 'thrust',
        handedness: 'two',
        gripMode: 'pole'
    }),
    scythe_of_reaping: Object.freeze({
        animationFamily: 'scythe',
        handedness: 'two',
        gripMode: 'pole'
    }),
    weap_apprentice_staff: Object.freeze({
        animationFamily: 'cast',
        handedness: 'two',
        gripMode: 'pole'
    }),
    weap_bogwood_staff: Object.freeze({
        animationFamily: 'cast',
        handedness: 'two',
        gripMode: 'pole'
    }),
    weap_stormcaller_staff: Object.freeze({
        animationFamily: 'cast',
        handedness: 'two',
        gripMode: 'pole'
    }),
    weap_last_call_voidstaff: Object.freeze({
        animationFamily: 'cast',
        handedness: 'two',
        gripMode: 'pole'
    })
});

Object.entries(WeaponAnimationContracts).forEach(([spriteId, contract]) => {
    if (!EquipmentOverhaulSpecs.weapon[spriteId]) return;
    Object.assign(EquipmentOverhaulSpecs.weapon[spriteId], contract, {
        twoHanded: contract.handedness === 'two'
    });
});

const ArmorDesignProfiles = Object.freeze({
    hide: Object.freeze({
        material: 'layered hide and bone',
        silhouette: 'asymmetric fur mantle',
        weight: 'medium',
        length: 'short',
        sleeves: 'fur',
        shoulders: 'asymmetric'
    }),
    tunic: Object.freeze({
        material: 'waxed leather',
        silhouette: 'fitted split-hem tunic',
        weight: 'light',
        length: 'short',
        sleeves: 'short',
        shoulders: 'fitted'
    }),
    innkeeper: Object.freeze({
        material: 'linen shirt and service apron',
        silhouette: 'fitted apron with split hem',
        weight: 'light',
        length: 'short',
        sleeves: 'rolled',
        shoulders: 'fitted'
    }),
    cask: Object.freeze({
        material: 'iron-banded oak',
        silhouette: 'rounded stave breastplate',
        weight: 'heavy',
        length: 'short',
        sleeves: 'armored',
        shoulders: 'round'
    }),
    boar: Object.freeze({
        material: 'boar hide and tusk',
        silhouette: 'broad fur mantle',
        weight: 'medium',
        length: 'short',
        sleeves: 'fur',
        shoulders: 'broad'
    }),
    barrel: Object.freeze({
        material: 'oak staves and brass hoops',
        silhouette: 'barrel cuirass',
        weight: 'heavy',
        length: 'short',
        sleeves: 'armored',
        shoulders: 'round'
    }),
    suspenders: Object.freeze({
        material: 'linen and leather',
        silhouette: 'open work shirt with braces',
        weight: 'light',
        length: 'short',
        sleeves: 'rolled',
        shoulders: 'fitted'
    }),
    glass: Object.freeze({
        material: 'beerglass crystal',
        silhouette: 'angular shard cuirass',
        weight: 'medium',
        length: 'short',
        sleeves: 'shard',
        shoulders: 'angular'
    }),
    tankard: Object.freeze({
        material: 'steel and oak',
        silhouette: 'square tankard plate',
        weight: 'heavy',
        length: 'short',
        sleeves: 'armored',
        shoulders: 'square'
    }),
    blackout: Object.freeze({
        material: 'black wool and void trim',
        silhouette: 'high-collared long coat',
        weight: 'medium',
        length: 'long',
        sleeves: 'long',
        shoulders: 'sharp'
    }),
    flannel: Object.freeze({
        material: 'woven wool flannel',
        silhouette: 'fitted work shirt',
        weight: 'light',
        length: 'short',
        sleeves: 'rolled',
        shoulders: 'fitted'
    }),
    heartwood: Object.freeze({
        material: 'living bark and leaf',
        silhouette: 'layered bark cuirass',
        weight: 'medium',
        length: 'short',
        sleeves: 'bark',
        shoulders: 'leaf'
    }),
    slicker: Object.freeze({
        material: 'waxed oilskin',
        silhouette: 'long rain coat',
        weight: 'medium',
        length: 'long',
        sleeves: 'long',
        shoulders: 'round'
    }),
    diving: Object.freeze({
        material: 'iron and pressure canvas',
        silhouette: 'bulky pressure suit',
        weight: 'heavy',
        length: 'long',
        sleeves: 'armored',
        shoulders: 'round'
    }),
    overalls: Object.freeze({
        material: 'denim and brass',
        silhouette: 'fitted bib overalls',
        weight: 'light',
        length: 'short',
        sleeves: 'shirt',
        shoulders: 'fitted'
    })
});

const GloveDesignProfiles = Object.freeze({
    mitts: Object.freeze({
        material: 'soft leather',
        silhouette: 'rounded full-hand mitts',
        coverage: 'hand',
        bulk: 'light'
    }),
    grips: Object.freeze({
        material: 'oiled hunting leather',
        silhouette: 'fingerless palm grips',
        coverage: 'fingerless',
        bulk: 'light'
    }),
    gauntlets: Object.freeze({
        material: 'riveted metal',
        silhouette: 'flared wrist gauntlets',
        coverage: 'bracer',
        bulk: 'heavy'
    }),
    wraps: Object.freeze({
        material: 'layered cloth',
        silhouette: 'open knuckle wraps',
        coverage: 'wraps',
        bulk: 'light'
    }),
    shards: Object.freeze({
        material: 'beerglass crystal',
        silhouette: 'angular shard gloves',
        coverage: 'bracer',
        bulk: 'medium'
    }),
    bark: Object.freeze({
        material: 'living bark',
        silhouette: 'ridged bark wraps',
        coverage: 'bracer',
        bulk: 'medium'
    }),
    barnacle: Object.freeze({
        material: 'salted iron and shell',
        silhouette: 'barnacled sea bracers',
        coverage: 'bracer',
        bulk: 'heavy'
    }),
    work: Object.freeze({
        material: 'reinforced leather',
        silhouette: 'square work gloves',
        coverage: 'hand',
        bulk: 'medium'
    })
});

const BootDesignProfiles = Object.freeze({
    boots: Object.freeze({
        material: 'stitched leather',
        silhouette: 'fitted ankle boots',
        height: 'ankle',
        bulk: 'light',
        sole: 'flat'
    }),
    striders: Object.freeze({
        material: 'dark reinforced leather',
        silhouette: 'slim strapped striders',
        height: 'mid',
        bulk: 'light',
        sole: 'quiet'
    }),
    leaf: Object.freeze({
        material: 'hop vine and leather',
        silhouette: 'leaf-winged boots',
        height: 'ankle',
        bulk: 'light',
        sole: 'spring'
    }),
    stompers: Object.freeze({
        material: 'thick tavern leather',
        silhouette: 'broad-toed stompers',
        height: 'ankle',
        bulk: 'heavy',
        sole: 'heavy'
    }),
    cleats: Object.freeze({
        material: 'beerglass crystal',
        silhouette: 'angular crystal cleats',
        height: 'ankle',
        bulk: 'medium',
        sole: 'cleated'
    }),
    sabatons: Object.freeze({
        material: 'segmented iron',
        silhouette: 'layered plate sabatons',
        height: 'mid',
        bulk: 'heavy',
        sole: 'armored'
    }),
    stagger: Object.freeze({
        material: 'void leather',
        silhouette: 'asymmetric buckled boots',
        height: 'ankle',
        bulk: 'medium',
        sole: 'tilted'
    }),
    waders: Object.freeze({
        material: 'sealed oilskin',
        silhouette: 'slim knee-high waders',
        height: 'high',
        bulk: 'medium',
        sole: 'waterproof'
    }),
    stumps: Object.freeze({
        material: 'heartwood bark',
        silhouette: 'rooted bark boots',
        height: 'mid',
        bulk: 'heavy',
        sole: 'rooted'
    }),
    coral: Object.freeze({
        material: 'coral plate',
        silhouette: 'spined coral sabatons',
        height: 'mid',
        bulk: 'heavy',
        sole: 'armored'
    }),
    muddy: Object.freeze({
        material: 'mud-caked leather',
        silhouette: 'soft mud-heavy boots',
        height: 'ankle',
        bulk: 'medium',
        sole: 'muddy'
    })
});

function paintFrontArmorDefinitiveSilhouette(
    painter,
    spec,
    bounds
) {
    const {
        torsoX,
        torsoWidth,
        leftArmX,
        rightArmX
    } = bounds;
    const centerX = torsoX + Math.floor(torsoWidth / 2);
    const { rect, frame, line, points, ellipse } = painter;

    switch (spec.style) {
        case 'hide':
            paintOutlinedOverhaulShape(painter, [
                [12, leftArmX - 1, torsoX + 3],
                [13, leftArmX - 2, torsoX + 2],
                [14, leftArmX - 1, torsoX + 2]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [13, torsoX + torsoWidth - 3, rightArmX + 3],
                [14, torsoX + torsoWidth - 2, rightArmX + 2]
            ], spec.shadow);
            points([
                [leftArmX - 1, 12],
                [leftArmX - 2, 14],
                [rightArmX + 2, 14],
                [torsoX + 2, 22],
                [centerX, 23],
                [torsoX + torsoWidth - 3, 22]
            ], spec.accent);
            break;
        case 'tunic':
        case 'innkeeper':
            points([
                [centerX - 2, 13],
                [centerX, 15],
                [centerX + 2, 13]
            ], spec.shadow);
            line(torsoX + 2, 21, centerX - 1, 23, spec.primary);
            line(torsoX + torsoWidth - 3, 21, centerX + 1, 23, spec.primary);
            setArmorSplitHem(painter, centerX, 22, spec.shadow);
            if (spec.style === 'innkeeper') {
                line(centerX - 3, 14, centerX - 3, 21, spec.accent);
                line(centerX + 3, 14, centerX + 3, 21, spec.accent);
                line(centerX - 3, 21, centerX + 3, 21, spec.highlight);
            }
            break;
        case 'cask':
        case 'barrel':
            rect(leftArmX, 12, 4, 3, spec.primary);
            frame(leftArmX, 12, 4, 3, 'X');
            rect(rightArmX, 12, 4, 3, spec.primary);
            frame(rightArmX, 12, 4, 3, 'X');
            line(leftArmX + 1, 13, leftArmX + 2, 13, spec.highlight);
            line(rightArmX + 1, 13, rightArmX + 2, 13, spec.highlight);
            points([
                [torsoX - 1, 16],
                [torsoX - 1, 18],
                [torsoX + torsoWidth, 16],
                [torsoX + torsoWidth, 18]
            ], spec.shadow);
            break;
        case 'boar':
            paintOutlinedOverhaulShape(painter, [
                [12, leftArmX - 2, torsoX + 3],
                [13, leftArmX - 3, torsoX + 4],
                [14, leftArmX - 2, torsoX + 3],
                [15, leftArmX - 1, torsoX + 2]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [12, torsoX + torsoWidth - 4, rightArmX + 3],
                [13, torsoX + torsoWidth - 4, rightArmX + 4],
                [14, torsoX + torsoWidth - 3, rightArmX + 3],
                [15, torsoX + torsoWidth - 2, rightArmX + 2]
            ], spec.primary);
            points([
                [leftArmX - 2, 12],
                [leftArmX - 3, 14],
                [rightArmX + 3, 12],
                [rightArmX + 4, 14]
            ], spec.highlight);
            break;
        case 'suspenders':
            rect(leftArmX, 17, 4, 2, spec.shadow);
            rect(rightArmX, 17, 4, 2, spec.shadow);
            points([
                [centerX - 2, 13],
                [centerX, 15],
                [centerX + 2, 13]
            ], spec.shadow);
            break;
        case 'glass':
            paintOutlinedOverhaulShape(painter, [
                [11, leftArmX + 1, torsoX + 2],
                [12, leftArmX - 1, torsoX + 3],
                [13, leftArmX, torsoX + 3],
                [14, leftArmX + 1, torsoX + 2]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [12, torsoX + torsoWidth - 3, rightArmX + 3],
                [13, torsoX + torsoWidth - 2, rightArmX + 4],
                [14, torsoX + torsoWidth - 2, rightArmX + 2]
            ], spec.primary);
            points([
                [leftArmX, 12],
                [rightArmX + 3, 13],
                [centerX - 3, 22],
                [centerX + 3, 22]
            ], spec.highlight);
            break;
        case 'tankard':
            rect(leftArmX - 1, 12, 6, 4, spec.primary);
            frame(leftArmX - 1, 12, 6, 4, 'X');
            rect(rightArmX - 1, 12, 6, 4, spec.primary);
            frame(rightArmX - 1, 12, 6, 4, 'X');
            line(leftArmX, 13, leftArmX + 3, 13, spec.highlight);
            line(rightArmX, 13, rightArmX + 3, 13, spec.highlight);
            break;
        case 'blackout':
            paintOutlinedOverhaulShape(painter, [
                [11, centerX - 4, centerX + 3],
                [12, centerX - 5, centerX + 4],
                [13, centerX - 4, centerX + 4]
            ], spec.primary);
            points([
                [torsoX, 23],
                [torsoX, 24],
                [torsoX + torsoWidth - 1, 23],
                [torsoX + torsoWidth - 1, 24]
            ], spec.accent);
            break;
        case 'flannel':
            points([
                [centerX - 2, 13],
                [centerX, 15],
                [centerX + 2, 13]
            ], spec.highlight);
            rect(leftArmX, 17, 4, 2, spec.shadow);
            rect(rightArmX, 17, 4, 2, spec.shadow);
            break;
        case 'heartwood':
            paintOutlinedOverhaulShape(painter, [
                [12, leftArmX, torsoX + 2],
                [13, leftArmX - 1, torsoX + 3],
                [14, leftArmX, torsoX + 2]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [12, torsoX + torsoWidth - 3, rightArmX + 3],
                [13, torsoX + torsoWidth - 2, rightArmX + 4],
                [14, torsoX + torsoWidth - 2, rightArmX + 3]
            ], spec.primary);
            points([
                [leftArmX - 1, 13],
                [rightArmX + 3, 12],
                [rightArmX + 4, 13]
            ], spec.accent);
            break;
        case 'slicker':
            paintOutlinedOverhaulShape(painter, [
                [11, centerX - 3, centerX + 3],
                [12, centerX - 5, centerX + 4],
                [13, centerX - 4, centerX + 4]
            ], spec.primary);
            rect(leftArmX, 17, 4, 2, spec.accent);
            rect(rightArmX, 17, 4, 2, spec.accent);
            break;
        case 'diving':
            ellipse(centerX, 13, 6, 3, 'X');
            ellipse(centerX, 13, 5, 2, spec.primary);
            ellipse(leftArmX + 2, 14, 3, 3, 'X');
            ellipse(leftArmX + 2, 14, 2, 2, spec.primary);
            ellipse(rightArmX + 1, 14, 3, 3, 'X');
            ellipse(rightArmX + 1, 14, 2, 2, spec.primary);
            break;
        case 'overalls':
            rect(leftArmX, 17, 4, 2, spec.shadow);
            rect(rightArmX, 17, 4, 2, spec.shadow);
            break;
        default:
            break;
    }
}

function setArmorSplitHem(painter, centerX, y, key) {
    painter.points([
        [centerX - 1, y],
        [centerX, y + 1],
        [centerX + 1, y]
    ], key);
}

function drawArmorOverhaulDetails(painter, spec, gender, bounds) {
    const { set, rect, line, points } = painter;
    const {
        torsoX,
        torsoWidth,
        leftArmX,
        rightArmX
    } = bounds;
    const centerX = torsoX + Math.floor(torsoWidth / 2);

    switch (spec.style) {
        case 'hide':
            line(torsoX + 2, 14, centerX, 20, spec.accent);
            line(torsoX + torsoWidth - 3, 14, centerX, 20, spec.accent);
            points([[torsoX + 2, 17], [torsoX + torsoWidth - 3, 18], [centerX, 15]], spec.highlight);
            break;
        case 'tunic':
        case 'innkeeper':
            line(centerX - 1, 14, centerX - 1, 20, spec.shadow);
            points([[centerX + 1, 15], [centerX + 1, 17], [centerX + 1, 19]], spec.accent);
            if (spec.style === 'innkeeper') {
                line(centerX - 3, 15, centerX - 3, 21, spec.accent);
                line(centerX + 3, 15, centerX + 3, 21, spec.accent);
            }
            break;
        case 'cask':
            line(torsoX + 3, 14, torsoX + 3, 21, spec.shadow);
            line(torsoX + torsoWidth - 4, 14, torsoX + torsoWidth - 4, 21, spec.shadow);
            rect(torsoX, 15, torsoWidth, 1, spec.highlight);
            rect(torsoX, 20, torsoWidth, 1, spec.highlight);
            set(centerX, 18, spec.accent);
            break;
        case 'barrel':
            line(torsoX + 2, 14, torsoX + 2, 21, spec.shadow);
            line(centerX, 14, centerX, 21, spec.shadow);
            line(
                torsoX + torsoWidth - 3,
                14,
                torsoX + torsoWidth - 3,
                21,
                spec.shadow
            );
            rect(torsoX, 15, torsoWidth, 1, spec.accent);
            rect(torsoX, 20, torsoWidth, 1, spec.accent);
            points([
                [torsoX + 1, 15],
                [torsoX + torsoWidth - 2, 20]
            ], spec.highlight);
            break;
        case 'boar':
            line(torsoX + 2, 14, centerX - 1, 19, spec.accent);
            line(torsoX + torsoWidth - 3, 14, centerX + 1, 19, spec.accent);
            rect(centerX - 1, 16, 3, 2, spec.shadow);
            break;
        case 'suspenders':
            line(torsoX + 3, 13, torsoX + 4, 21, spec.highlight, 2);
            line(torsoX + torsoWidth - 4, 13, torsoX + torsoWidth - 5, 21, spec.highlight, 2);
            set(torsoX + 4, 18, spec.accent);
            set(torsoX + torsoWidth - 5, 18, spec.accent);
            break;
        case 'glass':
            rect(torsoX + 2, 15, torsoWidth - 4, 5, spec.accent);
            rect(torsoX + 2, 15, torsoWidth - 4, 1, spec.highlight);
            line(torsoX + 1, 14, torsoX + torsoWidth - 2, 21, spec.highlight);
            break;
        case 'tankard':
            rect(torsoX, 15, torsoWidth, 1, spec.highlight);
            rect(torsoX, 20, torsoWidth, 1, spec.highlight);
            line(centerX, 14, centerX, 21, spec.shadow);
            set(centerX, 18, spec.accent);
            break;
        case 'blackout':
            line(centerX, 13, centerX, 24, spec.highlight);
            line(torsoX + 1, 14, torsoX + 1, 23, spec.accent);
            line(torsoX + torsoWidth - 2, 14, torsoX + torsoWidth - 2, 23, spec.accent);
            break;
        case 'flannel':
            for (let y = 14; y <= 20; y += 3) {
                rect(torsoX + 1, y, torsoWidth - 2, 1, spec.highlight);
            }
            for (let x = torsoX + 3; x < torsoX + torsoWidth - 1; x += 4) {
                rect(x, 14, 1, 7, spec.shadow);
            }
            break;
        case 'heartwood':
            line(centerX, 14, centerX, 21, spec.shadow);
            points([
                [centerX - 2, 16],
                [centerX + 2, 17],
                [centerX - 3, 19],
                [centerX + 3, 20]
            ], spec.accent);
            break;
        case 'slicker':
            line(centerX, 13, centerX, 24, spec.shadow);
            points([[centerX - 2, 16], [centerX - 2, 19], [centerX + 2, 16], [centerX + 2, 19]], spec.highlight);
            rect(leftArmX, 18, 4, 1, spec.accent);
            rect(rightArmX, 18, 4, 1, spec.accent);
            break;
        case 'diving':
            rect(torsoX + 2, 15, torsoWidth - 4, 4, spec.highlight);
            rect(centerX - 2, 15, 5, 3, '^');
            rect(torsoX, 20, torsoWidth, 2, spec.accent);
            set(centerX, 16, 'W');
            break;
        case 'overalls':
            rect(centerX - 4, 14, 9, 7, spec.primary);
            line(torsoX + 2, 13, centerX - 3, 16, spec.highlight);
            line(torsoX + torsoWidth - 3, 13, centerX + 3, 16, spec.highlight);
            rect(centerX - 3, 18, 7, 2, spec.highlight);
            set(centerX, 19, spec.accent);
            break;
        default:
            break;
    }

    if (gender === 'female') {
        set(torsoX, 20, spec.shadow);
        set(torsoX + torsoWidth - 1, 20, spec.shadow);
    }
}

function makeArmorOverhaulSprite(spec, gender = 'male') {
    const female = gender === 'female';
    return createNativeOverhaulSprite(painter => {
        const { rect, line, points } = painter;
        const torsoX = female ? 10 : 9;
        const torsoWidth = female ? 12 : 14;
        const leftArmX = 7;
        const rightArmX = 22;
        const basePrimary = spec.style === 'overalls'
            ? 'U'
            : spec.primary;
        const coatLength = ['blackout', 'slicker', 'diving'].includes(spec.style) ? 12 : 9;
        const bounds = { torsoX, torsoWidth, leftArmX, rightArmX };

        paintOutlinedOverhaulShape(painter, [
            [14, 7, 10],
            [15, 7, 10],
            [16, 7, 10],
            [17, 7, 10],
            [18, 7, 9]
        ], basePrimary);
        paintOutlinedOverhaulShape(painter, [
            [14, 21, 24],
            [15, 21, 24],
            [16, 21, 24],
            [17, 21, 24],
            [18, 22, 24]
        ], basePrimary);

        const torsoSpans = female
            ? [
                [13, 11, 20],
                [14, 8, 23],
                [15, 9, 22],
                [16, 9, 22],
                [17, 10, 21],
                [18, 11, 20],
                [19, 12, 19],
                [20, 10, 21],
                [21, 9, 22]
            ]
            : [
                [13, 10, 21],
                [14, 8, 23],
                [15, 8, 23],
                [16, 9, 22],
                [17, 9, 22],
                [18, 10, 21],
                [19, 11, 20],
                [20, 10, 21],
                [21, 9, 22]
            ];

        if (coatLength > 9) {
            torsoSpans.push(
                [22, torsoX, torsoX + torsoWidth - 1],
                [23, torsoX + 1, torsoX + torsoWidth - 2],
                [24, torsoX + 1, torsoX + torsoWidth - 2]
            );
        }

        paintOutlinedOverhaulShape(painter, torsoSpans, basePrimary);
        points(female
            ? [[10, 14], [10, 15], [21, 14], [21, 15]]
            : [[9, 14], [9, 15], [22, 14], [22, 15]], basePrimary);
        line(torsoX + 1, 15, torsoX + 3, 15, spec.highlight);
        points([
            [torsoX + 1, 16],
            [torsoX + torsoWidth - 2, 16],
            [torsoX + torsoWidth - 2, 19]
        ], spec.shadow);

        if (coatLength > 9) {
            line(
                torsoX + Math.floor(torsoWidth / 2),
                21,
                torsoX + Math.floor(torsoWidth / 2),
                24,
                'X'
            );
        }

        paintFrontArmorDefinitiveSilhouette(
            painter,
            spec,
            bounds
        );
        drawArmorOverhaulDetails(painter, spec, gender, bounds);
    });
}

const HelmetHairMaskProfiles = Object.freeze({
    cap: [
        [0, 7, 25],
        [1, 7, 25],
        [2, 7, 25],
        [3, 7, 25],
        [4, 7, 25],
        [5, 7, 25],
        [6, 7, 25]
    ],
    brim: [
        [0, 5, 27],
        [1, 5, 27],
        [2, 5, 27],
        [3, 5, 27],
        [4, 5, 27],
        [5, 5, 27],
        [6, 4, 28],
        [7, 3, 29],
        [8, 3, 29]
    ],
    full: Array.from({ length: 12 }, (_, y) => [y, 4, 28])
});

function paintHelmetHairMask(painter, profile) {
    const spans = HelmetHairMaskProfiles[profile];
    if (!spans) return;

    const bodyMatrices = typeof CorePlayerSampleMatrices !== 'undefined'
        ? [
            CorePlayerSampleMatrices.body_core_male,
            CorePlayerSampleMatrices.body_core_female
        ].filter(Boolean)
        : [];

    spans.forEach(([y, startX, endX]) => {
        for (let x = startX; x <= endX; x++) {
            const overlapsBody = bodyMatrices.some(matrix => matrix[y]?.[x] !== '.');
            if (!overlapsBody) painter.set(x, y, '_');
        }
    });
}

function makeHelmetOverhaulSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;

        paintHelmetHairMask(painter, spec.hairMask);

        switch (spec.style) {
            case 'goblin_ears':
                line(10, 7, 4, 4, 'X', 4);
                line(10, 7, 4, 4, spec.primary, 2);
                line(22, 7, 28, 4, 'X', 4);
                line(22, 7, 28, 4, spec.primary, 2);
                points([[4, 4], [5, 5], [27, 5], [28, 4]], spec.highlight);
                points([[8, 7], [24, 7]], spec.shadow);
                break;
            case 'collar':
                paintOutlinedOverhaulShape(painter, [
                    [10, 10, 12],
                    [10, 19, 21],
                    [11, 9, 13],
                    [11, 18, 22],
                    [12, 9, 14],
                    [12, 17, 22],
                    [13, 10, 21],
                    [14, 11, 20]
                ], spec.primary);
                points([[10, 9], [13, 10], [18, 10], [21, 9]], spec.accent);
                points([[10, 12], [12, 13], [19, 13], [21, 12]], spec.highlight);
                line(13, 14, 18, 14, spec.shadow);
                break;
            case 'coif':
                paintOutlinedOverhaulShape(painter, [
                    [1, 13, 18],
                    [2, 11, 20],
                    [3, 9, 22],
                    [4, 8, 23],
                    [5, 8, 23],
                    [6, 8, 23],
                    [7, 8, 23],
                    [8, 8, 23],
                    [9, 8, 23],
                    [10, 9, 22],
                    [11, 9, 22],
                    [12, 10, 21],
                    [13, 10, 21],
                    [14, 12, 19]
                ], spec.primary);
                rect(11, 5, 10, 5, '.');
                rect(12, 10, 8, 1, '.');
                line(11, 4, 20, 4, 'X');
                line(10, 5, 10, 9, 'X');
                line(21, 5, 21, 9, 'X');
                line(11, 10, 20, 10, 'X');
                points([
                    [12, 2], [16, 2], [20, 3],
                    [9, 6], [22, 7], [9, 10], [22, 11],
                    [12, 12], [18, 13]
                ], spec.highlight);
                points([[10, 8], [21, 6], [11, 13], [20, 12]], spec.shadow);
                points([[14, 3], [18, 4], [10, 11], [21, 10]], spec.accent);
                break;
            case 'hood':
                paintOutlinedOverhaulShape(painter, [
                    [0, 14, 17],
                    [1, 12, 19],
                    [2, 10, 21],
                    [3, 8, 23],
                    [4, 8, 23],
                    [5, 8, 23],
                    [6, 8, 23],
                    [7, 8, 23],
                    [8, 8, 23],
                    [9, 8, 23],
                    [10, 8, 23],
                    [11, 9, 22],
                    [12, 7, 24],
                    [13, 8, 23],
                    [14, 10, 21]
                ], spec.primary);
                rect(11, 5, 10, 6, '.');
                line(11, 4, 20, 4, 'X');
                line(10, 5, 10, 10, 'X');
                line(21, 5, 21, 10, 'X');
                line(11, 11, 20, 11, 'X');
                line(10, 3, 15, 1, spec.highlight);
                line(16, 1, 22, 4, spec.shadow);
                line(8, 12, 14, 14, spec.highlight);
                line(23, 12, 18, 14, spec.shadow);
                points([[9, 8], [22, 6], [11, 13], [20, 13]], spec.accent);
                break;
            case 'skull':
                paintOutlinedOverhaulShape(painter, [
                    [0, 14, 18],
                    [1, 11, 21],
                    [2, 9, 23],
                    [3, 8, 24],
                    [4, 8, 24],
                    [5, 9, 23],
                    [6, 9, 23],
                    [7, 9, 23],
                    [8, 10, 22],
                    [9, 10, 22],
                    [10, 11, 21],
                    [11, 12, 20],
                    [12, 13, 19]
                ], spec.primary);
                line(9, 3, 6, 0, 'X', 3);
                line(23, 3, 26, 0, 'X', 3);
                line(9, 3, 6, 0, spec.accent);
                line(23, 3, 26, 0, spec.accent);
                rect(11, 6, 4, 2, spec.shadow);
                rect(18, 6, 4, 2, spec.shadow);
                points([[13, 7], [19, 7]], spec.accent);
                points([[16, 8], [15, 9], [17, 9]], spec.shadow);
                line(13, 11, 19, 11, spec.highlight);
                points([[14, 11], [16, 11], [18, 11]], 'X');
                points([[11, 3], [20, 2], [22, 5], [12, 9]], spec.highlight);
                break;
            case 'flatcap':
                paintOutlinedOverhaulShape(painter, [
                    [1, 13, 20],
                    [2, 10, 22],
                    [3, 9, 23],
                    [4, 9, 23],
                    [5, 10, 22]
                ], spec.primary);
                paintOutlinedOverhaulShape(painter, [
                    [5, 8, 25],
                    [6, 8, 26]
                ], spec.shadow);
                line(12, 2, 20, 2, spec.highlight);
                line(11, 4, 22, 4, spec.shadow);
                points([[13, 1], [18, 2]], spec.accent);
                line(20, 5, 25, 5, spec.highlight);
                break;
            case 'visor':
                paintOutlinedOverhaulShape(painter, [
                    [5, 10, 22],
                    [6, 8, 24],
                    [7, 8, 24],
                    [8, 9, 23],
                    [9, 10, 22]
                ], spec.primary);
                rect(10, 6, 5, 2, spec.accent);
                rect(18, 6, 5, 2, spec.accent);
                points([[11, 6], [12, 6], [19, 6], [20, 6]], spec.highlight);
                line(15, 6, 17, 8, spec.shadow);
                points([[8, 7], [24, 7]], spec.highlight);
                points([[10, 9], [22, 9]], spec.shadow);
                break;
            case 'tankard':
                paintOutlinedOverhaulShape(painter, [
                    [1, 11, 21],
                    [2, 9, 23],
                    [3, 9, 23],
                    [4, 9, 23],
                    [5, 9, 23],
                    [6, 9, 23],
                    [7, 9, 23],
                    [8, 9, 23],
                    [9, 9, 23],
                    [10, 9, 23],
                    [11, 10, 22],
                    [12, 11, 21]
                ], spec.primary);
                rect(23, 3, 5, 8, spec.primary);
                frame(23, 3, 5, 8, 'X');
                rect(24, 4, 3, 6, '.');
                line(10, 3, 22, 3, spec.highlight);
                line(10, 5, 22, 5, spec.accent);
                rect(11, 6, 11, 3, spec.shadow);
                frame(11, 6, 11, 3, 'X');
                line(12, 7, 20, 7, spec.highlight);
                line(16, 2, 16, 11, spec.shadow);
                points([[10, 10], [22, 10], [13, 11], [19, 11]], spec.highlight);
                break;
            case 'blinders':
                paintOutlinedOverhaulShape(painter, [
                    [5, 10, 22],
                    [6, 8, 24],
                    [7, 8, 24],
                    [8, 9, 23],
                    [9, 10, 22]
                ], spec.primary);
                rect(10, 6, 5, 2, spec.shadow);
                rect(18, 6, 5, 2, spec.shadow);
                points([[11, 6], [19, 6]], spec.highlight);
                line(15, 7, 17, 7, spec.accent);
                line(9, 6, 6, 3, spec.accent);
                line(23, 6, 26, 3, spec.accent);
                points([[8, 8], [24, 8]], spec.highlight);
                break;
            case 'widehat':
                paintOutlinedOverhaulShape(painter, [
                    [0, 17, 19],
                    [1, 15, 21],
                    [2, 13, 22],
                    [3, 11, 23],
                    [4, 9, 24]
                ], spec.primary);
                paintOutlinedOverhaulShape(painter, [
                    [4, 5, 27],
                    [5, 3, 29],
                    [6, 5, 27]
                ], spec.primary);
                line(10, 4, 23, 4, spec.shadow);
                line(13, 2, 20, 2, spec.highlight);
                line(7, 5, 25, 5, spec.highlight);
                points([[9, 4], [24, 4], [27, 5], [28, 6]], spec.accent);
                break;
            case 'beanie':
                paintOutlinedOverhaulShape(painter, [
                    [1, 13, 19],
                    [2, 11, 21],
                    [3, 10, 22],
                    [4, 9, 23],
                    [5, 9, 23]
                ], spec.primary);
                rect(9, 5, 15, 2, spec.shadow);
                frame(9, 5, 15, 2, 'X');
                line(11, 5, 21, 5, spec.highlight);
                points([[12, 3], [16, 2], [20, 3], [11, 4], [18, 4]], spec.highlight);
                ellipse(16, 0, 2, 1, spec.accent);
                break;
            case 'crown':
                paintOutlinedOverhaulShape(painter, [
                    [3, 10, 22],
                    [4, 9, 23],
                    [5, 10, 22],
                    [6, 11, 21]
                ], spec.primary);
                line(10, 3, 8, 0, 'X', 3);
                line(13, 3, 12, 0, 'X', 3);
                line(16, 3, 16, 0, 'X', 3);
                line(19, 3, 20, 0, 'X', 3);
                line(22, 3, 24, 0, 'X', 3);
                line(10, 3, 8, 0, spec.primary);
                line(13, 3, 12, 0, spec.primary);
                line(16, 3, 16, 0, spec.primary);
                line(19, 3, 20, 0, spec.primary);
                line(22, 3, 24, 0, spec.primary);
                points([[8, 0], [12, 0], [16, 0], [20, 0], [24, 0]], spec.highlight);
                points([[12, 4], [16, 4], [20, 4]], spec.accent);
                line(11, 6, 21, 6, spec.shadow);
                break;
            case 'bucket':
                paintOutlinedOverhaulShape(painter, [
                    [0, 13, 19],
                    [1, 11, 21],
                    [2, 10, 22],
                    [3, 9, 23],
                    [4, 9, 23],
                    [5, 10, 22]
                ], spec.primary);
                paintOutlinedOverhaulShape(painter, [
                    [4, 6, 26],
                    [5, 5, 27],
                    [6, 7, 25]
                ], spec.primary);
                line(11, 1, 20, 2, spec.highlight);
                line(10, 4, 22, 4, spec.shadow);
                points([[7, 5], [25, 5], [21, 3]], spec.accent);
                break;
            case 'lantern':
                paintOutlinedOverhaulShape(painter, [
                    [1, 13, 19],
                    [2, 10, 22],
                    [3, 9, 23],
                    [4, 8, 24],
                    [5, 8, 24],
                    [6, 8, 24],
                    [7, 8, 24],
                    [8, 8, 24],
                    [9, 8, 24],
                    [10, 8, 24],
                    [11, 9, 23],
                    [12, 10, 22]
                ], spec.primary);
                rect(10, 4, 13, 2, spec.highlight);
                rect(10, 6, 13, 5, spec.shadow);
                frame(10, 6, 13, 5, 'X');
                rect(12, 7, 9, 3, spec.accent);
                points([[13, 7], [14, 7], [16, 8], [19, 9], [20, 8]], spec.highlight);
                set(16, 8, 'W');
                line(14, 1, 14, 0, spec.highlight, 2);
                line(18, 1, 18, 0, spec.highlight, 2);
                line(14, 0, 18, 0, spec.highlight);
                points([[9, 5], [23, 5], [10, 11], [22, 11]], spec.accent);
                break;
            case 'strawhat':
                paintOutlinedOverhaulShape(painter, [
                    [1, 12, 20],
                    [2, 10, 22],
                    [3, 9, 23],
                    [4, 10, 22]
                ], spec.primary);
                paintOutlinedOverhaulShape(painter, [
                    [4, 5, 27],
                    [5, 3, 29],
                    [6, 5, 27]
                ], spec.primary);
                line(10, 3, 22, 3, spec.shadow);
                line(11, 2, 20, 2, spec.highlight);
                rect(11, 4, 11, 1, spec.accent);
                points([[6, 5], [9, 6], [24, 6], [27, 5]], spec.highlight);
                break;
            case 'sack':
                paintOutlinedOverhaulShape(painter, [
                    [0, 12, 20],
                    [1, 10, 22],
                    [2, 9, 23],
                    [3, 9, 23],
                    [4, 8, 24],
                    [5, 8, 24],
                    [6, 8, 24],
                    [7, 8, 24],
                    [8, 8, 24],
                    [9, 8, 24],
                    [10, 8, 24],
                    [11, 9, 23],
                    [12, 9, 23],
                    [13, 10, 22],
                    [14, 12, 20]
                ], spec.primary);
                line(11, 1, 21, 12, spec.highlight);
                line(21, 2, 10, 13, spec.shadow);
                rect(11, 6, 4, 2, '.');
                rect(18, 6, 4, 2, '.');
                frame(11, 6, 4, 2, 'X');
                frame(18, 6, 4, 2, 'X');
                points([[12, 7], [14, 6], [19, 7], [21, 6]], spec.accent);
                points([[10, 3], [22, 4], [9, 9], [23, 10], [13, 13]], spec.highlight);
                rect(12, 13, 9, 2, spec.shadow);
                line(13, 13, 19, 13, spec.accent);
                break;
            default:
                break;
        }
    });
}

function makeGlovesOverhaulSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, line, points } = painter;
        const design = GloveDesignProfiles[spec.style];
        if (!design) return;

        const hands = [
            {
                side: 'left',
                palmX: 6,
                cuffX: 7,
                innerX: 9,
                outerX: 6
            },
            {
                side: 'right',
                palmX: 22,
                cuffX: 22,
                innerX: 22,
                outerX: 25
            }
        ];

        hands.forEach((hand, index) => {
            const right = hand.side === 'right';
            const palmEndX = hand.palmX + 3;
            const cuffEndX = hand.cuffX + 2;
            const fullHandSpans = right
                ? [
                    [18, 22, 24],
                    [19, 22, 25],
                    [20, 22, 25],
                    [21, 22, 25],
                    [22, 22, 24]
                ]
                : [
                    [18, 7, 9],
                    [19, 6, 9],
                    [20, 6, 9],
                    [21, 6, 9],
                    [22, 7, 9]
                ];

            if (design.coverage === 'fingerless') {
                paintOutlinedOverhaulShape(painter, right
                    ? [[18, 22, 24], [19, 22, 25], [20, 22, 25]]
                    : [[18, 7, 9], [19, 6, 9], [20, 6, 9]], spec.primary);
                rect(hand.palmX, 20, 4, 1, spec.accent);
                points([
                    [right ? 24 : 7, 21],
                    [right ? 23 : 8, 21]
                ], spec.highlight);
                return;
            }

            if (design.coverage === 'wraps') {
                rect(hand.cuffX, 18, 3, 1, spec.accent);
                rect(hand.palmX, 19, 4, 1, spec.primary);
                rect(hand.palmX, 21, 4, 1, spec.shadow);
                points([
                    [hand.palmX, 19],
                    [palmEndX, 19],
                    [hand.palmX, 21],
                    [palmEndX, 21]
                ], 'X');
                points([
                    [right ? 24 : 7, 20],
                    [right ? 23 : 8, 22]
                ], spec.highlight);
                return;
            }

            paintOutlinedOverhaulShape(painter, fullHandSpans, spec.primary);
            points([
                [right ? 24 : 7, 20],
                [right ? 23 : 8, 21]
            ], spec.highlight);
            set(hand.outerX, 21, spec.shadow);

            if (design.coverage === 'bracer') {
                rect(hand.cuffX, 17, 3, 2, spec.primary);
                line(hand.cuffX, 17, cuffEndX, 17, spec.highlight);
                points([
                    [hand.cuffX, 18],
                    [cuffEndX, 18]
                ], spec.shadow);
            }

            if (spec.style === 'mitts') {
                line(
                    right ? palmEndX - 2 : hand.palmX + 1,
                    19,
                    right ? palmEndX - 2 : hand.palmX + 1,
                    21,
                    spec.shadow
                );
            } else if (spec.style === 'gauntlets') {
                rect(hand.palmX, 19, 4, 1, spec.highlight);
                set(right ? 23 : 8, 20, spec.accent);
            } else if (spec.style === 'shards') {
                points([
                    [hand.cuffX, 16],
                    [hand.cuffX + 1, 17],
                    [hand.cuffX + 2, 16],
                    [right ? 26 : 5, 20]
                ], spec.highlight);
                set(right ? 24 : 7, 21, spec.accent);
            } else if (spec.style === 'bark') {
                line(
                    right ? palmEndX : hand.palmX,
                    19,
                    right ? hand.palmX : palmEndX,
                    22,
                    spec.highlight
                );
                set(right ? hand.cuffX + 2 : hand.cuffX, 16, spec.accent);
            } else if (spec.style === 'barnacle') {
                points([
                    [hand.cuffX, 16],
                    [hand.cuffX + 1, 15],
                    [hand.cuffX + 2, 16]
                ], spec.accent);
                set(right ? 24 : 7, 20, spec.highlight);
            } else if (spec.style === 'work') {
                rect(hand.palmX, 21, 4, 1, spec.accent);
                line(hand.cuffX, 18, cuffEndX, 18, spec.highlight);
            }
        });
    });
}

function makeBootsOverhaulSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, line, points } = painter;
        const design = BootDesignProfiles[spec.style];
        if (!design) return;

        const boots = [
            {
                side: 'left',
                ankleStart: 10,
                ankleEnd: 14,
                toeStart: 9,
                toeEnd: 14,
                outerX: 9,
                innerX: 14
            },
            {
                side: 'right',
                ankleStart: 17,
                ankleEnd: 21,
                toeStart: 17,
                toeEnd: 22,
                outerX: 22,
                innerX: 17
            }
        ];

        boots.forEach((boot, index) => {
            const right = boot.side === 'right';
            const spans = [];
            if (design.height === 'high') {
                spans.push(
                    [24, boot.ankleStart, boot.ankleEnd],
                    [25, boot.ankleStart, boot.ankleEnd],
                    [26, boot.ankleStart, boot.ankleEnd],
                    [27, boot.ankleStart, boot.ankleEnd],
                    [28, boot.ankleStart, boot.ankleEnd]
                );
            } else if (design.height === 'mid') {
                spans.push(
                    [27, right ? 18 : 11, right ? 20 : 13],
                    [28, boot.ankleStart, boot.ankleEnd]
                );
            }
            spans.push(
                [29, boot.ankleStart, boot.ankleEnd],
                [30, boot.toeStart, boot.toeEnd],
                [31, boot.toeStart, boot.toeEnd]
            );
            paintOutlinedOverhaulShape(painter, spans, spec.primary);

            line(
                boot.ankleStart,
                29,
                boot.ankleEnd,
                29,
                spec.highlight
            );
            line(
                right ? boot.toeStart + 2 : boot.toeStart,
                31,
                right ? boot.toeEnd : boot.toeEnd - 2,
                31,
                spec.shadow
            );

            if (spec.style === 'boots') {
                set(right ? 20 : 11, 30, spec.accent);
            } else if (spec.style === 'striders') {
                line(
                    right ? 18 : 13,
                    27,
                    right ? 18 : 13,
                    30,
                    spec.accent
                );
                set(right ? 20 : 11, 28, spec.highlight);
            } else if (spec.style === 'leaf') {
                points([
                    [right ? 22 : 9, 28],
                    [right ? 23 : 8, 29],
                    [right ? 21 : 10, 30]
                ], spec.accent);
                line(
                    boot.toeStart + 1,
                    30,
                    boot.toeEnd - 1,
                    31,
                    spec.highlight
                );
            } else if (spec.style === 'stompers') {
                line(
                    boot.toeStart,
                    31,
                    boot.toeEnd,
                    31,
                    spec.accent
                );
                set(right ? 21 : 10, 30, spec.highlight);
            } else if (spec.style === 'cleats') {
                points([
                    [right ? 18 : 13, 28],
                    [right ? 20 : 11, 28],
                    [right ? 18 : 13, 31],
                    [right ? 21 : 10, 31]
                ], spec.accent);
                set(right ? 22 : 9, 30, spec.highlight);
            } else if (spec.style === 'sabatons') {
                line(
                    boot.ankleStart,
                    28,
                    boot.ankleEnd,
                    28,
                    spec.accent
                );
                points([
                    [right ? 18 : 13, 30],
                    [right ? 20 : 11, 30],
                    [right ? 22 : 9, 31]
                ], spec.highlight);
            } else if (spec.style === 'stagger') {
                line(
                    right ? boot.ankleStart : boot.ankleEnd,
                    29,
                    right ? boot.toeEnd - 1 : boot.toeStart + 1,
                    31,
                    spec.highlight
                );
                set(right ? 18 : 13, 28, spec.accent);
            } else if (spec.style === 'waders') {
                line(
                    boot.ankleStart,
                    25,
                    boot.ankleEnd,
                    25,
                    spec.accent
                );
                line(
                    right ? 18 : 13,
                    26,
                    right ? 18 : 13,
                    29,
                    spec.highlight
                );
            } else if (spec.style === 'stumps') {
                line(
                    right ? 18 : 13,
                    27,
                    right ? 18 : 13,
                    31,
                    spec.shadow
                );
                line(
                    right ? 20 : 11,
                    28,
                    right ? 20 : 11,
                    30,
                    spec.highlight
                );
                points([
                    [right ? 21 : 10, 27],
                    [right ? 22 : 9, 26]
                ], spec.accent);
            } else if (spec.style === 'coral') {
                points([
                    [right ? 18 : 13, 26],
                    [right ? 20 : 11, 27],
                    [right ? 22 : 9, 29]
                ], spec.accent);
                set(right ? 19 : 12, 30, spec.highlight);
            } else if (spec.style === 'muddy') {
                points([
                    [boot.toeStart, 30],
                    [boot.toeStart + 1, 31],
                    [boot.toeEnd - 1, 31],
                    [boot.toeEnd, 30]
                ], spec.accent);
                set(right ? 20 : 11, 29, spec.highlight);
            }
        });
    });
}

function makeOffhandOverhaulSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;

        if (spec.offhandType === 'weapon') {
            line(9, 24, 15, 14, 'X', 4);
            line(9, 24, 15, 14, spec.primary, 2);
            line(10, 22, 15, 14, spec.highlight);
            line(7, 23, 12, 26, spec.accent, 2);
            line(8, 25, 6, 29, spec.shadow, 2);
            set(15, 13, 'W');
            return;
        }

        if (spec.style === 'round') {
            ellipse(10, 19, 6, 8, 'X');
            ellipse(10, 19, 5, 7, spec.primary);
            ellipse(10, 19, 3, 5, spec.shadow);
            ellipse(10, 19, 2, 3, spec.accent);
            points([[8, 14], [9, 13], [12, 15]], spec.highlight);
            return;
        }

        if (spec.style === 'tower') {
            rect(5, 10, 11, 16, 'X');
            rect(6, 11, 9, 14, spec.primary);
            line(10, 11, 10, 25, spec.shadow, 2);
            line(7, 12, 14, 12, spec.highlight);
            line(7, 23, 14, 23, spec.accent);
            points([[5, 26], [6, 27], [14, 27], [15, 26]], 'X');
            points([[7, 25], [13, 25]], spec.primary);
            return;
        }

        points([
            [6, 11], [14, 11], [16, 14], [15, 22],
            [10, 27], [5, 22], [4, 14]
        ], 'X');
        rect(6, 12, 9, 10, spec.primary);
        points([
            [5, 14], [15, 14], [14, 22], [10, 26], [6, 22]
        ], spec.primary);
        line(10, 12, 10, 25, spec.shadow, 2);
        line(6, 14, 14, 14, spec.highlight);
        ellipse(10, 18, 2, 2, spec.accent);
        frame(8, 16, 5, 5, spec.shadow);
    });
}

const FRONT_WEAPON_HAND_ANCHOR = Object.freeze({ x: 24, y: 21 });
const FRONT_WEAPON_PAPERDOLL_PIVOT = FRONT_WEAPON_HAND_ANCHOR;
const FRONT_WEAPON_SCALE_BY_STYLE = Object.freeze({
    bow: 0.74,
    club: 0.58,
    greatclub: 0.70,
    mace: 0.60,
    machete: 0.70,
    spear: 0.92,
    trident: 0.92,
    pitchfork: 0.92,
    dagger: 0.58,
    shiv: 0.58,
    knuckles: 0.72,
    maul: 0.70,
    axe: 0.70,
    sawblade: 0.66,
    scythe: 0.86,
    staff: 0.86
});
const FRONT_WEAPON_TILT_BY_STYLE = Object.freeze({
    bow: 8,
    club: 20,
    greatclub: 18,
    mace: 20,
    maul: 18,
    machete: 18,
    dagger: 20,
    shiv: 20,
    spear: 12,
    trident: 10,
    pitchfork: 10,
    staff: 12,
    axe: 12,
    sawblade: 14,
    scythe: 8,
    knuckles: 0
});
const FRONT_WEAPON_OFFSET_BY_STYLE = Object.freeze({
    bow: Object.freeze({ x: -2, y: 0 }),
    club: Object.freeze({ x: 0, y: -3 }),
    greatclub: Object.freeze({ x: 0, y: -3 }),
    mace: Object.freeze({ x: 0, y: -3 }),
    machete: Object.freeze({ x: 0, y: -3 }),
    dagger: Object.freeze({ x: 0, y: -3 }),
    shiv: Object.freeze({ x: 0, y: -3 }),
    maul: Object.freeze({ x: 0, y: -2 })
});
const FRONT_WEAPON_UPPER_LEAN_BY_STYLE = Object.freeze({
    axe: 3,
    sawblade: 3
});
const FRONT_WEAPON_CUSTOM_HEAD_MAX_SOURCE_Y = Object.freeze({
    axe: 13,
    sawblade: 18,
    scythe: 11
});
const FRONT_WEAPON_FULL_REBUILD_STYLES = new Set([
    'club',
    'greatclub',
    'mace',
    'maul'
]);
const FRONT_POLE_WEAPON_BLUEPRINTS = Object.freeze({
    spear: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.spear,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.spear,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 30 }),
            end: Object.freeze({ x: 16, y: 7 }),
            material: 'primary'
        }),
        head: 'spear'
    }),
    trident: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.trident,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.trident,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 30 }),
            end: Object.freeze({ x: 16, y: 8 }),
            material: 'primary'
        }),
        head: 'trident'
    }),
    pitchfork: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.pitchfork,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.pitchfork,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 30 }),
            end: Object.freeze({ x: 16, y: 8 }),
            material: 'accent'
        }),
        head: 'pitchfork'
    }),
    staff: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.staff,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.staff,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 30 }),
            end: Object.freeze({ x: 16, y: 8 }),
            material: 'primary'
        }),
        head: 'staff'
    }),
    axe: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.axe,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.axe,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 30 }),
            end: Object.freeze({ x: 16, y: 9 }),
            material: 'shadow'
        }),
        head: 'axe'
    }),
    sawblade: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.sawblade,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.sawblade,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 30 }),
            end: Object.freeze({ x: 16, y: 15 }),
            material: 'accent'
        }),
        head: 'sawblade'
    }),
    scythe: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.scythe,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.scythe,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 30 }),
            end: Object.freeze({ x: 16, y: 4 }),
            material: 'shadow'
        }),
        head: 'scythe'
    })
});
const FRONT_HANDHELD_WEAPON_BLUEPRINTS = Object.freeze({
    club: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.club,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.club,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 26 }),
            end: Object.freeze({ x: 16, y: 4 }),
            material: 'primary'
        }),
        head: 'club'
    }),
    greatclub: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.greatclub,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.greatclub,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 25 }),
            end: Object.freeze({ x: 16, y: 7 }),
            material: 'primary'
        }),
        head: 'greatclub'
    }),
    mace: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.mace,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.mace,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 26 }),
            end: Object.freeze({ x: 16, y: 5 }),
            material: 'accent'
        }),
        head: 'mace'
    }),
    maul: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.maul,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.maul,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 25 }),
            end: Object.freeze({ x: 16, y: 7 }),
            material: 'shadow'
        }),
        head: 'maul'
    }),
    machete: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.machete,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.machete,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 25 }),
            end: Object.freeze({ x: 16, y: 20 }),
            material: 'shadow'
        }),
        head: 'machete'
    }),
    dagger: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.dagger,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.dagger,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 25 }),
            end: Object.freeze({ x: 16, y: 20 }),
            material: 'shadow'
        }),
        head: 'dagger'
    }),
    shiv: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.shiv,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.shiv,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 26 }),
            end: Object.freeze({ x: 16, y: 20 }),
            material: 'accent'
        }),
        head: 'shiv'
    })
});
const FRONT_SPECIAL_WEAPON_BLUEPRINTS = Object.freeze({
    bow: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.bow,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.bow,
        grip: Object.freeze({ x: 19, y: 16 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 19, y: 20 }),
            end: Object.freeze({ x: 19, y: 12 }),
            material: 'primary'
        }),
        head: 'bow'
    }),
    knuckles: Object.freeze({
        scale: FRONT_WEAPON_SCALE_BY_STYLE.knuckles,
        tiltDegrees: FRONT_WEAPON_TILT_BY_STYLE.knuckles,
        grip: Object.freeze({ x: 16, y: 22 }),
        shaft: Object.freeze({
            start: Object.freeze({ x: 16, y: 23 }),
            end: Object.freeze({ x: 16, y: 21 }),
            material: 'primary'
        }),
        head: 'knuckles'
    })
});
const FRONT_CENTERED_WEAPON_BLUEPRINTS = Object.freeze({
    ...FRONT_POLE_WEAPON_BLUEPRINTS,
    ...FRONT_HANDHELD_WEAPON_BLUEPRINTS,
    ...FRONT_SPECIAL_WEAPON_BLUEPRINTS
});
const FRONT_WEAPON_SHAFT_BY_STYLE = Object.freeze({
    club: Object.freeze({
        start: [24, 26],
        end: [25, 13],
        material: 'primary'
    }),
    greatclub: Object.freeze({
        start: [24, 26],
        end: [25, 14],
        material: 'primary'
    }),
    mace: Object.freeze({
        start: [24, 26],
        end: [25, 12],
        material: 'accent'
    }),
    maul: Object.freeze({
        start: [24, 25],
        end: [25, 12],
        material: 'shadow'
    }),
    axe: Object.freeze({
        start: [23, 28],
        end: [27, 13],
        material: 'primary'
    }),
    sawblade: Object.freeze({
        start: [23, 28],
        end: [27, 16],
        material: 'accent'
    }),
    scythe: Object.freeze({
        start: [23, 29],
        end: [25, 8],
        material: 'primary'
    })
});

function drawWeaponBlade(painter, spec, start, end, thickness = 3) {
    painter.line(start.x, start.y, end.x, end.y, 'X', thickness + 2);
    painter.line(start.x, start.y, end.x, end.y, spec.primary, thickness);
    painter.line(start.x + 1, start.y, end.x + 1, end.y, spec.highlight);
}

function makeWeaponOverhaulSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;
        const hand = FRONT_WEAPON_HAND_ANCHOR;

        switch (spec.style) {
            case 'bow':
                line(24, 3, 28, 7, spec.primary, 2);
                line(28, 7, 29, 15, spec.primary, 2);
                line(29, 15, 28, 24, spec.primary, 2);
                line(28, 24, 24, 29, spec.primary, 2);
                line(24, 3, 24, 29, spec.accent);
                line(23, 21, 29, 21, spec.highlight);
                points([[23, 21], [24, 20], [24, 22]], spec.accent);
                break;
            case 'club':
            case 'greatclub':
                line(hand.x, 28, 26, 7, 'X', spec.style === 'greatclub' ? 5 : 4);
                line(hand.x, 28, 26, 7, spec.primary, spec.style === 'greatclub' ? 3 : 2);
                ellipse(26, 6, spec.style === 'greatclub' ? 4 : 3, spec.style === 'greatclub' ? 5 : 4, spec.primary);
                points([[24, 3], [28, 4], [23, 7], [29, 8]], spec.accent);
                line(24, 9, 28, 5, spec.highlight);
                break;
            case 'mace':
                line(hand.x, 28, 25, 10, 'X', 4);
                line(hand.x, 28, 25, 10, spec.accent, 2);
                ellipse(25, 7, 4, 4, spec.primary);
                frame(22, 4, 7, 7, 'X');
                points([[25, 2], [20, 7], [30, 7], [25, 12]], spec.highlight);
                break;
            case 'machete':
                line(hand.x, hand.y, 28, 5, 'X', 5);
                line(hand.x, hand.y, 28, 5, spec.primary, 3);
                line(26, 19, 29, 6, spec.highlight);
                rect(21, 20, 7, 2, spec.accent);
                line(23, 22, 22, 28, spec.shadow, 2);
                break;
            case 'spear':
            case 'trident':
            case 'pitchfork':
                line(23, 30, 26, 4, 'X', 3);
                line(23, 30, 26, 4, spec.primary);
                line(24, 29, 27, 5, spec.highlight);
                if (spec.style === 'spear') {
                    points([[26, 0], [23, 5], [26, 4], [29, 5]], spec.accent);
                    line(26, 0, 26, 5, spec.highlight);
                } else {
                    line(22, 5, 22, 0, spec.accent, 2);
                    line(26, 4, 26, 0, spec.accent, 2);
                    line(30, 5, 30, 0, spec.accent, 2);
                    line(22, 5, 30, 5, spec.accent, 2);
                    if (spec.style === 'trident') points([[22, 0], [26, 0], [30, 0]], spec.highlight);
                }
                break;
            case 'dagger':
            case 'shiv':
                drawWeaponBlade(painter, spec, hand, { x: 29, y: 8 }, spec.style === 'shiv' ? 2 : 3);
                line(21, 21, 27, 23, spec.accent, 2);
                line(23, 23, 22, 28, spec.shadow, 2);
                if (spec.style === 'shiv') points([[28, 7], [30, 10], [27, 12]], spec.highlight);
                break;
            case 'knuckles':
                rect(21, 19, 9, 6, spec.shadow);
                frame(21, 19, 9, 6, 'X');
                [22, 24, 26, 28].forEach(x => {
                    ellipse(x, 20, 1, 2, spec.primary);
                    set(x, 19, spec.highlight);
                });
                rect(22, 23, 7, 2, spec.accent);
                break;
            case 'maul':
                line(23, 29, 25, 11, 'X', 4);
                line(23, 29, 25, 11, spec.shadow, 2);
                rect(20, 5, 11, 8, spec.primary);
                frame(20, 5, 11, 8, 'X');
                rect(21, 7, 9, 2, spec.highlight);
                line(25, 5, 25, 12, spec.accent);
                break;
            case 'axe':
                line(23, 29, 25, 10, 'X', 4);
                line(23, 29, 25, 10, spec.shadow, 2);
                rect(20, 5, 6, 7, spec.primary);
                rect(26, 6, 4, 5, spec.primary);
                points([[19, 6], [18, 8], [19, 11], [30, 7], [31, 9], [29, 11]], spec.highlight);
                line(20, 5, 29, 6, 'X');
                line(20, 12, 29, 11, 'X');
                set(24, 8, spec.accent);
                break;
            case 'sawblade':
                line(23, 29, 25, 15, spec.accent, 3);
                ellipse(26, 9, 6, 6, spec.primary);
                ellipse(26, 9, 3, 3, spec.shadow);
                points([
                    [26, 1], [21, 3], [18, 8], [20, 14],
                    [26, 17], [31, 14], [31, 4]
                ], spec.highlight);
                set(26, 9, spec.accent);
                break;
            case 'scythe':
                line(23, 30, 25, 3, 'X', 4);
                line(23, 30, 25, 3, spec.shadow, 2);
                line(25, 3, 17, 2, spec.primary, 3);
                line(17, 2, 11, 6, spec.primary, 3);
                line(11, 6, 8, 10, spec.highlight, 2);
                set(24, 5, spec.accent);
                break;
            case 'staff':
                line(23, 30, 25, 5, 'X', 4);
                line(23, 30, 25, 5, spec.primary, 2);
                ellipse(25, 4, 4, 4, spec.accent);
                ellipse(25, 4, 2, 2, spec.highlight);
                points([[21, 1], [29, 1], [20, 5], [30, 5], [25, 9]], spec.shadow);
                set(25, 4, 'W');
                break;
            default:
                break;
        }
    });
}

function paintCompactFrontWeaponHead(painter, style, spec) {
    const { line, points, set } = painter;

    switch (style) {
        case 'club':
            paintOutlinedOverhaulShape(painter, [
                [7, 23, 28],
                [8, 23, 28],
                [9, 24, 27],
                [10, 24, 26],
                [11, 24, 25]
            ], spec.primary);
            points([[24, 8], [25, 8], [25, 9]], spec.highlight);
            points([[27, 7], [24, 10]], spec.accent);
            break;
        case 'greatclub':
            paintOutlinedOverhaulShape(painter, [
                [5, 24, 27],
                [6, 23, 28],
                [7, 23, 29],
                [8, 23, 29],
                [9, 23, 29],
                [10, 24, 28],
                [11, 24, 26]
            ], spec.primary);
            points([
                [25, 6], [24, 7], [25, 7], [24, 8],
                [25, 8], [26, 8], [25, 9], [26, 9]
            ], spec.highlight);
            points([[27, 6], [28, 7], [27, 9], [25, 10]], spec.accent);
            break;
        case 'mace':
            paintOutlinedOverhaulShape(painter, [
                [5, 24, 26],
                [6, 23, 28],
                [7, 22, 29],
                [8, 23, 28],
                [9, 24, 26]
            ], spec.primary);
            points([
                [24, 6], [25, 6], [26, 6],
                [24, 7], [25, 7], [26, 7], [27, 7],
                [24, 8], [25, 8], [26, 8]
            ], spec.primary);
            points([[25, 5], [22, 7], [29, 7], [25, 9]], spec.highlight);
            set(25, 7, spec.accent);
            break;
        case 'maul':
            paintOutlinedOverhaulShape(painter, [
                [6, 24, 30],
                [7, 22, 31],
                [8, 22, 31],
                [9, 23, 31],
                [10, 25, 28]
            ], spec.primary);
            line(24, 7, 29, 7, spec.highlight);
            points([[23, 8], [30, 8], [26, 9], [27, 9]], spec.accent);
            break;
        case 'axe':
            paintOutlinedOverhaulShape(painter, [
                [7, 27, 29],
                [8, 27, 31],
                [9, 26, 31],
                [10, 26, 31],
                [11, 27, 30],
                [12, 27, 29],
                [13, 27, 28]
            ], spec.primary);
            points([
                [29, 7], [31, 8], [31, 9], [31, 10], [30, 11], [29, 12],
                [26, 15], [25, 18], [25, 21], [24, 24], [24, 27]
            ], spec.highlight);
            points([[28, 9], [28, 10]], spec.accent);
            break;
        case 'sawblade':
            paintOutlinedOverhaulShape(painter, [
                [9, 27, 29],
                [10, 25, 30],
                [11, 24, 31],
                [12, 24, 31],
                [13, 24, 31],
                [14, 25, 30],
                [15, 27, 29]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [11, 27, 29],
                [12, 26, 30],
                [13, 27, 29]
            ], spec.shadow);
            points([[28, 9], [24, 12], [31, 12], [28, 15]], spec.highlight);
            set(28, 12, spec.accent);
            break;
        case 'scythe':
            paintOutlinedOverhaulShape(painter, [
                [3, 30, 31],
                [4, 29, 31],
                [5, 28, 31],
                [6, 27, 30],
                [7, 26, 28],
                [8, 25, 27]
            ], spec.primary);
            points([
                [30, 3], [31, 3],
                [29, 4], [30, 4], [31, 4],
                [28, 5], [29, 5], [27, 6]
            ], spec.highlight);
            points([
                [29, 6], [27, 7], [25, 8],
                [25, 14], [24, 20], [24, 25]
            ], spec.accent);
            break;
        default:
            break;
    }
}

function paintMappedFrontWeaponShape(
    painter,
    spans,
    fillKey,
    mapPoint,
    outlineKey = 'X'
) {
    const sourceCells = new Set();
    const projectedCells = new Map();

    spans.forEach(([y, startX, endX]) => {
        for (let x = startX; x <= endX; x += 1) {
            sourceCells.add(`${x},${y}`);
        }
    });

    sourceCells.forEach(coordinate => {
        const [x, y] = coordinate.split(',').map(Number);
        const neighbors = [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1]
        ];

        neighbors.forEach(([neighborX, neighborY]) => {
            if (sourceCells.has(`${neighborX},${neighborY}`)) return;
            const outlineTarget = mapPoint({ x: neighborX, y: neighborY });
            const outlineTargetId = `${outlineTarget.x},${outlineTarget.y}`;

            if (!projectedCells.has(outlineTargetId)) {
                projectedCells.set(outlineTargetId, outlineKey);
            }
        });

        const target = mapPoint({ x, y });
        const targetId = `${target.x},${target.y}`;
        projectedCells.set(targetId, fillKey);
    });

    projectedCells.forEach((key, coordinate) => {
        const [x, y] = coordinate.split(',').map(Number);
        painter.set(x, y, key);
    });
}

function paintFrontCenteredWeaponBlueprint(
    painter,
    spec,
    blueprint,
    targetGrip,
    scale
) {
    const mapPoint = point => ({
        x: Math.round(
            targetGrip.x + ((point.x - blueprint.grip.x) * scale)
        ),
        y: Math.round(
            targetGrip.y + ((point.y - blueprint.grip.y) * scale)
        )
    });
    const drawLine = (start, end, key, thickness = 1) => {
        const mappedStart = mapPoint(start);
        const mappedEnd = mapPoint(end);
        painter.line(
            mappedStart.x,
            mappedStart.y,
            mappedEnd.x,
            mappedEnd.y,
            key,
            Math.max(1, Math.round(thickness * scale))
        );
    };
    const drawPoints = (points, key) => {
        painter.points(points.map(point => {
            const mapped = mapPoint(point);
            return [mapped.x, mapped.y];
        }), key);
    };
    const shaftMaterial =
        spec.frontShaft || spec[blueprint.shaft.material];

    drawLine(blueprint.shaft.start, blueprint.shaft.end, 'X', 3);
    drawLine(blueprint.shaft.start, blueprint.shaft.end, shaftMaterial);

    switch (blueprint.head) {
        case 'bow': {
            const limbs = [
                [{ x: 16, y: 2 }, { x: 18, y: 6 }],
                [{ x: 18, y: 6 }, { x: 19, y: 12 }],
                [{ x: 19, y: 12 }, { x: 19, y: 20 }],
                [{ x: 19, y: 20 }, { x: 18, y: 26 }],
                [{ x: 18, y: 26 }, { x: 16, y: 28 }]
            ];

            limbs.forEach(([start, end]) => {
                drawLine(start, end, 'X', 3);
                drawLine(start, end, spec.primary);
            });
            drawLine(
                { x: 16, y: 3 },
                { x: 16, y: 28 },
                spec.accent
            );
            drawPoints([
                { x: 17, y: 3 },
                { x: 18, y: 7 },
                { x: 18, y: 12 },
                { x: 18, y: 20 },
                { x: 17, y: 26 }
            ], spec.highlight);
            break;
        }
        case 'club':
            paintMappedFrontWeaponShape(painter, [
                [0, 14, 18],
                [1, 13, 19],
                [2, 13, 19],
                [3, 14, 18],
                [4, 15, 17]
            ], spec.primary, mapPoint);
            drawPoints([
                { x: 14, y: 0 },
                { x: 14, y: 1 },
                { x: 15, y: 1 },
                { x: 15, y: 2 }
            ], spec.highlight);
            drawPoints([
                { x: 18, y: 1 },
                { x: 17, y: 3 }
            ], spec.accent);
            break;
        case 'greatclub': {
            const primary = spec.frontPrimary || spec.primary;
            const highlight = spec.frontHighlight || spec.highlight;
            const accent = spec.frontAccent || spec.accent;

            paintMappedFrontWeaponShape(painter, [
                [0, 15, 17],
                [1, 14, 18],
                [2, 13, 19],
                [3, 13, 19],
                [4, 13, 19],
                [5, 13, 19],
                [6, 14, 18],
                [7, 15, 17]
            ], primary, mapPoint);
            drawPoints([
                { x: 15, y: 0 },
                { x: 14, y: 1 },
                { x: 14, y: 2 },
                { x: 15, y: 2 },
                { x: 14, y: 3 },
                { x: 15, y: 3 },
                { x: 15, y: 4 },
                { x: 16, y: 4 }
            ], highlight);
            drawPoints([
                { x: 18, y: 1 },
                { x: 19, y: 2 },
                { x: 18, y: 4 },
                { x: 17, y: 6 }
            ], accent);
            break;
        }
        case 'mace':
            paintMappedFrontWeaponShape(painter, [
                [0, 15, 17],
                [1, 13, 19],
                [2, 12, 20],
                [3, 13, 19],
                [4, 15, 17]
            ], spec.primary, mapPoint);
            drawPoints([
                { x: 16, y: 0 },
                { x: 12, y: 2 },
                { x: 20, y: 2 },
                { x: 16, y: 4 }
            ], spec.highlight);
            drawPoints([
                { x: 15, y: 1 },
                { x: 16, y: 1 },
                { x: 14, y: 2 },
                { x: 15, y: 2 },
                { x: 16, y: 2 },
                { x: 17, y: 2 },
                { x: 15, y: 3 },
                { x: 16, y: 3 }
            ], spec.primary);
            drawPoints([{ x: 16, y: 2 }], spec.accent);
            break;
        case 'maul':
            paintMappedFrontWeaponShape(painter, [
                [0, 14, 18],
                [1, 13, 19],
                [2, 13, 19],
                [3, 13, 19],
                [4, 13, 19],
                [5, 13, 19],
                [6, 14, 18],
                [7, 15, 17]
            ], spec.primary, mapPoint);
            drawLine(
                { x: 14, y: 2 },
                { x: 18, y: 2 },
                spec.highlight
            );
            drawPoints([
                { x: 14, y: 4 },
                { x: 18, y: 4 },
                { x: 16, y: 5 },
                { x: 17, y: 5 }
            ], spec.accent);
            break;
        case 'machete':
            drawLine(
                { x: 16, y: 20 },
                { x: 16, y: 1 },
                'X',
                5
            );
            drawLine(
                { x: 16, y: 20 },
                { x: 16, y: 1 },
                spec.primary,
                3
            );
            drawLine(
                { x: 15, y: 18 },
                { x: 15, y: 3 },
                spec.highlight
            );
            drawLine(
                { x: 12, y: 20 },
                { x: 20, y: 20 },
                'X',
                3
            );
            drawLine(
                { x: 12, y: 20 },
                { x: 20, y: 20 },
                spec.accent
            );
            drawPoints([{ x: 16, y: 1 }], spec.highlight);
            break;
        case 'dagger':
            drawLine(
                { x: 16, y: 20 },
                { x: 16, y: 4 },
                'X',
                5
            );
            drawLine(
                { x: 16, y: 20 },
                { x: 16, y: 4 },
                spec.primary,
                3
            );
            drawLine(
                { x: 15, y: 18 },
                { x: 15, y: 6 },
                spec.highlight
            );
            drawLine(
                { x: 13, y: 20 },
                { x: 19, y: 20 },
                'X',
                3
            );
            drawLine(
                { x: 13, y: 20 },
                { x: 19, y: 20 },
                spec.accent
            );
            drawPoints([{ x: 16, y: 4 }], spec.highlight);
            break;
        case 'shiv':
            drawLine(
                { x: 16, y: 20 },
                { x: 16, y: 7 },
                'X',
                3
            );
            drawLine(
                { x: 16, y: 20 },
                { x: 16, y: 7 },
                spec.primary,
                1
            );
            drawPoints([
                { x: 16, y: 7 },
                { x: 17, y: 10 },
                { x: 15, y: 13 },
                { x: 17, y: 16 }
            ], spec.highlight);
            drawLine(
                { x: 13, y: 20 },
                { x: 19, y: 20 },
                'X',
                3
            );
            drawLine(
                { x: 13, y: 20 },
                { x: 19, y: 20 },
                spec.accent
            );
            break;
        case 'axe':
            paintMappedFrontWeaponShape(painter, [
                [3, 16, 18],
                [4, 15, 20],
                [5, 14, 22],
                [6, 14, 22],
                [7, 15, 22],
                [8, 16, 21],
                [9, 16, 18]
            ], spec.primary, mapPoint);
            drawPoints([
                { x: 21, y: 5 },
                { x: 22, y: 6 },
                { x: 22, y: 7 },
                { x: 21, y: 8 }
            ], spec.highlight);
            drawPoints([
                { x: 15, y: 4 },
                { x: 16, y: 5 },
                { x: 16, y: 6 },
                { x: 16, y: 7 },
                { x: 16, y: 8 }
            ], spec.accent);
            break;
        case 'sawblade': {
            const center = mapPoint({ x: 19, y: 9 });
            const outerRadius = Math.max(3, Math.round(5 * scale));
            const bladeRadius = Math.max(2, outerRadius - 1);
            const hubRadius = Math.max(1, Math.round(2 * scale));

            drawLine(
                { x: 16, y: 15 },
                { x: 19, y: 13 },
                'X',
                3
            );
            drawLine(
                { x: 16, y: 15 },
                { x: 19, y: 13 },
                spec.accent
            );
            painter.ellipse(
                center.x,
                center.y,
                outerRadius,
                outerRadius,
                'X'
            );
            painter.ellipse(
                center.x,
                center.y,
                bladeRadius,
                bladeRadius,
                spec.primary
            );
            painter.ellipse(
                center.x,
                center.y,
                hubRadius,
                hubRadius,
                spec.shadow
            );
            drawPoints([
                { x: 19, y: 3 },
                { x: 15, y: 4 },
                { x: 13, y: 8 },
                { x: 14, y: 13 },
                { x: 19, y: 15 },
                { x: 23, y: 13 },
                { x: 24, y: 8 },
                { x: 23, y: 4 }
            ], spec.highlight);
            painter.set(center.x, center.y, spec.accent);
            break;
        }
        case 'scythe':
            paintMappedFrontWeaponShape(painter, [
                [2, 15, 19],
                [3, 16, 21],
                [4, 17, 21],
                [5, 18, 21],
                [6, 19, 21],
                [7, 20, 21],
                [8, 21, 21],
                [9, 21, 21]
            ], spec.primary, mapPoint);
            drawPoints([
                { x: 15, y: 2 },
                { x: 17, y: 3 },
                { x: 19, y: 4 },
                { x: 20, y: 5 },
                { x: 21, y: 6 },
                { x: 21, y: 7 }
            ], spec.highlight);
            drawPoints([
                { x: 16, y: 3 },
                { x: 15, y: 4 },
                { x: 16, y: 5 }
            ], spec.accent);
            break;
        case 'knuckles':
            paintMappedFrontWeaponShape(painter, [
                [20, 13, 19],
                [21, 12, 20],
                [22, 13, 19],
                [23, 14, 18]
            ], spec.shadow, mapPoint);
            drawPoints([
                { x: 13, y: 20 },
                { x: 15, y: 20 },
                { x: 17, y: 20 },
                { x: 19, y: 20 }
            ], spec.highlight);
            drawPoints([
                { x: 14, y: 21 },
                { x: 16, y: 21 },
                { x: 18, y: 21 }
            ], '.');
            drawLine(
                { x: 14, y: 23 },
                { x: 18, y: 23 },
                spec.accent
            );
            break;
        case 'spear':
            paintMappedFrontWeaponShape(painter, [
                [1, 16, 16],
                [2, 16, 16],
                [3, 15, 17],
                [4, 15, 17],
                [5, 16, 16],
                [6, 16, 16],
                [7, 16, 16]
            ], spec.accent, mapPoint);
            drawPoints([
                { x: 16, y: 1 },
                { x: 15, y: 3 }
            ], spec.highlight);
            drawPoints([{ x: 17, y: 4 }], spec.shadow);
            break;
        case 'trident':
            [
                [{ x: 13, y: 3 }, { x: 14, y: 7 }],
                [{ x: 16, y: 1 }, { x: 16, y: 8 }],
                [{ x: 19, y: 3 }, { x: 18, y: 7 }]
            ].forEach(([start, end]) => {
                drawLine(start, end, 'X', 2);
                drawLine(start, end, spec.accent);
            });
            drawLine({ x: 14, y: 7 }, { x: 18, y: 7 }, 'X', 2);
            drawLine({ x: 14, y: 7 }, { x: 18, y: 7 }, spec.primary);
            drawPoints([
                { x: 13, y: 2 },
                { x: 16, y: 1 },
                { x: 19, y: 2 }
            ], spec.highlight);
            break;
        case 'pitchfork':
            [
                [{ x: 13, y: 3 }, { x: 13, y: 7 }],
                [{ x: 15, y: 2 }, { x: 15, y: 7 }],
                [{ x: 17, y: 2 }, { x: 17, y: 7 }],
                [{ x: 19, y: 3 }, { x: 19, y: 7 }]
            ].forEach(([start, end]) => {
                drawLine(start, end, spec.primary);
            });
            drawLine({ x: 13, y: 7 }, { x: 19, y: 7 }, spec.primary, 2);
            drawPoints([
                { x: 13, y: 2 },
                { x: 15, y: 1 },
                { x: 17, y: 1 },
                { x: 19, y: 2 }
            ], spec.highlight);
            break;
        case 'staff': {
            const center = mapPoint({ x: 16, y: 5 });
            const outerRadius = Math.max(2, Math.round(4 * scale));
            const innerRadius = Math.max(1, outerRadius - 1);

            painter.ellipse(
                center.x,
                center.y,
                outerRadius,
                outerRadius,
                'X'
            );
            painter.ellipse(
                center.x,
                center.y,
                innerRadius,
                innerRadius,
                spec.accent
            );
            painter.ellipse(center.x, center.y, 1, 1, spec.highlight);
            painter.set(center.x, center.y, 'W');
            drawPoints([
                { x: 16, y: 1 },
                { x: 12, y: 5 },
                { x: 20, y: 5 },
                { x: 16, y: 9 }
            ], spec.shadow);
            drawPoints([
                { x: 17, y: 12 },
                { x: 17, y: 18 },
                { x: 17, y: 24 }
            ], spec.highlight);
            break;
        }
        default:
            break;
    }

}

function paintFrontPoleWeaponBlueprint(
    painter,
    spec,
    blueprint,
    targetGrip,
    scale
) {
    paintFrontCenteredWeaponBlueprint(
        painter,
        spec,
        blueprint,
        targetGrip,
        scale
    );
}

function makeCenteredFrontWeaponSprite(spec, blueprint) {
    return createNativeOverhaulSprite(painter => {
        paintFrontCenteredWeaponBlueprint(
            painter,
            spec,
            blueprint,
            blueprint.grip,
            1
        );
    });
}

function projectCenteredWeaponPointForFront(
    point,
    blueprint,
    targetGrip = FRONT_WEAPON_PAPERDOLL_PIVOT
) {
    const scale = blueprint.scale || 1;
    const radians = (
        (blueprint.tiltDegrees || 0)
        * Math.PI
        / 180
    );
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const scaledX = (point.x - blueprint.grip.x) * scale;
    const scaledY = (point.y - blueprint.grip.y) * scale;

    return {
        x: Math.round(
            targetGrip.x
            + (scaledX * cos)
            - (scaledY * sin)
        ),
        y: Math.round(
            targetGrip.y
            + (scaledX * sin)
            + (scaledY * cos)
        )
    };
}

function transformCenteredWeaponMatrixForFront(
    matrix,
    blueprint,
    targetGrip = FRONT_WEAPON_PAPERDOLL_PIVOT
) {
    if (!matrix || !blueprint) return matrix;

    const scale = blueprint.scale || 1;
    const shaftX = blueprint.shaft.start.x;
    const shaftMinY = Math.min(
        blueprint.shaft.start.y,
        blueprint.shaft.end.y
    );
    const shaftMaxY = Math.max(
        blueprint.shaft.start.y,
        blueprint.shaft.end.y
    );
    const shaftMaterial =
        matrix[blueprint.grip.y][blueprint.grip.x];
    const projectedShaftStart = projectCenteredWeaponPointForFront(
        blueprint.shaft.start,
        blueprint,
        targetGrip
    );
    const projectedShaftEnd = projectCenteredWeaponPointForFront(
        blueprint.shaft.end,
        blueprint,
        targetGrip
    );
    const buckets = Array.from(
        { length: CORE_PLAYER_SAMPLE_SIZE },
        () => Array.from(
            { length: CORE_PLAYER_SAMPLE_SIZE },
            () => []
        )
    );

    matrix.forEach((row, sourceY) => {
        row.forEach((key, sourceX) => {
            if (!key || key === '.') return;
            if (
                sourceY >= shaftMinY
                && sourceY <= shaftMaxY
                && Math.abs(sourceX - shaftX) <= 1
            ) {
                return;
            }
            const target = projectCenteredWeaponPointForFront(
                { x: sourceX, y: sourceY },
                blueprint,
                targetGrip
            );
            const { x: targetX, y: targetY } = target;

            if (
                targetX < 0
                || targetX >= CORE_PLAYER_SAMPLE_SIZE
                || targetY < 0
                || targetY >= CORE_PLAYER_SAMPLE_SIZE
            ) {
                return;
            }

            buckets[targetY][targetX].push({ sourceX, sourceY, key });
        });
    });

    return createNativeOverhaulSprite(painter => {
        painter.line(
            projectedShaftStart.x,
            projectedShaftStart.y,
            projectedShaftEnd.x,
            projectedShaftEnd.y,
            'X',
            Math.max(1, Math.round(3 * scale))
        );
        painter.line(
            projectedShaftStart.x,
            projectedShaftStart.y,
            projectedShaftEnd.x,
            projectedShaftEnd.y,
            shaftMaterial
        );

        buckets.forEach((row, targetY) => {
            row.forEach((candidates, targetX) => {
                if (!candidates.length) return;

                const coloredCandidates = candidates.filter(
                    candidate => candidate.key !== 'X'
                );
                const pool = coloredCandidates.length
                    ? coloredCandidates
                    : candidates;
                const radians = (
                    (blueprint.tiltDegrees || 0)
                    * Math.PI
                    / 180
                );
                const cos = Math.cos(radians);
                const sin = Math.sin(radians);
                const targetOffsetX = targetX - targetGrip.x;
                const targetOffsetY = targetY - targetGrip.y;
                const idealSourceX = blueprint.grip.x + (
                    (
                        (targetOffsetX * cos)
                        + (targetOffsetY * sin)
                    )
                    / scale
                );
                const idealSourceY = blueprint.grip.y + (
                    (
                        (-targetOffsetX * sin)
                        + (targetOffsetY * cos)
                    )
                    / scale
                );
                const closest = pool.reduce((best, candidate) => {
                    const candidateDistance = (
                        (candidate.sourceX - idealSourceX) ** 2
                        + (candidate.sourceY - idealSourceY) ** 2
                    );
                    const bestDistance = (
                        (best.sourceX - idealSourceX) ** 2
                        + (best.sourceY - idealSourceY) ** 2
                    );
                    return candidateDistance < bestDistance
                        ? candidate
                        : best;
                });

                painter.set(targetX, targetY, closest.key);
            });
        });

        painter.set(targetGrip.x, targetGrip.y - 1, '.');
        painter.set(targetGrip.x, targetGrip.y, '.');
    });
}

function makeAnchoredFrontWeaponSprite(spec, blueprint) {
    return transformCenteredWeaponMatrixForFront(
        makeCenteredFrontWeaponSprite(spec, blueprint),
        blueprint,
        FRONT_WEAPON_PAPERDOLL_PIVOT
    );
}

function makeCenteredFrontPoleWeaponSprite(spec, blueprint) {
    return makeCenteredFrontWeaponSprite(spec, blueprint);
}

function makeAnchoredFrontPoleWeaponSprite(spec, blueprint) {
    return makeAnchoredFrontWeaponSprite(spec, blueprint);
}

function resizeFrontWeaponOverhaulSprite(matrix, specOrStyle) {
    const spec = typeof specOrStyle === 'string'
        ? null
        : specOrStyle;
    const style = spec ? spec.style : specOrStyle;
    const centeredBlueprint = FRONT_CENTERED_WEAPON_BLUEPRINTS[style];
    if (spec && centeredBlueprint) {
        return makeAnchoredFrontWeaponSprite(spec, centeredBlueprint);
    }
    const scale = FRONT_WEAPON_SCALE_BY_STYLE[style] || 1;
    if (!matrix || scale === 1) return matrix;
    const offset = FRONT_WEAPON_OFFSET_BY_STYLE[style] || { x: 0, y: 0 };

    const buckets = Array.from(
        { length: CORE_PLAYER_SAMPLE_SIZE },
        () => Array.from(
            { length: CORE_PLAYER_SAMPLE_SIZE },
            () => []
        )
    );

    for (let sourceY = 0; sourceY < CORE_PLAYER_SAMPLE_SIZE; sourceY += 1) {
        for (let sourceX = 0; sourceX < CORE_PLAYER_SAMPLE_SIZE; sourceX += 1) {
            const key = matrix[sourceY]?.[sourceX];
            if (!key || key === '.') continue;
            if (FRONT_WEAPON_FULL_REBUILD_STYLES.has(style)) continue;
            const customHeadMaxY = FRONT_WEAPON_CUSTOM_HEAD_MAX_SOURCE_Y[style];
            if (customHeadMaxY !== undefined && sourceY <= customHeadMaxY) {
                continue;
            }

            let targetX = Math.round(
                FRONT_WEAPON_HAND_ANCHOR.x
                + ((sourceX - FRONT_WEAPON_HAND_ANCHOR.x) * scale)
            ) + offset.x;
            const targetY = Math.round(
                FRONT_WEAPON_HAND_ANCHOR.y
                + ((sourceY - FRONT_WEAPON_HAND_ANCHOR.y) * scale)
            ) + offset.y;
            const upperLean = FRONT_WEAPON_UPPER_LEAN_BY_STYLE[style] || 0;
            if (upperLean && sourceY < FRONT_WEAPON_HAND_ANCHOR.y) {
                const progress = Math.min(
                    1,
                    (FRONT_WEAPON_HAND_ANCHOR.y - sourceY) / 17
                );
                targetX += Math.round(upperLean * progress);
            }
            if (
                targetX < 0
                || targetX >= CORE_PLAYER_SAMPLE_SIZE
                || targetY < 0
                || targetY >= CORE_PLAYER_SAMPLE_SIZE
            ) {
                continue;
            }
            buckets[targetY][targetX].push({ sourceX, sourceY, key });
        }
    }

    const rows = buckets.map((row, targetY) => row.map((candidates, targetX) => {
        if (!candidates.length) return '.';

        const coloredCandidates = candidates.filter(({ key }) => key !== 'X');
        const pool = coloredCandidates.length ? coloredCandidates : candidates;
        const idealSourceX = FRONT_WEAPON_HAND_ANCHOR.x
            + ((targetX - FRONT_WEAPON_HAND_ANCHOR.x) / scale);
        const idealSourceY = FRONT_WEAPON_HAND_ANCHOR.y
            + ((targetY - FRONT_WEAPON_HAND_ANCHOR.y) / scale);

        return pool.reduce((closest, candidate) => {
            const candidateDistance = (
                (candidate.sourceX - idealSourceX) ** 2
                + (candidate.sourceY - idealSourceY) ** 2
            );
            const closestDistance = (
                (closest.sourceX - idealSourceX) ** 2
                + (closest.sourceY - idealSourceY) ** 2
            );
            return candidateDistance < closestDistance
                ? candidate
                : closest;
        }).key;
    }));

    return createNativeOverhaulSprite(painter => {
        rows.forEach((row, y) => {
            row.forEach((key, x) => {
                if (key !== '.') painter.set(x, y, key);
            });
        });

        const shaft = FRONT_WEAPON_SHAFT_BY_STYLE[style];
        if (shaft && spec) {
            painter.line(
                shaft.start[0] + offset.x,
                shaft.start[1] + offset.y,
                shaft.end[0] + offset.x,
                shaft.end[1] + offset.y,
                'X',
                3
            );
            painter.line(
                shaft.start[0] + offset.x,
                shaft.start[1] + offset.y,
                shaft.end[0] + offset.x,
                shaft.end[1] + offset.y,
                spec[shaft.material]
            );
        }

        if (style === 'bow' && spec) {
            painter.line(
                24 + offset.x,
                8 + offset.y,
                24 + offset.x,
                27 + offset.y,
                spec.accent
            );
            painter.line(24, 19, 24, 23, spec.primary);
            painter.line(25, 19, 25, 23, spec.shadow);
        }

        if (spec) paintCompactFrontWeaponHead(painter, style, spec);
    });
}

const EquipmentOverhaulMatrices = {};
const EquipmentOverhaulWeaponSourceMatrices = {};
const EquipmentOverhaulCenteredWeaponMatrices = {};
const EquipmentOverhaulFrontWeaponMatrices = {};
const FrontPaperdollWeaponMatrixCache = new Map();
const FrontPaperdollWeaponBitmapCache = new Map();

function getFrontPaperdollWeaponMatrix(spriteId) {
    if (!spriteId) return null;

    const canonical = (
        typeof SpriteMatrices !== 'undefined'
        && SpriteMatrices[spriteId]
    )
        || EquipmentOverhaulMatrices[spriteId]
        || null;
    const spec = EquipmentOverhaulSpecs.weapon[spriteId];
    const blueprint = spec
        ? FRONT_CENTERED_WEAPON_BLUEPRINTS[spec.style]
        : null;

    if (!canonical || !blueprint) {
        return EquipmentOverhaulFrontWeaponMatrices[spriteId] || canonical;
    }

    const cached = FrontPaperdollWeaponMatrixCache.get(spriteId);
    if (cached && cached.source === canonical) return cached.matrix;

    const matrix = transformCenteredWeaponMatrixForFront(
        canonical,
        blueprint,
        FRONT_WEAPON_PAPERDOLL_PIVOT
    );
    FrontPaperdollWeaponMatrixCache.set(spriteId, {
        source: canonical,
        matrix
    });
    return matrix;
}

function getFrontPaperdollWeaponBitmap(
    spriteId,
    matrix,
    renderSize = CORE_PLAYER_SAMPLE_SIZE,
    appearanceOverride = null
) {
    if (typeof document === 'undefined') return null;

    const bitmapSize = Math.max(
        CORE_PLAYER_SAMPLE_SIZE,
        Math.round(renderSize)
    );
    const appearance = (
        appearanceOverride
        && typeof appearanceOverride === 'object'
    )
        ? appearanceOverride
        : (
            typeof player !== 'undefined'
            && player.appearance
                ? player.appearance
                : {}
        );
    const dynamicPalette = (
        typeof createProceduralDynamicPalette === 'function'
    )
        ? createProceduralDynamicPalette(appearance)
        : {};
    const usedKeys = Array.from(new Set(matrix.flat()))
        .filter(key => key && key !== '.' && key !== '_')
        .sort();
    const paletteSignature = usedKeys
        .map(key => {
            const color = Object.prototype.hasOwnProperty.call(
                dynamicPalette,
                key
            )
                ? dynamicPalette[key]
                : PALETTE[key];
            return `${key}:${color || ''}`;
        })
        .join('|');
    const cacheKey = `${spriteId}:${bitmapSize}:${paletteSignature}`;
    const cached = FrontPaperdollWeaponBitmapCache.get(cacheKey);

    if (
        cached
        && cached.source === matrix
        && cached.paletteSignature === paletteSignature
    ) {
        return cached.canvas;
    }

    const canvas = document.createElement('canvas');
    canvas.width = bitmapSize;
    canvas.height = bitmapSize;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return null;

    context.imageSmoothingEnabled = false;
    matrix.forEach((row, y) => {
        row.forEach((key, x) => {
            const color = Object.prototype.hasOwnProperty.call(
                dynamicPalette,
                key
            )
                ? dynamicPalette[key]
                : PALETTE[key];

            if (
                !color
                || color === 'transparent'
                || color === 'ERASE'
            ) {
                return;
            }

            const left = Math.round(
                (x * bitmapSize)
                / CORE_PLAYER_SAMPLE_SIZE
            );
            const top = Math.round(
                (y * bitmapSize)
                / CORE_PLAYER_SAMPLE_SIZE
            );
            const right = Math.round(
                ((x + 1) * bitmapSize)
                / CORE_PLAYER_SAMPLE_SIZE
            );
            const bottom = Math.round(
                ((y + 1) * bitmapSize)
                / CORE_PLAYER_SAMPLE_SIZE
            );
            context.fillStyle = color;
            context.fillRect(
                left,
                top,
                right - left,
                bottom - top
            );
        });
    });

    FrontPaperdollWeaponBitmapCache.set(cacheKey, {
        source: matrix,
        paletteSignature,
        canvas
    });
    return canvas;
}

function drawFrontPaperdollWeapon(
    context,
    spriteId,
    startX,
    startY,
    size,
    options = {}
) {
    if (!context || !spriteId || !size) return false;

    const scaleMultiplier = Number.isFinite(options.scaleMultiplier)
        ? options.scaleMultiplier
        : 1;
    const canonical = (
        typeof SpriteMatrices !== 'undefined'
        && SpriteMatrices[spriteId]
    )
        || EquipmentOverhaulMatrices[spriteId]
        || null;
    const spec = EquipmentOverhaulSpecs.weapon[spriteId];
    const blueprint = spec
        ? FRONT_CENTERED_WEAPON_BLUEPRINTS[spec.style]
        : null;

    if (!canonical || !blueprint) {
        const fallback = getFrontPaperdollWeaponMatrix(spriteId);
        if (
            !fallback
            || typeof drawProceduralSprite !== 'function'
        ) {
            return false;
        }

        context.save();
        if (scaleMultiplier !== 1) {
            const cellSize = size / CORE_PLAYER_SAMPLE_SIZE;
            const targetGrip = options.targetGrip
                || FRONT_WEAPON_PAPERDOLL_PIVOT;
            const targetX = startX + (
                (targetGrip.x + 0.5)
                * cellSize
            );
            const targetY = startY + (
                (targetGrip.y + 0.5)
                * cellSize
            );
            context.translate(targetX, targetY);
            context.scale(scaleMultiplier, scaleMultiplier);
            context.translate(-targetX, -targetY);
        }
        drawProceduralSprite(
            context,
            fallback,
            startX,
            startY,
            size,
            options.appearance || null
        );
        context.restore();
        return true;
    }

    const bitmap = getFrontPaperdollWeaponBitmap(
        spriteId,
        canonical,
        size,
        options.appearance || null
    );
    if (!bitmap) return false;

    const cellSize = size / CORE_PLAYER_SAMPLE_SIZE;
    const targetGrip = options.targetGrip
        || FRONT_WEAPON_PAPERDOLL_PIVOT;
    const renderScale = (
        (blueprint.scale || 1)
        * scaleMultiplier
    );
    const targetX = startX + (
        (targetGrip.x + 0.5)
        * cellSize
    );
    const targetY = startY + (
        (targetGrip.y + 0.5)
        * cellSize
    );
    const bitmapCellSize = bitmap.width
        / CORE_PLAYER_SAMPLE_SIZE;
    const sourceX = (
        (blueprint.grip.x + 0.5)
        * bitmapCellSize
    );
    const sourceY = (
        (blueprint.grip.y + 0.5)
        * bitmapCellSize
    );
    const bitmapToCanvasScale = size / bitmap.width;
    const radians = (
        (blueprint.tiltDegrees || 0)
        * Math.PI
        / 180
    );

    context.save();
    context.imageSmoothingEnabled = false;

    context.beginPath();
    context.rect(startX, startY, size, size);
    if (
        options.revealHand !== false
        && blueprint.head !== 'knuckles'
    ) {
        context.rect(
            startX + (targetGrip.x * cellSize),
            startY + ((targetGrip.y - 1) * cellSize),
            cellSize,
            cellSize * 2
        );
    }
    context.clip('evenodd');

    context.translate(targetX, targetY);
    context.rotate(radians);
    context.scale(
        bitmapToCanvasScale * renderScale,
        bitmapToCanvasScale * renderScale
    );
    context.translate(-sourceX, -sourceY);
    context.drawImage(bitmap, 0, 0);
    context.restore();
    return true;
}

Object.entries(EquipmentOverhaulSpecs.armor).forEach(([spriteId, spec]) => {
    const male = makeArmorOverhaulSprite(spec, 'male');
    const female = makeArmorOverhaulSprite(spec, 'female');
    EquipmentOverhaulMatrices[spriteId] = male;
    EquipmentOverhaulMatrices[`${spriteId}_male`] = male;
    EquipmentOverhaulMatrices[`${spriteId}_female`] = female;
});

Object.entries(EquipmentOverhaulSpecs.helmet).forEach(([spriteId, spec]) => {
    EquipmentOverhaulMatrices[spriteId] = makeHelmetOverhaulSprite(spec);
});

Object.entries(EquipmentOverhaulSpecs.gloves).forEach(([spriteId, spec]) => {
    EquipmentOverhaulMatrices[spriteId] = makeGlovesOverhaulSprite(spec);
});

Object.entries(EquipmentOverhaulSpecs.boots).forEach(([spriteId, spec]) => {
    EquipmentOverhaulMatrices[spriteId] = makeBootsOverhaulSprite(spec);
});

Object.entries(EquipmentOverhaulSpecs.offhand).forEach(([spriteId, spec]) => {
    EquipmentOverhaulMatrices[spriteId] = makeOffhandOverhaulSprite(spec);
});

Object.entries(EquipmentOverhaulSpecs.weapon).forEach(([spriteId, spec]) => {
    const source = makeWeaponOverhaulSprite(spec);
    const centeredBlueprint = FRONT_CENTERED_WEAPON_BLUEPRINTS[spec.style];
    const centered = centeredBlueprint
        ? makeCenteredFrontWeaponSprite(spec, centeredBlueprint)
        : null;
    const front = centered
        ? transformCenteredWeaponMatrixForFront(
            centered,
            centeredBlueprint,
            FRONT_WEAPON_PAPERDOLL_PIVOT
        )
        : resizeFrontWeaponOverhaulSprite(source, spec);

    EquipmentOverhaulWeaponSourceMatrices[spriteId] = source;
    if (centered) {
        EquipmentOverhaulCenteredWeaponMatrices[spriteId] = centered;
        FrontPaperdollWeaponMatrixCache.set(spriteId, {
            source: centered,
            matrix: front
        });
    }
    EquipmentOverhaulFrontWeaponMatrices[spriteId] = front;
    EquipmentOverhaulMatrices[spriteId] = centered || front;
});

Object.assign(SpriteMatrices, EquipmentOverhaulMatrices);

if (typeof ItemDatabase !== 'undefined') {
    Object.values(ItemDatabase).forEach(item => {
        const helmetSpec = EquipmentOverhaulSpecs.helmet[item.spriteId];
        if (helmetSpec && helmetSpec.hidesHair) item.hidesHair = true;
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EquipmentOverhaulSpecs,
        WeaponAnimationContracts,
        ArmorDesignProfiles,
        GloveDesignProfiles,
        BootDesignProfiles,
        EquipmentOverhaulMatrices,
        EquipmentOverhaulWeaponSourceMatrices,
        EquipmentOverhaulCenteredWeaponMatrices,
        EquipmentOverhaulFrontWeaponMatrices,
        FRONT_WEAPON_HAND_ANCHOR,
        FRONT_WEAPON_PAPERDOLL_PIVOT,
        FRONT_WEAPON_SCALE_BY_STYLE,
        FRONT_WEAPON_TILT_BY_STYLE,
        FRONT_WEAPON_OFFSET_BY_STYLE,
        FRONT_WEAPON_UPPER_LEAN_BY_STYLE,
        FRONT_WEAPON_CUSTOM_HEAD_MAX_SOURCE_Y,
        FRONT_WEAPON_FULL_REBUILD_STYLES,
        FRONT_POLE_WEAPON_BLUEPRINTS,
        FRONT_HANDHELD_WEAPON_BLUEPRINTS,
        FRONT_SPECIAL_WEAPON_BLUEPRINTS,
        FRONT_CENTERED_WEAPON_BLUEPRINTS,
        FRONT_WEAPON_SHAFT_BY_STYLE,
        HelmetHairMaskProfiles,
        paintHelmetHairMask,
        paintFrontArmorDefinitiveSilhouette,
        makeArmorOverhaulSprite,
        makeHelmetOverhaulSprite,
        makeGlovesOverhaulSprite,
        makeBootsOverhaulSprite,
        makeOffhandOverhaulSprite,
        makeWeaponOverhaulSprite,
        paintCompactFrontWeaponHead,
        paintMappedFrontWeaponShape,
        paintFrontCenteredWeaponBlueprint,
        paintFrontPoleWeaponBlueprint,
        makeCenteredFrontWeaponSprite,
        makeAnchoredFrontWeaponSprite,
        projectCenteredWeaponPointForFront,
        transformCenteredWeaponMatrixForFront,
        makeCenteredFrontPoleWeaponSprite,
        makeAnchoredFrontPoleWeaponSprite,
        getFrontPaperdollWeaponMatrix,
        getFrontPaperdollWeaponBitmap,
        drawFrontPaperdollWeapon,
        resizeFrontWeaponOverhaulSprite
    };
}
