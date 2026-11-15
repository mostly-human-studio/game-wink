import { describe, expect, it } from 'vitest';
import { buildCollisionWorld, queryColliders } from '../../src/game/collision/primitives';
import { moveCircle, sweepCircle } from '../../src/game/collision/sweep';
import { TUNING } from '../../src/game/config';
import { post, seg } from '../helpers';

const R = TUNING.wickRadius;

describe('sweep (spec §7.1)', () => {
  it('reports the time of impact and a normal facing the mover', () => {
    const world = buildCollisionWorld([seg('WALL', -5, 0, 5, 0)]);
    const hit = sweepCircle(world, 0, 2, 0, -4, R);
    expect(hit?.t).toBeCloseTo((2 - R) / 4, 12);
    expect(hit?.nx).toBeCloseTo(0, 12);
    expect(hit?.nz).toBe(1);
    expect(sweepCircle(world, 0, 2, 0, 4, R)).toBeNull();
    expect(sweepCircle(world, 0, -2, 0, 4, R)?.nz).toBe(-1);
  });

  it('rounds segment ends, so a corner is hit at radius distance', () => {
    const world = buildCollisionWorld([seg('STUB', 0, 0, 1, 0)]);
    const hit = sweepCircle(world, -2, 0, 4, 0, R);
    expect(hit?.t).toBeCloseTo((2 - R) / 4, 12);
    expect(hit?.nx).toBeCloseTo(-1, 12);
  });

  it('hits a post at the sum of the radii', () => {
    const world = buildCollisionWorld([post('POST', 0, 0, 0.25)]);
    expect(sweepCircle(world, -3, 0, 6, 0, R)?.t).toBeCloseTo((3 - 0.25 - R) / 6, 12);
  });

  it('resolves equal-time contacts to the lower ID, whatever the input order', () => {
    const a = seg('A', -5, 0, 5, 0), b = seg('B', -5, 0, 5, 0);
    for (const world of [buildCollisionWorld([a, b]), buildCollisionWorld([b, a])]) {
      const hit = sweepCircle(world, 0, 2, 0, -4, R);
      expect(world.colliders[hit?.colliderIndex ?? -1]?.id).toBe('A');
    }
  });

  it('stops one skin short of the surface', () => {
    const world = buildCollisionWorld([seg('WALL', -5, 0, 5, 0)]);
    const m = moveCircle(world, 0, 2, 0, -4, R);
    expect(m.z - R).toBeGreaterThan(TUNING.skin * 0.99);
    expect(m.z - R).toBeLessThan(TUNING.skin * 1.01);
    expect(m.contacts).toHaveLength(1);
    expect(m.contacts[0]?.z).toBe(1);
  });

  it('gives up after three sweeps and discards the remainder', () => {
    const world = buildCollisionWorld([seg('A', 0, 0, 10, 2), seg('B', 0, 0, 10, -2)]);
    const m = moveCircle(world, 6, 0, -30, 0, R);
    expect(m.path.length).toBeLessThanOrEqual(TUNING.maxSweeps + 1);
    expect(m.x).toBeGreaterThan(0);
  });

  it('a zero move is a no-op', () => {
    const world = buildCollisionWorld([seg('WALL', -5, 0, 5, 0)]);
    expect(moveCircle(world, 1, 1, 0, 0, R)).toMatchObject({ x: 1, z: 1, contacts: [], depenetrations: 0 });
  });

  it('the safety net pushes out of a real overlap and counts it', () => {
    const world = buildCollisionWorld([seg('WALL', -5, 0, 5, 0)]);
    const m = moveCircle(world, 0, 0.1, 0, 0, R);
    expect(m.depenetrations).toBe(1);
    expect(m.z).toBeGreaterThan(R);
  });
});

describe('uniform grid (spec §7.1 step 1)', () => {
  const world = buildCollisionWorld([seg('FAR', 40, 40, 44, 40), post('NEAR', 1, 1, 0.3), seg('LONG', -9, 0, 9, 0)]);

  it('keeps colliders in ID order', () => {
    expect(world.colliders.map((c) => c.id)).toEqual(['FAR', 'LONG', 'NEAR']);
  });
  it('returns only nearby colliders, ascending and unique', () => {
    expect(queryColliders(world, 0, 0, 3, 3)).toEqual([1, 2]);
    expect(queryColliders(world, -9, -1, 9, 1)).toEqual([1, 2]);
    expect(queryColliders(world, 39, 39, 45, 41)).toEqual([0]);
    expect(queryColliders(world, 100, 100, 101, 101)).toEqual([]);
  });
  it('finds the same hit as a brute-force world with one giant cell', () => {
    const brute = buildCollisionWorld(world.colliders, 1000);
    for (let i = 0; i < 360; i += 7) {
      const dx = Math.cos(i) * 12, dz = Math.sin(i) * 12;
      expect(sweepCircle(world, 0.2, 3, dx, dz, R)).toEqual(sweepCircle(brute, 0.2, 3, dx, dz, R));
    }
  });
});
