const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildTavernReturnPresentation,
    getAdventureEncounterReports,
    getAdventureRouteEnemyNames
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

const snapshot = { routes: [route] };
const player = {
    roster: {
        activeIds: ['merc_1'],
        companions: [
            { instanceId: 'merc_2', name: 'Benched Bran' },
            { instanceId: 'merc_1', name: 'Mira' }
        ]
    }
};

test('road reports expose unique public enemy names without needing combat definitions', () => {
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
        contractUpdates: [{
            bountyId: 'pine_trail_patrol',
            title: 'Patrol the Pine Trail',
            progress: 1,
            target: 1,
            status: 'claimable'
        }]
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
        failureReason: 'fled_combat',
        contractUpdates: []
    }, snapshot, player);

    assert.equal(presentation.failed, true);
    assert.equal(presentation.rewardGold, 0);
    assert.match(presentation.title, /Expedition Cut Short/);
    assert.match(presentation.summary, /reward was not secured/);
    assert.match(presentation.kregLine, /cheaper than a funeral/);
    assert.doesNotMatch(presentation.companionLine, /injur|wound|crippl/i);
});

test('a claimed contract no longer leaves Kreg saying its payment is waiting', () => {
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
        contractUpdates: [{
            bountyId: 'pine_trail_patrol',
            title: 'Patrol the Pine Trail',
            progress: 1,
            target: 1,
            status: 'claimable'
        }]
    }, {
        routes: [route],
        bounties: [{ id: 'pine_trail_patrol', status: 'available' }]
    }, player);

    assert.doesNotMatch(presentation.kregLine, /ready to claim/);
    assert.equal(presentation.contractUpdates[0].currentStatus, 'available');
});
