"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  type Branch,
  type CashFlowMetric,
  type Ingredient,
  type InventoryItem,
  type Member,
  type MemberMenuPermissions,
  type MemberRole,
  type MemberStatus,
  type PurchaseItem,
  type Recipe,
  type ViewId,
  memberCanEditMenu,
  memberCanViewMenu,
  normalizeMemberPermissions,
} from "@/lib/easyreceipt-data"
import {
  apiAddMember,
  apiCookBranchRecipePlan,
  apiCreateBranchIngredientFromPurchase,
  apiCreateBranchPurchaseBatch,
  apiCreateBranchUsageBatch,
  apiCreateBranchStockOut,
  apiCreateBranchRecipe,
  apiDeleteBranchPurchaseDraft,
  apiDeleteBranchPurchaseDraftItem,
  apiDeleteBranchRecipe,
  apiGetBranchDashboard,
  apiGetBranches,
  apiGetBranchInventory,
  apiGetBranchInventoryMovements,
  apiGetBranchPurchases,
  apiGetBranchRecipes,
  apiGetBranchUsageReasons,
  apiGetCurrentMember,
  apiGetMembers,
  apiGetNotifications,
  apiGetReportSummary,
  apiLogin,
  apiLogout,
  apiPinBranchRecipe,
  apiUnpinBranchRecipe,
  apiUpdateBranchBudget,
  apiUpdateBranchInventory,
  apiUpdateBranchRecipe,
  apiUpdateMember,
  type AddMemberApiInput,
  type DashboardSummary,
  type NormalizedInventoryRow,
  type NormalizedInventorySnapshot,
  type NormalizedRecipePlan,
  type NormalizedRecipeSnapshot,
  type NormalizedStockMovement,
  type SystemNotification,
  type ReportSummary,
  type StockOutApiInput,
  type UsageBatchApiInput,
  type UpdateMemberApiInput,
} from "@/lib/easyreceipt-api"

export type StockStatus = "ok" | "watch" | "low"

export type InventoryRow = InventoryItem & {
  ingredient: Ingredient
  incoming: number
  projected: number
  available: number
  suggestedPurchaseQuantity: number
  status: StockStatus
  stockPercent: number
}

export type RecipeImpact = Recipe & {
  cost: number
  revenue: number
  margin: number
  canProduce: boolean
  isCooked: boolean
  isPinned: boolean
  missingNames: string[]
}

export type PurchaseSeriesItem = {
  label: string
  total: number
}

export type BranchPurchaseSeriesItem = {
  date: string
  label: string
  total: number
  branches: {
    branchId: string
    branchName: string
    total: number
  }[]
}

export type MemberFormInput = {
  name: string
  username: string
  password: string
  role: MemberRole
  branchIds: string[]
}

export type MemberProfileInput = {
  name: string
  username: string
  password?: string
  permissions?: MemberMenuPermissions
}

export type RecipeFormInput = Omit<Recipe, "id">

export type NewIngredientFromPurchaseInput = {
  name: string
  unit: string
  unitPrice: number
  supplier?: string
}

export type UsageDraftItem = {
  id: string
  ingredientId: string
  quantity: number
  batchId?: string
  batchName?: string
  reason?: string
}

export type InventoryEditInput = {
  ingredientId: string
  name: string
  category: string
  unit: string
  defaultPrice: number
  supplier: string
  onHand: number
  reserved: number
  reorderPoint: number
  costPerUnit: number
}

export type StockOutInput = StockOutApiInput
export type UsageBatchInput = UsageBatchApiInput

type ActionResult = {
  ok: boolean
  error?: string
}

export type PurchaseBudgetStatus = {
  budget: number | null
  used: number
  draft: number
  projected: number
  remaining: number | null
  isLimited: boolean
  isOverBudget: boolean
}

export type BranchWorkspace = {
  branchId: string
  ingredients: Ingredient[]
  inventoryItems: InventoryItem[]
  recipes: Recipe[]
  pinnedRecipeIds: Set<string>
  cookedRecipeIds: Set<string>
  recipePlanByRecipeId: Record<string, NormalizedRecipePlan>
  purchaseDate: Date
  purchaseItems: PurchaseItem[]
  usageDate: Date
  usageItems: UsageDraftItem[]
  purchaseOrderDraftItems: PurchaseItem[]
  purchaseOrderDraftSavedAt: string | null
}

export type BranchReportSummary = {
  branchCount: number
  branchNames: string[]
  helper: string
}

const sessionMemberKey = "easyreceipt.memberId"
const sessionBranchKey = "easyreceipt.branchId"
const authSessionQueryKey = ["easyreceipt", "auth", "me"] as const
const branchesQueryKey = ["easyreceipt", "branches"] as const
const membersQueryKey = (memberId: string) =>
  ["easyreceipt", "members", memberId] as const
const reportsQueryKey = ["easyreceipt", "reports", "summary"] as const
const dashboardQueryKey = (branchId: string) =>
  ["easyreceipt", "dashboard", branchId] as const
const inventoryQueryKey = (branchId: string) =>
  ["easyreceipt", "inventory", branchId] as const
const notificationsQueryKey = (branchId: string) =>
  ["easyreceipt", "notifications", branchId] as const
const usageMovementsQueryKey = (branchId: string, dateKey: string) =>
  ["easyreceipt", "inventory", "usage", branchId, dateKey] as const
const usageReasonsQueryKey = (branchId: string) =>
  ["easyreceipt", "inventory", "usage-reasons", branchId] as const
const purchasesQueryKey = (branchId: string, dateKey: string) =>
  ["easyreceipt", "purchases", branchId, dateKey] as const
const recipesQueryKey = (branchId: string) =>
  ["easyreceipt", "recipes", branchId] as const
const activeMemberLabel = "กำลังใช้งาน"

const emptyDashboard: DashboardSummary = {
  purchaseTotal: 0,
  cookingCount: 0,
  stockNeedCount: 0,
  stockNeeds: [],
}

const emptyReport: ReportSummary = {
  branchCount: 0,
  branchNames: [],
  purchaseTotal: 0,
  cookingCount: 0,
  stockMovementCount: 0,
  dailyPurchases: [],
}

function readSessionValue(key: string) {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function saveSessionValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Session persistence is best-effort for this local prototype.
  }
}

function clearSessionValue(key: string) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Session persistence is best-effort for this local prototype.
  }
}

function saveMemberSession(memberId: string) {
  saveSessionValue(sessionMemberKey, memberId)
}

function clearMemberSession() {
  clearSessionValue(sessionMemberKey)
}

function readBranchSession() {
  return readSessionValue(sessionBranchKey)
}

function saveBranchSession(branchId: string) {
  saveSessionValue(sessionBranchKey, branchId)
}

function clearBranchSession() {
  clearSessionValue(sessionBranchKey)
}

function purchaseItemTotal(item: PurchaseItem) {
  return item.quantity * item.unitPrice
}

function isPurchaseItemComplete(item: PurchaseItem) {
  return Boolean(
    item.billName?.trim() &&
      item.ingredientId &&
      item.quantity > 0 &&
      item.unit.trim() &&
      item.unitPrice > 0
  )
}

function purchaseTotal(items: PurchaseItem[]) {
  return items.reduce((total, item) => total + purchaseItemTotal(item), 0)
}

function groupPurchaseItemsByBill(items: PurchaseItem[]) {
  const bills = new Map<string, PurchaseItem[]>()

  for (const item of items) {
    const billName = item.billName?.trim() ?? ""

    if (!billName || !item.ingredientId || item.quantity <= 0) {
      continue
    }

    bills.set(billName, [...(bills.get(billName) ?? []), item])
  }

  return Array.from(bills, ([name, billItems]) => ({ name, items: billItems }))
}

