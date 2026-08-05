const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
    path.resolve(__dirname, '..', 'public', 'js', 'main.js'),
    'utf8'
);

test('outbound expedition victory enters destination exploration without opening loot', () => {
    assert.match(source, /function isAtExpeditionDestination\(\)/);
    assert.match(source, /journey\.phase === 'AT_DESTINATION'/);
    const presentation = source.match(/function presentCombatVictory\(\) \{([\s\S]*?)\n\}/);
    assert.ok(presentation);
    assert.match(presentation[1], /if \(isAtExpeditionDestination\(\)\)/);
    assert.match(presentation[1], /transitionToTown\(\)/);
    assert.match(presentation[1], /showLootScreen\(\)/);
    assert.ok(
        presentation[1].indexOf('isAtExpeditionDestination()')
            < presentation[1].lastIndexOf('showLootScreen()'),
        'destination routing must be checked before the final loot screen'
    );
});

test('a rejected escrow claim cannot transition out of the current journey', () => {
    const handler = source.match(/socket\.on\('combatRewardsReceipt', \(receipt\) => \{([\s\S]*?)\n\}\);/);
    assert.ok(handler);
    assert.match(handler[1], /receipt\.success === false/);
    assert.ok(
        handler[1].indexOf('receipt.success === false') < handler[1].indexOf('transitionToTown()'),
        'failure must return before town transition'
    );
});
