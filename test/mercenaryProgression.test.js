const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ACTIVE_MERCENARY_XP_RATIO,
    BENCHED_MERCENARY_XP_RATIO,
    DEFAULT_TRAINING_GOLD_PER_TARGET_LEVEL,
    awardMercenaryEncounterXp,
    getMercenaryTrainingQuote,
    trainMercenaryOneLevel
} = require('../mercenaryProgression.js');
const { getTotalXpForLevel } = require('../xpMath.js');

function companion(instanceId, overrides = {}) {
    return {
        instanceId,
        templateId: 'starter_mercenary',
        name: instanceId,
        hired: true,
        level: 1,
        xp: 0,
        ...overrides
    };
}

function player(companions, activeIds = []) {
    return {
        level: 5,
        gold: 5000,
        roster: { companions, activeIds }
    };
}

test('active mercenaries receive 100% encounter XP while benched mercenaries receive 50% without splitting', () => {
    const active = companion('active');
    const benchedOne = companion('bench_1');
    const benchedTwo = companion('bench_2');
    const knight = player([active, benchedOne, benchedTwo], [active.instanceId]);

    const awards = awardMercenaryEncounterXp(knight, 100);

    assert.equal(ACTIVE_MERCENARY_XP_RATIO, 1);
    assert.equal(BENCHED_MERCENARY_XP_RATIO, 0.5);
    assert.deepEqual(awards.map(award => award.xpAwarded), [100, 50, 50]);
    assert.equal(active.xp, 100);
    assert.equal(benchedOne.xp, 50);
    assert.equal(benchedTwo.xp, 50);
    assert.equal(active.level, 2);
    assert.equal(benchedOne.level, 1);
});

test('mercenary level-ups stop at the Knight level while preserving earned lifetime XP', () => {
    const mercenary = companion('capped');
    const knight = player([mercenary], ['capped']);
    knight.level = 2;

    awardMercenaryEncounterXp(knight, 100000);

    assert.equal(mercenary.level, 2);
    assert.equal(mercenary.xp, 100000);
});

test('paid training advances exactly one level and costs 150 gold per target level', () => {
    const mercenary = companion('trainee');
    const knight = player([mercenary]);
    knight.gold = 1000;

    const quote = getMercenaryTrainingQuote(knight, mercenary.instanceId);
    const result = trainMercenaryOneLevel(knight, mercenary.instanceId);

    assert.equal(DEFAULT_TRAINING_GOLD_PER_TARGET_LEVEL, 150);
    assert.equal(quote.targetLevel, 2);
    assert.equal(quote.cost, 300);
    assert.equal(result.success, true);
    assert.equal(result.currentLevel, 2);
    assert.equal(mercenary.level, 2);
    assert.equal(mercenary.xp, getTotalXpForLevel(2));
    assert.equal(knight.gold, 700);
});

test('training is capped one level below the Knight and is rejected during combat', () => {
    const capped = companion('capped', { level: 4, xp: getTotalXpForLevel(4) });
    const trainee = companion('combat_trainee');
    const knight = player([capped, trainee]);
    knight.level = 5;

    const cappedResult = trainMercenaryOneLevel(knight, capped.instanceId);
    const combatResult = trainMercenaryOneLevel(knight, trainee.instanceId, { inCombat: true });

    assert.equal(cappedResult.success, false);
    assert.equal(cappedResult.code, 'TRAINING_CAP');
    assert.equal(cappedResult.maxTrainingLevel, 4);
    assert.equal(combatResult.success, false);
    assert.equal(combatResult.code, 'IN_COMBAT');
});

test('insufficient-gold training quotes report the exact cost without mutating progression', () => {
    const mercenary = companion('poor_trainee');
    const knight = player([mercenary]);
    knight.gold = 299;

    const result = trainMercenaryOneLevel(knight, mercenary.instanceId);

    assert.equal(result.success, false);
    assert.equal(result.code, 'INSUFFICIENT_GOLD');
    assert.equal(result.cost, 300);
    assert.equal(result.availableGold, 299);
    assert.equal(mercenary.level, 1);
    assert.equal(mercenary.xp, 0);
    assert.equal(knight.gold, 299);
});
