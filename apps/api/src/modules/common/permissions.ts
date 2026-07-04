import type { Member, Prisma, PrismaClient } from "@prisma/client"

import { forbidden, notFound } from "../../utils/http-error"

type PrismaExecutor = Prisma.TransactionClient | PrismaClient
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
  if (actor.role !== "owner" && actor.role !== "manager") {
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

export function serializeMember(member: Member) {
  return {
    id: member.id,
    organizationId: member.organizationId,
    primaryBranchId: member.primaryBranchId,
    name: member.name,
    email: member.email,
    role: member.role,
    status: member.status,
    lastActiveAt: member.lastActiveAt,
    joinedAt: member.joinedAt,
  }
}
