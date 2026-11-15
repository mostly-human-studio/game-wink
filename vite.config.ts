import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: { target: 'es2022' },
  test: {
    // Spec §10.4: the game runs headless in plain Node. No jsdom.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
