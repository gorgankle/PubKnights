// --- saveMigrations.js ---
// Ordered, idempotent migrations for durable player data. Runtime-only combat
// state is deliberately handled by hydration rather than encoded here.

const { ensureWorldState, normalizeWorldState } = require('./worldState.js');

const CURRENT_SAVE_VERSION = 4;

const RETIRED_TOP_LEVEL_KEYS = Object.freeze([
    'workers',
    'supplyCart',
    'tavernContacts',
    'workerRefundGold',
    'economyMigrationVersion',
    'wood',
    'fish',
    'hops',
    'idleJob',
    'mapBaited',
    'autoClaimEnabled',
    'happyHourTicks',
    'cellarsChummed',
    'gildedTavernUnlocked',
    'tradeRoutesExpanded',
    'monumentBuilt',
    'sharpeningStoneBought',
    'ironPlatingBought',
    'upgrades'
]);

function nonNegativeInt(value) {
    const parsed = Math.trunc(Number(value));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function getLegacyWorkerCount(saveData) {
    const workers = saveData && saveData.workers && typeof saveData.workers === 'object'
        ? saveData.workers
        : {};
    if (
        workers.woodcutters !== undefined
        || workers.fishermen !== undefined
        || workers.farmers !== undefined
    ) {
        return nonNegativeInt(workers.woodcutters)
            + nonNegativeInt(workers.fishermen)
            + nonNegativeInt(workers.farmers);
    }
    return nonNegativeInt(workers.total);
}

function getLegacyCabinRefund(saveData) {
    const buildings = saveData && saveData.buildings && typeof saveData.buildings === 'object'
        ? saveData.buildings
        : {};
    const cabinLevel = Math.max(1, nonNegativeInt(buildings.workerCabin) || 1);
    let refund = 0;
    for (let level = 1; level < cabinLevel; level++) {
        refund += Math.floor(100 * Math.pow(1.3, level));
    }
    return refund;
}

function containsRetiredState(saveData) {
    if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) return false;
    if (RETIRED_TOP_LEVEL_KEYS.some(key => Object.prototype.hasOwnProperty.call(saveData, key))) {
        return true;
    }
    if (
        saveData.buildings
        && typeof saveData.buildings === 'object'
        && Object.prototype.hasOwnProperty.call(saveData.buildings, 'workerCabin')
    ) {
        return true;
    }
    return !!(
        saveData.adventure
        && typeof saveData.adventure === 'object'
        && Object.prototype.hasOwnProperty.call(saveData.adventure, 'contracts')
    );
}

function migrateRetiredEconomy(saveData, fromVersion) {
    let refundGold = 0;
    if (fromVersion < 3) {
        const economyMigrationVersion = nonNegativeInt(saveData.economyMigrationVersion);
        if (economyMigrationVersion < 3) {
            refundGold += (getLegacyWorkerCount(saveData) * 100)
                + getLegacyCabinRefund(saveData);
        }
        if (saveData.gildedTavernUnlocked === true) refundGold += 10000;
        if (saveData.tradeRoutesExpanded === true) refundGold += 25000;
        if (saveData.monumentBuilt === true) refundGold += 1000000;
    }
    if (refundGold > 0) saveData.gold = nonNegativeInt(saveData.gold) + refundGold;

    RETIRED_TOP_LEVEL_KEYS.forEach(key => { delete saveData[key]; });
    if (saveData.buildings && typeof saveData.buildings === 'object') {
        delete saveData.buildings.workerCabin;
        if (Object.keys(saveData.buildings).length === 0) delete saveData.buildings;
    }
    if (saveData.adventure && typeof saveData.adventure === 'object') {
        delete saveData.adventure.contracts;
        if (
            saveData.adventure.latestReturnReport
            && typeof saveData.adventure.latestReturnReport === 'object'
        ) {
            delete saveData.adventure.latestReturnReport.contractUpdates;
        }
    }
    return refundGold;
}

function getStoredSaveVersion(saveData) {
    const parsed = Math.trunc(Number(saveData && saveData.saveVersion));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function needsSaveMigration(saveData) {
    if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) return true;
    if (getStoredSaveVersion(saveData) < CURRENT_SAVE_VERSION
        || containsRetiredState(saveData)
        || !saveData.world
        || typeof saveData.world !== 'object'
        || Array.isArray(saveData.world)
        || (saveData.worldState && typeof saveData.worldState === 'object')) {
        return true;
    }
    return JSON.stringify(saveData.world) !== JSON.stringify(normalizeWorldState(saveData.world));
}

function migrateSaveData(saveData) {
    const target = saveData && typeof saveData === 'object' && !Array.isArray(saveData)
        ? saveData
        : {};
    const fromVersion = getStoredSaveVersion(target);
    const migrationNeeded = needsSaveMigration(target);

    // Version 2 introduces the narrative/world namespace. The normalizer also
    // safely imports the short-lived `worldState` prototype key when present.
    ensureWorldState(target);
    delete target.worldState;
    // Version 3 retires the parallel worker/prestige economy and the old
    // round-trip bounty namespace. Preserve minigame points, crates, and every
    // current inventory item; those optional side activities remain live.
    const refundedGold = migrateRetiredEconomy(target, fromVersion);
    // Version 4 expands the world namespace with Chapter One branch NPCs,
    // typed contracts, finale preparation, epilogue state, and staged town
    // services. ensureWorldState above performs the idempotent schema merge.
    target.saveVersion = Math.max(fromVersion, CURRENT_SAVE_VERSION);

    return {
        saveData: target,
        fromVersion,
        toVersion: target.saveVersion,
        migrated: migrationNeeded,
        refundedGold
    };
}

module.exports = {
    CURRENT_SAVE_VERSION,
    RETIRED_TOP_LEVEL_KEYS,
    getStoredSaveVersion,
    containsRetiredState,
    needsSaveMigration,
    migrateSaveData
};
