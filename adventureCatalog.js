// --- adventureCatalog.js ---
// Immutable, server-owned expedition and encounter definitions.
//
// Requirements deliberately describe progression without executing it. The
// adventure state module evaluates these records against save-safe world facts
// and route-return statistics.

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
}

// Non-combat journey instances are deliberately data-only. Their effects are
// interpreted by adventureState so clients can submit only an option id, never
// an amount of health, stamina, gold, or XP to apply.
const JourneyInstanceCatalog = deepFreeze({
    pine_waystone_riddle: {
        id: 'pine_waystone_riddle',
        kind: 'event',
        type: 'puzzle',
        title: 'The Mossbound Waystone',
        description: 'Three weathered trail marks point in different directions. The oldest carving matches the pines around you.',
        options: [
            {
                id: 'follow_oldest_mark',
                label: 'Read the oldest mark',
                description: 'Take time to match the carving to the surrounding ridge.',
                result: 'solved',
                resultMessage: 'The party deciphers the old drover mark and finds the quiet path onward.',
                effects: { pendingXp: 4 }
            },
            {
                id: 'follow_fresh_tracks',
                label: 'Follow the fresh tracks',
                description: 'Trust the newest sign of passage instead of the faded carving.',
                result: 'alternate',
                resultMessage: 'The tracks loop through wet brush before rejoining the trail.',
                effects: { staminaCost: 1 }
            }
        ]
    },
    lost_pine_trader: {
        id: 'lost_pine_trader',
        kind: 'event',
        type: 'npc',
        title: 'A Trader Off the Road',
        description: 'A stranded peddler is trying to free a handcart from the roots without attracting attention.',
        options: [
            {
                id: 'help_free_cart',
                label: 'Help free the cart',
                description: 'Spend a few minutes lifting the axle clear.',
                result: 'helped',
                resultMessage: 'The grateful trader pays a few coins into the expedition purse.',
                effects: { pendingGold: 4, pendingXp: 2 }
            },
            {
                id: 'trade_for_tonic',
                label: 'Trade for a tonic',
                description: 'Spend 3 gold on a small restorative for the road.',
                costGold: 3,
                result: 'traded',
                resultMessage: 'The tonic takes the edge off the road weariness.',
                effects: { goldCost: 3, restoreHp: 5, restoreStamina: 4 }
            }
        ]
    },
    watchhouse_stormfront: {
        id: 'watchhouse_stormfront',
        kind: 'event',
        type: 'weather',
        title: 'Hard Rain on the Ridge',
        description: 'A fast storm turns the exposed approach slick while the lower trail begins to flood.',
        options: [
            {
                id: 'take_shelter',
                label: 'Wait under cover',
                description: 'Lose time but preserve the party\'s footing.',
                result: 'cautious',
                resultMessage: 'The worst rain passes, leaving the party steadier for the next leg.',
                effects: { restoreStamina: 2 }
            },
            {
                id: 'cross_the_ridge',
                label: 'Risk the ridge',
                description: 'Push through before the lower trail disappears.',
                result: 'risky',
                resultMessage: 'The crossing is punishing, but the party learns the storm route.',
                effects: { staminaCost: 2, pendingXp: 3 }
            }
        ]
    },
    ashen_road_camp: {
        id: 'ashen_road_camp',
        kind: 'stop',
        type: 'camp',
        title: 'Ashen Road Camp',
        description: 'An old charcoal-burner camp offers a screened fire ring and enough clean ground to rest safely.',
        options: [
            {
                id: 'make_camp',
                label: 'Make camp',
                description: 'Dress wounds, eat, and recover before the road resumes.',
                result: 'rested',
                resultMessage: 'A guarded rest restores the party without risking the expedition purse.',
                effects: { restoreHp: 10, restoreStamina: 10 }
            },
            {
                id: 'keep_a_short_watch',
                label: 'Take a short watch',
                description: 'Pause only long enough to catch your breath.',
                result: 'brief_rest',
                resultMessage: 'The short halt restores some stamina before the party moves on.',
                effects: { restoreHp: 3, restoreStamina: 5 }
            }
        ]
    },
    crossroads_waystation: {
        id: 'crossroads_waystation',
        kind: 'stop',
        type: 'waypoint',
        title: 'Crossroads Waystation',
        description: 'A tiny roadside settlement keeps one lamp lit for travelers between the occupied roads.',
        options: [
            {
                id: 'rest_at_waystation',
                label: 'Rest at the waystation',
                description: 'Use the common room and refill waterskins.',
                result: 'rested',
                resultMessage: 'Warm food and a bench give the party a measured recovery.',
                effects: { restoreHp: 7, restoreStamina: 8 }
            },
            {
                id: 'help_the_locals',
                label: 'Help the locals',
                description: 'Repair a storm shutter in exchange for provisions.',
                result: 'helped',
                resultMessage: 'The locals pack provisions and a few coins for the remaining road.',
                effects: { restoreStamina: 4, pendingGold: 3, pendingXp: 2 }
            }
        ]
    },
    roadside_camp: {
        id: 'roadside_camp',
        kind: 'stop',
        type: 'camp',
        title: 'Roadside Camp',
        description: 'A defensible clearing offers a safe place for a brief halt.',
        options: [
            {
                id: 'rest',
                label: 'Rest',
                description: 'Take a guarded rest before continuing.',
                result: 'rested',
                resultMessage: 'The party leaves the clearing in better condition.',
                effects: { restoreHp: 6, restoreStamina: 6 }
            },
            {
                id: 'continue_early',
                label: 'Continue early',
                description: 'Resume travel after only a quick pause.',
                result: 'brief_rest',
                resultMessage: 'The quick pause restores a little stamina.',
                effects: { restoreStamina: 2 }
            }
        ]
    }
});

