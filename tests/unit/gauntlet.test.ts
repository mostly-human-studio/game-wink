import { describe, expect, it } from 'vitest';
import { buildCollisionWorld, type Collider, type CollisionWorld } from '../../src/game/collision/primitives';
import { moveCircle } from '../../src/game/collision/sweep';
import { pathTouchesTrigger } from '../../src/game/collision/triggers';
import { TUNING } from '../../src/game/config';
import type { Vec2 } from '../../src/game/math/vec';
import { PROVING_GROUND } from '../../src/levels/proving-ground/level';
import { entityId } from '../../src/shared/ids';
import { post, run, seg, start } from '../helpers';

/**
 * Thin-geometry collision gauntlet (spec §14.1 item 12).
 * Wick is swept into zero-thickness segments, boxes, posts and corners from every
 * heading at 1° steps, at speeds from 0 up to 10× the maximum dash speed, plus
 * single moves far longer than his collider.
 */
const R = TUNING.wickRadius;
const DT = 1 / 60;
const OVERLAP_TOLERANCE = 2e-5; // the safety net's own threshold is 1e-5

function clearance(c: Collider, x: number, z: number): number {
  if (c.kind === 'circle') return Math.hypot(x - c.x, z - c.z) - c.r - R;
  const ux = c.bx - c.ax, uz = c.bz - c.az;
  const t = Math.max(0, Math.min(1, ((x - c.ax) * ux + (z - c.az) * uz) / (ux * ux + uz * uz)));
  return Math.hypot(x - (c.ax + ux * t), z - (c.az + uz * t)) - R;
}

