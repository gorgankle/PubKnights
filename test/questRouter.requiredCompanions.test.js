const test = require('node:test');
const assert = require('node:assert/strict');

const { QuestDefinitions } = require('../questDefinitions.js');
const registerQuestRouter = require('../questRouter.js');

class FakeSocket {
    constructor(id) {
        this.id = id;
        this.handlers = new Map();
        this.emitted = [];
    }

    on(eventName, handler) {
        this.handlers.set(eventName, handler);
    }

    emit(eventName, payload) {
        this.emitted.push({ eventName, payload });
    }

    dispatch(eventName, payload) {
        const handler = this.handlers.get(eventName);
        assert.ok(handler, `Missing socket handler for ${eventName}`);
        handler(payload);
    }

    lastPayload(eventName) {
        const event = [...this.emitted].reverse().find(entry => entry.eventName === eventName);
        return event && event.payload;
    }
}

function startTutorialQuest(socketId, playerOverrides = {}) {
    const socket = new FakeSocket(socketId);
    const player = Object.assign({
        username: 'Quest Lock Tester',
        level: 1,
        quests: { completed: {} }
    }, playerOverrides);
    registerQuestRouter(socket, {}, { [socket.id]: player });
    socket.dispatch('questStartRequest', { questId: 'tutorial_kreg' });
    return { socket, player };
}

test('quest start copies only sanitized unique declared companion requirements into the session', t => {
    const questDef = QuestDefinitions.tutorial_kreg;
    const originallyDeclared = Object.prototype.hasOwnProperty.call(questDef, 'requiredCompanionIds');
    const originalValue = questDef.requiredCompanionIds;
    t.after(() => {
        if (originallyDeclared) questDef.requiredCompanionIds = originalValue;
        else delete questDef.requiredCompanionIds;
    });

    delete questDef.requiredCompanionIds;
    const ordinaryStart = startTutorialQuest('quest-without-lock');
    const ordinaryReceipt = ordinaryStart.socket.lastPayload('questStartReceipt');
    assert.equal(ordinaryReceipt.success, true);
    assert.equal(
        Object.prototype.hasOwnProperty.call(ordinaryStart.player.activeQuestSession, 'requiredCompanionIds'),
        false
    );
    assert.equal(Object.prototype.hasOwnProperty.call(ordinaryReceipt, 'requiredCompanionIds'), false);

    questDef.requiredCompanionIds = [];
    const emptyStart = startTutorialQuest('quest-with-empty-lock');
    const emptyReceipt = emptyStart.socket.lastPayload('questStartReceipt');
    assert.equal(emptyReceipt.success, true);
    assert.equal(Object.prototype.hasOwnProperty.call(emptyStart.player.activeQuestSession, 'requiredCompanionIds'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(emptyReceipt, 'requiredCompanionIds'), false);

    questDef.requiredCompanionIds = [
        ' merc_alpha ',
        'merc_alpha',
        'not valid!',
        null,
        'merc_beta',
        'x'.repeat(33),
        'merc_beta'
    ];
    const requiredStart = startTutorialQuest('quest-with-lock', {
        roster: {
            companions: [
                {
                    instanceId: 'merc_alpha',
                    templateId: 'merc_alpha',
                    name: 'Alpha',
                    active: true
                },
                {
                    instanceId: 'merc_gamma',
                    templateId: 'merc_gamma',
                    name: 'Gamma',
                    active: true
                }
            ],
            activeIds: ['merc_alpha', 'merc_gamma']
        }
    });

    const requiredReceipt = requiredStart.socket.lastPayload('questStartReceipt');
    assert.equal(requiredReceipt.success, true);
    assert.deepEqual(
        requiredStart.player.activeQuestSession.requiredCompanionIds,
        ['merc_alpha', 'merc_beta']
    );
    assert.deepEqual(requiredStart.player.roster.activeIds, ['merc_gamma']);
    assert.deepEqual(requiredReceipt.requiredCompanionIds, ['merc_alpha', 'merc_beta']);
});
