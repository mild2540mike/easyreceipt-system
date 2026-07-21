import type { PurchaseScanImageInput } from "@/lib/easyreceipt-api"

const maximumSourceBytes = 25 * 1024 * 1024
const maximumOutputBytes = 5 * 1024 * 1024
const maximumLongEdge = 2048
const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

function blobDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปได้"))
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("ไม่สามารถอ่านไฟล์รูปได้"))
        return
      }

      resolve(reader.result)
    }
    reader.readAsDataURL(blob)
  })
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("ไม่สามารถเตรียมรูปสำหรับสแกนได้"))
          return
        }

        resolve(blob)
      },
      "image/jpeg",
      quality
    )
  })
}

export async function preparePurchaseScanImage(
  file: File
): Promise<PurchaseScanImageInput> {
  if (!supportedTypes.has(file.type)) {
    throw new Error("รองรับเฉพาะรูป JPEG, PNG และ WebP")
  }

  if (file.size <= 0 || file.size > maximumSourceBytes) {
    throw new Error("ไฟล์รูปต้นฉบับต้องมีขนาดไม่เกิน 25 MB")
  }

  let bitmap: ImageBitmap

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new Error("ไม่สามารถเปิดรูปนี้ได้ กรุณาเลือกรูป JPEG, PNG หรือ WebP อื่น")
  }

  try {
    const scale = Math.min(
      1,
      maximumLongEdge / Math.max(bitmap.width, bitmap.height)
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d", { alpha: false })

    if (!context) {
      throw new Error("เบราว์เซอร์นี้ไม่สามารถเตรียมรูปสำหรับสแกนได้")
    }

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)

    let processed = await canvasBlob(canvas, 0.9)

    if (processed.size > maximumOutputBytes) {
      processed = await canvasBlob(canvas, 0.8)
    }

    if (processed.size > maximumOutputBytes) {
      processed = await canvasBlob(canvas, 0.7)
    }

    if (processed.size > maximumOutputBytes) {
      throw new Error("รูปยังมีขนาดเกิน 5 MB หลังย่อ กรุณาครอปรูปให้เหลือเฉพาะบิล")
    }

    const fileStem = file.name.replace(/\.[^.]+$/, "").trim() || "receipt"

    return {
      name: `${fileStem}.jpg`,
      type: "image/jpeg",
      size: processed.size,
      dataUrl: await blobDataUrl(processed),
    }
  } finally {
    bitmap.close()
  }
}
