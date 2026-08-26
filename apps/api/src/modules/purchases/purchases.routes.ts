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
import { recordIngredientPrice } from "../inventory/ingredient-price"
import {
  purchaseScanRequestSchema,
  scanPurchaseReceipt,
} from "./purchase-scan"
import {
  removePurchaseReceiptImage,
  savePurchaseReceiptImage,
} from "./purchase-receipt-image"

const storedReceiptImageSchema = z
  .object({
    originalName: z.string().trim().min(1).max(255),
    storedName: z.string().trim().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/),
    type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    size: z.coerce.number().int().positive().max(5 * 1024 * 1024),
    path: z
      .string()
      .trim()
      .regex(/^public\/uploads\/purchase\/[a-zA-Z0-9._-]+$/)
      .optional(),
    url: z.string().trim().regex(/^\/uploads\/purchase\/[a-zA-Z0-9._-]+$/),
  })
  .strict()
  .refine((image) => image.url === `/uploads/purchase/${image.storedName}`, {
    message: "Stored receipt image URL does not match its filename.",
    path: ["url"],
  })
  .refine(
    (image) =>
      !image.path || image.path === `public/uploads/purchase/${image.storedName}`,
    {
      message: "Stored receipt image path does not match its filename.",
      path: ["path"],
    }
  )

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
  receiptImage: storedReceiptImageSchema.optional(),
  draftPurchaseIds: z.array(z.string().min(1)).optional().default([]),
  items: z.array(purchaseItemSchema).optional().default([]),
}).refine(
  (input) => input.items.length > 0 || input.draftPurchaseIds.length > 0,
  {
    message: "Purchase must include at least one item or draft purchase.",
    path: ["items"],
  }
)

const purchaseBillSchema = z.object({
  name: z.string().trim().min(1).max(180),
  receiptImage: storedReceiptImageSchema.optional(),
  draftPurchaseIds: z.array(z.string().min(1)).optional().default([]),
  items: z.array(purchaseItemSchema).optional().default([]),
}).refine(
  (input) => input.items.length > 0 || input.draftPurchaseIds.length > 0,
  {
    message: "Bill must include at least one item or draft purchase.",
    path: ["items"],
  }
)

const createPurchaseBatchSchema = z.object({
  purchaseDate: z.string().min(1),
  status: z.enum(["draft", "saved"]).optional(),
  bills: z.array(purchaseBillSchema).min(1).max(50),
})

const updatePurchaseDraftSchema = z.object({
  purchaseDate: z.string().min(1),
  name: z.string().trim().min(1).max(180),
  items: z.array(purchaseItemSchema).min(1).max(200),
})

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

function uploadedReceiptImageData(
  image: z.infer<typeof storedReceiptImageSchema> | undefined
) {
  return image
    ? {
        receiptImageOriginalName: image.originalName,
        receiptImageStoredName: image.storedName,
        receiptImageMimeType: image.type,
        receiptImageSizeBytes: image.size,
      }
    : null
}

function existingReceiptImageData(purchase: {
  receiptImageOriginalName: string | null
  receiptImageStoredName: string | null
  receiptImageMimeType: string | null
  receiptImageSizeBytes: number | null
} | undefined) {
  return purchase?.receiptImageStoredName
    ? {
        receiptImageOriginalName: purchase.receiptImageOriginalName,
        receiptImageStoredName: purchase.receiptImageStoredName,
        receiptImageMimeType: purchase.receiptImageMimeType,
        receiptImageSizeBytes: purchase.receiptImageSizeBytes,
      }
    : null
}

purchasesRouter.post(
  "/scan",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = purchaseScanRequestSchema.parse(req.body)
    const access = await assertBranchAccess(prisma, member.id, branchId)

    if (!memberCanEditMenu(access.member, "purchase")) {
      throw forbidden("Member does not have permission to scan purchases.")
    }

    const inventoryRows = await prisma.branchInventory.findMany({
      where: {
        branchId,
        ingredient: { isActive: true },
      },
      select: {
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
      },
    })
    const scan = await scanPurchaseReceipt({
      image: input.image,
      memberId: access.member.id,
      ingredients: inventoryRows.map((row) => row.ingredient),
    })

    res.json({ scan })
  })
)

