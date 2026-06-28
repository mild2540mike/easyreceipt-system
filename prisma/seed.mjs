import "dotenv/config"
import { PrismaMssql } from "@prisma/adapter-mssql"
import { PrismaClient } from "@prisma/client"

const connectionString =
  process.env.DATABASE_URL ??
  "sqlserver://localhost:1433;database=EasyReceiptSystem;user=sa;password=YourStrong(!)Password;encrypt=true;trustServerCertificate=true"

const prisma = new PrismaClient({
  adapter: new PrismaMssql(connectionString),
})

const organization = {
  id: "org-easyreceipt",
  code: "EASYRECEIPT",
  name: "EasyReceipt Demo",
}

const branches = [
  {
    id: "branch-hq",
    code: "HQ",
    name: "สำนักงานใหญ่",
    location: "กรุงเทพฯ",
  },
  {
    id: "branch-bangna",
    code: "BN",
    name: "สาขาบางนา",
    location: "กรุงเทพฯ ฝั่งตะวันออก",
  },
  {
    id: "branch-rangsit",
    code: "RS",
    name: "สาขารังสิต",
    location: "ปทุมธานี",
  },
  {
    id: "branch-rama2",
    code: "R2",
    name: "สาขาพระราม 2",
    location: "กรุงเทพฯ ฝั่งใต้",
  },
  {
    id: "branch-chiangmai",
    code: "CM",
    name: "สาขาเชียงใหม่",
    location: "เชียงใหม่",
  },
]

const members = [
  {
    id: "member-owner",
    name: "คุณยานาร์",
    email: "owner@easyreceipt.local",
    role: "owner",
    status: "active",
    primaryBranchId: "branch-hq",
    branchIds: branches.map((branch) => branch.id),
  },
  {
    id: "member-manager",
    name: "พิมพ์ชนก",
    email: "manager@easyreceipt.local",
    role: "manager",
    status: "active",
    primaryBranchId: "branch-bangna",
    branchIds: ["branch-hq", "branch-bangna", "branch-rangsit"],
  },
  {
    id: "member-staff",
    name: "นที",
    email: "staff@easyreceipt.local",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-bangna",
    branchIds: ["branch-bangna"],
  },
  {
    id: "member-viewer",
    name: "ฝ่ายบัญชี",
    email: "accounting@easyreceipt.local",
    role: "viewer",
    status: "invited",
    primaryBranchId: "branch-hq",
    branchIds: ["branch-hq"],
  },
]

const ingredients = [
  {
    id: "chicken-breast",
    name: "อกไก่",
    category: "โปรตีน",
    unit: "กก.",
    defaultPrice: 118,
    supplier: "ตลาดสดรุ่งเรือง",
  },
  {
    id: "jasmine-rice",
    name: "ข้าวหอมมะลิ",
    category: "ของแห้ง",
    unit: "กก.",
    defaultPrice: 43,
    supplier: "ข้าวถุงชุมชน",
  },
  {
    id: "egg",
    name: "ไข่ไก่",
    category: "โปรตีน",
    unit: "ฟอง",
    defaultPrice: 4.5,
    supplier: "ฟาร์มบ้านเหนือ",
  },
  {
    id: "basil",
    name: "ใบกะเพรา",
    category: "ผักสด",
    unit: "กก.",
    defaultPrice: 72,
    supplier: "สวนผักแม่คำ",
  },
  {
    id: "fish-sauce",
    name: "น้ำปลา",
    category: "เครื่องปรุง",
    unit: "ขวด",
    defaultPrice: 34,
    supplier: "ร้านขายส่งดีดี",
  },
  {
    id: "cooking-oil",
    name: "น้ำมันพืช",
    category: "เครื่องปรุง",
    unit: "ขวด",
    defaultPrice: 58,
    supplier: "ร้านขายส่งดีดี",
  },
  {
    id: "thai-chili",
    name: "พริกสด",
    category: "ผักสด",
    unit: "กก.",
    defaultPrice: 86,
    supplier: "ตลาดสดรุ่งเรือง",
  },
  {
    id: "garlic",
    name: "กระเทียม",
    category: "ผักสด",
    unit: "กก.",
    defaultPrice: 64,
    supplier: "สวนผักแม่คำ",
  },
]

