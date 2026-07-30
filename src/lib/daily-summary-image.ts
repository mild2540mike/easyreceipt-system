"use client"

export type DailySummaryImageRow = {
  name: string
  quantity: number
  unit: string
  price: number
}

export type DailySummaryImageGroup = {
  title: string
  subtitle?: string
  total: number
  rows: DailySummaryImageRow[]
}

type DailySummaryImageInput = {
  type: "purchase" | "usage"
  branchName: string
  date: Date
  groups: DailySummaryImageGroup[]
}

type ImagePageGroup = DailySummaryImageGroup & {
  continued?: boolean
}

const canvasWidth = 1080
const maximumCanvasHeight = 8000
const pageHorizontalPadding = 56
const pageHeaderHeight = 230
const pageFooterHeight = 56
const groupHeaderHeight = 112
const tableHeaderHeight = 52
const tableRowHeight = 58
const groupGap = 30
const fontFamily = '"Noto Sans Thai", system-ui, sans-serif'

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 3,
  }).format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatThaiDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function safeFilenamePart(value: string) {
  const normalized = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)

  return normalized || "branch"
}

function groupHeight(group: Pick<DailySummaryImageGroup, "rows">) {
  return (
    groupHeaderHeight +
    tableHeaderHeight +
    group.rows.length * tableRowHeight +
    groupGap
  )
}

function paginateGroups(groups: DailySummaryImageGroup[]) {
  const availableHeight =
    maximumCanvasHeight - pageHeaderHeight - pageFooterHeight
  const pages: ImagePageGroup[][] = []
  let currentPage: ImagePageGroup[] = []
  let currentHeight = 0

  function flushPage() {
    if (currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = []
      currentHeight = 0
    }
  }

  for (const group of groups) {
    let rowOffset = 0
    let continued = false

    while (rowOffset < group.rows.length) {
      const fixedHeight = groupHeaderHeight + tableHeaderHeight + groupGap
      const remainingHeight = availableHeight - currentHeight
      const rowsThatFit = Math.floor(
        (remainingHeight - fixedHeight) / tableRowHeight
      )

      if (rowsThatFit <= 0) {
        flushPage()
        continue
      }

      const remainingRows = group.rows.length - rowOffset
      const take = Math.min(rowsThatFit, remainingRows)
      const pageGroup: ImagePageGroup = {
        ...group,
        rows: group.rows.slice(rowOffset, rowOffset + take),
        continued,
      }
      currentPage.push(pageGroup)
      currentHeight += groupHeight(pageGroup)
      rowOffset += take
      continued = rowOffset < group.rows.length

      if (continued) {
        flushPage()
      }
    }
  }

  flushPage()
  return pages
}

function ellipsize(
  context: CanvasRenderingContext2D,
  value: string,
  maximumWidth: number
) {
  if (context.measureText(value).width <= maximumWidth) {
    return value
  }

  let result = value

  while (
    result.length > 1 &&
    context.measureText(`${result}…`).width > maximumWidth
  ) {
    result = result.slice(0, -1)
  }

  return `${result}…`
}