purchasesRouter.post(
  "/receipt-image",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = purchaseScanRequestSchema.parse(req.body)
    const access = await assertBranchAccess(prisma, member.id, branchId)

    if (!memberCanEditMenu(access.member, "purchase")) {
      throw forbidden("Member does not have permission to upload purchase receipts.")
    }

    const receiptImage = await savePurchaseReceiptImage(input.image)

    res.status(201).json({ receiptImage })
  })
)

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

purchasesRouter.patch(
  "/:purchaseId",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const purchaseId = routeParam(req.params.purchaseId, "purchaseId")
    const input = updatePurchaseDraftSchema.parse(req.body)

    const updatedPurchase = await prisma.$transaction(
      async (tx) => {
        const access = await assertBranchAccess(tx, member.id, branchId)

        if (!memberCanEditMenu(access.member, "purchase")) {
          throw forbidden("Member does not have permission to edit purchases.")
        }

        const purchaseDate = new Date(input.purchaseDate)

        if (Number.isNaN(purchaseDate.getTime())) {
          throw badRequest("Invalid purchase date.")
        }

        const purchase = await tx.purchase.findFirst({
          where: { id: purchaseId, branchId },
          select: { id: true, status: true },
        })

        if (!purchase) {
          throw notFound("Purchase draft not found.")
        }

        if (purchase.status !== "draft") {
          throw badRequest("Only draft purchases can be edited.")
        }

        const ingredientIds = Array.from(
          new Set(input.items.map((item) => item.ingredientId))
        )
        const ingredients = await tx.ingredient.findMany({
          where: {
            id: { in: ingredientIds },
            organizationId: access.branch.organizationId,
            isActive: true,
          },
        })
        const ingredientById = new Map(
          ingredients.map((ingredient) => [ingredient.id, ingredient] as const)
        )

        if (ingredients.length !== ingredientIds.length) {
          throw notFound("One or more purchase ingredients were not found.")
        }

        const items = input.items.map((item) => {
          const ingredient = ingredientById.get(item.ingredientId)

          if (!ingredient) {
            throw notFound(`Ingredient ${item.ingredientId} not found.`)
          }

          const quantity = roundQuantity(item.quantity)
          const unitPrice = roundMoney(item.unitPrice)

          return {
            purchaseId: purchase.id,
            ingredientId: item.ingredientId,
            quantity,
            unit: item.unit?.trim() || ingredient.unit,
            unitPrice,
            lineTotal: roundMoney(quantity * unitPrice),
          }
        })
        const totalAmount = roundMoney(
          items.reduce((total, item) => total + item.lineTotal, 0)
        )

        await tx.purchaseItem.deleteMany({
          where: { purchaseId: purchase.id },
        })
        await tx.purchaseItem.createMany({ data: items })
        await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            purchaseDate,
            vendor: input.name,
            totalAmount,
          },
        })

        return tx.purchase.findUniqueOrThrow({
          where: { id: purchase.id },
          include: {
            items: {
              include: { ingredient: true },
              orderBy: { createdAt: "asc" },
            },
          },
        })
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    )

    res.json({
      purchase: {
        ...updatedPurchase,
        totalAmount: Number(updatedPurchase.totalAmount),
        items: updatedPurchase.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
      },
    })
  })
)

