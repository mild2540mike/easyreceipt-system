import { PrismaMssql } from "@prisma/adapter-mssql"
import { PrismaClient } from "@prisma/client/edge"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const connectionString: string = process.env.DATABASE_URL!;

const adapter = new PrismaMssql(connectionString)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
