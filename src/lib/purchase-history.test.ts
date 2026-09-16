import assert from "node:assert/strict"
import { test } from "node:test"
import { apiGetBranchPurchases } from "./easyreceipt-api"

test("purchase history preserves saved prices and totals across refreshed catalog prices", async (t) => {
  let currentPrice = 30
  let includeLaterPurchase = false
  const bill = (id: string, price: number) => ({
    id,
    purchaseDate: "2026-09-16T03:00:00.000Z",
    vendor: id,
    status: "posted",
    totalAmount: String(price * 2 + 10),
    items: [
      {
        id: `${id}-1`, ingredientId: "ingredient-1", quantity: "2",
        unit: "กก.", unitPrice: String(price), lineTotal: String(price * 2),
        ingredient: {
          id: "ingredient-1", name: "วัตถุดิบ", category: "อาหาร", unit: "กก.",
          defaultPrice: String(currentPrice), supplier: "ร้านค้า",
        },
      },
      {
        id: `${id}-2`, ingredientId: "ingredient-2", quantity: "1",
        unit: "ขวด", unitPrice: "10", lineTotal: "10",
      },
    ],
  })
  t.mock.method(globalThis, "fetch", async () => Response.json({
    purchases: [bill("old", 30), ...(includeLaterPurchase ? [bill("new", 40)] : [])],
  }))

  for (const price of [30, 35, 0, 40]) {
    currentPrice = price
    includeLaterPurchase = price === 40
    const purchases = await apiGetBranchPurchases("branch")
    assert.equal(purchases[0].items[0].ingredient?.defaultPrice, price)
    assert.equal(purchases[0].items[0].unitPrice, 30)
    assert.equal(purchases[0].items[0].lineTotal, 60)
    assert.equal(purchases[0].total, 70)
    assert.equal(purchases[0].items[1].lineTotal, 10)
    if (includeLaterPurchase) {
      assert.equal(purchases[1].items[0].unitPrice, 40)
      assert.equal(purchases[1].total, 90)
    }
  }
})
