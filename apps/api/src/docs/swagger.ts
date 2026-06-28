import type { RequestHandler } from "express"
import swaggerUi from "swagger-ui-express"

import { openApiDocument } from "./openapi"

export const openApiJsonHandler: RequestHandler = (_req, res) => {
  res.json(openApiDocument)
}

export const swaggerUiServe = swaggerUi.serve

export const swaggerUiHandler = swaggerUi.setup(openApiDocument, {
  customSiteTitle: "EasyReceipt API Docs",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
})
