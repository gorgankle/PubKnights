const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
    createCombatPlaybackBarrier
} = require('../public/js/combat-animation.js');

const mainSource = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'main.js'),
    'utf8'
);
const combatMechanicsSource = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'combat-mechanics.js'),
    'utf8'
);

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

const authorityFunctionNames = [
    'getCombatTurnSequence',
    'registerCombatAuthority',
    'canApplyCombatControls',
    'syncCombatCollectionsFromState',
    'settleCombatActionState'
];
const authoritySource = authorityFunctionNames
    .map(name => extractFunction(mainSource, name))
    .join('\n');

test('turn sequence parsing requires an explicit non-null integer', () => {
    const context = vm.createContext({ Object, Number });
    vm.runInContext(
        `${extractFunction(mainSource, 'getCombatTurnSequence')}
        this.readSequence = getCombatTurnSequence;`,
        context
    );

    assert.equal(context.readSequence(null), null);
    assert.equal(context.readSequence({}), null);
    assert.equal(context.readSequence({ turnSequence: null }), null);
    assert.equal(context.readSequence({ turnSequence: '' }), null);
    assert.equal(
        context.readSequence({
            updatedCombatState: { turnSequence: null }
        }),
        null
    );
    assert.equal(context.readSequence({ turnSequence: 0 }), 0);
    assert.equal(
        context.readSequence({
            updatedCombatState: { turnSequence: 12 }
        }),
        12
    );
});

test('old snapshots update visuals without overwriting newer combat controls', () => {
    const context = vm.createContext({
        Object,
        Number,
        Math,
        Array,
        refreshSystemUI() {},
        drawGrid() {}
    });
    vm.runInContext(
        `let latestCombatTurnSequence = -1;
        let combatAuthorityRevision = 0;
        let selectedEnemy = null;
        let pendingMove = { x: 4, y: 4 };
        let player = { x: 0, y: 0 };
        let enemies = [];
        let allies = [];
        let rogues = [];
        let mapObstacles = [];
        let combatParties = {};
        let activeCombatActorUid = null;
        let combatActionsRemaining = 0;
        let currentTurn = 'ENEMY';
        let combatPhase = 'WAITING_FOR_SERVER';
        ${authoritySource}
        this.authorityApi = {
            register: registerCombatAuthority,
            sync: syncCombatCollectionsFromState,
            settle: settleCombatActionState,
            setControls(uid, actions) {
                activeCombatActorUid = uid;
                combatActionsRemaining = actions;
            },
            read() {
                return {
                    latestCombatTurnSequence,
                    activeCombatActorUid,
                    combatActionsRemaining,
                    currentTurn,
                    combatPhase,
                    enemies,
                    pendingMove
                };
            }
        };`,
        context
    );

    const state7 = {
        turnSequence: 7,
        player: { x: 1, y: 2 },
        enemies: [{ uid: 'bandit', hp: 20, alive: true }],
        allies: [],
        rogues: [],
        parties: {},
        activeActorUid: 'player_0',
        actionsRemaining: 1
    };
    const authority7 = context.authorityApi.register(state7);
    assert.equal(context.authorityApi.sync(state7, authority7), true);

    const state8 = {
        ...state7,
        turnSequence: 8,
        enemies: [{ uid: 'bandit', hp: 15, alive: true }],
        activeActorUid: 'mercenary_1',
        actionsRemaining: 2
    };
    const authority8 = context.authorityApi.register(state8);
    assert.equal(context.authorityApi.sync(state8, authority8), true);

    // A no-state settlement is local presentation cleanup, not sequence zero.
    assert.equal(context.authorityApi.settle(null, authority8), true);
    let state = context.authorityApi.read();
    assert.equal(state.activeCombatActorUid, 'mercenary_1');
    assert.equal(state.combatActionsRemaining, 2);
    assert.equal(state.currentTurn, 'PLAYER');
    assert.equal(state.combatPhase, 'ACTION_READY');

    // A same-sequence receipt is newer by arrival order. The older movie may
    // still paint its snapshot, but may not restore its stale action controls.
    context.authorityApi.register({ turnSequence: 8 });
    context.authorityApi.setControls(null, 0);
    const lateMovieState = {
        ...state8,
        enemies: [{ uid: 'bandit', hp: 11, alive: true }],
        activeActorUid: 'mercenary_1',
        actionsRemaining: 2
    };
    assert.equal(
        context.authorityApi.sync(lateMovieState, authority8),
        false
    );
    state = context.authorityApi.read();
    assert.equal(state.activeCombatActorUid, null);
    assert.equal(state.combatActionsRemaining, 0);
    assert.equal(state.enemies[0].hp, 11);

    assert.equal(context.authorityApi.sync(state7), false);
    state = context.authorityApi.read();
    assert.equal(state.activeCombatActorUid, null);
    assert.equal(state.combatActionsRemaining, 0);
    assert.equal(state.enemies[0].hp, 20);
});

