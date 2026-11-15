# Phase 1b core: status

The production scaffold and the pure game layer, built against spec v0.3 plus the v0.3.1 amendments. Chapter 3 (v0.3.2, PR #7) is not reflected here.

## Read this first

The spec orders the work Gate 0 → spike (1a) → technical proof (1b), and says §10 is provisional until the spike is reviewed. This was started ahead of the spike at the owner's direction. The determinism rules (§10.3–10.4) are fixed whatever the spike finds, and this code depends only on those. The stack choices around it (Vite, the layer layout) can still change at Gate 1a.

Nothing here is copied from the graybox. The collision maths is the same maths, because §7.1 specifies it.

## What's covered

| Spec | Status |
| --- | --- |
| §5.2 screen-relative movement, normalised diagonals | Done, tested |
| §5.3 intents (move, dash, interact, lantern) | Done. `advance` and `pause` arrive with dialogue and menus |
| §7.1 swept collision, slide, 3-sweep limit, skin, safety net, uniform grid, ID-order ties | Done, tested |
| §7.1 triggers tested against the swept path | Done, tested |
| §7.2 lantern radius, dwell, `persistOnReveal`, `whileLit` with grace | Done, tested |
| §7.3 eligibility, single target, 15% hysteresis, blocked feedback, tick order steps 1–4 | Done, tested |
| §10.2 `step()` contract, events out, adapters read-only | Done |
| §10.2 + A5 fixed timestep, 6-tick catch-up cap | Done, tested |
| §10.3 determinism rules | Enforced by ESLint, `tsconfig.game.json`, dependency-cruiser |
| §10.5 level validation | Done for the data that exists so far |
| §14.1 item 12 collision gauntlet | Passing |
| §14.1 item 13 reveal-gated interaction | Passing |
| §14.1 item 3 replay determinism | Node leg passing. Browser legs not wired up |

## What's not here

- A renderer. Three.js, the camera, Wick's model and motion all wait on the spike. `src/engine/debug-view.ts` is a collider overlay standing in for one.
- Dialogue, scripted beats, and the A4 input-boundary rule that depends on them.
- Puzzles, the NPC, bones, items, checkpoints, saves, play-time ticks (A5), and the completion screen.
- The Forgotten Graveyard. Its collision is extracted from approved assets (§11.3). `proving-ground` is a hand-built test yard.
- Playwright (cross-browser replay and the item 7 smoke tests), the bundle budget check, and the owner's holdout tests.
- Touch controls (D5 is open).

## Open questions for the owner

1. **Stopping time.** §7.1 says Wick "stops in about 180 ms". Deceleration here is `dashSpeed / 0.18 s`, as in the graybox: 180 ms from a dash, about 100 ms from a drift. If 180 ms should hold from drift speed too, the stop gets floatier. This is a feel call.
2. **Target scoring weights.** §7.3 says candidates are scored by distance and facing but gives no weights. This uses the graybox's 60% distance, 40% facing. It is a tuning proposal against §7, not spec.
3. **`step` signature.** The spec's illustrative contract is `step(state, intents, tick)`. This is `step(level, state, intents, tick)`, since a pure function needs the level data from somewhere. `tick` must equal `state.tick + 1` or it throws.
4. **Lantern charge is an integer.** Adding 1/15 fifteen times gives 0.9999999999999999, so a float level reached full a tick late and lit anchors a tick early on the way down. The state stores an integer charge instead. Radius and timings match §7.2 exactly.
5. **Dependency versions.** Installed at current majors (TypeScript 6, Vite 8, Vitest 5, ESLint 10). Pin or downgrade if the studio has a standard.

## How the tests earn their keep

- **Gauntlet.** About 940,000 moves: six starting points in the yard, 360 headings each, seven speeds from 0 to 42 m/s (10× dash) held for a second, plus single leaps of up to 40 m. No path crosses a collider, nothing overlaps, and the safety net never fires. Separate cases cover an endless zero-thickness fence, wall sliding, a post, acute corners from 10° to 80°, and a gap narrower than Wick.
- **Mutation check.** Removing the capsule end caps fails 6 gauntlet tests; removing the slide fails 2. Removing the skin was not caught by the gauntlet, so `collision.test.ts` now asserts the 1 mm gap directly.
- **Replay.** Three seeded two-minute input streams, each replayed three times. Hashes are compared at every 60th tick and pinned in a committed snapshot. The streams are checked to trigger every event kind, so they aren't hashing an empty floor.
- **Guards.** A deliberate violation file (trig, `Date`, `document`, an engine import) was confirmed to fail ESLint, the DOM-free typecheck and dependency-cruiser, then removed.
