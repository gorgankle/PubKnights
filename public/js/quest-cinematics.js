// --- js/quest-cinematics.js ---
// Standalone mock quest/cutscene player. This file must not mutate player stats,
// inventory, equipment, combat state, loot, or server data.

const QuestCinematics = (() => {
    const TILE_SIZE = 54;
    const GRID = { cols: 16, rows: 10 };
    const PLAYER_START = { x: 2, y: 5 };
    const KREG_START = { x: 1, y: 4 };
    const RAVAGER_START = { x: 10, y: 5 };
    const BOSS_START = { x: 11, y: 4 };

    let active = false;
    let previousGameState = 'KNIGHT';
    let stepIndex = 0;
    let startedAt = 0;
    let rafId = null;
    let currentQuestId = null;

    const steps = [
        {
            title: "Passing Turn",
            subtitle: "Mock Combat Lesson",
            caption: "When you are boxed in or saving stamina, pass your turn to recover. No real stamina is changed here.",
            mode: "pass",
            player: { ...PLAYER_START, hp: 100, maxHp: 100, stamina: 40, maxStamina: 100, atb: 100 },
            enemy: { ...RAVAGER_START, id: "wild_ravager", hp: 100, maxHp: 100, atb: 55 }
        },
        {
            title: "Drinking Brews",
            subtitle: "Mock Combat Lesson",
            caption: "Combat brews are used during battle to heal or buff. This is a prop stout, not a real inventory item.",
            mode: "brew",
            player: { ...PLAYER_START, hp: 38, maxHp: 100, stamina: 65, maxStamina: 100, atb: 100 },
            enemy: { ...RAVAGER_START, id: "wild_ravager", hp: 100, maxHp: 100, atb: 42 }
        },
        {
            title: "Standard Attack",
            subtitle: "Mock Combat Lesson",
            caption: "Select an enemy in range, then use a regular attack. Range and line of sight matter in real combat.",
            mode: "attack",
            player: { x: 7, y: 5, hp: 100, maxHp: 100, stamina: 72, maxStamina: 100, atb: 100 },
            enemy: { x: 9, y: 5, id: "wild_ravager", hp: 78, maxHp: 100, atb: 30 }
        },
        {
            title: "AOE Bombs",
            subtitle: "Mock Combat Lesson",
            caption: "Bombs target an area, not just one creature. They are great for crowded tiles, but this one is only a prop.",
            mode: "bomb",
            player: { x: 6, y: 5, hp: 100, maxHp: 100, stamina: 68, maxStamina: 100, atb: 100 },
            enemy: { x: 10, y: 5, id: "wild_ravager", hp: 46, maxHp: 100, atb: 30 }
        },
        {
            title: "Death Preview",
            subtitle: "Mock Combat Lesson",
            caption: "Sometimes the wilds win. This knockout is staged, and your real character is safe.",
            mode: "boss",
            player: { x: 5, y: 5, hp: 22, maxHp: 100, stamina: 20, maxStamina: 100, atb: 15 },
            enemy: { ...BOSS_START, id: "wilderness_overlord", hp: 150, maxHp: 150, atb: 100, size: 2 }
        }
    ];

    const introDialogue = [
        { speaker: "Kreg", portraitId: "npc_kreg", text: "Alright, fresh face. Before the wilds get their teeth into you, I am borrowing the stage for a harmless training reel." },
        { speaker: "Kreg", portraitId: "npc_kreg", text: "Everything you see next is a prop. Fake brews, fake bombs, fake damage. You cannot sneak any of it into your pack." },
        { speaker: "Kreg", portraitId: "npc_kreg", text: "Click through each lesson. I will show you passing, healing, attacking, throwing a bomb, and the part everyone pretends they do not need explained." }
    ];

    const outroDialogue = [
        { speaker: "Kreg", portraitId: "npc_kreg", text: "And that, regrettably, is what it looks like when the boss cashes in your mistakes." },
        { speaker: "Kreg", portraitId: "npc_kreg", text: "In real combat, death can cost gear equipped on your Knight and items sitting in your backpack. Vaulted items stay safe." },
        { speaker: "Kreg", portraitId: "npc_kreg", text: "Your main tabs are simple: Knight for your character, Town for supplies, Exchange for trade, Adventures for deployments, Vault for safekeeping, and Community for other players." },
        { speaker: "Kreg", portraitId: "npc_kreg", text: "Now you are back in town. Try the Adventures board when you are ready, and put anything precious in the Vault before getting bold." }
    ];

    function start(questId) {
        if (active) return;
        if (questId !== "tutorial_kreg") return;

        currentQuestId = questId;
        previousGameState = typeof gameState !== 'undefined' ? gameState : 'KNIGHT';
        if (typeof gameState !== 'undefined') gameState = 'CINEMATIC';
        if (typeof refreshSystemUI === 'function') refreshSystemUI();

        playDialogueSequence(introDialogue, () => startMovie());
    }

    function startMovie() {
        active = true;
        stepIndex = 0;
        startedAt = performance.now();

        const overlay = document.getElementById('quest-cinematic-overlay');
        if (overlay) overlay.style.display = 'flex';

        applyStepText();
        loop();
    }

    function advance() {
        if (!active) return;

        if (stepIndex < steps.length - 1) {
            stepIndex++;
            startedAt = performance.now();
            applyStepText();
            if (typeof playRetroSound === 'function') playRetroSound('menu');
            return;
        }

        finishMovie();
    }

    function skipCurrent() {
        if (active) finishMovie();
    }

    function finishMovie() {
        active = false;
        cancelAnimationFrame(rafId);
        rafId = null;

        const overlay = document.getElementById('quest-cinematic-overlay');
        if (overlay) overlay.style.display = 'none';

        playDialogueSequence(outroDialogue, () => endQuest());
    }

    function endQuest() {
        currentQuestId = null;
        if (typeof gameState !== 'undefined') gameState = previousGameState || 'KNIGHT';
        if (typeof setGameState === 'function') setGameState('TOWN');
        else if (typeof refreshSystemUI === 'function') refreshSystemUI();
    }

    function applyStepText() {
        const step = steps[stepIndex];
        const title = document.getElementById('quest-cinematic-title');
        const subtitle = document.getElementById('quest-cinematic-subtitle');
        const caption = document.getElementById('quest-cinematic-caption');
        const nextBtn = document.getElementById('quest-cinematic-next-btn');

        if (title) title.innerText = step.title;
        if (subtitle) subtitle.innerText = step.subtitle;
        if (caption) caption.innerText = step.caption;
        if (nextBtn) nextBtn.innerText = stepIndex === steps.length - 1 ? "Return to Town" : "Continue";
    }

    function loop() {
        if (!active) return;
        draw();
        rafId = requestAnimationFrame(loop);
    }

    function draw() {
        const canvas = document.getElementById('quest-cinematic-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const step = steps[stepIndex];
        const elapsed = performance.now() - startedAt;
        const pulse = (Math.sin(elapsed / 170) + 1) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid(ctx);
        drawKreg(ctx, pulse);
        drawMockPlayer(ctx, step, elapsed, pulse);
        drawEnemy(ctx, step.enemy, elapsed);
        drawEffect(ctx, step, elapsed);
        drawHud(ctx, step);
    }

    function drawGrid(ctx) {
        for (let x = 0; x < GRID.cols; x++) {
            for (let y = 0; y < GRID.rows; y++) {
                drawSprite(ctx, 'ground_wilderness', x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#3a2f26';
                ctx.lineWidth = 1;
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }

        [
            { x: 4, y: 2 }, { x: 4, y: 7 }, { x: 8, y: 3 },
            { x: 8, y: 7 }, { x: 12, y: 2 }, { x: 13, y: 7 }
        ].forEach(obstacle => drawSprite(ctx, 'map_tree', obstacle.x * TILE_SIZE, obstacle.y * TILE_SIZE, TILE_SIZE));
    }

    function drawKreg(ctx, pulse) {
        drawSprite(ctx, 'npc_kreg', KREG_START.x * TILE_SIZE, (KREG_START.y * TILE_SIZE) - (pulse * 4), TILE_SIZE);
        drawNameplate(ctx, "Kreg", KREG_START.x, KREG_START.y - 0.25, '#f1c40f');
    }

    function drawMockPlayer(ctx, step, elapsed, pulse) {
        const p = step.player;
        let offsetX = 0;
        let offsetY = -pulse * 3;

        if (step.mode === "attack") offsetX = Math.sin(Math.min(elapsed / 280, 1) * Math.PI) * 16;
        if (step.mode === "boss" && elapsed > 900) offsetY += Math.min((elapsed - 900) / 20, 22);

        drawPlayerComposite(ctx, (p.x * TILE_SIZE) + offsetX, (p.y * TILE_SIZE) + offsetY, TILE_SIZE);

        if (step.mode === "brew") {
            drawSprite(ctx, 'icon_stout', (p.x * TILE_SIZE) + 36, (p.y * TILE_SIZE) - 26, 26);
        }
        if (step.mode === "pass") {
            drawFloatingText(ctx, "+15 STAM", p.x, p.y - 0.55, '#f1c40f');
        }
        if (step.mode === "brew") {
            drawFloatingText(ctx, "+25% HP", p.x, p.y - 0.55, '#2ecc71');
        }
        if (step.mode === "boss" && elapsed > 900) {
            drawFloatingText(ctx, "KNOCKOUT", p.x, p.y - 0.65, '#e74c3c');
        }
    }

    function drawEnemy(ctx, enemy, elapsed) {
        const size = enemy.size || 1;
        const hop = Math.abs(Math.sin(elapsed / 180)) * 5;
        drawSprite(ctx, enemy.id, enemy.x * TILE_SIZE, (enemy.y * TILE_SIZE) - hop, TILE_SIZE * size);
        drawNameplate(ctx, enemy.id === 'wilderness_overlord' ? 'Apex Overlord' : 'Training Ravager', enemy.x, enemy.y - 0.2, '#e74c3c');
    }

    function drawEffect(ctx, step, elapsed) {
        const p = step.player;
        const e = step.enemy;

        if (step.mode === "attack") {
            const progress = Math.min(elapsed / 450, 1);
            if (progress > 0.3 && progress < 0.95) {
                drawSlash(ctx, e.x, e.y, '#f4ebd9');
                drawFloatingText(ctx, "-12", e.x, e.y - 0.65, '#ffcc66');
            }
        }

        if (step.mode === "bomb") {
            const progress = Math.min(elapsed / 650, 1);
            const bx = p.x + ((e.x - p.x) * progress);
            const by = p.y + ((e.y - p.y) * progress);
            drawSprite(ctx, 'icon_bomb_small', bx * TILE_SIZE, by * TILE_SIZE, 30);

            if (progress > 0.7) {
                drawAoe(ctx, e.x, e.y);
                drawFloatingText(ctx, "-45 AOE", e.x, e.y - 0.65, '#e67e22');
            }
        }

        if (step.mode === "boss" && elapsed > 450) {
            drawAoe(ctx, p.x, p.y, 'rgba(231, 76, 60, 0.32)');
            drawSlash(ctx, p.x, p.y, '#e74c3c');
            drawFloatingText(ctx, "-999", p.x, p.y - 0.95, '#e74c3c');
        }
    }

    function drawHud(ctx, step) {
        drawBar(ctx, 16, 16, 190, step.player.hp, step.player.maxHp, '#27ae60', 'PROP HP');
        drawBar(ctx, 16, 42, 190, step.player.stamina, step.player.maxStamina, '#e67e22', 'PROP STAMINA');
        drawBar(ctx, 658, 16, 190, step.enemy.hp, step.enemy.maxHp, '#c0392b', 'PROP TARGET');

        ctx.fillStyle = 'rgba(17, 13, 10, 0.78)';
        ctx.fillRect(16, 484, 832, 38);
        ctx.strokeStyle = '#634e3d';
        ctx.strokeRect(16, 484, 832, 38);
        ctx.fillStyle = '#bbaaa0';
        ctx.font = '12px Courier New';
        ctx.fillText('Training props only. No inventory, stats, loot, death, or server save is touched.', 28, 508);
    }

    function drawPlayerComposite(ctx, x, y, size) {
        const appearance = player && player.appearance ? player.appearance : {};
        const bodySprite = appearance.gender === 'female' ? 'body_female' : 'body_male';
        drawSprite(ctx, bodySprite, x, y, size);
        drawSprite(ctx, appearance.eyes || 'eyes_blue', x, y, size);
        drawSprite(ctx, appearance.hair || 'hair_messy', x, y, size);
        drawSprite(ctx, 'armor_tunic_' + (appearance.gender === 'female' ? 'female' : 'male'), x, y, size);
        drawSprite(ctx, 'sturdy_boots', x, y, size);
        drawSprite(ctx, 'weap_rusty_mace', x, y, size);
    }

    function drawSprite(ctx, spriteId, x, y, size) {
        if (typeof SpriteMatrices === 'undefined' || !SpriteMatrices[spriteId]) return;
        if (typeof drawOptimizedSprite === 'function') {
            drawOptimizedSprite(ctx, spriteId, SpriteMatrices[spriteId], x, y, size);
        } else if (typeof drawProceduralSprite === 'function') {
            drawProceduralSprite(ctx, SpriteMatrices[spriteId], x, y, size);
        }
    }

    function drawBar(ctx, x, y, width, current, max, color, label) {
        const ratio = Math.max(0, Math.min(1, current / max));
        ctx.fillStyle = '#110d0a';
        ctx.fillRect(x, y, width, 14);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width * ratio, 14);
        ctx.strokeStyle = '#634e3d';
        ctx.strokeRect(x, y, width, 14);
        ctx.fillStyle = '#f4ebd9';
        ctx.font = '10px Courier New';
        ctx.fillText(`${label}: ${current}/${max}`, x + 5, y + 10);
    }

    function drawNameplate(ctx, label, x, y, color) {
        ctx.fillStyle = color;
        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(label, (x * TILE_SIZE) + (TILE_SIZE / 2), y * TILE_SIZE);
        ctx.textAlign = 'left';
    }

    function drawFloatingText(ctx, text, x, y, color) {
        ctx.fillStyle = color;
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(text, (x * TILE_SIZE) + (TILE_SIZE / 2), y * TILE_SIZE);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
    }

    function drawSlash(ctx, x, y, color) {
        ctx.save();
        ctx.translate((x * TILE_SIZE) + 26, (y * TILE_SIZE) + 26);
        ctx.rotate(-0.7);
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-22, -18);
        ctx.lineTo(22, 18);
        ctx.stroke();
        ctx.restore();
    }

    function drawAoe(ctx, x, y, color = 'rgba(230, 126, 34, 0.35)') {
        ctx.fillStyle = color;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx >= 0 && tx < GRID.cols && ty >= 0 && ty < GRID.rows) {
                    ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    return {
        start,
        advance,
        skipCurrent
    };
})();

window.QuestCinematics = QuestCinematics;
