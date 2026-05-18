// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@nuxt/ui'],

  /**
   * Runtime config — values are injected at build/runtime.
   * NUXT_PUBLIC_API_BASE: public base URL for the backend API.
   *   - Dev: leave empty; Nitro devProxy forwards /api/* to the backend.
   *   - Production standalone: set to "http://backend-host:port".
   *   - Production behind reverse-proxy: leave empty.
   */
  runtimeConfig: {
    public: {
      apiBase: '', // overridden by NUXT_PUBLIC_API_BASE env var
    },
  },

  /**
   * Nitro dev proxy: forward /api/* to the backend in development.
   * The target URL is read from the NUXT_API_PROXY_TARGET env var.
   * Default: http://localhost:8000
   */
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_API_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
        prependPath: true,
      },
    },
  },

  /**
   * Global CSS — in Nuxt 4 the srcDir is "app/", so paths below
   * are relative to app/.
   */
  css: ['~/assets/css/main.css'],

  // TypeScript strict mode
  typescript: {
    strict: true,
  },
})
