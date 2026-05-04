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

  routeRules: {
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
