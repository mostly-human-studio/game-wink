/** Spec §10.4 layer boundaries. */
module.exports = {
  forbidden: [
    {
      name: 'pure-layers-stay-pure',
      comment: 'game, levels and shared may import only game, levels and shared (§10.3 rule 1).',
      severity: 'error',
      from: { path: '^src/(game|levels|shared)/' },
      to: { pathNot: '^src/(game|levels|shared)/' },
    },
    {
      name: 'game-through-public-api',
      comment: 'engine, ui and app reach the game only through src/game/index.ts.',
      severity: 'error',
      from: { path: '^src/(engine|ui|app)/' },
      to: { path: '^src/game/', pathNot: '^src/game/index\\.ts$' },
    },
    {
      name: 'no-spike-imports',
      comment: 'Spike code is disposable and never imported by production (§12, §12.1).',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^spikes/' },
    },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
