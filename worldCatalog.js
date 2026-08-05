// --- worldCatalog.js ---
// Immutable narrative-world definitions. Gameplay statistics, item behavior,
// encounter composition, and visual profiles intentionally live elsewhere.

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
}

const WorldFactCatalog = deepFreeze({
    forged_toll_seal: {
        id: 'forged_toll_seal',
        name: 'Forged Toll Seal',
        category: 'clue',
        description: 'A false road seal found among the wreckage on the Old Road.'
    },
    pine_signal_chart: {
        id: 'pine_signal_chart',
        name: 'Pine Signal Chart',
        category: 'clue',
        description: 'A hidden chart connecting signal marks along the Pine Trail.'
    },
    heath_signal_cipher: {
        id: 'heath_signal_cipher',
        name: 'Heath Signal Cipher',
        category: 'clue',
        description: 'A sequence of ash marks showing that the hedge fires are coded orders.'
    },
    toll_gang_ledger: {
        id: 'toll_gang_ledger',
        name: 'Toll Gang Ledger',
        category: 'clue',
        description: 'A collection ledger routing stolen road money to an abandoned watchhouse.'
    },
    watchhouse_orders: {
        id: 'watchhouse_orders',
        name: 'Watchhouse Orders',
        category: 'proof',
        description: 'Signed orders tying the false tolls and signal fires to one road captain.'
    },
    north_road_patron: {
        id: 'north_road_patron',
        name: 'The Northern Patron',
        category: 'lead',
        description: 'The captain reported to an unnamed patron beyond the north road.'
    }
});

const NpcCatalog = deepFreeze({
    kreg: {
        id: 'kreg',
        name: 'Kreg',
        role: 'Innkeeper and contract keeper',
        initialStageId: 'steady',
        stages: [
            { id: 'steady', name: 'Keeping the pub moving', returnReaction: 'Kreg asks what the roads look like beyond his door.' },
            { id: 'concerned', name: 'Recognizes the false seal', returnReaction: 'Kreg checks every seal you bring home against the forgery.' },
            { id: 'committed', name: 'Commits the pub to the investigation', returnReaction: 'Kreg clears a table for maps before he pours your return drink.' },
            { id: 'relieved', name: 'Turns the victory into a new beginning', returnReaction: 'Kreg raises a quiet toast to open roads and unfinished business northward.' }
        ]
    },
    elowen: {
        id: 'elowen',
        name: 'Elowen',
        role: 'Trail warden and field observer',
        initialStageId: 'reserved',
        stages: [
            { id: 'reserved', name: 'Keeps her own counsel', returnReaction: 'Elowen listens for details you did not realize mattered.' },
            { id: 'informed', name: 'Shares what the signal chart means', returnReaction: 'Elowen adds your route to the signal chart in charcoal.' },
            { id: 'cooperative', name: 'Trades regular road intelligence', returnReaction: 'Elowen compares your report with the tracks seen since dawn.' },
            { id: 'watchful', name: 'Keeps watch for the northern patron', returnReaction: 'Elowen marks fresh traffic heading north and saves you a seat.' }
        ]
    },
    mara: {
        id: 'mara',
        name: 'Mara',
        role: 'Quartermaster',
        initialStageId: 'waiting',
        stages: [
            { id: 'waiting', name: 'Waiting for a safe supply line', returnReaction: 'Mara counts what came back intact and says little.' },
            { id: 'quartermaster', name: 'Running the quartermaster stall', returnReaction: 'Mara has already laid out the gear your last fight made relevant.' },
            { id: 'provisioned', name: 'Equips the watchhouse expedition', returnReaction: 'Mara updates the stock board for whatever road comes next.' }
        ]
    },
    tilda: {
        id: 'tilda',
        name: 'Tilda',
        role: 'Hedge scholar and wardwright',
        initialStageId: 'guarded',
        stages: [
            { id: 'guarded', name: 'Dismisses tavern talk as superstition', returnReaction: 'Tilda pretends not to listen when the room asks about your expedition.' },
            { id: 'curious', name: 'Recognizes a deliberate signal pattern', returnReaction: 'Tilda wants every mark, color, and smell described in exact order.' },
            { id: 'deciphering', name: 'Deciphers the heath-fire commands', returnReaction: 'Tilda sifts your ash samples while the rest of the pub celebrates.' },
            { id: 'wardkeeper', name: 'Prepares wards for the watchhouse', returnReaction: 'Tilda checks her counter-signs against what you saw on the road.' },
            { id: 'settled', name: 'Keeps a permanent table by the hearth', returnReaction: 'Tilda records the northern lead and leaves a fresh ward beside your mug.' }
        ]
    },
    marlow: {
        id: 'marlow',
        name: 'Marlow',
        role: 'Retired road sergeant and named companion',
        initialStageId: 'retired',
        stages: [
            { id: 'retired', name: 'Avoids the roads he once guarded', returnReaction: 'Marlow watches the door until he is sure you came back under your own power.' },
            { id: 'suspicious', name: 'Recognizes the false toll seal', returnReaction: 'Marlow asks who stood watch, who collected, and who gave the orders.' },
            { id: 'scouting', name: 'Maps the toll gang\'s routines', returnReaction: 'Marlow moves markers on his patrol map as you give the report.' },
            { id: 'road_captain', name: 'Organizes a breach of the watchhouse', returnReaction: 'Marlow tests your account against the side-gate plan one last time.' },
            { id: 'staying', name: 'Chooses to rebuild the local road watch', returnReaction: 'Marlow adds your safe return to the first page of the new watch ledger.' }
        ]
    }
});

