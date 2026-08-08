const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.resolve(__dirname, '..', 'public', 'js', 'main.js'),
    'utf8'
);
const combatSource = fs.readFileSync(
    path.resolve(__dirname, '..', 'public', 'js', 'combat-mechanics.js'),
    'utf8'
);

test('every unfinished expedition combat resumes the journey without opening escrow loot', () => {
    const resumeCheck = source.match(/function shouldResumeExpeditionJourneyAfterVictory\(\) \{([\s\S]*?)\n\}/);
    assert.ok(resumeCheck);
    assert.match(resumeCheck[1], /return !!getActiveExpeditionJourney\(\)/);
    assert.doesNotMatch(
        resumeCheck[1],
        /AT_DESTINATION/,
        'intermediate legs and return legs must resume just like destination combat'
    );

    const presentation = source.match(/function presentCombatVictory\(\) \{([\s\S]*?)\n\}/);
    assert.ok(presentation);
    assert.match(presentation[1], /if \(shouldResumeExpeditionJourneyAfterVictory\(\)\)/);
    assert.match(presentation[1], /transitionToTown\(\)/);
    assert.match(presentation[1], /showLootScreen\(\)/);
    assert.ok(
        presentation[1].indexOf('shouldResumeExpeditionJourneyAfterVictory()')
            < presentation[1].lastIndexOf('showLootScreen()'),
        'unfinished-journey routing must be checked before the final loot screen'
    );
});

test('return routing sends active journeys to Roads and every cleared combat to Town', () => {
    const transitionStart = combatSource.indexOf('window.transitionToTown = function()');
    assert.notEqual(transitionStart, -1);
    const transitionSource = combatSource.slice(transitionStart);
    const observedStates = [];
    const context = vm.createContext({
        CombatSpriteAnimation: { clear() {} },
        cancelPendingCombatPlaybacks() {},
        cancelPendingCombatSpriteActions() {},
        combatAuthorityRevision: 0,
        combatPlaybackGeneration: 0,
        combatStartedFromJourney: false,
        expeditionRewardReturnPending: false,
        document: {
            getElementById() {
                return { style: {} };
            }
        },
        hideTooltip() {},
        latestCombatTurnSequence: 0,
        logMessage() {},
        playRetroSound() {},
        player: { adventure: { activeJourney: null } },
        resetEquipmentAttackUiState() {},
        setGameState(state) {
            observedStates.push(state);
        },
        window: {}
    });
    vm.runInContext(transitionSource, context, { filename: 'combat-transition.js' });

    context.player.adventure.activeJourney = { phase: 'OUTBOUND' };
    context.combatStartedFromJourney = true;
    context.window.transitionToTown();

    context.player.adventure.activeJourney = null;
    context.combatStartedFromJourney = true;
    context.window.transitionToTown();

    context.combatStartedFromJourney = false;
    context.expeditionRewardReturnPending = true;
    context.window.transitionToTown();

    context.expeditionRewardReturnPending = false;
    context.window.transitionToTown();

    assert.deepEqual(observedStates, ['ADVENTURES', 'TOWN', 'TOWN', 'TOWN']);
    assert.equal(context.combatStartedFromJourney, false, 'combat provenance is single-use state');
    assert.equal(context.expeditionRewardReturnPending, false, 'return-reward provenance is single-use state');
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
