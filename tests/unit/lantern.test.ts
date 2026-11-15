import { describe, expect, it } from 'vitest';
import { entityId, cueId, promptId } from '../../src/shared/ids';
import { LANTERN_FULL_CHARGE, lanternRadius } from '../../src/game/lantern';
import { ALWAYS, makeLevel, run, start } from '../helpers';

const RUNE = entityId('RUNE');
const WISP = entityId('WISP');
const FAR = entityId('FAR');
const level = makeLevel({
  revealables: [
    { id: RUNE, x: 1, z: 0, mode: 'persistOnReveal', dwellMs: 300 },
    { id: WISP, x: 0, z: 1, mode: 'whileLit', dwellMs: 300 },
    { id: FAR, x: 2.5, z: 0, mode: 'persistOnReveal', dwellMs: 300 },
  ],
  interactables: [
    { id: entityId('IT_RUNE'), x: 1, z: 0, range: 1.2, prompt: promptId('P'), targetableWhen: ALWAYS, revealable: RUNE, onInteract: [{ kind: 'cue', cue: cueId('C_RUNE') }] },
    { id: entityId('IT_WISP'), x: 0, z: 1, range: 1.2, prompt: promptId('P'), targetableWhen: ALWAYS, revealable: WISP, onInteract: [{ kind: 'cue', cue: cueId('C_WISP') }] },
  ],
});
const revealed = (s: ReturnType<typeof start>, id: string): boolean =>
  s.reveal[level.revealables.findIndex((r) => r.id === id)]?.revealed === true;

describe('lantern (spec §7.2)', () => {
  it('grows to 3.0 m over 250 ms and shrinks over 150 ms', () => {
    expect(run(level, start(level), 14, { lantern: true }).state.lantern.charge).toBeLessThan(LANTERN_FULL_CHARGE);
    const full = run(level, start(level), 15, { lantern: true }).state;
    expect(full.lantern.charge).toBe(LANTERN_FULL_CHARGE);
    expect(lanternRadius(full.lantern.charge)).toBe(3);
    expect(run(level, full, 600, { lantern: true }).state.lantern.charge).toBe(LANTERN_FULL_CHARGE);
    expect(run(level, full, 8, {}).state.lantern.charge).toBeGreaterThan(0);
    expect(run(level, full, 9, {}).state.lantern.charge).toBe(0);
  });

  it('reveals after 300 ms of continuous light, counted from when the radius reaches the anchor', () => {
    // RUNE is 1 m away: the radius passes 1 m on tick 5, and dwell is 18 ticks.
    expect(revealed(run(level, start(level), 21, { lantern: true }).state, RUNE)).toBe(false);
    const r = run(level, start(level), 22, { lantern: true });
    expect(revealed(r.state, RUNE)).toBe(true);
    expect(r.events).toContainEqual({ kind: 'revealed', entity: RUNE });
  });

  it('restarts the dwell if the light is interrupted', () => {
    // 10 ticks up: lit for 6. Lowering keeps it lit for a few more, still short of 18, then dark.
    const partly = run(level, start(level), 10, { lantern: true }).state;
    const lowered = run(level, partly, 9, {}).state;
    expect(revealed(lowered, RUNE)).toBe(false);
    expect(revealed(run(level, lowered, 21, { lantern: true }).state, RUNE)).toBe(false);
  });

  it('persistOnReveal stays revealed after the lantern drops', () => {
    const lit = run(level, start(level), 40, { lantern: true }).state;
    expect(revealed(run(level, lit, 600, {}).state, RUNE)).toBe(true);
  });

  it('whileLit holds through the 200 ms grace period, then drops', () => {
    const lit = run(level, start(level), 40, { lantern: true }).state;
    expect(revealed(lit, WISP)).toBe(true);
    // Lowering takes 9 ticks; WISP at 1 m leaves the radius on the 6th. Grace is 12 more ticks.
    expect(revealed(run(level, lit, 18, {}).state, WISP)).toBe(true);
    const dropped = run(level, lit, 19, {});
    expect(revealed(dropped.state, WISP)).toBe(false);
    expect(dropped.events).toContainEqual({ kind: 'unrevealed', entity: WISP });
  });

  it('whileLit stays revealed if relit inside the grace period', () => {
    const lit = run(level, start(level), 40, { lantern: true }).state;
    // Fully lowered (dark for 3 ticks), then raised again: the radius is back within 4 more.
    const flicker = run(level, lit, 9, {}).state;
    const relit = run(level, flicker, 30, { lantern: true });
    expect(revealed(relit.state, WISP)).toBe(true);
    expect(relit.events.filter((e) => e.kind === 'unrevealed')).toEqual([]);
  });

  it('does not light anchors outside the radius', () => {
    const s = run(level, start(level), 10, { lantern: true }).state; // radius 2.0 m
    expect(s.reveal[level.revealables.findIndex((r) => r.id === FAR)]?.litTicks).toBe(0);
  });
});

describe('reveal-gated interaction (spec §14.1 item 13)', () => {
  it('an unrevealed persistOnReveal object is never targetable, even standing on it', () => {
    const r = run(level, start(level), 120, { interact: true });
    expect(r.state.target).toBeNull();
    expect(r.events).toEqual([]);
  });

  it('a whileLit object loses its target the tick the grace period ends, and later presses do nothing', () => {
    const lit = run(level, start(level), 40, { lantern: true }).state;
    expect([entityId('IT_RUNE'), entityId('IT_WISP')]).toContain(lit.target);
    const held = run(level, lit, 18, {}).state;
    const drop = run(level, held, 1, { interact: true });
    // RUNE persists, so the target moves to it; the wisp is gone in the same tick.
    expect(drop.events).toContainEqual({ kind: 'unrevealed', entity: WISP });
    expect(drop.state.target).toBe(entityId('IT_RUNE'));
    expect(drop.events.some((e) => e.kind === 'cue' && e.cue === cueId('C_WISP'))).toBe(false);
    const later = run(level, drop.state, 120, { interact: true });
    expect(later.events.some((e) => e.kind === 'cue' && e.cue === cueId('C_WISP'))).toBe(false);
    expect(later.events.some((e) => e.kind === 'interacted' && e.target === entityId('IT_WISP'))).toBe(false);
  });

  it('with only a whileLit object in reach, the prompt and target vanish entirely', () => {
    const only = makeLevel({
      revealables: [{ id: WISP, x: 0, z: 1, mode: 'whileLit', dwellMs: 300 }],
      interactables: [{ id: entityId('IT_WISP'), x: 0, z: 1, range: 1.2, prompt: promptId('P'), targetableWhen: ALWAYS, revealable: WISP, onInteract: [{ kind: 'cue', cue: cueId('C_WISP') }] }],
    });
    const lit = run(only, start(only), 40, { lantern: true }).state;
    expect(lit.target).toBe(entityId('IT_WISP'));
    expect(run(only, lit, 18, {}).state.target).toBe(entityId('IT_WISP'));
    const drop = run(only, lit, 19, {});
    expect(drop.state.target).toBeNull();
    expect(drop.events).toContainEqual({ kind: 'targetChanged', target: null });
    expect(run(only, drop.state, 200, { interact: true }).events).toEqual([]);
  });
});
