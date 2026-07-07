// --- QuestRouter.js ---
const QuestDatabase = require('./questDatabase.js');

module.exports = function(socket, io, activePlayers) {
    let activeQuests = {}; 

    // === NEW: THE LOGIN / RECONNECT HANDLER ===
    socket.on('checkQuestTriggers', (data) => {
        let p = activePlayers[socket.id];
        if (!p) return;

        // 1. RECONNECT LOGIC: Did they disconnect mid-quest? Resume it!
        if (p.activeQuest && QuestDatabase[p.activeQuest]) {
            let manifest = QuestDatabase[p.activeQuest];
            activeQuests[socket.id] = { id: p.activeQuest, step: 0, manifest: manifest };
            
            // Restart the scene from frame 0 for safety
            processAndEmitFrame(socket, p, manifest[0]);
            return;
        } 
        
        // 2. NEW PLAYER LOGIC: Is this their first time logging in?
        if (data.triggerType === 'LOGIN') {
            p.completedQuests = p.completedQuests || [];
            
            if (!p.completedQuests.includes('tutorial_combat_intro')) {
                // Lock them into the cinematic zone
                p.activeQuest = 'tutorial_combat_intro';
                p.questStep = 0;
                
                let manifest = QuestDatabase[p.activeQuest];
                activeQuests[socket.id] = { id: p.activeQuest, step: 0, manifest: manifest };
                
                processAndEmitFrame(socket, p, manifest[0]);
            }
        }
    });

    socket.on('startCinematic', (questId) => {
        let p = activePlayers[socket.id];
        if (!p) return;
        
        let manifest = QuestDatabase[questId];
        if (!manifest) return console.log(`❌ Cinematic Error: Quest ID ${questId} not found.`);

        activeQuests[socket.id] = { id: questId, step: 0, manifest: manifest };
        p.activeQuest = questId; 

        processAndEmitFrame(socket, p, manifest[0]);
    });

    socket.on('questStepComplete', () => {
        let questInfo = activeQuests[socket.id];
        if (!questInfo) return; 

        let p = activePlayers[socket.id];
        questInfo.step++;
        
        // Save their step progress to RAM so if they disconnect it is retained
        if (p) p.questStep = questInfo.step;

        let nextFrame = questInfo.manifest[questInfo.step];

        if (!nextFrame) {
            cleanupQuestState(socket.id, p);
            socket.emit('questConcluded', { action: "NONE" });
            return;
        }

        if (nextFrame.type === 'END_SCENE') {
            // === NEW: MARK AS COMPLETED IN THE DATABASE ===
            if (p) {
                p.completedQuests = p.completedQuests || [];
                if (!p.completedQuests.includes(questInfo.id)) {
                    p.completedQuests.push(questInfo.id);
                }
            }
            
            cleanupQuestState(socket.id, p);
            socket.emit('questConcluded', nextFrame);
        } else {
            processAndEmitFrame(socket, p, nextFrame);
        }
    });

    function cleanupQuestState(socketId, p) {
        delete activeQuests[socketId];
        if (p) {
            p.activeQuest = null;
            p.questStep = 0;
        }
    }

    function processAndEmitFrame(socket, p, frame) {
        socket.emit('questEvent', frame);
    }
};