const TownMilestoneCatalog = deepFreeze({
    quartermaster_stall_open: {
        id: 'quartermaster_stall_open',
        name: 'Quartermaster Stall Open',
        initialStatus: 'locked',
        description: 'Mara has enough confidence in the road to open a supply stall.'
    },
    tilda_ward_table_open: {
        id: 'tilda_ward_table_open',
        name: 'Ward Table Open',
        initialStatus: 'locked',
        description: 'Tilda has claimed a hearthside table for road signs, ashes, and protective wards.'
    },
    marlow_road_watch_open: {
        id: 'marlow_road_watch_open',
        name: 'Road Watch Restored',
        initialStatus: 'locked',
        description: 'Marlow has begun keeping route reports and organizing volunteers.'
    },
    watchhouse_assault_ready: {
        id: 'watchhouse_assault_ready',
        name: 'Watchhouse Expedition Ready',
        initialStatus: 'locked',
        description: 'The pub has the wardcraft and route intelligence needed to reach the ruined watchhouse.'
    },
    road_network_restored: {
        id: 'road_network_restored',
        name: 'Local Roads Reopened',
        initialStatus: 'locked',
        description: 'The false toll network is broken and guarded travel has begun again.'
    }
});

const TownServiceCatalog = deepFreeze({
    quartermaster_stock: {
        id: 'quartermaster_stock',
        name: 'Quartermaster Stall',
        providerNpcId: 'mara',
        description: 'Collect the first-return kit and buy dependable equipment for known threats.',
        requirements: {
            townMilestones: { quartermaster_stall_open: 'unlocked' },
            npcStages: { mara: 'quartermaster' }
        }
    },
    tilda_ward_table: {
        id: 'tilda_ward_table',
        name: 'Tilda\'s Ward Table',
        providerNpcId: 'tilda',
        actionId: 'review_watchhouse_preparations',
        actionLabel: 'Review Warded Approach',
        description: 'Review magical threats and prepare a warded approach to the watchhouse.',
        requirements: {
            townMilestones: { tilda_ward_table_open: 'unlocked' },
            npcStages: { tilda: 'wardkeeper' }
        }
    },
    marlow_road_watch: {
        id: 'marlow_road_watch',
        name: 'Marlow\'s Road Watch',
        providerNpcId: 'marlow',
        recruitNpcId: 'marlow',
        actionId: 'review_watchhouse_preparations',
        actionLabel: 'Review Breach Route',
        description: 'Review patrol reports and prepare a side-route breach of the watchhouse.',
        requirements: {
            townMilestones: { marlow_road_watch_open: 'unlocked' },
            npcStages: { marlow: 'road_captain' }
        }
    },
    watchhouse_planning: {
        id: 'watchhouse_planning',
        name: 'Watchhouse Planning Table',
        providerNpcId: 'kreg',
        actionId: 'review_watchhouse_preparations',
        actionLabel: 'Choose Watchhouse Approach',
        description: 'Choose which hard-won preparation will shape the finale expedition.',
        requirements: {
            townMilestones: { watchhouse_assault_ready: 'unlocked' },
            chapterFinaleStatuses: { chapter_one: 'ready' }
        }
    }
});

