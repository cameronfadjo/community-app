import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Every file shares one emulator, and each test starts from an empty
    // database, so the files take turns
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
