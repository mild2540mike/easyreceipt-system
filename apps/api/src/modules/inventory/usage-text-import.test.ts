import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { env } from "../../config/env"
import type { PurchaseTextImportIngredient } from "../purchases/purchase-text-import"
import {
  importUsageText,
  parseUsageTextLines,
  reconcileUsageTextImport,
  usageTextImportRequestSchema,
} from "./usage-text-import"

const ingredients: PurchaseTextImportIngredient[] = [
  { id: "pork", name: "หมู", unit: "กก.", defaultPrice: 0 },
  { id: "lime-powder", name: "ผงมะนาวคนอร์", unit: "กก.", defaultPrice: 0 },
  { id: "lime-juice", name: "น้ำมะนาว", unit: "ขวด", defaultPrice: 0 },
]

describe("usage text line parser", () => {
  it("parses a Thai bullet row without a price", () => {
    assert.deepEqual(parseUsageTextLines("- หมู 2 กก."), [
      {
        rawName: "หมู",
        quantity: 2,
        unit: "กก.",
        warnings: [],
      },
    ])
  })

  it("supports numbered comma and tab separated rows", () => {
    assert.deepEqual(
      parseUsageTextLines("1. หมู,2,กก.\n2) น้ำมะนาว\t3\tขวด"),
      [
        { rawName: "หมู", quantity: 2, unit: "กก.", warnings: [] },
        { rawName: "น้ำมะนาว", quantity: 3, unit: "ขวด", warnings: [] },
      ]
    )
  })

  it("keeps an incomplete row for review", () => {
    const [item] = parseUsageTextLines("ผงมะนาวคนอร์")
    assert.equal(item.rawName, "ผงมะนาวคนอร์")
    assert.equal(item.quantity, null)
    assert.equal(item.unit, null)
    assert.ok(item.warnings.length > 0)
  })
})

describe("usage text inventory reconciliation", () => {
  it("auto-selects exact and unique contains matches", () => {
    const result = reconcileUsageTextImport(
      {
        items: [
          { rawName: "หมู", quantity: 2, unit: "กิโลกรัม", warnings: [] },
          {
            rawName: "ผงมะนาวคนอร์ ถุงใหญ่",
            quantity: 1,
            unit: "กก.",
            warnings: [],
          },
        ],
        warnings: [],
      },
      ingredients,
      "inventory"
    )

    assert.equal(result.items[0].ingredientId, "pork")
    assert.equal(result.items[0].unit, "กก.")
    assert.equal(result.items[1].ingredientId, "lime-powder")
  })

  it("offers a typo as a suggestion and rejects a conflicting unit", () => {
    const result = reconcileUsageTextImport(
      {
        items: [
          {
            rawName: "ผงมะนาวคนอร",
            quantity: 1,
            unit: "กก.",
            warnings: [],
          },
          { rawName: "น้ำมะนาว", quantity: 1, unit: "กก.", warnings: [] },
        ],
        warnings: [],
      },
      ingredients,
      "inventory"
    )

    assert.equal(result.items[0].ingredientId, null)
    assert.equal(result.items[0].suggestions[0]?.ingredientId, "lime-powder")
    assert.equal(result.items[0].suggestions[0]?.matchKind, "approximate")
    assert.equal(result.items[1].ingredientId, null)
    assert.deepEqual(result.items[1].suggestions, [])
  })

  it("never calls AI in inventory mode", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      throw new Error("inventory mode must not call fetch")
    }

    try {
      const result = await importUsageText({
        text: "หมู 2 กก.",
        mode: "inventory",
        memberId: "member-1",
        ingredients,
      })
      assert.equal(result.items[0].ingredientId, "pork")
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it("keeps complete and incomplete rows together as a partial result", async () => {
    const result = await importUsageText({
      text: "หมู 2 กก.\nวัตถุดิบที่ยังไม่ครบ",
      mode: "inventory",
      memberId: "member-1",
      ingredients,
    })

    assert.equal(result.items.length, 2)
    assert.equal(result.items[0].ingredientId, "pork")
    assert.equal(result.items[1].ingredientId, null)
    assert.equal(result.items[1].quantity, 0)
    assert.ok(result.items[1].warnings.length > 0)
  })
})

describe("usage text validation and AI failures", () => {
  it("rejects empty and oversized text", () => {
    assert.equal(
      usageTextImportRequestSchema.safeParse({ text: "   ", mode: "inventory" })
        .success,
      false
    )
    assert.equal(
      usageTextImportRequestSchema.safeParse({
        text: "ก".repeat(20_001),
        mode: "inventory",
      }).success,
      false
    )
  })

  it("rejects more than 200 non-empty lines", () => {
    const parsed = usageTextImportRequestSchema.safeParse({
      text: Array.from({ length: 201 }, () => "หมู 1 กก.").join("\n"),
      mode: "inventory",
    })
    assert.equal(parsed.success, false)
  })

  it("reports when the AI key is not configured", async () => {
    const originalKey = env.OPENAI_API_KEY
    env.OPENAI_API_KEY = undefined

    try {
      await assert.rejects(
        importUsageText({
          text: "หมูสองกิโล",
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
        importUsageText({
          text: "หมูสองกิโล",
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
        importUsageText({
          text: "หมูสองกิโล",
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
