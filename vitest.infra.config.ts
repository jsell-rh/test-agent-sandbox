import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

/**
 * Vitest configuration for server-side infrastructure and API tests.
 *
 * Runs in a plain Node.js environment so that native modules (better-sqlite3)
 * work without Vite transformation.
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
    alias: {
      // ~ resolves to project root (used by server utility files)
      '~': resolve(import.meta.dirname),
      // ~~ also resolves to project root (Nuxt 4 project-root alias used in route handlers)
      '~~': resolve(import.meta.dirname),
    },
  },
})