const PINE_BRANCH_REQUIREMENTS = {
    all: [
        { type: 'world_fact', factId: 'pine_signal_chart' },
        { type: 'route_safe_returns', routeId: 'route_pine_trail', minimum: 1 }
    ]
};

const TOLL_BRANCH_REQUIREMENTS = {
    all: [
        { type: 'world_fact', factId: 'forged_toll_seal' },
        { type: 'route_safe_returns', routeId: 'route_old_road', minimum: 1 }
    ]
};

const WATCHHOUSE_REQUIREMENTS = {
    any: [
        { type: 'route_safe_returns', routeId: 'route_burnt_heath', minimum: 1 },
        { type: 'route_safe_returns', routeId: 'route_toll_crossing', minimum: 1 }
    ]
};

const WATCHHOUSE_UNLOCK_REQUIREMENTS = {
    all: [
        {
            type: 'chapter_finale_status',
            chapterId: 'chapter_one',
            status: 'prepared'
        },
        { type: 'world_contract_active', contractId: 'watchhouse_reckoning' }
    ],
    any: [
        { type: 'chapter_preparation_option', optionId: 'warded_approach' },
        { type: 'chapter_preparation_option', optionId: 'side_gate_breach' }
    ]
};

const WATCHHOUSE_PREPARATION_VARIANTS = [
    {
        id: 'warded_approach',
        requirements: {
            all: [{ type: 'chapter_preparation_option', optionId: 'warded_approach' }]
        },
        outboundEncounterIds: ['watchhouse_breach_heath_prepared']
    },
    {
        id: 'side_gate_breach',
        requirements: {
            all: [{ type: 'chapter_preparation_option', optionId: 'side_gate_breach' }]
        },
        outboundEncounterIds: ['watchhouse_breach_toll_prepared']
    },
    { id: 'unprepared', outboundEncounterIds: ['watchhouse_breach_unprepared'] }
];

