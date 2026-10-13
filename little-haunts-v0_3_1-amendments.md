# Little Haunts — v0.3.1 Amendments

Applies to: *Little Haunts 3D Browser Game — Product & Technical Specification v0.3*
Status: owner-directed corrections from the v0.3 review. Wording awaits owner confirmation.
Use: each amendment names the clause it replaces and gives paste-ready text. Clauses not listed are unchanged.

-----

## §0 Changelog — new entry (insert above v0.3)

**v0.3.1 (2026-10-12), corrections from the v0.3 review**

- Bone A spawns only at the scatter, arcing out through the open courtyard gate into Z3 (§8.1, §9.2).
- Lamps are not targetable while Three Lanterns is resetting, so no press goes unanswered (§9.1, §14.1).
- Bone hints follow a fixed, authored bone order instead of “nearest” (§9.2).
- Input-boundary rule: the key that closes dialogue or ends a beat is consumed; the lantern needs a fresh press (§5.3, §7.4, §14.1).
- Play time is simulation time, counted in ticks; the loop’s catch-up cap is fixed (§7.7, §10.2, §10.5).
- Reference register points at the files in the repository (§3).
- Skeleton targetability defined for every state (§9.2).
- Wick readability floor raised from 64 px to 80 px (§14.2).
- Spike Day 1 de-risked: the lightmap check runs on a placeholder mesh in parallel (§12, §17).
- Disposable graybox demo defined and fenced off from production (§12.1, new).

-----

## A1 — Bone A spawn (§8.1, §9.2)

**§8.1, zone table, Z3 row, Contents — replace with:**

> Three stone lamps around a plinth; Bone A’s spawn point (empty until the scatter, §9.2)

**§9.2, Elements, Bones — replace the Bone A sentence with:**

> Bone A, the left arm. It lies on the skeleton until the scatter, then arcs out through the open courtyard gate and lands on the path in Z3.

**§9.2, skeleton state table, Scattered row, Behavior — replace with:**

> The skeleton collapses; bones arc to their spawn points; the skull lands upright. Scripted framing follows Bone A’s arc into Z3 (≤ 2 s, within the 1500 ms landing window), so the player sees where it went.

*Rationale:* §9.2.1 keeps every bone `onSkeleton` until `Scattered`, which happens in Z4. Bone A cannot also be visible in Z3 beforehand. The arc keeps the authored layout and turns the walk back to Z3 into a punchline rather than a chore.

-----

## A2 — Lamps during Resetting (§9.1, §14.1)

**§9.1, Targeting — replace with:**

> Targeting: lamps become targetable once the lantern is acquired, except while the puzzle is in `Resetting`. A lit lamp can’t be targeted, so the player can’t trigger a reset by accident.

**§9.1, state table, Resetting row, Entry actions — replace with:**

> Comedic puff of smoke from every lit lamp; Wick plays `scared`; no lamp is targetable (§7.3), so there is no target and no press to answer.

**§9.1, Rules, No soft-lock — replace with:**

> No soft-lock: unlit lamps are always targetable outside `Resetting`, and `Resetting` always exits. Brute-forcing the order is possible (6 permutations), and that’s acceptable.

**§14.1 — add item 15:**

> 1. Reset targeting: while `PZ_THREE_LANTERNS` is in `Resetting`, no lamp is eligible on any tick, and an interact press on those ticks produces no puzzle event.

*Rationale:* v0.3 made lamps targetable after `extinguishAll` but ignored their input, which breaks §7.3 (“Nothing is silent”).

-----

## A3 — Bone hints (§9.2, §10.5)

**§9.2, skeleton state table, AwaitingHelp row, Behavior — replace with:**

> Skull dialogue. A TALK with nothing carried hints at the first bone in the level’s `hintOrder` that is `atSpawn`. Repeated TALKs cycle that bone’s hint lines in fixed order. Bone B’s hint mentions “something glinting in the fog” to cue the lantern.

**§10.5 — add to level data (illustrative):**

```ts
interface GatekeeperConfig {
  hintOrder: readonly [BoneId, BoneId, BoneId]; // graveyard: ['BONE_B', 'BONE_C', 'BONE_A']
  hints: Record<BoneId, readonly DialogueId[]>;
}
```

*Rationale:* v0.3 said both “fixed order” and “nearest bone”. “Nearest” depends on Wick’s position, which the §9.5 abstract state space deliberately excludes, so the graph search couldn’t verify it. A fixed order is deterministic, testable, and lets the designer point at the fog bone first. Bone A goes last because the player just watched it fly away.

-----

## A4 — Input across dialogue and beat boundaries (§5.3, §7.4, §14.1)

**§5.3 — add after the intents paragraph:**

> Input boundaries. The press that advances the final dialogue line closes the dialogue and is consumed: it produces no other intent on that tick or later. A lantern hold that began during dialogue or a scripted beat is ignored until the key is released; raising needs a fresh press (in toggle mode, a fresh toggle). Movement resumes at once from whatever is currently held. The same rule applies when a scripted beat returns control.

