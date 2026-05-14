import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { resolve } from 'node:path'

/**
 * Vitest configuration for UI component and composable tests.
 *
 * Uses happy-dom for a lightweight browser-like environment.
 * unplugin-auto-import simulates Nuxt's auto-import behaviour for Vue APIs.
 */
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue'],
      dts: false,
    }),
  ],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.nuxt', '.output'],
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['app/**/*.{ts,vue}'],
      exclude: [
        'node_modules',
        '.nuxt',
        '.output',
        'app/**/*.test.ts',
      ],
    },
  },
  resolve: {
    alias: {
      // Map ~ to the app directory (Nuxt 4 convention)
      '~': resolve(import.meta.dirname, 'app'),
    },
  },
})
