// Native 32x32 enemies, town characters, minigame props, terrain, and pets.

const WorldOverhaulSpecs = {
    humanoids: {
        npc_kreg: {
            skin: 'p',
            cloth: 'w',
            shadow: 'd',
            accent: 'm',
            eye: 'B',
            style: 'innkeeper'
        },
        goblin_axeling: {
            skin: 'h',
            cloth: 'l',
            shadow: 'd',
            accent: 'I',
            eye: 'R',
            style: 'goblin'
        },
        alpha_poacher: {
            skin: 'p',
            cloth: 'q',
            shadow: '1',
            accent: 'c',
            eye: 'Y',
            style: 'poacher'
        }
    },
    casks: {
        corrupted_cask: {
            wood: 'c',
            shadow: 'd',
            band: 'I',
            glow: 'R',
            style: 'corrupted'
        },
        eldritch_keg: {
            wood: 'J',
            shadow: 'k',
            band: 'v',
            glow: '^',
            style: 'eldritch'
        },
        vintage_behemoth: {
            wood: 'c',
            shadow: 'd',
            band: 's',
            glow: 'w',
            style: 'behemoth'
        }
    },
    mimics: {
        pub_crawl_mimic: {
            shell: 'm',
            shadow: 'K',
            tooth: 'b',
            glow: 'R'
        },
        chummed_mimic: {
            shell: '7',
            shadow: '3',
            tooth: 'b',
            glow: '^'
        }
    },
    beasts: {
        peanut_slinger: {
            fur: 'c',
            shadow: 'd',
            highlight: ':',
            eye: 'B',
            style: 'squirrel'
        },
        wild_ravager: {
            fur: '~',
            shadow: '0',
            highlight: 'a',
            eye: 'R',
            style: 'ravager'
        },
        publing: {
            fur: '-',
            shadow: 'd',
            highlight: 'l',
            eye: 'Y',
            style: 'bear'
        },
        wilderness_overlord: {
            fur: '-',
            shadow: '0',
            highlight: 'l',
            eye: 'R',
            style: 'boar'
        },
        enraged_gorilla: {
            fur: '~',
            shadow: 'G',
            highlight: 'a',
            eye: 'R',
            style: 'gorilla'
        }
    }
};

function makeHumanoidWorldSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;

        ellipse(16, 7, 7, 6, 'X');
        ellipse(16, 7, 6, 5, spec.skin);
        rect(10, 13, 13, 10, spec.cloth);
        frame(10, 13, 13, 10, 'X');
        rect(6, 14, 4, 8, spec.skin);
        rect(23, 14, 4, 8, spec.skin);
        frame(6, 14, 4, 8, 'X');
        frame(23, 14, 4, 8, 'X');
        rect(11, 22, 5, 8, spec.shadow);
        rect(18, 22, 5, 8, spec.shadow);
        frame(11, 22, 5, 8, 'X');
        frame(18, 22, 5, 8, 'X');
        rect(10, 29, 7, 3, 'D');
        rect(18, 29, 7, 3, 'D');
        frame(10, 29, 7, 3, 'X');
        frame(18, 29, 7, 3, 'X');

        set(14, 7, spec.eye);
        set(19, 7, spec.eye);
        set(16, 10, '@');
        rect(11, 20, 11, 2, spec.accent);

        if (spec.style === 'innkeeper') {
            rect(11, 14, 11, 8, 'b');
            frame(11, 14, 11, 8, spec.shadow);
            rect(13, 16, 7, 4, 'W');
            set(16, 18, spec.accent);
            line(11, 3, 21, 3, 'W', 2);
            line(12, 4, 20, 4, 'W');
            rect(13, 10, 7, 3, 'W');
            points([[12, 11], [14, 12], [16, 13], [18, 12], [20, 11]], 'W');
        } else if (spec.style === 'goblin') {
            points([[8, 6], [7, 5], [24, 6], [25, 5]], spec.skin);
            line(10, 4, 16, 1, 'd', 2);
            line(16, 1, 22, 4, 'd', 2);
            line(25, 20, 28, 7, 'c', 2);
            rect(25, 5, 6, 5, spec.accent);
            points([[24, 5], [31, 4], [31, 10]], 's');
        } else if (spec.style === 'poacher') {
            line(10, 4, 16, 1, spec.shadow, 3);
            line(16, 1, 22, 4, spec.shadow, 3);
            line(10, 4, 9, 12, spec.cloth, 3);
            line(22, 4, 23, 12, spec.cloth, 3);
            line(25, 3, 29, 8, spec.accent, 2);
            line(29, 8, 29, 25, spec.accent, 2);
            line(29, 25, 25, 29, spec.accent, 2);
            line(25, 3, 25, 29, 'W');
        }
    });
}

function makeCaskWorldSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;
        const isBoss = spec.style === 'behemoth';
        const x = isBoss ? 3 : 7;
        const y = isBoss ? 5 : 8;
        const width = isBoss ? 27 : 19;
        const height = isBoss ? 21 : 17;

        ellipse(16, y + 3, Math.floor(width / 2), 4, 'X');
        rect(x, y + 3, width, height - 6, spec.wood);
        frame(x, y + 3, width, height - 6, 'X');
        ellipse(16, y + height - 4, Math.floor(width / 2), 4, spec.shadow);
        rect(x, y + 6, width, 2, spec.band);
        rect(x, y + height - 9, width, 2, spec.band);
        line(16, y + 4, 16, y + height - 5, spec.shadow);
        set(12, y + 10, spec.glow);
        set(20, y + 10, spec.glow);

        if (spec.style === 'corrupted') {
            rect(11, y + 13, 11, 3, '0');
            points([[12, y + 13], [15, y + 15], [18, y + 13], [21, y + 15]], 'b');
            line(9, y + height - 2, 6, 31, spec.shadow, 3);
            line(23, y + height - 2, 26, 31, spec.shadow, 3);
        } else if (spec.style === 'eldritch') {
            points([[8, y + 2], [24, y + 2], [5, y + 10], [27, y + 10]], spec.glow);
            line(8, y + height - 2, 4, 31, spec.band, 3);
            line(24, y + height - 2, 28, 31, spec.band, 3);
            line(7, y + 12, 2, y + 6, spec.glow, 2);
            line(25, y + 12, 30, y + 6, spec.glow, 2);
        } else {
            rect(8, y + 13, 17, 5, '0');
            points([[9, y + 13], [12, y + 17], [15, y + 13], [18, y + 17], [21, y + 13], [24, y + 17]], 'b');
            points([[6, 3], [10, 1], [22, 1], [26, 3]], spec.band);
            line(6, y + height - 2, 2, 31, spec.shadow, 4);
            line(26, y + height - 2, 30, 31, spec.shadow, 4);
        }
    });
}

function makeMimicWorldSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;

        ellipse(16, 9, 10, 6, 'X');
        ellipse(16, 9, 9, 5, spec.shell);
        rect(6, 9, 21, 8, spec.shell);
        frame(6, 9, 21, 8, 'X');
        rect(7, 15, 19, 2, spec.shadow);
        rect(7, 18, 19, 8, '0');
        frame(7, 18, 19, 8, 'X');
        points([
            [8, 18], [11, 18], [14, 18], [17, 18], [20, 18], [23, 18],
            [9, 25], [12, 25], [15, 25], [18, 25], [21, 25], [24, 25]
        ], spec.tooth);
        set(12, 11, spec.glow);
        set(21, 11, spec.glow);
        line(10, 27, 7, 31, spec.shadow, 3);
        line(22, 27, 25, 31, spec.shadow, 3);
    });
}

