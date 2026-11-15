# Game Wink

Little Haunts, a 3D browser game from Mostly Human Studio. Wick is a small floating ghost with a lantern.

## What's here

| Path | What it is |
| --- | --- |
| `src/game/` | The pure, deterministic game core: movement, swept collision, lantern reveal, interaction targeting. |
| `src/levels/` | Pure level data. Only a test yard (`proving-ground`) so far. |
| `src/app/`, `src/engine/` | Boot, fixed-timestep loop, keyboard input, and a collider debug view. No renderer yet. |
| `tests/` | Unit tests, the collision gauntlet, and replay determinism. |
| `spikes/demo-graybox/` | The disposable playable graybox. Never imported by `src/`. |
| `docs/phase-1b-core.md` | What the core covers, what it doesn't, and the open questions. |
| `little-haunts-v0_3_1-amendments.md` | Amendments to the v0.3 specification. |

## Run it

```sh
npm install
npm run dev      # collider view of the proving ground, keyboard only
npm run check    # typecheck, lint, layer rules, tests, build
```

Controls: WASD or arrows to move, Shift to dash, Space to raise the lantern, E to interact.

## Rules for `src/game` and `src/levels`

These layers are deterministic (spec §10.3). They may not touch the DOM, the clock, `Math.random`, or trigonometry, and they import only from `game`, `levels` and `shared`. ESLint, a DOM-free tsconfig and dependency-cruiser enforce this; CI fails on any violation.