const LocationCatalog = deepFreeze({
    pub_hub: {
        id: 'pub_hub',
        name: 'The Pub',
        symbol: '🍺',
        mapPosition: { x: 13, y: 72 },
        description: 'Home, shelter, and the beginning and end of every expedition.',
        initiallyDiscovered: true,
        initiallyUnlocked: true,
        chapterStatus: 'active'
    },
    old_road: {
        id: 'old_road',
        name: 'Old Road',
        symbol: '╬',
        mapPosition: { x: 34, y: 62 },
        description: 'A worn trade road where lone robbers test travelers close to town.',
        initiallyDiscovered: true,
        initiallyUnlocked: true,
        chapterStatus: 'active'
    },
    pine_trail: {
        id: 'pine_trail',
        name: 'Pine Trail',
        symbol: '♠',
        mapPosition: { x: 28, y: 28 },
        description: 'A screened woodland path favored by poachers and patient archers.',
        initiallyDiscovered: true,
        initiallyUnlocked: true,
        chapterStatus: 'active'
    },
    burnt_heath: {
        id: 'burnt_heath',
        name: 'Burnt Heath',
        symbol: '▲',
        mapPosition: { x: 58, y: 20 },
        description: 'Blackened scrubland where signal fires conceal a coordinated camp.',
        initiallyDiscovered: false,
        initiallyUnlocked: false,
        chapterStatus: 'active',
        discoveryRequirements: PINE_BRANCH_REQUIREMENTS,
        unlockRequirements: PINE_BRANCH_REQUIREMENTS
    },
    toll_crossing: {
        id: 'toll_crossing',
        name: 'Toll Crossing',
        symbol: '╫',
        mapPosition: { x: 66, y: 64 },
        description: 'A narrow crossing where an organized company controls the road.',
        initiallyDiscovered: false,
        initiallyUnlocked: false,
        chapterStatus: 'active',
        discoveryRequirements: TOLL_BRANCH_REQUIREMENTS,
        unlockRequirements: TOLL_BRANCH_REQUIREMENTS
    },
    ruined_watchhouse: {
        id: 'ruined_watchhouse',
        name: 'Ruined Watchhouse',
        symbol: 'W',
        mapPosition: { x: 88, y: 40 },
        description: 'A burned watch post linking the false tolls and the heath signals.',
        initiallyDiscovered: false,
        initiallyUnlocked: false,
        chapterStatus: 'active',
        discoveryRequirements: WATCHHOUSE_REQUIREMENTS,
        unlockRequirements: WATCHHOUSE_UNLOCK_REQUIREMENTS
    }
});

