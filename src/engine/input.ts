import type { Intents } from '../game/index';

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space']);

/** Pure mapping from held keys to intents (spec §5.3). Opposite keys cancel out. */
export function intentsFromKeys(held: ReadonlySet<string>, interactPressed: boolean): Intents {
  const on = (...codes: string[]): number => (codes.some((c) => held.has(c)) ? 1 : 0);
  return {
    moveX: on('KeyD', 'ArrowRight') - on('KeyA', 'ArrowLeft'),
    moveY: on('KeyW', 'ArrowUp') - on('KeyS', 'ArrowDown'),
    dash: held.has('ShiftLeft') || held.has('ShiftRight'),
    lantern: held.has('Space'),
    interact: interactPressed,
  };
}

/** Keyboard adapter. Gameplay never sees keys, only the intents sampled once per tick. */
export class KeyboardInput {
  private readonly held = new Set<string>();
  private interactQueued = false;

  constructor(target: Window) {
    target.addEventListener('keydown', (e) => {
      if (MOVE_KEYS.has(e.code)) e.preventDefault();
      if (e.code === 'KeyE' && !e.repeat) this.interactQueued = true;
      this.held.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.held.delete(e.code));
    target.addEventListener('blur', () => { this.held.clear(); this.interactQueued = false; });
  }

  /** Call once per simulation tick. A press is delivered to exactly one tick. */
  sample(): Intents {
    const intents = intentsFromKeys(this.held, this.interactQueued);
    this.interactQueued = false;
    return intents;
  }
}
