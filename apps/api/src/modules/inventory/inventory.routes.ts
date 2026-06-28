import type { Prisma } from "@prisma/client"
import { Router } from "express"
import { z } from "zod"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { badRequest, notFound } from "../../utils/http-error"
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

inventoryRouter.patch(
  "/:ingredientId",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const ingredientId = routeParam(req.params.ingredientId, "ingredientId")
    const input = updateInventorySchema.parse(req.body)

    const inventory = await prisma.$transaction(async (tx) => {
      await assertBranchAccess(tx, member.id, branchId)

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
