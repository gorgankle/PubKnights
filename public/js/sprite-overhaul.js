// Native 32x32 sprite overhaul for Pub Knights.
// The first section defines the player style foundation and shared authoring tools.

const CORE_PLAYER_SAMPLE_SIZE = 32;
const CORE_PLAYER_SAMPLE_OFFSET_X = 4;

function buildCorePlayerSampleSprite(rows) {
    if (!Array.isArray(rows) || rows.length > CORE_PLAYER_SAMPLE_SIZE) {
        throw new Error('Core player sample art must contain at most 32 rows.');
    }

    const nativeRows = Array.from(
        { length: CORE_PLAYER_SAMPLE_SIZE },
        () => Array(CORE_PLAYER_SAMPLE_SIZE).fill('.')
    );

    rows.forEach((row, rowIndex) => {
        const values = String(row || '').split('');
        if (values.length > CORE_PLAYER_SAMPLE_SIZE - CORE_PLAYER_SAMPLE_OFFSET_X) {
            throw new Error(`Core player sample row ${rowIndex + 1} is too wide.`);
        }

        values.forEach((value, columnIndex) => {
            nativeRows[rowIndex][CORE_PLAYER_SAMPLE_OFFSET_X + columnIndex] = value || '.';
        });
    });

    return buildSprite(
        nativeRows.map(row => row.join('')),
        { sourceSize: CORE_PLAYER_SAMPLE_SIZE }
    );
}

function shiftCoreSampleColor(hex, amount) {
    const normalized = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return hex;

    const channels = [0, 2, 4].map(offset => {
        const value = parseInt(normalized.slice(offset, offset + 2), 16);
        return Math.max(0, Math.min(255, value + amount))
            .toString(16)
            .padStart(2, '0');
    });

    return `#${channels.join('')}`;
}

Object.assign(HairTones, {
    straw: '#d8b45d',
    raven: '#201b22'
});

Object.assign(ShirtTones, {
    ale: '#c98b2e',
    moss: '#3f6b46',
    claret: '#8f3442',
    pewter: '#556168'
});

Object.assign(PantsTones, {
    umber: '#4a342b',
    navy: '#1f3342'
});

Object.assign(BootsTones, {
    oxblood: '#552a2a'
});

// These keys are unused by the current asset registry. The renderer treats them
// like normal palette entries after applyCorePlayerSamplePalette derives them.
Object.assign(PALETTE, {
    X: '#171310', // shared outline
    F: '#b87850', // skin shadow
    Q: '#ffd29d', // skin highlight
    M: '#382114', // hair shadow
    T: '#805234', // hair highlight
    u: '#174d66', // shirt shadow
    r: '#56a5c8', // shirt highlight
    n: '#18242c', // pants shadow
    x: '#4b6270', // pants highlight
    g: '#6c493a'  // boot highlight
});

function applyCorePlayerSamplePalette(appearance) {
    const skin = SkinTones[appearance.skin] || SkinTones.light;
    const hair = HairTones[appearance.hairColor] || HairTones.brown;
    const shirt = ShirtTones[appearance.shirtColor] || ShirtTones.blue;
    const pants = PantsTones[appearance.pantsColor] || PantsTones.dark;
    const boots = BootsTones[appearance.bootsColor] || BootsTones.leather;

    Object.assign(PALETTE, {
        X: '#171310',
        F: shiftCoreSampleColor(skin, -34),
        Q: shiftCoreSampleColor(skin, 28),
        M: shiftCoreSampleColor(hair, -38),
        T: shiftCoreSampleColor(hair, 34),
        u: shiftCoreSampleColor(shirt, -38),
        r: shiftCoreSampleColor(shirt, 30),
        n: shiftCoreSampleColor(pants, -30),
        x: shiftCoreSampleColor(pants, 26),
        g: shiftCoreSampleColor(boots, 34)
    });
}

