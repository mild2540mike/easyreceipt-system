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

type OptionallyAuthenticatedRequest = Request & {
  member?: Member
}

export function getAuthMember(req: Request) {
  return (req as AuthenticatedRequest).member
}

export function getOptionalAuthMember(req: Request) {
  return (req as OptionallyAuthenticatedRequest).member ?? null
}

function parseSessionToken(req: Request) {
  const cookieToken = req.cookies?.[env.SESSION_COOKIE_NAME]
  const authHeader = req.header("authorization")
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null

  return cookieToken ?? bearerToken ?? null
}

async function resolveSessionMember(req: Request) {
  const token = parseSessionToken(req)

  if (!token) {
    return null
  }

  const payload = jwt.verify(token, env.JWT_SECRET) as SessionPayload

  if (!payload.sub) {
    return null
  }

  const member = await prisma.member.findUnique({
    where: {
      id: payload.sub,
    },
  })

  return member?.status === "active" ? member : null
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const member = await resolveSessionMember(req)

    if (!member) {
      throw unauthorized()
    }

    ;(req as AuthenticatedRequest).member = member
    next()
  } catch {
    next(unauthorized())
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const member = await resolveSessionMember(req)

    if (member) {
      ;(req as OptionallyAuthenticatedRequest).member = member
    }
  } catch {
    // Logout must still clear an invalid or expired session cookie.
  }

  next()
}
