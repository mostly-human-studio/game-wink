import { compareIds, type EntityId } from '../../shared/ids';
import { TUNING } from '../config';

/**
 * Static colliders compile to two primitive types (spec §7.1):
 * segments (box edges, fences, curve chains) and circles (posts).
 */
export interface SegmentCollider {
  readonly kind: 'segment';
  readonly id: EntityId;
  readonly ax: number;
  readonly az: number;
  readonly bx: number;
  readonly bz: number;
}
export interface CircleCollider {
  readonly kind: 'circle';
  readonly id: EntityId;
  readonly x: number;
  readonly z: number;
  readonly r: number;
}
export type Collider = SegmentCollider | CircleCollider;

/** Colliders in ID order plus a uniform grid for broad-phase lookups. */
export interface CollisionWorld {
  /** Sorted by ID, so index order is ID order and equal-time contacts resolve to the lower ID. */
  readonly colliders: readonly Collider[];
  readonly cell: number;
  readonly minCellX: number;
  readonly minCellZ: number;
  readonly cols: number;
  readonly rows: number;
  /** cells[row * cols + col] lists collider indices, ascending. */
  readonly cells: readonly (readonly number[])[];
}

const bounds = (c: Collider): { minX: number; minZ: number; maxX: number; maxZ: number } =>
  c.kind === 'segment'
    ? { minX: Math.min(c.ax, c.bx), minZ: Math.min(c.az, c.bz), maxX: Math.max(c.ax, c.bx), maxZ: Math.max(c.az, c.bz) }
    : { minX: c.x - c.r, minZ: c.z - c.r, maxX: c.x + c.r, maxZ: c.z + c.r };

export function buildCollisionWorld(input: readonly Collider[], cell: number = TUNING.gridCell): CollisionWorld {
  const colliders = [...input].sort((a, b) => compareIds(a.id, b.id));
  if (colliders.length === 0) {
    return { colliders, cell, minCellX: 0, minCellZ: 0, cols: 0, rows: 0, cells: [] };
  }
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const c of colliders) {
    const b = bounds(c);
    minX = Math.min(minX, b.minX); minZ = Math.min(minZ, b.minZ);
    maxX = Math.max(maxX, b.maxX); maxZ = Math.max(maxZ, b.maxZ);
  }
  const minCellX = Math.floor(minX / cell), minCellZ = Math.floor(minZ / cell);
  const cols = Math.floor(maxX / cell) - minCellX + 1;
  const rows = Math.floor(maxZ / cell) - minCellZ + 1;
  const cells: number[][] = [];
  for (let i = 0; i < cols * rows; i++) cells.push([]);
  colliders.forEach((c, index) => {
    const b = bounds(c);
    const c0 = Math.floor(b.minX / cell) - minCellX, c1 = Math.floor(b.maxX / cell) - minCellX;
    const r0 = Math.floor(b.minZ / cell) - minCellZ, r1 = Math.floor(b.maxZ / cell) - minCellZ;
    for (let r = r0; r <= r1; r++) for (let col = c0; col <= c1; col++) cells[r * cols + col]?.push(index);
  });
  return { colliders, cell, minCellX, minCellZ, cols, rows, cells };
}

/** Collider indices whose grid cells overlap the box, ascending and unique. */
export function queryColliders(world: CollisionWorld, minX: number, minZ: number, maxX: number, maxZ: number): number[] {
  if (world.cols === 0) return [];
  const c0 = Math.max(0, Math.floor(minX / world.cell) - world.minCellX);
  const c1 = Math.min(world.cols - 1, Math.floor(maxX / world.cell) - world.minCellX);
  const r0 = Math.max(0, Math.floor(minZ / world.cell) - world.minCellZ);
  const r1 = Math.min(world.rows - 1, Math.floor(maxZ / world.cell) - world.minCellZ);
  const found: number[] = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const bucket = world.cells[r * world.cols + c];
      if (bucket) for (const index of bucket) found.push(index);
    }
  }
  found.sort((a, b) => a - b);
  const unique: number[] = [];
  for (const index of found) if (unique[unique.length - 1] !== index) unique.push(index);
  return unique;
}
