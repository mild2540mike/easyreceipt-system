import ExcelJS from "exceljs"

const inventorySheetName = "คลังวัตถุดิบ"
const bangkokTimeZone = "Asia/Bangkok"

export type InventoryXlsxRow = {
  ingredientName: string
  unit: string
  onHand: number
  latestPrice: number
}

export type InventoryXlsxInput = {
  branchCode: string
  branchName: string
  items: InventoryXlsxRow[]
  exportedAt?: Date
}

function bangkokDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: bangkokTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"

  return `${year}-${month}-${day}`
}

function safeFilenameSegment(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9ก-๙_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "branch"
  )
}

function quantityNumberFormat(unit: string) {
  const safeUnit = unit.trim().replace(/"/g, '""')

  return safeUnit ? `#,##0.### "${safeUnit}"` : "#,##0.###"
}

function formatExportedAt(date: Date) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: bangkokTimeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function inventoryXlsxFilename(branchCode: string, exportedAt: Date) {
  return `timetoeat-inventory-${safeFilenameSegment(branchCode)}-${bangkokDateKey(exportedAt)}.xlsx`
}

export function buildInventoryWorkbook({
  branchName,
  items,
  exportedAt = new Date(),
}: InventoryXlsxInput) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(inventorySheetName, {
    views: [{ state: "frozen", ySplit: 5 }],
  })
  const border: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  }

  workbook.creator = "timetoeat"
  workbook.created = exportedAt
  workbook.modified = exportedAt
  worksheet.columns = [
    { key: "ingredient", width: 36 },
    { key: "onHand", width: 20 },
    { key: "latestPrice", width: 18 },
  ]
  worksheet.properties.defaultRowHeight = 22

  worksheet.mergeCells("A1:C1")
  worksheet.getCell("A1").value = "คลังวัตถุดิบ"
  worksheet.getCell("A1").font = {
    bold: true,
    size: 20,
    color: { argb: "FF0F172A" },
  }
  worksheet.getCell("A1").alignment = { vertical: "middle" }
  worksheet.getRow(1).height = 34

  worksheet.getCell("A2").value = "สาขา"
  worksheet.mergeCells("B2:C2")
  worksheet.getCell("B2").value = branchName || "-"
  worksheet.getCell("A3").value = "ส่งออกเมื่อ"
  worksheet.mergeCells("B3:C3")
  worksheet.getCell("B3").value = formatExportedAt(exportedAt)

  for (const address of ["A2", "A3"]) {
    worksheet.getCell(address).font = {
      bold: true,
      color: { argb: "FF475569" },
    }
  }

  worksheet.getRow(5).values = ["วัตถุดิบ", "คงเหลือ", "ราคาล่าสุด"]
  worksheet.getRow(5).height = 28
  worksheet.getRow(5).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF0F172A" } }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    }
    cell.border = border
    cell.alignment = { vertical: "middle", horizontal: "center" }
  })

  items.forEach((item) => {
    const row = worksheet.addRow([
      item.ingredientName,
      item.onHand,
      item.latestPrice,
    ])

    row.eachCell((cell) => {
      cell.border = border
      cell.alignment = { vertical: "middle" }
    })
    row.getCell(2).alignment = { horizontal: "right", vertical: "middle" }
    row.getCell(2).numFmt = quantityNumberFormat(item.unit)
    row.getCell(3).alignment = { horizontal: "right", vertical: "middle" }
    row.getCell(3).numFmt = '"฿"#,##0.00'
  })

  worksheet.autoFilter = {
    from: "A5",
    to: `C${Math.max(5, items.length + 5)}`,
  }

  return workbook
}

export async function createInventoryXlsx(input: InventoryXlsxInput) {
  const exportedAt = input.exportedAt ?? new Date()
  const workbook = buildInventoryWorkbook({ ...input, exportedAt })
  const buffer = await workbook.xlsx.writeBuffer()
  const bytes = new Uint8Array(buffer)
  const copy = new ArrayBuffer(bytes.byteLength)

  new Uint8Array(copy).set(bytes)

  return {
    buffer: copy,
    filename: inventoryXlsxFilename(input.branchCode, exportedAt),
  }
}
