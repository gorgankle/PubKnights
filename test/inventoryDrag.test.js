const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadInventoryScript() {
    const emitted = [];
    const errors = [];
    const context = {
        window: { PointerEvent: true },
        socket: { emit: (eventName, payload) => emitted.push({ eventName, payload }) },
        console: { error: (...args) => errors.push(args) },
        hideTooltip: () => {},
        openCrate: () => {}
    };
    const source = fs.readFileSync(path.join(__dirname, '../public/js/inventory.js'), 'utf8');
    vm.runInNewContext(source, context);
    return { context, emitted, errors };
}

function createDataTransfer(initialData = {}) {
    const data = new Map(Object.entries(initialData));
    return {
        effectAllowed: '',
        dropEffect: '',
        setData: (type, value) => data.set(type, value),
        getData: type => data.get(type) || ''
    };
}

test('inventory drag uses a private typed payload', () => {
    const { context } = loadInventoryScript();
    const dataTransfer = createDataTransfer();

    context.handleItemDragStart({ dataTransfer }, 2, 'backpack');

    const expected = JSON.stringify({ index: 2, type: 'backpack' });
    assert.equal(dataTransfer.getData('application/x-pubknights-item'), expected);
    assert.equal(dataTransfer.getData('text/plain'), expected);
    assert.equal(dataTransfer.effectAllowed, 'move');
});

test('inventory drop ignores an external image URL instead of parsing it as JSON', () => {
    const { context, emitted, errors } = loadInventoryScript();
    const dataTransfer = createDataTransfer({ 'text/plain': 'data:image/png;base64,not-json' });

    context.handleItemDrop({ preventDefault: () => {}, dataTransfer }, 0, 'backpack');

    assert.deepEqual(emitted, []);
    assert.deepEqual(errors, []);
});

test('inventory drop accepts a valid private item payload', () => {
    const { context, emitted, errors } = loadInventoryScript();
    const payload = JSON.stringify({ index: 1, type: 'backpack' });
    const dataTransfer = createDataTransfer({ 'application/x-pubknights-item': payload });

    context.handleItemDrop({ preventDefault: () => {}, dataTransfer }, 3, 'backpack');

    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].eventName, 'inventoryAction');
    assert.equal(emitted[0].payload.action, 'reorderBackpack');
    assert.equal(emitted[0].payload.fromIndex, 1);
    assert.equal(emitted[0].payload.toIndex, 3);
    assert.deepEqual(errors, []);
});