const CorePlayerSampleMatrices = {
    body_core_male: buildCorePlayerSampleSprite([
        '',
        '',
        '........XXXXXX',
        '......XXSSSSSSXX',
        '.....XSSQQSSSSSSX',
        '....XSQSSSSSSSSSSX',
        '....XSSSSSSSSSSSSX',
        '...XSSSSSSSSSSSSSSX',
        '....XSSSSSSSSSSSSX',
        '....XSSSSSS@SSSSSX',
        '.....XFFSSSSSSFFX',
        '.......XSSSSSSX',
        '.....XXXSSSSSSXXX',
        '...XXUUUUUUUUUUUUXX',
        '..XSSXUrrrrrrrrUUXSSX',
        '.XSFXUUUUUUUUUUUUUXFSX',
        '.XSFXUuUUUUUUUUuUUXFSX',
        '.XSFXUuUUUUUUUUuUUXFSX',
        '.XSSXUUUUUUUUUUUUUXSSX',
        '..XSSXUUuuUUUUuuUUXSSX',
        '...XXUUUUUUUUUUUUXX',
        '.....XXPPPPPPPPXX',
        '.....XnPPPPPPPPnX',
        '.....XPPPPPPPPPPX',
        '.....XPPPX..XPPPX',
        '.....XPPPX..XPPPX',
        '.....XPPPX..XPPPX',
        '.....XPPPX..XPPPX',
        '.....XDDDX..XDDDX',
        '....XDDDDX..XDDDDX',
        '....XDDggX..XggDDX',
        '....XXXXXX..XXXXXX'
    ]),

    body_core_female: buildCorePlayerSampleSprite([
        '',
        '',
        '........XXXXXX',
        '......XXSSSSSSXX',
        '.....XSSQQSSSSSSX',
        '....XSQSSSSSSSSSSX',
        '....XSSSSSSSSSSSSX',
        '...XSSSSSSSSSSSSSSX',
        '....XSSSSSSSSSSSSX',
        '....XSSSSSS@SSSSSX',
        '.....XFFSSSSSSFFX',
        '.......XSSSSSSX',
        '......XXSSSSSSXX',
        '....XXUUUUUUUUUUXX',
        '...XSSXUrrrrrrUUXSSX',
        '..XSFXUUUUUUUUUUUXFSX',
        '..XSFXUuUUUUUUuUUXFSX',
        '..XSFX.XUUUUUUX.XFSX',
        '..XSSX.XUUUUUUX.XSSX',
        '...XX..XUuuUUX..XX',
        '.......XUUUUUUX',
        '......XXPPPPPPXX',
        '.....XnPPPPPPPPnX',
        '.....XPPPPPPPPPPX',
        '......XPPX..XPPX',
        '......XPPX..XPPX',
        '......XPPX..XPPX',
        '......XPPX..XPPX',
        '......XDDX..XDDX',
        '.....XDDDX..XDDDX',
        '.....XDDgX..XgDDX',
        '.....XXXXX..XXXXX'
    ]),

    face_core: buildCorePlayerSampleSprite([
        '',
        '',
        '',
        '',
        '',
        '',
        '.......X......X',
        '........Z....Z'
    ]),

    hair_core_cropped: buildCorePlayerSampleSprite([
        '',
        '........XXXXXX',
        '......XXMHHHTXX',
        '.....XMHHHHHHTX',
        '....XMHHHHHHHHTX',
        '....XHHHT..THHHX',
        '....XHH......HHX',
        '....XH........HX',
        '.....H........H'
    ]),

    hair_core_braid: buildCorePlayerSampleSprite([
        '',
        '.......XXXXXXX',
        '.....XXMHHHHHTXX',
        '....XMHHHHHHHHTX',
        '...XMHHHTTHHHHHTX',
        '...XHHH......HHHX',
        '...XHH........HHX',
        '....H.........HHX',
        '....H.........XHHX',
        '...............XHHX',
        '................XHHX',
        '.................XHX',
        '................XHHX',
        '.................XHX',
        '................XHHX',
        '.................XHX',
        '..................X'
    ]),

    hair_core_waves: buildCorePlayerSampleSprite([
        '',
        '.......XXXXXXXX',
        '.....XXMHHHHHHTXX',
        '....XMHHHTTHHHHHTX',
        '...XMHHHHHHHHHHHHTX',
        '..XMHHHHT..THHHHHHTX',
        '..XHHH...........HHX',
        '..XHH.............HX',
        '..XHH.............HX',
        '..XHH.............HX',
        '..XMHH...........HHX',
        '...XHH...........HX',
        '...XMHH.........HHX',
        '....XMH.........HX',
        '.....XH.........X'
    ]),

    hair_core_topknot: buildCorePlayerSampleSprite([
        '..........XXXX',
        '.........XMHHX',
        '.........XHHTX',
        '......XXXMHHHXXX',
        '.....XMHHHHHHHHTX',
        '....XMHHHTTHHHHHTX',
        '....XHH......HHHX',
        '....XH.........HX',
        '.....H.........H'
    ]),

    outfit_core_apron: buildCorePlayerSampleSprite([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '.......ll....ll',
        '......lbbbbbbbbl',
        '......lbbWbbbbbl',
        '......lbbmmbbbbl',
        '......lbbmmbbbbl',
        '......lbbbbbbbbl',
        '....llllllllllll',
        '......lbbbbbbbbl',
        '......lbbbbbbbbl',
        '......lbbNbbbbbl',
        '......lbbbbbbbbl',
        '......llllllllll'
    ]),

    outfit_core_jerkin: buildCorePlayerSampleSprite([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '.....ss......ss',
        '....ssl......lss',
        '.....dllllllllld',
        '.....dlUuUUuUuld',
        '.....dlUUrrUUUld',
        '.....dlUuUUuUuld',
        '.....dllllllllld',
        '.....lllNllNllll',
        '......dlllllld',
        '.......ll..ll',
        '.......ll..ll'
    ]),

    outfit_core_scout: buildCorePlayerSampleSprite([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '.....qq......qq',
        '....qeeq....qeeq',
        '...qeeeq....qeeeq',
        '...qeeqUrrrrUqeeq',
        '...qeeqUUUUUUqeeq',
        '....qeqUuUUuUqeq',
        '.....qeqUUUUqeq',
        '......qllllllll',
        '......qeUUUUeq',
        '......qeUuuUeq',
        '......qeeNNeeq',
        '.......qeeeeq',
        '........qeeq',
        '.........qq',
        '..................YY',
        '.................Y.Y',
        '..................Y'
    ]),

    outfit_core_brewer: buildCorePlayerSampleSprite([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '......YY....YY',
        '.....YUrrrrrrUY',
        '.....YUuUUUUuUY',
        '.....YUUY..YUUY',
        '.....YUuY..YuUY',
        '.....YUUY^^YUUY',
        '.....YUUY^^YUUY',
        '.....YUUYYYYUUY',
        '.....YUuuUUuuUY',
        '.....YUUY..YUUY',
        '.....YUuY..YuUY',
        '.....YUUY..YUUY',
        '......YU....UY',
        '......YU....UY',
        '......YY....YY'
    ])
};

Object.assign(CorePlayerSampleMatrices, {
    hair_core_messy: buildCorePlayerSampleSprite([
        '',
        '.......XXX..XXXX',
        '.....XXMHTXXHHTXX',
        '....XMHHHHHHHHHHTX',
        '...XMHTHHHHHTHHHHTX',
        '...XHHHHT..THHHHHX',
        '...XHH.........HHX',
        '....H..........HH',
        '....H...........H'
    ]),

    hair_core_spiky: buildCorePlayerSampleSprite([
        '.....XX.....XX',
        '......XX...XX..XX',
        '....XXMXXXXXHXXX',
        '.....XMHHTHHHHTXX',
        '...XXMHHHHHHHHHTX',
        '...XHHHT....THHHX',
        '....HH........HH',
        '....H..........H'
    ]),

    hair_core_long: buildCorePlayerSampleSprite([
        '',
        '.......XXXXXXXX',
        '.....XXMHHHHHHTXX',
        '....XMHHHTTHHHHHTX',
        '...XMHHHHHHHHHHHHTX',
        '...XHHHT....THHHHHX',
        '...XHH.........HHHX',
        '...XHH.........HHHX',
        '...XHH.........HHHX',
        '...XMH.........HHMX',
        '...XMH.........HHMX',
        '...XMH.........HHMX',
        '...XMH.........HHMX',
        '...XMH.........HHMX',
        '....XH.........HHX',
        '....XH.........HHX',
        '.....X.........HX'
    ]),

    hair_core_bob: buildCorePlayerSampleSprite([
        '',
        '.......XXXXXXXX',
        '.....XXMHHHHHHTXX',
        '....XMHHHTTHHHHHTX',
        '...XMHHHHHHHHHHHHTX',
        '...XHHHT....THHHHHX',
        '...XHH.........HHHX',
        '...XHH.........HHHX',
        '...XMH.........HHMX',
        '....XH.........HHX',
        '.....XH.......HHX',
        '......XX.....XX'
    ]),

    hair_core_mohawk: buildCorePlayerSampleSprite([
        '.........XX',
        '........XMHX',
        '........XMHX',
        '........XMHTX',
        '........XMHTX',
        '......XXMHHHTXX',
        '.....XMHHHHHHHTX',
        '.....XH......HHX',
        '.....H........H'
    ]),

    hair_core_ponytail: buildCorePlayerSampleSprite([
        '',
        '.......XXXXXXX',
        '.....XXMHHHHHTXX',
        '....XMHHHTTHHHHHTX',
        '...XMHHH....THHHHTX',
        '...XHHH.......HHHHX',
        '...XHH.........HHHX',
        '....H..........XHHX',
        '................XHHX',
        '.................XHHX',
        '..................XHX',
        '.................XHHX',
        '..................XHX',
        '.................XHHX',
        '..................XX'
    ]),

    hair_core_undercut: buildCorePlayerSampleSprite([
        '',
        '.......XXXXXXXX',
        '.....XXMHHHHHHTXX',
        '....XMHHHTTTTTTTX',
        '...XMHHHHHHHHHTXX',
        '...XHHHT........X',
        '...XHH...........',
        '....H............'
    ]),

    hair_core_twintails: buildCorePlayerSampleSprite([
        '',
        '.......XXXXXXXX',
        '.....XXMHHHHHHTXX',
        '....XMHHHTTHHHHHTX',
        '...XMHHH....THHHHTX',
        '..XMHHH........HHHMX',
        '..XHHX..........XHHX',
        '.XMHX............XHMX',
        '.XHHX............XHHX',
        '..XHX............XHX',
        '..XHHX..........XHHX',
        '...XHX..........XHX',
        '....X............X'
    ]),

    hair_core_bald: buildCorePlayerSampleSprite([])
});

