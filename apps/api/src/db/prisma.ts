import { PrismaMssql } from "@prisma/adapter-mssql"
import { PrismaClient } from "@prisma/client"

import { env } from "../config/env"

const globalForPrisma = globalThis as unknown as {
  apiPrisma?: PrismaClient
}

const adapter = new PrismaMssql(env.DATABASE_URL)

export const prisma =
  globalForPrisma.apiPrisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (env.NODE_ENV !== "production") {
  globalForPrisma.apiPrisma = prisma
}
