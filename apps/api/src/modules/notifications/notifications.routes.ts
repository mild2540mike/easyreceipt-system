import { Prisma } from "@prisma/client"
import { Router } from "express"
import { z } from "zod"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { routeParam } from "../../utils/route-param"
import { assertBranchAccess } from "../common/permissions"

const notificationQuerySchema = z.object({
  branchId: z.string().min(1),
  days: z.coerce.number().int().min(1).max(30).default(7),
  limit: z.coerce.number().int().min(1).max(50).default(50),
})

const inventoryActions = [
  "purchase_received",
  "usage_out",
  "inventory_updated",
] as const
const authActions = ["auth_login", "auth_logout"] as const

export const notificationsRouter = Router()

function parseMetadata(value: string | null) {
  if (!value) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function notificationCopy(
  action: string,
  metadata: Record<string, unknown>,
  actorName: string
) {
  if (action === "purchase_received") {
    const name = String(metadata.name || "บิลรับเข้า")
    const itemCount = Number(metadata.itemCount || 0)
    return {
      title: `รับเข้าวัตถุดิบ · ${name}`,
      summary: `${actorName} บันทึกรับเข้า ${itemCount} รายการ`,
    }
  }

  if (action === "usage_out") {
    const name = String(metadata.name || "รายการของใช้ไป")
    const items = Array.isArray(metadata.items) ? metadata.items : []
    const itemCount = Number(metadata.itemCount || items.length)
    return {
      title: `ใช้วัตถุดิบ · ${name}`,
      summary: `${actorName} บันทึกใช้ไป ${itemCount} รายการ`,
    }
  }

  if (action === "inventory_updated") {
    const ingredientName = String(metadata.ingredientName || "วัตถุดิบ")
    const changes = Array.isArray(metadata.changes) ? metadata.changes : []
    return {
      title: `แก้ไขคลัง · ${ingredientName}`,
      summary: `${actorName} แก้ไขข้อมูล ${changes.length} จุด`,
    }
  }

  if (action === "auth_logout") {
    return {
      title: "ออกจากระบบ",
      summary: `${actorName} ออกจากระบบ`,
    }
  }

  return {
    title: "เข้าสู่ระบบ",
    summary: `${actorName} เข้าใช้งานระบบ`,
  }
}

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const query = notificationQuerySchema.parse(req.query)
    const branchId = routeParam(query.branchId, "branchId")
    const access = await assertBranchAccess(prisma, member.id, branchId)
    const from = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000)
    const recentFrom = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const canViewAllAuth = member.role === "owner" || member.role === "manager"
    const visibility: Prisma.AuditLogWhereInput = {
      organizationId: access.branch.organizationId,
      OR: [
        {
          branchId,
          action: inventoryActions[0],
          entityType: "purchase",
        },
        {
          branchId,
          action: inventoryActions[1],
          entityType: "stock_movement_batch",
        },
        {
          branchId,
          action: inventoryActions[2],
          entityType: "branch_inventory",
        },
        {
          action: { in: [...authActions] },
          entityType: "auth_session",
          ...(canViewAllAuth ? {} : { memberId: member.id }),
        },
      ],
    }
    const where: Prisma.AuditLogWhereInput = {
      ...visibility,
      createdAt: { gte: from },
    }
    const [logs, recentCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          member: { select: { id: true, name: true, username: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: query.limit + 1,
      }),
      prisma.auditLog.count({
        where: {
          ...visibility,
          createdAt: { gte: recentFrom },
        },
      }),
    ])
    const hasMore = logs.length > query.limit
    const notifications = logs.slice(0, query.limit).map((log) => {
      const metadata = parseMetadata(log.metadataJson)
      const actorName = log.member?.name || log.member?.username || "ระบบ"
      const copy = notificationCopy(log.action, metadata, actorName)

      return {
        id: log.id,
        type: log.action,
        actor: log.member
          ? {
              id: log.member.id,
              name: actorName,
              username: log.member.username,
            }
          : null,
        branch: log.branch,
        occurredAt: log.createdAt.toISOString(),
        title: copy.title,
        summary: copy.summary,
        metadata,
      }
    })

    res.json({
      notifications,
      recentCount,
      pageInfo: {
        limit: query.limit,
        hasMore,
      },
    })
  })
)
