/**
 * Deterministic 2D helpers on the ground plane (x, z).
 * Only correctly rounded operations are used (spec §10.3 rule 5). No trigonometry:
 * headings are stored as unit vectors, never as angles.
 */
export interface Vec2 {
  readonly x: number;
  readonly z: number;
}

export const SQRT1_2 = 0.7071067811865476;

/**
 * Screen-relative movement basis for the fixed isometric camera (yaw 45°, spec §5.1–5.2).
 * "Up the screen" is the camera's forward vector projected onto the ground.
 * The engine camera must use the same yaw.
 */
export const SCREEN_UP: Vec2 = { x: -SQRT1_2, z: -SQRT1_2 };
export const SCREEN_RIGHT: Vec2 = { x: SQRT1_2, z: -SQRT1_2 };

export const length = (x: number, z: number): number => Math.sqrt(x * x + z * z);
export const dot = (ax: number, az: number, bx: number, bz: number): number => ax * bx + az * bz;
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
