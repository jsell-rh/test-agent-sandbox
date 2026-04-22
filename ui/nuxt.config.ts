// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-11-01',

  // Nuxt 4 app directory layout
  future: {
    compatibilityVersion: 4,
  },

  // Registered modules
  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
  ],

  // @nuxt/content — full markdown support with syntax highlighting
  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
          langs: [
            'typescript',
            'javascript',
            'json',
            'bash',
            'shell',
            'markdown',
            'vue',
            'html',
            'css',
            'yaml',
          ],
        },
        remarkPlugins: {
          'remark-gfm': {},
        },
      },
    },
    documentDriven: false,
  },

  // Global CSS
  css: ['~/assets/css/main.css'],

  // App-level head defaults
  app: {
    head: {
      title: 'Todos',
      titleTemplate: '%s — Todos',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Enterprise-grade todo management application' },
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
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },

  // TypeScript — strict mode for enterprise reliability
  typescript: {
    strict: true,
    typeCheck: false, // run via `nuxt typecheck` in CI
  },

  // Vite config
  vite: {
    server: {
      watch: {
        ignored: ['**/node_modules/**']
      }
    },
    vue: {
      template: {
        transformAssetUrls: {
          base: null,
          includeAbsolute: false,
        },
      },
    },
  },

  // Development tools (disabled in production automatically)
  devtools: { enabled: true },

  // Nitro server engine
  nitro: {
    compressPublicAssets: true,
  },

  // Runtime config (overridable via environment variables)
  runtimeConfig: {
    // Server-side only
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3001',
    // Public (exposed to client)
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME ?? 'Todos',
      appVersion: process.env.npm_package_version ?? '0.0.0',
    },
  },
})