const PLAYER_SPRITE_ANCHORS = Object.freeze({
    headCenter: Object.freeze({ x: 0.5, y: 0.22 }),
    leftHand: Object.freeze({ x: 0.24, y: 0.66 }),
    weaponHand: Object.freeze({ x: 0.76, y: 0.66 }),
    leftFoot: Object.freeze({ x: 0.36, y: 0.95 }),
    rightFoot: Object.freeze({ x: 0.64, y: 0.95 })
});

function createNativeOverhaulSprite(draw) {
    const grid = Array.from(
        { length: CORE_PLAYER_SAMPLE_SIZE },
        () => Array(CORE_PLAYER_SAMPLE_SIZE).fill('.')
    );

    function set(x, y, key) {
        const column = Math.round(x);
        const row = Math.round(y);
        if (
            column < 0
            || column >= CORE_PLAYER_SAMPLE_SIZE
            || row < 0
            || row >= CORE_PLAYER_SAMPLE_SIZE
        ) {
            return;
        }
        grid[row][column] = key;
    }

    function rect(x, y, width, height, key) {
        for (let row = y; row < y + height; row++) {
            for (let column = x; column < x + width; column++) {
                set(column, row, key);
            }
        }
    }

    function frame(x, y, width, height, key) {
        for (let column = x; column < x + width; column++) {
            set(column, y, key);
            set(column, y + height - 1, key);
        }
        for (let row = y; row < y + height; row++) {
            set(x, row, key);
            set(x + width - 1, row, key);
        }
    }

    function line(x0, y0, x1, y1, key, thickness = 1) {
        let startX = Math.round(x0);
        let startY = Math.round(y0);
        const endX = Math.round(x1);
        const endY = Math.round(y1);
        const deltaX = Math.abs(endX - startX);
        const stepX = startX < endX ? 1 : -1;
        const deltaY = -Math.abs(endY - startY);
        const stepY = startY < endY ? 1 : -1;
        let error = deltaX + deltaY;

        while (true) {
            const radius = Math.max(0, Math.floor((thickness - 1) / 2));
            rect(startX - radius, startY - radius, thickness, thickness, key);
            if (startX === endX && startY === endY) break;
            const doubledError = 2 * error;
            if (doubledError >= deltaY) {
                error += deltaY;
                startX += stepX;
            }
            if (doubledError <= deltaX) {
                error += deltaX;
                startY += stepY;
            }
        }
    }

    function points(coordinates, key) {
        coordinates.forEach(([x, y]) => set(x, y, key));
    }

    function ellipse(centerX, centerY, radiusX, radiusY, key) {
        for (let y = centerY - radiusY; y <= centerY + radiusY; y++) {
            for (let x = centerX - radiusX; x <= centerX + radiusX; x++) {
                const distance = ((x - centerX) ** 2) / (radiusX ** 2)
                    + ((y - centerY) ** 2) / (radiusY ** 2);
                if (distance <= 1) set(x, y, key);
            }
        }
    }

    const painter = {
        grid,
        set,
        rect,
        frame,
        line,
        points,
        ellipse
    };

    if (typeof draw === 'function') draw(painter);

    return buildSprite(
        grid.map(row => row.join('')),
        { sourceSize: CORE_PLAYER_SAMPLE_SIZE }
    );
}

function paintOutlinedOverhaulShape(painter, spans, fillKey, outlineKey = 'X') {
    const cells = new Set();

    spans.forEach(([y, startX, endX]) => {
        for (let x = startX; x <= endX; x++) {
            cells.add(`${x},${y}`);
        }
    });

    cells.forEach(coordinate => {
        const [x, y] = coordinate.split(',').map(Number);
        const isEdge = [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1]
        ].some(([neighborX, neighborY]) => !cells.has(`${neighborX},${neighborY}`));

        painter.set(x, y, isEdge ? outlineKey : fillKey);
    });
}

