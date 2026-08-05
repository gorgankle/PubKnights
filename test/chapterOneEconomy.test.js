const test = require('node:test');
const assert = require('node:assert/strict');

const {
    EXPEDITION_DEFEAT_GOLD,
    EXPEDITION_CAPTAIN_GOLD,
    grantActorDefeatRewards
} = require('../combatRewards.js');
const { LootTables } = require('../public/js/lootTables.js');
const { purchaseChapterOneStockItem } = require('../chapterOneTownEconomy.js');

function rewardHarness(enemyId) {
    const socketId = 'economy_socket';
    const player = { pendingGold: 0, pendingXp: 0, pendingLoot: [] };
    const combat = { mode: 'EXPEDITION', zone: 'WILDERNESS' };
    return {
        socketId,
        player,
        combat,
        context: {
            activePlayers: { [socketId]: player },
            activeCombats: { [socketId]: combat },
            io: { to: () => ({ emit() {} }) }
        },
        enemy: { id: enemyId, name: enemyId, rewardsEligible: true }
    };
}

test('Chapter One kill gold supplements route pay without overwhelming contract rewards', () => {
    const bandit = rewardHarness('melee_bandit');
    grantActorDefeatRewards(bandit.socketId, bandit.enemy, bandit.context);
    assert.equal(bandit.player.pendingGold, EXPEDITION_DEFEAT_GOLD);
    assert.equal(EXPEDITION_DEFEAT_GOLD, 12);

    const captain = rewardHarness('chapter_one_shield_captain');
    grantActorDefeatRewards(captain.socketId, captain.enemy, captain.context);
    assert.equal(captain.player.pendingGold, EXPEDITION_CAPTAIN_GOLD);
    assert.equal(EXPEDITION_CAPTAIN_GOLD, 35);
});

test('the Chapter One captain always rolls an existing advanced weapon reward', () => {
    const table = LootTables.chapter_one_shield_captain;
    assert.equal(table.dropChance, 1);
    assert.equal(table.xpDrop, 110);
    assert.deepEqual(
        table.pools.map(entry => entry.itemId).sort(),
        ['brewmasters_club', 'captains_shield', 'parrying_dagger']
    );
});

test('world-gated stock purchases are exact, capacity-safe, and clone item stats', () => {
    const player = { gold: 125, inventory: [], maxInventorySlots: 1 };
    const stock = { id: 'staff_stock', itemId: 'apprentice_staff', priceGold: 120 };
    const result = purchaseChapterOneStockItem(player, stock);

    assert.equal(result.success, true);
    assert.equal(player.gold, 5);
    assert.equal(player.inventory[0].id, 'apprentice_staff');

    result.item.offense = -500;
    const second = purchaseChapterOneStockItem(player, stock);
    assert.equal(second.success, false);
    assert.equal(second.code, 'BACKPACK_FULL');
});

test('locked or unaffordable stock does not mutate the player economy', () => {
    const player = { gold: 20, inventory: [], maxInventorySlots: 5 };
    assert.equal(purchaseChapterOneStockItem(player, null).code, 'STOCK_LOCKED');
    const quote = purchaseChapterOneStockItem(player, {
        id: 'heavy_stock',
        itemId: 'brewmasters_club',
        priceGold: 180
    });
    assert.equal(quote.code, 'INSUFFICIENT_GOLD');
    assert.equal(player.gold, 20);
    assert.deepEqual(player.inventory, []);
});
