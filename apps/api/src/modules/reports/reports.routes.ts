import { Router } from "express"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { getAccessibleBranchIds } from "../common/permissions"

export const reportsRouter = Router()

reportsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchIds = await getAccessibleBranchIds(prisma, member.id)

    const [branches, purchases, cookingCount, stockMovementCount] =
      await Promise.all([
        prisma.branch.findMany({
          where: { id: { in: branchIds } },
          orderBy: { code: "asc" },
        }),
        prisma.purchase.aggregate({
          where: { branchId: { in: branchIds }, status: "posted" },
          _sum: { totalAmount: true },
        }),
        prisma.cookingRun.count({
          where: { branchId: { in: branchIds } },
        }),
        prisma.stockMovement.count({
          where: { branchId: { in: branchIds } },
        }),
      ])

    res.json({
      branchCount: branches.length,
      branchNames: branches.map((branch) => branch.name),
      purchaseTotal: Number(purchases._sum.totalAmount ?? 0),
      cookingCount,
      stockMovementCount,
    })
  })
)
