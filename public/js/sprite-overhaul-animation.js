// Native 32x32 side-facing animation studies for the player paper doll.

const SIDE_PLAYER_ANIMATION_SIZE = 32;
const SIDE_PLAYER_PROFILE_SHOULDER_X = 13;
const SIDE_PLAYER_COMBAT_FAR_LEG = Object.freeze([
    [17, 21],
    [19, 25],
    [20, 30],
    [22, 31]
]);
const SIDE_PLAYER_COMBAT_NEAR_LEG = Object.freeze([
    [14, 21],
    [13, 25],
    [12, 30],
    [14, 31]
]);

const SidePlayerAnimationClips = Object.freeze({
    idle: Object.freeze({
        label: 'Idle',
        fps: 2,
        loop: true,
        actionFrame: null,
        frames: Object.freeze(['idle_a', 'idle_b'])
    }),
    walk: Object.freeze({
        label: 'Walk',
        fps: 7,
        loop: true,
        actionFrame: null,
        frames: Object.freeze(['walk_a', 'walk_b', 'walk_c', 'walk_d'])
    }),
    slash: Object.freeze({
        label: 'Sword',
        fps: 8,
        loop: false,
        actionFrame: 2,
        frames: Object.freeze(['slash_a', 'slash_b', 'slash_c', 'slash_d'])
    }),
    bash: Object.freeze({
        label: 'Mace',
        fps: 7,
        loop: false,
        actionFrame: 2,
        frames: Object.freeze(['bash_a', 'bash_b', 'bash_c', 'bash_d'])
    }),
    shoot: Object.freeze({
        label: 'Bow',
        fps: 7,
        loop: false,
        actionFrame: 3,
        frames: Object.freeze(['shoot_a', 'shoot_b', 'shoot_c', 'shoot_d'])
    }),
    cast: Object.freeze({
        label: 'Cast',
        fps: 6,
        loop: false,
        actionFrame: 3,
        frames: Object.freeze(['cast_a', 'cast_b', 'cast_c', 'cast_d'])
    })
});

