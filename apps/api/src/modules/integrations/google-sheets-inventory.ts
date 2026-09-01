import type { PrismaClient } from "@prisma/client"

import { badRequest, notFound } from "../../utils/http-error"

type GoogleSheetsInventoryStore = Pick<
  PrismaClient,
  "branch" | "branchInventory"
>

export type GoogleSheetsInventoryItem = {
  ingredientName: string
  unit: string
  onHand: number
  latestPrice: number
}

export function googleSheetsInventoryWhere(branchId: string) {
  return {
    branchId,
    ingredient: { isActive: true },
  } as const
}

export async function loadAllGoogleSheetsInventory(
  store: GoogleSheetsInventoryStore,
  exportedAt = new Date()
) {
  const branches = await store.branch.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      inventoryItems: {
        where: { ingredient: { isActive: true } },
        select: {
          onHand: true,
          ingredient: {
            select: {
              name: true,
              unit: true,
              defaultPrice: true,
            },
          },
        },
      },
    },
    orderBy: { code: "asc" },
  })

  return {
    exportedAt: exportedAt.toISOString(),
    branches: branches.map((branch) => ({
      id: branch.id,
      code: branch.code,
      name: branch.name,
      inventory: branch.inventoryItems
        .map((row) => ({
          ingredientName: row.ingredient.name,
          unit: row.ingredient.unit,
          onHand: Number(row.onHand),
          latestPrice: Number(row.ingredient.defaultPrice),
        }))
        .sort((left, right) =>
          left.ingredientName.localeCompare(right.ingredientName, "th")
        ),
    })),
  }
}

export async function loadGoogleSheetsInventory(
  store: GoogleSheetsInventoryStore,
  branchReference: string,
  exportedAt = new Date()
) {
  const branch = await store.branch.findFirst({
    where: { id: branchReference, isActive: true },
    select: { id: true, code: true, name: true },
  })
  const codeMatches = branch
    ? []
    : await store.branch.findMany({
        where: { code: branchReference, isActive: true },
        select: { id: true, code: true, name: true },
        take: 2,
      })

  if (codeMatches.length > 1) {
    throw badRequest("Branch code is ambiguous. Use the branch ID instead.")
  }

  const resolvedBranch = branch ?? codeMatches[0]

  if (!resolvedBranch) {
    throw notFound("Active branch not found.")
  }

  const rows = await store.branchInventory.findMany({
    where: googleSheetsInventoryWhere(resolvedBranch.id),
    select: {
      onHand: true,
      ingredient: {
        select: {
          name: true,
          unit: true,
          defaultPrice: true,
        },
      },
    },
  })
  const inventory: GoogleSheetsInventoryItem[] = rows
    .map((row) => ({
      ingredientName: row.ingredient.name,
      unit: row.ingredient.unit,
      onHand: Number(row.onHand),
      latestPrice: Number(row.ingredient.defaultPrice),
    }))
    .sort((left, right) =>
      left.ingredientName.localeCompare(right.ingredientName, "th")
    )

  return {
    branch: resolvedBranch,
    exportedAt: exportedAt.toISOString(),
    inventory,
  }
}
