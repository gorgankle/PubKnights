const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.join(__dirname, '..');

function readProjectFile(relativePath) {
    return fs.readFileSync(
        path.join(projectRoot, ...relativePath.split('/')),
        'utf8'
    );
}

function makeCanvas(width = 96, height = width) {
    const context = {
        clearRect() {},
        fillRect() {},
        fillText() {},
        save() {},
        restore() {},
        translate() {},
        scale() {}
    };
    return {
        width,
        height,
        context,
        getContext() {
            return context;
        }
    };
}

function makeLiveVisualProfile(actor) {
    return {
        label: actor.name,
        profileGroup: actor.kind || 'player',
        body: {
            gender: actor.appearance.gender,
            spriteId: actor.appearance.gender === 'female'
                ? 'body_female'
                : 'body_male'
        },
        face: {
            eyesSpriteId: actor.appearance.eyes
        },
        hair: {
            spriteId: actor.appearance.hair
        },
        appearance: { ...actor.appearance },
        equipment: {
            helmet: null,
            armor: null,
            gloves: null,
            boots: null,
            weapon: null,
            offhand: null,
            ...actor.equipment
        },
        overrides: {
            anchors: {},
            layers: {
                weapon: 'front',
                offhand: 'back',
                hair: 'auto'
            }
        }
    };
}

test('Knight and vault paper dolls use the shared lower-left glove layout', () => {
    const html = readProjectFile('public/index.html');
    const grids = Array.from(html.matchAll(
        /<div class="paper-doll-grid">\s*((?:<div class="equip-slot[^>]*>.*?<\/div>\s*){9})<\/div>/gs
    )).map(match => match[1]);

    function readCells(grid) {
        return Array.from(grid.matchAll(
            /<div class="equip-slot([^"]*)"([^>]*)>(.*?)<\/div>/gs
        )).map(match => {
            const id = /\bid="([^"]+)"/.exec(match[2]);
            return id ? id[1] : (match[1].includes('empty-cell') ? 'empty' : match[3].trim());
        });
    }

    const knightGrid = grids.find(grid => grid.includes('id="slot-helmet"'));
    const vaultGrid = grids.find(grid => grid.includes('id="vault-slot-helmet"'));

    assert.deepEqual(readCells(knightGrid), [
        'empty', 'slot-helmet', 'empty',
        'slot-offhand', 'slot-armor', 'slot-weapon',
        'slot-gloves', 'slot-boots', 'empty'
    ]);
    assert.deepEqual(readCells(vaultGrid), [
        'empty', 'vault-slot-helmet', 'empty',
        'vault-slot-offhand', 'vault-slot-armor', 'vault-slot-weapon',
        'vault-slot-gloves', 'vault-slot-boots', 'empty'
    ]);
});

