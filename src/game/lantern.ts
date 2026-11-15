import { msToTicks, TUNING } from './config';
import type { CompiledLevel } from './level';
import type { GameEvent, RevealState } from './state';

/**
 * Lantern charge is an integer so raising and lowering land exactly on full and empty.
 * (Adding 1/15 fifteen times gives 0.9999999999999999, which would cost a tick.)
 * One raise tick adds lowerTicks units and one lower tick removes raiseTicks units,
 * so a full raise takes 250 ms and a full lower takes 150 ms (spec §7.2).
 */
export const LANTERN_FULL_CHARGE = TUNING.lanternRaiseTicks * TUNING.lanternLowerTicks;

export const nextLanternCharge = (charge: number, raised: boolean): number =>
  raised
    ? Math.min(LANTERN_FULL_CHARGE, charge + TUNING.lanternLowerTicks)
    : Math.max(0, charge - TUNING.lanternRaiseTicks);

/** 0 lowered … 1 fully raised. */
export const lanternLevel = (charge: number): number => charge / LANTERN_FULL_CHARGE;

/** Current reveal radius in metres. */
export const lanternRadius = (charge: number): number => (TUNING.lanternRadius * charge) / LANTERN_FULL_CHARGE;

/**
 * Reveal state for one tick (spec §7.2). An object is lit while its anchor is inside
 * the current radius, and revealed once lit continuously for its dwell time.
 * persistOnReveal stays revealed; whileLit drops after the grace period.
 */
export function stepReveal(
  level: CompiledLevel,
  previous: readonly RevealState[],
  wickX: number,
  wickZ: number,
  charge: number,
  events: GameEvent[],
): RevealState[] {
  const radius = lanternRadius(charge);
  const r2 = radius * radius;
  return level.revealables.map((def, i): RevealState => {
    const prev = previous[i] ?? { litTicks: 0, unlitTicks: 0, revealed: false };
    const dx = def.x - wickX, dz = def.z - wickZ;
    const lit = radius > 0 && dx * dx + dz * dz <= r2;
    const litTicks = lit ? prev.litTicks + 1 : 0;
    // Capped just past the grace period so the counter (and the state hash) can't grow without bound.
    const unlitTicks = lit ? 0 : Math.min(prev.unlitTicks + 1, TUNING.whileLitGraceTicks + 1);
    let revealed = prev.revealed;
    if (!revealed && lit && litTicks >= msToTicks(def.dwellMs)) {
      revealed = true;
      events.push({ kind: 'revealed', entity: def.id });
    } else if (revealed && def.mode === 'whileLit' && unlitTicks > TUNING.whileLitGraceTicks) {
      revealed = false;
      events.push({ kind: 'unrevealed', entity: def.id });
    }
    return { litTicks, unlitTicks, revealed };
  });
}
