import { Router } from "express"
import { z } from "zod"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { forbidden } from "../../utils/http-error"
import { routeParam } from "../../utils/route-param"
import {
  assertBranchAccess,
  getAccessibleBranches,
  memberCanEditMenu,
  serializeBranch,
} from "../common/permissions"

export const branchesRouter = Router()

const updateBranchBudgetSchema = z.object({
  dailyPurchaseBudget: z.union([z.null(), z.coerce.number().min(0)]),
})

branchesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branches = await getAccessibleBranches(prisma, member.id)

    res.json({ branches: branches.map(serializeBranch) })
  })
)

branchesRouter.patch(
  "/:branchId/budget",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = updateBranchBudgetSchema.parse(req.body)

    const branch = await prisma.$transaction(async (tx) => {
      const access = await assertBranchAccess(tx, member.id, branchId)

      if (!memberCanEditMenu(access.member, "budgets")) {
        throw forbidden("Member does not have permission to update branch budget.")
      }

      return tx.branch.update({
        where: {
          id: branchId,
        },
        data: {
          dailyPurchaseBudget: input.dailyPurchaseBudget,
        },
      })
    })

    res.json({ branch: serializeBranch(branch) })
  })
)
