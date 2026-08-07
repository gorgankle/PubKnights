const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('the standalone pet client and artwork entry point are retired', () => {
    assert.equal(fs.existsSync(path.join(root, 'public/js/pet-assets.js')), false);

    const index = read('public/index.html');
    const clientRuntime = [
        read('public/js/player.js'),
        read('public/js/main.js'),
        read('public/js/town-actions.js'),
        read('public/js/ui-render.js'),
        read('public/js/ui-tooltips.js'),
        read('public/js/sprite-overhaul-world.js')
    ].join('\n');

    assert.doesNotMatch(index, /pet-assets|main-pet-panel|pet-adoption-ui|Adopt a Pet/i);
    assert.doesNotMatch(
        clientRuntime,
        /player\.pet|PetMatrices|PetOverhaulMatrices|adoptPet|trainPet|renderPetCanvas/
    );
});

test('the server exposes party companions without standalone pet actions or rewards', () => {
    const serverRuntime = [
        read('server.js'),
        read('serverSecurity.js'),
        read('townRouter.js'),
        read('combatRewards.js'),
        read('public/js/lootTables.js')
    ].join('\n');

    assert.doesNotMatch(
        serverRuntime,
        /sanitizePetCosmetics|adoptPet|trainPet|rollPetVictoryLoot|pet_scavenge|\.pet\b/
    );
    assert.match(serverRuntime, /roster/);
    assert.match(serverRuntime, /companion/);
});
