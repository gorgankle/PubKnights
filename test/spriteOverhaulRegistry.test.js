const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runScript(context, filename) {
    const source = fs.readFileSync(
        path.join(__dirname, '..', 'public', 'js', filename),
        'utf8'
    );
    vm.runInContext(source, context, { filename });
}

const CHARACTER_COMPATIBILITY_KEYS = [
    'body_male',
    'body_female',
    'hair_messy',
    'hair_long',
    'hair_bob',
    'hair_braid',
    'hair_spiky',
    'hair_buzzcut',
    'hair_mohawk',
    'hair_undercut',
    'hair_topknot',
    'hair_curly',
    'hair_twintails',
    'hair_ponytail',
    'hair_bald',
    'eyes_blue',
    'eyes_green',
    'eyes_brown',
    'eyes_red',
    'eyes_purple',
    'eyes_gold',
    'eyes_grey',
    'eyes_black',
    'eyes_white'
];

const NPC_COMPATIBILITY_KEYS = [
    'npc_kreg',
    'goblin_axeling',
    'peanut_slinger',
    'icon_peanut',
    'magic_banana',
    'wild_ravager',
    'publing',
    'alpha_poacher',
    'wilderness_overlord',
    'corrupted_cask',
    'pub_crawl_mimic',
    'chummed_mimic',
    'vintage_behemoth',
    'enraged_gorilla',
    'spectral_barfly',
    'mash_crawler',
    'eldritch_keg'
];

function loadCompleteOverhaul() {
    const context = vm.createContext({
        window: { addEventListener() {} },
        setTimeout() {},
        player: {
            appearance: {
                gender: 'male',
                skin: 'light',
                hairColor: 'brown',
                eyes: 'eyes_blue',
                shirtColor: 'blue',
                pantsColor: 'dark',
                bootsColor: 'leather'
            },
            equipment: {},
            pet: {
                type: 'dog',
                furColor: 'brown',
                collarColor: 'red'
            }
        }
    });

    [
        'character-creator.js',
        'items.js',
        'item-assets.js',
        'npc-assets.js',
        'map-assets.js',
        'icon-assets.js',
        'pet-assets.js'
    ].forEach(filename => runScript(context, filename));

    vm.runInContext(`
        globalThis.__legacySpriteRefs = Object.fromEntries(Object.entries(SpriteMatrices));
        globalThis.__legacyPetRefs = Object.fromEntries(Object.entries(PetMatrices));
    `, context);

    runScript(context, 'sprite-overhaul.js');
    runScript(context, 'sprite-overhaul-equipment.js');
    runScript(context, 'sprite-overhaul-world.js');

    vm.runInContext(`
        globalThis.__iconRegistryTypeBeforeEntryPoint = typeof IconOverhaulMatrices;
        globalThis.__peanutBeforeIconEntryPoint = SpriteMatrices.icon_peanut;
    `, context);
    runScript(context, 'sprite-overhaul-icons.js');

    return context;
}

test('the item compatibility registry preserves legacy tool ordering without duplicate artwork', () => {
    const context = vm.createContext({ SpriteMatrices: {} });
    runScript(context, 'item-assets.js');

    const result = vm.runInContext(`({
        keys: Object.keys(SpriteMatrices),
        values: Object.values(SpriteMatrices)
    })`, context);

    assert.deepEqual(Array.from(result.keys), [
        'hunter_bow',
        'weap_bone',
        'gloves_scavenger',
        'boots_chewed',
        'armor_beastmaster_male',
        'armor_beastmaster_female',
        'helm_alpha',
        'armor_tunic_male',
        'armor_tunic_female',
        'armor_boar_hide_male',
        'armor_boar_hide_female',
        'armor_oak_barrel_male',
        'armor_oak_barrel_female',
        'helm_rusty_coif',
        'wilderness_cloak',
        'primate_armor',
        'gloves_leather_mitts',
        'poachers_grips',
        'cellar_guard',
        'boots_hide',
        'sturdy_boots',
        'hop_infused_boots',
        'boots_cellar',
        'weap_rusty_mace',
        'weap_machete',
        'weap_behemoth_maw',
        'weap_mimic_dagger',
        'brewmasters_club',
        'weap_spear',
        'silverback_greatclub',
        'armor_pubserker_male',
        'armor_pubserker_female',
        'helm_pubserker',
        'gloves_pubserker',
        'boots_pubserker',
        'weap_knuckles',
        'armor_beerglass_male',
        'armor_beerglass_female',
        'helm_beerglass',
        'gloves_beerglass',
        'boots_beerglass',
        'weap_beerglass',
        'armor_tankard_male',
        'armor_tankard_female',
        'helm_tankard',
        'gloves_tankard',
        'boots_tankard',
        'weap_tankard',
        'armor_cask_plate_male',
        'armor_cask_plate_female',
        'armor_blackout_male',
        'armor_blackout_female',
        'helm_blackout',
        'gloves_blackout',
        'boots_blackout',
        'weap_blackout'
    ]);
    assert.equal(Array.from(result.values).every(value => value === undefined), true);
});

