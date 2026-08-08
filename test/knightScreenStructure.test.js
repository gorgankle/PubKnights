const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const style = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');
const knightStart = html.indexOf('<div id="knight-screen"');
const partyStart = html.indexOf('<div id="party-screen"');
const townStart = html.indexOf('<!-- === WALKABLE TOWN SCREEN');
const knightScreen = html.slice(knightStart, partyStart);
const partyScreen = html.slice(partyStart, townStart);
const townScreen = html.slice(townStart, html.indexOf('<!-- === ROADS & EXPEDITIONS SCREEN'));

test('Knight screen removes the disconnected Stables module', () => {
    assert.equal(knightStart >= 0, true);
    assert.equal(townStart > knightStart, true);
    assert.doesNotMatch(knightScreen, /The Stables|Purchase Mount|Mounts to unlock distant realms/);
});

test('Knight owns personal equipment, backpack, and the read-only quest log', () => {
    const wrapper = knightScreen.indexOf('class="knight-profile-column"');
    const knight = knightScreen.indexOf('id="main-knight-panel"');
    const wrapperEnd = knightScreen.indexOf('End Knight Profile Column');
    const backpack = knightScreen.indexOf('id="main-backpack-panel"');
    const questLog = knightScreen.indexOf('id="knight-quest-log-panel"');

    assert.equal(wrapper >= 0, true);
    assert.equal(wrapper < knight && knight < wrapperEnd && wrapperEnd < backpack && backpack < questLog, true);
    assert.match(style, /\.knight-profile-column\s*\{[^}]*display:\s*grid;[^}]*gap:\s*15px;/s);
    assert.doesNotMatch(knightScreen, /party-roster-panel|party-roster-list|companion-equipment-panel/);
    assert.doesNotMatch(knightScreen, /main-pet-panel|pet-adoption-ui|Adopt a Pet/);
});

test('Party owns the roster, companion equipment, and a shared-backpack projection once', () => {
    assert.equal(partyStart > knightStart && townStart > partyStart, true);
    assert.match(partyScreen, /id="party-roster-panel"/);
    assert.match(partyScreen, /id="party-roster-list"/);
    assert.match(partyScreen, /id="companion-equipment-panel"/);
    assert.match(partyScreen, /id="party-inventory-list"/);
    assert.match(partyScreen, /Select a companion, then use Equip or Pocket/);
    assert.equal((html.match(/id="party-roster-panel"/g) || []).length, 1);
    assert.equal((html.match(/id="party-inventory-list"/g) || []).length, 1);
});

test('return commentary lives in the Town hub and collapses secondary tavern voices', () => {
    assert.doesNotMatch(knightScreen, /tavern-return-report/);
    assert.match(townScreen, /id="tavern-return-report"[^>]*role="region"[^>]*aria-labelledby="tavern-return-title"/);
    assert.match(townScreen, /class="tavern-return-heading-copy"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
    assert.match(townScreen, /<details id="tavern-return-reactions-details"[^>]*hidden>/);
    assert.match(townScreen, /Other voices at the bar/);
    assert.match(townScreen, /id="tavern-return-contract-block"[^>]*hidden/);
    assert.match(style, /\.tavern-return-comment p\s*\{[^}]*font-size:\s*12px/s);
    assert.match(style, /\.tavern-return-npc-reaction\s*\{[^}]*font-size:\s*12px/s);
});

test('global navigation is limited to Knight and Party', () => {
    const navStart = html.indexOf('<div id="top-nav-bar"');
    const navEnd = html.indexOf('</div>', navStart);
    const nav = html.slice(navStart, navEnd);
    assert.match(nav, /id="nav-knight"/);
    assert.match(nav, /id="nav-party"/);
    assert.doesNotMatch(nav, /nav-town|nav-adventures|nav-vault|tab-social/);
    assert.equal((nav.match(/<button\b/g) || []).length, 2);
    assert.doesNotMatch(html, /id="global-social-button"/);
});
