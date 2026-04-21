import { defineConfig } from 'vitest/config'

/**
 * Vitest configuration for server-side infrastructure tests.
 *
 * Distinct from the main `vitest.config.ts` (which uses the Nuxt environment
 * for app-layer component/composable tests). Infrastructure tests run in a
 * plain Node.js environment so that native modules (better-sqlite3) work
 * without Vite transformation.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts'],
    exclude: ['node_modules', '.nuxt', '.output'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['server/**/*.ts'],
      exclude: [
        'node_modules',
        '.nuxt',
        '.output',
        'server/**/*.test.ts',
        'server/plugins/**',
      ],
    },
  },
  resolve: {
    conditions: ['node'],
  },
})