// Purchasing remains an application-layer concern. These entries only define
// guaranteed, staged access and deliberately contain no item statistics.
const TownStockCatalog = deepFreeze({
    quartermaster_round_shield: {
        id: 'quartermaster_round_shield',
        serviceId: 'quartermaster_stock',
        itemId: 'round_shield',
        price: 45,
        requirements: { townMilestones: { quartermaster_stall_open: 'unlocked' } }
    },
    quartermaster_hunters_spear: {
        id: 'quartermaster_hunters_spear',
        serviceId: 'quartermaster_stock',
        itemId: 'hunters_spear',
        price: 60,
        requirements: { townMilestones: { quartermaster_stall_open: 'unlocked' } }
    },
    quartermaster_hunter_bow: {
        id: 'quartermaster_hunter_bow',
        serviceId: 'quartermaster_stock',
        itemId: 'hunter_bow',
        price: 90,
        requirements: { townMilestones: { quartermaster_stall_open: 'unlocked' } }
    },
    quartermaster_apprentice_staff: {
        id: 'quartermaster_apprentice_staff',
        serviceId: 'quartermaster_stock',
        itemId: 'apprentice_staff',
        price: 110,
        requirements: { townMilestones: { tilda_ward_table_open: 'unlocked' } }
    },
    quartermaster_parrying_dagger: {
        id: 'quartermaster_parrying_dagger',
        serviceId: 'quartermaster_stock',
        itemId: 'parrying_dagger',
        price: 165,
        requirements: { townMilestones: { marlow_road_watch_open: 'unlocked' } }
    },
    quartermaster_tankard_maul: {
        id: 'quartermaster_tankard_maul',
        serviceId: 'quartermaster_stock',
        itemId: 'tankard_maul',
        price: 190,
        requirements: { townMilestones: { watchhouse_assault_ready: 'unlocked' } }
    }
});

const WorldRewardChoiceCatalog = deepFreeze({
    first_return_kit: {
        id: 'first_return_kit',
        name: 'First-Return Kit',
        description: 'Choose one tool for the roads ahead. The choice is permanent for this save.',
        options: [
            {
                id: 'shield_control',
                itemId: 'round_shield',
                name: 'Round Shield',
                summary: 'Block one committed hit or bash an enemy out of a wind-up.'
            },
            {
                id: 'spear_reach',
                itemId: 'hunters_spear',
                name: 'Hunter\'s Spear',
                summary: 'Threaten from two tiles away and control enemy positioning.'
            },
            {
                id: 'bow_reposition',
                itemId: 'hunter_bow',
                name: 'Hunter\'s Bow',
                summary: 'Fight at range and withdraw with Parting Shot.'
            }
        ]
    }
});

