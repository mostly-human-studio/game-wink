import type { Condition, CompiledLevel } from './level';
import type { GameState } from './state';

export function holds(level: CompiledLevel, state: Pick<GameState, 'flags' | 'reveal'>, c: Condition): boolean {
  switch (c.kind) {
    case 'flag': return state.flags.includes(c.flag) === c.is;
    case 'revealed': {
      const index = level.revealIndex.get(c.entity);
      return index !== undefined && state.reveal[index]?.revealed === true;
    }
    case 'all': return c.of.every((sub) => holds(level, state, sub));
    case 'any': return c.of.some((sub) => holds(level, state, sub));
    case 'not': return !holds(level, state, c.cond);
  }
}
