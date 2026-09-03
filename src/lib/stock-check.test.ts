import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  countDifference,
  countNeedsReview,
  parseCount,
  readStockCheck,
  stockCheckStorageKey,
  type StockCheckDraft,
  type StockCheckEntry,
  type StockCheckItem,
} from "./stock-check"

const item: StockCheckItem = {
  ingredientId: "rice",
  name: "ข้าวสาร",
  category: "ของแห้ง",
  unit: "กก.",
  onHand: 12.5,
  inventoryVersion: "2026-09-03T08:00:00.000Z",
}
const entry: StockCheckEntry = {
  name: "ข้าวสาร",
  unit: "กก.",
  systemQuantity: 12.5,
  actual: "10.25",
  confirmed: true,
  countedAt: "2026-09-03T08:00:00Z",
  inventoryVersion: "2026-09-03T08:00:00.000Z",
}
const draft: StockCheckDraft = {
  version: 1,
  startedAt: "2026-09-03T08:00:00Z",
  entries: { rice: entry },
}

describe("stock checks", () => {
  it("distinguishes a real zero from blank, invalid, negative, or overly precise counts", () => {
    assert.equal(parseCount("0"), 0)
    assert.equal(parseCount(" ๑๒.๕๐๐ "), 12.5)
    assert.equal(parseCount("0.125"), 0.125)
    for (const value of [
      "",
      " ",
      "-1",
      "abc",
      "1e3",
      "Infinity",
      "1,000",
      "1.0001",
      "1000000000",
    ]) {
      assert.equal(parseCount(value), null, value)
    }
  })

  it("compares fractional counts without false floating-point discrepancies", () => {
    assert.equal(countDifference(0.3, 0.1 + 0.2), 0)
    assert.equal(countDifference(10.25, 12.5), -2.25)
    assert.equal(countDifference(13, 12.5), 0.5)
  })

  it("requires a recount when quantities, units, or catalog membership change", () => {
    assert.equal(countNeedsReview(entry, item), false)
    assert.equal(countNeedsReview(entry, { ...item, onHand: 13 }), true)
    assert.equal(countNeedsReview(entry, { ...item, unit: "ถุง" }), true)
    assert.equal(countNeedsReview(entry, undefined), true)
  })

  it("restores confirmed counts and unfinished input without accepting damaged data", () => {
    const saved = {
      ...draft,
      entries: {
        ...draft.entries,
        eggs: { ...entry, actual: "", confirmed: false },
      },
    }
    assert.deepEqual(readStockCheck(JSON.stringify(saved)), saved)
    assert.deepEqual(readStockCheck(null).entries, {})
    for (const broken of [
      "not json",
      "null",
      "{}",
      JSON.stringify({ ...draft, entries: { rice: { ...entry, actual: "" } } }),
    ]) {
      assert.throws(() => readStockCheck(broken))
    }
  })

  it("separates drafts by both account and branch", () => {
    assert.notEqual(
      stockCheckStorageKey("cook", "a"),
      stockCheckStorageKey("cook", "b")
    )
    assert.notEqual(
      stockCheckStorageKey("cook", "a"),
      stockCheckStorageKey("owner", "a")
    )
    assert.notEqual(
      stockCheckStorageKey("a:b", "c"),
      stockCheckStorageKey("a", "b:c")
    )
  })

  it("requires old drafts and equal-quantity changes to be reconfirmed", () => {
    assert.equal(
      countNeedsReview({ ...entry, inventoryVersion: undefined }, item),
      true
    )
    assert.equal(
      countNeedsReview(entry, {
        ...item,
        inventoryVersion: "2026-09-03T09:00:00.000Z",
      }),
      true
    )
  })

  it("restores the exact pending request after a reload so an uncertain save can be retried", () => {
    const pendingSave = {
      requestId: "76fa60cf-b261-4d1b-bd2a-58d3e6af22d8",
      startedAt: draft.startedAt,
      items: [
        {
          ingredientId: item.ingredientId,
          unit: item.unit,
          systemQuantity: 12.5,
          actualQuantity: 0,
          inventoryVersion: item.inventoryVersion!,
          countedAt: entry.countedAt,
        },
      ],
    }
    const restored = readStockCheck(JSON.stringify({ ...draft, pendingSave }))
    assert.deepEqual(restored.pendingSave, pendingSave)
    assert.throws(() =>
      readStockCheck(
        JSON.stringify({ ...draft, pendingSave: { ...pendingSave, items: [] } })
      )
    )
    assert.throws(() =>
      readStockCheck(
        JSON.stringify({
          ...draft,
          pendingSave: {
            ...pendingSave,
            items: [{ ...pendingSave.items[0], actualQuantity: -1 }],
          },
        })
      )
    )
  })
})