const baseInventory = {
  "chicken-breast": { onHand: 11, reorderPoint: 8, costPerUnit: 118 },
  "jasmine-rice": { onHand: 38, reorderPoint: 15, costPerUnit: 43 },
  egg: { onHand: 60, reorderPoint: 48, costPerUnit: 4.5 },
  basil: { onHand: 3.2, reorderPoint: 1.5, costPerUnit: 72 },
  "fish-sauce": { onHand: 12, reorderPoint: 6, costPerUnit: 34 },
  "cooking-oil": { onHand: 9, reorderPoint: 6, costPerUnit: 58 },
  "thai-chili": { onHand: 1.6, reorderPoint: 1.2, costPerUnit: 86 },
  garlic: { onHand: 1.8, reorderPoint: 1.2, costPerUnit: 64 },
}

const purchaseDraft = [
  { ingredientId: "chicken-breast", quantity: 7.5 },
  { ingredientId: "egg", quantity: 56 },
  { ingredientId: "cooking-oil", quantity: 6 },
]

const recipeTemplates = [
  {
    slug: "basil-chicken",
    name: "ข้าวกะเพราไก่",
    menuCategory: "อาหารจานเดียว",
    servingYield: 24,
    pricePerServing: 65,
    items: [
      { ingredientId: "chicken-breast", quantity: 4.8 },
      { ingredientId: "jasmine-rice", quantity: 5 },
      { ingredientId: "basil", quantity: 0.8 },
      { ingredientId: "thai-chili", quantity: 0.25 },
      { ingredientId: "garlic", quantity: 0.35 },
      { ingredientId: "fish-sauce", quantity: 0.5 },
    ],
  },
  {
    slug: "fried-rice-egg",
    name: "ข้าวผัดไข่",
    menuCategory: "อาหารจานเดียว",
    servingYield: 30,
    pricePerServing: 55,
    items: [
      { ingredientId: "jasmine-rice", quantity: 6 },
      { ingredientId: "egg", quantity: 45 },
      { ingredientId: "cooking-oil", quantity: 1 },
      { ingredientId: "garlic", quantity: 0.25 },
      { ingredientId: "fish-sauce", quantity: 0.4 },
    ],
  },
  {
    slug: "protein-box",
    name: "กล่องโปรตีนคลีน",
    menuCategory: "อาหารสุขภาพ",
    servingYield: 18,
    pricePerServing: 89,
    items: [
      { ingredientId: "chicken-breast", quantity: 5.4 },
      { ingredientId: "jasmine-rice", quantity: 3.6 },
      { ingredientId: "egg", quantity: 18 },
      { ingredientId: "cooking-oil", quantity: 0.6 },
    ],
  },
]

function branchFactor(index) {
  return 1 + index * 0.08
}

function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

async function clearDatabase(tx) {
  await tx.auditLog.deleteMany()
  await tx.stockMovement.deleteMany()
  await tx.cookingRun.deleteMany()
  await tx.stockReservation.deleteMany()
  await tx.recipePlan.deleteMany()
  await tx.recipeItem.deleteMany()
  await tx.recipe.deleteMany()
  await tx.purchaseItem.deleteMany()
  await tx.purchase.deleteMany()
  await tx.branchInventory.deleteMany()
  await tx.ingredient.deleteMany()
  await tx.memberBranchAccess.deleteMany()
  await tx.member.deleteMany()
  await tx.branch.deleteMany()
  await tx.organization.deleteMany()
}

