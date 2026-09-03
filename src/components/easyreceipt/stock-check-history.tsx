"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Check, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiGetStockCheck, apiGetStockChecks } from "@/lib/easyreceipt-api"
import {
  differenceLabel,
  formatCount,
  formatStockCheckTime,
  type SavedStockCheck,
} from "@/lib/stock-check"

export function StockCheckHistory({
  branchId,
  branchName,
  memberId,
  savedCheck,
  onClose,
}: {
  branchId: string
  branchName: string
  memberId: string
  savedCheck: SavedStockCheck | null
  onClose: () => void
}) {
  const [offset, setOffset] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(
    savedCheck?.id ?? null
  )
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [selectedId, offset])
  const history = useQuery({
    queryKey: ["easyreceipt", "stock-checks", memberId, branchId, offset],
    queryFn: () => apiGetStockChecks(branchId, offset),
    enabled: !selectedId,
  })
  const detail = useQuery({
    queryKey: [
      "easyreceipt",
      "stock-checks",
      memberId,
      branchId,
      "detail",
      selectedId,
    ],
    queryFn: () => apiGetStockCheck(branchId, selectedId!),
    enabled: !!selectedId,
    initialData: selectedId === savedCheck?.id ? savedCheck : undefined,
  })
  const check = detail.data
  const query = selectedId ? detail : history
  return (
    <section className="mx-auto max-w-3xl space-y-5 pb-12">
      <Button
        variant="ghost"
        className="h-12 px-0 text-base"
        onClick={selectedId ? () => setSelectedId(null) : onClose}
      >
        <ArrowLeft /> {selectedId ? "กลับไปประวัติการเช็ค" : "กลับไปเช็คสต็อก"}
      </Button>
      <div>
        <h2
          ref={heading}
          tabIndex={-1}
          className="scroll-mt-24 text-xl font-semibold outline-none"
        >
          {selectedId ? "ผลเช็คที่บันทึกแล้ว" : "ประวัติการเช็ค"}
        </h2>
        <p className="mt-1 text-base text-muted-foreground">{branchName}</p>
      </div>
      {savedCheck && selectedId === savedCheck.id && (
        <p
          role="status"
          className="flex gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-900"
        >
          <Check className="size-5 shrink-0" /> บันทึกและปรับยอดคลังแล้ว{" "}
          {savedCheck.itemCount} รายการ
        </p>
      )}
      {query.isPending && <p role="status">กำลังโหลดผลเช็ค…</p>}
      {query.isError && (
        <div
          role="alert"
          className="space-y-3 rounded-lg bg-red-50 p-4 text-red-900"
        >
          <p>โหลดผลเช็คไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง</p>
          <Button
            variant="outline"
            className="h-12"
            onClick={() => void query.refetch()}
          >
            ลองอีกครั้ง
          </Button>
        </div>
      )}
      {selectedId && check && (
        <>
          <div className="space-y-1 border-b border-border pb-4 text-base">
            <p className="font-medium">{formatStockCheckTime(check.savedAt)}</p>
            <p>
              บันทึกโดย {check.createdByName} · {check.itemCount} รายการ
            </p>
            <p className="text-sm text-muted-foreground">
              ยอดก่อนและหลังปรับ ณ ครั้งที่บันทึก
            </p>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border bg-background">
            {check.items.map((item) => (
              <li key={item.id} className="space-y-3 p-4">
                <h3 className="break-words text-base font-semibold">
                  {item.name}
                </h3>
                <dl className="grid grid-cols-2 gap-3 text-base">
                  <div>
                    <dt className="text-sm text-muted-foreground">ก่อนปรับ</dt>
                    <dd className="mt-1 break-words tabular-nums">
                      {formatCount(item.systemQuantity)} {item.unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      นับได้จริง / หลังปรับ
                    </dt>
                    <dd className="mt-1 break-words font-semibold tabular-nums">
                      {formatCount(item.actualQuantity)} {item.unit}
                    </dd>
                  </div>
                </dl>
                <p
                  className={
                    item.difference === 0
                      ? "text-emerald-800"
                      : "text-amber-900"
                  }
                >
                  {differenceLabel(item.difference, item.unit)}
                </p>
                <p className="text-sm text-muted-foreground">
                  นับเมื่อ {formatStockCheckTime(item.countedAt)}
                </p>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            className="h-12 w-full text-base"
            onClick={onClose}
          >
            กลับไปเช็คสต็อก
          </Button>
        </>
      )}
      {!selectedId && history.data && (
        <>
          {history.data.checks.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border bg-background">
              {history.data.checks.map((item) => (
                <li key={item.id}>
                  <button
                    className="flex min-h-20 w-full items-center gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="block font-semibold">
                        {formatStockCheckTime(item.savedAt)}
                      </span>
                      <span className="block break-words text-sm text-muted-foreground">
                        {item.createdByName} · {item.itemCount} รายการ
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-border p-6 text-center text-muted-foreground">
              ยังไม่มีประวัติการเช็คของสาขานี้
            </p>
          )}
          {(offset > 0 || history.data.nextOffset !== null) && (
            <div className="flex gap-3">
              <Button
                className="h-12 flex-1"
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                ก่อนหน้า
              </Button>
              <Button
                className="h-12 flex-1"
                variant="outline"
                disabled={history.data.nextOffset === null}
                onClick={() => setOffset(history.data.nextOffset!)}
              >
                ถัดไป
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
