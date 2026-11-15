import { describe, expect, it } from 'vitest';
import { hashState } from '../../src/game/hash';
import { initialState, type GameEvent, type Intents } from '../../src/game/state';
import { step } from '../../src/game/step';
import { PROVING_GROUND } from '../../src/levels/proving-ground/level';
import { mulberry32 } from '../helpers';

/**
 * Replay determinism (spec §10.4, §14.1 item 3): a recorded intent stream with a
 * fixed seed, replayed three times in Node. The state hash must match at every
 * 60th tick and at the end.
 *
 * The committed snapshot pins those hashes, so a change in behaviour (or an engine
 * that rounds differently) fails here. The browser legs (Playwright Chromium,
 * Firefox, WebKit) replay the same streams against the same snapshot; they are
 * not wired up yet.
 */
const TICKS = 60 * 120;

/** A wandering player: holds a direction for a while, sometimes dashes, raises the lantern, mashes E. */
function recordStream(seed: number): Intents[] {
  const rand = mulberry32(seed);
  const stream: Intents[] = [];
  let moveX = 0, moveY = 0, dash = false, lantern = false, hold = 0;
  for (let i = 0; i < TICKS; i++) {
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

function replay(stream: readonly Intents[]): { hashes: string[]; kinds: string[]; depenetrations: number } {
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

describe('replay determinism (spec §10.4)', () => {
  for (const seed of [1, 20261114, 0xdecade]) {
    it(`seed ${seed}: three replays agree at every 60th tick and match the recorded hashes`, () => {
      const stream = recordStream(seed);
      const first = replay(stream);
      expect(replay(stream).hashes).toEqual(first.hashes);
      expect(replay(stream).hashes).toEqual(first.hashes);
      expect(first.hashes).toHaveLength(TICKS / 60 + 1);
      // Two minutes of wandering never needs the collision safety net.
      expect(first.depenetrations).toBe(0);
      expect(first.hashes.join(' ')).toMatchSnapshot();
    });
  }

  it('the streams actually exercise the game, not just empty floor', () => {
    const kinds = new Set<string>();
    for (const seed of [1, 20261114, 0xdecade]) for (const k of replay(recordStream(seed)).kinds) kinds.add(k);
    expect([...kinds].sort()).toEqual(['blocked', 'cue', 'interacted', 'revealed', 'targetChanged', 'triggerEnter', 'triggerExit', 'unrevealed']);
  });

  it('a one-tick difference in input changes the hash', () => {
    const stream = recordStream(1);
    const altered = stream.map((intents, i) => (i === 300 ? { ...intents, moveX: intents.moveX === 1 ? 0 : 1 } : intents));
    expect(replay(altered).hashes).not.toEqual(replay(stream).hashes);
  });
});