function makeHeroBody(gender = 'male') {
    const female = gender === 'female';

    return createNativeOverhaulSprite(painter => {
        const { line, points, set } = painter;

        const leftLeg = female
            ? [
                [23, 10, 15],
                [24, 10, 15],
                [25, 10, 15],
                [26, 11, 15],
                [27, 11, 15],
                [28, 11, 15]
            ]
            : [
                [23, 10, 15],
                [24, 10, 15],
                [25, 10, 15],
                [26, 11, 15],
                [27, 11, 15],
                [28, 11, 15]
            ];
        const rightLeg = female
            ? [
                [23, 16, 21],
                [24, 16, 21],
                [25, 16, 21],
                [26, 16, 20],
                [27, 16, 20],
                [28, 16, 20]
            ]
            : [
                [23, 16, 21],
                [24, 16, 21],
                [25, 16, 21],
                [26, 16, 20],
                [27, 16, 20],
                [28, 16, 20]
            ];
        const leftBoot = [
            [29, 9, 15],
            [30, 9, 15],
            [31, 9, 15]
        ];
        const rightBoot = [
            [29, 16, 22],
            [30, 16, 22],
            [31, 16, 22]
        ];

        paintOutlinedOverhaulShape(painter, leftLeg, 'P');
        paintOutlinedOverhaulShape(painter, rightLeg, 'P');
        points([
            [11, 23], [12, 23], [13, 23], [14, 23],
            [17, 23], [18, 23], [19, 23], [20, 23]
        ], 'P');
        line(11, 23, 11, 28, 'x');
        line(20, 23, 20, 28, 'x');
        points([[12, 23], [12, 25], [19, 23], [19, 25]], 'x');

        paintOutlinedOverhaulShape(painter, leftBoot, 'D');
        paintOutlinedOverhaulShape(painter, rightBoot, 'D');
        points([
            [10, 29], [11, 29], [12, 29], [13, 29], [14, 29],
            [17, 29], [18, 29], [19, 29], [20, 29], [21, 29]
        ], 'D');
        points([[10, 29], [10, 30], [21, 29], [21, 30]], 'g');

        const leftArm = female
            ? [
                [17, 7, 9],
                [18, 6, 9],
                [19, 6, 9],
                [20, 6, 9],
                [21, 6, 9],
                [22, 6, 9]
            ]
            : [
                [16, 7, 10],
                [17, 6, 9],
                [18, 6, 9],
                [19, 6, 9],
                [20, 6, 9],
                [21, 6, 9],
                [22, 6, 9]
            ];
        const rightArm = female
            ? [
                [17, 22, 24],
                [18, 22, 25],
                [19, 22, 25],
                [20, 22, 25],
                [21, 22, 25],
                [22, 22, 25]
            ]
            : [
                [16, 21, 24],
                [17, 22, 25],
                [18, 22, 25],
                [19, 22, 25],
                [20, 22, 25],
                [21, 22, 25],
                [22, 22, 25]
            ];

        paintOutlinedOverhaulShape(painter, leftArm, 'S');
        paintOutlinedOverhaulShape(painter, rightArm, 'S');
        points([[8, 19], [8, 20], [23, 19], [23, 20]], 'Q');
        points([[7, 21], [24, 21]], 'F');

        const leftSleeve = female
            ? [
                [13, 10, 11],
                [14, 7, 11],
                [15, 7, 10],
                [16, 7, 10],
                [17, 7, 9]
            ]
            : [
                [13, 9, 11],
                [14, 6, 11],
                [15, 6, 11],
                [16, 7, 10],
                [17, 7, 10],
                [18, 7, 9]
            ];
        const rightSleeve = female
            ? [
                [13, 20, 21],
                [14, 20, 24],
                [15, 21, 24],
                [16, 21, 24],
                [17, 22, 24]
            ]
            : [
                [13, 20, 22],
                [14, 20, 25],
                [15, 20, 25],
                [16, 21, 24],
                [17, 21, 24],
                [18, 22, 24]
            ];

        paintOutlinedOverhaulShape(painter, leftSleeve, 'U');
        paintOutlinedOverhaulShape(painter, rightSleeve, 'U');
        points(female
            ? [[9, 15], [22, 15]]
            : [[9, 15], [9, 16], [22, 15], [22, 16]], 'r');
        points([[8, 17], [23, 17]], 'u');

        const torsoSpans = female
            ? [
                [12, 13, 18],
                [13, 11, 20],
                [14, 8, 23],
                [15, 8, 23],
                [16, 9, 22],
                [17, 10, 21],
                [18, 10, 21],
                [19, 11, 20],
                [20, 12, 19],
                [21, 12, 19],
                [22, 10, 21]
            ]
            : [
                [12, 12, 19],
                [13, 10, 21],
                [14, 7, 24],
                [15, 8, 23],
                [16, 9, 22],
                [17, 9, 22],
                [18, 10, 21],
                [19, 10, 21],
                [20, 11, 20],
                [21, 11, 20],
                [22, 10, 21]
            ];

        paintOutlinedOverhaulShape(painter, torsoSpans, 'U');
        points(female
            ? [[10, 14], [10, 15], [21, 14], [21, 15]]
            : [[9, 14], [9, 15], [22, 14], [22, 15]], 'U');
        points(female
            ? [[12, 15], [13, 15], [18, 15], [19, 15]]
            : [[11, 15], [12, 15], [19, 15], [20, 15]], 'r');
        if (female) {
            line(10, 16, 13, 20, 'u');
            line(21, 16, 18, 20, 'u');
        } else {
            line(10, 16, 12, 20, 'u');
            line(21, 16, 19, 20, 'u');
        }
        points([[14, 14], [15, 15], [16, 15], [17, 14]], 'u');
        if (female) {
            line(12, 22, 19, 22, 'l');
        } else {
            line(11, 22, 20, 22, 'l');
        }
        points([[15, 22], [16, 22]], 'N');
        points(female
            ? [[16, 16], [16, 18]]
            : [[15, 16], [16, 18]], 'N');
        points(female
            ? [[8, 17], [23, 17]]
            : [[8, 18], [23, 18]], 'r');

        paintOutlinedOverhaulShape(painter, female
            ? [
                [10, 14, 17],
                [11, 14, 17],
                [12, 14, 17],
                [13, 14, 17]
            ]
            : [
                [10, 14, 17],
                [11, 13, 18],
                [12, 13, 18],
                [13, 13, 18]
            ], 'S');

        paintOutlinedOverhaulShape(painter, female
            ? [
                [2, 13, 18],
                [3, 11, 20],
                [4, 10, 21],
                [5, 9, 22],
                [6, 9, 22],
                [7, 9, 22],
                [8, 9, 22],
                [9, 10, 21],
                [10, 11, 20],
                [11, 13, 18]
            ]
            : [
                [2, 13, 18],
                [3, 11, 20],
                [4, 10, 21],
                [5, 9, 22],
                [6, 9, 22],
                [7, 9, 22],
                [8, 9, 22],
                [9, 10, 21],
                [10, 10, 21],
                [11, 12, 19]
        ], 'S');
        line(10, 6, 10, 8, 'F');
        if (female) {
            points([[12, 7], [19, 7]], 'X');
            points([[11, 9], [12, 9], [20, 5], [20, 6]], 'Q');
        } else {
            points([[11, 9], [12, 10], [20, 5], [20, 6]], 'Q');
        }
        set(female ? 18 : 19, 10, 'F');
    });
}