const WorldChapterCatalog = deepFreeze({
    chapter_one: {
        id: 'chapter_one',
        title: 'The False Toll',
        initialStatus: 'active',
        finale: {
            locationId: 'ruined_watchhouse',
            routeIds: ['route_heath_watchhouse', 'route_toll_watchhouse'],
            encounterIds: [
                'watchhouse_breach_unprepared',
                'watchhouse_breach_heath_prepared',
                'watchhouse_breach_toll_prepared'
            ],
            contractId: 'watchhouse_reckoning',
            preparationFlags: [
                {
                    id: 'tildas_wards',
                    name: 'Tilda\'s Wards',
                    description: 'Use Tilda\'s decoded counter-signs to blunt the watchhouse signal magic.',
                    revealRequirements: {
                        factsAny: ['pine_signal_chart', 'heath_signal_cipher']
                    }
                },
                {
                    id: 'marlows_breach',
                    name: 'Marlow\'s Breach',
                    description: 'Use Marlow\'s patrol map to approach through the neglected side gate.',
                    revealRequirements: {
                        factsAny: ['forged_toll_seal', 'toll_gang_ledger']
                    }
                }
            ],
            preparationOptions: [
                {
                    id: 'warded_approach',
                    name: 'Warded Approach',
                    description: 'Trust Tilda\'s counter-signs during the captain\'s opening maneuver.',
                    requiredFlagIds: ['tildas_wards'],
                    integrationPreparationId: 'warded_approach',
                    integrationEncounterId: 'watchhouse_breach_heath_prepared'
                },
                {
                    id: 'side_gate_breach',
                    name: 'Side-Gate Breach',
                    description: 'Trust Marlow\'s route and enter from the captain\'s exposed flank.',
                    requiredFlagIds: ['marlows_breach'],
                    integrationPreparationId: 'side_gate_breach',
                    integrationEncounterId: 'watchhouse_breach_toll_prepared'
                }
            ],
            unlockRequirements: {
                chapterPreparationFlagsAll: {
                    chapter_one: ['tildas_wards', 'marlows_breach']
                }
            },
            resolutionEvent: {
                eventType: 'ENCOUNTER_DEFEATED',
                match: {
                    encounterId: {
                        in: [
                            'watchhouse_breach_unprepared',
                            'watchhouse_breach_heath_prepared',
                            'watchhouse_breach_toll_prepared'
                        ]
                    }
                }
            }
        },
        epilogue: {
            interactionId: 'search_watchhouse_orders',
            leadFactId: 'north_road_patron',
            title: 'Open Roads, Distant Debts',
            description: 'The local roads reopen, but the captain\'s orders point toward a patron operating beyond the northern boundary.',
            nextRegionLeadId: 'north_road',
            nextRegionName: 'The North Road',
            nextRegionDescription: 'A future region tied to the unnamed patron who financed the false toll network.'
        }
    }
});

