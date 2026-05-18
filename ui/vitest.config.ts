import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    globals: true,
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/**'],
    },
  },
})
