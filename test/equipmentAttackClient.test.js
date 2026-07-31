const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { ItemDatabase } = require('../public/js/items.js');
const EquipmentActionContract = require('../public/js/equipment-actions.js');

const root = path.join(__dirname, '..');
const combatMechanicsSource = fs.readFileSync(
    path.join(root, 'public', 'js', 'combat-mechanics.js'),
    'utf8'
);
const rendererSource = fs.readFileSync(
    path.join(root, 'public', 'js', 'renderer.js'),
    'utf8'
);
const mainSource = fs.readFileSync(
    path.join(root, 'public', 'js', 'main.js'),
    'utf8'
);

function cloneItem(id) {
    return JSON.parse(JSON.stringify(ItemDatabase[id]));
}

function extractFunction(source, functionName) {
    const start = source.indexOf(`function ${functionName}(`);
    assert.ok(start >= 0, `Missing ${functionName}`);
    const bodyStart = source.indexOf('{', start);
    let depth = 0;
    for (let index = bodyStart; index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] === '}') {
            depth--;
            if (depth === 0) return source.slice(start, index + 1);
        }
    }
    throw new Error(`Unterminated ${functionName}`);
}

function extractSocketHandler(source, eventName) {
    const start = source.indexOf(`socket.on('${eventName}'`);
    assert.ok(start >= 0, `Missing ${eventName} socket handler`);
    const next = source.indexOf('\nsocket.on(', start + 1);
    return source.slice(start, next >= 0 ? next : source.length);
}

function createCombatClient({ equipment, stamina = 40, actorKind = 'player' }) {
    const emitted = [];
    const logs = [];
    const menu = { hidden: true };
    const menuButton = {
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; }
    };
    const player = {
        uid: 'player_0',
        kind: 'player',
        username: 'Knight',
        name: 'Knight',
        x: 1,
        y: 1,
        stamina,
        speed: 3,
        equipment,
        inventory: []
    };
    const activeActor = actorKind === 'player'
        ? player
        : {
            uid: 'merc_1',
            kind: 'ally',
            name: 'Mara',
            x: 1,
            y: 1,
            stamina,
            speed: 3,
            equipment
        };
    const globals = {
        EquipmentActionContract,
        player,
        currentActor: activeActor,
        activeCombatActorUid: activeActor.uid,
        gameState: 'COMBAT',
        currentTurn: 'PLAYER',
        combatPhase: 'ACTION_READY',
        combatActionsRemaining: 2,
        selectedEnemy: null,
        hoverTile: { x: -1, y: -1 },
        pendingMove: null,
        currentGridSize: { cols: 8, rows: 8 },
        currentTileSize: 64,
        mapObstacles: [],
        enemies: [],
        allies: [],
        rogues: [],
        document: {
            getElementById(id) {
                if (id === 'equipment-attack-menu') return menu;
                if (id === 'equipment-attacks-btn') return menuButton;
                return null;
            }
        },
        window: {},
        socket: {
            emit(eventName, payload) { emitted.push({ eventName, payload }); }
        },
        getCombatActorByUid() { return globals.currentActor; },
        getPlayerSwiftness() { return 3; },
        getGridDistance(x1, y1, x2, y2) {
            return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        },
        hasLineOfSight() { return true; },
        getCombatActorTargetValidity(target, origin, profile) {
            const inRange = globals.getGridDistance(
                origin.x,
                origin.y,
                target.x,
                target.y
            ) <= profile.range;
            return { inRange, lineClear: true, valid: inRange };
        },
        getPlayerAttackables() { return globals.enemies; },
        refreshSystemUI() {},
        drawGrid() {},
        logMessage(message) { logs.push(message); },
        playRetroSound() {},
        confirm() { return true; },
        saveGame() {},
        setGameState() {}
    };
    const context = vm.createContext(globals);
    vm.runInContext(
        `${combatMechanicsSource}
        this.clientApi = {
            list: listActiveEquipmentAttacks,
            resolve: resolveActiveEquipmentAttack,
            select: selectEquipmentAttack,
            disabled(equipmentSlot, actionId) {
                return getEquipmentAttackDisabledReason(
                    resolveActiveEquipmentAttack(equipmentSlot, actionId)
                );
            },
            selectItem: selectCombatItem,
            toggleMenu: toggleEquipmentAttackMenu,
            isMenuOpen: isEquipmentAttackMenuOpen,
            executeTarget: window.executeTargetAction,
            cancelTarget: window.cancelTarget,
            setActor(actor) {
                currentActor = actor;
                activeCombatActorUid = actor.uid;
            },
            setSelected(target) { selectedEnemy = target; },
            setStamina(value) {
                currentActor.stamina = value;
                if (currentActor.uid === 'player_0') player.stamina = value;
            },
            resetPhase() {
                combatPhase = 'ACTION_READY';
                combatActionsRemaining = 2;
                activeTargetIndex = -1;
            },
            read() {
                return {
                    phase: combatPhase,
                    target: activeTargetIndex,
                    menuOpen: equipmentAttackMenuOpen
                };
            }
        };`,
        context
    );
    return { context, api: context.clientApi, emitted, logs, player, menu };
}