purchasesRouter.delete(
  "/:purchaseId",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const purchaseId = routeParam(req.params.purchaseId, "purchaseId")

    const receiptImageStoredName = await prisma.$transaction(async (tx) => {
      const access = await assertBranchAccess(tx, member.id, branchId)

      const purchase = await tx.purchase.findFirst({
        where: {
          id: purchaseId,
          branchId,
        },
        include: {
          items: true,
        },
      })

      if (!purchase) {
        throw notFound("ไม่พบข้อมูลบิลซื้อเข้าที่ต้องการลบ")
      }

      if (purchase.status === "draft") {
        if (!memberCanEditMenu(access.member, "purchase")) {
          throw forbidden("Member does not have permission to edit purchases.")
        }
      } else {
        if (!memberCanEditMenu(access.member, "purchase")) {
          throw forbidden("Member does not have permission to edit purchases.")
        }

        if (!["saved", "posted"].includes(purchase.status)) {
          throw badRequest("สถานะบิลนี้ไม่รองรับการลบ")
        }

        const totalsByIngredientId = new Map<
          string,
          { quantity: number; value: number }
        >()

        for (const item of purchase.items) {
          const current = totalsByIngredientId.get(item.ingredientId) ?? {
            quantity: 0,
            value: 0,
          }
          current.quantity = roundQuantity(
            current.quantity + Number(item.quantity)
          )
          current.value = roundMoney(current.value + Number(item.lineTotal))
          totalsByIngredientId.set(item.ingredientId, current)
        }

        const inventoryRows = await tx.branchInventory.findMany({
          where: {
            branchId,
            ingredientId: { in: Array.from(totalsByIngredientId.keys()) },
          },
          include: {
            ingredient: true,
          },
        })
        const inventoryByIngredientId = new Map(
          inventoryRows.map((row) => [row.ingredientId, row] as const)
        )

        if (inventoryRows.length !== totalsByIngredientId.size) {
          throw notFound("ไม่พบข้อมูลคลังวัตถุดิบของบิลนี้ครบถ้วน")
        }

        for (const [ingredientId, removed] of totalsByIngredientId) {
          const inventory = inventoryByIngredientId.get(ingredientId)

          if (!inventory) {
            throw notFound("ไม่พบข้อมูลคลังวัตถุดิบของบิลนี้")
          }

          const beforeQuantity = Number(inventory.onHand)
          const afterQuantity = roundQuantity(
            beforeQuantity - removed.quantity
          )
          const reservedQuantity = Number(inventory.reservedQuantity)
          const currentValue = beforeQuantity * Number(inventory.costPerUnit)
          const remainingValue = roundMoney(currentValue - removed.value)

          if (afterQuantity < reservedQuantity - 0.0005) {
            throw badRequest(
              `ลบบิลไม่ได้ เพราะ ${inventory.ingredient.name} ถูกใช้หรือจองไปแล้ว`
            )
          }

          if (remainingValue < -0.01) {
            throw badRequest(
              `ลบบิลไม่ได้ เพราะมูลค่าสต็อก ${inventory.ingredient.name} ไม่เพียงพอสำหรับการย้อนรายการ`
            )
          }

          await tx.branchInventory.update({
            where: {
              branchId_ingredientId: { branchId, ingredientId },
            },
            data: {
              onHand: afterQuantity,
              costPerUnit:
                afterQuantity > 0
                  ? roundMoney(Math.max(remainingValue, 0) / afterQuantity)
                  : 0,
              lastUpdatedAt: new Date(),
            },
          })
        }

        const purchaseItemIds = purchase.items.map((item) => item.id)

        if (purchaseItemIds.length > 0) {
          await tx.stockMovement.deleteMany({
            where: {
              branchId,
              purchaseItemId: { in: purchaseItemIds },
            },
          })
        }

        await tx.auditLog.deleteMany({
          where: {
            branchId,
            action: "purchase_received",
            entityType: "purchase",
            entityId: purchase.id,
          },
        })
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

      if (purchase.status !== "draft") {
        await tx.auditLog.create({
          data: {
            organizationId: access.branch.organizationId,
            branchId,
            memberId: member.id,
            action: "purchase_deleted",
            entityType: "purchase",
            entityId: purchase.id,
          },
        })
      }

      return purchase.receiptImageStoredName
    })

    await removePurchaseReceiptImage(
      receiptImageStoredName
        ? `/uploads/purchase/${receiptImageStoredName}`
        : null
    )

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

    const receiptImageStoredName = await prisma.$transaction(async (tx) => {
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
          receiptImageStoredName: true,
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
        return purchase.receiptImageStoredName
      }

      await tx.purchase.update({
        where: {
          id: purchase.id,
        },
        data: {
          totalAmount: remaining._sum.lineTotal ?? 0,
        },
      })

      return null
    })

    await removePurchaseReceiptImage(
      receiptImageStoredName
        ? `/uploads/purchase/${receiptImageStoredName}`
        : null
    )

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
        const receiptImageData =
          uploadedReceiptImageData(input.receiptImage) ??
          existingReceiptImageData(
            draftPurchases.find((draft) => draft.receiptImageStoredName)
          )

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
            ...receiptImageData,
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

          await recordIngredientPrice(tx, {
            organizationId: access.branch.organizationId,
            branchId,
            memberId: member.id,
            ingredientId: ingredient.id,
            unitPrice,
            source: "purchase",
          })

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

        if (purchaseStatus === "saved") {
          await tx.auditLog.create({
            data: {
              organizationId: access.branch.organizationId,
              branchId,
              memberId: member.id,
              action: "purchase_received",
              entityType: "purchase",
              entityId: createdPurchase.id,
              metadataJson: JSON.stringify({
                name: createdPurchase.vendor,
                itemCount: purchaseItems.length,
                totalAmount,
                items: purchaseItems.slice(0, 10).map((item) => ({
                  ingredientId: item.ingredientId,
                  ingredientName:
                    ingredientById.get(item.ingredientId)?.name ?? "-",
                  quantity: roundQuantity(item.quantity),
                  unit:
                    item.unit?.trim() ||
                    ingredientById.get(item.ingredientId)?.unit ||
                    "-",
                })),
              }).slice(0, 4000),
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

purchasesRouter.post(
  "/batch",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = createPurchaseBatchSchema.parse(req.body)
    const purchaseStatus = input.status ?? "saved"
    const purchaseDate = new Date(input.purchaseDate)

    if (Number.isNaN(purchaseDate.getTime())) {
      throw badRequest("Invalid purchase date.")
    }

    const purchases = await prisma.$transaction(
      async (tx) => {
        const access = await assertBranchAccess(tx, member.id, branchId)

        if (!memberCanEditMenu(access.member, "purchase")) {
          throw forbidden("Member does not have permission to edit purchases.")
        }

        const draftPurchaseIds = Array.from(
          new Set(input.bills.flatMap((bill) => bill.draftPurchaseIds))
        )

        if (purchaseStatus === "draft" && draftPurchaseIds.length > 0) {
          throw badRequest("Draft purchases cannot include existing drafts.")
        }

        const draftPurchases = draftPurchaseIds.length > 0
          ? await tx.purchase.findMany({
              where: {
                branchId,
                id: { in: draftPurchaseIds },
                status: "draft",
              },
              include: { items: true },
            })
          : []

        if (draftPurchases.length !== draftPurchaseIds.length) {
          throw notFound("Purchase draft not found.")
        }

        const draftById = new Map(
          draftPurchases.map((purchase) => [purchase.id, purchase] as const)
        )
        const resolvedBills = input.bills.map((bill) => ({
          name: bill.name,
          receiptImageData:
            uploadedReceiptImageData(bill.receiptImage) ??
            existingReceiptImageData(
              bill.draftPurchaseIds
                .map((purchaseId) => draftById.get(purchaseId))
                .find((purchase) => purchase?.receiptImageStoredName)
            ),
          items: [
            ...bill.draftPurchaseIds.flatMap((purchaseId) =>
              (draftById.get(purchaseId)?.items ?? []).map((item) => ({
                ingredientId: item.ingredientId,
                quantity: Number(item.quantity),
                unit: item.unit,
                unitPrice: Number(item.unitPrice),
              }))
            ),
            ...bill.items,
          ],
        }))

        if (resolvedBills.some((bill) => bill.items.length === 0)) {
          throw badRequest("Every bill must include at least one item.")
        }

        const ingredientIds = Array.from(
          new Set(
            resolvedBills.flatMap((bill) =>
              bill.items.map((item) => item.ingredientId)
            )
          )
        )
        const ingredients = await tx.ingredient.findMany({
          where: { id: { in: ingredientIds } },
        })
        const ingredientById = new Map(
          ingredients.map((ingredient) => [ingredient.id, ingredient] as const)
        )

        if (ingredientById.size !== ingredientIds.length) {
          throw notFound("One or more ingredients were not found.")
        }

        const batchTotal = roundMoney(
          resolvedBills.reduce(
            (total, bill) =>
              total +
              bill.items.reduce(
                (billTotal, item) =>
                  billTotal + item.quantity * item.unitPrice,
                0
              ),
            0
          )
        )
        const dailyPurchaseBudget = access.branch.dailyPurchaseBudget === null
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
            _sum: { totalAmount: true },
          })
          const usedBudget = Number(purchaseTotalForDate._sum.totalAmount ?? 0)

          if (roundMoney(usedBudget + batchTotal) > dailyPurchaseBudget) {
            throw badRequest("งบประมาณรายวันของสาขาไม่เพียงพอ", {
              dailyPurchaseBudget,
              usedBudget,
              purchaseTotal: batchTotal,
              projectedBudget: roundMoney(usedBudget + batchTotal),
              remainingBudget: Math.max(
                roundMoney(dailyPurchaseBudget - usedBudget),
                0
              ),
            })
          }
        }

        const createdPurchaseIds: string[] = []

        for (const bill of resolvedBills) {
          const totalAmount = roundMoney(
            bill.items.reduce(
              (total, item) => total + item.quantity * item.unitPrice,
              0
            )
          )
          const createdPurchase = await tx.purchase.create({
            data: {
              branchId,
              createdByMemberId: member.id,
              purchaseDate,
              vendor: bill.name,
              status: purchaseStatus,
              totalAmount,
              ...bill.receiptImageData,
            },
          })
          createdPurchaseIds.push(createdPurchase.id)

          for (const item of bill.items) {
            const ingredient = ingredientById.get(item.ingredientId)

            if (!ingredient) {
              throw notFound(`Ingredient ${item.ingredientId} not found.`)
            }

            const quantity = roundQuantity(item.quantity)
            const unitPrice = roundMoney(item.unitPrice)
            const unit = item.unit?.trim() || ingredient.unit
            const lineTotal = roundMoney(quantity * unitPrice)
            let beforeQuantity = 0
            let afterQuantity = 0

            if (purchaseStatus === "saved") {
              const inventory = await tx.branchInventory.findUnique({
                where: {
                  branchId_ingredientId: { branchId, ingredientId: item.ingredientId },
                },
              })
              beforeQuantity = Number(inventory?.onHand ?? 0)
              afterQuantity = roundQuantity(beforeQuantity + quantity)

              await recordIngredientPrice(tx, {
                organizationId: access.branch.organizationId,
                branchId,
                memberId: member.id,
                ingredientId: ingredient.id,
                unitPrice,
                source: "purchase",
              })

              if (inventory) {
                await tx.branchInventory.update({
                  where: {
                    branchId_ingredientId: { branchId, ingredientId: item.ingredientId },
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

            if (purchaseStatus === "saved") {
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
          }

          if (purchaseStatus === "saved") {
            await tx.auditLog.create({
              data: {
                organizationId: access.branch.organizationId,
                branchId,
                memberId: member.id,
                action: "purchase_received",
                entityType: "purchase",
                entityId: createdPurchase.id,
                metadataJson: JSON.stringify({
                  name: bill.name,
                  itemCount: bill.items.length,
                  totalAmount,
                  items: bill.items.slice(0, 10).map((item) => ({
                    ingredientId: item.ingredientId,
                    ingredientName:
                      ingredientById.get(item.ingredientId)?.name ?? "-",
                    quantity: roundQuantity(item.quantity),
                    unit:
                      item.unit?.trim() ||
                      ingredientById.get(item.ingredientId)?.unit ||
                      "-",
                  })),
                }).slice(0, 4000),
              },
            })
          }
        }

        if (purchaseStatus === "saved" && draftPurchaseIds.length > 0) {
          await tx.purchaseItem.deleteMany({
            where: { purchaseId: { in: draftPurchaseIds } },
          })
          await tx.purchase.deleteMany({
            where: {
              id: { in: draftPurchaseIds },
              branchId,
              status: "draft",
            },
          })
        }

        return tx.purchase.findMany({
          where: { id: { in: createdPurchaseIds } },
          include: {
            items: { include: { ingredient: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    res.status(201).json({ purchases })
  })
)
