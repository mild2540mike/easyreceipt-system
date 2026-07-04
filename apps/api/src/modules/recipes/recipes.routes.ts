import { randomUUID } from "node:crypto"

import { Prisma } from "@prisma/client"
import { Router } from "express"
import { z } from "zod"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { badRequest, notFound } from "../../utils/http-error"
import { roundMoney, roundQuantity } from "../../utils/number"
import { routeParam } from "../../utils/route-param"
import { assertBranchAccess } from "../common/permissions"

const recipeItemSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.coerce.number().positive(),
})

const recipeInputSchema = z.object({
  name: z.string().min(1),
  menuCategory: z.string().min(1).default("เมนูทั่วไป"),
  yield: z.coerce.number().int().positive(),
  pricePerServing: z.coerce.number().min(0),
  ingredients: z.array(recipeItemSchema).min(1),
})

export const recipesRouter = Router({ mergeParams: true })
export const recipePlansRouter = Router({ mergeParams: true })

type RecipeWithItemsAndPlans = Prisma.RecipeGetPayload<{
  include: {
    items: { include: { ingredient: true } }
    plans: { include: { reservations: true } }
  }
}>
type RecipeWithItems = Prisma.RecipeGetPayload<{
  include: { items: true }
}>
type RecipePlanForCooking = Prisma.RecipePlanGetPayload<{
  include: {
    recipe: true
    reservations: { include: { ingredient: true } }
  }
}>

function bangkokDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}

function bangkokDayRange(date = new Date()) {
  const key = bangkokDateKey(date)

  return {
    start: new Date(`${key}T00:00:00.000+07:00`),
    end: new Date(`${key}T23:59:59.999+07:00`),
  }
}

function serializeRecipe(recipe: RecipeWithItemsAndPlans) {
  if (!recipe) {
    return null
  }

  return {
    id: recipe.id,
    branchId: recipe.branchId,
    name: recipe.name,
    menuCategory: recipe.menuCategory,
    yield: recipe.servingYield,
    pricePerServing: Number(recipe.pricePerServing),
    isActive: recipe.isActive,
    items: recipe.items.map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId,
      ingredient: item.ingredient,
      quantity: Number(item.quantity),
    })),
    pinnedPlans: recipe.plans.map((plan) => ({
      id: plan.id,
      status: plan.status,
      batchCount: plan.batchCount,
      plannedAt: plan.plannedAt,
      cookedAt: plan.cookedAt,
      reservations: plan.reservations.map((reservation) => ({
        id: reservation.id,
        ingredientId: reservation.ingredientId,
        quantity: Number(reservation.quantity),
        status: reservation.status,
      })),
    })),
  }
}

async function refreshReservedQuantity(
  tx: Prisma.TransactionClient,
  branchId: string,
  ingredientId: string
) {
  const total = await tx.stockReservation.aggregate({
    where: {
      branchId,
      ingredientId,
      status: "active",
    },
    _sum: {
      quantity: true,
    },
  })

  await tx.branchInventory.update({
    where: {
      branchId_ingredientId: {
        branchId,
        ingredientId,
      },
    },
    data: {
      reservedQuantity: Number(total._sum.quantity ?? 0),
    },
  })
}

async function releaseStalePinnedPlans(
  tx: Prisma.TransactionClient,
  branchId: string
) {
  const today = bangkokDayRange()
  const staleReservations = await tx.stockReservation.findMany({
    where: {
      branchId,
      status: "active",
      recipePlan: {
        branchId,
        status: "pinned",
        plannedAt: {
          lt: today.start,
        },
      },
    },
    select: {
      ingredientId: true,
    },
  })
  const touchedIngredientIds = new Set(
    staleReservations.map((reservation) => reservation.ingredientId)
  )

  if (staleReservations.length === 0) {
    return
  }

  await tx.stockReservation.updateMany({
    where: {
      branchId,
      status: "active",
      recipePlan: {
        branchId,
        status: "pinned",
        plannedAt: {
          lt: today.start,
        },
      },
    },
    data: {
      status: "released",
      releasedAt: new Date(),
    },
  })
  await tx.recipePlan.updateMany({
    where: {
      branchId,
      status: "pinned",
      plannedAt: {
        lt: today.start,
      },
    },
    data: {
      status: "cancelled",
    },
  })

  for (const ingredientId of touchedIngredientIds) {
    await refreshReservedQuantity(tx, branchId, ingredientId)
  }
}

recipesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const today = bangkokDayRange()

    await assertBranchAccess(prisma, member.id, branchId)
    await prisma.$transaction(async (tx) => {
      await releaseStalePinnedPlans(tx, branchId)
    })

    const recipes = await prisma.recipe.findMany({
      where: { branchId, isActive: true },
      include: {
        items: { include: { ingredient: true } },
        plans: {
          where: {
            status: { in: ["pinned", "cooked"] },
            plannedAt: {
              gte: today.start,
              lte: today.end,
            },
          },
          include: { reservations: true },
          orderBy: { plannedAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    })

    res.json({
      recipes: (recipes as RecipeWithItemsAndPlans[]).map(serializeRecipe),
    })
  })
)

recipesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = recipeInputSchema.parse(req.body)

    const recipe = await prisma.$transaction(async (tx) => {
      await assertBranchAccess(tx, member.id, branchId)

      const recipeId = `recipe-${randomUUID()}`
      const now = new Date()

      await tx.$executeRaw`
        INSERT INTO [recipes] (
          [id],
          [branchId],
          [name],
          [menuCategory],
          [yield],
          [pricePerServing],
          [isActive],
          [createdAt],
          [updatedAt]
        )
        VALUES (
          CAST(${recipeId} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS,
          CAST(${branchId} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS,
          CAST(${input.name.trim()} AS NVARCHAR(180)) COLLATE SQL_Latin1_General_CP1_CI_AS,
          CAST(${input.menuCategory.trim() || "เมนูทั่วไป"} AS NVARCHAR(100)) COLLATE SQL_Latin1_General_CP1_CI_AS,
          ${input.yield},
          ${roundMoney(input.pricePerServing)},
          1,
          ${now},
          ${now}
        )
      `

      for (const item of input.ingredients) {
        await tx.$executeRaw`
          INSERT INTO [recipe_items] (
            [id],
            [recipeId],
            [ingredientId],
            [quantity],
            [createdAt]
          )
          VALUES (
            CAST(${`recipe-item-${randomUUID()}`} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS,
            CAST(${recipeId} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS,
            CAST(${item.ingredientId} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS,
            ${roundQuantity(item.quantity)},
            ${now}
          )
        `
      }

      return tx.recipe.findUniqueOrThrow({
        where: { id: recipeId },
        include: {
          items: { include: { ingredient: true } },
          plans: { include: { reservations: true } },
        },
      })
    })

    res.status(201).json({
      recipe: serializeRecipe(recipe as RecipeWithItemsAndPlans),
    })
  })
)

