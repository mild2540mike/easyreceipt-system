import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { uniquePurchaseBillName } from "./purchase-scan"

describe("shared imported batch naming", () => {
  it("creates sequential names for repeated combined lists", () => {
    assert.equal(uniquePurchaseBillName("รายการรวม", []), "รายการรวม")
    assert.equal(
      uniquePurchaseBillName("รายการรวม", ["รายการรวม"]),
      "รายการรวม (2)"
    )
    assert.equal(
      uniquePurchaseBillName("รายการรวม", ["รายการรวม", "รายการรวม (2)"]),
      "รายการรวม (3)"
    )
  })
})
