const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '../public/js/expeditions.js'),
    'utf8'
);

class QuestLogElement {
    constructor() {
        this._innerHTML = '';
        this.renderCount = 0;
        this.attributes = {};
    }

    set innerHTML(value) {
        this._innerHTML = String(value);
        this.renderCount += 1;
    }

    get innerHTML() {
        return this._innerHTML;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }
}

function createHarness() {
    const list = new QuestLogElement();
    const listeners = {};
    const context = vm.createContext({
        console,
        document: {
            getElementById: id => id === 'knight-quest-log-list' ? list : null,
            querySelectorAll: () => []
        },
        pendingLoot: [],
        player: { adventure: {} },
        setTimeout: callback => callback(),
        socket: {
            on(eventName, listener) {
                listeners[eventName] = listener;
            },
            emit() {}
        },
        window: {}
    });

    vm.runInContext(`${source}
        renderTownWorldState = () => {};
        renderAdventureScreen = () => {};
        renderTavernReturnReport = () => {};
        globalThis.__questLogApi = {
            apply: applyAdventurePayload,
            render: renderKnightQuestLog
        };
    `, context, { filename: 'expeditions.js' });

    return { api: context.__questLogApi, context, list, listeners };
}

function snapshotWithContracts(contracts) {
    return {
        adventureState: {
            adventure: { activeJourney: null },
            locations: [],
            routes: [],
            contracts,
            world: { contracts }
        }
    };
}

test('Knight quest log renders loading and authoritative empty states without requiring its DOM owner', () => {
    const harness = createHarness();

    assert.equal(typeof harness.context.window.renderKnightQuestLog, 'function');
    harness.api.render();
    assert.match(harness.list.innerHTML, /Consulting the quest ledger/);
    assert.equal(harness.list.attributes['aria-busy'], 'true');

    const rendersBeforePayload = harness.list.renderCount;
    harness.api.apply(snapshotWithContracts([]));

    assert.ok(harness.list.renderCount > rendersBeforePayload);
    assert.match(harness.list.innerHTML, /No quests are recorded yet/);
    assert.equal(harness.list.attributes['aria-busy'], 'false');
    assert.doesNotMatch(harness.list.innerHTML, /<button\b|onclick=|acceptContract|claimContract/i);
});

test('Knight quest log orders actionable work and projects status, objectives, rewards, and issuer guidance read-only', () => {
    const harness = createHarness();
    harness.api.apply(snapshotWithContracts([
        {
            id: 'completed',
            title: 'Old Work',
            description: 'Already settled.',
            issuerName: 'Kreg',
            rewardGold: 10,
            status: 'completed',
            completedCount: 2,
            objectives: [{ id: 'done', description: 'Finish it', progress: 1, target: 1, complete: true }]
        },
        {
            id: 'repeatable',
            title: 'Road Watch',
            description: 'Patrol again.',
            issuerName: 'Marlow',
            rewardGold: 25,
            status: 'available',
            type: 'repeatable',
            repeatable: true,
            objectives: []
        },
        {
            id: 'available',
            title: 'Fresh Lead',
            description: 'Ask around.',
            issuerName: 'Tilda',
            rewardGold: 30,
            status: 'available',
            objectives: []
        },
        {
            id: 'active',
            title: 'Secure <the road>',
            description: 'Keep <script>alert(1)</script> out.',
            issuerName: 'Elowen',
            rewardGold: 45,
            status: 'active',
            objectives: [
                { id: 'first', description: 'Inspect the cart', progress: 1, target: 1, complete: true },
                { id: 'next', description: 'Return <safely>', progress: -4, target: 1, complete: false }
            ]
        },
        {
            id: 'claimable',
            title: 'Missing Kegs',
            description: 'The kegs are home.',
            issuerName: 'Kreg',
            rewardGold: 90,
            status: 'claimable',
            objectives: [{ id: 'kegs', description: 'Recover the kegs', progress: 8, target: 2, complete: true }]
        }
    ]));

    const html = harness.list.innerHTML;
    const positions = ['claimable', 'active', 'available', 'repeatable', 'completed']
        .map(id => html.indexOf(`data-contract-id="${id}"`));
    assert.ok(positions.every(position => position >= 0));
    assert.deepEqual([...positions].sort((left, right) => left - right), positions);

    assert.match(html, /Ready to claim/);
    assert.match(html, /In progress/);
    assert.match(html, /Reward: 90g/);
    assert.match(html, /Recover the kegs[\s\S]*2\/2/);
    assert.match(html, /Return &lt;safely&gt;[\s\S]*0\/1/);
    assert.match(html, /Return to Kreg in Town to turn in this quest and collect 90g/);
    assert.match(html, /Speak with Tilda in Town to accept this quest/);
    assert.match(html, /Completed 2 times for Kreg/);
    assert.match(html, /Secure &lt;the road&gt;/);
    assert.doesNotMatch(html, /<script>|<button\b|onclick=|acceptContract|claimContract/i);
});
