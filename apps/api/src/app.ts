import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import pinoHttp from "pino-http"

import { env } from "./config/env"
import {
  openApiJsonHandler,
  swaggerUiHandler,
  swaggerUiServe,
} from "./docs/swagger"
import { requireAuth } from "./middleware/auth"
import { errorHandler, notFoundHandler } from "./middleware/error-handler"
import { authRouter } from "./modules/auth/auth.routes"
import { branchesRouter } from "./modules/branches/branches.routes"
import { dashboardRouter } from "./modules/dashboard/dashboard.routes"
import { inventoryRouter } from "./modules/inventory/inventory.routes"
import { membersRouter } from "./modules/members/members.routes"
import { purchasesRouter } from "./modules/purchases/purchases.routes"
import { recipePlansRouter, recipesRouter } from "./modules/recipes/recipes.routes"
import { reportsRouter } from "./modules/reports/reports.routes"

export function createApp() {
  const app = express()

  app.get("/api/v1/openapi.json", openApiJsonHandler)
  app.use("/api/v1/docs", swaggerUiServe, swaggerUiHandler)

  app.use(helmet())
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    })
  )
  app.use(
    pinoHttp({
      enabled: env.NODE_ENV !== "test",
    })
  )
  app.use(express.json({ limit: "1mb" }))
  app.use(cookieParser())

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      ok: true,
      service: "easyreceipt-api",
      timestamp: new Date().toISOString(),
    })
  })

  app.use("/api/v1/auth", authRouter)
  app.use("/api/v1/branches", requireAuth, branchesRouter)
  app.use("/api/v1/branches/:branchId/dashboard", requireAuth, dashboardRouter)
  app.use("/api/v1/branches/:branchId/inventory", requireAuth, inventoryRouter)
  app.use("/api/v1/branches/:branchId/purchases", requireAuth, purchasesRouter)
  app.use("/api/v1/branches/:branchId/recipes", requireAuth, recipesRouter)
  app.use("/api/v1/branches/:branchId/recipe-plans", requireAuth, recipePlansRouter)
  app.use("/api/v1/reports", requireAuth, reportsRouter)
  app.use("/api/v1/members", requireAuth, membersRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