test('character, NPC, and pet compatibility registries keep their public order', () => {
    const context = vm.createContext({
        window: { addEventListener() {} },
        setTimeout() {}
    });
    ['character-creator.js', 'npc-assets.js', 'pet-assets.js']
        .forEach(filename => runScript(context, filename));

    const result = vm.runInContext(`(() => {
        const characterKeys = ${JSON.stringify(CHARACTER_COMPATIBILITY_KEYS)};
        const npcKeys = ${JSON.stringify(NPC_COMPATIBILITY_KEYS)};
        return {
            spriteKeys: Object.keys(SpriteMatrices),
            petKeys: Object.keys(PetMatrices),
            unresolvedCharacters: characterKeys
                .filter(key => SpriteMatrices[key] !== undefined),
            unresolvedNpcPlaceholders: npcKeys
                .filter(key => key !== 'icon_peanut')
                .filter(key => SpriteMatrices[key] !== undefined),
            peanutIsNative: SpriteMatrices.icon_peanut.length === 32
                && SpriteMatrices.icon_peanut.every(row => row.length === 32),
            petValues: Object.values(PetMatrices)
        };
    })()`, context);

    assert.deepEqual(
        Array.from(result.spriteKeys),
        CHARACTER_COMPATIBILITY_KEYS.concat(NPC_COMPATIBILITY_KEYS)
    );
    assert.deepEqual(Array.from(result.petKeys), ['dog', 'cat']);
    assert.deepEqual(Array.from(result.unresolvedCharacters), []);
    assert.deepEqual(Array.from(result.unresolvedNpcPlaceholders), []);
    assert.equal(result.peanutIsNative, true);
    assert.equal(Array.from(result.petValues).every(value => value === undefined), true);
});

test('the combined icon implementation preserves its separate public activation point', () => {
    const context = loadCompleteOverhaul();
    const result = vm.runInContext(`({
        beforeEntryPoint: __iconRegistryTypeBeforeEntryPoint,
        afterEntryPoint: typeof IconOverhaulMatrices,
        aliasTarget: IconOverhaulAliases.icon_icon_voucher,
        voucherIsAliased:
            IconOverhaulMatrices.icon_icon_voucher
            === IconOverhaulMatrices.icon_voucher,
        studioPeanutWasPreserved:
            __peanutBeforeIconEntryPoint === __legacySpriteRefs.icon_peanut,
        livePeanutUsesIconOverhaul:
            SpriteMatrices.icon_peanut === IconOverhaulMatrices.icon_peanut
    })`, context);

    assert.equal(result.beforeEntryPoint, 'undefined');
    assert.equal(result.afterEntryPoint, 'object');
    assert.equal(result.aliasTarget, 'icon_voucher');
    assert.equal(result.voucherIsAliased, true);
    assert.equal(result.studioPeanutWasPreserved, true);
    assert.equal(result.livePeanutUsesIconOverhaul, true);
});

