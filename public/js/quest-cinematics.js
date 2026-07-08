// --- js/quest-cinematics.js ---
// Guided mock quest/cutscene player. This engine renders QuestScripts content
// but never mutates real stats, inventory, equipment, combat state, loot, or saves.

const QuestCinematics = (() => {
    const DEFAULT_TILE_SIZE = 54;
    const DEFAULT_GRID = { cols: 16, rows: 10 };
    const DEFAULT_FLOOR = "ground_wilderness";
    const DEFAULT_ACTORS = {
        kregStart: { x: 1, y: 4 }
    };

    let active = false;
    let previousGameState = "KNIGHT";
    let sceneIndex = 0;
    let sceneStartedAt = 0;
    let actionStartedAt = 0;
    let rafId = null;
    let currentScript = null;
    let currentSession = null;
    let tileSize = DEFAULT_TILE_SIZE;
    let grid = DEFAULT_GRID;
    let actors = DEFAULT_ACTORS;
    let floorSpriteId = DEFAULT_FLOOR;
    let floorTiles = [];
    let obstacles = [];
    let waitingForInput = false;
    let actionTriggered = false;
    let mockTargetSelected = false;
    let targetingMode = null;
    let shakeUntil = 0;
    let flashUntil = 0;
    let pendingAdvanceTimer = null;

    function start(questId) {
        if (active || currentSession) return;
        if (typeof socket === "undefined") {
            logQuestMessage("Quest server unavailable.");
            return;
        }

        socket.emit("questStartRequest", { questId });
    }

    function startAuthorized(receipt) {
        if (!receipt || !receipt.success) {
            logQuestMessage(receipt && receipt.message ? receipt.message : "Quest unavailable.");
            return;
        }

        const script = typeof QuestScripts !== "undefined" ? QuestScripts[receipt.scriptId] : null;
        if (!script || !Array.isArray(script.scenes) || script.scenes.length === 0) {
            logQuestMessage("Quest script missing scenes.");
            return;
        }

        currentScript = script;
        currentSession = {
            questId: receipt.questId,
            completionToken: receipt.completionToken,
            persistCompletion: !!receipt.persistCompletion,
            hasRewards: !!receipt.hasRewards
        };

        tileSize = script.tileSize || DEFAULT_TILE_SIZE;
        grid = script.grid || DEFAULT_GRID;
        actors = script.actors || DEFAULT_ACTORS;
        floorSpriteId = script.floorSpriteId || DEFAULT_FLOOR;
        floorTiles = Array.isArray(script.floorTiles) ? script.floorTiles : [];
        obstacles = Array.isArray(script.obstacles) ? script.obstacles : [];

        previousGameState = typeof gameState !== "undefined" ? gameState : "KNIGHT";
        if (typeof gameState !== "undefined") gameState = "CINEMATIC";
        if (typeof refreshSystemUI === "function") refreshSystemUI();

        showOverlay(true);
        playDialogueSequence(script.introDialogue || [], () => startMovie());
    }

    function startMovie() {
        active = true;
        sceneIndex = 0;
        mockTargetSelected = false;
        enterScene(0);
        loop();
    }

    function enterScene(nextIndex) {
        clearPendingAdvance();
        sceneIndex = nextIndex;
        sceneStartedAt = performance.now();
        actionStartedAt = 0;
        actionTriggered = false;
        waitingForInput = false;
        targetingMode = null;

        const scene = getScene();
        if (!scene) {
            finishMovie();
            return;
        }

        if (scene.requiredAction === "selectTarget") mockTargetSelected = false;
        if (scene.effects && scene.effects.includes("fadeIn")) flashUntil = performance.now() + 240;

        applySceneUI();
        playDialogueSequence(scene.dialogue || [], () => {
            waitingForInput = true;
            applySceneUI();
            if (!scene.requiredAction || scene.requiredAction === "continue") {
                completeSceneAction("continue");
            }
        });
    }

    function performAction(action) {
        if (!active || !waitingForInput) return;

        const scene = getScene();
        if (!scene) return;

        if (action === "prepBomb" && scene.requiredAction === "bomb") {
            targetingMode = "bomb";
            applySceneUI();
            if (typeof playRetroSound === "function") playRetroSound("menu");
            return;
        }

        if (scene.requiredAction === "attack" && action === "attack" && scene.requiresTarget && !mockTargetSelected) {
            logQuestMessage("Select the target first.");
            if (typeof playRetroSound === "function") playRetroSound("error");
            return;
        }

        if (action !== scene.requiredAction) {
            if (typeof playRetroSound === "function") playRetroSound("error");
            return;
        }

        completeSceneAction(action);
    }

    function canvasClick(event) {
        if (!active || !waitingForInput) return;

        const scene = getScene();
        if (!scene) return;

        const tile = getCanvasTile(event);
        if (!tile) return;

        if (scene.requiredAction === "selectTarget" && isEnemyTile(scene.enemy, tile.x, tile.y)) {
            mockTargetSelected = true;
            completeSceneAction("selectTarget");
            return;
        }

        if (targetingMode === "bomb") {
            const targetTile = scene.targetTile || scene.enemy || tile;
            if (tile.x === targetTile.x && tile.y === targetTile.y) {
                completeSceneAction("bomb");
                return;
            }
            if (typeof playRetroSound === "function") playRetroSound("error");
        }
    }

    function completeSceneAction(action) {
        const scene = getScene();
        if (!scene) return;

        waitingForInput = false;
        targetingMode = null;
        actionTriggered = true;
        actionStartedAt = performance.now();

        if (action === "selectTarget") mockTargetSelected = true;
        if (action === "pass" && typeof playRetroSound === "function") playRetroSound("menu");
        if (action === "brew" && typeof playRetroSound === "function") playRetroSound("statUp");
        if (action === "attack" && typeof playRetroSound === "function") playRetroSound("attack");
        if (action === "bomb" && typeof playRetroSound === "function") playRetroSound("heavyAttack");
        if (scene.effects && scene.effects.includes("shake")) {
            shakeUntil = performance.now() + 950;
        }
        if (scene.effects && scene.effects.includes("flash")) {
            flashUntil = performance.now() + 750;
        }
        if (action === "brace") {
            if (typeof playRetroSound === "function") playRetroSound("heavyAttack");
            shakeUntil = Math.max(shakeUntil, performance.now() + 950);
            flashUntil = Math.max(flashUntil, performance.now() + 750);
        }

        applySceneUI();

        const delay = Number.isFinite(scene.autoAdvanceMs) ? scene.autoAdvanceMs : 900;
        pendingAdvanceTimer = setTimeout(() => {
            if (!active) return;
            if (sceneIndex >= currentScript.scenes.length - 1) finishMovie();
            else enterScene(sceneIndex + 1);
        }, delay);
    }

    function skipCurrent() {
        if (active) finishMovie();
    }

    function finishMovie() {
        if (!currentScript) return;

        active = false;
        waitingForInput = false;
        targetingMode = null;
        clearPendingAdvance();
        cancelAnimationFrame(rafId);
        rafId = null;
        showOverlay(false);

        playDialogueSequence(currentScript.outroDialogue || [], () => completeQuest());
    }

    function completeQuest() {
        if (typeof socket !== "undefined" && currentSession) {
            socket.emit("questCompleteRequest", {
                questId: currentSession.questId,
                completionToken: currentSession.completionToken
            });
        }

        endQuest();
    }

    function endQuest() {
        currentScript = null;
        currentSession = null;
        if (typeof gameState !== "undefined") gameState = previousGameState || "KNIGHT";
        if (typeof setGameState === "function") setGameState("TOWN");
        else if (typeof refreshSystemUI === "function") refreshSystemUI();
    }

    function applySceneUI() {
        const scene = getScene();
        if (!scene) return;

        setText("quest-cinematic-title", scene.title || currentScript.title || "Quest Scene");
        setText("quest-cinematic-subtitle", scene.subtitle || "Mock quest scene");
        setText("quest-cinematic-phase", scene.phase || "Quest Scene");
        setText("quest-cinematic-target", getTargetLabel(scene));

        const status = document.getElementById("quest-cinematic-status");
        if (status) {
            if (!waitingForInput && !actionTriggered) status.innerText = "Listen to Kreg";
            else if (targetingMode === "bomb") status.innerText = "Click target tile";
            else if (waitingForInput) status.innerText = getRequiredActionLabel(scene);
            else status.innerText = "Action complete";
        }

        updateButton("quest-mock-pass-btn", scene.requiredAction === "pass", waitingForInput, "pass");
        updateButton("quest-mock-brew-btn", scene.requiredAction === "brew", waitingForInput, "brew");
        updateButton("quest-mock-attack-btn", scene.requiredAction === "attack", waitingForInput && (!scene.requiresTarget || mockTargetSelected), "attack");
        updateButton("quest-mock-bomb-btn", scene.requiredAction === "bomb", waitingForInput && targetingMode !== "bomb", "bomb");
        updateButton("quest-mock-brace-btn", scene.requiredAction === "brace", waitingForInput, "brace");

        const bombBtn = document.getElementById("quest-mock-bomb-btn");
        if (bombBtn && targetingMode === "bomb") {
            bombBtn.disabled = true;
            bombBtn.classList.remove("quest-required-action");
            bombBtn.innerText = "Targeting...";
        } else if (bombBtn) {
            bombBtn.innerText = "Throw Bomb";
        }
    }

    function updateButton(id, isRequired, enabled, actionName) {
        const button = document.getElementById(id);
        if (!button) return;
        button.disabled = !isRequired || !enabled;
        button.classList.toggle("quest-required-action", isRequired && enabled);
        button.classList.toggle("quest-locked-action", !isRequired || !enabled);
        button.setAttribute("data-action", actionName);
    }

    function loop() {
        if (!active) return;
        draw();
        rafId = requestAnimationFrame(loop);
    }

    function draw() {
        const canvas = document.getElementById("quest-cinematic-canvas");
        if (!canvas || !currentScript) return;

        const ctx = canvas.getContext("2d");
        const scene = getScene();
        if (!scene) return;

        const elapsed = performance.now() - sceneStartedAt;
        const actionElapsed = actionTriggered ? performance.now() - actionStartedAt : 0;
        const pulse = (Math.sin(performance.now() / 170) + 1) / 2;
        const shake = performance.now() < shakeUntil ? (Math.random() - 0.5) * 14 : 0;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(shake, -shake * 0.55);
        drawGrid(ctx);
        drawKreg(ctx, pulse);
        drawMockPlayer(ctx, scene, actionElapsed, pulse);
        drawEnemy(ctx, scene, elapsed, actionElapsed);
        drawSelectionGuides(ctx, scene, pulse);
        drawEffect(ctx, scene, actionElapsed);
        drawHud(ctx, scene);
        ctx.restore();

        drawCinematicOverlay(ctx, elapsed);
    }

    function drawGrid(ctx) {
        for (let x = 0; x < grid.cols; x++) {
            for (let y = 0; y < grid.rows; y++) {
                drawSprite(ctx, getFloorSpriteId(x, y), x * tileSize, y * tileSize, tileSize);
                ctx.strokeStyle = "#3a2f26";
                ctx.lineWidth = 1;
                ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }

        obstacles.forEach(obstacle => {
            drawSprite(ctx, obstacle.spriteId || getDefaultObstacleSprite(), obstacle.x * tileSize, obstacle.y * tileSize, tileSize);
        });
    }

    function drawKreg(ctx, pulse) {
        const kreg = actors.kregStart || DEFAULT_ACTORS.kregStart;
        drawSprite(ctx, "npc_kreg", kreg.x * tileSize, (kreg.y * tileSize) - (pulse * 4), tileSize);
        drawNameplate(ctx, "Kreg", kreg.x, kreg.y - 0.25, "#f1c40f");
    }

    function drawMockPlayer(ctx, scene, actionElapsed, pulse) {
        const p = scene.player;
        let offsetX = 0;
        let offsetY = -pulse * 3;

        if (scene.mode === "attack" && actionTriggered) offsetX = Math.sin(Math.min(actionElapsed / 360, 1) * Math.PI) * 16;
        if (scene.mode === "boss" && actionTriggered && actionElapsed > 900) offsetY += Math.min((actionElapsed - 900) / 18, 24);

        drawPlayerComposite(ctx, (p.x * tileSize) + offsetX, (p.y * tileSize) + offsetY, tileSize);

        if (scene.mode === "brew" && actionTriggered) drawSprite(ctx, "icon_stout", (p.x * tileSize) + 36, (p.y * tileSize) - 26, 26);
        if (scene.mode === "pass" && actionTriggered) drawFloatingText(ctx, "+15 STAM", p.x, p.y - 0.55, "#f1c40f");
        if (scene.mode === "brew" && actionTriggered) drawFloatingText(ctx, "+25% HP", p.x, p.y - 0.55, "#2ecc71");
        if (scene.mode === "boss" && actionTriggered && actionElapsed > 900) drawFloatingText(ctx, "KNOCKOUT", p.x, p.y - 0.65, "#e74c3c");
    }

    function drawEnemy(ctx, scene, elapsed, actionElapsed) {
        const enemy = scene.enemy;
        if (!enemy) return;

        const isBossHidden = scene.mode === "boss" && !actionTriggered;
        if (isBossHidden) {
            const target = scene.enemy;
            ctx.fillStyle = `rgba(231, 76, 60, ${0.18 + (Math.sin(elapsed / 120) + 1) * 0.08})`;
            ctx.fillRect(target.x * tileSize, target.y * tileSize, tileSize * (target.size || 1), tileSize * (target.size || 1));
            drawFloatingText(ctx, "WARNING", target.x + 0.5, target.y - 0.25, "#e74c3c");
            return;
        }

        const size = enemy.size || 1;
        let hop = Math.abs(Math.sin(performance.now() / 180)) * 5;
        if (scene.mode === "boss" && actionTriggered) hop += Math.max(0, 20 - (actionElapsed / 18));

        drawSprite(ctx, enemy.id, enemy.x * tileSize, (enemy.y * tileSize) - hop, tileSize * size);
        drawNameplate(ctx, enemy.name || enemy.id, enemy.x + ((size - 1) / 2), enemy.y - 0.2, "#e74c3c");
    }

    function drawSelectionGuides(ctx, scene, pulse) {
        if (!waitingForInput) return;

        if (scene.requiredAction === "selectTarget" && scene.enemy) {
            drawTilePulse(ctx, scene.enemy.x, scene.enemy.y, scene.enemy.size || 1, "#2ecc71", pulse);
        }

        if (targetingMode === "bomb") {
            const target = scene.targetTile || scene.enemy;
            drawAoe(ctx, target.x, target.y, "rgba(230, 126, 34, 0.20)");
            drawTilePulse(ctx, target.x, target.y, 1, "#e67e22", pulse);
        }

        if (mockTargetSelected && scene.enemy) {
            drawTilePulse(ctx, scene.enemy.x, scene.enemy.y, scene.enemy.size || 1, "#f1c40f", pulse * 0.5);
        }
    }

    function drawEffect(ctx, scene, actionElapsed) {
        const p = scene.player;
        const e = scene.enemy || {};

        if (scene.mode === "attack" && actionTriggered) {
            const progress = Math.min(actionElapsed / 450, 1);
            if (progress > 0.3 && progress < 0.95) {
                drawSlash(ctx, e.x, e.y, "#f4ebd9");
                drawFloatingText(ctx, "-12", e.x, e.y - 0.65, "#ffcc66");
            }
        }

        if (scene.mode === "bomb" && actionTriggered) {
            const progress = Math.min(actionElapsed / 650, 1);
            const target = scene.targetTile || e;
            const bx = p.x + ((target.x - p.x) * progress);
            const by = p.y + ((target.y - p.y) * progress);
            drawSprite(ctx, "icon_bomb_small", bx * tileSize, by * tileSize, 30);

            if (progress > 0.7) {
                drawAoe(ctx, target.x, target.y);
                drawFloatingText(ctx, "-45 AOE", target.x, target.y - 0.65, "#e67e22");
            }
        }

        if (scene.mode === "boss" && actionTriggered && actionElapsed > 450) {
            drawAoe(ctx, p.x, p.y, "rgba(231, 76, 60, 0.32)");
            drawSlash(ctx, p.x, p.y, "#e74c3c");
            drawFloatingText(ctx, "-999", p.x, p.y - 0.95, "#e74c3c");
        }
    }

    function drawHud(ctx, scene) {
        drawBar(ctx, 16, 16, 190, scene.player.hp, scene.player.maxHp, "#27ae60", "PROP HP");
        drawBar(ctx, 16, 42, 190, scene.player.stamina, scene.player.maxStamina, "#e67e22", "PROP STAMINA");
        if (scene.enemy) drawBar(ctx, 658, 16, 190, scene.enemy.hp, scene.enemy.maxHp, "#c0392b", "PROP TARGET");

        ctx.fillStyle = "rgba(17, 13, 10, 0.78)";
        ctx.fillRect(16, 484, 832, 38);
        ctx.strokeStyle = "#634e3d";
        ctx.strokeRect(16, 484, 832, 38);
        ctx.fillStyle = "#bbaaa0";
        ctx.font = "12px Courier New";
        ctx.fillText("Training props only. This mock fight cannot move items, loot, stats, health, or death state.", 28, 508);
    }

    function drawCinematicOverlay(ctx, elapsed) {
        const fadeInAlpha = Math.max(0, 1 - (elapsed / 600));
        if (fadeInAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${fadeInAlpha})`;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        if (performance.now() < flashUntil) {
            const alpha = Math.max(0, (flashUntil - performance.now()) / 750);
            ctx.fillStyle = `rgba(231, 76, 60, ${alpha * 0.38})`;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }

    function drawPlayerComposite(ctx, x, y, size) {
        const appearance = typeof player !== "undefined" && player && player.appearance ? player.appearance : {};
        const bodySprite = appearance.gender === "female" ? "body_female" : "body_male";
        drawSprite(ctx, bodySprite, x, y, size);
        drawSprite(ctx, appearance.eyes || "eyes_blue", x, y, size);
        drawSprite(ctx, appearance.hair || "hair_messy", x, y, size);
        drawSprite(ctx, "armor_tunic_" + (appearance.gender === "female" ? "female" : "male"), x, y, size);
        drawSprite(ctx, "sturdy_boots", x, y, size);
        drawSprite(ctx, "weap_rusty_mace", x, y, size);
    }

    function drawSprite(ctx, spriteId, x, y, size) {
        if (typeof SpriteMatrices === "undefined" || !SpriteMatrices[spriteId]) return;
        if (typeof drawOptimizedSprite === "function") {
            drawOptimizedSprite(ctx, spriteId, SpriteMatrices[spriteId], x, y, size);
        } else if (typeof drawProceduralSprite === "function") {
            drawProceduralSprite(ctx, SpriteMatrices[spriteId], x, y, size);
        }
    }

    function drawBar(ctx, x, y, width, current, max, color, label) {
        const ratio = Math.max(0, Math.min(1, current / max));
        ctx.fillStyle = "#110d0a";
        ctx.fillRect(x, y, width, 14);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width * ratio, 14);
        ctx.strokeStyle = "#634e3d";
        ctx.strokeRect(x, y, width, 14);
        ctx.fillStyle = "#f4ebd9";
        ctx.font = "10px Courier New";
        ctx.fillText(`${label}: ${current}/${max}`, x + 5, y + 10);
    }

    function drawNameplate(ctx, label, x, y, color) {
        ctx.fillStyle = color;
        ctx.font = "bold 11px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(label, (x * tileSize) + (tileSize / 2), y * tileSize);
        ctx.textAlign = "left";
    }

    function drawFloatingText(ctx, text, x, y, color) {
        ctx.fillStyle = color;
        ctx.font = "bold 16px Courier New";
        ctx.textAlign = "center";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 4;
        ctx.fillText(text, (x * tileSize) + (tileSize / 2), y * tileSize);
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";
    }

    function drawSlash(ctx, x, y, color) {
        ctx.save();
        ctx.translate((x * tileSize) + 26, (y * tileSize) + 26);
        ctx.rotate(-0.7);
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-22, -18);
        ctx.lineTo(22, 18);
        ctx.stroke();
        ctx.restore();
    }

    function drawAoe(ctx, x, y, color = "rgba(230, 126, 34, 0.35)") {
        ctx.fillStyle = color;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx >= 0 && tx < grid.cols && ty >= 0 && ty < grid.rows) {
                    ctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
                }
            }
        }
    }

    function drawTilePulse(ctx, x, y, size, color, pulse) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3 + (pulse * 2);
        ctx.strokeRect(
            (x * tileSize) + 4,
            (y * tileSize) + 4,
            (tileSize * size) - 8,
            (tileSize * size) - 8
        );
    }

    function getCanvasTile(event) {
        const canvas = document.getElementById("quest-cinematic-canvas");
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor(((event.clientX - rect.left) * scaleX) / tileSize);
        const y = Math.floor(((event.clientY - rect.top) * scaleY) / tileSize);
        if (x < 0 || x >= grid.cols || y < 0 || y >= grid.rows) return null;
        return { x, y };
    }

    function isEnemyTile(enemy, x, y) {
        if (!enemy) return false;
        const size = enemy.size || 1;
        return x >= enemy.x && x < enemy.x + size && y >= enemy.y && y < enemy.y + size;
    }

    function getScene() {
        return currentScript && currentScript.scenes ? currentScript.scenes[sceneIndex] : null;
    }

    function getFloorSpriteId(x, y) {
        const overrideTile = floorTiles.find(tile => tile.x === x && tile.y === y);
        return overrideTile && overrideTile.spriteId ? overrideTile.spriteId : floorSpriteId;
    }

    function getDefaultObstacleSprite() {
        if (floorSpriteId === "ground_cellars") return "map_broken_cask";
        if (floorSpriteId === "ground_abyss") return "map_pillar";
        if (floorSpriteId === "ground_arena") return "map_boulder";
        return "map_tree";
    }

    function getTargetLabel(scene) {
        if (scene.enemy && mockTargetSelected) return `Focus: ${scene.enemy.name || scene.enemy.id}`;
        if (scene.enemy) return `Target: ${scene.enemy.name || scene.enemy.id}`;
        return "No target";
    }

    function getRequiredActionLabel(scene) {
        const labels = {
            pass: "Click Pass Turn",
            brew: "Click Drink Brew",
            selectTarget: "Click the target",
            attack: "Click Attack",
            bomb: "Click Throw Bomb",
            brace: "Click Brace"
        };
        return labels[scene.requiredAction] || "Continue";
    }

    function showOverlay(visible) {
        const overlay = document.getElementById("quest-cinematic-overlay");
        if (!overlay) return;

        if (visible) {
            overlay.style.display = "flex";
            overlay.style.opacity = "0";
            requestAnimationFrame(() => {
                overlay.style.opacity = "1";
            });
        } else {
            overlay.style.opacity = "0";
            setTimeout(() => {
                if (!active) overlay.style.display = "none";
            }, 260);
        }
    }

    function clearPendingAdvance() {
        if (pendingAdvanceTimer) {
            clearTimeout(pendingAdvanceTimer);
            pendingAdvanceTimer = null;
        }
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    }

    function handleCompleteReceipt(receipt) {
        if (!receipt || !receipt.success) {
            logQuestMessage(receipt && receipt.message ? receipt.message : "Quest completion failed.");
            return;
        }
        if (receipt.updatedPlayer && typeof player !== "undefined") Object.assign(player, receipt.updatedPlayer);
        if (receipt.message && typeof logMessage === "function") logMessage(receipt.message);

        const action = receipt.completionAction;
        if (action && action.type === "combatZone" && action.zone && typeof transitionToCombat === "function") {
            transitionToCombat(action.zone);
        }
    }

    function logQuestMessage(message) {
        if (typeof logMessage === "function") logMessage(message);
    }

    if (typeof socket !== "undefined") {
        socket.on("questStartReceipt", startAuthorized);
        socket.on("questCompleteReceipt", handleCompleteReceipt);
    }

    return {
        start,
        performAction,
        canvasClick,
        skipCurrent
    };
})();

window.QuestCinematics = QuestCinematics;
