// Native 32x32 inventory and consumable icons.

function makeCenteredOverhaulIcon(matrix, padding = 4) {
    const occupied = [];
    matrix.forEach((row, y) => {
        row.forEach((key, x) => {
            if (key !== '.') occupied.push({ x, y, key });
        });
    });

    if (!occupied.length) return createNativeOverhaulSprite();

    const minX = Math.min(...occupied.map(pixel => pixel.x));
    const maxX = Math.max(...occupied.map(pixel => pixel.x));
    const minY = Math.min(...occupied.map(pixel => pixel.y));
    const maxY = Math.max(...occupied.map(pixel => pixel.y));
    const sourceWidth = maxX - minX + 1;
    const sourceHeight = maxY - minY + 1;
    const available = 32 - (padding * 2);
    const scale = Math.max(
        1,
        Math.floor(Math.min(available / sourceWidth, available / sourceHeight))
    );
    const outputWidth = sourceWidth * scale;
    const outputHeight = sourceHeight * scale;
    const offsetX = Math.floor((32 - outputWidth) / 2);
    const offsetY = Math.floor((32 - outputHeight) / 2);

    return createNativeOverhaulSprite(({ rect }) => {
        occupied.forEach(pixel => {
            rect(
                offsetX + ((pixel.x - minX) * scale),
                offsetY + ((pixel.y - minY) * scale),
                scale,
                scale,
                pixel.key
            );
        });
    });
}

function makeBrewOverhaulIcon(liquid, accent, style = 'tankard') {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;

        if (style === 'bottle') {
            rect(13, 3, 7, 5, accent);
            frame(13, 3, 7, 5, 'X');
            rect(10, 7, 13, 22, 'W');
            frame(10, 7, 13, 22, 'X');
            rect(12, 14, 9, 13, liquid);
            rect(12, 13, 9, 2, 'b');
            rect(13, 17, 7, 7, accent);
            set(16, 20, 'W');
            return;
        }

        rect(7, 7, 17, 21, 'W');
        frame(7, 7, 17, 21, 'X');
        rect(9, 12, 13, 14, liquid);
        rect(9, 9, 13, 4, 'b');
        rect(22, 12, 7, 11, '.');
        line(24, 12, 28, 14, 'W', 3);
        line(28, 14, 28, 21, 'W', 3);
        line(28, 21, 24, 23, 'W', 3);
        rect(11, 16, 9, 6, accent);
        ellipse(15, 19, 2, 2, 'W');
        points([[10, 8], [14, 7], [18, 8], [21, 7]], 'W');
    });
}

function makeCrateOverhaulIcon(theme) {
    const themes = {
        timber: { primary: 'y', shadow: 'd', band: 'I', accent: 'h' },
        angler: { primary: '7', shadow: '3', band: 's', accent: '^' },
        harvest: { primary: 'c', shadow: 'd', band: 'N', accent: 'Y' }
    };
    const colors = themes[theme];

    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points } = painter;
        rect(5, 6, 23, 22, colors.primary);
        frame(5, 6, 23, 22, 'X');
        rect(5, 9, 23, 3, colors.band);
        rect(5, 23, 23, 3, colors.band);
        line(7, 8, 26, 26, colors.shadow, 3);
        line(26, 8, 7, 26, colors.shadow, 3);
        rect(13, 14, 7, 7, colors.band);
        frame(13, 14, 7, 7, 'X');
        set(16, 17, colors.accent);
        points([[4, 5], [28, 5], [4, 28], [28, 28]], colors.accent);
    });
}

