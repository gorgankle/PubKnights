# Wave 3 advanced humanoid migration

Wave 3 extends the existing native 32x32 humanoid paper doll rather than
introducing another animation engine or character-specific sprite sheets. The
shared contract now covers advanced main-hand families, two-handed grips,
offhands, shields, defensive reactions, and sparse stance/anchor overrides.
Combat statistics, AI, collision size, targeting, and encounter rules remain
separate from visual profiles.

## Advanced humanoid audit and disposition

Wave 2 deferred two existing special humanoids. Both fit the shared body,
equipment, and controller architecture and are now live:

| Definition | Classification | Wave 3 disposition |
| --- | --- | --- |
| `npc_kreg` | Named support humanoid | Shared `standard` stance and cast/heal presentation; live as the allied healer in Wilderness level 20 |
| `cellar_dweller` | Named agile humanoid | Shared `agile` stance and dual-wield presentation; live as the rogue in Cellars level 20 |

The representative Wave 3 profiles have now moved from Studio-only studies
into production encounter rotations. Their combat statistics, spawn rules,
and rewards remain server-side data; the profiles below still contain visual
appearance only.

| Actor / visual profile | Stance | Main hand | Offhand | Primary clips | Production placement |
| --- | --- | --- | --- | --- | --- |
| `shield_guard_captain` | `armored` | `weap_machete` | `offhand_captains_shield` | `slash`, `shield_block` | Cellars levels 6–19 |
| `tankard_brute` | `heavy` | `weap_tankard` | None | `heavy` | Cellars levels 12–19 |
| `harvest_champion` | `armored` | `pitchfork_spear` | None | `thrust` | Wilderness levels 12–19 |
| `cellar_duelist` / `cellar_dweller` | `agile` | `weap_mimic_dagger` | `offhand_parrying_dagger` | `dual_wield` | Hostile Cellar Duelist at levels 9–19 |
| `cult_champion` | `heavy` | `scythe_of_reaping` | None | `scythe` | Abyss depth 3 and deeper |
| `cellar_dweller` | `agile` | `weap_mimic_dagger` | `offhand_parrying_dagger` | `dual_wield` | Original rogue in Cellars level 20 |
| `npc_kreg` | `standard` | None | None | `cast` | Live Wilderness level 20 encounter and Studio |

`cellar_duelist` is a new hostile combat definition that deliberately reuses
the Cellar Dweller's agile visual profile. It does not replace or retune the
named Cellar Dweller: the original level-20 rogue, rogue AI, loot-stealing
role, team, and reward-ineligible behavior are preserved. Kreg likewise keeps
his existing allied-healer role.

The captain's ordinary attack remains the shared one-handed slash and its
defensive reaction uses `shield_block`. `shield_bash` remains available in the
Humanoid NPC Studio and shared animation contract for a future authored
gameplay action; the current AI does not invent an extra bash attack or apply
additional damage.

## Weapon-family and handedness migration

Every main-hand weapon now declares `handedness` and `animationFamily`.
Two-handed items additionally expose `twoHanded: true` for equipment
validation. Action-level `animType` values select the same families without
changing range, cost, multiplier, damage, status effects, or targeting.

| Family | Handedness | Item IDs | Notes |
| --- | --- | --- | --- |
| `shoot` | Two | `hunter_bow` | Existing projectile and release behavior retained |
| `bash` | One | `bone_fetch_club`, `rusty_mace`, `pubserker_knuckles` | Bone Club and Rusty Mace keep their existing Heavy Smash gameplay action but present it with the one-handed `bash` clip; Knuckles remain `bash` |
| `slash` | One | `scavenged_machete`, `sawblade_chakram` | Sawblade remains a melee weapon; no projectile behavior was invented |
| `thrust` | Two | `hunters_spear`, `harpoon_trident`, `pitchfork_spear` | One shared spear, harpoon, trident, and pitchfork motion |
| `dagger` | One | `mimic_fang_dagger`, `beerglass_shiv` | Compact stab/slash motion |
| `heavy` | Two | `behemoth_maw_crusher`, `brewmasters_club`, `silverback_greatclub`, `tankard_maul`, `blackout_axe`, `axe_timberlord` | Shared greatclub, maul, and greataxe silhouette |
| `scythe` | Two | `scythe_of_reaping` | Shared sweep used for standard and area-action presentation |
| `cast` | Two | `apprentice_staff`, `bogwood_staff`, `stormcaller_staff`, `last_call_voidstaff` | Existing spell and release behavior retained |

