import "dotenv/config"
import { PrismaMssql } from "@prisma/adapter-mssql"
import { PrismaClient } from "@prisma/client"

const args = new Set(process.argv.slice(2))
const isApply = args.has("--apply")
const isDryRun = args.has("--dry-run") || !isApply
const organizationArg = [...args].find((arg) => arg.startsWith("--organization="))
const organizationCode = organizationArg?.slice("--organization=".length) || "EASYRECEIPT"
const knownArgs = new Set(["--apply", "--dry-run"])
const unknownArgs = [...args].filter(
  (arg) => !knownArgs.has(arg) && !arg.startsWith("--organization="),
)

if (isApply && args.has("--dry-run")) {
  throw new Error("เลือกได้อย่างใดอย่างหนึ่งระหว่าง --dry-run และ --apply")
}

if (unknownArgs.length > 0) {
  throw new Error(`ไม่รู้จัก argument: ${unknownArgs.join(", ")}`)
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("ไม่พบ DATABASE_URL")
}

const prisma = new PrismaClient({
  adapter: new PrismaMssql(connectionString),
})

const decimalToNumber = (value) => Number(value?.toString?.() ?? value ?? 0)

async function hasPriceMetadataColumns() {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT CASE WHEN COL_LENGTH('dbo.ingredients', 'lastPriceUpdatedAt') IS NULL THEN 0 ELSE 1 END AS ready",
  )
  return Number(rows[0]?.ready ?? 0) === 1
}

async function main() {
  const organization = await prisma.organization.findUnique({
    where: { code: organizationCode },
    select: { id: true, code: true, name: true },
  })

  if (!organization) {
    throw new Error(`ไม่พบองค์กร ${organizationCode}`)
  }

  const [branches, ingredients, existingInventory, metadataColumnsReady] = await Promise.all([
    prisma.branch.findMany({
      where: { organizationId: organization.id, isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.ingredient.findMany({
      where: { organizationId: organization.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, defaultPrice: true, updatedAt: true },
    }),
    prisma.branchInventory.findMany({
      where: {
        branch: { organizationId: organization.id, isActive: true },
        ingredient: { organizationId: organization.id, isActive: true },
      },
      select: {
        branchId: true,
        ingredientId: true,
        onHand: true,
        reservedQuantity: true,
        reorderPoint: true,
        costPerUnit: true,
      },
    }),
    hasPriceMetadataColumns(),
  ])

  const existingKeys = new Set(
    existingInventory.map((row) => `${row.branchId}:${row.ingredientId}`),
  )
  const missingInventory = branches.flatMap((branch) =>
    ingredients
      .filter((ingredient) => !existingKeys.has(`${branch.id}:${ingredient.id}`))
      .map((ingredient) => ({ branch, ingredient })),
  )
  const expectedRows = branches.length * ingredients.length

  const beforeByBranch = branches.map((branch) => {
    const rows = existingInventory.filter((row) => row.branchId === branch.id)
    return {
      code: branch.code,
      rows: rows.length,
      onHand: rows.reduce((sum, row) => sum + decimalToNumber(row.onHand), 0),
      reserved: rows.reduce((sum, row) => sum + decimalToNumber(row.reservedQuantity), 0),
    }
  })

  const report = {
    mode: isApply ? "apply" : "dry-run",
    organization: organization.code,
    metadataColumnsReady,
    activeIngredients: ingredients.length,
    activeBranches: branches.length,
    expectedInventoryRows: expectedRows,
    existingInventoryRows: existingInventory.length,
    inventoryRowsToInsert: missingInventory.length,
    beforeByBranch,
  }

  if (isDryRun) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  if (!metadataColumnsReady) {
    throw new Error("ยังไม่ได้ deploy migration สำหรับ price attribution กรุณารัน migration ก่อน --apply")
  }

  const result = await prisma.$transaction(async (tx) => {
    let insertedInventoryRows = 0
    for (const { branch, ingredient } of missingInventory) {
      const existing = await tx.branchInventory.findUnique({
        where: {
          branchId_ingredientId: {
            branchId: branch.id,
            ingredientId: ingredient.id,
          },
        },
        select: { id: true },
      })
      if (existing) continue

      await tx.branchInventory.create({
        data: {
          branchId: branch.id,
          ingredientId: ingredient.id,
          onHand: 0,
          reservedQuantity: 0,
          reorderPoint: 0,
          costPerUnit: 0,
        },
        select: { id: true },
      })
      insertedInventoryRows += 1
    }

    let backfilledPriceAttribution = 0
    for (const ingredient of ingredients) {
      const current = await tx.ingredient.findUnique({
        where: { id: ingredient.id },
        select: { lastPriceUpdatedAt: true, lastPriceSource: true },
      })
      if (current?.lastPriceUpdatedAt || current?.lastPriceSource) continue

      const latestPurchaseItem = await tx.purchaseItem.findFirst({
        where: {
          ingredientId: ingredient.id,
          purchase: {
            branch: { organizationId: organization.id },
            status: { in: ["saved", "posted"] },
          },
        },
        orderBy: [
          { purchase: { createdAt: "desc" } },
          { createdAt: "desc" },
        ],
        select: {
          purchase: {
            select: {
              createdAt: true,
              createdByMemberId: true,
              branchId: true,
            },
          },
        },
      })

      await tx.ingredient.update({
        where: { id: ingredient.id },
        data: latestPurchaseItem
          ? {
              lastPriceUpdatedByMemberId: latestPurchaseItem.purchase.createdByMemberId,
              lastPriceUpdatedBranchId: latestPurchaseItem.purchase.branchId,
              lastPriceUpdatedAt: latestPurchaseItem.purchase.createdAt,
              lastPriceSource: "purchase",
            }
          : {
              lastPriceUpdatedByMemberId: null,
              lastPriceUpdatedBranchId: null,
              lastPriceUpdatedAt: ingredient.updatedAt,
              lastPriceSource: "migration",
            },
        select: { id: true },
      })
      backfilledPriceAttribution += 1
    }

    return { insertedInventoryRows, backfilledPriceAttribution }
  })

  const afterRows = await prisma.branchInventory.count({
    where: {
      branch: { organizationId: organization.id, isActive: true },
      ingredient: { organizationId: organization.id, isActive: true },
    },
  })

  console.log(JSON.stringify({ ...report, ...result, inventoryRowsAfterApply: afterRows }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
