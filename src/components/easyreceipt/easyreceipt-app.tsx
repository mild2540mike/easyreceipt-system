"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ExcelJS from "exceljs"
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarIcon,
  ChefHat,
  CircleCheck,
  Clock3,
  Database,
  Download,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Minus,
  Package,
  Pencil,
  Pin,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { th } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  type EasyReceiptStore,
  type InventoryRow,
  type RecipeFormInput,
  type RecipeImpact,
  type StockStatus,
} from "@/hooks/use-easyreceipt-store"
import { useEasyReceipt } from "@/components/easyreceipt/easyreceipt-provider"
import type {
  MemberRole,
  MemberStatus,
  PurchaseItem,
  RecipeIngredient,
  ViewId,
} from "@/lib/easyreceipt-data"
import { cn } from "@/lib/utils"

type NavItem = {
  id: ViewId
  label: string
  shortLabel: string
  description: string
  href: string
  icon: LucideIcon
  color: string
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "แดชบอร์ด",
    shortLabel: "สรุป",
    description: "ภาพรวมต้นทุนและสต็อก",
    href: "/portal",
    icon: LayoutDashboard,
    color: "text-sky-700 bg-sky-50 border-sky-200",
  },
  {
    id: "purchase",
    label: "บันทึกการซื้อ",
    shortLabel: "ซื้อ",
    description: "ใบสรุปการซื้อและยอดรวม",
    href: "/portal/purchase",
    icon: ShoppingCart,
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "stock",
    label: "คลังวัตถุดิบ",
    shortLabel: "คลัง",
    description: "คงเหลือ แจ้งเตือน และจุดสั่งซื้อ",
    href: "/portal/stock",
    icon: Package,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    id: "recipes",
    label: "สูตรอาหาร",
    shortLabel: "สูตร",
    description: "ตัดสต็อกตามสูตรการใช้งาน",
    href: "/portal/recipes",
    icon: ChefHat,
    color: "text-rose-700 bg-rose-50 border-rose-200",
  },
  {
    id: "reports",
    label: "รายงาน",
    shortLabel: "รายงาน",
    description: "ต้นทุน กระแสเงินสด และยอดใช้",
    href: "/portal/reports",
    icon: BarChart3,
    color: "text-violet-700 bg-violet-50 border-violet-200",
  },
  {
    id: "members",
    label: "สมาชิก",
    shortLabel: "สมาชิก",
    description: "สิทธิ์ผู้ใช้งานและสถานะบัญชี",
    href: "/portal/members",
    icon: Users,
    color: "text-cyan-700 bg-cyan-50 border-cyan-200",
  },
]

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 2,
})

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.max(value, 0))
}

function formatNumber(value: number) {
  return decimalFormatter.format(value)
}

function formatMetricValue(metric: Store["reportCashFlowMetrics"][number]) {
  if (metric.id === "purchase-total") {
    return formatCurrency(metric.value)
  }

  return `${formatNumber(metric.value)} รายการ`
}

function metricHelper(metric: Store["reportCashFlowMetrics"][number]) {
  if (metric.id === "purchase-total") {
    return "รวมยอดซื้อจากฐานข้อมูล"
  }

  if (metric.id === "cooking-count") {
    return "จำนวนครั้งที่ปรุงสำเร็จ"
  }

  return "จำนวนความเคลื่อนไหวสต็อก"
}

function formatThaiDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatThaiTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function statusLabel(status: StockStatus) {
  if (status === "low") {
    return "ต่ำกว่าจุดสั่งซื้อ"
  }

  if (status === "watch") {
    return "เฝ้าระวัง"
  }

  return "พร้อมใช้"
}

function statusClassName(status: StockStatus) {
  if (status === "low") {
    return "border-red-200 bg-red-50 text-red-700"
  }

  if (status === "watch") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700"
}

function memberRoleLabel(role: MemberRole) {
  if (role === "owner") {
    return "เจ้าของระบบ"
  }

  if (role === "manager") {
    return "ผู้จัดการ"
  }

  if (role === "staff") {
    return "พนักงาน"
  }

  return "ผู้ดูรายงาน"
}

function memberStatusLabel(status: MemberStatus) {
  if (status === "active") {
    return "ใช้งาน"
  }

  if (status === "invited") {
    return "เชิญแล้ว"
  }

  return "ระงับ"
}

function memberStatusClassName(status: MemberStatus) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "invited") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-red-200 bg-red-50 text-red-700"
}

function lineTotal(item: PurchaseItem) {
  return item.quantity * item.unitPrice
}

function toNumber(value: string) {
  if (value.trim() === "") {
    return 0
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("th-TH")
}

function downloadCanvasPng(filename: string, canvas: HTMLCanvasElement) {
  const link = document.createElement("a")

  link.href = canvas.toDataURL("image/png")
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function downloadBlob(filename: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

async function exportPurchaseOrderXlsx({
  branchName,
  items,
}: {
  branchName: string
  items: InventoryRow[]
}) {
  const exportedAt = new Date()
  const dateKey = exportedAt.toISOString().slice(0, 10)
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Purchase Order", {
    views: [{ state: "frozen", ySplit: 5 }],
  })
  const border: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  }

  workbook.creator = "EasyReceipt"
  workbook.created = exportedAt
  worksheet.columns = [
    { key: "index", width: 8 },
    { key: "ingredient", width: 30 },
    { key: "supplier", width: 24 },
    { key: "onHand", width: 16 },
    { key: "suggested", width: 16 },
    { key: "unitPrice", width: 16 },
    { key: "total", width: 16 },
  ]

  worksheet.mergeCells("A1:G1")
  worksheet.getCell("A1").value = "ใบสั่งซื้อวัตถุดิบ"
  worksheet.getCell("A1").font = {
    bold: true,
    size: 20,
    color: { argb: "FF0F172A" },
  }
  worksheet.getCell("A1").alignment = { vertical: "middle" }
  worksheet.getRow(1).height = 34
  worksheet.getCell("A2").value = "สาขา"
  worksheet.getCell("B2").value = branchName || "-"
  worksheet.getCell("A3").value = "วันที่"
  worksheet.getCell("B3").value = formatThaiDate(exportedAt)
  worksheet.getCell("F3").value = "รวมประมาณการ"
  worksheet.getCell("G3").value = {
    formula: `SUM(G6:G${Math.max(5, items.length + 5)})`,
    result: items.reduce(
      (total, item) =>
        total + item.suggestedPurchaseQuantity * item.ingredient.defaultPrice,
      0
    ),
  }
  worksheet.getCell("G3").numFmt = '"฿"#,##0'

  for (const address of ["A2", "A3", "F3"]) {
    worksheet.getCell(address).font = { bold: true, color: { argb: "FF475569" } }
  }

  worksheet.addRow([])
  worksheet.addRow([
    "ลำดับ",
    "วัตถุดิบ",
    "ซัพพลายเออร์",
    "คงเหลือ",
    "ควรซื้อ",
    "ราคาต่อหน่วย",
    "รวม",
  ])
  worksheet.getRow(5).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF0F172A" } }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    }
    cell.border = border
    cell.alignment = { vertical: "middle", horizontal: "center" }
  })

  items.forEach((item, index) => {
    const rowNumber = index + 6
    const row = worksheet.addRow([
      index + 1,
      item.ingredient.name,
      item.ingredient.supplier,
      item.onHand,
      item.suggestedPurchaseQuantity,
      item.ingredient.defaultPrice,
      {
        formula: `E${rowNumber}*F${rowNumber}`,
        result: item.suggestedPurchaseQuantity * item.ingredient.defaultPrice,
      },
    ])

    row.eachCell((cell) => {
      cell.border = border
      cell.alignment = { vertical: "middle" }
    })
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
    for (const column of [4, 5, 6, 7]) {
      row.getCell(column).alignment = { horizontal: "right", vertical: "middle" }
    }
    row.getCell(4).numFmt = "#,##0.##"
    row.getCell(5).numFmt = "#,##0.##"
    row.getCell(6).numFmt = '"฿"#,##0'
    row.getCell(7).numFmt = '"฿"#,##0'
  })

  const totalRow = worksheet.addRow([
    "",
    "",
    "",
    "",
    "",
    "รวมประมาณการ",
    {
      formula: `SUM(G6:G${Math.max(5, items.length + 5)})`,
      result: items.reduce(
        (total, item) =>
          total + item.suggestedPurchaseQuantity * item.ingredient.defaultPrice,
        0
      ),
    },
  ])
  totalRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    }
    cell.border = border
    cell.alignment = { horizontal: "right", vertical: "middle" }
  })
  totalRow.getCell(7).numFmt = '"฿"#,##0'

  worksheet.autoFilter = {
    from: "A5",
    to: `G${Math.max(5, items.length + 5)}`,
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const bytes = new Uint8Array(buffer)
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)

  downloadBlob(
    `easyreceipt-purchase-order-${dateKey}.xlsx`,
    new Blob([copy], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  )
}

function exportPurchaseOrderPng({
  branchName,
  items,
}: {
  branchName: string
  items: InventoryRow[]
}) {
  const exportedAt = new Date()
  const dateKey = exportedAt.toISOString().slice(0, 10)
  const width = 1200
  const rowHeight = 56
  const height = 270 + items.length * rowHeight
  const scale = 2
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")

  if (!context) {
    return
  }

  const drawingContext: CanvasRenderingContext2D = context

  canvas.width = width * scale
  canvas.height = height * scale
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  drawingContext.scale(scale, scale)

  function text(
    value: string,
    x: number,
    y: number,
    options: {
      align?: CanvasTextAlign
      color?: string
      font?: string
      maxWidth?: number
    } = {}
  ) {
    drawingContext.textAlign = options.align ?? "left"
    drawingContext.fillStyle = options.color ?? "#0f172a"
    drawingContext.font = options.font ?? "16px Arial, sans-serif"

    if (options.maxWidth) {
      let nextValue = value

      while (
        nextValue.length > 1 &&
        drawingContext.measureText(nextValue).width > options.maxWidth
      ) {
        nextValue = `${nextValue.slice(0, -2)}…`
      }

      drawingContext.fillText(nextValue, x, y)
      return
    }

    drawingContext.fillText(value, x, y)
  }

  const total = items.reduce(
    (sum, item) =>
      sum + item.suggestedPurchaseQuantity * item.ingredient.defaultPrice,
    0
  )

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)
  context.fillStyle = "#f8fafc"
  context.fillRect(0, 0, width, 160)
  context.strokeStyle = "#cbd5e1"
  context.lineWidth = 1
  context.strokeRect(32, 32, width - 64, height - 64)

  text("ใบสั่งซื้อวัตถุดิบ", 64, 78, {
    font: "700 30px Arial, sans-serif",
  })
  text(`สาขา: ${branchName || "-"}`, 64, 112, {
    color: "#475569",
    font: "16px Arial, sans-serif",
  })
  text(`วันที่: ${formatThaiDate(exportedAt)}`, width - 64, 78, {
    align: "right",
    color: "#475569",
    font: "16px Arial, sans-serif",
  })
  text(`รวมประมาณการ ${formatCurrency(total)}`, width - 64, 118, {
    align: "right",
    font: "700 22px Arial, sans-serif",
  })

  const tableTop = 190
  const columns = [64, 120, 410, 620, 760, 900, 1068]
  const headers = [
    "#",
    "วัตถุดิบ",
    "ซัพพลายเออร์",
    "คงเหลือ",
    "ควรซื้อ",
    "ราคาต่อหน่วย",
    "รวม",
  ]

  context.fillStyle = "#f1f5f9"
  context.fillRect(48, tableTop - 36, width - 96, 44)
  headers.forEach((header, index) => {
    text(header, columns[index], tableTop - 9, {
      align: index === 0 ? "center" : index >= 3 ? "right" : "left",
      color: "#334155",
      font: "700 14px Arial, sans-serif",
    })
  })

  items.forEach((item, index) => {
    const y = tableTop + index * rowHeight

    context.strokeStyle = "#e2e8f0"
    context.beginPath()
    context.moveTo(48, y + 8)
    context.lineTo(width - 48, y + 8)
    context.stroke()

    text(String(index + 1), columns[0], y + 41, { align: "center" })
    text(item.ingredient.name, columns[1], y + 31, {
      font: "700 16px Arial, sans-serif",
      maxWidth: 260,
    })
    text(item.ingredient.category, columns[1], y + 51, {
      color: "#64748b",
      font: "13px Arial, sans-serif",
      maxWidth: 260,
    })
    text(item.ingredient.supplier, columns[2], y + 41, { maxWidth: 170 })
    text(
      `${formatNumber(item.onHand)} ${item.ingredient.unit}`,
      columns[3],
      y + 41,
      { align: "right" }
    )
    text(
      `${formatNumber(item.suggestedPurchaseQuantity)} ${item.ingredient.unit}`,
      columns[4],
      y + 41,
      { align: "right", font: "700 16px Arial, sans-serif" }
    )
    text(formatCurrency(item.ingredient.defaultPrice), columns[5], y + 41, {
      align: "right",
    })
    text(
      formatCurrency(
        item.suggestedPurchaseQuantity * item.ingredient.defaultPrice
      ),
      columns[6],
      y + 41,
      { align: "right", font: "700 16px Arial, sans-serif" }
    )
  })

  const totalY = tableTop + items.length * rowHeight + 36
  context.fillStyle = "#f8fafc"
  context.fillRect(48, totalY - 28, width - 96, 48)
  text("รวมประมาณการ", columns[5], totalY + 2, {
    align: "right",
    font: "700 18px Arial, sans-serif",
  })
  text(formatCurrency(total), columns[6], totalY + 2, {
    align: "right",
    font: "700 20px Arial, sans-serif",
  })

  downloadCanvasPng(`easyreceipt-purchase-order-${dateKey}.png`, canvas)
}

