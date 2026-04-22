// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // Nuxt 4 future compatibility flags
  future: {
    compatibilityVersion: 4,
  },

  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxt/eslint',
  ],

  // CSS / global styles
  css: ['~/assets/css/main.css'],

  // TypeScript strict mode
  typescript: {
    strict: true,
    typeCheck: false, // run separately in CI
  },

  // Vite configuration
  vite: {
    define: {
      // Suppress DOMPurify SSR warning
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    },
    server: {
      watch: {
        ignored: ['**/node_modules/**']
      }
    }
  },

  // App metadata
  app: {
    head: {
      title: 'Todos',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Enterprise-grade todo management' },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        },
      ],
    },
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