test('Knight dashboard delegates its live paper doll to the shared front renderer', () => {
    const playerCanvas = makeCanvas();
    const frontCalls = [];
    const resolvedActors = [];
    let legacyLayerCalls = 0;
    const player = {
        uid: 'player_0',
        kind: 'player',
        name: 'Shield Tester',
        appearance: {
            gender: 'female',
            skin: 'deep',
            hair: 'hair_braid',
            hairColor: 'auburn',
            eyes: 'eyes_green',
            shirtColor: 'olive',
            pantsColor: 'navy',
            bootsColor: 'leather'
        },
        equipment: {
            helmet: {
                spriteId: 'helm_tankard',
                hidesHair: true
            },
            armor: { spriteId: 'armor_tankard' },
            gloves: { spriteId: 'gloves_tankard' },
            boots: { spriteId: 'boots_tankard' },
            weapon: { spriteId: 'weap_machete' },
            offhand: { spriteId: 'offhand_captains_shield' }
        },
        inventory: []
    };
    const context = vm.createContext({
        console,
        window: {},
        document: {
            body: { appendChild() {} },
            getElementById(id) {
                return id === 'main-player-canvas'
                    ? playerCanvas
                    : null;
            },
            querySelectorAll() {
                return [];
            },
            createElement() {
                return {};
            }
        },
        player,
        SpriteMatrices: {},
        drawProceduralSprite() {
            legacyLayerCalls++;
        },
        resolveHumanoidActorVisualProfile(actor) {
            resolvedActors.push(actor);
            return makeLiveVisualProfile(actor);
        },
        drawHumanoidActorFront(
            canvasContext,
            actorOrProfile,
            x,
            y,
            size,
            options
        ) {
            frontCalls.push({
                canvasContext,
                actorOrProfile,
                x,
                y,
                size,
                options
            });
            return actorOrProfile;
        }
    });

    vm.runInContext(
        readProjectFile('public/js/ui-render.js'),
        context,
        { filename: 'ui-render.js' }
    );
    vm.runInContext('renderMainScreenSprites()', context);

    assert.equal(frontCalls.length, 1);
    assert.equal(frontCalls[0].canvasContext, playerCanvas.context);
    assert.equal(frontCalls[0].x, 0);
    assert.equal(frontCalls[0].y, 0);
    assert.equal(frontCalls[0].size, playerCanvas.width);
    assert.equal(
        frontCalls[0].actorOrProfile.equipment.offhand.spriteId,
        'offhand_captains_shield'
    );
    assert.equal(
        frontCalls[0].actorOrProfile.equipment.helmet.spriteId,
        'helm_tankard'
    );
    assert.ok(
        resolvedActors.length === 0 || resolvedActors[0] === player,
        'dashboard resolved a stale object instead of the live Knight'
    );
    assert.equal(
        legacyLayerCalls,
        0,
        'dashboard bypassed the shared hair/offhand layer contract'
    );
});

test('combat Active Loadout exposes the live offhand and its tooltip target', () => {
    const elements = {
        'combat-top-bars': { innerHTML: '' },
        'combat-bottom-stats': { innerHTML: '' }
    };
    const shield = {
        spriteId: 'offhand_round_shield',
        name: 'Round Shield',
        rarity: 'Rare'
    };
    const player = {
        uid: 'player_0',
        kind: 'player',
        hp: 25,
        stamina: 25,
        activeBuffs: [],
        equipment: {
            weapon: null,
            offhand: shield
        }
    };
    const context = vm.createContext({
        console,
        window: {},
        document: {
            getElementById(id) {
                return elements[id] || null;
            },
            querySelectorAll() {
                return [];
            },
            createElement() {
                return makeCanvas(32);
            }
        },
        player,
        ItemDatabase: {},
        SpriteMatrices: {},
        getActiveCombatant() {
            return player;
        },
        getPlayerMaxHp() {
            return 25;
        },
        getPlayerMaxStamina() {
            return 25;
        },
        getPlayerTotalPower() {
            return 1;
        },
        getPlayerDeflectChance() {
            return 0;
        },
        getPlayerSwiftness() {
            return 1;
        },
        getItemSpriteURL() {
            return '';
        }
    });

    vm.runInContext(
        readProjectFile('public/js/ui-render.js'),
        context,
        { filename: 'ui-render.js' }
    );
    vm.runInContext('refreshCombatSidebar()', context);

    assert.match(
        elements['combat-bottom-stats'].innerHTML,
        /<b>Offhand:<\/b>[\s\S]*Round Shield/
    );
    assert.match(
        elements['combat-bottom-stats'].innerHTML,
        /getActiveCombatant\(\)\.equipment \|\| \{\}\)\.offhand/
    );
});

