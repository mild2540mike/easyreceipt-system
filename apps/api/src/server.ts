import { createApp } from "./app"
import { env } from "./config/env"
import { prisma } from "./db/prisma"
import { apiLogger } from "./middleware/request-logger"

const app = createApp()
const server = app.listen(env.PORT, () => {
  apiLogger.info(
    {
      service: "timetoeat-api",
      environment: env.NODE_ENV,
      port: env.PORT,
    },
    `API listening on http://localhost:${env.PORT}`
  )
})

async function shutdown(signal: NodeJS.Signals) {
  apiLogger.info({ signal }, "API shutdown started")

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
