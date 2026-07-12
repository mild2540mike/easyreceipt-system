import type {
  Branch,
  Ingredient,
  InventoryItem,
  Member,
  MemberMenuPermissions,
  MemberRole,
  MemberStatus,
  Recipe,
  RecipeIngredient,
} from "@/lib/easyreceipt-data"

const apiBaseUrl = process.env.NEXT_PUBLIC_EASYRECEIPT_API_URL

type ApiMember = {
  id: string
  organizationId: string
  primaryBranchId: string | null
  name: string
  username: string
  role: string
  status: string
  permissions?: MemberMenuPermissions
  lastActiveAt: string | null
  joinedAt: string
}

type ApiBranch = Omit<Branch, "dailyPurchaseBudget"> & {
  dailyPurchaseBudget?: number | string | null
}

type ApiMemberWithBranches = ApiMember & {
  branches: ApiBranch[]
}

export type AddMemberApiInput = {
  name: string
  username: string
  password: string
  role: string
  branchIds: string[]
  permissions?: MemberMenuPermissions
}

export type UpdateMemberApiInput = {
  name?: string
  username?: string
  password?: string
  role?: string
  status?: string
  branchIds?: string[]
  permissions?: MemberMenuPermissions
}

type ApiAuthResponse = {
  member: ApiMember
  branchIds?: string[]
  branches?: ApiBranch[]
}

export type AuthSession = {
  member: Member
  branches: Branch[]
}

export type LoginInput = {
  username: string
  password: string
}

export type DashboardStockNeed = {
  ingredientId: string
  name: string
  unit: string
  onHand: number
  reservedQuantity: number
  suggestedPurchaseQuantity: number
}

export type DashboardSummary = {
  purchaseTotal: number
  cookingCount: number
  stockNeedCount: number
  stockNeeds: DashboardStockNeed[]
}

export type ReportSummary = {
  branchCount: number
  branchNames: string[]
  purchaseTotal: number
  cookingCount: number
  stockMovementCount: number
  dailyPurchases: ReportDailyPurchase[]
}

export type ReportDailyPurchase = {
  date: string
  branchId: string
  branchName: string
  total: number
}

export type PurchaseApiInput = {
  purchaseDate: string
  vendor?: string
  status?: "draft" | "saved"
  draftPurchaseIds?: string[]
  items: {
    ingredientId: string
    quantity: number
    unit?: string
    unitPrice: number
  }[]
}

type ApiPurchaseItem = {
  id: string
  ingredientId: string
  ingredient?: ApiIngredient
  quantity: number | string
  unit: string
  unitPrice: number | string
  lineTotal: number | string
}

type ApiPurchase = {
  id: string
  purchaseDate: string
  vendor: string
  status?: string
  totalAmount: number | string
  items: ApiPurchaseItem[]
}

