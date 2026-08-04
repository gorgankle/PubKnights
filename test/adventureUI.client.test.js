const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public', 'js', 'expeditions.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'public', 'style.css'), 'utf8');
const main = fs.readFileSync(path.join(root, 'public', 'js', 'main.js'), 'utf8');

test('Adventure Board exposes the exploration map, journey detail, bounties, and legacy fallback', () => {
    assert.match(html, /id="exploration-map"/);
    assert.match(html, /id="exploration-detail"/);
    assert.match(html, /id="bounty-list"/);
    assert.match(html, /id="legacy-deployments"/);
    assert.match(html, /id="tavern-return-report"/);
    assert.match(html, /id="tavern-return-kreg-canvas"/);
    assert.match(html, /Legacy Level Deployments \(fallback\)/);
    assert.match(html, /js\/expeditions\.js\?v=3/);
});

test('expedition requests send only server catalog identifiers and never enemy or reward payloads', () => {
    assert.match(client, /socket\.emit\('startExpedition', \{ routeId: route\.id \}\)/);
    assert.match(client, /socket\.emit\('acceptBounty', \{ bountyId \}\)/);
    assert.match(client, /socket\.emit\('claimBounty', \{ bountyId \}\)/);
    assert.doesNotMatch(client, /socket\.emit\('startExpedition',[\s\S]{0,160}(enemy|reward|danger)/i);
});

test('the responsive map keeps location nodes, active routes, and contract states visually distinct', () => {
    assert.match(styles, /\.exploration-map\s*\{/);
    assert.match(styles, /\.adventure-location-node\.is-locked/);
    assert.match(styles, /\.exploration-route-line\.is-active/);
    assert.match(styles, /\.bounty-card\.is-claimable/);
    assert.match(styles, /\.adventure-encounter-report\s*\{/);
    assert.match(styles, /\.tavern-return-report\s*\{/);
    assert.match(styles, /@media \(max-width: 820px\)/);
});

test('return reports and contract cards expose readable road, enemy, risk, and reward context', () => {
    assert.match(client, /function buildTavernReturnPresentation/);
    assert.match(client, /function renderTavernReturnReport/);
    assert.match(client, /renderTavernReturnPortrait\(\)/);
    assert.match(client, /route\.encounterReports/);
    assert.match(client, /Expected:/);
    assert.match(client, /Contract \$\{rewardGold\}g · Road \$\{routeReward\}g/);
});

test('fleeing persists the server-authored expedition failure before leaving combat', () => {
    const fleeBranch = main.match(/if \(result\.type === 'flee'\) \{([\s\S]*?)\n    \}/);
    assert.ok(fleeBranch);
    assert.match(fleeBranch[1], /saveGame\(\)/);
    assert.match(fleeBranch[1], /transitionToTown/);
});
