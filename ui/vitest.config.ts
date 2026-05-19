import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules'],
  },
  resolve: {
    alias: {
      '~/types/todo': '/app/types/todo.ts',
    },
  },
})