function makeBeastWorldSprite(spec) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;

        if (spec.style === 'squirrel') {
            ellipse(15, 11, 6, 6, 'X');
            ellipse(15, 11, 5, 5, spec.fur);
            ellipse(23, 18, 7, 10, spec.shadow);
            ellipse(23, 17, 5, 8, spec.fur);
            rect(10, 16, 11, 10, spec.fur);
            frame(10, 16, 11, 10, 'X');
            set(13, 10, spec.eye);
            set(18, 10, spec.eye);
            points([[10, 5], [13, 3], [18, 3], [21, 5]], spec.highlight);
            ellipse(25, 14, 2, 2, 'c');
            line(22, 18, 28, 13, 'c', 2);
            line(11, 26, 9, 31, spec.shadow, 3);
            line(19, 26, 21, 31, spec.shadow, 3);
            return;
        }

        if (spec.style === 'gorilla') {
            ellipse(16, 8, 7, 6, 'X');
            ellipse(16, 8, 6, 5, spec.fur);
            rect(8, 13, 17, 13, spec.fur);
            frame(8, 13, 17, 13, 'X');
            line(8, 14, 3, 27, spec.fur, 5);
            line(24, 14, 29, 27, spec.fur, 5);
            rect(11, 25, 5, 7, spec.shadow);
            rect(19, 25, 5, 7, spec.shadow);
            set(13, 7, spec.eye);
            set(19, 7, spec.eye);
            rect(13, 10, 7, 2, spec.highlight);
            line(10, 15, 22, 15, spec.highlight);
            points([[8, 17], [24, 17], [12, 23], [20, 23]], spec.highlight);
            points([[3, 29], [4, 30], [28, 30], [29, 29]], spec.eye);
            return;
        }

        const isBoss = spec.style === 'boar';
        const bodyX = isBoss ? 2 : 5;
        const bodyY = isBoss ? 11 : 14;
        const bodyWidth = isBoss ? 28 : 22;
        const bodyHeight = isBoss ? 14 : 11;

        ellipse(16, bodyY + 4, Math.floor(bodyWidth / 2), 8, 'X');
        ellipse(16, bodyY + 4, Math.floor(bodyWidth / 2) - 1, 7, spec.fur);
        ellipse(isBoss ? 24 : 22, bodyY, 7, 6, spec.fur);
        set(isBoss ? 26 : 24, bodyY - 1, spec.eye);
        set(isBoss ? 27 : 25, bodyY + 2, 'B');
        rect(bodyX, bodyY + 4, bodyWidth, bodyHeight - 4, spec.fur);
        frame(bodyX, bodyY + 4, bodyWidth, bodyHeight - 4, 'X');
        [bodyX + 4, bodyX + 9, bodyX + bodyWidth - 10, bodyX + bodyWidth - 5].forEach(x => {
            rect(x, bodyY + bodyHeight - 1, 3, 7, spec.shadow);
            frame(x, bodyY + bodyHeight - 1, 3, 7, 'X');
        });

        if (spec.style === 'boar') {
            line(26, bodyY + 2, 30, bodyY + 5, 'b', 2);
            line(26, bodyY + 4, 30, bodyY + 1, 'b', 2);
            points([[7, bodyY - 3], [10, bodyY - 5], [13, bodyY - 3]], spec.highlight);
        } else if (spec.style === 'ravager') {
            points([[7, bodyY - 2], [11, bodyY - 4], [15, bodyY - 2], [19, bodyY - 4]], spec.highlight);
            line(5, bodyY + 6, 1, bodyY + 1, spec.shadow, 2);
        } else {
            points([[9, bodyY - 2], [13, bodyY - 4], [18, bodyY - 3]], spec.highlight);
        }
    });
}

function makeMagicBananaWorldSprite() {
    return createNativeOverhaulSprite(painter => {
        const { set, line, points, ellipse } = painter;
        line(10, 6, 12, 22, 'X', 6);
        line(12, 22, 23, 27, 'X', 6);
        line(10, 6, 12, 22, 'Y', 4);
        line(12, 22, 23, 27, 'Y', 4);
        line(11, 7, 13, 21, 'C');
        points([[9, 3], [10, 4], [24, 27], [25, 28]], 'd');
        ellipse(9, 4, 2, 2, 'h');
        set(13, 13, 'R');
        set(14, 16, 'R');
        points([[6, 10], [5, 12], [26, 19], [28, 21]], '^');
    });
}

function makeSpectralBarflyWorldSprite() {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, line, points, ellipse } = painter;
        ellipse(16, 10, 6, 6, 'W');
        ellipse(16, 10, 5, 5, '^');
        ellipse(9, 11, 6, 4, 's');
        ellipse(23, 11, 6, 4, 's');
        line(13, 15, 10, 24, '^', 3);
        line(16, 15, 16, 27, '^', 3);
        line(19, 15, 22, 24, '^', 3);
        set(14, 9, '0');
        set(18, 9, '0');
        rect(14, 12, 5, 2, 'w');
        points([[8, 7], [24, 7], [5, 13], [27, 13]], 'W');
    });
}

function makeMashCrawlerWorldSprite() {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, line, points, ellipse } = painter;
        ellipse(16, 19, 12, 9, 'X');
        ellipse(16, 19, 11, 8, 'h');
        ellipse(13, 15, 5, 4, 'q');
        ellipse(20, 17, 4, 5, 'e');
        set(12, 17, 'R');
        set(21, 18, 'R');
        rect(12, 22, 9, 3, '0');
        points([[13, 22], [16, 24], [19, 22]], 'b');
        line(7, 23, 2, 28, 'q', 3);
        line(25, 23, 30, 28, 'q', 3);
        points([[8, 11], [16, 8], [24, 12]], '&');
    });
}

