import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    globalSetup: ['test/helpers/globalSetup.js'],
    hookTimeout: 90000,
    testTimeout: 20000,
    fileParallelism: false, // files share one ephemeral DB, run sequentially
  },
});
