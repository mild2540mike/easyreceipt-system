export type ViewId =
  | "dashboard"
  | "purchase"
  | "stock"
  | "recipes"
  | "reports"
  | "budgets"
  | "members"

export type MemberRole = "owner" | "manager" | "staff" | "viewer"

export type MemberStatus = "active" | "invited" | "suspended"

export type Branch = {
  id: string
  code: string
  name: string
  location: string
  dailyPurchaseBudget: number | null
}

export type Member = {
  id: string
  name: string
  email: string
  role: MemberRole
  status: MemberStatus
  lastActive: string
  joinedAt: string
  password: string
  branchIds: string[]
  primaryBranchId: string
}

export type Ingredient = {
  id: string
  name: string
  category: string
  unit: string
  defaultPrice: number
  supplier: string
}

export type PurchaseItem = {
  id: string
  ingredientId: string
  quantity: number
  unit: string
  unitPrice: number
}

export type Purchase = {
  id: string
  date: string
  vendor: string
  items: PurchaseItem[]
}

export type InventoryItem = {
  ingredientId: string
  onHand: number
  reserved: number
  reorderPoint: number
  costPerUnit: number
  lastUpdated: string
}

export type RecipeIngredient = {
  ingredientId: string
  quantity: number
}

export type Recipe = {
  id: string
  name: string
  menuCategory: string
  yield: number
  pricePerServing: number
  ingredients: RecipeIngredient[]
}

export type CashFlowMetric = {
  id: string
  label: string
  value: number
  delta: number
  kind: "income" | "expense" | "cash" | "margin"
}
