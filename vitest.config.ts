import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  resolve: {
    alias: {
      // Mirror Nuxt's ~ alias so store/composable imports resolve in tests.
      '~': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