/** Does the centre path leg a→b properly cross the segment collider? */
function crosses(c: Collider, a: Vec2, b: Vec2): boolean {
  if (c.kind !== 'segment') return false;
  const side = (px: number, pz: number, qx: number, qz: number, rx: number, rz: number): number =>
    (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
  const d1 = side(c.ax, c.az, c.bx, c.bz, a.x, a.z), d2 = side(c.ax, c.az, c.bx, c.bz, b.x, b.z);
  const d3 = side(a.x, a.z, b.x, b.z, c.ax, c.az), d4 = side(a.x, a.z, b.x, b.z, c.bx, c.bz);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

interface Tally { moves: number; depenetrations: number; worstClearance: number; crossings: number }

function drive(world: CollisionWorld, from: Vec2, heading: number, stepLength: number, steps: number, tally: Tally): Vec2 {
  const rad = (heading * Math.PI) / 180;
  const dx = Math.cos(rad) * stepLength, dz = Math.sin(rad) * stepLength;
  let x = from.x, z = from.z;
  for (let i = 0; i < steps; i++) {
    const m = moveCircle(world, x, z, dx, dz, R);
    tally.moves++;
    tally.depenetrations += m.depenetrations;
    for (const c of world.colliders) {
      tally.worstClearance = Math.min(tally.worstClearance, clearance(c, m.x, m.z));
      for (let k = 0; k + 1 < m.path.length; k++) {
        const a = m.path[k], b = m.path[k + 1];
        if (a && b && crosses(c, a, b)) tally.crossings++;
      }
    }
    x = m.x; z = m.z;
  }
  return { x, z };
}

const HEADINGS = Array.from({ length: 360 }, (_, i) => i);
/** m/s: 0, a crawl, drift, dash, then up to 10× dash (42 m/s = 0.7 m per tick). */
const SPEEDS = [0, 0.3, 2.4, 4.2, 8.4, 21, 42];
/** Single moves in metres, far longer than the 0.76 m collider. */
const LEAPS = [0.76, 1.5, 4, 12, 40];

const yard = PROVING_GROUND.world;
const STARTS: readonly (Vec2 & { name: string })[] = [
  { name: 'beside the zero-thickness fence', x: -1, z: -1.2 },
  { name: 'beside the rotated crypt', x: 2.5, z: -2.8 },
  { name: 'beside the post pair', x: -4.6, z: 3.0 },
  { name: 'inside the acute nook', x: 4, z: 3.8 },
  { name: 'in the outer wall corner', x: -7.2, z: -5.2 },
  { name: 'in the open', x: 0, z: 0.5 },
];

describe('thin-geometry collision gauntlet (spec §14.1 item 12)', () => {
  for (const from of STARTS) {
    it(`never crosses or overlaps anything, starting ${from.name}`, () => {
      const tally: Tally = { moves: 0, depenetrations: 0, worstClearance: Infinity, crossings: 0 };
      for (const heading of HEADINGS) {
        for (const speed of SPEEDS) {
          const end = drive(yard, from, heading, speed * DT, 60, tally);
          // The yard is closed, so staying inside it means no wall was crossed.
          expect(Math.abs(end.x)).toBeLessThan(8);
          expect(Math.abs(end.z)).toBeLessThan(6);
        }
        for (const leap of LEAPS) {
          const end = drive(yard, from, heading, leap, 3, tally);
          expect(Math.abs(end.x)).toBeLessThan(8);
          expect(Math.abs(end.z)).toBeLessThan(6);
        }
      }
      expect(tally.crossings).toBe(0);
      expect(tally.worstClearance).toBeGreaterThan(-OVERLAP_TOLERANCE);
      // §7.1 step 5: the safety net should never act in normal play.
      expect(tally.depenetrations).toBe(0);
      expect(tally.moves).toBe(360 * (SPEEDS.length * 60 + LEAPS.length * 3));
    });
  }

  it('a zero-thickness fence blocks every heading at every speed', () => {
    // Longer than the furthest slide (20 leaps of 40 m), so going round the end isn't an option.
    const fence = buildCollisionWorld([seg('FENCE', -1000, 0, 1000, 0)]);
    const tally: Tally = { moves: 0, depenetrations: 0, worstClearance: Infinity, crossings: 0 };
    for (const heading of HEADINGS) {
      for (const stepLength of [...SPEEDS.map((s) => s * DT), ...LEAPS]) {
        const end = drive(fence, { x: 0, z: 1 }, heading, stepLength, 20, tally);
        expect(end.z).toBeGreaterThan(R - OVERLAP_TOLERANCE);
      }
    }
    expect(tally.crossings).toBe(0);
    expect(tally.depenetrations).toBe(0);
  });

  it('slides along a wall instead of sticking to it', () => {
    const wall = buildCollisionWorld([seg('WALL', -50, 0, 50, 0)]);
    for (const heading of [200, 225, 250, 290, 315, 340]) {
      const rad = (heading * Math.PI) / 180;
      const step = 4.2 * DT;
      let x = 0, z = 0.5;
      for (let i = 0; i < 60; i++) { const m = moveCircle(wall, x, z, Math.cos(rad) * step, Math.sin(rad) * step, R); x = m.x; z = m.z; }
      // Once on the wall, all tangential motion is kept. Allow the short approach.
      expect(Math.abs(x)).toBeGreaterThan(Math.abs(Math.cos(rad)) * step * 60 * 0.97);
      expect(z).toBeGreaterThan(R - OVERLAP_TOLERANCE);
      expect(z).toBeLessThan(R + 0.01);
    }
  });

  it('slides around a round post', () => {
    const world = buildCollisionWorld([post('POST', 0, 0, 0.25)]);
    let x = -2, z = 0.1;
    for (let i = 0; i < 120; i++) { const m = moveCircle(world, x, z, 4.2 * DT, 0, R); x = m.x; z = m.z; }
    expect(x).toBeGreaterThan(1);
    expect(Math.hypot(x, z)).toBeGreaterThan(0.25 + R - OVERLAP_TOLERANCE);
  });

  it('stops cleanly in acute corners instead of jittering', () => {
    for (const degrees of [10, 20, 30, 45, 60, 80]) {
      const rad = (degrees * Math.PI) / 180;
      // Two walls meeting at the origin, opening toward +x, bisected by the x axis.
      const world = buildCollisionWorld([
        seg('A', 0, 0, 10 * Math.cos(rad / 2), 10 * Math.sin(rad / 2)),
        seg('B', 0, 0, 10 * Math.cos(rad / 2), -10 * Math.sin(rad / 2)),
      ]);
      for (const aim of [180, 170, 190, 150, 210]) {
        const a = (aim * Math.PI) / 180;
        let x = 6, z = 0;
        const trail: Vec2[] = [];
        for (let i = 0; i < 240; i++) {
          const m = moveCircle(world, x, z, Math.cos(a) * 4.2 * DT, Math.sin(a) * 4.2 * DT, R);
          expect(m.depenetrations).toBe(0);
          x = m.x; z = m.z;
          trail.push({ x, z });
        }
        // Settled: the last second of pushing moves him less than a hundredth of a millimetre.
        const settled = trail.slice(-60);
        const first = settled[0];
        for (const p of settled) expect(Math.hypot(p.x - (first?.x ?? 0), p.z - (first?.z ?? 0))).toBeLessThan(1e-5);
        for (const c of world.colliders) expect(clearance(c, x, z)).toBeGreaterThan(-OVERLAP_TOLERANCE);
      }
    }
  });

  it('cannot squeeze between two posts closer together than his width', () => {
    for (const heading of HEADINGS) {
      for (const speed of SPEEDS) {
        const tally: Tally = { moves: 0, depenetrations: 0, worstClearance: Infinity, crossings: 0 };
        const rad = (heading * Math.PI) / 180;
        // Aim straight at the gap's midpoint from 1.5 m away.
        const from = { x: -4.6 - Math.cos(rad) * 1.5, z: 1.7 - Math.sin(rad) * 1.5 };
        drive(yard, from, heading, speed * DT, 60, tally);
        expect(tally.worstClearance).toBeGreaterThan(-OVERLAP_TOLERANCE);
      }
    }
  });
});

describe('triggers under fast movement (spec §7.1, §14.1 item 12)', () => {
  const threshold = PROVING_GROUND.triggers.find((t) => t.id === entityId('TRG_EXIT_THRESHOLD'));

  it('a 5 cm threshold is caught by every crossing, at any speed or offset', () => {
    expect(threshold).toBeDefined();
    if (!threshold) return;
    const open = buildCollisionWorld([]);
    for (const stepLength of [...SPEEDS.filter((s) => s > 0).map((s) => s * DT), ...LEAPS]) {
      for (let offset = 0; offset < 40; offset++) {
        // Start south of the threshold and travel north across it, with a different phase each time.
        let z = -3.6 - (offset / 40) * Math.min(stepLength, 0.8), fired = 0;
        while (z > -5.4) {
          const m = moveCircle(open, 6.5, z, 0, -stepLength, R);
          if (pathTouchesTrigger(threshold, m.path)) fired++;
          z = m.z;
        }
        expect(fired).toBeGreaterThan(0);
      }
    }
  });

  it('a real dash through step() fires enter and exit', () => {
    const level = PROVING_GROUND;
    // Screen-down-left is +z in world; drive from south of the threshold toward the north wall.
    const from = { ...start(level), wick: { ...start(level).wick, x: 6.5, z: -3.7 } };
    const r = run(level, from, 90, { moveX: 1, moveY: 1, dash: true }); // up-right on screen = -z in world
    const enters = r.events.filter((e) => e.kind === 'triggerEnter' && e.trigger === entityId('TRG_EXIT_THRESHOLD'));
    const exits = r.events.filter((e) => e.kind === 'triggerExit' && e.trigger === entityId('TRG_EXIT_THRESHOLD'));
    expect(enters).toHaveLength(1);
    expect(exits).toHaveLength(1);
    expect(r.state.wick.z).toBeLessThan(-4.55);
    expect(r.state.depenetrations).toBe(0);
  });
});
