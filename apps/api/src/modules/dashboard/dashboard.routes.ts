import type { Prisma } from "@prisma/client"
import { Router } from "express"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { routeParam } from "../../utils/route-param"
import { assertBranchAccess } from "../common/permissions"

export const dashboardRouter = Router({ mergeParams: true })

type InventoryRowWithIngredient = Prisma.BranchInventoryGetPayload<{
  include: { ingredient: true }
}>

dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")

    await assertBranchAccess(prisma, member.id, branchId)

    const [inventoryRows, purchaseTotal, cookingCount] = await Promise.all([
      prisma.branchInventory.findMany({
        where: { branchId },
        include: { ingredient: true },
        orderBy: { ingredient: { name: "asc" } },
      }),
      prisma.purchase.aggregate({
        where: { branchId, status: "posted" },
        _sum: { totalAmount: true },
      }),
      prisma.cookingRun.count({
        where: { branchId, status: "completed" },
      }),
    ])

    const stockNeeds = (inventoryRows as InventoryRowWithIngredient[])
      .map((row) => {
        const onHand = Number(row.onHand)
        const reservedQuantity = Number(row.reservedQuantity)
        return {
          ingredientId: row.ingredientId,
          name: row.ingredient.name,
          unit: row.ingredient.unit,
          onHand,
          reservedQuantity,
          suggestedPurchaseQuantity: Math.max(reservedQuantity - onHand, 0),
        }
      })
      .filter((row) => row.suggestedPurchaseQuantity > 0)
      .sort(
        (first, second) =>
          second.suggestedPurchaseQuantity - first.suggestedPurchaseQuantity
      )

    res.json({
      purchaseTotal: Number(purchaseTotal._sum?.totalAmount ?? 0),
      cookingCount,
      stockNeedCount: stockNeeds.length,
      stockNeeds,
    })
  })
)
