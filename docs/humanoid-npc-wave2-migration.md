# Wave 2 humanoid NPC migration

Wave 2 inventories the current 17 enemy templates, two bespoke combat NPCs,
and the generic mercenary. "Migrated" means the actor uses the shared native
32x32 body, equipment layers, animation clips, authored timeline events, and
per-actor controller state. Combat statistics and AI remain in their existing
server-side definitions.

| Definition | Classification | Wave 2 disposition |
| --- | --- | --- |
| `starter_mercenary` / `companion_marlow` | Standard humanoid | Already shared and live as `mercenary_default` |
| `goblin_axeling` | Standard humanoid | Migrated and live |
| `melee_bandit` | Standard humanoid | Migrated and added to wilderness rotation |
| `bandit_archer` | Standard humanoid | Migrated and added to wilderness rotation |
| `hedge_mage` | Standard humanoid | Migrated and added to wilderness rotation |
| `alpha_poacher` | Standard humanoid elite | Migrated into the normal high-level wilderness rotation |
| `npc_kreg` | Special named humanoid | Deferred: healer/innkeeper AI and identity need a special profile |
| `cellar_dweller` | Special named humanoid | Deferred: boss-event rogue needs a special profile |
| `peanut_slinger` | Nonhumanoid squirrel | Deferred to creature rigs |
| `magic_banana` | Nonhumanoid magical object | Deferred |
| `wild_ravager` | Nonhumanoid quadruped | Deferred to creature rigs |
| `publing` | Nonhumanoid bear miniboss | Deferred to creature/boss rigs |
| `wilderness_overlord` | Oversized nonhumanoid boar boss | Deferred |
| `corrupted_cask` | Nonhumanoid construct | Deferred |
| `pub_crawl_mimic` | Nonhumanoid mimic | Deferred |
| `vintage_behemoth` | Oversized nonhumanoid construct boss | Deferred |
| `enraged_gorilla` | Nonhumanoid creature | Deferred |
| `spectral_barfly` | Nonhumanoid flying spirit | Deferred |
| `mash_crawler` | Nonhumanoid crawler | Deferred |
| `eldritch_keg` | Nonhumanoid construct | Deferred |
| `chummed_mimic` visual-only registry entry | Nonhumanoid orphan variant | Deferred; not an enemy template or reachable encounter |

There are no ordinary guards, cultists, raiders, thugs, civilian townsfolk, or
oversized humanoid bosses in the current game data. They should be introduced
later as new data-driven profiles instead of being inferred from unrelated
creature definitions.

## Shared visual contract

Each standard humanoid profile defines:

- body gender and front body sprite;
- hair, face, skin, and clothing palette;
- helmet, armor, gloves, boots, and weapon descriptors;
- the shared `humanoid_standard_32` animation set and equipped-weapon attack
  selection;
- optional per-clip weapon/release offsets and front/back weapon or hair-layer
  overrides.

The profile contains no HP, offense, defense, speed, range, rewards, or AI
settings. Nonhumanoids and the two named special humanoids retain their legacy
sprite fallback until their own later-wave rigs or special profiles exist.

`drawWorldActorSprite` is the canonical front/world entry point. It resolves a
standard humanoid profile into the same paper-doll layers used by combat and
falls back to the legacy matrix registry only when no shared profile exists.
The current game has no placed roaming enemy dataset, so the NPC Studio lineup
is also the production front-versus-side comparison surface.
