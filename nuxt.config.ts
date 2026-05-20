// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@nuxt/ui'],

  // Proxy API requests to the Python backend in both dev and production
  nitro: {
    routeRules: {
      '/api/**': {
        proxy: `${process.env.API_URL ?? 'http://localhost:8000'}/api/**`,
      },
    },
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.API_URL ?? 'http://localhost:8000',
    },
  },

  devtools: { enabled: true },
})
