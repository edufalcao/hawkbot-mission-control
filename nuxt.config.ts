// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789',
    gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN || '',
    dbPath: process.env.DATABASE_PATH || './data/mission-control.db',
    workspacePath: process.env.WORKSPACE_PATH || `${process.env.HOME}/.openclaw/workspace`,
    public: {
      appName: 'HawkBot Mission Control',
      appVersion: '1.0.0'
    }
  },

  nitro: {
    experimental: {
      websocket: true
    }
  },

  devServer: {
    port: 4000
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
