import { Router } from "express"
import { z } from "zod"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { forbidden } from "../../utils/http-error"
import {
  getAccessibleBranchIds,
  memberCanViewMenu,
} from "../common/permissions"

export const reportsRouter = Router()

const stockOutMovementTypes = [
  "usage_out",
  "waste_out",
  "sale_out",
  "cook_out",
]

const reportQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00+07:00`)

      return !Number.isNaN(date.getTime()) && bangkokDateKey(date) === value
    }, "Invalid report date.")
    .optional(),
})

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

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

function bangkokDateRange(date: string) {
  const start = new Date(`${date}T00:00:00+07:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  return { start, end }
}

reportsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)

    if (!memberCanViewMenu(member, "reports")) {
      throw forbidden("Member does not have permission to view reports.")
    }

    const query = reportQuerySchema.parse(req.query)
    const dateRange = query.date ? bangkokDateRange(query.date) : null
    const branchIds = await getAccessibleBranchIds(prisma, member.id)

    const [
      branches,
      purchases,
      dailyPurchases,
      stockOutMovements,
      cookingCount,
      stockMovementCount,
    ] = await Promise.all([
        prisma.branch.findMany({
          where: { id: { in: branchIds } },
          orderBy: { code: "asc" },
        }),
        prisma.purchase.aggregate({
          where: {
            branchId: { in: branchIds },
            status: { in: ["saved", "posted"] },
            ...(dateRange
              ? { purchaseDate: { gte: dateRange.start, lt: dateRange.end } }
              : {}),
          },
          _sum: { totalAmount: true },
        }),
        prisma.purchase.findMany({
          where: {
            branchId: { in: branchIds },
            status: { in: ["saved", "posted"] },
            ...(dateRange
              ? { purchaseDate: { gte: dateRange.start, lt: dateRange.end } }
              : {}),
          },
          select: {
            branchId: true,
            purchaseDate: true,
            totalAmount: true,
          },
          orderBy: {
            purchaseDate: "asc",
          },
        }),
        prisma.stockMovement.findMany({
          where: {
            branchId: { in: branchIds },
            movementType: { in: stockOutMovementTypes },
            ...(dateRange
              ? { occurredAt: { gte: dateRange.start, lt: dateRange.end } }
              : {}),
          },
          select: {
            branchId: true,
            occurredAt: true,
            quantity: true,
            unitCost: true,
          },
          orderBy: {
            occurredAt: "asc",
          },
        }),
        prisma.cookingRun.count({
          where: {
            branchId: { in: branchIds },
            ...(dateRange
              ? { cookedAt: { gte: dateRange.start, lt: dateRange.end } }
              : {}),
          },
        }),
        prisma.stockMovement.count({
          where: {
            branchId: { in: branchIds },
            ...(dateRange
              ? { occurredAt: { gte: dateRange.start, lt: dateRange.end } }
              : {}),
          },
        }),
      ])
    const branchNameById = new Map(
      branches.map((branch) => [branch.id, branch.name] as const)
    )
    const dailyPurchaseTotals = new Map<
      string,
      { date: string; branchId: string; branchName: string; total: number }
    >()
    const dailyStockOutTotals = new Map<
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

    let stockOutTotal = 0

    for (const movement of stockOutMovements) {
      const date = bangkokDateKey(movement.occurredAt)
      const key = `${date}:${movement.branchId}`
      const movementTotal = Number(movement.quantity) * Number(movement.unitCost)
      const current =
        dailyStockOutTotals.get(key) ??
        {
          date,
          branchId: movement.branchId,
          branchName: branchNameById.get(movement.branchId) ?? "-",
          total: 0,
        }

      current.total += movementTotal
      stockOutTotal += movementTotal
      dailyStockOutTotals.set(key, current)
    }

    if (query.date) {
      for (const branch of branches) {
        const key = `${query.date}:${branch.id}`
        const emptyBranchTotal = {
          date: query.date,
          branchId: branch.id,
          branchName: branch.name,
          total: 0,
        }

        if (!dailyPurchaseTotals.has(key)) {
          dailyPurchaseTotals.set(key, emptyBranchTotal)
        }

        if (!dailyStockOutTotals.has(key)) {
          dailyStockOutTotals.set(key, { ...emptyBranchTotal })
        }
      }
    }

    const dailyStockOuts = Array.from(dailyStockOutTotals.values())
      .map((item) => ({ ...item, total: roundMoney(item.total) }))
      .sort((first, second) =>
        first.date === second.date
          ? first.branchName.localeCompare(second.branchName, "th")
          : first.date.localeCompare(second.date)
      )

    res.json({
      branchCount: branches.length,
      branchNames: branches.map((branch) => branch.name),
      purchaseTotal: Number(purchases._sum.totalAmount ?? 0),
      dailyPurchases: Array.from(dailyPurchaseTotals.values()).sort((first, second) =>
        first.date === second.date
          ? first.branchName.localeCompare(second.branchName, "th")
          : first.date.localeCompare(second.date)
      ),
      stockOutTotal: roundMoney(stockOutTotal),
      dailyStockOuts,
      cookingCount,
      stockMovementCount,
    })
  })
)
