import { expect, test } from '@playwright/test';

/** The app boots and responds to the keyboard in every engine, with no script errors. */
test('the app boots, moves and raises the lantern', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  const hud = page.locator('#hud');
  await expect(hud).toContainText('tick');

  // Walk up-right from spawn (straight along world -z, a clear path) until Wick is beside the
  // hidden rune. Nothing moves him before this, so the route doesn't depend on timing, and
  // polling his position instead of sleeping keeps it steady on a slow CI machine.
  const worldZ = async (): Promise<number> => Number(/pos (-?[\d.]+), (-?[\d.]+)/.exec((await hud.textContent()) ?? '')?.[2] ?? Number.NaN);
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await expect(hud).toContainText('2.40 m/s');
  await expect.poll(worldZ, { timeout: 20_000, intervals: [50] }).toBeLessThan(-2.8);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyD');
  await expect(hud).toContainText('0.00 m/s');
  expect(await worldZ()).toBeGreaterThan(-4.5);
  await page.keyboard.down('Space');
  await expect(page.locator('#log')).toContainText('revealed RUNE_01');
  await expect(hud).toContainText('target IT_RUNE_01');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#log')).toContainText('cue CUE_RUNE_READ');
  await page.keyboard.up('Space');

  await expect(hud).toContainText('safety-net 0');
  expect(errors).toEqual([]);
});
