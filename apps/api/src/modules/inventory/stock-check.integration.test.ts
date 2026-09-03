import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"
import { randomUUID } from "node:crypto"
import type { Server } from "node:http"
import type { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"
import {
  saveStockCheck,
  stockCheckInputSchema,
  type StockCheckInput,
} from "./stock-check.service"

type Check = Awaited<ReturnType<typeof saveStockCheck>>
async function readJson(response: Response): Promise<{
  check: Check
  checks: Check[]
  error: { details: { ingredientIds: string[] } }
  inventory: {
    ingredientId: string
    onHand: number
    ingredient: { defaultPrice: number }
    lastCount: { quantity: number; checkId: string; countedBy: string }
  }[]
  movements: { movementType: string }[]
}> {
  return response.json() as ReturnType<typeof readJson>
}

// Explicit opt-in: this suite must never run against a workspace/production database.
const testUrl = process.env.STOCK_CHECK_TEST_DATABASE_URL
const enabled =
  !!testUrl &&
  /^sqlserver:\/\/(localhost|127\.0\.0\.1):\d+;/i.test(testUrl) &&
  /;database=timetoeat_stockcheck_test_[a-z0-9_]+(?:;|$)/i.test(testUrl)

describe("stock checks on isolated SQL Server", { skip: !enabled }, () => {
  let db: PrismaClient
  let server: Server
  let base: string
  const prefix = randomUUID().slice(0, 8)
  const organizationId = `check-org-${prefix}`
  const branchId = `check-branch-${prefix}`
  const otherBranchId = `check-other-${prefix}`
  const memberId = `check-cook-${prefix}`
  const secret = "stock-check-isolated-test-secret"
  const auth = {
    Authorization: `Bearer ${jwt.sign({ sub: memberId }, secret)}`,
    "Content-Type": "application/json",
  }

  before(async () => {
    process.env.DATABASE_URL = testUrl!
    process.env.JWT_SECRET = secret
    process.env.NODE_ENV = "test"
    db = (await import("../../db/prisma.js")).prisma
    await db.organization.create({
      data: { id: organizationId, code: prefix, name: "ครัวทดสอบ" },
    })
    for (const [id, code] of [
      [branchId, "A"],
      [otherBranchId, "B"],
    ]) {
      await db.branch.create({
        data: {
          id,
          code,
          organizationId,
          name: `ครัวทดสอบ ${code}`,
          location: "ทดสอบ",
        },
      })
    }
    await db.member.create({
      data: {
        id: memberId,
        organizationId,
        name: "แม่ครัวทดสอบ",
        username: memberId,
        role: "staff",
        status: "active",
        passwordHash: "prototype:test-only",
        primaryBranchId: branchId,
      },
    })
    await db.memberBranchAccess.create({ data: { memberId, branchId } })
    const { createApp } = await import("../../app.js")
    server = createApp().listen(0, "127.0.0.1")
    await new Promise<void>((resolve) => server.once("listening", resolve))
    const address = server.address()
    assert.ok(address && typeof address !== "string")
    base = `http://127.0.0.1:${address.port}/api/v1/branches`
  })
  after(async () => {
    if (server)
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
    if (db) await db.$disconnect()
  })

  async function inventory(onHand = 10) {
    const id = randomUUID()
    await db.ingredient.create({
      data: {
        id,
        organizationId,
        name: `ข้าวสาร ${id.slice(0, 4)}`,
        category: "ของแห้ง",
        unit: "กก.",
        defaultPrice: 79,
      },
    })
    return db.branchInventory.create({
      data: { branchId, ingredientId: id, onHand, costPerUnit: 42 },
    })
  }
  function input(
    rows: Awaited<ReturnType<typeof inventory>>[],
    actual: number[]
  ): StockCheckInput {
    return stockCheckInputSchema.parse({
      requestId: randomUUID(),
      startedAt: new Date().toISOString(),
      items: rows.map((row, index) => ({
        ingredientId: row.ingredientId,
        unit: "กก.",
        systemQuantity: Number(row.onHand),
        actualQuantity: actual[index],
        inventoryVersion: row.updatedAt.toISOString(),
        countedAt: new Date().toISOString(),
      })),
    })
  }
  async function post(payload: StockCheckInput, target = branchId) {
    return fetch(`${base}/${target}/stock-checks`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify(payload),
    })
  }

  it("stores equal, missing, excess, zero and fractional counts together; untouched rows stay unchanged", async () => {
    const rows = await Promise.all([10, 10, 0, 10, 10].map(inventory))
    const request = input(rows.slice(0, 4), [10, 0, 1.25, 8.125])
    const response = await post(request)
    assert.equal(response.status, 200, await response.clone().text())
    const { check } = await readJson(response)
    assert.equal(check.items.length, 4)
    for (let index = 0; index < rows.length; index++) {
      const row = await db.branchInventory.findUniqueOrThrow({
        where: { id: rows[index].id },
      })
      assert.equal(
        Number(row.onHand),
        index < 4 ? request.items[index].actualQuantity : 10
      )
      assert.equal(Number(row.costPerUnit), 42)
      assert.equal(!!row.lastStockCheckItemId, index < 4)
    }
    const movements = await db.stockMovement.findMany({
      where: { referenceId: check.id },
    })
    assert.equal(movements.length, 3)
    assert.ok(
      movements.every((movement) =>
        movement.movementType.startsWith("count_adjustment_")
      )
    )
    const list = await fetch(`${base}/${branchId}/stock-checks`, {
      headers: auth,
    }).then((r) => readJson(r))
    assert.ok(
      list.checks.some((saved: { id: string }) => saved.id === check.id)
    )
    const detail = await fetch(`${base}/${branchId}/stock-checks/${check.id}`, {
      headers: auth,
    }).then((r) => readJson(r))
    assert.deepEqual(detail.check, check)
  })

  it("retries an identical request after a lost response without changing stock again", async () => {
    const row = await inventory()
    const request = input([row], [8])
    const first = await saveStockCheck(db, memberId, branchId, request)
    await db.branchInventory.update({
      where: { id: row.id },
      data: { onHand: { decrement: 1 } },
    })
    const retry = await saveStockCheck(db, memberId, branchId, request)
    assert.equal(first.id, retry.id)
    assert.equal(
      Number(
        (await db.branchInventory.findUniqueOrThrow({ where: { id: row.id } }))
          .onHand
      ),
      7
    )
    assert.equal(
      await db.stockMovement.count({ where: { referenceId: first.id } }),
      1
    )
    const changed = {
      ...request,
      items: [{ ...request.items[0], actualQuantity: 9 }],
    }
    assert.equal((await post(changed)).status, 409)
  })

  it("rejects the whole batch if one count changed, including an equal-quantity version change", async () => {
    const rows = await Promise.all([inventory(), inventory()])
    const request = input(rows, [5, 6])
    await db.branchInventory.update({
      where: { id: rows[1].id },
      data: { updatedAt: new Date(rows[1].updatedAt.getTime() + 1000) },
    })
    const response = await post(request)
    assert.equal(response.status, 409)
    assert.deepEqual((await readJson(response)).error.details.ingredientIds, [
      rows[1].ingredientId,
    ])
    assert.equal(
      Number(
        (
          await db.branchInventory.findUniqueOrThrow({
            where: { id: rows[0].id },
          })
        ).onHand
      ),
      10
    )
    assert.equal(
      await db.stockCheck.count({ where: { requestId: request.requestId } }),
      0
    )
  })

  it("checks unit changes, inactive ingredients, and branch membership", async () => {
    for (const change of [{ unit: "ถุง" }, { isActive: false }]) {
      const row = await inventory()
      const request = input([row], [2])
      await db.ingredient.update({
        where: { id: row.ingredientId },
        data: change,
      })
      assert.equal((await post(request)).status, 409)
    }
    const row = await inventory()
    assert.equal((await post(input([row], [2]), otherBranchId)).status, 403)
    assert.equal(
      (await fetch(`${base}/${otherBranchId}/stock-checks`, { headers: auth }))
        .status,
      403
    )
  })

  it("allows cooks with the dedicated permission, and enforces revocation at save and history", async () => {
    const row = await inventory()
    await db.member.update({
      where: { id: memberId },
      data: {
        permissionsJson: JSON.stringify({
          "stock-check": { view: true, edit: false },
        }),
      },
    })
    assert.equal((await post(input([row], [2]))).status, 403)
    await db.member.update({
      where: { id: memberId },
      data: {
        permissionsJson: JSON.stringify({
          "stock-check": { view: false, edit: true },
        }),
      },
    })
    assert.equal((await post(input([row], [2]))).status, 403)
    assert.equal(
      (await fetch(`${base}/${branchId}/stock-checks`, { headers: auth }))
        .status,
      403
    )
    await db.member.update({
      where: { id: memberId },
      data: { permissionsJson: null },
    })
  })

  it("keeps the latest actual count after ordinary usage and never treats adjustment as usage", async () => {
    const row = await inventory()
    const check = await saveStockCheck(
      db,
      memberId,
      branchId,
      input([row], [8])
    )
    const usage = await fetch(`${base}/${branchId}/inventory/usage`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        reason: "ทำอาหาร",
        items: [{ ingredientId: row.ingredientId, quantity: 1 }],
      }),
    })
    assert.equal(usage.status, 201, await usage.clone().text())
    const result = await fetch(`${base}/${branchId}/inventory`, {
      headers: auth,
    }).then((r) => readJson(r))
    const current = result.inventory.find(
      (item: { ingredientId: string }) => item.ingredientId === row.ingredientId
    )
    assert.ok(current)
    assert.equal(current.onHand, 7)
    assert.equal(current.lastCount.quantity, 8)
    assert.equal(current.lastCount.checkId, check.id)
    assert.equal(current.lastCount.countedBy, "แม่ครัวทดสอบ")
    assert.equal(current.ingredient.defaultPrice, 79)
    const usageHistory = await fetch(
      `${base}/${branchId}/inventory/movements?movementType=usage_out`,
      { headers: auth }
    ).then((r) => readJson(r))
    assert.ok(
      usageHistory.movements.every(
        (movement: { movementType: string }) =>
          movement.movementType === "usage_out"
      )
    )
  })

  it("serializes competing checks: one succeeds, the stale one conflicts", async () => {
    const row = await inventory()
    const requests = [input([row], [4]), input([row], [6])]
    const results = await Promise.all(requests.map((request) => post(request)))
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409])
    const winner = await readJson(
      results.find((result) => result.status === 200)!
    )
    const actual = Number(
      (await db.branchInventory.findUniqueOrThrow({ where: { id: row.id } }))
        .onHand
    )
    assert.equal(actual, winner.check.items[0].actualQuantity)
  })

  it("concurrent duplicate requests return the same result and create one adjustment", async () => {
    const row = await inventory()
    const request = input([row], [4])
    const responses = await Promise.all([post(request), post(request)])
    for (const response of responses)
      assert.equal(response.status, 200, await response.clone().text())
    const results = await Promise.all(
      responses.map((response) => readJson(response))
    )
    assert.equal(results[0].check.id, results[1].check.id)
    assert.equal(
      await db.stockMovement.count({
        where: { referenceId: results[0].check.id },
      }),
      1
    )
  })

  it("racing usage cannot be overwritten by an older physical count", async () => {
    const row = await inventory()
    const request = input([row], [4])
    const [check, usage] = await Promise.all([
      post(request),
      fetch(`${base}/${branchId}/inventory/usage`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          reason: "ทำอาหาร",
          items: [{ ingredientId: row.ingredientId, quantity: 1 }],
        }),
      }),
    ])
    assert.ok([200, 409].includes(check.status), await check.clone().text())
    assert.ok([201, 409].includes(usage.status), await usage.clone().text())
    const final = Number(
      (await db.branchInventory.findUniqueOrThrow({ where: { id: row.id } }))
        .onHand
    )
    assert.equal(
      final,
      check.status === 200 ? (usage.status === 201 ? 3 : 4) : 9
    )
  })

  it("rejects duplicate ingredients, invalid quantities and missing versions before writing", async () => {
    const row = await inventory()
    const valid = input([row], [4])
    const invalid = [
      { ...valid, items: [valid.items[0], valid.items[0]] },
      ...[-1, 0.0001, 1_000_000_000].map((actualQuantity) => ({
        ...valid,
        items: [{ ...valid.items[0], actualQuantity }],
      })),
      { ...valid, items: [{ ...valid.items[0], inventoryVersion: undefined }] },
    ]
    for (const payload of invalid) {
      const response = await fetch(`${base}/${branchId}/stock-checks`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify(payload),
      })
      assert.equal(response.status, 400)
    }
    assert.equal(
      await db.stockCheck.count({ where: { requestId: valid.requestId } }),
      0
    )
    assert.equal(
      Number(
        (await db.branchInventory.findUniqueOrThrow({ where: { id: row.id } }))
          .onHand
      ),
      10
    )
  })

  it("racing receipts preserve either the committed receipt plus the count or reject the stale count", async () => {
    const row = await inventory()
    const request = input([row], [4])
    const [check, receipt] = await Promise.all([
      post(request),
      fetch(`${base}/${branchId}/purchases`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          purchaseDate: new Date().toISOString(),
          vendor: "ร้านทดสอบ",
          status: "saved",
          items: [
            {
              ingredientId: row.ingredientId,
              quantity: 2,
              unit: "กก.",
              unitPrice: 79,
            },
          ],
        }),
      }),
    ])
    assert.ok([200, 409].includes(check.status), await check.clone().text())
    assert.ok([201, 409].includes(receipt.status), await receipt.clone().text())
    const final = Number(
      (await db.branchInventory.findUniqueOrThrow({ where: { id: row.id } }))
        .onHand
    )
    assert.equal(
      final,
      check.status === 200 ? (receipt.status === 201 ? 6 : 4) : 12
    )
  })
})