test('native registries replace every compatibility family without reordering it', () => {
    const context = loadCompleteOverhaul();
    const result = vm.runInContext(`(() => {
        const characterKeys = ${JSON.stringify(CHARACTER_COMPATIBILITY_KEYS)};
        const npcKeys = ${JSON.stringify(NPC_COMPATIBILITY_KEYS)};
        const spriteKeys = Object.keys(SpriteMatrices);
        return {
            characterOrder: spriteKeys.filter(key => characterKeys.includes(key)),
            npcOrder: spriteKeys.filter(key => npcKeys.includes(key)),
            petOrder: Object.keys(PetMatrices),
            bodiesMatch:
                SpriteMatrices.body_male === CorePlayerSampleMatrices.body_core_male
                && SpriteMatrices.body_female === CorePlayerSampleMatrices.body_core_female,
            eyesMatch: characterKeys
                .filter(key => key.startsWith('eyes_'))
                .every(key => SpriteMatrices[key] === CorePlayerSampleMatrices.face_core),
            hairMismatches: CorePlayerHairStyleOptions
                .filter(({ runtimeId, sampleId }) =>
                    SpriteMatrices[runtimeId] !== CorePlayerSampleMatrices[sampleId]
                )
                .map(({ runtimeId }) => runtimeId),
            worldNpcMismatches: npcKeys
                .filter(key => key !== 'icon_peanut')
                .filter(key => SpriteMatrices[key] !== WorldOverhaulMatrices[key]),
            petsMatch:
                PetMatrices.dog === PetOverhaulMatrices.dog
                && PetMatrices.cat === PetOverhaulMatrices.cat,
            peanutMatches: SpriteMatrices.icon_peanut === IconOverhaulMatrices.icon_peanut
        };
    })()`, context);

    assert.deepEqual(Array.from(result.characterOrder), CHARACTER_COMPATIBILITY_KEYS);
    assert.deepEqual(Array.from(result.npcOrder), NPC_COMPATIBILITY_KEYS);
    assert.deepEqual(Array.from(result.petOrder), ['dog', 'cat']);
    assert.equal(result.bodiesMatch, true);
    assert.equal(result.eyesMatch, true);
    assert.deepEqual(Array.from(result.hairMismatches), []);
    assert.deepEqual(Array.from(result.worldNpcMismatches), []);
    assert.equal(result.petsMatch, true);
    assert.equal(result.peanutMatches, true);
});

test('the native overhaul replaces every legacy sprite and pet matrix', () => {
    const context = loadCompleteOverhaul();
    const result = vm.runInContext(`(() => ({
        legacySpriteCount: Object.keys(__legacySpriteRefs).length,
        unchangedSprites: Object.keys(__legacySpriteRefs)
            .filter(key => __legacySpriteRefs[key] === SpriteMatrices[key]),
        unchangedPets: Object.keys(__legacyPetRefs)
            .filter(key => __legacyPetRefs[key] === PetMatrices[key])
    }))()`, context);

    assert.ok(result.legacySpriteCount > 0);
    assert.equal(result.unchangedSprites.length, 0);
    assert.equal(result.unchangedPets.length, 0);
});

test('the complete sprite registry is native 32x32 and palette-valid', () => {
    const context = loadCompleteOverhaul();
    const result = vm.runInContext(`(() => {
        const matrices = Object.values(SpriteMatrices);
        const usedKeys = new Set(matrices.flat(2));
        return {
            registryCount: matrices.length,
            allNative: matrices.every(matrix =>
                matrix.length === 32 && matrix.every(row => row.length === 32)
            ),
            missingPaletteKeys: Array.from(usedKeys)
                .filter(key => !Object.prototype.hasOwnProperty.call(PALETTE, key))
        };
    })()`, context);

    assert.ok(result.registryCount >= 260);
    assert.equal(result.allNative, true);
    assert.equal(result.missingPaletteKeys.length, 0);
});

test('every inventory item resolves to a rebuilt icon', () => {
    const context = loadCompleteOverhaul();
    const missingIcons = vm.runInContext(`Object.values(ItemDatabase)
        .map(item => 'icon_' + (item.spriteId || item.id))
        .filter(iconId => !IconOverhaulMatrices[iconId] || !SpriteMatrices[iconId])`, context);

    assert.equal(missingIcons.length, 0);
});

test('equipment icons omit runtime-only hair eraser pixels', () => {
    const context = loadCompleteOverhaul();
    const leakingIconIds = vm.runInContext(`(() => (
        Object.keys(EquipmentOverhaulSpecs.helmet)
            .map(spriteId => 'icon_' + spriteId)
            .filter(iconId =>
                SpriteMatrices[iconId].some(row => row.includes('_'))
            )
    ))()`, context);

    assert.equal(leakingIconIds.length, 0);
});

test('world and pet overhaul registries cover their complete legacy families', () => {
    const context = loadCompleteOverhaul();
    const result = vm.runInContext(`(() => ({
        worldCount: Object.keys(WorldOverhaulMatrices).length,
        iconCount: Object.keys(IconOverhaulMatrices).length,
        petCount: Object.keys(PetOverhaulMatrices).length,
        petKeys: Array.from(new Set(Object.values(PetOverhaulMatrices).flat(2))).sort()
    }))()`, context);

    assert.equal(result.worldCount, 32);
    assert.ok(result.iconCount >= 100);
    assert.equal(result.petCount, 2);
    assert.equal(
        result.petKeys.every(key => ['.', 'b', 'c', 'f', 'o', 'w'].includes(key)),
        true
    );
});
