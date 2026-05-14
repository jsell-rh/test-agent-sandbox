// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // Nuxt 4 future compatibility flags
  future: {
    compatibilityVersion: 4,
  },

  devtools: { enabled: true },

  // TypeScript strict mode
  typescript: {
    strict: true,
    typeCheck: false, // run separately in CI
  },

  // Runtime configuration (server-side secrets + public config)
  runtimeConfig: {
    databasePath: process.env.DATABASE_PATH ?? './data/todos.db',
    public: {
      apiBase: '/api',
    },
  },

  // Nitro (server) configuration
  nitro: {
    experimental: {
      database: false,
    },
  },
})
