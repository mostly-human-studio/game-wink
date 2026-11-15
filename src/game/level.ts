import { compareIds, type CueId, type EntityId, type FlagId, type LevelId, type PromptId } from '../shared/ids';
import { buildCollisionWorld, type Collider, type CollisionWorld } from './collision/primitives';
import type { TriggerVolume } from './collision/triggers';

/**
 * Level data contracts (spec §10.5, still illustrative until the spike).
 * This is the Phase 1b subset: puzzle status, items, dialogue and checkpoints
 * arrive with the vertical slice.
 */
export type Condition =
  | { readonly kind: 'flag'; readonly flag: FlagId; readonly is: boolean }
  | { readonly kind: 'revealed'; readonly entity: EntityId }
  | { readonly kind: 'all'; readonly of: readonly Condition[] }
  | { readonly kind: 'any'; readonly of: readonly Condition[] }
  | { readonly kind: 'not'; readonly cond: Condition };

export type Action =
  | { readonly kind: 'setFlag'; readonly flag: FlagId; readonly value: boolean }
  | { readonly kind: 'cue'; readonly cue: CueId };

export interface Revealable {
  readonly id: EntityId;
  /** Anchor point tested against the lantern radius (§7.2). */
  readonly x: number;
  readonly z: number;
  readonly mode: 'persistOnReveal' | 'whileLit';
  readonly dwellMs: number;
}

export interface Interactable {
  readonly id: EntityId;
  readonly x: number;
  readonly z: number;
  /** Metres from Wick's collider centre. */
  readonly range: number;
  readonly prompt: PromptId;
  readonly targetableWhen: Condition;
  /** If set, the targeting system also requires it to be revealed. Authors don't write that rule. */
  readonly revealable?: EntityId;
  readonly onInteract: readonly Action[];
  readonly blockedWhen?: Condition;
  /** Must include a cue: nothing is silent (§7.3). */
  readonly onBlocked?: readonly Action[];
}

export interface LevelDefinition {
  readonly id: LevelId;
  readonly spawn: { readonly x: number; readonly z: number };
  readonly startsWithLantern: boolean;
  readonly flags: readonly FlagId[];
  readonly colliders: readonly Collider[];
  readonly triggers: readonly TriggerVolume[];
  readonly revealables: readonly Revealable[];
  readonly interactables: readonly Interactable[];
}

/** A validated level with everything in ID order and the collision grid built. */
export interface CompiledLevel {
  readonly id: LevelId;
  readonly spawn: { readonly x: number; readonly z: number };
  readonly startsWithLantern: boolean;
  readonly world: CollisionWorld;
  readonly triggers: readonly TriggerVolume[];
  readonly revealables: readonly Revealable[];
  readonly interactables: readonly Interactable[];
  /** revealable ID → index into revealables. Lookup only; never iterated. */
  readonly revealIndex: ReadonlyMap<EntityId, number>;
}

const byId = <T extends { readonly id: string }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => compareIds(a.id, b.id));

function conditionRefs(c: Condition, out: { flags: FlagId[]; entities: EntityId[] }): void {
  switch (c.kind) {
    case 'flag': out.flags.push(c.flag); break;
    case 'revealed': out.entities.push(c.entity); break;
    case 'all': case 'any': for (const sub of c.of) conditionRefs(sub, out); break;
    case 'not': conditionRefs(c.cond, out); break;
  }
}

