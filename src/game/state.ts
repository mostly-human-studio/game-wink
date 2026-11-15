import type { EntityId, FlagId } from '../shared/ids';
import type { CueId } from '../shared/ids';
import { SCREEN_UP } from './math/vec';
import type { CompiledLevel } from './level';

/** Abstract input for one tick (spec §5.3). Gameplay never reads keys. */
export interface Intents {
  /** Screen-relative: +x is screen right, +y is up the screen. Each in [-1, 1]. */
  readonly moveX: number;
  readonly moveY: number;
  /** Held. */
  readonly dash: boolean;
  /** Held. */
  readonly lantern: boolean;
  /** True only on the tick the key went down. */
  readonly interact: boolean;
}

export const NO_INTENTS: Intents = { moveX: 0, moveY: 0, dash: false, lantern: false, interact: false };

export interface RevealState {
  /** Consecutive ticks inside the lantern radius. */
  readonly litTicks: number;
  /** Consecutive ticks outside it. Drives the whileLit grace period. */
  readonly unlitTicks: number;
  readonly revealed: boolean;
}

export interface GameState {
  readonly tick: number;
  readonly wick: {
    readonly x: number;
    readonly z: number;
    readonly vx: number;
    readonly vz: number;
    /** Unit facing vector. Headings are never stored as angles. */
    readonly faceX: number;
    readonly faceZ: number;
  };
  readonly lantern: {
    readonly owned: boolean;
    readonly raised: boolean;
    /** Integer charge, 0 … LANTERN_FULL_CHARGE. See lantern.ts for level and radius. */
    readonly charge: number;
  };
  /** Index-aligned with level.revealables (ID order). */
  readonly reveal: readonly RevealState[];
  /** Flags that are set, in ID order. */
  readonly flags: readonly FlagId[];
  readonly target: EntityId | null;
  /** Triggers containing Wick's centre, in ID order. */
  readonly inside: readonly EntityId[];
  /** Times the collision safety net acted. Dev builds surface it (§7.1 step 5). */
  readonly depenetrations: number;
}

/** What happened this tick. Adapters render, animate and play sound from these; they never change state. */
export type GameEvent =
  | { readonly kind: 'cue'; readonly cue: CueId; readonly source: EntityId }
  | { readonly kind: 'interacted'; readonly target: EntityId }
  | { readonly kind: 'blocked'; readonly target: EntityId }
  | { readonly kind: 'revealed'; readonly entity: EntityId }
  | { readonly kind: 'unrevealed'; readonly entity: EntityId }
  | { readonly kind: 'targetChanged'; readonly target: EntityId | null }
  | { readonly kind: 'triggerEnter'; readonly trigger: EntityId }
  | { readonly kind: 'triggerExit'; readonly trigger: EntityId };

export function initialState(level: CompiledLevel): GameState {
  return {
    tick: 0,
    // Starts facing the camera.
    wick: { x: level.spawn.x, z: level.spawn.z, vx: 0, vz: 0, faceX: -SCREEN_UP.x, faceZ: -SCREEN_UP.z },
    lantern: { owned: level.startsWithLantern, raised: false, charge: 0 },
    reveal: level.revealables.map(() => ({ litTicks: 0, unlitTicks: 0, revealed: false })),
    flags: [],
    target: null,
    inside: [],
    depenetrations: 0,
  };
}
