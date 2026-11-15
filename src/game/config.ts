/** Simulation constants. Tuning values are the spec §7 initial numbers. */
export const TICK_HZ = 60;
export const TICK_SECONDS = 1 / TICK_HZ;

/** Durations are authored in milliseconds and rounded up to whole ticks (spec §7). */
export const msToTicks = (ms: number): number => Math.floor((ms * TICK_HZ + 999) / 1000);

export const TUNING = {
  /** m/s (§7.1) */
  driftSpeed: 2.4,
  dashSpeed: 4.2,
  /** Seconds to reach full speed (§7.1). */
  accelSeconds: 0.12,
  /** Seconds to stop from dash speed (§7.1). See docs/phase-1b-core.md, open question 1. */
  decelSeconds: 0.18,
  lanternSpeedMultiplier: 0.6,
  /** Wick's collider radius in metres (§7.1). */
  wickRadius: 0.38,
  /** Contact skin in metres (§7.1 step 2). */
  skin: 0.001,
  maxSweeps: 3,
  /** Uniform grid cell size in metres (§7.1 step 1). */
  gridCell: 2,
  /** Lantern (§7.2). */
  lanternRadius: 3.0,
  lanternRaiseTicks: msToTicks(250),
  lanternLowerTicks: msToTicks(150),
  whileLitGraceTicks: msToTicks(200),
  defaultDwellMs: 300,
  /** Interaction (§7.3). */
  defaultRange: 1.2,
  /** A new candidate must score this much higher to take the target. */
  targetSwitchRatio: 1.15,
  /** Target score weights: distance and facing. Graybox values; a tuning proposal, not spec. */
  scoreDistanceWeight: 0.6,
  scoreFacingWeight: 0.4,
} as const;