test('combat results apply authoritative player and acting-unit stamina immediately', () => {
    const player = {
        uid: 'player_0',
        kind: 'player',
        username: 'Knight',
        stamina: 40,
        hp: 60
    };
    const ally = {
        uid: 'merc_1',
        kind: 'ally',
        stamina: 30
    };
    const context = vm.createContext({
        Object,
        Number,
        player,
        enemies: [],
        allies: [ally],
        rogues: []
    });
    vm.runInContext(
        `${extractFunction(mainSource, 'getCombatActorByUid')}
        ${extractFunction(mainSource, 'applyAuthoritativeCombatResultState')}
        this.resultStateApi = applyAuthoritativeCombatResultState;`,
        context
    );

    const playerSource = context.resultStateApi({
        actorUid: 'player_0',
        type: 'miss',
        deflectReason: 'armor',
        newStamina: 17,
        updatedPlayer: { hp: 52, stamina: 99 }
    });
    assert.equal(playerSource, player);
    assert.equal(player.hp, 52);
    assert.equal(player.stamina, 17);

    const allySource = context.resultStateApi({
        actorUid: 'merc_1',
        type: 'hit',
        source: 'equipment',
        action: { id: 'shield_bash' },
        newStamina: 11,
        updatedPlayer: { hp: 52, stamina: 17 }
    });
    assert.equal(allySource, ally);
    assert.equal(ally.stamina, 11);
    assert.equal(player.stamina, 17);

    const actorlessErrorSource = context.resultStateApi({
        type: 'error',
        newStamina: 9,
        updatedCombatState: { activeActorUid: 'merc_1' }
    });
    assert.equal(actorlessErrorSource, ally);
    assert.equal(ally.stamina, 9);
    assert.equal(player.stamina, 17);

    context.resultStateApi({
        actorUid: 'missing_ally',
        type: 'hit',
        newStamina: 3,
        updatedPlayer: { hp: 48, stamina: 15 }
    });
    assert.equal(player.hp, 48);
    assert.equal(player.stamina, 15);
});

test('playback acknowledgements carry their token and emit exactly once', () => {
    const emitted = [];
    const context = vm.createContext({
        Object,
        String,
        socket: {
            emit(eventName, payload) {
                emitted.push({ eventName, payload });
            }
        }
    });
    vm.runInContext(
        `const acknowledgedCombatPlaybackIds = new Set();
        const pendingCombatPlaybackIds = new Set();
        ${extractFunction(mainSource, 'acknowledgeCombatPlayback')}
        ${extractFunction(mainSource, 'trackCombatPlayback')}
        ${extractFunction(mainSource, 'cancelPendingCombatPlaybacks')}
        this.playbackApi = {
            acknowledge: acknowledgeCombatPlayback,
            track: trackCombatPlayback,
            cancelAll: cancelPendingCombatPlaybacks
        };`,
        context
    );

    assert.equal(context.playbackApi.track(42), true);
    context.playbackApi.cancelAll();
    assert.equal(context.playbackApi.acknowledge('42'), false);
    assert.equal(context.playbackApi.track('42'), false);
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].eventName, 'clientPlaybackComplete');
    assert.equal(emitted[0].payload.playbackId, '42');
});

