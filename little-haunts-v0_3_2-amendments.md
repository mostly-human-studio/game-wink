# Little Haunts — v0.3.2 Amendments (proposed)

Applies to: *Little Haunts 3D Browser Game — Product & Technical Specification v0.3*, as amended by v0.3.1.
Status: **proposed, awaiting owner approval.** Owner direction (2026-11-07): the lost soul is chapter 3 of the main path. The exit gate no longer opens until it's brought home.
Use: each amendment names the clause it replaces and gives paste-ready text. Clauses not listed are unchanged.

-----

## §0 Changelog — new entry (insert above v0.3.1)

**v0.3.2 (2026-11-07), the lost soul becomes chapter 3**

- The Gatekeeper no longer opens the exit gate on reassembly. He sends Wick to find the lost soul, and the gate opens when it's brought home (§8.2, §9.2, new §9.2.2).
- The cracked wall and alcove are main path, not optional (§7.6, §8.1, §9.3).
- `LOST_SOUL_01` is a main-path item. It resets on Restart Level like the bones (§7.6, §9.4).
- New checkpoint `CP_SOUL_SEARCH`. `CP_GATE_OPEN` moves to the soul's delivery (§7.7).
- The playtest metric for the secret is replaced (§14.3).

-----

## B1 — Level beats (§8.2)

**Replace beats 4–6 with:**

> 4. Skeleton encounter: Wick startles the skeleton again, and this time it falls apart. Wick retrieves three scattered bones, then watches a botched reassembly gag (§9.2).
>
> 5. The soul (chapter 3): whole again, the Gatekeeper explains that the exit gate only opens for the dead. Someone has been crying behind the west wall of Rune Row. The camera frames the west wall. The lantern reveals the crack, Wick pushes the wall open, and in the alcove he finds the lost soul, which can only be caught in lantern light (§9.3). The soul follows Wick back to the Gatekeeper, and on delivery the exit gate opens for it (§9.2.2).
>
> 6. Exit: Wick and the soul float through the graveyard gate. A short celebration plays, then a tease of the next area, then the completion screen.

## B2 — Zones and gating (§8.1)

**Z5 row, Gated by — replace with:**

> Secret passage (main path from beat 5; reachable from beat 2)

**Z6 row, Gated by — replace with:**

> Exit gate (opened when the lost soul is brought to the Gatekeeper)

## B3 — Collectibles and secrets (§7.6)

**Replace the section with:**

> `LOST_SOUL_01` and the cracked wall (§9.3) are main path from v0.3.2. The soul is not a collectible: it does not persist across Restart Level, and its location follows the reset matrix (§9.4).
>
> The wall can be revealed and opened, and the soul caught, at any time from beat 2. A soul caught early follows Wick until the Gatekeeper asks for it.
>
> Future optional collectibles keep the old rule: unique per save, kept across Restart Level, and never placed on the main path.

## B4 — Gatekeeper states (§9.2): new state and new §9.2.2

**§9.2 state diagram — replace `Thankful → Done` with:**

> `Thankful → WaitingSoul`: thanks dialogue ends. If Wick is already carrying the soul, go straight to delivery (§9.2.2). Otherwise frame the west wall for `beatT`.
> `WaitingSoul → Done`: soul delivered and the delivery dialogue ends. Set `exitOpen` and frame the exit gate.

**Insert new §9.2.2:**

> **9.2.2 The lost soul (`LOST_SOUL_01`)**
>
> Location is a single field: `free` (in the alcove) → `carried` (follows Wick) → `home` (waits at the exit gate). No other moves are allowed.
>
> - `free → carried`: E on the soul while it is lit (`whileLit`, §9.3). Allowed from beat 2.
> - `carried → home`: talk to the Gatekeeper in `WaitingSoul` or at the end of `Thankful`.
>
> Talking to the Gatekeeper in `WaitingSoul` without the soul cycles two hints: the wall's location, then that it must be pushed. Once the wall is open, the hint is that the soul only shows itself in lantern light.
>
> Invariants, checked every tick and in the §9.5 search:
>
> - The soul is never `carried` or `home` while the wall is not `Open`.
> - `exitOpen` holds exactly when the Gatekeeper is `Done`, and only when the soul is `home`.
> - The bone invariants (§9.2.1) hold in `WaitingSoul` as in `Done`.

## B5 — Checkpoints (§7.7)

**Insert row after `CP_BONES_COMPLETE`:**

> | `CP_SOUL_SEARCH` | Skeleton enters `WaitingSoul` | All bones delivered; skeleton `WaitingSoul`; exit gate shut; soul `free` (a soul caught after this checkpoint is discarded on reload, like any puzzle progress) |

**`CP_GATE_OPEN` row, Written when — replace with:**

> Soul delivered; delivery dialogue ends.

## B6 — Reset matrix (§9.4)

**Secret / lost soul column — replace the Restart Level cell with:**

> Wall → Hidden; soul → `free`

**Reload cell:**

> Checkpoint state

## B7 — Playtest (§14.3)

**Replace the row "Testers who find the secret" with:**

> | Testers who find the lost soul within 3 minutes of the Gatekeeper's request, without help | ≥ 4 of 5 |
