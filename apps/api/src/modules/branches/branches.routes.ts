import { Router } from "express"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"

export const branchesRouter = Router()

branchesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branches = await prisma.branch.findMany({
      where: {
        memberAccess: {
          some: {
            memberId: member.id,
          },
        },
        isActive: true,
      },
      orderBy: {
        code: "asc",
      },
    })

    res.json({ branches })
  })
)
