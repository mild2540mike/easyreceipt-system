import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"
import { randomUUID } from "node:crypto"
import type { Server } from "node:http"
import type { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const testUrl = process.env.BRANCH_TEST_DATABASE_URL
const enabled =
  !!testUrl &&
  /^sqlserver:\/\/(localhost|127\.0\.0\.1):\d+;/i.test(testUrl) &&
  /;database=timetoeat_branch_test_[a-z0-9_]+(?:;|$)/i.test(testUrl)

describe("branch management on isolated SQL Server", { skip: !enabled }, () => {
  let db: PrismaClient
  let server: Server
  let base: string
  const prefix = randomUUID().slice(0, 8)
  const organizationId = `branch-org-${prefix}`
  const ownerId = `branch-owner-${prefix}`
  const secondOwnerId = `branch-owner-2-${prefix}`
  const managerId = `branch-manager-${prefix}`
  const staffId = `branch-staff-${prefix}`
  const branchAId = `branch-a-${prefix}`
  const branchBId = `branch-b-${prefix}`
  const branchCId = `branch-c-${prefix}`
  const secret = "branch-management-isolated-test-secret"

  function headers(memberId: string) {
    return {
      Authorization: `Bearer ${jwt.sign({ sub: memberId }, secret)}`,
      "Content-Type": "application/json",
    }
  }

  before(async () => {
    process.env.DATABASE_URL = testUrl!
    process.env.JWT_SECRET = secret
    process.env.NODE_ENV = "test"
    db = (await import("../../db/prisma.js")).prisma
    await db.organization.create({
      data: { id: organizationId, code: `BR${prefix}`, name: "องค์กรทดสอบสาขา" },
    })

    for (const [id, code] of [
      [branchAId, "A"],
      [branchBId, "B"],
      [branchCId, "C"],
    ]) {
      await db.branch.create({
        data: { id, code, organizationId, name: `สาขา ${code}`, location: "ทดสอบ" },
      })
    }

    for (const member of [
      { id: ownerId, role: "owner", primaryBranchId: branchAId },
      { id: secondOwnerId, role: "owner", primaryBranchId: branchAId },
      { id: managerId, role: "manager", primaryBranchId: branchAId },
      { id: staffId, role: "staff", primaryBranchId: branchBId },
    ]) {
      await db.member.create({
        data: {
          ...member,
          organizationId,
          name: member.role,
          username: member.id,
          status: "active",
          passwordHash: "prototype:test-only",
        },
      })
    }

    await db.memberBranchAccess.createMany({
      data: [
        ...[branchAId, branchBId, branchCId].map((branchId) => ({ memberId: ownerId, branchId })),
        { memberId: secondOwnerId, branchId: branchAId },
        { memberId: managerId, branchId: branchAId },
        { memberId: staffId, branchId: branchBId },
      ],
    })
    await db.ingredient.create({
      data: {
        id: `ingredient-${prefix}`,
        organizationId,
        name: "วัตถุดิบเดิม",
        category: "ทดสอบ",
        unit: "กก.",
      },
    })

    const { createApp } = await import("../../app.js")
    server = createApp().listen(0, "127.0.0.1")
    await new Promise<void>((resolve) => server.once("listening", resolve))
    const address = server.address()
    assert.ok(address && typeof address !== "string")
    base = `http://127.0.0.1:${address.port}/api/v1/branches`
  })

  after(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
    }
    if (db) await db.$disconnect()
  })

  it("allows only owners to list and mutate managed branches", async () => {
    const managedResponse = await fetch(`${base}/manage`, {
      headers: headers(ownerId),
    })
    assert.equal(managedResponse.status, 200)
    const managedPayload = (await managedResponse.json()) as {
      branches: Array<{
        id: string
        assignedMemberCount: number
        soleAccessMemberCount: number
      }>
    }
    const branchB = managedPayload.branches.find((branch) => branch.id === branchBId)
    assert.ok(branchB)
    assert.equal(branchB.assignedMemberCount, 2)
    assert.equal(branchB.soleAccessMemberCount, 1)

    assert.equal((await fetch(`${base}/manage`, { headers: headers(managerId) })).status, 403)
    assert.equal((await fetch(`${base}/manage`, { headers: headers(staffId) })).status, 403)
    assert.equal(
      (
        await fetch(base, {
          method: "POST",
          headers: headers(managerId),
          body: JSON.stringify({ code: "NOPE", name: "ห้ามสร้าง", location: "ทดสอบ" }),
        })
      ).status,
      403
    )
    assert.equal(
      (
        await fetch(`${base}/${branchAId}`, {
          method: "PATCH",
          headers: headers(managerId),
          body: JSON.stringify({ name: "ห้ามแก้ไข" }),
        })
      ).status,
      403
    )
    assert.equal(
      (
        await fetch(`${base}/${branchCId}`, {
          method: "DELETE",
          headers: headers(staffId),
        })
      ).status,
      403
    )
    assert.equal(
      (
        await fetch(`${base}/${branchCId}/restore`, {
          method: "POST",
          headers: headers(managerId),
        })
      ).status,
      403
    )
  })

  it("creates an uppercase branch with empty inventory, owner access and an audit log", async () => {
    const response = await fetch(base, {
      method: "POST",
      headers: headers(ownerId),
      body: JSON.stringify({ code: "new_1", name: "สาขาใหม่", location: "นครราชสีมา" }),
    })
    assert.equal(response.status, 201, await response.clone().text())
    const { branch } = (await response.json()) as {
      branch: { id: string; code: string; dailyPurchaseBudget: number | null }
    }
    assert.equal(branch.code, "NEW_1")
    assert.equal(branch.dailyPurchaseBudget, null)
    assert.equal(await db.branchInventory.count({ where: { branchId: branch.id } }), 1)
    assert.equal(
      await db.memberBranchAccess.count({
        where: { branchId: branch.id, member: { role: "owner" } },
      }),
      2
    )
    assert.equal(
      await db.auditLog.count({ where: { entityId: branch.id, action: "branch_created" } }),
      1
    )

    const duplicate = await fetch(base, {
      method: "POST",
      headers: headers(ownerId),
      body: JSON.stringify({ code: "new_1", name: "ซ้ำ", location: "ทดสอบ" }),
    })
    assert.equal(duplicate.status, 400)

    for (const payload of [
      { code: "bad code", name: "รูปแบบผิด", location: "ทดสอบ" },
      { code: " ", name: "รหัสว่าง", location: "ทดสอบ" },
      { code: "BLANK", name: " ", location: "ทดสอบ" },
      { code: "BLANK2", name: "สาขา", location: " " },
    ]) {
      const invalid = await fetch(base, {
        method: "POST",
        headers: headers(ownerId),
        body: JSON.stringify(payload),
      })
      assert.equal(invalid.status, 400)
    }
  })

  it("updates only name and location and rejects attempts to change the code", async () => {
    const updated = await fetch(`${base}/${branchAId}`, {
      method: "PATCH",
      headers: headers(ownerId),
      body: JSON.stringify({ name: "สาขา A ใหม่", location: "ตำบลใหม่" }),
    })
    assert.equal(updated.status, 200, await updated.clone().text())
    assert.equal((await db.branch.findUniqueOrThrow({ where: { id: branchAId } })).name, "สาขา A ใหม่")

    const codeChange = await fetch(`${base}/${branchAId}`, {
      method: "PATCH",
      headers: headers(ownerId),
      body: JSON.stringify({ code: "CHANGED" }),
    })
    assert.equal(codeChange.status, 400)
    assert.equal((await db.branch.findUniqueOrThrow({ where: { id: branchAId } })).code, "A")
  })

  it("blocks orphaning members, preserves data, and repairs missing inventory on restore", async () => {
    const blocked = await fetch(`${base}/${branchBId}`, {
      method: "DELETE",
      headers: headers(ownerId),
    })
    assert.equal(blocked.status, 400)

    await db.branchInventory.create({
      data: {
        branchId: branchCId,
        ingredientId: `ingredient-${prefix}`,
        onHand: 12,
      },
    })
    const closed = await fetch(`${base}/${branchCId}`, {
      method: "DELETE",
      headers: headers(ownerId),
    })
    assert.equal(closed.status, 204, await closed.clone().text())
    assert.equal((await db.branch.findUniqueOrThrow({ where: { id: branchCId } })).isActive, false)
    assert.equal(
      await db.memberBranchAccess.count({
        where: { branchId: branchCId, memberId: ownerId },
      }),
      1
    )
    assert.equal(
      Number((await db.branchInventory.findFirstOrThrow({ where: { branchId: branchCId } })).onHand),
      12
    )
    assert.equal(
      await db.auditLog.count({
        where: { entityId: branchCId, action: "branch_deactivated" },
      }),
      1
    )
    const activeAfterDeactivate = (await (
      await fetch(base, { headers: headers(ownerId) })
    ).json()) as { branches: Array<{ id: string }> }
    assert.equal(
      activeAfterDeactivate.branches.some((branch) => branch.id === branchCId),
      false
    )
    const managedAfterDeactivate = (await (
      await fetch(`${base}/manage`, { headers: headers(ownerId) })
    ).json()) as { branches: Array<{ id: string; isActive: boolean }> }
    assert.equal(
      managedAfterDeactivate.branches.find((branch) => branch.id === branchCId)?.isActive,
      false
    )

    const laterIngredientId = `ingredient-later-${prefix}`
    await db.ingredient.create({
      data: {
        id: laterIngredientId,
        organizationId,
        name: "วัตถุดิบภายหลัง",
        category: "ทดสอบ",
        unit: "ชิ้น",
      },
    })
    const restored = await fetch(`${base}/${branchCId}/restore`, {
      method: "POST",
      headers: headers(ownerId),
    })
    assert.equal(restored.status, 200, await restored.clone().text())
    assert.equal((await db.branch.findUniqueOrThrow({ where: { id: branchCId } })).isActive, true)
    assert.equal(
      await db.branchInventory.count({ where: { branchId: branchCId, ingredientId: laterIngredientId } }),
      1
    )
    assert.equal(
      await db.auditLog.count({
        where: { entityId: branchCId, action: "branch_restored" },
      }),
      1
    )
    assert.equal(
      await db.memberBranchAccess.count({
        where: { branchId: branchCId, memberId: secondOwnerId },
      }),
      1
    )
    const activeAfterRestore = (await (
      await fetch(base, { headers: headers(ownerId) })
    ).json()) as { branches: Array<{ id: string }> }
    assert.equal(
      activeAfterRestore.branches.some((branch) => branch.id === branchCId),
      true
    )
  })

  it("blocks deactivating the final active branch in an organization", async () => {
    const isolatedOrganizationId = `last-org-${prefix}`
    const isolatedBranchId = `last-branch-${prefix}`
    const isolatedOwnerId = `last-owner-${prefix}`

    await db.organization.create({
      data: {
        id: isolatedOrganizationId,
        code: `LAST${prefix}`,
        name: "องค์กรสาขาเดียว",
      },
    })
    await db.branch.create({
      data: {
        id: isolatedBranchId,
        organizationId: isolatedOrganizationId,
        code: "ONLY",
        name: "สาขาเดียว",
        location: "ทดสอบ",
      },
    })
    await db.member.create({
      data: {
        id: isolatedOwnerId,
        organizationId: isolatedOrganizationId,
        primaryBranchId: isolatedBranchId,
        name: "owner",
        username: isolatedOwnerId,
        role: "owner",
        status: "active",
        passwordHash: "prototype:test-only",
      },
    })
    await db.memberBranchAccess.create({
      data: { memberId: isolatedOwnerId, branchId: isolatedBranchId },
    })

    const response = await fetch(`${base}/${isolatedBranchId}`, {
      method: "DELETE",
      headers: headers(isolatedOwnerId),
    })

    assert.equal(response.status, 400)
    const payload = (await response.json()) as { error: { message: string } }
    assert.match(payload.error.message, /สาขาสุดท้าย/)
    assert.equal(
      (await db.branch.findUniqueOrThrow({ where: { id: isolatedBranchId } })).isActive,
      true
    )
  })
})
