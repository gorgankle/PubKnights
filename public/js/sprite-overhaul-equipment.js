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
        }
    },

    helmet: {
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
            hidesHair: true
        },
        wilderness_cloak: {
            style: 'hood',
            primary: 'q',
            shadow: '1',
            highlight: 'e',
            accent: 'l',
            hidesHair: true
        },
        primate_armor: {
            style: 'skull',
            primary: 'b',
            shadow: 'a',
            highlight: 'W',
            accent: 'G',
            hidesHair: true
        },
        helm_pubserker: {
            style: 'flatcap',
            primary: 'l',
            shadow: 'd',
            highlight: 'c',
            accent: 'N'
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
            accent: 'h'
        },
        beanie_hat: {
            style: 'beanie',
            primary: 'w',
            shadow: '0',
            highlight: 'R',
            accent: 'b'
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
            accent: '^'
        },
        abyssal_lantern: {
            style: 'lantern',
            primary: 'J',
            shadow: '0',
            highlight: 'N',
            accent: '^',
            hidesHair: true
        },
        straw_hat: {
            style: 'strawhat',
            primary: ':',
            shadow: 'd',
            highlight: 'Y',
            accent: 'R'
        },
        burlap_sack_mask: {
            style: 'sack',
            primary: 'c',
            shadow: 'd',
            highlight: 'b',
            accent: '0',
            hidesHair: true
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
        weap_behemoth_maw: { style: 'greatclub', primary: 'd', shadow: '0', highlight: 'c', accent: 'I' },
        weap_machete: { style: 'machete', primary: 'I', shadow: 'J', highlight: 's', accent: 'l' },
        weap_spear: { style: 'spear', primary: 'c', shadow: 'd', highlight: 's', accent: 'I' },
        weap_mimic_dagger: { style: 'dagger', primary: 'b', shadow: 'd', highlight: 'W', accent: 'R' },
        brewmasters_club: { style: 'greatclub', primary: 'c', shadow: 'd', highlight: 'N', accent: 'h' },
        silverback_greatclub: { style: 'greatclub', primary: 'G', shadow: '0', highlight: 'a', accent: 'b' },
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
    }
};

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
            line(centerX - 1, 14, centerX - 1, 20, spec.shadow);
            points([[centerX + 1, 15], [centerX + 1, 17], [centerX + 1, 19]], spec.accent);
            break;
        case 'cask':
        case 'barrel':
            line(torsoX + 3, 14, torsoX + 3, 21, spec.shadow);
            line(torsoX + torsoWidth - 4, 14, torsoX + torsoWidth - 4, 21, spec.shadow);
            rect(torsoX, 15, torsoWidth, 1, spec.highlight);
            rect(torsoX, 20, torsoWidth, 1, spec.highlight);
            set(centerX, 18, spec.accent);
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
        const coatLength = ['blackout', 'slicker', 'diving'].includes(spec.style) ? 12 : 9;
        const bounds = { torsoX, torsoWidth, leftArmX, rightArmX };

        paintOutlinedOverhaulShape(painter, [
            [14, 7, 10],
            [15, 7, 10],
            [16, 7, 10],
            [17, 7, 10],
            [18, 7, 9]
        ], spec.primary);
        paintOutlinedOverhaulShape(painter, [
            [14, 21, 24],
            [15, 21, 24],
            [16, 21, 24],
            [17, 21, 24],
            [18, 22, 24]
        ], spec.primary);

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

        paintOutlinedOverhaulShape(painter, torsoSpans, spec.primary);
        points(female
            ? [[10, 14], [10, 15], [21, 14], [21, 15]]
            : [[9, 14], [9, 15], [22, 14], [22, 15]], spec.primary);
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

        drawArmorOverhaulDetails(painter, spec, gender, bounds);
    });
}

function makeHelmetOverhaulSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;

        switch (spec.style) {
            case 'collar':
                rect(10, 11, 13, 4, spec.primary);
                frame(10, 11, 13, 4, 'X');
                points([[11, 10], [14, 10], [18, 10], [21, 10]], spec.highlight);
                points([[11, 14], [21, 14]], spec.accent);
                break;
            case 'coif':
            case 'hood':
                ellipse(16, 7, 8, 7, spec.shadow);
                ellipse(16, 7, 7, 6, spec.primary);
                rect(11, 5, 11, 7, '.');
                line(10, 4, 9, 12, 'X');
                line(22, 4, 23, 12, 'X');
                line(10, 12, 13, 14, spec.highlight);
                line(22, 12, 19, 14, spec.highlight);
                if (spec.style === 'coif') {
                    points([[10, 6], [22, 6], [9, 9], [23, 9], [12, 3], [20, 3]], spec.highlight);
                } else {
                    line(10, 3, 16, 1, spec.highlight);
                    line(16, 1, 22, 3, spec.highlight);
                }
                break;
            case 'skull':
                ellipse(16, 6, 8, 6, spec.primary);
                rect(10, 7, 13, 4, spec.primary);
                points([[12, 7], [20, 7]], spec.accent);
                rect(14, 10, 5, 3, spec.shadow);
                points([[14, 13], [16, 13], [18, 13]], spec.highlight);
                line(9, 4, 7, 1, spec.accent);
                line(23, 4, 25, 1, spec.accent);
                break;
            case 'flatcap':
                rect(9, 2, 14, 4, spec.primary);
                frame(9, 2, 14, 4, 'X');
                rect(8, 5, 17, 2, spec.shadow);
                rect(19, 6, 7, 1, spec.highlight);
                set(12, 3, spec.accent);
                break;
            case 'visor':
                line(9, 5, 23, 5, spec.highlight, 2);
                rect(9, 6, 14, 4, spec.primary);
                frame(9, 6, 14, 4, 'X');
                rect(11, 7, 10, 2, spec.accent);
                line(12, 7, 20, 7, spec.highlight);
                break;
            case 'tankard':
                rect(9, 2, 14, 10, spec.primary);
                frame(9, 2, 14, 10, 'X');
                rect(9, 4, 14, 2, spec.highlight);
                rect(11, 7, 10, 3, '.');
                rect(11, 7, 10, 1, spec.accent);
                line(16, 2, 16, 11, spec.shadow);
                break;
            case 'blinders':
                rect(9, 6, 14, 4, spec.primary);
                frame(9, 6, 14, 4, 'X');
                rect(11, 7, 4, 1, spec.highlight);
                rect(18, 7, 3, 1, spec.highlight);
                line(9, 6, 7, 3, spec.accent);
                line(23, 6, 25, 3, spec.accent);
                break;
            case 'widehat':
            case 'strawhat':
                rect(8, 3, 16, 4, spec.primary);
                frame(8, 3, 16, 4, 'X');
                rect(5, 7, 22, 3, spec.primary);
                frame(5, 7, 22, 3, 'X');
                rect(9, 6, 14, 1, spec.shadow);
                rect(12, 4, 8, 1, spec.highlight);
                if (spec.style === 'widehat') points([[7, 6], [25, 6], [26, 5]], spec.accent);
                else rect(13, 6, 6, 1, spec.accent);
                break;
            case 'beanie':
                ellipse(16, 5, 7, 5, spec.primary);
                rect(9, 6, 15, 3, spec.primary);
                frame(9, 6, 15, 3, 'X');
                rect(11, 7, 11, 1, spec.highlight);
                ellipse(16, 0, 2, 1, spec.accent);
                break;
            case 'crown':
                rect(10, 5, 13, 4, spec.primary);
                frame(10, 5, 13, 4, 'X');
                points([[10, 3], [13, 1], [16, 3], [19, 1], [22, 3]], spec.highlight);
                line(10, 3, 10, 6, spec.primary);
                line(13, 1, 13, 6, spec.primary);
                line(16, 3, 16, 6, spec.primary);
                line(19, 1, 19, 6, spec.primary);
                line(22, 3, 22, 6, spec.primary);
                points([[13, 5], [19, 5]], spec.accent);
                break;
            case 'bucket':
                rect(9, 2, 14, 6, spec.primary);
                frame(9, 2, 14, 6, 'X');
                rect(7, 7, 18, 3, spec.primary);
                frame(7, 7, 18, 3, 'X');
                line(11, 3, 21, 6, spec.highlight);
                set(21, 4, spec.accent);
                break;
            case 'lantern':
                rect(9, 2, 14, 10, spec.primary);
                frame(9, 2, 14, 10, 'X');
                rect(11, 5, 10, 5, spec.accent);
                frame(11, 5, 10, 5, spec.highlight);
                set(16, 7, 'W');
                line(16, 2, 16, 0, spec.highlight, 2);
                set(16, 0, spec.accent);
                break;
            case 'sack':
                rect(9, 1, 14, 13, spec.primary);
                frame(9, 1, 14, 13, 'X');
                line(11, 2, 20, 12, spec.highlight);
                rect(11, 7, 4, 2, '.');
                rect(18, 7, 3, 2, '.');
                points([[12, 8], [14, 7], [19, 8], [20, 7]], spec.accent);
                rect(12, 13, 9, 2, spec.shadow);
                break;
            default:
                break;
        }
    });
}

function makeGlovesOverhaulSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, line, points } = painter;
        const hands = [
            { x: 6, cuffX: 7, outerX: 6 },
            { x: 22, cuffX: 22, outerX: 25 }
        ];

        paintOutlinedOverhaulShape(painter, [
            [17, 7, 9],
            [18, 6, 9],
            [19, 6, 9],
            [20, 6, 9],
            [21, 6, 9],
            [22, 6, 9]
        ], spec.primary);
        paintOutlinedOverhaulShape(painter, [
            [17, 22, 24],
            [18, 22, 25],
            [19, 22, 25],
            [20, 22, 25],
            [21, 22, 25],
            [22, 22, 25]
        ], spec.primary);

        hands.forEach(({ x, cuffX, outerX }, index) => {
            points([
                [index ? x + 1 : x + 2, 19],
                [index ? x + 1 : x + 2, 20]
            ], spec.highlight);
            set(outerX, 21, spec.shadow);

            if (spec.style === 'wraps') {
                rect(x, 19, 4, 1, spec.accent);
                rect(x, 21, 4, 1, spec.shadow);
                rect(cuffX, 17, 3, 1, spec.accent);
            } else if (spec.style === 'gauntlets') {
                rect(x, 19, 4, 1, spec.highlight);
                points([[cuffX, 16], [cuffX + 2, 16]], spec.accent);
            } else if (spec.style === 'shards') {
                points([[cuffX, 15], [cuffX + 1, 16], [cuffX + 2, 15]], spec.highlight);
                set(index ? x + 1 : x + 2, 21, spec.accent);
            } else if (spec.style === 'bark') {
                line(x, 18, x + 3, 21, spec.highlight);
                set(index ? x : x + 3, 17, spec.accent);
            } else if (spec.style === 'barnacle') {
                points([[cuffX, 16], [cuffX + 1, 15], [cuffX + 2, 16]], spec.accent);
                set(index ? x + 1 : x + 2, 20, spec.highlight);
            } else if (spec.style === 'grips') {
                rect(x, 20, 4, 1, spec.accent);
            } else if (spec.style === 'work') {
                rect(x, 21, 4, 1, spec.accent);
            }
        });
    });
}

function makeBootsOverhaulSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, line, points } = painter;
        const boots = [
            { x: 9, upperX: 10 },
            { x: 16, upperX: 17 }
        ];

        if (spec.style === 'waders') {
            paintOutlinedOverhaulShape(painter, [
                [23, 10, 14],
                [24, 10, 14],
                [25, 10, 14],
                [26, 10, 14],
                [27, 9, 14],
                [28, 9, 14],
                [29, 9, 14],
                [30, 9, 14],
                [31, 9, 15]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [23, 17, 21],
                [24, 17, 21],
                [25, 17, 21],
                [26, 17, 21],
                [27, 17, 22],
                [28, 17, 22],
                [29, 17, 22],
                [30, 17, 22],
                [31, 16, 22]
            ], spec.primary);
            rect(10, 24, 5, 1, spec.accent);
            rect(17, 24, 5, 1, spec.accent);
        } else {
            paintOutlinedOverhaulShape(painter, [
                [29, 9, 14],
                [30, 9, 14],
                [31, 9, 15]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [29, 17, 22],
                [30, 17, 22],
                [31, 16, 22]
            ], spec.primary);
        }

        boots.forEach(({ x, upperX }, index) => {
            rect(upperX, 29, 4, 1, spec.highlight);
            rect(index ? x + 3 : x, 31, 4, 1, spec.shadow);

            if (spec.style === 'cleats' || spec.style === 'sabatons') {
                points([[upperX, 28], [upperX + 2, 28], [upperX + 4, 28]], spec.accent);
            } else if (spec.style === 'leaf') {
                points([[upperX, 28], [upperX + 2, 27], [upperX + 4, 28]], spec.accent);
                line(x + 1, 29, x + 5, 30, spec.highlight);
            } else if (spec.style === 'stumps') {
                line(x + 1, 29, x + 1, 31, spec.shadow);
                line(x + 4, 29, x + 4, 31, spec.highlight);
                set(x + (index ? 4 : 2), 28, spec.accent);
            } else if (spec.style === 'coral') {
                points([[upperX, 27], [upperX + 2, 28], [upperX + 4, 27]], spec.accent);
            } else if (spec.style === 'muddy') {
                rect(x, 30, 7, 2, spec.accent);
            } else if (spec.style === 'stagger') {
                line(x + 1, 29, x + 5, 31, spec.highlight);
                set(x + 3, 28, spec.accent);
            } else if (spec.style === 'striders') {
                rect(upperX, 29, 2, 2, spec.accent);
            } else if (spec.style === 'stompers') {
                rect(x, 30, 7, 1, spec.accent);
            }
        });
    });
}

function drawWeaponBlade(painter, spec, start, end, thickness = 3) {
    painter.line(start.x, start.y, end.x, end.y, 'X', thickness + 2);
    painter.line(start.x, start.y, end.x, end.y, spec.primary, thickness);
    painter.line(start.x + 1, start.y, end.x + 1, end.y, spec.highlight);
}

function makeWeaponOverhaulSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;
        const hand = { x: 24, y: 21 };

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

const EquipmentOverhaulMatrices = {};

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

Object.entries(EquipmentOverhaulSpecs.weapon).forEach(([spriteId, spec]) => {
    EquipmentOverhaulMatrices[spriteId] = makeWeaponOverhaulSprite(spec);
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
        EquipmentOverhaulMatrices,
        makeArmorOverhaulSprite,
        makeHelmetOverhaulSprite,
        makeGlovesOverhaulSprite,
        makeBootsOverhaulSprite,
        makeWeaponOverhaulSprite
    };
}
