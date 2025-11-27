// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  nitro: { preset: 'static' },

  app: {
    baseURL: '/clay_score_card/',   // Important!
    buildAssetsDir: '/clay_score_card/_nuxt/'
  },
  modules: ['@nuxt/ui'],
  experimental: {
    payloadExtraction: false   // <-- REQUIRED FOR GITHUB PAGES
  }
})