const DestinationInteractionCatalog = deepFreeze({
    inspect_wreck: {
        id: 'inspect_wreck',
        destinationId: 'old_road',
        name: 'Inspect the Wreck',
        description: 'Search the scattered keg wagon instead of immediately turning home.',
        repeatability: 'once',
        requirements: { factsAbsent: ['forged_toll_seal'] },
        effects: [
            { type: 'SET_FACT', factId: 'forged_toll_seal', value: true },
            { type: 'ADVANCE_NPC', npcId: 'kreg', stageId: 'concerned' },
            { type: 'ADVANCE_NPC', npcId: 'marlow', stageId: 'suspicious' },
            { type: 'OFFER_CONTRACT', contractId: 'false_toll' }
        ]
    },
    search_signal_cache: {
        id: 'search_signal_cache',
        destinationId: 'pine_trail',
        name: 'Search the Signal Cache',
        description: 'Follow the carved pine marks to a concealed observer\'s cache.',
        repeatability: 'once',
        requirements: { factsAbsent: ['pine_signal_chart'] },
        effects: [
            { type: 'SET_FACT', factId: 'pine_signal_chart', value: true },
            { type: 'ADVANCE_NPC', npcId: 'elowen', stageId: 'informed' },
            { type: 'ADVANCE_NPC', npcId: 'tilda', stageId: 'curious' },
            { type: 'OFFER_CONTRACT', contractId: 'road_conditions_pine' },
            { type: 'OFFER_CONTRACT', contractId: 'ashes_on_the_heath' }
        ]
    },
    trace_heath_signal: {
        id: 'trace_heath_signal',
        destinationId: 'burnt_heath',
        name: 'Trace the Ash Marks',
        description: 'Compare the scorched hedge marks with the Pine signal chart.',
        repeatability: 'once',
        requirements: {
            factsAll: ['pine_signal_chart'],
            factsAbsent: ['heath_signal_cipher']
        },
        effects: [
            { type: 'SET_FACT', factId: 'heath_signal_cipher', value: true },
            { type: 'ADVANCE_NPC', npcId: 'tilda', stageId: 'deciphering' }
        ]
    },
    seize_toll_ledger: {
        id: 'seize_toll_ledger',
        destinationId: 'toll_crossing',
        name: 'Seize the Toll Ledger',
        description: 'Search the toll shelter for whoever is collecting the road money.',
        repeatability: 'once',
        requirements: {
            factsAll: ['forged_toll_seal'],
            factsAbsent: ['toll_gang_ledger']
        },
        effects: [
            { type: 'SET_FACT', factId: 'toll_gang_ledger', value: true },
            { type: 'ADVANCE_NPC', npcId: 'marlow', stageId: 'scouting' }
        ]
    },
    search_watchhouse_orders: {
        id: 'search_watchhouse_orders',
        destinationId: 'ruined_watchhouse',
        name: 'Search the Command Room',
        description: 'Search the defeated captain\'s command room before returning home.',
        repeatability: 'once',
        requirements: {
            chapterFinaleStatuses: { chapter_one: 'defeated' },
            factsAbsent: ['watchhouse_orders']
        },
        effects: [
            { type: 'SET_FACT', factId: 'watchhouse_orders', value: true },
            { type: 'SET_FACT', factId: 'north_road_patron', value: true }
        ]
    }
});

