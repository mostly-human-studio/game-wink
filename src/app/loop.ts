import { TICK_SECONDS } from '../game/index';

/** Spec §10.2 as amended by v0.3.1 A5: at most 6 ticks per rendered frame. */
export const MAX_TICKS_PER_FRAME = 6;

export interface Advance {
  /** Whole simulation ticks to run this frame. */
  readonly ticks: number;
  /** Time carried to the next frame, in seconds. */
  readonly accumulator: number;
  /** Fraction of a tick left over, for render interpolation. */
  readonly alpha: number;
}

/**
 * Fixed-timestep accumulator. After a hitch, time beyond the cap is discarded and
 * never run later, so a long stall can't trigger a burst of simulation.
 */
export function advance(accumulator: number, frameSeconds: number): Advance {
  const total = accumulator + Math.max(0, frameSeconds);
  const whole = Math.floor(total / TICK_SECONDS + 1e-9);
  if (whole > MAX_TICKS_PER_FRAME) return { ticks: MAX_TICKS_PER_FRAME, accumulator: 0, alpha: 0 };
  const rest = Math.max(0, total - whole * TICK_SECONDS);
  return { ticks: whole, accumulator: rest, alpha: rest / TICK_SECONDS };
}
