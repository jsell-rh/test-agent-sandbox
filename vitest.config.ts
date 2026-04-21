import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    include: ['**/*.spec.ts', '**/*.test.ts'],
    exclude: ['node_modules', '.nuxt', '.output'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', '.nuxt', '.output', '**/*.spec.ts', '**/*.test.ts'],
    },
  },
})
