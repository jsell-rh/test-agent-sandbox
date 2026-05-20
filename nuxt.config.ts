// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',

  // SPA mode — no SSR; the spec requires client-side only rendering after initial load.
  ssr: false,

  // Global CSS
  css: ['~/assets/css/main.css'],

  // Proxy /api/* to the Python backend in development.
  // The backend host/port are read from environment variables so they are
  // never hardcoded here.
  nitro: {
    devProxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT ?? '8000'}`,
        changeOrigin: true,
      },
    },
  },

  // Expose runtime config so components can read configurable values without
  // hard-coding them.
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '/api/todos',
      errorDismissMs: Number(process.env.NUXT_PUBLIC_ERROR_DISMISS_MS ?? 5000),
    },
  },

  // TypeScript strict mode
  typescript: {
    strict: true,
  },

  // Vite config for explicit imports in components (needed for vitest compat)
  vite: {
    resolve: {
      alias: {
        '~': new URL('.', import.meta.url).pathname,
      },
    },
  },
})
