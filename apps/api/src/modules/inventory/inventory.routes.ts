import type { Prisma } from "@prisma/client"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { Router } from "express"
import { z } from "zod"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { badRequest, forbidden, notFound } from "../../utils/http-error"
import { roundMoney, roundQuantity } from "../../utils/number"
import { routeParam } from "../../utils/route-param"
import {
  assertBranchAccess,
  memberCanEditMenu,
  memberCanViewMenu,
} from "../common/permissions"

const updateInventorySchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).default("วัตถุดิบ"),
  unit: z.string().min(1),
  defaultPrice: z.coerce.number().min(0),
  supplier: z.string().min(1).default("-"),
  onHand: z.coerce.number().min(0),
  reorderPoint: z.coerce.number().min(0),
  costPerUnit: z.coerce.number().min(0),
})

const createIngredientSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1).default("กก."),
  unitPrice: z.coerce.number().min(0).default(0),
  supplier: z.string().min(1).default("ยังไม่ระบุ"),
})

const stockOutSchema = z.object({
  ingredientId: z.string().min(1),
  movementType: z.enum(["waste_out", "sale_out", "usage_out"]),
  quantity: z.coerce.number().positive(),
  reason: z.string().min(1),
  photo: z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    size: z.coerce.number().min(1).max(5 * 1024 * 1024),
    dataUrl: z.string().min(1),
  }),
})

const movementQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  movementType: z.enum(["waste_out", "sale_out", "usage_out", "purchase_in", "cook_out"]).optional(),
})

const usageSchema = z.object({
  occurredAt: z.coerce.date().optional(),
  reason: z.string().min(1),
  items: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        quantity: z.coerce.number().positive(),
      })
    )
    .min(1),
})

export const inventoryRouter = Router({ mergeParams: true })

type InventoryRowWithIngredient = Prisma.BranchInventoryGetPayload<{
  include: { ingredient: true }
}>

type StockMovementWithDetails = Prisma.StockMovementGetPayload<{
  include: { ingredient: true; createdBy: true }
}>

const stockOutUploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "stock-out"
)
const stockOutUploadPublicDir = "public/uploads/stock-out"
const stockOutUploadUrlDir = "/uploads/stock-out"
const allowedStockOutImageTypes: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
}

function safeFileStem(filename: string) {
  const stem = path.parse(filename).name.trim()

  return stem.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 48) || "stock-out"
}

function bangkokDateRange(date: string) {
  return {
    start: new Date(`${date}T00:00:00.000+07:00`),
    end: new Date(`${date}T23:59:59.999+07:00`),
  }
}

function serializeInventoryRow(row: InventoryRowWithIngredient) {
  return {
    id: row.id,
    branchId: row.branchId,
    ingredientId: row.ingredientId,
    ingredient: row.ingredient,
    onHand: Number(row.onHand),
    reservedQuantity: Number(row.reservedQuantity),
    reorderPoint: Number(row.reorderPoint),
    costPerUnit: Number(row.costPerUnit),
    available: Math.max(Number(row.onHand) - Number(row.reservedQuantity), 0),
    suggestedPurchaseQuantity: Math.max(
      Number(row.reservedQuantity) - Number(row.onHand),
      0
    ),
    lastUpdatedAt: row.lastUpdatedAt,
  }
}

function auditReason(metadataJson: string | null) {
  if (!metadataJson) {
    return ""
  }

  try {
    const metadata = JSON.parse(metadataJson) as { reason?: unknown }

    return typeof metadata.reason === "string" ? metadata.reason : ""
  } catch {
    return ""
  }
}

function serializeStockMovement(
  row: StockMovementWithDetails,
  reasonByMovementId = new Map<string, string>()
) {
  return {
    id: row.id,
    branchId: row.branchId,
    ingredientId: row.ingredientId,
    ingredient: row.ingredient,
    createdByMemberId: row.createdByMemberId,
    createdBy: row.createdBy
      ? {
          id: row.createdBy.id,
          name: row.createdBy.name,
          username: row.createdBy.username,
        }
      : null,
    movementType: row.movementType,
    quantity: Number(row.quantity),
    unit: row.unit,
    unitCost: Number(row.unitCost),
    beforeQuantity: Number(row.beforeQuantity),
    afterQuantity: Number(row.afterQuantity),
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    reason: reasonByMovementId.get(row.id) ?? "",
    occurredAt: row.occurredAt,
  }
}

