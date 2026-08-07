// --- combatRouter.js ---
// Composition root for server-authoritative combat socket handlers.

const { getArrayIndex } = require('./serverSecurity.js');
const { claimCombatRewards } = require('./combatRewards.js');
const {
    getAdventureSnapshot,
    hasActiveJourney
} = require('./adventureState.js');
const shared = require('./combatRouter/shared.js');
const createSpellActions = require('./combatRouter/spellActions.js');
const createWeaponActions = require('./combatRouter/weaponActions.js');
const createConsumableActions = require('./combatRouter/consumableActions.js');
const registerMovementHandlers = require('./combatRouter/movementHandlers.js');
const registerTurnHandlers = require('./combatRouter/turnHandlers.js');

const spellActions = createSpellActions(shared);
const weaponActions = createWeaponActions(shared, spellActions);
const consumableActions = createConsumableActions(shared);

function emitExpeditionEscrowReceipt(socket, eventName, action, player) {
    return socket.emit(eventName, {
        success: false,
        code: 'ACTIVE_JOURNEY',
        action,
        updatedPlayer: player,
        adventureState: getAdventureSnapshot(player),
        message: 'Expedition rewards remain in escrow until you return safely to the pub.'
    });
}

function registerRewardHandlers(socket, activePlayers, activeCombats) {
    socket.on('takePendingLoot', idx => {
        const player = activePlayers[socket.id];
        if (!player) return;
        if (hasActiveJourney(player)) {
            return emitExpeditionEscrowReceipt(
                socket,
                'inventoryReceipt',
                'takeLoot',
                player
            );
        }

        const lootIndex = getArrayIndex(idx, player.pendingLoot);
        if (lootIndex < 0) return;
        player.maxInventorySlots = player.maxInventorySlots || 5;
        if (player.inventory.length < player.maxInventorySlots) {
            const securedItem = player.pendingLoot.splice(lootIndex, 1)[0];
            player.inventory.push(securedItem);
            socket.emit('inventoryReceipt', {
                success: true,
                action: 'takeLoot',
                updatedPlayer: player,
                message: `Secured ${securedItem.name} in backpack.`
            });
        } else {
            socket.emit('inventoryReceipt', {
                success: false,
                message: 'Backpack is full!'
            });
        }
    });

    socket.on('sellPendingLoot', idx => {
        const player = activePlayers[socket.id];
        if (!player) return;
        if (hasActiveJourney(player)) {
            return emitExpeditionEscrowReceipt(
                socket,
                'inventoryReceipt',
                'sellPendingLoot',
                player
            );
        }

        const lootIndex = getArrayIndex(idx, player.pendingLoot);
        if (lootIndex < 0) return;
        const itemToSell = player.pendingLoot.splice(lootIndex, 1)[0];
        const value = itemToSell.value || (itemToSell.rarity === 'Gorilla' ? 500 : 15);
        player.gold += value;
        socket.emit('inventoryReceipt', {
            success: true,
            action: 'sell',
            updatedPlayer: player,
            message: `Sold dropped item for ${value}g.`
        });
    });

    socket.on('claimCombatRewards', () => {
        const player = activePlayers[socket.id];
        if (!player) return;
        if (hasActiveJourney(player)) {
            return emitExpeditionEscrowReceipt(
                socket,
                'combatRewardsReceipt',
                'claimCombatRewards',
                player
            );
        }
        if (activeCombats[socket.id]) {
            return socket.emit('combatRewardsReceipt', {
                success: false,
                message: 'Combat rewards can only be claimed after victory.'
            });
        }

        claimCombatRewards(player);
        player.statusEffects = {};
        socket.emit('combatRewardsReceipt', {
            success: true,
            updatedPlayer: player,
            adventureState: getAdventureSnapshot(player)
        });
    });
}

module.exports = function registerCombatRouter(
    socket,
    io,
    activePlayers,
    activeCombats,
    persistPlayer
) {
    const startAtbEngine = registerTurnHandlers({
        socket,
        io,
        activePlayers,
        activeCombats,
        persistPlayer,
        shared,
        weaponActions,
        consumableActions
    });

    registerMovementHandlers({
        socket,
        activePlayers,
        activeCombats,
        shared
    });
    registerRewardHandlers(socket, activePlayers, activeCombats);
    startAtbEngine();
};
