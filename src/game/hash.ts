import type { GameState } from './state';

/**
 * 32-bit FNV-1a over the exact bits of the state. Replays compare this at every
 * 60th tick and at the end (spec §10.4), so any last-bit divergence between
 * engines shows up as a different hash.
 */
export function hashState(state: GameState): string {
  const view = new DataView(new ArrayBuffer(8));
  let h = 0x811c9dc5;
  const byte = (b: number): void => { h = Math.imul(h ^ (b & 0xff), 0x01000193) >>> 0; };
  const num = (v: number): void => {
    view.setFloat64(0, v === 0 ? 0 : v, true); // -0 and +0 hash alike
    for (let i = 0; i < 8; i++) byte(view.getUint8(i));
  };
  const str = (s: string): void => {
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); byte(c); byte(c >>> 8); }
    byte(0xff);
  };
  const bool = (b: boolean): void => byte(b ? 1 : 0);

  num(state.tick);
  num(state.wick.x); num(state.wick.z); num(state.wick.vx); num(state.wick.vz);
  num(state.wick.faceX); num(state.wick.faceZ);
  bool(state.lantern.owned); bool(state.lantern.raised); num(state.lantern.charge);
  num(state.reveal.length);
  for (const r of state.reveal) { num(r.litTicks); num(r.unlitTicks); bool(r.revealed); }
  num(state.flags.length);
  for (const f of state.flags) str(f);
  str(state.target ?? '');
  num(state.inside.length);
  for (const id of state.inside) str(id);
  num(state.depenetrations);
  return h.toString(16).padStart(8, '0');
}
