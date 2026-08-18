import { Prisma } from "@prisma/client"

import { roundMoney } from "../../utils/number"

export const ingredientPriceAttributionInclude = {
  lastPriceUpdatedBy: {
    select: { id: true, name: true },
  },
  lastPriceUpdatedBranch: {
    select: { id: true, code: true, name: true },
  },
} satisfies Prisma.IngredientInclude

type IngredientPriceSource =
  | "purchase"
  | "owner_edit"
  | "ingredient_create"
  | "migration"

export async function recordIngredientPrice(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    branchId: string | null
    memberId: string | null
    ingredientId: string
    unitPrice: number
    source: IngredientPriceSource
    recordedAt?: Date
  }
) {
  const current = await tx.ingredient.findUnique({
    where: { id: input.ingredientId },
    select: { id: true, name: true, defaultPrice: true },
  })

  if (!current) return null

  const unitPrice = roundMoney(input.unitPrice)
  const recordedAt = input.recordedAt ?? new Date()
  const ingredient = await tx.ingredient.update({
    where: { id: input.ingredientId },
    data: {
      defaultPrice: unitPrice,
      lastPriceUpdatedByMemberId: input.memberId,
      lastPriceUpdatedBranchId: input.branchId,
      lastPriceUpdatedAt: recordedAt,
      lastPriceSource: input.source,
    },
    include: ingredientPriceAttributionInclude,
  })

  await tx.auditLog.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      memberId: input.memberId,
      action: "ingredient_price_recorded",
      entityType: "ingredient",
      entityId: input.ingredientId,
      metadataJson: JSON.stringify({
        ingredientId: input.ingredientId,
        ingredientName: current.name,
        source: input.source,
        beforePrice: Number(current.defaultPrice),
        price: unitPrice,
        recordedAt: recordedAt.toISOString(),
      }).slice(0, 4000),
    },
  })

  return ingredient
}
