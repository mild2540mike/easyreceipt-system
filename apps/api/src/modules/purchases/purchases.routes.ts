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

const purchaseItemSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0),
})

const createPurchaseSchema = z.object({
  purchaseDate: z.string().min(1),
  vendor: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1),
})

export const purchasesRouter = Router({ mergeParams: true })

type PurchaseWithItems = Prisma.PurchaseGetPayload<{
  include: { items: { include: { ingredient: true } } }
}>

purchasesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")

    await assertBranchAccess(prisma, member.id, branchId)

    const purchases = await prisma.purchase.findMany({
      where: { branchId },
      include: {
        items: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: {
        purchaseDate: "desc",
      },
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

purchasesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = createPurchaseSchema.parse(req.body)

    const purchase = await prisma.$transaction(
      async (tx) => {
        await assertBranchAccess(tx, member.id, branchId)

        const ingredientIds = input.items.map((item) => item.ingredientId)
        const ingredients = await tx.ingredient.findMany({
          where: {
            id: { in: ingredientIds },
          },
        })
        const ingredientById = new Map(
          ingredients.map((ingredient) => [ingredient.id, ingredient] as const)
        )
        const totalAmount = roundMoney(
          input.items.reduce(
            (total, item) => total + item.quantity * item.unitPrice,
            0
          )
        )

        const createdPurchase = await tx.purchase.create({
          data: {
            branchId,
            createdByMemberId: member.id,
            purchaseDate: new Date(input.purchaseDate),
            vendor: input.vendor?.trim() || "ไม่ระบุ",
            status: "posted",
            totalAmount,
          },
        })

        for (const item of input.items) {
          const ingredient = ingredientById.get(item.ingredientId)

          if (!ingredient) {
            throw notFound(`Ingredient ${item.ingredientId} not found.`)
          }

          const quantity = roundQuantity(item.quantity)
          const unitPrice = roundMoney(item.unitPrice)
          const unit = item.unit?.trim() || ingredient.unit
          const lineTotal = roundMoney(quantity * unitPrice)
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
