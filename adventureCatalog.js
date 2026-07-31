// --- adventureCatalog.js ---
// Immutable, server-owned expedition, encounter, and bounty definitions.

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
}

const LocationCatalog = deepFreeze({
    pub_hub: {
        id: 'pub_hub',
        name: 'The Pub',
        symbol: '🍺',
        mapPosition: { x: 13, y: 72 },
        description: 'Home, shelter, and the beginning and end of every expedition.',
        initiallyDiscovered: true,
        initiallyUnlocked: true
    },
    old_road: {
        id: 'old_road',
        name: 'Old Road',
        symbol: '╬',
        mapPosition: { x: 34, y: 62 },
        description: 'A worn trade road where lone robbers test travelers close to town.',
        initiallyDiscovered: true,
        initiallyUnlocked: true
    },
    pine_trail: {
        id: 'pine_trail',
        name: 'Pine Trail',
        symbol: '♠',
        mapPosition: { x: 28, y: 28 },
        description: 'A screened woodland path favored by poachers and patient archers.',
        initiallyDiscovered: true,
        initiallyUnlocked: true
    },
    burnt_heath: {
        id: 'burnt_heath',
        name: 'Burnt Heath',
        symbol: '▲',
        mapPosition: { x: 61, y: 24 },
        description: 'Blackened scrubland marked by hedge-fire and suspicious lights.',
        initiallyDiscovered: false,
        initiallyUnlocked: false
    },
    toll_crossing: {
        id: 'toll_crossing',
        name: 'Toll Crossing',
        symbol: '╫',
        mapPosition: { x: 72, y: 60 },
        description: 'A narrow crossing where organized brigands control the road.',
        initiallyDiscovered: false,
        initiallyUnlocked: false
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
                aiProfileId: 'melee_pursuer'
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
                aiProfileId: 'telegraph_caster'
            },
            {
                id: 'melee_bandit',
                spawnId: 'bandit_guard',
                name: 'Charred Guard',
                statMult: 0.9,
                aiProfileId: 'melee_pursuer'
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
                aiProfileId: 'melee_pursuer'
            },
            {
                id: 'bandit_archer',
                spawnId: 'archer_flank',
                name: 'Toll Archer',
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
        safeReturnGold: 20,
        firstReturnGold: 15,
        encounterIds: ['alley_robbery', 'alley_gang'],
        firstReturnDiscoverLocationIds: ['toll_crossing'],
        firstReturnUnlockLocationIds: ['toll_crossing']
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
        safeReturnGold: 30,
        firstReturnGold: 20,
        encounterIds: ['poachers_trail']
    },
    route_burnt_heath: {
        id: 'route_burnt_heath',
        name: 'Burnt Heath Track',
        fromLocationId: 'pub_hub',
        toLocationId: 'burnt_heath',
        distance: 4,
        distanceLabel: 'Long',
        danger: 3,
        dangerLabel: 'Dangerous',
        description: 'A scorched track where spell-light is visible after dusk.',
        safeReturnGold: 45,
        firstReturnGold: 30,
        encounterIds: ['hedge_fire']
    },
    route_toll_crossing: {
        id: 'route_toll_crossing',
        name: 'Toll Crossing Road',
        fromLocationId: 'pub_hub',
        toLocationId: 'toll_crossing',
        distance: 4,
        distanceLabel: 'Long',
        danger: 4,
        dangerLabel: 'Severe',
        description: 'An exposed approach to a crossing held by an organized toll gang.',
        safeReturnGold: 55,
        firstReturnGold: 35,
        encounterIds: ['road_toll', 'road_toll_ambush']
    }
});

const BountyCatalog = deepFreeze({
    old_road_goods: {
        id: 'old_road_goods',
        title: 'Goods for the Old Road',
        description: 'Carry sealed pub goods to the Old Road and return safely three times.',
        type: 'DELIVERY_ROUND_TRIP',
        routeId: 'route_old_road',
        targetRoundTrips: 3,
        rewardGold: 120,
        cargoLabel: 'Sealed Pub Goods',
        repeatable: true
    },
    pine_trail_patrol: {
        id: 'pine_trail_patrol',
        title: 'Patrol the Pine Trail',
        description: 'Travel the Pine Trail and report back without fleeing.',
        type: 'PATROL_ROUND_TRIP',
        routeId: 'route_pine_trail',
        targetRoundTrips: 1,
        rewardGold: 70,
        repeatable: true
    },
    hedge_fire_investigation: {
        id: 'hedge_fire_investigation',
        title: 'Rumors of Hedge Fire',
        description: 'Follow the fire rumors into the Burnt Heath and return with a report.',
        type: 'DISCOVERY_ROUND_TRIP',
        routeId: 'route_burnt_heath',
        targetRoundTrips: 1,
        rewardGold: 110,
        repeatable: false,
        revealLocationIdsOnAccept: ['burnt_heath'],
        unlockLocationIdsOnAccept: ['burnt_heath']
    }
});

module.exports = {
    LocationCatalog,
    RouteCatalog,
    AuthoredEncounterCatalog,
    BountyCatalog
};
