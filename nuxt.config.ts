// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },
  app: {
    baseURL: '/clay_score_card/' // ← THIS IS THE MAGIC LINE
    // buildAssetsDir: '_nuxt'     // default, you can leave it
  },

  css: ['~/assets/css/main.css'],

  // If you're using <NuxtLink> or router, this helps too
  router: {
    options: {
      linkActiveClass: 'active'
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  // Also very important for GitHub Pages
  nitro: {
    baseURL: '/clay_score_card/', // newer Nitro versions need this too
    prerender: {
      routes: ['/'] // makes sure index.html is generated at root
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
