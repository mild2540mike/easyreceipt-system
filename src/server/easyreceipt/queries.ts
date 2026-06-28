import { prisma } from "@/lib/prisma"

export type DashboardStockNeed = {
  ingredientId: string
  name: string
  unit: string
  onHand: number
  reservedQuantity: number
  suggestedPurchaseQuantity: number
}

export async function getAccessibleBranches(memberId: string) {
  const member = await prisma.member.findUnique({
    where: {
      id: memberId,
    },
    include: {
      branchAccess: {
        include: {
          branch: true,
        },
      },
    },
  })

  if (!member || member.status !== "active") {
    return []
  }

  return member.branchAccess
    .map((access) => access.branch)
    .filter((branch) => branch.isActive)
}

export async function canAccessBranch(memberId: string, branchId: string) {
  const access = await prisma.memberBranchAccess.findUnique({
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

  return Boolean(
    access && access.member.status === "active" && access.branch.isActive
  )
}

export async function getBranchDashboard(memberId: string, branchId: string) {
  const allowed = await canAccessBranch(memberId, branchId)

  if (!allowed) {
    throw new Error("Member does not have access to this branch.")
  }

  const [inventoryRows, purchaseTotal] = await Promise.all([
    prisma.branchInventory.findMany({
      where: {
        branchId,
      },
      include: {
        ingredient: true,
      },
      orderBy: {
        ingredient: {
          name: "asc",
        },
      },
    }),
    prisma.purchase.aggregate({
      where: {
        branchId,
        status: "posted",
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ])

  const stockNeeds: DashboardStockNeed[] = inventoryRows
    .map((row) => {
      const onHand = Number(row.onHand)
      const reservedQuantity = Number(row.reservedQuantity)

      return {
        ingredientId: row.ingredientId,
        name: row.ingredient.name,
        unit: row.ingredient.unit,
        onHand,
        reservedQuantity,
        suggestedPurchaseQuantity: Math.max(reservedQuantity - onHand, 0),
      }
    })
    .filter((row) => row.suggestedPurchaseQuantity > 0)
    .sort(
      (first, second) =>
        second.suggestedPurchaseQuantity - first.suggestedPurchaseQuantity
    )

  return {
    purchaseTotal: Number(purchaseTotal._sum.totalAmount ?? 0),
    stockNeeds,
    stockNeedCount: stockNeeds.length,
  }
}

export async function getBranchInventory(memberId: string, branchId: string) {
  const allowed = await canAccessBranch(memberId, branchId)

  if (!allowed) {
    throw new Error("Member does not have access to this branch.")
  }

  return prisma.branchInventory.findMany({
    where: {
      branchId,
    },
    include: {
      ingredient: true,
    },
    orderBy: {
      ingredient: {
        name: "asc",
      },
    },
  })
}

export async function getBranchRecipes(memberId: string, branchId: string) {
  const allowed = await canAccessBranch(memberId, branchId)

  if (!allowed) {
    throw new Error("Member does not have access to this branch.")
  }

  return prisma.recipe.findMany({
    where: {
      branchId,
      isActive: true,
    },
    include: {
      items: {
        include: {
          ingredient: true,
        },
      },
      plans: {
        where: {
          status: "pinned",
        },
        include: {
          reservations: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  })
}

export async function getReportSummary(memberId: string) {
  const branches = await getAccessibleBranches(memberId)
  const branchIds = branches.map((branch) => branch.id)

  const [purchaseTotal, cookingCount, stockMovementCount] = await Promise.all([
    prisma.purchase.aggregate({
      where: {
        branchId: {
          in: branchIds,
        },
        status: "posted",
      },
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.cookingRun.count({
      where: {
        branchId: {
          in: branchIds,
        },
      },
    }),
    prisma.stockMovement.count({
      where: {
        branchId: {
          in: branchIds,
        },
      },
    }),
  ])

  return {
    branchCount: branches.length,
    branchNames: branches.map((branch) => branch.name),
    purchaseTotal: Number(purchaseTotal._sum.totalAmount ?? 0),
    cookingCount,
    stockMovementCount,
  }
}
