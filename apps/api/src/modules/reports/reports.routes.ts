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

const unspecifiedUsageReason = "ไม่ระบุเหตุผล"

type UsageAuditMetadata = {
  reason: string
  batchId: string
}

function usageAuditMetadata(metadataJson: string | null): UsageAuditMetadata {
  if (!metadataJson) {
    return { reason: "", batchId: "" }
  }

  try {
    const metadata = JSON.parse(metadataJson) as {
      reason?: unknown
      batchId?: unknown
    }

    return {
      reason: typeof metadata.reason === "string" ? metadata.reason.trim() : "",
      batchId:
        typeof metadata.batchId === "string" ? metadata.batchId.trim() : "",
    }
  } catch {
    return { reason: "", batchId: "" }
  }
}

const reportDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00+07:00`)

    return !Number.isNaN(date.getTime()) && bangkokDateKey(date) === value
  }, "Invalid report date.")

const reportQuerySchema = z
  .object({
    date: reportDateSchema.optional(),
    from: reportDateSchema.optional(),
    to: reportDateSchema.optional(),
  })
  .superRefine((query, context) => {
    if (query.date && (query.from || query.to)) {
      context.addIssue({
        code: "custom",
        message: "Report date cannot be combined with a date range.",
        path: ["date"],
      })
    }

    if (Boolean(query.from) !== Boolean(query.to)) {
      context.addIssue({
        code: "custom",
        message: "Both report range dates are required.",
        path: query.from ? ["to"] : ["from"],
      })
    }

    if (query.from && query.to && query.from > query.to) {
      context.addIssue({
        code: "custom",
        message: "Report start date must be on or before the end date.",
        path: ["from"],
      })
    }
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

function bangkokDateRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00+07:00`)
  const endDate = new Date(`${to}T00:00:00+07:00`)
  const end = new Date(endDate.getTime() + 24 * 60 * 60 * 1000)

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
    const rangeStart = query.from ?? query.date
    const rangeEnd = query.to ?? query.date
    const dateRange =
      rangeStart && rangeEnd ? bangkokDateRange(rangeStart, rangeEnd) : null
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
            id: true,
            branchId: true,
            movementType: true,
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
    const usageMovements = stockOutMovements.filter(
      (movement) => movement.movementType === "usage_out"
    )
    const usageMovementIds = usageMovements.map((movement) => movement.id)
    const organizationIds = Array.from(
      new Set(branches.map((branch) => branch.organizationId))
    )
    const [usageAuditLogs, activeUsageReasons] = await Promise.all([
      usageMovementIds.length > 0
        ? prisma.auditLog.findMany({
            where: {
              branchId: { in: branchIds },
              action: "usage_out",
              entityType: "stock_movement",
              entityId: { in: usageMovementIds },
            },
            select: {
              entityId: true,
              metadataJson: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      organizationIds.length > 0
        ? prisma.usageReason.findMany({
            where: {
              organizationId: { in: organizationIds },
              isActive: true,
            },
            select: { label: true },
            orderBy: { label: "asc" },
          })
        : Promise.resolve([]),
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
    const usageMetadataByMovementId = new Map<string, UsageAuditMetadata>()

    for (const log of usageAuditLogs) {
      if (!usageMetadataByMovementId.has(log.entityId)) {
        usageMetadataByMovementId.set(
          log.entityId,
          usageAuditMetadata(log.metadataJson)
        )
      }
    }

    const usageGroups = new Map<
      string,
      { date: string; reason: string; total: number }
    >()

    for (const movement of usageMovements) {
      const metadata = usageMetadataByMovementId.get(movement.id)
      const reason = metadata?.reason || unspecifiedUsageReason
      const date = bangkokDateKey(movement.occurredAt)
      const groupKey = metadata?.batchId
        ? `${movement.branchId}:batch:${metadata.batchId}`
        : [
            movement.branchId,
            "legacy",
            reason,
            movement.occurredAt.toISOString(),
          ].join(":")
      const current = usageGroups.get(groupKey) ?? { date, reason, total: 0 }

      current.total += Number(movement.quantity) * Number(movement.unitCost)
      usageGroups.set(groupKey, current)
    }

    const usageReasonTotalsByReason = new Map<
      string,
      { reason: string; total: number; groupCount: number }
    >()

    for (const usageReason of activeUsageReasons) {
      const reason = usageReason.label.trim()

      if (reason && !usageReasonTotalsByReason.has(reason)) {
        usageReasonTotalsByReason.set(reason, {
          reason,
          total: 0,
          groupCount: 0,
        })
      }
    }

    const dailyUsageReasonTotalsByKey = new Map<
      string,
      { date: string; reason: string; total: number; groupCount: number }
    >()

    for (const group of usageGroups.values()) {
      const reasonTotal = usageReasonTotalsByReason.get(group.reason) ?? {
        reason: group.reason,
        total: 0,
        groupCount: 0,
      }
      reasonTotal.total += group.total
      reasonTotal.groupCount += 1
      usageReasonTotalsByReason.set(group.reason, reasonTotal)

      const dailyKey = `${group.date}:${group.reason}`
      const dailyTotal = dailyUsageReasonTotalsByKey.get(dailyKey) ?? {
        date: group.date,
        reason: group.reason,
        total: 0,
        groupCount: 0,
      }
      dailyTotal.total += group.total
      dailyTotal.groupCount += 1
      dailyUsageReasonTotalsByKey.set(dailyKey, dailyTotal)
    }

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

    if (rangeStart && rangeEnd && rangeStart === rangeEnd) {
      for (const branch of branches) {
        const key = `${rangeStart}:${branch.id}`
        const emptyBranchTotal = {
          date: rangeStart,
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
    const usageReasonTotals = Array.from(usageReasonTotalsByReason.values())
      .map((item) => ({ ...item, total: roundMoney(item.total) }))
      .sort(
        (first, second) =>
          second.total - first.total ||
          first.reason.localeCompare(second.reason, "th")
      )
    const dailyUsageReasonTotals = Array.from(
      dailyUsageReasonTotalsByKey.values()
    )
      .map((item) => ({ ...item, total: roundMoney(item.total) }))
      .sort((first, second) =>
        first.date === second.date
          ? first.reason.localeCompare(second.reason, "th")
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
      usageReasonTotals,
      dailyUsageReasonTotals,
      cookingCount,
      stockMovementCount,
    })
  })
)