async function saveStockOutPhoto(input: z.infer<typeof stockOutSchema>["photo"]) {
  const match = input.dataUrl.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/
  )

  if (!match) {
    throw badRequest("Invalid stock-out photo payload.")
  }

  const mimeType = match[1].toLowerCase()
  const extension = allowedStockOutImageTypes[mimeType]

  if (!extension || mimeType !== input.type.toLowerCase()) {
    throw badRequest("Stock-out photo must be a supported image file.")
  }

  const buffer = Buffer.from(match[2], "base64")

  if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
    throw badRequest("Stock-out photo must be 5MB or smaller.")
  }

  await mkdir(stockOutUploadDir, { recursive: true })

  const storedName = `${Date.now()}-${randomUUID()}-${safeFileStem(input.name)}${extension}`
  const diskPath = path.join(stockOutUploadDir, storedName)
  await writeFile(diskPath, buffer)

  return {
    originalName: input.name,
    storedName,
    type: mimeType,
    size: buffer.length,
    path: `${stockOutUploadPublicDir}/${storedName}`,
    url: `${stockOutUploadUrlDir}/${storedName}`,
  }
}

inventoryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")

    await assertBranchAccess(prisma, member.id, branchId)

    const rows = await prisma.branchInventory.findMany({
      where: { branchId },
      include: { ingredient: true },
      orderBy: { ingredient: { name: "asc" } },
    })

    res.json({
      inventory: (rows as InventoryRowWithIngredient[]).map(serializeInventoryRow),
    })
  })
)

inventoryRouter.get(
  "/movements",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const query = movementQuerySchema.parse(req.query)

    await assertBranchAccess(prisma, member.id, branchId)

    const where: Prisma.StockMovementWhereInput = { branchId }

    if (query.movementType) {
      where.movementType = query.movementType
    }

    if (query.date) {
      const range = bangkokDateRange(query.date)
      where.occurredAt = {
        gte: range.start,
        lte: range.end,
      }
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        ingredient: true,
        createdBy: true,
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: 100,
    })
    const movementIds = movements.map((movement) => movement.id)
    const auditLogs =
      movementIds.length > 0
        ? await prisma.auditLog.findMany({
            where: {
              branchId,
              entityType: "stock_movement",
              entityId: {
                in: movementIds,
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : []
    const reasonByMovementId = new Map<string, string>()

    for (const log of auditLogs) {
      if (!reasonByMovementId.has(log.entityId)) {
        reasonByMovementId.set(log.entityId, auditReason(log.metadataJson))
      }
    }

    res.json({
      movements: (movements as StockMovementWithDetails[]).map(
        (movement) => serializeStockMovement(movement, reasonByMovementId)
      ),
    })
  })
)

inventoryRouter.get(
  "/usage-reasons",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const access = await assertBranchAccess(prisma, member.id, branchId)

    if (!memberCanViewMenu(access.member, "usage")) {
      throw forbidden("Member does not have permission to view usage reasons.")
    }

    const reasons = await prisma.usageReason.findMany({
      where: {
        organizationId: access.branch.organizationId,
        isActive: true,
      },
      orderBy: {
        label: "asc",
      },
    })

    res.json({
      reasons: reasons.map((reason) => ({
        id: reason.id,
        label: reason.label,
      })),
    })
  })
)

inventoryRouter.post(
  "/ingredients",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = createIngredientSchema.parse(req.body)

    const inventory = await prisma.$transaction(async (tx) => {
      const access = await assertBranchAccess(tx, member.id, branchId)

      if (!memberCanEditMenu(access.member, "purchase")) {
        throw forbidden("Member does not have permission to edit purchases.")
      }

      const name = input.name.trim()
      const unit = input.unit.trim() || "กก."
      const unitPrice = roundMoney(input.unitPrice)
      const supplier = input.supplier.trim() || "ยังไม่ระบุ"
      const existingIngredient = await tx.ingredient.findFirst({
        where: {
          organizationId: access.branch.organizationId,
          name,
          unit,
          isActive: true,
        },
      })
      const ingredient =
        existingIngredient ??
        (await tx.ingredient.create({
          data: {
            organizationId: access.branch.organizationId,
            name,
            category: "วัตถุดิบใหม่",
            unit,
            defaultPrice: unitPrice,
            supplier,
          },
        }))

      return tx.branchInventory.upsert({
        where: {
          branchId_ingredientId: {
            branchId,
            ingredientId: ingredient.id,
          },
        },
        create: {
          branchId,
          ingredientId: ingredient.id,
          onHand: 0,
          reservedQuantity: 0,
          reorderPoint: 0,
          costPerUnit: unitPrice,
          lastUpdatedAt: new Date(),
        },
        update: {
          costPerUnit: unitPrice,
          lastUpdatedAt: new Date(),
        },
        include: {
          ingredient: true,
        },
      })
    })

    res.status(201).json({ inventory })
  })
)