test('combat page loads the shared contract and exposes an inline Equipment Attacks menu', () => {
    const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'public', 'style.css'), 'utf8');

    assert.ok(
        html.indexOf('js/equipment-actions.js') < html.indexOf('js/main.js'),
        'equipment contract must load before combat consumers'
    );
    assert.match(html, /id="equipment-attacks-btn"[^>]*>Equipment Attacks<\/button>/);
    assert.match(html, /id="equipment-attack-menu"[^>]*hidden/);
    assert.doesNotMatch(html, /id="heavy-btn"/);
    assert.match(html, /href="style\.css\?v=6"/);
    assert.match(html, /src="js\/items\.js\?v=5"/);
    assert.match(html, /src="js\/main\.js\?v=17"/);
    assert.match(html, /src="js\/ui-tooltips\.js\?v=6"/);
    assert.match(html, /src="js\/ui-render\.js\?v=12"/);
    assert.match(html, /src="js\/renderer\.js\?v=13"/);
    assert.match(html, /src="js\/combat-mechanics\.js\?v=11"/);
    assert.match(css, /\.equipment-attack-menu\s*\{/);
    assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.equipment-attack-menu/);
});

test('available actions come from the current mercenary equipment with a player fallback', () => {
    const mercEquipment = {
        weapon: cloneItem('scavenged_machete'),
        offhand: cloneItem('round_shield')
    };
    const client = createCombatClient({
        equipment: mercEquipment,
        actorKind: 'ally'
    });

    assert.deepEqual(
        Array.from(client.api.list(), action => `${action.equipmentSlot}:${action.id}`),
        ['weapon:special', 'offhand:shield_block', 'offhand:shield_bash']
    );

    const playerOnlyEquipment = {
        weapon: cloneItem('rusty_mace'),
        offhand: cloneItem('captains_shield')
    };
    client.player.equipment = playerOnlyEquipment;
    client.api.setActor({
        uid: 'player_0',
        kind: 'player',
        name: 'Knight',
        x: 1,
        y: 1,
        stamina: 40
    });
    assert.equal(client.api.resolve('offhand', 'shield_block').itemId, 'captains_shield');
});

test('the free submenu closes when the active combat actor changes', () => {
    const client = createCombatClient({
        equipment: {
            weapon: cloneItem('rusty_mace'),
            offhand: cloneItem('round_shield')
        }
    });

    client.api.toggleMenu();
    assert.equal(client.api.isMenuOpen(), true);
    assert.equal(client.menu.hidden, false);

    client.api.setActor({
        uid: 'merc_2',
        kind: 'ally',
        name: 'Rook',
        x: 1,
        y: 1,
        stamina: 30,
        equipment: {
            weapon: cloneItem('scavenged_machete'),
            offhand: null
        }
    });
    assert.equal(client.api.isMenuOpen(), false);
    assert.equal(client.menu.hidden, true);
});

