export type ViewId =
  | "dashboard"
  | "purchase"
  | "stock"
  | "recipes"
  | "reports"
  | "members"

export type MemberRole = "owner" | "manager" | "staff" | "viewer"

export type MemberStatus = "active" | "invited" | "suspended"

export type Member = {
  id: string
  name: string
  email: string
  role: MemberRole
  status: MemberStatus
  lastActive: string
  joinedAt: string
  password: string
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

export const members: Member[] = [
  {
    id: "member-owner",
    name: "คุณยานาร์",
    email: "owner@easyreceipt.local",
    role: "owner",
    status: "active",
    lastActive: "วันนี้ 15:40",
    joinedAt: "2026-06-01",
    password: "123456",
  },
  {
    id: "member-manager",
    name: "พิมพ์ชนก",
    email: "manager@easyreceipt.local",
    role: "manager",
    status: "active",
    lastActive: "วันนี้ 14:10",
    joinedAt: "2026-06-05",
    password: "123456",
  },
  {
    id: "member-staff",
    name: "นที",
    email: "staff@easyreceipt.local",
    role: "staff",
    status: "active",
    lastActive: "เมื่อวาน 18:22",
    joinedAt: "2026-06-12",
    password: "123456",
  },
  {
    id: "member-viewer",
    name: "ฝ่ายบัญชี",
    email: "accounting@easyreceipt.local",
    role: "viewer",
    status: "invited",
    lastActive: "-",
    joinedAt: "2026-06-25",
    password: "123456",
  },
]

export const ingredients: Ingredient[] = [
  {
    id: "chicken-breast",
    name: "อกไก่",
    category: "โปรตีน",
    unit: "กก.",
    defaultPrice: 118,
    supplier: "ตลาดสดรุ่งเรือง",
  },
  {
    id: "jasmine-rice",
    name: "ข้าวหอมมะลิ",
    category: "ของแห้ง",
    unit: "กก.",
    defaultPrice: 43,
    supplier: "ข้าวถุงชุมชน",
  },
  {
    id: "egg",
    name: "ไข่ไก่",
    category: "โปรตีน",
    unit: "ฟอง",
    defaultPrice: 4.5,
    supplier: "ฟาร์มบ้านเหนือ",
  },
  {
    id: "basil",
    name: "ใบกะเพรา",
    category: "ผักสด",
    unit: "กก.",
    defaultPrice: 72,
    supplier: "สวนผักแม่คำ",
  },
  {
    id: "fish-sauce",
    name: "น้ำปลา",
    category: "เครื่องปรุง",
    unit: "ขวด",
    defaultPrice: 34,
    supplier: "ร้านขายส่งดีดี",
  },
  {
    id: "cooking-oil",
    name: "น้ำมันพืช",
    category: "เครื่องปรุง",
    unit: "ขวด",
    defaultPrice: 58,
    supplier: "ร้านขายส่งดีดี",
  },
  {
    id: "thai-chili",
    name: "พริกสด",
    category: "ผักสด",
    unit: "กก.",
    defaultPrice: 86,
    supplier: "ตลาดสดรุ่งเรือง",
  },
  {
    id: "garlic",
    name: "กระเทียม",
    category: "ผักสด",
    unit: "กก.",
    defaultPrice: 64,
    supplier: "สวนผักแม่คำ",
  },
  {
    id: "coriander",
    name: "ผักชี",
    category: "ผักสด",
    unit: "กก.",
    defaultPrice: 78,
    supplier: "สวนผักแม่คำ",
  },
  {
    id: "lemongrass",
    name: "ตะไคร้",
    category: "ผักสด",
    unit: "กก.",
    defaultPrice: 52,
    supplier: "สวนผักแม่คำ",
  },
  {
    id: "lime",
    name: "มะนาว",
    category: "ผักสด",
    unit: "ลูก",
    defaultPrice: 6,
    supplier: "ตลาดสดรุ่งเรือง",
  }
]

export const inventoryItems: InventoryItem[] = [
  {
    ingredientId: "chicken-breast",
    onHand: 5,
    reserved: 3,
    reorderPoint: 0,
    costPerUnit: 116,
    lastUpdated: "2026-06-27",
  },
  {
    ingredientId: "jasmine-rice",
    onHand: 20,
    reserved: 12,
    reorderPoint: 0,
    costPerUnit: 41,
    lastUpdated: "2026-06-27",
  },
  {
    ingredientId: "egg",
    onHand: 20,
    reserved: 28,
    reorderPoint: 0,
    costPerUnit: 4.3,
    lastUpdated: "2026-06-27",
  },
  {
    ingredientId: "basil",
    onHand: 2,
    reserved: 0.8,
    reorderPoint: 0,
    costPerUnit: 70,
    lastUpdated: "2026-06-27",
  },
  {
    ingredientId: "fish-sauce",
    onHand: 4,
    reserved: 2,
    reorderPoint: 0,
    costPerUnit: 33,
    lastUpdated: "2026-06-26",
  },
  {
    ingredientId: "cooking-oil",
    onHand: 6,
    reserved: 2,
    reorderPoint: 0,
    costPerUnit: 56,
    lastUpdated: "2026-06-26",
  },
  {
    ingredientId: "thai-chili",
    onHand: 5,
    reserved: 0.5,
    reorderPoint: 0,
    costPerUnit: 84,
    lastUpdated: "2026-06-27",
  },
  {
    ingredientId: "garlic",
    onHand: 4,
    reserved: 1.1,
    reorderPoint: 0,
    costPerUnit: 63,
    lastUpdated: "2026-06-27",
  },
]

export const initialPurchaseItems: PurchaseItem[] = [
  {
    id: "draft-1",
    ingredientId: "chicken-breast",
    quantity: 6,
    unit: "กก.",
    unitPrice: 118,
  },
  {
    id: "draft-2",
    ingredientId: "egg",
    quantity: 60,
    unit: "ฟอง",
    unitPrice: 4.5,
  },
  {
    id: "draft-3",
    ingredientId: "basil",
    quantity: 2,
    unit: "กก.",
    unitPrice: 72,
  },
]

export const historicalPurchases: Purchase[] = [
  {
    id: "po-0622",
    date: "2026-06-22",
    vendor: "ตลาดสดรุ่งเรือง",
    items: [
      {
        id: "po-0622-1",
        ingredientId: "chicken-breast",
        quantity: 8,
        unit: "กก.",
        unitPrice: 116,
      },
      {
        id: "po-0622-2",
        ingredientId: "thai-chili",
        quantity: 1.5,
        unit: "กก.",
        unitPrice: 82,
      },
    ],
  },
  {
    id: "po-0623",
    date: "2026-06-23",
    vendor: "ร้านขายส่งดีดี",
    items: [
      {
        id: "po-0623-1",
        ingredientId: "fish-sauce",
        quantity: 6,
        unit: "ขวด",
        unitPrice: 33,
      },
      {
        id: "po-0623-2",
        ingredientId: "cooking-oil",
        quantity: 5,
        unit: "ขวด",
        unitPrice: 56,
      },
    ],
  },
  {
    id: "po-0624",
    date: "2026-06-24",
    vendor: "ข้าวถุงชุมชน",
    items: [
      {
        id: "po-0624-1",
        ingredientId: "jasmine-rice",
        quantity: 30,
        unit: "กก.",
        unitPrice: 41,
      },
    ],
  },
  {
    id: "po-0625",
    date: "2026-06-25",
    vendor: "สวนผักแม่คำ",
    items: [
      {
        id: "po-0625-1",
        ingredientId: "basil",
        quantity: 2.2,
        unit: "กก.",
        unitPrice: 70,
      },
      {
        id: "po-0625-2",
        ingredientId: "garlic",
        quantity: 4,
        unit: "กก.",
        unitPrice: 63,
      },
    ],
  },
]

export const recipes: Recipe[] = [
  {
    id: "basil-chicken",
    name: "ข้าวกะเพราไก่",
    menuCategory: "อาหารจานเดียว",
    yield: 24,
    pricePerServing: 65,
    ingredients: [
      { ingredientId: "chicken-breast", quantity: 4.8 },
      { ingredientId: "jasmine-rice", quantity: 5 },
      { ingredientId: "basil", quantity: 0.8 },
      { ingredientId: "thai-chili", quantity: 0.25 },
      { ingredientId: "garlic", quantity: 0.35 },
      { ingredientId: "fish-sauce", quantity: 0.5 },
    ],
  },
  {
    id: "fried-rice",
    name: "ข้าวผัดไข่",
    menuCategory: "อาหารจานเดียว",
    yield: 30,
    pricePerServing: 55,
    ingredients: [
      { ingredientId: "jasmine-rice", quantity: 6 },
      { ingredientId: "egg", quantity: 45 },
      { ingredientId: "cooking-oil", quantity: 1 },
      { ingredientId: "garlic", quantity: 0.25 },
      { ingredientId: "fish-sauce", quantity: 0.4 },
    ],
  },
  {
    id: "protein-box",
    name: "กล่องโปรตีนคลีน",
    menuCategory: "อาหารสุขภาพ",
    yield: 18,
    pricePerServing: 89,
    ingredients: [
      { ingredientId: "chicken-breast", quantity: 5.4 },
      { ingredientId: "jasmine-rice", quantity: 3.6 },
      { ingredientId: "egg", quantity: 18 },
      { ingredientId: "cooking-oil", quantity: 0.6 },
    ],
  },
]

export const baseCashFlowMetrics: CashFlowMetric[] = [
  {
    id: "ingredient-cost",
    label: "ต้นทุนวัตถุดิบ",
    value: 9450,
    delta: -3.2,
    kind: "expense",
  },
  {
    id: "margin",
    label: "กำไรขั้นต้น",
    value: 19190,
    delta: 6.8,
    kind: "margin",
  },
]
