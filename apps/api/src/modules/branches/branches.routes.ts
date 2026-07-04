import { Router } from "express"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { getAccessibleBranches } from "../common/permissions"

export const branchesRouter = Router()

branchesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branches = await getAccessibleBranches(prisma, member.id)

    res.json({ branches })
  })
)
