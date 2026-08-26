import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  matchPurchaseScanIngredient,
  purchaseReceiptExtractionSchema,
  reconcilePurchaseScan,
  type PurchaseScanIngredient,
} from "./purchase-scan"

const matchedIngredient: PurchaseScanIngredient = {
  id: "ingredient-1",
  name: "ข้าวสาร",
  unit: "กก.",
  defaultPrice: 12.345,
}

function extractedItem(
  overrides: Partial<{
    rawName: string
    quantity: number | null
    unit: string | null
    unitPrice: number | null
    lineTotal: number | null
  }> = {}
) {
  return {
    rawName: "ข้าวสาร",
    quantity: 2,
    unit: "กก.",
    unitPrice: null,
    lineTotal: null,
    warnings: [],
    ...overrides,
  }
}

function reconcile(
  items: ReturnType<typeof extractedItem>[],
  ingredients: PurchaseScanIngredient[] = [matchedIngredient]
) {
  const extracted = purchaseReceiptExtractionSchema.parse({
    billName: "บิลทดสอบ",
    receiptDate: "2026-08-26",
    sourceType: "printed",
    items,
    warnings: [],
  })

  return reconcilePurchaseScan(extracted, ingredients)
}

describe("reconcilePurchaseScan unit-price fallback", () => {
  it("keeps a unit price read directly from the receipt", () => {
    const result = reconcile([
      extractedItem({ unitPrice: 15, lineTotal: null }),
    ])

    assert.equal(result.items[0].unitPrice, 15)
    assert.equal(result.items[0].lineTotal, 30)
    assert.deepEqual(result.warnings, [])
  })

  it("derives the unit price from receipt quantity and line total first", () => {
    const result = reconcile([
      extractedItem({ quantity: 4, unitPrice: null, lineTotal: 36 }),
    ])

    assert.equal(result.items[0].unitPrice, 9)
    assert.equal(result.items[0].lineTotal, 36)
    assert.deepEqual(result.warnings, [])
  })

  it("uses and rounds the latest inventory price when receipt pricing is unavailable", () => {
    const result = reconcile([
      extractedItem({ quantity: 3, unitPrice: null, lineTotal: null }),
    ])

    assert.equal(result.items[0].unitPrice, 12.35)
    assert.equal(result.items[0].lineTotal, 37.05)
    assert.ok(
      result.items[0].warnings.includes(
        "ใช้ราคาล่าสุด/หน่วยจากคลังวัตถุดิบ"
      )
    )
    assert.deepEqual(result.warnings, [
      "ใช้ราคาล่าสุดจากคลังแทน 1 รายการ",
    ])
  })

  it("summarizes every item that uses the inventory fallback", () => {
    const result = reconcile([
      extractedItem(),
      extractedItem({ rawName: "ข้าวสาร", quantity: 5 }),
    ])

    assert.deepEqual(result.warnings, [
      "ใช้ราคาล่าสุดจากคลังแทน 2 รายการ",
    ])
  })

  it("keeps the price empty when no matched inventory price is available", () => {
    const zeroPriceIngredient = { ...matchedIngredient, defaultPrice: 0 }
    const result = reconcile([extractedItem()], [zeroPriceIngredient])

    assert.equal(result.items[0].unitPrice, 0)
    assert.equal(result.items[0].lineTotal, 0)
    assert.ok(
      result.items[0].warnings.includes(
        "อ่านราคาต่อหน่วยไม่ได้ กรุณาตรวจสอบ"
      )
    )
    assert.deepEqual(result.warnings, [])
  })

  it("does not use an inventory price when the ingredient cannot be matched", () => {
    const result = reconcile(
      [extractedItem({ rawName: "วัตถุดิบที่ไม่รู้จัก" })],
      [matchedIngredient]
    )

    assert.equal(result.items[0].ingredientId, null)
    assert.equal(result.items[0].unitPrice, 0)
    assert.deepEqual(result.warnings, [])
  })
})

describe("matchPurchaseScanIngredient balanced matching", () => {
  const limePowder: PurchaseScanIngredient = {
    id: "lime-powder",
    name: "ผงมะนาวคนอร์",
    unit: "กิโลกรัม",
    defaultPrice: 145,
  }

  it("matches a trailing packaging qualifier and accepts an equivalent unit", () => {
    const result = matchPurchaseScanIngredient(
      "ผงมะนาวคนอร์ (ถุงใหญ่)",
      "กก.",
      [limePowder]
    )

    assert.equal(result?.id, limePowder.id)
  })

  it("matches a single-character spelling difference when the result is unique", () => {
    const result = matchPurchaseScanIngredient(
      "ผงมะนาวคนอร",
      "กิโลกรัม",
      [limePowder]
    )

    assert.equal(result?.id, limePowder.id)
  })

  it("does not fuzzy-match a short generic name", () => {
    const result = matchPurchaseScanIngredient(
      "ไข่ไก",
      "ฟอง",
      [{ id: "egg", name: "ไข่ไก่", unit: "ฟอง" }]
    )

    assert.equal(result, null)
  })

  it("does not match when the receipt unit conflicts with the inventory unit", () => {
    const result = matchPurchaseScanIngredient(
      "ผงมะนาวคนอร์ (ถุงใหญ่)",
      "ขวด",
      [limePowder]
    )

    assert.equal(result, null)
  })

  it("does not match when two candidates are within the confidence margin", () => {
    const result = matchPurchaseScanIngredient(
      "ผงมะนาวคนอร์ (ถุงใหญ่)",
      "กิโลกรัม",
      [
        limePowder,
        { id: "similar", name: "ผงมะนาวคนอร", unit: "กิโลกรัม" },
      ]
    )

    assert.equal(result, null)
  })

  it("uses the matched inventory price and reports an approximate autofill", () => {
    const result = reconcile(
      [extractedItem({ rawName: "ผงมะนาวคนอร์ (ถุงใหญ่)", unit: "กก." })],
      [limePowder]
    )

    assert.equal(result.items[0].ingredientId, limePowder.id)
    assert.equal(result.items[0].unit, "กิโลกรัม")
    assert.equal(result.items[0].unitPrice, 145)
    assert.equal(result.items[0].lineTotal, 290)
    assert.deepEqual(result.warnings, [
      "ใช้ราคาล่าสุดจากคลังแทน 1 รายการ",
      "จับคู่ชื่อใกล้เคียงให้อัตโนมัติ 1 รายการ",
    ])
  })

  it("keeps a receipt price ahead of the inventory price after an approximate match", () => {
    const result = reconcile(
      [
        extractedItem({
          rawName: "ผงมะนาวคนอร์ (ถุงใหญ่)",
          unit: "กก.",
          unitPrice: 160,
        }),
      ],
      [limePowder]
    )

    assert.equal(result.items[0].unitPrice, 160)
    assert.equal(result.items[0].lineTotal, 320)
    assert.deepEqual(result.warnings, [
      "จับคู่ชื่อใกล้เคียงให้อัตโนมัติ 1 รายการ",
    ])
  })
})
