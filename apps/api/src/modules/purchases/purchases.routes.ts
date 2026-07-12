import { Prisma } from "@prisma/client"
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

const purchaseItemSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0),
})

const createPurchaseSchema = z.object({
  purchaseDate: z.string().min(1),
  vendor: z.string().optional(),
  status: z.enum(["draft", "saved"]).optional(),
  draftPurchaseIds: z.array(z.string().min(1)).optional().default([]),
  items: z.array(purchaseItemSchema).optional().default([]),
}).refine(
  (input) => input.items.length > 0 || input.draftPurchaseIds.length > 0,
  {
    message: "Purchase must include at least one item or draft purchase.",
    path: ["items"],
  }
)

const purchaseQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const purchasesRouter = Router({ mergeParams: true })

type PurchaseWithItems = Prisma.PurchaseGetPayload<{
  include: { items: { include: { ingredient: true } } }
}>

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

function bangkokDateRange(date: Date) {
  const key = bangkokDateKey(date)

  return {
    start: new Date(`${key}T00:00:00.000+07:00`),
    end: new Date(`${key}T23:59:59.999+07:00`),
  }
}

purchasesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const query = purchaseQuerySchema.parse(req.query)

    const access = await assertBranchAccess(prisma, member.id, branchId)

    if (!memberCanViewMenu(access.member, "purchase")) {
      throw forbidden("Member does not have permission to view purchases.")
    }

    const where: Prisma.PurchaseWhereInput = { branchId }

    if (query.date) {
      where.purchaseDate = {
        gte: new Date(`${query.date}T00:00:00.000+07:00`),
        lte: new Date(`${query.date}T23:59:59.999+07:00`),
      }
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        items: {
          include: {
            ingredient: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
      take: 50,
    })

    res.json({
      purchases: (purchases as PurchaseWithItems[]).map((purchase) => ({
        ...purchase,
        totalAmount: Number(purchase.totalAmount),
        items: purchase.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
      })),
    })
  })
)

purchasesRouter.delete(
  "/:purchaseId",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const purchaseId = routeParam(req.params.purchaseId, "purchaseId")

    await prisma.$transaction(async (tx) => {
      const access = await assertBranchAccess(tx, member.id, branchId)

      if (!memberCanEditMenu(access.member, "purchase")) {
        throw forbidden("Member does not have permission to edit purchases.")
      }

      const purchase = await tx.purchase.findFirst({
        where: {
          id: purchaseId,
          branchId,
        },
        select: {
          id: true,
          status: true,
        },
      })

      if (!purchase) {
        throw notFound("Purchase draft not found.")
      }

      if (purchase.status !== "draft") {
        throw forbidden("Only draft purchases can be deleted.")
      }

      await tx.purchaseItem.deleteMany({
        where: {
          purchaseId: purchase.id,
        },
      })
      await tx.purchase.delete({
        where: {
          id: purchase.id,
        },
      })
    })

    res.status(204).send()
  })
)

purchasesRouter.delete(
  "/:purchaseId/items/:itemId",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const purchaseId = routeParam(req.params.purchaseId, "purchaseId")
    const itemId = routeParam(req.params.itemId, "itemId")

    await prisma.$transaction(async (tx) => {
      const access = await assertBranchAccess(tx, member.id, branchId)

      if (!memberCanEditMenu(access.member, "purchase")) {
        throw forbidden("Member does not have permission to edit purchases.")
      }

      const purchase = await tx.purchase.findFirst({
        where: {
          id: purchaseId,
          branchId,
        },
        select: {
          id: true,
          status: true,
        },
      })

      if (!purchase) {
        throw notFound("Purchase draft not found.")
      }

      if (purchase.status !== "draft") {
        throw forbidden("Only draft purchase items can be deleted.")
      }

      const item = await tx.purchaseItem.findFirst({
        where: {
          id: itemId,
          purchaseId: purchase.id,
        },
        select: {
          id: true,
        },
      })

      if (!item) {
        throw notFound("Purchase draft item not found.")
      }

      await tx.purchaseItem.delete({
        where: {
          id: item.id,
        },
      })

      const remaining = await tx.purchaseItem.aggregate({
        where: {
          purchaseId: purchase.id,
        },
        _count: {
          id: true,
        },
        _sum: {
          lineTotal: true,
        },
      })

      if (remaining._count.id === 0) {
        await tx.purchase.delete({
          where: {
            id: purchase.id,
          },
        })
        return
      }

      await tx.purchase.update({
        where: {
          id: purchase.id,
        },
        data: {
          totalAmount: remaining._sum.lineTotal ?? 0,
        },
      })
    })

    res.status(204).send()
  })
)

purchasesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = createPurchaseSchema.parse(req.body)
    const purchaseStatus = input.status ?? "saved"
    const draftPurchaseIds = Array.from(new Set(input.draftPurchaseIds))

    const purchase = await prisma.$transaction(
      async (tx) => {
        const access = await assertBranchAccess(tx, member.id, branchId)
        const purchaseDate = new Date(input.purchaseDate)

        if (!memberCanEditMenu(access.member, "purchase")) {
          throw forbidden("Member does not have permission to edit purchases.")
        }

        if (Number.isNaN(purchaseDate.getTime())) {
          throw badRequest("Invalid purchase date.")
        }

        if (purchaseStatus === "draft" && draftPurchaseIds.length > 0) {
          throw badRequest("Draft purchases cannot include existing drafts.")
        }

        const draftPurchases =
          draftPurchaseIds.length > 0
            ? await tx.purchase.findMany({
                where: {
                  branchId,
                  id: { in: draftPurchaseIds },
                  status: "draft",
                },
                include: {
                  items: true,
                },
              })
            : []

        if (draftPurchases.length !== draftPurchaseIds.length) {
          throw notFound("Purchase draft not found.")
        }

        const purchaseItems = [
          ...draftPurchases.flatMap((draft) =>
            draft.items.map((item) => ({
              ingredientId: item.ingredientId,
              quantity: Number(item.quantity),
              unit: item.unit,
              unitPrice: Number(item.unitPrice),
            }))
          ),
          ...input.items,
        ]

        if (purchaseItems.length === 0) {
          throw badRequest("Purchase must include at least one item.")
        }

        const ingredientIds = purchaseItems.map((item) => item.ingredientId)
        const ingredients = await tx.ingredient.findMany({
          where: {
            id: { in: ingredientIds },
          },
        })
        const ingredientById = new Map(
          ingredients.map((ingredient) => [ingredient.id, ingredient] as const)
        )
        const totalAmount = roundMoney(
          purchaseItems.reduce(
            (total, item) => total + item.quantity * item.unitPrice,
            0
          )
        )
        const dailyPurchaseBudget =
          access.branch.dailyPurchaseBudget === null
            ? null
            : Number(access.branch.dailyPurchaseBudget)

        if (purchaseStatus === "saved" && dailyPurchaseBudget !== null) {
          const purchaseDateRange = bangkokDateRange(purchaseDate)
          const purchaseTotalForDate = await tx.purchase.aggregate({
            where: {
              branchId,
              status: { in: ["saved", "posted"] },
              purchaseDate: {
                gte: purchaseDateRange.start,
                lte: purchaseDateRange.end,
              },
            },
            _sum: {
              totalAmount: true,
            },
          })
          const usedBudget = Number(purchaseTotalForDate._sum.totalAmount ?? 0)
          const projectedBudget = roundMoney(usedBudget + totalAmount)

          if (projectedBudget > dailyPurchaseBudget) {
            throw badRequest("งบประมาณรายวันของสาขาไม่เพียงพอ", {
              dailyPurchaseBudget,
              usedBudget,
              purchaseTotal: totalAmount,
              projectedBudget,
              remainingBudget: Math.max(
                roundMoney(dailyPurchaseBudget - usedBudget),
                0
              ),
            })
          }
        }

        const createdPurchase = await tx.purchase.create({
          data: {
            branchId,
            createdByMemberId: member.id,
            purchaseDate,
            vendor: input.vendor?.trim() || "ไม่ระบุ",
            status: purchaseStatus,
            totalAmount,
          },
        })

        for (const item of purchaseItems) {
          const ingredient = ingredientById.get(item.ingredientId)

          if (!ingredient) {
            throw notFound(`Ingredient ${item.ingredientId} not found.`)
          }

          const quantity = roundQuantity(item.quantity)
          const unitPrice = roundMoney(item.unitPrice)
          const unit = item.unit?.trim() || ingredient.unit
          const lineTotal = roundMoney(quantity * unitPrice)
          if (purchaseStatus === "draft") {
            await tx.purchaseItem.create({
              data: {
                purchaseId: createdPurchase.id,
                ingredientId: item.ingredientId,
                quantity,
                unit,
                unitPrice,
                lineTotal,
              },
            })
            continue
          }

          const inventory = await tx.branchInventory.findUnique({
            where: {
              branchId_ingredientId: {
                branchId,
                ingredientId: item.ingredientId,
              },
            },
          })
          const beforeQuantity = Number(inventory?.onHand ?? 0)
          const afterQuantity = roundQuantity(beforeQuantity + quantity)

          if (inventory) {
            await tx.branchInventory.update({
              where: {
                branchId_ingredientId: {
                  branchId,
                  ingredientId: item.ingredientId,
                },
              },
              data: {
                onHand: afterQuantity,
                costPerUnit: unitPrice,
                lastUpdatedAt: new Date(),
              },
            })
          } else {
            await tx.branchInventory.create({
              data: {
                branchId,
                ingredientId: item.ingredientId,
                onHand: afterQuantity,
                reservedQuantity: 0,
                reorderPoint: 0,
                costPerUnit: unitPrice,
                lastUpdatedAt: new Date(),
              },
            })
          }

          const purchaseItem = await tx.purchaseItem.create({
            data: {
              purchaseId: createdPurchase.id,
              ingredientId: item.ingredientId,
              quantity,
              unit,
              unitPrice,
              lineTotal,
            },
          })

          await tx.stockMovement.create({
            data: {
              branchId,
              ingredientId: item.ingredientId,
              purchaseItemId: purchaseItem.id,
              createdByMemberId: member.id,
              movementType: "purchase_in",
              quantity,
              unit,
              unitCost: unitPrice,
              beforeQuantity,
              afterQuantity,
              referenceType: "purchase",
              referenceId: createdPurchase.id,
            },
          })
        }

        if (purchaseStatus === "saved" && draftPurchaseIds.length > 0) {
          await tx.purchaseItem.deleteMany({
            where: {
              purchaseId: { in: draftPurchaseIds },
            },
          })
          await tx.purchase.deleteMany({
            where: {
              id: { in: draftPurchaseIds },
              branchId,
              status: "draft",
            },
          })
        }

        return tx.purchase.findUniqueOrThrow({
          where: { id: createdPurchase.id },
          include: {
            items: {
              include: {
                ingredient: true,
              },
            },
          },
        })
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    )

    if (!purchase) {
      throw badRequest("Purchase could not be created.")
    }

    res.status(201).json({ purchase })
  })
)
