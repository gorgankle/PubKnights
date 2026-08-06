const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'public', 'js', 'main.js'), 'utf8');
const activityStart = main.indexOf('function getActivityLogTone');
const activityEnd = main.indexOf('function setGameState', activityStart);
const activitySource = main.slice(activityStart, activityEnd);

function createHarness() {
    const initial = { className: 'activity-log-entry is-system', textContent: 'Initial help.' };
    const log = {
        children: [initial],
        scrollTop: 0,
        get firstElementChild() { return this.children[0] || null; },
        get scrollHeight() { return this.children.length * 10; },
        appendChild(node) { this.children.push(node); },
        removeChild(node) {
            const index = this.children.indexOf(node);
            if (index >= 0) this.children.splice(index, 1);
        }
    };
    const panel = { open: false };
    const elements = new Map([
        ['activity-log-panel', panel],
        ['log', log]
    ]);
    const context = vm.createContext({
        document: {
            createElement() { return { className: '', textContent: '' }; },
            getElementById(id) { return elements.get(id) || null; }
        }
    });
    vm.runInContext(`${activitySource}\n;globalThis.activityApi = { getActivityLogTone, logMessage };`, context);
    return { api: context.activityApi, log, panel };
}

test('Recent Activity uses a bounded text-only live log instead of developer console markup', () => {
    assert.ok(activityStart >= 0 && activityEnd > activityStart);
    assert.match(html, /<details id="activity-log-panel" class="activity-log-panel" open>/);
    assert.match(html, /<summary class="activity-log-heading">/);
    assert.match(html, /id="activity-log-heading">Recent Activity</);
    assert.match(html, /id="log" role="log" aria-live="polite" aria-relevant="additions text"/);
    assert.doesNotMatch(html, /activity-log-toggle|onclick="toggleActivityLog/);
    assert.doesNotMatch(html, /Engine v0\.8\.13|synchronization pipelines functional/i);
    assert.doesNotMatch(activitySource, /innerHTML\s*\+=/);

    const harness = createHarness();
    for (let index = 1; index <= 82; index += 1) {
        harness.api.logMessage(`Event ${index}`);
    }
    assert.equal(harness.log.children.length, 80);
    assert.equal(harness.log.children[0].textContent, 'Event 3');
    assert.equal(harness.log.children.at(-1).textContent, 'Event 82');
    assert.equal(harness.log.scrollTop, harness.log.scrollHeight);

    harness.api.logMessage('<b>literal, not markup</b>');
    assert.equal(harness.log.children.at(-1).textContent, '<b>literal, not markup</b>');
});

test('Recent Activity exposes readable tones inside a native keyboard-operable disclosure', () => {
    const harness = createHarness();
    harness.api.logMessage('Movement blocked by cover.');
    harness.api.logMessage('Victory secured.');
    assert.match(harness.log.children.at(-2).className, /is-warning/);
    assert.match(harness.log.children.at(-1).className, /is-positive/);
    harness.panel.open = false;
    harness.api.logMessage('Defeated Road Bandit (+5 XP).');
    assert.match(harness.log.children.at(-1).className, /is-positive/);
    assert.equal(harness.panel.open, false);
    harness.api.logMessage('Insufficient funds to adopt a companion.');
    assert.match(harness.log.children.at(-1).className, /is-warning/);
    assert.equal(harness.panel.open, true);
});