export function EasyReceiptLogin() {
  const store = useEasyReceipt()
  const router = useRouter()

  useEffect(() => {
    if (store.isAuthReady && store.currentMember) {
      router.replace("/portal")
    }
  }, [router, store.currentMember, store.isAuthReady])

  if (!store.isAuthReady || store.currentMember) {
    return <AuthLoadingScreen />
  }

  return (
    <LoginView
      store={store}
      onLoginSuccess={() => {
        router.replace("/portal")
      }}
    />
  )
}

export function EasyReceiptApp() {
  return <EasyReceiptPortalPage activeView="dashboard" />
}

export function EasyReceiptPortalPage({
  activeView,
  children,
}: {
  activeView: ViewId
  children?: ReactNode
}) {
  const store = useEasyReceipt()
  const router = useRouter()

  useEffect(() => {
    if (store.isAuthReady && !store.currentMember) {
      router.replace("/")
    }
  }, [router, store.currentMember, store.isAuthReady])

  if (!store.isAuthReady || !store.currentMember) {
    return <AuthLoadingScreen />
  }

  function handleLogout() {
    store.logout()
    router.replace("/")
  }

  const activeItem =
    navItems.find((item) => item.id === activeView) ?? navItems[0]
  const ActiveIcon = activeItem.icon

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <DesktopSidebar
          activeView={activeView}
          currentMember={store.currentMember}
          onLogout={handleLogout}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
            <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg border",
                  activeItem.color
                )}
              >
                <ActiveIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  EasyReceipt System
                </p>
                <h1 className="truncate text-lg font-semibold sm:text-xl">
                  {activeItem.label}
                </h1>
              </div>

              <AlertSheet lowStockItems={store.lowStockItems} />

              <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 lg:flex">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background">
                  <UserRound className="size-4 text-sky-700" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {store.currentMember.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {memberRoleLabel(store.currentMember.role)}
                  </p>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-lg"
                      className="h-11 w-11"
                      onClick={handleLogout}
                    />
                  }
                >
                  <LogOut className="size-5" />
                  <span className="sr-only">ออกจากระบบ</span>
                </TooltipTrigger>
                <TooltipContent>ออกจากระบบ</TooltipContent>
              </Tooltip>

              <BranchSwitcher store={store} />
            </div>
          </header>

          <main className="flex-1 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-8">
            {children ?? (
              <>
                {activeView === "dashboard" && <DashboardView store={store} />}
                {activeView === "purchase" && <PurchaseView store={store} />}
                {activeView === "stock" && <StockView store={store} />}
                {activeView === "recipes" && <RecipesView store={store} />}
                {activeView === "reports" && <ReportsView store={store} />}
                {activeView === "members" && <MembersView store={store} />}
              </>
            )}
          </main>
        </div>
      </div>

      <MobileBottomNav activeView={activeView} />
    </div>
  )
}

function AuthLoadingScreen() {
  return (
    <main className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-background/80 px-4 text-foreground backdrop-blur-md">
      <LoaderCircle className="size-10 animate-spin text-primary" />
      <span className="sr-only">กำลังตรวจสอบสิทธิ์</span>
    </main>
  )
}

type Store = EasyReceiptStore

function LoginView({
  store,
  onLoginSuccess,
}: {
  store: Store
  onLoginSuccess: () => void
}) {
  const [email, setEmail] = useState("owner@easyreceipt.local")
  const [password, setPassword] = useState("123456")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const ok = await store.login(email, password)

    if (!ok) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่ได้เปิดใช้งาน")
      return
    }

    setError("")
    onLoginSuccess()
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl items-center">
        <section className="w-full rounded-lg border border-border bg-background p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ReceiptText className="size-6" />
            </div>
            <div>
              <p className="text-xl font-semibold">EasyReceipt</p>
              <p className="text-sm text-muted-foreground">
                เข้าสู่ระบบจัดการใบซื้อและคลังวัตถุดิบ
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label className="mb-2 block">อีเมล</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  className="h-12 pl-9"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">รหัสผ่าน</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  className="h-12 pl-9"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-12 w-full"
              disabled={store.isLoginPending}
            >
              {store.isLoginPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              เข้าสู่ระบบ
            </Button>
          </form>

          <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <LockKeyhole className="size-4" />
              บัญชีทดลอง
            </div>
            <p>owner@easyreceipt.local / 123456</p>
            <p>manager@easyreceipt.local / 123456</p>
            <p>staff@easyreceipt.local / 123456</p>
          </div>
        </section>
      </div>
    </main>
  )
}

