import assert from "node:assert/strict"
import { describe, it } from "node:test"

import ExcelJS from "exceljs"

import {
  buildInventoryWorkbook,
  createInventoryXlsx,
  inventoryXlsxFilename,
} from "./inventory-xlsx"

const exportedAt = new Date("2026-08-31T18:30:00.000Z")
const items = [
  {
    ingredientName: "ข้าวสาร",
    unit: "กก.",
    onHand: 12.5,
    latestPrice: 65,
  },
  {
    ingredientName: "ไข่ไก่",
    unit: "ฟอง",
    onHand: 30,
    latestPrice: 4.25,
  },
]

describe("inventory XLSX export", () => {
  it("builds the requested inventory sheet with numeric quantities and prices", () => {
    const workbook = buildInventoryWorkbook({
      branchCode: "WSK",
      branchName: "โรงเรียนวัดสระแก้ว",
      items,
      exportedAt,
    })
    const worksheet = workbook.getWorksheet("คลังวัตถุดิบ")

    assert.ok(worksheet)
    assert.equal(worksheet.getCell("A1").value, "คลังวัตถุดิบ")
    assert.equal(worksheet.getCell("A2").value, "สาขา")
    assert.equal(worksheet.getCell("B2").value, "โรงเรียนวัดสระแก้ว")
    assert.equal(worksheet.getCell("A3").value, "ส่งออกเมื่อ")
    assert.equal(typeof worksheet.getCell("B3").value, "string")
    assert.deepEqual(
      ["A5", "B5", "C5"].map((address) => worksheet.getCell(address).value),
      ["วัตถุดิบ", "คงเหลือ", "ราคาล่าสุด"]
    )
    assert.deepEqual(
      ["A6", "B6", "C6"].map((address) => worksheet.getCell(address).value),
      ["ข้าวสาร", 12.5, 65]
    )
    assert.deepEqual(
      ["A7", "B7", "C7"].map((address) => worksheet.getCell(address).value),
      ["ไข่ไก่", 30, 4.25]
    )
    assert.equal(worksheet.getCell("B6").numFmt, '#,##0.### "กก."')
    assert.equal(worksheet.getCell("B7").numFmt, '#,##0.### "ฟอง"')
    assert.equal(worksheet.getCell("C6").numFmt, '"฿"#,##0.00')
    assert.deepEqual(worksheet.autoFilter, { from: "A5", to: "C7" })
    assert.equal(worksheet.views[0]?.state, "frozen")
    assert.equal(worksheet.views[0]?.ySplit, 5)
  })

  it("serializes a readable workbook and uses the Bangkok date in the filename", async () => {
    const result = await createInventoryXlsx({
      branchCode: " BKK/01 ",
      branchName: "โรงเรียนทดสอบ",
      items,
      exportedAt,
    })
    const workbook = new ExcelJS.Workbook()

    await workbook.xlsx.load(result.buffer)

    assert.equal(
      result.filename,
      "timetoeat-inventory-BKK-01-2026-09-01.xlsx"
    )
    assert.equal(
      workbook.getWorksheet("คลังวัตถุดิบ")?.getCell("A7").value,
      "ไข่ไก่"
    )
  })

  it("falls back to a safe branch segment", () => {
    assert.equal(
      inventoryXlsxFilename("///", exportedAt),
      "timetoeat-inventory-branch-2026-09-01.xlsx"
    )
  })
})