inventoryRouter.post(
  "/usage",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = usageSchema.parse(req.body)

    const result = await prisma.$transaction(async (tx) => {
      const access = await assertBranchAccess(tx, member.id, branchId)

      if (!memberCanEditMenu(access.member, "usage")) {
        throw forbidden("Member does not have permission to adjust stock.")
      }

      const quantityByIngredientId = new Map<string, number>()

      for (const item of input.items) {
        const currentQuantity = quantityByIngredientId.get(item.ingredientId) ?? 0
        quantityByIngredientId.set(
          item.ingredientId,
          roundQuantity(currentQuantity + item.quantity)
        )
      }

      const usageItems = Array.from(quantityByIngredientId.entries()).map(
        ([ingredientId, quantity]) => ({
          ingredientId,
          quantity,
        })
      )
      const inventoryRows = await tx.branchInventory.findMany({
        where: {
          branchId,
          ingredientId: {
            in: usageItems.map((item) => item.ingredientId),
          },
        },
        include: {
          ingredient: true,
        },
      })
      const inventoryByIngredientId = new Map(
        inventoryRows.map((row) => [row.ingredientId, row] as const)
      )

      for (const item of usageItems) {
        const inventory = inventoryByIngredientId.get(item.ingredientId)

        if (!inventory) {
          throw notFound(`Inventory item ${item.ingredientId} not found.`)
        }

        const beforeQuantity = Number(inventory.onHand)

        if (item.quantity > beforeQuantity) {
          throw badRequest(
            `${inventory.ingredient.name} does not have enough stock.`
          )
        }
      }

      const occurredAt = input.occurredAt ?? new Date()
      const updatedInventory: InventoryRowWithIngredient[] = []
      const movements: StockMovementWithDetails[] = []

      for (const item of usageItems) {
        const inventory = inventoryByIngredientId.get(item.ingredientId)

        if (!inventory) {
          throw notFound(`Inventory item ${item.ingredientId} not found.`)
        }

        const beforeQuantity = Number(inventory.onHand)
        const afterQuantity = roundQuantity(beforeQuantity - item.quantity)
        const movement = await tx.stockMovement.create({
          data: {
            branchId,
            ingredientId: item.ingredientId,
            createdByMemberId: member.id,
            movementType: "usage_out",
            quantity: item.quantity,
            unit: inventory.ingredient.unit,
            unitCost: inventory.costPerUnit,
            beforeQuantity,
            afterQuantity,
            referenceType: "manual_usage_out",
            referenceId: member.id,
            occurredAt,
          },
          include: {
            ingredient: true,
            createdBy: true,
          },
        })
        const updatedRow = await tx.branchInventory.update({
          where: {
            branchId_ingredientId: {
              branchId,
              ingredientId: item.ingredientId,
            },
          },
          data: {
            onHand: afterQuantity,
            lastUpdatedAt: new Date(),
          },
          include: {
            ingredient: true,
          },
        })

        await tx.auditLog.create({
          data: {
            organizationId: access.branch.organizationId,
            branchId,
            memberId: member.id,
            action: "usage_out",
            entityType: "stock_movement",
            entityId: movement.id,
            metadataJson: JSON.stringify({
              reason: input.reason.trim(),
              ingredientId: item.ingredientId,
              ingredientName: inventory.ingredient.name,
              quantity: item.quantity,
              unit: inventory.ingredient.unit,
              beforeQuantity,
              afterQuantity,
            }).slice(0, 4000),
          },
        })

        movements.push(movement as StockMovementWithDetails)
        updatedInventory.push(updatedRow as InventoryRowWithIngredient)
      }

      await tx.auditLog.create({
        data: {
          organizationId: access.branch.organizationId,
          branchId,
          memberId: member.id,
          action: "usage_out",
          entityType: "stock_movement_batch",
          entityId: movements[0]?.id ?? branchId,
          metadataJson: JSON.stringify({
            reason: input.reason.trim(),
            occurredAt: occurredAt.toISOString(),
            items: usageItems.map((item) => {
              const inventory = inventoryByIngredientId.get(item.ingredientId)

              return {
                ingredientId: item.ingredientId,
                ingredientName: inventory?.ingredient.name,
                quantity: item.quantity,
                unit: inventory?.ingredient.unit,
              }
            }),
          }).slice(0, 4000),
        },
      })

      return {
        inventory: updatedInventory,
        movements,
      }
    })

    res.status(201).json({
      inventory: result.inventory.map(serializeInventoryRow),
      movements: result.movements.map((movement) =>
        serializeStockMovement(movement)
      ),
    })
  })
)