test('cancelled outgoing hit settles and acknowledges without applying impact', () => {
    const calls = {
        action: null,
        finalized: 0,
        tracked: [],
        acknowledged: [],
        impacts: 0
    };
    const sourceActor = { uid: 'player_0', x: 1, y: 1 };
    const context = vm.createContext({
        Object,
        Number,
        Boolean,
        Math,
        FXEngine: {},
        createCombatPlaybackBarrier,
        getCombatResultWeapon() {
            return { spriteId: 'weap_sword' };
        },
        getCombatResultAnimationProfile() {
            return { clipId: 'slash', lift: false };
        },
        getCombatResultTarget() {
            return { x: 3, y: 1 };
        },
        startCombatSpriteActionWhenReady(actor, options) {
            calls.action = { actor, options };
        },
        applyOutgoingCombatImpact() {
            calls.impacts++;
        },
        finalizeOutgoingCombatAction() {
            calls.finalized++;
        },
        trackCombatPlayback(playbackId) {
            calls.tracked.push(playbackId);
        },
        acknowledgeCombatPlayback(playbackId) {
            calls.acknowledged.push(playbackId);
        }
    });
    vm.runInContext(
        `${extractFunction(mainSource, 'playOutgoingCombatHit')}
        this.playHit = playOutgoingCombatHit;`,
        context
    );

    context.playHit(
        {
            type: 'hit',
            source: 'weapon',
            targets: [{ uid: 'bandit', damage: 4 }],
            playbackId: 'combat-playback-hit-cancel'
        },
        sourceActor,
        { turnSequence: 3 },
        { revision: 1, turnSequence: 3, stale: false }
    );
    calls.action.options.onCancel();
    calls.action.options.onCancel();
    calls.action.options.onEvent();
    calls.action.options.onComplete();

    assert.equal(calls.finalized, 1);
    assert.equal(calls.impacts, 0);
    assert.deepEqual(calls.tracked, ['combat-playback-hit-cancel']);
    assert.deepEqual(calls.acknowledged, [
        'combat-playback-hit-cancel'
    ]);
});

function createElement(id, style = {}) {
    return {
        id,
        style: { ...style },
        value: '',
        textContent: '',
        attributes: {},
        children: [],
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        querySelector() {
            return null;
        },
        insertBefore(child) {
            this.children.push(child);
        }
    };
}

