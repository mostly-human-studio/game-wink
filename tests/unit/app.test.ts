import { describe, expect, it } from 'vitest';
import { advance, MAX_TICKS_PER_FRAME } from '../../src/app/loop';
import { intentsFromKeys } from '../../src/engine/input';

const DT = 1 / 60;

describe('fixed-timestep accumulator (spec §10.2, v0.3.1 A5)', () => {
  it('runs one tick per 60 Hz frame', () => {
    const a = advance(0, DT);
    expect(a.ticks).toBe(1);
    expect(a.accumulator).toBeCloseTo(0, 12);
  });
  it('carries a partial tick forward', () => {
    const half = advance(0, DT / 2);
    expect(half.ticks).toBe(0);
    expect(half.alpha).toBeCloseTo(0.5, 9);
    expect(advance(half.accumulator, DT / 2).ticks).toBe(1);
  });
  it('runs two ticks on a 30 Hz frame', () => {
    expect(advance(0, 2 * DT).ticks).toBe(2);
  });
  it('caps catch-up at 6 ticks and discards the rest', () => {
    const exact = advance(0, 6 * DT);
    expect(exact.ticks).toBe(6);
    const hitch = advance(0, 5);
    expect(hitch.ticks).toBe(MAX_TICKS_PER_FRAME);
    expect(hitch.accumulator).toBe(0);
    expect(advance(hitch.accumulator, DT).ticks).toBe(1);
  });
  it('ignores negative frame times', () => {
    expect(advance(0, -1)).toEqual({ ticks: 0, accumulator: 0, alpha: 0 });
  });
  it('totals 60 ticks over a second of uneven frames', () => {
    let acc = 0, ticks = 0;
    for (const ms of [16, 17, 17, 16, 33, 8, 9, 25, 9, 17]) {
      for (let i = 0; i < 6; i++) { const a = advance(acc, ms / 1000); acc = a.accumulator; ticks += a.ticks; }
    }
    expect(ticks).toBe(Math.floor(((16 + 17 + 17 + 16 + 33 + 8 + 9 + 25 + 9 + 17) * 6) / 1000 * 60));
  });
});

describe('keyboard to intents (spec §5.3)', () => {
  it('maps WASD and arrows', () => {
    expect(intentsFromKeys(new Set(['KeyW', 'ArrowRight']), false)).toMatchObject({ moveX: 1, moveY: 1 });
    expect(intentsFromKeys(new Set(['KeyS', 'KeyA']), false)).toMatchObject({ moveX: -1, moveY: -1 });
  });
  it('cancels opposite keys', () => {
    expect(intentsFromKeys(new Set(['KeyW', 'KeyS', 'ArrowLeft', 'KeyD']), false)).toMatchObject({ moveX: 0, moveY: 0 });
  });
  it('maps dash, lantern and interact', () => {
    expect(intentsFromKeys(new Set(['ShiftRight', 'Space']), true)).toEqual({ moveX: 0, moveY: 0, dash: true, lantern: true, interact: true });
  });
});
