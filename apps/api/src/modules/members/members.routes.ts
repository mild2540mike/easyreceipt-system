import { Router } from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"

import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { badRequest, forbidden, notFound } from "../../utils/http-error"
import { routeParam } from "../../utils/route-param"
import {
  assertManageMembers,
  getAccessibleBranchIds,
  menuPermissionKeys,
  memberCanViewMenu,
  normalizeMemberPermissions,
  type MemberWithBranchAccess,
  type MemberWithBranches,
  serializeMember,
} from "../common/permissions"

const roleSchema = z.enum(["owner", "manager", "staff"])
const statusSchema = z.enum(["active", "invited", "suspended"])
const menuPermissionsSchema = z
  .object(
    Object.fromEntries(
      menuPermissionKeys.map((key) => [
        key,
        z
          .object({
            view: z.boolean(),
            edit: z.boolean(),
          })
          .optional(),
      ])
    ) as Record<
      (typeof menuPermissionKeys)[number],
      z.ZodOptional<z.ZodObject<{ view: z.ZodBoolean; edit: z.ZodBoolean }>>
    >
  )
  .partial()

const addMemberSchema = z.object({
  name: z.string().min(1),
  username: z.string().trim().min(1).max(80),
  password: z.string().min(6),
  role: roleSchema,
  branchIds: z.array(z.string().min(1)).min(1),
  permissions: menuPermissionsSchema.optional(),
})

const updateMemberSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().trim().min(1).max(80).optional(),
  password: z.string().min(6).optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
  branchIds: z.array(z.string().min(1)).optional(),
  permissions: menuPermissionsSchema.optional(),
})

export const membersRouter = Router()

function sanitizeBranchIds(
  requestedBranchIds: string[],
  allowedBranchIds: string[],
  role: string
) {
  const allowed = new Set(allowedBranchIds)
  const branchIds = requestedBranchIds.filter((branchId) => allowed.has(branchId))
  const roleScoped = role === "staff" ? branchIds.slice(0, 1) : branchIds

  return roleScoped
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

membersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const actor = getAuthMember(req)

    if (!memberCanViewMenu(actor, "members")) {
      throw forbidden("Member does not have permission to view members.")
    }

    const accessibleBranchIds = await getAccessibleBranchIds(prisma, actor.id)
    const members = await prisma.member.findMany({
      where: {
        organizationId: actor.organizationId,
        branchAccess: {
          some: {
            branchId: {
              in: accessibleBranchIds,
            },
          },
        },
      },
      include: {
        branchAccess: {
          include: {
            branch: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    })

    res.json({
      members: (members as MemberWithBranches[]).map((member) => ({
        ...serializeMember(member),
        branches: member.branchAccess.map((access) => access.branch),
      })),
    })
  })
)

membersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const actor = getAuthMember(req)
    const input = addMemberSchema.parse(req.body)

    const member = await prisma.$transaction(async (tx) => {
      const manager = (await assertManageMembers(tx, actor)) as MemberWithBranchAccess
      const allowedBranchIds =
        manager.role === "owner"
          ? (
              await tx.branch.findMany({
                where: {
                  organizationId: manager.organizationId,
                  isActive: true,
                },
                select: { id: true },
              })
            ).map((branch) => branch.id)
          : manager.branchAccess.map((access) => access.branchId)
      const branchIds = sanitizeBranchIds(
        input.branchIds,
        allowedBranchIds,
        input.role
      )

      if (branchIds.length === 0) {
        throw badRequest("Member requires at least one accessible branch.")
      }

      const username = normalizeUsername(input.username)

      const duplicateUsername = await tx.member.findFirst({
        where: {
          organizationId: manager.organizationId,
          username,
        },
      })

      if (duplicateUsername) {
        throw badRequest("Member username already exists.")
      }

      if (manager.role !== "owner" && input.permissions !== undefined) {
        throw forbidden("Only owners can edit menu permissions.")
      }

      const createdMember = await tx.member.create({
        data: {
          organizationId: manager.organizationId,
          primaryBranchId: branchIds[0],
          name: input.name.trim(),
          username,
          role: input.role,
          status: "invited",
          permissionsJson: JSON.stringify(
            normalizeMemberPermissions(
              input.role,
              manager.role === "owner" ? input.permissions : undefined
            )
          ),
          passwordHash: await bcrypt.hash(input.password, 10),
        },
      })

      for (const branchId of branchIds) {
        await tx.memberBranchAccess.create({
          data: {
            memberId: createdMember.id,
            branchId,
          },
        })
      }

      return createdMember
    })

    res.status(201).json({ member: serializeMember(member) })
  })
)

membersRouter.patch(
  "/:memberId",
  asyncHandler(async (req, res) => {
    const actor = getAuthMember(req)
    const input = updateMemberSchema.parse(req.body)
    const memberId = routeParam(req.params.memberId, "memberId")

    const member = await prisma.$transaction(async (tx) => {
      const manager = (await assertManageMembers(tx, actor)) as MemberWithBranchAccess
      const target = (await tx.member.findFirst({
        where: {
          id: memberId,
          organizationId: manager.organizationId,
        },
        include: {
          branchAccess: true,
        },
      })) as MemberWithBranchAccess | null

      if (!target) {
        throw notFound("Member not found.")
      }

      if (manager.role !== "owner" && input.permissions !== undefined) {
        throw forbidden("Only owners can edit menu permissions.")
      }

      const nextRole = input.role ?? target.role
      const nextPermissions =
        manager.role !== "owner"
          ? normalizeMemberPermissions(nextRole, target.permissionsJson)
          : input.permissions === undefined
            ? input.role
              ? normalizeMemberPermissions(nextRole)
              : normalizeMemberPermissions(nextRole, target.permissionsJson)
            : normalizeMemberPermissions(nextRole, input.permissions)
      const allowedBranchIds =
        manager.role === "owner"
          ? (
              await tx.branch.findMany({
                where: {
                  organizationId: manager.organizationId,
                  isActive: true,
                },
                select: { id: true },
              })
            ).map((branch) => branch.id)
          : manager.branchAccess.map((access) => access.branchId)
      const requestedBranchIds =
        input.branchIds ??
        target.branchAccess.map((access) => access.branchId)
      const nextBranchIds = sanitizeBranchIds(
        requestedBranchIds,
        allowedBranchIds,
        nextRole
      )

      if (nextBranchIds.length === 0) {
        throw badRequest("Member requires at least one accessible branch.")
      }

      const nextUsername = input.username
        ? normalizeUsername(input.username)
        : undefined

      if (nextUsername && nextUsername !== target.username) {
        const duplicateUsername = await tx.member.findFirst({
          where: {
            organizationId: manager.organizationId,
            username: nextUsername,
            id: {
              not: memberId,
            },
          },
        })

        if (duplicateUsername) {
          throw badRequest("Member username already exists.")
        }
      }

      await tx.memberBranchAccess.deleteMany({
        where: { memberId },
      })

      for (const branchId of nextBranchIds) {
        await tx.memberBranchAccess.create({
          data: {
            memberId,
            branchId,
          },
        })
      }

      return tx.member.update({
        where: { id: memberId },
        data: {
          name: input.name?.trim() ?? target.name,
          username: nextUsername ?? target.username,
          passwordHash: input.password
            ? await bcrypt.hash(input.password, 10)
            : target.passwordHash,
          role: nextRole,
          status: input.status ?? target.status,
          permissionsJson: JSON.stringify(nextPermissions),
          primaryBranchId: nextBranchIds[0],
        },
      })
    })

    res.json({ member: serializeMember(member) })
  })
)
