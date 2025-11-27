// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
app: {
    baseURL: '/clay_score_card/',   // Important!
  },
  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui'
  ],
  nitro: {
    preset: 'static',             // generates a fully static site in .output/public
    output: { publicDir: 'dist' } // optional – makes the folder name nicer
  }
})
