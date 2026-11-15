import { DebugView } from '../engine/debug-view';
import { KeyboardInput } from '../engine/input';
import { initialState, step, type GameEvent } from '../game/index';
import { PROVING_GROUND } from '../levels/proving-ground/level';
import { advance } from './loop';
import '../styles/main.css';

function need<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`index.html is missing ${selector}`);
  return found;
}
const canvas = need<HTMLCanvasElement>('#view');
const hud = need<HTMLElement>('#hud');
const log = need<HTMLElement>('#log');

const level = PROVING_GROUND;
const input = new KeyboardInput(window);
const view = new DebugView(canvas);
view.resize();
window.addEventListener('resize', () => view.resize());

let prev = initialState(level);
let state = prev;
let accumulator = 0;
let last: number | null = null;
const recent: string[] = [];

const describe = (e: GameEvent): string | null => {
  switch (e.kind) {
    case 'cue': return `cue ${e.cue}`;
    case 'revealed': return `revealed ${e.entity}`;
    case 'unrevealed': return `hidden ${e.entity}`;
    case 'triggerEnter': return `enter ${e.trigger}`;
    case 'triggerExit': return `exit ${e.trigger}`;
    default: return null;
  }
};

function frame(now: number): void {
  const elapsed = last === null ? 0 : (now - last) / 1000;
  last = now;
  const plan = advance(accumulator, elapsed);
  accumulator = plan.accumulator;
  for (let i = 0; i < plan.ticks; i++) {
    prev = state;
    const result = step(level, state, input.sample(), state.tick + 1);
    state = result.state;
    for (const e of result.events) {
      const line = describe(e);
      if (line) { recent.unshift(`${state.tick}  ${line}`); recent.length = Math.min(recent.length, 6); }
    }
  }
  view.draw(level, prev, state, plan.alpha);
  const speed = Math.sqrt(state.wick.vx * state.wick.vx + state.wick.vz * state.wick.vz);
  hud.textContent = `tick ${state.tick} · ${speed.toFixed(2)} m/s · target ${state.target ?? 'none'} · safety-net ${state.depenetrations}`;
  log.textContent = recent.join('\n');
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
