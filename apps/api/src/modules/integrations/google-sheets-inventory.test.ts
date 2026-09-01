import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  hasValidGoogleSheetsSyncToken,
  normalizeGoogleSheetsSyncToken,
} from "../../config/google-sheets-sync"
import { HttpError } from "../../utils/http-error"
import {
  googleSheetsInventoryWhere,
  loadAllGoogleSheetsInventory,
  loadGoogleSheetsInventory,
} from "./google-sheets-inventory"

const configuredToken = "a".repeat(32)
const wrongToken = "b".repeat(32)

describe("Google Sheets sync token", () => {
  it("accepts the configured shared token and rejects wrong or missing values", () => {
    assert.equal(
      hasValidGoogleSheetsSyncToken(configuredToken, configuredToken),
      true
    )
    assert.equal(
      hasValidGoogleSheetsSyncToken(configuredToken, wrongToken),
      false
    )
    assert.equal(
      hasValidGoogleSheetsSyncToken(configuredToken, undefined),
      false
    )
  })

  it("allows an unconfigured value and requires at least 32 characters otherwise", () => {
    assert.equal(normalizeGoogleSheetsSyncToken(""), "")
    assert.equal(
      normalizeGoogleSheetsSyncToken(`  ${configuredToken}  `),
      configuredToken
    )
    assert.throws(
      () => normalizeGoogleSheetsSyncToken("a".repeat(31)),
      /at least 32 characters/
    )
    assert.equal(
      normalizeGoogleSheetsSyncToken("a".repeat(64)),
      "a".repeat(64)
    )
  })
})

describe("Google Sheets inventory feed", () => {
  it("returns every active branch with active inventory in branch-code order", async () => {
    let branchQuery: unknown
    const store = {
      branch: {
        findMany: async (query: unknown) => {
          branchQuery = query
          return [
            {
              id: "branch-a",
              code: "A",
              name: "สาขา A",
              inventoryItems: [
                {
                  onHand: "0.000",
                  ingredient: {
                    name: "ไข่ไก่",
                    unit: "ฟอง",
                    defaultPrice: "4.25",
                  },
                },
              ],
            },
            {
              id: "branch-b",
              code: "B",
              name: "สาขา B",
              inventoryItems: [],
            },
          ]
        },
      },
      branchInventory: {},
    } as unknown as Parameters<typeof loadAllGoogleSheetsInventory>[0]
    const exportedAt = new Date("2026-09-02T03:00:00.000Z")

    const result = await loadAllGoogleSheetsInventory(store, exportedAt)

    assert.deepEqual(branchQuery, {
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        inventoryItems: {
          where: { ingredient: { isActive: true } },
          select: {
            onHand: true,
            ingredient: {
              select: { name: true, unit: true, defaultPrice: true },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    })
    assert.deepEqual(result, {
      exportedAt: "2026-09-02T03:00:00.000Z",
      branches: [
        {
          id: "branch-a",
          code: "A",
          name: "สาขา A",
          inventory: [
            {
              ingredientName: "ไข่ไก่",
              unit: "ฟอง",
              onHand: 0,
              latestPrice: 4.25,
            },
          ],
        },
        {
          id: "branch-b",
          code: "B",
          name: "สาขา B",
          inventory: [],
        },
      ],
    })
  })

  it("requests active ingredients, preserves zero stock, sorts rows, and emits numbers", async () => {
    let inventoryQuery: unknown
    const store = {
      branch: {
        findFirst: async () => ({
          id: "branch-a",
          code: "BKK",
          name: "สาขากรุงเทพ",
        }),
        findMany: async () => [],
      },
      branchInventory: {
        findMany: async (query: unknown) => {
          inventoryQuery = query

          return [
            {
              onHand: "0.000",
              ingredient: {
                name: "ไข่ไก่",
                unit: "ฟอง",
                defaultPrice: "4.25",
              },
            },
            {
              onHand: "12.500",
              ingredient: {
                name: "ข้าวสาร",
                unit: "กก.",
                defaultPrice: "65.00",
              },
            },
          ]
        },
      },
    } as unknown as Parameters<typeof loadGoogleSheetsInventory>[0]
    const exportedAt = new Date("2026-09-02T03:00:00.000Z")

    const result = await loadGoogleSheetsInventory(
      store,
      "branch-a",
      exportedAt
    )

    assert.deepEqual(
      (inventoryQuery as { where: unknown }).where,
      googleSheetsInventoryWhere("branch-a")
    )
    assert.deepEqual(result, {
      branch: {
        id: "branch-a",
        code: "BKK",
        name: "สาขากรุงเทพ",
      },
      exportedAt: "2026-09-02T03:00:00.000Z",
      inventory: [
        {
          ingredientName: "ข้าวสาร",
          unit: "กก.",
          onHand: 12.5,
          latestPrice: 65,
        },
        {
          ingredientName: "ไข่ไก่",
          unit: "ฟอง",
          onHand: 0,
          latestPrice: 4.25,
        },
      ],
    })
  })

  it("accepts a unique branch code and queries inventory with its resolved ID", async () => {
    let inventoryQuery: unknown
    const store = {
      branch: {
        findFirst: async () => null,
        findMany: async () => [
          {
            id: "branch-wat-sakaeo",
            code: "WSK",
            name: "โรงเรียนวัดสระแก้ว",
          },
        ],
      },
      branchInventory: {
        findMany: async (query: unknown) => {
          inventoryQuery = query
          return []
        },
      },
    } as unknown as Parameters<typeof loadGoogleSheetsInventory>[0]

    const result = await loadGoogleSheetsInventory(store, "WSK")

    assert.equal(result.branch.id, "branch-wat-sakaeo")
    assert.deepEqual(
      (inventoryQuery as { where: unknown }).where,
      googleSheetsInventoryWhere("branch-wat-sakaeo")
    )
  })

  it("returns not found when the branch is missing or inactive", async () => {
    const store = {
      branch: { findFirst: async () => null, findMany: async () => [] },
      branchInventory: {
        findMany: async () => {
          throw new Error("Inventory must not be queried")
        },
      },
    } as unknown as Parameters<typeof loadGoogleSheetsInventory>[0]

    await assert.rejects(
      () => loadGoogleSheetsInventory(store, "inactive-branch"),
      (error: unknown) =>
        error instanceof HttpError && error.statusCode === 404
    )
  })
})
