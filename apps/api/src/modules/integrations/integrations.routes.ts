import { Router } from "express"

import { env } from "../../config/env"
import { hasValidGoogleSheetsSyncToken } from "../../config/google-sheets-sync"
import { prisma } from "../../db/prisma"
import { asyncHandler } from "../../utils/async-handler"
import { unauthorized } from "../../utils/http-error"
import { routeParam } from "../../utils/route-param"
import {
  loadAllGoogleSheetsInventory,
  loadGoogleSheetsInventory,
} from "./google-sheets-inventory"

export const integrationsRouter = Router()

function requireIntegrationToken(suppliedToken: string | undefined) {
  if (
    !hasValidGoogleSheetsSyncToken(
      env.GOOGLE_SHEETS_SYNC_CREDENTIALS,
      suppliedToken
    )
  ) {
    throw unauthorized("Invalid Google Sheets integration token.")
  }
}

integrationsRouter.get(
  "/google-sheets/inventory",
  asyncHandler(async (req, res) => {
    requireIntegrationToken(req.header("x-integration-token"))
    res.json(await loadAllGoogleSheetsInventory(prisma))
  })
)

integrationsRouter.get(
  "/google-sheets/branches/:branchId/inventory",
  asyncHandler(async (req, res) => {
    const branchId = routeParam(req.params.branchId, "branchId")
    const suppliedToken = req.header("x-integration-token")

    requireIntegrationToken(suppliedToken)

    res.json(await loadGoogleSheetsInventory(prisma, branchId))
  })
)
