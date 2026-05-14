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
      '~': resolve(import.meta.dirname),
    },
  },
})