`weap_goblin_axe` remains a one-handed `slash` visual in the equipment
registry. This explicit distinction prevents the Goblin Axe from inheriting
the two-handed behavior of the relic axes merely because all three are axes.
The Silverback Great-Club can use the shared `heavy` item presentation when
equipped by a humanoid, but the Enraged Gorilla itself remains a deferred
nonhumanoid actor.

All four authored offhand visuals are now production items and can appear in
enemy loot. They use the existing sixth equipment slot and hand-compatibility
rules; equipping any offhand while a two-handed main hand is equipped safely
stows the conflicting item.

| Item | Sprite | Rarity | Combat stats | Value |
| --- | --- | --- | --- | --- |
| `round_shield` | `offhand_round_shield` | Uncommon | Defense +3 | 35 gold |
| `captains_shield` | `offhand_captains_shield` | Rare | Defense +7 | 90 gold |
| `tower_shield` | `offhand_tower_shield` | Epic | Defense +14, Speed -1 | 180 gold |
| `parrying_dagger` | `offhand_parrying_dagger` | Epic | Offense +5, Speed +1 | 140 gold |

The shield items use `offhandType: shield`; the parrying dagger uses
`offhandType: weapon`, one-handed equipment semantics, and the shared
`dual_wield` family. These bonuses are ordinary equipment statistics, not
animation data. Shield blocks remain reactions to the existing deflect result,
and dual wield still emits one gameplay contact event.

## Shared stance and anchor contract

`HumanoidStanceProfiles` provides four reusable visual profiles:

- `standard`: the unchanged baseline body and equipment alignment;
- `armored`: shield/offhand offsets for guarded silhouettes;
- `agile`: compact main-hand and offhand offsets for dagger actions;
- `heavy`: sparse offsets for heavy and scythe grips.

All stances keep `visualScale: 1`. They do not resize collision tiles, target
footprints, or the native 32x32 artwork. A profile merges only narrow
per-clip anchor and layer overrides; it never copies a full pose matrix.

The shared frame contract exposes `weaponHand`, `supportWeaponHand`,
`offhandHand`, `supportHand`, head, and foot anchors. Profile overrides may
adjust `weapon`, `release`, `frontWeapon`, `offhand`, and `frontOffhand`.
Two-handed weapon poses use both weapon-hand anchors. Offhand equipment uses
its own anchor and may render `back`, `underHands`, or `front`.

Shield and parrying-weapon matrices are generated as native 32x32 pixel art
from reusable equipment specifications. Rear shields render behind the body;
front or braced shields render after armor but before the appropriate hand
and foreground equipment. Main-hand weapons marked two-handed suppress the
offhand in profile resolution and rendering, preventing invalid overlap.
Mirroring is applied to the composed actor so hand, shield, and weapon depth
remain consistent in both facings.

The offhand slot is part of the shared player, mercenary, inventory, tooltip,
combat-sidebar, social, dialogue-portrait, world, and combat-render contracts.
Server and client hydration repair old or corrupt two-handed-plus-offhand
loadouts by stowing the offhand in the shared backpack instead of deleting it.
This repair is idempotent and may temporarily exceed backpack capacity rather
than discard saved equipment.

`visualScale` remains a renderer-only stance value. A size-two combat actor
with `visualScale: 1` keeps a one-tile paper doll centered inside its two-tile
collision and targeting footprint; release sockets are derived from those
visual bounds rather than stretching the artwork.

## Authored timeline contract

Existing `slash`, `bash`, `shoot`, `cast`, `hit`, and `defeat` timing remains
unchanged. Wave 3 adds:

