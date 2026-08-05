const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const loginSource = fs.readFileSync(path.join(root, 'public', 'js', 'login.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('fresh registration hydrates the live client from the server-owned starter save', () => {
    assert.match(
        serverSource,
        /const playerData = rememberSocketLogin\(socket, newPlayer\);[\s\S]*socket\.emit\('registerSuccess', \{[\s\S]*playerData/
    );

    const handlers = {};
    const elements = new Map([
        ['char-name-input', { value: 'Fresh Knight' }],
        ['login-screen', { style: {} }],
        ['char-creation-screen', { style: {} }],
        ['main-game-container', { style: {} }]
    ]);
    const player = { inventory: [] };
    let normalized = 0;
    let rendered = 0;
    const context = vm.createContext({
        player,
        document: { getElementById: id => elements.get(id) },
        socket: {
            on(eventName, handler) { handlers[eventName] = handler; },
            emit() {}
        },
        normalizeClientPlayerContainers() { normalized += 1; },
        renderPaperDoll() { rendered += 1; },
        refreshSystemUI() {},
        saveGame() {},
        alert() {}
    });
    vm.runInContext(loginSource, context, { filename: 'login.js' });

    handlers.registerSuccess({
        username: 'Fresh Knight',
        playerData: {
            username: 'Fresh Knight',
            hp: 25,
            inventory: [{ id: 'stout' }, { id: 'stout' }]
        }
    });

    assert.equal(player.username, 'Fresh Knight');
    assert.equal(player.hp, 25);
    assert.deepEqual(player.inventory.map(item => item.id), ['stout', 'stout']);
    assert.equal(normalized, 1);
    assert.equal(rendered, 1);
    assert.equal(elements.get('login-screen').style.display, 'none');
    assert.equal(elements.get('char-creation-screen').style.display, 'block');
});