function stockStatus(item: InventoryItem) {
  if (item.onHand < item.reorderPoint || item.onHand < item.reserved) {
    return "low" as const
  }

  return "ok" as const
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T08:00:00+07:00`))
}

function bangkokDateKey(date: Date) {
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

function purchaseTimestampForSelectedDate(date: Date) {
  const now = new Date()
  const timestamp = new Date(date)

  timestamp.setHours(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  )

  return timestamp
}

function normalizeLookup(value: string) {
  return value.trim().toLocaleLowerCase("th-TH")
}

function roundQuantity(value: number) {
  return Math.round(value * 100) / 100
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function createEmptyBranchWorkspace(branchId: string): BranchWorkspace {
  return {
    branchId,
    ingredients: [],
    inventoryItems: [],
    recipes: [],
    pinnedRecipeIds: new Set(),
    cookedRecipeIds: new Set(),
    recipePlanByRecipeId: {},
    purchaseDate: new Date(),
    purchaseItems: [],
    usageDate: new Date(),
    usageItems: [],
    purchaseOrderDraftItems: [],
    purchaseOrderDraftSavedAt: null,
  }
}

function mergeInventorySnapshot(
  workspace: BranchWorkspace,
  snapshot: NormalizedInventorySnapshot
) {
  return {
    ...workspace,
    ingredients: snapshot.ingredients,
    inventoryItems: snapshot.inventoryItems,
  }
}

function mergeInventoryRow(
  workspace: BranchWorkspace,
  row: NormalizedInventoryRow
) {
  const hasIngredient = workspace.ingredients.some(
    (ingredient) => ingredient.id === row.ingredient.id
  )
  const hasInventoryItem = workspace.inventoryItems.some(
    (item) => item.ingredientId === row.inventoryItem.ingredientId
  )

  return {
    ...workspace,
    ingredients: hasIngredient
      ? workspace.ingredients.map((ingredient) =>
          ingredient.id === row.ingredient.id ? row.ingredient : ingredient
        )
      : [...workspace.ingredients, row.ingredient],
    inventoryItems: hasInventoryItem
      ? workspace.inventoryItems.map((item) =>
          item.ingredientId === row.inventoryItem.ingredientId
            ? row.inventoryItem
            : item
        )
      : [...workspace.inventoryItems, row.inventoryItem],
  }
}

function mergeRecipeSnapshot(
  workspace: BranchWorkspace,
  snapshot: NormalizedRecipeSnapshot
) {
  return {
    ...workspace,
    recipes: snapshot.recipes,
    pinnedRecipeIds: new Set(snapshot.pinnedRecipeIds),
    cookedRecipeIds: new Set(snapshot.cookedRecipeIds),
    recipePlanByRecipeId: snapshot.recipePlanByRecipeId,
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function normalizeRecipeInput(input: RecipeFormInput) {
  const ingredients = input.ingredients.filter((item) => item.quantity > 0)

  if (!input.name.trim() || ingredients.length === 0) {
    return null
  }

  return {
    name: input.name.trim(),
    menuCategory: input.menuCategory.trim() || "เมนูทั่วไป",
    yield: Math.max(Math.round(input.yield), 1),
    pricePerServing: Math.max(input.pricePerServing, 0),
    ingredients,
  }
}

function getMemberBranchIds(member: Member | null) {
  if (!member) {
    return []
  }

  const branchIds = member.branchIds.filter(Boolean)

  if (branchIds.length > 0) {
    if (member.role === "staff") {
      return branchIds.slice(0, 1)
    }

    return branchIds
  }

  return member.primaryBranchId ? [member.primaryBranchId] : []
}

function preferredBranchId(member: Member, requestedBranchId?: string | null) {
  const accessibleBranchIds = getMemberBranchIds(member)

  if (requestedBranchId && accessibleBranchIds.includes(requestedBranchId)) {
    return requestedBranchId
  }

  if (accessibleBranchIds.includes(member.primaryBranchId)) {
    return member.primaryBranchId
  }

  return accessibleBranchIds[0] ?? ""
}

function buildReportMetrics(
  report: Pick<ReportSummary, "purchaseTotal" | "cookingCount" | "stockMovementCount">
) {
  return [
    {
      id: "purchase-total",
      label: "ยอดซื้อรวม",
      value: report.purchaseTotal,
      delta: 0,
      kind: "expense",
    },
    {
      id: "stock-movement-count",
      label: "ความเคลื่อนไหวสต็อก",
      value: report.stockMovementCount,
      delta: 0,
      kind: "cash",
    },
  ] satisfies CashFlowMetric[]
}

export function useEasyReceiptStore(routeActiveView?: ViewId) {
  const queryClient = useQueryClient()
  const [activeView, setActiveView] = useState<ViewId>("dashboard")
  const effectiveActiveView = routeActiveView ?? activeView
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [activeBranchId, setActiveBranchId] = useState("")
  const [branchWorkspaces, setBranchWorkspaces] = useState<
    Record<string, BranchWorkspace>
  >({})
  const [inventoryMutationError, setInventoryMutationError] = useState("")
  const [purchaseMutationError, setPurchaseMutationError] = useState("")
  const [recipeMutationError, setRecipeMutationError] = useState("")
  const [memberMutationError, setMemberMutationError] = useState("")

  const activeWorkspace = activeBranchId
    ? (branchWorkspaces[activeBranchId] ?? createEmptyBranchWorkspace(activeBranchId))
    : createEmptyBranchWorkspace("")

  const accessibleBranchIds = useMemo(
    () => getMemberBranchIds(currentMember),
    [currentMember]
  )
  const accessibleBranches = useMemo(() => {
    const allowed = new Set(accessibleBranchIds)
    return branches.filter((branch) => allowed.has(branch.id))
  }, [accessibleBranchIds, branches])

  const activeBranch =
    branches.find((branch) => branch.id === activeBranchId) ??
    accessibleBranches[0]

  const ensureBranchWorkspace = useCallback((branchId: string) => {
    if (!branchId) {
      return
    }

    setBranchWorkspaces((workspaces) =>
      workspaces[branchId]
        ? workspaces
        : {
            ...workspaces,
            [branchId]: createEmptyBranchWorkspace(branchId),
          }
    )
  }, [])

  const updateBranchWorkspace = useCallback(
    (
      branchId: string,
      updater: (workspace: BranchWorkspace) => BranchWorkspace
    ) => {
      if (!branchId) {
        return
      }

      setBranchWorkspaces((workspaces) => {
        const workspace =
          workspaces[branchId] ?? createEmptyBranchWorkspace(branchId)

        return {
          ...workspaces,
          [branchId]: updater(workspace),
        }
      })
    },
    []
  )

  const syncBranchInventorySnapshot = useCallback(
    (branchId: string, snapshot: NormalizedInventorySnapshot) => {
      updateBranchWorkspace(branchId, (workspace) =>
        mergeInventorySnapshot(workspace, snapshot)
      )
    },
    [updateBranchWorkspace]
  )

  const syncBranchInventoryRow = useCallback(
    (branchId: string, row: NormalizedInventoryRow) => {
      updateBranchWorkspace(branchId, (workspace) =>
        mergeInventoryRow(workspace, row)
      )
    },
    [updateBranchWorkspace]
  )

  const syncBranchRecipesSnapshot = useCallback(
    (branchId: string, snapshot: NormalizedRecipeSnapshot) => {
      updateBranchWorkspace(branchId, (workspace) =>
        mergeRecipeSnapshot(workspace, snapshot)
      )
    },
    [updateBranchWorkspace]
  )

  const clearAccountQueryCache = useCallback(() => {
    for (const queryKey of [
      branchesQueryKey,
      ["easyreceipt", "members"] as const,
      ["easyreceipt", "reports"] as const,
      ["easyreceipt", "dashboard"] as const,
      ["easyreceipt", "inventory"] as const,
      ["easyreceipt", "purchases"] as const,
      ["easyreceipt", "recipes"] as const,
    ]) {
      queryClient.removeQueries({ queryKey })
    }
  }, [queryClient])

  const syncAuthenticatedMember = useCallback((member: Member) => {
    const nextMember = {
      ...member,
      lastActive: activeMemberLabel,
    }
    const nextBranchId = preferredBranchId(member, readBranchSession())

    setCurrentMember(nextMember)
    setMembers((items) => {
      const existingMember = items.some((item) => item.id === member.id)

      return existingMember
        ? items.map((item) => (item.id === member.id ? nextMember : item))
        : [nextMember, ...items]
    })
    setActiveBranchId(nextBranchId)
    saveMemberSession(member.id)
    if (nextBranchId) {
      saveBranchSession(nextBranchId)
    }
    setActiveView("purchase")
  }, [])

  const clearAuthenticatedMember = useCallback(() => {
    clearMemberSession()
    clearBranchSession()
    clearAccountQueryCache()
    setCurrentMember(null)
    setBranches([])
    setMembers([])
    setActiveBranchId("")
    setBranchWorkspaces({})
    setActiveView("purchase")
  }, [clearAccountQueryCache])

  const activePurchaseDate =
    activeWorkspace.purchaseDate ?? createEmptyBranchWorkspace("").purchaseDate
  const purchaseDateKey = bangkokDateKey(activePurchaseDate)
  const activeUsageDate =
    activeWorkspace.usageDate ?? createEmptyBranchWorkspace("").usageDate
  const usageDateKey = bangkokDateKey(activeUsageDate)
  const canViewPurchase = memberCanViewMenu(currentMember, "purchase")
  const canViewUsage = memberCanViewMenu(currentMember, "usage")
  const canViewRecipes = memberCanViewMenu(currentMember, "recipes")
  const canViewReports = memberCanViewMenu(currentMember, "reports")
  const canViewMembers = memberCanViewMenu(currentMember, "members")
  const canViewBudgets = memberCanViewMenu(currentMember, "budgets")
  const hasPortalView = Boolean(routeActiveView)
  const shouldLoadDashboard = Boolean(
    hasPortalView &&
      currentMember &&
      activeBranchId &&
      effectiveActiveView === "dashboard"
  )
  const shouldLoadPurchases = Boolean(
    hasPortalView &&
      currentMember &&
      activeBranchId &&
      canViewPurchase &&
      effectiveActiveView === "purchase"
  )
  const shouldLoadUsageMovements = Boolean(
    hasPortalView &&
      currentMember &&
      activeBranchId &&
      canViewUsage &&
      effectiveActiveView === "usage"
  )
  const shouldLoadUsageReasons = Boolean(
    hasPortalView &&
      currentMember &&
      activeBranchId &&
      canViewUsage &&
      effectiveActiveView === "usage"
  )
  const shouldLoadRecipes = Boolean(
    hasPortalView &&
      currentMember &&
      activeBranchId &&
      canViewRecipes &&
      effectiveActiveView === "recipes"
  )
  const shouldLoadInventory = Boolean(
    hasPortalView &&
      currentMember &&
      activeBranchId
  )
  const shouldLoadReports = Boolean(
    hasPortalView &&
      currentMember &&
      canViewReports &&
      (effectiveActiveView === "reports" ||
        (effectiveActiveView === "budgets" && canViewBudgets))
  )
  const shouldLoadMembers = Boolean(
    hasPortalView && currentMember && canViewMembers && effectiveActiveView === "members"
  )

  const authSessionQuery = useQuery({
    queryKey: authSessionQueryKey,
    queryFn: apiGetCurrentMember,
    staleTime: 60_000,
  })

  const branchesQuery = useQuery({
    queryKey: branchesQueryKey,
    queryFn: apiGetBranches,
    enabled: Boolean(currentMember),
    staleTime: 60_000,
  })

  const dashboardQuery = useQuery({
    queryKey: dashboardQueryKey(activeBranchId),
    queryFn: () => apiGetBranchDashboard(activeBranchId),
    enabled: shouldLoadDashboard,
    staleTime: 15_000,
  })

  const inventoryQuery = useQuery({
    queryKey: inventoryQueryKey(activeBranchId),
    queryFn: () => apiGetBranchInventory(activeBranchId),
    enabled: shouldLoadInventory,
    staleTime: 15_000,
  })

  const purchasesQuery = useQuery({
    queryKey: purchasesQueryKey(activeBranchId, purchaseDateKey),
    queryFn: () => apiGetBranchPurchases(activeBranchId, { date: purchaseDateKey }),
    enabled: shouldLoadPurchases,
    staleTime: 15_000,
  })

  const usageMovementsQuery = useQuery({
    queryKey: usageMovementsQueryKey(activeBranchId, usageDateKey),
    queryFn: () =>
      apiGetBranchInventoryMovements(activeBranchId, {
        date: usageDateKey,
        movementType: "usage_out",
      }),
    enabled: shouldLoadUsageMovements,
    staleTime: 15_000,
  })

  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey(activeBranchId),
    queryFn: () => apiGetNotifications(activeBranchId, { days: 7, limit: 50 }),
    enabled: Boolean(hasPortalView && currentMember && activeBranchId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  const usageReasonsQuery = useQuery({
    queryKey: usageReasonsQueryKey(activeBranchId),
    queryFn: () => apiGetBranchUsageReasons(activeBranchId),
    enabled: shouldLoadUsageReasons,
    staleTime: 60_000,
  })

  const recipesQuery = useQuery({
    queryKey: recipesQueryKey(activeBranchId),
    queryFn: () => apiGetBranchRecipes(activeBranchId),
    enabled: shouldLoadRecipes,
    staleTime: 15_000,
  })

  const reportsQuery = useQuery({
    queryKey: reportsQueryKey,
    queryFn: apiGetReportSummary,
    enabled: shouldLoadReports,
    staleTime: 15_000,
  })

  const membersQuery = useQuery({
    queryKey: membersQueryKey(currentMember?.id ?? ""),
    queryFn: apiGetMembers,
    enabled: shouldLoadMembers,
    staleTime: 30_000,
  })

  const loginMutation = useMutation({
    mutationFn: apiLogin,
    onSuccess: ({ member, branches }) => {
      clearAccountQueryCache()
      queryClient.setQueryData(authSessionQueryKey, member)
      queryClient.setQueryData(branchesQueryKey, branches)
      syncAuthenticatedMember(member)
      setBranches(branches)
      setIsAuthReady(true)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSettled: () => {
      queryClient.setQueryData(authSessionQueryKey, null)
      clearAuthenticatedMember()
      setIsAuthReady(true)
    },
  })

  const updateBranchBudgetMutation = useMutation({
    mutationFn: ({
      branchId,
      dailyPurchaseBudget,
    }: {
      branchId: string
      dailyPurchaseBudget: number | null
    }) => apiUpdateBranchBudget(branchId, { dailyPurchaseBudget }),
    onSuccess: (branch) => {
      setBranches((items) =>
        items.map((item) => (item.id === branch.id ? branch : item))
      )
      queryClient.setQueryData<Branch[]>(branchesQueryKey, (items) =>
        items?.map((item) => (item.id === branch.id ? branch : item))
      )
      void queryClient.invalidateQueries({ queryKey: branchesQueryKey })
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKey(branch.id),
      })
      void queryClient.invalidateQueries({
        queryKey: ["easyreceipt", "purchases", branch.id],
      })
    },
  })

  const createIngredientMutation = useMutation({
    mutationFn: ({
      branchId,
      input,
    }: {
      branchId: string
      input: NewIngredientFromPurchaseInput
    }) => apiCreateBranchIngredientFromPurchase(branchId, input),
    onMutate: () => {
      setInventoryMutationError("")
    },
    onSuccess: (row, variables) => {
      syncBranchInventoryRow(variables.branchId, row)
      void queryClient.invalidateQueries({
        queryKey: inventoryQueryKey(variables.branchId),
      })
    },
    onError: (error) => {
      setInventoryMutationError(
        errorMessage(error, "ไม่สามารถเพิ่มวัตถุดิบใหม่ได้")
      )
    },
  })

  const updateInventoryMutation = useMutation({
    mutationFn: ({
      branchId,
      ingredientId,
      input,
    }: {
      branchId: string
      ingredientId: string
      input: Omit<InventoryEditInput, "ingredientId" | "reserved">
    }) => apiUpdateBranchInventory(branchId, ingredientId, input),
    onMutate: () => {
      setInventoryMutationError("")
    },
    onSuccess: (row, variables) => {
      syncBranchInventoryRow(variables.branchId, row)
      void queryClient.invalidateQueries({
        queryKey: inventoryQueryKey(variables.branchId),
      })
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKey(variables.branchId),
      })
      void queryClient.invalidateQueries({
        queryKey: notificationsQueryKey(variables.branchId),
      })
    },
    onError: (error) => {
      setInventoryMutationError(
        errorMessage(error, "Inventory could not be updated.")
      )
    },
  })

  const createStockOutMutation = useMutation({
    mutationFn: ({
      branchId,
      input,
    }: {
      branchId: string
      input: StockOutInput
    }) => apiCreateBranchStockOut(branchId, input),
    onMutate: () => {
      setInventoryMutationError("")
    },
    onSuccess: (row, variables) => {
      syncBranchInventoryRow(variables.branchId, row)
      void queryClient.invalidateQueries({
        queryKey: inventoryQueryKey(variables.branchId),
      })
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKey(variables.branchId),
      })
      void queryClient.invalidateQueries({ queryKey: reportsQueryKey })
    },
    onError: (error) => {
      setInventoryMutationError(
        errorMessage(error, "ไม่สามารถตัดสต็อกได้")
      )
    },
  })

  const createUsageMutation = useMutation({
    mutationFn: ({
      branchId,
      input,
    }: {
      branchId: string
      input: UsageBatchInput
    }) => apiCreateBranchUsageBatch(branchId, input),
    onMutate: () => {
      setInventoryMutationError("")
    },
    onSuccess: (result, variables) => {
      for (const row of result.inventoryRows) {
        syncBranchInventoryRow(variables.branchId, row)
      }
      void queryClient.invalidateQueries({
        queryKey: inventoryQueryKey(variables.branchId),
      })
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKey(variables.branchId),
      })
      void queryClient.invalidateQueries({
        queryKey: usageMovementsQueryKey(variables.branchId, usageDateKey),
      })
      void queryClient.invalidateQueries({
        queryKey: notificationsQueryKey(variables.branchId),
      })
      void queryClient.invalidateQueries({ queryKey: reportsQueryKey })
    },
    onError: (error) => {
      setInventoryMutationError(
        errorMessage(error, "ไม่สามารถบันทึกของใช้ไปได้")
      )
    },
  })

  const createPurchaseMutation = useMutation({
    mutationFn: ({
      branchId,
      input,
    }: {
      branchId: string
      input: {
        purchaseDate: string
        status?: "draft" | "saved"
        bills: {
          name: string
          draftPurchaseIds?: string[]
          items: PurchaseItem[]
        }[]
      }
    }) =>
      apiCreateBranchPurchaseBatch(branchId, {
        purchaseDate: input.purchaseDate,
        status: input.status,
        bills: input.bills.map((bill) => ({
          name: bill.name,
          draftPurchaseIds: bill.draftPurchaseIds,
          items: bill.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
          })),
        })),
      }),
    onMutate: () => {
      setPurchaseMutationError("")
    },
    onError: (error) => {
      setPurchaseMutationError(
        errorMessage(error, "ไม่สามารถบันทึกใบซื้อได้")
      )
    },
  })

  const deletePurchaseDraftMutation = useMutation({
    mutationFn: ({
      branchId,
      purchaseId,
    }: {
      branchId: string
      purchaseId: string
    }) => apiDeleteBranchPurchaseDraft(branchId, purchaseId),
    onMutate: () => {
      setPurchaseMutationError("")
    },
    onError: (error) => {
      setPurchaseMutationError(
        errorMessage(error, "Purchase draft could not be deleted.")
      )
    },
  })

  const deletePurchaseDraftItemMutation = useMutation({
    mutationFn: ({
      branchId,
      purchaseId,
      itemId,
    }: {
      branchId: string
      purchaseId: string
      itemId: string
    }) => apiDeleteBranchPurchaseDraftItem(branchId, purchaseId, itemId),
    onMutate: () => {
      setPurchaseMutationError("")
    },
    onError: (error) => {
      setPurchaseMutationError(
        errorMessage(error, "Purchase draft item could not be deleted.")
      )
    },
  })

  const createRecipeMutation = useMutation({
    mutationFn: ({
      branchId,
      input,
    }: {
      branchId: string
      input: RecipeFormInput
    }) => apiCreateBranchRecipe(branchId, input),
    onMutate: () => {
      setRecipeMutationError("")
    },
    onError: (error) => {
      setRecipeMutationError(
        errorMessage(error, "Recipe could not be created.")
      )
    },
  })

  const updateRecipeMutation = useMutation({
    mutationFn: ({
      branchId,
      recipeId,
      input,
    }: {
      branchId: string
      recipeId: string
      input: RecipeFormInput
    }) => apiUpdateBranchRecipe(branchId, recipeId, input),
    onMutate: () => {
      setRecipeMutationError("")
    },
    onError: (error) => {
      setRecipeMutationError(
        errorMessage(error, "Recipe could not be updated.")
      )
    },
  })

  const deleteRecipeMutation = useMutation({
    mutationFn: ({
      branchId,
      recipeId,
    }: {
      branchId: string
      recipeId: string
    }) => apiDeleteBranchRecipe(branchId, recipeId),
    onMutate: () => {
      setRecipeMutationError("")
    },
    onError: (error) => {
      setRecipeMutationError(
        errorMessage(error, "Recipe could not be deleted.")
      )
    },
  })

  const pinRecipeMutation = useMutation({
    mutationFn: ({
      branchId,
      recipeId,
    }: {
      branchId: string
      recipeId: string
    }) => apiPinBranchRecipe(branchId, recipeId),
    onMutate: () => {
      setRecipeMutationError("")
    },
    onError: (error) => {
      setRecipeMutationError(errorMessage(error, "Recipe could not be pinned."))
    },
  })

  const unpinRecipeMutation = useMutation({
    mutationFn: ({
      branchId,
      recipeId,
    }: {
      branchId: string
      recipeId: string
    }) => apiUnpinBranchRecipe(branchId, recipeId),
    onMutate: () => {
      setRecipeMutationError("")
    },
    onError: (error) => {
      setRecipeMutationError(
        errorMessage(error, "Recipe could not be unpinned.")
      )
    },
  })

  const cookRecipeMutation = useMutation({
    mutationFn: ({
      branchId,
      planId,
    }: {
      branchId: string
      planId: string
    }) => apiCookBranchRecipePlan(branchId, planId),
    onMutate: () => {
      setRecipeMutationError("")
    },
    onError: (error) => {
      setRecipeMutationError(errorMessage(error, "Recipe could not be cooked."))
    },
  })

  const addMemberMutation = useMutation({
    mutationFn: (input: AddMemberApiInput) => apiAddMember(input),
    onMutate: () => {
      setMemberMutationError("")
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["easyreceipt", "members"] })
    },
    onError: (error) => {
      setMemberMutationError(
        errorMessage(error, "ไม่สามารถเพิ่มสมาชิกได้")
      )
    },
  })

  const updateMemberMutation = useMutation({
    mutationFn: ({
      memberId,
      input,
    }: {
      memberId: string
      input: UpdateMemberApiInput
    }) => apiUpdateMember(memberId, input),
    onMutate: () => {
      setMemberMutationError("")
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["easyreceipt", "members"] })
    },
    onError: (error) => {
      setMemberMutationError(
        errorMessage(error, "ไม่สามารถแก้ไขข้อมูลสมาชิกได้")
      )
    },
  })

  useEffect(() => {
    if (authSessionQuery.isPending) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (authSessionQuery.isError || !authSessionQuery.data) {
        clearAuthenticatedMember()
        setIsAuthReady(true)
        return
      }

      if (authSessionQuery.data.status !== "active") {
        clearAuthenticatedMember()
        setIsAuthReady(true)
        return
      }

      syncAuthenticatedMember(authSessionQuery.data)
      setIsAuthReady(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [
    authSessionQuery.data,
    authSessionQuery.isError,
    authSessionQuery.isPending,
    clearAuthenticatedMember,
    syncAuthenticatedMember,
  ])

  useEffect(() => {
    if (!branchesQuery.data) {
      return
    }

    const data = branchesQuery.data
    const timeoutId = window.setTimeout(() => {
      setBranches(data)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [branchesQuery.data])

  useEffect(() => {
    if (!activeBranchId) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      ensureBranchWorkspace(activeBranchId)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [activeBranchId, ensureBranchWorkspace])

  useEffect(() => {
    if (!currentMember || accessibleBranchIds.length === 0) {
      return
    }

    if (activeBranchId && accessibleBranchIds.includes(activeBranchId)) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const nextBranchId = preferredBranchId(currentMember)
      setActiveBranchId(nextBranchId)
      if (nextBranchId) {
        saveBranchSession(nextBranchId)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [accessibleBranchIds, activeBranchId, currentMember])

  useEffect(() => {
    if (!inventoryQuery.data) {
      return
    }

    const branchId = activeBranchId
    const timeoutId = window.setTimeout(() => {
      syncBranchInventorySnapshot(branchId, inventoryQuery.data)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [activeBranchId, inventoryQuery.data, syncBranchInventorySnapshot])

  useEffect(() => {
    if (!recipesQuery.data) {
      return
    }

    const branchId = activeBranchId
    const timeoutId = window.setTimeout(() => {
      syncBranchRecipesSnapshot(branchId, recipesQuery.data)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [activeBranchId, recipesQuery.data, syncBranchRecipesSnapshot])

  useEffect(() => {
    if (!membersQuery.data) {
      return
    }

    const data = membersQuery.data
    const timeoutId = window.setTimeout(() => {
      setMembers(data)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [membersQuery.data])

  const ingredientList = activeWorkspace.ingredients
  const inventoryList = activeWorkspace.inventoryItems
  const recipeList = activeWorkspace.recipes
  const pinnedRecipeIds = activeWorkspace.pinnedRecipeIds
  const cookedRecipeIds = activeWorkspace.cookedRecipeIds
  const recipePlanByRecipeId = activeWorkspace.recipePlanByRecipeId
  const purchaseDate = activeWorkspace.purchaseDate
  const purchaseItems = activeWorkspace.purchaseItems
  const usageDate = activeWorkspace.usageDate
  const usageItems = activeWorkspace.usageItems
  const purchaseHistory = useMemo(
    () => purchasesQuery.data ?? [],
    [purchasesQuery.data]
  )
  const savedPurchaseHistory = useMemo(
    () => purchaseHistory.filter((purchase) => purchase.status !== "draft"),
    [purchaseHistory]
  )
  const draftPurchaseHistory = useMemo(
    () => purchaseHistory.filter((purchase) => purchase.status === "draft"),
    [purchaseHistory]
  )
  const latestDraftPurchase = draftPurchaseHistory[0] ?? null
  const purchaseOrderDraftItems = useMemo<PurchaseItem[]>(
    () =>
      latestDraftPurchase?.items.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
      })) ?? [],
    [latestDraftPurchase]
  )
  const purchaseOrderDraftSavedAt = latestDraftPurchase?.purchasedAt ?? null
  const usageMovements = useMemo<NormalizedStockMovement[]>(
    () => usageMovementsQuery.data ?? [],
    [usageMovementsQuery.data]
  )
  const usageReasons = useMemo(
    () => usageReasonsQuery.data ?? [],
    [usageReasonsQuery.data]
  )
  const savedPurchaseTotalForDate = useMemo(
    () =>
      savedPurchaseHistory.reduce(
        (total, purchase) => total + purchase.total,
        0
      ),
    [savedPurchaseHistory]
  )
  const draftPurchaseTotalForDate = useMemo(
    () =>
      draftPurchaseHistory.reduce(
        (total, purchase) => total + purchase.total,
        0
      ),
    [draftPurchaseHistory]
  )
  const dashboardSummary = dashboardQuery.data ?? emptyDashboard
  const reportSummary = useMemo(
    () =>
      reportsQuery.data ?? {
        ...emptyReport,
        branchCount: accessibleBranches.length,
        branchNames: accessibleBranches.map((branch) => branch.name),
      },
    [accessibleBranches, reportsQuery.data]
  )

  function updateActiveWorkspace(
    updater: (workspace: BranchWorkspace) => BranchWorkspace
  ) {
    updateBranchWorkspace(activeBranchId, updater)
  }

  const ingredientById = useMemo(
    () =>
      new Map(
        ingredientList.map((ingredient) => [ingredient.id, ingredient] as const)
      ),
    [ingredientList]
  )

  const currentPurchaseTotal = useMemo(
    () => purchaseTotal(purchaseItems),
    [purchaseItems]
  )
  const purchaseBudgetStatus = useMemo<PurchaseBudgetStatus>(() => {
    const budget = activeBranch?.dailyPurchaseBudget ?? null
    const used = roundMoney(savedPurchaseTotalForDate)
    const draft = roundMoney(currentPurchaseTotal + draftPurchaseTotalForDate)
    const projected = roundMoney(used + draft)
    const isLimited = budget !== null

    return {
      budget,
      used,
      draft,
      projected,
      remaining: isLimited ? Math.max(roundMoney(budget - projected), 0) : null,
      isLimited,
      isOverBudget: isLimited && projected > budget,
    }
  }, [
    activeBranch?.dailyPurchaseBudget,
    currentPurchaseTotal,
    draftPurchaseTotalForDate,
    savedPurchaseTotalForDate,
  ])

  const incomingByIngredient = useMemo(() => {
    const incoming = new Map<string, number>()

    const draftItems = draftPurchaseHistory.flatMap((purchase) => purchase.items)

    for (const item of [...draftItems, ...purchaseItems]) {
      if (!item.ingredientId || item.quantity <= 0) {
        continue
      }

      incoming.set(
        item.ingredientId,
        roundQuantity(
          (incoming.get(item.ingredientId) ?? 0) + item.quantity
        )
      )
    }

    return incoming
  }, [draftPurchaseHistory, purchaseItems])

  const reservedByIngredient = useMemo(() => {
    const reserved = new Map<string, number>()

    for (const recipe of recipeList) {
      if (!pinnedRecipeIds.has(recipe.id) || cookedRecipeIds.has(recipe.id)) {
        continue
      }

      for (const item of recipe.ingredients) {
        reserved.set(
          item.ingredientId,
          (reserved.get(item.ingredientId) ?? 0) + item.quantity
        )
      }
    }

    return reserved
  }, [cookedRecipeIds, pinnedRecipeIds, recipeList])

  const inventoryRows = useMemo<InventoryRow[]>(() => {
    const rows: InventoryRow[] = []

    for (const item of inventoryList) {
      const ingredient = ingredientById.get(item.ingredientId)

      if (!ingredient) {
        continue
      }

      const incoming = incomingByIngredient.get(item.ingredientId) ?? 0
      const reserved = Math.max(
        item.reserved,
        reservedByIngredient.get(item.ingredientId) ?? 0
      )
      const available = roundQuantity(Math.max(item.onHand - reserved, 0))
      const suggestedPurchaseQuantity = roundQuantity(
        Math.max(item.reorderPoint - available, reserved - item.onHand, 0)
      )
      const stockPercent = Math.min(
        Math.round((available / Math.max(item.reorderPoint * 2, 1)) * 100),
        100
      )

      rows.push({
        ...item,
        ingredient,
        reserved,
        incoming,
        projected: roundQuantity(item.onHand + incoming),
        available,
        suggestedPurchaseQuantity,
        status: stockStatus({ ...item, onHand: available }),
        stockPercent,
      })
    }

    return rows
  }, [ingredientById, incomingByIngredient, inventoryList, reservedByIngredient])

  const lowStockItems = useMemo(
    () =>
      inventoryRows
        .filter((item) => item.status === "low")
        .sort(
          (first, second) =>
            second.suggestedPurchaseQuantity - first.suggestedPurchaseQuantity
        ),
    [inventoryRows]
  )

  const inventoryRowByIngredientId = useMemo(
    () => new Map(inventoryRows.map((row) => [row.ingredientId, row] as const)),
    [inventoryRows]
  )

  const purchaseOrderRows = useMemo<InventoryRow[]>(() => {
    const rowsByIngredientId = new Map<string, InventoryRow>(
      lowStockItems.map((item) => [item.ingredientId, item])
    )

    for (const item of purchaseOrderDraftItems) {
      if (!item.ingredientId || item.quantity <= 0) {
        continue
      }

      const inventoryRow = inventoryRowByIngredientId.get(item.ingredientId)
      const ingredient = ingredientById.get(item.ingredientId)

      if (!ingredient) {
        continue
      }

      const existingRow = rowsByIngredientId.get(item.ingredientId)
      const onHand = inventoryRow?.onHand ?? existingRow?.onHand ?? 0
      const reserved = inventoryRow?.reserved ?? existingRow?.reserved ?? 0
      const available =
        inventoryRow?.available ?? existingRow?.available ?? Math.max(onHand - reserved, 0)
      const draftQuantity = roundQuantity(item.quantity)

      rowsByIngredientId.set(item.ingredientId, {
        ingredientId: item.ingredientId,
        onHand,
        reserved,
        reorderPoint:
          inventoryRow?.reorderPoint ?? existingRow?.reorderPoint ?? 0,
        costPerUnit: item.unitPrice,
        lastUpdated:
          inventoryRow?.lastUpdated ?? existingRow?.lastUpdated ?? "-",
        ingredient: {
          ...ingredient,
          defaultPrice: item.unitPrice,
          unit: item.unit || ingredient.unit,
        },
        incoming: inventoryRow?.incoming ?? existingRow?.incoming ?? 0,
        projected: inventoryRow?.projected ?? existingRow?.projected ?? onHand,
        available,
        suggestedPurchaseQuantity: Math.max(
          draftQuantity,
          existingRow?.suggestedPurchaseQuantity ?? 0
        ),
        status: inventoryRow?.status ?? existingRow?.status ?? "ok",
        stockPercent: inventoryRow?.stockPercent ?? existingRow?.stockPercent ?? 100,
      })
    }

    return Array.from(rowsByIngredientId.values())
  }, [
    ingredientById,
    inventoryRowByIngredientId,
    lowStockItems,
    purchaseOrderDraftItems,
  ])
  const hasDraftPurchaseOrder = purchaseOrderDraftItems.length > 0
  const hasAutoPurchaseOrder = lowStockItems.length > 0
  const purchaseOrderSource =
    hasDraftPurchaseOrder && hasAutoPurchaseOrder
      ? ("combined" as const)
      : hasDraftPurchaseOrder
        ? ("draft" as const)
        : ("auto" as const)

  const recipeImpacts = useMemo<RecipeImpact[]>(() => {
    return recipeList.map((recipe) => {
      const isPinned = pinnedRecipeIds.has(recipe.id)
      const isCooked = cookedRecipeIds.has(recipe.id)
      const cost = recipe.ingredients.reduce((total, item) => {
        const inventoryItem = inventoryRowByIngredientId.get(item.ingredientId)

        return total + item.quantity * (inventoryItem?.costPerUnit ?? 0)
      }, 0)
      const missingNames = isCooked
        ? []
        : recipe.ingredients
            .filter((item) => {
              const inventoryItem = inventoryRowByIngredientId.get(
                item.ingredientId
              )

              if (!inventoryItem) {
                return true
              }

              const totalReserved = reservedByIngredient.get(item.ingredientId) ?? 0
              const competingReserved = Math.max(totalReserved - item.quantity, 0)
              const availableForRecipe = Math.max(
                inventoryItem.onHand - competingReserved,
                0
              )

              return availableForRecipe < item.quantity
            })
            .map((item) => ingredientById.get(item.ingredientId)?.name)
            .filter((name): name is string => Boolean(name))
      const revenue = recipe.yield * recipe.pricePerServing

      return {
        ...recipe,
        cost,
        revenue,
        margin: revenue - cost,
        canProduce: !isCooked && missingNames.length === 0,
        isCooked,
        isPinned,
        missingNames,
      }
    })
  }, [
    cookedRecipeIds,
    ingredientById,
    inventoryRowByIngredientId,
    pinnedRecipeIds,
    recipeList,
    reservedByIngredient,
  ])

  const pinnedRecipeImpacts = useMemo(
    () => recipeImpacts.filter((recipe) => recipe.isPinned),
    [recipeImpacts]
  )

  const recipeStats = useMemo(() => {
    return {
      total: pinnedRecipeImpacts.length,
      saved: recipeList.length,
      totalIngredients: pinnedRecipeImpacts.reduce(
        (total, recipe) => total + recipe.ingredients.length,
        0
      ),
      ready: pinnedRecipeImpacts.filter((recipe) => recipe.canProduce).length,
    }
  }, [pinnedRecipeImpacts, recipeList])

  const memberStats = useMemo(() => {
    return {
      total: members.length,
      active: members.filter((member) => member.status === "active").length,
      managers: members.filter(
        (member) => member.role === "owner" || member.role === "manager"
      ).length,
    }
  }, [members])

  const canManageMembers = memberCanEditMenu(currentMember, "members")
  const canManageMenuPermissions = currentMember?.role === "owner"
  const canManageBranchBudget = memberCanEditMenu(currentMember, "budgets")
  const canEditPurchase = memberCanEditMenu(currentMember, "purchase")
  const canEditInventory = memberCanEditMenu(currentMember, "stock")
  const canEditRecipes = memberCanEditMenu(currentMember, "recipes")
  const canEditUsage = memberCanEditMenu(currentMember, "usage")

  const reportPurchaseSeries = useMemo<PurchaseSeriesItem[]>(() => {
    if (savedPurchaseHistory.length > 0) {
      const totalsByLabel = new Map<string, number>()

      for (const purchase of savedPurchaseHistory) {
        const label = dayLabel(purchase.date)
        totalsByLabel.set(label, (totalsByLabel.get(label) ?? 0) + purchase.total)
      }

      return Array.from(totalsByLabel.entries()).map(([label, total]) => ({
        label,
        total,
      }))
    }

    return reportSummary.purchaseTotal > 0
      ? [{ label: "รวม", total: reportSummary.purchaseTotal }]
      : []
  }, [savedPurchaseHistory, reportSummary.purchaseTotal])

  const reportBranchPurchaseSeries = useMemo<BranchPurchaseSeriesItem[]>(() => {
    if (reportSummary.dailyPurchases.length === 0) {
      return reportPurchaseSeries.map((item) => ({
        date: item.label,
        label: item.label,
        total: item.total,
        branches: [
          {
            branchId: "total",
            branchName: "รวม",
            total: item.total,
          },
        ],
      }))
    }

    const byDate = new Map<string, BranchPurchaseSeriesItem>()

    for (const item of reportSummary.dailyPurchases) {
      const current = byDate.get(item.date) ?? {
        date: item.date,
        label: dayLabel(item.date),
        total: 0,
        branches: [],
      }

      current.total += item.total
      current.branches.push({
        branchId: item.branchId,
        branchName: item.branchName,
        total: item.total,
      })
      byDate.set(item.date, current)
    }

    return Array.from(byDate.values()).sort((first, second) =>
      first.date.localeCompare(second.date)
    )
  }, [reportPurchaseSeries, reportSummary.dailyPurchases])

  const reportCashFlowMetrics = useMemo(
    () => buildReportMetrics(reportSummary),
    [reportSummary]
  )
  const activeCashFlowMetrics = useMemo(
    () => buildReportMetrics({
      purchaseTotal: dashboardSummary.purchaseTotal,
      cookingCount: dashboardSummary.cookingCount,
      stockMovementCount: 0,
    }),
    [dashboardSummary]
  )
  const reportBranchSummary = useMemo<BranchReportSummary>(
    () => ({
      branchCount: reportSummary.branchCount,
      branchNames: reportSummary.branchNames,
      helper: `สรุปรวม ${reportSummary.branchCount} สาขาที่มีสิทธิ์`,
    }),
    [reportSummary]
  )
  const dailyBudgetUsageByBranch = useMemo(() => {
    const todayKey = bangkokDateKey(new Date())
    const usage: Record<string, number> = {}

    for (const item of reportSummary.dailyPurchases) {
      if (item.date !== todayKey) {
        continue
      }

      usage[item.branchId] = roundMoney((usage[item.branchId] ?? 0) + item.total)
    }

    return usage
  }, [reportSummary.dailyPurchases])

  const dashboardError = dashboardQuery.isError
    ? errorMessage(dashboardQuery.error, "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้")
    : ""
  const inventoryError =
    inventoryMutationError ||
    (inventoryQuery.isError
      ? errorMessage(
          inventoryQuery.error,
          "ไม่สามารถโหลดข้อมูลคลังวัตถุดิบได้"
        )
      : "")
  const purchaseError =
    purchaseMutationError ||
    (purchasesQuery.isError
      ? errorMessage(purchasesQuery.error, "ไม่สามารถโหลดข้อมูลใบซื้อได้")
      : "")
  const usageError =
    inventoryMutationError ||
    (usageMovementsQuery.isError
      ? errorMessage(
          usageMovementsQuery.error,
          "ไม่สามารถโหลดประวัติของใช้ไปได้"
        )
      : "")
  const recipeError =
    recipeMutationError ||
    (recipesQuery.isError
      ? errorMessage(recipesQuery.error, "ไม่สามารถโหลดข้อมูลสูตรอาหารได้")
      : "")
  const reportsError = reportsQuery.isError
    ? errorMessage(reportsQuery.error, "ไม่สามารถโหลดข้อมูลรายงานได้")
    : ""
  const memberError =
    memberMutationError ||
    (membersQuery.isError
      ? errorMessage(membersQuery.error, "ไม่สามารถโหลดข้อมูลสมาชิกได้")
      : "")

  const isDashboardLoading =
    dashboardQuery.isPending && shouldLoadDashboard
  const isInventoryLoading =
    inventoryQuery.isPending && shouldLoadInventory
  const isPurchasesLoading =
    purchasesQuery.isPending && shouldLoadPurchases
  const isUsageMovementsLoading =
    usageMovementsQuery.isPending && shouldLoadUsageMovements
  const isReportsLoading = reportsQuery.isPending && shouldLoadReports
  const isRecipesLoading =
    recipesQuery.isPending && shouldLoadRecipes
  const isRecipeSaving =
    createRecipeMutation.isPending ||
    updateRecipeMutation.isPending ||
    deleteRecipeMutation.isPending ||
    pinRecipeMutation.isPending ||
    unpinRecipeMutation.isPending ||
    cookRecipeMutation.isPending

  function setActiveBranch(branchId: string) {
    if (!currentMember || !accessibleBranchIds.includes(branchId)) {
      return false
    }

    setActiveBranchId(branchId)
    saveBranchSession(branchId)
    ensureBranchWorkspace(branchId)

    return true
  }

  function setPurchaseDate(date: Date) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      purchaseDate: date,
    }))
  }

  function setUsageDate(date: Date) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      usageDate: date,
    }))
  }

  async function login(username: string, password: string) {
    const session = await loginMutation
      .mutateAsync({
        username: username.trim().toLowerCase(),
        password,
      })
      .catch(() => null)

    return Boolean(session?.member.status === "active")
  }

  function logout() {
    queryClient.setQueryData(authSessionQueryKey, null)
    clearAccountQueryCache()
    clearAuthenticatedMember()
    logoutMutation.mutate()
  }

  function updatePurchaseItem(
    itemId: string,
    patch: Partial<Omit<PurchaseItem, "id">>
  ) {
    updateActiveWorkspace((workspace) => {
      const currentItem = workspace.purchaseItems.find(
        (item) => item.id === itemId
      )

      if (!currentItem) {
        return workspace
      }

      const nextItem = { ...currentItem, ...patch }

      if (
        patch.ingredientId &&
        patch.ingredientId !== currentItem.ingredientId
      ) {
        const ingredient = workspace.ingredients.find(
          (item) => item.id === patch.ingredientId
        )

        if (ingredient) {
          nextItem.unit = ingredient.unit
          nextItem.unitPrice = ingredient.defaultPrice
        }
      }

      return {
        ...workspace,
        purchaseItems: workspace.purchaseItems.map((item) =>
          item.id === itemId ? nextItem : item
        ),
      }
    })
  }

  function addPurchaseItem() {
    updateActiveWorkspace((workspace) => {
      const billName =
        workspace.purchaseItems.at(-1)?.billName?.trim() || ""
      const nextItem = {
        id: `${workspace.branchId}-draft-${Date.now()}`,
        ingredientId: "",
        quantity: 0,
        unit: "",
        unitPrice: 0,
        billName,
      }

      return {
        ...workspace,
        purchaseItems: [...workspace.purchaseItems, nextItem],
      }
    })
  }

  function addPurchaseBill() {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      purchaseItems: [
        ...workspace.purchaseItems,
        {
          id: `${workspace.branchId}-bill-${Date.now()}`,
          ingredientId: "",
          quantity: 0,
          unit: "",
          unitPrice: 0,
          billName: "",
        },
      ],
    }))
  }

  function addPurchaseItemToBill(billName: string) {
    updateActiveWorkspace((workspace) => {
      const nextItem = {
        id: `${workspace.branchId}-draft-${Date.now()}`,
        ingredientId: "",
        quantity: 0,
        unit: "",
        unitPrice: 0,
        billName,
      }
      const firstBillItemIndex = workspace.purchaseItems.findIndex(
        (item) => item.billName === billName
      )
      const purchaseItems = [...workspace.purchaseItems]

      if (firstBillItemIndex === -1) {
        purchaseItems.push(nextItem)
      } else {
        purchaseItems.splice(firstBillItemIndex, 0, nextItem)
      }

      return { ...workspace, purchaseItems }
    })
  }

  function renamePurchaseBill(currentName: string, nextName: string) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      purchaseItems: workspace.purchaseItems.map((item) =>
        item.billName === currentName ? { ...item, billName: nextName } : item
      ),
    }))
  }

  function removePurchaseBill(billName: string) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      purchaseItems: workspace.purchaseItems.filter(
        (item) => item.billName !== billName
      ),
    }))
  }

  function updateUsageItem(
    itemId: string,
    patch: Partial<Omit<UsageDraftItem, "id">>
  ) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      usageItems: workspace.usageItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      ),
    }))
  }

  function addUsageItem() {
    updateActiveWorkspace((workspace) => {
      const batchId = workspace.usageItems[0]?.batchId ?? `${workspace.branchId}-usage-batch-${Date.now()}`
      const batchName = workspace.usageItems[0]?.batchName ?? ""

      return {
        ...workspace,
        usageItems: [
          {
            id: `${workspace.branchId}-usage-${Date.now()}`,
            ingredientId: "",
            quantity: 0,
            batchId,
            batchName,
            reason: workspace.usageItems[0]?.reason ?? "",
          },
          ...workspace.usageItems,
        ],
      }
    })
  }

  function addUsageBatch() {
    updateActiveWorkspace((workspace) => {
      const batchId = `${workspace.branchId}-usage-batch-${Date.now()}`

      return {
        ...workspace,
        usageItems: [
          ...workspace.usageItems,
          {
            id: `${batchId}-item-1`,
            ingredientId: "",
            quantity: 0,
            batchId,
            batchName: "",
            reason: "",
          },
        ],
      }
    })
  }

  function addUsageItemToBatch(batchId: string) {
    updateActiveWorkspace((workspace) => {
      const firstBatchItemIndex = workspace.usageItems.findIndex(
        (item) => (item.batchId ?? "legacy") === batchId
      )
      const existingItem = workspace.usageItems[firstBatchItemIndex]
      const nextItem: UsageDraftItem = {
        id: `${workspace.branchId}-usage-${Date.now()}`,
        ingredientId: "",
        quantity: 0,
        batchId,
        batchName: existingItem?.batchName ?? "",
        reason: existingItem?.reason ?? "",
      }
      const usageItems = [...workspace.usageItems]

      if (firstBatchItemIndex === -1) {
        usageItems.push(nextItem)
      } else {
        usageItems.splice(firstBatchItemIndex, 0, nextItem)
      }

      return { ...workspace, usageItems }
    })
  }

  function updateUsageBatchReason(batchId: string, reason: string) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      usageItems: workspace.usageItems.map((item) =>
        (item.batchId ?? "legacy") === batchId ? { ...item, reason } : item
      ),
    }))
  }

  function renameUsageBatch(batchId: string, batchName: string) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      usageItems: workspace.usageItems.map((item) =>
        (item.batchId ?? "legacy") === batchId ? { ...item, batchName } : item
      ),
    }))
  }

  function removeUsageBatch(batchId: string) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      usageItems: workspace.usageItems.filter(
        (item) => (item.batchId ?? "legacy") !== batchId
      ),
    }))
  }

  function removeUsageItem(itemId: string) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      usageItems: workspace.usageItems.filter((item) => item.id !== itemId),
    }))
  }

  function addSuggestedPurchaseItems() {
    if (lowStockItems.length === 0) {
      return false
    }

    updateActiveWorkspace((workspace) => {
      const existingIngredientIds = new Set(
        workspace.purchaseItems
          .map((item) => item.ingredientId)
          .filter(Boolean)
      )
      const suggestedItems = lowStockItems
        .filter((row) => !existingIngredientIds.has(row.ingredientId))
        .map((row, index) => ({
          id: `${workspace.branchId}-suggested-${Date.now()}-${index}`,
          ingredientId: row.ingredientId,
          quantity: roundQuantity(row.suggestedPurchaseQuantity),
          unit: row.ingredient.unit,
          unitPrice: row.ingredient.defaultPrice,
          billName:
            workspace.purchaseItems.at(-1)?.billName?.trim() || "",
        }))

      return {
        ...workspace,
        purchaseItems: [...workspace.purchaseItems, ...suggestedItems],
      }
    })

    return true
  }

  function removePurchaseItem(itemId: string) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      purchaseItems: workspace.purchaseItems.filter((item) => item.id !== itemId),
    }))
  }

  async function savePurchaseDraft(): Promise<ActionResult> {
    if (!currentMember || !activeBranchId) {
      return {
        ok: false,
        error: "ยังไม่ได้เข้าสู่ระบบหรือเลือกสาขา",
      }
    }

    if (!canEditPurchase) {
      return {
        ok: false,
        error: "บัญชีนี้ไม่มีสิทธิ์บันทึกของมาเพิ่ม",
      }
    }

    if (purchaseItems.some((item) => !isPurchaseItemComplete(item))) {
      return {
        ok: false,
        error: "กรุณากรอกชื่อบิล วัตถุดิบ ปริมาณ หน่วย และราคาต่อหน่วยให้ครบทุกแถว",
      }
    }

    const items = purchaseItems.filter(
      (item) => item.ingredientId && item.quantity > 0
    )
    if (items.length === 0) {
      return {
        ok: false,
        error: "กรุณาเพิ่มรายการวัตถุดิบอย่างน้อย 1 รายการ",
      }
    }

    if (items.some((item) => !item.billName?.trim())) {
      return {
        ok: false,
        error: "กรุณาระบุชื่อบิลให้ครบทุกรายการ",
      }
    }

    try {
      const purchaseTimestamp = purchaseTimestampForSelectedDate(purchaseDate)

      await createPurchaseMutation.mutateAsync({
        branchId: activeBranchId,
        input: {
          purchaseDate: purchaseTimestamp.toISOString(),
          status: "draft",
          bills: groupPurchaseItemsByBill(items),
        },
      })
      updateActiveWorkspace((workspace) => ({
        ...workspace,
        purchaseItems: [],
      }))
      await queryClient.invalidateQueries({
        queryKey: purchasesQueryKey(activeBranchId, purchaseDateKey),
      })

      return { ok: true }
    } catch (error) {
      const message = errorMessage(error, "ไม่สามารถบันทึกฉบับร่างได้")
      setPurchaseMutationError(message)

      return { ok: false, error: message }
    }
  }

  async function deletePurchaseDraft(purchaseId: string): Promise<ActionResult> {
    if (!currentMember || !activeBranchId) {
      return {
        ok: false,
        error: "à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸«à¸£à¸·à¸­à¹€à¸¥à¸·à¸­à¸à¸ªà¸²à¸‚à¸²",
      }
    }

    try {
      if (!canEditPurchase) {
        return {
          ok: false,
          error: "บัญชีนี้ไม่มีสิทธิ์ลบฉบับร่างของมาเพิ่ม",
        }
      }

      await deletePurchaseDraftMutation.mutateAsync({
        branchId: activeBranchId,
        purchaseId,
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: purchasesQueryKey(activeBranchId, purchaseDateKey),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKey(activeBranchId),
        }),
      ])

      return { ok: true }
    } catch (error) {
      const message = errorMessage(error, "à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸¥à¸šà¸‰à¸šà¸±à¸šà¸£à¹ˆà¸²à¸‡à¹„à¸”à¹‰")
      setPurchaseMutationError(message)

      return { ok: false, error: message }
    }
  }

  async function deletePurchaseDraftItem(
    purchaseId: string,
    itemId: string
  ): Promise<ActionResult> {
    if (!currentMember || !activeBranchId) {
      return {
        ok: false,
        error: "ยังไม่ได้เข้าสู่ระบบหรือเลือกสาขา",
      }
    }

    try {
      if (!canEditPurchase) {
        return {
          ok: false,
          error: "บัญชีนี้ไม่มีสิทธิ์ลบรายการของมาเพิ่ม",
        }
      }

      await deletePurchaseDraftItemMutation.mutateAsync({
        branchId: activeBranchId,
        purchaseId,
        itemId,
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: purchasesQueryKey(activeBranchId, purchaseDateKey),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKey(activeBranchId),
        }),
      ])

      return { ok: true }
    } catch (error) {
      const message = errorMessage(error, "ไม่สามารถลบรายการฉบับร่างได้")
      setPurchaseMutationError(message)

      return { ok: false, error: message }
    }
  }

  async function submitPurchase(): Promise<ActionResult> {
    if (!currentMember || !activeBranchId) {
      return {
        ok: false,
        error: "ยังไม่ได้เข้าสู่ระบบหรือเลือกสาขา",
      }
    }

    if (!canEditPurchase) {
      return {
        ok: false,
        error: "บัญชีนี้ไม่มีสิทธิ์บันทึกของมาเพิ่ม",
      }
    }

    if (purchaseItems.some((item) => !isPurchaseItemComplete(item))) {
      return {
        ok: false,
        error: "กรุณากรอกชื่อบิล วัตถุดิบ ปริมาณ หน่วย และราคาต่อหน่วยให้ครบทุกแถว",
      }
    }

    const items = purchaseItems.filter(
      (item) => item.ingredientId && item.quantity > 0
    )
    const draftBills = draftPurchaseHistory.map((purchase) => ({
      name: purchase.vendor.trim() || "ไม่ระบุชื่อบิล",
      draftPurchaseIds: [purchase.id],
      items: [] as PurchaseItem[],
    }))

    if (items.length === 0 && draftBills.length === 0) {
      return {
        ok: false,
        error: "กรุณาเพิ่มรายการวัตถุดิบอย่างน้อย 1 รายการ",
      }
    }

    if (items.some((item) => !item.billName?.trim())) {
      return {
        ok: false,
        error: "กรุณาระบุชื่อบิลให้ครบทุกรายการ",
      }
    }

    if (purchaseBudgetStatus.isOverBudget) {
      return {
        ok: false,
        error: "งบประมาณรายวันของสาขาไม่เพียงพอ",
      }
    }

    try {
      const purchaseTimestamp = purchaseTimestampForSelectedDate(purchaseDate)

      await createPurchaseMutation.mutateAsync({
        branchId: activeBranchId,
        input: {
          purchaseDate: purchaseTimestamp.toISOString(),
          status: "saved",
          bills: [...draftBills, ...groupPurchaseItemsByBill(items)],
        },
      })
      updateActiveWorkspace((workspace) => ({
        ...workspace,
        purchaseItems: [],
        purchaseOrderDraftItems: [],
        purchaseOrderDraftSavedAt: null,
      }))
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: purchasesQueryKey(activeBranchId, purchaseDateKey),
        }),
        queryClient.invalidateQueries({
          queryKey: inventoryQueryKey(activeBranchId),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKey(activeBranchId),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationsQueryKey(activeBranchId),
        }),
        queryClient.invalidateQueries({ queryKey: reportsQueryKey }),
      ])

      return { ok: true }
    } catch (error) {
      const message = errorMessage(error, "ไม่สามารถบันทึกใบซื้อได้")
      setPurchaseMutationError(message)

      return { ok: false, error: message }
    }
  }

  async function updateBranchBudget(
    branchId: string,
    dailyPurchaseBudget: number | null
  ): Promise<ActionResult> {
    if (!currentMember || !branchId) {
      return {
        ok: false,
        error: "ยังไม่ได้เข้าสู่ระบบหรือเลือกสาขา",
      }
    }

    if (!canManageBranchBudget) {
      return {
        ok: false,
        error: "บัญชีนี้ไม่มีสิทธิ์ตั้งงบประมาณสาขา",
      }
    }

    const normalizedBudget =
      dailyPurchaseBudget === null ? null : Math.max(roundMoney(dailyPurchaseBudget), 0)

    try {
      await updateBranchBudgetMutation.mutateAsync({
        branchId,
        dailyPurchaseBudget: normalizedBudget,
      })

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error, "ไม่สามารถบันทึกงบประมาณสาขาได้"),
      }
    }
  }

  async function addIngredientFromPurchase(
    input: NewIngredientFromPurchaseInput
  ) {
    const name = input.name.trim()
    const unit = input.unit.trim() || "กก."
    const unitPrice = Math.max(input.unitPrice, 0)
    const supplier = input.supplier?.trim() || "ยังไม่ระบุ"

    if (!name || !activeBranchId) {
      return null
    }

    const existingIngredient = ingredientList.find(
      (ingredient) =>
        normalizeLookup(ingredient.name) === normalizeLookup(name) &&
        normalizeLookup(ingredient.unit) === normalizeLookup(unit)
    )

    if (existingIngredient) {
      return existingIngredient
    }

    if (!canEditPurchase) {
      return null
    }

    try {
      const row = await createIngredientMutation.mutateAsync({
        branchId: activeBranchId,
        input: { name, unit, unitPrice, supplier },
      })

      return row.ingredient
    } catch {
      return null
    }
  }

  async function updateInventoryItem(input: InventoryEditInput) {
    const name = input.name.trim()
    const unit = input.unit.trim() || "กก."

    if (!name) {
      return {
        ok: false,
        error: "กรุณากรอกชื่อวัตถุดิบ",
      }
    }

    if (!currentMember || !activeBranchId) {
      return {
        ok: false,
        error: "ยังไม่ได้เข้าสู่ระบบหรือเลือกสาขา",
      }
    }

    if (!canEditInventory) {
      return {
        ok: false,
        error: "บัญชีนี้ไม่มีสิทธิ์แก้ไขคลังวัตถุดิบ",
      }
    }

    try {
      await updateInventoryMutation.mutateAsync({
        branchId: activeBranchId,
        ingredientId: input.ingredientId,
        input: {
          name,
          category: input.category.trim() || "วัตถุดิบ",
          unit,
          defaultPrice: Math.max(input.defaultPrice, 0),
          supplier: input.supplier.trim() || "-",
          onHand: Math.max(input.onHand, 0),
          reorderPoint: Math.max(input.reorderPoint, 0),
          costPerUnit: Math.max(input.costPerUnit, 0),
        },
      })

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error, "ไม่สามารถบันทึกข้อมูลคลังวัตถุดิบได้"),
      }
    }
  }

  async function recordStockOut(input: StockOutInput): Promise<ActionResult> {
    if (!currentMember || !activeBranchId) {
      return {
        ok: false,
        error: "ยังไม่ได้เข้าสู่ระบบหรือเลือกสาขา",
      }
    }

    if (!canEditInventory) {
      return {
        ok: false,
        error: "บัญชีนี้ไม่มีสิทธิ์ตัดสต็อก",
      }
    }

    const item = inventoryRowByIngredientId.get(input.ingredientId)
    const quantity = Math.max(input.quantity, 0)

    if (!item) {
      return {
        ok: false,
        error: "กรุณาเลือกวัตถุดิบ",
      }
    }

    if (quantity <= 0 || quantity > item.onHand) {
      return {
        ok: false,
        error: "จำนวนที่ตัดต้องมากกว่า 0 และไม่เกินคงเหลือ",
      }
    }

    if (!input.reason.trim()) {
      return {
        ok: false,
        error: "กรุณาระบุเหตุผล",
      }
    }

    if (!input.photo.name || !input.photo.dataUrl) {
      return {
        ok: false,
        error: "กรุณาอัปโหลดรูปประกอบ",
      }
    }

    try {
      await createStockOutMutation.mutateAsync({
        branchId: activeBranchId,
        input: {
          ...input,
          quantity,
          reason: input.reason.trim(),
        },
      })

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error, "ไม่สามารถตัดสต็อกได้"),
      }
    }
  }

  async function submitUsageDraft(): Promise<ActionResult> {
    if (!currentMember || !activeBranchId) {
      return {
        ok: false,
        error: "ยังไม่ได้เข้าสู่ระบบหรือเลือกสาขา",
      }
    }

    if (!canEditUsage) {
      return {
        ok: false,
        error: "บัญชีนี้ไม่มีสิทธิ์ตัดคลังวัตถุดิบ",
      }
    }

    const groupsByBatchId = new Map<string, UsageDraftItem[]>()

    for (const item of usageItems) {
      const batchId = item.batchId ?? "legacy"
      groupsByBatchId.set(batchId, [...(groupsByBatchId.get(batchId) ?? []), item])
    }

    const groups = Array.from(groupsByBatchId, ([batchId, items]) => ({
      batchId,
      name: items[0]?.batchName?.trim() ?? "",
      reason: items[0]?.reason?.trim() ?? "",
      items: items
        .map((item) => ({
          ingredientId: item.ingredientId,
          quantity: Math.max(item.quantity, 0),
        }))
        .filter((item) => item.ingredientId && item.quantity > 0),
    }))

    if (groups.length === 0 || groups.some((group) => group.items.length === 0)) {
      return {
        ok: false,
        error: "กรุณาเพิ่มรายการของใช้ไปให้ครบทุกรอบ",
      }
    }

    if (groups.some((group) => !group.name)) {
      return {
        ok: false,
        error: "กรุณาระบุชื่อให้ครบทุกรอบ",
      }
    }

    if (groups.some((group) => !group.reason)) {
      return {
        ok: false,
        error: "กรุณาระบุเหตุผลรวมให้ครบทุกรอบ",
      }
    }

    const quantityByIngredientId = new Map<string, number>()

    for (const item of groups.flatMap((group) => group.items)) {
      quantityByIngredientId.set(
        item.ingredientId,
        roundQuantity(
          (quantityByIngredientId.get(item.ingredientId) ?? 0) + item.quantity
        )
      )
    }

    for (const [ingredientId, quantity] of quantityByIngredientId) {
      const inventoryRow = inventoryRowByIngredientId.get(ingredientId)

      if (!inventoryRow) {
        return {
          ok: false,
          error: "กรุณาเลือกวัตถุดิบให้ครบทุกแถว",
        }
      }

      if (quantity > inventoryRow.onHand) {
        return {
          ok: false,
          error: `${inventoryRow.ingredient.name} คงเหลือไม่พอสำหรับตัดคลัง`,
        }
      }
    }

    try {
      const usageTimestamp = purchaseTimestampForSelectedDate(usageDate)

      await createUsageMutation.mutateAsync({
        branchId: activeBranchId,
        input: {
          occurredAt: usageTimestamp.toISOString(),
          groups,
        },
      })
      updateActiveWorkspace((workspace) => ({
        ...workspace,
        usageItems: [],
      }))

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error, "ไม่สามารถบันทึกของใช้ไปได้"),
      }
    }
  }

  async function refreshRecipeAndInventory(branchId: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: recipesQueryKey(branchId) }),
      queryClient.invalidateQueries({ queryKey: inventoryQueryKey(branchId) }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey(branchId) }),
      queryClient.invalidateQueries({ queryKey: reportsQueryKey }),
    ])
  }

  function recipeAuthError(): ActionResult | null {
    if (!currentMember || !activeBranchId) {
      return {
        ok: false,
        error: "ยังไม่ได้เข้าสู่ระบบหรือเลือกสาขา",
      }
    }

    if (!canEditRecipes) {
      return {
        ok: false,
        error: "บัญชีนี้ไม่มีสิทธิ์เพิ่ม ลบ หรือแก้ไขสูตรอาหาร",
      }
    }

    return null
  }

  async function addRecipe(input: RecipeFormInput): Promise<ActionResult> {
    const authError = recipeAuthError()
    const normalizedInput = normalizeRecipeInput(input)

    if (authError) {
      return authError
    }

    if (!normalizedInput) {
      return {
        ok: false,
        error: "กรุณากรอกชื่อเมนู และเพิ่มวัตถุดิบอย่างน้อย 1 รายการ",
      }
    }

    try {
      const createdRecipe = await createRecipeMutation.mutateAsync({
        branchId: activeBranchId,
        input: normalizedInput,
      })
      await pinRecipeMutation.mutateAsync({
        branchId: activeBranchId,
        recipeId: createdRecipe.id,
      })
      await refreshRecipeAndInventory(activeBranchId)

      return { ok: true }
    } catch (error) {
      const message = errorMessage(error, "ไม่สามารถสร้างสูตรอาหารได้")
      setRecipeMutationError(message)
      void refreshRecipeAndInventory(activeBranchId)

      return { ok: false, error: message }
    }
  }

  async function updateRecipe(
    recipeId: string,
    input: RecipeFormInput
  ): Promise<ActionResult> {
    const authError = recipeAuthError()
    const normalizedInput = normalizeRecipeInput(input)

    if (authError) {
      return authError
    }

    if (!normalizedInput) {
      return {
        ok: false,
        error: "กรุณากรอกชื่อเมนู และเพิ่มวัตถุดิบอย่างน้อย 1 รายการ",
      }
    }

    try {
      await updateRecipeMutation.mutateAsync({
        branchId: activeBranchId,
        recipeId,
        input: normalizedInput,
      })
      await refreshRecipeAndInventory(activeBranchId)

      return { ok: true }
    } catch (error) {
      const message = errorMessage(error, "ไม่สามารถแก้ไขสูตรอาหารได้")
      setRecipeMutationError(message)

      return { ok: false, error: message }
    }
  }

  async function deleteRecipe(recipeId: string): Promise<ActionResult> {
    const authError = recipeAuthError()

    if (authError) {
      return authError
    }

    try {
      await deleteRecipeMutation.mutateAsync({
        branchId: activeBranchId,
        recipeId,
      })
      await refreshRecipeAndInventory(activeBranchId)

      return { ok: true }
    } catch (error) {
      const message = errorMessage(error, "ไม่สามารถลบสูตรอาหารได้")
      setRecipeMutationError(message)

      return { ok: false, error: message }
    }
  }

  async function pinRecipe(recipeId: string): Promise<ActionResult> {
    const authError = recipeAuthError()

    if (authError) {
      return authError
    }

    if (!recipeList.some((recipe) => recipe.id === recipeId)) {
      return {
        ok: false,
        error: "ไม่พบสูตรอาหารที่ต้องการปักหมุด",
      }
    }

    try {
      await pinRecipeMutation.mutateAsync({
        branchId: activeBranchId,
        recipeId,
      })
      await refreshRecipeAndInventory(activeBranchId)

      return { ok: true }
    } catch (error) {
      const message = errorMessage(error, "ไม่สามารถปักหมุดสูตรอาหารได้")
      setRecipeMutationError(message)

      return { ok: false, error: message }
    }
  }

  async function unpinRecipe(recipeId: string): Promise<ActionResult> {
    const authError = recipeAuthError()

    if (authError) {
      return authError
    }

    try {
      await unpinRecipeMutation.mutateAsync({
        branchId: activeBranchId,
        recipeId,
      })
      await refreshRecipeAndInventory(activeBranchId)

      return { ok: true }
    } catch (error) {
      const message = errorMessage(error, "ไม่สามารถถอนปักหมุดสูตรอาหารได้")
      setRecipeMutationError(message)

      return { ok: false, error: message }
    }
  }

  async function cookRecipe(recipeId: string): Promise<ActionResult> {
    const authError = recipeAuthError()
    const recipeImpact = recipeImpacts.find((item) => item.id === recipeId)
    const plan = recipePlanByRecipeId[recipeId]

    if (authError) {
      return authError
    }

    if (!recipeImpact?.isPinned || recipeImpact.isCooked || !recipeImpact.canProduce) {
      return {
        ok: false,
        error: "ยังปรุงไม่ได้ กรุณาตรวจสอบวัตถุดิบคงเหลือก่อน",
      }
    }

    if (!plan || plan.status !== "pinned") {
      return {
        ok: false,
        error: "ไม่พบแผนสูตรอาหารที่ปักหมุด",
      }
    }

    try {
      await cookRecipeMutation.mutateAsync({
        branchId: activeBranchId,
        planId: plan.id,
      })
      await refreshRecipeAndInventory(activeBranchId)

      return { ok: true }
    } catch (error) {
      const message = errorMessage(error, "ไม่สามารถปรุงรายการอาหารได้")
      setRecipeMutationError(message)

      return { ok: false, error: message }
    }
  }

  function sanitizeBranchIds(branchIds: string[], role?: MemberRole) {
    const allowedBranchIds =
      currentMember?.role === "owner"
        ? branches.map((branch) => branch.id)
        : accessibleBranchIds
    const allowed = new Set(allowedBranchIds)
    const sanitized = branchIds.filter((branchId) => allowed.has(branchId))
    const roleScoped =
      role === "staff" ? sanitized.slice(0, 1) : sanitized

    return roleScoped.length > 0
      ? roleScoped
      : activeBranchId
        ? [activeBranchId]
        : allowedBranchIds.slice(0, 1)
  }

  async function addMember(input: MemberFormInput): Promise<boolean> {
    const trimmedUsername = input.username.trim().toLowerCase()
    const branchIds = sanitizeBranchIds(input.branchIds, input.role)

    if (
      !input.name.trim() ||
      !trimmedUsername ||
      input.password.trim().length < 6 ||
      branchIds.length === 0
    ) {
      return false
    }

    try {
      await addMemberMutation.mutateAsync({
        name: input.name.trim(),
        username: trimmedUsername,
        password: input.password.trim(),
        role: input.role,
        branchIds,
      })
      return true
    } catch {
      return false
    }
  }

  function updateMemberRole(memberId: string, role: MemberRole) {
    setMembers((items) =>
      items.map((member) =>
        member.id === memberId
          ? {
              ...member,
              role,
              permissions: canManageMenuPermissions
                ? normalizeMemberPermissions(role)
                : member.permissions,
            }
          : member
      )
    )
    setCurrentMember((member) =>
      member?.id === memberId
        ? {
            ...member,
            role,
            permissions: canManageMenuPermissions
              ? normalizeMemberPermissions(role)
              : member.permissions,
          }
        : member
    )
    updateMemberMutation.mutate({ memberId, input: { role } })
  }

  function updateMemberStatus(memberId: string, status: MemberStatus) {
    setMembers((items) =>
      items.map((member) =>
        member.id === memberId ? { ...member, status } : member
      )
    )
    setCurrentMember((member) =>
      member?.id === memberId && status !== "active" ? null : member
    )
    if (currentMember?.id === memberId && status !== "active") {
      clearMemberSession()
      clearBranchSession()
    }
    updateMemberMutation.mutate({ memberId, input: { status } })
  }

  function updateMemberBranches(memberId: string, branchIds: string[]) {
    const targetMember = members.find((member) => member.id === memberId)
    const nextBranchIds = sanitizeBranchIds(branchIds, targetMember?.role)

    setMembers((items) =>
      items.map((member) =>
        member.id === memberId
          ? {
              ...member,
              branchIds: nextBranchIds,
              primaryBranchId: nextBranchIds[0],
            }
          : member
      )
    )
    setCurrentMember((member) =>
      member?.id === memberId
        ? {
            ...member,
            branchIds: nextBranchIds,
            primaryBranchId: nextBranchIds[0],
          }
        : member
    )
    updateMemberMutation.mutate({ memberId, input: { branchIds: nextBranchIds } })
  }

  async function updateMemberProfile(
    memberId: string,
    input: MemberProfileInput
  ): Promise<boolean> {
    const nextName = input.name.trim()
    const nextUsername = input.username.trim().toLowerCase()
    const nextPassword = input.password?.trim()

    if (
      !nextName ||
      !nextUsername ||
      (input.password !== undefined && (!nextPassword || nextPassword.length < 6))
    ) {
      return false
    }

    setMembers((items) =>
      items.map((member) =>
        member.id === memberId
          ? {
              ...member,
              name: nextName,
              username: nextUsername,
              permissions: input.permissions ?? member.permissions,
            }
          : member
      )
    )
    setCurrentMember((member) =>
      member?.id === memberId
        ? {
            ...member,
            name: nextName,
            username: nextUsername,
            permissions: input.permissions ?? member.permissions,
          }
        : member
    )

    try {
      await updateMemberMutation.mutateAsync({
        memberId,
        input: {
          name: nextName,
          username: nextUsername,
          ...(nextPassword ? { password: nextPassword } : {}),
          ...(input.permissions ? { permissions: input.permissions } : {}),
        },
      })
      return true
    } catch {
      return false
    }
  }


  return {
    activeView: effectiveActiveView,
    setActiveView,
    currentMember,
    isAuthReady,
    isLoginPending: loginMutation.isPending,
    login,
    logout,
    branches,
    activeBranch,
    activeBranchId,
    accessibleBranches,
    setActiveBranch,
    dashboardSummary,
    isDashboardLoading,
    dashboardError,
    notifications:
      (notificationsQuery.data?.notifications ?? []) as SystemNotification[],
    notificationRecentCount: notificationsQuery.data?.recentCount ?? 0,
    notificationHasMore: notificationsQuery.data?.pageInfo.hasMore ?? false,
    isNotificationsLoading: notificationsQuery.isPending,
    notificationError: notificationsQuery.isError
      ? errorMessage(
          notificationsQuery.error,
          "ไม่สามารถโหลดการแจ้งเตือนได้"
        )
      : "",
    refreshNotifications: () => notificationsQuery.refetch(),
    purchaseDate,
    setPurchaseDate,
    purchaseItems,
    purchaseDateKey,
    usageDate,
    usageDateKey,
    usageItems,
    usageMovements,
    usageReasons,
    setUsageDate,
    updateUsageItem,
    addUsageItem,
    addUsageBatch,
    addUsageItemToBatch,
    renameUsageBatch,
    updateUsageBatchReason,
    removeUsageBatch,
    removeUsageItem,
    submitUsageDraft,
    draftPurchasesForDate: draftPurchaseHistory,
    savedPurchasesForDate: savedPurchaseHistory,
    savedPurchaseTotalForDate,
    purchaseBudgetStatus,
    canEditPurchase,
    updatePurchaseItem,
    addPurchaseItem,
    addPurchaseBill,
    addPurchaseItemToBill,
    renamePurchaseBill,
    removePurchaseBill,
    addSuggestedPurchaseItems,
    removePurchaseItem,
    savePurchaseDraft,
    deletePurchaseDraft,
    deletePurchaseDraftItem,
    submitPurchase,
    isPurchasesLoading,
    isUsageMovementsLoading,
    isUsageReasonsLoading: usageReasonsQuery.isPending && shouldLoadUsageReasons,
    isPurchaseSaving: createPurchaseMutation.isPending,
    isUsageSaving: createUsageMutation.isPending,
    isPurchaseDraftDeleting:
      deletePurchaseDraftMutation.isPending ||
      deletePurchaseDraftItemMutation.isPending,
    purchaseError,
    usageError,
    canManageBranchBudget,
    isBranchBudgetSaving: updateBranchBudgetMutation.isPending,
    updateBranchBudget,
    ingredients: ingredientList,
    ingredientById,
    inventoryItems: inventoryList,
    inventoryRows,
    isInventoryLoading,
    isInventorySaving: updateInventoryMutation.isPending,
    isIngredientSaving: createIngredientMutation.isPending,
    isStockOutSaving: createStockOutMutation.isPending,
    inventoryError,
    canEditInventory,
    canEditRecipes,
    canEditUsage,
    addIngredientFromPurchase,
    updateInventoryItem,
    recordStockOut,
    lowStockItems,
    purchaseOrderRows,
    purchaseOrderSource,
    purchaseOrderDraftItems,
    purchaseOrderDraftSavedAt,
    currentPurchaseTotal,
    purchaseSeries: reportPurchaseSeries,
    cashFlowMetrics: activeCashFlowMetrics,
    reportPurchaseSeries,
    reportBranchPurchaseSeries,
    dailyBudgetUsageByBranch,
    reportCashFlowMetrics,
    reportBranchSummary,
    isReportsLoading,
    reportsError,
    recipeImpacts,
    pinnedRecipeImpacts,
    recipeStats,
    isRecipesLoading,
    isRecipeSaving,
    recipeError,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    pinRecipe,
    unpinRecipe,
    cookRecipe,
    members,
    memberStats,
    canManageMembers,
    canManageMenuPermissions,
    memberError,
    isMembersLoading: membersQuery.isPending && shouldLoadMembers,
    isMemberSaving: addMemberMutation.isPending || updateMemberMutation.isPending,
    addMember,
    updateMemberRole,
    updateMemberStatus,
    updateMemberBranches,
    updateMemberProfile,
  }
}

export type EasyReceiptStore = ReturnType<typeof useEasyReceiptStore>
