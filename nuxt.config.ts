// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  nitro: { preset: 'static' },

  app: {
    baseURL: '/clay_score_card/',   // Important!
  },

  modules: ['@nuxt/ui'],
})