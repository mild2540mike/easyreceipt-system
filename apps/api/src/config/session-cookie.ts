import type { CookieOptions } from "express"

import { env } from "./env"

export function sessionCookieUsesSecureTransport(frontendOrigin: string) {
  return new URL(frontendOrigin).protocol === "https:"
}

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: sessionCookieUsesSecureTransport(env.FRONTEND_ORIGIN),
  path: "/",
}