test('dialogue portraits delegate the live player paper doll to the shared front renderer', () => {
    const portraitCanvas = makeCanvas(96);
    const frontCalls = [];
    let legacyLayerCalls = 0;
    const player = {
        appearance: {
            gender: 'female',
            hair: 'hair_braid',
            eyes: 'eyes_green'
        },
        equipment: {
            weapon: { spriteId: 'weap_machete' },
            offhand: { spriteId: 'offhand_round_shield' }
        }
    };
    const context = vm.createContext({
        console,
        window: {},
        document: {
            getElementById(id) {
                return id === 'dialogue-portrait-canvas'
                    ? portraitCanvas
                    : null;
            }
        },
        player,
        SpriteMatrices: {},
        drawOptimizedSprite() {
            legacyLayerCalls++;
        },
        drawHumanoidActorFront(
            canvasContext,
            actor,
            x,
            y,
            size
        ) {
            frontCalls.push({
                canvasContext,
                actor,
                x,
                y,
                size
            });
            return actor;
        }
    });

    vm.runInContext(
        readProjectFile('public/js/dialogue.js'),
        context,
        { filename: 'dialogue.js' }
    );
    vm.runInContext(`renderDialoguePortrait('player')`, context);

    assert.equal(frontCalls.length, 1);
    assert.equal(frontCalls[0].canvasContext, portraitCanvas.context);
    assert.equal(frontCalls[0].actor, player);
    assert.equal(frontCalls[0].x, -30);
    assert.equal(frontCalls[0].y, -20);
    assert.equal(frontCalls[0].size, 180);
    assert.equal(legacyLayerCalls, 0);
});

test('social avatars and inspection consume the latest six-slot equipment', () => {
    const socialCanvas = makeCanvas(240);
    const frontCalls = [];
    const resolvedActors = [];
    let legacyLayerCalls = 0;
    const elements = {
        'social-canvas': socialCanvas,
        'inspect-name': { innerText: '' },
        'inspect-gear-list': { innerHTML: '' },
        'social-inspect-panel': { style: {} }
    };
    const localAppearance = {
        gender: 'male',
        skin: 'light',
        hair: 'hair_buzzcut',
        hairColor: 'brown',
        eyes: 'eyes_blue',
        shirtColor: 'blue',
        pantsColor: 'dark',
        bootsColor: 'leather'
    };
    const remote = {
        id: 'social_remote',
        name: 'Remote Guard',
        x: 2,
        y: 3,
        appearance: {
            ...localAppearance,
            hair: 'hair_mohawk'
        },
        equipment: {
            helmet: null,
            armor: { spriteId: 'armor_tankard', name: 'Tankard Plate' },
            gloves: null,
            boots: null,
            weapon: { spriteId: 'weap_machete', name: 'Machete' },
            offhand: {
                spriteId: 'offhand_round_shield',
                name: 'Round Shield',
                rarity: 'Epic'
            }
        }
    };
    const context = vm.createContext({
        console,
        window: {},
        document: {
            addEventListener() {},
            getElementById(id) {
                return elements[id] || null;
            }
        },
        socket: {
            id: 'local_socket',
            emit() {},
            on() {}
        },
        requestAnimationFrame() {
            return 1;
        },
        cancelAnimationFrame() {},
        setTimeout,
        clearTimeout,
        PALETTE: { 3: '#2a221f' },
        SpriteMatrices: {},
        player: {
            appearance: { ...localAppearance },
            equipment: {}
        },
        drawProceduralSprite() {
            legacyLayerCalls++;
        },
        resolveHumanoidActorVisualProfile(actor) {
            resolvedActors.push(actor);
            return actor && actor.kind === 'player'
                ? makeLiveVisualProfile(actor)
                : null;
        },
        drawHumanoidActorFront(
            canvasContext,
            actorOrProfile,
            x,
            y,
            size,
            options
        ) {
            const resolvedProfile = actorOrProfile.body
                ? actorOrProfile
                : (
                    actorOrProfile.kind === 'player'
                        ? makeLiveVisualProfile(actorOrProfile)
                        : null
                );
            frontCalls.push({
                canvasContext,
                actorOrProfile,
                resolvedProfile,
                x,
                y,
                size,
                options
            });
            return resolvedProfile;
        }
    });

    vm.runInContext(
        readProjectFile('public/js/social.js'),
        context,
        { filename: 'social.js' }
    );
    context.__remote = remote;
    vm.runInContext(`
        currentSocialZone = 'tavern';
        playersInRoom = { remote: __remote };
        renderSocialZone();
    `, context);

    remote.equipment.offhand = {
        spriteId: 'offhand_captains_shield',
        name: 'Captain Shield',
        rarity: 'Relic'
    };
    vm.runInContext(`
        renderSocialZone();
        forceInspect('remote');
    `, context);

    assert.equal(frontCalls.length, 2);
    assert.equal(frontCalls[0].canvasContext, socialCanvas.context);
    assert.equal(frontCalls[0].x, 48);
    assert.equal(frontCalls[0].y, 72);
    assert.equal(frontCalls[0].size, 24);
    assert.ok(
        frontCalls.every(call => call.resolvedProfile),
        'social payload was not adapted into a shared player profile'
    );
    assert.equal(
        frontCalls[0].resolvedProfile.equipment.offhand.spriteId,
        'offhand_round_shield'
    );
    assert.equal(
        frontCalls[1].resolvedProfile.equipment.offhand.spriteId,
        'offhand_captains_shield'
    );
    assert.ok(
        resolvedActors.length === 0
        || resolvedActors.every(actor => (
            actor.id === remote.id
            && actor.kind === 'player'
            && actor.equipment === remote.equipment
        )),
        'social renderer did not adapt the latest live player payload'
    );
    assert.equal(
        legacyLayerCalls,
        0,
        'social avatar bypassed the shared front layer contract'
    );
    assert.match(elements['inspect-gear-list'].innerHTML, /Offhand:/);
    assert.match(
        elements['inspect-gear-list'].innerHTML,
        /Captain Shield/
    );
});

