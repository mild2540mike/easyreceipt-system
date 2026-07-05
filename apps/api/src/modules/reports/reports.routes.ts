import { Router } from "express"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { getAccessibleBranchIds } from "../common/permissions"

export const reportsRouter = Router()

function bangkokDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"

  return `${year}-${month}-${day}`
}

reportsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchIds = await getAccessibleBranchIds(prisma, member.id)

    const [branches, purchases, dailyPurchases, cookingCount, stockMovementCount] =
      await Promise.all([
        prisma.branch.findMany({
          where: { id: { in: branchIds } },
          orderBy: { code: "asc" },
        }),
        prisma.purchase.aggregate({
          where: { branchId: { in: branchIds }, status: { in: ["saved", "posted"] } },
          _sum: { totalAmount: true },
        }),
        prisma.purchase.findMany({
          where: { branchId: { in: branchIds }, status: { in: ["saved", "posted"] } },
          select: {
            branchId: true,
            purchaseDate: true,
            totalAmount: true,
          },
          orderBy: {
            purchaseDate: "asc",
          },
        }),
        prisma.cookingRun.count({
          where: { branchId: { in: branchIds } },
        }),
        prisma.stockMovement.count({
          where: { branchId: { in: branchIds } },
        }),
      ])
    const branchNameById = new Map(
      branches.map((branch) => [branch.id, branch.name] as const)
    )
    const dailyPurchaseTotals = new Map<
      string,
      { date: string; branchId: string; branchName: string; total: number }
    >()

    for (const purchase of dailyPurchases) {
      const date = bangkokDateKey(purchase.purchaseDate)
      const key = `${date}:${purchase.branchId}`
      const current =
        dailyPurchaseTotals.get(key) ??
        {
          date,
          branchId: purchase.branchId,
          branchName: branchNameById.get(purchase.branchId) ?? "-",
          total: 0,
        }

      current.total += Number(purchase.totalAmount)
      dailyPurchaseTotals.set(key, current)
    }

    res.json({
      branchCount: branches.length,
      branchNames: branches.map((branch) => branch.name),
      purchaseTotal: Number(purchases._sum.totalAmount ?? 0),
      dailyPurchases: Array.from(dailyPurchaseTotals.values()).sort((first, second) =>
        first.date === second.date
          ? first.branchName.localeCompare(second.branchName, "th")
          : first.date.localeCompare(second.date)
      ),
      cookingCount,
      stockMovementCount,
    })
  })
)