function makeHeroFace() {
    return createNativeOverhaulSprite(({ line, points, set }) => {
        line(12, 6, 14, 6, 'X');
        line(17, 6, 19, 6, 'X');
        points([[13, 7], [18, 7]], 'Z');
        set(16, 8, 'F');
        points([[15, 10], [16, 10]], '@');
        set(17, 9, 'Q');
    });
}

function addHeroHairTexture(painter, shadePoints, highlightPoints) {
    painter.points(shadePoints, 'M');
    painter.points(highlightPoints, 'T');
}

function makeHeroHair(style) {
    if (style === 'bald') return createNativeOverhaulSprite(() => {});

    return createNativeOverhaulSprite(painter => {
        let spans = [];
        let shade = [];
        let highlight = [];

        switch (style) {
            case 'cropped':
                spans = [
                    [1, 14, 17],
                    [2, 12, 19],
                    [3, 10, 21],
                    [4, 9, 22],
                    [5, 9, 14],
                    [5, 17, 22],
                    [6, 9, 11],
                    [6, 20, 22],
                    [7, 9, 10],
                    [7, 21, 22]
                ];
                shade = [[12, 2], [10, 3], [10, 4], [10, 5], [10, 6]];
                highlight = [[18, 2], [20, 3], [21, 4], [20, 5], [21, 6]];
                break;
            case 'messy':
                spans = [
                    [0, 10, 12],
                    [0, 18, 20],
                    [1, 9, 14],
                    [1, 16, 22],
                    [2, 9, 22],
                    [3, 9, 22],
                    [4, 9, 22],
                    [5, 9, 14],
                    [5, 16, 19],
                    [5, 21, 22],
                    [6, 9, 11],
                    [6, 20, 22],
                    [7, 9, 10],
                    [7, 21, 22]
                ];
                shade = [[10, 2], [10, 3], [11, 4], [10, 5], [10, 6], [17, 3]];
                highlight = [[18, 1], [20, 2], [19, 3], [20, 4], [18, 5]];
                break;
            case 'spiky':
                spans = [
                    [0, 10, 10],
                    [0, 15, 15],
                    [0, 21, 21],
                    [1, 9, 11],
                    [1, 14, 16],
                    [1, 20, 22],
                    [2, 9, 22],
                    [3, 9, 22],
                    [4, 9, 22],
                    [5, 9, 13],
                    [5, 15, 17],
                    [5, 19, 22],
                    [6, 9, 11],
                    [6, 21, 22]
                ];
                shade = [[10, 2], [11, 3], [10, 4], [12, 5], [15, 2]];
                highlight = [[20, 2], [19, 3], [21, 4], [16, 5]];
                break;
            case 'long':
                spans = [
                    [1, 13, 18],
                    [2, 11, 20],
                    [3, 9, 22],
                    [4, 8, 23],
                    [5, 8, 23],
                    [6, 8, 12],
                    [6, 19, 23],
                    [7, 8, 11],
                    [7, 20, 23],
                    [8, 8, 10],
                    [8, 21, 23],
                    [9, 8, 10],
                    [9, 21, 23],
                    [10, 8, 11],
                    [10, 20, 23],
                    [11, 9, 11],
                    [11, 20, 22],
                    [12, 9, 10],
                    [12, 21, 22],
                    [13, 10, 11],
                    [13, 20, 21],
                    [14, 9, 10],
                    [14, 21, 22],
                    [15, 10, 10],
                    [15, 21, 21],
                    [16, 10, 10],
                    [16, 21, 21]
                ];
                shade = [[10, 3], [9, 4], [9, 7], [9, 10], [9, 12], [10, 14]];
                highlight = [[19, 2], [21, 4], [22, 7], [22, 10], [21, 13]];
                break;
            case 'bob':
                spans = [
                    [1, 13, 18],
                    [2, 11, 20],
                    [3, 9, 22],
                    [4, 8, 23],
                    [5, 8, 23],
                    [6, 8, 12],
                    [6, 19, 23],
                    [7, 8, 11],
                    [7, 20, 23],
                    [8, 8, 11],
                    [8, 21, 23],
                    [9, 8, 10],
                    [9, 21, 23],
                    [10, 9, 11],
                    [10, 20, 22],
                    [11, 9, 10],
                    [11, 21, 22],
                    [12, 10, 10],
                    [12, 21, 21]
                ];
                shade = [[10, 3], [9, 5], [9, 7], [9, 9], [10, 11]];
                highlight = [[19, 2], [21, 4], [22, 7], [22, 9], [21, 11]];
                break;
            case 'braid':
                spans = [
                    [1, 13, 18],
                    [2, 11, 20],
                    [3, 9, 22],
                    [4, 9, 22],
                    [5, 9, 13],
                    [5, 18, 23],
                    [6, 9, 11],
                    [6, 20, 24],
                    [7, 9, 10],
                    [7, 21, 24],
                    [8, 21, 24],
                    [9, 22, 24],
                    [10, 22, 24],
                    [11, 23, 25],
                    [12, 22, 24],
                    [13, 23, 25],
                    [14, 22, 24],
                    [15, 23, 25],
                    [16, 22, 24],
                    [17, 23, 25],
                    [18, 23, 24]
                ];
                shade = [[10, 3], [10, 4], [10, 5], [22, 8], [23, 12], [23, 16]];
                highlight = [[18, 2], [20, 3], [21, 4], [23, 6], [23, 10], [23, 14]];
                break;
            case 'mohawk':
                spans = [
                    [0, 15, 17],
                    [1, 14, 18],
                    [2, 13, 19],
                    [3, 11, 20],
                    [4, 10, 21],
                    [5, 9, 11],
                    [5, 14, 17],
                    [5, 20, 22],
                    [6, 9, 10],
                    [6, 21, 22],
                    [7, 9, 10],
                    [7, 21, 22]
                ];
                shade = [[15, 1], [14, 2], [12, 3], [10, 4], [10, 5], [9, 6]];
                highlight = [[17, 1], [18, 2], [18, 3], [19, 4], [16, 5], [22, 6]];
                break;
            case 'ponytail':
                spans = [
                    [1, 13, 18],
                    [2, 11, 20],
                    [3, 9, 22],
                    [4, 9, 23],
                    [5, 9, 13],
                    [5, 18, 24],
                    [6, 9, 11],
                    [6, 21, 25],
                    [7, 9, 10],
                    [7, 23, 26],
                    [8, 24, 26],
                    [9, 24, 26],
                    [10, 24, 26],
                    [11, 23, 26],
                    [12, 22, 25],
                    [13, 22, 25],
                    [14, 23, 25],
                    [15, 23, 24]
                ];
                shade = [[10, 3], [10, 4], [10, 5], [24, 8], [24, 11], [24, 14]];
                highlight = [[18, 2], [20, 3], [21, 4], [25, 6], [26, 9], [25, 12]];
                break;
            case 'undercut':
                spans = [
                    [0, 12, 16],
                    [1, 11, 19],
                    [2, 10, 21],
                    [3, 9, 22],
                    [4, 9, 22],
                    [5, 9, 16],
                    [5, 19, 22],
                    [6, 9, 11],
                    [6, 21, 22],
                    [7, 9, 10],
                    [7, 22, 22]
                ];
                shade = [[10, 2], [9, 3], [10, 4], [20, 5], [21, 6], [22, 7]];
                highlight = [[15, 1], [18, 2], [19, 3], [16, 4], [15, 5]];
                break;
            case 'topknot':
                spans = [
                    [0, 14, 18],
                    [1, 13, 19],
                    [2, 14, 18],
                    [3, 12, 20],
                    [4, 10, 21],
                    [5, 9, 22],
                    [6, 9, 13],
                    [6, 18, 22],
                    [7, 9, 10],
                    [7, 21, 22]
                ];
                shade = [[14, 1], [13, 4], [10, 5], [11, 6]];
                highlight = [[18, 1], [18, 4], [20, 5], [19, 6]];
                break;
            case 'waves':
                spans = [
                    [1, 12, 19],
                    [2, 10, 21],
                    [3, 8, 23],
                    [4, 8, 23],
                    [5, 8, 13],
                    [5, 18, 23],
                    [6, 7, 11],
                    [6, 20, 24],
                    [7, 7, 10],
                    [7, 21, 24],
                    [8, 8, 11],
                    [8, 20, 23],
                    [9, 7, 10],
                    [9, 21, 24],
                    [10, 8, 11],
                    [10, 20, 23],
                    [11, 7, 10],
                    [11, 21, 24],
                    [12, 8, 11],
                    [12, 20, 23],
                    [13, 9, 11],
                    [13, 20, 22],
                    [14, 10, 11],
                    [14, 20, 21]
                ];
                shade = [[10, 2], [9, 3], [9, 5], [8, 7], [9, 9], [8, 11], [10, 13]];
                highlight = [[19, 2], [21, 3], [22, 5], [23, 7], [22, 9], [23, 11], [21, 13]];
                break;
            case 'curly':
                spans = [
                    [0, 12, 14],
                    [0, 17, 19],
                    [1, 10, 21],
                    [2, 8, 23],
                    [3, 7, 24],
                    [4, 7, 24],
                    [5, 7, 13],
                    [5, 18, 24],
                    [6, 7, 11],
                    [6, 20, 24],
                    [7, 8, 10],
                    [7, 21, 23],
                    [8, 8, 10],
                    [8, 21, 23],
                    [9, 9, 11],
                    [9, 20, 22],
                    [10, 9, 10],
                    [10, 21, 22],
                    [11, 10, 10],
                    [11, 21, 21],
                    [12, 10, 10],
                    [12, 21, 21]
                ];
                shade = [[11, 1], [14, 2], [8, 3], [8, 5], [9, 8], [10, 10]];
                highlight = [[18, 1], [17, 2], [22, 3], [23, 5], [22, 8], [21, 10]];
                break;
            case 'halfup':
                spans = [
                    [0, 14, 18],
                    [1, 13, 19],
                    [2, 11, 20],
                    [3, 9, 22],
                    [4, 8, 23],
                    [5, 8, 13],
                    [5, 18, 23],
                    [6, 8, 11],
                    [6, 20, 23],
                    [7, 8, 10],
                    [7, 21, 23],
                    [8, 8, 10],
                    [8, 21, 23],
                    [9, 8, 11],
                    [9, 20, 23],
                    [10, 9, 11],
                    [10, 20, 22],
                    [11, 9, 10],
                    [11, 21, 22],
                    [12, 10, 10],
                    [12, 21, 21],
                    [13, 10, 10],
                    [13, 21, 21]
                ];
                shade = [[14, 1], [10, 3], [9, 5], [9, 8], [10, 11]];
                highlight = [[18, 1], [20, 3], [22, 5], [22, 8], [21, 11]];
                break;
            case 'slickback':
                spans = [
                    [0, 18, 21],
                    [1, 14, 22],
                    [2, 11, 23],
                    [3, 10, 24],
                    [4, 9, 23],
                    [5, 9, 12],
                    [5, 20, 23],
                    [6, 9, 10],
                    [6, 22, 23],
                    [7, 9, 9],
                    [7, 22, 22]
                ];
                shade = [[14, 1], [11, 2], [10, 3], [10, 4], [10, 5]];
                highlight = [[20, 0], [21, 1], [22, 2], [23, 3], [22, 4], [22, 5]];
                break;
            case 'locs':
                spans = [
                    [1, 12, 19],
                    [2, 10, 21],
                    [3, 9, 22],
                    [4, 8, 23],
                    [5, 8, 13],
                    [5, 18, 23],
                    [6, 8, 11],
                    [6, 20, 23],
                    [7, 7, 9],
                    [7, 11, 12],
                    [7, 19, 20],
                    [7, 22, 24],
                    [8, 7, 9],
                    [8, 11, 12],
                    [8, 19, 20],
                    [8, 22, 24],
                    [9, 8, 9],
                    [9, 11, 12],
                    [9, 19, 20],
                    [9, 22, 23],
                    [10, 8, 9],
                    [10, 11, 12],
                    [10, 19, 20],
                    [10, 22, 23],
                    [11, 8, 9],
                    [11, 12, 12],
                    [11, 19, 19],
                    [11, 22, 23],
                    [12, 9, 9],
                    [12, 12, 12],
                    [12, 19, 19],
                    [12, 22, 22],
                    [13, 9, 9],
                    [13, 12, 12],
                    [13, 19, 19],
                    [13, 22, 22],
                    [14, 10, 10],
                    [14, 12, 12],
                    [14, 19, 19],
                    [14, 21, 21],
                    [15, 10, 10],
                    [15, 21, 21]
                ];
                shade = [[10, 2], [9, 4], [8, 7], [11, 9], [9, 12], [12, 14]];
                highlight = [[19, 2], [22, 4], [23, 7], [20, 9], [22, 12], [19, 14]];
                break;
            case 'twintails':
                spans = [
                    [1, 13, 18],
                    [2, 11, 20],
                    [3, 9, 22],
                    [4, 9, 22],
                    [5, 8, 13],
                    [5, 18, 23],
                    [6, 6, 9],
                    [6, 22, 25],
                    [7, 5, 8],
                    [7, 23, 26],
                    [8, 4, 8],
                    [8, 23, 27],
                    [9, 4, 8],
                    [9, 23, 27],
                    [10, 5, 9],
                    [10, 22, 26],
                    [11, 5, 9],
                    [11, 22, 26],
                    [12, 5, 8],
                    [12, 23, 26],
                    [13, 6, 8],
                    [13, 23, 25],
                    [14, 7, 8],
                    [14, 23, 24],
                    [15, 8, 8],
                    [15, 23, 23],
                    [16, 8, 8],
                    [16, 23, 23]
                ];
                shade = [[10, 3], [9, 4], [7, 7], [6, 9], [7, 11], [7, 14]];
                highlight = [[19, 2], [21, 4], [24, 7], [25, 9], [24, 11], [24, 14]];
                break;
            default:
                break;
        }

        paintOutlinedOverhaulShape(painter, spans, 'H');
        addHeroHairTexture(painter, shade, highlight);
    });
}