function makeMinigameWorldSprite(style) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;
        if (style === 'axe') {
            line(9, 29, 21, 7, 'd', 3);
            rect(17, 3, 11, 8, 'I');
            frame(17, 3, 11, 8, 'X');
            line(18, 4, 26, 4, 's');
        } else if (style === 'fish') {
            ellipse(15, 16, 9, 6, 's');
            points([[24, 16], [30, 10], [30, 22]], '^');
            set(10, 14, 'B');
            line(8, 19, 20, 19, 'W');
        } else if (style === 'hook') {
            line(17, 2, 17, 20, 'W');
            line(17, 20, 13, 27, 'I', 3);
            line(13, 27, 8, 25, 'I', 3);
            set(17, 3, 's');
        } else if (style === 'log') {
            rect(3, 12, 26, 10, 'y');
            frame(3, 12, 26, 10, 'X');
            ellipse(28, 17, 4, 5, 'c');
            ellipse(28, 17, 2, 3, 'd');
            line(6, 14, 22, 19, 'c');
        } else {
            line(16, 31, 16, 10, '[', 2);
            line(16, 20, 9, 14, '[', 2);
            line(16, 17, 23, 11, '[', 2);
            const leaf = style === 'ripe' ? 'h' : style === 'rotten' ? 'w' : 'q';
            points([[8, 13], [10, 15], [22, 10], [24, 12], [13, 8], [19, 6]], leaf);
            if (style === 'ripe') points([[10, 12], [21, 9], [16, 5]], 'Y');
            if (style === 'rotten') points([[10, 12], [21, 9], [16, 5]], '&');
        }
    });
}

function makeGroundOverhaulTile(primary, secondary, accent, pattern) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, line, points } = painter;
        rect(0, 0, 32, 32, primary);
        const speckles = [
            [2, 3], [8, 1], [14, 5], [23, 2], [29, 7],
            [5, 11], [12, 14], [19, 10], [27, 15],
            [1, 21], [9, 25], [17, 22], [25, 28], [30, 23],
            [4, 30], [14, 29], [21, 18]
        ];
        points(speckles, secondary);

        if (pattern === 'grass') {
            speckles.slice(0, 9).forEach(([x, y]) => {
                set(x + 1, y - 1, accent);
                set(x + 2, y, accent);
            });
        } else if (pattern === 'stone') {
            line(0, 9, 31, 9, accent);
            line(0, 20, 31, 20, accent);
            line(8, 0, 8, 9, accent);
            line(22, 9, 22, 20, accent);
            line(13, 20, 13, 31, accent);
        } else if (pattern === 'sand') {
            points([[6, 7], [7, 7], [18, 16], [19, 16], [25, 5], [11, 27]], accent);
        } else if (pattern === 'void') {
            line(3, 4, 12, 13, accent, 2);
            line(12, 13, 8, 24, secondary, 2);
            line(21, 2, 18, 15, accent, 2);
            line(18, 15, 28, 28, secondary, 2);
        }
    });
}

function makeMapObstacleWorldSprite(style) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;

        if (style === 'boulder') {
            ellipse(16, 20, 13, 10, '9');
            ellipse(16, 19, 11, 8, '7');
            ellipse(13, 16, 6, 4, '8');
            line(16, 13, 22, 20, '9', 2);
            line(10, 21, 14, 26, '8');
        } else if (style === 'tree') {
            rect(13, 15, 7, 16, 'y');
            frame(13, 15, 7, 16, 'X');
            line(16, 16, 9, 8, 'y', 3);
            line(17, 17, 24, 8, 'y', 3);
            ellipse(10, 8, 8, 7, 'q');
            ellipse(22, 8, 8, 7, 'q');
            ellipse(16, 5, 9, 7, 'e');
            points([[8, 5], [15, 2], [23, 6], [18, 10]], 'h');
        } else if (style === 'cask') {
            ellipse(13, 17, 9, 7, 'd');
            rect(5, 13, 17, 9, 'c');
            frame(5, 13, 17, 9, 'X');
            rect(6, 15, 15, 2, 's');
            line(13, 14, 13, 21, 'd');
            points([[23, 11], [26, 8], [28, 12], [25, 17]], 'c');
            rect(8, 24, 18, 3, '9');
        } else if (style === 'pillar') {
            rect(10, 4, 13, 24, 'J');
            frame(10, 4, 13, 24, 'X');
            rect(8, 3, 17, 4, 's');
            frame(8, 3, 17, 4, 'X');
            rect(8, 27, 17, 4, 's');
            frame(8, 27, 17, 4, 'X');
            line(13, 7, 13, 26, 'I');
            line(19, 7, 19, 26, '8');
            points([[12, 12], [18, 17], [14, 22]], '7');
        }
    });
}

const WorldOverhaulMatrices = {};

Object.entries(WorldOverhaulSpecs.humanoids).forEach(([spriteId, spec]) => {
    WorldOverhaulMatrices[spriteId] = makeHumanoidWorldSprite(spec);
});

