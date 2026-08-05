const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildTavernReturnPresentation,
    getAdventureEncounterReports,
    getAdventureRouteEnemyNames,
    getReturnNpcReactions
} = require('../public/js/expeditions.js');

const route = {
    id: 'route_pine_trail',
    name: 'Pine Trail',
    dangerLabel: 'Watchful',
    encounterReports: [{
        name: "Poacher's Trail",
        difficulty: 2,
        tags: ['ranged', 'cover'],
        enemyNames: ['Pine Poacher', 'Poacher Scout']
    }]
};

const claimableContract = {
    id: 'road_conditions_pine',
    title: 'Pine Road Conditions',
    status: 'claimable',
    objectives: [{
        id: 'report_pine_conditions',
        description: 'Return safely from the Pine Trail.',
        progress: 1,
        target: 1,
        complete: true
    }]
};
const snapshot = { routes: [route], contracts: [claimableContract] };
const player = {
    roster: {
        activeIds: ['merc_1'],
        companions: [
            { instanceId: 'merc_2', name: 'Benched Bran' },
            { instanceId: 'merc_1', name: 'Mira' }
        ]
    }
};

test('only observed road reports expose unique public enemy names', () => {
    assert.deepEqual(getAdventureEncounterReports({ unconfirmedEncounterCount: 2 }), []);
    assert.deepEqual(getAdventureRouteEnemyNames({ unconfirmedEncounterCount: 2 }), []);
    assert.equal(getAdventureEncounterReports(route).length, 1);
    assert.deepEqual(getAdventureRouteEnemyNames({
        encounterReports: [
            route.encounterReports[0],
            { name: 'Second Watch', enemyNames: ['Pine Poacher', 'Toll Archer'] }
        ]
    }), ['Pine Poacher', 'Poacher Scout', 'Toll Archer']);
});

test('safe-return presentation chooses the active mercenary and contract-ready reaction', () => {
    const presentation = buildTavernReturnPresentation({
        reportId: 'return_1',
        outcome: 'safe_return',
        routeId: route.id,
        routeName: route.name,
        dangerLabel: route.dangerLabel,
        encounterName: "Poacher's Trail",
        encounterTags: ['ranged', 'cover'],
        enemyNames: ['Pine Poacher', 'Poacher Scout'],
        rewardGold: 50,
        firstReturn: true,
        returnedAt: 123,
        worldContractUpdates: ['road_conditions_pine:report_pine_conditions']
    }, snapshot, player);

    assert.equal(presentation.failed, false);
    assert.equal(presentation.title, 'First Safe Return: Pine Trail');
    assert.match(presentation.summary, /50g/);
    assert.match(presentation.kregLine, /ready to claim/);
    assert.equal(presentation.companionName, 'Mira');
    assert.match(presentation.companionLine, /archers owned the long lanes/);
    assert.deepEqual(presentation.enemies, ['Pine Poacher', 'Poacher Scout']);
});

test('failed-return presentation preserves failure tone without inventing an injury', () => {
    const presentation = buildTavernReturnPresentation({
        reportId: 'return_2',
        outcome: 'expedition_failed',
        routeId: route.id,
        routeName: route.name,
        dangerLabel: route.dangerLabel,
        encounterName: "Poacher's Trail",
        encounterTags: ['ranged'],
        enemyNames: ['Pine Poacher'],
        rewardGold: 999,
        failureReason: 'fled_combat'
    }, snapshot, player);

    assert.equal(presentation.failed, true);
    assert.equal(presentation.rewardGold, 0);
    assert.match(presentation.title, /Expedition Cut Short/);
    assert.match(presentation.summary, /reward was not secured/);
    assert.match(presentation.kregLine, /cheaper than a funeral/);
    assert.doesNotMatch(presentation.companionLine, /injur|wound|crippl/i);
});