**§7.4 — add:**

> Closing dialogue never starts a new interaction on the same press (§5.3, input boundaries).

**§14.1 — add item 16:**

> 1. Input boundaries: holding Space or E through the final dialogue line, or through the end of a scripted beat, raises no lantern and starts no interaction until the key is released and pressed again. Covered for every dialogue and beat in the level.

*Rationale:* Space and E both advance dialogue and also raise or interact. Without this rule, holding Space through the last line raises the lantern the moment dialogue closes, and E on the skeleton’s last line can trigger TALK again.

-----

## A5 — Play time is simulation time (§7.7, §10.2, §10.5)

**§7.7, Completion record — replace with:**

> Completion record: play time is simulation time. `step()` counts `elapsedPlayTicks` from `CP_START` until Wick’s swept path crosses the exit trigger, and the UI shows it as ticks ÷ 60 (mm:ss). No ticks run while paused, loading, or hidden, so those exclusions hold by construction. After a hitch, the loop may drop catch-up ticks (§10.2), so play time can run slightly behind wall-clock time on slow machines. That is accepted. The completion screen shows time, lost souls found (x/1), and the best time.

**§7.7, Saved immediately — replace “elapsed play time” with “elapsed play ticks”.**

**§10.2, `app/` line — append:**

> The fixed-timestep accumulator runs at most 6 ticks per rendered frame; any remaining accumulated time is discarded, never run later.

**§10.5, `SaveDataV1` — replace the two fields:**

```ts
elapsedPlayTicks: number;
bestCompletion?: { timeTicks: number; collected: number; total: number };
```

*Rationale:* the game layer only knows ticks (§10.3). Defining play time in ticks keeps it deterministic and checkable by replay, and the catch-up cap stops a long hitch from triggering a burst of simulation.

-----

## A6 — Reference register (§3)

**§3 table, File entries — replace with:**

> REF-00: `docs/references/REF-00.jpg` (1536×1024). Original name: `49486092-B26F-4B03-B765-C8E4C09E0CA1.png`.
> REF-01: `docs/references/REF-01.jpg` (1536×1024). Original name: `d0082a463508a5a3120136ff4c96756669eafe7e.png`.

**§3, Rules — add:**

> Canonical files: the repository copies are the registered references. If higher-fidelity masters exist, the owner registers which file is canonical before Phase 0 palette sampling (§4.4).

*Rationale:* agents may use only registered references, so the register must name files that actually exist. JPEG compression can also shift sampled hex values, which matters for §4.4.

-----

## A7 — Skeleton targetability (§9.2)

**§9.2, Rules — add:**

> `NPC_GATEKEEPER` is targetable only in `AwaitingHelp` and `Done`. In `Done`, TALK plays a short wave line and changes no state. In every other state he can’t be targeted.

*Rationale:* v0.3 didn’t say whether he can be talked to outside `AwaitingHelp`. `Done` gets a line because players will try.

-----

## A8 — Readability floor (§14.2)

**§14.2 item 2 — replace “at least 64 px tall” with “at least 80 px tall”.**

*Rationale:* with orthographic framing of 14–18 m at 16:9 and a 35.26° pitch, a 1.05 m Wick projects to about 1.05 × cos 35.26° ≈ 0.86 m of screen height. At 1080p that is about 91–118 px, so 64 px wouldn’t fail even an obviously bad framing choice. At 80 px, the criterion still rejects framing wider than about 20 m.

-----

## A9 — Spike Day 1 (§12, §17)

**§12, Plan, Day 1 — append:**

> Question 3 (lightmaps in Three.js) uses a placeholder mesh and runs alongside questions 1–2, so it doesn’t wait on Wick’s cleanup. If questions 1–2 overrun, the remaining work is logged as a risk; the timebox isn’t extended (per §12).

**§17 — add row:**

> | Spike Day 1 is overloaded (generate, clean up, rig, export, and verify lightmaps in one day) | Lightmap check decoupled onto a placeholder mesh; Blender hours logged per step so an overrun yields an estimate, not a delay |

-----

## A10 — Graybox demo (new §12.1)

**Insert after §12:**

> ### 12.1 Graybox demo (owner-requested, disposable)
> 
> A playable graybox of the core loop, used to judge feel and explain the game to stakeholders. It has the same status as spike code:
> 
> - It lives under `spikes/demo-graybox/`. It’s never merged into `src/`, and it’s excluded from the build and from the architecture rules.
> - It uses primitive geometry only. It is not an art reference, and nothing in it can be marked accepted against §14.4.
> - It doesn’t count toward any gate and doesn’t replace the spike (§12) or Phase 1b.
> - Its touch controls are a convenience for review on phones and don’t settle D5.
> 
> Findings about feel (speeds, reveal timing, targeting) are recorded as proposals against §7. They don’t change §7 on their own.