test('disconnect recovery clears combat and returns to login without retaining a password', () => {
    const elements = new Map();
    const login = createElement('login-screen', { display: 'none' });
    const dashboard = createElement('dashboard');
    login.querySelector = selector => (
        selector === '.dashboard-panel' ? dashboard : null
    );
    login.insertBefore = child => {
        login.children.push(child);
        elements.set(child.id, child);
    };
    elements.set(login.id, login);
    elements.set(
        'main-game-container',
        createElement('main-game-container', { display: 'flex' })
    );
    elements.set(
        'char-creation-screen',
        createElement('char-creation-screen', { display: 'none' })
    );
    elements.set(
        'combat-screen',
        createElement('combat-screen', { display: 'block' })
    );
    const staticGold = createElement('static-gold-display');
    staticGold.hidden = false;
    elements.set(staticGold.id, staticGold);
    const username = createElement('char-name-input');
    const password = createElement('char-pass-input');
    password.value = 'do-not-retain-this';
    elements.set(username.id, username);
    elements.set(password.id, password);

    const calls = {
        playbackCancel: 0,
        spriteRetryCancel: 0,
        animationClear: 0,
        tooltipHide: 0,
        scroll: 0
    };
    const context = vm.createContext({
        document: {
            getElementById(id) {
                return elements.get(id) || null;
            },
            createElement() {
                return createElement('');
            }
        },
        window: {
            scrollTo() {
                calls.scroll++;
            }
        },
        player: { username: 'TestKnight' },
        gameState: 'COMBAT',
        currentTurn: 'PLAYER',
        combatPhase: 'WAITING_FOR_SERVER',
        activeCombatActorUid: 'player_0',
        combatActionsRemaining: 1,
        pendingMove: { x: 2, y: 3 },
        selectedEnemy: { uid: 'bandit' },
        reachableTiles: new Set(['2,3']),
        enemies: [{ uid: 'bandit' }],
        allies: [{ uid: 'mercenary' }],
        rogues: [],
        combatParties: { PLAYER: {} },
        activeCombatFloorTiles: [{}],
        pendingLoot: [{}],
        combatConnectionRecoveryPending: false,
        combatPlaybackGeneration: 5,
        latestCombatTurnSequence: 9,
        combatAuthorityRevision: 4,
        acknowledgedCombatPlaybackIds: new Set(['old']),
        pendingCombatPlaybackIds: new Set(['pending']),
        cancelPendingCombatPlaybacks() {
            calls.playbackCancel++;
        },
        cancelPendingCombatSpriteActions() {
            calls.spriteRetryCancel++;
        },
        CombatSpriteAnimation: {
            clear() {
                calls.animationClear++;
            }
        },
        hideTooltip() {
            calls.tooltipHide++;
        },
        setGameState(state) {
            context.gameState = state;
        }
    });
    vm.runInContext(
        `${extractFunction(mainSource, 'setCombatConnectionRecoveryMessage')}
        ${extractFunction(mainSource, 'recoverDiscardedSocketSession')}
        this.recover = recoverDiscardedSocketSession;`,
        context
    );

    assert.equal(context.recover(), true);
    assert.equal(context.gameState, 'LOGIN');
    assert.equal(context.currentTurn, 'ENEMY');
    assert.equal(context.combatPhase, 'DISCONNECTED');
    assert.equal(context.activeCombatActorUid, null);
    assert.equal(context.combatActionsRemaining, 0);
    assert.equal(elements.get('main-game-container').style.display, 'none');
    assert.equal(elements.get('combat-screen').style.display, 'none');
    assert.equal(login.style.display, 'block');
    assert.equal(staticGold.hidden, true);
    assert.equal(username.value, 'TestKnight');
    assert.equal(password.value, '');
    assert.match(
        elements.get('connection-recovery-message').textContent,
        /password was not retained/i
    );
    assert.deepEqual(
        [
            calls.playbackCancel,
            calls.spriteRetryCancel,
            calls.animationClear,
            calls.tooltipHide,
            calls.scroll
        ],
        [1, 1, 1, 1, 1]
    );
    assert.equal(context.recover(), false);
});

test('enemy movie receipts acknowledge tokenized playback and no bare ack remains', () => {
    const handlerStart = mainSource.indexOf(
        "socket.on('enemyTurnReceipt'"
    );
    const handlerEnd = mainSource.indexOf(
        '// Global Game States',
        handlerStart
    );
    assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
    const enemyHandler = mainSource.slice(handlerStart, handlerEnd);

    assert.match(
        enemyHandler,
        /trackCombatPlayback\(receipt\.playbackId\)/
    );
    assert.match(
        enemyHandler,
        /finally\s*\{[\s\S]*acknowledgeCombatPlayback\(receipt\.playbackId\)/
    );
    assert.match(
        enemyHandler,
        /isEnemyReceiptPlaybackCurrent[\s\S]*canApplyCombatControls\(null, authority\)/
    );
    assert.doesNotMatch(
        mainSource,
        /socket\.emit\(\s*['"]clientPlaybackComplete['"]\s*\)/
    );
    assert.match(
        mainSource,
        /socket\.on\('disconnect',[\s\S]*recoverDiscardedSocketSession\(\)/
    );
});

test('town cleanup invalidates delayed combat playback before clearing animations', () => {
    const transitionStart = combatMechanicsSource.indexOf(
        'window.transitionToTown = function()'
    );
    assert.ok(transitionStart >= 0);
    const transitionSource = combatMechanicsSource.slice(transitionStart);
    const stateExitIndex = transitionSource.indexOf(
        "setGameState('TOWN')"
    );
    const generationIndex = transitionSource.indexOf(
        'combatPlaybackGeneration += 1'
    );
    const playbackCancelIndex = transitionSource.indexOf(
        'cancelPendingCombatPlaybacks()'
    );
    const animationClearIndex = transitionSource.indexOf(
        'CombatSpriteAnimation.clear()'
    );

    assert.ok(stateExitIndex >= 0);
    assert.ok(generationIndex > stateExitIndex);
    assert.ok(playbackCancelIndex > generationIndex);
    assert.ok(animationClearIndex > playbackCancelIndex);
});