test('self block dispatches immediately with the exact authoritative identifiers', () => {
    const client = createCombatClient({
        equipment: {
            weapon: cloneItem('rusty_mace'),
            offhand: cloneItem('round_shield')
        }
    });

    assert.equal(client.api.select('offhand', 'shield_block'), true);
    assert.equal(client.api.read().phase, 'WAITING_FOR_SERVER');
    assert.equal(client.emitted.length, 1);
    assert.deepEqual(
        JSON.parse(JSON.stringify(client.emitted[0])),
        {
            eventName: 'dispatchCombatAction',
            payload: {
                actorUid: 'player_0',
                actionCategory: 'equipmentAttack',
                equipmentSlot: 'offhand',
                actionId: 'shield_block',
                itemId: 'round_shield'
            }
        }
    );
});

test('enemy equipment attacks enter structured targeting and dispatch the clicked actor', () => {
    const client = createCombatClient({
        equipment: {
            weapon: cloneItem('rusty_mace'),
            offhand: cloneItem('round_shield')
        }
    });
    const enemy = {
        id: 'bandit',
        uid: 'enemy_1',
        name: 'Bandit',
        x: 2,
        y: 1,
        size: 1,
        alive: true
    };
    client.context.enemies = [enemy];

    assert.equal(client.api.select('offhand', 'shield_bash'), true);
    let state = client.api.read();
    assert.equal(state.phase, 'TARGETING');
    assert.deepEqual(JSON.parse(JSON.stringify(state.target)), {
        kind: 'equipmentAttack',
        equipmentSlot: 'offhand',
        actionId: 'shield_bash',
        itemId: 'round_shield'
    });
    assert.equal(client.emitted.length, 0);

    client.api.executeTarget(2, 1);
    state = client.api.read();
    assert.equal(state.phase, 'WAITING_FOR_SERVER');
    assert.deepEqual(
        JSON.parse(JSON.stringify(client.emitted[0].payload)),
        {
            actorUid: 'player_0',
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'offhand',
            actionId: 'shield_bash',
            itemId: 'round_shield',
            targetEnemy: {
                id: 'bandit',
                uid: 'enemy_1',
                x: 2,
                y: 1
            }
        }
    );
});

test('area weapon specials target a tile without requiring a selected enemy', () => {
    const client = createCombatClient({
        equipment: {
            weapon: cloneItem('stormcaller_staff'),
            offhand: null
        },
        stamina: 40
    });

    assert.equal(client.api.select('weapon', 'special'), true);
    assert.equal(client.api.read().phase, 'TARGETING');
    assert.equal(client.emitted.length, 0);
    client.api.executeTarget(4, 3);
    assert.deepEqual(
        JSON.parse(JSON.stringify(client.emitted[0].payload)),
        {
            actorUid: 'player_0',
            actionCategory: 'equipmentAttack',
            equipmentSlot: 'weapon',
            actionId: 'special',
            itemId: 'stormcaller_staff',
            tx: 4,
            ty: 3
        }
    );
});

test('equipment actions report insufficient stamina without dispatching', () => {
    const client = createCombatClient({
        equipment: {
            weapon: cloneItem('rusty_mace'),
            offhand: cloneItem('round_shield')
        },
        stamina: 5
    });

    assert.equal(client.api.select('offhand', 'shield_bash'), false);
    assert.equal(client.emitted.length, 0);
    assert.match(client.logs.at(-1), /Needs 12 STAM; 5 available/);
});

test('targeted equipment selections stay bound to the item that opened targeting', () => {
    const client = createCombatClient({
        equipment: {
            weapon: cloneItem('rusty_mace'),
            offhand: cloneItem('round_shield')
        }
    });
    const enemy = {
        id: 'bandit',
        uid: 'enemy_1',
        x: 2,
        y: 1,
        size: 1,
        alive: true
    };
    client.context.enemies = [enemy];

    assert.equal(client.api.select('offhand', 'shield_bash'), true);
    client.player.equipment.offhand = cloneItem('captains_shield');
    client.api.executeTarget(2, 1);

    assert.equal(client.emitted.length, 0);
    assert.equal(client.api.read().phase, 'ACTION_READY');
    assert.equal(client.api.read().target, -1);
});

