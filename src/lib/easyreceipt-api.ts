import type {
  Branch,
  Ingredient,
  InventoryItem,
  Member,
  MemberRole,
  MemberStatus,
} from "@/lib/easyreceipt-data"

const apiBaseUrl = process.env.NEXT_PUBLIC_EASYRECEIPT_API_URL
  ?? "http://localhost:4000/api/v1"

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

type ApiIngredient = {
  id: string
  name: string
  category: string
  unit: string
  defaultPrice: number | string
  supplier: string
}

export type ApiInventoryRow = {
  id: string
  branchId: string
  ingredientId: string
  ingredient: ApiIngredient
  onHand: number | string
  reservedQuantity: number | string
  reorderPoint: number | string
  costPerUnit: number | string
  available?: number | string
  suggestedPurchaseQuantity?: number | string
  lastUpdatedAt: string
}

export type ApiInventoryResponse = {
  inventory: ApiInventoryRow[]
}

export type UpdateInventoryApiInput = {
  name: string
  category: string
  unit: string
  defaultPrice: number
  supplier: string
  onHand: number
  reorderPoint: number
  costPerUnit: number
}

export type NormalizedInventorySnapshot = {
  ingredients: Ingredient[]
  inventoryItems: InventoryItem[]
}

export type NormalizedInventoryRow = {
  ingredient: Ingredient
  inventoryItem: InventoryItem
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

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function formatApiDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function normalizeIngredient(ingredient: ApiIngredient): Ingredient {
  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    unit: ingredient.unit,
    defaultPrice: toNumber(ingredient.defaultPrice),
    supplier: ingredient.supplier,
  }
}

function normalizeInventoryRow(row: ApiInventoryRow): NormalizedInventoryRow {
  return {
    ingredient: normalizeIngredient(row.ingredient),
    inventoryItem: {
      ingredientId: row.ingredientId,
      onHand: toNumber(row.onHand),
      reserved: toNumber(row.reservedQuantity),
      reorderPoint: toNumber(row.reorderPoint),
      costPerUnit: toNumber(row.costPerUnit),
      lastUpdated: formatApiDate(row.lastUpdatedAt),
    },
  }
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

export async function apiGetBranchInventory(
  branchId: string
): Promise<NormalizedInventorySnapshot> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/inventory`,
    {
      method: "GET",
      credentials: "include",
    }
  )
  const data = await parseJsonResponse<ApiInventoryResponse>(response)
  const rows = data.inventory.map(normalizeInventoryRow)

  return {
    ingredients: rows.map((row) => row.ingredient),
    inventoryItems: rows.map((row) => row.inventoryItem),
  }
}

export async function apiUpdateBranchInventory(
  branchId: string,
  ingredientId: string,
  input: UpdateInventoryApiInput
): Promise<NormalizedInventoryRow> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(
      branchId
    )}/inventory/${encodeURIComponent(ingredientId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    }
  )
  const data = await parseJsonResponse<{ inventory: ApiInventoryRow }>(response)

  return normalizeInventoryRow(data.inventory)
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
