import { createApp } from "./app"
import { env } from "./config/env"
import { prisma } from "./db/prisma"

const app = createApp()
const server = app.listen(env.PORT)

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on("SIGINT", () => {
  void shutdown()
})

process.on("SIGTERM", () => {
  void shutdown()
})
