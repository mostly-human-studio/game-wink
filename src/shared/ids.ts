/** Branded identifiers (spec §10.5). A brand stops one kind of ID being passed as another. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type EntityId = Brand<string, 'EntityId'>;
export type FlagId = Brand<string, 'FlagId'>;
export type CueId = Brand<string, 'CueId'>;
export type PromptId = Brand<string, 'PromptId'>;
export type LevelId = Brand<string, 'LevelId'>;

export const entityId = (s: string): EntityId => s as EntityId;
export const flagId = (s: string): FlagId => s as FlagId;
export const cueId = (s: string): CueId => s as CueId;
export const promptId = (s: string): PromptId => s as PromptId;
export const levelId = (s: string): LevelId => s as LevelId;

/**
 * Code-unit ordering. Deterministic on every engine, unlike localeCompare,
 * which depends on the host locale (spec §10.3 rule 6).
 */
export const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