Object.entries(WorldOverhaulSpecs.casks).forEach(([spriteId, spec]) => {
    WorldOverhaulMatrices[spriteId] = makeCaskWorldSprite(spec);
});

Object.entries(WorldOverhaulSpecs.mimics).forEach(([spriteId, spec]) => {
    WorldOverhaulMatrices[spriteId] = makeMimicWorldSprite(spec);
});

Object.entries(WorldOverhaulSpecs.beasts).forEach(([spriteId, spec]) => {
    WorldOverhaulMatrices[spriteId] = makeBeastWorldSprite(spec);
});

Object.assign(WorldOverhaulMatrices, {
    magic_banana: makeMagicBananaWorldSprite(),
    spectral_barfly: makeSpectralBarflyWorldSprite(),
    mash_crawler: makeMashCrawlerWorldSprite(),
    hunter_bow: typeof EquipmentOverhaulMatrices !== 'undefined'
        ? EquipmentOverhaulMatrices.weap_bow
        : createNativeOverhaulSprite(),
    sprite_minigame_axe: makeMinigameWorldSprite('axe'),
    sprite_minigame_fish: makeMinigameWorldSprite('fish'),
    sprite_minigame_hook: makeMinigameWorldSprite('hook'),
    sprite_minigame_log: makeMinigameWorldSprite('log'),
    sprite_minigame_hops_growing: makeMinigameWorldSprite('growing'),
    sprite_minigame_hops_ripe: makeMinigameWorldSprite('ripe'),
    sprite_minigame_hops_rotten: makeMinigameWorldSprite('rotten'),
    ground_wilderness: makeGroundOverhaulTile('1', '2', 'q', 'grass'),
    ground_cellars: makeGroundOverhaulTile('3', '4', '7', 'stone'),
    ground_arena: makeGroundOverhaulTile('6', '5', 'N', 'sand'),
    ground_abyss: makeGroundOverhaulTile('A', '{', '}', 'void'),
    map_boulder: makeMapObstacleWorldSprite('boulder'),
    map_tree: makeMapObstacleWorldSprite('tree'),
    map_broken_cask: makeMapObstacleWorldSprite('cask'),
    map_pillar: makeMapObstacleWorldSprite('pillar')
});

Object.assign(SpriteMatrices, WorldOverhaulMatrices);

function makePetOverhaulSprite(type) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;

        if (type === 'dog') {
            ellipse(16, 17, 7, 6, 'o');
            ellipse(16, 17, 6, 5, 'f');
            ellipse(9, 16, 4, 6, 'o');
            ellipse(23, 16, 4, 6, 'o');
            rect(11, 22, 11, 7, 'f');
            frame(11, 22, 11, 7, 'o');
            rect(11, 22, 11, 2, 'c');
            rect(12, 28, 4, 4, 'f');
            rect(18, 28, 4, 4, 'f');
            frame(12, 28, 4, 4, 'o');
            frame(18, 28, 4, 4, 'o');
            set(14, 16, 'b');
            set(19, 16, 'b');
            set(16, 20, 'b');
            points([[13, 19], [19, 19]], 'w');
        } else {
            points([[10, 10], [12, 5], [15, 10], [18, 10], [21, 5], [23, 10]], 'o');
            ellipse(16, 16, 7, 7, 'o');
            ellipse(16, 16, 6, 6, 'f');
            rect(11, 22, 11, 7, 'f');
            frame(11, 22, 11, 7, 'o');
            rect(11, 22, 11, 2, 'c');
            rect(12, 28, 4, 4, 'f');
            rect(18, 28, 4, 4, 'f');
            frame(12, 28, 4, 4, 'o');
            frame(18, 28, 4, 4, 'o');
            line(22, 25, 28, 20, 'o', 3);
            line(28, 20, 27, 14, 'f', 2);
            set(14, 15, 'b');
            set(19, 15, 'b');
            set(16, 19, 'b');
            points([[12, 18], [20, 18]], 'w');
        }
    });
}

const PetOverhaulMatrices = {
    dog: makePetOverhaulSprite('dog'),
    cat: makePetOverhaulSprite('cat')
};

if (typeof PetMatrices !== 'undefined') {
    Object.assign(PetMatrices, PetOverhaulMatrices);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WorldOverhaulSpecs,
        WorldOverhaulMatrices,
        PetOverhaulMatrices,
        makeHumanoidWorldSprite,
        makeCaskWorldSprite,
        makeMimicWorldSprite,
        makeBeastWorldSprite,
        makeGroundOverhaulTile,
        makeMapObstacleWorldSprite
    };
}
