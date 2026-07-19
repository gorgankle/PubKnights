const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const playerSource = fs.readFileSync(path.join(__dirname, '../public/js/player.js'), 'utf8');
const companionUiSource = fs.readFileSync(path.join(__dirname, '../public/js/companion-ui.js'), 'utf8');

function companion(instanceId) {
    return {
        instanceId,
        templateId: 'starter_mercenary',
        name: instanceId,
        role: 'Frontliner',
        hired: true,
        active: true,
        level: 1,
        xp: 0,
        stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
        equipment: { weapon: null, helmet: null, armor: null, gloves: null, boots: null },
        pockets: [null, null]
    };
}

function loadPlayerApi() {
    const context = vm.createContext({ console });
    vm.runInContext(`${playerSource}\n;globalThis.__playerTestApi = {
        setPlayer(value) { player = value; },
        getPlayer() { return player; },
        normalizeClientPlayerContainers,
        getClientRequiredCompanionIds
    };`, context);
    return context.__playerTestApi;
}

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.disabled = false;
        this.textContent = '';
        this._innerHTML = '';
    }

    set innerHTML(value) {
        this._innerHTML = value;
        if (value === '') this.children = [];
    }

    get innerHTML() {
        return this._innerHTML;
    }

    append(...children) {
        this.children.push(...children);
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    addEventListener() {}
}

test('client normalization keeps quest allies out of all three selected slots', () => {
    const api = loadPlayerApi();
    api.setPlayer({
        equipment: {},
        stash: [],
        roster: {
            companions: [
                companion('merc_required'),
                companion('merc_1'),
                companion('merc_2'),
                companion('merc_3')
            ],
            activeIds: ['merc_required', 'merc_1', 'merc_2', 'merc_3']
        },
        quests: { active: { requiredCompanionIds: ['merc_required'] } }
    });

    api.normalizeClientPlayerContainers();
    const normalized = JSON.parse(JSON.stringify(api.getPlayer()));

    assert.deepEqual(normalized.roster.activeIds, ['merc_1', 'merc_2', 'merc_3']);
    assert.equal(normalized.roster.companions[0].active, false);
    assert.deepEqual(normalized.inventory, []);
});

test('roster UI counts only optional selections and locks a stale required active ID', () => {
    const partyList = new FakeElement('div');
    const context = vm.createContext({
        console,
        player: { activeQuestSession: { requiredCompanionIds: ['merc_required'] } },
        window: { selectedCompanionInstanceId: null },
        document: {
            createElement: tagName => new FakeElement(tagName),
            getElementById: id => id === 'party-roster-list' ? partyList : null
        },
        fillActiveCompanions() {},
        benchAllCompanions() {},
        selectCompanionEquipment() {},
        benchCompanion() {},
        setActiveCompanion() {},
        dismissCompanion() {}
    });
    vm.runInContext(`${companionUiSource}\n;globalThis.__renderCompanionRosterUI = renderCompanionRosterUI;`, context);

    context.__renderCompanionRosterUI(
        [companion('merc_required'), companion('merc_1'), companion('merc_2'), companion('merc_3')],
        ['merc_required', 'merc_1', 'merc_2']
    );

    const toolbar = partyList.children[0];
    assert.match(toolbar.children[0].textContent, /Active 2\/3/);
    assert.equal(toolbar.children[1].disabled, false);
    assert.equal(toolbar.children[2].disabled, false);
    const requiredControls = partyList.children[1].children[1];
    assert.equal(requiredControls.children[0].textContent, 'Equipment');
    assert.equal(requiredControls.children[1].textContent, 'Quest Locked');
    assert.equal(requiredControls.children[1].disabled, true);
});
