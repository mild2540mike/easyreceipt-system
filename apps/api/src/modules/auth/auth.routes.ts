import bcrypt from "bcryptjs"
import { Router, type Response } from "express"
import jwt from "jsonwebtoken"
import { z } from "zod"

import { env } from "../../config/env"
import { prisma } from "../../db/prisma"
import { getAuthMember, requireAuth } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { unauthorized } from "../../utils/http-error"
import { getAccessibleBranches, serializeMember } from "../common/permissions"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authRouter = Router()

function createSessionToken(memberId: string) {
  return jwt.sign({ sub: memberId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions)
}

async function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash.startsWith("prototype:")) {
    return passwordHash.slice("prototype:".length) === password
  }

  return bcrypt.compare(password, passwordHash)
}

function setSessionCookie(res: Response, token: string) {
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  })
}

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body)
    const member = await prisma.member.findFirst({
      where: {
        email: input.email.trim().toLowerCase(),
        status: "active",
      },
    })

    if (!member || !(await verifyPassword(input.password, member.passwordHash))) {
      throw unauthorized("Invalid email or password.")
    }

    await prisma.member.update({
      where: {
        id: member.id,
      },
      data: {
        lastActiveAt: new Date(),
      },
    })

    const token = createSessionToken(member.id)
    setSessionCookie(res, token)

    const branches = await getAccessibleBranches(prisma, member.id)

    res.json({
      member: serializeMember(member),
      branchIds: branches.map((branch) => branch.id),
      branches,
    })
  })
)

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.clearCookie(env.SESSION_COOKIE_NAME, {
      path: "/",
    })
    res.status(204).send()
  })
)

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branches = await getAccessibleBranches(prisma, member.id)

    res.json({
      member: serializeMember(member),
      branchIds: branches.map((branch) => branch.id),
      branches,
    })
  })
)
