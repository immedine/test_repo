'use strict';

module.exports = {
  apps: [
    {
      name: 'phsserver',
      script: 'app.min.js',
      instances: 1,
      autorestart: true,
      watch: false,
      log: './logs/combined.log',
      error: './logs/error.log',
      merge_logs: true,
      max_memory_restart: '1G',
      env: {},
    },
  ],
};