function makeHeroSampleOutfit(style) {
    return createNativeOverhaulSprite(painter => {
        const { line, points, rect, set } = painter;

        switch (style) {
            case 'apron':
                line(11, 13, 12, 17, 'l', 2);
                line(20, 13, 19, 17, 'l', 2);
                paintOutlinedOverhaulShape(painter, [
                    [16, 12, 19],
                    [17, 10, 21],
                    [18, 10, 21],
                    [19, 10, 21],
                    [20, 10, 21],
                    [21, 10, 21],
                    [22, 10, 21],
                    [23, 11, 20],
                    [24, 12, 19]
                ], 'b');
                line(10, 18, 21, 18, 'l');
                points([[13, 20], [14, 20], [17, 22], [18, 22]], 'm');
                set(18, 16, 'W');
                break;
            case 'jerkin':
                paintOutlinedOverhaulShape(painter, [
                    [13, 11, 20],
                    [14, 10, 21],
                    [15, 10, 21],
                    [16, 10, 21],
                    [17, 10, 21],
                    [18, 10, 21],
                    [19, 10, 21],
                    [20, 10, 21],
                    [21, 11, 20],
                    [22, 11, 20]
                ], 'l');
                paintOutlinedOverhaulShape(painter, [
                    [14, 7, 10],
                    [15, 7, 10],
                    [16, 8, 10]
                ], 's');
                paintOutlinedOverhaulShape(painter, [
                    [14, 21, 24],
                    [15, 21, 24],
                    [16, 21, 23]
                ], 's');
                line(15, 14, 15, 21, 'd');
                points([[16, 15], [16, 17], [16, 19]], 'N');
                line(11, 20, 20, 20, 'd');
                break;
            case 'scout':
                paintOutlinedOverhaulShape(painter, [
                    [12, 11, 20],
                    [13, 9, 22],
                    [14, 8, 22],
                    [15, 8, 22],
                    [16, 8, 21],
                    [17, 8, 21],
                    [18, 8, 20],
                    [19, 8, 20],
                    [20, 8, 19],
                    [21, 8, 19],
                    [22, 8, 18],
                    [23, 8, 17],
                    [24, 8, 16],
                    [25, 8, 14]
                ], 'q');
                line(10, 14, 17, 22, 'e');
                line(19, 13, 19, 21, 'l');
                points([[20, 17], [20, 20]], 'h');
                rect(22, 21, 3, 3, 'Y');
                set(23, 22, '.');
                break;
            case 'brewer':
                paintOutlinedOverhaulShape(painter, [
                    [13, 11, 20],
                    [14, 9, 22],
                    [15, 9, 22],
                    [16, 10, 21],
                    [17, 10, 21],
                    [18, 10, 21],
                    [19, 10, 21],
                    [20, 10, 21],
                    [21, 10, 21],
                    [22, 10, 15],
                    [22, 16, 21],
                    [23, 10, 15],
                    [23, 16, 21],
                    [24, 10, 14],
                    [24, 17, 21],
                    [25, 10, 14],
                    [25, 17, 21]
                ], 'U');
                points([[10, 14], [10, 15], [21, 14], [21, 15]], 'U');
                line(15, 14, 15, 21, 'u');
                line(16, 21, 16, 25, 'X');
                points([[12, 14], [19, 14], [11, 18], [20, 18]], 'r');
                line(11, 20, 20, 20, 'Y');
                points([[11, 24], [20, 24]], 'Y');
                rect(17, 17, 4, 5, '^');
                paintOutlinedOverhaulShape(painter, [
                    [16, 18, 19],
                    [17, 17, 20],
                    [18, 17, 20],
                    [19, 18, 19]
                ], 'm', 'N');
                set(18, 17, 'W');
                break;
            default:
                break;
        }
    });
}

