// QuestRouter.js
const QuestDB = require('./questDatabase.js');
const { ItemDatabase } = require('./public/js/items.js');

module.exports = function(socket, io, activePlayers) {

    // === 1. TRIGGER EVALUATOR ===
    socket.on('checkQuestTriggers', (context) => {
        let p = activePlayers[socket.id];
        if (!p || p.activeQuest) return; // Ignore if already in a movie

        let triggeredQuest = null;

        if (context.triggerType === 'LOGIN' && (!p.completedQuests || !p.completedQuests.includes('tutorial_combat_intro'))) {
            triggeredQuest = 'tutorial_combat_intro';
        } else if (context.triggerType === 'TUTORIAL_DEATH') {
            triggeredQuest = 'tutorial_post_death';
        }

        if (triggeredQuest) {
            p.activeQuest = triggeredQuest;
            p.questStep = 0;
            executeCurrentStep(socket.id, p);
        }
    });

    // === 2. STEP EXECUTOR ===
    function executeCurrentStep(socketId, p) {
        let questManifest = QuestDB[p.activeQuest];
        if (!questManifest) return endQuest(socketId, p); 

        let currentEvent = questManifest[p.questStep];
        if (!currentEvent) return endQuest(socketId, p); 

        if (currentEvent.type === 'END_SCENE') {
            if (currentEvent.rewards && currentEvent.rewards.items) {
                currentEvent.rewards.items.forEach(itemId => {
                    let item = JSON.parse(JSON.stringify(ItemDatabase[itemId]));
                    p.inventory.push(item);
                });
            }
            return endQuest(socketId, p, currentEvent.action);
        }

        io.to(socketId).emit('questEvent', currentEvent);
    }

    // === 3. HANDSHAKE LISTENER ===
    socket.on('questStepComplete', () => {
        let p = activePlayers[socket.id];
        if (!p || !p.activeQuest) return;

        p.questStep++;
        executeCurrentStep(socket.id, p);
    });

    // === 4. CLEANUP ===
    function endQuest(socketId, p, endAction) {
        if (p.activeQuest) {
            if (!p.completedQuests) p.completedQuests = [];
            p.completedQuests.push(p.activeQuest);
        }
        
        p.activeQuest = null;
        p.questStep = 0;
        
        io.to(socketId).emit('questConcluded', { updatedPlayer: p, action: endAction });
    }
};