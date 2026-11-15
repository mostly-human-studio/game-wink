import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Replay determinism, browser legs (spec §10.4, §14.1 item 3). The same recorded
 * streams that Node replays are replayed once in each browser engine. Every hash,
 * at every 60th tick and at the end, must equal the golden file Node is pinned to.
 */
const golden = JSON.parse(
  readFileSync(fileURLToPath(new URL('../replay/golden.json', import.meta.url)), 'utf8'),
) as Record<string, string[]>;

test('recorded streams replay to the golden hashes in this engine', async ({ page, browserName }) => {
  await page.goto('/tests/browser/harness.html');
  await page.waitForFunction(() => typeof window.__replayAll === 'function');
  const actual = await page.evaluate(() => window.__replayAll?.() ?? {});

  expect(Object.keys(actual).sort()).toEqual(Object.keys(golden).sort());
  for (const [seed, expected] of Object.entries(golden)) {
    const got = actual[seed] ?? [];
    const firstDiff = expected.findIndex((hash, i) => got[i] !== hash);
    // Index n is tick (n + 1) × 60, so a failure names the second where engines diverged.
    expect(firstDiff, `${browserName} diverged on seed ${seed} at tick ${(firstDiff + 1) * 60}`).toBe(-1);
    expect(got).toHaveLength(expected.length);
  }
});