Object.assign(CorePlayerSampleMatrices, {
    body_core_male: makeHeroBody('male'),
    body_core_female: makeHeroBody('female'),
    face_core: makeHeroFace(),
    hair_core_cropped: makeHeroHair('cropped'),
    hair_core_braid: makeHeroHair('braid'),
    hair_core_waves: makeHeroHair('waves'),
    hair_core_curly: makeHeroHair('curly'),
    hair_core_halfup: makeHeroHair('halfup'),
    hair_core_slickback: makeHeroHair('slickback'),
    hair_core_locs: makeHeroHair('locs'),
    hair_core_topknot: makeHeroHair('topknot'),
    hair_core_messy: makeHeroHair('messy'),
    hair_core_spiky: makeHeroHair('spiky'),
    hair_core_long: makeHeroHair('long'),
    hair_core_bob: makeHeroHair('bob'),
    hair_core_mohawk: makeHeroHair('mohawk'),
    hair_core_ponytail: makeHeroHair('ponytail'),
    hair_core_undercut: makeHeroHair('undercut'),
    hair_core_twintails: makeHeroHair('twintails'),
    hair_core_bald: makeHeroHair('bald'),
    outfit_core_apron: makeHeroSampleOutfit('apron'),
    outfit_core_jerkin: makeHeroSampleOutfit('jerkin'),
    outfit_core_scout: makeHeroSampleOutfit('scout'),
    outfit_core_brewer: makeHeroSampleOutfit('brewer')
});