export type NormalizedPurchase = {
  id: string
  date: string
  purchasedAt: string
  vendor: string
  status: "draft" | "saved" | "posted"
  total: number
  items: {
    id: string
    ingredientId: string
    ingredient?: Ingredient
    quantity: number
    unit: string
    unitPrice: number
    lineTotal: number
  }[]
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

type ApiStockMovement = {
  id: string
  branchId: string
  ingredientId: string
  ingredient?: ApiIngredient
  createdBy?: {
    id: string
    name: string
    username: string
  } | null
  movementType: string
  quantity: number | string
  unit: string
  unitCost: number | string
  beforeQuantity: number | string
  afterQuantity: number | string
  reason?: string
  occurredAt: string
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

export type CreateIngredientFromPurchaseApiInput = {
  name: string
  unit: string
  unitPrice: number
  supplier?: string
}

export type StockOutApiInput = {
  ingredientId: string
  movementType: "waste_out" | "sale_out" | "usage_out"
  quantity: number
  reason: string
  photo: {
    name: string
    type: string
    size: number
    dataUrl: string
  }
}

export type UsageApiInput = {
  occurredAt?: string
  reason: string
  items: {
    ingredientId: string
    quantity: number
  }[]
}

export type UpdateBranchBudgetApiInput = {
  dailyPurchaseBudget: number | null
}

export type NormalizedInventorySnapshot = {
  ingredients: Ingredient[]
  inventoryItems: InventoryItem[]
}

export type NormalizedInventoryRow = {
  ingredient: Ingredient
  inventoryItem: InventoryItem
}

export type NormalizedStockMovement = {
  id: string
  branchId: string
  ingredientId: string
  ingredient?: Ingredient
  createdByName: string
  movementType: string
  quantity: number
  unit: string
  unitCost: number
  beforeQuantity: number
  afterQuantity: number
  reason: string
  occurredAt: string
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
    role === "staff"
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
    username: member.username,
    role: isMemberRole(member.role) ? member.role : "staff",
    status: isMemberStatus(member.status) ? member.status : "suspended",
    lastActive: formatLastActive(member.lastActiveAt),
    joinedAt: member.joinedAt.slice(0, 10),
    password: "",
    branchIds,
    primaryBranchId: member.primaryBranchId ?? branchIds[0] ?? "",
    permissions: member.permissions ?? {},
  }
}

function normalizeBranch(branch: ApiBranch): Branch {
  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    location: branch.location,
    dailyPurchaseBudget:
      branch.dailyPurchaseBudget === null ||
      branch.dailyPurchaseBudget === undefined
        ? null
        : toNumber(branch.dailyPurchaseBudget),
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

function normalizeAuthSession(data: ApiAuthResponse): AuthSession {
  return {
    member: normalizeMember(data.member, authBranchIds(data)),
    branches: (data.branches ?? []).map(normalizeBranch),
  }
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

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"

  return `${year}-${month}-${day}`
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

function normalizeStockMovement(row: ApiStockMovement): NormalizedStockMovement {
  return {
    id: row.id,
    branchId: row.branchId,
    ingredientId: row.ingredientId,
    ingredient: row.ingredient ? normalizeIngredient(row.ingredient) : undefined,
    createdByName: row.createdBy?.name ?? row.createdBy?.username ?? "-",
    movementType: row.movementType,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    unitCost: toNumber(row.unitCost),
    beforeQuantity: toNumber(row.beforeQuantity),
    afterQuantity: toNumber(row.afterQuantity),
    reason: row.reason ?? "",
    occurredAt: row.occurredAt,
  }
}

function normalizePurchase(purchase: ApiPurchase): NormalizedPurchase {
  const status =
    purchase.status === "draft" || purchase.status === "posted"
      ? purchase.status
      : "saved"

  return {
    id: purchase.id,
    date: formatApiDate(purchase.purchaseDate),
    purchasedAt: purchase.purchaseDate,
    vendor: purchase.vendor,
    status,
    total: toNumber(purchase.totalAmount),
    items: purchase.items.map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId,
      ingredient: item.ingredient ? normalizeIngredient(item.ingredient) : undefined,
      quantity: toNumber(item.quantity),
      unit: item.unit,
      unitPrice: toNumber(item.unitPrice),
      lineTotal: toNumber(item.lineTotal),
    })),
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

  return normalizeAuthSession(data)
}

export async function apiGetBranches(): Promise<Branch[]> {
  const response = await fetch(`${apiBaseUrl}/branches`, {
    method: "GET",
    credentials: "include",
  })
  const data = await parseJsonResponse<{ branches: ApiBranch[] }>(response)

  return data.branches.map(normalizeBranch)
}

export async function apiUpdateBranchBudget(
  branchId: string,
  input: UpdateBranchBudgetApiInput
): Promise<Branch> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/budget`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    }
  )
  const data = await parseJsonResponse<{ branch: ApiBranch }>(response)

  return normalizeBranch(data.branch)
}

export async function apiGetBranchDashboard(
  branchId: string
): Promise<DashboardSummary> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/dashboard`,
    {
      method: "GET",
      credentials: "include",
    }
  )
  const data = await parseJsonResponse<DashboardSummary>(response)

  return {
    purchaseTotal: toNumber(data.purchaseTotal),
    cookingCount: toNumber(data.cookingCount),
    stockNeedCount: toNumber(data.stockNeedCount),
    stockNeeds: data.stockNeeds.map((item) => ({
      ingredientId: item.ingredientId,
      name: item.name,
      unit: item.unit,
      onHand: toNumber(item.onHand),
      reservedQuantity: toNumber(item.reservedQuantity),
      suggestedPurchaseQuantity: toNumber(item.suggestedPurchaseQuantity),
    })),
  }
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

