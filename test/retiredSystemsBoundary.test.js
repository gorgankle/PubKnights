const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('retired town handlers and chumming state stay outside the production runtime', () => {
    const townRouter = read('townRouter.js');
    const runtime = [
        townRouter,
        read('server.js'),
        read('adventureRouter.js'),
        read('combatRouter.js'),
        read('combatRewards.js'),
        read('combatDefeat.js'),
        read('public/js/player.js'),
        read('public/js/town-actions.js'),
        read('public/js/main.js'),
        read('public/js/ui-tooltips.js'),
        read('public/js/ui-render.js'),
        read('public/index.html')
    ].join('\n');
    const retiredActionIds = [
        'hireWorker',
        'upgradeCabin',
        'assignWorker',
        'claimCart',
        'upgradeCart',
        'happyHour',
        'chumCellars',
        'blackMarket',
        'purchaseGildedTavern',
        'buyTradeRoutes',
        'purchaseMonument',
        'exportFish',
        'sellFishBulk'
    ];

    retiredActionIds.forEach(actionId => {
        assert.equal(townRouter.includes(actionId), false, actionId);
    });
    assert.doesNotMatch(runtime, /cellarsChummed/);
    assert.doesNotMatch(runtime, /happyHourTicks/);
    assert.doesNotMatch(runtime, /id=["']upgrades-screen["']/);
    assert.doesNotMatch(runtime, /Town Hall/i);
    assert.doesNotMatch(read('combatRouter.js'), /socket\.on\(['"]deployToCombat/);
    assert.doesNotMatch(read('combatRouter.js'), /PUBKNIGHTS_LEGACY_DEPLOYMENTS/);
});

test('minigame currencies and the complete crate pipeline remain production features', () => {
    const townRouter = read('townRouter.js');
    const minigames = read('public/js/minigames.js');
    const townActions = read('public/js/town-actions.js');
    const index = read('public/index.html');
    const uiRender = read('public/js/ui-render.js');
    const items = read('public/js/items.js');
    const lootTables = read('public/js/lootTables.js');

    [
        'startMinigame',
        'recordMinigameEvent',
        'claimLumberMinigame',
        'claimFishingMinigame',
        'claimHopsMinigame',
        'exchangePoints',
        'openCrate',
        'lumberPoints',
        'fishingPoints',
        'hopsPoints'
    ].forEach(identifier => {
        assert.equal(
            townRouter.includes(identifier)
                || minigames.includes(identifier)
                || townActions.includes(identifier),
            true,
            identifier
        );
    });

    ['timber_crate', 'angler_crate', 'harvest_crate'].forEach(crateId => {
        assert.equal(townRouter.includes(crateId), true, `${crateId} exchange`);
        assert.equal(items.includes(crateId), true, `${crateId} item`);
        assert.equal(lootTables.includes(crateId), true, `${crateId} loot table`);
    });

    [
        'open-lumber-minigame',
        'open-fishing-minigame',
        'open-hops-minigame',
        'trade-timber-crate',
        'trade-angler-crate',
        'trade-harvest-crate',
        'ui-timber-pts',
        'ui-fish-pts',
        'ui-hops-pts'
    ].forEach(elementId => {
        assert.match(index, new RegExp(`id=["']${elementId}["']`), elementId);
    });
    assert.match(uiRender, /points < 2500 \|\| activityBackpackFull/);
    assert.equal((minigames.match(/setGameState\('TOWN'\)/g) || []).length, 3);
});
