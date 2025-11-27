// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  nitro: { preset: 'static' },

  app: {
    baseURL: '/clay_score_card/',   // Important!
    buildAssetsDir: '_nuxt/'
  },
  modules: ['@nuxt/ui'],
  experimental: {
    payloadExtraction: false   // <-- REQUIRED FOR GITHUB PAGES
  }
})
