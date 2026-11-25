// ============================================================
// PM2 Ecosystem Config — ACS React Admin (TanStack Start + Nitro)
// Usage: pm2 start ecosystem.config.js --only acs-admin
// ============================================================

module.exports = {
  apps: [
    // Production — main branch
    {
      name: "acs-admin",
      script: ".output/server/index.mjs",
      cwd: "/var/www/acs-admin",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 7967,
        NITRO_PORT: 7967,
        HOST: "0.0.0.0",
        NITRO_HOST: "0.0.0.0",
      },
      log_file: "/var/log/pm2/acs-admin.log",
      out_file: "/var/log/pm2/acs-admin-out.log",
      error_file: "/var/log/pm2/acs-admin-err.log",
      time: true,
    },
    // Test / Staging — test branch
    {
      name: "test-acs-admin",
      script: ".output/server/index.mjs",
      cwd: "/var/www/test-acs-admin",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "staging",
        PORT: 7968,
        NITRO_PORT: 7968,
        HOST: "0.0.0.0",
        NITRO_HOST: "0.0.0.0",
      },
      log_file: "/var/log/pm2/test-acs-admin.log",
      out_file: "/var/log/pm2/test-acs-admin-out.log",
      error_file: "/var/log/pm2/test-acs-admin-err.log",
      time: true,
    },
  ],
};
