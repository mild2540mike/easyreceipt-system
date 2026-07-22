import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  decodePurchaseReceiptImage,
  type PurchaseReceiptImageInput,
} from "../purchases/purchase-receipt-image"

const usageReceiptUploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "usage"
)
const usageReceiptUploadUrlDir = "/uploads/usage"
const imageExtensions: Record<PurchaseReceiptImageInput["type"], string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
}

function safeFileStem(filename: string) {
  const stem = path.parse(filename).name.trim()

  return stem.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 48) || "receipt"
}

export async function saveUsageReceiptImage(input: PurchaseReceiptImageInput) {
  const buffer = decodePurchaseReceiptImage(input)
  const extension = imageExtensions[input.type]

  await mkdir(usageReceiptUploadDir, { recursive: true })

  const storedName = `${Date.now()}-${randomUUID()}-${safeFileStem(input.name)}${extension}`
  const diskPath = path.join(usageReceiptUploadDir, storedName)
  await writeFile(diskPath, buffer)

  return {
    originalName: input.name,
    storedName,
    type: input.type,
    size: buffer.length,
    path: `public/uploads/usage/${storedName}`,
    url: `${usageReceiptUploadUrlDir}/${storedName}`,
  }
}
