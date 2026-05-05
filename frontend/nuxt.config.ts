// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/hints',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxtjs/google-fonts',
    '@nuxtjs/i18n',
    '@nuxtjs/mcp-toolkit',
    '@nuxtjs/seo',
    '@pinia/nuxt',
    'nuxt-lucide-icons'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  site: {
    name: 'Scheduling App'
  },

  // Backend URL, set from NUXT_PUBLIC_API_BASE (scripts/dev.mjs does this). The browser only talks to /backend/**
  // (same origin), Nitro proxies it to the backend, so session cookies work without extra setup.
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3020'
    }
  },

  routeRules: {
    '/backend/**': { proxy: `${process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3020'}/**` },
    '/': { prerender: true },
    '/admin': { robots: false },
    '/admin/**': { robots: false }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
