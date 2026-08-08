const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'public', 'js', 'main.js'), 'utf8');
const socialSource = fs.readFileSync(path.join(root, 'public', 'js', 'social.js'), 'utf8');

function getHubRouterSource() {
    const start = mainSource.indexOf('function setGameState(state)');
    const end = mainSource.indexOf('// === NEW: MOBILE TOOLTIP DISMISSAL ===', start);
    assert.notEqual(start, -1, 'setGameState is missing');
    assert.notEqual(end, -1, 'setGameState test boundary is missing');
    return mainSource.slice(start, end);
}

test('the central router owns Town and Community lifecycle transitions', () => {
    const observations = {
        joined: [],
        left: [],
        logs: [],
        refreshed: 0,
        townTeardowns: 0
    };
    const context = vm.createContext({
        gameState: 'TOWN',
        hideTooltip() {},
        joinMultiplayerZone(zoneId) { observations.joined.push(zoneId); },
        leaveMultiplayerZone(skipStateChange) { observations.left.push(skipStateChange); },
        logMessage(message) { observations.logs.push(message); },
        player: { adventure: { activeJourney: null } },
        playRetroSound() {},
        refreshSystemUI() { observations.refreshed += 1; },
        teardownWalkableTown() { observations.townTeardowns += 1; },
        window: { scrollTo() {} }
    });
    vm.runInContext(getHubRouterSource(), context, { filename: 'town-hub-router.js' });

    context.setGameState('COMMUNITY');
    assert.equal(context.gameState, 'COMMUNITY');
    assert.deepEqual(observations.joined, ['ZONE_HUB']);
    assert.equal(observations.townTeardowns, 1);

    context.setGameState('PARTY');
    assert.equal(context.gameState, 'PARTY');
    assert.deepEqual(observations.left, [true]);

    context.player.adventure.activeJourney = { routeId: 'old_road' };
    context.setGameState('COMMUNITY');
    assert.equal(context.gameState, 'ADVENTURES');
    assert.deepEqual(observations.joined, ['ZONE_HUB'], 'away parties must not join Community');
    assert.equal(observations.logs.length, 1);

    context.returnToMainHub();
    assert.equal(context.gameState, 'ADVENTURES');
    context.player.adventure.activeJourney = null;
    context.returnToMainHub();
    assert.equal(context.gameState, 'TOWN');
});

test('Community socket helpers no longer own screen display or the retired tab router', () => {
    const joinSource = socialSource.match(/function joinMultiplayerZone\(zoneId\) \{([\s\S]*?)\n\}/);
    const leaveStart = socialSource.indexOf('function leaveMultiplayerZone');
    const leaveEnd = socialSource.indexOf('\nfunction getSocialNotificationButton', leaveStart);
    assert.ok(joinSource);
    assert.notEqual(leaveStart, -1);
    assert.notEqual(leaveEnd, -1);
    assert.doesNotMatch(joinSource[1], /social-view|style\.display|switchTab/);
    assert.doesNotMatch(socialSource.slice(leaveStart, leaveEnd), /switchTab/);
    assert.match(socialSource, /community-social-button[\s\S]{0,100}global-social-button/);
    assert.match(socialSource, /function closeSocialHubModal/);
});

test('authoritative inventory snapshots settle Party actions even on rejection', () => {
    const townReceipt = mainSource.match(/socket\.on\('townReceipt', \(receipt\) => \{([\s\S]*?)\n\}\);/);
    const inventoryReceipt = mainSource.match(/socket\.on\('inventoryReceipt', \(receipt\) => \{([\s\S]*?)\n\}\);/);
    assert.ok(townReceipt);
    assert.ok(inventoryReceipt);
    assert.ok(
        townReceipt[1].indexOf('Object.assign(player, receipt.updatedPlayer)')
            < townReceipt[1].indexOf('if (!receipt.success)'),
        'Town snapshots must merge before rejected receipts return'
    );
    assert.ok(
        inventoryReceipt[1].indexOf('Object.assign(player, receipt.updatedPlayer)')
            < inventoryReceipt[1].indexOf('if (!receipt.success)'),
        'Inventory snapshots must merge before rejected receipts return'
    );
    assert.match(inventoryReceipt[1], /window\.completePartyInventoryAction\(receipt\)/);
    assert.match(inventoryReceipt[1], /if \(!receipt\.success\)[\s\S]*refreshSystemUI\(\)[\s\S]*completePartyAction\(\)/);
});
