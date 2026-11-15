import { describe, expect, it } from 'vitest';
import { selectTarget } from '../../src/game/interactions';
import { validateLevel, type LevelDefinition } from '../../src/game/level';
import { cueId, entityId, flagId, levelId, promptId } from '../../src/shared/ids';
import { PROVING_GROUND_DEFINITION } from '../../src/levels/proving-ground/level';
import { ALWAYS, makeLevel, run, start } from '../helpers';

const P = promptId('P');
const thing = (id: string, x: number, z: number) =>
  ({ id: entityId(id), x, z, range: 1.2, prompt: P, targetableWhen: ALWAYS, onInteract: [{ kind: 'cue' as const, cue: cueId(`CUE_${id}`) }] });
const facingX = (x = 0, z = 0) => ({ flags: [], reveal: [], wick: { x, z, vx: 0, vz: 0, faceX: 1, faceZ: 0 } });

describe('target selection (spec §7.3)', () => {
  it('has no target out of range, and a press then does nothing at all', () => {
    const level = makeLevel({ interactables: [thing('A', 5, 0)] });
    const r = run(level, start(level), 30, { interact: true });
    expect(r.state.target).toBeNull();
    expect(r.events).toEqual([]);
  });

  it('prefers the closer of two candidates', () => {
    const level = makeLevel({ interactables: [thing('A', 0.9, 0), thing('B', 0.5, 0)] });
    expect(selectTarget(level, facingX(), null)).toBe('B');
  });

  it('prefers what Wick is facing when distances match', () => {
    const level = makeLevel({ interactables: [thing('A', -0.8, 0), thing('B', 0.8, 0)] });
    expect(selectTarget(level, facingX(), null)).toBe('B');
  });

  it('breaks exact ties by ID order', () => {
    const level = makeLevel({ interactables: [thing('B', 0, 0.7), thing('A', 0, -0.7)] });
    expect(selectTarget(level, facingX(), null)).toBe('A');
  });

  it('keeps the current target unless a rival scores at least 15% higher', () => {
    // Scores facing +x: A at 0.9 m = 0.55. B at 0.8 m = 0.60 (9% higher). C at 0.5 m = 0.75 (36% higher).
    const near = makeLevel({ interactables: [thing('A', 0.9, 0), thing('B', 0.8, 0)] });
    expect(selectTarget(near, facingX(), entityId('A'))).toBe('A');
    expect(selectTarget(near, facingX(), null)).toBe('B');
    const clear = makeLevel({ interactables: [thing('A', 0.9, 0), thing('C', 0.5, 0)] });
    expect(selectTarget(clear, facingX(), entityId('A'))).toBe('C');
  });

  it('drops a target the same tick it leaves range', () => {
    const level = makeLevel({ interactables: [thing('A', 0, 0)] });
    const at = run(level, start(level), 1, {});
    expect(at.state.target).toBe('A');
    let s = at.state;
    for (let i = 0; i < 120 && s.target !== null; i++) {
      const next = run(level, s, 1, { moveX: 1, dash: true });
      const d = Math.sqrt(next.state.wick.x ** 2 + next.state.wick.z ** 2);
      expect(next.state.target === null).toBe(d > 1.2);
      s = next.state;
    }
    expect(s.target).toBeNull();
  });
});

