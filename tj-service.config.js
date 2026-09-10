module.exports = {
  apps: [
    {
      name: "timetoeat.yanaranop.com",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        PORT: 3000,
        NODE_ENV: "production"
      }
    },
    {
      name: "timetoeat-api.yanaranop.com",
      script: "apps/api/dist/server.js",
      env: {
        PORT: 4000,
        NODE_ENV: "production"
      }
    }
  ]
}