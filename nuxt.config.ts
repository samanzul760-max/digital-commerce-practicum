export default defineNuxtConfig({
  css: ['~/assets/css/main.css', '~/assets/css/learnec-spec.css', '~/assets/css/learnec-nuxt.css'],
  runtimeConfig: {
    public: {
      practicumDemoAccess: process.env.PRACTICUM_DEMO_ACCESS === 'true',
    },
  },
  devtools: { enabled: false },
  experimental: { appManifest: false },
  nitro: process.env.CENTER_PREVIEW_OUTPUT_DIR
    ? { output: { dir: process.env.CENTER_PREVIEW_OUTPUT_DIR } }
    : undefined,
  typescript: { strict: true },
})
