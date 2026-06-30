"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  branches as initialBranches,
  historicalPurchases,
  ingredients as initialIngredients,
  initialPurchaseItems,
  inventoryItems as initialInventoryItems,
  members as initialMembers,
  recipes,
  type Branch,
  type CashFlowMetric,
  type Ingredient,
  type InventoryItem,
  type Member,
  type MemberRole,
  type MemberStatus,
  type PurchaseItem,
  type Recipe,
  type ViewId,
} from "@/lib/easyreceipt-data"
import {
  apiGetBranchInventory,
  apiGetCurrentMember,
  apiLogin,
  apiLogout,
  apiUpdateBranchInventory,
  type NormalizedInventoryRow,
  type NormalizedInventorySnapshot,
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

export type MemberFormInput = {
  name: string
  email: string
  role: MemberRole
  branchIds: string[]
}

export type RecipeFormInput = Omit<Recipe, "id">

export type NewIngredientFromPurchaseInput = {
  name: string
  unit: string
  unitPrice: number
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

type PurchaseStockEntry = {
  ingredientId: string
  quantity: number
}

type InventoryAdjustment = {
  ingredientId: string
  delta: number
}

export type BranchWorkspace = {
  branchId: string
  ingredients: Ingredient[]
  inventoryItems: InventoryItem[]
  recipes: Recipe[]
  pinnedRecipeIds: Set<string>
  cookedRecipeIds: Set<string>
  purchaseDate: Date
  purchaseItems: PurchaseItem[]
  purchaseStockLedger: Record<string, PurchaseStockEntry>
}

export type BranchReportSummary = {
  branchCount: number
  branchNames: string[]
  helper: string
}

const today = new Date("2026-06-27T08:00:00+07:00")
const todayIso = "2026-06-27"
const sessionMemberKey = "easyreceipt.memberId"
const sessionBranchKey = "easyreceipt.branchId"
const authSessionQueryKey = ["easyreceipt", "auth", "me"] as const
const inventoryQueryKey = (branchId: string) =>
  ["easyreceipt", "inventory", branchId] as const
const activeMemberLabel = "กำลังใช้งาน"

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

function purchaseTotal(items: PurchaseItem[]) {
  return items.reduce((total, item) => total + purchaseItemTotal(item), 0)
}

function stockStatus(item: InventoryItem) {
  if (item.onHand <= item.reorderPoint) {
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

function normalizeLookup(value: string) {
  return value.trim().toLocaleLowerCase("th-TH")
}

function roundQuantity(value: number) {
  return Math.round(value * 100) / 100
}

function createIngredientId(name: string, ingredients: Ingredient[]) {
  const normalizedName = normalizeLookup(name)
  const base =
    normalizedName
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "ingredient"
  const existingIds = new Set(ingredients.map((ingredient) => ingredient.id))
  let candidate = base
  let index = 2

  while (existingIds.has(candidate)) {
    candidate = `${base}-${index}`
    index += 1
  }

  return candidate
}

function createPurchaseStockLedger(items: PurchaseItem[]) {
  return items.reduce<Record<string, PurchaseStockEntry>>((ledger, item) => {
    ledger[item.id] = {
      ingredientId: item.ingredientId,
      quantity: Math.max(item.quantity, 0),
    }

    return ledger
  }, {})
}

function applyInventoryAdjustments(
  items: InventoryItem[],
  adjustments: InventoryAdjustment[]
) {
  const deltaByIngredient = new Map<string, number>()

  for (const adjustment of adjustments) {
    if (!adjustment.ingredientId || adjustment.delta === 0) {
      continue
    }

    deltaByIngredient.set(
      adjustment.ingredientId,
      (deltaByIngredient.get(adjustment.ingredientId) ?? 0) + adjustment.delta
    )
  }

  if (deltaByIngredient.size === 0) {
    return items
  }

  return items.map((item) => {
    const delta = deltaByIngredient.get(item.ingredientId) ?? 0

    if (delta === 0) {
      return item
    }

    return {
      ...item,
      onHand: Math.max(roundQuantity(item.onHand + delta), 0),
      lastUpdated: todayIso,
    }
  })
}

function branchFactor(branchIndex: number) {
  return 1 + branchIndex * 0.08
}

function createInitialBranchIngredients(branchIndex: number) {
  const factor = branchFactor(branchIndex)

  return initialIngredients.map((ingredient) => ({
    ...ingredient,
    defaultPrice: roundQuantity(ingredient.defaultPrice * factor),
  }))
}

function createInitialBranchPurchaseItems(branch: Branch, branchIndex: number) {
  const factor = branchFactor(branchIndex)

  return initialPurchaseItems.map((item) => ({
    ...item,
    id: `${branch.id}-${item.id}`,
    quantity: roundQuantity(item.quantity * factor),
    unitPrice: roundQuantity(item.unitPrice * factor),
  }))
}

function createInitialBranchInventory(
  branchIndex: number,
  purchaseItems: PurchaseItem[]
) {
  const factor = branchFactor(branchIndex)
  const baseInventory = initialInventoryItems.map((item) => ({
    ...item,
    onHand: roundQuantity(item.onHand * factor + branchIndex),
    costPerUnit: roundQuantity(item.costPerUnit * factor),
    lastUpdated: branchIndex % 2 === 0 ? item.lastUpdated : "2026-06-26",
  }))

  return applyInventoryAdjustments(
    baseInventory,
    purchaseItems.map((item) => ({
      ingredientId: item.ingredientId,
      delta: item.quantity,
    }))
  )
}

function createInitialBranchRecipes(branchIndex: number) {
  return recipes.map((recipe) => ({
    ...recipe,
    yield: recipe.yield + branchIndex * 2,
    pricePerServing: recipe.pricePerServing + branchIndex * 5,
    ingredients: recipe.ingredients.map((item) => ({ ...item })),
  }))
}

function createInitialBranchWorkspace(
  branch: Branch,
  branchIndex: number
): BranchWorkspace {
  const purchaseItems = createInitialBranchPurchaseItems(branch, branchIndex)
  const branchRecipes = createInitialBranchRecipes(branchIndex)

  return {
    branchId: branch.id,
    ingredients: createInitialBranchIngredients(branchIndex),
    inventoryItems: createInitialBranchInventory(branchIndex, purchaseItems),
    recipes: branchRecipes,
    pinnedRecipeIds: new Set(branchRecipes.map((recipe) => recipe.id)),
    cookedRecipeIds: new Set(),
    purchaseDate: new Date(today),
    purchaseItems,
    purchaseStockLedger: createPurchaseStockLedger(purchaseItems),
  }
}

function createInitialBranchWorkspaces() {
  return initialBranches.reduce<Record<string, BranchWorkspace>>(
    (workspaces, branch, index) => {
      workspaces[branch.id] = createInitialBranchWorkspace(branch, index)
      return workspaces
    },
    {}
  )
}

function mergeInventorySnapshot(
  workspace: BranchWorkspace,
  snapshot: NormalizedInventorySnapshot
) {
  const apiIngredientIds = new Set(
    snapshot.ingredients.map((ingredient) => ingredient.id)
  )
  const apiInventoryIds = new Set(
    snapshot.inventoryItems.map((item) => item.ingredientId)
  )

  return {
    ...workspace,
    ingredients: [
      ...snapshot.ingredients,
      ...workspace.ingredients.filter(
        (ingredient) => !apiIngredientIds.has(ingredient.id)
      ),
    ],
    inventoryItems: [
      ...snapshot.inventoryItems,
      ...workspace.inventoryItems.filter(
        (item) => !apiInventoryIds.has(item.ingredientId)
      ),
    ],
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

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function getMemberBranchIds(member: Member | null) {
  if (!member) {
    return []
  }

  if (member.role === "owner") {
    return initialBranches.map((branch) => branch.id)
  }

  const validBranchIds = new Set(initialBranches.map((branch) => branch.id))
  const branchIds = member.branchIds.filter((branchId) =>
    validBranchIds.has(branchId)
  )

  if (branchIds.length > 0) {
    if (member.role === "staff" || member.role === "viewer") {
      return branchIds.slice(0, 1)
    }

    return branchIds
  }

  if (validBranchIds.has(member.primaryBranchId)) {
    return [member.primaryBranchId]
  }

  return initialBranches[0] ? [initialBranches[0].id] : []
}

function preferredBranchId(member: Member, requestedBranchId?: string | null) {
  const accessibleBranchIds = getMemberBranchIds(member)

  if (requestedBranchId && accessibleBranchIds.includes(requestedBranchId)) {
    return requestedBranchId
  }

  if (accessibleBranchIds.includes(member.primaryBranchId)) {
    return member.primaryBranchId
  }

  return accessibleBranchIds[0] ?? initialBranches[0]?.id ?? ""
}

function createCashFlowMetricsForWorkspaces(workspaces: BranchWorkspace[]) {
  const currentPurchaseTotal = workspaces.reduce(
    (total, workspace) => total + purchaseTotal(workspace.purchaseItems),
    0
  )
  const ingredientCost = workspaces.reduce((total, workspace) => {
    const inventoryByIngredient = new Map(
      workspace.inventoryItems.map((item) => [item.ingredientId, item] as const)
    )

    return (
      total +
      workspace.recipes.reduce((recipeTotal, recipe) => {
        return (
          recipeTotal +
          recipe.ingredients.reduce((ingredientTotal, ingredient) => {
            const inventoryItem = inventoryByIngredient.get(
              ingredient.ingredientId
            )

            return (
              ingredientTotal +
              ingredient.quantity * (inventoryItem?.costPerUnit ?? 0)
            )
          }, 0)
        )
      }, 0)
    )
  }, currentPurchaseTotal)
  const sales = workspaces.reduce((total, workspace) => {
    return (
      total +
      workspace.recipes.reduce(
        (recipeTotal, recipe) => recipeTotal + recipe.yield * recipe.pricePerServing,
        0
      )
    )
  }, 0)

  return [
    {
      id: "ingredient-cost",
      label: "ต้นทุนวัตถุดิบ",
      value: ingredientCost,
      delta: -3.2,
      kind: "expense",
    },
    {
      id: "margin",
      label: "กำไรขั้นต้น",
      value: Math.max(sales - ingredientCost, 0),
      delta: 6.8,
      kind: "margin",
    },
  ] satisfies CashFlowMetric[]
}

function createPurchaseSeriesForWorkspaces(
  workspaces: BranchWorkspace[],
  branchIds: string[]
) {
  const totalsByLabel = new Map<string, number>()

  for (const purchase of historicalPurchases) {
    const label = dayLabel(purchase.date)
    const baseTotal = purchaseTotal(purchase.items)
    const total = branchIds.reduce((sum, branchId) => {
      const branchIndex = Math.max(
        initialBranches.findIndex((branch) => branch.id === branchId),
        0
      )

      return sum + baseTotal * branchFactor(branchIndex)
    }, 0)

    totalsByLabel.set(label, (totalsByLabel.get(label) ?? 0) + total)
  }

  totalsByLabel.set(
    "วันนี้",
    workspaces.reduce(
      (total, workspace) => total + purchaseTotal(workspace.purchaseItems),
      0
    )
  )

  return Array.from(totalsByLabel.entries()).map(([label, total]) => ({
    label,
    total,
  }))
}

export function useEasyReceiptStore() {
  const queryClient = useQueryClient()
  const [activeView, setActiveView] = useState<ViewId>("dashboard")
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [activeBranchId, setActiveBranchId] = useState(
    initialBranches[0]?.id ?? ""
  )
  const [branchWorkspaces, setBranchWorkspaces] = useState(() =>
    createInitialBranchWorkspaces()
  )
  const [inventoryMutationError, setInventoryMutationError] = useState("")
  // คำสั่งดึงข้อมูลสมาชิกจาก API หลังบ้าน
  useEffect(() => {
    const fetchRealMembers = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/v1/members", {
          method: "GET",
          credentials: "include", // ต้องมีบรรทัดนี้เพื่อส่งคุกกี้/สิทธิ์การล็อกอินไปด้วย
        });
        
        const result = await response.json();
        
        if (result.members) {
  // ปรับโครงสร้างข้อมูลให้มี branchIds ตามที่หน้าเว็บต้องการ
  const formattedMembers = result.members.map((member: any) => ({
    ...member,
    branchIds: member.branchIds || (member.branches ? member.branches.map((b: any) => b.id) : [])
  }));

  // เอาข้อมูลที่ปรับแต่งแล้วไปใส่ State
  setMembers(formattedMembers); 
}
      } catch (error) {
        console.error("ดึงข้อมูลสมาชิกจาก API ไม่สำเร็จ:", error);
      }
    };

    // สั่งให้ฟังก์ชันทำงานทันทีที่โหลดหน้านี้
    fetchRealMembers();
  }, []);

  const activeWorkspace =
    branchWorkspaces[activeBranchId] ??
    Object.values(branchWorkspaces)[0] ??
    createInitialBranchWorkspace(initialBranches[0], 0)

  const syncBranchInventorySnapshot = useCallback(
    (branchId: string, snapshot: NormalizedInventorySnapshot) => {
      setBranchWorkspaces((workspaces) => {
        const workspace = workspaces[branchId]

        if (!workspace) {
          return workspaces
        }

        return {
          ...workspaces,
          [branchId]: mergeInventorySnapshot(workspace, snapshot),
        }
      })
    },
    []
  )

  const syncBranchInventoryRow = useCallback(
    (branchId: string, row: NormalizedInventoryRow) => {
      setBranchWorkspaces((workspaces) => {
        const workspace = workspaces[branchId]

        if (!workspace) {
          return workspaces
        }

        return {
          ...workspaces,
          [branchId]: mergeInventoryRow(workspace, row),
        }
      })
    },
    []
  )

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
        : [...items, nextMember]
    })
    setActiveBranchId(nextBranchId)
    saveMemberSession(member.id)
    saveBranchSession(nextBranchId)
    setActiveView("dashboard")
  }, [])

  const clearAuthenticatedMember = useCallback(() => {
    clearMemberSession()
    clearBranchSession()
    setCurrentMember(null)
    setActiveBranchId(initialBranches[0]?.id ?? "")
    setActiveView("dashboard")
  }, [])

  const authSessionQuery = useQuery({
    queryKey: authSessionQueryKey,
    queryFn: apiGetCurrentMember,
    staleTime: 60_000,
  })

  const loginMutation = useMutation({
    mutationFn: apiLogin,
    onSuccess: (member) => {
      queryClient.setQueryData(authSessionQueryKey, member)
      syncAuthenticatedMember(member)
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

  const inventoryQuery = useQuery({
    queryKey: inventoryQueryKey(activeBranchId),
    queryFn: () => apiGetBranchInventory(activeBranchId),
    enabled: Boolean(currentMember && activeBranchId),
    staleTime: 15_000,
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
    },
    onError: (error) => {
      setInventoryMutationError(
        errorMessage(error, "Inventory could not be updated.")
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
    if (!inventoryQuery.data) {
      return
    }

    const branchId = activeBranchId
    const timeoutId = window.setTimeout(() => {
      syncBranchInventorySnapshot(branchId, inventoryQuery.data)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [activeBranchId, inventoryQuery.data, syncBranchInventorySnapshot])

  const accessibleBranchIds = useMemo(
    () => getMemberBranchIds(currentMember),
    [currentMember]
  )
  const accessibleBranches = useMemo(() => {
    const allowed = new Set(accessibleBranchIds)
    return initialBranches.filter((branch) => allowed.has(branch.id))
  }, [accessibleBranchIds])

  useEffect(() => {
    if (!currentMember || accessibleBranchIds.length === 0) {
      return
    }

    if (accessibleBranchIds.includes(activeBranchId)) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const nextBranchId = preferredBranchId(currentMember)
      setActiveBranchId(nextBranchId)
      saveBranchSession(nextBranchId)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [accessibleBranchIds, activeBranchId, currentMember])

  const activeBranch =
    initialBranches.find((branch) => branch.id === activeBranchId) ??
    accessibleBranches[0] ??
    initialBranches[0]

  const ingredientList = activeWorkspace.ingredients
  const inventoryList = activeWorkspace.inventoryItems
  const recipeList = activeWorkspace.recipes
  const pinnedRecipeIds = activeWorkspace.pinnedRecipeIds
  const cookedRecipeIds = activeWorkspace.cookedRecipeIds
  const purchaseDate = activeWorkspace.purchaseDate
  const purchaseItems = activeWorkspace.purchaseItems

  function updateActiveWorkspace(
    updater: (workspace: BranchWorkspace) => BranchWorkspace
  ) {
    setBranchWorkspaces((workspaces) => {
      const workspace = workspaces[activeBranchId]

      if (!workspace) {
        return workspaces
      }

      return {
        ...workspaces,
        [activeBranchId]: updater(workspace),
      }
    })
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

  const incomingByIngredient = useMemo(() => {
    const incoming = new Map<string, number>()

    for (const item of purchaseItems) {
      incoming.set(
        item.ingredientId,
        (incoming.get(item.ingredientId) ?? 0) + item.quantity
      )
    }

    return incoming
  }, [purchaseItems])

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

  const inventoryRows = useMemo<InventoryRow[]>(
    () =>
      inventoryList.map((item) => {
        const ingredient = ingredientById.get(item.ingredientId)

        if (!ingredient) {
          throw new Error(`Missing ingredient ${item.ingredientId}`)
        }

        const incoming = incomingByIngredient.get(item.ingredientId) ?? 0
        const reserved = Math.max(
          item.reserved,
          reservedByIngredient.get(item.ingredientId) ?? 0
        )
        const available = Math.max(item.onHand - reserved, 0)
        const suggestedPurchaseQuantity = Math.max(reserved - item.onHand, 0)
        const stockPercent = Math.min(
          Math.round((available / Math.max(item.reorderPoint * 2, 1)) * 100),
          100
        )

        return {
          ...item,
          ingredient,
          reserved,
          incoming,
          projected: item.onHand,
          available,
          suggestedPurchaseQuantity,
          status: stockStatus({ ...item, onHand: available }),
          stockPercent,
        }
      }),
    [ingredientById, incomingByIngredient, inventoryList, reservedByIngredient]
  )

  const lowStockItems = useMemo(
    () =>
      inventoryRows
        .filter((item) => item.suggestedPurchaseQuantity > 0)
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

  const activeCashFlowMetrics = useMemo(
    () =>
      createCashFlowMetricsForWorkspaces(activeWorkspace ? [activeWorkspace] : []),
    [activeWorkspace]
  )

  const recipeImpacts = useMemo<RecipeImpact[]>(
    () => {
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

                const totalReserved =
                  reservedByIngredient.get(item.ingredientId) ?? 0
                const competingReserved = Math.max(
                  totalReserved - item.quantity,
                  0
                )
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
    },
    [
      cookedRecipeIds,
      ingredientById,
      inventoryRowByIngredientId,
      pinnedRecipeIds,
      recipeList,
      reservedByIngredient,
    ]
  )

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
      invited: members.filter((member) => member.status === "invited").length,
      managers: members.filter(
        (member) => member.role === "owner" || member.role === "manager"
      ).length,
    }
  }, [members])

  const canManageMembers =
    currentMember?.role === "owner" || currentMember?.role === "manager"

  const reportWorkspaces = useMemo(
    () =>
      accessibleBranchIds
        .map((branchId) => branchWorkspaces[branchId])
        .filter((workspace): workspace is BranchWorkspace => Boolean(workspace)),
    [accessibleBranchIds, branchWorkspaces]
  )
  const reportPurchaseSeries = useMemo(
    () => createPurchaseSeriesForWorkspaces(reportWorkspaces, accessibleBranchIds),
    [accessibleBranchIds, reportWorkspaces]
  )
  const reportCashFlowMetrics = useMemo(
    () => createCashFlowMetricsForWorkspaces(reportWorkspaces),
    [reportWorkspaces]
  )
  const reportBranchSummary = useMemo<BranchReportSummary>(
    () => ({
      branchCount: accessibleBranches.length,
      branchNames: accessibleBranches.map((branch) => branch.name),
      helper: `สรุปรวม ${accessibleBranches.length} สาขาที่มีสิทธิ์`,
    }),
    [accessibleBranches]
  )
  const inventoryError =
    inventoryMutationError ||
    (inventoryQuery.isError
      ? errorMessage(
          inventoryQuery.error,
          "ไม่สามารถโหลดข้อมูลคลังวัตถุดิบได้"
        )
      : "")
  const isInventoryLoading =
    inventoryQuery.isPending && Boolean(currentMember && activeBranchId)

  function setActiveBranch(branchId: string) {
    if (!currentMember || !accessibleBranchIds.includes(branchId)) {
      return false
    }

    setActiveBranchId(branchId)
    saveBranchSession(branchId)

    return true
  }

  function setPurchaseDate(date: Date) {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      purchaseDate: date,
    }))
  }

  async function login(email: string, password: string) {
    const member = await loginMutation
      .mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      })
      .catch(() => null)

    if (!member || member.status !== "active") {
      return false
    }

    return true
  }

  function logout() {
    queryClient.setQueryData(authSessionQueryKey, null)
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

      const branchIngredientById = new Map(
        workspace.ingredients.map((ingredient) => [
          ingredient.id,
          ingredient,
        ] as const)
      )
      const nextItem = { ...currentItem, ...patch }

      if (
        patch.ingredientId &&
        patch.ingredientId !== currentItem.ingredientId
      ) {
        const ingredient = branchIngredientById.get(patch.ingredientId)

        if (ingredient) {
          nextItem.unit = ingredient.unit
          nextItem.unitPrice = ingredient.defaultPrice
        }
      }

      const previousStock = workspace.purchaseStockLedger[itemId] ?? {
        ingredientId: currentItem.ingredientId,
        quantity: 0,
      }
      const nextStock = {
        ingredientId: nextItem.ingredientId,
        quantity: Math.max(nextItem.quantity, 0),
      }

      return {
        ...workspace,
        inventoryItems: applyInventoryAdjustments(workspace.inventoryItems, [
          {
            ingredientId: previousStock.ingredientId,
            delta: -previousStock.quantity,
          },
          {
            ingredientId: nextStock.ingredientId,
            delta: nextStock.quantity,
          },
        ]),
        purchaseStockLedger: {
          ...workspace.purchaseStockLedger,
          [itemId]: nextStock,
        },
        purchaseItems: workspace.purchaseItems.map((item) =>
          item.id === itemId ? nextItem : item
        ),
      }
    })
  }

  function addPurchaseItem() {
    updateActiveWorkspace((workspace) => {
      const ingredient = workspace.ingredients[0]

      if (!ingredient) {
        return workspace
      }

      const nextItem = {
        id: `${workspace.branchId}-draft-${Date.now()}`,
        ingredientId: ingredient.id,
        quantity: 1,
        unit: ingredient.unit,
        unitPrice: ingredient.defaultPrice,
      }

      return {
        ...workspace,
        inventoryItems: applyInventoryAdjustments(workspace.inventoryItems, [
          { ingredientId: nextItem.ingredientId, delta: nextItem.quantity },
        ]),
        purchaseStockLedger: {
          ...workspace.purchaseStockLedger,
          [nextItem.id]: {
            ingredientId: nextItem.ingredientId,
            quantity: nextItem.quantity,
          },
        },
        purchaseItems: [...workspace.purchaseItems, nextItem],
      }
    })
  }

  function removePurchaseItem(itemId: string) {
    updateActiveWorkspace((workspace) => {
      if (workspace.purchaseItems.length === 1) {
        return workspace
      }

      const currentItem = workspace.purchaseItems.find(
        (item) => item.id === itemId
      )
      const previousStock =
        workspace.purchaseStockLedger[itemId] ??
        (currentItem
          ? {
              ingredientId: currentItem.ingredientId,
              quantity: currentItem.quantity,
            }
          : null)
      const nextLedger = { ...workspace.purchaseStockLedger }
      delete nextLedger[itemId]

      return {
        ...workspace,
        inventoryItems: previousStock
          ? applyInventoryAdjustments(workspace.inventoryItems, [
              {
                ingredientId: previousStock.ingredientId,
                delta: -previousStock.quantity,
              },
            ])
          : workspace.inventoryItems,
        purchaseStockLedger: nextLedger,
        purchaseItems: workspace.purchaseItems.filter(
          (item) => item.id !== itemId
        ),
      }
    })
  }

  function addIngredientFromPurchase(input: NewIngredientFromPurchaseInput) {
    const name = input.name.trim()
    const unit = input.unit.trim() || "กก."
    const unitPrice = Math.max(input.unitPrice, 0)

    if (!name) {
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

    const ingredient: Ingredient = {
      id: createIngredientId(name, ingredientList),
      name,
      category: "วัตถุดิบใหม่",
      unit,
      defaultPrice: unitPrice,
      supplier: "เพิ่มจากใบซื้อ",
    }

    const inventoryItem: InventoryItem = {
      ingredientId: ingredient.id,
      onHand: 0,
      reserved: 0,
      reorderPoint: 0,
      costPerUnit: unitPrice,
      lastUpdated: todayIso,
    }

    updateActiveWorkspace((workspace) => ({
      ...workspace,
      ingredients: [...workspace.ingredients, ingredient],
      inventoryItems: [...workspace.inventoryItems, inventoryItem],
    }))

    return ingredient
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
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error, "ไม่สามารถบันทึกข้อมูลคลังวัตถุดิบได้"),
      }
    }

    return { ok: true }
  }

  function addRecipe(input: RecipeFormInput) {
    const ingredients = input.ingredients.filter((item) => item.quantity > 0)

    if (!input.name.trim() || ingredients.length === 0) {
      return false
    }

    const recipeId = `recipe-${Date.now()}`

    updateActiveWorkspace((workspace) => ({
      ...workspace,
      recipes: [
        ...workspace.recipes,
        {
          ...input,
          id: recipeId,
          name: input.name.trim(),
          menuCategory: input.menuCategory.trim() || "เมนูทั่วไป",
          ingredients,
        },
      ],
      pinnedRecipeIds: new Set([...workspace.pinnedRecipeIds, recipeId]),
    }))

    return true
  }

  function updateRecipe(recipeId: string, input: RecipeFormInput) {
    const ingredients = input.ingredients.filter((item) => item.quantity > 0)

    if (!input.name.trim() || ingredients.length === 0) {
      return false
    }

    updateActiveWorkspace((workspace) => ({
      ...workspace,
      recipes: workspace.recipes.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              ...input,
              name: input.name.trim(),
              menuCategory: input.menuCategory.trim() || "เมนูทั่วไป",
              ingredients,
            }
          : recipe
      ),
    }))

    return true
  }

  function deleteRecipe(recipeId: string) {
    updateActiveWorkspace((workspace) => {
      const nextPinned = new Set(workspace.pinnedRecipeIds)
      const nextCooked = new Set(workspace.cookedRecipeIds)
      nextPinned.delete(recipeId)
      nextCooked.delete(recipeId)

      return {
        ...workspace,
        recipes: workspace.recipes.filter((recipe) => recipe.id !== recipeId),
        pinnedRecipeIds: nextPinned,
        cookedRecipeIds: nextCooked,
      }
    })
  }

  function pinRecipe(recipeId: string) {
    if (!recipeList.some((recipe) => recipe.id === recipeId)) {
      return false
    }

    updateActiveWorkspace((workspace) => {
      const nextPinned = new Set(workspace.pinnedRecipeIds)
      const nextCooked = new Set(workspace.cookedRecipeIds)
      nextPinned.add(recipeId)
      nextCooked.delete(recipeId)

      return {
        ...workspace,
        pinnedRecipeIds: nextPinned,
        cookedRecipeIds: nextCooked,
      }
    })

    return true
  }

  function unpinRecipe(recipeId: string) {
    updateActiveWorkspace((workspace) => {
      const nextPinned = new Set(workspace.pinnedRecipeIds)
      const nextCooked = new Set(workspace.cookedRecipeIds)
      nextPinned.delete(recipeId)
      nextCooked.delete(recipeId)

      return {
        ...workspace,
        pinnedRecipeIds: nextPinned,
        cookedRecipeIds: nextCooked,
      }
    })

    return true
  }

  function cookRecipe(recipeId: string) {
    const recipe = recipeList.find((item) => item.id === recipeId)
    const recipeImpact = recipeImpacts.find((item) => item.id === recipeId)

    if (!recipe || !recipeImpact?.isPinned || !recipeImpact.canProduce) {
      return false
    }

    updateActiveWorkspace((workspace) => {
      const nextCooked = new Set(workspace.cookedRecipeIds)
      nextCooked.add(recipeId)

      return {
        ...workspace,
        inventoryItems: workspace.inventoryItems.map((item) => {
          const recipeIngredient = recipe.ingredients.find(
            (ingredient) => ingredient.ingredientId === item.ingredientId
          )

          if (!recipeIngredient) {
            return item
          }

          return {
            ...item,
            onHand: Math.max(item.onHand - recipeIngredient.quantity, 0),
            lastUpdated: todayIso,
          }
        }),
        cookedRecipeIds: nextCooked,
      }
    })

    return true
  }

  function sanitizeBranchIds(branchIds: string[], role?: MemberRole) {
    const allowedBranchIds =
      currentMember?.role === "owner"
        ? initialBranches.map((branch) => branch.id)
        : accessibleBranchIds
    const allowed = new Set(allowedBranchIds)
    const sanitized = branchIds.filter((branchId) => allowed.has(branchId))
    const roleScoped =
      role === "staff" || role === "viewer" ? sanitized.slice(0, 1) : sanitized

    return roleScoped.length > 0
      ? roleScoped
      : activeBranchId
        ? [activeBranchId]
        : allowedBranchIds.slice(0, 1)
  }

  async function addMember(input: MemberFormInput) {
      const trimmedEmail = input.email.trim().toLowerCase()
      const branchIds = sanitizeBranchIds(input.branchIds, input.role)
  
      // ตรวจสอบข้อมูลเบื้องต้นเหมือนเดิม
      if (
        !input.name.trim() ||
        !trimmedEmail ||
        branchIds.length === 0 ||
        members.some((member) => member.email.toLowerCase() === trimmedEmail)
      ) {
        return false
      }
  
      try {
        // 1. ส่งข้อมูลไปบันทึกที่ฐานข้อมูลผ่าน API (POST)
        const response = await fetch("http://localhost:4000/api/v1/members", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: input.name.trim(),
            email: trimmedEmail,
            role: input.role,
            password: "123456", // ตั้งรหัสผ่านเริ่มต้นให้พนักงาน
            branchIds: branchIds
          })
        });
  
        const result = await response.json();
  
        // 2. ถ้า API บันทึกสำเร็จ
        if (response.ok) {
          // ดึงข้อมูลพนักงานใหม่ที่ฐานข้อมูลสร้างให้ (พร้อม ID ของจริง)
          const newMember = result.member || result.data || result;
  
          // ปรับโครงสร้าง branchIds ให้ตรงกับที่ UI ต้องการ (เหมือนตอนทำ GET)
          const formattedNewMember = {
            ...newMember,
            branchIds: newMember.branchIds || (newMember.branches ? newMember.branches.map((b: any) => b.id) : branchIds)
          };
  
          // อัปเดตตารางหน้าเว็บโดยเอาคนใหม่ไปต่อท้าย
          setMembers((items) => [...items, formattedNewMember]);
          return true;

        } else {
          console.error("API แจ้งว่าเพิ่มข้อมูลไม่สำเร็จ:", result);
          return false;
        }

      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการเชื่อมต่อ API:", error);
        return false;
      }
    }

  function updateMemberRole(memberId: string, role: MemberRole) {
    setMembers((items) =>
      items.map((member) =>
        member.id === memberId ? { ...member, role } : member
      )
    )
    setCurrentMember((member) =>
      member?.id === memberId ? { ...member, role } : member
    )
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
  }

  return {
    activeView,
    setActiveView,
    currentMember,
    isAuthReady,
    isLoginPending: loginMutation.isPending,
    login,
    logout,
    branches: initialBranches,
    activeBranch,
    activeBranchId,
    accessibleBranches,
    setActiveBranch,
    purchaseDate,
    setPurchaseDate,
    purchaseItems,
    updatePurchaseItem,
    addPurchaseItem,
    removePurchaseItem,
    ingredients: ingredientList,
    ingredientById,
    inventoryItems: inventoryList,
    inventoryRows,
    isInventoryLoading,
    isInventorySaving: updateInventoryMutation.isPending,
    inventoryError,
    addIngredientFromPurchase,
    updateInventoryItem,
    lowStockItems,
    currentPurchaseTotal,
    purchaseSeries: reportPurchaseSeries,
    cashFlowMetrics: activeCashFlowMetrics,
    reportPurchaseSeries,
    reportCashFlowMetrics,
    reportBranchSummary,
    recipeImpacts,
    pinnedRecipeImpacts,
    recipeStats,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    pinRecipe,
    unpinRecipe,
    cookRecipe,
    members,
    memberStats,
    canManageMembers,
    addMember,
    updateMemberRole,
    updateMemberStatus,
    updateMemberBranches,
  }
}

export type EasyReceiptStore = ReturnType<typeof useEasyReceiptStore>
