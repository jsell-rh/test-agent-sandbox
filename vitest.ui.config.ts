import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'

/**
 * Vitest configuration for UI component and composable tests.
 *
 * Uses happy-dom for a lightweight DOM implementation, suitable for
 * Vue component rendering and reactive composable testing.
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['app/**/*.test.ts'],
    exclude: ['node_modules', '.nuxt', '.output'],
  },
  resolve: {
    alias: {
      // In Nuxt 4 (compatibilityVersion: 4), srcDir defaults to 'app/'
      // so ~ and ~~ resolve to <root>/app/ (the source directory).
      '~': resolve(import.meta.dirname, 'app'),
      '~~': resolve(import.meta.dirname, 'app'),
    },
  },
})