test('large humanoid footprints keep a one-tile visual centered', () => {
    const transforms = [];
    const frameCalls = [];
    const bufferContext = {
        save() {},
        restore() {},
        drawImage() {}
    };
    const rendererContext = vm.createContext({
        console,
        window: {},
        document: {
            createElement() {
                return {
                    width: 0,
                    height: 0,
                    getContext() {
                        return bufferContext;
                    }
                };
            }
        },
        canvas: {
            width: 320,
            height: 320,
            addEventListener() {},
            getBoundingClientRect() {
                return {
                    left: 0,
                    top: 0,
                    width: 320,
                    height: 320
                };
            }
        },
        ctx: bufferContext,
        requestAnimationFrame() {
            return 1;
        },
        drawSidePlayerAnimationFrame() {},
        drawHumanoidActorAnimationFrame(
            canvasContext,
            visual,
            clipId,
            frameIndex,
            size,
            options
        ) {
            frameCalls.push({
                canvasContext,
                visual,
                clipId,
                frameIndex,
                size,
                options
            });
        },
        resolveHumanoidProfileAnchorOffsets() {
            return {
                weapon: [0, 0],
                release: [0, 0],
                frontWeapon: [0, 0],
                offhand: [0, 0],
                frontOffhand: [0, 0]
            };
        }
    });

    vm.runInContext(
        readProjectFile('public/js/renderer.js'),
        rendererContext,
        { filename: 'renderer.js' }
    );

    rendererContext.__drawContext = {
        save() {},
        restore() {},
        translate(x, y) {
            transforms.push([x, y]);
        }
    };
    rendererContext.__actor = {
        uid: 'large_humanoid',
        kind: 'enemy',
        size: 2
    };
    rendererContext.__visual = {
        appearance: {
            gender: 'male',
            hairStyle: 'hair_buzzcut'
        },
        equipment: {
            helmet: null,
            armor: null,
            gloves: null,
            boots: null,
            weapon: null,
            offhand: null
        },
        stanceProfile: {
            visualScale: 1
        },
        overrides: {
            layers: {
                weapon: 'front',
                offhand: 'back',
                hair: 'auto'
            }
        }
    };
    rendererContext.__renderState = {
        clipId: 'idle',
        frameIndex: 0,
        facing: 'right'
    };

    const drawn = vm.runInContext(`
        drawHumanoidCombatActor(
            __drawContext,
            __actor,
            __visual,
            __renderState,
            10,
            20,
            64
        )
    `, rendererContext);

    assert.equal(drawn, true);
    assert.equal(frameCalls.length, 1);
    assert.equal(
        frameCalls[0].size,
        32,
        'actor.size collision footprint scaled the shared pixel rig'
    );
    assert.deepEqual(transforms, [[26, 36]]);
    assert.equal(transforms[0][0] + (frameCalls[0].size / 2), 42);
    assert.equal(transforms[0][1] + (frameCalls[0].size / 2), 52);
    assert.equal(rendererContext.__actor.size, 2);
});
