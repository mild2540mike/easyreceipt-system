export type ViewId =
  | "dashboard"
  | "purchase"
  | "usage"
  | "stock"
  | "recipes"
  | "reports"
  | "budgets"
  | "members"

export type MemberRole = "owner" | "manager" | "staff"

export type MemberStatus = "active" | "suspended"

export type MenuPermissionKey =
  | "purchase"
  | "usage"
  | "stock"
  | "recipes"
  | "reports"
  | "members"
  | "budgets"

export type MenuPermission = {
  view: boolean
  edit: boolean
}

export type MemberMenuPermissions = Partial<
  Record<MenuPermissionKey, MenuPermission>
>

export const menuPermissionKeys: MenuPermissionKey[] = [
  "purchase",
  "usage",
  "stock",
  "recipes",
  "reports",
  "members",
  "budgets",
]

export function defaultMemberPermissions(role: MemberRole): MemberMenuPermissions {
  if (role === "owner" || role === "manager") {
    return Object.fromEntries(
      menuPermissionKeys.map((key) => [key, { view: true, edit: true }])
    ) as MemberMenuPermissions
  }

  return {
    purchase: { view: true, edit: true },
    usage: { view: true, edit: true },
    stock: { view: true, edit: false },
    recipes: { view: true, edit: true },
    reports: { view: false, edit: false },
    members: { view: false, edit: false },
    budgets: { view: false, edit: false },
  }
}

export function normalizeMemberPermissions(
  role: MemberRole,
  permissions?: MemberMenuPermissions
): MemberMenuPermissions {
  const defaults = defaultMemberPermissions(role)

  return Object.fromEntries(
    menuPermissionKeys.map((key) => [
      key,
      {
        view: Boolean(permissions?.[key]?.view ?? defaults[key]?.view),
        edit: Boolean(permissions?.[key]?.edit ?? defaults[key]?.edit),
      },
    ])
  ) as MemberMenuPermissions
}

export function memberCanViewMenu(member: Member | null, key: MenuPermissionKey) {
  if (!member) {
    return false
  }

  return normalizeMemberPermissions(member.role, member.permissions)[key]?.view ?? false
}

export function memberCanEditMenu(member: Member | null, key: MenuPermissionKey) {
  if (!member) {
    return false
  }

  return normalizeMemberPermissions(member.role, member.permissions)[key]?.edit ?? false
}

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
  username: string
  role: MemberRole
  status: MemberStatus
  lastActive: string
  joinedAt: string
  password: string
  branchIds: string[]
  primaryBranchId: string
  permissions: MemberMenuPermissions
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
  billName?: string
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
