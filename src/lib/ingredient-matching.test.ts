import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  ingredientNameSimilarityScore,
  normalizeIngredientMatchCore,
  rankIngredientSearchCandidates,
} from "./ingredient-matching"

const candidates = [
  {
    item: { id: "lime-powder" },
    name: "ผงมะนาวคนอร์",
    fields: ["เครื่องปรุง", "คนอร์"],
  },
  {
    item: { id: "lime-juice" },
    name: "น้ำมะนาว",
    fields: ["เครื่องปรุง", "ทั่วไป"],
  },
]

describe("ingredient matching for purchase suggestions", () => {
  it("removes a trailing packaging qualifier from the searchable core", () => {
    assert.equal(
      normalizeIngredientMatchCore("ผงมะนาวคนอร์ (ถุงใหญ่)"),
      normalizeIngredientMatchCore("ผงมะนาวคนอร์")
    )
  })

  it("ranks the inventory ingredient first and labels it as approximate", () => {
    const result = rankIngredientSearchCandidates(
      "ผงมะนาวคนอร์ (ถุงใหญ่)",
      candidates
    )

    assert.equal(result[0]?.item.id, "lime-powder")
    assert.equal(result[0]?.isApproximate, true)
  })

  it("keeps literal substring matches ahead of fuzzy matches", () => {
    const result = rankIngredientSearchCandidates("ผงมะนาวคนอร์", [
      ...candidates,
      {
        item: { id: "similar-lime-powder" },
        name: "ผงมะนาวคนอร",
        fields: ["เครื่องปรุง", "ทั่วไป"],
      },
    ])

    assert.equal(result[0]?.item.id, "lime-powder")
    assert.equal(result[0]?.isApproximate, false)
    assert.equal(result[1]?.item.id, "similar-lime-powder")
    assert.equal(result[1]?.isApproximate, true)
  })

  it("accepts a minor typo but rejects an unrelated name", () => {
    assert.ok(ingredientNameSimilarityScore("ผงมะนาวคนอร", "ผงมะนาวคนอร์") >= 90)
    assert.equal(ingredientNameSimilarityScore("น้ำมันพืช", "ผงมะนาวคนอร์"), 0)
  })
})
