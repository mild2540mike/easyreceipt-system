import { createHash } from "node:crypto"
import { Prisma, type PrismaClient } from "@prisma/client"
import { z } from "zod"

import { forbidden, HttpError, notFound } from "../../utils/http-error"
import {
  assertBranchAccess,
  memberCanEditMenu,
  memberCanViewMenu,
} from "../common/permissions"

const quantity = z
  .number()
  .finite()
  .min(0)
  .max(999_999_999)
  .refine(
    (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 0.0001,
    "จำนวนต้องมีทศนิยมไม่เกิน 3 ตำแหน่ง"
  )
export const stockCheckInputSchema = z
  .object({
    requestId: z.string().uuid(),
    startedAt: z.string().datetime(),
    items: z
      .array(
        z
          .object({
            ingredientId: z.string().min(1).max(64),
            unit: z.string().min(1).max(32),
            systemQuantity: quantity,
            actualQuantity: quantity,
            inventoryVersion: z.string().datetime(),
            countedAt: z.string().datetime(),
          })
          .strict()
      )
      .min(1)
      .max(2000)
      .refine(
        (items) =>
          new Set(items.map((item) => item.ingredientId)).size === items.length,
        "รายการวัตถุดิบต้องไม่ซ้ำกัน"
      ),
  })
  .strict()
export type StockCheckInput = z.infer<typeof stockCheckInputSchema>
export const stockCheckInclude = {
  items: { orderBy: { name: "asc" as const } },
} satisfies Prisma.StockCheckInclude
type SavedCheck = Prisma.StockCheckGetPayload<{
  include: typeof stockCheckInclude
}>

export function serializeStockCheck(check: SavedCheck) {
  return {
    id: check.id,
    branchId: check.branchId,
    startedAt: check.startedAt,
    savedAt: check.savedAt,
    createdByName: check.createdByName,
    itemCount: check.items.length,
    items: check.items.map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId,
      name: item.name,
      unit: item.unit,
      systemQuantity: Number(item.systemQuantity),
      actualQuantity: Number(item.actualQuantity),
      difference: Number(item.difference),
      countedAt: item.countedAt,
    })),
  }
}

function conflict(ingredientIds: string[]) {
  return new HttpError(
    409,
    "ข้อมูลคลังเปลี่ยนระหว่างนับ กรุณาตรวจและยืนยันรายการที่ระบุอีกครั้ง",
    { ingredientIds }
  )
}

// The hash excludes requestId and is stable across ordering of identical items.
export function stockCheckRequestHash(input: StockCheckInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        startedAt: input.startedAt,
        items: [...input.items].sort((a, b) =>
          a.ingredientId.localeCompare(b.ingredientId)
        ),
      })
    )
    .digest("hex")
}

export async function saveStockCheck(
  db: Pick<PrismaClient, "$transaction">,
  memberId: string,
  branchId: string,
  input: StockCheckInput
) {
  const hash = stockCheckRequestHash(input)
  // Serializable isolation also protects the ingredient's unit and active status.
  // Retry deadlocks/unique races; the persisted request always wins before version checks.
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const { member, branch } = await assertBranchAccess(
            tx,
            memberId,
            branchId
          )
          if (
            !memberCanViewMenu(member, "stock-check") ||
            !memberCanEditMenu(member, "stock-check")
          ) {
            throw forbidden("คุณไม่มีสิทธิ์บันทึกและปรับยอดจากการเช็คสต็อก")
          }
          const previous = await tx.stockCheck.findUnique({
            where: {
              branchId_requestId: { branchId, requestId: input.requestId },
            },
            include: stockCheckInclude,
          })
          if (previous) {
            if (
              previous.createdByMemberId !== memberId ||
              previous.requestHash !== hash
            ) {
              throw new HttpError(
                409,
                "รหัสการบันทึกนี้ถูกใช้กับผลเช็คอื่นแล้ว"
              )
            }
            return serializeStockCheck(previous)
          }
          const rows = await tx.branchInventory.findMany({
            where: {
              branchId,
              ingredientId: {
                in: input.items.map((item) => item.ingredientId),
              },
            },
            include: { ingredient: true },
          })
          const byId = new Map(rows.map((row) => [row.ingredientId, row]))
          const changed = input.items.filter((item) => {
            const row = byId.get(item.ingredientId)
            return (
              !row ||
              !row.ingredient.isActive ||
              row.ingredient.organizationId !== branch.organizationId ||
              row.ingredient.unit !== item.unit ||
              row.updatedAt.toISOString() !== item.inventoryVersion ||
              !row.onHand.equals(item.systemQuantity)
            )
          })
          if (changed.length)
            throw conflict(changed.map((item) => item.ingredientId))

          const savedAt = new Date()
          const check = await tx.stockCheck.create({
            data: {
              branchId,
              createdByMemberId: memberId,
              createdByName: member.name,
              requestId: input.requestId,
              requestHash: hash,
              startedAt: new Date(input.startedAt),
              savedAt,
            },
          })
          for (const item of [...input.items].sort((a, b) =>
            a.ingredientId.localeCompare(b.ingredientId)
          )) {
            const row = byId.get(item.ingredientId)!
            const difference = new Prisma.Decimal(item.actualQuantity).minus(
              row.onHand
            )
            const detail = await tx.stockCheckItem.create({
              data: {
                stockCheckId: check.id,
                ingredientId: item.ingredientId,
                name: row.ingredient.name,
                unit: row.ingredient.unit,
                systemQuantity: row.onHand,
                actualQuantity: item.actualQuantity,
                difference,
                countedAt: new Date(item.countedAt),
              },
            })
            // Conditional update is deliberate even inside the transaction.
            const updated = await tx.branchInventory.updateMany({
              where: {
                id: row.id,
                updatedAt: new Date(item.inventoryVersion),
                onHand: row.onHand,
              },
              data: {
                onHand: item.actualQuantity,
                lastStockCheckItemId: detail.id,
                lastUpdatedAt: savedAt,
                updatedAt: new Date(
                  Math.max(savedAt.getTime(), row.updatedAt.getTime() + 1)
                ),
              },
            })
            if (updated.count !== 1) throw conflict([item.ingredientId])
            if (!difference.isZero()) {
              await tx.stockMovement.create({
                data: {
                  branchId,
                  ingredientId: item.ingredientId,
                  createdByMemberId: memberId,
                  movementType: difference.isPositive()
                    ? "count_adjustment_in"
                    : "count_adjustment_out",
                  quantity: difference.abs(),
                  unit: item.unit,
                  unitCost: row.costPerUnit,
                  beforeQuantity: row.onHand,
                  afterQuantity: item.actualQuantity,
                  referenceType: "stock_check",
                  referenceId: check.id,
                  occurredAt: savedAt,
                },
              })
            }
          }
          await tx.auditLog.create({
            data: {
              organizationId: branch.organizationId,
              branchId,
              memberId,
              action: "stock_check_saved",
              entityType: "stock_check",
              entityId: check.id,
              metadataJson: JSON.stringify({ itemCount: input.items.length }),
            },
          })
          const saved = await tx.stockCheck.findUnique({
            where: { id: check.id },
            include: stockCheckInclude,
          })
          if (!saved) throw notFound("ไม่พบผลเช็คที่บันทึก")
          return serializeStockCheck(saved)
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 30_000,
        }
      )
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code)
      if (retryable && attempt < 2) continue
      if (retryable)
        throw conflict(input.items.map((item) => item.ingredientId))
      throw error
    }
  }
}