recipesRouter.patch(
  "/:recipeId",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const recipeId = routeParam(req.params.recipeId, "recipeId")
    const input = recipeInputSchema.parse(req.body)

    const recipe = await prisma.$transaction(async (tx) => {
      await assertBranchAccess(tx, member.id, branchId)

      const existingRecipe = await tx.recipe.findFirst({
        where: { id: recipeId, branchId, isActive: true },
      })

      if (!existingRecipe) {
        throw notFound("Recipe not found.")
      }

      const pinnedPlan = await tx.recipePlan.findFirst({
        where: { branchId, recipeId, status: "pinned" },
      })

      if (pinnedPlan) {
        throw badRequest("Unpin or cook this recipe before editing it.")
      }

      await tx.$executeRaw`
        DELETE FROM [recipe_items]
        WHERE [recipeId] = CAST(${recipeId} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS
      `

      await tx.$executeRaw`
        UPDATE [recipes]
        SET
          [name] = CAST(${input.name.trim()} AS NVARCHAR(180)) COLLATE SQL_Latin1_General_CP1_CI_AS,
          [menuCategory] = CAST(${input.menuCategory.trim() || "เมนูทั่วไป"} AS NVARCHAR(100)) COLLATE SQL_Latin1_General_CP1_CI_AS,
          [yield] = ${input.yield},
          [pricePerServing] = ${roundMoney(input.pricePerServing)},
          [updatedAt] = ${new Date()}
        WHERE
          [id] = CAST(${recipeId} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS
          AND [branchId] = CAST(${branchId} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS
      `

      const now = new Date()

      for (const item of input.ingredients) {
        await tx.$executeRaw`
          INSERT INTO [recipe_items] (
            [id],
            [recipeId],
            [ingredientId],
            [quantity],
            [createdAt]
          )
          VALUES (
            CAST(${`recipe-item-${randomUUID()}`} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS,
            CAST(${recipeId} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS,
            CAST(${item.ingredientId} AS NVARCHAR(64)) COLLATE SQL_Latin1_General_CP1_CI_AS,
            ${roundQuantity(item.quantity)},
            ${now}
          )
        `
      }

      return tx.recipe.findUniqueOrThrow({
        where: { id: recipeId },
        include: {
          items: { include: { ingredient: true } },
          plans: {
            where: { status: { in: ["pinned", "cooked"] } },
            include: { reservations: true },
            orderBy: { plannedAt: "desc" },
          },
        },
      })
    })

    res.json({ recipe: serializeRecipe(recipe as RecipeWithItemsAndPlans) })
  })
)

recipesRouter.delete(
  "/:recipeId",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const recipeId = routeParam(req.params.recipeId, "recipeId")

    await prisma.$transaction(async (tx) => {
      await assertBranchAccess(tx, member.id, branchId)

      const recipe = await tx.recipe.findFirst({
        where: { id: recipeId, branchId, isActive: true },
      })

      if (!recipe) {
        throw notFound("Recipe not found.")
      }

      const activeReservations = await tx.stockReservation.findMany({
        where: {
          branchId,
          recipePlan: { recipeId },
          status: "active",
        },
      })
      const touchedIngredientIds = new Set(
        activeReservations.map((reservation) => reservation.ingredientId)
      )

      await tx.stockReservation.updateMany({
        where: {
          branchId,
          recipePlan: { recipeId },
          status: "active",
        },
        data: {
          status: "released",
          releasedAt: new Date(),
        },
      })
      await tx.recipePlan.updateMany({
        where: { branchId, recipeId, status: "pinned" },
        data: { status: "cancelled" },
      })
      await tx.recipe.update({
        where: { id: recipeId },
        data: { isActive: false },
      })

      for (const ingredientId of touchedIngredientIds) {
        await refreshReservedQuantity(tx, branchId, ingredientId)
      }
    })

    res.status(204).send()
  })
)

recipesRouter.post(
  "/:recipeId/pin",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const recipeId = routeParam(req.params.recipeId, "recipeId")

    const plan = await prisma.$transaction(
      async (tx) => {
        await assertBranchAccess(tx, member.id, branchId)
        await releaseStalePinnedPlans(tx, branchId)
        const today = bangkokDayRange()

        const existingPlan = await tx.recipePlan.findFirst({
          where: {
            branchId,
            recipeId,
            status: "pinned",
            plannedAt: {
              gte: today.start,
              lte: today.end,
            },
          },
          include: { reservations: true },
        })

        if (existingPlan) {
          return existingPlan
        }

        const recipe = (await tx.recipe.findFirst({
          where: { id: recipeId, branchId, isActive: true },
          include: { items: true },
        })) as RecipeWithItems | null

        if (!recipe) {
          throw notFound("Recipe not found.")
        }

        const createdPlan = await tx.recipePlan.create({
          data: {
            branchId,
            recipeId,
            plannedByMemberId: member.id,
            status: "pinned",
            batchCount: 1,
          },
        })

        for (const item of recipe.items) {
          await tx.stockReservation.create({
            data: {
              branchId,
              recipePlanId: createdPlan.id,
              ingredientId: item.ingredientId,
              quantity: item.quantity,
              status: "active",
            },
          })
          await refreshReservedQuantity(tx, branchId, item.ingredientId)
        }

        return tx.recipePlan.findUniqueOrThrow({
          where: { id: createdPlan.id },
          include: { reservations: true },
        })
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    )

    res.status(201).json({ plan })
  })
)