test('Shield Block is disabled while the active actor already has guard charges', () => {
    ['player', 'ally'].forEach(actorKind => {
        const client = createCombatClient({
            equipment: {
                weapon: cloneItem('rusty_mace'),
                offhand: cloneItem('round_shield')
            },
            actorKind
        });
        client.context.currentActor.guardState = {
            type: 'shield_block',
            charges: 1,
            itemId: 'round_shield'
        };

        assert.equal(
            client.api.disabled('offhand', 'shield_block'),
            'Shield Block is already active.'
        );
        assert.equal(client.api.select('offhand', 'shield_block'), false);
        assert.equal(client.emitted.length, 0);
        assert.equal(client.logs.at(-1), 'Shield Block is already active.');
    });
});

test('combat gear with equipment actions still routes through the one-action equip path', () => {
    const client = createCombatClient({
        equipment: {
            weapon: cloneItem('rusty_mace'),
            offhand: null
        }
    });
    client.player.inventory = [cloneItem('round_shield')];

    client.api.selectItem({ source: 'backpack', index: 0 });
    assert.deepEqual(
        JSON.parse(JSON.stringify(client.emitted[0].payload)),
        {
            actorUid: 'player_0',
            actionCategory: 'equip',
            invIndex: 0
        }
    );
});

test('renderer targeting overlays use the pending equipment action range', () => {
    const rendererPlayer = {
        equipment: { weapon: cloneItem('rusty_mace') },
        inventory: []
    };
    const context = vm.createContext({
        Math,
        Number,
        Boolean,
        String,
        player: rendererPlayer,
        combatPhase: 'TARGETING',
        activeTargetIndex: {
            kind: 'equipmentAttack',
            equipmentSlot: 'offhand',
            actionId: 'shield_bash',
            itemId: 'round_shield'
        },
        getActiveCombatantWeapon() { return rendererPlayer.equipment.weapon; },
        isEquipmentAttackTargetReference() { return true; },
        resolvePendingEquipmentAttack() {
            return {
                targetType: 'enemy',
                range: 3,
                ignoresLoS: true,
                rules: { targetType: 'enemy', range: 3 }
            };
        },
        getActiveCombatantItem() { return cloneItem('round_shield'); }
    });
    vm.runInContext(
        `${extractFunction(rendererSource, 'getCombatTargetProfile')}
        this.profile = getCombatTargetProfile();`,
        context
    );

    assert.equal(context.profile.range, 3);
    assert.equal(context.profile.shape, 'enemy');
    assert.equal(context.profile.ignoresLoS, true);
});

test('authoritative actions choose their clip and player equipment supplies dual-wield fallback', () => {
    const functionNames = [
        'getCombatResultEquipment',
        'getCombatResultWeapon',
        'getCombatResultActionItem',
        'getCombatResultAnimationProfile'
    ];
    let resolvedOptions = null;
    const player = {
        uid: 'player_0',
        kind: 'player',
        equipment: {
            weapon: cloneItem('mimic_fang_dagger'),
            offhand: cloneItem('parrying_dagger')
        }
    };
    const context = vm.createContext({
        player,
        Boolean,
        String,
        resolveCombatAnimationClip(options) {
            resolvedOptions = options;
            return options.offhand ? 'dual_wield' : 'dagger';
        }
    });
    vm.runInContext(
        `${functionNames.map(name => extractFunction(mainSource, name)).join('\n')}
        this.animationApi = {
            profile: getCombatResultAnimationProfile,
            equipment: getCombatResultEquipment
        };`,
        context
    );
    const playerActorWithoutEquipment = {
        uid: 'player_0',
        kind: 'player',
        x: 1,
        y: 1
    };

    const bashProfile = context.animationApi.profile({
        source: 'equipment',
        actionName: 'Shield Bash',
        action: {
            id: 'shield_bash',
            equipmentSlot: 'offhand',
            actionType: 'attack',
            animType: 'shield_bash',
            clipId: 'shield_bash'
        },
        fx: {}
    }, player.equipment.weapon, playerActorWithoutEquipment);
    assert.equal(bashProfile.clipId, 'shield_bash');

    const standardProfile = context.animationApi.profile({
        source: 'weapon',
        actionName: 'slash',
        fx: {}
    }, player.equipment.weapon, playerActorWithoutEquipment);
    assert.equal(standardProfile.clipId, 'dual_wield');
    assert.equal(resolvedOptions.offhand.id, 'parrying_dagger');
});

