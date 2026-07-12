"use server"

import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"

type PurchaseActionInput = {
  branchId: string
  memberId: string
  purchaseDate: string
  vendor?: string
  items: Array<{
    ingredientId: string
    quantity: number
    unit?: string
    unitPrice: number
  }>
}

type InventoryActionInput = {
  branchId: string
  memberId: string
  ingredientId: string
  name: string
  category: string
  unit: string
  defaultPrice: number
  supplier: string
  onHand: number
  reorderPoint: number
  costPerUnit: number
}

type MemberActionInput = {
  actorMemberId: string
  organizationId: string
  name: string
  username: string
  role: string
  branchIds: string[]
}

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function revalidatePortal() {
  revalidatePath("/portal")
  revalidatePath("/portal/purchase")
  revalidatePath("/portal/stock")
  revalidatePath("/portal/recipes")
  revalidatePath("/portal/reports")
  revalidatePath("/portal/members")
}

async function assertBranchAccess(
  tx: Prisma.TransactionClient,
  memberId: string,
  branchId: string
) {
  const access = await tx.memberBranchAccess.findUnique({
    where: {
      memberId_branchId: {
        memberId,
        branchId,
      },
    },
    include: {
      member: true,
      branch: true,
    },
  })

  if (!access || access.member.status !== "active" || !access.branch.isActive) {
    throw new Error("Member does not have access to this branch.")
  }

  return access.member
}

async function assertMemberManager(
  tx: Prisma.TransactionClient,
  actorMemberId: string
) {
  const actor = await tx.member.findUnique({
    where: {
      id: actorMemberId,
    },
    include: {
      branchAccess: true,
    },
  })

  if (
    !actor ||
    actor.status !== "active" ||
    (actor.role !== "owner" && actor.role !== "manager")
  ) {
    throw new Error("Member does not have permission to manage members.")
  }

  return actor
}

async function incrementReservedQuantity(
  tx: Prisma.TransactionClient,
  branchId: string,
  ingredientId: string,
  quantity: number
) {
  await tx.branchInventory.update({
    where: {
      branchId_ingredientId: {
        branchId,
        ingredientId,
      },
    },
    data: {
      reservedQuantity: {
        increment: roundQuantity(quantity),
      },
    },
  })
}

async function decrementReservedQuantity(
  tx: Prisma.TransactionClient,
  branchId: string,
  ingredientId: string,
  quantity: number
) {
  await tx.branchInventory.update({
    where: {
      branchId_ingredientId: {
        branchId,
        ingredientId,
      },
    },
    data: {
      reservedQuantity: {
        decrement: roundQuantity(quantity),
      },
    },
  })
}

export async function createPurchaseAction(input: PurchaseActionInput) {
  const cleanItems = input.items
    .map((item) => ({
      ...item,
      quantity: roundQuantity(Math.max(item.quantity, 0)),
      unitPrice: roundMoney(Math.max(item.unitPrice, 0)),
    }))
    .filter((item) => item.ingredientId && item.quantity > 0)

  if (!input.branchId || !input.memberId || cleanItems.length === 0) {
    throw new Error("Purchase requires branch, member, and at least one item.")
  }

  const purchase = await prisma.$transaction(
    async (tx) => {
      await assertBranchAccess(tx, input.memberId, input.branchId)

      const ingredientIds = cleanItems.map((item) => item.ingredientId)
      const ingredients = await tx.ingredient.findMany({
        where: {
          id: {
            in: ingredientIds,
          },
        },
      })
      const ingredientById = new Map(
        ingredients.map((ingredient) => [ingredient.id, ingredient] as const)
      )
      const totalAmount = roundMoney(
        cleanItems.reduce(
          (total, item) => total + item.quantity * item.unitPrice,
          0
        )
      )

      const createdPurchase = await tx.purchase.create({
        data: {
          branchId: input.branchId,
          createdByMemberId: input.memberId,
          purchaseDate: new Date(input.purchaseDate),
          vendor: input.vendor?.trim() || "ไม่ระบุ",
          status: "posted",
          totalAmount,
        },
      })

      for (const item of cleanItems) {
        const ingredient = ingredientById.get(item.ingredientId)

        if (!ingredient) {
          throw new Error(`Missing ingredient ${item.ingredientId}.`)
        }

        const unit = item.unit?.trim() || ingredient.unit
        const lineTotal = roundMoney(item.quantity * item.unitPrice)
        const inventory = await tx.branchInventory.findUnique({
          where: {
            branchId_ingredientId: {
              branchId: input.branchId,
              ingredientId: item.ingredientId,
            },
          },
        })
        const beforeQuantity = Number(inventory?.onHand ?? 0)
        const afterQuantity = roundQuantity(beforeQuantity + item.quantity)

        if (inventory) {
          await tx.branchInventory.update({
            where: {
              branchId_ingredientId: {
                branchId: input.branchId,
                ingredientId: item.ingredientId,
              },
            },
            data: {
              onHand: afterQuantity,
              costPerUnit: item.unitPrice,
              lastUpdatedAt: new Date(),
            },
          })
        } else {
          await tx.branchInventory.create({
            data: {
              branchId: input.branchId,
              ingredientId: item.ingredientId,
              onHand: afterQuantity,
              reservedQuantity: 0,
              reorderPoint: 0,
              costPerUnit: item.unitPrice,
              lastUpdatedAt: new Date(),
            },
          })
        }

        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: createdPurchase.id,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit,
            unitPrice: item.unitPrice,
            lineTotal,
          },
        })

        await tx.stockMovement.create({
          data: {
            branchId: input.branchId,
            ingredientId: item.ingredientId,
            purchaseItemId: purchaseItem.id,
            createdByMemberId: input.memberId,
            movementType: "purchase_in",
            quantity: item.quantity,
            unit,
            unitCost: item.unitPrice,
            beforeQuantity,
            afterQuantity,
            referenceType: "purchase",
            referenceId: createdPurchase.id,
          },
        })
      }

      return createdPurchase
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  )

  revalidatePortal()
  return purchase
}

