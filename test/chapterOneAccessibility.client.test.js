const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'public', 'js', 'main.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'public', 'js', 'renderer.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'public', 'js', 'ui-render.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'style.css'), 'utf8');

test('combat intents have an assertive text equivalent outside the canvas', () => {
    assert.match(html, /id="combat-intent-announcer"[^>]+aria-live="assertive"/);
    assert.match(main, /effectSummary \|\| intent\.effectLabel/);
    assert.match(main, /Counterplay:/);
    assert.match(main, /combat-intent-announcer/);
});

test('telegraph danger uses labels and hatching in addition to color', () => {
    assert.match(renderer, /A hatch survives monochrome displays/);
    assert.match(renderer, /fillText\(isLingeringHazard \? 'F' : '!'/);
    assert.match(renderer, /intent\.shapeLabel[\s\S]{0,120}intent\.targetShape/);
    assert.match(renderer, /effectSummary \|\| intent\.effectLabel/);
});

test('reduced-motion users do not have to endure combat and UI animation', () => {
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /animation-duration: 0\.01ms !important/);
    assert.match(css, /transition-duration: 0\.01ms !important/);
});

test('combat supplies and stamina-gated attacks expose operable text controls', () => {
    assert.match(html, /id="combat-backpack-modal"[^>]+role="dialog"[^>]+aria-modal="true"/);
    assert.match(html, /aria-label="Close combat backpack"/);
    assert.match(ui, /document\.createElement\('button'\)/);
    assert.match(ui, /entry\.item\.name[\s\S]{0,220}Uses one action/);
    assert.match(ui, /activeStamina >= standardAttackCost/);
    assert.match(ui, /Attack unavailable:/);
});

test('movement previews use the same stamina scale as combat movement', () => {
    const previewFormula = /estCost = Math\.floor\(\(dist \/ swiftness\) \* 5\)/g;
    assert.equal(renderer.match(previewFormula)?.length, 2);
    assert.doesNotMatch(renderer, /estCost = Math\.floor\(\(dist \/ swiftness\) \* 10\)/);
});