function createPageCanvas({
  type,
  branchName,
  date,
  groups,
  pageNumber,
  pageCount,
  grandTotal,
}: Omit<DailySummaryImageInput, "groups"> & {
  groups: ImagePageGroup[]
  pageNumber: number
  pageCount: number
  grandTotal: number
}) {
  const contentHeight = groups.reduce(
    (total, group) => total + groupHeight(group),
    0
  )
  const height = pageHeaderHeight + contentHeight + pageFooterHeight
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("ไม่สามารถสร้างรูปสรุปได้")
  }

  const drawingContext = context

  canvas.width = canvasWidth
  canvas.height = height
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvasWidth, height)

  function drawText(
    value: string,
    x: number,
    y: number,
    options: {
      align?: CanvasTextAlign
      color?: string
      font?: string
      maximumWidth?: number
    } = {}
  ) {
    drawingContext.textAlign = "left"
    drawingContext.textBaseline = "alphabetic"
    drawingContext.direction = "ltr"
    drawingContext.fillStyle = options.color ?? "#0f172a"
    drawingContext.font = options.font ?? `400 22px ${fontFamily}`
    const text = options.maximumWidth
      ? ellipsize(drawingContext, value, options.maximumWidth)
      : value
    const textWidth = drawingContext.measureText(text).width
    const align = options.align ?? "left"
    const drawingX =
      align === "right" || align === "end"
        ? x - textWidth
        : align === "center"
          ? x - textWidth / 2
          : x

    drawingContext.fillText(text, drawingX, y)
  }

  context.fillStyle = type === "purchase" ? "#fff7ed" : "#f0fdf4"
  context.fillRect(0, 0, canvasWidth, 184)
  context.fillStyle = type === "purchase" ? "#d97706" : "#059669"
  context.fillRect(0, 0, 12, 184)

  drawText(
    type === "purchase"
      ? "สรุปบันทึกของมาเพิ่ม"
      : "สรุปบันทึกของใช้ไป",
    pageHorizontalPadding,
    62,
    { font: `700 34px ${fontFamily}` }
  )
  drawText(`วันที่: ${formatThaiDate(date)}`, pageHorizontalPadding, 106, {
    color: "#475569",
    font: `400 22px ${fontFamily}`,
  })
  drawText(`สาขา: ${branchName || "-"}`, pageHorizontalPadding, 144, {
    color: "#475569",
    font: `400 22px ${fontFamily}`,
    maximumWidth: 600,
  })
  drawText("ต้นทุนรวมต่อวัน", canvasWidth - pageHorizontalPadding, 82, {
    align: "right",
    color: "#475569",
    font: `500 20px ${fontFamily}`,
  })
  drawText(
    formatCurrency(grandTotal),
    canvasWidth - pageHorizontalPadding,
    128,
    {
      align: "right",
      font: `700 30px ${fontFamily}`,
    }
  )

  let y = pageHeaderHeight
  const tableLeft = pageHorizontalPadding
  const tableRight = canvasWidth - pageHorizontalPadding
  const quantityX = 600
  const unitX = 760
  const priceX = tableRight

  for (const group of groups) {
    const groupTitle = group.continued
      ? `${group.title} (ต่อ)`
      : group.title
    const groupTotalLabel =
      type === "purchase" ? "ต้นทุนรวมต่อบิล" : "ต้นทุนรวมต่อรอบ"

    drawText(`ชื่อรายการ: ${groupTitle}`, tableLeft, y + 30, {
      font: `700 24px ${fontFamily}`,
      maximumWidth: tableRight - tableLeft,
    })
    drawText(`${groupTotalLabel}: ${formatCurrency(group.total)}`, tableLeft, y + 66, {
      font: `600 22px ${fontFamily}`,
    })

    if (group.subtitle) {
      drawText(group.subtitle, tableLeft, y + 98, {
        color: "#64748b",
        font: `400 18px ${fontFamily}`,
        maximumWidth: tableRight - tableLeft,
      })
    }

    y += groupHeaderHeight
    context.fillStyle = "#f1f5f9"
    context.fillRect(
      tableLeft,
      y,
      tableRight - tableLeft,
      tableHeaderHeight
    )
    drawText("วัตถุดิบ", tableLeft + 16, y + 34, {
      color: "#334155",
      font: `700 19px ${fontFamily}`,
    })
    drawText("ปริมาณ", quantityX, y + 34, {
      align: "right",
      color: "#334155",
      font: `700 19px ${fontFamily}`,
    })
    drawText("หน่วย", unitX, y + 34, {
      align: "center",
      color: "#334155",
      font: `700 19px ${fontFamily}`,
    })
    drawText("ราคา", priceX - 16, y + 34, {
      align: "right",
      color: "#334155",
      font: `700 19px ${fontFamily}`,
    })
    y += tableHeaderHeight

    for (const row of group.rows) {
      context.strokeStyle = "#e2e8f0"
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(tableLeft, y + tableRowHeight)
      context.lineTo(tableRight, y + tableRowHeight)
      context.stroke()

      drawText(row.name || "วัตถุดิบ", tableLeft + 16, y + 37, {
        font: `500 21px ${fontFamily}`,
        maximumWidth: quantityX - tableLeft - 70,
      })
      drawText(formatNumber(row.quantity), quantityX, y + 37, {
        align: "right",
        font: `500 21px ${fontFamily}`,
      })
      drawText(row.unit || "-", unitX, y + 37, {
        align: "center",
        color: "#475569",
        font: `400 20px ${fontFamily}`,
        maximumWidth: 130,
      })
      drawText(formatCurrency(row.price), priceX - 16, y + 37, {
        align: "right",
        font: `600 21px ${fontFamily}`,
      })
      y += tableRowHeight
    }

    y += groupGap
  }

  drawText("สร้างจากระบบ timetoeat", pageHorizontalPadding, height - 24, {
    color: "#64748b",
    font: `400 16px ${fontFamily}`,
  })
  drawText(
    pageCount > 1 ? `หน้า ${pageNumber}/${pageCount}` : "สรุปรายวัน",
    canvasWidth - pageHorizontalPadding,
    height - 24,
    {
      align: "right",
      color: "#64748b",
      font: `400 16px ${fontFamily}`,
    }
  )

  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error("ไม่สามารถแปลงรูปสรุปเป็นไฟล์ PNG ได้"))
      }
    }, "image/png")
  })
}

function downloadBlob(filename: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1_000)
}

export async function saveDailySummaryImages(
  input: DailySummaryImageInput
): Promise<"shared" | "downloaded" | "cancelled"> {
  if (input.groups.length === 0) {
    throw new Error("ยังไม่มีข้อมูลที่บันทึกแล้วสำหรับสร้างรูป")
  }

  await document.fonts?.ready

  const pages = paginateGroups(input.groups)
  const grandTotal = input.groups.reduce(
    (total, group) => total + group.total,
    0
  )
  const blobs = await Promise.all(
    pages.map((groups, index) =>
      canvasToBlob(
        createPageCanvas({
          type: input.type,
          branchName: input.branchName,
          date: input.date,
          groups,
          pageNumber: index + 1,
          pageCount: pages.length,
          grandTotal,
        })
      )
    )
  )
  const prefix =
    input.type === "purchase" ? "purchase-daily" : "usage-daily"
  const baseFilename = `timetoeat-${prefix}-${safeFilenamePart(input.branchName)}-${dateKey(input.date)}`
  const filenames = blobs.map((_, index) =>
    pages.length > 1
      ? `${baseFilename}-part-${index + 1}.png`
      : `${baseFilename}.png`
  )
  const files = blobs.map(
    (blob, index) => new File([blob], filenames[index], { type: "image/png" })
  )
  const canShareFiles =
    window.matchMedia("(max-width: 767px)").matches &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })

  if (canShareFiles) {
    try {
      await navigator.share({
        title:
          input.type === "purchase"
            ? "สรุปของมาเพิ่มประจำวัน"
            : "สรุปของใช้ไปประจำวัน",
        files,
      })
      return "shared"
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled"
      }
    }
  }

  blobs.forEach((blob, index) => downloadBlob(filenames[index], blob))
  return "downloaded"
}
