module.exports = {
  apps: [
    {
      name: "timetoeat.yanaranop.com",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
    {
      name: "timetoeat-api.yanaranop.com",
      cwd: __dirname,
      script: "apps/api/dist/server.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: "4000",
      },
    },
  ],
}
