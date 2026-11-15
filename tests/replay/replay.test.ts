import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { recordStream, replay, replayAll, REPLAY_SEEDS, REPLAY_TICKS } from './streams';

/**
 * Replay determinism, Node leg (spec §10.4, §14.1 item 3): each recorded stream is
 * replayed three times and must match the pinned hashes at every 60th tick and at
 * the end. The browser legs (tests/browser/replay.spec.ts) replay the same streams
 * in Chromium, Firefox and WebKit against the same golden file.
 *
 * After an intended behaviour change, regenerate with: npm run replay:record
 */
const GOLDEN_PATH = fileURLToPath(new URL('./golden.json', import.meta.url));

if (process.env['UPDATE_GOLDEN'] === '1') {
  writeFileSync(GOLDEN_PATH, `${JSON.stringify(replayAll(), null, 1)}\n`);
}
const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as Record<string, string[]>;

describe('replay determinism (spec §10.4)', () => {
  it('has a golden entry for every seed and nothing else', () => {
    expect(Object.keys(golden).sort()).toEqual(REPLAY_SEEDS.map(String).sort());
  });

  for (const seed of REPLAY_SEEDS) {
    it(`seed ${seed}: three replays agree at every 60th tick and match the golden hashes`, () => {
      const stream = recordStream(seed);
      const first = replay(stream);
      expect(replay(stream).hashes).toEqual(first.hashes);
      expect(replay(stream).hashes).toEqual(first.hashes);
      expect(first.hashes).toHaveLength(REPLAY_TICKS / 60 + 1);
      // Two minutes of wandering never needs the collision safety net.
      expect(first.depenetrations).toBe(0);
      expect(first.hashes).toEqual(golden[String(seed)]);
    });
  }

  it('the streams actually exercise the game, not just empty floor', () => {
    const kinds = new Set<string>();
    for (const seed of REPLAY_SEEDS) for (const k of replay(recordStream(seed)).kinds) kinds.add(k);
    expect([...kinds].sort()).toEqual(['blocked', 'cue', 'interacted', 'revealed', 'targetChanged', 'triggerEnter', 'triggerExit', 'unrevealed']);
  });

  it('a one-tick difference in input changes the hash', () => {
    const stream = recordStream(1);
    const altered = stream.map((intents, i) => (i === 300 ? { ...intents, moveX: intents.moveX === 1 ? 0 : 1 } : intents));
    expect(replay(altered).hashes).not.toEqual(replay(stream).hashes);
  });
});
