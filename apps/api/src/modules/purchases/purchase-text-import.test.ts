import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { env } from "../../config/env"
import {
  importPurchaseText,
  matchPurchaseTextIngredient,
  parsePurchaseTextLines,
  purchaseTextImportRequestSchema,
  reconcilePurchaseTextImport,
  type PurchaseTextImportIngredient,
} from "./purchase-text-import"

const ingredients: PurchaseTextImportIngredient[] = [
  { id: "pork", name: "หมู", unit: "กก.", defaultPrice: 175 },
  { id: "lime-powder", name: "ผงมะนาวคนอร์", unit: "กก.", defaultPrice: 145 },
  { id: "lime-juice", name: "น้ำมะนาว", unit: "ขวด", defaultPrice: 35 },
]

describe("purchase text line parser", () => {
  it("parses bullets and treats the last number as unit price", () => {
    assert.deepEqual(parsePurchaseTextLines("- หมู 2 กก. 180"), [
      {
        rawName: "หมู",
        quantity: 2,
        unit: "กก.",
        unitPrice: 180,
        warnings: [],
      },
    ])
  })

  it("supports numbered comma and tab separated rows", () => {
    assert.deepEqual(
      parsePurchaseTextLines("1. หมู,2,กก.,180\n2) น้ำมะนาว\t3\tขวด\t40"),
      [
        { rawName: "หมู", quantity: 2, unit: "กก.", unitPrice: 180, warnings: [] },
        { rawName: "น้ำมะนาว", quantity: 3, unit: "ขวด", unitPrice: 40, warnings: [] },
      ]
    )
  })

  it("keeps an incomplete row for review", () => {
    const [item] = parsePurchaseTextLines("ผงมะนาวคนอร์")
    assert.equal(item.rawName, "ผงมะนาวคนอร์")
    assert.equal(item.quantity, null)
    assert.ok(item.warnings.length > 0)
  })
})

describe("purchase text inventory matching", () => {
  it("auto-selects an exact name with an equivalent unit", () => {
    const result = matchPurchaseTextIngredient("หมู", "กิโลกรัม", ingredients)
    assert.equal(result.ingredient?.id, "pork")
    assert.deepEqual(result.suggestions, [])
  })

  it("auto-selects one unambiguous contains match", () => {
    const result = matchPurchaseTextIngredient(
      "ผงมะนาวคนอร์ ถุงใหญ่",
      "กก.",
      ingredients
    )
    assert.equal(result.ingredient?.id, "lime-powder")
  })

  it("offers a typo as a suggestion without auto-selecting it", () => {
    const result = matchPurchaseTextIngredient(
      "ผงมะนาวคนอร",
      "กก.",
      ingredients
    )
    assert.equal(result.ingredient, null)
    assert.equal(result.suggestions[0]?.ingredientId, "lime-powder")
    assert.equal(result.suggestions[0]?.matchKind, "approximate")
  })

  it("does not suggest an ingredient with a conflicting unit", () => {
    const result = matchPurchaseTextIngredient("น้ำมะนาว", "กก.", ingredients)
    assert.equal(result.ingredient, null)
    assert.deepEqual(result.suggestions, [])
  })
})

describe("purchase text import reconciliation", () => {
  it("uses the inventory price only when a parsed price is missing", () => {
    const result = reconcilePurchaseTextImport(
      {
        items: [
          {
            rawName: "หมู",
            quantity: 2,
            unit: "กก.",
            unitPrice: null,
            warnings: [],
          },
        ],
        warnings: [],
      },
      ingredients,
      "inventory"
    )

    assert.equal(result.items[0].ingredientId, "pork")
    assert.equal(result.items[0].unitPrice, 175)
    assert.equal(result.items[0].lineTotal, 350)
  })

  it("never calls AI in inventory mode", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      throw new Error("inventory mode must not call fetch")
    }

    try {
      const result = await importPurchaseText({
        text: "หมู 2 กก. 180",
        mode: "inventory",
        memberId: "member-1",
        ingredients,
      })
      assert.equal(result.items[0].ingredientId, "pork")
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe("purchase text import validation and AI failures", () => {
  it("rejects more than 200 non-empty lines", () => {
    const parsed = purchaseTextImportRequestSchema.safeParse({
      text: Array.from({ length: 201 }, () => "หมู 1 กก. 180").join("\n"),
      mode: "inventory",
    })
    assert.equal(parsed.success, false)
  })

  it("reports when the AI key is not configured", async () => {
    const originalKey = env.OPENAI_API_KEY
    env.OPENAI_API_KEY = undefined

    try {
      await assert.rejects(
        importPurchaseText({
          text: "หมูสองกิโลราคา 180",
          mode: "ai",
          memberId: "member-1",
          ingredients,
        }),
        (error: unknown) =>
          error instanceof Error &&
          "statusCode" in error &&
          error.statusCode === 503
      )
    } finally {
      env.OPENAI_API_KEY = originalKey
    }
  })

  it("rejects an incomplete structured AI response", async () => {
    const originalKey = env.OPENAI_API_KEY
    const originalFetch = globalThis.fetch
    env.OPENAI_API_KEY = "test-key"
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          output: [{ content: [{ type: "output_text", text: "{}" }] }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )

    try {
      await assert.rejects(
        importPurchaseText({
          text: "หมูสองกิโลราคา 180",
          mode: "ai",
          memberId: "member-1",
          ingredients,
        }),
        (error: unknown) =>
          error instanceof Error &&
          "statusCode" in error &&
          error.statusCode === 502
      )
    } finally {
      env.OPENAI_API_KEY = originalKey
      globalThis.fetch = originalFetch
    }
  })

  it("turns an AI timeout into a 504 response", async () => {
    const originalKey = env.OPENAI_API_KEY
    const originalTimeout = env.OPENAI_RECEIPT_TIMEOUT_MS
    const originalFetch = globalThis.fetch
    env.OPENAI_API_KEY = "test-key"
    env.OPENAI_RECEIPT_TIMEOUT_MS = 30
    globalThis.fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"))
        })
      })

    try {
      await assert.rejects(
        importPurchaseText({
          text: "หมูสองกิโลราคา 180",
          mode: "ai",
          memberId: "member-1",
          ingredients,
        }),
        (error: unknown) =>
          error instanceof Error &&
          "statusCode" in error &&
          error.statusCode === 504
      )
    } finally {
      env.OPENAI_API_KEY = originalKey
      env.OPENAI_RECEIPT_TIMEOUT_MS = originalTimeout
      globalThis.fetch = originalFetch
    }
  })
})
