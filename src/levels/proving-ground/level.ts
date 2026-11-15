import { cueId, entityId, flagId, levelId, promptId } from '../../shared/ids';
import type { Collider } from '../../game/collision/primitives';
import { compileLevel, type LevelDefinition } from '../../game/level';

/**
 * Proving ground: a hand-authored test yard for Phase 1b. It is NOT the Forgotten
 * Graveyard. Graveyard collision is extracted from the approved assets (spec §11.3),
 * and those don't exist yet. This level exists so movement, collision, the lantern
 * and targeting can be exercised and replayed against known geometry.
 *
 * Units are metres. The yard is 16 × 12, centred on the origin.
 */
const seg = (id: string, ax: number, az: number, bx: number, bz: number): Collider =>
  ({ kind: 'segment', id: entityId(id), ax, az, bx, bz });
const post = (id: string, x: number, z: number, r: number): Collider => ({ kind: 'circle', id: entityId(id), x, z, r });

const FLAG_RUNE_READ = flagId('FLAG_RUNE_READ');
const FLAG_GATE_OPEN = flagId('FLAG_GATE_OPEN');
const always = { kind: 'all', of: [] } as const;

export const PROVING_GROUND_DEFINITION: LevelDefinition = {
  id: levelId('proving-ground'),
  spawn: { x: -6, z: 4 },
  startsWithLantern: true,
  flags: [FLAG_RUNE_READ, FLAG_GATE_OPEN],
  colliders: [
    // Outer wall.
    seg('WALL_N', -8, -6, 8, -6),
    seg('WALL_E', 8, -6, 8, 6),
    seg('WALL_S', 8, 6, -8, 6),
    seg('WALL_W', -8, 6, -8, -6),
    // A zero-thickness fence: the case a discrete collision check tunnels through.
    seg('FENCE_01', -3, -2, 1, -2),
    // A crypt: a box rotated off-axis.
    seg('CRYPT_A', 3.2, -3.4, 5.0, -3.9),
    seg('CRYPT_B', 5.0, -3.9, 5.4, -2.4),
    seg('CRYPT_C', 5.4, -2.4, 3.6, -1.9),
    seg('CRYPT_D', 3.6, -1.9, 3.2, -3.4),
    // Two posts close enough that Wick can't pass between them.
    post('POST_01', -5, 1.4, 0.25),
    post('POST_02', -4.2, 2.0, 0.25),
    // An acute nook, about 30°, open to the west.
    seg('NOOK_A', 3, 3, 7, 3),
    seg('NOOK_B', 3.5, 5, 7, 3),
  ],
  triggers: [
    // A 5 cm threshold. A dash covers 7 cm a tick, so only the swept test can catch it.
    { id: entityId('TRG_EXIT_THRESHOLD'), minX: 5.6, maxX: 7.9, minZ: -4.55, maxZ: -4.5 },
    { id: entityId('TRG_SPAWN_AREA'), minX: -7.5, maxX: -4.5, minZ: 2.8, maxZ: 5.5 },
  ],
  revealables: [
    { id: entityId('RUNE_01'), x: -5.5, z: -3.5, mode: 'persistOnReveal', dwellMs: 300 },
    { id: entityId('WISP_01'), x: 0, z: 3, mode: 'whileLit', dwellMs: 300 },
  ],
  interactables: [
    {
      id: entityId('IT_SIGN'), x: -1, z: 0.5, range: 1.2, prompt: promptId('PROMPT_READ'),
      targetableWhen: always,
      onInteract: [{ kind: 'cue', cue: cueId('CUE_SIGN_READ') }],
    },
    {
      id: entityId('IT_RUNE_01'), x: -5.5, z: -3.5, range: 1.2, prompt: promptId('PROMPT_READ'),
      targetableWhen: always, revealable: entityId('RUNE_01'),
      onInteract: [{ kind: 'setFlag', flag: FLAG_RUNE_READ, value: true }, { kind: 'cue', cue: cueId('CUE_RUNE_READ') }],
    },
    {
      id: entityId('IT_WISP_01'), x: 0, z: 3, range: 1.2, prompt: promptId('PROMPT_GREET'),
      targetableWhen: always, revealable: entityId('WISP_01'),
      onInteract: [{ kind: 'cue', cue: cueId('CUE_WISP_GIGGLE') }],
    },
    {
      id: entityId('IT_GATE'), x: 7.4, z: -3, range: 1.2, prompt: promptId('PROMPT_PUSH'),
      targetableWhen: { kind: 'flag', flag: FLAG_GATE_OPEN, is: false },
      blockedWhen: { kind: 'flag', flag: FLAG_RUNE_READ, is: false },
      onBlocked: [{ kind: 'cue', cue: cueId('CUE_SHRUG_FIZZLE') }],
      onInteract: [{ kind: 'setFlag', flag: FLAG_GATE_OPEN, value: true }, { kind: 'cue', cue: cueId('CUE_GATE_OPEN') }],
    },
  ],
};

export const PROVING_GROUND = compileLevel(PROVING_GROUND_DEFINITION);
