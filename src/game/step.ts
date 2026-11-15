import type { EntityId } from '../shared/ids';
import { moveCircle } from './collision/sweep';
import { pathTouchesTrigger, pointInTrigger } from './collision/triggers';
import { TICK_SECONDS, TUNING } from './config';
import { applyInteract, selectTarget } from './interactions';
import { nextLanternCharge, stepReveal } from './lantern';
import type { CompiledLevel } from './level';
import { clamp, SCREEN_RIGHT, SCREEN_UP } from './math/vec';
import type { GameEvent, GameState, Intents } from './state';

export interface StepResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

const axis = (v: number): number => (Number.isFinite(v) ? clamp(v, -1, 1) : 0);

/**
 * The core contract (spec §10.2): step(state, intents, tick) → { state, events }.
 * Pure and deterministic. `tick` must be exactly state.tick + 1, so a skipped or
 * repeated tick fails loudly instead of desynchronising a replay.
 *
 * Fixed order within the tick (spec §7.3):
 *   1. movement and collision   2. lantern radius and reveal state
 *   3. eligibility and target   4. the interact intent, on that target only
 * Puzzle and NPC machines (5) and checkpoint writes (6) arrive with the vertical slice.
 */
export function step(level: CompiledLevel, state: GameState, intents: Intents, tick: number): StepResult {
  if (tick !== state.tick + 1) throw new Error(`step: expected tick ${state.tick + 1}, got ${tick}`);
  const events: GameEvent[] = [];

  // 1. Movement and collision.
  let mx = axis(intents.moveX), my = axis(intents.moveY);
  const inputLength = Math.sqrt(mx * mx + my * my);
  if (inputLength > 1) { mx /= inputLength; my /= inputLength; } // diagonals are not faster (§5.2)
  const wishX = SCREEN_RIGHT.x * mx + SCREEN_UP.x * my;
  const wishZ = SCREEN_RIGHT.z * mx + SCREEN_UP.z * my;
  const wish = Math.sqrt(wishX * wishX + wishZ * wishZ);
  const moving = wish > 1e-6;

  const raised = state.lantern.owned && intents.lantern;
  // Dash is ignored while the lantern is raised (§5.3).
  let topSpeed: number = intents.dash && !raised ? TUNING.dashSpeed : TUNING.driftSpeed;
  if (raised) topSpeed *= TUNING.lanternSpeedMultiplier;

  const rate = (moving ? topSpeed / TUNING.accelSeconds : TUNING.dashSpeed / TUNING.decelSeconds) * TICK_SECONDS;
  let dvx = wishX * topSpeed - state.wick.vx, dvz = wishZ * topSpeed - state.wick.vz;
  const dv = Math.sqrt(dvx * dvx + dvz * dvz);
  if (dv > rate) { dvx *= rate / dv; dvz *= rate / dv; }
  let vx = state.wick.vx + dvx, vz = state.wick.vz + dvz;

  const move = moveCircle(level.world, state.wick.x, state.wick.z, vx * TICK_SECONDS, vz * TICK_SECONDS, TUNING.wickRadius);
  // Kill velocity into each surface touched, so Wick doesn't keep pushing through a wall he slides along.
  for (const n of move.contacts) {
    const into = vx * n.x + vz * n.z;
    if (into < 0) { vx -= n.x * into; vz -= n.z * into; }
  }
  const wick = {
    x: move.x, z: move.z, vx, vz,
    faceX: moving ? wishX / wish : state.wick.faceX,
    faceZ: moving ? wishZ / wish : state.wick.faceZ,
  };

  const inside: EntityId[] = [];
  for (const trigger of level.triggers) {
    const was = state.inside.includes(trigger.id);
    const now = pointInTrigger(trigger, wick.x, wick.z);
    // A dash clean through a thin trigger still enters and exits it this tick.
    if (!was && (now || pathTouchesTrigger(trigger, move.path))) events.push({ kind: 'triggerEnter', trigger: trigger.id });
    if (!now && (was || pathTouchesTrigger(trigger, move.path))) events.push({ kind: 'triggerExit', trigger: trigger.id });
    if (now) inside.push(trigger.id);
  }

  // 2. Lantern radius and reveal state.
  const charge = nextLanternCharge(state.lantern.charge, raised);
  const reveal = stepReveal(level, state.reveal, wick.x, wick.z, charge, events);

  // 3. Eligibility and target selection.
  const world = { flags: state.flags, reveal, wick };
  const target = selectTarget(level, world, state.target);
  if (target !== state.target) events.push({ kind: 'targetChanged', target });

  // 4. The interact intent, applied only to the target selected in step 3.
  const flags = intents.interact ? applyInteract(level, world, target, events) : state.flags;

  return {
    state: {
      tick,
      wick,
      lantern: { owned: state.lantern.owned, raised, charge },
      reveal,
      flags,
      target,
      inside,
      depenetrations: state.depenetrations + move.depenetrations,
    },
    events,
  };
}
