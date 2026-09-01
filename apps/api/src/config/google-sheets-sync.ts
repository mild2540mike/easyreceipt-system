import { createHash, timingSafeEqual } from "node:crypto"

export function normalizeGoogleSheetsSyncToken(rawValue: string) {
  const token = rawValue.trim()

  if (token && token.length < 32) {
    throw new Error("Google Sheets sync token must be at least 32 characters long.")
  }

  return token
}

function tokenDigest(value: string) {
  return createHash("sha256").update(value, "utf8").digest()
}

export function hasValidGoogleSheetsSyncToken(
  configuredToken: string,
  suppliedToken: string | undefined
) {
  if (!configuredToken || !suppliedToken) {
    return false
  }

  return timingSafeEqual(
    tokenDigest(configuredToken),
    tokenDigest(suppliedToken.trim())
  )
}
