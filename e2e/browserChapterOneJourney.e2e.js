const test = require('node:test');
// Kept outside test/ so the networked browser journey only runs via npm run test:e2e.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const DEFAULT_BROWSER_PATHS = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

function findBrowserExecutable() {
    const configured = process.env.E2E_BROWSER_PATH;
    if (configured && fs.existsSync(configured)) return configured;
    return DEFAULT_BROWSER_PATHS.find(candidate => fs.existsSync(candidate));
}

async function assertServerReady(baseUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch(baseUrl, { signal: controller.signal });
        assert.equal(response.ok, true, `Pub Knights returned HTTP ${response.status}`);
    } catch (error) {
        throw new Error(
            `Pub Knights is not reachable at ${baseUrl}. Start it with npm start before npm run test:e2e. ${error.message}`
        );
    } finally {
        clearTimeout(timeout);
    }
}

async function isVisible(locator) {
    return locator.isVisible().catch(() => false);
}

async function moveFreshKnightOneTile(page) {
    const canvas = page.locator('#gameCanvas');
    const box = await canvas.boundingBox();
    assert.ok(box, 'combat canvas has no visible bounding box');
    const targetX = box.x + (box.width * 2.5 / 16);
    const targetY = box.y + (box.height * 4.5 / 10);
    await page.mouse.click(targetX, targetY);
    await page.waitForTimeout(120);
    await page.mouse.click(targetX, targetY);
    await page.waitForTimeout(250);
}

async function finishFreshBanditCombat(page, username) {
    const combatScreen = page.locator('#combat-screen');
    const lootScreen = page.locator('#loot-screen');
    const destination = page.getByRole('heading', { name: 'Destination Reached' });
    const activeActor = page.locator('#combat-active-actor');
    const attack = page.locator('#slash-btn');
    const pass = page.locator('#end-btn');
    const rest = page.getByRole('button', { name: /Rest \(\+15% Stamina\)/ });
    let moved = false;
    const deadline = Date.now() + 120000;

    await combatScreen.waitFor({ state: 'visible', timeout: 15000 });
    while (Date.now() < deadline) {
        if (await isVisible(lootScreen) || await isVisible(destination)) return;
        if (!await isVisible(combatScreen)) {
            await page.waitForTimeout(200);
            continue;
        }

        const actorText = await activeActor.textContent().catch(() => '');
        if (!String(actorText).includes(username)) {
            await page.waitForTimeout(250);
            continue;
        }

        if (!moved) {
            await moveFreshKnightOneTile(page);
            moved = true;
            continue;
        }

        if (await attack.isEnabled().catch(() => false)) {
            await attack.click();
            await page.waitForTimeout(350);
            continue;
        }

        if (await rest.isEnabled().catch(() => false)) {
            await rest.click();
            await page.waitForTimeout(200);
            continue;
        }

        if (await pass.isEnabled().catch(() => false)) {
            await pass.click();
            await page.waitForTimeout(300);
            continue;
        }

        await page.waitForTimeout(200);
    }

    throw new Error('Fresh-account bandit combat did not resolve within 120 seconds.');
}

