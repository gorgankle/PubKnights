// --- questDefinitions.js ---
// Server-owned quest metadata, eligibility, completion, and reward policy.

const QuestDefinitions = Object.freeze({
    tutorial_kreg: {
        id: "tutorial_kreg",
        scriptId: "tutorial_kreg",
        title: "Kreg's Combat Primer",
        type: "cinematic",
        persistCompletion: false,
        rewards: null,
        completionAction: null,
        requirements: {
            minLevel: 1
        }
    }
});

function getQuestDefinition(questId) {
    return QuestDefinitions[questId] || null;
}

module.exports = {
    QuestDefinitions,
    getQuestDefinition
};
