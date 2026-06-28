import type { Branch, Member, MemberRole, MemberStatus } from "@/lib/easyreceipt-data"

const apiBaseUrl = process.env.NEXT_PUBLIC_EASYRECEIPT_API_URL

type ApiMember = {
  id: string
  organizationId: string
  primaryBranchId: string | null
  name: string
  email: string
  role: string
  status: string
  lastActiveAt: string | null
  joinedAt: string
}

type ApiAuthResponse = {
  member: ApiMember
  branchIds?: string[]
  branches?: Branch[]
}

export type LoginInput = {
  email: string
  password: string
}

function isMemberRole(role: string): role is MemberRole {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "staff" ||
    role === "viewer"
  )
}

function isMemberStatus(status: string): status is MemberStatus {
  return status === "active" || status === "invited" || status === "suspended"
}

function formatLastActive(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function normalizeMember(member: ApiMember, branchIds: string[]): Member {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: isMemberRole(member.role) ? member.role : "staff",
    status: isMemberStatus(member.status) ? member.status : "suspended",
    lastActive: formatLastActive(member.lastActiveAt),
    joinedAt: member.joinedAt.slice(0, 10),
    password: "",
    branchIds,
    primaryBranchId: member.primaryBranchId ?? branchIds[0] ?? "",
  }
}

async function parseJsonResponse<T>(response: Response) {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "EasyReceipt API request failed.")
  }

  if (!data) {
    throw new Error("EasyReceipt API returned an empty response.")
  }

  return data as T
}

function authBranchIds(data: ApiAuthResponse) {
  return data.branchIds ?? data.branches?.map((branch) => branch.id) ?? []
}

export async function apiLogin(input: LoginInput) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  })
  const data = await parseJsonResponse<ApiAuthResponse>(response)

  return normalizeMember(data.member, authBranchIds(data))
}

export async function apiLogout() {
  await fetch(`${apiBaseUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
  })
}

export async function apiGetCurrentMember() {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    method: "GET",
    credentials: "include",
  })

  if (response.status === 401) {
    return null
  }

  const data = await parseJsonResponse<ApiAuthResponse>(response)

  return normalizeMember(data.member, authBranchIds(data))
}
