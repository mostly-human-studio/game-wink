import { TUNING } from '../config';
import type { Vec2 } from '../math/vec';
import { queryColliders, type Collider, type CollisionWorld, type SegmentCollider } from './primitives';

/** Earliest contact along a displacement. t is the fraction of the displacement travelled. */
export interface SweepHit {
  readonly t: number;
  /** Unit contact normal, pointing from the collider toward the mover. */
  readonly nx: number;
  readonly nz: number;
  readonly colliderIndex: number;
}

interface RawHit { t: number; nx: number; nz: number }

const EPS_MOVE = 1e-12;

/** Ray from p along d against a circle of radius R at c. */
function rayCircle(px: number, pz: number, dx: number, dz: number, cx: number, cz: number, R: number): RawHit | null {
  const fx = px - cx, fz = pz - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-18) return null;
  const b = fx * dx + fz * dz;
  const c = fx * fx + fz * fz - R * R;
  if (c < 0) {
    // Already inside: block only motion that goes deeper.
    if (b < -EPS_MOVE) {
      const len = Math.sqrt(fx * fx + fz * fz);
      return len > 0 ? { t: 0, nx: fx / len, nz: fz / len } : { t: 0, nx: -dx / Math.sqrt(a), nz: -dz / Math.sqrt(a) };
    }
    return null;
  }
  if (b >= 0) return null;
  const disc = b * b - a * c;
  if (disc < 0) return null;
  const t = Math.max(0, (-b - Math.sqrt(disc)) / a);
  if (t > 1) return null;
  return { t, nx: (fx + dx * t) / R, nz: (fz + dz * t) / R };
}

/**
 * Ray against a capsule of radius R around a segment. Sweeping a circle against a
 * segment is exactly this test; the round ends cover the endpoints, so corners need
 * no special case (spec §7.1).
 */
function rayCapsule(px: number, pz: number, dx: number, dz: number, s: SegmentCollider, R: number): RawHit | null {
  const ux = s.bx - s.ax, uz = s.bz - s.az;
  const len = Math.sqrt(ux * ux + uz * uz);
  const ex = ux / len, ez = uz / len;
  let nx = -ez, nz = ex;
  const rx = px - s.ax, rz = pz - s.az;
  const along = rx * ex + rz * ez;
  let h = rx * nx + rz * nz;
  if (h < 0) { nx = -nx; nz = -nz; h = -h; }
  const dn = dx * nx + dz * nz;
  if (h >= R) {
    if (dn < 0) {
      const t = (R - h) / dn;
      if (t <= 1) {
        const at = along + t * (dx * ex + dz * ez);
        if (at >= 0 && at <= len) return { t, nx, nz };
      }
    }
  } else if (along >= 0 && along <= len) {
    return dn < -EPS_MOVE ? { t: 0, nx, nz } : null;
  }
  const h1 = rayCircle(px, pz, dx, dz, s.ax, s.az, R);
  const h2 = rayCircle(px, pz, dx, dz, s.bx, s.bz, R);
  if (h1 && h2) return h2.t < h1.t ? h2 : h1;
  return h1 ?? h2;
}

const rayCollider = (px: number, pz: number, dx: number, dz: number, c: Collider, r: number): RawHit | null =>
  c.kind === 'segment' ? rayCapsule(px, pz, dx, dz, c, r) : rayCircle(px, pz, dx, dz, c.x, c.z, c.r + r);

/** Sweep a circle of radius r from p along d. Equal times resolve to the lower collider ID. */
export function sweepCircle(world: CollisionWorld, px: number, pz: number, dx: number, dz: number, r: number): SweepHit | null {
  const pad = r + TUNING.skin;
  const candidates = queryColliders(
    world,
    Math.min(px, px + dx) - pad, Math.min(pz, pz + dz) - pad,
    Math.max(px, px + dx) + pad, Math.max(pz, pz + dz) + pad,
  );
  let best: SweepHit | null = null;
  for (const index of candidates) {
    const collider = world.colliders[index];
    if (!collider) continue;
    const hit = rayCollider(px, pz, dx, dz, collider, r);
    if (hit && (best === null || hit.t < best.t)) best = { ...hit, colliderIndex: index };
  }
  return best;
}

export interface MoveResult {
  readonly x: number;
  readonly z: number;
  /** Centre path including the start point: one leg per sweep. Triggers test against it. */
  readonly path: readonly Vec2[];
  /** Contact normals met along the way, in order. */
  readonly contacts: readonly Vec2[];
  /** Times the safety net had to act. Should stay 0 in normal play (spec §7.1 step 5). */
  readonly depenetrations: number;
}

const DEPEN_TOLERANCE = 1e-5;

/**
 * Sweep-and-slide (spec §7.1): advance to the earliest contact minus the skin,
 * project the remainder onto the contact surface, repeat up to three sweeps,
 * discard what is left, then run the depenetration safety net.
 */
export function moveCircle(world: CollisionWorld, startX: number, startZ: number, dispX: number, dispZ: number, r: number): MoveResult {
  let px = startX, pz = startZ, rx = dispX, rz = dispZ;
  const path: Vec2[] = [{ x: px, z: pz }];
  const contacts: Vec2[] = [];
  for (let i = 0; i < TUNING.maxSweeps; i++) {
    const len = Math.sqrt(rx * rx + rz * rz);
    if (len < 1e-9) break;
    const hit = sweepCircle(world, px, pz, rx, rz, r);
    if (!hit) {
      px += rx; pz += rz;
      path.push({ x: px, z: pz });
      break;
    }
    const t = Math.max(0, hit.t - TUNING.skin / len);
    px += rx * t; pz += rz * t;
    path.push({ x: px, z: pz });
    contacts.push({ x: hit.nx, z: hit.nz });
    let lx = rx * (1 - t), lz = rz * (1 - t);
    const into = lx * hit.nx + lz * hit.nz;
    if (into < 0) { lx -= hit.nx * into; lz -= hit.nz * into; }
    // Never slide back against an earlier contact: that is what makes acute corners stop cleanly.
    for (let k = 0; k < contacts.length - 1; k++) {
      const prev = contacts[k];
      if (prev && lx * prev.x + lz * prev.z < -1e-12) { lx = 0; lz = 0; }
    }
    rx = lx; rz = lz;
  }

  let depenetrations = 0;
  const pad = r + TUNING.skin;
  for (const index of queryColliders(world, px - pad, pz - pad, px + pad, pz + pad)) {
    const c = world.colliders[index];
    if (!c) continue;
    let cx: number, cz: number, rr: number;
    if (c.kind === 'circle') { cx = c.x; cz = c.z; rr = c.r + r; }
    else {
      const ux = c.bx - c.ax, uz = c.bz - c.az;
      const t = Math.max(0, Math.min(1, ((px - c.ax) * ux + (pz - c.az) * uz) / (ux * ux + uz * uz)));
      cx = c.ax + ux * t; cz = c.az + uz * t; rr = r;
    }
    const ox = px - cx, oz = pz - cz;
    const d2 = ox * ox + oz * oz;
    const limit = rr - DEPEN_TOLERANCE;
    if (d2 < limit * limit) {
      const d = Math.sqrt(d2);
      const push = rr - d + TUNING.skin;
      if (d > 0) { px += (ox / d) * push; pz += (oz / d) * push; }
      else { px += push; }
      depenetrations++;
    }
  }
  if (depenetrations > 0) path.push({ x: px, z: pz });
  return { x: px, z: pz, path, contacts, depenetrations };
}
