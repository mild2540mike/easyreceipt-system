"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardCheck,
  History,
  Save,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"

import { StockCheckHistory } from "./stock-check-history"
import { memberCanEditMenu } from "@/lib/easyreceipt-data"
import { StockCheckApiError } from "@/lib/easyreceipt-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { EasyReceiptStore } from "@/hooks/use-easyreceipt-store"
import {
  countDifference,
  countNeedsReview,
  differenceLabel,
  emptyStockCheck,
  formatCount,
  parseCount,
  readStockCheck,
  type SavedStockCheck,
  type StockCheckSaveInput,
  stockCheckStorageKey,
  type StockCheckDraft,
  type StockCheckEntry,
  type StockCheckItem,
} from "@/lib/stock-check"
import { cn } from "@/lib/utils"

const subscribeToHydration = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

type StockCheckStore = Pick<
  EasyReceiptStore,
  | "activeBranchId"
  | "activeBranch"
  | "currentMember"
  | "inventoryRows"
  | "isInventoryLoading"
  | "inventoryError"
  | "submitStockCheck"
  | "refreshStockCheckInventory"
>

export function StockCheckView({ store }: { store: StockCheckStore }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientSnapshot,
    serverSnapshot
  )
  if (
    !hydrated ||
    !store.currentMember ||
    !store.activeBranchId ||
    store.isInventoryLoading
  ) {
    return <StockCheckLoading />
  }
  return (
    <StockCheckWorkspace
      key={stockCheckStorageKey(store.currentMember.id, store.activeBranchId)}
      store={store}
      storageKey={stockCheckStorageKey(
        store.currentMember.id,
        store.activeBranchId
      )}
    />
  )
}

function StockCheckLoading() {
  return (
    <div
      className="mx-auto max-w-3xl space-y-4"
      role="status"
      aria-label="กำลังโหลดรายการเช็คสต็อก"
    >
      <p className="text-base text-muted-foreground">
        กำลังเตรียมรายการเช็คสต็อก…
      </p>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
        />
      ))}
    </div>
  )
}