const AuthoredEncounterCatalog = deepFreeze({
    alley_robbery: {
        id: 'alley_robbery',
        name: 'Alley Robbery',
        mapTemplateId: 'EXPEDITION_ALLEY',
        difficulty: 1,
        tags: ['melee', 'close-quarters'],
        enemies: [
            {
                id: 'melee_bandit',
                spawnId: 'bandit_front',
                name: 'Roadside Bandit',
                statMult: 0.6,
                aiProfileId: 'melee_pursuer'
            }
        ]
    },
    pine_lookout: {
        id: 'pine_lookout',
        name: 'Lone Pine Lookout',
        mapTemplateId: 'EXPEDITION_PINE_TRAIL',
        difficulty: 1,
        tags: ['ranged', 'cover', 'scouting'],
        enemies: [
            {
                id: 'bandit_archer',
                spawnId: 'archer_ridge',
                name: 'Pine Lookout',
                statMult: 0.55,
                aiProfileId: 'ranged_skirmisher'
            }
        ]
    },
    alley_gang: {
        id: 'alley_gang',
        name: 'Roadside Gang',
        mapTemplateId: 'EXPEDITION_ALLEY',
        difficulty: 2,
        tags: ['melee', 'ambush'],
        enemies: [
            {
                id: 'melee_bandit',
                spawnId: 'bandit_front',
                name: 'Roadside Bandit',
                aiProfileId: 'melee_pursuer'
            },
            {
                id: 'melee_bandit',
                spawnId: 'bandit_rear',
                name: 'Bandit Lookout',
                statMult: 0.9,
                aiProfileId: 'melee_pursuer'
            }
        ]
    },
    poachers_trail: {
        id: 'poachers_trail',
        name: "Poacher's Trail",
        mapTemplateId: 'EXPEDITION_PINE_TRAIL',
        difficulty: 2,
        tags: ['ranged', 'cover'],
        enemies: [
            {
                id: 'bandit_archer',
                spawnId: 'archer_ridge',
                name: 'Pine Poacher',
                aiProfileId: 'ranged_skirmisher'
            },
            {
                id: 'melee_bandit',
                spawnId: 'bandit_path',
                name: 'Poacher Scout',
                statMult: 0.85,
                aiProfileId: 'melee_pursuer'
            }
        ]
    },
    pine_signal_ambush: {
        id: 'pine_signal_ambush',
        name: 'Signal Cache Ambush',
        mapTemplateId: 'EXPEDITION_PINE_TRAIL',
        difficulty: 2,
        tags: ['ranged', 'flank', 'reversed-formation'],
        enemies: [
            {
                id: 'bandit_archer',
                spawnId: 'bandit_path',
                name: 'Signal Watcher',
                statMult: 0.9,
                aiProfileId: 'ranged_skirmisher'
            },
            {
                id: 'melee_bandit',
                spawnId: 'poacher_flank',
                name: 'Cache Guard',
                aiProfileId: 'melee_pursuer'
            }
        ]
    },
    hedge_fire: {
        id: 'hedge_fire',
        name: 'Hedge Fire',
        mapTemplateId: 'EXPEDITION_HEDGE_FIRE',
        difficulty: 3,
        tags: ['mage', 'telegraph', 'interrupt'],
        enemies: [
            {
                id: 'hedge_mage',
                spawnId: 'mage_center',
                name: 'Hedge Mage',
                statMult: 0.8,
                aiProfileId: 'telegraph_caster'
            },
            {
                id: 'melee_bandit',
                spawnId: 'bandit_guard',
                name: 'Charred Guard',
                statMult: 0.8,
                aiProfileId: 'melee_pursuer'
            }
        ]
    },
    heath_smoke_screen: {
        id: 'heath_smoke_screen',
        name: 'Smoke-Screen Patrol',
        mapTemplateId: 'EXPEDITION_HEDGE_FIRE',
        difficulty: 3,
        tags: ['ranged', 'screen', 'flank'],
        enemies: [
            {
                id: 'melee_bandit',
                spawnId: 'bandit_guard',
                name: 'Smoke Runner',
                statMult: 0.9,
                aiProfileId: 'melee_pursuer'
            },
            {
                id: 'bandit_archer',
                spawnId: 'mage_rear',
                name: 'Ashline Archer',
                statMult: 0.9,
                aiProfileId: 'ranged_skirmisher'
            }
        ]
    },
    heath_cinder_circle: {
        id: 'heath_cinder_circle',
        name: 'Cinder Circle',
        mapTemplateId: 'EXPEDITION_HEDGE_FIRE',
        difficulty: 4,
        tags: ['mage', 'ranged', 'target-priority'],
        enemies: [
            {
                id: 'hedge_mage',
                spawnId: 'mage_center',
                name: 'Cinder Caller',
                aiProfileId: 'telegraph_caster'
            },
            {
                id: 'melee_bandit',
                spawnId: 'bandit_guard',
                name: 'Circle Guard',
                aiProfileId: 'melee_pursuer'
            },
            {
                id: 'bandit_archer',
                spawnId: 'mage_rear',
                name: 'Ashline Archer',
                aiProfileId: 'ranged_skirmisher'
            }
        ]
    },
    road_toll: {
        id: 'road_toll',
        name: 'Road Toll',
        mapTemplateId: 'EXPEDITION_ROAD_TOLL',
        difficulty: 3,
        tags: ['mixed', 'target-priority'],
        enemies: [
            {
                id: 'melee_bandit',
                spawnId: 'bandit_blocker',
                name: 'Toll Blocker',
                statMult: 0.9,
                aiProfileId: 'melee_pursuer'
            },
            {
                id: 'bandit_archer',
                spawnId: 'archer_flank',
                name: 'Toll Archer',
                statMult: 0.9,
                aiProfileId: 'ranged_skirmisher'
            }
        ]
    },
    road_toll_crossfire: {
        id: 'road_toll_crossfire',
        name: 'Crossing Crossfire',
        mapTemplateId: 'EXPEDITION_ROAD_TOLL',
        difficulty: 3,
        tags: ['ranged', 'crossfire', 'reposition'],
        enemies: [
            {
                id: 'melee_bandit',
                spawnId: 'bandit_blocker',
                name: 'Toll Spotter',
                statMult: 0.9,
                aiProfileId: 'melee_pursuer'
            },
            {
                id: 'bandit_archer',
                spawnId: 'archer_flank',
                name: 'Northbank Archer',
                aiProfileId: 'ranged_skirmisher'
            },
            {
                id: 'bandit_archer',
                spawnId: 'toll_rear',
                name: 'Southbank Archer',
                statMult: 0.9,
                aiProfileId: 'ranged_skirmisher'
            }
        ]
    },
    road_toll_ambush: {
        id: 'road_toll_ambush',
        name: 'Road Toll Ambush',
        mapTemplateId: 'EXPEDITION_ROAD_TOLL',
        difficulty: 4,
        tags: ['mixed', 'ambush', 'target-priority'],
        enemies: [
            {
                id: 'melee_bandit',
                spawnId: 'bandit_blocker',
                name: 'Toll Blocker',
                statMult: 1.05,
                aiProfileId: 'melee_pursuer'
            },
            {
                id: 'bandit_archer',
                spawnId: 'archer_flank',
                name: 'Toll Archer',
                aiProfileId: 'ranged_skirmisher'
            },
            {
                id: 'melee_bandit',
                spawnId: 'bandit_rear',
                name: 'Toll Enforcer',
                statMult: 1.1,
                aiProfileId: 'melee_pursuer'
            }
        ]
    },
    watchhouse_breach_unprepared: {
        id: 'watchhouse_breach_unprepared',
        name: 'The Captain at the Gate',
        mapTemplateId: 'EXPEDITION_RUINED_WATCHHOUSE',
        difficulty: 5,
        tags: ['finale', 'shield', 'mage', 'crossfire'],
        enemies: [
            {
                id: 'chapter_one_shield_captain',
                spawnId: 'captain_gate',
                name: 'Watchhouse Captain',
                aiProfileId: 'chapter_one_shield_captain'
            },
            {
                id: 'hedge_mage',
                spawnId: 'mage_tower',
                name: 'Signal Caster',
                aiProfileId: 'telegraph_caster'
            },
            {
                id: 'bandit_archer',
                spawnId: 'archer_wall',
                name: 'Wall Archer',
                aiProfileId: 'ranged_skirmisher'
            },
            {
                id: 'melee_bandit',
                spawnId: 'guard_courtyard',
                name: 'Watchhouse Guard',
                aiProfileId: 'melee_pursuer'
            }
        ]
    },
    watchhouse_breach_heath_prepared: {
        id: 'watchhouse_breach_heath_prepared',
        name: 'The Captain, Fire Smothered',
        mapTemplateId: 'EXPEDITION_RUINED_WATCHHOUSE',
        difficulty: 5,
        tags: ['finale', 'shield', 'heath-prepared'],
        enemies: [
            {
                id: 'chapter_one_shield_captain',
                spawnId: 'captain_gate',
                name: 'Watchhouse Captain',
                aiProfileId: 'chapter_one_shield_captain'
            },
            {
                id: 'bandit_archer',
                spawnId: 'archer_wall',
                name: 'Wall Archer',
                aiProfileId: 'ranged_skirmisher'
            },
            {
                id: 'melee_bandit',
                spawnId: 'guard_courtyard',
                name: 'Watchhouse Guard',
                aiProfileId: 'melee_pursuer'
            }
        ]
    },
    watchhouse_breach_toll_prepared: {
        id: 'watchhouse_breach_toll_prepared',
        name: 'The Captain, Marksmen Scattered',
        mapTemplateId: 'EXPEDITION_RUINED_WATCHHOUSE',
        difficulty: 5,
        tags: ['finale', 'shield', 'toll-prepared'],
        enemies: [
            {
                id: 'chapter_one_shield_captain',
                spawnId: 'captain_gate',
                name: 'Watchhouse Captain',
                aiProfileId: 'chapter_one_shield_captain'
            },
            {
                id: 'hedge_mage',
                spawnId: 'mage_tower',
                name: 'Signal Caster',
                aiProfileId: 'telegraph_caster'
            },
            {
                id: 'melee_bandit',
                spawnId: 'guard_courtyard',
                name: 'Watchhouse Guard',
                aiProfileId: 'melee_pursuer'
            }
        ]
    },
    watchhouse_pursuit: {
        id: 'watchhouse_pursuit',
        name: 'Watchhouse Pursuit',
        mapTemplateId: 'EXPEDITION_RUINED_WATCHHOUSE',
        difficulty: 4,
        tags: ['return', 'melee', 'escape'],
        enemies: [
            {
                id: 'melee_bandit',
                spawnId: 'guard_courtyard',
                name: 'Fleeing Loyalist',
                aiProfileId: 'melee_pursuer'
            },
            {
                id: 'melee_bandit',
                spawnId: 'guard_rear',
                name: 'Rear Guard',
                statMult: 1.05,
                aiProfileId: 'melee_pursuer'
            }
        ]
    }
});

