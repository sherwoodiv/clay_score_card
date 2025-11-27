// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  nitro: { preset: 'static' },

  app: {
    baseURL: '/clay_score_card/',   // Important!
    buildAssetsDir: '_nuxt/'
  },
  css: ['@nuxt/ui/dist/ui.css'],
  modules: ['@nuxt/ui'],
})
