"use client"

import { useEffect, useMemo, useState } from "react"

import {
  baseCashFlowMetrics,
  historicalPurchases,
  ingredients as initialIngredients,
  initialPurchaseItems,
  inventoryItems as initialInventoryItems,
  members as initialMembers,
  recipes,
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

export type StockStatus = "ok" | "watch" | "low"

export type InventoryRow = InventoryItem & {
  ingredient: Ingredient
  incoming: number
  projected: number
  available: number
  status: StockStatus
  stockPercent: number
}

export type RecipeImpact = Recipe & {
  cost: number
  revenue: number
  margin: number
  canProduce: boolean
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
}

export type RecipeFormInput = Omit<Recipe, "id">

export type NewIngredientFromPurchaseInput = {
  name: string
  unit: string
  unitPrice: number
}

const today = new Date("2026-06-27T08:00:00+07:00")
const todayIso = "2026-06-27"
const sessionMemberKey = "easyreceipt.memberId"
const activeMemberLabel = "กำลังใช้งาน"

function readMemberSession() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.sessionStorage.getItem(sessionMemberKey)
  } catch {
    return null
  }
}

function saveMemberSession(memberId: string) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.sessionStorage.setItem(sessionMemberKey, memberId)
  } catch {
    // Session persistence is best-effort for this local prototype.
  }
}

