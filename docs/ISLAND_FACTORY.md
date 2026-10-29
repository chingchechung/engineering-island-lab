# Phase 2 Island Factory Interface / Parallel ownership

Main owns all shared files. Agents A/B/C/D exclusively own the following files:

- A: `src/world/islands/nature.js` (S02–S04)
- B: `src/world/islands/fantasy.js` (S05–S08)
- C: `src/world/islands/dream.js` (S09–S12)
- D: `src/world/islands/extended.js` (S13–S15)

Each exports its existing `createNatureIsland(preset)` / `createFantasyIsland(preset)` / `createDreamIsland(preset)` / `createExtendedIsland(preset)`. Return the `createIslandShell(preset)` record with `{root, terrain, house, top, landmarks, animate: Function[], creatures: {group, kind, update(seconds)}[]}`. Core owns world placement, NPCs, labels, picking, bridges, gates, data and mode rules. Agent files must not edit any shared file, tests, package files, AGENTS/Plan, Git refs, PRs or deployment. Notify main if interface changes are needed.

`preset` theme data comes from `src/world/presets.js`, with id/title/animal/radius/stretch/lobes/depth/top/palette/house. Core merges position/parent from `createRadialLayout(totalUnits)` in `src/world/layout.js` before invoking the factory. All geometry is **local** to root. Root position stays `(0,0,0)` until core places it. Sea is world y=-2.55. Surface top defaults to 0.8 (S11 top=2). `terrain` is the original actual coastal Mesh, used by main to find bridge banks; do not remove/rename it. `house` remains named `lecture-cottage`, at (-2.25, top+0.16, -0.25), with label anchor attached later by core.

Reserve the front clearing for four/five NPCs: (-2.8,2),(-0.9,3.1),(1.3,2.8),(3,1.5),(3.6,0.1) in x/z; y=top+0.17. Do not put tall/static clutter in front of these positions, house face (+z), or the animal clearing x≈0.5,z≈0.4. Main owns S01; do not recreate it.

Shared helpers `src/world/islands/shared.js`: `createIslandShell`, `addAnimal(record,kind,color,index=0)`, `crystal`, `mound`, `coral`, `cactus`, `ring`. Existing primitives and props may be imported read-only. `addAnimal` returns a motion descriptor; agents should refine animal geometry and/or autonomous animation in their own module. Motion update uses absolute seconds only; no pointer, camera, user state, physics or picking. Every animal root has `userData.decoration=true` and `userData.animated=true`. Any independently moving descendant also needs `userData.animated=true` so batching preserves it. Environment animations go into `record.animate`; mark their moving node animated as well.

Core batches static geometry by material/action and skips moving nodes. Prefer low-poly original geometry and existing shared materials; avoid excessive unique materials/transparent particles. Tiny optional detail meshes may have `userData.detail=true` (hidden at distance). Keep large defining silhouettes visible in overview. Use no external assets and no links, question answers or persistent data.

Validation (from repository root): `node --input-type=module -e "import {createThemeIsland} from './src/world/themes.js'; import {PRESETS} from './src/world/presets.js'; const r=createThemeIsland(PRESETS[4]); r.animate.forEach(f=>f(1)); r.creatures.forEach(c=>c.update(1)); console.log(r.root.name,r.creatures.length);"` (choose your preset index). Main runs integration tests and captures all screenshots after reviewing agent results.

## Teacher revision integration

The four original factory agents have delivered and stopped. Current revision ownership is defined in [REVISION_INTERFACES.md](REVISION_INTERFACES.md): independent dressing, NPC-motion and fauna modules; shared core remains main-owned. Core adds dressing after construction, replaces factory fauna with exactly three representatives per island, and installs safe NPC roaming around the reserved centers before batching. Original S01 terrain/cottage and its first shark are retained. Final animal counts and species should be verified through `createIslandScene`, rather than the raw pre-integration factory output above. NPC root and articulated descendants stay animated and local; `world.setNpcPaused(unitId, questionId, bool)` is the Modal integration contract.