/** Every problem found, in a stable order. An empty list means the level is valid. */
export function validateLevel(def: LevelDefinition): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const claim = (id: string, what: string): void => {
    if (id.length === 0) problems.push(`${what}: empty ID`);
    if (seen.has(id)) problems.push(`${what} ${id}: duplicate ID`);
    seen.add(id);
  };
  const finite = (what: string, ...values: number[]): void => {
    if (values.some((v) => !Number.isFinite(v))) problems.push(`${what}: non-finite number`);
  };

  finite('spawn', def.spawn.x, def.spawn.z);
  for (const c of def.colliders) {
    claim(c.id, 'collider');
    if (c.kind === 'segment') {
      finite(`collider ${c.id}`, c.ax, c.az, c.bx, c.bz);
      if (c.ax === c.bx && c.az === c.bz) problems.push(`collider ${c.id}: zero-length segment`);
    } else {
      finite(`collider ${c.id}`, c.x, c.z, c.r);
      if (!(c.r > 0)) problems.push(`collider ${c.id}: radius must be positive`);
    }
  }
  for (const t of def.triggers) {
    claim(t.id, 'trigger');
    finite(`trigger ${t.id}`, t.minX, t.minZ, t.maxX, t.maxZ);
    if (t.minX > t.maxX || t.minZ > t.maxZ) problems.push(`trigger ${t.id}: min exceeds max`);
  }
  const revealIds = new Set<string>();
  for (const r of def.revealables) {
    claim(r.id, 'revealable');
    revealIds.add(r.id);
    finite(`revealable ${r.id}`, r.x, r.z, r.dwellMs);
    if (r.dwellMs < 0) problems.push(`revealable ${r.id}: negative dwell`);
  }
  const flagIds = new Set<string>(def.flags);
  if (flagIds.size !== def.flags.length) problems.push('flags: duplicate flag ID');

  const checkCondition = (owner: string, c: Condition): { flags: FlagId[]; entities: EntityId[] } => {
    const refs = { flags: [] as FlagId[], entities: [] as EntityId[] };
    conditionRefs(c, refs);
    for (const f of refs.flags) if (!flagIds.has(f)) problems.push(`${owner}: unknown flag ${f}`);
    for (const e of refs.entities) if (!revealIds.has(e)) problems.push(`${owner}: unknown revealable ${e}`);
    return refs;
  };
  const checkActions = (owner: string, actions: readonly Action[]): void => {
    for (const a of actions) if (a.kind === 'setFlag' && !flagIds.has(a.flag)) problems.push(`${owner}: unknown flag ${a.flag}`);
    if (!actions.some((a) => a.kind === 'cue')) problems.push(`${owner}: must emit at least one cue`);
  };

  for (const it of def.interactables) {
    const owner = `interactable ${it.id}`;
    claim(it.id, 'interactable');
    finite(owner, it.x, it.z, it.range);
    if (!(it.range > 0)) problems.push(`${owner}: range must be positive`);
    if (it.revealable !== undefined && !revealIds.has(it.revealable)) problems.push(`${owner}: unknown revealable ${it.revealable}`);
    const refs = checkCondition(`${owner} targetableWhen`, it.targetableWhen);
    // §7.3: the reveal requirement belongs to the targeting system and can't be restated or overridden.
    if (it.revealable !== undefined && refs.entities.includes(it.revealable)) {
      problems.push(`${owner}: targetableWhen must not reference its own revealable`);
    }
    checkActions(`${owner} onInteract`, it.onInteract);
    if (it.blockedWhen !== undefined) {
      checkCondition(`${owner} blockedWhen`, it.blockedWhen);
      if (it.onBlocked === undefined) problems.push(`${owner}: blockedWhen needs onBlocked`);
    }
    if (it.onBlocked !== undefined) checkActions(`${owner} onBlocked`, it.onBlocked);
  }
  return problems;
}

/** Validates, then freezes everything into ID order. Throws with every problem listed. */
export function compileLevel(def: LevelDefinition): CompiledLevel {
  const problems = validateLevel(def);
  if (problems.length > 0) throw new Error(`Level ${def.id} is invalid:\n- ${problems.join('\n- ')}`);
  const revealables = byId(def.revealables);
  const revealIndex = new Map<EntityId, number>();
  revealables.forEach((r, i) => revealIndex.set(r.id, i));
  return {
    id: def.id,
    spawn: def.spawn,
    startsWithLantern: def.startsWithLantern,
    world: buildCollisionWorld(def.colliders),
    triggers: byId(def.triggers),
    revealables,
    interactables: byId(def.interactables),
    revealIndex,
  };
}
