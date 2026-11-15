import { lanternRadius, SCREEN_RIGHT, SCREEN_UP, TUNING, type CompiledLevel, type GameState } from '../game/index';

/**
 * Collider debug view (the spec §7.1 "F1 overlay", standing in until there is a
 * renderer). Draws the pure state top-down, rotated so that W moves up the screen
 * exactly as it will under the isometric camera. Reads state; never changes it.
 */
export class DebugView {
  private readonly ctx: CanvasRenderingContext2D;
  private scale = 40;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is unavailable');
    this.ctx = ctx;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
    // Rotated 45°, a 16 × 12 m yard spans about 20 m both ways on screen.
    this.scale = Math.min(this.canvas.width, this.canvas.height) / 21;
  }

  private sx(x: number, z: number): number {
    return this.canvas.width / 2 + (x * SCREEN_RIGHT.x + z * SCREEN_RIGHT.z) * this.scale;
  }
  private sy(x: number, z: number): number {
    return this.canvas.height / 2 - (x * SCREEN_UP.x + z * SCREEN_UP.z) * this.scale;
  }
  private ring(x: number, z: number, r: number, stroke: string, fill?: string): void {
    const c = this.ctx;
    c.beginPath();
    c.arc(this.sx(x, z), this.sy(x, z), r * this.scale, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    c.strokeStyle = stroke;
    c.stroke();
  }

  draw(level: CompiledLevel, prev: GameState, next: GameState, alpha: number): void {
    const c = this.ctx;
    c.fillStyle = '#0d1330';
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.lineWidth = Math.max(1, this.scale * 0.04);

    for (const t of level.triggers) {
      c.beginPath();
      c.moveTo(this.sx(t.minX, t.minZ), this.sy(t.minX, t.minZ));
      c.lineTo(this.sx(t.maxX, t.minZ), this.sy(t.maxX, t.minZ));
      c.lineTo(this.sx(t.maxX, t.maxZ), this.sy(t.maxX, t.maxZ));
      c.lineTo(this.sx(t.minX, t.maxZ), this.sy(t.minX, t.maxZ));
      c.closePath();
      c.strokeStyle = next.inside.includes(t.id) ? '#7dffa0' : '#3f8f5a';
      c.stroke();
    }
    for (const col of level.world.colliders) {
      if (col.kind === 'circle') this.ring(col.x, col.z, col.r, '#f3e6c8', '#3a3f63');
      else {
        c.beginPath();
        c.moveTo(this.sx(col.ax, col.az), this.sy(col.ax, col.az));
        c.lineTo(this.sx(col.bx, col.bz), this.sy(col.bx, col.bz));
        c.strokeStyle = '#f3e6c8';
        c.stroke();
      }
    }
    level.revealables.forEach((r, i) => {
      const shown = next.reveal[i]?.revealed === true;
      this.ring(r.x, r.z, 0.14, shown ? '#9fe6f2' : '#39466f', shown ? '#9fe6f2' : undefined);
    });
    for (const it of level.interactables) {
      const targeted = next.target === it.id;
      this.ring(it.x, it.z, it.range, targeted ? '#f2a03d' : 'rgba(243,230,200,.14)');
      if (targeted) this.ring(it.x, it.z, 0.2, '#f2a03d', '#f2a03d');
    }

    // The renderer interpolates between the latest two states (spec §10.2).
    const x = prev.wick.x + (next.wick.x - prev.wick.x) * alpha;
    const z = prev.wick.z + (next.wick.z - prev.wick.z) * alpha;
    const radius = lanternRadius(next.lantern.charge);
    if (radius > 0) this.ring(x, z, radius, 'rgba(242,160,61,.8)', 'rgba(242,160,61,.10)');
    this.ring(x, z, TUNING.wickRadius, '#ffffff', '#cfd6ff');
    c.beginPath();
    c.moveTo(this.sx(x, z), this.sy(x, z));
    c.lineTo(this.sx(x + next.wick.faceX * 0.6, z + next.wick.faceZ * 0.6), this.sy(x + next.wick.faceX * 0.6, z + next.wick.faceZ * 0.6));
    c.strokeStyle = '#ffffff';
    c.stroke();
  }
}