export async function apiCreateBranchIngredientFromPurchase(
  branchId: string,
  input: CreateIngredientFromPurchaseApiInput
): Promise<NormalizedInventoryRow> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/inventory/ingredients`,
    {
      method: "POST",
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

export async function apiCreateBranchStockOut(
  branchId: string,
  input: StockOutApiInput
): Promise<NormalizedInventoryRow> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/inventory/movements`,
    {
      method: "POST",
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

export async function apiGetBranchInventoryMovements(
  branchId: string,
  input: { date?: string; movementType?: string } = {}
): Promise<NormalizedStockMovement[]> {
  const params = new URLSearchParams()

  if (input.date) {
    params.set("date", input.date)
  }

  if (input.movementType) {
    params.set("movementType", input.movementType)
  }

  const query = params.toString()
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/inventory/movements${query ? `?${query}` : ""}`,
    {
      method: "GET",
      credentials: "include",
    }
  )
  const data = await parseJsonResponse<{ movements: ApiStockMovement[] }>(
    response
  )

  return data.movements.map(normalizeStockMovement)
}

export async function apiCreateBranchUsage(
  branchId: string,
  input: UsageApiInput
): Promise<{
  inventoryRows: NormalizedInventoryRow[]
  movements: NormalizedStockMovement[]
}> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/inventory/usage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    }
  )
  const data = await parseJsonResponse<{
    inventory: ApiInventoryRow[]
    movements: ApiStockMovement[]
  }>(response)

  return {
    inventoryRows: data.inventory.map(normalizeInventoryRow),
    movements: data.movements.map(normalizeStockMovement),
  }
}

export async function apiGetBranchPurchases(
  branchId: string,
  input: { date?: string } = {}
): Promise<NormalizedPurchase[]> {
  const params = new URLSearchParams()

  if (input.date) {
    params.set("date", input.date)
  }

  const query = params.toString()
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/purchases${query ? `?${query}` : ""}`,
    {
      method: "GET",
      credentials: "include",
    }
  )
  const data = await parseJsonResponse<{ purchases: ApiPurchase[] }>(response)

  return data.purchases.map(normalizePurchase)
}

export async function apiCreateBranchPurchase(
  branchId: string,
  input: PurchaseApiInput
): Promise<NormalizedPurchase> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/purchases`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    }
  )
  const data = await parseJsonResponse<{ purchase: ApiPurchase }>(response)

  return normalizePurchase(data.purchase)
}

export async function apiDeleteBranchPurchaseDraft(
  branchId: string,
  purchaseId: string
): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/purchases/${encodeURIComponent(purchaseId)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  )

  await ensureEmptyResponse(response)
}

export async function apiDeleteBranchPurchaseDraftItem(
  branchId: string,
  purchaseId: string,
  itemId: string
): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl}/branches/${encodeURIComponent(branchId)}/purchases/${encodeURIComponent(purchaseId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  )

  await ensureEmptyResponse(response)
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

  return normalizeAuthSession(data).member
}

export async function apiGetReportSummary(): Promise<ReportSummary> {
  const response = await fetch(`${apiBaseUrl}/reports/summary`, {
    method: "GET",
    credentials: "include",
  })
  const data = await parseJsonResponse<ReportSummary>(response)

  return {
    branchCount: toNumber(data.branchCount),
    branchNames: data.branchNames,
    purchaseTotal: toNumber(data.purchaseTotal),
    cookingCount: toNumber(data.cookingCount),
    stockMovementCount: toNumber(data.stockMovementCount),
    dailyPurchases: (data.dailyPurchases ?? []).map((item) => ({
      date: item.date,
      branchId: item.branchId,
      branchName: item.branchName,
      total: toNumber(item.total),
    })),
  }
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