const WorldContractCatalog = deepFreeze({
    missing_kegs: {
        id: 'missing_kegs',
        type: 'story',
        title: 'Missing Kegs',
        issuerNpcId: 'kreg',
        repeatable: false,
        initiallyOffered: true,
        routeId: 'route_old_road',
        summary: 'Find Kreg\'s missing delivery on the Old Road and make it safely home.',
        reward: { gold: 75 },
        onClaimEffects: [
            { type: 'ADVANCE_NPC', npcId: 'kreg', stageId: 'committed' }
        ],
        objectives: [
            {
                id: 'find_keg_wreck',
                type: 'interact',
                description: 'Inspect the wreck on the Old Road.',
                eventType: 'DESTINATION_INTERACTION_COMPLETED',
                target: 1,
                match: { interactionId: 'inspect_wreck' }
            },
            {
                id: 'return_from_old_road',
                type: 'safe_return',
                description: 'Return safely from the Old Road after finding the wreck.',
                eventType: 'SAFE_RETURN',
                target: 1,
                match: { routeId: 'route_old_road' },
                requiresObjectiveIds: ['find_keg_wreck'],
                onCompleteEffects: [
                    { type: 'ADVANCE_NPC', npcId: 'mara', stageId: 'quartermaster' },
                    { type: 'SET_TOWN_MILESTONE', milestoneId: 'quartermaster_stall_open', status: 'unlocked' }
                ]
            }
        ]
    },
    road_conditions_pine: {
        id: 'road_conditions_pine',
        type: 'repeatable',
        title: 'Pine Road Conditions',
        issuerNpcId: 'elowen',
        repeatable: true,
        initiallyOffered: false,
        routeId: 'route_pine_trail',
        routeIds: ['route_pine_trail', 'route_old_pine_cut'],
        summary: 'Reach the pines by the main trail or Drover\'s Cut, return safely, and report what has changed.',
        reward: { gold: 45 },
        availability: { factsAll: ['pine_signal_chart'] },
        objectives: [
            {
                id: 'report_pine_conditions',
                type: 'safe_return',
                description: 'Return safely from the Pine Trail or Drover\'s Cut.',
                eventType: 'SAFE_RETURN',
                target: 1,
                match: { routeId: { in: ['route_pine_trail', 'route_old_pine_cut'] } },
                onCompleteEffects: [
                    { type: 'ADVANCE_NPC', npcId: 'elowen', stageId: 'cooperative' }
                ]
            }
        ]
    },
    ashes_on_the_heath: {
        id: 'ashes_on_the_heath',
        type: 'story',
        title: 'Ashes on the Heath',
        issuerNpcId: 'tilda',
        repeatable: false,
        initiallyOffered: false,
        routeId: 'route_burnt_heath',
        summary: 'Follow the Pine signals onto the Burnt Heath and learn who is tending the fires.',
        reward: { gold: 110 },
        availability: { factsAll: ['pine_signal_chart'] },
        onClaimEffects: [
            { type: 'ADVANCE_NPC', npcId: 'tilda', stageId: 'wardkeeper' },
            { type: 'SET_TOWN_MILESTONE', milestoneId: 'tilda_ward_table_open', status: 'unlocked' },
            { type: 'SET_CHAPTER_PREPARATION', chapterId: 'chapter_one', flagId: 'tildas_wards' },
            { type: 'OFFER_CONTRACT', contractId: 'heath_watch' }
        ],
        objectives: [
            {
                id: 'discover_burnt_heath',
                type: 'discover',
                description: 'Discover the Burnt Heath from the Pine signal chart.',
                eventType: 'LOCATION_DISCOVERED',
                target: 1,
                match: { locationId: 'burnt_heath' },
                evidence: { factsAll: ['pine_signal_chart'] }
            },
            {
                id: 'defeat_heath_signalers',
                type: 'defeat',
                description: 'Defeat the signal keepers on the Burnt Heath.',
                eventType: 'ENCOUNTER_DEFEATED',
                target: 1,
                match: {
                    routeId: 'route_burnt_heath',
                    encounterId: { in: ['hedge_fire', 'heath_smoke_screen', 'heath_cinder_circle'] }
                },
                requiresObjectiveIds: ['discover_burnt_heath']
            },
            {
                id: 'decode_heath_signal',
                type: 'interact',
                description: 'Trace the ash marks after the fighting ends.',
                eventType: 'DESTINATION_INTERACTION_COMPLETED',
                target: 1,
                match: { interactionId: 'trace_heath_signal' },
                requiresObjectiveIds: ['defeat_heath_signalers']
            },
            {
                id: 'return_from_burnt_heath',
                type: 'safe_return',
                description: 'Bring the decoded signal safely back to Tilda.',
                eventType: 'SAFE_RETURN',
                target: 1,
                match: { routeId: 'route_burnt_heath' },
                requiresObjectiveIds: ['decode_heath_signal']
            }
        ]
    },
    false_toll: {
        id: 'false_toll',
        type: 'story',
        title: 'The False Toll',
        issuerNpcId: 'marlow',
        repeatable: false,
        initiallyOffered: false,
        routeId: 'route_toll_crossing',
        summary: 'Break the gang using the forged seal and find where their collections go.',
        reward: { gold: 125 },
        availability: { factsAll: ['forged_toll_seal'] },
        onClaimEffects: [
            { type: 'ADVANCE_NPC', npcId: 'marlow', stageId: 'road_captain' },
            { type: 'SET_TOWN_MILESTONE', milestoneId: 'marlow_road_watch_open', status: 'unlocked' },
            { type: 'SET_CHAPTER_PREPARATION', chapterId: 'chapter_one', flagId: 'marlows_breach' },
            { type: 'OFFER_CONTRACT', contractId: 'crossing_patrol' }
        ],
        objectives: [
            {
                id: 'discover_toll_crossing',
                type: 'discover',
                description: 'Locate the Toll Crossing from the forged seal.',
                eventType: 'LOCATION_DISCOVERED',
                target: 1,
                match: { locationId: 'toll_crossing' },
                evidence: { factsAll: ['forged_toll_seal'] }
            },
            {
                id: 'defeat_toll_gang',
                type: 'defeat',
                description: 'Defeat the gang holding the Toll Crossing.',
                eventType: 'ENCOUNTER_DEFEATED',
                target: 1,
                match: {
                    routeId: 'route_toll_crossing',
                    encounterId: { in: ['road_toll', 'road_toll_crossfire', 'road_toll_ambush'] }
                },
                requiresObjectiveIds: ['discover_toll_crossing']
            },
            {
                id: 'take_toll_ledger',
                type: 'interact',
                description: 'Seize the gang\'s collection ledger.',
                eventType: 'DESTINATION_INTERACTION_COMPLETED',
                target: 1,
                match: { interactionId: 'seize_toll_ledger' },
                requiresObjectiveIds: ['defeat_toll_gang']
            },
            {
                id: 'return_from_toll_crossing',
                type: 'safe_return',
                description: 'Bring the ledger safely back to Marlow.',
                eventType: 'SAFE_RETURN',
                target: 1,
                match: { routeId: 'route_toll_crossing' },
                requiresObjectiveIds: ['take_toll_ledger']
            }
        ]
    },
    heath_watch: {
        id: 'heath_watch',
        type: 'repeatable',
        title: 'Heath Watch',
        issuerNpcId: 'tilda',
        repeatable: true,
        initiallyOffered: false,
        routeId: 'route_burnt_heath',
        routeIds: ['route_burnt_heath', 'route_heath_toll_cut'],
        summary: 'Break up another signal fire on the heath routes and return with a fresh ash report.',
        reward: { gold: 60 },
        availability: { contractsCompleted: ['ashes_on_the_heath'] },
        objectives: [
            {
                id: 'break_heath_signal',
                type: 'defeat',
                description: 'Defeat a signal crew on the Burnt Heath.',
                eventType: 'ENCOUNTER_DEFEATED',
                target: 1,
                match: {
                    routeId: { in: ['route_burnt_heath', 'route_heath_toll_cut'] },
                    encounterId: { in: ['hedge_fire', 'heath_smoke_screen', 'heath_cinder_circle'] }
                }
            },
            {
                id: 'report_heath_watch',
                type: 'safe_return',
                description: 'Return safely by the Heath Track or Smuggler\'s Traverse after breaking the signal fire.',
                eventType: 'SAFE_RETURN',
                target: 1,
                match: { routeId: { in: ['route_burnt_heath', 'route_heath_toll_cut'] } },
                requiresObjectiveIds: ['break_heath_signal']
            }
        ]
    },
    crossing_patrol: {
        id: 'crossing_patrol',
        type: 'repeatable',
        title: 'Crossing Patrol',
        issuerNpcId: 'marlow',
        repeatable: true,
        initiallyOffered: false,
        routeId: 'route_toll_crossing',
        routeIds: ['route_toll_crossing', 'route_heath_toll_cut'],
        summary: 'Disrupt another toll crew on the crossing routes and report safely to the road watch.',
        reward: { gold: 70 },
        availability: { contractsCompleted: ['false_toll'] },
        objectives: [
            {
                id: 'break_toll_patrol',
                type: 'defeat',
                description: 'Defeat a toll crew at the crossing.',
                eventType: 'ENCOUNTER_DEFEATED',
                target: 1,
                match: {
                    routeId: { in: ['route_toll_crossing', 'route_heath_toll_cut'] },
                    encounterId: { in: ['road_toll', 'road_toll_crossfire', 'road_toll_ambush'] }
                }
            },
            {
                id: 'report_crossing_patrol',
                type: 'safe_return',
                description: 'Return safely by the Toll Road or Smuggler\'s Traverse after disrupting the toll crew.',
                eventType: 'SAFE_RETURN',
                target: 1,
                match: { routeId: { in: ['route_toll_crossing', 'route_heath_toll_cut'] } },
                requiresObjectiveIds: ['break_toll_patrol']
            }
        ]
    },
    watchhouse_reckoning: {
        id: 'watchhouse_reckoning',
        type: 'story',
        title: 'The Ruined Watchhouse',
        issuerNpcId: 'kreg',
        repeatable: false,
        initiallyOffered: false,
        routeIds: ['route_heath_watchhouse', 'route_toll_watchhouse'],
        summary: 'Choose an approach, defeat the road captain, recover the orders, and return home.',
        reward: { gold: 200 },
        availability: {
            chapterPreparationFlagsAll: {
                chapter_one: ['tildas_wards', 'marlows_breach']
            }
        },
        onClaimEffects: [
            { type: 'COMPLETE_CHAPTER', chapterId: 'chapter_one' },
            { type: 'SET_TOWN_MILESTONE', milestoneId: 'road_network_restored', status: 'completed' },
            { type: 'ADVANCE_NPC', npcId: 'kreg', stageId: 'relieved' },
            { type: 'ADVANCE_NPC', npcId: 'elowen', stageId: 'watchful' },
            { type: 'ADVANCE_NPC', npcId: 'mara', stageId: 'provisioned' },
            { type: 'ADVANCE_NPC', npcId: 'tilda', stageId: 'settled' },
            { type: 'ADVANCE_NPC', npcId: 'marlow', stageId: 'staying' }
        ],
        objectives: [
            {
                id: 'secure_tildas_support',
                type: 'contract',
                description: 'Secure Tilda\'s wardcraft.',
                eventType: 'CONTRACT_CLAIMED',
                target: 1,
                match: { contractId: 'ashes_on_the_heath' },
                evidence: { contractsCompleted: ['ashes_on_the_heath'] }
            },
            {
                id: 'secure_marlows_support',
                type: 'contract',
                description: 'Secure Marlow\'s route plan.',
                eventType: 'CONTRACT_CLAIMED',
                target: 1,
                match: { contractId: 'false_toll' },
                evidence: { contractsCompleted: ['false_toll'] }
            },
            {
                id: 'choose_watchhouse_plan',
                type: 'prepare',
                description: 'Choose the watchhouse approach at the planning table.',
                eventType: 'FINALE_PREPARATION_SELECTED',
                target: 1,
                match: { chapterId: 'chapter_one' },
                requiresObjectiveIds: ['secure_tildas_support', 'secure_marlows_support']
            },
            {
                id: 'defeat_watchhouse_breach',
                type: 'defeat',
                description: 'Defeat the captain commanding the false toll network.',
                eventType: 'ENCOUNTER_DEFEATED',
                target: 1,
                match: {
                    encounterId: {
                        in: [
                            'watchhouse_breach_unprepared',
                            'watchhouse_breach_heath_prepared',
                            'watchhouse_breach_toll_prepared'
                        ]
                    }
                },
                requiresObjectiveIds: ['choose_watchhouse_plan']
            },
            {
                id: 'recover_watchhouse_orders',
                type: 'interact',
                description: 'Search the command room for proof and another lead.',
                eventType: 'DESTINATION_INTERACTION_COMPLETED',
                target: 1,
                match: { interactionId: 'search_watchhouse_orders' },
                requiresObjectiveIds: ['defeat_watchhouse_breach']
            },
            {
                id: 'return_from_watchhouse',
                type: 'safe_return',
                description: 'Bring the orders safely back to the pub.',
                eventType: 'SAFE_RETURN',
                target: 1,
                match: { routeId: { in: ['route_heath_watchhouse', 'route_toll_watchhouse'] } },
                requiresObjectiveIds: ['recover_watchhouse_orders']
            }
        ]
    }
});

module.exports = {
    WorldFactCatalog,
    NpcCatalog,
    TownMilestoneCatalog,
    TownServiceCatalog,
    TownStockCatalog,
    WorldRewardChoiceCatalog,
    WorldChapterCatalog,
    DestinationInteractionCatalog,
    WorldContractCatalog
};
