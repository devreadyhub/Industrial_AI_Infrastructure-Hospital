const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../.env');
const parsedEnv = dotenv.config({ path: envPath }).parsed || {};

module.exports = {
  apps: [
    {
      name: 'hospital-backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        ...parsedEnv,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        ...parsedEnv,
      },
    },
  ],
};
