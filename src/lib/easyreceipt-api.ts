import type {
  Branch,
  Ingredient,
  InventoryItem,
  Member,
  MemberRole,
  MemberStatus,
  Recipe,
  RecipeIngredient,
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

type ApiMemberWithBranches = ApiMember & {
  branches: Branch[]
}

export type AddMemberApiInput = {
  name: string
  email: string
  role: string
  branchIds: string[]
}

export type UpdateMemberApiInput = {
  role?: string
  status?: string
  branchIds?: string[]
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

export type ApiRecipeItem = {
  id: string
  ingredientId: string
  ingredient?: ApiIngredient
  quantity: number | string
}

export type ApiRecipePlan = {
  id: string
  status: string
  batchCount: number
  plannedAt: string
  cookedAt: string | null
  reservations?: {
    id: string
    ingredientId: string
    quantity: number | string
    status: string
  }[]
}

export type ApiRecipe = {
  id: string
  branchId: string
  name: string
  menuCategory: string
  yield: number | string
  pricePerServing: number | string
  isActive: boolean
  items: ApiRecipeItem[]
  pinnedPlans?: ApiRecipePlan[]
}

export type RecipeApiInput = {
  name: string
  menuCategory: string
  yield: number
  pricePerServing: number
  ingredients: RecipeIngredient[]
}

export type NormalizedRecipePlan = {
  id: string
  status: string
}

export type NormalizedRecipeSnapshot = {
  recipes: Recipe[]
  pinnedRecipeIds: string[]
  cookedRecipeIds: string[]
  recipePlanByRecipeId: Record<string, NormalizedRecipePlan>
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

function normalizeRecipe(recipe: ApiRecipe): Recipe {
  return {
    id: recipe.id,
    name: recipe.name,
    menuCategory: recipe.menuCategory,
    yield: Math.max(Math.round(toNumber(recipe.yield)), 1),
    pricePerServing: toNumber(recipe.pricePerServing),
    ingredients: recipe.items.map((item) => ({
      ingredientId: item.ingredientId,
      quantity: toNumber(item.quantity),
    })),
  }
}

function latestRecipePlan(recipe: ApiRecipe) {
  const plans = [...(recipe.pinnedPlans ?? [])].sort(
    (left, right) =>
      new Date(right.plannedAt).getTime() - new Date(left.plannedAt).getTime()
  )

  return (
    plans.find((plan) => plan.status === "pinned") ??
    plans.find((plan) => plan.status === "cooked") ??
    null
  )
}

function normalizeRecipeSnapshot(recipes: ApiRecipe[]): NormalizedRecipeSnapshot {
  const pinnedRecipeIds: string[] = []
  const cookedRecipeIds: string[] = []
  const recipePlanByRecipeId: Record<string, NormalizedRecipePlan> = {}

  for (const recipe of recipes) {
    const plan = latestRecipePlan(recipe)

    if (!plan) {
      continue
    }

    if (plan.status === "pinned" || plan.status === "cooked") {
      pinnedRecipeIds.push(recipe.id)
      recipePlanByRecipeId[recipe.id] = {
        id: plan.id,
        status: plan.status,
      }
    }

    if (plan.status === "cooked") {
      cookedRecipeIds.push(recipe.id)
    }
  }

  return {
    recipes: recipes.map(normalizeRecipe),
    pinnedRecipeIds,
    cookedRecipeIds,
    recipePlanByRecipeId,
  }
}

async function ensureEmptyResponse(response: Response) {
  if (response.ok) {
    return
  }

  const data = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null

  throw new Error(data?.error?.message ?? "EasyReceipt API request failed.")
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

export async function apiGetBranchRecipes(
  branchId: string
): Promise<NormalizedRecipeSnapshot> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/recipes`,
    {
      method: "GET",
      credentials: "include",
    }
  )
  const data = await parseJsonResponse<{ recipes: ApiRecipe[] }>(response)

  return normalizeRecipeSnapshot(data.recipes)
}

export async function apiCreateBranchRecipe(
  branchId: string,
  input: RecipeApiInput
): Promise<Recipe> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/recipes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    }
  )
  const data = await parseJsonResponse<{ recipe: ApiRecipe }>(response)

  return normalizeRecipe(data.recipe)
}

export async function apiUpdateBranchRecipe(
  branchId: string,
  recipeId: string,
  input: RecipeApiInput
): Promise<Recipe> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(
      branchId
    )}/recipes/${encodeURIComponent(recipeId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    }
  )
  const data = await parseJsonResponse<{ recipe: ApiRecipe }>(response)

  return normalizeRecipe(data.recipe)
}

export async function apiDeleteBranchRecipe(
  branchId: string,
  recipeId: string
) {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(
      branchId
    )}/recipes/${encodeURIComponent(recipeId)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  )

  await ensureEmptyResponse(response)
}

export async function apiPinBranchRecipe(
  branchId: string,
  recipeId: string
): Promise<ApiRecipePlan> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(
      branchId
    )}/recipes/${encodeURIComponent(recipeId)}/pin`,
    {
      method: "POST",
      credentials: "include",
    }
  )
  const data = await parseJsonResponse<{ plan: ApiRecipePlan }>(response)

  return data.plan
}

export async function apiUnpinBranchRecipe(branchId: string, recipeId: string) {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(
      branchId
    )}/recipes/${encodeURIComponent(recipeId)}/unpin`,
    {
      method: "POST",
      credentials: "include",
    }
  )

  await parseJsonResponse<{ ok: boolean }>(response)
}

export async function apiCookBranchRecipePlan(branchId: string, planId: string) {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(
      branchId
    )}/recipe-plans/${encodeURIComponent(planId)}/cook`,
    {
      method: "POST",
      credentials: "include",
    }
  )

  await parseJsonResponse<{ cookingRun: unknown }>(response)
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

export async function apiGetMembers(): Promise<Member[]> {
  const response = await fetch(`${apiBaseUrl}/members`, {
    method: "GET",
    credentials: "include",
  })
  const data = await parseJsonResponse<{ members: ApiMemberWithBranches[] }>(response)

  return data.members.map((member) =>
    normalizeMember(member, member.branches.map((branch) => branch.id))
  )
}

export async function apiAddMember(input: AddMemberApiInput): Promise<Member> {
  const response = await fetch(`${apiBaseUrl}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  const data = await parseJsonResponse<{ member: ApiMember }>(response)

  return normalizeMember(data.member, input.branchIds)
}

export async function apiUpdateMember(
  memberId: string,
  input: UpdateMemberApiInput
): Promise<ApiMember> {
  const response = await fetch(
    `${apiBaseUrl}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    }
  )
  const data = await parseJsonResponse<{ member: ApiMember }>(response)

  return data.member
}
