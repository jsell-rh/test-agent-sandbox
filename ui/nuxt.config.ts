// Nuxt 4 configuration for the Todo UI.
//
// Development: proxies /api requests to the FastAPI backend.
// Production:  set API_BASE_URL env var to the backend origin; or run both
//              behind a reverse-proxy that routes /api to FastAPI and all
//              other requests to this SPA.

export default defineNuxtConfig({
  // ── App metadata ────────────────────────────────────────────────────────────
  app: {
    head: {
      title: 'todos',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'A clean, enterprise Todo application' },
      ],
    },
  },

  // ── SPA mode — matches spec "No full-page reloads after initial load" ───────
  ssr: false,

  // ── Modules ─────────────────────────────────────────────────────────────────
  modules: ['@nuxtjs/tailwindcss'],

  // ── Dev proxy: forwards /api → FastAPI backend ──────────────────────────────
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.API_BASE_URL ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  // ── Runtime config: expose the API base URL to the client ───────────────────
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL ?? '',
    },
  },
})
