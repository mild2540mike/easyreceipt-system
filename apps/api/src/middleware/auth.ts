import type { Member } from "@prisma/client"
import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"

import { env } from "../config/env"
import { prisma } from "../db/prisma"
import { unauthorized } from "../utils/http-error"

type SessionPayload = {
  sub: string
}

export type AuthenticatedRequest = Request & {
  member: Member
}

export function getAuthMember(req: Request) {
  return (req as AuthenticatedRequest).member
}

function parseSessionToken(req: Request) {
  const cookieToken = req.cookies?.[env.SESSION_COOKIE_NAME]
  const authHeader = req.header("authorization")
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null

  return cookieToken ?? bearerToken ?? null
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = parseSessionToken(req)

    if (!token) {
      throw unauthorized()
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as SessionPayload

    if (!payload.sub) {
      throw unauthorized()
    }

    const member = await prisma.member.findUnique({
      where: {
        id: payload.sub,
      },
    })

    if (!member || member.status !== "active") {
      throw unauthorized()
    }

    ;(req as AuthenticatedRequest).member = member
    next()
  } catch {
    next(unauthorized())
  }
}
