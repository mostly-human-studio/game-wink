import { describe, expect, it } from 'vitest';
import { SCREEN_RIGHT, SCREEN_UP } from '../../src/game/math/vec';
import { step } from '../../src/game/step';
import { deepFreeze, intents, makeLevel, run, speedOf, start } from '../helpers';

const open = makeLevel();
const noLantern = makeLevel({ startsWithLantern: false });

describe('movement (spec §5.2, §7.1)', () => {
  it('reaches drift speed in about 120 ms', () => {
    expect(speedOf(run(open, start(open), 7, { moveY: 1 }).state)).toBeLessThan(2.4);
    expect(speedOf(run(open, start(open), 8, { moveY: 1 }).state)).toBeCloseTo(2.4, 9);
    expect(speedOf(run(open, start(open), 60, { moveY: 1 }).state)).toBeCloseTo(2.4, 9);
  });

  it('dashes at 4.2 m/s', () => {
    expect(speedOf(run(open, start(open), 30, { moveY: 1, dash: true }).state)).toBeCloseTo(4.2, 9);
  });

  it('slows to 0.6× with the lantern raised, and ignores dash', () => {
    expect(speedOf(run(open, start(open), 30, { moveY: 1, lantern: true }).state)).toBeCloseTo(1.44, 9);
    expect(speedOf(run(open, start(open), 30, { moveY: 1, lantern: true, dash: true }).state)).toBeCloseTo(1.44, 9);
  });

  it('holding the lantern key without owning a lantern changes nothing', () => {
    const s = run(noLantern, start(noLantern), 30, { moveY: 1, lantern: true, dash: true }).state;
    expect(speedOf(s)).toBeCloseTo(4.2, 9);
    expect(s.lantern.raised).toBe(false);
    expect(s.lantern.charge).toBe(0);
  });

  it('stops within 180 ms of releasing the keys', () => {
    const moving = run(open, start(open), 30, { moveY: 1, dash: true }).state;
    expect(speedOf(run(open, moving, 10, {}).state)).toBeGreaterThan(0);
    expect(speedOf(run(open, moving, 11, {}).state)).toBe(0);
  });

  it('is screen-relative: W goes up the screen, D goes right', () => {
    const up = run(open, start(open), 60, { moveY: 1 }).state.wick;
    expect(up.x * SCREEN_UP.x + up.z * SCREEN_UP.z).toBeGreaterThan(2);
    expect(Math.abs(up.x * SCREEN_RIGHT.x + up.z * SCREEN_RIGHT.z)).toBeLessThan(1e-9);
    const right = run(open, start(open), 60, { moveX: 1 }).state.wick;
    expect(right.x * SCREEN_RIGHT.x + right.z * SCREEN_RIGHT.z).toBeGreaterThan(2);
    expect(Math.abs(right.x * SCREEN_UP.x + right.z * SCREEN_UP.z)).toBeLessThan(1e-9);
  });

  it('does not make diagonals faster', () => {
    expect(speedOf(run(open, start(open), 30, { moveX: 1, moveY: 1 }).state)).toBeCloseTo(2.4, 9);
  });

  it('faces the way it last moved and keeps a unit facing vector', () => {
    const s = run(open, start(open), 5, { moveX: 1, moveY: -1 }).state.wick;
    expect(s.faceX * s.faceX + s.faceZ * s.faceZ).toBeCloseTo(1, 12);
    const rested = run(open, run(open, start(open), 5, { moveX: 1 }).state, 30, {}).state.wick;
    expect(rested.faceX).toBeCloseTo(SCREEN_RIGHT.x, 12);
    expect(rested.faceZ).toBeCloseTo(SCREEN_RIGHT.z, 12);
  });

  it('treats out-of-range and non-finite input as clamped or zero', () => {
    expect(speedOf(run(open, start(open), 30, { moveY: 50 }).state)).toBeCloseTo(2.4, 9);
    const s = run(open, start(open), 30, { moveX: Number.NaN, moveY: Number.POSITIVE_INFINITY }).state;
    expect(Number.isFinite(s.wick.x) && Number.isFinite(s.wick.z)).toBe(true);
    expect(speedOf(s)).toBe(0);
  });
});

describe('step contract (spec §10.2)', () => {
  it('rejects a skipped or repeated tick', () => {
    const s = start(open);
    expect(() => step(open, s, intents(), 2)).toThrow(/expected tick 1/);
    expect(() => step(open, s, intents(), 0)).toThrow(/expected tick 1/);
  });

  it('never mutates the state it is given', () => {
    const frozen = deepFreeze(run(open, start(open), 5, { moveY: 1 }).state);
    expect(() => step(open, frozen, intents({ moveX: 1, lantern: true, interact: true }), frozen.tick + 1)).not.toThrow();
  });
});
