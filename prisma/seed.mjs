import "dotenv/config"
import { PrismaMssql } from "@prisma/adapter-mssql"
import { PrismaClient } from "@prisma/client"

import { stockSeedItems, stockSeedStats } from "./stock-seed-data.mjs"

const connectionString = process.env.DATABASE_URL

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
    id: "branch-wat-sakaeo",
    code: "WSK",
    name: "โรงเรียนวัดสระแก้ว",
    location: "อำเภอเมืองนครราชสีมา",
  },
  {
    id: "branch-keha",
    code: "KHA",
    name: "โรงเรียนเคหะ",
    location: "อำเภอเมืองนครราชสีมา",
  },
  {
    id: "branch-ban-khok-sung",
    code: "BKS",
    name: "โรงเรียนบ้านโคกสูง",
    location: "อำเภอโคกสูง",
  },
  {
    id: "branch-chokchai",
    code: "CKC",
    name: "โรงเรียนโชคชัย",
    location: "อำเภอโชคชัย",
  },
  {
    id: "branch-chakkarat",
    code: "CKR",
    name: "โรงเรียนจักราช",
    location: "อำเภอจักราช",
  },
  {
    id: "branch-kham-thale-so",
    code: "KTS",
    name: "โรงเรียนขามทะเลสอ",
    location: "อำเภอขามทะเลสอ",
  },
  {
    id: "branch-huai-thalaeng",
    code: "HTL",
    name: "โรงเรียนห้วยแถลง",
    location: "อำเภอห้วยแถลง",
  },
  {
    id: "branch-school-total",
    code: "ALL",
    name: "งานโรงเรียนรวม",
    location: "รวมทุกโรงเรียน",
  },
]

const members = [
  {
    id: "member-owner",
    name: "Owner",
    username: "owner",
    role: "owner",
    status: "active",
    primaryBranchId: "branch-wat-sakaeo",
    branchIds: branches.map((branch) => branch.id),
  },
  {
    id: "member-manager",
    name: "ผู้ดูแลระบบ",
    username: "manager",
    role: "manager",
    status: "active",
    primaryBranchId: "branch-wat-sakaeo",
    branchIds: ["branch-wat-sakaeo"],
  },
  {
    id: "member-staff",
    name: "Staff",
    username: "staff",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-wat-sakaeo",
    branchIds: ["branch-wat-sakaeo"],
  },
  {
    id: "member-staff-1",
    name: "Staff1",
    username: "staff1",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-wat-sakaeo",
    branchIds: ["branch-wat-sakaeo"],
  },
  {
    id: "member-staff-2",
    name: "Staff2",
    username: "staff2",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-keha",
    branchIds: ["branch-keha"],
  },
  {
    id: "member-staff-3",
    name: "Staff3",
    username: "staff3",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-ban-khok-sung",
    branchIds: ["branch-ban-khok-sung"],
  },
  {
    id: "member-staff-4",
    name: "Staff4",
    username: "staff4",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-chokchai",
    branchIds: ["branch-chokchai"],
  },
  {
    id: "member-staff-5",
    name: "Staff5",
    username: "staff5",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-chakkarat",
    branchIds: ["branch-chakkarat"],
  },
  {
    id: "member-staff-6",
    name: "Staff6",
    username: "staff6",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-kham-thale-so",
    branchIds: ["branch-kham-thale-so"],
  },
  {
    id: "member-staff-7",
    name: "Staff7",
    username: "staff7",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-huai-thalaeng",
    branchIds: ["branch-huai-thalaeng"],
  },
  {
    id: "member-staff-8",
    name: "Staff8",
    username: "staff8",
    role: "staff",
    status: "active",
    primaryBranchId: "branch-school-total",
    branchIds: ["branch-school-total"],
  },
]

const menuPermissionKeys = [
  "purchase",
  "usage",
  "stock",
  "recipes",
  "reports",
  "members",
  "budgets",
]

function defaultMemberPermissions(role) {
  if (role === "owner" || role === "manager") {
    return Object.fromEntries(
      menuPermissionKeys.map((key) => [key, { view: true, edit: true }])
    )
  }

  return {
    purchase: { view: true, edit: true },
    usage: { view: true, edit: true },
    stock: { view: true, edit: false },
    recipes: { view: true, edit: true },
    reports: { view: false, edit: false },
    members: { view: false, edit: false },
    budgets: { view: false, edit: false },
  }
}

const usageReasonSeeds = [
  "ใช้ประจำวัน",
  "ของเสีย",
  "จำหน่าย",
  "ของหาย",
]


function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

async function clearDatabase(tx) {
  await tx.auditLog.deleteMany()
  await tx.stockMovement.deleteMany()
  await tx.usageReason.deleteMany()
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

async function seedBranchWorkspace(tx, branch) {
  for (const item of stockSeedItems) {
    await tx.branchInventory.create({
      data: {
        branchId: branch.id,
        ingredientId: item.id,
        onHand: 0,
        reorderPoint: round(item.inventory.reorderPoint),
        costPerUnit: round(item.inventory.costPerUnit, 2),
        lastUpdatedAt: new Date("2026-06-27T08:00:00+07:00"),
      },
    })
  }

  await tx.branchInventory.updateMany({
    where: {
      branchId: branch.id,
    },
    data: {
      onHand: 0,
      lastUpdatedAt: new Date("2026-06-27T08:00:00+07:00"),
    },
  })
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
            username: member.username,
            passwordHash: "prototype:123456",
            role: member.role,
            status: member.status,
            permissionsJson: JSON.stringify(defaultMemberPermissions(member.role)),
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

      for (const label of usageReasonSeeds) {
        await tx.usageReason.create({
          data: {
            organizationId: organization.id,
            label,
          },
        })
      }

      for (const ingredient of stockSeedItems) {
        await tx.ingredient.create({
          data: {
            id: ingredient.id,
            organizationId: organization.id,
            name: ingredient.name,
            category: ingredient.category,
            unit: ingredient.unit,
            defaultPrice: ingredient.defaultPrice,
            supplier: ingredient.supplier,
          },
        })
      }

      for (const branch of branches) {
        await seedBranchWorkspace(tx, branch)
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
            ingredients: stockSeedItems.length,
            skippedStockRows: stockSeedStats.skippedRows,
          }),
        },
      })
    },
    {
      timeout: 120000,
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