const CorePlayerHairStyleOptions = Object.freeze([
    { runtimeId: 'hair_messy', sampleId: 'hair_core_messy', label: 'Messy' },
    { runtimeId: 'hair_spiky', sampleId: 'hair_core_spiky', label: 'Spiky' },
    { runtimeId: 'hair_long', sampleId: 'hair_core_long', label: 'Long' },
    { runtimeId: 'hair_bob', sampleId: 'hair_core_bob', label: 'Bob' },
    { runtimeId: 'hair_braid', sampleId: 'hair_core_braid', label: 'Braid' },
    { runtimeId: 'hair_buzzcut', sampleId: 'hair_core_cropped', label: 'Buzzcut' },
    { runtimeId: 'hair_mohawk', sampleId: 'hair_core_mohawk', label: 'Mohawk' },
    { runtimeId: 'hair_ponytail', sampleId: 'hair_core_ponytail', label: 'Ponytail' },
    { runtimeId: 'hair_undercut', sampleId: 'hair_core_undercut', label: 'Undercut' },
    { runtimeId: 'hair_topknot', sampleId: 'hair_core_topknot', label: 'Topknot' },
    { runtimeId: 'hair_curly', sampleId: 'hair_core_curly', label: 'Curly' },
    { runtimeId: 'hair_twintails', sampleId: 'hair_core_twintails', label: 'Twin Tails' },
    { runtimeId: 'hair_waves', sampleId: 'hair_core_waves', label: 'Wavy' },
    { runtimeId: 'hair_halfup', sampleId: 'hair_core_halfup', label: 'Half-Up' },
    { runtimeId: 'hair_slickback', sampleId: 'hair_core_slickback', label: 'Slickback' },
    { runtimeId: 'hair_locs', sampleId: 'hair_core_locs', label: 'Locs' },
    { runtimeId: 'hair_bald', sampleId: 'hair_core_bald', label: 'Bald' }
]);

Object.assign(SpriteMatrices, {
    body_male: CorePlayerSampleMatrices.body_core_male,
    body_female: CorePlayerSampleMatrices.body_core_female,
    eyes_blue: CorePlayerSampleMatrices.face_core,
    eyes_green: CorePlayerSampleMatrices.face_core,
    eyes_brown: CorePlayerSampleMatrices.face_core,
    eyes_red: CorePlayerSampleMatrices.face_core,
    eyes_purple: CorePlayerSampleMatrices.face_core,
    eyes_gold: CorePlayerSampleMatrices.face_core,
    eyes_grey: CorePlayerSampleMatrices.face_core,
    eyes_black: CorePlayerSampleMatrices.face_core,
    eyes_white: CorePlayerSampleMatrices.face_core
});

CorePlayerHairStyleOptions.forEach(({ runtimeId, sampleId }) => {
    SpriteMatrices[runtimeId] = CorePlayerSampleMatrices[sampleId];
});

const CorePlayerSamplePresets = [
    {
        id: 'tavern-warden',
        name: 'Tavern Warden',
        note: 'Apron, brass badge, sturdy silhouette',
        body: 'body_core_male',
        hair: 'hair_core_cropped',
        outfit: 'outfit_core_apron',
        appearance: {
            gender: 'male',
            skin: 'tan',
            hairColor: 'auburn',
            eyes: 'eyes_green',
            shirtColor: 'claret',
            pantsColor: 'charcoal',
            bootsColor: 'suede'
        }
    },
    {
        id: 'hearthblade',
        name: 'Hearthblade',
        note: 'Braided profile, leather jerkin, iron shoulders',
        body: 'body_core_female',
        hair: 'hair_core_braid',
        outfit: 'outfit_core_jerkin',
        appearance: {
            gender: 'female',
            skin: 'deep',
            hairColor: 'raven',
            eyes: 'eyes_gold',
            shirtColor: 'burgundy',
            pantsColor: 'maroon',
            bootsColor: 'black'
        }
    },
    {
        id: 'cellar-scout',
        name: 'Cellar Scout',
        note: 'Wavy hair, moss cloak, key-ring detail',
        body: 'body_core_male',
        hair: 'hair_core_waves',
        outfit: 'outfit_core_scout',
        appearance: {
            gender: 'male',
            skin: 'pale',
            hairColor: 'straw',
            eyes: 'eyes_blue',
            shirtColor: 'moss',
            pantsColor: 'umber',
            bootsColor: 'leather'
        }
    },
    {
        id: 'runebrewer',
        name: 'Runebrewer',
        note: 'Topknot, split coat, luminous flask',
        body: 'body_core_female',
        hair: 'hair_core_topknot',
        outfit: 'outfit_core_brewer',
        appearance: {
            gender: 'female',
            skin: 'light',
            hairColor: 'silver',
            eyes: 'eyes_purple',
            shirtColor: 'teal',
            pantsColor: 'navy',
            bootsColor: 'oxblood'
        }
    }
];

function getCorePlayerSamplePreset(presetOrId) {
    if (typeof presetOrId === 'object' && presetOrId) return presetOrId;
    return CorePlayerSamplePresets.find(preset => preset.id === presetOrId)
        || CorePlayerSamplePresets[0];
}

function drawCorePlayerSample(context, presetOrId, size = CORE_PLAYER_SAMPLE_SIZE) {
    const preset = getCorePlayerSamplePreset(presetOrId);
    const originalAppearance = { ...player.appearance };

    Object.assign(player.appearance, preset.appearance);
    applyCorePlayerSamplePalette(player.appearance);

    [
        preset.body,
        'face_core',
        preset.hair,
        preset.outfit
    ].forEach(spriteId => {
        if (CorePlayerSampleMatrices[spriteId]) {
            drawProceduralSprite(
                context,
                CorePlayerSampleMatrices[spriteId],
                0,
                0,
                size
            );
        }
    });

    Object.assign(player.appearance, originalAppearance);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CORE_PLAYER_SAMPLE_SIZE,
        buildCorePlayerSampleSprite,
        shiftCoreSampleColor,
        applyCorePlayerSamplePalette,
        createNativeOverhaulSprite,
        PLAYER_SPRITE_ANCHORS,
        CorePlayerSampleMatrices,
        CorePlayerHairStyleOptions,
        CorePlayerSamplePresets,
        drawCorePlayerSample
    };
}