const SidePlayerPoseDefinitions = Object.freeze({
    idle_a: {
        bobY: 0,
        stance: 'profile',
        farArm: [[14, 14], [14, 18], [15, 22]],
        nearArm: [[14, 14], [14, 18], [15, 22]],
        farLeg: [[16, 21], [17, 25], [17, 29], [19, 31]],
        nearLeg: [[14, 21], [13, 25], [13, 29], [15, 31]],
        weapon: { kind: 'sword', grip: [15, 22], tip: [21, 15] }
    },
    idle_b: {
        bobY: 0,
        stance: 'profile',
        farArm: [[14, 14], [14, 18], [15, 22]],
        nearArm: [[14, 14], [15, 18], [16, 22]],
        farLeg: [[16, 21], [17, 25], [17, 29], [19, 31]],
        nearLeg: [[14, 21], [13, 25], [13, 29], [15, 31]],
        weapon: { kind: 'sword', grip: [16, 22], tip: [22, 15] }
    },
    walk_a: {
        bobY: 0,
        preserveLegDepth: true,
        farArm: [[13, 14], [16, 17], [19, 19]],
        nearArm: [[18, 14], [13, 18], [13, 21]],
        farLeg: [[14, 21], [12, 25], [10, 29], [13, 31]],
        nearLeg: [[17, 21], [19, 25], [21, 29], [24, 31]],
        weapon: { kind: 'sword', grip: [13, 21], tip: [19, 14] }
    },
    walk_b: {
        bobY: 0,
        preserveLegDepth: true,
        farArm: [[13, 14], [14, 18], [16, 21]],
        nearArm: [[18, 14], [16, 18], [19, 21]],
        farLeg: [[14, 21], [14, 25], [14, 30], [16, 31]],
        nearLeg: [[17, 21], [18, 25], [18, 30], [20, 31]],
        weapon: { kind: 'sword', grip: [19, 21], tip: [25, 14] }
    },
    walk_c: {
        bobY: 0,
        preserveLegDepth: true,
        farArm: [[13, 14], [11, 18], [9, 20]],
        nearArm: [[18, 14], [21, 17], [24, 19]],
        farLeg: [[14, 21], [17, 25], [20, 29], [23, 31]],
        nearLeg: [[17, 21], [15, 25], [12, 29], [15, 31]],
        weapon: { kind: 'sword', grip: [24, 19], tip: [27, 12] }
    },
    walk_d: {
        bobY: 0,
        preserveLegDepth: true,
        farArm: [[13, 14], [13, 18], [14, 21]],
        nearArm: [[18, 14], [19, 18], [21, 21]],
        farLeg: [[17, 21], [18, 25], [18, 30], [20, 31]],
        nearLeg: [[14, 21], [14, 25], [14, 30], [16, 31]],
        weapon: { kind: 'sword', grip: [21, 21], tip: [26, 14] }
    },
    slash_a: {
        bobY: 0,
        farArm: [[13, 14], [17, 17], [20, 19]],
        nearArm: [[18, 14], [16, 13], [14, 12]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [14, 12], tip: [7, 6] }
    },
    slash_b: {
        bobY: 0,
        farArm: [[13, 14], [17, 16], [20, 18]],
        nearArm: [[18, 14], [20, 12], [20, 10]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [20, 10], tip: [17, 2] }
    },
    slash_c: {
        bobY: 0,
        farArm: [[13, 14], [18, 16], [21, 18]],
        nearArm: [[18, 14], [21, 14], [24, 16]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [24, 16], tip: [31, 11] }
    },
    slash_d: {
        bobY: 0,
        farArm: [[13, 14], [17, 17], [20, 19]],
        nearArm: [[18, 14], [18, 17], [22, 20]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [22, 20], tip: [28, 25] }
    },
    bash_a: {
        bobY: 0,
        farArm: [[13, 14], [16, 18], [19, 20]],
        nearArm: [[18, 14], [17, 18], [20, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'mace', grip: [20, 21], head: [25, 27] }
    },
    bash_b: {
        bobY: 0,
        farArm: [[13, 14], [17, 15], [19, 13]],
        nearArm: [[18, 14], [18, 11], [17, 9]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'mace', grip: [17, 9], head: [12, 3] }
    },
    bash_c: {
        bobY: 0,
        farArm: [[13, 14], [18, 15], [21, 17]],
        nearArm: [[18, 14], [21, 13], [23, 15]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'mace', grip: [23, 15], head: [29, 20] }
    },
    bash_d: {
        bobY: 0,
        farArm: [[13, 14], [17, 17], [20, 19]],
        nearArm: [[18, 14], [17, 17], [21, 20]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'mace', grip: [21, 20], head: [25, 26] }
    },
    shoot_a: {
        bobY: 0,
        farArm: [[13, 14], [17, 17], [21, 19]],
        nearArm: [[18, 14], [16, 18], [19, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'bow',
            grip: [21, 19],
            top: [23, 10],
            bottom: [23, 27],
            draw: [20, 19],
            arrowTip: [28, 19]
        }
    },
    shoot_b: {
        bobY: 0,
        farArm: [[13, 14], [18, 16], [23, 17]],
        nearArm: [[18, 14], [20, 16], [18, 17]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'bow',
            grip: [23, 17],
            top: [24, 8],
            bottom: [24, 26],
            draw: [18, 17],
            arrowTip: [29, 17]
        }
    },
    shoot_c: {
        bobY: 0,
        farArm: [[13, 14], [19, 15], [24, 16]],
        nearArm: [[18, 14], [16, 15], [14, 16]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'bow',
            grip: [24, 16],
            top: [24, 7],
            bottom: [24, 25],
            draw: [14, 16],
            arrowTip: [30, 16]
        }
    },
    shoot_d: {
        bobY: 0,
        farArm: [[13, 14], [19, 15], [24, 16]],
        nearArm: [[18, 14], [19, 15], [21, 16]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'bow',
            grip: [24, 16],
            top: [24, 7],
            bottom: [24, 25],
            draw: [24, 16],
            arrowStart: [26, 16],
            arrowTip: [31, 16]
        }
    },
    cast_a: {
        bobY: 0,
        farArm: [[13, 14], [13, 18], [15, 21]],
        nearArm: [[18, 14], [17, 18], [20, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'staff',
            grip: [20, 21],
            top: [23, 5],
            bottom: [18, 30],
            glow: 0
        }
    },
    cast_b: {
        bobY: 0,
        farArm: [[13, 14], [18, 15], [22, 15]],
        nearArm: [[18, 14], [20, 15], [20, 17]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'staff',
            grip: [20, 17],
            top: [22, 3],
            bottom: [19, 30],
            glow: 1
        }
    },
    cast_c: {
        bobY: 0,
        farArm: [[13, 14], [19, 13], [24, 13]],
        nearArm: [[18, 14], [19, 13], [19, 14]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'staff',
            grip: [19, 14],
            top: [19, 2],
            bottom: [20, 30],
            glow: 2
        }
    },
    cast_d: {
        bobY: 0,
        farArm: [[13, 14], [19, 12], [24, 12]],
        nearArm: [[18, 14], [20, 13], [21, 14]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'staff',
            grip: [21, 14],
            top: [24, 2],
            bottom: [19, 30],
            glow: 3
        }
    }
});

const SidePlayerHairStyleProfiles = Object.freeze({
    hair_messy: {
        front: {
            spans: [
                [0, 12, 13], [0, 18, 19],
                [1, 9, 15], [1, 17, 21],
                [2, 8, 21],
                [3, 8, 20],
                [4, 9, 19],
                [5, 9, 15], [5, 18, 19],
                [6, 9, 13],
                [7, 9, 11]
            ],
            shade: [[9, 2], [9, 3], [10, 4], [10, 6], [14, 2]],
            highlight: [[17, 1], [19, 2], [18, 3], [17, 4]]
        }
    },
    hair_spiky: {
        front: {
            spans: [
                [0, 9, 9], [0, 13, 13], [0, 17, 17], [0, 21, 21],
                [1, 8, 11], [1, 12, 15], [1, 16, 19], [1, 20, 22],
                [2, 8, 22],
                [3, 8, 21],
                [4, 9, 19],
                [5, 9, 15], [5, 18, 20],
                [6, 9, 13],
                [7, 9, 11]
            ],
            shade: [[9, 2], [9, 3], [10, 4], [10, 6], [14, 2]],
            highlight: [[18, 2], [20, 2], [18, 3], [17, 4]]
        }
    },
    hair_long: {
        back: {
            spans: [
                [3, 8, 14],
                [4, 7, 14],
                [5, 6, 14],
                [6, 6, 13],
                [7, 7, 13],
                [8, 6, 13],
                [9, 6, 13],
                [10, 7, 13],
                [11, 6, 13],
                [12, 6, 13],
                [13, 7, 13],
                [14, 6, 13],
                [15, 7, 13],
                [16, 7, 13],
                [17, 8, 12],
                [18, 9, 11]
            ],
            shade: [[7, 5], [7, 8], [7, 11], [7, 14], [9, 18]],
            highlight: [[11, 4], [11, 7], [11, 10], [11, 13], [11, 16]]
        },
        front: {
            spans: [
                [1, 12, 18],
                [2, 10, 20],
                [3, 9, 20],
                [4, 9, 19],
                [5, 9, 15],
                [6, 9, 13],
                [7, 9, 11],
                [8, 9, 12],
                [9, 9, 12],
                [10, 9, 12],
                [11, 9, 12],
                [12, 9, 12],
                [13, 9, 12],
                [14, 9, 12],
                [15, 10, 12],
                [16, 10, 11]
            ],
            shade: [[10, 3], [10, 5], [10, 6]],
            highlight: [[17, 2], [19, 3], [17, 4]]
        }
    },
    hair_bob: {
        back: {
            spans: [
                [3, 7, 14],
                [4, 7, 14],
                [5, 7, 14],
                [6, 7, 13],
                [7, 7, 13],
                [8, 7, 13],
                [9, 7, 13],
                [10, 7, 13],
                [11, 8, 13],
                [12, 8, 12],
                [13, 9, 12]
            ],
            shade: [[8, 5], [8, 8], [8, 11]],
            highlight: [[11, 4], [11, 7], [11, 10]]
        },
        front: {
            spans: [
                [1, 12, 18],
                [2, 10, 20],
                [3, 9, 20],
                [4, 9, 19],
                [5, 9, 15],
                [6, 9, 13],
                [7, 9, 11],
                [8, 9, 12],
                [9, 9, 12],
                [10, 9, 12],
                [11, 9, 12],
                [12, 10, 11]
            ],
            shade: [[10, 3], [10, 5]],
            highlight: [[17, 2], [18, 3], [17, 4]]
        }
    },
    hair_braid: {
        back: {
            spans: [
                [4, 7, 13],
                [5, 6, 12],
                [6, 6, 11],
                [7, 6, 10],
                [8, 7, 10],
                [9, 7, 9],
                [10, 6, 9],
                [11, 6, 8],
                [12, 7, 9],
                [13, 7, 9],
                [14, 6, 8],
                [15, 6, 8],
                [16, 7, 9],
                [17, 7, 9],
                [18, 8, 9],
                [19, 8, 8]
            ],
            shade: [[7, 6], [7, 10], [7, 14], [8, 17]],
            highlight: [[9, 7], [8, 12], [8, 16]]
        },
        front: {
            spans: [
                [1, 13, 18],
                [2, 11, 20],
                [3, 9, 20],
                [4, 9, 18],
                [5, 9, 14],
                [6, 9, 12],
                [7, 9, 11]
            ],
            shade: [[10, 3], [10, 5]],
            highlight: [[17, 2], [18, 3]]
        }
    },
    hair_buzzcut: {
        front: {
            spans: [
                [1, 14, 18],
                [2, 12, 20],
                [3, 11, 20],
                [4, 10, 18],
                [5, 10, 14],
                [6, 10, 12]
            ],
            shade: [[11, 3], [10, 4], [11, 5]],
            highlight: [[17, 2], [19, 3], [17, 4]]
        }
    },
    hair_mohawk: {
        front: {
            spans: [
                [0, 10, 11], [0, 14, 15], [0, 18, 19],
                [1, 9, 12], [1, 13, 16], [1, 17, 20],
                [2, 9, 20],
                [3, 10, 20],
                [4, 11, 18],
                [5, 10, 14],
                [6, 10, 12]
            ],
            shade: [[10, 2], [11, 3], [11, 4], [10, 5], [11, 6]],
            highlight: [[19, 2], [18, 3], [17, 4], [13, 5]]
        }
    },
    hair_ponytail: {
        back: {
            spans: [
                [4, 7, 13],
                [5, 5, 12],
                [6, 3, 10],
                [7, 2, 9],
                [8, 3, 8],
                [9, 3, 8],
                [10, 4, 9],
                [11, 5, 10],
                [12, 5, 9],
                [13, 6, 9],
                [14, 7, 9],
                [15, 8, 9]
            ],
            shade: [[4, 7], [4, 9], [6, 12]],
            highlight: [[7, 6], [5, 8], [7, 11], [8, 14]]
        },
        front: {
            spans: [
                [1, 13, 18],
                [2, 11, 20],
                [3, 9, 20],
                [4, 9, 18],
                [5, 9, 14],
                [6, 9, 12],
                [7, 9, 11]
            ],
            shade: [[10, 3], [10, 5]],
            highlight: [[17, 2], [18, 3]]
        }
    },
    hair_undercut: {
        front: {
            spans: [
                [0, 12, 15],
                [1, 10, 19],
                [2, 10, 21],
                [3, 11, 20],
                [4, 12, 18]
            ],
            shade: [
                [11, 2], [12, 3],
                [10, 5], [10, 6], [11, 6], [10, 7], [11, 7]
            ],
            highlight: [[17, 1], [19, 2], [18, 3]]
        }
    },
    hair_topknot: {
        front: {
            spans: [
                [0, 9, 12],
                [1, 8, 13],
                [2, 8, 14],
                [3, 9, 17],
                [4, 9, 19],
                [5, 9, 18],
                [6, 9, 14],
                [7, 9, 12],
                [8, 9, 11]
            ],
            shade: [[9, 1], [10, 3], [10, 5], [10, 7]],
            highlight: [[12, 1], [14, 2], [17, 4], [17, 5]]
        }
    },
    hair_curly: {
        back: {
            spans: [
                [2, 7, 14],
                [3, 6, 15],
                [4, 6, 14],
                [5, 6, 14],
                [6, 6, 13],
                [7, 7, 13],
                [8, 6, 12],
                [9, 7, 13],
                [10, 7, 12],
                [11, 8, 13],
                [12, 8, 12],
                [13, 9, 11]
            ],
            shade: [[7, 4], [7, 7], [7, 10], [9, 12]],
            highlight: [[11, 3], [11, 6], [11, 9], [11, 11]]
        },
        front: {
            spans: [
                [0, 10, 12], [0, 15, 17],
                [1, 8, 20],
                [2, 7, 21],
                [3, 7, 21],
                [4, 7, 20],
                [5, 8, 16], [5, 18, 20],
                [6, 8, 14],
                [7, 8, 12],
                [8, 9, 11],
                [9, 8, 11],
                [10, 9, 12],
                [11, 8, 11],
                [12, 9, 11]
            ],
            shade: [[8, 2], [8, 4], [9, 6], [10, 7], [14, 2]],
            highlight: [[18, 2], [19, 3], [18, 4], [16, 3]]
        }
    },
    hair_twintails: {
        back: {
            spans: [
                [4, 7, 13],
                [5, 5, 12],
                [6, 3, 10],
                [7, 2, 9],
                [8, 2, 8],
                [9, 3, 9],
                [10, 5, 10],
                [11, 6, 10],
                [12, 5, 10],
                [13, 4, 9],
                [14, 4, 9],
                [15, 5, 10],
                [16, 6, 10],
                [17, 7, 10],
                [18, 8, 9]
            ],
            shade: [[3, 7], [4, 9], [5, 14], [7, 17]],
            highlight: [[7, 6], [6, 8], [8, 12], [7, 15]]
        },
        front: {
            spans: [
                [1, 13, 18],
                [2, 11, 20],
                [3, 9, 20],
                [4, 9, 18],
                [5, 9, 14],
                [6, 9, 12],
                [7, 9, 11]
            ],
            shade: [[10, 3], [10, 5]],
            highlight: [[17, 2], [18, 3]]
        }
    },
    hair_waves: {
        back: {
            spans: [
                [2, 8, 14],
                [3, 6, 14],
                [4, 5, 14],
                [5, 5, 13],
                [6, 6, 13],
                [7, 5, 12],
                [8, 5, 13],
                [9, 6, 13],
                [10, 5, 12],
                [11, 6, 13],
                [12, 6, 13],
                [13, 7, 13],
                [14, 8, 12],
                [15, 9, 11]
            ],
            shade: [[6, 4], [6, 7], [6, 10], [7, 13]],
            highlight: [[11, 3], [11, 6], [11, 9], [11, 12], [10, 14]]
        },
        front: {
            spans: [
                [1, 12, 19],
                [2, 10, 21],
                [3, 8, 21],
                [4, 8, 20],
                [5, 8, 15],
                [6, 8, 13],
                [7, 8, 11],
                [8, 8, 12],
                [9, 9, 12],
                [10, 8, 12],
                [11, 9, 13],
                [12, 9, 13],
                [13, 10, 12],
                [14, 10, 11]
            ],
            shade: [[9, 3], [9, 5], [9, 6]],
            highlight: [[18, 2], [20, 3], [18, 4]]
        }
    },
    hair_halfup: {
        back: {
            spans: [
                [0, 8, 9],
                [1, 7, 10],
                [2, 8, 11],
                [3, 8, 14],
                [4, 6, 14],
                [5, 6, 13],
                [6, 6, 13],
                [7, 6, 13],
                [8, 6, 13],
                [9, 6, 13],
                [10, 6, 13],
                [11, 6, 13],
                [12, 7, 13],
                [13, 7, 12],
                [14, 8, 12],
                [15, 9, 11]
            ],
            shade: [[8, 2], [7, 4], [7, 7], [7, 10], [8, 13]],
            highlight: [[10, 2], [11, 3], [11, 6], [11, 9], [11, 12]]
        },
        front: {
            spans: [
                [0, 12, 15],
                [1, 11, 17],
                [2, 10, 20],
                [3, 9, 20],
                [4, 9, 19],
                [5, 9, 15],
                [6, 9, 13],
                [7, 9, 11],
                [8, 9, 12],
                [9, 9, 12],
                [10, 9, 12],
                [11, 9, 12],
                [12, 9, 12],
                [13, 10, 11]
            ],
            shade: [[12, 1], [10, 3], [10, 5]],
            highlight: [[15, 1], [18, 2], [18, 4]]
        }
    },
    hair_slickback: {
        front: {
            spans: [
                [0, 8, 11],
                [1, 7, 15],
                [2, 8, 20],
                [3, 9, 20],
                [4, 9, 18],
                [5, 9, 14],
                [6, 9, 12],
                [7, 9, 11]
            ],
            shade: [[8, 2], [9, 3], [10, 4], [10, 6]],
            highlight: [[13, 1], [17, 2], [18, 3]]
        }
    },
    hair_locs: {
        back: {
            spans: [
                [3, 7, 14],
                [4, 5, 14],
                [5, 4, 13],
                [6, 3, 13],
                [7, 3, 5], [7, 7, 9], [7, 11, 13],
                [8, 3, 5], [8, 7, 9], [8, 11, 13],
                [9, 3, 5], [9, 7, 9], [9, 11, 13],
                [10, 3, 5], [10, 7, 9], [10, 11, 13],
                [11, 3, 5], [11, 7, 9], [11, 11, 13],
                [12, 3, 5], [12, 7, 9], [12, 11, 13],
                [13, 3, 5], [13, 7, 9], [13, 11, 13],
                [14, 3, 5], [14, 7, 9], [14, 11, 13],
                [15, 3, 5], [15, 7, 9], [15, 11, 13],
                [16, 4, 6], [16, 7, 9], [16, 11, 13],
                [17, 8, 9], [17, 12, 13]
            ],
            shade: [[4, 6], [4, 10], [8, 16], [12, 17]],
            highlight: [[8, 5], [8, 9], [8, 13], [12, 16]]
        },
        front: {
            spans: [
                [1, 12, 19],
                [2, 10, 21],
                [3, 9, 20],
                [4, 8, 19],
                [5, 8, 15],
                [6, 8, 13],
                [7, 8, 11],
                [8, 8, 11],
                [9, 8, 11],
                [10, 8, 11],
                [11, 8, 11],
                [12, 8, 11],
                [13, 8, 11],
                [14, 9, 11],
                [15, 9, 10]
            ],
            shade: [[9, 3], [9, 5], [9, 6]],
            highlight: [[18, 2], [18, 3], [17, 4]]
        }
    },
    hair_bald: {}
});

function makeSidePlayerHairLayer(layerDefinition = {}) {
    return createNativeOverhaulSprite(painter => {
        const spans = layerDefinition.spans || [];
        if (spans.length) {
            paintOutlinedOverhaulShape(painter, spans, 'H');
        }
        painter.points(layerDefinition.shade || [], 'M');
        painter.points(layerDefinition.highlight || [], 'T');
    });
}

const SidePlayerHairMatrices = Object.freeze(Object.fromEntries(
    Object.entries(SidePlayerHairStyleProfiles).map(([hairStyle, profile]) => [
        hairStyle,
        Object.freeze({
            back: makeSidePlayerHairLayer(profile.back),
            front: makeSidePlayerHairLayer(profile.front)
        })
    ])
));

function getSidePlayerHairLayers(hairStyle = 'hair_bald') {
    return SidePlayerHairMatrices[hairStyle]
        || SidePlayerHairMatrices.hair_bald;
}

const SidePlayerHelmetProfiles = Object.freeze({
    helm_alpha: Object.freeze({
        style: 'collar',
        hairMask: null,
        hidesHair: false
    }),
    helm_rusty_coif: Object.freeze({
        style: 'coif',
        hairMask: 'full',
        hidesHair: true
    }),
    wilderness_cloak: Object.freeze({
        style: 'hood',
        hairMask: 'full',
        hidesHair: true
    }),
    primate_armor: Object.freeze({
        style: 'skull',
        hairMask: 'full',
        hidesHair: true
    }),
    helm_pubserker: Object.freeze({
        style: 'flatcap',
        hairMask: 'cap',
        hidesHair: false
    }),
    helm_beerglass: Object.freeze({
        style: 'visor',
        hairMask: null,
        hidesHair: false
    }),
    helm_tankard: Object.freeze({
        style: 'tankard',
        hairMask: 'full',
        hidesHair: true
    }),
    helm_blackout: Object.freeze({
        style: 'blinders',
        hairMask: null,
        hidesHair: false
    }),
    helm_harvester: Object.freeze({
        style: 'widehat',
        hairMask: 'brim',
        hidesHair: false
    }),
    beanie_hat: Object.freeze({
        style: 'beanie',
        hairMask: 'cap',
        hidesHair: false
    }),
    heartwood_crown: Object.freeze({
        style: 'crown',
        hairMask: null,
        hidesHair: false
    }),
    fishermans_hat: Object.freeze({
        style: 'bucket',
        hairMask: 'brim',
        hidesHair: false
    }),
    abyssal_lantern: Object.freeze({
        style: 'lantern',
        hairMask: 'full',
        hidesHair: true
    }),
    straw_hat: Object.freeze({
        style: 'strawhat',
        hairMask: 'brim',
        hidesHair: false
    }),
    burlap_sack_mask: Object.freeze({
        style: 'sack',
        hairMask: 'full',
        hidesHair: true
    })
});

const SidePlayerHelmetHairMaskProfiles = Object.freeze({
    cap: Object.freeze([
        [0, 4, 24],
        [1, 4, 24],
        [2, 4, 24],
        [3, 4, 24],
        [4, 4, 24],
        [5, 4, 24]
    ]),
    brim: Object.freeze([
        [0, 3, 27],
        [1, 3, 27],
        [2, 3, 27],
        [3, 3, 27],
        [4, 3, 27],
        [5, 3, 27],
        [6, 3, 27]
    ]),
    full: Object.freeze(Array.from(
        { length: 21 },
        (_, y) => Object.freeze([y, 0, 24])
    ))
});

const SidePlayerHelmetHairMaskMatrices = Object.freeze(Object.fromEntries(
    Object.entries(SidePlayerHelmetHairMaskProfiles).map(([maskId, spans]) => [
        maskId,
        createNativeOverhaulSprite(painter => {
            spans.forEach(([y, startX, endX]) => {
                for (let x = startX; x <= endX; x += 1) {
                    painter.set(x, y, '_');
                }
            });
        })
    ])
));

function paintSidePlayerHelmetBack(painter, profile, spec) {
    const { line, points, rect } = painter;

    switch (profile.style) {
        case 'collar':
            paintOutlinedOverhaulShape(painter, [
                [11, 9, 15],
                [12, 8, 16],
                [13, 8, 17],
                [14, 9, 18],
                [15, 10, 17]
            ], spec.shadow);
            break;
        case 'coif':
            paintOutlinedOverhaulShape(painter, [
                [7, 7, 13],
                [8, 6, 14],
                [9, 6, 14],
                [10, 7, 15],
                [11, 7, 15],
                [12, 8, 15],
                [13, 9, 15],
                [14, 10, 14]
            ], spec.shadow);
            points([[7, 9], [9, 12], [12, 14]], spec.highlight);
            break;
        case 'hood':
            break;
        case 'skull':
            line(9, 4, 5, 0, 'X', 3);
            line(9, 4, 5, 0, spec.accent);
            points([[5, 0], [6, 1], [7, 2]], spec.highlight);
            break;
        case 'tankard':
            paintOutlinedOverhaulShape(painter, [
                [3, 4, 10],
                [4, 3, 11],
                [5, 3, 12],
                [6, 3, 12],
                [7, 3, 12],
                [8, 3, 12],
                [9, 4, 11],
                [10, 5, 10]
            ], spec.primary);
            rect(6, 5, 5, 4, '.');
            line(5, 4, 5, 9, spec.highlight);
            break;
        case 'blinders':
            break;
        case 'widehat':
            paintOutlinedOverhaulShape(painter, [
                [4, 6, 14],
                [5, 3, 15],
                [6, 5, 14]
            ], spec.shadow);
            line(5, 5, 13, 5, spec.highlight);
            break;
        case 'bucket':
            paintOutlinedOverhaulShape(painter, [
                [4, 7, 14],
                [5, 5, 15],
                [6, 6, 14],
                [7, 8, 13]
            ], spec.shadow);
            break;
        case 'strawhat':
            break;
        case 'lantern':
            paintOutlinedOverhaulShape(painter, [
                [3, 7, 13],
                [4, 6, 13],
                [5, 5, 13],
                [6, 5, 13],
                [7, 5, 13],
                [8, 5, 13],
                [9, 6, 13],
                [10, 7, 13],
                [11, 8, 13]
            ], spec.shadow);
            break;
        default:
            break;
    }
}

function paintSidePlayerHelmetFront(painter, profile, spec) {
    const { ellipse, frame, line, points, rect, set } = painter;

    switch (profile.style) {
        case 'collar':
            paintOutlinedOverhaulShape(painter, [
                [10, 14, 17],
                [11, 13, 19],
                [12, 12, 20],
                [13, 13, 20],
                [14, 14, 19]
            ], spec.primary);
            line(13, 12, 19, 12, spec.highlight);
            line(15, 14, 19, 14, spec.shadow);
            line(19, 13, 22, 14, 'X', 3);
            line(19, 13, 22, 14, spec.accent);
            break;
        case 'coif':
            paintOutlinedOverhaulShape(painter, [
                [0, 13, 17],
                [1, 10, 19],
                [2, 8, 20],
                [3, 7, 20],
                [4, 7, 19],
                [5, 7, 18],
                [6, 7, 17],
                [7, 7, 17],
                [8, 7, 17],
                [9, 7, 17],
                [10, 8, 18],
                [11, 9, 18],
                [12, 10, 18],
                [13, 11, 17]
            ], spec.primary);
            line(17, 5, 17, 9, 'X');
            line(17, 10, 19, 11, 'X');
            points([
                [10, 2], [15, 1], [8, 5], [11, 7],
                [9, 10], [12, 12], [16, 3], [16, 8]
            ], spec.highlight);
            points([[8, 7], [10, 11], [15, 12], [16, 6]], spec.shadow);
            points([[12, 3], [9, 8], [14, 10]], spec.accent);
            break;
        case 'hood':
            paintOutlinedOverhaulShape(painter, [
                [0, 12, 17],
                [1, 9, 19],
                [2, 8, 20],
                [3, 7, 20],
                [4, 7, 14],
                [5, 6, 14],
                [6, 6, 14],
                [7, 6, 14],
                [8, 6, 14],
                [9, 6, 14],
                [10, 7, 15],
                [11, 8, 18],
                [12, 9, 19],
                [13, 11, 18],
                [14, 8, 15],
                [15, 8, 14],
                [16, 9, 13],
                [17, 10, 12]
            ], spec.primary);
            line(14, 4, 14, 9, 'X');
            line(14, 10, 18, 11, 'X');
            line(9, 2, 16, 1, spec.highlight);
            line(7, 5, 7, 10, spec.highlight);
            line(17, 2, 20, 4, spec.shadow);
            points([
                [9, 12], [14, 12], [18, 12],
                [9, 14], [10, 16]
            ], spec.accent);
            break;
        case 'skull':
            paintOutlinedOverhaulShape(painter, [
                [0, 13, 17],
                [1, 10, 19],
                [2, 8, 20],
                [3, 7, 21],
                [4, 7, 22],
                [5, 8, 23],
                [6, 8, 23],
                [7, 8, 23],
                [8, 9, 22],
                [9, 10, 22],
                [10, 11, 21],
                [11, 12, 20],
                [12, 13, 19]
            ], spec.primary);
            line(19, 3, 23, 0, 'X', 3);
            line(19, 3, 23, 0, spec.accent);
            rect(17, 5, 4, 3, spec.shadow);
            frame(17, 5, 4, 3, 'X');
            set(19, 6, spec.accent);
            points([[21, 8], [22, 8], [20, 9]], spec.shadow);
            line(17, 10, 21, 10, spec.highlight);
            points([[18, 10], [20, 10]], 'X');
            points([[10, 3], [13, 1], [9, 7], [13, 10]], spec.highlight);
            break;
        case 'flatcap':
            paintOutlinedOverhaulShape(painter, [
                [0, 12, 17],
                [1, 9, 19],
                [2, 8, 20],
                [3, 8, 21],
                [4, 9, 21]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [4, 17, 24],
                [5, 16, 25]
            ], spec.shadow);
            line(10, 1, 18, 1, spec.highlight);
            line(10, 3, 21, 3, spec.shadow);
            line(18, 4, 24, 4, spec.highlight);
            points([[12, 0], [19, 2]], spec.accent);
            break;
        case 'visor':
            paintOutlinedOverhaulShape(painter, [
                [5, 10, 20],
                [6, 9, 22],
                [7, 10, 23],
                [8, 13, 22]
            ], spec.primary);
            rect(16, 6, 7, 2, spec.accent);
            frame(16, 6, 7, 2, 'X');
            line(17, 6, 18, 6, spec.highlight);
            line(11, 7, 16, 7, spec.shadow);
            set(21, 6, spec.accent);
            break;
        case 'tankard':
            paintOutlinedOverhaulShape(painter, [
                [0, 11, 18],
                [1, 8, 21],
                [2, 8, 22],
                [3, 8, 22],
                [4, 8, 22],
                [5, 8, 22],
                [6, 8, 22],
                [7, 8, 22],
                [8, 8, 22],
                [9, 8, 22],
                [10, 8, 22],
                [11, 9, 21],
                [12, 11, 19]
            ], spec.primary);
            line(9, 2, 21, 2, spec.highlight);
            line(9, 4, 21, 4, spec.accent);
            rect(14, 5, 9, 3, spec.shadow);
            frame(14, 5, 9, 3, 'X');
            line(15, 6, 21, 6, spec.highlight);
            line(15, 1, 15, 11, spec.shadow);
            line(9, 10, 21, 10, spec.accent);
            points([[10, 11], [18, 11], [21, 9]], spec.highlight);
            break;
        case 'blinders':
            paintOutlinedOverhaulShape(painter, [
                [5, 9, 20],
                [6, 8, 21],
                [7, 9, 21],
                [8, 12, 20]
            ], spec.primary);
            rect(15, 6, 6, 2, spec.shadow);
            frame(15, 6, 6, 2, 'X');
            points([[16, 6], [19, 6], [20, 7]], spec.highlight);
            line(12, 7, 16, 7, spec.accent);
            break;
        case 'widehat':
            paintOutlinedOverhaulShape(painter, [
                [0, 13, 17],
                [1, 11, 19],
                [2, 9, 20],
                [3, 8, 21]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [3, 10, 25],
                [4, 8, 28],
                [5, 11, 29],
                [6, 23, 28]
            ], spec.primary);
            line(10, 3, 22, 3, spec.shadow);
            line(11, 2, 19, 2, spec.highlight);
            line(12, 4, 26, 4, spec.highlight);
            points([[9, 3], [24, 4], [28, 5], [27, 6]], spec.accent);
            break;
        case 'beanie':
            paintOutlinedOverhaulShape(painter, [
                [2, 10, 19],
                [3, 8, 21],
                [4, 8, 21],
                [5, 9, 21]
            ], spec.primary);
            rect(9, 4, 13, 2, spec.shadow);
            frame(9, 4, 13, 2, 'X');
            line(11, 4, 20, 4, spec.highlight);
            points([
                [13, 0], [14, 0], [15, 0],
                [12, 1], [13, 1], [14, 1], [15, 1], [16, 1],
                [13, 2], [14, 2], [15, 2]
            ], spec.accent);
            points([[11, 3], [18, 3]], spec.highlight);
            break;
        case 'crown':
            paintOutlinedOverhaulShape(painter, [
                [3, 9, 21],
                [4, 8, 22],
                [5, 9, 22]
            ], spec.primary);
            [
                [[9, 3], [8, 0]],
                [[13, 3], [12, 0]],
                [[17, 3], [17, 0]],
                [[21, 3], [23, 0]]
            ].forEach(([start, end]) => {
                line(start[0], start[1], end[0], end[1], 'X', 3);
                line(start[0], start[1], end[0], end[1], spec.primary);
            });
            points([[8, 0], [12, 0], [17, 0], [23, 0]], spec.highlight);
            points([[11, 4], [16, 4], [20, 4]], spec.accent);
            line(10, 5, 21, 5, spec.shadow);
            break;
        case 'bucket':
            paintOutlinedOverhaulShape(painter, [
                [0, 12, 18],
                [1, 10, 20],
                [2, 9, 21],
                [3, 8, 22],
                [4, 8, 22]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [4, 10, 24],
                [5, 8, 26],
                [6, 8, 13],
                [6, 23, 25],
                [7, 24, 25]
            ], spec.primary);
            line(10, 1, 19, 1, spec.highlight);
            line(9, 4, 22, 4, spec.shadow);
            line(12, 5, 23, 5, spec.highlight);
            points([[9, 5], [24, 5], [21, 3]], spec.accent);
            break;
        case 'lantern':
            line(12, 1, 12, 0, 'X', 3);
            line(18, 1, 18, 0, 'X', 3);
            line(12, 0, 18, 0, 'X', 3);
            line(12, 1, 12, 0, spec.highlight);
            line(18, 1, 18, 0, spec.highlight);
            line(12, 0, 18, 0, spec.highlight);
            paintOutlinedOverhaulShape(painter, [
                [1, 11, 19],
                [2, 8, 21],
                [3, 7, 22],
                [4, 7, 23],
                [5, 7, 23],
                [6, 7, 23],
                [7, 7, 23],
                [8, 7, 23],
                [9, 7, 23],
                [10, 7, 23],
                [11, 8, 22],
                [12, 10, 20]
            ], spec.primary);
            rect(14, 4, 9, 6, spec.shadow);
            frame(14, 4, 9, 6, 'X');
            rect(16, 5, 6, 4, spec.accent);
            points([[17, 5], [18, 5], [20, 6], [21, 7]], spec.highlight);
            line(9, 3, 21, 3, spec.highlight);
            line(9, 10, 21, 10, spec.shadow);
            points([[8, 5], [8, 8], [11, 11]], spec.highlight);
            break;
        case 'strawhat':
            paintOutlinedOverhaulShape(painter, [
                [1, 12, 18],
                [2, 10, 20],
                [3, 9, 21],
                [4, 9, 22]
            ], spec.primary);
            paintOutlinedOverhaulShape(painter, [
                [4, 8, 25],
                [5, 5, 29]
            ], spec.primary);
            line(10, 3, 21, 3, spec.shadow);
            line(11, 2, 19, 2, spec.highlight);
            line(10, 4, 22, 4, spec.accent);
            line(6, 5, 28, 5, spec.primary);
            points([[6, 5], [12, 5], [25, 5], [28, 5]], spec.highlight);
            break;
        case 'sack':
            paintOutlinedOverhaulShape(painter, [
                [0, 11, 18],
                [1, 8, 20],
                [2, 7, 21],
                [3, 7, 22],
                [4, 6, 23],
                [5, 6, 23],
                [6, 6, 23],
                [7, 6, 23],
                [8, 6, 23],
                [9, 6, 23],
                [10, 6, 23],
                [11, 7, 22],
                [12, 7, 22],
                [13, 8, 21],
                [14, 10, 19]
            ], spec.primary);
            line(9, 1, 21, 12, spec.highlight);
            line(21, 2, 9, 13, spec.shadow);
            rect(17, 5, 4, 3, spec.shadow);
            frame(17, 5, 4, 3, 'X');
            points([[18, 6], [20, 6]], spec.accent);
            line(18, 10, 22, 10, 'X');
            points([[18, 10], [20, 10], [22, 10]], spec.accent);
            points([[8, 4], [7, 8], [10, 13], [21, 4]], spec.highlight);
            break;
        default:
            break;
    }
}

function makeSidePlayerHelmetLayers(spriteId, spec) {
    const profile = SidePlayerHelmetProfiles[spriteId];
    if (!profile || !spec) return null;

    return Object.freeze({
        spriteId,
        style: profile.style,
        hairMaskId: profile.hairMask,
        hidesHair: profile.hidesHair,
        back: createNativeOverhaulSprite(painter => {
            paintSidePlayerHelmetBack(painter, profile, spec);
        }),
        front: createNativeOverhaulSprite(painter => {
            paintSidePlayerHelmetFront(painter, profile, spec);
        }),
        hairMask: profile.hairMask
            ? SidePlayerHelmetHairMaskMatrices[profile.hairMask]
            : null
    });
}

const SidePlayerHelmetMatrices = {};
const SidePlayerMaskedHairMatrixCache = new Map();

function getSidePlayerHelmetSpriteId(helmetItem) {
    if (typeof helmetItem === 'string') return helmetItem;
    return helmetItem && helmetItem.spriteId
        ? helmetItem.spriteId
        : null;
}

function getSidePlayerHelmetLayers(helmetItem) {
    const spriteId = getSidePlayerHelmetSpriteId(helmetItem);
    if (!spriteId || !SidePlayerHelmetProfiles[spriteId]) return null;
    if (SidePlayerHelmetMatrices[spriteId]) {
        return SidePlayerHelmetMatrices[spriteId];
    }

    const spec = typeof EquipmentOverhaulSpecs !== 'undefined'
        ? EquipmentOverhaulSpecs.helmet[spriteId]
        : null;
    if (!spec) return null;

    const layers = makeSidePlayerHelmetLayers(spriteId, spec);
    if (layers) SidePlayerHelmetMatrices[spriteId] = layers;
    return layers;
}

function applySidePlayerHairMask(matrix, mask) {
    if (!matrix || !mask) return matrix;

    return buildSprite(
        matrix.map((row, y) => row.map((key, x) => (
            mask[y]?.[x] && mask[y][x] !== '.'
                ? '.'
                : key
        )).join('')),
        { sourceSize: SIDE_PLAYER_ANIMATION_SIZE }
    );
}

function getSidePlayerHairLayersForHelmet(
    hairStyle = 'hair_bald',
    helmetItem = null
) {
    const resolvedHairStyle = Object.prototype.hasOwnProperty.call(
        SidePlayerHairMatrices,
        hairStyle
    )
        ? hairStyle
        : 'hair_bald';
    const hairLayers = getSidePlayerHairLayers(resolvedHairStyle);
    const helmetLayers = getSidePlayerHelmetLayers(helmetItem);

    if (!helmetLayers) return hairLayers;
    if (helmetLayers.hidesHair) return SidePlayerHairMatrices.hair_bald;
    if (!helmetLayers.hairMask) return hairLayers;

    const cacheKey = `${resolvedHairStyle}:${helmetLayers.spriteId}`;
    if (SidePlayerMaskedHairMatrixCache.has(cacheKey)) {
        return SidePlayerMaskedHairMatrixCache.get(cacheKey);
    }

    const maskedLayers = Object.freeze({
        back: applySidePlayerHairMask(hairLayers.back, helmetLayers.hairMask),
        front: applySidePlayerHairMask(hairLayers.front, helmetLayers.hairMask)
    });
    SidePlayerMaskedHairMatrixCache.set(cacheKey, maskedLayers);
    return maskedLayers;
}

const SidePlayerArmorMatrixCache = new Map();

function getSidePlayerArmorSpriteId(armorItem) {
    if (typeof armorItem === 'string') {
        if (
            typeof EquipmentOverhaulSpecs !== 'undefined'
            && EquipmentOverhaulSpecs.armor[armorItem]
        ) {
            return armorItem;
        }
        if (
            typeof ItemDatabase !== 'undefined'
            && ItemDatabase[armorItem]
        ) {
            return ItemDatabase[armorItem].spriteId || null;
        }
        return null;
    }
    return armorItem && armorItem.spriteId
        ? armorItem.spriteId
        : null;
}

function getSidePlayerArmorTorsoSpans(
    gender,
    stance,
    length
) {
    const female = gender === 'female';
    const spans = stance === 'profile'
        ? (female
            ? [
                [13, 12, 18],
                [14, 11, 19],
                [15, 11, 20],
                [16, 11, 20],
                [17, 11, 19],
                [18, 11, 18],
                [19, 11, 18],
                [20, 11, 18],
                [21, 11, 18],
                [22, 11, 18]
            ]
            : [
                [13, 12, 18],
                [14, 11, 19],
                [15, 11, 19],
                [16, 11, 19],
                [17, 11, 19],
                [18, 11, 18],
                [19, 11, 18],
                [20, 11, 18],
                [21, 11, 18],
                [22, 11, 18]
            ])
        : (female
            ? [
                [13, 11, 19],
                [14, 10, 20],
                [15, 10, 22],
                [16, 10, 22],
                [17, 11, 21],
                [18, 12, 20],
                [19, 12, 19],
                [20, 11, 19],
                [21, 10, 21],
                [22, 10, 21]
            ]
            : [
                [13, 11, 19],
                [14, 10, 21],
                [15, 10, 21],
                [16, 10, 21],
                [17, 10, 20],
                [18, 11, 20],
                [19, 11, 19],
                [20, 11, 19],
                [21, 11, 19],
                [22, 11, 20]
            ]);

    if (length === 'long') {
        const backX = stance === 'profile' ? 11 : 10;
        const frontX = stance === 'profile' ? 18 : 20;
        spans.push(
            [23, backX, frontX],
            [24, backX + 1, frontX],
            [25, backX + 1, frontX - 1]
        );
    }

    return spans;
}

function getSidePlayerArmorShoulder(arm, stance) {
    return [
        stance === 'profile'
            ? SIDE_PLAYER_PROFILE_SHOULDER_X
            : arm[0][0] - 1,
        arm[0][1]
    ];
}

function paintSidePlayerArmorSleeve(
    painter,
    arm,
    stance,
    spec,
    design,
    isFar = false
) {
    if (design.sleeves === 'shirt') return;

    const shoulder = getSidePlayerArmorShoulder(arm, stance);
    const elbow = arm[1];
    const hand = arm[2];
    const extendsSleeve = design.sleeves === 'long';
    const sleeveEnd = extendsSleeve
        ? [
            Math.round((elbow[0] + hand[0]) / 2),
            Math.round((elbow[1] + hand[1]) / 2)
        ]
        : elbow;
    const heavy = design.weight === 'heavy';
    const raisedNearFace = sleeveEnd[1] <= 12;
    const outlineWidth = raisedNearFace ? 3 : (heavy ? 5 : 4);
    const fillWidth = raisedNearFace ? 2 : (heavy ? 3 : 2);
    const sleeveFill = isFar ? spec.shadow : spec.primary;

    paintSideLine(
        painter,
        shoulder,
        sleeveEnd,
        sleeveFill,
        outlineWidth,
        fillWidth
    );

    if (
        design.shoulders === 'round'
        || design.shoulders === 'broad'
    ) {
        painter.ellipse(
            shoulder[0],
            shoulder[1],
            heavy ? 3 : 2,
            2,
            'X'
        );
        painter.ellipse(
            shoulder[0],
            shoulder[1],
            heavy ? 2 : 1,
            1,
            sleeveFill
        );
    } else if (
        design.shoulders === 'angular'
        || design.shoulders === 'leaf'
        || design.shoulders === 'sharp'
    ) {
        painter.points([
            [shoulder[0] - 1, shoulder[1] - 2],
            [shoulder[0], shoulder[1] - 2],
            [shoulder[0] + 2, shoulder[1] - 1],
            [shoulder[0] + 2, shoulder[1]]
        ], spec.primary);
        painter.points([
            [shoulder[0] + 1, shoulder[1] - 2],
            [shoulder[0] + 2, shoulder[1] - 1]
        ], spec.highlight);
    } else if (
        design.sleeves === 'fur'
        || design.sleeves === 'bark'
    ) {
        painter.points([
            [shoulder[0] - 1, shoulder[1] - 1],
            [shoulder[0] + 1, shoulder[1] - 2],
            [shoulder[0] + 2, shoulder[1] - 1]
        ], spec.highlight);
    }

    if (design.sleeves === 'rolled') {
        painter.line(
            sleeveEnd[0] - 1,
            sleeveEnd[1],
            sleeveEnd[0] + 1,
            sleeveEnd[1],
            spec.shadow,
            2
        );
    }
}

function paintSidePlayerArmorDetails(
    painter,
    spec,
    design,
    gender,
    stance
) {
    const female = gender === 'female';
    const backX = stance === 'profile' ? 11 : 10;
    const frontX = stance === 'profile'
        ? (female ? 20 : 19)
        : (female ? 22 : 21);
    const centerX = Math.round((backX + frontX) / 2);

    if (spec.style === 'blackout' || spec.style === 'slicker') {
        painter.line(
            backX + 2,
            12,
            frontX,
            12,
            spec.primary
        );
        painter.set(backX + 2, 12, spec.shadow);
    }

    switch (spec.style) {
        case 'hide':
            painter.line(backX + 1, 14, frontX - 1, 20, spec.accent);
            painter.points([
                [backX, 15],
                [backX + 1, 17],
                [frontX - 1, 14],
                [centerX, 22]
            ], spec.highlight);
            break;
        case 'tunic':
            painter.line(centerX, 14, centerX, 21, spec.shadow);
            painter.points([
                [centerX + 1, 15],
                [centerX + 1, 18],
                [centerX + 1, 21]
            ], spec.accent);
            painter.points([
                [centerX - 1, 23],
                [centerX, 22],
                [centerX + 1, 23]
            ], spec.shadow);
            break;
        case 'cask':
            painter.line(backX, 15, frontX, 15, spec.highlight);
            painter.line(backX, 20, frontX, 20, spec.highlight);
            painter.line(centerX - 1, 14, centerX - 1, 21, spec.shadow);
            painter.points([
                [frontX - 1, 17],
                [frontX - 1, 19]
            ], spec.accent);
            break;
        case 'barrel':
            painter.line(backX, 15, frontX, 15, spec.accent);
            painter.line(backX, 20, frontX, 20, spec.accent);
            painter.line(backX + 2, 14, backX + 2, 21, spec.shadow);
            painter.line(centerX + 1, 14, centerX + 1, 21, spec.shadow);
            painter.set(frontX - 1, 18, spec.highlight);
            break;
        case 'boar':
            painter.line(backX + 1, 14, centerX, 19, spec.accent);
            painter.line(frontX - 1, 14, centerX, 19, spec.accent);
            painter.points([
                [frontX, 14],
                [frontX + 1, 15],
                [frontX, 16]
            ], spec.highlight);
            break;
        case 'suspenders':
            painter.line(centerX - 1, 13, centerX, 21, spec.highlight, 2);
            painter.set(centerX, 18, spec.accent);
            painter.line(backX, 18, frontX, 18, spec.shadow);
            break;
        case 'glass':
            painter.line(backX + 1, 14, frontX - 1, 21, spec.highlight);
            painter.line(frontX - 2, 14, backX + 2, 20, spec.accent);
            painter.points([
                [frontX, 15],
                [frontX + 1, 16],
                [frontX, 18]
            ], spec.highlight);
            break;
        case 'tankard':
            painter.line(backX, 15, frontX, 15, spec.highlight);
            painter.line(backX, 20, frontX, 20, spec.highlight);
            painter.line(centerX, 14, centerX, 21, spec.shadow);
            painter.set(centerX + 1, 18, spec.accent);
            break;
        case 'blackout':
            painter.line(backX + 1, 13, frontX - 1, 18, spec.highlight);
            painter.line(backX, 14, backX, 24, spec.accent);
            painter.line(frontX, 14, frontX, 24, spec.accent);
            painter.line(centerX, 21, centerX, 25, 'X');
            break;
        case 'flannel':
            [15, 18, 21].forEach(y => {
                painter.line(backX + 1, y, frontX - 1, y, spec.highlight);
            });
            painter.line(centerX - 1, 14, centerX - 1, 21, spec.shadow);
            break;
        case 'heartwood':
            painter.line(centerX, 14, centerX, 21, spec.shadow);
            painter.points([
                [backX + 1, 16],
                [frontX - 1, 17],
                [backX + 2, 19],
                [frontX - 2, 20]
            ], spec.accent);
            break;
        case 'slicker':
            painter.line(centerX, 13, centerX, 25, spec.shadow);
            painter.points([
                [centerX - 2, 16],
                [centerX + 2, 16],
                [centerX - 2, 20],
                [centerX + 2, 20]
            ], spec.highlight);
            painter.line(backX, 22, frontX, 22, spec.accent);
            break;
        case 'diving':
            painter.rect(backX + 2, 15, Math.max(3, frontX - backX - 3), 4, spec.highlight);
            painter.rect(centerX - 1, 15, 3, 3, '^');
            painter.line(backX, 21, frontX, 21, spec.accent, 2);
            painter.set(centerX, 16, 'W');
            break;
        case 'overalls':
            painter.rect(centerX - 2, 14, 5, 7, spec.primary);
            painter.line(backX + 2, 13, centerX - 2, 16, spec.highlight);
            painter.line(frontX - 2, 13, centerX + 2, 16, spec.highlight);
            painter.rect(centerX - 1, 18, 3, 2, spec.highlight);
            painter.set(centerX, 19, spec.accent);
            break;
        default:
            break;
    }
}

function makeSidePlayerArmorMatrix(
    spriteId,
    spec,
    gender,
    poseDefinition
) {
    const design = (
        typeof ArmorDesignProfiles !== 'undefined'
        && ArmorDesignProfiles[spec.style]
    );
    if (!design) return null;

    return createNativeOverhaulSprite(painter => {
        const stance = poseDefinition.stance || 'profile';
        const basePrimary = spec.style === 'overalls'
            ? 'U'
            : spec.primary;

        if (design.sleeves !== 'shirt') {
            paintSidePlayerArmorSleeve(
                painter,
                poseDefinition.farArm,
                stance,
                { ...spec, primary: basePrimary },
                design,
                true
            );
        }

        paintOutlinedOverhaulShape(
            painter,
            getSidePlayerArmorTorsoSpans(
                gender,
                stance,
                design.length
            ),
            basePrimary
        );
        paintSidePlayerArmorDetails(
            painter,
            spec,
            design,
            gender,
            stance
        );

        if (design.sleeves !== 'shirt') {
            paintSidePlayerArmorSleeve(
                painter,
                poseDefinition.nearArm,
                stance,
                { ...spec, primary: basePrimary },
                design,
                false
            );
        }
    });
}

function getSidePlayerArmorMatrix(
    armorItem,
    gender,
    poseId
) {
    const spriteId = getSidePlayerArmorSpriteId(armorItem);
    const resolvedGender = gender === 'female' ? 'female' : 'male';
    const poseDefinition = SidePlayerPoseDefinitions[poseId];
    if (
        !spriteId
        || !poseDefinition
        || typeof EquipmentOverhaulSpecs === 'undefined'
    ) {
        return null;
    }

    const spec = EquipmentOverhaulSpecs.armor[spriteId];
    if (!spec) return null;

    const cacheKey = `${spriteId}:${resolvedGender}:${poseId}`;
    if (SidePlayerArmorMatrixCache.has(cacheKey)) {
        return SidePlayerArmorMatrixCache.get(cacheKey);
    }

    const matrix = makeSidePlayerArmorMatrix(
        spriteId,
        spec,
        resolvedGender,
        poseDefinition
    );
    if (matrix) SidePlayerArmorMatrixCache.set(cacheKey, matrix);
    return matrix;
}

function paintSideLine(painter, start, end, fillKey, outlineWidth, fillWidth) {
    painter.line(start[0], start[1], end[0], end[1], 'X', outlineWidth);
    painter.line(start[0], start[1], end[0], end[1], fillKey, fillWidth);
}

function paintSideHand(painter, point, fillKey) {
    painter.ellipse(point[0], point[1], 2, 2, 'X');
    painter.ellipse(point[0], point[1], 1, 1, fillKey);
    painter.set(point[0] + 1, point[1] - 1, 'Q');
}

function paintSideArm(painter, points, sleeveKey, skinKey, shoulderOffsetX = 0) {
    const shoulder = [points[0][0] + shoulderOffsetX, points[0][1]];
    const elbow = points[1];
    const hand = points[2];
    paintSideLine(painter, shoulder, elbow, sleeveKey, 5, 3);
    paintSideLine(painter, elbow, hand, skinKey, 4, 2);
    paintSideHand(painter, hand, skinKey);
}

function paintSideLeg(painter, points, pantsKey, bootKey) {
    const [hip, knee, ankle, toe] = points;
    paintSideLine(painter, hip, knee, pantsKey, 6, 4);
    paintSideLine(painter, knee, ankle, pantsKey, 5, 3);
    paintSideLine(painter, ankle, toe, bootKey, 5, 3);
    painter.set(knee[0] + 1, knee[1] - 1, pantsKey === 'n' ? 'P' : 'x');
    painter.set(toe[0] + 1, toe[1] - 1, 'g');
}

function getSideProfileLegs(poseDefinition) {
    if (poseDefinition.preserveLegDepth) {
        return {
            farLeg: poseDefinition.farLeg,
            nearLeg: poseDefinition.nearLeg
        };
    }

    const declaredFarToe = poseDefinition.farLeg.at(-1);
    const declaredNearToe = poseDefinition.nearLeg.at(-1);

    if (declaredNearToe[0] <= declaredFarToe[0]) {
        return {
            farLeg: poseDefinition.farLeg,
            nearLeg: poseDefinition.nearLeg
        };
    }

    return {
        farLeg: poseDefinition.nearLeg,
        nearLeg: poseDefinition.farLeg
    };
}

function paintSideHead(painter, gender) {
    const female = gender === 'female';

    paintOutlinedOverhaulShape(painter, [
        [2, 13, 17],
        [3, 11, 19],
        [4, 10, 20],
        [5, 10, 20],
        [6, 10, 21],
        [7, 10, 22],
        [8, 10, 22],
        [9, 10, 21],
        [10, 11, 20],
        [11, 13, 18]
    ], 'S');

    painter.points([[11, 6], [11, 7], [11, 8]], 'F');
    painter.points([[18, 4], [19, 5], [20, 6], [21, 7]], 'Q');
    painter.line(18, 5, 20, 5, 'X');
    painter.set(19, 6, 'Z');
    painter.set(21, 8, 'F');
    painter.set(20, 9, '@');
    painter.set(19, 10, female ? 'Q' : 'F');
}

function paintSideTorso(painter, gender, stance) {
    const female = gender === 'female';
    const torsoSpans = stance === 'profile'
        ? (female
            ? [
                [12, 13, 17],
                [13, 12, 18],
                [14, 11, 19],
                [15, 11, 20],
                [16, 11, 20],
                [17, 11, 19],
                [18, 11, 17],
                [19, 11, 17],
                [20, 11, 18],
                [21, 11, 18],
                [22, 11, 18]
            ]
            : [
                [12, 13, 17],
                [13, 12, 18],
                [14, 11, 19],
                [15, 11, 19],
                [16, 11, 19],
                [17, 11, 19],
                [18, 11, 18],
                [19, 11, 18],
                [20, 11, 18],
                [21, 11, 18],
                [22, 11, 18]
            ])
        : female
        ? [
            [12, 13, 17],
            [13, 11, 19],
            [14, 10, 20],
            [15, 10, 22],
            [16, 10, 22],
            [17, 11, 21],
            [18, 12, 20],
            [19, 12, 19],
            [20, 11, 19],
            [21, 10, 21],
            [22, 10, 21]
        ]
        : [
            [12, 13, 17],
            [13, 11, 19],
            [14, 10, 21],
            [15, 10, 21],
            [16, 10, 21],
            [17, 10, 20],
            [18, 11, 20],
            [19, 11, 19],
            [20, 11, 19],
            [21, 11, 19],
            [22, 11, 20]
        ];

    paintOutlinedOverhaulShape(painter, torsoSpans, 'U');

    if (stance === 'profile') {
        painter.line(12, 15, 12, 20, 'u');
        painter.line(13, 14, 18, 14, 'r');
        painter.points(female
            ? [[19, 15], [19, 16], [18, 17]]
            : [[18, 15], [18, 16], [18, 17]], 'r');
        painter.points(female
            ? [[12, 18], [12, 19], [17, 21]]
            : [[12, 18], [12, 19], [17, 20]], 'u');
        painter.line(12, 22, 18, 22, 'l');
        painter.set(17, 22, 'N');
        return;
    }

    painter.line(11, 15, 11, 20, 'u');
    painter.line(13, 14, 19, 14, 'r');
    painter.points(female
        ? [[20, 15], [20, 16], [18, 19]]
        : [[20, 15], [20, 16], [19, 18]], 'r');
    painter.points(female
        ? [[13, 18], [13, 19], [20, 21]]
        : [[12, 18], [12, 19], [19, 20]], 'u');
    painter.line(female ? 12 : 11, 22, 20, 22, 'l');
    painter.set(18, 22, 'N');
}

function makeSidePlayerBody(gender, poseDefinition) {
    return createNativeOverhaulSprite(painter => {
        const stance = poseDefinition.stance || 'profile';
        const legs = getSideProfileLegs(poseDefinition);
        const farShoulderOffset = stance === 'profile'
            ? SIDE_PLAYER_PROFILE_SHOULDER_X - poseDefinition.farArm[0][0]
            : -1;
        const nearShoulderOffset = stance === 'profile'
            ? SIDE_PLAYER_PROFILE_SHOULDER_X - poseDefinition.nearArm[0][0]
            : -1;

        paintSideLeg(painter, legs.farLeg, 'n', 'D');
        paintSideLeg(painter, legs.nearLeg, 'P', 'D');

        if (stance === 'profile') {
            for (let y = 14; y <= 22; y += 1) {
                painter.set(10, y, '.');
            }
            for (let y = 18; y <= 22; y += 1) {
                painter.set(19, y, '.');
                painter.set(20, y, '.');
            }
        }

        paintSideArm(
            painter,
            poseDefinition.farArm,
            'u',
            'F',
            farShoulderOffset
        );

        if (stance === 'profile') {
            painter.set(10, 14, '.');
            painter.set(10, 15, '.');
        }

        paintOutlinedOverhaulShape(painter, [
            [10, 14, 17],
            [11, 13, 18],
            [12, 13, 18],
            [13, 13, 18]
        ], 'S');
        paintSideTorso(painter, gender, stance);
        paintSideArm(
            painter,
            poseDefinition.nearArm,
            'U',
            'S',
            nearShoulderOffset
        );
        paintSideHead(painter, gender);
    });
}

function getSideVector(start, end, distance) {
    const deltaX = end[0] - start[0];
    const deltaY = end[1] - start[1];
    const length = Math.max(1, Math.hypot(deltaX, deltaY));
    return [
        Math.round((deltaX / length) * distance),
        Math.round((deltaY / length) * distance)
    ];
}

const SidePlayerGloveMatrixCache = new Map();
const SidePlayerBootMatrixCache = new Map();

function getSidePlayerWearableSpriteId(item, slot) {
    if (typeof item === 'string') {
        if (
            typeof EquipmentOverhaulSpecs !== 'undefined'
            && EquipmentOverhaulSpecs[slot]
            && EquipmentOverhaulSpecs[slot][item]
        ) {
            return item;
        }
        if (
            typeof ItemDatabase !== 'undefined'
            && ItemDatabase[item]
            && ItemDatabase[item].slot === slot
        ) {
            return ItemDatabase[item].spriteId || null;
        }
        return null;
    }

    if (!item || !item.spriteId) return null;
    return item.slot && item.slot !== slot
        ? null
        : item.spriteId;
}

function getSidePointToward(start, end, distance) {
    const maxDistance = Math.max(
        1,
        Math.floor(Math.hypot(
            end[0] - start[0],
            end[1] - start[1]
        ))
    );
    const vector = getSideVector(
        start,
        end,
        Math.min(distance, maxDistance)
    );
    return [start[0] + vector[0], start[1] + vector[1]];
}

function getSidePerpendicular(start, end) {
    const deltaX = Math.sign(end[0] - start[0]);
    const deltaY = Math.sign(end[1] - start[1]);
    if (deltaX === 0 && deltaY === 0) return [1, 0];
    return [-deltaY, deltaX];
}

function paintSideWearableBand(
    painter,
    center,
    limbStart,
    limbEnd,
    key,
    radius = 1
) {
    const perpendicular = getSidePerpendicular(limbStart, limbEnd);
    painter.line(
        center[0] - (perpendicular[0] * radius),
        center[1] - (perpendicular[1] * radius),
        center[0] + (perpendicular[0] * radius),
        center[1] + (perpendicular[1] * radius),
        key
    );
}

function paintSidePlayerGlove(
    painter,
    arm,
    spec,
    design,
    isFar
) {
    const elbow = arm[1];
    const hand = arm[2];
    const cuffDistance = design.coverage === 'bracer' ? 4 : 2;
    const cuff = getSidePointToward(hand, elbow, cuffDistance);
    const fill = isFar ? spec.shadow : spec.primary;
    const detail = isFar ? spec.primary : spec.highlight;
    const accent = isFar ? spec.shadow : spec.accent;
    const heavy = design.bulk === 'heavy';

    if (design.coverage === 'wraps') {
        paintSideLine(painter, cuff, hand, fill, 3, 1);
        paintSideWearableBand(
            painter,
            cuff,
            elbow,
            hand,
            accent
        );
        const middle = getSidePointToward(hand, elbow, 1);
        paintSideWearableBand(
            painter,
            middle,
            elbow,
            hand,
            detail
        );
        return;
    }

    if (design.coverage === 'fingerless') {
        paintSideLine(painter, cuff, hand, fill, 3, 1);
        painter.set(hand[0], hand[1], fill);
        paintSideWearableBand(
            painter,
            cuff,
            elbow,
            hand,
            accent
        );
        painter.set(
            hand[0] + Math.sign(hand[0] - elbow[0]),
            hand[1] + Math.sign(hand[1] - elbow[1]),
            detail
        );
        return;
    }

    paintSideLine(
        painter,
        cuff,
        hand,
        fill,
        heavy ? 5 : 4,
        heavy ? 3 : 2
    );
    painter.ellipse(hand[0], hand[1], 2, 2, 'X');
    painter.ellipse(hand[0], hand[1], 1, 1, fill);

    if (design.coverage === 'bracer') {
        paintSideWearableBand(
            painter,
            cuff,
            elbow,
            hand,
            detail,
            heavy ? 2 : 1
        );
    }

    switch (spec.style) {
        case 'mitts': {
            const seam = getSidePointToward(hand, elbow, 1);
            painter.set(seam[0], seam[1], spec.shadow);
            break;
        }
        case 'gauntlets':
            paintSideWearableBand(
                painter,
                hand,
                elbow,
                hand,
                spec.highlight
            );
            painter.set(hand[0], hand[1], accent);
            break;
        case 'shards': {
            const perpendicular = getSidePerpendicular(elbow, hand);
            painter.points([
                [
                    cuff[0] + (perpendicular[0] * 2),
                    cuff[1] + (perpendicular[1] * 2)
                ],
                [
                    hand[0] + (perpendicular[0] * 2),
                    hand[1] + (perpendicular[1] * 2)
                ]
            ], spec.highlight);
            painter.set(hand[0], hand[1], accent);
            break;
        }
        case 'bark':
            painter.line(
                cuff[0],
                cuff[1],
                hand[0],
                hand[1],
                spec.highlight
            );
            painter.set(cuff[0], cuff[1], accent);
            break;
        case 'barnacle': {
            const perpendicular = getSidePerpendicular(elbow, hand);
            painter.points([
                [
                    cuff[0] + perpendicular[0],
                    cuff[1] + perpendicular[1]
                ],
                [
                    hand[0] - perpendicular[0],
                    hand[1] - perpendicular[1]
                ]
            ], spec.accent);
            painter.set(hand[0], hand[1], spec.highlight);
            break;
        }
        case 'work':
            paintSideWearableBand(
                painter,
                cuff,
                elbow,
                hand,
                spec.accent
            );
            painter.set(hand[0], hand[1], detail);
            break;
        default:
            break;
    }
}

function makeSidePlayerGloveMatrix(
    spriteId,
    spec,
    gender,
    poseDefinition,
    poseId = null
) {
    const design = (
        typeof GloveDesignProfiles !== 'undefined'
        && GloveDesignProfiles[spec.style]
    );
    if (!design) return null;

    const matrix = createNativeOverhaulSprite(painter => {
        paintSidePlayerGlove(
            painter,
            poseDefinition.farArm,
            spec,
            design,
            true
        );
        paintSidePlayerGlove(
            painter,
            poseDefinition.nearArm,
            spec,
            design,
            false
        );
    });

    const body = (
        poseId
        && typeof SidePlayerAnimationMatrices !== 'undefined'
    )
        ? SidePlayerAnimationMatrices[`${gender}_${poseId}`]
        : null;
    if (body) {
        for (let y = 0; y <= 11; y += 1) {
            for (let x = 0; x < SIDE_PLAYER_ANIMATION_SIZE; x += 1) {
                if (body[y][x] !== '.') matrix[y][x] = '.';
            }
        }
    }

    return matrix;
}

function getSidePlayerGloveMatrix(
    gloveItem,
    gender,
    poseId
) {
    const spriteId = getSidePlayerWearableSpriteId(
        gloveItem,
        'gloves'
    );
    const resolvedGender = gender === 'female' ? 'female' : 'male';
    const poseDefinition = SidePlayerPoseDefinitions[poseId];
    if (
        !spriteId
        || !poseDefinition
        || typeof EquipmentOverhaulSpecs === 'undefined'
    ) {
        return null;
    }

    const spec = EquipmentOverhaulSpecs.gloves[spriteId];
    if (!spec) return null;

    const cacheKey = `${spriteId}:${resolvedGender}:${poseId}`;
    if (SidePlayerGloveMatrixCache.has(cacheKey)) {
        return SidePlayerGloveMatrixCache.get(cacheKey);
    }

    const matrix = makeSidePlayerGloveMatrix(
        spriteId,
        spec,
        resolvedGender,
        poseDefinition,
        poseId
    );
    if (matrix) SidePlayerGloveMatrixCache.set(cacheKey, matrix);
    return matrix;
}

function paintSidePlayerBoot(
    painter,
    leg,
    spec,
    design,
    isFar
) {
    const [, knee, ankle, toe] = leg;
    const shaftStart = design.height === 'high'
        ? knee
        : design.height === 'mid'
        ? getSidePointToward(ankle, knee, 3)
        : getSidePointToward(ankle, knee, 1);
    const fill = isFar ? spec.shadow : spec.primary;
    const detail = isFar ? spec.primary : spec.highlight;
    const accent = isFar ? spec.shadow : spec.accent;
    const heavy = design.bulk === 'heavy';
    const outlineWidth = heavy ? 5 : 4;
    const fillWidth = heavy ? 3 : 2;

    paintSideLine(
        painter,
        shaftStart,
        ankle,
        fill,
        outlineWidth,
        fillWidth
    );
    paintSideLine(
        painter,
        ankle,
        toe,
        fill,
        heavy ? 6 : 5,
        heavy ? 4 : 3
    );
    paintSideWearableBand(
        painter,
        shaftStart,
        knee,
        ankle,
        design.height === 'high' ? spec.accent : detail,
        heavy ? 2 : 1
    );

    switch (spec.style) {
        case 'boots':
            painter.set(ankle[0], ankle[1], accent);
            break;
        case 'striders':
            painter.line(
                shaftStart[0],
                shaftStart[1],
                ankle[0],
                ankle[1],
                spec.accent
            );
            break;
        case 'leaf': {
            const perpendicular = getSidePerpendicular(ankle, toe);
            painter.points([
                [
                    ankle[0] + (perpendicular[0] * 2),
                    ankle[1] + (perpendicular[1] * 2)
                ],
                [
                    ankle[0] + perpendicular[0],
                    ankle[1] + perpendicular[1]
                ]
            ], spec.accent);
            painter.line(
                ankle[0],
                ankle[1],
                toe[0],
                toe[1],
                spec.highlight
            );
            break;
        }
        case 'stompers':
            painter.line(
                ankle[0],
                ankle[1] + 1,
                toe[0],
                Math.min(31, toe[1]),
                spec.accent,
                2
            );
            break;
        case 'cleats':
            painter.points([
                [ankle[0], Math.min(31, ankle[1] + 2)],
                [toe[0], Math.min(31, toe[1])]
            ], spec.accent);
            painter.set(toe[0], Math.max(0, toe[1] - 1), spec.highlight);
            break;
        case 'sabatons': {
            const middle = getSidePointToward(toe, ankle, 2);
            paintSideWearableBand(
                painter,
                middle,
                ankle,
                toe,
                spec.highlight
            );
            painter.set(toe[0], toe[1], accent);
            break;
        }
        case 'stagger':
            painter.line(
                shaftStart[0],
                shaftStart[1],
                toe[0],
                toe[1],
                spec.highlight
            );
            painter.set(ankle[0], ankle[1], spec.accent);
            break;
        case 'waders':
            painter.line(
                shaftStart[0],
                shaftStart[1],
                ankle[0],
                ankle[1],
                detail
            );
            break;
        case 'stumps':
            painter.line(
                shaftStart[0],
                shaftStart[1],
                toe[0],
                toe[1],
                spec.shadow
            );
            painter.set(shaftStart[0], shaftStart[1], spec.accent);
            break;
        case 'coral': {
            const perpendicular = getSidePerpendicular(shaftStart, ankle);
            painter.points([
                [
                    shaftStart[0] + (perpendicular[0] * 2),
                    shaftStart[1] + (perpendicular[1] * 2)
                ],
                [
                    ankle[0] + (perpendicular[0] * 2),
                    ankle[1] + (perpendicular[1] * 2)
                ]
            ], spec.accent);
            painter.set(toe[0], toe[1], spec.highlight);
            break;
        }
        case 'muddy':
            painter.line(
                ankle[0],
                Math.min(31, ankle[1] + 1),
                toe[0],
                Math.min(31, toe[1]),
                spec.accent,
                2
            );
            painter.set(shaftStart[0], shaftStart[1], detail);
            break;
        default:
            break;
    }
}

function makeSidePlayerBootMatrix(
    spriteId,
    spec,
    gender,
    poseDefinition
) {
    const design = (
        typeof BootDesignProfiles !== 'undefined'
        && BootDesignProfiles[spec.style]
    );
    if (!design) return null;
    const legs = getSideProfileLegs(poseDefinition);

    return createNativeOverhaulSprite(painter => {
        paintSidePlayerBoot(
            painter,
            legs.farLeg,
            spec,
            design,
            true
        );
        paintSidePlayerBoot(
            painter,
            legs.nearLeg,
            spec,
            design,
            false
        );
    });
}

function getSidePlayerBootMatrix(
    bootItem,
    gender,
    poseId
) {
    const spriteId = getSidePlayerWearableSpriteId(
        bootItem,
        'boots'
    );
    const resolvedGender = gender === 'female' ? 'female' : 'male';
    const poseDefinition = SidePlayerPoseDefinitions[poseId];
    if (
        !spriteId
        || !poseDefinition
        || typeof EquipmentOverhaulSpecs === 'undefined'
    ) {
        return null;
    }

    const spec = EquipmentOverhaulSpecs.boots[spriteId];
    if (!spec) return null;

    const cacheKey = `${spriteId}:${resolvedGender}:${poseId}`;
    if (SidePlayerBootMatrixCache.has(cacheKey)) {
        return SidePlayerBootMatrixCache.get(cacheKey);
    }

    const matrix = makeSidePlayerBootMatrix(
        spriteId,
        spec,
        resolvedGender,
        poseDefinition
    );
    if (matrix) SidePlayerBootMatrixCache.set(cacheKey, matrix);
    return matrix;
}

function paintSideSword(painter, weapon) {
    const grip = weapon.grip;
    const tip = weapon.tip;
    const direction = getSideVector(grip, tip, 2);
    const pommel = [grip[0] - direction[0], grip[1] - direction[1]];
    const guard = [-Math.sign(direction[1] || 1), Math.sign(direction[0] || 1)];

    paintSideLine(painter, grip, tip, 's', 3, 1);
    painter.line(
        grip[0] - guard[0] * 2,
        grip[1] - guard[1] * 2,
        grip[0] + guard[0] * 2,
        grip[1] + guard[1] * 2,
        'Y',
        1
    );
    painter.line(grip[0], grip[1], pommel[0], pommel[1], 'l', 2);
    painter.set(pommel[0], pommel[1], 'N');
    painter.set(tip[0], tip[1], 'W');
}

function paintSideMace(painter, weapon) {
    paintSideLine(painter, weapon.grip, weapon.head, 'l', 3, 1);
    painter.ellipse(weapon.head[0], weapon.head[1], 3, 3, 'X');
    painter.ellipse(weapon.head[0], weapon.head[1], 2, 2, 'I');
    painter.points([
        [weapon.head[0] + 1, weapon.head[1] - 1],
        [weapon.head[0] + 2, weapon.head[1]]
    ], 's');
}

function paintSideBow(painter, weapon) {
    const grip = weapon.grip;
    const topBend = [grip[0] + 2, Math.round((weapon.top[1] + grip[1]) / 2)];
    const bottomBend = [grip[0] + 2, Math.round((weapon.bottom[1] + grip[1]) / 2)];

    paintSideLine(painter, weapon.top, topBend, 'c', 3, 1);
    paintSideLine(painter, topBend, grip, 'c', 3, 1);
    paintSideLine(painter, grip, bottomBend, 'c', 3, 1);
    paintSideLine(painter, bottomBend, weapon.bottom, 'c', 3, 1);
    painter.line(weapon.top[0], weapon.top[1], weapon.draw[0], weapon.draw[1], 'b');
    painter.line(weapon.draw[0], weapon.draw[1], weapon.bottom[0], weapon.bottom[1], 'b');

    const arrowStart = weapon.arrowStart || weapon.draw;
    painter.line(
        arrowStart[0],
        arrowStart[1],
        weapon.arrowTip[0],
        weapon.arrowTip[1],
        'l'
    );
    painter.set(weapon.arrowTip[0], weapon.arrowTip[1], 's');
}

function paintSideStaff(painter, weapon) {
    paintSideLine(painter, weapon.bottom, weapon.top, 'c', 3, 1);
    painter.ellipse(weapon.top[0], weapon.top[1], 2, 2, 'X');
    painter.set(weapon.top[0], weapon.top[1], '^');
    painter.set(weapon.top[0] + 1, weapon.top[1] - 1, 'W');

    if (weapon.glow >= 1) {
        painter.points([
            [weapon.top[0] - 3, weapon.top[1]],
            [weapon.top[0] + 3, weapon.top[1]]
        ], '^');
    }
    if (weapon.glow >= 2) {
        painter.points([
            [weapon.top[0], weapon.top[1] - 3],
            [weapon.top[0] - 2, weapon.top[1] + 2],
            [weapon.top[0] + 2, weapon.top[1] + 2]
        ], 'v');
    }
    if (weapon.glow >= 3) {
        painter.points([
            [weapon.top[0] - 4, weapon.top[1] - 2],
            [weapon.top[0] + 4, weapon.top[1] - 2],
            [weapon.top[0] + 4, weapon.top[1] + 2]
        ], 'W');
    }
}

function makeSidePlaceholderWeapon(weaponDefinition) {
    return createNativeOverhaulSprite(painter => {
        switch (weaponDefinition.kind) {
            case 'mace':
                paintSideMace(painter, weaponDefinition);
                break;
            case 'bow':
                paintSideBow(painter, weaponDefinition);
                break;
            case 'staff':
                paintSideStaff(painter, weaponDefinition);
                break;
            case 'sword':
            default:
                paintSideSword(painter, weaponDefinition);
                break;
        }
    });
}

const SidePlayerAnimationMatrices = {};
const SidePlayerPlaceholderWeaponMatrices = {};
const SidePlayerEquippedWeaponMatrixCache = new Map();

Object.entries(SidePlayerPoseDefinitions).forEach(([poseId, poseDefinition]) => {
    ['male', 'female'].forEach(gender => {
        SidePlayerAnimationMatrices[`${gender}_${poseId}`] = makeSidePlayerBody(
            gender,
            poseDefinition
        );
    });
    SidePlayerPlaceholderWeaponMatrices[poseId] = makeSidePlaceholderWeapon(
        poseDefinition.weapon
    );
});

function getSidePoseWeaponAim(weaponDefinition) {
    return weaponDefinition.tip
        || weaponDefinition.head
        || weaponDefinition.top
        || weaponDefinition.arrowTip
        || weaponDefinition.grip;
}

function getSidePlayerEquippedWeaponMatrix(weaponItem, clipId, frameIndex = 0) {
    if (
        !weaponItem
        || !weaponItem.spriteId
        || typeof SpriteMatrices === 'undefined'
        || !SpriteMatrices[weaponItem.spriteId]
    ) {
        return null;
    }

    const frame = getSidePlayerAnimationFrame('male', clipId, frameIndex);
    const cacheKey = `${weaponItem.spriteId}:${frame.poseId}`;
    if (SidePlayerEquippedWeaponMatrixCache.has(cacheKey)) {
        return SidePlayerEquippedWeaponMatrixCache.get(cacheKey);
    }

    const weaponSpec = typeof EquipmentOverhaulSpecs !== 'undefined'
        ? EquipmentOverhaulSpecs.weapon[weaponItem.spriteId]
        : null;
    const style = weaponSpec ? weaponSpec.style : String(weaponItem.type || '').toLowerCase();
    const centeredBlueprint = (
        typeof FRONT_CENTERED_WEAPON_BLUEPRINTS !== 'undefined'
        && FRONT_CENTERED_WEAPON_BLUEPRINTS[style]
    ) || null;
    const source = centeredBlueprint
        ? SpriteMatrices[weaponItem.spriteId]
        : (
            typeof EquipmentOverhaulWeaponSourceMatrices !== 'undefined'
            && EquipmentOverhaulWeaponSourceMatrices[weaponItem.spriteId]
        )
            || SpriteMatrices[weaponItem.spriteId];
    const sourceGrip = centeredBlueprint
        ? [centeredBlueprint.grip.x, centeredBlueprint.grip.y]
        : [24, 21];
    const targetGrip = frame.pose.weapon.grip || frame.anchors.weaponHand;
    const rotatesWithPose = style !== 'knuckles';
    const targetAim = getSidePoseWeaponAim(frame.pose.weapon);
    const targetAngle = Math.atan2(
        targetAim[1] - targetGrip[1],
        targetAim[0] - targetGrip[0]
    );
    const rotation = rotatesWithPose
        ? targetAngle + (Math.PI / 2)
        : 0;
    const scale = style === 'knuckles'
        ? 1
        : (frame.clipId === 'shoot' || frame.clipId === 'cast' ? 0.72 : 0.68);
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    const rows = Array.from(
        { length: SIDE_PLAYER_ANIMATION_SIZE },
        () => Array(SIDE_PLAYER_ANIMATION_SIZE).fill('.')
    );

    for (let y = 0; y < SIDE_PLAYER_ANIMATION_SIZE; y++) {
        for (let x = 0; x < SIDE_PLAYER_ANIMATION_SIZE; x++) {
            const targetDeltaX = x - targetGrip[0];
            const targetDeltaY = y - targetGrip[1];
            const sourceX = Math.round(
                ((cosine * targetDeltaX + sine * targetDeltaY) / scale)
                + sourceGrip[0]
            );
            const sourceY = Math.round(
                ((-sine * targetDeltaX + cosine * targetDeltaY) / scale)
                + sourceGrip[1]
            );
            const key = source[sourceY]?.[sourceX];
            if (key && key !== '.') rows[y][x] = key;
        }
    }

    const transformed = buildSprite(
        rows.map(row => row.join('')),
        { sourceSize: SIDE_PLAYER_ANIMATION_SIZE }
    );
    SidePlayerEquippedWeaponMatrixCache.set(cacheKey, transformed);
    return transformed;
}

function drawSidePlayerEquippedWeaponBitmap(
    context,
    weaponItem,
    frame,
    size
) {
    if (
        !context
        || !weaponItem
        || !weaponItem.spriteId
        || typeof SpriteMatrices === 'undefined'
        || !SpriteMatrices[weaponItem.spriteId]
        || typeof getFrontPaperdollWeaponBitmap !== 'function'
    ) {
        return false;
    }

    const weaponSpec = typeof EquipmentOverhaulSpecs !== 'undefined'
        ? EquipmentOverhaulSpecs.weapon[weaponItem.spriteId]
        : null;
    const style = weaponSpec
        ? weaponSpec.style
        : String(weaponItem.type || '').toLowerCase();
    const centeredBlueprint = (
        typeof FRONT_CENTERED_WEAPON_BLUEPRINTS !== 'undefined'
        && FRONT_CENTERED_WEAPON_BLUEPRINTS[style]
    ) || null;
    if (!centeredBlueprint) return false;

    const source = SpriteMatrices[weaponItem.spriteId];
    const bitmap = getFrontPaperdollWeaponBitmap(
        weaponItem.spriteId,
        source,
        size
    );
    if (!bitmap) return false;

    const targetGrip =
        frame.pose.weapon.grip || frame.anchors.weaponHand;
    const targetAim = getSidePoseWeaponAim(frame.pose.weapon);
    const targetAngle = Math.atan2(
        targetAim[1] - targetGrip[1],
        targetAim[0] - targetGrip[0]
    );
    const rotation = style === 'knuckles'
        ? 0
        : targetAngle + (Math.PI / 2);
    const renderScale = style === 'knuckles'
        ? (centeredBlueprint.scale || 0.72)
        : (
            frame.clipId === 'shoot'
            || frame.clipId === 'cast'
                ? 0.72
                : 0.68
        );
    const cellSize = size / SIDE_PLAYER_ANIMATION_SIZE;
    const bitmapCellSize = bitmap.width
        / SIDE_PLAYER_ANIMATION_SIZE;
    const targetX = (targetGrip[0] + 0.5) * cellSize;
    const targetY = (targetGrip[1] + 0.5) * cellSize;
    const sourceX = (
        (centeredBlueprint.grip.x + 0.5)
        * bitmapCellSize
    );
    const sourceY = (
        (centeredBlueprint.grip.y + 0.5)
        * bitmapCellSize
    );
    const bitmapToCanvasScale = size / bitmap.width;

    context.save();
    context.imageSmoothingEnabled = false;
    context.beginPath();
    context.rect(0, 0, size, size);
    if (style !== 'knuckles') {
        context.rect(
            targetGrip[0] * cellSize,
            targetGrip[1] * cellSize,
            cellSize,
            cellSize
        );
    }
    context.clip('evenodd');
    context.translate(targetX, targetY);
    context.rotate(rotation);
    context.scale(
        bitmapToCanvasScale * renderScale,
        bitmapToCanvasScale * renderScale
    );
    context.translate(-sourceX, -sourceY);
    context.drawImage(bitmap, 0, 0);
    context.restore();
    return true;
}

function getSidePlayerAnimationFrame(gender, clipId, frameIndex = 0) {
    const resolvedGender = gender === 'female' ? 'female' : 'male';
    const clip = SidePlayerAnimationClips[clipId] || SidePlayerAnimationClips.idle;
    const normalizedIndex = ((frameIndex % clip.frames.length) + clip.frames.length)
        % clip.frames.length;
    const poseId = clip.frames[normalizedIndex];
    const pose = SidePlayerPoseDefinitions[poseId];
    const legs = getSideProfileLegs(pose);

    return {
        gender: resolvedGender,
        clipId: Object.prototype.hasOwnProperty.call(SidePlayerAnimationClips, clipId)
            ? clipId
            : 'idle',
        frameIndex: normalizedIndex,
        frameCount: clip.frames.length,
        poseId,
        pose,
        body: SidePlayerAnimationMatrices[`${resolvedGender}_${poseId}`],
        weapon: SidePlayerPlaceholderWeaponMatrices[poseId],
        anchors: {
            headCenter: [16, 7],
            supportHand: pose.farArm[pose.farArm.length - 1],
            weaponHand: pose.nearArm[pose.nearArm.length - 1],
            backFoot: legs.farLeg[legs.farLeg.length - 1],
            frontFoot: legs.nearLeg[legs.nearLeg.length - 1]
        }
    };
}

function getMirroredSidePlayerAnchor(anchor, facing = 'right') {
    if (facing !== 'left') return { x: anchor[0], y: anchor[1] };
    return {
        x: SIDE_PLAYER_ANIMATION_SIZE - 1 - anchor[0],
        y: anchor[1]
    };
}

function drawSidePlayerAnimationFrame(
    context,
    gender,
    clipId,
    frameIndex,
    size = SIDE_PLAYER_ANIMATION_SIZE,
    options = {}
) {
    const frame = getSidePlayerAnimationFrame(gender, clipId, frameIndex);
    const pixelSize = size / SIDE_PLAYER_ANIMATION_SIZE;
    const facing = options.facing === 'left' ? 'left' : 'right';
    const hairStyle = options.hairStyle
        || (
            typeof player !== 'undefined'
            && player.appearance
            && player.appearance.hair
        )
        || 'hair_bald';
    const helmetItem = Object.prototype.hasOwnProperty.call(options, 'helmetItem')
        ? options.helmetItem
        : (
            typeof player !== 'undefined'
            && player.equipment
            && player.equipment.helmet
        )
        || null;
    const armorItem = Object.prototype.hasOwnProperty.call(options, 'armorItem')
        ? options.armorItem
        : (
            typeof player !== 'undefined'
            && player.equipment
            && player.equipment.armor
        )
        || null;
    const gloveItem = Object.prototype.hasOwnProperty.call(options, 'gloveItem')
        ? options.gloveItem
        : (
            typeof player !== 'undefined'
            && player.equipment
            && player.equipment.gloves
        )
        || null;
    const bootItem = Object.prototype.hasOwnProperty.call(options, 'bootItem')
        ? options.bootItem
        : (
            typeof player !== 'undefined'
            && player.equipment
            && player.equipment.boots
        )
        || null;
    const helmetLayers = getSidePlayerHelmetLayers(helmetItem);
    const hairLayers = getSidePlayerHairLayersForHelmet(hairStyle, helmetItem);
    const armorMatrix = getSidePlayerArmorMatrix(
        armorItem,
        frame.gender,
        frame.poseId
    );
    const gloveMatrix = getSidePlayerGloveMatrix(
        gloveItem,
        frame.gender,
        frame.poseId
    );
    const bootMatrix = getSidePlayerBootMatrix(
        bootItem,
        frame.gender,
        frame.poseId
    );
    const showHair = options.showHair !== false;

    context.save();
    context.imageSmoothingEnabled = false;
    if (facing === 'left') {
        context.translate(size, 0);
        context.scale(-1, 1);
    }
    context.translate(0, frame.pose.bobY * pixelSize);
    if (helmetLayers) {
        drawProceduralSprite(context, helmetLayers.back, 0, 0, size);
    }
    if (showHair) {
        drawProceduralSprite(context, hairLayers.back, 0, 0, size);
    }
    drawProceduralSprite(context, frame.body, 0, 0, size);
    if (bootMatrix) {
        drawProceduralSprite(context, bootMatrix, 0, 0, size);
    }
    if (armorMatrix) {
        drawProceduralSprite(context, armorMatrix, 0, 0, size);
    }
    if (gloveMatrix) {
        drawProceduralSprite(context, gloveMatrix, 0, 0, size);
    }
    if (showHair) {
        drawProceduralSprite(context, hairLayers.front, 0, 0, size);
    }
    if (helmetLayers) {
        drawProceduralSprite(context, helmetLayers.front, 0, 0, size);
    }
    const usesEquippedWeapon = Object.prototype.hasOwnProperty.call(
        options,
        'weaponItem'
    );
    let weaponDrawn = false;
    if (usesEquippedWeapon) {
        weaponDrawn = drawSidePlayerEquippedWeaponBitmap(
            context,
            options.weaponItem,
            frame,
            size
        );
    }
    if (!weaponDrawn) {
        const weaponMatrix = usesEquippedWeapon
            ? getSidePlayerEquippedWeaponMatrix(
                options.weaponItem,
                frame.clipId,
                frame.frameIndex
            )
            : frame.weapon;
        if (weaponMatrix) {
            drawProceduralSprite(
                context,
                weaponMatrix,
                0,
                0,
                size
            );
        }
    }

    if (options.showAnchors) {
        const anchorColors = {
            headCenter: '#39b8ba',
            supportHand: '#d5a13f',
            weaponHand: '#f05c5c',
            backFoot: '#6abf69',
            frontFoot: '#8bc7ff'
        };
        Object.entries(frame.anchors).forEach(([anchorId, anchor]) => {
            context.fillStyle = anchorColors[anchorId];
            context.fillRect(
                anchor[0] * pixelSize,
                anchor[1] * pixelSize,
                Math.max(1, pixelSize),
                Math.max(1, pixelSize)
            );
        });
    }

    context.restore();
    return frame;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SIDE_PLAYER_ANIMATION_SIZE,
        SIDE_PLAYER_PROFILE_SHOULDER_X,
        SIDE_PLAYER_COMBAT_FAR_LEG,
        SIDE_PLAYER_COMBAT_NEAR_LEG,
        SidePlayerAnimationClips,
        SidePlayerPoseDefinitions,
        SidePlayerHairStyleProfiles,
        SidePlayerHairMatrices,
        SidePlayerHelmetProfiles,
        SidePlayerHelmetHairMaskProfiles,
        SidePlayerHelmetHairMaskMatrices,
        SidePlayerHelmetMatrices,
        SidePlayerMaskedHairMatrixCache,
        SidePlayerArmorMatrixCache,
        SidePlayerGloveMatrixCache,
        SidePlayerBootMatrixCache,
        SidePlayerAnimationMatrices,
        SidePlayerPlaceholderWeaponMatrices,
        SidePlayerEquippedWeaponMatrixCache,
        getSideProfileLegs,
        getSidePlayerHairLayers,
        getSidePlayerHelmetLayers,
        getSidePlayerHairLayersForHelmet,
        getSidePlayerArmorSpriteId,
        getSidePlayerArmorTorsoSpans,
        getSidePlayerArmorMatrix,
        makeSidePlayerArmorMatrix,
        getSidePlayerWearableSpriteId,
        getSidePlayerGloveMatrix,
        makeSidePlayerGloveMatrix,
        getSidePlayerBootMatrix,
        makeSidePlayerBootMatrix,
        applySidePlayerHairMask,
        getSidePlayerAnimationFrame,
        getSidePlayerEquippedWeaponMatrix,
        drawSidePlayerEquippedWeaponBitmap,
        getMirroredSidePlayerAnchor,
        drawSidePlayerAnimationFrame
    };
}