| Clip | Frames / FPS | Authored event | Total duration | Phase notes |
| --- | --- | --- | --- | --- |
| `thrust` | 5 / 8 | Contact at frame 2 (250 ms) | 625 ms | Wind-up through frame 1; recovery begins at 3 |
| `heavy` | 6 / 6 | Contact at frame 3 (500 ms) | 1000 ms | Readable powerful wind-up through frame 2 |
| `dagger` | 5 / 10 | Contact at frame 2 (200 ms) | 500 ms | Fast wind-up and compact recovery |
| `scythe` | 6 / 7 | Contact at frame 3 (~429 ms) | ~857 ms | Powerful sweep; recovery begins at 4 |
| `shield_block` | 4 / 8 | Guard at frame 1 (125 ms) | 500 ms | Guard is visually active through frame 2 |
| `shield_bash` | 5 / 8 | Contact at frame 2 (250 ms) | 625 ms | Shield advances, contacts, and returns |
| `dual_wield` | 6 / 10 | Contact at frame 2 (200 ms) | 600 ms | Frame 3 is a second visual strike only |

Dual wield deliberately emits one gameplay contact event. The second strike
is visual follow-through, so the animation does not double damage or change
combat balance. Shield block uses the defensive-reaction path and may
interrupt an eligible action; defeat, cleanup, and actor removal still clear
the per-actor state. All runtime state remains keyed by actor UID, allowing
multiple advanced humanoids to animate and face targets independently.

Live action selection resolves explicit actions first, then compatible
offhand weapons, then the equipped main-hand family. Two-handed weapons always
retain their authored family and suppress offhands. Shield defenses begin
during the incoming wind-up, reach their guard frame at the authored impact,
and keep the combat event open through their recovery. Melee damage,
projectile release, spell release, deflection, hit reaction, and defeat remain
bound to timeline callbacks. Playback barriers and pending-action retries are
cancellable, so target changes, actor replacement, combat exit, and late
projectile callbacks cannot leave a stale actor frozen or apply an old visual
event to a new combat.

## Verification checklist

- [x] Every new clip has unique native 32x32 frames for male and female bodies.
- [x] Every prototype has been inspected in right and left facings for every supported motion.
- [x] Main-hand, support-hand, and offhand anchors remain attached throughout all frames.
- [x] Shields layer correctly during idle, walk, block, bash, hit, and defeat.
- [x] Two-handed weapons suppress offhands in profile resolution, world rendering, and combat rendering.
- [x] Contact, guard, release, follow-through, and recovery events fire once at their authored frames.
- [x] Powerful wind-ups remain readable without changing server-side damage timing or balance.
- [x] Independent advanced actors do not share action, facing, interruption, or cleanup state.
- [x] Kreg and the Cellar Dweller use shared profiles in their production level-20 encounters.
- [x] Legacy fallback still renders every deferred actor.
- [x] Humanoid NPC Studio controls cover profile, motion, frame, facing, speed, main hand, offhand, anchors, and event overlays.
- [x] Full automated suite: `217 / 217` passing.
- [x] Browser matrix: `330` profile/clip/facing combinations inspected.
- [x] Browser console: no errors or warnings in the Studio or live game shell.
- [x] Visual QA: no clipping, reversed weapons, incorrect hand depth, or stray pixels after the final shield, pitchfork, and scythe corrections.

## Explicitly deferred

Wave 3 does not force these actors into the humanoid architecture:

| Definition | Deferred rig |
| --- | --- |
| `peanut_slinger` | Squirrel / small creature |
| `magic_banana` | Magical-object rig |
| `wild_ravager` | Quadruped creature |
| `publing` | Bear creature/miniboss |
| `wilderness_overlord` | Oversized boar boss |
| `corrupted_cask` | Cask construct |
| `pub_crawl_mimic` | Mimic |
| `vintage_behemoth` | Oversized construct boss |
| `enraged_gorilla` | Gorilla boss |
| `spectral_barfly` | Flying spirit |
| `mash_crawler` | Crawler |
| `eldritch_keg` | Keg construct |
| `chummed_mimic` | Orphan visual-only mimic variant |

Quadrupeds, flying creatures, slimes, oversized monsters, unique
nonhumanoid bosses, and other large-actor rigs remain reserved for later
waves.
