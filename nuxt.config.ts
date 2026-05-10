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
    gatewayEnabled: process.env.OPENCLAW_GATEWAY_ENABLED === undefined ? Boolean(process.env.OPENCLAW_GATEWAY_URL) : process.env.OPENCLAW_GATEWAY_ENABLED === 'true',
    gatewayRetry: process.env.OPENCLAW_GATEWAY_RETRY === 'true',
    gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || '',
    gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN || '',
    dbPath: process.env.DATABASE_PATH || './data/mission-control.db',
    workspacePath: process.env.WORKSPACE_PATH || `${process.env.HOME}/.openclaw/workspace`,
    public: {
      appName: 'HawkBot Mission Control',
      appVersion: '1.0.0'
    }
  },

  devServer: {
    port: 4000
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    experimental: {
      websocket: true
    }
  },

  eslint: {
    config: {
      stylistic: {
        semi: true,
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
});
