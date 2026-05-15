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

  // Global CSS
  css: ['~/assets/css/main.css'],

  // Runtime configuration (server-side secrets + public config)
  runtimeConfig: {
    databasePath: process.env.DATABASE_PATH ?? './todos.db',
    public: {
      apiBase: '/api',
    },
  },

  // Nitro (server) configuration
  nitro: {
    experimental: {
      database: false,
    },
    // Security headers on all routes
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'", // Nuxt requires inline scripts
            "style-src 'self' 'unsafe-inline'", // Nuxt CSS-in-JS requires inline styles
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      },
    },
  },
})