recipesRouter.post(
  "/:recipeId/unpin",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const recipeId = routeParam(req.params.recipeId, "recipeId")

    await prisma.$transaction(
      async (tx) => {
        await assertBranchAccess(tx, member.id, branchId)

        const recipe = await tx.recipe.findFirst({
          where: { id: recipeId, branchId, isActive: true },
        })

        if (!recipe) {
          throw notFound("Recipe not found.")
        }

        const activeReservations = await tx.stockReservation.findMany({
          where: {
            branchId,
            recipePlan: { recipeId, status: "pinned" },
            status: "active",
          },
          select: { ingredientId: true },
        })
        const touchedIngredientIds = new Set(
          activeReservations.map((reservation) => reservation.ingredientId)
        )

        await tx.stockReservation.updateMany({
          where: {
            branchId,
            recipePlan: { recipeId, status: "pinned" },
            status: "active",
          },
          data: {
            status: "released",
            releasedAt: new Date(),
          },
        })
        await tx.recipePlan.updateMany({
          where: { branchId, recipeId, status: "pinned" },
          data: { status: "cancelled" },
        })

        for (const ingredientId of touchedIngredientIds) {
          await refreshReservedQuantity(tx, branchId, ingredientId)
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    )

    res.json({ ok: true })
  })
)

recipePlansRouter.post(
  "/:planId/cook",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const planId = routeParam(req.params.planId, "planId")

    const cookingRun = await prisma.$transaction(
      async (tx) => {
        await assertBranchAccess(tx, member.id, branchId)

        const plan = (await tx.recipePlan.findFirst({
          where: { id: planId, branchId, status: "pinned" },
          include: {
            recipe: true,
            reservations: {
              where: { status: "active" },
              include: { ingredient: true },
            },
          },
        })) as RecipePlanForCooking | null

        if (!plan) {
          throw notFound("Pinned recipe plan not found.")
        }

        const inventories = await tx.branchInventory.findMany({
          where: {
            branchId,
            ingredientId: {
              in: plan.reservations.map(
                (reservation) => reservation.ingredientId
              ),
            },
          },
        })
        const inventoryByIngredient = new Map(
          inventories.map(
            (inventory) => [inventory.ingredientId, inventory] as const
          )
        )

        for (const reservation of plan.reservations) {
          const inventory = inventoryByIngredient.get(reservation.ingredientId)

          if (!inventory || Number(inventory.onHand) < Number(reservation.quantity)) {
            throw badRequest(
              `Ingredient ${reservation.ingredient.name} is not enough to cook.`
            )
          }
        }

        const createdCookingRun = await tx.cookingRun.create({
          data: {
            branchId,
            recipeId: plan.recipeId,
            recipePlanId: plan.id,
            cookedByMemberId: member.id,
            servingsProduced: plan.recipe.servingYield * plan.batchCount,
            status: "completed",
          },
        })

        for (const reservation of plan.reservations) {
          const inventory = inventoryByIngredient.get(reservation.ingredientId)

          if (!inventory) {
            throw badRequest("Inventory row disappeared during transaction.")
          }

          const quantity = Number(reservation.quantity)
          const beforeQuantity = Number(inventory.onHand)
          const afterQuantity = roundQuantity(beforeQuantity - quantity)

          await tx.branchInventory.update({
            where: {
              branchId_ingredientId: {
                branchId,
                ingredientId: reservation.ingredientId,
              },
            },
            data: {
              onHand: afterQuantity,
              lastUpdatedAt: new Date(),
            },
          })
          await tx.stockReservation.update({
            where: { id: reservation.id },
            data: {
              status: "consumed",
              releasedAt: new Date(),
            },
          })
          await tx.stockMovement.create({
            data: {
              branchId,
              ingredientId: reservation.ingredientId,
              cookingRunId: createdCookingRun.id,
              createdByMemberId: member.id,
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
          await refreshReservedQuantity(tx, branchId, reservation.ingredientId)
        }

        await tx.recipePlan.update({
          where: { id: plan.id },
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

    res.json({ cookingRun })
  })
)
