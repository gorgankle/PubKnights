const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public', 'js', 'expeditions.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'public', 'style.css'), 'utf8');
const main = fs.readFileSync(path.join(root, 'public', 'js', 'main.js'), 'utf8');

test('walkable town and journey screens replace the retired board and Exchange', () => {
    assert.match(html, /id="exploration-map"/);
    assert.match(html, /id="exploration-detail"/);
    assert.match(html, /id="town-exploration-canvas"/);
    assert.match(html, /id="dialogue-choice-menu"/);
    assert.match(html, /id="town-shop-overlay"/);
    assert.match(html, /id="world-map-expanded"/);
    assert.match(html, /id="tavern-return-report"/);
    assert.match(html, /id="tavern-return-kreg-canvas"/);
    assert.doesNotMatch(html, /legacy-deployments|Legacy Level Deployments|bounty-list|merchant-screen|nav-tavern/);
    assert.match(html, /style\.css\?v=17/);
    assert.match(html, /js\/login\.js\?v=4/);
    assert.match(html, /id="static-gold-display" hidden/);
    assert.match(html, /js\/expeditions\.js\?v=11/);
    assert.match(html, /js\/town-exploration\.js\?v=3/);
    assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1\.0/);
    assert.match(html, /window\.MobileDragDrop && typeof window\.MobileDragDrop\.polyfill === 'function'/);
});

test('expedition requests send only server catalog identifiers and never enemy or reward payloads', () => {
    assert.match(client, /socket\.emit\('startExpedition', \{ routeId: route\.id \}\)/);
    assert.match(client, /socket\.emit\('acceptContract', \{ contractId \}\)/);
    assert.match(client, /socket\.emit\('claimContract', \{ contractId \}\)/);
    assert.doesNotMatch(client, /acceptBounty|claimBounty|targetRoundTrips/);
    assert.doesNotMatch(client, /socket\.emit\('startExpedition',[\s\S]{0,160}(enemy|reward|danger)/i);
});

test('the responsive maps distinguish routes, progress, and undiscovered silhouettes', () => {
    assert.match(styles, /\.exploration-map\s*\{/);
    assert.match(styles, /\.adventure-location-node\.is-locked/);
    assert.match(styles, /\.adventure-location-node \.node-status/);
    assert.match(styles, /\.exploration-route-line\.is-active/);
    assert.match(styles, /\.adventure-location-node\.is-silhouetted/);
    assert.match(styles, /\.world-map-expanded/);
    assert.match(styles, /\.world-map-player-marker\s*\{/);
    assert.match(styles, /\.world-map-player-sprite\s*\{/);
    assert.match(styles, /pointer-events:\s*none/);
    assert.match(styles, /image-rendering:\s*pixelated/);
    assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.world-map-player-sprite\s*\{\s*width:\s*26px;\s*height:\s*26px;/);
    assert.match(styles, /\.world-map-expanded \.world-map-player-sprite\s*\{\s*width:\s*28px;\s*height:\s*28px;/);
    assert.match(client, /renderPlayerMapMarker\(map, locations, activeJourney, routes\)/);
    assert.match(client, /drawWorldActorSprite\(context, actor/);
    assert.match(styles, /\.journey-progress-card/);
    assert.match(styles, /\.journey-instance-options/);
    assert.match(styles, /\.adventure-encounter-report\s*\{/);
    assert.match(styles, /\.route-intel-empty/);
    assert.match(styles, /\.tavern-return-report\s*\{/);
    assert.match(styles, /@media \(max-width: 820px\)/);
});

test('return reports and journey instances keep progression honest', () => {
    assert.match(client, /function buildTavernReturnPresentation/);
    assert.match(client, /function renderTavernReturnReport/);
    assert.match(client, /renderTavernReturnPortrait\(\)/);
    assert.match(client, /route\.encounterReports/);
    assert.match(client, /Open - Unscouted/);
    assert.match(client, /This road is unlocked\. Travel it to turn rumor into a reliable enemy report\./);
    assert.match(client, /Set Out for/);
    assert.match(client, /Both roads marked Open are available from the start\./);
    assert.match(client, /Speak with townsfolk for quests before departing\./);
    assert.doesNotMatch(client, /Opposition is unconfirmed\. Face the road to add a reliable report\./);
    assert.match(client, /unconfirmedEncounterCount/);
    assert.match(client, /function getContractObjectivePresentation/);
    assert.match(client, /Ready to claim/);
    assert.match(client, /function getJourneyProgressPresentation/);
    assert.match(client, /data-journey-option-id/);
    assert.match(client, /socket\.emit\('resolveJourneyInstance', \{ optionId \}\)/);
    assert.match(client, /socket\.emit\('continueJourney'\)/);
    assert.match(client, /const atDestination = phase === 'AT_DESTINATION'/);
    assert.doesNotMatch(client, /atDestination\s*=.*reachedDestination/);
    assert.doesNotMatch(client, /Expected:/);
    assert.doesNotMatch(client, /Contract \$\{rewardGold\}g · Road \$\{routeReward\}g/);
    assert.match(html, /id="tavern-return-reactions-details"/);
    assert.match(html, /Other voices at the bar/);
});

test('fleeing persists the server-authored expedition failure before leaving combat', () => {
    const fleeBranch = main.match(/if \(result\.type === 'flee'\) \{([\s\S]*?)\n    \}/);
    assert.ok(fleeBranch);
    assert.match(fleeBranch[1], /saveGame\(\)/);
    assert.match(fleeBranch[1], /transitionToTown/);
});
