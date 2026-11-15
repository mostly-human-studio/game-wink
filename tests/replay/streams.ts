import { hashState } from '../../src/game/hash';
import { initialState, type GameEvent, type Intents } from '../../src/game/state';
import { step } from '../../src/game/step';
import { PROVING_GROUND } from '../../src/levels/proving-ground/level';

/**
 * Recorded intent streams for replay determinism (spec §10.4). This module is plain
 * TypeScript with no test-runner or platform imports, so the same code runs in Node
 * (Vitest) and inside Chromium, Firefox and WebKit (Playwright).
 */
export const REPLAY_SEEDS = [1, 20261114, 0xdecade] as const;
export const REPLAY_TICKS = 60 * 120;

/** Seeded PRNG for generating input only. Integer maths, so it is exact everywhere. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A wandering player: holds a direction for a while, sometimes dashes, raises the lantern, mashes E. */
export function recordStream(seed: number, ticks: number = REPLAY_TICKS): Intents[] {
  const rand = mulberry32(seed);
  const stream: Intents[] = [];
  let moveX = 0, moveY = 0, dash = false, lantern = false, hold = 0;
  for (let i = 0; i < ticks; i++) {
    if (hold-- <= 0) {
      hold = 6 + Math.floor(rand() * 70);
      moveX = Math.floor(rand() * 3) - 1;
      moveY = Math.floor(rand() * 3) - 1;
      dash = rand() < 0.35;
      lantern = rand() < 0.45;
    }
    stream.push({ moveX, moveY, dash, lantern, interact: rand() < 0.08 });
  }
  return stream;
}

export interface ReplayResult {
  /** State hash at every 60th tick, then once more at the end. */
  readonly hashes: string[];
  readonly kinds: string[];
  readonly depenetrations: number;
}

export function replay(stream: readonly Intents[]): ReplayResult {
  let state = initialState(PROVING_GROUND);
  const hashes: string[] = [];
  const kinds = new Set<GameEvent['kind']>();
  for (const intents of stream) {
    const result = step(PROVING_GROUND, state, intents, state.tick + 1);
    state = result.state;
    for (const e of result.events) kinds.add(e.kind);
    if (state.tick % 60 === 0) hashes.push(hashState(state));
  }
  hashes.push(hashState(state));
  return { hashes, kinds: [...kinds].sort(), depenetrations: state.depenetrations };
}

/** Every seed's hashes, keyed by seed. This is what golden.json pins. */
export function replayAll(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const seed of REPLAY_SEEDS) out[String(seed)] = replay(recordStream(seed)).hashes;
  return out;
}