async function seedBranchWorkspace(tx, branch, branchIndex) {
  const factor = branchFactor(branchIndex)
  const inventoryByIngredient = new Map()
  const reservationTotals = new Map()

  for (const ingredient of ingredients) {
    const base = baseInventory[ingredient.id]
    const row = await tx.branchInventory.create({
      data: {
        branchId: branch.id,
        ingredientId: ingredient.id,
        onHand: round(base.onHand * factor + branchIndex),
        reorderPoint: round(base.reorderPoint * factor),
        costPerUnit: round(base.costPerUnit * factor, 2),
        lastUpdatedAt: new Date("2026-06-27T08:00:00+07:00"),
      },
    })
    inventoryByIngredient.set(ingredient.id, row)
  }

  const purchaseItems = purchaseDraft.map((item) => {
    const ingredient = ingredients.find((entry) => entry.id === item.ingredientId)
    const unitPrice = round((ingredient?.defaultPrice ?? 0) * factor, 2)
    const quantity = round(item.quantity * factor)

    return {
      ingredientId: item.ingredientId,
      quantity,
      unit: ingredient?.unit ?? "-",
      unitPrice,
      lineTotal: round(quantity * unitPrice, 2),
    }
  })

  const purchase = await tx.purchase.create({
    data: {
      id: `${branch.id}-purchase-demo`,
      branchId: branch.id,
      createdByMemberId: "member-owner",
      purchaseDate: new Date("2026-06-27T08:00:00+07:00"),
      vendor: "ใบซื้อเริ่มต้น",
      status: "posted",
      totalAmount: round(
        purchaseItems.reduce((total, item) => total + item.lineTotal, 0),
        2
      ),
    },
  })

  for (const item of purchaseItems) {
    const purchaseItem = await tx.purchaseItem.create({
      data: {
        ...item,
        purchaseId: purchase.id,
      },
    })
    const before = Number(inventoryByIngredient.get(item.ingredientId).onHand)
    const after = round(before + item.quantity)

    await tx.branchInventory.update({
      where: {
        branchId_ingredientId: {
          branchId: branch.id,
          ingredientId: item.ingredientId,
        },
      },
      data: {
        onHand: after,
        lastUpdatedAt: new Date("2026-06-27T08:00:00+07:00"),
      },
    })
    inventoryByIngredient.set(item.ingredientId, {
      ...inventoryByIngredient.get(item.ingredientId),
      onHand: after,
    })

    await tx.stockMovement.create({
      data: {
        branchId: branch.id,
        ingredientId: item.ingredientId,
        purchaseItemId: purchaseItem.id,
        createdByMemberId: "member-owner",
        movementType: "purchase_in",
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitPrice,
        beforeQuantity: before,
        afterQuantity: after,
        referenceType: "purchase",
        referenceId: purchase.id,
      },
    })
  }

  for (const template of recipeTemplates) {
    const recipe = await tx.recipe.create({
      data: {
        id: `${branch.id}-recipe-${template.slug}`,
        branchId: branch.id,
        name: template.name,
        menuCategory: template.menuCategory,
        servingYield: template.servingYield + branchIndex * 2,
        pricePerServing: template.pricePerServing + branchIndex * 5,
        items: {
          create: template.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    const plan = await tx.recipePlan.create({
      data: {
        id: `${recipe.id}-plan`,
        branchId: branch.id,
        recipeId: recipe.id,
        plannedByMemberId: "member-owner",
        status: "pinned",
        batchCount: 1,
      },
    })

    for (const recipeItem of recipe.items) {
      await tx.stockReservation.create({
        data: {
          branchId: branch.id,
          recipePlanId: plan.id,
          ingredientId: recipeItem.ingredientId,
          quantity: recipeItem.quantity,
          status: "active",
        },
      })

      reservationTotals.set(
        recipeItem.ingredientId,
        round(
          (reservationTotals.get(recipeItem.ingredientId) ?? 0) +
            Number(recipeItem.quantity)
        )
      )
    }
  }

  for (const [ingredientId, reservedQuantity] of reservationTotals.entries()) {
    await tx.branchInventory.update({
      where: {
        branchId_ingredientId: {
          branchId: branch.id,
          ingredientId,
        },
      },
      data: {
        reservedQuantity,
      },
    })
  }
}

async function main() {
  await prisma.$transaction(
    async (tx) => {
      await clearDatabase(tx)

      await tx.organization.create({
        data: organization,
      })

      for (const branch of branches) {
        await tx.branch.create({
          data: {
            ...branch,
            organizationId: organization.id,
          },
        })
      }

      for (const member of members) {
        await tx.member.create({
          data: {
            id: member.id,
            organizationId: organization.id,
            primaryBranchId: member.primaryBranchId,
            name: member.name,
            email: member.email,
            passwordHash: "prototype:123456",
            role: member.role,
            status: member.status,
            joinedAt: new Date("2026-06-01T08:00:00+07:00"),
          },
        })

        for (const branchId of member.branchIds) {
          await tx.memberBranchAccess.create({
            data: {
              memberId: member.id,
              branchId,
            },
          })
        }
      }

      for (const ingredient of ingredients) {
        await tx.ingredient.create({
          data: {
            ...ingredient,
            organizationId: organization.id,
          },
        })
      }

      for (const [index, branch] of branches.entries()) {
        await seedBranchWorkspace(tx, branch, index)
      }

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          memberId: "member-owner",
          action: "seed",
          entityType: "database",
          entityId: organization.id,
          metadataJson: JSON.stringify({
            branches: branches.length,
            ingredients: ingredients.length,
            recipesPerBranch: recipeTemplates.length,
          }),
        },
      })
    },
    {
      timeout: 30000,
    }
  )
}

main()
  .then(async () => {
    console.log("EasyReceipt MSSQL seed completed.")
  })
  .catch(async (error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
