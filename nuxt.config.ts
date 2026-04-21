// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@nuxt/ui',
    '@nuxt/content',
  ],

  ui: {
    colorMode: true,
  },

  content: {
    highlight: {
      theme: {
        default: 'github-light',
        dark: 'github-dark',
      },
      langs: [
        'typescript',
        'javascript',
        'vue',
        'bash',
        'json',
        'yaml',
        'markdown',
        'css',
        'html',
        'sql',
        'python',
        'go',
        'rust',
      ],
    },
    markdown: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
  },

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },

  app: {
    head: {
      title: 'Enterprise Platform',
      titleTemplate: '%s | Enterprise Platform',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Enterprise documentation and application platform built with Nuxt 4',
        },
        { name: 'theme-color', content: '#1e40af' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Enterprise Platform' },
        {
          property: 'og:description',
          content: 'Enterprise documentation and application platform built with Nuxt 4',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