test('fresh account completes the Old Road discovery and safe-return loop in a real muted browser', {
    timeout: 180000
}, async t => {
    const baseUrl = String(process.env.E2E_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    const browserPath = findBrowserExecutable();
    assert.ok(browserPath, 'Set E2E_BROWSER_PATH to an installed Edge or Chrome executable.');
    await assertServerReady(baseUrl);

    const browser = await chromium.launch({
        executablePath: browserPath,
        headless: process.env.E2E_HEADLESS !== '0',
        args: ['--mute-audio']
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
        const expectedResourceFailure = /Failed to load resource:.*(?:404|ERR_NETWORK_ACCESS_DENIED)/i.test(message.text());
        if (message.type() === 'error' && !expectedResourceFailure) {
            browserErrors.push(`console: ${message.text()}`);
        }
    });
    page.on('response', response => {
        if (response.status() >= 400 && !/\/favicon\.ico(?:\?|$)/i.test(response.url())) {
            browserErrors.push(`http ${response.status()}: ${response.url()}`);
        }
    });

    t.after(async () => {
        if (t.passed === false) {
            const screenshot = path.join(os.tmpdir(), `pubknights-e2e-${Date.now()}.png`);
            await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
            t.diagnostic(`Failure screenshot: ${screenshot}`);
        }
        await browser.close();
    });

    const username = `E2EOldRoad_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const password = 'MutedRoad!2026';
    await page.goto(`${baseUrl}/?mute=1`, { waitUntil: 'domcontentloaded' });
    const goldWallet = page.locator('#static-gold-display');
    assert.equal(await goldWallet.isHidden(), true);
    await page.getByRole('textbox', { name: 'Knight Name' }).fill(username);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Register New' }).click();
    const beginAdventure = page.getByRole('button', { name: 'Begin Adventure', exact: true });
    await beginAdventure.waitFor({ timeout: 15000 });
    assert.equal(await goldWallet.isHidden(), true);
    await beginAdventure.click();
    await page.getByRole('button', { name: /Adventures/ }).waitFor({ timeout: 15000 });
    assert.equal(await goldWallet.isVisible(), true);

    await page.getByRole('button', { name: /Adventures/ }).click();
    await page.getByRole('heading', { name: 'Missing Kegs' }).waitFor();
    const oldRoadNode = page.getByRole('button', { name: /Old Road\. Open - Unscouted\./ });
    const pineTrailNode = page.getByRole('button', { name: /Pine Trail\. Open - Unscouted\./ });
    await oldRoadNode.waitFor();
    await pineTrailNode.waitFor();
    assert.equal(await oldRoadNode.isEnabled(), true);
    assert.equal(await pineTrailNode.isEnabled(), true);

    await pineTrailNode.click();
    const explorationDetail = page.locator('#exploration-detail');
    await explorationDetail.getByRole('heading', { name: 'Pine Trail' }).waitFor();
    await explorationDetail.getByText('Open - Unscouted', { exact: true }).first().waitFor();
    assert.equal(await explorationDetail.getByRole('button', { name: 'Set Out for Pine Trail', exact: true }).isEnabled(), true);

    await oldRoadNode.click();
    await explorationDetail.getByRole('heading', { name: 'Old Road' }).waitFor();
    assert.equal(await explorationDetail.getByRole('button', { name: 'Set Out for Old Road', exact: true }).isEnabled(), true);
    await page.getByRole('button', { name: 'Accept Missing Kegs', exact: true }).click();
    await explorationDetail.getByRole('button', { name: 'Set Out for Old Road', exact: true }).click();

    await finishFreshBanditCombat(page, username);
    await page.getByRole('heading', { name: 'Destination Reached' }).waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Investigate', exact: true }).click();
    await assert.doesNotReject(() => page.getByText('Clue recorded', { exact: true }).waitFor());
    await page.getByRole('button', { name: 'Begin Return Journey', exact: true }).click();

    await finishFreshBanditCombat(page, username);
    await page.getByRole('heading', { name: /Victory! Spoils of War/ }).waitFor({ timeout: 15000 });
    const takeButtons = page.getByRole('button', { name: /Take/ });
    while (await takeButtons.count()) {
        await takeButtons.first().click();
        await page.waitForTimeout(100);
    }
    await page.getByRole('button', { name: 'Return to Tavern', exact: true }).click();

    await page.getByRole('heading', { name: 'First Safe Return: The Old Road' }).waitFor({ timeout: 15000 });
    await page.getByText(/Missing Kegs:.*ready to claim/).waitFor();
    await page.getByRole('button', { name: 'Open Contract Board', exact: true }).click();
    await page.getByRole('button', { name: 'Claim Missing Kegs - 75g', exact: true }).click();
    const completedContracts = page.getByText('Completed contracts (1)', { exact: true });
    await completedContracts.waitFor();
    assert.equal(
        await completedContracts.evaluate(element => element === document.activeElement),
        true,
        'claiming a contract should move focus to completed contract history'
    );
    await page.getByRole('button', { name: 'Return to Town', exact: true }).click();

    await page.getByRole('heading', { name: "Mara's Quartermaster Stall" }).waitFor();
    await page.getByText('Quartermaster Stall Open', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: /Round Shield —/ }).click();
    await page.getByText('Collected: Round Shield', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Town Diversions' }).waitFor();
    await page.getByRole('button', { name: 'Visit Timber Camp', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Trade for Timber Crate', exact: true }).waitFor();

    const goldText = await page.locator('#static-gold-display').textContent();
    const gold = Number(String(goldText).match(/\d+/)?.[0] || 0);
    assert.ok(gold >= 75, `expected contract payout in wallet, saw ${goldText}`);
    assert.deepEqual(browserErrors, []);
});
