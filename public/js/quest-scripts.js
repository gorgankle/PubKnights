// --- js/quest-scripts.js ---
// Client-side quest/cinematic scripts. These are content definitions only.

const QuestScripts = Object.freeze({
    tutorial_kreg: {
        id: "tutorial_kreg",
        title: "Kreg's Combat Primer",
        tileSize: 54,
        grid: { cols: 16, rows: 10 },
        floorSpriteId: "ground_wilderness",
        actors: {
            playerStart: { x: 2, y: 5 },
            kregStart: { x: 1, y: 4 },
            ravagerStart: { x: 10, y: 5 },
            bossStart: { x: 11, y: 4 }
        },
        obstacles: [
            { x: 4, y: 2, spriteId: "map_tree" },
            { x: 4, y: 7, spriteId: "map_tree" },
            { x: 8, y: 3, spriteId: "map_tree" },
            { x: 8, y: 7, spriteId: "map_tree" },
            { x: 12, y: 2, spriteId: "map_tree" },
            { x: 13, y: 7, spriteId: "map_tree" }
        ],
        introDialogue: [
            { speaker: "Kreg", portraitId: "npc_kreg", text: "Alright, fresh face. This is a harmless training fight using props only. No real gear, loot, health, stamina, or inventory will be touched." },
            { speaker: "Kreg", portraitId: "npc_kreg", text: "I will talk you through each move, then you will click the same kind of combat control you will use in the wilds." }
        ],
        outroDialogue: [
            { speaker: "Kreg", portraitId: "npc_kreg", text: "And that, regrettably, is what it looks like when the boss cashes in your mistakes." },
            { speaker: "Kreg", portraitId: "npc_kreg", text: "In real combat, death can cost gear equipped on your Knight and items sitting in your backpack. Vaulted items stay safe." },
            { speaker: "Kreg", portraitId: "npc_kreg", text: "Your main tabs are Knight for your character, Town for supplies, Exchange for trade, Adventures for deployments, Vault for safekeeping, and Community for other players." },
            { speaker: "Kreg", portraitId: "npc_kreg", text: "Now you are back in town. Try the Adventures board when you are ready, and put anything precious in the Vault before getting bold." }
        ],
        scenes: [
            {
                id: "pass_turn",
                title: "Passing Turn",
                subtitle: "Phase 1: Recovery",
                phase: "PLAYER TURN - PHASE 1",
                mode: "pass",
                requiredAction: "pass",
                highlight: "pass",
                autoAdvanceMs: 950,
                dialogue: [
                    { speaker: "Kreg", portraitId: "npc_kreg", text: "First lesson: if you need to breathe, pass the turn. Click Pass Turn in the combat controls." }
                ],
                player: { x: 2, y: 5, hp: 100, maxHp: 100, stamina: 40, maxStamina: 100, atb: 100 },
                enemy: { x: 10, y: 5, id: "wild_ravager", name: "Training Ravager", hp: 100, maxHp: 100, atb: 55 }
            },
            {
                id: "drink_brew",
                title: "Drinking Brews",
                subtitle: "Backpack: Prop Consumable",
                phase: "PLAYER TURN - PHASE 2",
                mode: "brew",
                requiredAction: "brew",
                highlight: "brew",
                autoAdvanceMs: 1000,
                dialogue: [
                    { speaker: "Kreg", portraitId: "npc_kreg", text: "When your health is low, open your options and drink a brew. This stout is a prop, so it cannot be carried out." }
                ],
                player: { x: 2, y: 5, hp: 38, maxHp: 100, stamina: 65, maxStamina: 100, atb: 100 },
                enemy: { x: 10, y: 5, id: "wild_ravager", name: "Training Ravager", hp: 100, maxHp: 100, atb: 42 }
            },
            {
                id: "select_target",
                title: "Select Target",
                subtitle: "Phase 2: Target Lock",
                phase: "PLAYER TURN - PHASE 2",
                mode: "select",
                requiredAction: "selectTarget",
                highlight: "target",
                autoAdvanceMs: 700,
                dialogue: [
                    { speaker: "Kreg", portraitId: "npc_kreg", text: "Attacks need a focus. Click the Training Ravager on the grid to lock your target." }
                ],
                player: { x: 7, y: 5, hp: 100, maxHp: 100, stamina: 72, maxStamina: 100, atb: 100 },
                enemy: { x: 9, y: 5, id: "wild_ravager", name: "Training Ravager", hp: 78, maxHp: 100, atb: 30 }
            },
            {
                id: "standard_attack",
                title: "Standard Attack",
                subtitle: "Phase 2: Weapon Action",
                phase: "PLAYER TURN - PHASE 2",
                mode: "attack",
                requiredAction: "attack",
                highlight: "attack",
                requiresTarget: true,
                autoAdvanceMs: 1050,
                dialogue: [
                    { speaker: "Kreg", portraitId: "npc_kreg", text: "Good. Once a target is locked and in range, click Attack. Range and line of sight matter in real fights." }
                ],
                player: { x: 7, y: 5, hp: 100, maxHp: 100, stamina: 72, maxStamina: 100, atb: 100 },
                enemy: { x: 9, y: 5, id: "wild_ravager", name: "Training Ravager", hp: 78, maxHp: 100, atb: 30 }
            },
            {
                id: "throw_bomb",
                title: "AOE Bombs",
                subtitle: "Backpack: Targeted Throwable",
                phase: "TARGETING",
                mode: "bomb",
                requiredAction: "bomb",
                highlight: "bomb",
                autoAdvanceMs: 1200,
                dialogue: [
                    { speaker: "Kreg", portraitId: "npc_kreg", text: "Bombs are aimed at a tile and splash nearby spaces. Click Throw Bomb, then click the glowing target tile." }
                ],
                player: { x: 6, y: 5, hp: 100, maxHp: 100, stamina: 68, maxStamina: 100, atb: 100 },
                enemy: { x: 10, y: 5, id: "wild_ravager", name: "Training Ravager", hp: 46, maxHp: 100, atb: 30 },
                targetTile: { x: 10, y: 5 }
            },
            {
                id: "boss_arrival",
                title: "Death Preview",
                subtitle: "Staged Boss Interruption",
                phase: "WARNING",
                mode: "boss",
                requiredAction: "brace",
                highlight: "brace",
                autoAdvanceMs: 2300,
                effects: ["fadeIn", "shake", "flash"],
                dialogue: [
                    { speaker: "Kreg", portraitId: "npc_kreg", text: "Last lesson: sometimes the map has teeth. Click Brace and watch what happens when something much bigger takes a turn." }
                ],
                player: { x: 5, y: 5, hp: 22, maxHp: 100, stamina: 20, maxStamina: 100, atb: 15 },
                enemy: { x: 11, y: 4, id: "wilderness_overlord", name: "Apex Overlord", hp: 150, maxHp: 150, atb: 100, size: 2 }
            }
        ]
    }
});

window.QuestScripts = QuestScripts;
