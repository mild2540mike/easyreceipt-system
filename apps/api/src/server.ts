import { createApp } from "./app"
import { env } from "./config/env"
import { prisma } from "./db/prisma"

const app = createApp()
const server = app.listen(env.PORT, () => {
  console.log(`timetoeat API listening on http://localhost:${env.PORT}`)
  console.log(`Swagger docs available at http://localhost:${env.PORT}/api/v1/docs`)
})

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down timetoeat API.`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on("SIGINT", () => {
  void shutdown("SIGINT")
})

process.on("SIGTERM", () => {
  void shutdown("SIGTERM")
})
