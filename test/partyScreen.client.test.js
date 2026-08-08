const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');
const companionSource = fs.readFileSync(path.join(projectRoot, 'public/js/companion-ui.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(projectRoot, 'public/js/ui-render.js'), 'utf8');
const html = fs.readFileSync(path.join(projectRoot, 'public/index.html'), 'utf8');
const styles = fs.readFileSync(path.join(projectRoot, 'public/style.css'), 'utf8');

function makeHarness() {
    const actions = [];
    const messages = [];
    const partyList = {
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = String(value); },
        querySelectorAll() { return []; }
    };
    const status = { textContent: '' };
    const player = {
        adventure: { activeJourney: null },
        inventory: [
            { id: 'iron_sword', name: 'Iron Sword', slot: 'weapon' },
            { id: 'field_tonic', name: 'Field Tonic', slot: 'consumable', combat: true },
            { id: 'ore', name: 'Iron Ore', slot: 'material' }
        ],
        roster: {
            activeIds: ['merc_1'],
            companions: [{
                instanceId: 'merc_1',
                name: 'Mira',
                equipment: {},
                pockets: [null]
            }]
        }
    };
    const window = { selectedCompanionInstanceId: 'merc_1' };
    const context = vm.createContext({
        console,
        document: {
            getElementById(id) {
                if (id === 'party-inventory-list') return partyList;
                if (id === 'party-inventory-status') return status;
                return null;
            }
        },
        gameState: 'PARTY',
        player,
        window,
        equipCompanionItem(instanceId, index) {
            actions.push({ action: 'equipCompanion', instanceId, index });
        },
        storeCompanionPocketItem(instanceId, index, pocketIndex) {
            actions.push({ action: 'storeCompanionPocket', instanceId, index, pocketIndex });
        },
        logMessage(message) { messages.push(message); },
        playRetroSound() {}
    });
    vm.runInContext(`${companionSource}
        globalThis.__partyApi = {
            activatePartyBackpackItem,
            completePartyInventoryAction,
            getPartyBackpackActionPresentation,
            getPartyBackpackActionPresentations,
            getSelectedPartyCompanion,
            isPartyRosterManagementLocked
        };
    `, context, { filename: 'companion-ui.js' });
    return { actions, api: context.__partyApi, messages, partyList, player, status };
}

test('Party backpack actions target only the selected companion with identifier-only payload data', () => {
    const harness = makeHarness();

    harness.api.activatePartyBackpackItem(0);
    assert.deepEqual(harness.actions, [{ action: 'equipCompanion', instanceId: 'merc_1', index: 0 }]);
    assert.equal(harness.partyList.attributes['aria-busy'], 'true');
    assert.match(harness.status.textContent, /Iron Sword.*Mira/);

    harness.api.activatePartyBackpackItem(1);
    assert.equal(harness.actions.length, 1, 'a pending receipt prevents duplicate equipment requests');

    assert.equal(harness.api.completePartyInventoryAction({ success: true, action: 'sell' }), false);
    harness.api.activatePartyBackpackItem(1);
    assert.equal(harness.actions.length, 1, 'an unrelated receipt cannot release the pending Party action');

    harness.api.completePartyInventoryAction({ success: true, action: 'equipCompanion', message: 'Iron Sword equipped.' });
    harness.api.activatePartyBackpackItem(1);
    assert.deepEqual(harness.actions[1], {
        action: 'storeCompanionPocket',
        instanceId: 'merc_1',
        index: 1,
        pocketIndex: 0
    });
    assert.equal(Object.hasOwn(harness.actions[0], 'item'), false);
    assert.equal(
        harness.api.getPartyBackpackActionPresentations(harness.player.inventory[0]).map(entry => entry.action).join(','),
        'equip,pocket'
    );
});

test('Party backpack rejects unsupported items and freezes roster management while traveling', () => {
    const harness = makeHarness();
    harness.api.activatePartyBackpackItem(2);
    assert.deepEqual(harness.actions, []);
    assert.match(harness.messages[0], /cannot be assigned/i);

    assert.equal(harness.api.isPartyRosterManagementLocked(), false);
    harness.player.adventure.activeJourney = { routeId: 'route_old_road' };
    assert.equal(harness.api.isPartyRosterManagementLocked(), true);
});

test('Party screen exposes real single-tap controls instead of reusing Knight double-click equip', () => {
    assert.match(html, /id="party-screen"[\s\S]*id="party-inventory-list"/);
    assert.match(uiSource, /renderBackpackList\(document\.getElementById\('party-inventory-list'\), 'party'\)/);
    assert.match(uiSource, /className = 'party-backpack-action'/);
    assert.match(uiSource, /activatePartyBackpackItem\(idx, presentation\.action\)/);
    assert.match(uiSource, /if \(!isPartyContext\) \{[\s\S]{0,180}handleBackpackDoubleClick/);
    assert.match(styles, /\.party-backpack-action\s*\{[^}]*min-height:\s*44px;/s);
    assert.match(styles, /\.party-inventory-grid\s*\{[^}]*minmax\(118px, 1fr\)/s);
});
