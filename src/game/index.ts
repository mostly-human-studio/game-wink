/** Public API of the pure game layer. engine, ui and app import from here only (spec §10.4). */
export { TICK_HZ, TICK_SECONDS, TUNING, msToTicks } from './config';
export { SCREEN_RIGHT, SCREEN_UP, type Vec2 } from './math/vec';
export { buildCollisionWorld, type CircleCollider, type Collider, type CollisionWorld, type SegmentCollider } from './collision/primitives';
export { moveCircle, sweepCircle, type MoveResult, type SweepHit } from './collision/sweep';
export { pathTouchesTrigger, pointInTrigger, type TriggerVolume } from './collision/triggers';
export { compileLevel, validateLevel, type Action, type CompiledLevel, type Condition, type Interactable, type LevelDefinition, type Revealable } from './level';
export { initialState, NO_INTENTS, type GameEvent, type GameState, type Intents, type RevealState } from './state';
export { LANTERN_FULL_CHARGE, lanternLevel, lanternRadius } from './lantern';
export { isEligible, selectTarget } from './interactions';
export { step, type StepResult } from './step';
export { hashState } from './hash';
