import { compareIds, type EntityId, type FlagId } from '../shared/ids';
import { holds } from './conditions';
import { TUNING } from './config';
import type { Action, CompiledLevel, Interactable } from './level';
import type { GameEvent, GameState } from './state';

type World = Pick<GameState, 'flags' | 'reveal' | 'wick'>;

/**
 * Eligibility is the only path to an interaction (spec §7.3): in range, targetableWhen
 * holds, and its revealable (if any) is currently revealed. The reveal rule lives here,
 * not in level data, so it can't be forgotten.
 */
export function isEligible(level: CompiledLevel, state: World, it: Interactable): boolean {
  if (it.revealable !== undefined) {
    const index = level.revealIndex.get(it.revealable);
    if (index === undefined || state.reveal[index]?.revealed !== true) return false;
  }
  const dx = it.x - state.wick.x, dz = it.z - state.wick.z;
  if (dx * dx + dz * dz > it.range * it.range) return false;
  return holds(level, state, it.targetableWhen);
}

/** Closer and more squarely faced scores higher. Range 0…1. */
function score(state: World, it: Interactable): number {
  const dx = it.x - state.wick.x, dz = it.z - state.wick.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  const facing = d > 1e-6 ? (state.wick.faceX * dx + state.wick.faceZ * dz) / d : 1;
  return TUNING.scoreDistanceWeight * (1 - d / it.range) + TUNING.scoreFacingWeight * ((facing + 1) / 2);
}

/**
 * Exactly one target. The current target is kept unless it became ineligible (dropped
 * the same tick) or a rival scores at least 15% higher, which prevents flicker.
 */
export function selectTarget(level: CompiledLevel, state: World, current: EntityId | null): EntityId | null {
  let best: Interactable | null = null;
  let bestScore = -1;
  let currentScore: number | null = null;
  // Interactables are in ID order, so ties resolve to the lower ID.
  for (const it of level.interactables) {
    if (!isEligible(level, state, it)) continue;
    const s = score(state, it);
    if (it.id === current) currentScore = s;
    if (s > bestScore) { best = it; bestScore = s; }
  }
  if (best === null) return null;
  if (currentScore !== null && best.id !== current && bestScore < currentScore * TUNING.targetSwitchRatio) return current;
  return best.id;
}

function run(actions: readonly Action[], source: EntityId, flags: readonly FlagId[], events: GameEvent[]): readonly FlagId[] {
  let next = flags;
  for (const a of actions) {
    if (a.kind === 'cue') events.push({ kind: 'cue', cue: a.cue, source });
    else if (a.value && !next.includes(a.flag)) next = [...next, a.flag].sort(compareIds);
    else if (!a.value && next.includes(a.flag)) next = next.filter((f) => f !== a.flag);
  }
  return next;
}

/** The interact intent applies only to the selected target. With no target it does nothing. */
export function applyInteract(level: CompiledLevel, state: World, target: EntityId | null, events: GameEvent[]): readonly FlagId[] {
  if (target === null) return state.flags;
  const it = level.interactables.find((candidate) => candidate.id === target);
  if (!it) return state.flags;
  if (it.blockedWhen !== undefined && holds(level, state, it.blockedWhen)) {
    events.push({ kind: 'blocked', target });
    return run(it.onBlocked ?? [], target, state.flags, events);
  }
  events.push({ kind: 'interacted', target });
  return run(it.onInteract, target, state.flags, events);
}