function DesktopSidebar({
  activeView,
  currentMember,
  onLogout,
}: {
  activeView: ViewId
  currentMember: Store["currentMember"]
  onLogout: () => void
}) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-background px-4 py-5 lg:block">
      <div className="mb-7 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ReceiptText className="size-6" />
        </div>
        <div>
          <p className="text-xl font-semibold">EasyReceipt</p>
          <p className="text-sm text-muted-foreground">Purchase & Stock UI</p>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <Link
              key={item.id}
              className={cn(
                buttonVariants({
                  variant: isActive ? "secondary" : "ghost",
                  className:
                    "h-auto min-h-14 w-full justify-start gap-3 px-3 py-3 text-left",
                }),
                isActive && "bg-muted"
              )}
              href={item.href}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                  item.color
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block whitespace-normal text-xs text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          )
        })}
      </nav>

      <Separator className="my-5" />

      {currentMember && (
        <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-950">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-background">
              <ShieldCheck className="size-4 text-sky-700" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {currentMember.name}
              </p>
              <p className="truncate text-xs text-sky-700">
                {memberRoleLabel(currentMember.role)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 w-full bg-background"
            onClick={onLogout}
          >
            <LogOut className="size-4" />
            ออกจากระบบ
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Star className="size-4 fill-amber-400 text-amber-500" />
          ฟังก์ชันเสริม
        </div>
        <ul className="space-y-2 text-xs">
          <li>Auto sum ยอดซื้อ</li>
          <li>แจ้งเตือน Stock อัปเดต</li>
          <li>รายงานต้นทุนและเงินสด</li>
        </ul>
      </div>
    </aside>
  )
}

function MobileBottomNav({
  activeView,
}: {
  activeView: ViewId
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-2 py-2 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <Link
              key={item.id}
              className={cn(
                buttonVariants({
                  variant: isActive ? "secondary" : "ghost",
                  className: "h-14 min-w-0 flex-col gap-1 px-1 text-[0.72rem]",
                }),
                isActive && "bg-muted text-foreground"
              )}
              href={item.href}
            >
              <Icon className="size-5" />
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function AlertSheet({ lowStockItems }: { lowStockItems: InventoryRow[] }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            className="relative h-11 w-11"
          />
        }
      >
        <AlertTriangle className="size-5 text-amber-600" />
        {lowStockItems.length > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-600 text-[0.68rem] font-semibold text-white">
            {lowStockItems.length}
          </span>
        )}
        <span className="sr-only">แจ้งเตือนสต็อก</span>
      </SheetTrigger>

      <SheetContent side="right" className="w-[92vw] max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>แจ้งเตือนวัตถุดิบ</SheetTitle>
          <SheetDescription>
            รายการที่คงเหลือไม่พอต่อการจองใช้จากสูตรอาหาร
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-4">
          {lowStockItems.map((item) => (
            <div
              key={item.ingredientId}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.ingredient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ควรซื้อเพิ่ม {formatNumber(item.suggestedPurchaseQuantity)}{" "}
                    {item.ingredient.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    คงเหลือ {formatNumber(item.onHand)}{" "}
                    {item.ingredient.unit}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("h-6", statusClassName(item.status))}
                >
                  {statusLabel(item.status)}
                </Badge>
              </div>
              <Progress value={item.stockPercent} className="mt-3" />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function BranchSwitcher({ store }: { store: Store }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="h-11 w-11 px-0 sm:w-auto sm:px-3"
          />
        }
      >
        <Building2 className="size-5 text-sky-700" />
        <span className="hidden max-w-32 truncate text-sm sm:inline">
          {store.activeBranch?.code}
        </span>
        <span className="sr-only">เลือกโรงเรียนหรือสาขา</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1rem))] p-2">
        <div className="border-b border-border px-2 pb-2">
          <p className="font-semibold">เลือกโรงเรียน/สาขา</p>
          <p className="text-xs text-muted-foreground">
            แสดงเฉพาะสาขาที่บัญชีนี้มีสิทธิ์
          </p>
        </div>
        <div className="mt-2 space-y-1">
          {store.accessibleBranches.map((branch) => {
            const isActive = branch.id === store.activeBranchId

            return (
              <button
                key={branch.id}
                type="button"
                className={cn(
                  "flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-muted",
                  isActive && "bg-sky-50 text-sky-950"
                )}
                onClick={() => store.setActiveBranch(branch.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {branch.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {branch.code} · {branch.location}
                  </span>
                </span>
                {isActive ? (
                  <Badge
                    variant="outline"
                    className="h-7 shrink-0 border-sky-200 bg-sky-50 text-sky-700"
                  >
                    ใช้งาน
                  </Badge>
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-xs text-muted-foreground">
                    {branch.code}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DashboardView({ store }: { store: Store }) {
  return (
    <div className="space-y-5">
      {store.isDashboardLoading && (
        <div className="flex min-h-14 items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm text-sky-900">
          <LoaderCircle className="size-4 animate-spin" />
          กำลังโหลดแดชบอร์ดจากฐานข้อมูล
        </div>
      )}

      {store.dashboardError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {store.dashboardError}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="ยอดซื้อรวมล่าสุด"
          value={formatCurrency(store.currentPurchaseTotal)}
          helper="คำนวณอัตโนมัติจากใบซื้อ"
          icon={ShoppingCart}
          tone="border-amber-200 bg-amber-50 text-amber-800"
        />
        <MetricCard
          label="ยอดซื้อรวมในสาขา"
          value={formatCurrency(store.dashboardSummary.purchaseTotal)}
          helper="รวมจากใบซื้อที่บันทึกในฐานข้อมูล"
          icon={ReceiptText}
          tone="border-emerald-200 bg-emerald-50 text-emerald-800"
        />
        <MetricCard
          label="สต็อกต้องดูแล"
          value={`${store.dashboardSummary.stockNeedCount} รายการ`}
          helper="คงเหลือไม่พอต่อการจองใช้"
          icon={AlertTriangle}
          tone="border-red-200 bg-red-50 text-red-800"
        />
        <MetricCard
          label="รายการที่ปรุงแล้ว"
          value={`${store.dashboardSummary.cookingCount} รายการ`}
          helper="นับจาก cooking runs ในฐานข้อมูล"
          icon={ChefHat}
          tone="border-teal-200 bg-teal-50 text-teal-800"
        />
      </section>

      <PurchaseOrderSection store={store} />
    </div>
  )
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  helper: string
  icon: LucideIcon
  tone: string
}) {
  return (
    <Card size="sm" className="rounded-lg">
      <CardHeader className="gap-2">
        <CardAction>
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border sm:size-10",
              tone
            )}
          >
            <Icon className="size-4 sm:size-5" />
          </span>
        </CardAction>
        <CardDescription className="pr-10 text-sm leading-snug sm:text-base">
          {label}
        </CardDescription>
        <CardTitle className="text-xl leading-tight sm:text-2xl">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
          {helper}
        </p>
      </CardContent>
    </Card>
  )
}

function PurchaseOrderSection({ store }: { store: Store }) {
  const purchaseOrderTotal = store.lowStockItems.reduce(
    (total, item) =>
      total + item.suggestedPurchaseQuantity * item.ingredient.defaultPrice,
    0
  )

  function handleExportPurchaseOrder() {
    exportPurchaseOrderXlsx({
      branchName: store.activeBranch?.name ?? "",
      items: store.lowStockItems,
    })
  }

  function handleExportPurchaseOrderImage() {
    exportPurchaseOrderPng({
      branchName: store.activeBranch?.name ?? "",
      items: store.lowStockItems,
    })
  }

  return (
    <section className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ReceiptText className="size-5 text-amber-600" />
            <h2 className="text-lg font-semibold">ใบสั่งซื้อวัตถุดิบ</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            สร้างจากรายการที่ควรซื้อเพิ่มของ {store.activeBranch?.name ?? "สาขาที่เลือก"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary" className="h-7 px-3">
              {store.lowStockItems.length} รายการ
            </Badge>
            <Badge variant="outline" className="h-7 px-3">
              รวมประมาณการ {formatCurrency(purchaseOrderTotal)}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
          <Button
            variant="outline"
            className="h-9 min-w-0 px-2 text-sm sm:h-11 sm:w-auto sm:px-4 sm:text-base"
            onClick={handleExportPurchaseOrderImage}
            disabled={store.lowStockItems.length === 0}
          >
            <Download className="size-4" />
            <span className="truncate">Export PNG</span>
          </Button>
          <Button
            variant="outline"
            className="h-9 min-w-0 px-2 text-sm sm:h-11 sm:w-auto sm:px-4 sm:text-base"
            onClick={handleExportPurchaseOrder}
            disabled={store.lowStockItems.length === 0}
          >
            <Download className="size-4" />
            <span className="truncate">Export XLSX</span>
          </Button>
        </div>
      </div>

      {store.lowStockItems.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">#</TableHead>
                <TableHead>วัตถุดิบ</TableHead>
                <TableHead>ซัพพลายเออร์</TableHead>
                <TableHead className="text-right">คงเหลือ</TableHead>
                <TableHead className="text-right">ควรซื้อ</TableHead>
                <TableHead className="text-right">ราคาต่อหน่วย</TableHead>
                <TableHead className="text-right">รวม</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.lowStockItems.map((item, index) => (
                <TableRow key={item.ingredientId}>
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.ingredient.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.ingredient.category}
                    </div>
                  </TableCell>
                  <TableCell>{item.ingredient.supplier}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(item.onHand)} {item.ingredient.unit}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatNumber(item.suggestedPurchaseQuantity)}{" "}
                    {item.ingredient.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.ingredient.defaultPrice)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(
                      item.suggestedPurchaseQuantity *
                        item.ingredient.defaultPrice
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40">
                <TableCell colSpan={6} className="text-right font-semibold">
                  รวมประมาณการ
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(purchaseOrderTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            วัตถุดิบเพียงพอต่อการจองใช้ปัจจุบัน
          </div>
        </div>
      )}
    </section>
  )
}

function PurchaseView({ store }: { store: Store }) {
  const [purchaseMessage, setPurchaseMessage] = useState("")
  const savedPurchaseRows = store.savedPurchasesForDate.flatMap((purchase) =>
    purchase.items.map((item) => ({ purchase, item }))
  )
  const draftItemIndexOffset = savedPurchaseRows.length

  async function handleSubmitPurchase() {
    setPurchaseMessage("")
    const result = await store.submitPurchase()

    if (!result.ok) {
      setPurchaseMessage(result.error ?? "ไม่สามารถบันทึกใบซื้อได้")
      return
    }

    setPurchaseMessage("บันทึกใบซื้อเข้าฐานข้อมูลและอัปเดตคลังวัตถุดิบแล้ว")
  }

  function handleAutoSuggestedPurchase() {
    setPurchaseMessage("")
    const ok = store.addSuggestedPurchaseItems()

    setPurchaseMessage(
      ok
        ? "เพิ่มรายการที่ควรซื้อเข้าร่างใบซื้อแล้ว"
        : "ยังไม่มีรายการที่ควรซื้อเพิ่ม"
    )
  }

  return (
    <div className="space-y-5">
      {store.isPurchasesLoading && (
        <div className="flex min-h-14 items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm text-sky-900">
          <LoaderCircle className="size-4 animate-spin" />
          กำลังโหลดประวัติใบซื้อจากฐานข้อมูล
        </div>
      )}

      {(store.purchaseError || purchaseMessage) && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            store.purchaseError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {store.purchaseError || purchaseMessage}
        </div>
      )}

      <section className="rounded-lg border border-border bg-background p-4 sm:p-5">
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ShoppingCart className="size-5 text-amber-600" />
              <h2 className="text-lg font-semibold">ใบสรุปการซื้อของ</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              กรอกวัตถุดิบ ปริมาณ และราคาต่อหน่วย ระบบจะรวมยอดให้ทันที
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="h-7 px-3">
                ร่าง {store.purchaseItems.length} รายการ
              </Badge>
              <Badge variant="outline" className="h-7 px-3">
                บันทึกแล้ว {store.savedPurchasesForDate.length} ใบ /{" "}
                {formatCurrency(store.savedPurchaseTotalForDate)}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-52">
              <Label className="mb-2 block">วันที่</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="h-11 w-full justify-start px-3 text-left"
                    />
                  }
                >
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  {formatThaiDate(store.purchaseDate)}
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={store.purchaseDate}
                    onSelect={(date) => {
                      if (date) {
                        store.setPurchaseDate(date)
                      }
                    }}
                    locale={th}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible rounded-lg border border-border">
          <Table className="min-w-[52rem] text-xs sm:text-sm lg:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center sm:w-16">#</TableHead>
                <TableHead className="w-80 sm:w-96">ชื่อวัตถุดิบ</TableHead>
                <TableHead className="w-24 sm:w-36">ปริมาณ</TableHead>
                <TableHead className="w-20 sm:w-28">หน่วย</TableHead>
                <TableHead className="w-28 sm:w-40">ราคาต่อหน่วย</TableHead>
                <TableHead className="w-24 text-right sm:w-36">ราคารวม</TableHead>
                <TableHead className="w-12 sm:w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {savedPurchaseRows.map(({ purchase, item }, itemIndex) => (
                <SavedPurchaseTableRow
                  key={`${purchase.id}-${item.id}`}
                  purchase={purchase}
                  item={item}
                  index={itemIndex}
                  store={store}
                />
              ))}
              {store.purchaseItems.map((item, index) => (
                <PurchaseTableRow
                  key={item.id}
                  index={draftItemIndexOffset + index}
                  item={item}
                  store={store}
                />
              ))}
              {store.savedPurchasesForDate.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-16 text-center text-sm text-muted-foreground"
                  >
                    ยังไม่มีใบซื้อที่บันทึกในวันที่เลือก
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-11"
              onClick={handleAutoSuggestedPurchase}
              disabled={store.lowStockItems.length === 0}
            >
              <Sparkles className="size-4" />
              Auto รายการควรซื้อ
            </Button>
            <Button className="h-11" onClick={store.addPurchaseItem}>
              <Plus className="size-4" />
              เพิ่มรายการ
            </Button>
            <Button
              className="h-11"
              onClick={handleSubmitPurchase}
              disabled={store.isPurchaseSaving}
            >
              {store.isPurchaseSaving ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  บันทึกใบซื้อ
                </>
              )}
            </Button>
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-950 sm:min-w-80">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold">ราคาร่างใบซื้อ</span>
              <span className="text-xl font-bold">
                {formatCurrency(store.currentPurchaseTotal)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 border-t border-sky-200 pt-2">
              <span className="text-sm font-medium text-sky-800">
                บันทึกแล้วของวันที่เลือก
              </span>
              <span className="font-semibold">
                {formatCurrency(store.savedPurchaseTotalForDate)}
              </span>
            </div>
            <p className="mt-1 text-sm text-sky-700">
              ระบบใช้ยอดนี้ไปคำนวณรายงานและอัปเดตคงเหลือในคลัง
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {store.inventoryRows
          .filter((item) => item.incoming > 0)
          .map((item) => (
            <div
              key={item.ingredientId}
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
            >
              <p className="font-semibold">{item.ingredient.name}</p>
              <p className="text-sm text-emerald-800">
                รับเข้า +{formatNumber(item.incoming)} {item.ingredient.unit}
              </p>
              <p className="mt-2 text-sm">
                คงเหลือในคลังตอนนี้ {formatNumber(item.projected)}{" "}
                {item.ingredient.unit}
              </p>
            </div>
          ))}
      </section>
    </div>
  )
}

function SavedPurchaseTableRow({
  purchase,
  item,
  index,
  store,
}: {
  purchase: Store["savedPurchasesForDate"][number]
  item: Store["savedPurchasesForDate"][number]["items"][number]
  index: number
  store: Store
}) {
  const ingredient = item.ingredient ?? store.ingredientById.get(item.ingredientId)

  return (
    <TableRow className="bg-muted/30">
      <TableCell className="text-center align-top">
        <div className="font-medium">{index + 1}</div>
        <div className="text-xs text-muted-foreground">
          {formatThaiTime(purchase.purchasedAt)}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{ingredient?.name ?? "วัตถุดิบ"}</div>
        <div className="text-xs text-muted-foreground">
          {purchase.vendor || "ไม่ระบุผู้ขาย"}
        </div>
      </TableCell>
      <TableCell>{formatNumber(item.quantity)}</TableCell>
      <TableCell>{item.unit}</TableCell>
      <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
      <TableCell className="text-right font-semibold">
        {formatCurrency(item.lineTotal)}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="h-7">
          บันทึกแล้ว
        </Badge>
      </TableCell>
    </TableRow>
  )
}

function PurchaseTableRow({
  index,
  item,
  store,
}: {
  index: number
  item: PurchaseItem
  store: Store
}) {
  return (
    <TableRow>
      <TableCell className="text-center align-top">{index + 1}</TableCell>
      <TableCell className="overflow-visible">
        <IngredientSelect
          key={`${item.id}-${item.ingredientId}`}
          item={item}
          store={store}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="1"
          value={item.quantity}
          onChange={(event) =>
            store.updatePurchaseItem(item.id, {
              quantity: toNumber(event.target.value),
            })
          }
          className="h-9 px-2 text-sm sm:h-11 sm:px-3"
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-9 px-2 text-sm sm:h-11 sm:px-3"
          value={item.unit}
          onChange={(event) =>
            store.updatePurchaseItem(item.id, { unit: event.target.value })
          }
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="1"
          value={item.unitPrice}
          onChange={(event) =>
            store.updatePurchaseItem(item.id, {
              unitPrice: toNumber(event.target.value),
            })
          }
          className="h-9 px-2 text-sm sm:h-11 sm:px-3"
        />
      </TableCell>
      <TableCell className="text-right font-semibold">
        {formatCurrency(lineTotal(item))}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon-lg"
          className="h-9 w-9 sm:h-11 sm:w-11"
          onClick={() => store.removePurchaseItem(item.id)}
          disabled={store.purchaseItems.length === 1}
        >
          <Trash2 className="size-4" />
          <span className="sr-only">ลบรายการ</span>
        </Button>
      </TableCell>
    </TableRow>
  )
}

function IngredientSelect({
  item,
  store,
}: {
  item: PurchaseItem
  store: Store
}) {
  const selectedIngredient = store.ingredientById.get(item.ingredientId)
  const [query, setQuery] = useState(selectedIngredient?.name ?? "")
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const searchTerm = normalizeSearch(query)
  const unitTerm = normalizeSearch(item.unit.trim() || "กก.")
  const exactIngredient = store.ingredients.find(
    (ingredient) =>
      normalizeSearch(ingredient.name) === searchTerm &&
      normalizeSearch(ingredient.unit) === unitTerm
  )
  const suggestionRows = store.inventoryRows
    .filter((row) => {
      if (!searchTerm) {
        return true
      }

      return [row.ingredient.name, row.ingredient.category, row.ingredient.supplier]
        .map(normalizeSearch)
        .some((value) => value.includes(searchTerm))
    })
    .sort((left, right) => {
      const leftName = normalizeSearch(left.ingredient.name)
      const rightName = normalizeSearch(right.ingredient.name)
      const leftStarts = leftName.startsWith(searchTerm) ? 0 : 1
      const rightStarts = rightName.startsWith(searchTerm) ? 0 : 1

      if (leftStarts !== rightStarts) {
        return leftStarts - rightStarts
      }

      return left.ingredient.name.localeCompare(right.ingredient.name, "th")
    })
    .slice(0, 7)
  const canAddIngredient = Boolean(query.trim()) && !exactIngredient

  function handleSelectIngredient(ingredientId: string) {
    const ingredient = store.ingredientById.get(ingredientId)

    if (!ingredient) {
      return
    }

    store.updatePurchaseItem(item.id, { ingredientId })
    setQuery(ingredient.name)
    setIsOpen(false)
  }

  async function handleAddIngredient() {
    if (isAdding || store.isIngredientSaving) {
      return
    }

    setIsAdding(true)
    const ingredient = await store.addIngredientFromPurchase({
      name: query,
      unit: item.unit,
      unitPrice: item.unitPrice,
    })
    setIsAdding(false)

    if (!ingredient) {
      return
    }

    store.updatePurchaseItem(item.id, { ingredientId: ingredient.id })
    setQuery(ingredient.name)
    setIsOpen(false)
  }

  return (
    <div className="relative min-w-72 sm:min-w-80">
      <Label className="mb-2 block lg:hidden">ชื่อวัตถุดิบ</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9 text-sm sm:h-11"
          value={query}
          placeholder="พิมพ์ค้นชื่อวัตถุดิบ"
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
        />
      </div>

      {isOpen && (
        <div className="left-0 top-[calc(100%+0.25rem)] z-50 max-h-80 w-full min-w-72 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg sm:min-w-80">
          {suggestionRows.map((row) => (
            <button
              key={row.ingredientId}
              type="button"
              className={cn(
                "flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-muted",
                row.ingredientId === item.ingredientId && "bg-muted"
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelectIngredient(row.ingredientId)}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {row.ingredient.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {row.ingredient.category} · {row.ingredient.supplier}
                </span>
              </span>
              <Badge variant="secondary" className="h-6 shrink-0">
                {row.ingredient.unit}
              </Badge>
            </button>
          ))}

          {canAddIngredient && (
            <button
              type="button"
              className="mt-1 flex min-h-12 w-full items-center gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-left text-amber-900 hover:bg-amber-100"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleAddIngredient}
              disabled={isAdding || store.isIngredientSaving}
            >
              {isAdding || store.isIngredientSaving ? (
                <LoaderCircle className="size-4 shrink-0 animate-spin" />
              ) : (
                <Plus className="size-4 shrink-0" />
              )}
              <span className="min-w-0">
                <span className="block font-medium">
                  เพิ่ม “{query.trim()}”
                </span>
                <span className="block text-xs">
                  หน่วย {item.unit.trim() || "กก."} · ราคา{" "}
                  {formatCurrency(item.unitPrice)}
                </span>
              </span>
            </button>
          )}

          {suggestionRows.length === 0 && !canAddIngredient && (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              พิมพ์ชื่อวัตถุดิบเพื่อค้นหาหรือเพิ่มรายการใหม่
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FieldNumber({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(toNumber(event.target.value))}
        disabled={disabled}
        className="h-11"
      />
    </div>
  )
}

const newIngredientCategory = "วัตถุดิบใหม่"

function StockView({ store }: { store: Store }) {
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(
    null
  )
  const [stockDraft, setStockDraft] = useState(() =>
    createStockEditDraft(store.inventoryRows[0])
  )
  const [stockMessage, setStockMessage] = useState("")
  const [stockSearch, setStockSearch] = useState("")
  const [stockCategory, setStockCategory] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [stockFilterModalOpen, setStockFilterModalOpen] = useState(false)
  const editingItem = store.inventoryRows.find(
    (item) => item.ingredientId === editingIngredientId
  )
  const stockCategoryOptions = Array.from(
    new Set(store.inventoryRows.map((item) => item.ingredient.category))
  ).sort((left, right) => {
    if (left === newIngredientCategory) {
      return -1
    }

    if (right === newIngredientCategory) {
      return 1
    }

    return left.localeCompare(right, "th")
  })
  const visibleInventoryRows = store.inventoryRows
    .filter((item) => {
      const searchTerm = normalizeSearch(stockSearch)
      const matchesSearch =
        !searchTerm ||
        [
          item.ingredient.name,
          item.ingredient.category,
          item.ingredient.supplier,
          item.ingredient.unit,
        ]
          .map(normalizeSearch)
          .some((value) => value.includes(searchTerm))
      const matchesCategory =
        stockCategory === "all" || item.ingredient.category === stockCategory
      const matchesStatus =
        stockFilter === "all" ||
        (stockFilter === "new" &&
          item.ingredient.category === newIngredientCategory) ||
        (stockFilter === "incoming" && item.incoming > 0) ||
        item.status === stockFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
    .sort((left, right) => {
      const leftIsNew = left.ingredient.category === newIngredientCategory
      const rightIsNew = right.ingredient.category === newIngredientCategory

      if (leftIsNew !== rightIsNew) {
        return leftIsNew ? -1 : 1
      }

      if (left.suggestedPurchaseQuantity !== right.suggestedPurchaseQuantity) {
        return right.suggestedPurchaseQuantity - left.suggestedPurchaseQuantity
      }

      if (left.incoming !== right.incoming) {
        return right.incoming - left.incoming
      }

      return left.ingredient.name.localeCompare(right.ingredient.name, "th")
    })
  const newIngredientCount = store.inventoryRows.filter(
    (item) => item.ingredient.category === newIngredientCategory
  ).length
  const incomingCount = store.inventoryRows.filter((item) => item.incoming > 0)
    .length
  const hasStockFilters =
    Boolean(stockSearch.trim()) || stockCategory !== "all" || stockFilter !== "all"
  const stockFilterOptions = [
    { id: "all", label: "ทั้งหมด" },
    { id: "new", label: `วัตถุดิบใหม่ ${newIngredientCount}` },
    { id: "low", label: `ต้องดูแล ${store.lowStockItems.length}` },
    { id: "incoming", label: `รับเข้า ${incomingCount}` },
    { id: "ok", label: "พร้อมใช้" },
  ]

  function clearStockFilters() {
    setStockSearch("")
    setStockCategory("all")
    setStockFilter("all")
  }

  function stockFilterButtonClass(isActive: boolean) {
    return cn(
      "h-10 rounded-lg border px-3 text-sm font-medium transition",
      isActive
        ? "border-sky-300 bg-sky-50 text-sky-800"
        : "border-border bg-background text-muted-foreground hover:bg-muted"
    )
  }

  function renderStockFilterControls({ modal = false }: { modal?: boolean } = {}) {
    return (
      <>
        <div
          className={cn(
            "grid gap-3",
            modal ? "grid-cols-1" : "lg:grid-cols-[1fr_15rem_auto] lg:items-end"
          )}
        >
          <div>
            <Label className="mb-2 block">ค้นหาวัตถุดิบ</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 pl-9"
                value={stockSearch}
                placeholder="ค้นหาชื่อ หมวดหมู่ หน่วย หรือซัพพลายเออร์"
                onChange={(event) => setStockSearch(event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">หมวดหมู่</Label>
            <Select
              value={stockCategory}
              onValueChange={(value) => setStockCategory(value ?? "all")}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue>
                  {(value) => (value === "all" ? "ทุกหมวดหมู่" : value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all" label="ทุกหมวดหมู่">
                  ทุกหมวดหมู่
                </SelectItem>
                {stockCategoryOptions.map((category) => (
                  <SelectItem key={category} value={category} label={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="h-11"
            onClick={clearStockFilters}
            disabled={!hasStockFilters}
          >
            ล้างตัวกรอง
          </Button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {stockFilterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn(
                stockFilterButtonClass(stockFilter === option.id),
                "shrink-0"
              )}
              onClick={() => setStockFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          แสดง {visibleInventoryRows.length} จาก {store.inventoryRows.length} รายการ · วัตถุดิบใหม่ถูกเรียงไว้บนสุด
        </p>
        {modal && (
          <Button className="mt-4 h-11 w-full" onClick={() => setStockFilterModalOpen(false)}>
            ดูผลลัพธ์
          </Button>
        )}
      </>
    )
  }

  function startStockEdit(item: InventoryRow) {
    if (!store.canEditInventory) {
      return
    }

    setEditingIngredientId(item.ingredientId)
    setStockDraft(createStockEditDraft(item))
    setStockMessage("")
  }

  function cancelStockEdit() {
    setEditingIngredientId(null)
    setStockMessage("")
  }

  async function saveStockEdit() {
    if (!editingIngredientId || store.isInventorySaving) {
      return
    }

    const result = await store.updateInventoryItem({
      ingredientId: editingIngredientId,
      ...stockDraft,
    })

    if (!result.ok) {
      setStockMessage(result.error ?? "ไม่สามารถบันทึกข้อมูลคลังวัตถุดิบได้")
      return
    }

    setEditingIngredientId(null)
    setStockMessage("")
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label="วัตถุดิบทั้งหมด"
          value={`${store.inventoryRows.length} รายการ`}
          helper="ฐานข้อมูลวัตถุดิบหลัก"
          icon={Database}
          tone="border-sky-200 bg-sky-50 text-sky-800"
        />
        <MetricCard
          label="ต้องสั่งซื้อ"
          value={`${store.lowStockItems.length} รายการ`}
          helper="คงเหลือหลังหักจองต่ำกว่าจุดสั่งซื้อ"
          icon={AlertTriangle}
          tone="border-red-200 bg-red-50 text-red-800"
        />
        <MetricCard
          label="กำลังรับเข้า"
          value={`${store.inventoryRows.filter((item: { incoming: number }) => item.incoming > 0).length} รายการ`}
          helper="จากใบซื้อร่างล่าสุด"
          icon={Package}
          tone="border-emerald-200 bg-emerald-50 text-emerald-800"
        />
      </section>

      {store.isInventoryLoading && (
        <div className="flex min-h-14 items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm text-sky-900">
          <LoaderCircle className="size-4 animate-spin" />
          กำลังโหลดข้อมูลคลังวัตถุดิบจาก API
        </div>
      )}

      {store.inventoryError && !editingIngredientId && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {store.inventoryError}
        </div>
      )}

      <section className="lg:hidden">
        <Button
          variant="outline"
          className="h-11 w-full justify-between px-4"
          onClick={() => setStockFilterModalOpen(true)}
        >
          <span className="inline-flex items-center gap-2">
            <Search className="size-4" />
            ค้นหาวัตถุดิบ
          </span>
          <Badge variant={hasStockFilters ? "default" : "secondary"} className="h-6">
            {visibleInventoryRows.length}
          </Badge>
        </Button>
        <Dialog
          open={stockFilterModalOpen}
          onOpenChange={setStockFilterModalOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>ค้นหาวัตถุดิบ</DialogTitle>
              <DialogDescription>
                ค้นหาและกรองรายการวัตถุดิบในคลัง
              </DialogDescription>
            </DialogHeader>
            <div className="px-4 pb-4">
              {renderStockFilterControls({ modal: true })}
            </div>
          </DialogContent>
        </Dialog>
      </section>

      <section className="hidden rounded-lg border border-border bg-background p-4 lg:block">
        {renderStockFilterControls()}
      </section>

      {visibleInventoryRows.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          ไม่พบวัตถุดิบที่ตรงกับเงื่อนไขการค้นหา
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-background xl:hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">วัตถุดิบ</TableHead>
                <TableHead className="min-w-32">หมวดหมู่</TableHead>
                <TableHead className="min-w-28 text-right">คงเหลือ</TableHead>
                <TableHead className="min-w-28 text-right">จองใช้</TableHead>
                <TableHead className="min-w-28 text-right">รับเข้า</TableHead>
                <TableHead className="min-w-36 text-right">
                  ราคาตลาด/หน่วย
                </TableHead>
                <TableHead className="min-w-40 text-right">
                  ราคาปัจจุบัน/หน่วย
                </TableHead>
                <TableHead className="min-w-32">สถานะ</TableHead>
                <TableHead className="w-20 text-right">แก้ไข</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleInventoryRows.map((item) => (
                <TableRow
                  key={item.ingredientId}
                  className={cn(
                    editingIngredientId === item.ingredientId && "bg-muted/60"
                  )}
                >
                  <TableCell>
                    <div className="font-medium">{item.ingredient.name}</div>
                    <div className="text-xs text-muted-foreground">
                      อัปเดต {item.lastUpdated}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-6",
                        item.ingredient.category === newIngredientCategory
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-border bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {item.ingredient.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(item.onHand)} {item.ingredient.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(item.reserved)} {item.ingredient.unit}
                  </TableCell>
                  <TableCell className="text-right text-emerald-700">
                    +{formatNumber(item.incoming)} {item.ingredient.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.ingredient.defaultPrice)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold",
                      item.costPerUnit > item.ingredient.defaultPrice
                        ? "text-amber-700"
                        : "text-emerald-700"
                    )}
                  >
                    {formatCurrency(item.costPerUnit)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("h-6", statusClassName(item.status))}
                    >
                      {statusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="icon-lg"
                      className="size-11"
                      onClick={() => startStockEdit(item)}
                      disabled={!store.canEditInventory}
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">
                        แก้ไข {item.ingredient.name}
                      </span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-lg border border-border bg-background xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วัตถุดิบ</TableHead>
              <TableHead>หมวดหมู่</TableHead>
              <TableHead className="text-right">คงเหลือ</TableHead>
              <TableHead className="text-right">จองใช้</TableHead>
              <TableHead className="text-right">รับเข้า</TableHead>
              <TableHead className="text-right">ราคาตลาด/หน่วย</TableHead>
              <TableHead className="text-right">ราคาปัจจุบัน/หน่วย</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>อัปเดตล่าสุด</TableHead>
              <TableHead className="w-20 text-right">แก้ไข</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleInventoryRows.map((item) => (
              <TableRow
                key={item.ingredientId}
                className={cn(
                  editingIngredientId === item.ingredientId && "bg-muted/60"
                )}
              >
                <TableCell className="font-semibold">
                  {item.ingredient.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-6",
                      item.ingredient.category === newIngredientCategory
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-border bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {item.ingredient.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(item.onHand)} {item.ingredient.unit}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(item.reserved)} {item.ingredient.unit}
                </TableCell>
                <TableCell className="text-right text-emerald-700">
                  +{formatNumber(item.incoming)} {item.ingredient.unit}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.ingredient.defaultPrice)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-semibold",
                    item.costPerUnit > item.ingredient.defaultPrice
                      ? "text-amber-700"
                      : "text-emerald-700"
                  )}
                >
                  {formatCurrency(item.costPerUnit)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("h-6", statusClassName(item.status))}
                  >
                    {statusLabel(item.status)}
                  </Badge>
                </TableCell>
                <TableCell>{item.lastUpdated}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="icon-lg"
                    className="size-11"
                    onClick={() => startStockEdit(item)}
                    disabled={!store.canEditInventory}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">
                      แก้ไข {item.ingredient.name}
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <StockEditDialog
        open={Boolean(editingIngredientId)}
        item={editingItem}
        draft={stockDraft}
        message={stockMessage}
        isSaving={store.isInventorySaving}
        onChange={setStockDraft}
        onCancel={cancelStockEdit}
        onSave={saveStockEdit}
      />
    </div>
  )
}

type StockEditDraft = {
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

function createStockEditDraft(item?: InventoryRow): StockEditDraft {
  return {
    name: item?.ingredient.name ?? "",
    category: item?.ingredient.category ?? "",
    unit: item?.ingredient.unit ?? "กก.",
    defaultPrice: item?.ingredient.defaultPrice ?? 0,
    supplier: item?.ingredient.supplier ?? "",
    onHand: item?.onHand ?? 0,
    reserved: item?.reserved ?? 0,
    reorderPoint: item?.reorderPoint ?? 0,
    costPerUnit: item?.costPerUnit ?? 0,
  }
}

function StockEditDialog({
  open,
  item,
  draft,
  message,
  isSaving,
  onChange,
  onCancel,
  onSave,
}: {
  open: boolean
  item?: InventoryRow
  draft: StockEditDraft
  message: string
  isSaving: boolean
  onChange: (draft: StockEditDraft) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) {
          onCancel()
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader className="border-b">
          <DialogTitle>แก้ไขวัตถุดิบ</DialogTitle>
          <DialogDescription>
            {item
              ? `อัปเดตข้อมูลฐานวัตถุดิบหลักของ ${item.ingredient.name}`
              : "อัปเดตข้อมูลฐานวัตถุดิบหลัก"}
          </DialogDescription>
        </DialogHeader>
        <StockEditForm
          draft={draft}
          message={message}
          isSaving={isSaving}
          onChange={onChange}
          onCancel={onCancel}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  )
}

function StockEditForm({
  draft,
  message,
  isSaving,
  onChange,
  onCancel,
  onSave,
}: {
  draft: StockEditDraft
  message: string
  isSaving: boolean
  onChange: (draft: StockEditDraft) => void
  onCancel: () => void
  onSave: () => void
}) {
  function patchDraft(patch: Partial<StockEditDraft>) {
    onChange({ ...draft, ...patch })
  }

  return (
    <form
      className="space-y-4 px-4 pb-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-2 block">ชื่อวัตถุดิบ</Label>
          <Input
            className="h-11"
            value={draft.name}
            onChange={(event) => patchDraft({ name: event.target.value })}
          />
        </div>
        <div>
          <Label className="mb-2 block">หมวดหมู่</Label>
          <Input
            className="h-11"
            value={draft.category}
            onChange={(event) => patchDraft({ category: event.target.value })}
          />
        </div>
        <div>
          <Label className="mb-2 block">หน่วย</Label>
          <Input
            className="h-11"
            value={draft.unit}
            onChange={(event) => patchDraft({ unit: event.target.value })}
          />
        </div>
        <div>
          <Label className="mb-2 block">ซัพพลายเออร์</Label>
          <Input
            className="h-11"
            value={draft.supplier}
            onChange={(event) => patchDraft({ supplier: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldNumber
          label="คงเหลือ"
          value={draft.onHand}
          onChange={(value) => patchDraft({ onHand: value })}
        />
        <FieldNumber
          label="จองใช้จากสูตร"
          value={draft.reserved}
          disabled
          onChange={(value) => patchDraft({ reserved: value })}
        />
        <FieldNumber
          label="จุดสั่งซื้อ"
          value={draft.reorderPoint}
          onChange={(value) => patchDraft({ reorderPoint: value })}
        />
        <FieldNumber
          label="ราคาปัจจุบัน/หน่วย"
          value={draft.costPerUnit}
          onChange={(value) => patchDraft({ costPerUnit: value })}
        />
        <FieldNumber
          label="ราคาตลาด/หน่วย"
          value={draft.defaultPrice}
          onChange={(value) => patchDraft({ defaultPrice: value })}
        />
      </div>

      {message && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="submit" className="h-11" disabled={isSaving}>
          {isSaving ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          บันทึก
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={onCancel}
          disabled={isSaving}
        >
          <Minus className="size-4" />
          ยกเลิก
        </Button>
      </div>
    </form>
  )
}

function createRecipeDraft(ingredientId: string): RecipeFormInput {
  return {
    name: "",
    menuCategory: "อาหารจานเดียว",
    yield: 1,
    pricePerServing: 0,
    ingredients: ingredientId ? [{ ingredientId, quantity: 1 }] : [],
  }
}

function draftFromRecipe(recipe: RecipeImpact): RecipeFormInput {
  return {
    name: recipe.name,
    menuCategory: recipe.menuCategory,
    yield: recipe.yield,
    pricePerServing: recipe.pricePerServing,
    ingredients: recipe.ingredients.map((item) => ({ ...item })),
  }
}

function normalizeRecipeDraft(draft: RecipeFormInput): RecipeFormInput {
  return {
    ...draft,
    name: draft.name.trim(),
    menuCategory: draft.menuCategory.trim() || "เมนูทั่วไป",
    yield: Math.max(draft.yield, 1),
    pricePerServing: Math.max(draft.pricePerServing, 0),
    ingredients: draft.ingredients
      .filter((item) => item.ingredientId && item.quantity > 0)
      .map((item) => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
      })),
  }
}

function recipeQuantitySummary(
  recipe: RecipeImpact,
  store: Store,
  divisor = 1
) {
  const quantityByUnit = new Map<string, number>()

  for (const item of recipe.ingredients) {
    const ingredient = store.ingredientById.get(item.ingredientId)
    const unit = ingredient?.unit ?? "หน่วย"
    quantityByUnit.set(
      unit,
      (quantityByUnit.get(unit) ?? 0) + item.quantity / Math.max(divisor, 1)
    )
  }

  const parts = Array.from(quantityByUnit.entries()).map(
    ([unit, quantity]) => `${formatNumber(quantity)} ${unit}`
  )

  if (parts.length <= 2) {
    return parts.join(" + ") || "-"
  }

  return `${parts.slice(0, 2).join(" + ")} +${parts.length - 2}`
}

function unitWeightInKg(unit: string) {
  const normalizedUnit = normalizeSearch(unit).replaceAll(".", "")

  if (
    normalizedUnit === "kg" ||
    normalizedUnit === "kgs" ||
    normalizedUnit === "กก" ||
    normalizedUnit === "กิโล" ||
    normalizedUnit === "กิโลกรัม"
  ) {
    return 1
  }

  if (
    normalizedUnit === "g" ||
    normalizedUnit === "gram" ||
    normalizedUnit === "grams" ||
    normalizedUnit === "กรัม"
  ) {
    return 0.001
  }

  if (normalizedUnit === "ขีด") {
    return 0.1
  }

  return null
}

function formatWeightKg(weightKg: number, suffix = "") {
  if (weightKg <= 0) {
    return "-"
  }

  if (weightKg < 1) {
    return `${formatNumber(weightKg * 1000)} กรัม${suffix}`
  }

  return `${formatNumber(weightKg)} กก.${suffix}`
}

function recipeApproxWeightKg(recipe: RecipeImpact, store: Store) {
  return recipe.ingredients.reduce((total, item) => {
    const ingredient = store.ingredientById.get(item.ingredientId)
    const multiplier = ingredient ? unitWeightInKg(ingredient.unit) : null

    return multiplier ? total + item.quantity * multiplier : total
  }, 0)
}

function recipeCookedWeightSummary(recipe: RecipeImpact, store: Store) {
  const weightKg = recipeApproxWeightKg(recipe, store)

  return weightKg > 0 ? formatWeightKg(weightKg) : recipeQuantitySummary(recipe, store)
}

function recipePerServingSummary(recipe: RecipeImpact, store: Store) {
  const weightKg = recipeApproxWeightKg(recipe, store)

  if (weightKg > 0) {
    return formatWeightKg(weightKg / Math.max(recipe.yield, 1), " / จาน")
  }

  return `${recipe.ingredients.length} รายการ / จาน`
}

function recipeMarginLabel(margin: number) {
  if (Math.abs(margin) < 0.01) {
    return "คุ้มทุน"
  }

  return margin > 0 ? "กำไร" : "ขาดทุน"
}

function RecipesView({ store }: { store: Store }) {
  const [cookMessage, setCookMessage] = useState("")

  async function handleUnpinRecipe(recipeId: string) {
    const result = await store.unpinRecipe(recipeId)
    setCookMessage(
      result.ok
        ? "ถอนปักหมุดเมนูออกจากหน้าสูตรอาหารแล้ว"
        : (result.error ?? "ไม่สามารถถอนปักหมุดสูตรอาหารได้")
    )
  }

  async function handleCookRecipe(recipeId: string) {
    const result = await store.cookRecipe(recipeId)

    setCookMessage(
      result.ok
        ? "ปรุงรายการอาหารแล้ว ระบบตัดสต็อกและปลดจองวัตถุดิบเรียบร้อย"
        : (result.error ?? "ยังปรุงไม่ได้ กรุณาตรวจสอบวัตถุดิบคงเหลือก่อน")
    )
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label="เมนูที่ปักหมุด"
          value={`${store.recipeStats.total} สูตร`}
          helper={`เลือกจากคลังสูตร ${store.recipeStats.saved} สูตร`}
          icon={Pin}
          tone="border-rose-200 bg-rose-50 text-rose-800"
        />
        <MetricCard
          label="พร้อมปรุง"
          value={`${store.recipeStats.ready} สูตร`}
          helper="วัตถุดิบคงเหลือเพียงพอ"
          icon={CircleCheck}
          tone="border-emerald-200 bg-emerald-50 text-emerald-800"
        />
        <MetricCard
          label="วัตถุดิบในสูตร"
          value={`${store.recipeStats.totalIngredients} รายการ`}
          helper="รวมทุกเมนู"
          icon={Package}
          tone="border-sky-200 bg-sky-50 text-sky-800"
        />
      </section>

      <section className="rounded-lg border border-border bg-background p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <ChefHat className="size-4 text-rose-600 sm:size-5" />
              <h2 className="text-base font-semibold sm:text-lg">
                สูตรอาหารและผลกระทบสต็อก
              </h2>
            </div>
            <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
              ตรวจความพร้อมของวัตถุดิบก่อนตัดสต็อกตามสูตร
            </p>
          </div>
          <Badge variant="outline" className="h-6 w-fit text-xs sm:h-7">
            {store.pinnedRecipeImpacts.length} สูตรที่ปักหมุด
          </Badge>
        </div>
        {cookMessage && (
          <div className="mt-4 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
            {cookMessage}
          </div>
        )}
        {store.isRecipesLoading && (
          <div className="mt-4 flex min-h-12 items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm text-sky-900">
            <LoaderCircle className="size-4 animate-spin" />
            กำลังโหลดข้อมูลสูตรอาหารจาก API
          </div>
        )}
        {store.recipeError && !store.isRecipeSaving && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {store.recipeError}
          </div>
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {store.pinnedRecipeImpacts.map((recipe: RecipeImpact) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            store={store}
            onUnpin={handleUnpinRecipe}
            onCook={handleCookRecipe}
            isSaving={store.isRecipeSaving}
          />
        ))}
        <RecipeAddCard />
      </section>
    </div>
  )
}

function RecipeAddCard() {
  return (
    <Link
      href="/portal/recipes/new"
      className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-sky-300 bg-sky-50/40 px-4 py-6 text-center text-sky-700 transition-colors hover:border-sky-500 hover:bg-sky-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-56"
    >
      <span className="flex size-20 items-center justify-center rounded-full border border-sky-200 bg-background shadow-sm">
        <Plus className="size-10" />
      </span>
      <span className="font-semibold">เพิ่มสูตรอาหารใหม่</span>
      <span className="max-w-56 text-sm text-sky-700/80">
        สร้างสูตรพร้อมวัตถุดิบและปักหมุดใช้งาน
      </span>
    </Link>
  )
}

function RecipePinSelection({
  recipes,
  store,
  onPin,
  onDelete,
  isSaving,
}: {
  recipes: RecipeImpact[]
  store: Store
  onPin: (recipeId: string) => void
  onDelete: (recipeId: string) => void
  isSaving: boolean
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Pin className="size-5 text-rose-600" />
            <h2 className="text-lg font-semibold">
              ปักหมุดสูตรอาหารที่เคยสร้างไว้
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            เลือกสูตรจากคลังสูตรเพื่อเพิ่มเป็นเมนูที่ใช้งานในหน้าสูตรอาหาร
          </p>
        </div>
        <Badge variant="outline" className="h-7 w-fit">
          {recipes.length} สูตรในคลัง
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {recipes.map((recipe) => {
          const pinned = recipe.isPinned

          return (
            <div key={recipe.id} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {recipe.menuCategory}
                  </p>
                  <h3 className="truncate font-semibold">{recipe.name}</h3>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 shrink-0",
                    pinned
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                  )}
                >
                  {pinned ? "ปักหมุดแล้ว" : "ยังไม่ปักหมุด"}
                </Badge>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <SummaryPill label="จำนวน" value={`${recipe.yield} เสิร์ฟ`} />
                <SummaryPill
                  label="ปริมาณทั้งหมด"
                  value={recipeCookedWeightSummary(recipe, store)}
                />
                <SummaryPill
                  label="ปริมาณต่อจาน"
                  value={recipePerServingSummary(recipe, store)}
                />
                <SummaryPill label="ต้นทุน" value={formatCurrency(recipe.cost)} />
                <SummaryPill label="ราคาขาย/จาน" value={formatCurrency(recipe.pricePerServing)} />
                <SummaryPill label="รายได้" value={formatCurrency(recipe.revenue)} />
                <SummaryPill label={recipeMarginLabel(recipe.margin)} value={formatCurrency(recipe.margin)} />
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {recipe.ingredients.slice(0, 4).map((item) => {
                  const ingredient = store.ingredientById.get(item.ingredientId)

                  return (
                    <Badge
                      key={item.ingredientId}
                      variant="secondary"
                      className="h-7"
                    >
                      {ingredient?.name} {formatNumber(item.quantity)}
                      {ingredient?.unit}
                    </Badge>
                  )
                })}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  className="h-11 w-full sm:col-span-1"
                  onClick={() => onPin(recipe.id)}
                  disabled={pinned || isSaving}
                >
                  {isSaving ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Pin className="size-4" />
                  )}
                  {pinned ? "ปักหมุดแล้ว" : "ปักหมุดเมนูนี้"}
                </Button>
                <Link
                  href={`/portal/recipes/${recipe.id}/edit`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "h-11 w-full",
                  })}
                >
                  <Pencil className="size-4" />
                  แก้ไข
                </Link>
                <Button
                  variant="outline"
                  className="h-11 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onDelete(recipe.id)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  ลบ
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function EasyReceiptRecipeFormPage({
  mode,
  recipeId,
}: {
  mode: "new" | "edit"
  recipeId?: string
}) {
  return (
    <EasyReceiptPortalPage activeView="recipes">
      <RecipeFormView mode={mode} recipeId={recipeId} />
    </EasyReceiptPortalPage>
  )
}

function RecipeFormView({
  mode,
  recipeId,
}: {
  mode: "new" | "edit"
  recipeId?: string
}) {
  const store = useEasyReceipt()
  const router = useRouter()
  const defaultIngredientId = store.ingredients[0]?.id ?? ""
  const editingRecipe =
    mode === "edit"
      ? store.recipeImpacts.find((recipe: { id: string | undefined }) => recipe.id === recipeId)
      : undefined
  const [recipeDraft, setRecipeDraft] = useState<RecipeFormInput>(() =>
    editingRecipe
      ? draftFromRecipe(editingRecipe)
      : createRecipeDraft(defaultIngredientId)
  )
  const [loadedRecipeId, setLoadedRecipeId] = useState(editingRecipe?.id ?? "")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (mode !== "edit" || !editingRecipe || loadedRecipeId === editingRecipe.id) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setRecipeDraft(draftFromRecipe(editingRecipe))
      setLoadedRecipeId(editingRecipe.id)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [editingRecipe, loadedRecipeId, mode])

  function handleRecipeIngredientChange(
    index: number,
    patch: Partial<RecipeIngredient>
  ) {
    setRecipeDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }))
  }

  function addRecipeIngredientLine() {
    const usedIngredientIds = new Set(
      recipeDraft.ingredients.map((item) => item.ingredientId)
    )
    const ingredient =
      store.ingredients.find((item: { id: string }) => !usedIngredientIds.has(item.id)) ??
      store.ingredients[0]

    if (!ingredient) {
      return
    }

    setRecipeDraft((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          ingredientId: ingredient.id,
          quantity: 1,
        },
      ],
    }))
  }

  function removeRecipeIngredientLine(index: number) {
    setRecipeDraft((current) => ({
      ...current,
      ingredients:
        current.ingredients.length === 1
          ? current.ingredients
          : current.ingredients.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function handlePinExistingRecipe(recipeId: string) {
    const result = await store.pinRecipe(recipeId)

    if (!result.ok) {
      setMessage(result.error ?? "ไม่พบสูตรอาหารที่ต้องการปักหมุด")
      return
    }

    router.push("/portal/recipes")
  }

  async function handleDeleteExistingRecipe(recipeId: string) {
    const result = await store.deleteRecipe(recipeId)

    setMessage(
      result.ok
        ? "ลบสูตรอาหารแล้ว"
        : (result.error ?? "ไม่สามารถลบสูตรอาหารได้")
    )
  }

  async function handleSubmitRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedDraft = normalizeRecipeDraft(recipeDraft)
    const result =
      mode === "edit" && recipeId
        ? await store.updateRecipe(recipeId, normalizedDraft)
        : await store.addRecipe(normalizedDraft)

    if (!result.ok) {
      setMessage(
        result.error ?? "กรุณากรอกชื่อเมนู และเพิ่มวัตถุดิบอย่างน้อย 1 รายการ"
      )
      return
    }

    router.push("/portal/recipes")
  }

  if (mode === "edit" && store.isRecipesLoading) {
    return (
      <div className="w-full max-w-4xl">
        <div className="flex min-h-24 items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm text-sky-900">
          <LoaderCircle className="size-4 animate-spin" />
          กำลังโหลดข้อมูลสูตรอาหารจาก API
        </div>
      </div>
    )
  }

  if (mode === "edit" && !editingRecipe) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-lg">
          <CardHeader>
            <CardAction>
              <span className="flex size-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700">
                <ChefHat className="size-5" />
              </span>
            </CardAction>
            <CardTitle>ไม่พบเมนูสูตรอาหาร</CardTitle>
            <CardDescription>
              เมนูนี้อาจถูกลบแล้ว หรือยังโหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/portal/recipes"
              className={buttonVariants({
                variant: "outline",
                className: "h-11",
              })}
            >
              <ArrowLeft className="size-4" />
              กลับหน้าสูตรอาหาร
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl space-y-4">
      <Link
        href="/portal/recipes"
        className={buttonVariants({
          variant: "ghost",
          className: "h-11 w-fit px-3",
        })}
      >
        <ArrowLeft className="size-4" />
        กลับหน้าสูตรอาหาร
      </Link>

      {mode === "new" && (
        <RecipePinSelection
          recipes={store.recipeImpacts}
          store={store}
          onPin={handlePinExistingRecipe}
          onDelete={handleDeleteExistingRecipe}
          isSaving={store.isRecipeSaving}
        />
      )}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>
            {mode === "edit"
              ? "แก้ไขเมนูสูตรอาหาร"
              : "สร้างสูตรใหม่และปักหมุด"}
          </CardTitle>
          <CardDescription>
            จัดการชื่อเมนู ราคา จำนวนเสิร์ฟ และวัตถุดิบในสูตร
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmitRecipe}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block">ชื่อเมนู</Label>
                <Input
                  className="h-11"
                  value={recipeDraft.name}
                  onChange={(event) =>
                    setRecipeDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="เช่น ข้าวกะเพราไก่"
                />
              </div>
              <div>
                <Label className="mb-2 block">หมวดหมู่</Label>
                <Input
                  className="h-11"
                  value={recipeDraft.menuCategory}
                  onChange={(event) =>
                    setRecipeDraft((current) => ({
                      ...current,
                      menuCategory: event.target.value,
                    }))
                  }
                  placeholder="เช่น อาหารจานเดียว"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldNumber
                label="จำนวนเสิร์ฟ"
                value={recipeDraft.yield}
                onChange={(value) =>
                  setRecipeDraft((current) => ({
                    ...current,
                    yield: value,
                  }))
                }
              />
              <FieldNumber
                label="ราคาต่อเสิร์ฟ"
                value={recipeDraft.pricePerServing}
                onChange={(value) =>
                  setRecipeDraft((current) => ({
                    ...current,
                    pricePerServing: value,
                  }))
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label>วัตถุดิบในสูตร</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full sm:w-auto"
                  onClick={addRecipeIngredientLine}
                >
                  <Plus className="size-4" />
                  เพิ่มวัตถุดิบ
                </Button>
              </div>

              {recipeDraft.ingredients.map((item, index) => {
                const ingredient = store.ingredientById.get(item.ingredientId)

                return (
                  <div
                    key={`${item.ingredientId}-${index}`}
                    className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-[1fr_8rem_2.75rem] md:items-end md:bg-background"
                  >
                    <div className="flex items-center justify-between gap-3 md:hidden">
                      <Badge variant="secondary" className="h-7 px-3">
                        รายการที่ {index + 1}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        className="size-10 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => removeRecipeIngredientLine(index)}
                        disabled={recipeDraft.ingredients.length === 1}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">ลบวัตถุดิบ</span>
                      </Button>
                    </div>
                    <div>
                      <Label className="mb-2 block">วัตถุดิบ</Label>
                      <RecipeIngredientSelect
                        value={item.ingredientId}
                        store={store}
                        onChange={(ingredientId) =>
                          handleRecipeIngredientChange(index, {
                            ingredientId,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">
                        ปริมาณ
                        {ingredient ? ` (${ingredient.unit})` : ""}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        className="h-11"
                        value={item.quantity}
                        onChange={(event) =>
                          handleRecipeIngredientChange(index, {
                            quantity: toNumber(event.target.value),
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-lg"
                      className="hidden h-11 w-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 md:inline-flex"
                      onClick={() => removeRecipeIngredientLine(index)}
                      disabled={recipeDraft.ingredients.length === 1}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">ลบวัตถุดิบ</span>
                    </Button>
                  </div>
                )
              })}
            </div>

            {message && (
              <div className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
                {message}
              </div>
            )}

            <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2">
              <Button
                type="submit"
                className="h-12 w-full text-base sm:text-sm"
                disabled={store.isRecipeSaving}
              >
                {store.isRecipeSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {mode === "edit" ? "บันทึกเมนู" : "สร้างและปักหมุด"}
              </Button>
              <Link
                href="/portal/recipes"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-12 w-full text-base sm:text-sm",
                })}
              >
                <Minus className="size-4" />
                ยกเลิก
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function RecipeCard({
  recipe,
  store,
  onUnpin,
  onCook,
  isSaving,
}: {
  recipe: RecipeImpact
  store: Store
  onUnpin: (recipeId: string) => void
  onCook: (recipeId: string) => void
  isSaving: boolean
}) {
  const recipeStatusLabel = recipe.isCooked
    ? "ปรุงแล้ว"
    : recipe.canProduce
      ? "พร้อมปรุง"
      : "วัตถุดิบไม่พอ"
  const recipeStatusClassName = recipe.isCooked
    ? "border-sky-200 bg-sky-50 text-sky-700"
    : recipe.canProduce
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700"

  return (
    <Card size="sm" className="rounded-lg">
      <CardHeader className="gap-2 max-sm:grid-cols-1">
        <CardAction className="max-sm:col-start-1 max-sm:row-start-3 max-sm:mt-2 max-sm:w-full max-sm:justify-self-stretch">
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Badge
              variant="outline"
              className={cn("h-6 text-xs", recipeStatusClassName)}
            >
              {recipeStatusLabel}
            </Badge>
            <Button
              variant="outline"
              className="h-9 border-rose-200 px-3 text-sm text-rose-700 hover:bg-rose-50 hover:text-rose-800 sm:w-9 sm:px-0"
              onClick={() => onUnpin(recipe.id)}
              disabled={isSaving || recipe.isCooked}
            >
              {isSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Pin className="size-4" />
              )}
              <span className="sm:sr-only">ถอนปักหมุด</span>
            </Button>
          </div>
        </CardAction>
        <CardDescription className="text-sm leading-snug">
          {recipe.menuCategory}
        </CardDescription>
        <CardTitle className="text-base leading-snug sm:text-lg">
          {recipe.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <SummaryPill compact label="จำนวน" value={`${recipe.yield} เสิร์ฟ`} />
          <SummaryPill
            compact
            label="ปริมาณทั้งหมด"
            value={recipeCookedWeightSummary(recipe, store)}
          />
          <SummaryPill
            compact
            label="ปริมาณต่อจาน"
            value={recipePerServingSummary(recipe, store)}
          />
          <SummaryPill compact label="ต้นทุน" value={formatCurrency(recipe.cost)} />
          <SummaryPill compact label="ราคาขาย/จาน" value={formatCurrency(recipe.pricePerServing)} />
          <SummaryPill compact label="รายได้" value={formatCurrency(recipe.revenue)} />
          <SummaryPill compact label={recipeMarginLabel(recipe.margin)} value={formatCurrency(recipe.margin)} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">วัตถุดิบที่ใช้</p>
          <div className="flex flex-wrap gap-1.5">
            {recipe.ingredients.map((item) => {
              const ingredient = store.ingredientById.get(item.ingredientId)

              return (
                <Badge key={item.ingredientId} variant="secondary" className="h-6 text-xs">
                  {ingredient?.name} {formatNumber(item.quantity)}
                  {ingredient?.unit}
                </Badge>
              )
            })}
          </div>
        </div>

        {!recipe.canProduce && !recipe.isCooked && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">
            ขาด: {recipe.missingNames.join(", ")}
          </div>
        )}

        {recipe.isCooked ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-sm text-sky-800">
            ปรุงแล้วและตัดสต็อกวัตถุดิบเรียบร้อย
          </div>
        ) : recipe.canProduce ? (
          <Button
            className="h-10 w-full"
            onClick={() => onCook(recipe.id)}
            disabled={isSaving}
          >
            {isSaving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ChefHat className="size-4" />
            )}
            ปรุงรายการอาหาร
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RecipeIngredientSelect({
  value,
  store,
  onChange,
}: {
  value: string
  store: Store
  onChange: (value: string) => void
}) {
  const selectedIngredient = store.ingredientById.get(value)
  const [query, setQuery] = useState(selectedIngredient?.name ?? "")
  const [isOpen, setIsOpen] = useState(false)
  const searchTerm = normalizeSearch(query)
  const filteredIngredients = store.ingredients
    .filter((ingredient) => {
      if (!searchTerm) {
        return true
      }

      return [
        ingredient.name,
        ingredient.category,
        ingredient.unit,
        ingredient.supplier,
      ]
        .map(normalizeSearch)
        .some((item) => item.includes(searchTerm))
    })
    .sort((left, right) => {
      const leftName = normalizeSearch(left.name)
      const rightName = normalizeSearch(right.name)
      const leftStarts = leftName.startsWith(searchTerm) ? 0 : 1
      const rightStarts = rightName.startsWith(searchTerm) ? 0 : 1

      if (leftStarts !== rightStarts) {
        return leftStarts - rightStarts
      }

      return left.name.localeCompare(right.name, "th")
    })

  function handleSelectIngredient(ingredientId: string) {
    const ingredient = store.ingredientById.get(ingredientId)

    if (!ingredient) {
      return
    }

    onChange(ingredientId)
    setQuery(ingredient.name)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9"
          value={isOpen ? query : (selectedIngredient?.name ?? query)}
          placeholder="ค้นหาวัตถุดิบ"
          onFocus={() => {
            setQuery(selectedIngredient?.name ?? query)
            setIsOpen(true)
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setQuery(selectedIngredient?.name ?? query)
              setIsOpen(false)
            }, 120)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 max-h-80 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg">
          {filteredIngredients.length > 0 ? (
            filteredIngredients.map((ingredient) => (
              <button
                key={ingredient.id}
                type="button"
                className={cn(
                  "flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-muted",
                  ingredient.id === value && "bg-muted"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelectIngredient(ingredient.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {ingredient.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {ingredient.category} · {ingredient.supplier}
                  </span>
                </span>
                <Badge variant="secondary" className="h-6 shrink-0">
                  {ingredient.unit}
                </Badge>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              ไม่พบวัตถุดิบที่ตรงกับคำค้น
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryPill({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg bg-muted px-2 py-2",
        compact && "py-1.5"
      )}
    >
      <p className="text-xs leading-snug text-muted-foreground">{label}</p>
      <p
        className={cn(
          "break-words font-semibold leading-tight",
          compact && "text-sm"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function BranchBadgeList({
  branchIds,
  store,
  forceAll = false,
}: {
  branchIds: string[]
  store: Store
  forceAll?: boolean
}) {
  const branches = forceAll
    ? store.branches
    : branchIds
        .map((branchId) =>
          store.branches.find((branch: { id: string }) => branch.id === branchId)
        )
        .filter((branch): branch is Store["branches"][number] =>
          Boolean(branch)
        )

  if (branches.length === 0) {
    return (
      <Badge variant="outline" className="h-7 border-amber-200 text-amber-700">
        ยังไม่กำหนดสาขา
      </Badge>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {branches.map((branch) => (
        <Badge key={branch.id} variant="secondary" className="h-7">
          {branch.name}
        </Badge>
      ))}
    </div>
  )
}

function BranchAccessPicker({
  value,
  store,
  onChange,
  disabled = false,
  forceAll = false,
  selectionMode = "multiple",
}: {
  value: string[]
  store: Store
  onChange: (value: string[]) => void
  disabled?: boolean
  forceAll?: boolean
  selectionMode?: "single" | "multiple"
}) {
  const branchOptions = forceAll ? store.branches : store.accessibleBranches
  const selectedIds = new Set(forceAll ? store.branches.map((branch) => branch.id) : value)

  function toggleBranch(branchId: string) {
    if (disabled || forceAll) {
      return
    }

    if (selectedIds.has(branchId)) {
      if (selectionMode === "single") {
        return
      }

      if (value.length === 1) {
        return
      }

      onChange(value.filter((item) => item !== branchId))
      return
    }

    if (selectionMode === "single") {
      onChange([branchId])
      return
    }

    onChange([...value, branchId])
  }

  return (
    <div className="grid gap-2">
      {branchOptions.map((branch) => {
        const selected = selectedIds.has(branch.id)

        return (
          <button
            key={branch.id}
            type="button"
            className={cn(
              "flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm transition",
              selected && "border-sky-200 bg-sky-50 text-sky-950",
              !disabled && !forceAll && "hover:bg-muted",
              (disabled || forceAll) && "cursor-default opacity-90"
            )}
            onClick={() => toggleBranch(branch.id)}
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{branch.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {branch.code} · {branch.location}
              </span>
            </span>
            {selected && <CircleCheck className="size-4 shrink-0 text-sky-700" />}
          </button>
        )
      })}
      {forceAll && (
        <p className="text-xs text-muted-foreground">
          เจ้าของระบบเห็นทุกสาขาโดยอัตโนมัติ
        </p>
      )}
    </div>
  )
}

export function EasyReceiptMemberFormPage() {
  return (
    <EasyReceiptPortalPage activeView="members">
      <MemberFormView />
    </EasyReceiptPortalPage>
  )
}

function MembersView({ store }: { store: Store }) {
  const addMemberButton = store.canManageMembers ? (
    <Link
      href="/portal/members/new"
      className={buttonVariants({
        className: "h-11 w-full sm:w-fit",
      })}
    >
      <UserPlus className="size-4" />
      เพิ่มสมาชิก
    </Link>
  ) : (
    <Button className="h-11 w-full sm:w-fit" disabled>
      <UserPlus className="size-4" />
      เพิ่มสมาชิก
    </Button>
  )

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="สมาชิกทั้งหมด"
          value={`${store.memberStats.total} คน`}
          helper="รวมทุกสถานะบัญชี"
          icon={Users}
          tone="border-cyan-200 bg-cyan-50 text-cyan-800"
        />
        <MetricCard
          label="ใช้งานอยู่"
          value={`${store.memberStats.active} คน`}
          helper="เข้าสู่ระบบได้ทันที"
          icon={CircleCheck}
          tone="border-emerald-200 bg-emerald-50 text-emerald-800"
        />
        <MetricCard
          label="รอเชิญตอบรับ"
          value={`${store.memberStats.invited} คน`}
          helper="ยังไม่เปิดใช้งานเต็มรูปแบบ"
          icon={Clock3}
          tone="border-amber-200 bg-amber-50 text-amber-800"
        />
        <MetricCard
          label="ผู้ดูแล"
          value={`${store.memberStats.managers} คน`}
          helper="Owner และ Manager"
          icon={ShieldCheck}
          tone="border-sky-200 bg-sky-50 text-sky-800"
        />
      </section>

      <section className="space-y-3">
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">การจัดการสมาชิก</h2>
              <p className="text-sm text-muted-foreground">
                ปรับสิทธิ์และสถานะการเข้าใช้งานระบบ
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Badge
                variant="outline"
                className={cn(
                  "h-7 w-fit",
                  store.canManageMembers
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}
              >
                {store.canManageMembers ? "แก้ไขได้" : "อ่านได้อย่างเดียว"}
              </Badge>
              {addMemberButton}
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:hidden">
          {store.members.map((member) => (
            <MemberMobileCard key={member.id} member={member} store={store} />
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-lg border border-border bg-background lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>สมาชิก</TableHead>
                <TableHead>สิทธิ์</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>สาขา</TableHead>
                <TableHead>ใช้งานล่าสุด</TableHead>
                <TableHead>วันที่เพิ่ม</TableHead>
                <TableHead className="w-32 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <UserRound className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {store.canManageMembers ? (
                      <RoleSelect
                        value={member.role}
                        onChange={(nextRole) =>
                          store.updateMemberRole(member.id, nextRole)
                        }
                      />
                    ) : (
                      <Badge variant="secondary" className="h-7">
                        {memberRoleLabel(member.role)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {store.canManageMembers ? (
                      <StatusSelect
                        value={member.status}
                        onChange={(nextStatus) =>
                          store.updateMemberStatus(member.id, nextStatus)
                        }
                      />
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-7",
                          memberStatusClassName(member.status)
                        )}
                      >
                        {memberStatusLabel(member.status)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="min-w-56">
                    {store.canManageMembers && member.role !== "owner" ? (
                      <BranchAccessPicker
                        value={
                          member.role === "manager"
                            ? member.branchIds
                            : member.branchIds.slice(0, 1)
                        }
                        store={store}
                        onChange={(nextBranchIds) =>
                          store.updateMemberBranches(member.id, nextBranchIds)
                        }
                        selectionMode={
                          member.role === "manager" ? "multiple" : "single"
                        }
                      />
                    ) : (
                      <BranchBadgeList
                        branchIds={
                          member.role === "manager"
                            ? member.branchIds
                            : member.branchIds.slice(0, 1)
                        }
                        store={store}
                        forceAll={member.role === "owner"}
                      />
                    )}
                  </TableCell>
                  <TableCell>{member.lastActive}</TableCell>
                  <TableCell>{member.joinedAt}</TableCell>
                  <TableCell className="text-right">
                    <MemberEditDialog member={member} store={store} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

function MemberFormView() {
  const store = useEasyReceipt()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<MemberRole>("staff")
  const [branchIds, setBranchIds] = useState<string[]>(() =>
    store.activeBranchId
      ? [store.activeBranchId]
      : store.accessibleBranches.slice(0, 1).map((branch) => branch.id)
  )
  const [message, setMessage] = useState("")

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!store.canManageMembers) {
      setMessage("บัญชีนี้ไม่มีสิทธิ์จัดการสมาชิก")
      return
    }

    const nextBranchIds =
      role === "owner"
        ? store.branches.map((branch) => branch.id)
        : branchIds
    const ok = await store.addMember({
      name,
      email,
      password,
      role,
      branchIds: nextBranchIds,
    })

    if (!ok) {
      setMessage(
        store.memberError ||
          "กรุณากรอกชื่อ อีเมล รหัสผ่านอย่างน้อย 6 ตัวอักษร เลือกสาขา และใช้อีเมลที่ยังไม่ซ้ำ"
      )
      return
    }

    setName("")
    setEmail("")
    setPassword("")
    setRole("staff")
    setBranchIds(
      store.activeBranchId
        ? [store.activeBranchId]
        : store.accessibleBranches.slice(0, 1).map((branch) => branch.id)
    )
    setMessage("")
    router.push("/portal/members")
  }

  return (
    <div className="space-y-4">
      <Link
        href="/portal/members"
        className={buttonVariants({
          variant: "ghost",
          className: "h-11 w-fit px-2",
        })}
      >
        <ArrowLeft className="size-4" />
        กลับหน้าสมาชิก
      </Link>

      <Card className="rounded-lg">
        <CardHeader>
          <CardAction>
            <span className="flex size-10 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
              <UserPlus className="size-5" />
            </span>
          </CardAction>
          <CardTitle>เพิ่มสมาชิก</CardTitle>
          <CardDescription>
            เชิญสมาชิกใหม่เข้าระบบด้วย role เริ่มต้นและกำหนดสาขาที่เข้าถึง
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleAddMember}>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-2 block">ชื่อสมาชิก</Label>
                <Input
                  className="h-11"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="เช่น พนักงานหน้าร้าน"
                />
              </div>
              <div>
                <Label className="mb-2 block">อีเมล</Label>
                <Input
                  type="email"
                  className="h-11"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@easyreceipt.local"
                />
              </div>
              <div>
                <Label className="mb-2 block">รหัสผ่าน</Label>
                <Input
                  type="password"
                  className="h-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label className="mb-2 block">สิทธิ์ใช้งาน</Label>
                <RoleSelect
                  value={role}
                  onChange={(nextRole) => {
                    setRole(nextRole)
                    if (nextRole === "owner") {
                      setBranchIds(store.branches.map((branch) => branch.id))
                      return
                    }

                    if (role === "owner") {
                      setBranchIds(
                        store.activeBranchId
                          ? [store.activeBranchId]
                          : store.accessibleBranches
                              .slice(0, 1)
                              .map((branch) => branch.id)
                      )
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">สาขาที่เข้าถึง</Label>
              <BranchAccessPicker
                value={branchIds}
                store={store}
                onChange={setBranchIds}
                disabled={!store.canManageMembers}
                forceAll={role === "owner"}
                selectionMode={role === "manager" ? "multiple" : "single"}
              />
            </div>

            {message && (
              <div className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
                {message}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="submit"
                className="h-11"
                disabled={!store.canManageMembers}
              >
                <UserPlus className="size-4" />
                เพิ่มสมาชิก
              </Button>
              <Link
                href="/portal/members"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-11",
                })}
              >
                <Minus className="size-4" />
                ยกเลิก
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              รหัสผ่านของสมาชิกใหม่จะถูกเข้ารหัสก่อนบันทึกในฐานข้อมูล
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function MemberMobileCard({
  member,
  store,
}: {
  member: Store["members"][number]
  store: Store
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("h-6", memberStatusClassName(member.status))}
            >
              {memberStatusLabel(member.status)}
            </Badge>
            <MemberEditDialog member={member} store={store} compact />
          </div>
        </CardAction>
        <CardDescription>{member.email}</CardDescription>
        <CardTitle>{member.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block">สิทธิ์</Label>
            {store.canManageMembers ? (
              <RoleSelect
                value={member.role}
                onChange={(nextRole) =>
                  store.updateMemberRole(member.id, nextRole)
                }
              />
            ) : (
              <div className="flex h-11 items-center rounded-lg border border-border px-3">
                {memberRoleLabel(member.role)}
              </div>
            )}
          </div>
          <div>
            <Label className="mb-2 block">สถานะ</Label>
            {store.canManageMembers ? (
              <StatusSelect
                value={member.status}
                onChange={(nextStatus) =>
                  store.updateMemberStatus(member.id, nextStatus)
                }
              />
            ) : (
              <div className="flex h-11 items-center rounded-lg border border-border px-3">
                {memberStatusLabel(member.status)}
              </div>
            )}
          </div>
        </div>
        <div>
          <Label className="mb-2 block">สาขาที่เข้าถึง</Label>
          {store.canManageMembers && member.role !== "owner" ? (
            <BranchAccessPicker
              value={
                member.role === "manager"
                  ? member.branchIds
                  : member.branchIds.slice(0, 1)
              }
              store={store}
              onChange={(nextBranchIds) =>
                store.updateMemberBranches(member.id, nextBranchIds)
              }
              selectionMode={
                member.role === "manager" ? "multiple" : "single"
              }
            />
          ) : (
            <BranchBadgeList
              branchIds={
                member.role === "manager"
                  ? member.branchIds
                  : member.branchIds.slice(0, 1)
              }
              store={store}
              forceAll={member.role === "owner"}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <SummaryPill label="ใช้งานล่าสุด" value={member.lastActive} />
          <SummaryPill label="วันที่เพิ่ม" value={member.joinedAt} />
        </div>
      </CardContent>
    </Card>
  )
}

function MemberEditDialog({
  member,
  store,
  compact = false,
}: {
  member: Store["members"][number]
  store: Store
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email)
  const [password, setPassword] = useState("")
  const [resetPassword, setResetPassword] = useState(false)
  const [message, setMessage] = useState("")

  function openEditor() {
    setName(member.name)
    setEmail(member.email)
    setPassword("")
    setResetPassword(false)
    setMessage("")
    setOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!store.canManageMembers) {
      setMessage("บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูลสมาชิก")
      return
    }

    const ok = await store.updateMemberProfile(member.id, {
      name,
      email,
      password: resetPassword ? password.trim() : undefined,
    })

    if (!ok) {
      setMessage(
        store.memberError ||
          "กรุณากรอกชื่อ อีเมล และรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"
      )
      return
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-9",
          compact ? "w-9 px-0" : "px-3"
        )}
        disabled={!store.canManageMembers}
        onClick={openEditor}
      >
        <Pencil className="size-4" />
        {compact ? (
          <span className="sr-only">แก้ไขข้อมูล</span>
        ) : (
          <span>แก้ไขข้อมูล</span>
        )}
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูลสมาชิก</DialogTitle>
          <DialogDescription>
            ปรับชื่อ อีเมล หรือกรอกรหัสผ่านใหม่เพื่อ reset รหัสผ่าน
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4 px-4 pb-4" onSubmit={handleSubmit}>
          <div>
            <Label className="mb-2 block">ชื่อสมาชิก</Label>
            <Input
              className="h-11"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2 block">อีเมล</Label>
            <Input
              type="email"
              className="h-11"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-4">
              <Label className="flex items-center gap-2">
                <KeyRound className="size-4" />
                เปลี่ยนรหัสผ่าน
              </Label>
              <button
                type="button"
                role="switch"
                aria-checked={resetPassword}
                className={cn(
                  "relative h-6 w-11 rounded-full border transition",
                  resetPassword
                    ? "border-sky-600 bg-sky-600"
                    : "border-border bg-muted"
                )}
                onClick={() => {
                  setResetPassword((current) => {
                    if (current) {
                      setPassword("")
                    }

                    return !current
                  })
                }}
              >
                <span
                  className={cn(
                    "absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-background shadow-sm transition",
                    resetPassword ? "left-5" : "left-0.5"
                  )}
                />
                <span className="sr-only">เปลี่ยนรหัสผ่าน</span>
              </button>
            </div>
            {resetPassword && (
              <div className="mt-3">
                <Label className="mb-2 block">รหัสผ่านใหม่</Label>
                <Input
                  type="password"
                  className="h-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  autoComplete="new-password"
                />
              </div>
            )}
          </div>

          {message && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {message}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="submit"
              className="h-11"
              disabled={!store.canManageMembers || store.isMemberSaving}
            >
              {store.isMemberSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              บันทึกข้อมูล
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setOpen(false)}
            >
              ยกเลิก
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RoleSelect({
  value,
  onChange,
}: {
  value: MemberRole
  onChange: (value: MemberRole) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(String(nextValue) as MemberRole)}
    >
      <SelectTrigger className="h-11 w-full">
        <SelectValue>{(nextValue) => memberRoleLabel(String(nextValue) as MemberRole)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {(["owner", "manager", "staff", "viewer"] as MemberRole[]).map(
          (item) => (
            <SelectItem key={item} value={item} label={memberRoleLabel(item)}>
              {memberRoleLabel(item)}
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  )
}

function StatusSelect({
  value,
  onChange,
}: {
  value: MemberStatus
  onChange: (value: MemberStatus) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) =>
        onChange(String(nextValue) as MemberStatus)
      }
    >
      <SelectTrigger className="h-11 w-full">
        <SelectValue>
          {(nextValue) => memberStatusLabel(String(nextValue) as MemberStatus)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {(["active", "invited", "suspended"] as MemberStatus[]).map((item) => (
          <SelectItem key={item} value={item} label={memberStatusLabel(item)}>
            {memberStatusLabel(item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ReportsView({ store }: { store: Store }) {
  return (
    <div className="space-y-5">
      {store.isReportsLoading && (
        <div className="flex min-h-14 items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm text-sky-900">
          <LoaderCircle className="size-4 animate-spin" />
          กำลังโหลดรายงานจากฐานข้อมูล
        </div>
      )}

      {store.reportsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {store.reportsError}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {store.reportCashFlowMetrics.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={formatMetricValue(metric)}
            helper={metricHelper(metric)}
            icon={BarChart3}
            tone={
              metric.kind === "expense"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-sky-200 bg-sky-50 text-sky-800"
            }
          />
        ))}
      </section>

      <section className="rounded-lg border border-border bg-background p-4 sm:p-5">
        <Tabs defaultValue="purchase" className="gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">รายงาน / การใช้งาน</h2>
              <p className="text-sm text-muted-foreground">
                {store.reportBranchSummary.helper}
              </p>
            </div>
            <TabsList className="h-11 w-full sm:w-fit" variant="default">
              <TabsTrigger value="purchase" className="h-9 px-3">
                ยอดซื้อ
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="h-9 px-3">
                เงินสด
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="purchase">
            <BranchPurchaseBarSeries
              data={store.reportBranchPurchaseSeries}
              label="ยอดซื้อรายวัน"
            />
          </TabsContent>
          <TabsContent value="cashflow">
            <CashFlowList metrics={store.reportCashFlowMetrics} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}

const branchChartColors = [
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#64748b",
]

function BranchPurchaseBarSeries({
  data,
  label,
}: {
  data: Store["reportBranchPurchaseSeries"]
  label: string
}) {
  const branches = Array.from(
    new Map(
      data
        .flatMap((item) => item.branches)
        .map((branch) => [branch.branchId, branch] as const)
    ).values()
  )
  const branchColorById = new Map(
    branches.map((branch, index) => [
      branch.branchId,
      branchChartColors[index % branchChartColors.length],
    ])
  )
  const max = Math.max(
    ...data.flatMap((item) => item.branches.map((branch) => branch.total)),
    1
  )

  if (data.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        ยังไม่มียอดซื้อสำหรับแสดงในกราฟ
      </div>
    )
  }

  return (
    <div className="mt-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <div className="flex flex-wrap gap-2">
          {branches.map((branch) => (
            <span
              key={branch.branchId}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: branchColorById.get(branch.branchId) }}
              />
              {branch.branchName}
            </span>
          ))}
        </div>
      </div>

      <div className="flex h-72 items-end gap-4 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
        {data.map((item) => (
          <div
            key={item.date}
            className="flex min-w-28 flex-1 flex-col items-center gap-2"
          >
            <div className="flex h-48 w-full items-end justify-center gap-1.5">
              {branches.map((branch) => {
                const total =
                  item.branches.find((entry) => entry.branchId === branch.branchId)
                    ?.total ?? 0
                const height = total > 0 ? Math.max((total / max) * 100, 8) : 0

                return (
                  <div
                    key={branch.branchId}
                    className="flex h-full flex-1 items-end rounded-t-md bg-background/70"
                    title={`${branch.branchName}: ${formatCurrency(total)}`}
                  >
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${height}%`,
                        backgroundColor: branchColorById.get(branch.branchId),
                      }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="text-center text-xs">
              <p className="font-medium">{item.label}</p>
              <p className="text-muted-foreground">{formatCurrency(item.total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CashFlowList({
  metrics,
}: {
  metrics: Store["reportCashFlowMetrics"]
}) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="rounded-lg border border-border p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-semibold">{metric.label}</p>
            <Badge variant="secondary" className="h-6">
              {metric.kind}
            </Badge>
          </div>
          <p className="text-2xl font-bold">{formatMetricValue(metric)}</p>
          <p className="text-sm text-muted-foreground">{metricHelper(metric)}</p>
        </div>
      ))}
    </div>
  )
}
