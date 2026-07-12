import type { Branch, Member, Prisma, PrismaClient } from "@prisma/client"

import { forbidden, notFound } from "../../utils/http-error"

type PrismaExecutor = Prisma.TransactionClient | PrismaClient
export type MenuPermissionKey =
  | "purchase"
  | "usage"
  | "stock"
  | "recipes"
  | "reports"
  | "members"
  | "budgets"
type MenuPermission = { view: boolean; edit: boolean }
export type MemberMenuPermissions = Partial<Record<MenuPermissionKey, MenuPermission>>

export const menuPermissionKeys: MenuPermissionKey[] = [
  "purchase",
  "usage",
  "stock",
  "recipes",
  "reports",
  "members",
  "budgets",
]

export type MemberWithBranchAccess = Prisma.MemberGetPayload<{
  include: { branchAccess: true }
}>
export type MemberWithBranches = Prisma.MemberGetPayload<{
  include: { branchAccess: { include: { branch: true } } }
}>

export async function getAccessibleBranchIds(
  tx: PrismaExecutor,
  memberId: string
) {
  const rows = await tx.memberBranchAccess.findMany({
    where: {
      memberId,
      branch: {
        isActive: true,
      },
    },
    select: {
      branchId: true,
    },
  })

  return rows.map((row) => row.branchId)
}

export async function getAccessibleBranches(
  tx: PrismaExecutor,
  memberId: string
) {
  return tx.branch.findMany({
    where: {
      memberAccess: {
        some: {
          memberId,
        },
      },
      isActive: true,
    },
    orderBy: {
      code: "asc",
    },
  })
}

export async function assertBranchAccess(
  tx: PrismaExecutor,
  memberId: string,
  branchId: string
) {
  const access = await tx.memberBranchAccess.findUnique({
    where: {
      memberId_branchId: {
        memberId,
        branchId,
      },
    },
    include: {
      member: true,
      branch: true,
    },
  })

  if (!access || access.member.status !== "active" || !access.branch.isActive) {
    throw forbidden("Member does not have access to this branch.")
  }

  return access
}

export async function assertManageMembers(
  tx: PrismaExecutor,
  actor: Member
) {
  if (!memberCanEditMenu(actor, "members")) {
    throw forbidden("Member does not have permission to manage members.")
  }

  const persistedActor = (await tx.member.findUnique({
    where: {
      id: actor.id,
    },
    include: {
      branchAccess: true,
    },
  })) as MemberWithBranchAccess | null

  if (!persistedActor || persistedActor.status !== "active") {
    throw notFound("Actor member not found.")
  }

  return persistedActor
}

export function defaultMemberPermissions(role: string): MemberMenuPermissions {
  const fullAccess = role === "owner" || role === "manager"

  if (fullAccess) {
    return Object.fromEntries(
      menuPermissionKeys.map((key) => [key, { view: true, edit: true }])
    ) as MemberMenuPermissions
  }

  return {
    purchase: { view: true, edit: true },
    usage: { view: true, edit: true },
    stock: { view: true, edit: false },
    recipes: { view: true, edit: true },
    reports: { view: false, edit: false },
    members: { view: false, edit: false },
    budgets: { view: false, edit: false },
  }
}

export function normalizeMemberPermissions(
  role: string,
  rawPermissions?: string | null | unknown
): MemberMenuPermissions {
  const defaults = defaultMemberPermissions(role)
  const parsed =
    typeof rawPermissions === "string"
      ? (() => {
          try {
            return JSON.parse(rawPermissions) as unknown
          } catch {
            return null
          }
        })()
      : rawPermissions

  if (!parsed || typeof parsed !== "object") {
    return defaults
  }

  const permissions = { ...defaults }
  const record = parsed as Record<string, unknown>

  for (const key of menuPermissionKeys) {
    const value = record[key]

    if (!value || typeof value !== "object") {
      continue
    }

    const permission = value as Partial<MenuPermission>
    permissions[key] = {
      view: Boolean(permission.view),
      edit: Boolean(permission.edit),
    }
  }

  return permissions
}

export function memberCanViewMenu(member: Pick<Member, "role" | "permissionsJson">, key: MenuPermissionKey) {
  return normalizeMemberPermissions(member.role, member.permissionsJson)[key]?.view ?? false
}

export function memberCanEditMenu(member: Pick<Member, "role" | "permissionsJson">, key: MenuPermissionKey) {
  return normalizeMemberPermissions(member.role, member.permissionsJson)[key]?.edit ?? false
}

export function serializeMember(member: Member) {
  return {
    id: member.id,
    organizationId: member.organizationId,
    primaryBranchId: member.primaryBranchId,
    name: member.name,
    username: member.username,
    role: member.role,
    status: member.status,
    permissions: normalizeMemberPermissions(member.role, member.permissionsJson),
    lastActiveAt: member.lastActiveAt,
    joinedAt: member.joinedAt,
  }
}

export function serializeBranch(branch: Branch) {
  return {
    id: branch.id,
    organizationId: branch.organizationId,
    code: branch.code,
    name: branch.name,
    location: branch.location,
    dailyPurchaseBudget:
      branch.dailyPurchaseBudget === null
        ? null
        : Number(branch.dailyPurchaseBudget),
    isActive: branch.isActive,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  }
}
