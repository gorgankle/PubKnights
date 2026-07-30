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
    }),
    thrust: Object.freeze({
        label: 'Spear / Polearm Thrust',
        fps: 8,
        loop: false,
        actionFrame: 2,
        phases: Object.freeze({
            windupEnd: 1,
            contact: 2,
            recoveryStart: 3
        }),
        frames: Object.freeze([
            'thrust_a',
            'thrust_b',
            'thrust_c',
            'thrust_d',
            'thrust_e'
        ])
    }),
    heavy: Object.freeze({
        label: 'Two-Handed Heavy Swing',
        fps: 6,
        loop: false,
        actionFrame: 3,
        powerful: true,
        phases: Object.freeze({
            windupEnd: 2,
            contact: 3,
            recoveryStart: 4
        }),
        frames: Object.freeze([
            'heavy_a',
            'heavy_b',
            'heavy_c',
            'heavy_d',
            'heavy_e',
            'heavy_f'
        ])
    }),
    dagger: Object.freeze({
        label: 'Dagger / Shiv',
        fps: 10,
        loop: false,
        actionFrame: 2,
        phases: Object.freeze({
            windupEnd: 1,
            contact: 2,
            recoveryStart: 3
        }),
        frames: Object.freeze([
            'dagger_a',
            'dagger_b',
            'dagger_c',
            'dagger_d',
            'dagger_e'
        ])
    }),
    scythe: Object.freeze({
        label: 'Scythe Sweep',
        fps: 7,
        loop: false,
        actionFrame: 3,
        powerful: true,
        phases: Object.freeze({
            windupEnd: 2,
            contact: 3,
            recoveryStart: 4
        }),
        frames: Object.freeze([
            'scythe_a',
            'scythe_b',
            'scythe_c',
            'scythe_d',
            'scythe_e',
            'scythe_f'
        ])
    }),
    shield_block: Object.freeze({
        label: 'Shield Block',
        fps: 8,
        loop: false,
        actionFrame: 1,
        phases: Object.freeze({
            windupEnd: 0,
            guardStart: 1,
            guardEnd: 2,
            recoveryStart: 3
        }),
        frames: Object.freeze([
            'shield_block_a',
            'shield_block_b',
            'shield_block_c',
            'shield_block_d'
        ])
    }),
    shield_bash: Object.freeze({
        label: 'Shield Bash',
        fps: 8,
        loop: false,
        actionFrame: 2,
        phases: Object.freeze({
            windupEnd: 1,
            contact: 2,
            recoveryStart: 3
        }),
        frames: Object.freeze([
            'shield_bash_a',
            'shield_bash_b',
            'shield_bash_c',
            'shield_bash_d',
            'shield_bash_e'
        ])
    }),
    dual_wield: Object.freeze({
        label: 'Dual-Wield Flurry',
        fps: 10,
        loop: false,
        actionFrame: 2,
        phases: Object.freeze({
            windupEnd: 1,
            contact: 2,
            visualSecondStrike: 3,
            recoveryStart: 4
        }),
        frames: Object.freeze([
            'dual_wield_a',
            'dual_wield_b',
            'dual_wield_c',
            'dual_wield_d',
            'dual_wield_e',
            'dual_wield_f'
        ])
    }),
    hit: Object.freeze({
        label: 'Hit Reaction',
        fps: 10,
        loop: false,
        actionFrame: null,
        frames: Object.freeze(['hit_a', 'hit_b', 'hit_c'])
    }),
    defeat: Object.freeze({
        label: 'Defeat',
        fps: 6,
        loop: false,
        actionFrame: null,
        terminal: true,
        holdLastFrame: true,
        frames: Object.freeze([
            'defeat_a',
            'defeat_b',
            'defeat_c',
            'defeat_d'
        ])
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
    },
    thrust_a: {
        bobY: 0,
        farArm: [[13, 14], [16, 16], [18, 18]],
        nearArm: [[18, 14], [16, 17], [15, 19]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'sword',
            grip: [15, 19],
            supportGrip: [18, 18],
            tip: [6, 20]
        }
    },
    thrust_b: {
        bobY: 0,
        farArm: [[13, 14], [17, 15], [20, 17]],
        nearArm: [[18, 14], [19, 16], [18, 17]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'sword',
            grip: [18, 17],
            supportGrip: [20, 17],
            tip: [28, 16]
        }
    },
    thrust_c: {
        bobY: 0,
        farArm: [[13, 14], [18, 15], [22, 16]],
        nearArm: [[18, 14], [22, 14], [25, 15]],
        farLeg: [[17, 21], [19, 24], [22, 28], [24, 31]],
        nearLeg: [[14, 21], [14, 25], [13, 29], [15, 31]],
        weapon: {
            kind: 'sword',
            grip: [25, 15],
            supportGrip: [22, 16],
            tip: [31, 15]
        }
    },
    thrust_d: {
        bobY: 0,
        farArm: [[13, 14], [18, 15], [21, 17]],
        nearArm: [[18, 14], [21, 15], [23, 16]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'sword',
            grip: [23, 16],
            supportGrip: [21, 17],
            tip: [31, 16]
        }
    },
    thrust_e: {
        bobY: 0,
        farArm: [[13, 14], [16, 17], [18, 19]],
        nearArm: [[18, 14], [18, 17], [20, 19]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'sword',
            grip: [20, 19],
            supportGrip: [18, 19],
            tip: [29, 17]
        }
    },
    heavy_a: {
        bobY: 0,
        farArm: [[13, 14], [16, 18], [19, 20]],
        nearArm: [[18, 14], [19, 18], [21, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'mace',
            grip: [21, 21],
            supportGrip: [19, 20],
            head: [27, 27]
        }
    },
    heavy_b: {
        bobY: -1,
        farArm: [[13, 14], [14, 12], [16, 10]],
        nearArm: [[18, 14], [18, 11], [17, 9]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'mace',
            grip: [17, 9],
            supportGrip: [16, 10],
            head: [9, 4]
        }
    },
    heavy_c: {
        bobY: -1,
        farArm: [[13, 14], [16, 12], [19, 10]],
        nearArm: [[18, 14], [18, 11], [18, 9]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'mace',
            grip: [18, 9],
            supportGrip: [19, 10],
            head: [13, 3]
        }
    },
    heavy_d: {
        bobY: 1,
        farArm: [[13, 14], [18, 16], [22, 18]],
        nearArm: [[18, 14], [22, 17], [25, 20]],
        farLeg: [[17, 21], [19, 24], [22, 28], [24, 31]],
        nearLeg: [[14, 21], [13, 25], [12, 29], [14, 31]],
        weapon: {
            kind: 'mace',
            grip: [25, 20],
            supportGrip: [22, 18],
            head: [29, 28]
        }
    },
    heavy_e: {
        bobY: 1,
        farArm: [[13, 14], [17, 17], [20, 20]],
        nearArm: [[18, 14], [20, 18], [23, 22]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'mace',
            grip: [23, 22],
            supportGrip: [20, 20],
            head: [29, 29]
        }
    },
    heavy_f: {
        bobY: 0,
        farArm: [[13, 14], [15, 18], [18, 20]],
        nearArm: [[18, 14], [18, 18], [20, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'mace',
            grip: [20, 21],
            supportGrip: [18, 20],
            head: [26, 27]
        }
    },
    dagger_a: {
        bobY: 0,
        farArm: [[13, 14], [11, 17], [10, 20]],
        nearArm: [[18, 14], [16, 13], [14, 12]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [14, 12], tip: [9, 9] }
    },
    dagger_b: {
        bobY: -1,
        farArm: [[13, 14], [16, 17], [19, 19]],
        nearArm: [[18, 14], [20, 14], [22, 13]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [22, 13], tip: [27, 11] }
    },
    dagger_c: {
        bobY: 0,
        farArm: [[13, 14], [18, 16], [22, 18]],
        nearArm: [[18, 14], [23, 14], [27, 15]],
        farLeg: [[17, 21], [19, 24], [22, 28], [24, 31]],
        nearLeg: [[14, 21], [14, 25], [13, 29], [15, 31]],
        weapon: { kind: 'sword', grip: [27, 15], tip: [31, 14] }
    },
    dagger_d: {
        bobY: 0,
        farArm: [[13, 14], [17, 17], [20, 19]],
        nearArm: [[18, 14], [20, 16], [23, 18]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [23, 18], tip: [28, 19] }
    },
    dagger_e: {
        bobY: 0,
        farArm: [[13, 14], [14, 18], [16, 21]],
        nearArm: [[18, 14], [17, 18], [19, 20]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [19, 20], tip: [24, 17] }
    },
    scythe_a: {
        bobY: 0,
        farArm: [[13, 14], [16, 17], [18, 19]],
        nearArm: [[18, 14], [18, 18], [20, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'sword',
            grip: [20, 21],
            supportGrip: [18, 19],
            tip: [24, 3]
        }
    },
    scythe_b: {
        bobY: -1,
        farArm: [[13, 14], [14, 12], [16, 10]],
        nearArm: [[18, 14], [18, 11], [18, 9]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'sword',
            grip: [18, 9],
            supportGrip: [16, 10],
            tip: [8, 4]
        }
    },
    scythe_c: {
        bobY: -1,
        farArm: [[13, 14], [14, 13], [16, 12]],
        nearArm: [[18, 14], [17, 13], [18, 12]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'sword',
            grip: [18, 12],
            supportGrip: [16, 12],
            tip: [28, 4]
        }
    },
    scythe_d: {
        bobY: 0,
        farArm: [[13, 14], [18, 15], [22, 17]],
        nearArm: [[18, 14], [22, 14], [25, 16]],
        farLeg: [[17, 21], [19, 24], [22, 28], [24, 31]],
        nearLeg: [[14, 21], [13, 25], [12, 29], [14, 31]],
        weapon: {
            kind: 'sword',
            grip: [25, 16],
            supportGrip: [22, 17],
            tip: [31, 23]
        }
    },
    scythe_e: {
        bobY: 1,
        farArm: [[13, 14], [17, 18], [20, 21]],
        nearArm: [[18, 14], [20, 18], [23, 22]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'sword',
            grip: [23, 22],
            supportGrip: [20, 21],
            tip: [30, 28]
        }
    },
    scythe_f: {
        bobY: 0,
        farArm: [[13, 14], [15, 18], [18, 20]],
        nearArm: [[18, 14], [18, 18], [20, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: {
            kind: 'sword',
            grip: [20, 21],
            supportGrip: [18, 20],
            tip: [24, 4]
        }
    },
    shield_block_a: {
        bobY: 0,
        farArm: [[13, 14], [14, 17], [16, 20]],
        nearArm: [[18, 14], [19, 18], [21, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [21, 21], tip: [27, 15] },
        offhand: {
            kind: 'shield',
            grip: [16, 20],
            center: [18, 18],
            angle: -8,
            layer: 'front'
        }
    },
    shield_block_b: {
        bobY: -1,
        farArm: [[13, 14], [17, 15], [20, 16]],
        nearArm: [[18, 14], [18, 18], [20, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [20, 21], tip: [26, 15] },
        offhand: {
            kind: 'shield',
            grip: [20, 16],
            center: [23, 15],
            angle: 0,
            layer: 'front'
        }
    },
    shield_block_c: {
        bobY: -1,
        farArm: [[13, 14], [18, 15], [21, 16]],
        nearArm: [[18, 14], [18, 18], [20, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [20, 21], tip: [26, 15] },
        offhand: {
            kind: 'shield',
            grip: [21, 16],
            center: [24, 15],
            angle: 2,
            layer: 'front'
        }
    },
    shield_block_d: {
        bobY: 0,
        farArm: [[13, 14], [16, 16], [19, 18]],
        nearArm: [[18, 14], [18, 17], [20, 20]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [20, 20], tip: [26, 14] },
        offhand: {
            kind: 'shield',
            grip: [19, 18],
            center: [21, 17],
            angle: -3,
            layer: 'front'
        }
    },
    shield_bash_a: {
        bobY: 0,
        farArm: [[13, 14], [14, 17], [16, 20]],
        nearArm: [[18, 14], [16, 13], [14, 12]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [14, 12], tip: [9, 7] },
        offhand: {
            kind: 'shield',
            grip: [16, 20],
            center: [18, 18],
            angle: -10,
            layer: 'front'
        }
    },
    shield_bash_b: {
        bobY: -1,
        farArm: [[13, 14], [17, 15], [20, 16]],
        nearArm: [[18, 14], [16, 13], [14, 12]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [14, 12], tip: [9, 7] },
        offhand: {
            kind: 'shield',
            grip: [20, 16],
            center: [23, 15],
            angle: 0,
            layer: 'front'
        }
    },
    shield_bash_c: {
        bobY: 0,
        farArm: [[13, 14], [19, 15], [24, 16]],
        nearArm: [[18, 14], [17, 16], [19, 19]],
        farLeg: [[17, 21], [19, 24], [22, 28], [24, 31]],
        nearLeg: [[14, 21], [14, 25], [13, 29], [15, 31]],
        weapon: { kind: 'sword', grip: [19, 19], tip: [25, 13] },
        offhand: {
            kind: 'shield',
            grip: [24, 16],
            center: [28, 16],
            angle: 8,
            layer: 'front'
        }
    },
    shield_bash_d: {
        bobY: 0,
        farArm: [[13, 14], [18, 16], [22, 17]],
        nearArm: [[18, 14], [18, 17], [21, 20]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [21, 20], tip: [27, 14] },
        offhand: {
            kind: 'shield',
            grip: [22, 17],
            center: [25, 17],
            angle: 5,
            layer: 'front'
        }
    },
    shield_bash_e: {
        bobY: 0,
        farArm: [[13, 14], [15, 17], [17, 20]],
        nearArm: [[18, 14], [19, 18], [21, 21]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [21, 21], tip: [27, 15] },
        offhand: {
            kind: 'shield',
            grip: [17, 20],
            center: [19, 19],
            angle: -6,
            layer: 'front'
        }
    },
    dual_wield_a: {
        bobY: 0,
        farArm: [[13, 14], [11, 16], [10, 18]],
        nearArm: [[18, 14], [16, 13], [14, 12]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [14, 12], tip: [9, 8] },
        offhand: {
            kind: 'weapon',
            grip: [10, 18],
            aim: [6, 21],
            layer: 'back'
        }
    },
    dual_wield_b: {
        bobY: -1,
        farArm: [[13, 14], [16, 16], [19, 17]],
        nearArm: [[18, 14], [20, 14], [22, 13]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [22, 13], tip: [27, 10] },
        offhand: {
            kind: 'weapon',
            grip: [19, 17],
            aim: [24, 19],
            layer: 'back'
        }
    },
    dual_wield_c: {
        bobY: 0,
        farArm: [[13, 14], [19, 15], [23, 16]],
        nearArm: [[18, 14], [23, 14], [27, 15]],
        farLeg: [[17, 21], [19, 24], [22, 28], [24, 31]],
        nearLeg: [[14, 21], [14, 25], [13, 29], [15, 31]],
        weapon: { kind: 'sword', grip: [27, 15], tip: [31, 14] },
        offhand: {
            kind: 'weapon',
            grip: [23, 16],
            aim: [29, 18],
            layer: 'back'
        }
    },
    dual_wield_d: {
        bobY: 0,
        farArm: [[13, 14], [18, 13], [22, 11]],
        nearArm: [[18, 14], [18, 17], [20, 20]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [20, 20], tip: [25, 17] },
        offhand: {
            kind: 'weapon',
            grip: [22, 11],
            aim: [28, 8],
            layer: 'front'
        }
    },
    dual_wield_e: {
        bobY: 0,
        farArm: [[13, 14], [18, 16], [22, 18]],
        nearArm: [[18, 14], [19, 17], [22, 19]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [22, 19], tip: [27, 21] },
        offhand: {
            kind: 'weapon',
            grip: [22, 18],
            aim: [27, 15],
            layer: 'front'
        }
    },
    dual_wield_f: {
        bobY: 0,
        farArm: [[13, 14], [14, 18], [16, 21]],
        nearArm: [[18, 14], [17, 18], [19, 20]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [19, 20], tip: [24, 17] },
        offhand: {
            kind: 'weapon',
            grip: [16, 21],
            aim: [11, 19],
            layer: 'back'
        }
    },
    hit_a: {
        bobY: 0,
        stance: 'profile',
        farArm: [[13, 14], [11, 17], [12, 20]],
        nearArm: [[18, 14], [20, 16], [22, 18]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        weapon: { kind: 'sword', grip: [22, 18], tip: [27, 11] }
    },
    hit_b: {
        bobY: 0,
        stance: 'profile',
        farArm: [[13, 14], [10, 15], [8, 17]],
        nearArm: [[18, 14], [16, 12], [13, 10]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        rigTransform: {
            pivot: [16, 22],
            translate: [3.36, -0.31],
            rotateDegrees: -8,
            scale: 0.96
        },
        weapon: { kind: 'sword', grip: [13, 10], tip: [7, 5] }
    },
    hit_c: {
        bobY: 0,
        stance: 'profile',
        farArm: [[13, 14], [12, 17], [14, 20]],
        nearArm: [[18, 14], [19, 17], [20, 20]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        rigTransform: {
            pivot: [16, 22],
            translate: [-0.83, -0.09],
            rotateDegrees: -3,
            scale: 0.98
        },
        weapon: { kind: 'sword', grip: [20, 20], tip: [26, 14] }
    },
    defeat_a: {
        bobY: 0,
        stance: 'profile',
        farArm: [[13, 14], [10, 16], [8, 19]],
        nearArm: [[18, 14], [16, 12], [12, 11]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        rigTransform: {
            pivot: [16, 22],
            translate: [4.24, -0.48],
            rotateDegrees: -12,
            scale: 0.95
        },
        weapon: { kind: 'sword', grip: [12, 11], tip: [6, 7] }
    },
    defeat_b: {
        bobY: 0,
        stance: 'profile',
        farArm: [[13, 14], [11, 18], [9, 22]],
        nearArm: [[18, 14], [19, 18], [21, 22]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        rigTransform: {
            pivot: [16, 20],
            translate: [2.07, -0.59],
            rotateDegrees: -30,
            scale: 0.88
        },
        weapon: { kind: 'sword', grip: [21, 22], tip: [28, 19] }
    },
    defeat_c: {
        bobY: 0,
        stance: 'profile',
        farArm: [[13, 14], [15, 18], [18, 21]],
        nearArm: [[18, 14], [21, 16], [24, 18]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        rigTransform: {
            pivot: [16, 17],
            translate: [0.05, 3.27],
            rotateDegrees: -58,
            scale: 0.82
        },
        weapon: { kind: 'sword', grip: [24, 18], tip: [30, 16] }
    },
    defeat_d: {
        bobY: 0,
        stance: 'profile',
        farArm: [[13, 14], [15, 17], [17, 20]],
        nearArm: [[18, 14], [19, 18], [19, 22]],
        farLeg: SIDE_PLAYER_COMBAT_FAR_LEG,
        nearLeg: SIDE_PLAYER_COMBAT_NEAR_LEG,
        rigTransform: {
            pivot: [16, 16],
            translate: [0, 3],
            rotateDegrees: -90,
            scale: 0.82
        },
        weapon: { kind: 'sword', grip: [19, 22], tip: [25, 17] }
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
    helm_goblin_ears: Object.freeze({
        style: 'goblin_ears',
        hairMask: null,
        hidesHair: false
    }),
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
    }),
    helm_innkeeper: Object.freeze({
        style: 'widehat',
        hairMask: 'brim',
        hidesHair: false
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
        case 'goblin_ears':
            line(9, 7, 4, 4, 'X', 4);
            line(9, 7, 4, 4, spec.primary, 2);
            points([[4, 4], [5, 5], [7, 6]], spec.highlight);
            break;
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
        case 'goblin_ears':
            line(16, 7, 9, 5, 'X', 4);
            line(16, 7, 9, 5, spec.primary, 2);
            points([[13, 6], [11, 5], [9, 5]], spec.highlight);
            set(16, 8, spec.shadow);
            break;
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
        case 'innkeeper':
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
            if (spec.style === 'innkeeper') {
                painter.line(
                    centerX - 2,
                    14,
                    centerX - 2,
                    21,
                    spec.accent
                );
                painter.line(
                    centerX + 2,
                    14,
                    centerX + 2,
                    21,
                    spec.accent
                );
            }
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

function fitSideEquipmentAim(
    rawAim,
    relativePoints,
    padding = 0
) {
    const points = Array.isArray(relativePoints) && relativePoints.length
        ? relativePoints
        : [[0, 0]];
    const minRelativeX = Math.min(...points.map(point => point[0]));
    const maxRelativeX = Math.max(...points.map(point => point[0]));
    const minRelativeY = Math.min(...points.map(point => point[1]));
    const maxRelativeY = Math.max(...points.map(point => point[1]));
    const minimumX = 1 + padding - minRelativeX;
    const maximumX = 30 - padding - maxRelativeX;
    const minimumY = 1 + padding - minRelativeY;
    const maximumY = 30 - padding - maxRelativeY;
    const clampAxis = (value, minimum, maximum) => {
        if (minimum > maximum) return Math.round((minimum + maximum) / 2);
        return Math.max(minimum, Math.min(maximum, Math.round(value)));
    };
    return [
        clampAxis(rawAim[0], minimumX, maximumX),
        clampAxis(rawAim[1], minimumY, maximumY)
    ];
}

function makeNativeSideEquippedWeapon(spec, weaponDefinition) {
    return createNativeOverhaulSprite(painter => {
        const grip = weaponDefinition.grip;
        const rawAim = getSidePoseWeaponAim(weaponDefinition);
        const direction = getSideVector(grip, rawAim, 2);
        const normal = [
            -Math.sign(direction[1] || 1),
            Math.sign(direction[0] || 1)
        ];
        const family = spec.animationFamily;
        let unitDirection = getSideVector(grip, rawAim, 1);
        if (unitDirection[0] === 0 && unitDirection[1] === 0) {
            unitDirection = [1, 0];
        }
        const perpendicular = [
            -unitDirection[1],
            unitDirection[0]
        ];
        const outwardPerpendicular = (
            perpendicular[0] < 0
            || (perpendicular[0] === 0 && perpendicular[1] > 0)
        )
            ? [-perpendicular[0], -perpendicular[1]]
            : [...perpendicular];
        const supportGrip = Array.isArray(weaponDefinition.supportGrip)
            ? weaponDefinition.supportGrip
            : grip;
        const containedPoint = point => [
            Math.max(3, Math.min(28, Math.round(point[0]))),
            Math.max(3, Math.min(28, Math.round(point[1])))
        ];

        if (family === 'thrust') {
            const shaftButt = containedPoint([
                supportGrip[0] - unitDirection[0] * 4,
                supportGrip[1] - unitDirection[1] * 4
            ]);
            const hasTines = (
                spec.style === 'pitchfork'
                || spec.style === 'trident'
            );
            const spearHeadPoints = hasTines
                ? [
                    [0, 0],
                    [
                        -unitDirection[0]
                            + perpendicular[0] * 2,
                        -unitDirection[1]
                            + perpendicular[1] * 2
                    ],
                    [
                        -unitDirection[0]
                            - perpendicular[0] * 2,
                        -unitDirection[1]
                            - perpendicular[1] * 2
                    ],
                    [
                        -unitDirection[0] * 4
                            + perpendicular[0] * 2,
                        -unitDirection[1] * 4
                            + perpendicular[1] * 2
                    ],
                    [
                        -unitDirection[0] * 4
                            - perpendicular[0] * 2,
                        -unitDirection[1] * 4
                            - perpendicular[1] * 2
                    ]
                ]
                : [
                    [0, 0],
                    [
                        -unitDirection[0] * 3
                            + perpendicular[0] * 2,
                        -unitDirection[1] * 3
                            + perpendicular[1] * 2
                    ],
                    [
                        -unitDirection[0] * 3
                            - perpendicular[0] * 2,
                        -unitDirection[1] * 3
                            - perpendicular[1] * 2
                    ]
                ];
            const aim = fitSideEquipmentAim(
                rawAim,
                spearHeadPoints,
                1
            );
            const shaftFill = spec.style === 'pitchfork'
                ? spec.accent
                : spec.primary;

            if (hasTines) {
                const tineBase = [
                    aim[0] - unitDirection[0] * 4,
                    aim[1] - unitDirection[1] * 4
                ];
                const outerBaseA = [
                    tineBase[0] + perpendicular[0] * 2,
                    tineBase[1] + perpendicular[1] * 2
                ];
                const outerBaseB = [
                    tineBase[0] - perpendicular[0] * 2,
                    tineBase[1] - perpendicular[1] * 2
                ];
                const outerTipA = [
                    aim[0] - unitDirection[0]
                        + perpendicular[0] * 2,
                    aim[1] - unitDirection[1]
                        + perpendicular[1] * 2
                ];
                const outerTipB = [
                    aim[0] - unitDirection[0]
                        - perpendicular[0] * 2,
                    aim[1] - unitDirection[1]
                        - perpendicular[1] * 2
                ];

                paintSideLine(
                    painter,
                    shaftButt,
                    tineBase,
                    shaftFill,
                    3,
                    1
                );
                paintSideLine(
                    painter,
                    outerBaseA,
                    outerBaseB,
                    spec.primary,
                    3,
                    1
                );
                paintSideLine(
                    painter,
                    tineBase,
                    aim,
                    spec.primary,
                    2,
                    1
                );
                paintSideLine(
                    painter,
                    outerBaseA,
                    outerTipA,
                    spec.highlight,
                    2,
                    1
                );
                paintSideLine(
                    painter,
                    outerBaseB,
                    outerTipB,
                    spec.primary,
                    2,
                    1
                );
                painter.set(
                    tineBase[0],
                    tineBase[1],
                    spec.accent
                );
                return;
            }

            paintSideLine(
                painter,
                shaftButt,
                aim,
                spec.primary,
                3,
                1
            );
            painter.line(
                aim[0] - unitDirection[0] * 3
                    + perpendicular[0] * 2,
                aim[1] - unitDirection[1] * 3
                    + perpendicular[1] * 2,
                aim[0],
                aim[1],
                spec.highlight,
                2
            );
            painter.line(
                aim[0] - unitDirection[0] * 3
                    - perpendicular[0] * 2,
                aim[1] - unitDirection[1] * 3
                    - perpendicular[1] * 2,
                aim[0],
                aim[1],
                spec.accent,
                2
            );
            return;
        }

        if (family === 'dagger') {
            const aim = fitSideEquipmentAim(rawAim, [[0, 0]], 2);
            paintSideLine(
                painter,
                grip,
                aim,
                spec.primary,
                3,
                1
            );
            painter.line(
                grip[0] - normal[0] * 2,
                grip[1] - normal[1] * 2,
                grip[0] + normal[0] * 2,
                grip[1] + normal[1] * 2,
                spec.accent
            );
            painter.set(aim[0], aim[1], spec.highlight);
            return;
        }

        let aim = rawAim;
        if (family === 'scythe') {
            const bladeRootOffset = [
                -unitDirection[0],
                -unitDirection[1]
            ];
            const bladeMidOffset = [
                bladeRootOffset[0]
                    + outwardPerpendicular[0] * 3
                    - unitDirection[0],
                bladeRootOffset[1]
                    + outwardPerpendicular[1] * 3
                    - unitDirection[1]
            ];
            const bladeTipOffset = [
                bladeMidOffset[0]
                    + outwardPerpendicular[0] * 3
                    + unitDirection[0],
                bladeMidOffset[1]
                    + outwardPerpendicular[1] * 3
                    + unitDirection[1]
            ];
            aim = fitSideEquipmentAim(
                rawAim,
                [
                    [0, 0],
                    bladeRootOffset,
                    bladeMidOffset,
                    bladeTipOffset
                ],
                3
            );
        } else if (spec.style === 'axe') {
            aim = fitSideEquipmentAim(
                rawAim,
                [
                    [0, 0],
                    [
                        -direction[0] + normal[0] * 4,
                        -direction[1] + normal[1] * 4
                    ],
                    [
                        -direction[0] - normal[0] * 3,
                        -direction[1] - normal[1] * 3
                    ]
                ],
                2
            );
        } else if (spec.style === 'maul') {
            aim = fitSideEquipmentAim(
                rawAim,
                [
                    [-normal[0] * 3, -normal[1] * 3],
                    [normal[0] * 3, normal[1] * 3]
                ],
                2
            );
        } else {
            aim = fitSideEquipmentAim(
                rawAim,
                [[-4, -5], [4, 5]],
                0
            );
        }

        paintSideLine(
            painter,
            family === 'scythe'
                ? containedPoint([
                    supportGrip[0] - unitDirection[0] * 6,
                    supportGrip[1] - unitDirection[1] * 6
                ])
                : grip,
            aim,
            family === 'scythe'
                ? spec.accent
                : (
                    spec.style === 'greatclub'
                        ? spec.primary
                        : spec.shadow
                ),
            family === 'scythe' ? 3 : 4,
            family === 'scythe' ? 1 : 2
        );

        if (family === 'scythe') {
            const bladeRoot = [
                aim[0] - unitDirection[0],
                aim[1] - unitDirection[1]
            ];
            const bladeMid = [
                bladeRoot[0]
                    + outwardPerpendicular[0] * 3
                    - unitDirection[0],
                bladeRoot[1]
                    + outwardPerpendicular[1] * 3
                    - unitDirection[1]
            ];
            const bladeTip = [
                bladeMid[0]
                    + outwardPerpendicular[0] * 3
                    + unitDirection[0],
                bladeMid[1]
                    + outwardPerpendicular[1] * 3
                    + unitDirection[1]
            ];
            paintSideLine(
                painter,
                bladeRoot,
                bladeMid,
                spec.highlight,
                4,
                2
            );
            paintSideLine(
                painter,
                bladeMid,
                bladeTip,
                spec.highlight,
                3,
                1
            );
            painter.set(bladeRoot[0], bladeRoot[1], spec.accent);
            return;
        }

        if (spec.style === 'axe') {
            const root = [
                aim[0] - direction[0],
                aim[1] - direction[1]
            ];
            const bladeA = [
                root[0] + normal[0] * 4,
                root[1] + normal[1] * 4
            ];
            const bladeB = [
                root[0] - normal[0] * 3,
                root[1] - normal[1] * 3
            ];
            paintSideLine(
                painter,
                bladeA,
                aim,
                spec.primary,
                5,
                3
            );
            paintSideLine(
                painter,
                aim,
                bladeB,
                spec.highlight,
                4,
                2
            );
            painter.set(aim[0], aim[1], spec.accent);
            return;
        }

        if (spec.style === 'maul') {
            painter.line(
                aim[0] - normal[0] * 3,
                aim[1] - normal[1] * 3,
                aim[0] + normal[0] * 3,
                aim[1] + normal[1] * 3,
                'X',
                4
            );
            painter.line(
                aim[0] - normal[0] * 3,
                aim[1] - normal[1] * 3,
                aim[0] + normal[0] * 3,
                aim[1] + normal[1] * 3,
                spec.primary,
                3
            );
            painter.set(aim[0], aim[1], spec.accent);
            return;
        }

        painter.ellipse(aim[0], aim[1], 4, 5, 'X');
        painter.ellipse(aim[0], aim[1], 3, 4, spec.primary);
        painter.line(
            aim[0] - normal[0] * 2,
            aim[1] - normal[1] * 2,
            aim[0] + normal[0] * 2,
            aim[1] + normal[1] * 2,
            spec.highlight
        );
        painter.set(aim[0], aim[1], spec.accent);
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

function getRequestedSidePlayerWeaponScale(
    style,
    clipId,
    centeredBlueprint = null
) {
    if (style === 'knuckles') {
        return centeredBlueprint
            ? (centeredBlueprint.scale || 0.72)
            : 1;
    }
    if (clipId === 'shoot' || clipId === 'cast') return 0.72;
    if (style === 'machete' || style === 'staff') return 0.64;
    return 0.68;
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
    if (
        weaponSpec
        && [
            'thrust',
            'heavy',
            'dagger',
            'scythe'
        ].includes(weaponSpec.animationFamily)
    ) {
        const nativeMatrix = makeNativeSideEquippedWeapon(
            weaponSpec,
            frame.pose.weapon
        );
        SidePlayerEquippedWeaponMatrixCache.set(
            cacheKey,
            nativeMatrix
        );
        return nativeMatrix;
    }
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
    const scale = getRequestedSidePlayerWeaponScale(
        style,
        frame.clipId,
        centeredBlueprint
    );
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

function getContainedSideWeaponScale(
    source,
    sourceGrip,
    targetGrip,
    rotation,
    requestedScale
) {
    if (!source || !source.length) return requestedScale;
    const targetX = targetGrip[0] + 0.5;
    const targetY = targetGrip[1] + 0.5;
    const gripX = sourceGrip[0] + 0.5;
    const gripY = sourceGrip[1] + 0.5;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    const minimum = 0.75;
    const maximum = SIDE_PLAYER_ANIMATION_SIZE - 0.75;
    let allowedScale = requestedScale;

    source.forEach((row, y) => {
        row.forEach((key, x) => {
            if (key === '.' || key === '_') return;
            [
                [x, y],
                [x + 1, y],
                [x, y + 1],
                [x + 1, y + 1]
            ].forEach(([cornerX, cornerY]) => {
                const deltaX = cornerX - gripX;
                const deltaY = cornerY - gripY;
                const rotatedX = (
                    cosine * deltaX
                    - sine * deltaY
                );
                const rotatedY = (
                    sine * deltaX
                    + cosine * deltaY
                );
                if (rotatedX < 0) {
                    allowedScale = Math.min(
                        allowedScale,
                        (targetX - minimum) / -rotatedX
                    );
                } else if (rotatedX > 0) {
                    allowedScale = Math.min(
                        allowedScale,
                        (maximum - targetX) / rotatedX
                    );
                }
                if (rotatedY < 0) {
                    allowedScale = Math.min(
                        allowedScale,
                        (targetY - minimum) / -rotatedY
                    );
                } else if (rotatedY > 0) {
                    allowedScale = Math.min(
                        allowedScale,
                        (maximum - targetY) / rotatedY
                    );
                }
            });
        });
    });

    return Math.max(
        0.42,
        Math.min(requestedScale, allowedScale * 0.97)
    );
}

function drawSidePlayerEquippedWeaponBitmap(
    context,
    weaponItem,
    frame,
    size,
    appearanceOverride = null,
    anchorOffset = [0, 0]
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
    if (
        weaponSpec
        && [
            'thrust',
            'heavy',
            'dagger',
            'scythe'
        ].includes(weaponSpec.animationFamily)
    ) {
        return false;
    }
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
        size,
        appearanceOverride
    );
    if (!bitmap) return false;

    const baseTargetGrip =
        frame.pose.weapon.grip || frame.anchors.weaponHand;
    const targetGrip = [
        baseTargetGrip[0] + Number(anchorOffset[0] || 0),
        baseTargetGrip[1] + Number(anchorOffset[1] || 0)
    ];
    const targetAim = getSidePoseWeaponAim(frame.pose.weapon);
    const targetAngle = Math.atan2(
        targetAim[1] - targetGrip[1],
        targetAim[0] - targetGrip[0]
    );
    const rotation = style === 'knuckles'
        ? 0
        : targetAngle + (Math.PI / 2);
    const requestedRenderScale = getRequestedSidePlayerWeaponScale(
        style,
        frame.clipId,
        centeredBlueprint
    );
    const renderScale = style === 'knuckles'
        ? requestedRenderScale
        : getContainedSideWeaponScale(
            source,
            [
                centeredBlueprint.grip.x,
                centeredBlueprint.grip.y
            ],
            targetGrip,
            rotation,
            requestedRenderScale
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

const SidePlayerOffhandMatrixCache = new Map();

function getSidePlayerOffhandSpec(offhandItem) {
    if (
        !offhandItem
        || !offhandItem.spriteId
        || typeof EquipmentOverhaulSpecs === 'undefined'
        || !EquipmentOverhaulSpecs.offhand
    ) {
        return null;
    }
    return EquipmentOverhaulSpecs.offhand[offhandItem.spriteId] || null;
}

function getSidePlayerOffhandPose(frame, offhandItem) {
    const spec = getSidePlayerOffhandSpec(offhandItem);
    if (!spec || !frame) return null;
    const supportHand = frame.anchors.supportHand;
    const authored = frame.pose.offhand || {};
    const grip = Array.isArray(authored.grip)
        ? authored.grip
        : supportHand;
    const defaultCenter = spec.offhandType === 'shield'
        ? [grip[0] + 1, grip[1] - 2]
        : grip;
    const authoredLayer = ['back', 'underHands', 'front'].includes(
        authored.layer
    )
        ? authored.layer
        : null;
    return {
        kind: authored.kind || spec.offhandType,
        grip,
        center: Array.isArray(authored.center)
            ? authored.center
            : defaultCenter,
        aim: Array.isArray(authored.aim)
            ? authored.aim
            : [grip[0] - 5, grip[1] + 2],
        angle: Number(authored.angle) || 0,
        // Keep the absence of an authored layer visible so a stance/profile
        // override can supply it. Clip-authored block/bash depth still wins.
        layer: authoredLayer
    };
}

function makeSidePlayerShieldMatrix(spec, offhandPose) {
    return createNativeOverhaulSprite(painter => {
        const style = spec.style || 'heater';
        const rawCenter = offhandPose.center;
        const lean = Math.max(
            -2,
            Math.min(2, Math.round(Number(offhandPose.angle || 0) / 8))
        );
        const horizontalReach = style === 'round'
            ? 5
            : 5 + Math.abs(lean);
        const verticalReach = style === 'round'
            ? 7
            : (style === 'tower' ? 7 : 7);
        const centerX = Math.max(
            1 + horizontalReach,
            Math.min(
                30 - horizontalReach,
                Math.round(rawCenter[0])
            )
        );
        const centerY = Math.max(
            1 + verticalReach,
            Math.min(
                30 - verticalReach,
                Math.round(rawCenter[1])
            )
        );

        if (style === 'round') {
            painter.ellipse(centerX, centerY, 5, 7, 'X');
            painter.ellipse(
                centerX,
                centerY,
                4,
                6,
                spec.primary
            );
            painter.ellipse(
                centerX + Math.sign(lean),
                centerY,
                2,
                4,
                spec.shadow
            );
        } else if (style === 'tower') {
            for (let dy = -7; dy <= 7; dy += 1) {
                const rowY = centerY + dy;
                const rowShift = Math.round((lean * dy) / 7);
                const halfWidth = Math.abs(dy) >= 6 ? 4 : 5;
                painter.line(
                    centerX - halfWidth + rowShift,
                    rowY,
                    centerX + halfWidth + rowShift,
                    rowY,
                    'X'
                );
                if (Math.abs(dy) < 7) {
                    painter.line(
                        centerX - halfWidth + 1 + rowShift,
                        rowY,
                        centerX + halfWidth - 1 + rowShift,
                        rowY,
                        dy > 2 ? spec.shadow : spec.primary
                    );
                }
            }
        } else {
            for (let dy = -6; dy <= 7; dy += 1) {
                const rowY = centerY + dy;
                const rowShift = Math.round((lean * dy) / 7);
                const taper = dy > 2
                    ? Math.floor((dy - 2) / 2)
                    : (dy < -4 ? 1 : 0);
                const halfWidth = Math.max(1, 5 - taper);
                painter.line(
                    centerX - halfWidth + rowShift,
                    rowY,
                    centerX + halfWidth + rowShift,
                    rowY,
                    'X'
                );
                if (halfWidth > 1) {
                    painter.line(
                        centerX - halfWidth + 1 + rowShift,
                        rowY,
                        centerX + halfWidth - 1 + rowShift,
                        rowY,
                        dy > 2 ? spec.shadow : spec.primary
                    );
                }
            }
        }

        painter.line(
            centerX + lean,
            centerY - 5,
            centerX,
            centerY + 5,
            spec.highlight
        );
        painter.ellipse(centerX, centerY, 2, 2, spec.accent);
        painter.set(centerX, centerY, spec.highlight);
        painter.line(
            offhandPose.grip[0],
            offhandPose.grip[1],
            centerX,
            centerY,
            spec.shadow,
            2
        );
    });
}

function makeSidePlayerOffhandWeaponMatrix(spec, offhandPose) {
    return createNativeOverhaulSprite(painter => {
        const grip = offhandPose.grip;
        const aim = fitSideEquipmentAim(
            offhandPose.aim,
            [[0, 0]],
            2
        );
        paintSideLine(painter, grip, aim, spec.primary, 3, 1);
        const direction = getSideVector(grip, aim, 1);
        const perpendicular = [
            -Math.sign(direction[1] || 1),
            Math.sign(direction[0] || 1)
        ];
        painter.line(
            grip[0] - perpendicular[0] * 2,
            grip[1] - perpendicular[1] * 2,
            grip[0] + perpendicular[0] * 2,
            grip[1] + perpendicular[1] * 2,
            spec.accent
        );
        painter.set(aim[0], aim[1], spec.highlight);
    });
}

function getSidePlayerOffhandMatrix(offhandItem, frame) {
    const spec = getSidePlayerOffhandSpec(offhandItem);
    const offhandPose = getSidePlayerOffhandPose(frame, offhandItem);
    if (!spec || !offhandPose) return null;
    const cacheKey = `${offhandItem.spriteId}:${frame.poseId}`;
    if (SidePlayerOffhandMatrixCache.has(cacheKey)) {
        return SidePlayerOffhandMatrixCache.get(cacheKey);
    }
    const matrix = spec.offhandType === 'weapon'
        ? makeSidePlayerOffhandWeaponMatrix(spec, offhandPose)
        : makeSidePlayerShieldMatrix(spec, offhandPose);
    SidePlayerOffhandMatrixCache.set(cacheKey, matrix);
    return matrix;
}

function getSidePlayerRigTransform(poseOrTransform = null) {
    const source = (
        poseOrTransform
        && poseOrTransform.rigTransform
    )
        ? poseOrTransform.rigTransform
        : (poseOrTransform || {});
    const pivot = Array.isArray(source.pivot)
        ? source.pivot
        : [16, 16];
    const translate = Array.isArray(source.translate)
        ? source.translate
        : [0, 0];

    const requestedScale = Number(source.scale);
    return {
        pivot: [
            Number.isFinite(Number(pivot[0])) ? Number(pivot[0]) : 16,
            Number.isFinite(Number(pivot[1])) ? Number(pivot[1]) : 16
        ],
        translate: [
            Number.isFinite(Number(translate[0])) ? Number(translate[0]) : 0,
            Number.isFinite(Number(translate[1])) ? Number(translate[1]) : 0
        ],
        rotateDegrees: Number.isFinite(Number(source.rotateDegrees))
            ? Number(source.rotateDegrees)
            : 0,
        scale: Number.isFinite(requestedScale) && requestedScale > 0
            ? requestedScale
            : 1
    };
}

function applySidePlayerRigTransform(context, pose, pixelSize = 1) {
    const transform = getSidePlayerRigTransform(pose);
    const [translateX, translateY] = transform.translate;
    const [pivotX, pivotY] = transform.pivot;

    if (translateX !== 0 || translateY !== 0) {
        context.translate(
            translateX * pixelSize,
            translateY * pixelSize
        );
    }
    if (transform.rotateDegrees !== 0) {
        context.translate(pivotX * pixelSize, pivotY * pixelSize);
        context.rotate(transform.rotateDegrees * Math.PI / 180);
        if (transform.scale !== 1) {
            context.scale(transform.scale, transform.scale);
        }
        context.translate(-pivotX * pixelSize, -pivotY * pixelSize);
    } else if (transform.scale !== 1) {
        context.translate(pivotX * pixelSize, pivotY * pixelSize);
        context.scale(transform.scale, transform.scale);
        context.translate(-pivotX * pixelSize, -pivotY * pixelSize);
    }

    return transform;
}

function getTransformedSidePlayerAnchor(
    anchor,
    poseOrTransform = null,
    facing = 'right'
) {
    const transform = getSidePlayerRigTransform(poseOrTransform);
    const radians = transform.rotateDegrees * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const deltaX = (
        anchor[0] - transform.pivot[0]
    ) * transform.scale;
    const deltaY = (
        anchor[1] - transform.pivot[1]
    ) * transform.scale;
    let x = transform.pivot[0]
        + (deltaX * cosine)
        - (deltaY * sine)
        + transform.translate[0];
    const y = transform.pivot[1]
        + (deltaX * sine)
        + (deltaY * cosine)
        + transform.translate[1]
        + (
            poseOrTransform
            && Number(poseOrTransform.bobY)
                ? Number(poseOrTransform.bobY)
                : 0
        );

    if (facing === 'left') {
        x = SIDE_PLAYER_ANIMATION_SIZE - 1 - x;
    }
    return { x, y };
}

function getSidePlayerAnimationFrame(gender, clipId, frameIndex = 0) {
    const resolvedGender = gender === 'female' ? 'female' : 'male';
    const clip = SidePlayerAnimationClips[clipId] || SidePlayerAnimationClips.idle;
    const normalizedIndex = ((frameIndex % clip.frames.length) + clip.frames.length)
        % clip.frames.length;
    const poseId = clip.frames[normalizedIndex];
    const pose = SidePlayerPoseDefinitions[poseId];
    const legs = getSideProfileLegs(pose);
    const supportHand = pose.farArm[pose.farArm.length - 1];
    const weaponHand = pose.nearArm[pose.nearArm.length - 1];

    return {
        gender: resolvedGender,
        clipId: Object.prototype.hasOwnProperty.call(SidePlayerAnimationClips, clipId)
            ? clipId
            : 'idle',
        frameIndex: normalizedIndex,
        frameCount: clip.frames.length,
        poseId,
        pose,
        rigTransform: getSidePlayerRigTransform(pose),
        body: SidePlayerAnimationMatrices[`${resolvedGender}_${poseId}`],
        weapon: SidePlayerPlaceholderWeaponMatrices[poseId],
        anchors: {
            headCenter: [16, 7],
            supportHand,
            offhandHand: pose.offhand && Array.isArray(pose.offhand.grip)
                ? pose.offhand.grip
                : supportHand,
            supportWeaponHand: (
                pose.weapon
                && Array.isArray(pose.weapon.supportGrip)
            )
                ? pose.weapon.supportGrip
                : supportHand,
            weaponHand,
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
    const appearanceOverride = (
        options.appearance
        && typeof options.appearance === 'object'
    )
        ? options.appearance
        : null;
    const hairStyle = options.hairStyle
        || (
            appearanceOverride
            && (
                appearanceOverride.hairStyle
                || appearanceOverride.hair
            )
        )
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
    const requestedOffhandItem = Object.prototype.hasOwnProperty.call(
        options,
        'offhandItem'
    )
        ? options.offhandItem
        : (
            typeof player !== 'undefined'
            && player.equipment
            && player.equipment.offhand
        )
        || null;
    const mainWeaponSpec = (
        options.weaponItem
        && options.weaponItem.spriteId
        && typeof EquipmentOverhaulSpecs !== 'undefined'
        && EquipmentOverhaulSpecs.weapon
    )
        ? EquipmentOverhaulSpecs.weapon[options.weaponItem.spriteId]
        : null;
    const mainWeaponIsTwoHanded = Boolean(
        options.weaponItem
        && (
            options.weaponItem.twoHanded === true
            || options.weaponItem.handedness === 'two'
            || (mainWeaponSpec && mainWeaponSpec.twoHanded === true)
        )
    );
    const offhandItem = mainWeaponIsTwoHanded
        ? null
        : requestedOffhandItem;
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
    const layerOverrides = (
        options.layerOverrides
        && typeof options.layerOverrides === 'object'
    ) ? options.layerOverrides : {};
    const anchorOffsets = (
        options.anchorOffsets
        && typeof options.anchorOffsets === 'object'
    ) ? options.anchorOffsets : {};
    const weaponAnchorOffset = Array.isArray(anchorOffsets.weapon)
        ? anchorOffsets.weapon
        : [0, 0];
    const offhandAnchorOffset = Array.isArray(anchorOffsets.offhand)
        ? anchorOffsets.offhand
        : [0, 0];
    const offhandSpec = getSidePlayerOffhandSpec(offhandItem);
    const offhandPose = getSidePlayerOffhandPose(frame, offhandItem);
    const offhandMatrix = getSidePlayerOffhandMatrix(
        offhandItem,
        frame
    );
    const offhandLayer = (
        offhandPose
        && offhandPose.layer
    ) || (
        ['back', 'underHands', 'front'].includes(
            layerOverrides.offhand
        )
            ? layerOverrides.offhand
            : 'back'
    );
    const offhandIsShield = Boolean(
        offhandSpec && offhandSpec.offhandType === 'shield'
    );
    const offhandLeadsMainHand = Boolean(
        offhandIsShield && offhandLayer === 'front'
    );
    const showHair = (
        options.showHair !== false
        && layerOverrides.hair !== 'hidden'
    );
    const usesEquippedWeapon = Object.prototype.hasOwnProperty.call(
        options,
        'weaponItem'
    );

    function drawWeaponLayer() {
        let weaponDrawn = false;
        context.save();
        if (usesEquippedWeapon) {
            weaponDrawn = drawSidePlayerEquippedWeaponBitmap(
                context,
                options.weaponItem,
                frame,
                size,
                appearanceOverride,
                weaponAnchorOffset
            );
        }
        if (!weaponDrawn) {
            context.translate(
                Number(weaponAnchorOffset[0] || 0) * pixelSize,
                Number(weaponAnchorOffset[1] || 0) * pixelSize
            );
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
                    size,
                    appearanceOverride
                );
                weaponDrawn = true;
            }
        }
        context.restore();
        return weaponDrawn;
    }

    function drawOffhandLayer() {
        if (!offhandMatrix) return false;
        context.save();
        context.translate(
            Number(offhandAnchorOffset[0] || 0) * pixelSize,
            Number(offhandAnchorOffset[1] || 0) * pixelSize
        );
        drawProceduralSprite(
            context,
            offhandMatrix,
            0,
            0,
            size,
            appearanceOverride
        );
        context.restore();
        return true;
    }

    context.save();
    context.imageSmoothingEnabled = false;
    if (facing === 'left') {
        context.translate(size, 0);
        context.scale(-1, 1);
    }
    context.translate(0, frame.pose.bobY * pixelSize);
    applySidePlayerRigTransform(context, frame.pose, pixelSize);
    if (offhandLayer === 'back') {
        drawOffhandLayer();
    }
    if (layerOverrides.weapon === 'back') {
        drawWeaponLayer();
    }
    if (helmetLayers) {
        drawProceduralSprite(
            context,
            helmetLayers.back,
            0,
            0,
            size,
            appearanceOverride
        );
    }
    if (showHair) {
        drawProceduralSprite(
            context,
            hairLayers.back,
            0,
            0,
            size,
            appearanceOverride
        );
    }
    drawProceduralSprite(
        context,
        frame.body,
        0,
        0,
        size,
        appearanceOverride
    );
    if (bootMatrix) {
        drawProceduralSprite(
            context,
            bootMatrix,
            0,
            0,
            size,
            appearanceOverride
        );
    }
    if (armorMatrix) {
        drawProceduralSprite(
            context,
            armorMatrix,
            0,
            0,
            size,
            appearanceOverride
        );
    }
    if (
        layerOverrides.weapon === 'underHands'
        || (
            offhandLeadsMainHand
            && layerOverrides.weapon !== 'back'
        )
    ) {
        drawWeaponLayer();
    }
    if (
        offhandLayer === 'underHands'
        || (offhandLayer === 'front' && offhandIsShield)
    ) {
        drawOffhandLayer();
    }
    if (gloveMatrix) {
        drawProceduralSprite(
            context,
            gloveMatrix,
            0,
            0,
            size,
            appearanceOverride
        );
    }
    if (showHair) {
        drawProceduralSprite(
            context,
            hairLayers.front,
            0,
            0,
            size,
            appearanceOverride
        );
    }
    if (helmetLayers) {
        drawProceduralSprite(
            context,
            helmetLayers.front,
            0,
            0,
            size,
            appearanceOverride
        );
    }
    if (offhandLayer === 'front' && !offhandIsShield) {
        drawOffhandLayer();
    }
    if (
        layerOverrides.weapon !== 'back'
        && layerOverrides.weapon !== 'underHands'
        && !offhandLeadsMainHand
    ) {
        drawWeaponLayer();
    }

    if (options.showAnchors) {
        const anchorColors = {
            headCenter: '#39b8ba',
            supportHand: '#d5a13f',
            supportWeaponHand: '#ffe28a',
            offhandHand: '#9e72e8',
            weaponHand: '#f05c5c',
            backFoot: '#6abf69',
            frontFoot: '#8bc7ff'
        };
        Object.entries(frame.anchors).forEach(([anchorId, anchor]) => {
            const offset = anchorId === 'weaponHand'
                ? weaponAnchorOffset
                : (
                    anchorId === 'offhandHand'
                        ? offhandAnchorOffset
                        : [0, 0]
                );
            context.fillStyle = anchorColors[anchorId];
            context.fillRect(
                (anchor[0] + Number(offset[0] || 0)) * pixelSize,
                (anchor[1] + Number(offset[1] || 0)) * pixelSize,
                Math.max(1, pixelSize),
                Math.max(1, pixelSize)
            );
        });
    }

    context.restore();
    return frame;
}

const HUMANOID_ANIMATION_SIZE = SIDE_PLAYER_ANIMATION_SIZE;
const HumanoidAnimationClips = SidePlayerAnimationClips;
const getHumanoidAnimationFrame = getSidePlayerAnimationFrame;
const drawHumanoidAnimationFrame = drawSidePlayerAnimationFrame;
const getMirroredHumanoidAnchor = getMirroredSidePlayerAnchor;
const HumanoidAnimationSets = Object.freeze({
    humanoid_standard_32: Object.freeze({
        id: 'humanoid_standard_32',
        frameSize: HUMANOID_ANIMATION_SIZE,
        clips: Object.freeze(Object.keys(HumanoidAnimationClips)),
        getFrame: getHumanoidAnimationFrame,
        drawFrame: drawHumanoidAnimationFrame
    })
});

function getHumanoidAnimationSet(animationSetId) {
    const resolvedId = animationSetId || 'humanoid_standard_32';
    const animationSet = HumanoidAnimationSets[resolvedId];
    if (!animationSet) {
        throw new RangeError(
            `Unknown humanoid animation set: ${resolvedId}`
        );
    }
    return animationSet;
}

function drawHumanoidActorAnimationFrame(
    context,
    visualProfile,
    clipId,
    frameIndex,
    size = HUMANOID_ANIMATION_SIZE,
    options = {}
) {
    const animationSet = getHumanoidAnimationSet(
        visualProfile && visualProfile.animationSet
    );
    const resolvedClipId = animationSet.clips.includes(clipId)
        ? clipId
        : 'idle';
    const gender = (
        visualProfile
        && visualProfile.body
        && visualProfile.body.gender
    ) || (
        visualProfile
        && visualProfile.appearance
        && visualProfile.appearance.gender
    ) || 'male';
    return animationSet.drawFrame(
        context,
        gender,
        resolvedClipId,
        frameIndex,
        size,
        options
    );
}

if (typeof window !== 'undefined') {
    window.HumanoidAnimationSets = HumanoidAnimationSets;
    window.getHumanoidAnimationSet = getHumanoidAnimationSet;
    window.drawHumanoidActorAnimationFrame =
        drawHumanoidActorAnimationFrame;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SIDE_PLAYER_ANIMATION_SIZE,
        HUMANOID_ANIMATION_SIZE,
        SIDE_PLAYER_PROFILE_SHOULDER_X,
        SIDE_PLAYER_COMBAT_FAR_LEG,
        SIDE_PLAYER_COMBAT_NEAR_LEG,
        SidePlayerAnimationClips,
        HumanoidAnimationClips,
        HumanoidAnimationSets,
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
        SidePlayerOffhandMatrixCache,
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
        getHumanoidAnimationFrame,
        makeNativeSideEquippedWeapon,
        getSidePlayerEquippedWeaponMatrix,
        drawSidePlayerEquippedWeaponBitmap,
        getSidePlayerOffhandSpec,
        getSidePlayerOffhandPose,
        makeSidePlayerShieldMatrix,
        makeSidePlayerOffhandWeaponMatrix,
        getSidePlayerOffhandMatrix,
        getSidePlayerRigTransform,
        applySidePlayerRigTransform,
        getTransformedSidePlayerAnchor,
        getMirroredSidePlayerAnchor,
        getMirroredHumanoidAnchor,
        drawSidePlayerAnimationFrame,
        drawHumanoidAnimationFrame,
        getHumanoidAnimationSet,
        drawHumanoidActorAnimationFrame
    };
}
