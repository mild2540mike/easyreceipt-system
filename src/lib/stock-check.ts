export type StockCheckItem = {
  ingredientId: string
  name: string
  category: string
  unit: string
  onHand: number
  inventoryVersion?: string
}

export type StockCheckEntry = {
  name: string
  unit: string
  systemQuantity: number
  actual: string
  confirmed: boolean
  countedAt: string
  inventoryVersion?: string
}

export type StockCheckSaveInput = {
  requestId: string
  startedAt: string
  items: {
    ingredientId: string
    unit: string
    systemQuantity: number
    actualQuantity: number
    inventoryVersion: string
    countedAt: string
  }[]
}

export type StockCheckSummary = {
  id: string
  branchId: string
  startedAt: string
  savedAt: string
  createdByName: string
  itemCount: number
}
export type SavedStockCheck = StockCheckSummary & {
  items: {
    id: string
    ingredientId: string
    name: string
    unit: string
    systemQuantity: number
    actualQuantity: number
    difference: number
    countedAt: string
  }[]
}

export type StockCheckDraft = {
  version: 1
  startedAt: string
  entries: Record<string, StockCheckEntry>
  pendingSave?: StockCheckSaveInput
}

export function stockCheckStorageKey(memberId: string, branchId: string) {
  return `timetoeat:stock-check:v1:${encodeURIComponent(memberId)}:${encodeURIComponent(branchId)}`
}

export function emptyStockCheck(): StockCheckDraft {
  return { version: 1, startedAt: new Date().toISOString(), entries: {} }
}

export function parseCount(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/[๐-๙]/g, (digit) =>
      String(digit.charCodeAt(0) - "๐".charCodeAt(0))
    )
  if (!/^\d+(\.\d{0,3})?$/.test(normalized)) return null
  const quantity = Number(normalized)
  return Number.isFinite(quantity) && quantity <= 999_999_999 ? quantity : null
}

export function countDifference(actual: number, system: number) {
  return Math.round((actual - system) * 1000) / 1000 || 0
}

export function countNeedsReview(
  entry: StockCheckEntry,
  item?: StockCheckItem
) {
  return (
    !item ||
    !entry.inventoryVersion ||
    entry.inventoryVersion !== item.inventoryVersion ||
    item.unit !== entry.unit ||
    countDifference(item.onHand, entry.systemQuantity) !== 0
  )
}

export function readStockCheck(value: string | null): StockCheckDraft {
  if (!value) return emptyStockCheck()
  const draft = JSON.parse(value) as StockCheckDraft
  if (
    draft.version !== 1 ||
    !Number.isFinite(Date.parse(draft.startedAt)) ||
    !draft.entries ||
    typeof draft.entries !== "object" ||
    Array.isArray(draft.entries)
  )
    throw new Error("Invalid stock check")
  for (const entry of Object.values(draft.entries)) {
    if (
      !entry ||
      typeof entry.name !== "string" ||
      typeof entry.unit !== "string" ||
      typeof entry.actual !== "string" ||
      typeof entry.confirmed !== "boolean" ||
      !Number.isFinite(entry.systemQuantity) ||
      entry.systemQuantity < 0 ||
      !Number.isFinite(Date.parse(entry.countedAt)) ||
      (entry.confirmed && parseCount(entry.actual) === null)
    )
      throw new Error("Invalid stock check entry")
  }
  if (draft.pendingSave) {
    const pending = draft.pendingSave
    if (
      typeof pending.requestId !== "string" ||
      !pending.requestId ||
      !Number.isFinite(Date.parse(pending.startedAt)) ||
      !Array.isArray(pending.items) ||
      !pending.items.length ||
      pending.items.some(
        (item) =>
          !item ||
          typeof item.ingredientId !== "string" ||
          typeof item.unit !== "string" ||
          !Number.isFinite(Date.parse(item.inventoryVersion)) ||
          !Number.isFinite(Date.parse(item.countedAt)) ||
          typeof item.actualQuantity !== "number" ||
          parseCount(String(item.actualQuantity)) === null ||
          typeof item.systemQuantity !== "number" ||
          parseCount(String(item.systemQuantity)) === null
      )
    ) {
      throw new Error("Invalid pending stock check")
    }
  }
  return draft
}

const countFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 3,
})

export function formatCount(value: number) {
  return countFormatter.format(value)
}

export function differenceLabel(difference: number, unit: string) {
  if (difference === 0) return "ตรงกัน"
  return `${difference < 0 ? "ขาด" : "เกิน"} ${formatCount(Math.abs(difference))} ${unit}`
}

export function formatStockCheckTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))
}
