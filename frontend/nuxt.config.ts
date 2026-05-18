// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-18',
  devtools: { enabled: false },

  modules: ['@nuxtjs/tailwindcss'],

  // Inject global CSS
  css: ['~/assets/css/main.css'],

  // Proxy /api requests to the FastAPI backend during development
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  runtimeConfig: {
    // Server-only: used by Nitro proxy / server routes
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000',
    public: {
      // Exposed to the browser — unused at runtime (proxy handles it), but
      // preserved for future SSR/ISR patterns.
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '',
    },
  },

  app: {
    head: {
      title: 'Todos',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Enterprise-grade todo management with markdown support',
        },
      ],
      link: [
        // Google Fonts — Inter + JetBrains Mono
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
      ],
    },
  },
})
