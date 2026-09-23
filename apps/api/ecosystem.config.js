module.exports = {
  apps : [{
    name: 'dilirewards-api',
    script: './dist/main.js',
    watch: false,
    env: {
      NODE_ENV: "development",
      PORT: 3000 // Default environment variables
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3040 // Production-specific variables
    }
  }]
};