test('a non-claimable typed contract no longer leaves Kreg saying its payment is waiting', () => {
    const presentation = buildTavernReturnPresentation({
        reportId: 'return_3',
        outcome: 'safe_return',
        routeId: route.id,
        routeName: route.name,
        dangerLabel: route.dangerLabel,
        encounterName: "Poacher's Trail",
        encounterTags: ['ranged'],
        enemyNames: ['Pine Poacher'],
        rewardGold: 30,
        worldContractUpdates: ['road_conditions_pine:report_pine_conditions']
    }, {
        routes: [route],
        contracts: [{
            ...claimableContract,
            status: 'available'
        }]
    }, player);

    assert.doesNotMatch(presentation.kregLine, /ready to claim/);
    assert.equal(presentation.contractUpdates[0].currentStatus, 'available');
});

test('a historical first-return offer stops advertising gear after the kit is claimed', () => {
    const presentation = buildTavernReturnPresentation({
        outcome: 'safe_return',
        routeId: route.id,
        firstReturn: true,
        rewardChoiceOffered: true,
        rewardGold: 30
    }, {
        routes: [route],
        contracts: [],
        world: {
            rewardChoices: [{
                id: 'first_return_kit',
                status: 'claimed',
                claimedOptionId: 'shield_control'
            }]
        }
    }, player);

    assert.equal(presentation.rewardChoiceAvailable, false);
    assert.doesNotMatch(presentation.summary, /choice waiting/);
    assert.doesNotMatch(presentation.kregLine, /set aside a first-return kit/);
});

test('legacy counter updates do not masquerade as typed world objectives', () => {
    const presentation = buildTavernReturnPresentation({
        outcome: 'safe_return',
        routeId: route.id,
        contractUpdates: [{
            bountyId: 'pine_trail_patrol',
            progress: 3,
            target: 3,
            status: 'claimable'
        }]
    }, snapshot, player);

    assert.deepEqual(presentation.contractUpdates, []);
    assert.doesNotMatch(presentation.kregLine, /ready to claim/);
});

test('progressed town NPCs add state-driven return reactions without generic clones', () => {
    const worldSnapshot = {
        world: {
            npcs: [
                { id: 'kreg', name: 'Kreg', reaction: 'Already represented by the main return line.' },
                { id: 'tilda', name: 'Tilda', stageId: 'prepared', returnReaction: 'The firebreak held.' },
                { id: 'marlow', name: 'Marlow', stageId: 'allied', reaction: 'The old gate is still usable.' }
            ]
        }
    };
    assert.deepEqual(getReturnNpcReactions(worldSnapshot), [
        { npcId: 'tilda', name: 'Tilda', line: 'The firebreak held.', stageId: 'prepared' },
        { npcId: 'marlow', name: 'Marlow', line: 'The old gate is still usable.', stageId: 'allied' }
    ]);

    const presentation = buildTavernReturnPresentation({
        outcome: 'safe_return',
        routeId: route.id,
        rewardGold: 30
    }, { ...snapshot, ...worldSnapshot }, player);
    assert.equal(presentation.npcReactions.length, 2);
    assert.equal(presentation.npcReactions[0].name, 'Tilda');
});

test('return reactions prioritize the traveled branch and benched companions stay silent', () => {
    const worldSnapshot = {
        routes: [{ id: 'route_toll_crossing', name: 'Toll Crossing' }],
        world: {
            contracts: [],
            npcs: [
                { id: 'kreg', name: 'Kreg', returnReaction: 'Main line.' },
                { id: 'elowen', name: 'Elowen', returnReaction: 'Pines.' },
                { id: 'mara', name: 'Mara', returnReaction: 'Stock.' },
                { id: 'tilda', name: 'Tilda', returnReaction: 'Ash.' },
                { id: 'marlow', name: 'Marlow', returnReaction: 'Gate.' }
            ]
        }
    };
    const report = { outcome: 'safe_return', routeId: 'route_toll_crossing' };
    const reactions = getReturnNpcReactions(worldSnapshot, report);
    assert.equal(reactions[0].npcId, 'marlow');
    assert.ok(reactions.some(reaction => reaction.npcId === 'tilda'));

    const presentation = buildTavernReturnPresentation(report, worldSnapshot, {
        roster: {
            activeIds: [],
            companions: [{ instanceId: 'story_marlow', name: 'Marlow' }]
        }
    });
    assert.equal(presentation.companionName, null);
});
