import type { InventoryItem } from "@/lib/easyreceipt-data"
import { formatCount, formatStockCheckTime } from "@/lib/stock-check"

export function LastStockCount({
  count,
}: {
  count: InventoryItem["lastCount"]
}) {
  if (!count)
    return <span className="text-sm text-muted-foreground">ยังไม่เคยนับ</span>
  return (
    <div className="space-y-1">
      <p className="font-semibold tabular-nums">
        {formatCount(count.quantity)} {count.unit}
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        {formatStockCheckTime(count.countedAt)}
      </p>
      <p className="break-words text-xs leading-5 text-muted-foreground">
        นับโดย {count.countedBy}
      </p>
    </div>
  )
}
