import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Spec §10.3 rule 5: these can differ in the last bits between browser engines.
const BANNED_MATH = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh',
  'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'pow', 'cbrt', 'hypot', 'random',
];

// Spec §10.3 rule 2: the pure layers never touch the platform.
const BANNED_GLOBALS = [
  'window', 'document', 'navigator', 'performance', 'requestAnimationFrame',
  'cancelAnimationFrame', 'setTimeout', 'setInterval', 'fetch', 'localStorage',
  'sessionStorage', 'Date', 'AudioContext', 'console',
];

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'spikes/', 'coverage/', '.dependency-cruiser.cjs'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['src/game/**/*.ts', 'src/levels/**/*.ts', 'src/shared/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...BANNED_GLOBALS],
      'no-restricted-properties': [
        'error',
        ...BANNED_MATH.map((property) => ({
          object: 'Math',
          property,
          message: 'Banned by spec §10.3 rule 5. Use src/game/math.',
        })),
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date']", message: 'Time is a tick counter (spec §10.3 rule 4).' },
        { selector: "BinaryExpression[operator='**']", message: 'Exponentiation is banned like Math.pow (spec §10.3 rule 5).' },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['three', 'three/*', '**/engine/**', '**/ui/**', '**/app/**'], message: 'Pure layers import only game, levels and shared (spec §10.3 rule 1).' }] },
      ],
    },
  },
);