export async function updateInventoryItemAction(input: InventoryActionInput) {
  if (!input.name.trim() || !input.unit.trim()) {
    throw new Error("Ingredient name and unit are required.")
  }

  const inventory = await prisma.$transaction(
    async (tx) => {
      await assertBranchAccess(tx, input.memberId, input.branchId)

      const currentIngredient = await tx.ingredient.findUnique({
        where: {
          id: input.ingredientId,
        },
      })

      if (!currentIngredient) {
        throw new Error("Ingredient not found.")
      }

      const duplicateIngredient = await tx.ingredient.findFirst({
        where: {
          organizationId: currentIngredient.organizationId,
          id: {
            not: input.ingredientId,
          },
          name: input.name.trim(),
          unit: input.unit.trim(),
        },
      })

      if (duplicateIngredient) {
        throw new Error("Ingredient name and unit already exist.")
      }

      await tx.ingredient.update({
        where: {
          id: input.ingredientId,
        },
        data: {
          name: input.name.trim(),
          category: input.category.trim() || "วัตถุดิบ",
          unit: input.unit.trim(),
          defaultPrice: roundMoney(Math.max(input.defaultPrice, 0)),
          supplier: input.supplier.trim() || "-",
        },
      })

      return tx.branchInventory.update({
        where: {
          branchId_ingredientId: {
            branchId: input.branchId,
            ingredientId: input.ingredientId,
          },
        },
        data: {
          onHand: roundQuantity(Math.max(input.onHand, 0)),
          reorderPoint: roundQuantity(Math.max(input.reorderPoint, 0)),
          costPerUnit: roundMoney(Math.max(input.costPerUnit, 0)),
          lastUpdatedAt: new Date(),
        },
      })
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  )

  revalidatePortal()
  return inventory
}

export async function pinRecipeAction(input: {
  branchId: string
  memberId: string
  recipeId: string
}) {
  const plan = await prisma.$transaction(
    async (tx) => {
      await assertBranchAccess(tx, input.memberId, input.branchId)

      const existingPlan = await tx.recipePlan.findFirst({
        where: {
          branchId: input.branchId,
          recipeId: input.recipeId,
          status: "pinned",
        },
      })

      if (existingPlan) {
        return existingPlan
      }

      const recipe = await tx.recipe.findFirst({
        where: {
          id: input.recipeId,
          branchId: input.branchId,
          isActive: true,
        },
        include: {
          items: true,
        },
      })

      if (!recipe) {
        throw new Error("Recipe not found.")
      }

      const createdPlan = await tx.recipePlan.create({
        data: {
          branchId: input.branchId,
          recipeId: recipe.id,
          plannedByMemberId: input.memberId,
          status: "pinned",
          batchCount: 1,
        },
      })

      for (const item of recipe.items) {
        await tx.stockReservation.create({
          data: {
            branchId: input.branchId,
            recipePlanId: createdPlan.id,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            status: "active",
          },
        })
        await incrementReservedQuantity(
          tx,
          input.branchId,
          item.ingredientId,
          Number(item.quantity)
        )
      }

      return createdPlan
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  )

  revalidatePortal()
  return plan
}

export async function cookRecipePlanAction(input: {
  branchId: string
  memberId: string
  recipePlanId: string
}) {
  const cookingRun = await prisma.$transaction(
    async (tx) => {
      await assertBranchAccess(tx, input.memberId, input.branchId)

      const plan = await tx.recipePlan.findFirst({
        where: {
          id: input.recipePlanId,
          branchId: input.branchId,
          status: "pinned",
        },
        include: {
          recipe: true,
          reservations: {
            where: {
              status: "active",
            },
            include: {
              ingredient: true,
            },
          },
        },
      })

      if (!plan) {
        throw new Error("Pinned recipe plan not found.")
      }

      const inventories = await tx.branchInventory.findMany({
        where: {
          branchId: input.branchId,
          ingredientId: {
            in: plan.reservations.map((item) => item.ingredientId),
          },
        },
      })
      const inventoryByIngredient = new Map(
        inventories.map((item) => [item.ingredientId, item] as const)
      )

      for (const reservation of plan.reservations) {
        const inventory = inventoryByIngredient.get(reservation.ingredientId)
        const onHand = Number(inventory?.onHand ?? 0)
        const quantity = Number(reservation.quantity)

        if (!inventory || onHand < quantity) {
          throw new Error(
            `Ingredient ${reservation.ingredient.name} is not enough to cook.`
          )
        }
      }

      const createdCookingRun = await tx.cookingRun.create({
        data: {
          branchId: input.branchId,
          recipeId: plan.recipeId,
          recipePlanId: plan.id,
          cookedByMemberId: input.memberId,
          servingsProduced: plan.recipe.servingYield * plan.batchCount,
          status: "completed",
        },
      })

      for (const reservation of plan.reservations) {
        const inventory = inventoryByIngredient.get(reservation.ingredientId)

        if (!inventory) {
          throw new Error("Inventory row disappeared during transaction.")
        }

        const quantity = Number(reservation.quantity)
        const beforeQuantity = Number(inventory.onHand)
        const afterQuantity = roundQuantity(beforeQuantity - quantity)

        await tx.branchInventory.update({
          where: {
            branchId_ingredientId: {
              branchId: input.branchId,
              ingredientId: reservation.ingredientId,
            },
          },
          data: {
            onHand: afterQuantity,
            lastUpdatedAt: new Date(),
          },
        })
        await decrementReservedQuantity(
          tx,
          input.branchId,
          reservation.ingredientId,
          quantity
        )
        await tx.stockReservation.update({
          where: {
            id: reservation.id,
          },
          data: {
            status: "consumed",
            releasedAt: new Date(),
          },
        })
        await tx.stockMovement.create({
          data: {
            branchId: input.branchId,
            ingredientId: reservation.ingredientId,
            cookingRunId: createdCookingRun.id,
            createdByMemberId: input.memberId,
            movementType: "cook_out",
            quantity,
            unit: reservation.ingredient.unit,
            unitCost: inventory.costPerUnit,
            beforeQuantity,
            afterQuantity,
            referenceType: "cooking_run",
            referenceId: createdCookingRun.id,
          },
        })
      }

      await tx.recipePlan.update({
        where: {
          id: plan.id,
        },
        data: {
          status: "cooked",
          cookedAt: new Date(),
        },
      })

      return createdCookingRun
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  )

  revalidatePortal()
  return cookingRun
}

export async function addMemberAction(input: MemberActionInput) {
  const member = await prisma.$transaction(async (tx) => {
    const actor = await assertMemberManager(tx, input.actorMemberId)
    const actorBranchIds = new Set(
      actor.role === "owner"
        ? (
            await tx.branch.findMany({
              where: {
                organizationId: input.organizationId,
                isActive: true,
              },
              select: {
                id: true,
              },
            })
          ).map((branch) => branch.id)
        : actor.branchAccess.map((access) => access.branchId)
    )
    const requestedBranchIds = input.branchIds.filter((branchId) =>
      actorBranchIds.has(branchId)
    )
    const branchIds =
      input.role === "staff" ? requestedBranchIds.slice(0, 1) : requestedBranchIds

    if (
      !input.name.trim() ||
      !input.username.trim() ||
      branchIds.length === 0
    ) {
      throw new Error("Member requires name, username, and branch access.")
    }

    const createdMember = await tx.member.create({
      data: {
        organizationId: input.organizationId,
        primaryBranchId: branchIds[0],
        name: input.name.trim(),
        username: input.username.trim().toLowerCase(),
        passwordHash: "prototype:123456",
        role: input.role,
        status: "invited",
      },
    })

    for (const branchId of branchIds) {
      await tx.memberBranchAccess.create({
        data: {
          memberId: createdMember.id,
          branchId,
        },
      })
    }

    return createdMember
  })

  revalidatePath("/portal/members")
  return member
}
