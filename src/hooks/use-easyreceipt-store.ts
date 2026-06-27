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
      onHand: Math.max(item.onHand + delta, 0),
      lastUpdated: todayIso,
    }
  })
}

export function useEasyReceiptStore() {
  const [activeView, setActiveView] = useState<ViewId>("dashboard")
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [ingredientList, setIngredientList] = useState<Ingredient[]>(initialIngredients)
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(() =>
    applyInventoryAdjustments(
      initialInventoryItems,
      initialPurchaseItems.map((item) => ({
        ingredientId: item.ingredientId,
        delta: item.quantity,
      }))
    )
  )
  const [recipeList, setRecipeList] = useState<Recipe[]>(recipes)
  const [pinnedRecipeIds, setPinnedRecipeIds] = useState<Set<string>>(
    () => new Set(recipes.map((recipe) => recipe.id))
  )
  const [cookedRecipeIds, setCookedRecipeIds] = useState<Set<string>>(() => new Set())
  const [purchaseDate, setPurchaseDate] = useState<Date>(today)
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>(initialPurchaseItems)
  const [purchaseStockLedger, setPurchaseStockLedger] = useState(() =>
    createPurchaseStockLedger(initialPurchaseItems)
  )

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
        const reserved = reservedByIngredient.get(item.ingredientId) ?? 0
        const available = Math.max(item.onHand - reserved, 0)
        const suggestedPurchaseQuantity = Math.max(
          reserved - item.onHand,
          0
        )
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
    const currentItem = purchaseItems.find((item) => item.id === itemId)

    if (!currentItem) {
      return
    }

    const nextItem = { ...currentItem, ...patch }

    if (patch.ingredientId && patch.ingredientId !== currentItem.ingredientId) {
      const ingredient = ingredientById.get(patch.ingredientId)

      if (ingredient) {
        nextItem.unit = ingredient.unit
        nextItem.unitPrice = ingredient.defaultPrice
      }
    }

    const previousStock = purchaseStockLedger[itemId] ?? {
      ingredientId: currentItem.ingredientId,
      quantity: 0,
    }
    const nextStock = {
      ingredientId: nextItem.ingredientId,
      quantity: Math.max(nextItem.quantity, 0),
    }

    setInventoryList((items) =>
      applyInventoryAdjustments(items, [
        {
          ingredientId: previousStock.ingredientId,
          delta: -previousStock.quantity,
        },
        {
          ingredientId: nextStock.ingredientId,
          delta: nextStock.quantity,
        },
      ])
    )
    setPurchaseStockLedger((items) => ({
      ...items,
      [itemId]: nextStock,
    }))
    setPurchaseItems((items) =>
      items.map((item) => (item.id === itemId ? nextItem : item))
    )
  }

  function addPurchaseItem() {
    const ingredient = ingredientList[0]

    if (!ingredient) {
      return
    }

    const nextItem = {
      id: `draft-${Date.now()}`,
      ingredientId: ingredient.id,
      quantity: 1,
      unit: ingredient.unit,
      unitPrice: ingredient.defaultPrice,
    }

    setInventoryList((items) =>
      applyInventoryAdjustments(items, [
        { ingredientId: nextItem.ingredientId, delta: nextItem.quantity },
      ])
    )
    setPurchaseStockLedger((items) => ({
      ...items,
      [nextItem.id]: {
        ingredientId: nextItem.ingredientId,
        quantity: nextItem.quantity,
      },
    }))
    setPurchaseItems((items) => [...items, nextItem])
  }

  function removePurchaseItem(itemId: string) {
    if (purchaseItems.length === 1) {
      return
    }

    const currentItem = purchaseItems.find((item) => item.id === itemId)
    const previousStock =
      purchaseStockLedger[itemId] ??
      (currentItem
        ? {
            ingredientId: currentItem.ingredientId,
            quantity: currentItem.quantity,
          }
        : null)

    if (previousStock) {
      setInventoryList((items) =>
        applyInventoryAdjustments(items, [
          {
            ingredientId: previousStock.ingredientId,
            delta: -previousStock.quantity,
          },
        ])
      )
    }

    setPurchaseStockLedger((items) => {
      const next = { ...items }
      delete next[itemId]
      return next
    })
    setPurchaseItems((items) => items.filter((item) => item.id !== itemId))
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

  function updateInventoryItem(input: InventoryEditInput) {
    const name = input.name.trim()
    const unit = input.unit.trim() || "กก."

    if (!name) {
      return false
    }

    const duplicateIngredient = ingredientList.find(
      (ingredient) =>
        ingredient.id !== input.ingredientId &&
        normalizeLookup(ingredient.name) === normalizeLookup(name) &&
        normalizeLookup(ingredient.unit) === normalizeLookup(unit)
    )

    if (duplicateIngredient) {
      return false
    }

    setIngredientList((items) =>
      items.map((ingredient) =>
        ingredient.id === input.ingredientId
          ? {
              ...ingredient,
              name,
              category: input.category.trim() || "วัตถุดิบ",
              unit,
              defaultPrice: Math.max(input.defaultPrice, 0),
              supplier: input.supplier.trim() || "-",
            }
          : ingredient
      )
    )
    setInventoryList((items) =>
      items.map((item) =>
        item.ingredientId === input.ingredientId
          ? {
              ...item,
              onHand: Math.max(input.onHand, 0),
              reorderPoint: Math.max(input.reorderPoint, 0),
              costPerUnit: Math.max(input.costPerUnit, 0),
              lastUpdated: todayIso,
            }
          : item
      )
    )

    return true
  }

  function resetPurchaseItems() {
    const nextLedger = createPurchaseStockLedger(initialPurchaseItems)

    setInventoryList((items) =>
      applyInventoryAdjustments(items, [
        ...Object.values(purchaseStockLedger).map((entry) => ({
          ingredientId: entry.ingredientId,
          delta: -entry.quantity,
        })),
        ...Object.values(nextLedger).map((entry) => ({
          ingredientId: entry.ingredientId,
          delta: entry.quantity,
        })),
      ])
    )
    setPurchaseStockLedger(nextLedger)
    setPurchaseItems(initialPurchaseItems)
  }

  function addRecipe(input: RecipeFormInput) {
    const ingredients = input.ingredients.filter((item) => item.quantity > 0)

    if (!input.name.trim() || ingredients.length === 0) {
      return false
    }

    const recipeId = `recipe-${Date.now()}`

    setRecipeList((items) => [
      ...items,
      {
        ...input,
        id: recipeId,
        name: input.name.trim(),
        menuCategory: input.menuCategory.trim() || "เมนูทั่วไป",
        ingredients,
      },
    ])
    setPinnedRecipeIds((items) => {
      const next = new Set(items)
      next.add(recipeId)
      return next
    })

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
    setPinnedRecipeIds((items) => {
      if (!items.has(recipeId)) {
        return items
      }

      const next = new Set(items)
      next.delete(recipeId)
      return next
    })
    setCookedRecipeIds((items) => {
      if (!items.has(recipeId)) {
        return items
      }

      const next = new Set(items)
      next.delete(recipeId)
      return next
    })
  }

  function pinRecipe(recipeId: string) {
    if (!recipeList.some((recipe) => recipe.id === recipeId)) {
      return false
    }

    setPinnedRecipeIds((items) => {
      const next = new Set(items)
      next.add(recipeId)
      return next
    })
    setCookedRecipeIds((items) => {
      if (!items.has(recipeId)) {
        return items
      }

      const next = new Set(items)
      next.delete(recipeId)
      return next
    })

    return true
  }

  function unpinRecipe(recipeId: string) {
    setPinnedRecipeIds((items) => {
      if (!items.has(recipeId)) {
        return items
      }

      const next = new Set(items)
      next.delete(recipeId)
      return next
    })
    setCookedRecipeIds((items) => {
      if (!items.has(recipeId)) {
        return items
      }

      const next = new Set(items)
      next.delete(recipeId)
      return next
    })

    return true
  }

  function cookRecipe(recipeId: string) {
    const recipe = recipeList.find((item) => item.id === recipeId)
    const recipeImpact = recipeImpacts.find((item) => item.id === recipeId)

    if (!recipe || !recipeImpact?.isPinned || !recipeImpact.canProduce) {
      return false
    }

    setInventoryList((items) =>
      items.map((item) => {
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
      })
    )
    setCookedRecipeIds((items) => {
      const next = new Set(items)
      next.add(recipeId)
      return next
    })

    return true
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
    updateInventoryItem,
    lowStockItems,
    currentPurchaseTotal,
    purchaseSeries,
    cashFlowMetrics,
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
  }
}

export type EasyReceiptStore = ReturnType<typeof useEasyReceiptStore>
