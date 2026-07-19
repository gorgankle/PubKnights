const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const inventorySource = fs.readFileSync(path.join(__dirname, '../public/js/inventory.js'), 'utf8');
const companionUiSource = fs.readFileSync(path.join(__dirname, '../public/js/companion-ui.js'), 'utf8');

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.dataset = {};
        this.attributes = {};
        this.listeners = {};
        this.className = '';
        this.textContent = '';
        this.hidden = false;
        this.disabled = false;
        this.draggable = false;
        this._innerHTML = '';
    }

    set innerHTML(value) {
        this._innerHTML = value;
        if (value === '') this.children = [];
    }

    get innerHTML() {
        return this._innerHTML;
    }

    append(...children) {
        this.children.push(...children);
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return this.attributes[name];
    }

    addEventListener(type, handler) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(handler);
    }
}

function hasClass(element, className) {
    return String(element.className || '').split(/\s+/).includes(className);
}

function findAll(root, predicate) {
    const matches = [];
    const visit = element => {
        if (!element || typeof element !== 'object') return;
        if (predicate(element)) matches.push(element);
        (element.children || []).forEach(visit);
    };
    visit(root);
    return matches;
}

function flattenText(root) {
    return findAll(root, () => true)
        .map(element => element.textContent || '')
        .join(' ');
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

function gear(slot, name) {
    return {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name,
        slot,
        rarity: 'common'
    };
}

function createCompanion() {
    return {
        instanceId: 'merc_1',
        templateId: 'starter_mercenary',
        name: 'Mira',
        role: 'Frontliner',
        level: 2,
        xp: 0,
        stats: { vitality: 3, offense: 2, defense: 2, speed: 3 },
        equipment: {
            weapon: gear('weapon', 'Rusty Sword'),
            helmet: null,
            armor: null,
            gloves: null,
            boots: null
        },
        pockets: [
            { id: 'healing_draught', name: 'Healing Draught', slot: 'consumable', combat: true, rarity: 'common' },
            null
        ]
    };
}

function loadHarness() {
    const panel = new FakeElement('div');
    const emitted = [];
    const messages = [];
    const player = {
        level: 5,
        gold: 1000,
        inventory: [
            gear('weapon', 'Iron Sword'),
            { id: 'stout', name: 'Stout', slot: 'consumable', combat: true, rarity: 'common' },
            gear('boots', 'Leather Boots')
        ]
    };
    const context = vm.createContext({
        console,
        player,
        window: { PointerEvent: true, selectedCompanionInstanceId: 'merc_1' },
        document: {
            createElement: tagName => new FakeElement(tagName),
            getElementById: id => id === 'companion-equipment-panel' ? panel : null
        },
        socket: { emit: (eventName, payload) => emitted.push({ eventName, payload }) },
        hideTooltip() {},
        openCrate() {},
        getLevelXpProgress: () => ({ progress: 0, needed: 100, pct: 0 }),
        getItemSpriteURL: () => '',
        trainMercenary() {},
        logMessage: message => messages.push(message),
        playRetroSound() {},
        equipCompanionItem: (instanceId, index) => emitted.push({
            eventName: 'inventoryAction',
            payload: { action: 'equipCompanion', instanceId, index }
        }),
        unequipCompanionItem: (instanceId, slotKey) => emitted.push({
            eventName: 'inventoryAction',
            payload: { action: 'unequipCompanion', instanceId, slotKey }
        }),
        storeCompanionPocketItem: (instanceId, index, pocketIndex) => emitted.push({
            eventName: 'inventoryAction',
            payload: { action: 'storeCompanionPocket', instanceId, index, pocketIndex }
        }),
        removeCompanionPocketItem: (instanceId, pocketIndex) => emitted.push({
            eventName: 'inventoryAction',
            payload: { action: 'removeCompanionPocket', instanceId, pocketIndex }
        })
    });

    vm.runInContext(inventorySource, context);
    vm.runInContext(companionUiSource, context);
    vm.runInContext(
        'globalThis.__companionEquipmentTestApi = { renderCompanionEquipmentPanel, handleItemDragStart };',
        context
    );

    return { api: context.__companionEquipmentTestApi, panel, emitted, messages, player };
}

test('mercenary equipment renders as the Knight-style 3x3 grid with two pockets and no duplicate backpack list', () => {
    const { api, panel } = loadHarness();
    const selected = createCompanion();

    api.renderCompanionEquipmentPanel([selected], ['merc_1']);

    const grids = findAll(panel, element => hasClass(element, 'companion-paper-doll-grid'));
    assert.equal(grids.length, 1);
    assert.equal(hasClass(grids[0], 'paper-doll-grid'), true);
    assert.equal(grids[0].children.length, 9);

    const equipmentSlots = findAll(panel, element => element.dataset.companionSlot !== undefined);
    const pocketSlots = findAll(panel, element => element.dataset.companionPocketIndex !== undefined);
    assert.deepEqual(equipmentSlots.map(slot => slot.dataset.companionSlot).sort(), ['armor', 'boots', 'gloves', 'helmet', 'weapon']);
    assert.deepEqual(pocketSlots.map(slot => slot.dataset.companionPocketIndex), ['0', '1']);
    assert.equal(equipmentSlots.concat(pocketSlots).every(slot => hasClass(slot, 'equip-slot')), true);

    const panelText = flattenText(panel);
    assert.doesNotMatch(panelText, /Shared Backpack Gear|No equipment or combat consumables/);
});

test('backpack drops equip matching mercenary gear and fill either pocket', () => {
    const { api, panel, emitted, messages } = loadHarness();
    api.renderCompanionEquipmentPanel([createCompanion()], ['merc_1']);

    const weaponSlot = findAll(panel, element => element.dataset.companionSlot === 'weapon')[0];
    const weaponTransfer = createDataTransfer();
    api.handleItemDragStart({ dataTransfer: weaponTransfer }, 0, 'backpack');
    weaponSlot.ondrop({ preventDefault() {}, stopPropagation() {}, dataTransfer: weaponTransfer });

    assert.deepEqual(emitted, [{
        eventName: 'inventoryAction',
        payload: { action: 'equipCompanion', instanceId: 'merc_1', index: 0 }
    }]);

    emitted.length = 0;
    const pocketTwo = findAll(panel, element => element.dataset.companionPocketIndex === '1')[0];
    const pocketTransfer = createDataTransfer();
    api.handleItemDragStart({ dataTransfer: pocketTransfer }, 1, 'backpack');
    pocketTwo.ondrop({ preventDefault() {}, stopPropagation() {}, dataTransfer: pocketTransfer });

    assert.deepEqual(emitted, [{
        eventName: 'inventoryAction',
        payload: { action: 'storeCompanionPocket', instanceId: 'merc_1', index: 1, pocketIndex: 1 }
    }]);

    emitted.length = 0;
    const bootsSlot = findAll(panel, element => element.dataset.companionSlot === 'boots')[0];
    bootsSlot.ondrop({ preventDefault() {}, stopPropagation() {}, dataTransfer: weaponTransfer });
    assert.deepEqual(emitted, []);
    assert.match(messages[0], /Boots/);
});

test('occupied compact slots expose typed companion drag payloads', () => {
    const { api, panel } = loadHarness();
    api.renderCompanionEquipmentPanel([createCompanion()], ['merc_1']);

    const weaponSlot = findAll(panel, element => element.dataset.companionSlot === 'weapon')[0];
    assert.equal(weaponSlot.draggable, true);

    const dataTransfer = createDataTransfer();
    weaponSlot.ondragstart({ dataTransfer });

    assert.deepEqual(
        JSON.parse(dataTransfer.getData('application/x-pubknights-item')),
        {
            instanceId: 'merc_1',
            slotKey: 'weapon',
            index: 'weapon',
            type: 'companion-equipment'
        }
    );
});
