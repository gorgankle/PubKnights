const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'expeditions.js'),
    'utf8'
);

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.attributes = {};
        this.className = '';
        this.dataset = {};
        this.style = {};
        this._innerHTML = '';
        if (tagName === 'canvas') {
            this.context = {
                clearRect() {},
                fillRect() {},
                imageSmoothingEnabled: true
            };
        }
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getContext() {
        return this.context || null;
    }

    set innerHTML(value) {
        this._innerHTML = String(value);
        if (value === '') this.children = [];
    }

    get innerHTML() {
        return this._innerHTML;
    }
}

function findByClass(root, className) {
    const matches = [];
    const visit = node => {
        if (String(node.className || '').split(/\s+/).includes(className)) matches.push(node);
        (node.children || []).forEach(visit);
    };
    visit(root);
    return matches;
}

function createMapHarness(spriteRenderer = () => 'humanoid-paperdoll') {
    const spriteActors = [];
    const document = {
        createElement: tagName => new FakeElement(tagName),
        createElementNS: (_namespace, tagName) => new FakeElement(tagName)
    };
    const context = vm.createContext({
        console,
        document,
        player: {
            uid: 'player_0',
            name: 'Ada',
            appearance: { hair: 'hair_braid' },
            equipment: { weapon: { id: 'rusty_mace' } },
            adventure: {}
        },
        drawWorldActorSprite(_context, actor) {
            spriteActors.push(actor);
            return spriteRenderer(actor);
        }
    });
    vm.runInContext(`${source}
        globalThis.__mapMarkerTest = {
            render: renderExplorationMapInto,
            setSnapshot: snapshot => { adventureViewSnapshot = snapshot; }
        };
    `, context, { filename: 'expeditions.js' });
    return { context, document, spriteActors };
}

test('shared map renderer draws one noninteractive live-player marker on both maps', () => {
    const harness = createMapHarness();
    const locations = [
        { id: 'pub_hub', name: 'The Pub', isHome: true, discovered: true, mapPosition: { x: 10, y: 70 } },
        { id: 'old_road', name: 'Old Road', discovered: true, mapPosition: { x: 70, y: 30 } }
    ];
    const routes = [{
        id: 'route_old_road',
        fromLocationId: 'pub_hub',
        toLocationId: 'old_road',
        unlocked: true
    }];
    harness.context.__mapMarkerTest.setSnapshot({
        locations,
        allLocations: locations,
        routes,
        allRoutes: routes,
        adventure: {}
    });
    const localMap = new FakeElement('div');
    const expandedMap = new FakeElement('div');
    const journey = {
        routeId: 'route_old_road',
        originLocationId: 'pub_hub',
        destinationLocationId: 'old_road',
        direction: 'OUTBOUND',
        phase: 'OUTBOUND',
        legIndex: 1,
        legCount: 2
    };

    harness.context.__mapMarkerTest.render(localMap, null);
    harness.context.__mapMarkerTest.render(localMap, journey);
    harness.context.__mapMarkerTest.render(expandedMap, journey, { expanded: true });

    const localMarkers = findByClass(localMap, 'world-map-player-marker');
    const expandedMarkers = findByClass(expandedMap, 'world-map-player-marker');
    assert.equal(localMarkers.length, 1);
    assert.equal(expandedMarkers.length, 1);
    assert.equal(localMarkers[0].style.left, '30%');
    assert.equal(localMarkers[0].attributes.role, 'img');
    assert.match(localMarkers[0].attributes['aria-label'], /leg 1 of 2/);
    assert.equal(Object.hasOwn(localMarkers[0].attributes, 'tabindex'), false);
    assert.equal(findByClass(localMarkers[0], 'world-map-player-sprite').length, 1);
    assert.equal(harness.spriteActors.length, 3);
    assert.equal(harness.spriteActors.at(-1).kind, 'player');
    assert.equal(harness.spriteActors.at(-1).uid, 'player_0');
    assert.deepEqual(harness.spriteActors.at(-1).appearance, { hair: 'hair_braid' });
    assert.deepEqual(harness.spriteActors.at(-1).equipment, { weapon: { id: 'rusty_mace' } });
});

test('map marker falls back to a pixel knight when the paper-doll renderer is unavailable', () => {
    const harness = createMapHarness(() => null);
    const locations = [{
        id: 'pub_hub',
        name: 'The Pub',
        isHome: true,
        discovered: true,
        mapPosition: { x: 10, y: 70 }
    }];
    harness.context.__mapMarkerTest.setSnapshot({
        locations,
        allLocations: locations,
        routes: [],
        allRoutes: [],
        adventure: {}
    });
    const map = new FakeElement('div');

    harness.context.__mapMarkerTest.render(map, null);

    const canvas = findByClass(map, 'world-map-player-sprite')[0];
    assert.ok(canvas);
    assert.equal(canvas.dataset.renderer, 'fallback-pixel');
});
