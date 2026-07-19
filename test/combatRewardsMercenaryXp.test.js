const test = require('node:test');
const assert = require('node:assert/strict');

const {
    finalizeCombatVictory,
    claimCombatRewards
} = require('../combatRewards.js');

function companion(instanceId) {
    return {
        instanceId,
        name: instanceId,
        hired: true,
        level: 1,
        xp: 0,
        equipment: {},
        pockets: [null, null]
    };
}

function player(companions, activeIds = []) {
    return {
        username: 'Reward Tester',
        level: 1,
        xp: 0,
        xpToNext: 100,
        skillPoints: 0,
        gold: 0,
        pendingGold: 0,
        pendingXp: 100,
        pendingLoot: [],
        hp: 100,
        stamina: 50,
        vitality: 4,
        maxStamina: 2,
        equipment: {},
        roster: { companions, activeIds },
        activeBuffs: [],
        statusEffects: {}
    };
}

test('claiming victory gives the Knight full XP, deployed mercenaries full XP, and benched mercenaries half XP', () => {
    const deployed = companion('deployed');
    const benched = companion('benched');
    const knight = player([deployed, benched], [deployed.instanceId]);
    knight.pendingMercenaryXpContext = {
        eligibleInstanceIds: [deployed.instanceId, benched.instanceId],
        activeInstanceIds: [deployed.instanceId]
    };

    claimCombatRewards(knight);

    assert.equal(knight.xp, 100);
    assert.equal(knight.level, 2);
    assert.equal(deployed.xp, 100);
    assert.equal(deployed.level, 2);
    assert.equal(benched.xp, 50);
    assert.equal(benched.level, 1);
    assert.equal(knight.pendingMercenaryXpContext, undefined);
    assert.equal(knight.pendingXp, 0);
});

test('mercenary XP is not divided by the number of eligible roster members', () => {
    const companions = [companion('one'), companion('two'), companion('three')];
    const knight = player(companions, companions.map(entry => entry.instanceId));
    knight.level = 5;
    knight.pendingMercenaryXpContext = {
        eligibleInstanceIds: companions.map(entry => entry.instanceId),
        activeInstanceIds: companions.map(entry => entry.instanceId)
    };

    claimCombatRewards(knight);

    assert.deepEqual(companions.map(entry => entry.xp), [100, 100, 100]);
});

test('victory snapshots the eligible roster and actually deployed mercenaries before combat is removed', () => {
    const socketId = 'reward-snapshot';
    const deployed = companion('deployed');
    const benched = companion('benched');
    const knight = player([deployed, benched], [deployed.instanceId]);
    knight.wildernessLevel = 1;
    const combat = {
        zone: 'WILDERNESS',
        activeLevel: 1,
        gridSize: { cols: 10, rows: 8 },
        obstacles: [],
        actors: [
            {
                uid: 'player_0', id: 'player', kind: 'player', controller: 'player', teamId: 'PLAYER',
                name: knight.username, x: 1, y: 1, hp: knight.hp, maxHp: knight.hp,
                stamina: knight.stamina, maxStamina: knight.stamina, alive: true, atbCharge: 0
            },
            {
                uid: 'ally_deployed', id: 'companion_marlow', kind: 'companion', controller: 'player_companion',
                teamId: 'PLAYER', name: deployed.name, x: 2, y: 1, hp: 50, maxHp: 50,
                stamina: 25, maxStamina: 25, alive: true, companionInstanceId: deployed.instanceId
            }
        ],
        enemies: [],
        allies: [],
        rogues: [],
        player: { x: 1, y: 1, atbCharge: 0 }
    };
    const activePlayers = { [socketId]: knight };
    const activeCombats = { [socketId]: combat };
    const io = { to: () => ({ emit: () => {} }) };

    finalizeCombatVictory(socketId, { activePlayers, activeCombats, io });

    assert.equal(activeCombats[socketId], undefined);
    assert.deepEqual(knight.pendingMercenaryXpContext, {
        eligibleInstanceIds: ['deployed', 'benched'],
        activeInstanceIds: ['deployed']
    });

    const postVictoryHire = companion('new_hire');
    knight.roster.companions.push(postVictoryHire);
    knight.roster.activeIds = [benched.instanceId, postVictoryHire.instanceId];
    claimCombatRewards(knight);

    assert.equal(deployed.xp, 100);
    assert.equal(benched.xp, 50);
    assert.equal(postVictoryHire.xp, 0);
});
