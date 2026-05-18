import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // Tailwind CSS v4 via Vite plugin
  vite: {
    plugins: [tailwindcss()],
  },

  // Global CSS entry (imports tailwindcss)
  css: ['~/assets/css/main.css'],

  // TypeScript strict mode
  typescript: {
    strict: true,
  },

  // Dev proxy: forward /api to the Python backend
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.API_BASE_URL ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  // Public runtime config (overridable via NUXT_PUBLIC_* env vars)
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL ?? '',
    },
  },

  // App metadata
  app: {
    head: {
      title: 'todos',
      meta: [
        { name: 'description', content: 'Enterprise task management' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
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
})
