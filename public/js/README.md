# Client JavaScript map

Pub Knights uses classic scripts rather than ES modules. Every file loaded by a
page shares one global scope, so script order is part of the client API. The
`<script>` lists in `public/*.html` are canonical; keep their relative order when
adding a new page or tool.

## Live-game load order

`index.html` loads the client in these dependency groups:

1. `audio.js`, then the gameplay catalogs: `spells.js`, `aura-assets.js`,
   `items.js`, `equipment-actions.js`, `npc-database.js`, and `lootTables.js`.
2. `player.js`, followed by the complete artwork chain shown below.
3. Socket.IO, then `main.js` and `inventory.js`.
4. UI and rendering: `ui-tooltips.js`, `companion-ui.js`, `ui-render.js`,
   `renderer.js`, `fx-engine.js`, `dialogue.js`, and `social.js`.
5. Login and feature controllers: `login.js`, `combat-maps.js`,
   `expeditions.js`, `combat-mechanics.js`, `town-actions.js`, `minigames.js`,
   and `spellbook.js`.

The public studios load smaller subsets and may order independent compatibility
families differently. Their HTML remains the authority for those subsets; keep
the dependency edges below intact.

## Artwork chain and ownership

Load artwork in this order when a page needs the complete registry:

```text
character-creator.js
item-assets.js
pet-assets.js
npc-assets.js
map-assets.js
icon-assets.js
sprite-overhaul.js
sprite-overhaul-equipment.js
sprite-overhaul-animation.js
humanoid-actor-visuals.js
combat-animation.js
sprite-overhaul-world.js
sprite-overhaul-icons.js
```

| File | Owns |
| --- | --- |
| `character-creator.js` | `PALETTE`, appearance choices, sprite helpers, and the initial ordered `SpriteMatrices` registry. |
| `item-assets.js`, `npc-assets.js`, `map-assets.js`, `icon-assets.js` | Compatibility entry points and historical `SpriteMatrices` key order, not final artwork. |
| `pet-assets.js` | Pet colors, pet UI helpers, and ordered `PetMatrices` keys. |
| `sprite-overhaul.js` | Final player body, face, hair, and core-player sample matrices plus shared 32x32 authoring helpers. |
| `sprite-overhaul-equipment.js` | Final equipment and weapon matrices, including paper-doll weapon projections. |
| `sprite-overhaul-animation.js` | Side-player and humanoid animation matrices and frame resolvers. |
| `humanoid-actor-visuals.js` | Actor visual profiles and humanoid drawing dispatch. |
| `combat-animation.js` | Combat animation selection, timelines, and playback. |
| `sprite-overhaul-world.js` | Final NPC, terrain, obstacle, minigame, pet, and world matrices; it also defines icon construction and registration. |
| `sprite-overhaul-icons.js` | Calls `registerIconOverhaulMatrices()` after world and equipment art exist, making the final inventory icons live. |

## Compatibility registries

The `undefined` entries in the small asset files are intentional. They reserve
keys in legacy insertion order so tool dropdowns, snapshots, and the live game
see a stable registry after later `Object.assign` calls replace their values.
Do not sort or remove those keys without updating the ordered-registry parity
tests. `npc-assets.js` deliberately keeps a real `icon_peanut` fallback because
Humanoid NPC Studio loads world art but omits the icon activation script.

Before changing a global name or page load sequence, run:

```text
node --test test/codeHygiene.test.js test/spriteOverhaulRegistry.test.js
```