function makeJunkOverhaulIcon(style) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points, ellipse } = painter;

        if (style === 'pinecone') {
            ellipse(16, 17, 7, 11, 'd');
            for (let y = 9; y <= 24; y += 4) {
                points([[12, y], [16, y + 2], [20, y]], 'c');
                points([[10, y + 2], [14, y + 4], [18, y + 4], [22, y + 2]], 'l');
            }
            line(16, 5, 16, 8, 'y', 2);
        } else if (style === 'leaf') {
            ellipse(16, 15, 9, 12, '7');
            line(8, 25, 24, 5, 'X', 2);
            line(9, 24, 23, 6, 'h');
            line(15, 16, 8, 12, 'q');
            line(17, 14, 24, 18, 'q');
        } else if (style === 'seaweed') {
            line(10, 29, 8, 5, 'q', 3);
            line(16, 30, 18, 3, 'h', 3);
            line(23, 29, 25, 8, 'e', 3);
            points([[7, 9], [12, 15], [19, 10], [22, 18], [26, 13]], '^');
        } else if (style === 'fishbones') {
            line(6, 16, 26, 16, 'b', 2);
            [10, 14, 18, 22].forEach(x => {
                line(x, 16, x - 3, 10, 'b');
                line(x, 16, x - 3, 22, 'b');
            });
            points([[27, 16], [31, 11], [31, 21]], 'b');
            set(6, 16, 'B');
        } else if (style === 'horseshoe') {
            line(10, 5, 7, 18, 'I', 4);
            line(7, 18, 12, 27, 'I', 4);
            line(22, 5, 25, 18, 'I', 4);
            line(25, 18, 20, 27, 'I', 4);
            line(12, 27, 20, 27, 'I', 4);
            points([[9, 10], [8, 17], [12, 24], [23, 10], [24, 17], [20, 24]], 's');
        } else if (style === 'corncob') {
            ellipse(16, 15, 7, 12, 'Y');
            for (let y = 7; y <= 22; y += 4) {
                rect(11, y, 11, 1, 'K');
            }
            line(14, 4, 10, 1, 'h', 3);
            line(18, 4, 23, 1, 'q', 3);
            line(12, 25, 7, 30, 'h', 3);
            line(20, 25, 25, 30, 'q', 3);
        } else {
            line(7, 24, 24, 8, 'c', 4);
            line(10, 27, 27, 11, 'd', 3);
            points([[6, 22], [9, 28], [23, 6], [28, 10]], 'l');
        }
    });
}

function makeVoucherOverhaulIcon() {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, frame, line, points } = painter;
        rect(6, 4, 21, 24, 'b');
        frame(6, 4, 21, 24, 'X');
        points([[6, 8], [6, 16], [6, 24], [26, 8], [26, 16], [26, 24]], '.');
        rect(10, 8, 13, 2, 'w');
        rect(10, 13, 9, 1, '7');
        rect(10, 17, 12, 1, '7');
        rect(10, 21, 7, 1, '7');
        rect(19, 20, 5, 5, 'R');
        set(21, 22, 'Y');
    });
}

function makeBombOverhaulIcon(heavy = false) {
    return createNativeOverhaulSprite(painter => {
        const { set, rect, line, points, ellipse } = painter;
        const radius = heavy ? 10 : 8;
        ellipse(16, 20, radius, radius, 'X');
        ellipse(16, 20, radius - 1, radius - 1, heavy ? 'J' : '0');
        rect(14, 8, 5, 5, 'I');
        line(18, 8, 23, 4, 'c', 2);
        points([[24, 3], [26, 1], [27, 4], [30, 3]], heavy ? 'R' : '!');
        if (heavy) {
            rect(8, 17, 17, 3, 'I');
            rect(15, 10, 3, 19, 'I');
        }
        set(13, 17, 's');
    });
}

function makeArrowOverhaulIcon() {
    return createNativeOverhaulSprite(painter => {
        const { line, points } = painter;
        line(5, 27, 25, 7, 'c', 3);
        line(6, 26, 24, 8, ':');
        points([[25, 7], [30, 3], [29, 10], [22, 10]], 's');
        points([[5, 27], [2, 22], [8, 25], [10, 30]], 'R');
    });
}

