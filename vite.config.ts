import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths, so the build works under the GitHub Pages project path (/game-wink/).
  base: './',
  build: { target: 'es2022' },
  test: {
    // Spec §10.4: the game runs headless in plain Node. No jsdom.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