inventoryRouter.post(
  "/movements",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = stockOutSchema.parse(req.body)

    const inventory = await prisma.$transaction(async (tx) => {
      const access = await assertBranchAccess(tx, member.id, branchId)

      if (!memberCanEditMenu(access.member, "stock")) {
        throw forbidden("Member does not have permission to adjust stock.")
      }

      const currentInventory = await tx.branchInventory.findUnique({
        where: {
          branchId_ingredientId: {
            branchId,
            ingredientId: input.ingredientId,
          },
        },
        include: {
          ingredient: true,
        },
      })

      if (!currentInventory) {
        throw notFound("Inventory item not found.")
      }

      const quantity = roundQuantity(input.quantity)
      const beforeQuantity = Number(currentInventory.onHand)

      if (quantity > beforeQuantity) {
        throw badRequest("Quantity cannot exceed current stock.")
      }

      const afterQuantity = roundQuantity(beforeQuantity - quantity)
      const savedPhoto = await saveStockOutPhoto(input.photo)
      const movement = await tx.stockMovement.create({
        data: {
          branchId,
          ingredientId: input.ingredientId,
          createdByMemberId: member.id,
          movementType: input.movementType,
          quantity,
          unit: currentInventory.ingredient.unit,
          unitCost: currentInventory.costPerUnit,
          beforeQuantity,
          afterQuantity,
          referenceType: "manual_stock_out",
          referenceId: savedPhoto.storedName.slice(0, 64),
        },
      })

      await tx.auditLog.create({
        data: {
          organizationId: access.branch.organizationId,
          branchId,
          memberId: member.id,
          action: input.movementType,
          entityType: "stock_movement",
          entityId: movement.id,
          metadataJson: JSON.stringify({
            reason: input.reason.trim(),
            ingredientId: input.ingredientId,
            ingredientName: currentInventory.ingredient.name,
            quantity,
            unit: currentInventory.ingredient.unit,
            beforeQuantity,
            afterQuantity,
            photo: savedPhoto,
          }).slice(0, 4000),
        },
      })

      return tx.branchInventory.update({
        where: {
          branchId_ingredientId: {
            branchId,
            ingredientId: input.ingredientId,
          },
        },
        data: {
          onHand: afterQuantity,
          lastUpdatedAt: new Date(),
        },
        include: {
          ingredient: true,
        },
      })
    })

    res.status(201).json({ inventory })
  })
)

inventoryRouter.patch(
  "/:ingredientId",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const ingredientId = routeParam(req.params.ingredientId, "ingredientId")
    const input = updateInventorySchema.parse(req.body)

    const inventory = await prisma.$transaction(async (tx) => {
      const access = await assertBranchAccess(tx, member.id, branchId)

      if (!memberCanEditMenu(access.member, "stock")) {
        throw forbidden("Member does not have permission to edit inventory.")
      }

      const currentIngredient = await tx.ingredient.findUnique({
        where: { id: ingredientId },
      })

      if (!currentIngredient) {
        throw notFound("Ingredient not found.")
      }

      const duplicateIngredient = await tx.ingredient.findFirst({
        where: {
          organizationId: currentIngredient.organizationId,
          id: { not: ingredientId },
          name: input.name.trim(),
          unit: input.unit.trim(),
        },
      })

      if (duplicateIngredient) {
        throw badRequest("Ingredient name and unit already exist.")
      }

      await tx.ingredient.update({
        where: { id: ingredientId },
        data: {
          name: input.name.trim(),
          category: input.category.trim() || "วัตถุดิบ",
          unit: input.unit.trim(),
          defaultPrice: roundMoney(input.defaultPrice),
          supplier: input.supplier.trim() || "-",
        },
      })

      return tx.branchInventory.update({
        where: {
          branchId_ingredientId: {
            branchId,
            ingredientId,
          },
        },
        data: {
          onHand: roundQuantity(input.onHand),
          reorderPoint: roundQuantity(input.reorderPoint),
          costPerUnit: roundMoney(input.costPerUnit),
          lastUpdatedAt: new Date(),
        },
        include: {
          ingredient: true,
        },
      })
    })

    res.json({ inventory })
  })
)
