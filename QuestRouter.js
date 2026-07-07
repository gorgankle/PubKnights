// --- QuestRouter.js ---
const QuestDatabase = require('./questDatabase.js');

module.exports = function(socket, io, activePlayers) {
    let activeQuests = {}; 

    socket.on('startCinematic', (questId) => {
        let p = activePlayers[socket.id];
        if (!p) return;
        
        let manifest = QuestDatabase[questId];
        if (!manifest) {
            console.log(`❌ Cinematic Error: Quest ID ${questId} not found.`);
            return;
        }

        activeQuests[socket.id] = { id: questId, step: 0, manifest: manifest };
        p.activeQuest = questId; 

        socket.emit('questEvent', manifest[0]);
    });

    socket.on('questStepComplete', () => {
        let questInfo = activeQuests[socket.id];
        if (!questInfo) return; 

        let p = activePlayers[socket.id];
        questInfo.step++;
        let nextFrame = questInfo.manifest[questInfo.step];

        if (!nextFrame) {
            delete activeQuests[socket.id];
            if (p) delete p.activeQuest;
            socket.emit('questConcluded', { action: "NONE" });
            return;
        }

        if (nextFrame.type === 'END_SCENE') {
            delete activeQuests[socket.id];
            if (p) delete p.activeQuest;
            
            socket.emit('questConcluded', nextFrame);
        } else {
            socket.emit('questEvent', nextFrame);
        }
    });
};