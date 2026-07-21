import { randomUUID } from "node:crypto"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { badRequest } from "../../utils/http-error"

export const maximumPurchaseReceiptImageBytes = 5 * 1024 * 1024
export const supportedPurchaseReceiptImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type PurchaseReceiptImageInput = {
  name: string
  type: (typeof supportedPurchaseReceiptImageTypes)[number]
  size: number
  dataUrl: string
}

const purchaseReceiptUploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "purchase"
)
const purchaseReceiptUploadUrlDir = "/uploads/purchase"
const imageExtensions: Record<PurchaseReceiptImageInput["type"], string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
}

function safeFileStem(filename: string) {
  const stem = path.parse(filename).name.trim()

  return stem.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 48) || "receipt"
}

function hasExpectedSignature(
  buffer: Buffer,
  mimeType: PurchaseReceiptImageInput["type"]
) {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }

  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    )
  }

  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
}

export function decodePurchaseReceiptImage(input: PurchaseReceiptImageInput) {
  const match = input.dataUrl.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/
  )

  if (!match || match[1] !== input.type) {
    throw badRequest("รูปต้องเป็นไฟล์ JPEG, PNG หรือ WebP ที่ถูกต้อง")
  }

  const buffer = Buffer.from(match[2], "base64")

  if (buffer.length === 0 || buffer.length > maximumPurchaseReceiptImageBytes) {
    throw badRequest("รูปบิลต้องมีขนาดไม่เกิน 5 MB")
  }

  if (buffer.length !== input.size) {
    throw badRequest("ขนาดรูปไม่ตรงกับข้อมูลที่ส่งมา")
  }

  if (!hasExpectedSignature(buffer, input.type)) {
    throw badRequest("ข้อมูลไฟล์รูปไม่ตรงกับชนิดไฟล์")
  }

  return buffer
}

export async function savePurchaseReceiptImage(input: PurchaseReceiptImageInput) {
  const buffer = decodePurchaseReceiptImage(input)
  const extension = imageExtensions[input.type]

  await mkdir(purchaseReceiptUploadDir, { recursive: true })

  const storedName = `${Date.now()}-${randomUUID()}-${safeFileStem(input.name)}${extension}`
  const diskPath = path.join(purchaseReceiptUploadDir, storedName)
  await writeFile(diskPath, buffer)

  return {
    originalName: input.name,
    storedName,
    type: input.type,
    size: buffer.length,
    path: `public/uploads/purchase/${storedName}`,
    url: `${purchaseReceiptUploadUrlDir}/${storedName}`,
  }
}

export async function removePurchaseReceiptImage(receiptImagePath: string | null) {
  if (!receiptImagePath?.startsWith(`${purchaseReceiptUploadUrlDir}/`)) {
    return
  }

  const storedName = receiptImagePath.slice(purchaseReceiptUploadUrlDir.length + 1)

  if (!storedName || path.basename(storedName) !== storedName) {
    return
  }

  try {
    await unlink(path.join(purchaseReceiptUploadDir, storedName))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }
  }
}