describe('interact (spec §7.3)', () => {
  const OPEN = flagId('OPEN');
  const KEY = flagId('KEY');
  const level = makeLevel({
    flags: [OPEN, KEY],
    interactables: [
      {
        id: entityId('GATE'), x: 0.5, z: 0, range: 1.2, prompt: P,
        targetableWhen: { kind: 'flag', flag: OPEN, is: false },
        blockedWhen: { kind: 'flag', flag: KEY, is: false },
        onBlocked: [{ kind: 'cue', cue: cueId('CUE_FIZZLE') }],
        onInteract: [{ kind: 'setFlag', flag: OPEN, value: true }, { kind: 'cue', cue: cueId('CUE_OPEN') }],
      },
      {
        id: entityId('KEYSTONE'), x: -0.5, z: 0, range: 1.2, prompt: P,
        targetableWhen: { kind: 'flag', flag: KEY, is: false },
        onInteract: [{ kind: 'setFlag', flag: KEY, value: true }, { kind: 'cue', cue: cueId('CUE_KEY') }],
      },
    ],
  });

  it('a blocked interaction gives feedback and changes nothing', () => {
    const s = { ...start(level), target: entityId('GATE') };
    const r = run(level, { ...s, wick: { ...s.wick, x: 0.5, faceX: 1, faceZ: 0 } }, 1, { interact: true });
    expect(r.events).toEqual([
      { kind: 'blocked', target: 'GATE' },
      { kind: 'cue', cue: 'CUE_FIZZLE', source: 'GATE' },
    ]);
    expect(r.state.flags).toEqual([]);
  });

  it('a successful interaction runs its actions, and the result can retire the target', () => {
    let s = { ...start(level), wick: { ...start(level).wick, x: -0.5 } };
    const key = run(level, s, 1, { interact: true });
    expect(key.events).toContainEqual({ kind: 'interacted', target: 'KEYSTONE' });
    expect(key.state.flags).toEqual(['KEY']);
    s = { ...key.state, wick: { ...key.state.wick, x: 0.5 } };
    const open = run(level, s, 1, { interact: true });
    expect(open.events).toContainEqual({ kind: 'cue', cue: 'CUE_OPEN', source: 'GATE' });
    expect(open.state.flags).toEqual(['KEY', 'OPEN']);
    const after = run(level, open.state, 30, { interact: true });
    expect(after.state.target).toBeNull();
    expect(after.events).toEqual([{ kind: 'targetChanged', target: null }]);
  });

  it('acts once per press, on the tick of the press only', () => {
    const s = { ...start(level), wick: { ...start(level).wick, x: -0.5 } };
    const held = run(level, s, 1, { interact: true });
    const idle = run(level, held.state, 30, {});
    expect(idle.events.filter((e) => e.kind === 'interacted' || e.kind === 'blocked')).toEqual([]);
  });
});

describe('level validation (spec §10.5)', () => {
  const base: LevelDefinition = { id: levelId('t'), spawn: { x: 0, z: 0 }, startsWithLantern: true, flags: [], colliders: [], triggers: [], revealables: [], interactables: [] };
  const RUNE = entityId('RUNE');
  const rune = { id: RUNE, x: 0, z: 0, mode: 'persistOnReveal' as const, dwellMs: 300 };

  it('accepts the proving ground', () => {
    expect(validateLevel(PROVING_GROUND_DEFINITION)).toEqual([]);
  });
  it('requires every interactable to emit a cue', () => {
    expect(validateLevel({ ...base, interactables: [{ ...thing('A', 0, 0), onInteract: [] }] })).toEqual(['interactable A onInteract: must emit at least one cue']);
  });
  it('requires a cue on the blocked path too', () => {
    const problems = validateLevel({ ...base, interactables: [{ ...thing('A', 0, 0), blockedWhen: ALWAYS }] });
    expect(problems).toEqual(['interactable A: blockedWhen needs onBlocked']);
  });
  it('rejects unknown revealables and flags', () => {
    const problems = validateLevel({ ...base, interactables: [{ ...thing('A', 0, 0), revealable: RUNE, targetableWhen: { kind: 'flag', flag: flagId('NOPE'), is: true } }] });
    expect(problems).toEqual(['interactable A: unknown revealable RUNE', 'interactable A targetableWhen: unknown flag NOPE']);
  });
  it('rejects restating or overriding the reveal requirement', () => {
    const problems = validateLevel({ ...base, revealables: [rune], interactables: [{ ...thing('A', 0, 0), revealable: RUNE, targetableWhen: { kind: 'not', cond: { kind: 'revealed', entity: RUNE } } }] });
    expect(problems).toEqual(['interactable A: targetableWhen must not reference its own revealable']);
  });
  it('rejects duplicate IDs, degenerate colliders and bad numbers', () => {
    const problems = validateLevel({
      ...base,
      colliders: [
        { kind: 'segment', id: entityId('S'), ax: 1, az: 1, bx: 1, bz: 1 },
        { kind: 'circle', id: entityId('S'), x: 0, z: 0, r: 0 },
        { kind: 'circle', id: entityId('N'), x: Number.NaN, z: 0, r: 1 },
      ],
    });
    expect(problems).toEqual(['collider S: zero-length segment', 'collider S: duplicate ID', 'collider S: radius must be positive', 'collider N: non-finite number']);
  });
});