function StockCheckWorkspace({
  store,
  storageKey,
}: {
  store: StockCheckStore
  storageKey: string
}) {
  const [initial] = useState(() => {
    try {
      return {
        draft: readStockCheck(localStorage.getItem(storageKey)),
        error: "",
      }
    } catch {
      return {
        draft: emptyStockCheck(),
        error:
          "เปิดผลเช็คเดิมไม่ได้ หากเริ่มเช็คใหม่ ผลเดิมในเครื่องนี้จะถูกแทนที่",
      }
    }
  })
  const [draft, setDraft] = useState(initial.draft)
  const draftRef = useRef(draft)
  const [storageError, setStorageError] = useState(initial.error)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [includeZero, setIncludeZero] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "different">("all")
  const [summary, setSummary] = useState(!!initial.draft.pendingSave)
  const [resetOpen, setResetOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [saveError, setSaveError] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)
  const [savedCheck, setSavedCheck] = useState<SavedStockCheck | null>(null)
  const canSave = memberCanEditMenu(store.currentMember, "stock-check")
  const locked = saving || !!draft.pendingSave
  const headingRef = useRef<HTMLHeadingElement>(null)

  const items = useMemo<StockCheckItem[]>(
    () =>
      store.inventoryRows
        .map((row) => ({
          ingredientId: row.ingredientId,
          name: row.ingredient.name,
          category: row.ingredient.category,
          unit: row.ingredient.unit,
          onHand: row.onHand,
          inventoryVersion: row.inventoryVersion,
        }))
        .sort(
          (a, b) =>
            Number(b.onHand > 0) - Number(a.onHand > 0) ||
            a.name.localeCompare(b.name, "th")
        ),
    [store.inventoryRows]
  )
  const byId = useMemo(
    () => new Map(items.map((item) => [item.ingredientId, item])),
    [items]
  )
  const categories = useMemo(
    () =>
      [...new Set(items.map((item) => item.category))].sort((a, b) =>
        a.localeCompare(b, "th")
      ),
    [items]
  )
  const confirmed = Object.entries(draft.entries).filter(
    ([, entry]) => entry.confirmed
  )
  const needsReview = confirmed.filter(([id, entry]) =>
    countNeedsReview(entry, byId.get(id))
  )
  const different = confirmed.filter(
    ([id, entry]) =>
      !countNeedsReview(entry, byId.get(id)) &&
      countDifference(parseCount(entry.actual)!, entry.systemQuantity) !== 0
  )
  const matched = confirmed.length - different.length - needsReview.length
  const scope = items.filter(
    (item) =>
      (includeZero || item.onHand > 0 || !!draft.entries[item.ingredientId]) &&
      (category === "all" || item.category === category)
  )
  const checkedInScope = scope.filter((item) => {
    const entry = draft.entries[item.ingredientId]
    return entry?.confirmed && !countNeedsReview(entry, item)
  }).length
  const search = query.trim().toLocaleLowerCase("th").replace(/\s+/g, "")
  const visible = scope.filter((item) => {
    const entry = draft.entries[item.ingredientId]
    const isChecked = entry?.confirmed && !countNeedsReview(entry, item)
    const matchesStatus =
      filter === "all" ||
      (filter === "pending" && !isChecked) ||
      (filter === "different" &&
        entry?.confirmed &&
        (countNeedsReview(entry, item) ||
          countDifference(parseCount(entry.actual)!, entry.systemQuantity) !==
            0))
    return (
      matchesStatus &&
      `${item.name}${item.category}`
        .toLocaleLowerCase("th")
        .replace(/\s+/g, "")
        .includes(search)
    )
  })

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== storageKey || savingRef.current) return
      try {
        const next = readStockCheck(event.newValue)
        draftRef.current = next
        setDraft(next)
        setFeedback("อัปเดตผลเช็คจากหน้าต่างอื่นแล้ว")
      } catch {
        setStorageError(
          "อ่านฉบับร่างจากหน้าต่างอื่นไม่ได้ กรุณาเปิดหน้านี้ไว้และบันทึกผลก่อนปิด"
        )
      }
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [storageKey])

  function persist(next: StockCheckDraft) {
    draftRef.current = next
    setDraft(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setStorageError("")
    } catch {
      setStorageError(
        "เครื่องนี้เก็บฉบับร่างไม่ได้ กรุณาเปิดหน้านี้ไว้จนกว่าจะบันทึกผลสำเร็จ"
      )
    }
  }

  function updateCount(
    item: StockCheckItem,
    actual: string,
    confirmed: boolean
  ) {
    if (savingRef.current || draftRef.current.pendingSave) return
    const entries = { ...draftRef.current.entries }
    entries[item.ingredientId] = {
      name: item.name,
      unit: item.unit,
      systemQuantity: item.onHand,
      inventoryVersion: item.inventoryVersion,
      actual,
      confirmed,
      countedAt: new Date().toISOString(),
    }
    persist({ ...draftRef.current, entries })
    setFeedback(
      confirmed
        ? `เช็ค ${item.name} แล้ว · ${differenceLabel(countDifference(parseCount(actual)!, item.onHand), item.unit)}`
        : ""
    )
  }

  function forgetCount(id: string) {
    if (savingRef.current || draftRef.current.pendingSave) return
    const entries = { ...draftRef.current.entries }
    delete entries[id]
    persist({ ...draftRef.current, entries })
  }

  function showSummary(next: boolean) {
    setSummary(next)
    setFeedback("")
    window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0 })
    })
  }

  async function saveResults() {
    if (savingRef.current || !canSave) return
    const current = draftRef.current
    const selected = Object.entries(current.entries).filter(
      ([, entry]) => entry.confirmed
    )
    if (
      !current.pendingSave &&
      (!selected.length ||
        selected.some(([id, entry]) => countNeedsReview(entry, byId.get(id))))
    )
      return
    const input: StockCheckSaveInput = current.pendingSave ?? {
      requestId: crypto.randomUUID(),
      startedAt: current.startedAt,
      items: selected.map(([ingredientId, entry]) => ({
        ingredientId,
        unit: entry.unit,
        systemQuantity: entry.systemQuantity,
        actualQuantity: parseCount(entry.actual)!,
        inventoryVersion: entry.inventoryVersion!,
        countedAt: entry.countedAt,
      })),
    }
    // Persist the exact request before sending, including across reloads after a lost response.
    persist({ ...current, pendingSave: input })
    savingRef.current = true
    setSaving(true)
    setSaveError("")
    setConfirmSaveOpen(false)
    try {
      const result = await store.submitStockCheck(store.activeBranchId, input)
      const entries = { ...draftRef.current.entries }
      for (const item of input.items) delete entries[item.ingredientId]
      const next = { ...draftRef.current, entries }
      delete next.pendingSave
      persist(Object.keys(entries).length ? next : emptyStockCheck())
      setSavedCheck(result)
      setHistoryOpen(true)
      setSummary(false)
    } catch (error) {
      if (
        error instanceof StockCheckApiError &&
        [400, 401, 403, 404, 409].includes(error.status)
      ) {
        const next = {
          ...draftRef.current,
          entries: { ...draftRef.current.entries },
        }
        delete next.pendingSave
        for (const id of error.ingredientIds) {
          const entry = next.entries[id]
          if (entry)
            next.entries[id] = { ...entry, inventoryVersion: undefined }
        }
        persist(next)
        setSaveError(error.message)
        void store
          .refreshStockCheckInventory(store.activeBranchId)
          .catch(() => {})
      } else {
        setSaveError(
          "ยังยืนยันผลบันทึกไม่ได้ กรุณาลองบันทึกอีกครั้ง ระบบจะไม่ปรับยอดซ้ำ"
        )
      }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (historyOpen)
    return (
      <StockCheckHistory
        branchId={store.activeBranchId}
        branchName={store.activeBranch?.name ?? ""}
        memberId={store.currentMember!.id}
        savedCheck={savedCheck}
        onClose={() => {
          setHistoryOpen(false)
          setSavedCheck(null)
        }}
      />
    )

  const hasAnyEntry = Object.keys(draft.entries).length > 0
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <section className="space-y-3">
        {summary && (
          <Button
            variant="ghost"
            className="h-12 px-0 text-base"
            onClick={() => showSummary(false)}
          >
            <ArrowLeft /> กลับไปเช็คต่อ
          </Button>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="scroll-mt-24 text-xl font-semibold outline-none"
            >
              {summary ? "สรุปผลเช็คสต็อก" : "นับของจริง แล้วกรอกจำนวน"}
            </h2>
            {!summary && (
              <p className="mt-1 text-sm font-medium text-primary">
                {store.activeBranch?.name}
              </p>
            )}
            <p className="mt-1 text-base text-muted-foreground">
              {summary
                ? `${store.activeBranch?.name ?? "สาขานี้"} · เช็คแล้ว ${confirmed.length} รายการ`
                : "ถ้านับได้เท่ากัน กด “ตรงกับระบบ” ได้เลย"}
            </p>
          </div>
          {hasAnyEntry && (
            <Button
              variant="ghost"
              className="h-12 shrink-0 px-2 text-sm"
              disabled={locked}
              onClick={() => setResetOpen(true)}
              aria-label="เริ่มเช็คสต็อกรอบใหม่"
            >
              <RotateCcw className="size-4" />
              <span className="hidden sm:inline">เริ่มรอบใหม่</span>
            </Button>
          )}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          ฉบับร่างในเครื่อง · กดบันทึกเพื่อปรับยอดคลัง
          {summary && (
            <span className="block">
              เริ่มเช็ค{" "}
              {new Intl.DateTimeFormat("th-TH", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Bangkok",
              }).format(new Date(draft.startedAt))}
            </span>
          )}
        </p>
      </section>

      <Button
        variant="outline"
        className="h-12 w-full text-base sm:w-auto"
        disabled={saving}
        onClick={() => setHistoryOpen(true)}
      >
        <History /> ประวัติการเช็ค
      </Button>
      {!canSave && (
        <p className="text-sm text-amber-900">
          คุณดูผลเช็คได้ แต่ไม่มีสิทธิ์บันทึกและปรับยอดคลัง
        </p>
      )}
      {draft.pendingSave && (
        <p role="status" className="rounded-lg bg-amber-50 p-4 text-amber-900">
          มีผลเช็ครอยืนยันการบันทึก กรุณากดบันทึกอีกครั้งก่อนเริ่มนับต่อ
        </p>
      )}
      {saveError && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-900">
          {saveError}
        </p>
      )}
      {storageError && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-4 text-base text-amber-900"
        >
          {storageError}
        </p>
      )}
      {store.inventoryError && (
        <div
          role="alert"
          className="space-y-3 rounded-lg bg-red-50 p-4 text-base text-red-800"
        >
          <p>โหลดข้อมูลคลังไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง</p>
          <p className="text-sm">ผลที่กรอกไว้ยังอยู่ในเครื่องนี้</p>
          <Button
            variant="outline"
            className="h-12 text-base"
            onClick={() => window.location.reload()}
          >
            ลองโหลดอีกครั้ง
          </Button>
        </div>
      )}
      <p
        role="status"
        className={cn(
          "text-sm text-primary",
          (!summary || !feedback) && "sr-only"
        )}
      >
        {feedback}
      </p>

      {store.inventoryError && items.length === 0 ? (
        <p className="text-base text-muted-foreground">
          {confirmed.length > 0
            ? `เก็บผลเช็คเดิมไว้ ${confirmed.length} รายการแล้ว เชื่อมต่ออีกครั้งเพื่อกลับมาเช็คต่อ`
            : "เมื่อโหลดข้อมูลได้แล้ว จะเริ่มนับและเทียบยอดได้"}
        </p>
      ) : summary ? (
        <>
          <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-background py-4 text-center">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-emerald-800">
                {matched}
              </p>
              <p className="mt-1 text-sm">ตรงกัน</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-amber-800">
                {different.length}
              </p>
              <p className="mt-1 text-sm">ขาด / เกิน</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">
                {needsReview.length}
              </p>
              <p className="mt-1 text-sm">ต้องเช็คใหม่</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            สรุปเฉพาะรายการที่ยืนยันแล้ว ยังไม่ได้เช็ค{" "}
            {Math.max(
              0,
              items.length - confirmed.filter(([id]) => byId.has(id)).length
            )}{" "}
            รายการ
          </p>
          {confirmed.length === 0 ? (
            <p className="rounded-lg bg-background p-6 text-base">
              ยังไม่มีผลเช็ค กลับไปนับแล้วกด “ยืนยันจำนวน” หรือ “ตรงกับระบบ”
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
              {[
                ...needsReview,
                ...different,
                ...confirmed.filter(
                  ([id, entry]) =>
                    !countNeedsReview(entry, byId.get(id)) &&
                    countDifference(
                      parseCount(entry.actual)!,
                      entry.systemQuantity
                    ) === 0
                ),
              ].map(([id, entry]) => {
                const review = countNeedsReview(entry, byId.get(id))
                const delta = countDifference(
                  parseCount(entry.actual)!,
                  entry.systemQuantity
                )
                return (
                  <li key={id} className="space-y-3 p-4">
                    <h3 className="break-words text-lg font-semibold">
                      {entry.name}
                    </h3>
                    <dl className="grid grid-cols-2 gap-3 text-base">
                      <div>
                        <dt className="text-sm text-muted-foreground">
                          ระบบตอนเช็ค
                        </dt>
                        <dd className="mt-1 break-words font-medium tabular-nums">
                          {formatCount(entry.systemQuantity)} {entry.unit}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">
                          นับจริง
                        </dt>
                        <dd className="mt-1 break-words font-semibold tabular-nums">
                          {formatCount(parseCount(entry.actual)!)} {entry.unit}
                        </dd>
                      </div>
                    </dl>
                    <p
                      className={cn(
                        "flex items-center gap-2 text-base font-medium",
                        review || delta !== 0
                          ? "text-amber-900"
                          : "text-emerald-800"
                      )}
                    >
                      {review ? (
                        <AlertTriangle className="size-4 shrink-0" />
                      ) : delta === 0 ? (
                        <Check className="size-4 shrink-0" />
                      ) : null}
                      {review
                        ? "ข้อมูลคลังเปลี่ยน ต้องเช็คใหม่"
                        : differenceLabel(delta, entry.unit)}
                    </p>
                    {review && (
                      <Button
                        variant="outline"
                        className="h-12 text-base"
                        disabled={locked}
                        onClick={() => {
                          if (!byId.has(id)) forgetCount(id)
                          setQuery(byId.get(id)?.name ?? "")
                          setIncludeZero(true)
                          setCategory("all")
                          setFilter("all")
                          showSummary(false)
                        }}
                      >
                        {byId.has(id)
                          ? "เช็ครายการนี้ใหม่"
                          : "นำรายการที่ไม่อยู่ในคลังออก"}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <div className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              บันทึกทั้ง {confirmed.length} รายการที่ยืนยันแล้ว
              และปรับยอดคงเหลือให้เท่าจำนวนที่นับจริง
            </p>
            <Button
              className="h-13 w-full text-base"
              disabled={
                !canSave ||
                saving ||
                (!draft.pendingSave &&
                  (!confirmed.length ||
                    needsReview.length > 0 ||
                    !!store.inventoryError))
              }
              onClick={() =>
                draft.pendingSave
                  ? void saveResults()
                  : setConfirmSaveOpen(true)
              }
            >
              <Save />{" "}
              {saving
                ? "กำลังบันทึก…"
                : draft.pendingSave
                  ? "ลองบันทึกอีกครั้ง"
                  : "บันทึกและปรับยอดคลัง"}
            </Button>
            {needsReview.length > 0 && !draft.pendingSave && (
              <p className="text-sm text-amber-900">
                กรุณาตรวจและยืนยันใหม่ {needsReview.length} รายการก่อนบันทึก
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <section aria-label="ความคืบหน้าการเช็ค" className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-base">
              <p className="font-semibold">
                เช็คแล้ว {checkedInScope} / {scope.length} รายการ
              </p>
              <span className="text-sm text-muted-foreground">
                {includeZero ? "รวมยอดเป็น 0" : "รายการที่มีสต็อก"}
                {category !== "all" ? ` · ${category}` : ""}
              </span>
            </div>
            <progress
              className="stock-check-progress h-2 w-full overflow-hidden rounded-full"
              value={checkedInScope}
              max={Math.max(scope.length, 1)}
              aria-label="จำนวนรายการที่เช็คแล้ว"
            />
          </section>

          <section aria-label="ค้นหาและกรองวัตถุดิบ" className="space-y-3">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <label htmlFor="stock-check-search" className="sr-only">
                  ค้นหาวัตถุดิบ
                </label>
                <Search className="pointer-events-none absolute left-3 top-4 size-5 text-muted-foreground" />
                <Input
                  id="stock-check-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="พิมพ์ชื่อวัตถุดิบ"
                  type="search"
                  className="h-13 bg-background pl-10 pr-12 text-base"
                />
                {query && (
                  <Button
                    variant="ghost"
                    className="absolute right-0 top-0 size-13"
                    aria-label="ล้างคำค้น"
                    onClick={() => setQuery("")}
                  >
                    <X />
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                className="h-13 gap-2 px-2 text-base"
                aria-expanded={filtersOpen}
                aria-controls="stock-check-filters"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <SlidersHorizontal className="size-4" />
                ตัวกรอง
                {(includeZero || category !== "all") && (
                  <span
                    className="size-2 rounded-full bg-primary"
                    aria-label="มีตัวกรองที่เลือก"
                  />
                )}
              </Button>
            </div>
            {filtersOpen && (
              <div
                id="stock-check-filters"
                className="space-y-2 rounded-lg bg-muted p-3"
              >
                <label className="flex items-center gap-3 text-base">
                  <span className="shrink-0">หมวดหมู่</span>
                  <select
                    className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="all">ทุกหมวดหมู่</option>
                    {categories.map((value) => (
                      <option value={value} key={value}>
                        {value || "ไม่ระบุหมวดหมู่"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base">
                  <input
                    type="checkbox"
                    checked={includeZero}
                    onChange={(event) => setIncludeZero(event.target.checked)}
                    className="size-5 accent-primary"
                  />
                  รวมรายการที่ระบบเป็น 0
                </label>
              </div>
            )}
            <div className="flex gap-2" role="group" aria-label="สถานะการเช็ค">
              {(
                [
                  { id: "all", label: "ทั้งหมด" },
                  { id: "pending", label: "ยังไม่เช็ค" },
                  { id: "different", label: "ยอดต่าง" },
                ] as const
              ).map((tab) => (
                <Button
                  key={tab.id}
                  variant={filter === tab.id ? "secondary" : "outline"}
                  aria-pressed={filter === tab.id}
                  className={cn(
                    "h-12 min-w-0 flex-1 px-2 text-base",
                    filter === tab.id &&
                      "border-primary/40 bg-sky-50 text-sky-900"
                  )}
                  onClick={() => setFilter(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </section>

          {visible.length ? (
            <ul className="space-y-3" aria-label="รายการเช็คสต็อก">
              {visible.map((item) => (
                <CountRow
                  key={item.ingredientId}
                  item={item}
                  entry={draft.entries[item.ingredientId]}
                  disabled={!!store.inventoryError || locked || !canSave}
                  onChange={(actual, confirmed) =>
                    updateCount(item, actual, confirmed)
                  }
                  onClear={() => forgetCount(item.ingredientId)}
                />
              ))}
            </ul>
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-background p-6 text-center">
              <ClipboardCheck className="mx-auto size-8 text-primary" />
              <h3 className="text-lg font-semibold">
                {items.length === 0
                  ? "ยังไม่มีวัตถุดิบในคลัง"
                  : filter === "pending" && !query
                    ? "เช็คครบรายการที่เลือกแล้ว"
                    : filter === "different"
                      ? "ยังไม่มีรายการยอดต่างในกลุ่มนี้"
                      : "ไม่พบวัตถุดิบที่เลือก"}
              </h3>
              <p className="text-base text-muted-foreground">
                {items.length === 0
                  ? "เมื่อมีวัตถุดิบในคลัง จะเริ่มเช็คจากหน้านี้ได้"
                  : "ค้นหาชื่ออื่น หรือแสดงวัตถุดิบทั้งหมด รวมรายการที่ระบบเป็น 0"}
              </p>
              {items.length > 0 && (
                <Button
                  variant="outline"
                  className="h-12 text-base"
                  onClick={() => {
                    setQuery("")
                    setCategory("all")
                    setIncludeZero(true)
                    setFilter("all")
                  }}
                >
                  แสดงวัตถุดิบทั้งหมด
                </Button>
              )}
            </div>
          )}
          {confirmed.length > 0 && (
            <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 -mx-1 rounded-lg border border-border bg-background p-3 lg:bottom-4">
              <Button
                className="h-13 w-full gap-2 text-base"
                disabled={!confirmed.length}
                onClick={() => showSummary(true)}
              >
                <ClipboardCheck className="size-5" />
                ดูสรุปผลเช็ค ({confirmed.length})
                <ChevronRight className="ml-auto size-5" />
              </Button>
              {(different.length > 0 || needsReview.length > 0) && (
                <p className="mt-2 text-center text-sm text-amber-900">
                  ยอดต่าง {different.length} รายการ
                  {needsReview.length > 0
                    ? ` · ต้องเช็คใหม่ ${needsReview.length}`
                    : ""}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">เริ่มเช็ครอบใหม่?</DialogTitle>
            <DialogDescription className="mt-2 text-base leading-7">
              ฉบับร่างที่ยังไม่บันทึกของสาขานี้จะถูกล้าง
              ประวัติที่บันทึกแล้วจะยังอยู่ ยอดในคลังจะไม่เปลี่ยน
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-12 text-base"
              onClick={() => setResetOpen(false)}
            >
              เช็คต่อรอบเดิม
            </Button>
            <Button
              className="h-12 text-base"
              disabled={locked}
              onClick={() => {
                if (locked) return
                persist(emptyStockCheck())
                setResetOpen(false)
                setQuery("")
                setCategory("all")
                setFilter("all")
                showSummary(false)
              }}
            >
              เริ่มรอบใหม่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">ยืนยันปรับยอดคลัง?</DialogTitle>
            <DialogDescription className="mt-2 text-base leading-7">
              บันทึกผลเช็ค {confirmed.length} รายการของ{" "}
              {store.activeBranch?.name}{" "}
              และปรับยอดคงเหลือเป็นจำนวนที่นับจริงตามหน้าสรุป
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-12 text-base"
              onClick={() => setConfirmSaveOpen(false)}
            >
              กลับไปตรวจ
            </Button>
            <Button
              className="h-12 text-base"
              disabled={
                saving ||
                needsReview.length > 0 ||
                !canSave ||
                !!store.inventoryError
              }
              onClick={() => void saveResults()}
            >
              ยืนยันบันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CountRow({
  item,
  entry,
  disabled,
  onChange,
  onClear,
}: {
  item: StockCheckItem
  entry?: StockCheckEntry
  disabled: boolean
  onChange: (actual: string, confirmed: boolean) => void
  onClear: () => void
}) {
  const actual = entry?.actual ?? ""
  const parsed = parseCount(actual)
  const review = !!entry?.confirmed && countNeedsReview(entry, item)
  const confirmed = !!entry?.confirmed && !review
  const delta = parsed === null ? null : countDifference(parsed, item.onHand)
  const [attempted, setAttempted] = useState(false)
  const inputId = `count-${item.ingredientId}`
  const inputRef = useRef<HTMLInputElement>(null)
  const invalid = attempted && parsed === null
  const status = review
    ? "ยอดระบบเปลี่ยน กรุณานับอีกครั้ง"
    : confirmed
      ? differenceLabel(delta!, item.unit)
      : delta !== null
        ? `${differenceLabel(delta, item.unit)} · รอยืนยัน`
        : ""

  return (
    <li
      className={cn(
        "scroll-mt-24 rounded-lg border bg-background p-4",
        confirmed && delta === 0 ? "border-emerald-300" : "border-border"
      )}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          setAttempted(true)
          if (parsed !== null && !disabled) {
            onChange(String(parsed), true)
            inputRef.current?.blur()
          } else inputRef.current?.focus()
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-lg font-semibold leading-7">
              {item.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.category || "ไม่ระบุหมวดหมู่"}
            </p>
          </div>
          {confirmed && (
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800"
              aria-label="เช็คแล้ว"
            >
              <Check className="size-5" />
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 items-start gap-4">
          <div>
            <p className="text-sm text-muted-foreground">ในระบบ</p>
            <p className="mt-3 break-words text-2xl font-semibold tabular-nums">
              {formatCount(item.onHand)}
            </p>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {item.unit}
            </p>
          </div>
          <div>
            <label htmlFor={inputId} className="text-base font-medium">
              นับได้จริง
            </label>
            <Input
              ref={inputRef}
              id={inputId}
              aria-label={`นับจริง ${item.name}`}
              value={actual}
              onChange={(event) => {
                setAttempted(false)
                onChange(event.target.value, false)
              }}
              disabled={disabled}
              inputMode="decimal"
              autoComplete="off"
              type="text"
              placeholder="กรอกจำนวน"
              className="mt-2 h-14 bg-background text-right font-semibold tabular-nums md:text-xl"
              aria-invalid={invalid}
              aria-describedby={`${inputId}-help`}
            />
            <p
              id={`${inputId}-help`}
              className={cn(
                "mt-1 break-words text-sm",
                invalid ? "text-red-800" : "text-muted-foreground"
              )}
            >
              {invalid
                ? "กรอก 0 หรือจำนวนบวก ทศนิยมไม่เกิน 3 ตำแหน่ง"
                : item.unit}
            </p>
          </div>
        </div>
        {status && (
          <p
            className={cn(
              "flex items-start gap-2 text-base font-medium",
              review || delta !== 0
                ? "text-amber-900"
                : confirmed
                  ? "text-emerald-800"
                  : "text-muted-foreground"
            )}
          >
            {review ? <AlertTriangle className="mt-1 size-4 shrink-0" /> : null}
            {status}
          </p>
        )}
        {confirmed ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              เช็คแล้ว{" "}
              {new Intl.DateTimeFormat("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Bangkok",
              }).format(new Date(entry!.countedAt))}
            </span>
            <Button
              type="button"
              variant="ghost"
              className="h-12 px-2 text-base"
              disabled={disabled}
              onClick={onClear}
            >
              ล้างผลเช็ค
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 min-w-0 flex-1 px-2 text-base"
              disabled={disabled}
              onClick={() => {
                onChange(String(item.onHand), true)
                setAttempted(false)
              }}
            >
              <Check className="size-4" />
              ตรงกับระบบ
            </Button>
            <Button
              type="submit"
              className="h-12 min-w-0 flex-1 px-2 text-base"
              disabled={disabled}
            >
              ยืนยันจำนวน
            </Button>
          </div>
        )}
      </form>
    </li>
  )
}
