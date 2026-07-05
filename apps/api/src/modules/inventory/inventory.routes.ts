import type { Prisma } from "@prisma/client"
import { Router } from "express"
import { z } from "zod"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { badRequest, forbidden, notFound } from "../../utils/http-error"
import { roundMoney, roundQuantity } from "../../utils/number"
import { routeParam } from "../../utils/route-param"
import { assertBranchAccess } from "../common/permissions"

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
})

const stockOutSchema = z.object({
  ingredientId: z.string().min(1),
  movementType: z.enum(["waste_out", "sale_out"]),
  quantity: z.coerce.number().positive(),
  reason: z.string().min(1),
  photo: z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    size: z.coerce.number().min(0),
  }),
})

export const inventoryRouter = Router({ mergeParams: true })

type InventoryRowWithIngredient = Prisma.BranchInventoryGetPayload<{
  include: { ingredient: true }
}>

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
      inventory: (rows as InventoryRowWithIngredient[]).map((row) => ({
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
      const name = input.name.trim()
      const unit = input.unit.trim() || "กก."
      const unitPrice = roundMoney(input.unitPrice)
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
            supplier: "เพิ่มจากใบซื้อ",
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
  "/movements",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = stockOutSchema.parse(req.body)

    const inventory = await prisma.$transaction(async (tx) => {
      const access = await assertBranchAccess(tx, member.id, branchId)

      if (access.member.role !== "owner" && access.member.role !== "manager") {
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
          referenceId: input.photo.name.slice(0, 64),
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
            photo: {
              name: input.photo.name,
              type: input.photo.type,
              size: input.photo.size,
            },
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

      if (access.member.role !== "owner" && access.member.role !== "manager") {
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
