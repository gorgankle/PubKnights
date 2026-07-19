const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const style = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');
const knightStart = html.indexOf('<div id="knight-screen"');
const townStart = html.indexOf('<!-- === DEDICATED TOWN SCREEN');
const knightScreen = html.slice(knightStart, townStart);

test('Knight screen removes the disconnected Stables module', () => {
    assert.equal(knightStart >= 0, true);
    assert.equal(townStart > knightStart, true);
    assert.doesNotMatch(knightScreen, /The Stables|Purchase Mount|Mounts to unlock distant realms/);
});

test('Knight and pet share a profile column before the backpack and roster cards', () => {
    const wrapper = knightScreen.indexOf('class="knight-profile-column"');
    const knight = knightScreen.indexOf('id="main-knight-panel"');
    const pet = knightScreen.indexOf('id="main-pet-panel"');
    const wrapperEnd = knightScreen.indexOf('End Knight + Pet Profile Column');
    const roster = knightScreen.indexOf('id="party-roster-panel"');

    assert.equal(wrapper >= 0, true);
    assert.equal(wrapper < knight && knight < pet && pet < wrapperEnd && wrapperEnd < roster, true);
    assert.match(style, /\.knight-profile-column\s*\{[^}]*display:\s*grid;[^}]*gap:\s*15px;/s);
    assert.doesNotMatch(style, /#main-pet-panel\s*\{\s*order:/);
});