test('combat results include guard playback and readable shield-block feedback', () => {
    assert.match(mainSource, /result\.type === 'guard'/);
    assert.match(mainSource, /playOutgoingCombatGuard\(/);
    assert.match(mainSource, /result\.action\.id === 'special'/);
    assert.match(mainSource, /ev\.guarded === true/);
    assert.match(mainSource, /shieldBlocked \? "BLOCK" : "DEFLECT"/);
});

test('combat snapshots mirror only the Knight actor guard state and clear it when absent', () => {
    const context = vm.createContext({
        latestCombatTurnSequence: -1,
        combatAuthorityRevision: 0,
        selectedEnemy: null,
        player: {
            x: 1,
            y: 1,
            guardState: { type: 'stale', charges: 9 }
        },
        enemies: [],
        allies: [],
        rogues: [],
        mapObstacles: [],
        combatParties: {},
        activeCombatActorUid: 'player_0',
        combatActionsRemaining: 2
    });
    vm.runInContext(
        `${extractFunction(mainSource, 'getCombatTurnSequence')}
        ${extractFunction(mainSource, 'canApplyCombatControls')}
        ${extractFunction(mainSource, 'syncCombatCollectionsFromState')}
        this.guardSyncApi = {
            sync: syncCombatCollectionsFromState,
            read() { return player.guardState; }
        };`,
        context
    );

    context.guardSyncApi.sync({
        guardState: { type: 'wrong_scope', charges: 4 },
        player: { x: 2, y: 3, atbCharge: 100 },
        actors: [{
            uid: 'player_0',
            kind: 'player',
            x: 2,
            y: 3,
            guardState: {
                type: 'shield_block',
                charges: 1,
                itemId: 'round_shield'
            }
        }],
        enemies: [],
        allies: [],
        rogues: []
    });
    assert.deepEqual(
        JSON.parse(JSON.stringify(context.guardSyncApi.read())),
        {
            type: 'shield_block',
            charges: 1,
            itemId: 'round_shield'
        }
    );

    context.guardSyncApi.sync({
        guardState: { type: 'wrong_scope', charges: 4 },
        player: { x: 2, y: 3, atbCharge: 100 },
        actors: [{
            uid: 'player_0',
            kind: 'player',
            x: 2,
            y: 3
        }],
        enemies: [],
        allies: [],
        rogues: []
    });
    assert.equal(context.guardSyncApi.read(), undefined);
});

test('a new actor activation clears an unused local shield guard', () => {
    const player = {
        uid: 'player_0',
        username: 'Knight',
        guardState: { type: 'shield_block', charges: 1 }
    };
    const ally = {
        uid: 'merc_1',
        kind: 'ally',
        guardState: { type: 'shield_block', charges: 1 }
    };
    const context = vm.createContext({
        player,
        enemies: [],
        allies: [ally],
        rogues: []
    });
    vm.runInContext(
        `${extractFunction(mainSource, 'getCombatActorByUid')}
        ${extractFunction(mainSource, 'clearExpiredGuardForActivatedActor')}
        clearExpiredGuardForActivatedActor('merc_1');
        clearExpiredGuardForActivatedActor('player_0');`,
        context
    );

    assert.equal(player.guardState, undefined);
    assert.equal(ally.guardState, undefined);
    const readyHandler = extractSocketHandler(mainSource, 'ATB_READY');
    assert.ok(
        readyHandler.indexOf('clearExpiredGuardForActivatedActor(activeCombatActorUid)')
            > readyHandler.indexOf("activeCombatActorUid = payload.actorUid || 'player_0'")
    );
});

test('stale combat receipts preserve newer equipment menu and targeting state', () => {
    [
        'combatResult',
        'combatItemReceipt',
        'moveReceipt',
        'ATB_READY'
    ].forEach(eventName => {
        const handler = extractSocketHandler(mainSource, eventName);
        const staleCheck = handler.indexOf('if (authority.stale)');
        const equipmentReset = handler.indexOf('resetEquipmentAttackUiState');
        assert.ok(staleCheck >= 0, `${eventName} must reject stale authority`);
        assert.ok(
            equipmentReset > staleCheck,
            `${eventName} must reject stale receipts before clearing equipment UI`
        );
    });
});
