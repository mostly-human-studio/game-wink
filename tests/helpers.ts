import { compileLevel, type CompiledLevel, type LevelDefinition } from '../src/game/level';
import { initialState, NO_INTENTS, type GameEvent, type GameState, type Intents } from '../src/game/state';
import { step } from '../src/game/step';
import { entityId, levelId } from '../src/shared/ids';
import type { Collider } from '../src/game/collision/primitives';

export const seg = (id: string, ax: number, az: number, bx: number, bz: number): Collider =>
  ({ kind: 'segment', id: entityId(id), ax, az, bx, bz });
export const post = (id: string, x: number, z: number, r: number): Collider =>
  ({ kind: 'circle', id: entityId(id), x, z, r });

export const ALWAYS = { kind: 'all', of: [] } as const;

export function makeLevel(overrides: Partial<LevelDefinition> = {}): CompiledLevel {
  return compileLevel({
    id: levelId('test'),
    spawn: { x: 0, z: 0 },
    startsWithLantern: true,
    flags: [],
    colliders: [],
    triggers: [],
    revealables: [],
    interactables: [],
    ...overrides,
  });
}

export const intents = (partial: Partial<Intents> = {}): Intents => ({ ...NO_INTENTS, ...partial });

export interface Run { state: GameState; events: GameEvent[] }

/** Runs the same intents for n ticks and collects every event. */
export function run(level: CompiledLevel, from: GameState, n: number, input: Partial<Intents> = {}): Run {
  let state = from;
  const events: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    const result = step(level, state, intents(input), state.tick + 1);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

export const start = (level: CompiledLevel): GameState => initialState(level);
export const speedOf = (s: GameState): number => Math.sqrt(s.wick.vx * s.wick.vx + s.wick.vz * s.wick.vz);

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