function makePeanutOverhaulIcon() {
    return createNativeOverhaulSprite(painter => {
        const { set, line, ellipse } = painter;
        ellipse(12, 13, 7, 8, 'c');
        ellipse(20, 20, 7, 8, 'c');
        line(8, 8, 24, 25, 'd', 2);
        line(16, 7, 24, 15, 'l');
        line(8, 17, 16, 25, 'l');
        set(12, 12, ':');
        set(20, 20, ':');
    });
}

const IconOverhaulMatrices = {};

if (typeof EquipmentOverhaulSpecs !== 'undefined') {
    ['armor', 'helmet', 'gloves', 'boots', 'weapon'].forEach(slot => {
        Object.keys(EquipmentOverhaulSpecs[slot]).forEach(spriteId => {
            const sourceId = slot === 'armor' ? `${spriteId}_male` : spriteId;
            const source = EquipmentOverhaulMatrices[sourceId];
            IconOverhaulMatrices[`icon_${spriteId}`] = makeCenteredOverhaulIcon(source);
        });
    });
}

Object.assign(IconOverhaulMatrices, {
    icon_stout: makeBrewOverhaulIcon('m', 'N'),
    icon_ipa: makeBrewOverhaulIcon('K', '!'),
    icon_lager: makeBrewOverhaulIcon('Y', 'C'),
    icon_reserve: makeBrewOverhaulIcon('w', 'Y', 'bottle'),
    icon_crate_timber: makeCrateOverhaulIcon('timber'),
    icon_crate_angler: makeCrateOverhaulIcon('angler'),
    icon_crate_harvest: makeCrateOverhaulIcon('harvest'),
    icon_junk: makeJunkOverhaulIcon('splinters'),
    icon_junk_pinecone: makeJunkOverhaulIcon('pinecone'),
    icon_junk_petrified_leaf: makeJunkOverhaulIcon('leaf'),
    icon_junk_seaweed: makeJunkOverhaulIcon('seaweed'),
    icon_junk_fishbones: makeJunkOverhaulIcon('fishbones'),
    icon_junk_horseshoe: makeJunkOverhaulIcon('horseshoe'),
    icon_junk_corncob: makeJunkOverhaulIcon('corncob'),
    icon_voucher: makeVoucherOverhaulIcon(),
    icon_bomb_small: makeBombOverhaulIcon(false),
    icon_bomb_heavy: makeBombOverhaulIcon(true),
    icon_arrow: makeArrowOverhaulIcon(),
    icon_peanut: makePeanutOverhaulIcon()
});

const IconOverhaulAliases = {
    icon_gloves_poacher: 'icon_poachers_grips',
    icon_icon_ipa: 'icon_ipa',
    icon_icon_lager: 'icon_lager',
    icon_icon_reserve: 'icon_reserve',
    icon_icon_junk: 'icon_junk',
    icon_icon_voucher: 'icon_voucher',
    icon_icon_crate_timber: 'icon_crate_timber',
    icon_icon_crate_angler: 'icon_crate_angler',
    icon_icon_crate_harvest: 'icon_crate_harvest'
};

Object.entries(IconOverhaulAliases).forEach(([alias, sourceId]) => {
    IconOverhaulMatrices[alias] = IconOverhaulMatrices[sourceId];
});

if (typeof ItemDatabase !== 'undefined') {
    Object.values(ItemDatabase).forEach(item => {
        const spriteId = item.spriteId || item.id;
        const targetId = `icon_${spriteId}`;

        if (!IconOverhaulMatrices[targetId] && IconOverhaulMatrices[spriteId]) {
            IconOverhaulMatrices[targetId] = IconOverhaulMatrices[spriteId];
        }

        if (
            !IconOverhaulMatrices[targetId]
            && SpriteMatrices[spriteId]
        ) {
            IconOverhaulMatrices[targetId] = makeCenteredOverhaulIcon(SpriteMatrices[spriteId]);
        }
    });
}

Object.assign(SpriteMatrices, IconOverhaulMatrices);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IconOverhaulMatrices,
        makeCenteredOverhaulIcon,
        makeBrewOverhaulIcon,
        makeCrateOverhaulIcon,
        makeJunkOverhaulIcon
    };
}
