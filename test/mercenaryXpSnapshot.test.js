const test = require('node:test');
const assert = require('node:assert/strict');

const { awardMercenaryEncounterXp } = require('../mercenaryProgression.js');

function mercenary(instanceId) {
    return { instanceId, name: instanceId, hired: true, level: 1, xp: 0 };
}

test('the victory snapshot preserves deployed XP rates if party selection changes before rewards are claimed', () => {
    const deployed = mercenary('deployed');
    const benched = mercenary('benched');
    const player = {
        level: 5,
        roster: {
            companions: [deployed, benched],
            activeIds: [benched.instanceId]
        }
    };
    const snapshot = {
        eligibleInstanceIds: [deployed.instanceId, benched.instanceId],
        activeInstanceIds: [deployed.instanceId]
    };

    awardMercenaryEncounterXp(player, 100, snapshot);

    assert.equal(deployed.xp, 100);
    assert.equal(benched.xp, 50);
});

test('mercenaries hired after victory are excluded by the eligible-roster snapshot', () => {
    const veteran = mercenary('veteran');
    const postVictoryHire = mercenary('new_hire');
    const player = {
        level: 5,
        roster: {
            companions: [veteran, postVictoryHire],
            activeIds: [veteran.instanceId, postVictoryHire.instanceId]
        }
    };

    const awards = awardMercenaryEncounterXp(player, 100, {
        eligibleInstanceIds: [veteran.instanceId],
        activeInstanceIds: [veteran.instanceId]
    });

    assert.deepEqual(awards.map(award => award.instanceId), ['veteran']);
    assert.equal(veteran.xp, 100);
    assert.equal(postVictoryHire.xp, 0);
});
