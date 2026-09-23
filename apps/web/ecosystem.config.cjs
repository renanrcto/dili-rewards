module.exports = {
  apps: [{
    name: 'dilirewards-web',
    script: './.output/server/index.mjs',
    watch: '.',
    instances: 'max', // Utilizes all available CPU cores
    args: 'start',
    env: {
      NODE_ENV: 'development',
      PORT: 3000 // Default environment variables
    },
    env_production: {
      NODE_ENV: 'production',
      NUXT_PUBLIC_API_BASE:'https://api.dilirewards.com.br',
      NUXT_PUBLIC_API_KEY:'rewards-api:mSTXrMmTZbWq1HViUqiJg7tD0LUgIRyOkZX8oBmj5chKogShnRXRq7Fmq4GfdqxK',
      PORT: 3041 // Production-specific variables
    }
  }]
};