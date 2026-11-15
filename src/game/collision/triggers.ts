import type { EntityId } from '../../shared/ids';
import type { Vec2 } from '../math/vec';

/** Axis-aligned 2D trigger volume (spec §7.1). A thin threshold is just a narrow box. */
export interface TriggerVolume {
  readonly id: EntityId;
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
}

export const pointInTrigger = (t: TriggerVolume, x: number, z: number): boolean =>
  x >= t.minX && x <= t.maxX && z >= t.minZ && z <= t.maxZ;

/** Slab test: does the segment a→b touch the box? */
function legTouches(t: TriggerVolume, a: Vec2, b: Vec2): boolean {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dz = b.z - a.z;
  if (Math.abs(dx) < 1e-12) { if (a.x < t.minX || a.x > t.maxX) return false; }
  else {
    let lo = (t.minX - a.x) / dx, hi = (t.maxX - a.x) / dx;
    if (lo > hi) { const s = lo; lo = hi; hi = s; }
    t0 = Math.max(t0, lo); t1 = Math.min(t1, hi);
    if (t0 > t1) return false;
  }
  if (Math.abs(dz) < 1e-12) { if (a.z < t.minZ || a.z > t.maxZ) return false; }
  else {
    let lo = (t.minZ - a.z) / dz, hi = (t.maxZ - a.z) / dz;
    if (lo > hi) { const s = lo; lo = hi; hi = s; }
    t0 = Math.max(t0, lo); t1 = Math.min(t1, hi);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Entry is tested against the swept path of Wick's centre, not only his final
 * position, so a dash can't skip a thin trigger (spec §7.1).
 */
export function pathTouchesTrigger(t: TriggerVolume, path: readonly Vec2[]): boolean {
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i], b = path[i + 1];
    if (a && b && legTouches(t, a, b)) return true;
  }
  const only = path[0];
  return path.length === 1 && only !== undefined && pointInTrigger(t, only.x, only.z);
}