const RouteCatalog = deepFreeze({
    route_old_road: {
        id: 'route_old_road',
        name: 'The Old Road',
        fromLocationId: 'pub_hub',
        toLocationId: 'old_road',
        distance: 2,
        distanceLabel: 'Short',
        danger: 1,
        dangerLabel: 'Low',
        description: 'A short run along the nearest surviving trade road.',
        newcomerLabel: 'Gentler first outing',
        newcomerHint: 'The shortest road from the pub. Local talk suggests close-range trouble and room to learn the travel-and-return rhythm.',
        safeReturnGold: 20,
        firstReturnGold: 15,
        chapterStatus: 'active',
        initiallyDiscovered: true,
        initiallyUnlocked: true,
        encounterIds: ['alley_robbery', 'alley_gang'],
        encounterBands: {
            scouting: ['alley_robbery'],
            seasoned: ['alley_robbery', 'alley_gang'],
            company: ['alley_robbery', 'alley_gang']
        }
    },
    route_pine_trail: {
        id: 'route_pine_trail',
        name: 'Pine Trail',
        fromLocationId: 'pub_hub',
        toLocationId: 'pine_trail',
        distance: 3,
        distanceLabel: 'Moderate',
        danger: 2,
        dangerLabel: 'Watchful',
        description: 'A wooded trail with long sight lines and concealed firing positions.',
        newcomerLabel: 'Open alternative',
        newcomerHint: 'A valid first road with more ranged pressure. Use movement and cover to close on threats before they control the lane.',
        safeReturnGold: 30,
        firstReturnGold: 20,
        chapterStatus: 'active',
        initiallyDiscovered: true,
        initiallyUnlocked: true,
        encounterIds: ['pine_lookout', 'poachers_trail', 'pine_signal_ambush'],
        encounterBands: {
            scouting: ['pine_lookout'],
            seasoned: ['pine_lookout', 'poachers_trail', 'pine_signal_ambush'],
            company: ['poachers_trail', 'pine_signal_ambush']
        },
        journeyInstanceIds: ['pine_waystone_riddle', 'lost_pine_trader']
    },
    route_old_pine_cut: {
        id: 'route_old_pine_cut',
        name: 'Drover\'s Cut',
        fromLocationId: 'old_road',
        toLocationId: 'pine_trail',
        expeditionOriginLocationId: 'pub_hub',
        routeRole: 'shortcut',
        bidirectional: true,
        distance: 2,
        distanceLabel: 'Short',
        danger: 1,
        dangerLabel: 'Low',
        description: 'A recovered drover path that bypasses the poachers\' firing lanes. Its lighter opposition pays less than the main trail.',
        safeReturnGold: 25,
        firstReturnGold: 10,
        chapterStatus: 'active',
        initiallyDiscovered: false,
        initiallyUnlocked: false,
        discoveryRequirements: {
            all: [
                { type: 'route_safe_returns', routeId: 'route_old_road', minimum: 1 },
                { type: 'route_safe_returns', routeId: 'route_pine_trail', minimum: 1 }
            ]
        },
        unlockRequirements: {
            all: [
                { type: 'route_safe_returns', routeId: 'route_old_road', minimum: 1 },
                { type: 'route_safe_returns', routeId: 'route_pine_trail', minimum: 1 }
            ]
        },
        encounterIds: ['alley_robbery'],
        encounterBands: {
            scouting: ['alley_robbery'],
            seasoned: ['alley_robbery'],
            company: ['alley_robbery']
        }
    },
    route_burnt_heath: {
        id: 'route_burnt_heath',
        name: 'Burnt Heath Track',
        fromLocationId: 'pine_trail',
        toLocationId: 'burnt_heath',
        expeditionOriginLocationId: 'pub_hub',
        distance: 4,
        distanceLabel: 'Long',
        danger: 3,
        dangerLabel: 'Dangerous',
        description: 'A scorched track revealed by the chart hidden among the pines.',
        safeReturnGold: 45,
        firstReturnGold: 30,
        chapterStatus: 'active',
        initiallyDiscovered: false,
        initiallyUnlocked: false,
        discoveryRequirements: PINE_BRANCH_REQUIREMENTS,
        unlockRequirements: PINE_BRANCH_REQUIREMENTS,
        encounterIds: ['hedge_fire', 'heath_smoke_screen', 'heath_cinder_circle'],
        encounterBands: {
            scouting: ['hedge_fire', 'heath_smoke_screen'],
            seasoned: ['hedge_fire', 'heath_smoke_screen', 'heath_cinder_circle'],
            company: ['heath_smoke_screen', 'heath_cinder_circle']
        },
        waypointInstanceId: 'ashen_road_camp'
    },
    route_toll_crossing: {
        id: 'route_toll_crossing',
        name: 'Toll Crossing Road',
        fromLocationId: 'old_road',
        toLocationId: 'toll_crossing',
        expeditionOriginLocationId: 'pub_hub',
        distance: 4,
        distanceLabel: 'Long',
        danger: 4,
        dangerLabel: 'Severe',
        description: 'The false seal reveals which occupied crossing controls the keg road.',
        safeReturnGold: 55,
        firstReturnGold: 35,
        chapterStatus: 'active',
        initiallyDiscovered: false,
        initiallyUnlocked: false,
        discoveryRequirements: TOLL_BRANCH_REQUIREMENTS,
        unlockRequirements: TOLL_BRANCH_REQUIREMENTS,
        encounterIds: ['road_toll', 'road_toll_crossfire', 'road_toll_ambush'],
        encounterBands: {
            scouting: ['road_toll'],
            seasoned: ['road_toll', 'road_toll_crossfire'],
            company: ['road_toll_crossfire', 'road_toll_ambush']
        },
        waypointInstanceId: 'crossroads_waystation'
    },
    route_heath_toll_cut: {
        id: 'route_heath_toll_cut',
        name: 'Smuggler\'s Traverse',
        fromLocationId: 'burnt_heath',
        toLocationId: 'toll_crossing',
        expeditionOriginLocationId: 'pub_hub',
        routeRole: 'shortcut',
        bidirectional: true,
        distance: 2,
        distanceLabel: 'Short',
        danger: 3,
        dangerLabel: 'Dangerous',
        description: 'A concealed traverse that avoids the toll company\'s reinforced roadblock. Smaller patrols make it safer, with reduced road pay.',
        safeReturnGold: 45,
        firstReturnGold: 20,
        chapterStatus: 'active',
        initiallyDiscovered: false,
        initiallyUnlocked: false,
        discoveryRequirements: {
            all: [
                { type: 'route_safe_returns', routeId: 'route_burnt_heath', minimum: 1 },
                { type: 'route_safe_returns', routeId: 'route_toll_crossing', minimum: 1 }
            ]
        },
        unlockRequirements: {
            all: [
                { type: 'route_safe_returns', routeId: 'route_burnt_heath', minimum: 1 },
                { type: 'route_safe_returns', routeId: 'route_toll_crossing', minimum: 1 }
            ]
        },
        encounterIds: ['heath_smoke_screen', 'road_toll'],
        encounterBands: {
            scouting: ['road_toll'],
            seasoned: ['heath_smoke_screen', 'road_toll'],
            company: ['heath_smoke_screen', 'road_toll']
        }
    },
    route_heath_watchhouse: {
        id: 'route_heath_watchhouse',
        name: 'Ashen Watchhouse Approach',
        fromLocationId: 'burnt_heath',
        toLocationId: 'ruined_watchhouse',
        expeditionOriginLocationId: 'pub_hub',
        routeRole: 'finale',
        finaleChapterId: 'chapter_one',
        requiredActiveContractId: 'watchhouse_reckoning',
        distance: 3,
        distanceLabel: 'Moderate',
        danger: 5,
        dangerLabel: 'Deadly',
        description: 'Approach the watchhouse under cover of its extinguished signal line.',
        safeReturnGold: 90,
        firstReturnGold: 60,
        chapterStatus: 'active',
        initiallyDiscovered: false,
        initiallyUnlocked: false,
        discoveryRequirements: {
            all: [{ type: 'route_safe_returns', routeId: 'route_burnt_heath', minimum: 1 }]
        },
        unlockRequirements: {
            all: [
                { type: 'route_safe_returns', routeId: 'route_burnt_heath', minimum: 1 },
                ...WATCHHOUSE_UNLOCK_REQUIREMENTS.all
            ],
            any: WATCHHOUSE_UNLOCK_REQUIREMENTS.any
        },
        encounterIds: [
            'watchhouse_breach_unprepared',
            'watchhouse_breach_heath_prepared',
            'watchhouse_breach_toll_prepared',
            'watchhouse_pursuit'
        ],
        preparationVariants: WATCHHOUSE_PREPARATION_VARIANTS,
        returnEncounterIds: ['watchhouse_pursuit'],
        journeyInstanceIds: ['watchhouse_stormfront']
    },
    route_toll_watchhouse: {
        id: 'route_toll_watchhouse',
        name: 'Toll Watchhouse Approach',
        fromLocationId: 'toll_crossing',
        toLocationId: 'ruined_watchhouse',
        expeditionOriginLocationId: 'pub_hub',
        routeRole: 'finale',
        finaleChapterId: 'chapter_one',
        requiredActiveContractId: 'watchhouse_reckoning',
        distance: 3,
        distanceLabel: 'Moderate',
        danger: 5,
        dangerLabel: 'Deadly',
        description: 'Follow the company road from the crossing to its ruined command post.',
        safeReturnGold: 90,
        firstReturnGold: 60,
        chapterStatus: 'active',
        initiallyDiscovered: false,
        initiallyUnlocked: false,
        discoveryRequirements: {
            all: [{ type: 'route_safe_returns', routeId: 'route_toll_crossing', minimum: 1 }]
        },
        unlockRequirements: {
            all: [
                { type: 'route_safe_returns', routeId: 'route_toll_crossing', minimum: 1 },
                ...WATCHHOUSE_UNLOCK_REQUIREMENTS.all
            ],
            any: WATCHHOUSE_UNLOCK_REQUIREMENTS.any
        },
        encounterIds: [
            'watchhouse_breach_unprepared',
            'watchhouse_breach_heath_prepared',
            'watchhouse_breach_toll_prepared',
            'watchhouse_pursuit'
        ],
        preparationVariants: WATCHHOUSE_PREPARATION_VARIANTS,
        returnEncounterIds: ['watchhouse_pursuit'],
        journeyInstanceIds: ['watchhouse_stormfront']
    }
});

module.exports = {
    LocationCatalog,
    RouteCatalog,
    AuthoredEncounterCatalog,
    JourneyInstanceCatalog
};
