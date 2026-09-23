// Valores sensíveis/específicos do ambiente ficam no .env ao lado deste
// arquivo (na VPS) — ele não é versionado nem sobrescrito pelo deploy.
try {
  process.loadEnvFile(`${__dirname}/.env`);
} catch {
  // sem .env: segue com os valores abaixo / defaults do build
}

module.exports = {
  apps: [{
    name: 'dilirewards-web',
    script: './.output/server/index.mjs',
    watch: false,
    instances: 'max', // Utilizes all available CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 4200 // Default environment variables
    },
    env_production: {
      NODE_ENV: 'production',
      NUXT_PUBLIC_API_BASE_URL: process.env.NUXT_PUBLIC_API_BASE_URL || 'https://api.dilirewards.com.br/api',
      NUXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID,
      NUXT_PUBLIC_APPLE_CLIENT_ID: process.env.NUXT_PUBLIC_APPLE_CLIENT_ID,
      PORT: 3041 // Production-specific variables
    }
  }]
};