function clearMemberSession() {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.sessionStorage.removeItem(sessionMemberKey)
  } catch {
    // Session persistence is best-effort for this local prototype.
  }
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

  if (item.onHand <= item.reorderPoint * 1.4) {
    return "watch" as const
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

export function useEasyReceiptStore() {
  const [activeView, setActiveView] = useState<ViewId>("dashboard")
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [ingredientList, setIngredientList] =
    useState<Ingredient[]>(initialIngredients)
  const [inventoryList, setInventoryList] =
    useState<InventoryItem[]>(initialInventoryItems)
  const [recipeList, setRecipeList] = useState<Recipe[]>(recipes)
  const [purchaseDate, setPurchaseDate] = useState<Date>(today)
  const [purchaseItems, setPurchaseItems] =
    useState<PurchaseItem[]>(initialPurchaseItems)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const memberId = readMemberSession()

      if (!memberId) {
        setIsAuthReady(true)
        return
      }

      const member = initialMembers.find(
        (item) => item.id === memberId && item.status === "active"
      )

      if (!member) {
        clearMemberSession()
        setIsAuthReady(true)
        return
      }

      setCurrentMember({
        ...member,
        lastActive: activeMemberLabel,
      })
      setMembers((items) =>
        items.map((item) =>
          item.id === member.id
            ? { ...item, lastActive: activeMemberLabel }
            : item
        )
      )
      setActiveView("dashboard")
      setIsAuthReady(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

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

  const inventoryRows = useMemo<InventoryRow[]>(
    () =>
      inventoryList.map((item) => {
        const ingredient = ingredientById.get(item.ingredientId)

        if (!ingredient) {
          throw new Error(`Missing ingredient ${item.ingredientId}`)
        }

        const incoming = incomingByIngredient.get(item.ingredientId) ?? 0
        const available = Math.max(item.onHand - item.reserved, 0)
        const stockPercent = Math.min(
          Math.round((item.onHand / Math.max(item.reorderPoint * 2, 1)) * 100),
          100
        )

        return {
          ...item,
          ingredient,
          incoming,
          projected: item.onHand + incoming,
          available,
          status: stockStatus(item),
          stockPercent,
        }
      }),
    [ingredientById, incomingByIngredient, inventoryList]
  )

  const lowStockItems = useMemo(
    () => inventoryRows.filter((item) => item.status !== "ok"),
    [inventoryRows]
  )

  const purchaseSeries = useMemo<PurchaseSeriesItem[]>(() => {
    const past = historicalPurchases.map((purchase) => ({
      label: dayLabel(purchase.date),
      total: purchaseTotal(purchase.items),
    }))

    return [
      ...past,
      {
        label: "วันนี้",
        total: currentPurchaseTotal,
      },
    ]
  }, [currentPurchaseTotal])

  const cashFlowMetrics = useMemo<CashFlowMetric[]>(() => {
    const ingredientCost = baseCashFlowMetrics.find(
      (metric) => metric.id === "ingredient-cost"
    )
    const sales = baseCashFlowMetrics.find((metric) => metric.id === "sales")

    return baseCashFlowMetrics.map((metric) => {
      if (metric.id === "ingredient-cost") {
        return {
          ...metric,
          value: (ingredientCost?.value ?? 0) + currentPurchaseTotal,
        }
      }

      if (metric.id === "margin") {
        return {
          ...metric,
          value:
            (sales?.value ?? 0) -
            ((ingredientCost?.value ?? 0) + currentPurchaseTotal),
        }
      }

      return metric
    })
  }, [currentPurchaseTotal])

  const recipeImpacts = useMemo<RecipeImpact[]>(
    () =>
      recipeList.map((recipe) => {
        const cost = recipe.ingredients.reduce((total, item) => {
          const inventoryItem = inventoryRows.find(
            (row) => row.ingredientId === item.ingredientId
          )

          return total + item.quantity * (inventoryItem?.costPerUnit ?? 0)
        }, 0)

        const missingNames = recipe.ingredients
          .filter((item) => {
            const inventoryItem = inventoryRows.find(
              (row) => row.ingredientId === item.ingredientId
            )

            return !inventoryItem || inventoryItem.available < item.quantity
          })
          .map((item) => ingredientById.get(item.ingredientId)?.name)
          .filter((name): name is string => Boolean(name))

        const revenue = recipe.yield * recipe.pricePerServing

        return {
          ...recipe,
          cost,
          revenue,
          margin: revenue - cost,
          canProduce: missingNames.length === 0,
          missingNames,
        }
      }),
    [ingredientById, inventoryRows, recipeList]
  )

  const recipeStats = useMemo(() => {
    return {
      total: recipeList.length,
      totalIngredients: recipeList.reduce(
        (total, recipe) => total + recipe.ingredients.length,
        0
      ),
      ready: recipeImpacts.filter((recipe) => recipe.canProduce).length,
    }
  }, [recipeImpacts, recipeList])

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

  function login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const member = members.find(
      (item) =>
        item.email.toLowerCase() === normalizedEmail &&
        item.password === password &&
        item.status === "active"
    )

    if (!member) {
      return false
    }

    setCurrentMember({
      ...member,
      lastActive: activeMemberLabel,
    })
    setMembers((items) =>
      items.map((item) =>
        item.id === member.id ? { ...item, lastActive: activeMemberLabel } : item
      )
    )
    saveMemberSession(member.id)
    setActiveView("dashboard")

    return true
  }

  function logout() {
    clearMemberSession()
    setCurrentMember(null)
    setActiveView("dashboard")
  }

  function updatePurchaseItem(
    itemId: string,
    patch: Partial<Omit<PurchaseItem, "id">>
  ) {
    setPurchaseItems((items) =>
      items.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        const next = { ...item, ...patch }

        if (patch.ingredientId && patch.ingredientId !== item.ingredientId) {
          const ingredient = ingredientById.get(patch.ingredientId)

          if (ingredient) {
            next.unit = ingredient.unit
            next.unitPrice = ingredient.defaultPrice
          }
        }

        return next
      })
    )
  }

  function addPurchaseItem() {
    const ingredient = ingredientList[0]

    if (!ingredient) {
      return
    }

    setPurchaseItems((items) => [
      ...items,
      {
        id: `draft-${Date.now()}`,
        ingredientId: ingredient.id,
        quantity: 1,
        unit: ingredient.unit,
        unitPrice: ingredient.defaultPrice,
      },
    ])
  }

  function removePurchaseItem(itemId: string) {
    setPurchaseItems((items) =>
      items.length === 1 ? items : items.filter((item) => item.id !== itemId)
    )
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

    setIngredientList((items) => [...items, ingredient])
    setInventoryList((items) => [...items, inventoryItem])

    return ingredient
  }

  function resetPurchaseItems() {
    setPurchaseItems(initialPurchaseItems)
  }

  function addRecipe(input: RecipeFormInput) {
    const ingredients = input.ingredients.filter((item) => item.quantity > 0)

    if (!input.name.trim() || ingredients.length === 0) {
      return false
    }

    setRecipeList((items) => [
      ...items,
      {
        ...input,
        id: `recipe-${Date.now()}`,
        name: input.name.trim(),
        menuCategory: input.menuCategory.trim() || "เมนูทั่วไป",
        ingredients,
      },
    ])

    return true
  }

  function updateRecipe(recipeId: string, input: RecipeFormInput) {
    const ingredients = input.ingredients.filter((item) => item.quantity > 0)

    if (!input.name.trim() || ingredients.length === 0) {
      return false
    }

    setRecipeList((items) =>
      items.map((recipe) =>
        recipe.id === recipeId
          ? {
              ...recipe,
              ...input,
              name: input.name.trim(),
              menuCategory: input.menuCategory.trim() || "เมนูทั่วไป",
              ingredients,
            }
          : recipe
      )
    )

    return true
  }

  function deleteRecipe(recipeId: string) {
    setRecipeList((items) => items.filter((recipe) => recipe.id !== recipeId))
  }

  function addMember(input: MemberFormInput) {
    const trimmedEmail = input.email.trim().toLowerCase()

    if (
      !input.name.trim() ||
      !trimmedEmail ||
      members.some((member) => member.email.toLowerCase() === trimmedEmail)
    ) {
      return false
    }

    setMembers((items) => [
      ...items,
      {
        id: `member-${Date.now()}`,
        name: input.name.trim(),
        email: trimmedEmail,
        role: input.role,
        status: "invited",
        lastActive: "-",
        joinedAt: "2026-06-27",
        password: "123456",
      },
    ])

    return true
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
    }
  }

  return {
    activeView,
    setActiveView,
    currentMember,
    isAuthReady,
    login,
    logout,
    purchaseDate,
    setPurchaseDate,
    purchaseItems,
    updatePurchaseItem,
    addPurchaseItem,
    removePurchaseItem,
    resetPurchaseItems,
    ingredients: ingredientList,
    ingredientById,
    inventoryItems: inventoryList,
    inventoryRows,
    addIngredientFromPurchase,
    lowStockItems,
    currentPurchaseTotal,
    purchaseSeries,
    cashFlowMetrics,
    recipeImpacts,
    recipeStats,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    members,
    memberStats,
    canManageMembers,
    addMember,
    updateMemberRole,
    updateMemberStatus,
  }
}

export type EasyReceiptStore = ReturnType<typeof useEasyReceiptStore>
