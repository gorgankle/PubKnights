const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');

function readProjectFile(relativePath) {
    return fs.readFileSync(
        path.join(projectRoot, ...relativePath.split('/')),
        'utf8'
    );
}

test('the live game loads the shared humanoid stack in dependency order', () => {
    const indexSource = readProjectFile('public/index.html');
    const npcIndex = indexSource.indexOf('npc-database.js?v=');
    const characterIndex = indexSource.indexOf(
        'character-creator.js?v='
    );
    const equipmentIndex = indexSource.indexOf(
        'sprite-overhaul-equipment.js?v='
    );
    const animationIndex = indexSource.indexOf(
        'sprite-overhaul-animation.js?v='
    );
    const profilesIndex = indexSource.indexOf(
        'humanoid-actor-visuals.js?v='
    );
    const controllerIndex = indexSource.indexOf(
        'combat-animation.js?v='
    );
    const mainIndex = indexSource.indexOf('main.js?v=');
    const rendererIndex = indexSource.indexOf('renderer.js?v=');

    assert.ok(npcIndex >= 0);
    assert.ok(characterIndex > npcIndex);
    assert.ok(equipmentIndex > characterIndex);
    assert.ok(animationIndex > equipmentIndex);
    assert.ok(profilesIndex > animationIndex);
    assert.ok(controllerIndex > profilesIndex);
    assert.ok(mainIndex > controllerIndex);
    assert.ok(rendererIndex > mainIndex);
});

test('one renderer path serves players, mercenaries, and profiled enemies', () => {
    const rendererSource = readProjectFile('public/js/renderer.js');

    assert.match(
        rendererSource,
        /function drawHumanoidCombatActor\(/
    );
    assert.match(
        rendererSource,
        /resolveHumanoidActorVisualProfile/
    );
    assert.match(
        rendererSource,
        /drawHumanoidAnimationFrame/
    );
    assert.match(
        rendererSource,
        /hasHumanoidTerminalPose\(e\)/
    );
    assert.match(
        rendererSource,
        /hasHumanoidTerminalPose\(actor\)/
    );
    assert.match(
        rendererSource,
        /drawHumanoidCombatActor\(\s*ctx,\s*player/
    );
    assert.match(
        rendererSource,
        /drawHumanoidCombatActor\(\s*ctx,\s*e/
    );
    assert.match(
        rendererSource,
        /drawHumanoidCombatActor\(\s*ctx,\s*actor/
    );

    // Existing bosses and nonhumanoids retain their static-matrix fallback.
    assert.match(rendererSource, /SpriteMatrices\[e\.id\]/);
    assert.match(rendererSource, /SpriteMatrices\[actor\.id\]/);
});

test('combat playback starts shared attacks and impact reactions', () => {
    const mainSource = readProjectFile('public/js/main.js');

    assert.match(
        mainSource,
        /function playHumanoidImpactReaction\(/
    );
    assert.match(
        mainSource,
        /CombatSpriteAnimation\.startHitReaction/
    );
    assert.match(
        mainSource,
        /CombatSpriteAnimation\.startDefeat/
    );
    assert.match(
        mainSource,
        /resolveHumanoidActorActionClip/
    );
    assert.match(
        mainSource,
        /startCombatSpriteActionWhenReady\(\s*sourceActor/
    );
    assert.match(
        mainSource,
        /playbackRate: 1 \//
    );
    assert.match(
        mainSource,
        /getEnemyEventPlaybackDuration\(ev\) \* timeCompression/
    );
    assert.match(
        mainSource,
        /playHumanoidImpactReaction\(\s*target,\s*targetData\.killed/
    );
});

test('Sprite Tester exposes all Wave 1 profiles, clips, and both facings', () => {
    const testerSource = readProjectFile('public/sprite-tester.html');

    [
        'data-side-clip="hit"',
        'data-side-clip="defeat"',
        'id="humanoid-wave1-grid"',
        "visualProfileId: 'mercenary_default'",
        "visualProfileId: 'melee_bandit'",
        "visualProfileId: 'bandit_archer'",
        "visualProfileId: 'hedge_mage'",
        "['right', 'left'].forEach",
        'resolveHumanoidActorVisualProfile(actor)',
        'drawHumanoidAnimationFrame',
        'combat-animation.js?v=',
        'startHumanoidWave1ActorClip',
        'CombatSpriteAnimation.getRenderState',
        'dataset.humanoidControllerStudy',
        'appearance: visual.appearance',
        'humanoid-actor-visuals.js?v='
    ].forEach(fragment => {
        assert.ok(
            testerSource.includes(fragment),
            `Sprite Tester is missing ${fragment}`
        );
    });
});

test('standard humanoid prototypes now participate in Wilderness progression', () => {
    const {
        WILDERNESS_STANDARD_ENEMY_ROTATIONS
    } = require('../combatEncounters.js');
    const encounterSource = readProjectFile('combatEncounters.js');
    const mapTemplateSource = readProjectFile('combatMapTemplates.js');
    const rotatedIds = new Set(
        Object.values(WILDERNESS_STANDARD_ENEMY_ROTATIONS).flat()
    );

    [
        'goblin_axeling',
        'melee_bandit',
        'bandit_archer',
        'hedge_mage',
        'alpha_poacher'
    ].forEach(enemyId => {
        assert.equal(
            rotatedIds.has(enemyId),
            true,
            `${enemyId} is missing from production encounter rotation`
        );
    });
    assert.doesNotMatch(encounterSource, /baitedEnemies|mapBaited/);
    assert.doesNotMatch(mapTemplateSource, /alpha_poacher/);
});
