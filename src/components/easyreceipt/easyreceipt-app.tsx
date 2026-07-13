"use client"

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ExcelJS from "exceljs"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarIcon,
  ChefHat,
  CircleDollarSign,
  CircleCheck,
  Clock3,
  Database,
  Download,
  ImageUp,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Maximize2,
  MessageCircle,
  Minimize2,
  Minus,
  Package,
  Pencil,
  Pin,
  Plus,
  ReceiptText,
  Save,
  Search,
  Send,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  X,
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  type UsageDraftItem,
} from "@/hooks/use-easyreceipt-store"
import { useEasyReceipt } from "@/components/easyreceipt/easyreceipt-provider"
import {
  menuPermissionKeys,
  memberCanViewMenu,
  normalizeMemberPermissions,
} from "@/lib/easyreceipt-data"
import type {
  MenuPermissionKey,
  MemberMenuPermissions,
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

const isBudgetManagementPageEnabled = true
const isCashFlowReportTabEnabled = false
const isDashboardPageEnabled = false

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
    label: "บันทึกของมาเพิ่ม",
    shortLabel: "ของเข้า",
    description: "บันทึกรายการของเข้าและยอดรวม",
    href: "/portal/purchase",
    icon: Plus,
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "usage",
    label: "บันทึกของใช้ไป",
    shortLabel: "ของใช้ไป",
    description: "บันทึกวัตถุดิบที่ใช้และตัดคลังทันที",
    href: "/portal/usage",
    icon: Minus,
    color: "text-rose-700 bg-rose-50 border-rose-200",
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
    label: "ทดลองสูตรอาหาร",
    shortLabel: "ทดลอง",
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
    id: "budgets",
    label: "งบรายวัน",
    shortLabel: "งบ",
    description: "กำหนด budget รายวันของแต่ละสาขา",
    href: "/portal/budgets",
    icon: CircleDollarSign,
    color: "text-lime-700 bg-lime-50 border-lime-200",
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

function canAccessMemberManagement(member: Store["currentMember"]) {
  return memberCanViewMenu(member, "members")
}

function canAccessBudgetManagement(member: Store["currentMember"]) {
  return memberCanViewMenu(member, "budgets")
}

function canAccessReports(member: Store["currentMember"]) {
  return memberCanViewMenu(member, "reports")
}

function canAccessPurchase(member: Store["currentMember"]) {
  return memberCanViewMenu(member, "purchase")
}

function canAccessStock(member: Store["currentMember"]) {
  return memberCanViewMenu(member, "stock")
}

function canAccessView(view: ViewId, member: Store["currentMember"]) {
  if (view === "dashboard") {
    return isDashboardPageEnabled
  }

  if (view === "purchase") {
    return canAccessPurchase(member)
  }

  if (view === "usage") {
    return memberCanViewMenu(member, "usage")
  }

  if (view === "stock") {
    return canAccessStock(member)
  }

  if (view === "recipes") {
    return memberCanViewMenu(member, "recipes")
  }

  if (view === "reports") {
    return canAccessReports(member)
  }

  if (view === "members") {
    return canAccessMemberManagement(member)
  }

  if (view === "budgets") {
    return isBudgetManagementPageEnabled && canAccessBudgetManagement(member)
  }

  return true
}

function visibleNavItems(member: Store["currentMember"]) {
  return navItems.filter(
    (item) =>
      (item.id !== "dashboard" || isDashboardPageEnabled) &&
      (item.id !== "purchase" || canAccessPurchase(member)) &&
      (item.id !== "usage" || memberCanViewMenu(member, "usage")) &&
      (item.id !== "stock" || canAccessStock(member)) &&
      (item.id !== "recipes" || memberCanViewMenu(member, "recipes")) &&
      (item.id !== "reports" || canAccessReports(member)) &&
      (item.id !== "members" || canAccessMemberManagement(member)) &&
      (item.id !== "budgets" ||
        (isBudgetManagementPageEnabled && canAccessBudgetManagement(member)))
  )
}

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

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(value, 0))
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
    timeZone: "Asia/Bangkok",
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
    return "ผู้ดูแลระบบ"
  }

  return "พนักงาน"
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
      router.replace("/portal/purchase")
    }
  }, [router, store.currentMember, store.isAuthReady])

  if (!store.isAuthReady || store.currentMember) {
    return <AuthLoadingScreen />
  }

  return (
    <LoginView
      store={store}
      onLoginSuccess={() => {
        router.replace("/portal/purchase")
      }}
    />
  )
}

export function EasyReceiptApp() {
  return <EasyReceiptPortalPage activeView="purchase" />
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

  useEffect(() => {
    if (!store.isAuthReady || !store.currentMember) {
      return
    }

    const fallbackItem = visibleNavItems(store.currentMember)[0]

    if (
      fallbackItem &&
      !canAccessView(activeView, store.currentMember)
    ) {
      router.replace(fallbackItem.href)
    }
  }, [activeView, router, store.currentMember, store.isAuthReady])

  if (!store.isAuthReady || !store.currentMember) {
    return <AuthLoadingScreen />
  }

  function handleLogout() {
    store.logout()
    router.replace("/")
  }

  const memberCanAccessMembers = canAccessMemberManagement(store.currentMember)
  const memberCanAccessReports = canAccessReports(store.currentMember)
  const memberCanAccessBudgets =
    isBudgetManagementPageEnabled &&
    canAccessBudgetManagement(store.currentMember)
  const currentNavItems = visibleNavItems(store.currentMember)
  const activeViewIsAllowed = canAccessView(activeView, store.currentMember)
  const activeItem =
    currentNavItems.find((item) => item.id === activeView) ?? currentNavItems[0]

  if (!activeItem) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] p-4 text-foreground">
        <div className="mx-auto flex min-h-[60vh] max-w-md items-center">
          <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
            บัญชีนี้ยังไม่มีสิทธิ์มองเห็นเมนูใด ๆ กรุณาติดต่อผู้ดูแลระบบ
          </div>
        </div>
      </div>
    )
  }

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
          <header className="sticky top-0 z-50 isolate border-b border-border/70 bg-background">
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

          <main className="relative z-0 isolate flex-1 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-8">
            {!activeViewIsAllowed ? (
              <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                กำลังนำทางไปยังเมนูที่บัญชีนี้มีสิทธิ์ใช้งาน
              </div>
            ) : (
              children ?? (
                <>
                  {activeView === "dashboard" && isDashboardPageEnabled && (
                    <DashboardView store={store} />
                  )}
                  {activeView === "purchase" && <PurchaseView store={store} />}
                  {activeView === "usage" && <UsageView store={store} />}
                  {activeView === "stock" && <StockView store={store} />}
                  {activeView === "recipes" && <RecipesView store={store} />}
                  {activeView === "reports" && memberCanAccessReports && (
                    <ReportsView store={store} />
                  )}
                  {activeView === "budgets" && memberCanAccessBudgets && (
                    <BudgetsView store={store} />
                  )}
                  {activeView === "members" && memberCanAccessMembers && (
                    <MembersView store={store} />
                  )}
                </>
              )
            )}
          </main>
        </div>
      </div>

      <MobileBottomNav activeView={activeView} currentMember={store.currentMember} />
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
type SavedPurchaseRow = {
  purchase: Store["savedPurchasesForDate"][number]
  item: Store["savedPurchasesForDate"][number]["items"][number]
}
type SavedPurchaseSupplierGroup = {
  supplier: string
  total: number
  rows: (SavedPurchaseRow & { index: number })[]
}
type WidgetPosition = { right: number; bottom: number }
type DropdownPosition = {
  left: number
  top: number
  width: number
  maxHeight: number
}
const maxStockOutPhotoSize = 5 * 1024 * 1024
const customUsageReasonsKey = "easyreceipt.customUsageReasons"
const dropdownViewportPadding = 8
const dropdownGap = 4

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function measureDropdownBelow(
  anchor: HTMLElement,
  {
    desktopMinWidth,
    maxHeight,
    minHeight,
  }: {
    desktopMinWidth: number
    maxHeight: number
    minHeight: number
  }
): DropdownPosition {
  const rect = anchor.getBoundingClientRect()
  const visualViewport = window.visualViewport
  const viewportLeft = visualViewport?.offsetLeft ?? 0
  const viewportTop = visualViewport?.offsetTop ?? 0
  const viewportWidth = visualViewport?.width ?? window.innerWidth
  const viewportHeight = visualViewport?.height ?? window.innerHeight
  const viewportRight = viewportLeft + viewportWidth
  const viewportBottom = viewportTop + viewportHeight
  const dropdownWidth = Math.max(
    rect.width,
    viewportWidth < 640 ? rect.width : desktopMinWidth
  )
  const dropdownTop = viewportTop + rect.bottom + dropdownGap
  const availableBelow = Math.max(
    0,
    viewportBottom - dropdownTop - dropdownViewportPadding
  )
  const resolvedMaxHeight =
    availableBelow >= minHeight
      ? Math.min(maxHeight, availableBelow)
      : availableBelow
  const maxLeft = Math.max(
    viewportLeft + dropdownViewportPadding,
    viewportRight - dropdownWidth - dropdownViewportPadding
  )

  return {
    left: clampNumber(
      viewportLeft + rect.left,
      viewportLeft + dropdownViewportPadding,
      maxLeft
    ),
    top: dropdownTop,
    width: dropdownWidth,
    maxHeight: resolvedMaxHeight,
  }
}

function useAnchoredDropdownPosition({
  isOpen,
  desktopMinWidth = 320,
  maxHeight = 320,
  minHeight = 120,
}: {
  isOpen: boolean
  desktopMinWidth?: number
  maxHeight?: number
  minHeight?: number
}) {
  const inputAnchorRef = useRef<HTMLDivElement | null>(null)
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null)
  const updateDropdownPosition = useCallback(() => {
    const anchor = inputAnchorRef.current

    if (!anchor || typeof window === "undefined") {
      setDropdownPosition(null)
      return null
    }

    const nextPosition = measureDropdownBelow(anchor, {
      desktopMinWidth,
      maxHeight,
      minHeight,
    })

    setDropdownPosition(nextPosition)
    return nextPosition
  }, [desktopMinWidth, maxHeight, minHeight])

  useLayoutEffect(() => {
    if (!isOpen) {
      return
    }

    updateDropdownPosition()

    const animationFrame = window.requestAnimationFrame(updateDropdownPosition)
    const delayedAnimationFrame = window.setTimeout(updateDropdownPosition, 250)
    const visualViewport = window.visualViewport

    window.addEventListener("resize", updateDropdownPosition)
    window.addEventListener("scroll", updateDropdownPosition, true)
    visualViewport?.addEventListener("resize", updateDropdownPosition)
    visualViewport?.addEventListener("scroll", updateDropdownPosition)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(delayedAnimationFrame)
      window.removeEventListener("resize", updateDropdownPosition)
      window.removeEventListener("scroll", updateDropdownPosition, true)
      visualViewport?.removeEventListener("resize", updateDropdownPosition)
      visualViewport?.removeEventListener("scroll", updateDropdownPosition)
    }
  }, [isOpen, updateDropdownPosition])

  return { inputAnchorRef, dropdownPosition, updateDropdownPosition }
}

function FreezableTable({
  className,
  onClick,
  onKeyDown,
  style,
  ...props
}: Parameters<typeof Table>[0]) {
  const [frozenColumn, setFrozenColumn] = useState<number | null>(null)

  function toggleFrozenColumn(target: EventTarget | null) {
    if (!(target instanceof Element)) {
      return
    }

    const header = target.closest("th")

    if (!(header instanceof HTMLTableCellElement)) {
      return
    }

    const label = header.textContent?.trim()

    if (!label || header.dataset.freezeDisabled === "true") {
      return
    }

    const nextColumn = header.cellIndex + 1
    setFrozenColumn((current) => {
      const nextFrozenColumn = current === nextColumn ? null : nextColumn
      return nextFrozenColumn
    })
  }

  return (
    <Table
      {...props}
      data-frozen-column={frozenColumn ?? undefined}
      className={cn("freezable-table", className)}
      style={style}
      onClick={(event: ReactMouseEvent<HTMLTableElement>) => {
        onClick?.(event)

        if (!event.defaultPrevented) {
          toggleFrozenColumn(event.target)
        }
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLTableElement>) => {
        onKeyDown?.(event)

        if (
          !event.defaultPrevented &&
          (event.key === "Enter" || event.key === " ")
        ) {
          toggleFrozenColumn(event.target)
        }
      }}
    />
  )
}

function loadCustomUsageReasons() {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const storedReasons = JSON.parse(
      window.localStorage.getItem(customUsageReasonsKey) ?? "[]"
    ) as unknown

    if (!Array.isArray(storedReasons)) {
      return []
    }

    return storedReasons
      .filter((reason): reason is string => typeof reason === "string")
      .map((reason) => reason.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

type WidgetDragState = {
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  width: number
  height: number
  moved: boolean
}

function LoginView({
  store,
  onLoginSuccess,
}: {
  store: Store
  onLoginSuccess: () => void
}) {
  const [username, setUsername] = useState("owner")
  const [password, setPassword] = useState("123456")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const ok = await store.login(username, password)

    if (!ok) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่ได้เปิดใช้งาน")
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
              <Label className="mb-2 block">ชื่อผู้ใช้</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  className="h-12 pl-9"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
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
            <p>owner / 123456</p>
            <p>manager / 123456</p>
            <p>staff / 123456</p>
          </div>
        </section>
      </div>
    </main>
  )
}

function StockOutChatWidget({ store }: { store: Store }) {
  const widgetRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<WidgetDragState | null>(null)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [position, setPosition] = useState<WidgetPosition | null>(null)
  const [dragMoved, setDragMoved] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [movementType, setMovementType] = useState<"waste_out" | "sale_out">(
    "waste_out"
  )
  const [ingredientId, setIngredientId] = useState("")
  const [ingredientQuery, setIngredientQuery] = useState("")
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false)
  const [quantity, setQuantity] = useState(0)
  const [reason, setReason] = useState("")
  const [photo, setPhoto] = useState<{
    name: string
    type: string
    size: number
    dataUrl: string
  } | null>(null)
  const [message, setMessage] = useState("")
  const selectedItem = store.inventoryRows.find(
    (item) => item.ingredientId === ingredientId
  )
  const ingredientSearchTerm = normalizeSearch(ingredientQuery)
  const filteredInventoryRows = store.inventoryRows
    .filter((item) => {
      if (!ingredientSearchTerm) {
        return true
      }

      return [
        item.ingredient.name,
        item.ingredient.category,
        item.ingredient.supplier,
        item.ingredient.unit,
      ]
        .map(normalizeSearch)
        .some((value) => value.includes(ingredientSearchTerm))
    })
    .slice(0, 20)

  function getClampedWidgetPosition(
    clientX: number,
    clientY: number,
    dragState: WidgetDragState
  ) {
    const edgePadding = 12
    const bottomPadding = window.innerWidth < 1024 ? 96 : 24
    const maxLeft = Math.max(
      edgePadding,
      window.innerWidth - dragState.width - edgePadding
    )
    const maxTop = Math.max(
      edgePadding,
      window.innerHeight - dragState.height - bottomPadding
    )
    const left = Math.min(
      Math.max(clientX - dragState.offsetX, edgePadding),
      maxLeft
    )
    const top = Math.min(
      Math.max(clientY - dragState.offsetY, edgePadding),
      maxTop
    )

    return {
      right: Math.max(edgePadding, window.innerWidth - left - dragState.width),
      bottom: Math.max(
        bottomPadding,
        window.innerHeight - top - dragState.height
      ),
    }
  }

  function handleWidgetDragStart(event: ReactPointerEvent<HTMLElement>) {
    if (expanded || event.button !== 0) {
      return
    }

    const widgetElement = widgetRef.current

    if (!widgetElement) {
      return
    }

    const rect = widgetElement.getBoundingClientRect()
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    }
    setIsDragging(true)
    setDragMoved(false)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleWidgetDragMove(event: ReactPointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const movementDistance =
      Math.abs(event.clientX - dragState.startX) +
      Math.abs(event.clientY - dragState.startY)

    if (movementDistance > 4) {
      dragState.moved = true
      setDragMoved(true)
    }

    setPosition(
      getClampedWidgetPosition(event.clientX, event.clientY, dragState)
    )
  }

  function handleWidgetDragEnd(event: ReactPointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    dragStateRef.current = null
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)

    window.setTimeout(() => {
      setDragMoved(false)
    }, 0)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")

    const result = await store.recordStockOut({
      ingredientId,
      movementType,
      quantity,
      reason,
      photo: photo ?? {
        name: "",
        type: "",
        size: 0,
        dataUrl: "",
      },
    })

    if (!result.ok) {
      setMessage(result.error ?? "ไม่สามารถบันทึกรายการตัดสต็อกได้")
      return
    }

    setMessage("บันทึกรายการและตัดสต็อกเรียบร้อย")
    setIngredientId("")
    setIngredientQuery("")
    setIngredientDropdownOpen(false)
    setQuantity(0)
    setReason("")
    setPhoto(null)
  }

  return (
    <>
      {open && expanded && (
        <div className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm" />
      )}
      <div
        ref={widgetRef}
        style={!expanded && position ? position : undefined}
        className={cn(
          "fixed z-50",
          expanded
            ? "inset-x-3 bottom-24 top-3 lg:bottom-auto lg:left-1/2 lg:right-auto lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2"
            : position
              ? ""
              : "bottom-24 right-4 lg:bottom-6"
        )}
      >
      {open && (
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-background shadow-xl",
            expanded
              ? "flex h-full w-full flex-col lg:h-[min(820px,calc(100dvh-3rem))] lg:w-[min(920px,calc(100vw-4rem))]"
              : "mb-3 w-[calc(100vw-2rem)] max-w-sm"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between border-b border-border px-4 py-3",
              !expanded && "cursor-grab select-none touch-none",
              isDragging && "cursor-grabbing"
            )}
            onPointerDown={handleWidgetDragStart}
            onPointerMove={handleWidgetDragMove}
            onPointerUp={handleWidgetDragEnd}
            onPointerCancel={handleWidgetDragEnd}
          >
            <div>
              <p className="font-semibold">บันทึกตัดสต็อก</p>
              <p className="text-xs text-muted-foreground">
                วัตถุดิบเสียหรือจำหน่ายออก
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setExpanded((current) => !current)}
              >
                {expanded ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
                <span className="sr-only">
                  {expanded ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  setOpen(false)
                  setExpanded(false)
                }}
              >
                <X className="size-4" />
                <span className="sr-only">ปิด</span>
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "overflow-y-auto p-4",
              expanded ? "flex-1" : "max-h-[70dvh]"
            )}
          >
            <div className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm">
              เลือกประเภท ระบุจำนวน เหตุผล และแนบรูปก่อนบันทึก ระบบจะตัด
              stock ทันที
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    movementType === "waste_out"
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-border bg-background text-muted-foreground"
                  )}
                  onClick={() => setMovementType("waste_out")}
                >
                  วัตถุดิบเสีย
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    movementType === "sale_out"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-border bg-background text-muted-foreground"
                  )}
                  onClick={() => setMovementType("sale_out")}
                >
                  จำหน่ายออก
                </button>
              </div>

              <div>
                <Label className="mb-2 block">วัตถุดิบ</Label>
                <Popover
                  open={ingredientDropdownOpen}
                  onOpenChange={setIngredientDropdownOpen}
                >
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-between px-3 text-left font-normal"
                      />
                    }
                  >
                    <span className="min-w-0 truncate">
                      {selectedItem?.ingredient.name ?? "เลือกวัตถุดิบ"}
                    </span>
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 p-2">
                    <div className="relative mb-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="h-10 pl-9"
                        value={ingredientQuery}
                        onChange={(event) =>
                          setIngredientQuery(event.target.value)
                        }
                        placeholder="ค้นหาวัตถุดิบ"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredInventoryRows.map((item) => (
                        <button
                          key={item.ingredientId}
                          type="button"
                          className={cn(
                            "flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                            item.ingredientId === ingredientId && "bg-muted"
                          )}
                          onClick={() => {
                            setIngredientId(item.ingredientId)
                            setIngredientQuery(item.ingredient.name)
                            setIngredientDropdownOpen(false)
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {item.ingredient.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.ingredient.category} · {item.ingredient.supplier}
                            </span>
                          </span>
                          <Badge variant="secondary" className="h-6 shrink-0">
                            {formatNumber(item.onHand)} {item.ingredient.unit}
                          </Badge>
                        </button>
                      ))}
                      {filteredInventoryRows.length === 0 && (
                        <div className="px-3 py-4 text-sm text-muted-foreground">
                          ไม่พบวัตถุดิบที่ตรงกับคำค้นหา
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {selectedItem && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    คงเหลือ {formatNumber(selectedItem.onHand)}{" "}
                    {selectedItem.ingredient.unit}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div>
                  <Label className="mb-2 block">จำนวนที่ตัด</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-11"
                    value={quantity}
                    onChange={(event) => setQuantity(toNumber(event.target.value))}
                  />
                </div>
                <div className="min-w-20">
                  <Label className="mb-2 block">หน่วย</Label>
                  <div className="flex h-11 items-center rounded-lg border border-border bg-muted px-3 text-sm">
                    {selectedItem?.ingredient.unit ?? "-"}
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">เหตุผล</Label>
                <Input
                  className="h-11"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    movementType === "waste_out"
                      ? "เช่น หมดอายุ เสียหาย ระหว่างจัดเก็บ"
                      : "เช่น จำหน่ายหน้าร้าน โอนออก"
                  }
                />
              </div>

              <div>
                <Label className="mb-2 block">รูปประกอบ</Label>
                <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-sky-300 bg-sky-50/40 px-3 py-2 text-sm font-medium text-sky-700">
                  <ImageUp className="size-4" />
                  {photo ? photo.name : "อัปโหลดรูป"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]

                      if (!file) {
                        setPhoto(null)
                        return
                      }

                      if (file.size > maxStockOutPhotoSize) {
                        setPhoto(null)
                        setMessage("รูปประกอบต้องมีขนาดไม่เกิน 5MB")
                        event.target.value = ""
                        return
                      }

                      const reader = new FileReader()
                      reader.onload = () => {
                        setPhoto({
                          name: file.name,
                          type: file.type || "image/*",
                          size: file.size,
                          dataUrl: String(reader.result ?? ""),
                        })
                      }
                      reader.onerror = () => {
                        setPhoto(null)
                        setMessage("ไม่สามารถอ่านไฟล์รูปได้")
                        event.target.value = ""
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
              </div>

              {message && (
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    message.includes("เรียบร้อย")
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  )}
                >
                  {message}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={store.isStockOutSaving}
              >
                {store.isStockOutSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                บันทึกและตัดสต็อก
              </Button>
            </form>
          </div>
        </div>
      )}

      {!expanded && (
        <Button
          type="button"
          className={cn(
            "h-11 w-11 touch-none rounded-full px-0 shadow-lg sm:h-12 sm:w-auto sm:px-4",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onPointerDown={handleWidgetDragStart}
          onPointerMove={handleWidgetDragMove}
          onPointerUp={handleWidgetDragEnd}
          onPointerCancel={handleWidgetDragEnd}
          onClick={() => {
            if (dragMoved) {
              return
            }

            setOpen((current) => !current)
          }}
        >
          <MessageCircle className="size-5" />
          <span className="hidden sm:inline">ตัดสต็อก</span>
        </Button>
      )}
      </div>
    </>
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
        {visibleNavItems(currentMember).map((item) => {
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

    </aside>
  )
}

function MobileBottomNav({
  activeView,
  currentMember,
}: {
  activeView: ViewId
  currentMember: Store["currentMember"]
}) {
  const items = visibleNavItems(currentMember)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-2 py-2 backdrop-blur lg:hidden">
      <div
        className={cn(
          "mx-auto grid max-w-lg gap-1",
          items.length === 5
            ? "grid-cols-5"
            : items.length === 6
              ? "grid-cols-6"
              : "grid-cols-7"
        )}
      >
        {items.map((item) => {
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
            รายการแจ้งเตือนถูกรวมไว้ในใบสั่งซื้อวัตถุดิบบนแดชบอร์ดแล้ว
          </SheetDescription>
        </SheetHeader>
        {lowStockItems.length > 0 && (
          <div className="space-y-3 px-4 pb-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">
                    {lowStockItems.length} รายการรอรวมในใบสั่งซื้อ
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    ดูจำนวนที่ควรซื้อ ราคา และ export ได้จากส่วนใบสั่งซื้อวัตถุดิบ
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function BranchSwitcher({ store }: { store: Store }) {
  const [budgetBranchId, setBudgetBranchId] = useState("")
  const [budgetInput, setBudgetInput] = useState("")
  const [isUnlimitedBudget, setIsUnlimitedBudget] = useState(true)
  const [budgetMessage, setBudgetMessage] = useState("")
  const budgetBranch = store.branches.find((branch) => branch.id === budgetBranchId)

  function openBudgetDialog(branch: Store["branches"][number]) {
    setBudgetBranchId(branch.id)
    setIsUnlimitedBudget(branch.dailyPurchaseBudget === null)
    setBudgetInput(
      branch.dailyPurchaseBudget === null ? "" : String(branch.dailyPurchaseBudget)
    )
    setBudgetMessage("")
  }

  async function handleSaveBudget() {
    if (!budgetBranch) {
      return
    }

    const result = await store.updateBranchBudget(
      budgetBranch.id,
      isUnlimitedBudget ? null : toNumber(budgetInput)
    )

    if (!result.ok) {
      setBudgetMessage(result.error ?? "ไม่สามารถบันทึกงบประมาณสาขาได้")
      return
    }

    setBudgetMessage("")
    setBudgetBranchId("")
  }

  return (
    <>
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
        <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1rem))] p-2">
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
                <div
                  key={branch.id}
                  className={cn(
                    "flex min-h-14 items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-muted",
                    isActive && "bg-sky-50 text-sky-950"
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => store.setActiveBranch(branch.id)}
                  >
                    <span className="block truncate font-semibold">
                      {branch.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {branch.code} · {branch.location}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      งบรายวัน:{" "}
                      {branch.dailyPurchaseBudget === null
                        ? "ไม่จำกัด"
                        : formatCurrency(branch.dailyPurchaseBudget)}
                    </span>
                  </button>
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
                  {store.canManageBranchBudget && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => openBudgetDialog(branch)}
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">ตั้งงบสาขา</span>
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog
        open={Boolean(budgetBranch)}
        onOpenChange={(open) => {
          if (!open) {
            setBudgetBranchId("")
            setBudgetMessage("")
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md gap-3 rounded-lg">
          <DialogHeader>
            <DialogTitle>ตั้งงบประมาณสาขา</DialogTitle>
            <DialogDescription>
              กำหนดเพดานยอดใบสั่งซื้อวัตถุดิบรายวันของสาขา
            </DialogDescription>
          </DialogHeader>
          {budgetBranch && (
            <div className="space-y-4 px-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="font-semibold">{budgetBranch.name}</p>
                <p className="text-sm text-muted-foreground">
                  {budgetBranch.code} · {budgetBranch.location}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={cn(
                    "min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition",
                    !isUnlimitedBudget
                      ? "border-sky-300 bg-sky-50 text-sky-800"
                      : "border-border text-muted-foreground"
                  )}
                  onClick={() => setIsUnlimitedBudget(false)}
                >
                  จำกัดงบ
                </button>
                <button
                  type="button"
                  className={cn(
                    "min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition",
                    isUnlimitedBudget
                      ? "border-sky-300 bg-sky-50 text-sky-800"
                      : "border-border text-muted-foreground"
                  )}
                  onClick={() => setIsUnlimitedBudget(true)}
                >
                  ไม่จำกัดงบ
                </button>
              </div>

              <div>
                <Label className="mb-2 block">งบรายวัน</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-11"
                  value={budgetInput}
                  disabled={isUnlimitedBudget}
                  onChange={(event) => setBudgetInput(event.target.value)}
                  placeholder="เช่น 1000"
                />
              </div>

              {budgetMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {budgetMessage}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="grid grid-cols-1 gap-2 p-4 pt-2 min-[390px]:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => setBudgetBranchId("")}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              className="h-11 w-full"
              disabled={store.isBranchBudgetSaving}
              onClick={handleSaveBudget}
            >
              {store.isBranchBudgetSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              บันทึกงบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DashboardView({ store }: { store: Store }) {
  return (
    <div className="space-y-4 pb-20 sm:space-y-5 sm:pb-0">
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

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
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
  className,
}: {
  label: string
  value: string
  helper: string
  icon: LucideIcon
  tone: string
  className?: string
}) {
  return (
    <Card size="sm" className={cn("rounded-lg", className)}>
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
  const purchaseOrderItems = store.purchaseOrderRows
  const isDraftPurchaseOrder = store.purchaseOrderSource === "draft"
  const isCombinedPurchaseOrder = store.purchaseOrderSource === "combined"
  const branchName = store.activeBranch?.name ?? "สาขาที่เลือก"
  const purchaseOrderTotal = purchaseOrderItems.reduce(
    (total, item) =>
      total + item.suggestedPurchaseQuantity * item.ingredient.defaultPrice,
    0
  )

  function handleExportPurchaseOrder() {
    exportPurchaseOrderXlsx({
      branchName: store.activeBranch?.name ?? "",
      items: purchaseOrderItems,
    })
  }

  function handleExportPurchaseOrderImage() {
    exportPurchaseOrderPng({
      branchName: store.activeBranch?.name ?? "",
      items: purchaseOrderItems,
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
            {isCombinedPurchaseOrder
              ? `รวมฉบับร่างและแจ้งเตือนสต็อกของ ${branchName}`
              : isDraftPurchaseOrder
                ? `ฉบับร่างจากหน้าบันทึกของมาเพิ่มของ ${branchName}`
                : `สร้างจากรายการที่ควรซื้อเพิ่มของ ${branchName}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary" className="h-7 px-3">
              {purchaseOrderItems.length} รายการ
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "h-7 px-3",
                (isDraftPurchaseOrder || isCombinedPurchaseOrder) &&
                  "border-amber-200 bg-amber-50 text-amber-700"
              )}
            >
              {isCombinedPurchaseOrder
                ? `ฉบับร่าง + แจ้งเตือนสต็อก${store.purchaseOrderDraftSavedAt ? ` · ${formatThaiTime(store.purchaseOrderDraftSavedAt)}` : ""}`
                : isDraftPurchaseOrder
                  ? `ฉบับร่าง${store.purchaseOrderDraftSavedAt ? ` · ${formatThaiTime(store.purchaseOrderDraftSavedAt)}` : ""}`
                  : "Auto จากสต็อก"}
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
            disabled={purchaseOrderItems.length === 0}
          >
            <Download className="size-4" />
            <span className="truncate">Export PNG</span>
          </Button>
          <Button
            variant="outline"
            className="h-9 min-w-0 px-2 text-sm sm:h-11 sm:w-auto sm:px-4 sm:text-base"
            onClick={handleExportPurchaseOrder}
            disabled={purchaseOrderItems.length === 0}
          >
            <Download className="size-4" />
            <span className="truncate">Export XLSX</span>
          </Button>
        </div>
      </div>

      {purchaseOrderItems.length > 0 ? (
        <div className="overflow-x-auto">
          <FreezableTable>
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
              {purchaseOrderItems.map((item, index) => (
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
          </FreezableTable>
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
  const [isPurchaseConfirmOpen, setIsPurchaseConfirmOpen] = useState(false)
  const savedPurchaseRows = store.savedPurchasesForDate.flatMap((purchase) =>
    purchase.items.map((item) => ({ purchase, item }))
  )
  const savedPurchaseGroups = groupSavedPurchaseRowsBySupplier(
    savedPurchaseRows,
    store
  )
  const draftPurchaseRows = store.draftPurchasesForDate.flatMap((purchase) =>
    purchase.items.map((item) => ({ purchase, item }))
  )
  const newItemIndexOffset = draftPurchaseRows.length
  const budgetStatus = store.purchaseBudgetStatus
  const hasPurchasesToSubmit =
    store.purchaseItems.some((item) => item.ingredientId && item.quantity > 0) ||
    store.draftPurchasesForDate.length > 0
  const purchaseMessageIsError =
    Boolean(store.purchaseError) ||
    purchaseMessage.includes("ไม่สามารถ") ||
    purchaseMessage.includes("กรุณา")

  async function handleConfirmSubmitPurchase() {
    setPurchaseMessage("")

    if (!hasPurchasesToSubmit) {
      setPurchaseMessage("กรุณาเพิ่มรายการวัตถุดิบอย่างน้อย 1 รายการ")
      return
    }

    const result = await store.submitPurchase()

    if (!result.ok) {
      setPurchaseMessage(result.error ?? "ไม่สามารถบันทึกใบซื้อได้")
      return
    }

    setIsPurchaseConfirmOpen(false)
    setPurchaseMessage("บันทึกใบซื้อเข้าฐานข้อมูลและอัปเดตคลังวัตถุดิบแล้ว")
  }

  async function handleSavePurchaseDraft() {
    setPurchaseMessage("")
    const result = await store.savePurchaseDraft()

    setPurchaseMessage(
      result.ok
        ? "บันทึกฉบับร่างลงฐานข้อมูลแล้ว และแสดงในหน้าแดชบอร์ดส่วนใบสั่งซื้อวัตถุดิบ"
        : (result.error ?? "ไม่สามารถบันทึกฉบับร่างได้")
    )
  }

  async function handleDeletePurchaseDraftItem(
    purchaseId: string,
    itemId: string
  ) {
    setPurchaseMessage("")
    const result = await store.deletePurchaseDraftItem(purchaseId, itemId)

    setPurchaseMessage(
      result.ok
        ? "ลบรายการฉบับร่างแล้ว"
        : (result.error ?? "ไม่สามารถลบรายการฉบับร่างได้")
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

      {budgetStatus.isOverBudget && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ร่างใบซื้อนี้ทำให้ยอดรวมรายวันเกินงบประมาณสาขา กรุณาลดรายการหรือปรับงบก่อนบันทึก
        </div>
      )}

      {!store.canEditPurchase && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          บัญชีนี้มีสิทธิ์ดูบันทึกของมาเพิ่ม แต่ไม่มีสิทธิ์เพิ่ม ลบ หรือแก้ไขรายการ
        </div>
      )}

      {(store.purchaseError || purchaseMessage) && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            purchaseMessageIsError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {store.purchaseError || purchaseMessage}
        </div>
      )}

      <section className="rounded-lg border border-border bg-background p-3 sm:p-5">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
              <Plus className="size-4 text-amber-600 sm:size-5" />
              <h2 className="text-base font-semibold sm:text-lg">
                บันทึกของมาเพิ่ม
              </h2>
            </div>
            <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
              เลือกวัตถุดิบ จำนวน และราคาต่อหน่วย ระบบจะบันทึกประวัติและเพิ่มเข้าคลังเมื่อกดบันทึก
            </p>
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

        <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
          <div className="overflow-x-auto overflow-y-visible rounded-lg border border-border">
            <FreezableTable className="w-full min-w-[45rem] table-fixed text-xs sm:text-sm">
              <colgroup>
                <col className="w-10" />
                <col className="w-56" />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-[5.5rem]" />
                <col className="w-24" />
                <col className="w-28" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">#</TableHead>
                  <TableHead>ชื่อวัตถุดิบ</TableHead>
                  <TableHead>ปริมาณ</TableHead>
                  <TableHead>หน่วย</TableHead>
                  <TableHead>ราคาต่อหน่วย</TableHead>
                  <TableHead className="text-right">ราคารวม</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {draftPurchaseRows.map(({ purchase, item }, itemIndex) => (
                  <DraftPurchaseTableRow
                    key={`${purchase.id}-${item.id}`}
                    purchase={purchase}
                    item={item}
                    index={itemIndex}
                    store={store}
                    onDelete={handleDeletePurchaseDraftItem}
                  />
                ))}
                {store.purchaseItems.map((item, index) => (
                  <PurchaseTableRow
                    key={item.id}
                    index={newItemIndexOffset + index}
                    item={item}
                    store={store}
                  />
                ))}
                {draftPurchaseRows.length === 0 &&
                  store.purchaseItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-16 text-center text-sm text-muted-foreground"
                    >
                      กดเพิ่มแถวเพื่อเริ่มบันทึกของมาเพิ่ม
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </FreezableTable>
          </div>

          <div
            className={cn(
              "rounded-lg border p-2.5 sm:p-4",
              budgetStatus.isOverBudget
                ? "border-red-200 bg-red-50 text-red-950"
                : "border-sky-200 bg-sky-50 text-sky-950"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-semibold leading-tight">
                สรุปของมาเพิ่ม
              </span>
              <Badge variant="secondary" className="h-6 shrink-0 text-xs sm:h-7 sm:text-sm">
                {store.purchaseItems.length} รายการ
              </Badge>
            </div>
            <div className="mt-2 border-t border-sky-200 pt-2 sm:mt-3 sm:pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">ยอดซื้อ</span>
                <span className="text-base font-bold leading-none sm:text-lg">
                  {formatCurrency(budgetStatus.projected)}
                </span>
              </div>
            </div>
            <div
              className={cn(
                "hidden sm:mt-3 sm:block sm:space-y-2 sm:text-sm",
                budgetStatus.isOverBudget ? "text-red-900" : "text-sky-900"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <span>งบของวัน</span>
                <span className="font-semibold">
                  {budgetStatus.isLimited
                    ? formatCurrency(budgetStatus.budget ?? 0)
                    : "ไม่จำกัด"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>บันทึกแล้ว</span>
                <span className="font-semibold">
                  {formatCurrency(budgetStatus.used)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>ยังไม่บันทึก</span>
                <span className="font-semibold">
                  {formatCurrency(budgetStatus.draft)}
                </span>
              </div>
              {budgetStatus.isLimited && (
                <div className="flex items-center justify-between gap-4">
                  <span>คงเหลือหลังบันทึก</span>
                  <span className="font-semibold">
                    {formatCurrency(budgetStatus.remaining ?? 0)}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3">
              <Button
                variant="outline"
                className="h-9 bg-background text-sm sm:h-10"
                onClick={store.addPurchaseItem}
                disabled={!store.canEditPurchase}
                title="เพิ่มแถวรายการวัตถุดิบ"
              >
                <Plus className="size-4" />
                เพิ่มแถว
              </Button>
              <Button
                variant="outline"
                className="h-9 bg-background text-sm sm:h-10"
                onClick={handleSavePurchaseDraft}
                disabled={
                  !store.canEditPurchase ||
                  store.purchaseItems.length === 0 ||
                  store.isPurchaseSaving
                }
                title="บันทึกรายการเป็นฉบับร่าง"
              >
                {store.isPurchaseSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ReceiptText className="size-4" />
                )}
                เก็บร่าง
              </Button>
              <Button
                className="col-span-2 h-9 text-sm sm:h-10"
                onClick={() => setIsPurchaseConfirmOpen(true)}
                disabled={
                  !store.canEditPurchase ||
                  store.isPurchaseSaving ||
                  budgetStatus.isOverBudget ||
                  !hasPurchasesToSubmit
                }
                title="บันทึกใบซื้อและอัปเดตคลัง"
              >
                {store.isPurchaseSaving ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    กำลังบันทึก
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    บันทึกซื้อ
                  </>
                )}
              </Button>
            </div>
            <p
              className={cn(
                "mt-3 hidden text-sm sm:block",
                budgetStatus.isOverBudget ? "text-red-700" : "text-sky-700"
              )}
            >
              {budgetStatus.isOverBudget
                ? "ระบบจะไม่บันทึกใบซื้อที่เกินงบประมาณรายวันของสาขา"
                : "ระบบจะบันทึกใบซื้อและเพิ่มคงเหลือในคลังวัตถุดิบทันที"}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">ประวัติของมาเพิ่มวันนี้</h2>
            <p className="text-sm text-muted-foreground">
              รายการที่บันทึกแล้วของวันที่เลือก แยกตามซัพพลายเออร์
            </p>
          </div>
          <Badge variant="secondary" className="h-7 w-fit">
            {savedPurchaseRows.length} รายการ
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <FreezableTable className="min-w-[52rem] text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 text-center">เวลา</TableHead>
                <TableHead>วัตถุดิบ</TableHead>
                <TableHead>ปริมาณ</TableHead>
                <TableHead>หน่วย</TableHead>
                <TableHead>ราคาต่อหน่วย</TableHead>
                <TableHead className="text-right">รวม</TableHead>
                <TableHead className="w-28">สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {savedPurchaseGroups.map((group) => (
                <Fragment key={group.supplier}>
                  <PurchaseSupplierGroupHeader
                    supplier={group.supplier}
                    count={group.rows.length}
                    total={group.total}
                  />
                  {group.rows.map(({ purchase, item }) => (
                    <SavedPurchaseTableRow
                      key={`${purchase.id}-${item.id}`}
                      purchase={purchase}
                      item={item}
                      store={store}
                    />
                  ))}
                </Fragment>
              ))}
              {savedPurchaseRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-16 text-center text-sm text-muted-foreground"
                  >
                    {store.isPurchasesLoading
                      ? "กำลังโหลดประวัติของมาเพิ่ม"
                      : "ยังไม่มีรายการของมาเพิ่มในวันที่เลือก"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </FreezableTable>
        </div>
      </section>

      <Dialog
        open={isPurchaseConfirmOpen}
        onOpenChange={setIsPurchaseConfirmOpen}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันบันทึกใบซื้อ</DialogTitle>
            <DialogDescription>
              ระบบจะบันทึกรายการเป็นใบซื้อและอัปเดตคลังวัตถุดิบ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">รายการใหม่</span>
                <span className="font-semibold">
                  {store.purchaseItems.length} รายการ
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-muted-foreground">ฉบับร่าง</span>
                <span className="font-semibold">
                  {store.draftPurchasesForDate.length} ใบ
                </span>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">ยอดที่จะบันทึก</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(budgetStatus.draft)}
                  </span>
                </div>
              </div>
            </div>
            {budgetStatus.isLimited && (
              <div
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  budgetStatus.isOverBudget
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-sky-200 bg-sky-50 text-sky-800"
                )}
              >
                คงเหลือหลังบันทึก {formatCurrency(budgetStatus.remaining ?? 0)}
              </div>
            )}
          </div>
          <DialogFooter className="grid grid-cols-1 gap-2 p-4 pt-2 min-[390px]:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => setIsPurchaseConfirmOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              className="h-11 w-full"
              disabled={
                store.isPurchaseSaving ||
                budgetStatus.isOverBudget ||
                !hasPurchasesToSubmit
              }
              onClick={handleConfirmSubmitPurchase}
            >
              {store.isPurchaseSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              ยืนยันบันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function savedPurchaseRowSupplier(row: SavedPurchaseRow, store: Store) {
  const ingredient =
    row.item.ingredient ?? store.ingredientById.get(row.item.ingredientId)

  return ingredient?.supplier?.trim() || "ไม่ระบุซัพพลายเออร์"
}

function groupSavedPurchaseRowsBySupplier(
  rows: SavedPurchaseRow[],
  store: Store
): SavedPurchaseSupplierGroup[] {
  const groupsBySupplier = new Map<
    string,
    Omit<SavedPurchaseSupplierGroup, "rows"> & { rows: SavedPurchaseRow[] }
  >()

  for (const row of rows) {
    const supplier = savedPurchaseRowSupplier(row, store)
    const existingGroup = groupsBySupplier.get(supplier)

    if (existingGroup) {
      existingGroup.rows.push(row)
      existingGroup.total += row.item.lineTotal
      continue
    }

    groupsBySupplier.set(supplier, {
      supplier,
      total: row.item.lineTotal,
      rows: [row],
    })
  }

  let nextIndex = 0

  return Array.from(groupsBySupplier.values()).map((group) => ({
    ...group,
    rows: group.rows.map((row) => ({ ...row, index: nextIndex++ })),
  }))
}

function PurchaseSupplierGroupHeader({
  supplier,
  count,
  total,
}: {
  supplier: string
  count: number
  total: number
}) {
  return (
    <TableRow className="bg-sky-50/80 hover:bg-sky-50/80">
      <TableCell colSpan={7} className="px-3 py-2 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="size-4 shrink-0 text-sky-700" />
            <span className="truncate font-semibold text-sky-950">
              {supplier}
            </span>
            <Badge variant="secondary" className="h-6 shrink-0">
              {count} รายการ
            </Badge>
          </div>
          <div className="shrink-0 text-right text-sm font-semibold text-sky-950">
            รวม {formatCurrency(total)}
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

function SavedPurchaseTableRow({
  purchase,
  item,
  store,
}: {
  purchase: Store["savedPurchasesForDate"][number]
  item: Store["savedPurchasesForDate"][number]["items"][number]
  store: Store
}) {
  const ingredient = item.ingredient ?? store.ingredientById.get(item.ingredientId)

  return (
    <TableRow className="bg-muted/30">
      <TableCell className="text-center align-top">
        {formatThaiTime(purchase.purchasedAt)}
      </TableCell>
      <TableCell>
        <div className="font-medium">{ingredient?.name ?? "วัตถุดิบ"}</div>
        <div className="text-xs text-muted-foreground">
          {ingredient?.supplier || "ไม่ระบุซัพพลายเออร์"}
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

function DraftPurchaseTableRow({
  purchase,
  item,
  index,
  store,
  onDelete,
}: {
  purchase: Store["draftPurchasesForDate"][number]
  item: Store["draftPurchasesForDate"][number]["items"][number]
  index: number
  store: Store
  onDelete: (purchaseId: string, itemId: string) => void
}) {
  const ingredient = item.ingredient ?? store.ingredientById.get(item.ingredientId)

  return (
    <TableRow className="bg-amber-50/60">
      <TableCell className="text-center align-top">
        <div className="font-medium">{index + 1}</div>
        <div className="text-xs text-muted-foreground">
          {formatThaiTime(purchase.purchasedAt)}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{ingredient?.name ?? "วัตถุดิบ"}</div>
        <div className="text-xs text-muted-foreground">
          {ingredient?.supplier || "ไม่ระบุซัพพลายเออร์"}
        </div>
      </TableCell>
      <TableCell>{formatNumber(item.quantity)}</TableCell>
      <TableCell>{item.unit}</TableCell>
      <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
      <TableCell className="text-right font-semibold">
        {formatCurrency(item.lineTotal)}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <Badge variant="outline" className="h-7 border-amber-200 bg-amber-50 text-amber-800">
            ฉบับร่าง
          </Badge>
          <Button
            variant="ghost"
            size="icon-lg"
            className="h-9 w-9 text-red-600 hover:bg-red-50 hover:text-red-700 sm:h-11 sm:w-11"
            onClick={() => onDelete(purchase.id, item.id)}
            disabled={!store.canEditPurchase || store.isPurchaseDraftDeleting}
          >
            {store.isPurchaseDraftDeleting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            <span className="sr-only">ลบฉบับร่าง</span>
          </Button>
        </div>
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
          className="w-full min-w-0 sm:min-w-0"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.quantity === 0 ? "" : item.quantity}
          onChange={(event) =>
            store.updatePurchaseItem(item.id, {
              quantity: toNumber(event.target.value),
            })
          }
          className="h-9 w-full px-2 text-sm sm:h-10"
          disabled={!store.canEditPurchase}
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-9 w-full px-2 text-sm sm:h-10"
          value={item.unit}
          onChange={(event) =>
            store.updatePurchaseItem(item.id, { unit: event.target.value })
          }
          disabled={!store.canEditPurchase}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.unitPrice === 0 ? "" : item.unitPrice}
          onChange={(event) =>
            store.updatePurchaseItem(item.id, {
              unitPrice: toNumber(event.target.value),
            })
          }
          className="h-9 w-full px-2 text-sm sm:h-10"
          disabled={!store.canEditPurchase}
        />
      </TableCell>
      <TableCell className="text-right font-semibold">
        {lineTotal(item) > 0 ? formatCurrency(lineTotal(item)) : "-"}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon-lg"
          className="h-9 w-9 sm:h-11 sm:w-11"
          onClick={() => store.removePurchaseItem(item.id)}
          disabled={!store.canEditPurchase}
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
  className,
  hideMobileLabel = true,
}: {
  item: PurchaseItem
  store: Store
  className?: string
  hideMobileLabel?: boolean
}) {
  const selectedIngredient = store.ingredientById.get(item.ingredientId)
  const [query, setQuery] = useState(selectedIngredient?.name ?? "")
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { inputAnchorRef, dropdownPosition, updateDropdownPosition } =
    useAnchoredDropdownPosition({
      isOpen,
      desktopMinWidth: 320,
      maxHeight: 320,
      minHeight: 160,
    })
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
    if (!store.canEditPurchase) {
      return
    }

    const ingredient = store.ingredientById.get(ingredientId)

    if (!ingredient) {
      return
    }

    store.updatePurchaseItem(item.id, { ingredientId })
    setQuery(ingredient.name)
    setIsOpen(false)
  }

  async function handleAddIngredient() {
    if (!store.canEditPurchase || isAdding || store.isIngredientSaving) {
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
    <div className={cn("relative min-w-72 sm:min-w-80", className)}>
      {!hideMobileLabel && (
        <Label className="mb-1 block text-[0.68rem] leading-tight lg:hidden">ชื่อวัตถุดิบ</Label>
      )}
      <div ref={inputAnchorRef} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          name={`purchase-ingredient-search-${item.id}`}
          className="h-11 pl-9 text-base sm:text-sm"
          value={query}
          placeholder="พิมพ์ค้นชื่อวัตถุดิบ"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          disabled={!store.canEditPurchase}
          onFocus={() => {
            if (!store.canEditPurchase) {
              return
            }

            updateDropdownPosition()
            setIsOpen(true)
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120)
          }}
          onChange={(event) => {
            if (!store.canEditPurchase) {
              return
            }

            setQuery(event.target.value)
            updateDropdownPosition()
            setIsOpen(true)
          }}
        />
      </div>

      {isOpen && dropdownPosition && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-50 max-h-80 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
          style={{
            left: dropdownPosition.left,
            top: dropdownPosition.top,
            width: dropdownPosition.width,
            maxHeight: dropdownPosition.maxHeight,
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  )
}

function FieldNumber({
  label,
  value,
  onChange,
  disabled = false,
  blankWhenZero = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  blankWhenZero?: boolean
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={blankWhenZero && value === 0 ? "" : value}
        onChange={(event) => onChange(toNumber(event.target.value))}
        disabled={disabled}
        className="h-11"
      />
    </div>
  )
}

function UsageView({ store }: { store: Store }) {
  const [usageReason, setUsageReason] = useState("")
  const [usageMessage, setUsageMessage] = useState("")
  const usageMessageIsError =
    Boolean(store.usageError) ||
    usageMessage.includes("ไม่") ||
    usageMessage.includes("กรุณา")
  const draftRows = store.usageItems
  const readyRows = draftRows.filter((item) => item.ingredientId && item.quantity > 0)
  const invalidRows = draftRows.filter((item) => {
    if (!item.ingredientId || item.quantity <= 0) {
      return false
    }

    const inventory = store.inventoryRows.find(
      (row) => row.ingredientId === item.ingredientId
    )

    return !inventory || item.quantity > inventory.onHand
  })
  const usageReasonOptions = Array.from(
    new Set(
      [
        ...store.usageReasons,
        ...store.usageMovements.map((movement) => movement.reason),
      ]
        .map((reason) => reason.trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, "th"))
  const canSubmitUsage =
    store.canEditUsage &&
    readyRows.length > 0 &&
    invalidRows.length === 0 &&
    Boolean(usageReason.trim()) &&
    !store.isUsageSaving

  async function handleSubmitUsage() {
    setUsageMessage("")
    const result = await store.submitUsageDraft(usageReason)

    if (!result.ok) {
      setUsageMessage(result.error ?? "ไม่สามารถบันทึกของใช้ไปได้")
      return
    }

    setUsageReason("")
    setUsageMessage("บันทึกของใช้ไปและตัดคลังวัตถุดิบเรียบร้อย")
  }

  return (
    <div className="space-y-5">
      {(store.usageError || usageMessage) && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            usageMessageIsError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          )}
        >
          {store.usageError || usageMessage}
        </div>
      )}

      {!store.canEditUsage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          บัญชีนี้ดูข้อมูลได้ แต่ไม่มีสิทธิ์บันทึกของใช้ไปและตัดคลังวัตถุดิบ
        </div>
      )}

      <section className="rounded-lg border border-border bg-background p-3 sm:p-5">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
              <Minus className="size-4 text-rose-600 sm:size-5" />
              <h2 className="text-base font-semibold sm:text-lg">
                บันทึกของใช้ไป
              </h2>
            </div>
            <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
              เลือกวัตถุดิบและจำนวนที่ใช้ ระบบจะบันทึกประวัติและตัดคลังทันทีเมื่อกดบันทึก
            </p>
          </div>

          <div className="min-w-52">
            <Label className="mb-2 block">วันที่ใช้</Label>
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
                {formatThaiDate(store.usageDate)}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={store.usageDate}
                  onSelect={(date) => {
                    if (date) {
                      store.setUsageDate(date)
                    }
                  }}
                  locale={th}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
          <div className="overflow-x-auto rounded-lg border border-border">
            <FreezableTable className="w-full min-w-[42rem] table-fixed text-xs sm:text-sm">
              <colgroup>
                <col className="w-10" />
                <col className="w-50" />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-14" />
                <col className="w-20" />
                <col className="w-12" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">#</TableHead>
                  <TableHead>วัตถุดิบ</TableHead>
                  <TableHead className="text-right">คงเหลือ</TableHead>
                  <TableHead>จำนวนที่ใช้</TableHead>
                  <TableHead>หน่วย</TableHead>
                  <TableHead className="text-right">หลังบันทึก</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {draftRows.map((item, index) => (
                  <UsageDraftTableRow
                    key={item.id}
                    index={index}
                    item={item}
                    store={store}
                  />
                ))}
                {draftRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-16 text-center text-sm text-muted-foreground"
                    >
                      กดเพิ่มแถวเพื่อเริ่มบันทึกของใช้ไป
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </FreezableTable>
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-950 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-semibold leading-tight">
                สรุปของใช้ไป
              </span>
              <Badge variant="secondary" className="h-6 shrink-0 text-xs sm:h-7 sm:text-sm">
                {readyRows.length} รายการ
              </Badge>
            </div>
            <div className="mt-3">
              <Label className="mb-1.5 block text-sm">เหตุผลรวมของรอบนี้</Label>
              <UsageReasonCombobox
                value={usageReason}
                options={usageReasonOptions}
                onChange={setUsageReason}
                disabled={!store.canEditUsage}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-10 bg-background"
                onClick={store.addUsageItem}
                disabled={!store.canEditUsage}
              >
                <Plus className="size-4" />
                เพิ่มแถว
              </Button>
              <Button
                className="h-10"
                onClick={handleSubmitUsage}
                disabled={!canSubmitUsage}
              >
                {store.isUsageSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                บันทึกใช้ไป
              </Button>
            </div>
            <p className="mt-3 hidden text-sm text-sky-700 sm:block">
              ระบบจะสร้างประวัติบันทึกของใช้ไปและตัดคงเหลือในคลังวัตถุดิบทันที
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">ประวัติของใช้ไปวันนี้</h2>
            <p className="text-sm text-muted-foreground">
              เฉพาะรายการบันทึกของใช้ไปของวันที่เลือก
            </p>
          </div>
          <Badge variant="secondary" className="h-7 w-fit">
            {store.usageMovements.length} รายการ
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <FreezableTable className="min-w-[52rem] text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">เวลา</TableHead>
                <TableHead>วัตถุดิบ</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
                <TableHead>ผู้บันทึก</TableHead>
                <TableHead>เหตุผล</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.usageMovements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{formatThaiTime(movement.occurredAt)}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {movement.ingredient?.name ?? "วัตถุดิบ"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      หลังตัดเหลือ {formatNumber(movement.afterQuantity)}{" "}
                      {movement.unit}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatNumber(movement.quantity)} {movement.unit}
                  </TableCell>
                  <TableCell>{movement.createdByName}</TableCell>
                  <TableCell className="max-w-80 truncate">
                    {movement.reason || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {store.usageMovements.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-16 text-center text-sm text-muted-foreground"
                  >
                    {store.isUsageMovementsLoading
                      ? "กำลังโหลดประวัติของใช้ไป"
                      : "ยังไม่มีรายการของใช้ไปในวันที่เลือก"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </FreezableTable>
        </div>
      </section>
    </div>
  )
}

function UsageReasonCombobox({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [customReasons, setCustomReasons] = useState<string[]>(
    loadCustomUsageReasons
  )
  const { inputAnchorRef, dropdownPosition, updateDropdownPosition } =
    useAnchoredDropdownPosition({
      isOpen,
      desktopMinWidth: 320,
      maxHeight: 280,
      minHeight: 120,
    })
  const searchTerm = normalizeSearch(value)
  const allReasons = Array.from(
    new Set(
      [...options, ...customReasons]
        .map((reason) => reason.trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, "th"))
  const filteredReasons = allReasons
    .filter((reason) => !searchTerm || normalizeSearch(reason).includes(searchTerm))
    .sort((left, right) => {
      const leftName = normalizeSearch(left)
      const rightName = normalizeSearch(right)
      const leftStarts = leftName.startsWith(searchTerm) ? 0 : 1
      const rightStarts = rightName.startsWith(searchTerm) ? 0 : 1

      if (leftStarts !== rightStarts) {
        return leftStarts - rightStarts
      }

      return left.localeCompare(right, "th")
    })
    .slice(0, 8)
  const cleanValue = value.trim()
  const hasExactReason = allReasons.some(
    (reason) => normalizeSearch(reason) === normalizeSearch(cleanValue)
  )
  const canAddReason = Boolean(cleanValue) && !hasExactReason

  function persistCustomReasons(nextReasons: string[]) {
    setCustomReasons(nextReasons)

    if (typeof window === "undefined") {
      return
    }

    try {
      window.localStorage.setItem(
        customUsageReasonsKey,
        JSON.stringify(nextReasons)
      )
    } catch {
      // Remembering custom reasons is a convenience, not required to submit.
    }
  }

  function selectReason(reason: string) {
    onChange(reason)
    setIsOpen(false)
  }

  function addCurrentReason() {
    if (!canAddReason) {
      return
    }

    const nextReason = cleanValue
    const nextReasons = Array.from(new Set([...customReasons, nextReason]))

    persistCustomReasons(nextReasons)
    selectReason(nextReason)
  }

  return (
    <div className="relative">
      <div ref={inputAnchorRef} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          className="h-10 bg-background pl-9 pr-3"
          value={value}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          onFocus={() => {
            updateDropdownPosition()
            setIsOpen(true)
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120)
          }}
          onChange={(event) => {
            onChange(event.target.value)
            updateDropdownPosition()
            setIsOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canAddReason) {
              event.preventDefault()
              addCurrentReason()
            }
          }}
          placeholder="ค้นหาหรือเพิ่มเหตุผล"
          disabled={disabled}
        />
      </div>

      {isOpen && dropdownPosition && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-50 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
          style={{
            left: dropdownPosition.left,
            top: dropdownPosition.top,
            width: dropdownPosition.width,
            maxHeight: dropdownPosition.maxHeight,
          }}
        >
          {filteredReasons.map((reason) => (
            <button
              key={reason}
              type="button"
              className={cn(
                "flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                normalizeSearch(reason) === normalizeSearch(value) && "bg-muted"
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectReason(reason)}
            >
              <span className="min-w-0 truncate font-medium">{reason}</span>
              {customReasons.includes(reason) && (
                <Badge variant="secondary" className="h-6 shrink-0 text-xs">
                  เพิ่มเอง
                </Badge>
              )}
            </button>
          ))}

          {canAddReason && (
            <button
              type="button"
              className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-md border border-dashed border-sky-300 bg-sky-50 px-3 py-2 text-left text-sm text-sky-900 hover:bg-sky-100"
              onMouseDown={(event) => event.preventDefault()}
              onClick={addCurrentReason}
            >
              <Plus className="size-4 shrink-0" />
              <span className="min-w-0 truncate">
                เพิ่มเหตุผล “{cleanValue}”
              </span>
            </button>
          )}

          {filteredReasons.length === 0 && !canAddReason && (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              พิมพ์เพื่อค้นหาหรือเพิ่มเหตุผลใหม่
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

function UsageDraftTableRow({
  index,
  item,
  store,
}: {
  index: number
  item: UsageDraftItem
  store: Store
}) {
  const inventoryRow = store.inventoryRows.find(
    (row) => row.ingredientId === item.ingredientId
  )
  const afterQuantity = inventoryRow
    ? Math.max(inventoryRow.onHand - item.quantity, 0)
    : 0
  const isOverStock = Boolean(
    inventoryRow && item.quantity > inventoryRow.onHand
  )

  return (
    <TableRow className={cn(isOverStock && "bg-red-50/60")}>
      <TableCell className="text-center align-top">
        {index + 1}
      </TableCell>
      <TableCell>
        <UsageIngredientSelect
          value={item.ingredientId}
          store={store}
          onChange={(ingredientId) =>
            store.updateUsageItem(item.id, { ingredientId })
          }
          disabled={!store.canEditUsage}
          className="w-full min-w-0"
        />
      </TableCell>
      <TableCell className="text-right">
        {inventoryRow
          ? `${formatNumber(inventoryRow.onHand)} ${inventoryRow.ingredient.unit}`
          : "-"}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="0.01"
          className="h-9 w-full px-2 text-sm sm:h-10"
          value={item.quantity === 0 ? "" : item.quantity}
          onChange={(event) =>
            store.updateUsageItem(item.id, {
              quantity: toNumber(event.target.value),
            })
          }
          disabled={!store.canEditUsage}
        />
      </TableCell>
      <TableCell>
        {inventoryRow?.ingredient.unit ?? "-"}
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-semibold",
          isOverStock && "text-red-700"
        )}
      >
        {inventoryRow
          ? `${formatNumber(afterQuantity)} ${inventoryRow.ingredient.unit}`
          : "-"}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => store.removeUsageItem(item.id)}
          disabled={!store.canEditUsage}
        >
          <Trash2 className="size-4" />
          <span className="sr-only">ลบรายการของใช้ไป</span>
        </Button>
      </TableCell>
    </TableRow>
  )
}

function UsageIngredientSelect({
  value,
  store,
  onChange,
  disabled = false,
  className,
}: {
  value: string
  store: Store
  onChange: (ingredientId: string) => void
  disabled?: boolean
  className?: string
}) {
  const selectedRow = store.inventoryRows.find((row) => row.ingredientId === value)
  const [query, setQuery] = useState(selectedRow?.ingredient.name ?? "")
  const [isOpen, setIsOpen] = useState(false)
  const { inputAnchorRef, dropdownPosition, updateDropdownPosition } =
    useAnchoredDropdownPosition({
      isOpen,
      desktopMinWidth: 320,
      maxHeight: 320,
      minHeight: 160,
    })
  const searchTerm = normalizeSearch(query)
  const filteredRows = store.inventoryRows
    .filter((row) => {
      if (!searchTerm) {
        return true
      }

      return [
        row.ingredient.name,
        row.ingredient.category,
        row.ingredient.supplier,
        row.ingredient.unit,
      ]
        .map(normalizeSearch)
        .some((item) => item.includes(searchTerm))
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
    .slice(0, 12)

  function handleSelectIngredient(ingredientId: string) {
    const row = store.inventoryRows.find((item) => item.ingredientId === ingredientId)

    if (!row) {
      return
    }

    onChange(row.ingredientId)
    setQuery(row.ingredient.name)
    setIsOpen(false)
  }

  return (
    <div className={cn("relative min-w-72", className)}>
      <div ref={inputAnchorRef} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          name="usage-ingredient-search"
          className="h-9 pl-9 text-base sm:h-10 sm:text-sm"
          value={query}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          onFocus={() => {
            updateDropdownPosition()
            setIsOpen(true)
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            updateDropdownPosition()
            setIsOpen(true)
          }}
          placeholder="พิมพ์ค้นชื่อวัตถุดิบ"
          disabled={disabled}
        />
      </div>

      {isOpen && dropdownPosition && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-50 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
          style={{
            left: dropdownPosition.left,
            top: dropdownPosition.top,
            width: dropdownPosition.width,
            maxHeight: dropdownPosition.maxHeight,
          }}
        >
          {filteredRows.map((row) => (
            <button
              key={row.ingredientId}
              type="button"
              className={cn(
                "flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                row.ingredientId === value && "bg-muted"
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
                {formatNumber(row.onHand)} {row.ingredient.unit}
              </Badge>
            </button>
          ))}
          {filteredRows.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              ไม่พบวัตถุดิบที่ตรงกับคำค้น
            </div>
          )}
        </div>,
        document.body
      )}
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
          <FreezableTable>
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
          </FreezableTable>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-lg border border-border bg-background xl:block">
        <FreezableTable>
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
        </FreezableTable>
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

function createRecipeDraft(): RecipeFormInput {
  return {
    name: "",
    menuCategory: "",
    yield: 0,
    pricePerServing: 0,
    ingredients: [],
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
        ? "ถอนปักหมุดเมนูออกจากหน้าทดลองสูตรอาหารแล้ว"
        : (result.error ?? "ไม่สามารถถอนปักหมุดสูตรอาหารได้")
    )
  }

  return (
    <div className="space-y-5">
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
        {!store.canEditRecipes && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            บัญชีนี้ดูสูตรอาหารได้ แต่ไม่มีสิทธิ์เพิ่ม ลบ แก้ไข ปักหมุด หรือปรุงรายการอาหาร
          </div>
        )}
      </section>

      <section className="grid gap-2 sm:gap-3 lg:grid-cols-2">
        {store.pinnedRecipeImpacts.map((recipe: RecipeImpact) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            store={store}
            onUnpin={handleUnpinRecipe}
            isSaving={store.isRecipeSaving}
            canEdit={store.canEditRecipes}
          />
        ))}
        {store.canEditRecipes && <RecipeAddCard />}
      </section>
    </div>
  )
}

function RecipeAddCard() {
  return (
    <Link
      href="/portal/recipes/new"
      className="flex min-h-0 items-center justify-start gap-3 rounded-lg border border-dashed border-sky-300 bg-sky-50/40 px-3 py-3 text-left text-sky-700 transition-colors hover:border-sky-500 hover:bg-sky-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-56 sm:flex-col sm:justify-center sm:px-4 sm:py-6 sm:text-center"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-background sm:size-20 sm:rounded-full">
        <Plus className="size-5 sm:size-10" />
      </span>
      <span className="min-w-0 space-y-0.5 sm:space-y-2">
        <span className="block font-semibold">เพิ่มสูตรอาหารใหม่</span>
        <span className="block max-w-56 text-sm leading-snug text-sky-700/80">
        สร้างสูตรพร้อมวัตถุดิบและปักหมุดใช้งาน
        </span>
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
    <section className="rounded-lg border border-border bg-background p-3 sm:p-5">
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
            <Pin className="size-4 text-rose-600 sm:size-5" />
            <h2 className="text-base font-semibold sm:text-lg">
              ปักหมุดสูตรอาหารที่เคยสร้างไว้
            </h2>
          </div>
          <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
            เลือกสูตรจากคลังสูตรเพื่อเพิ่มเป็นเมนูที่ใช้งานในหน้าทดลองสูตรอาหาร
          </p>
        </div>
        <Badge variant="outline" className="h-6 w-fit text-xs sm:h-7">
          {recipes.length} สูตรในคลัง
        </Badge>
      </div>

      <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
        {recipes.map((recipe) => {
          const pinned = recipe.isPinned

          return (
            <div key={recipe.id} className="rounded-lg border border-border p-3 sm:p-4">
              <div className="mb-3 flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground sm:text-sm">
                    {recipe.menuCategory}
                  </p>
                  <h3 className="truncate text-sm font-semibold sm:text-base">{recipe.name}</h3>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 shrink-0 text-xs",
                    pinned
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                  )}
                >
                  {pinned ? "ปักหมุดแล้ว" : "ยังไม่ปักหมุด"}
                </Badge>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:mb-4 sm:grid-cols-3">
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

              <div className="mb-3 flex max-h-28 flex-wrap gap-1.5 overflow-auto rounded-lg border border-border bg-muted/30 p-2 sm:mb-4 sm:max-h-none sm:gap-2">
                {recipe.ingredients.slice(0, 4).map((item) => {
                  const ingredient = store.ingredientById.get(item.ingredientId)

                  return (
                    <Badge
                      key={item.ingredientId}
                      variant="secondary"
                      className="h-6 max-w-full text-xs sm:h-7"
                    >
                      {ingredient?.name} {formatNumber(item.quantity)}
                      {ingredient?.unit}
                    </Badge>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Button
                  className="col-span-2 h-11 w-full sm:col-span-1"
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
  const editingRecipe =
    mode === "edit"
      ? store.recipeImpacts.find((recipe: { id: string | undefined }) => recipe.id === recipeId)
      : undefined
  const [recipeDraft, setRecipeDraft] = useState<RecipeFormInput>(() =>
    editingRecipe
      ? draftFromRecipe(editingRecipe)
      : createRecipeDraft()
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
    setRecipeDraft((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          ingredientId: "",
          quantity: 0,
        },
      ],
    }))
  }

  function removeRecipeIngredientLine(index: number) {
    setRecipeDraft((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index),
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
              กลับหน้าทดลองสูตรอาหาร
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!store.canEditRecipes) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-lg">
          <CardHeader>
            <CardAction>
              <span className="flex size-10 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
                <LockKeyhole className="size-5" />
              </span>
            </CardAction>
            <CardTitle>ไม่มีสิทธิ์แก้ไขสูตรอาหาร</CardTitle>
            <CardDescription>
              บัญชีนี้มีสิทธิ์ดูสูตรอาหาร แต่ไม่มีสิทธิ์เพิ่ม ลบ แก้ไข ปักหมุด หรือปรุงรายการอาหาร
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
              กลับหน้าทดลองสูตรอาหาร
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl space-y-4 pb-20 sm:pb-0">
      <Link
        href="/portal/recipes"
        className={buttonVariants({
          variant: "ghost",
          className: "h-11 w-fit px-3",
        })}
      >
        <ArrowLeft className="size-4" />
        กลับหน้าทดลองสูตรอาหาร
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

      <Card className="overflow-visible rounded-lg">
        <CardHeader className="px-3 sm:px-(--card-spacing)">
          <CardTitle className="text-base sm:text-lg">
            {mode === "edit"
              ? "แก้ไขเมนูสูตรอาหาร"
              : "สร้างสูตรใหม่และปักหมุด"}
          </CardTitle>
          <CardDescription className="text-xs leading-snug sm:text-sm">
            จัดการชื่อเมนู ราคา จำนวนเสิร์ฟ และวัตถุดิบในสูตร
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-(--card-spacing)">
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
                blankWhenZero
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
                blankWhenZero
                onChange={(value) =>
                  setRecipeDraft((current) => ({
                    ...current,
                    pricePerServing: value,
                  }))
                }
              />
            </div>

            <div className="space-y-2.5 sm:space-y-3">
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

              {recipeDraft.ingredients.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                  กดเพิ่มวัตถุดิบเพื่อเริ่มกรอกรายการในสูตร
                </div>
              )}

              {recipeDraft.ingredients.map((item, index) => {
                const ingredient = store.ingredientById.get(item.ingredientId)

                return (
                  <div
                    key={`${item.ingredientId}-${index}`}
                    className="grid gap-2.5 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-[1fr_8rem_2.75rem] md:items-end md:bg-background"
                  >
                    <div className="flex items-center justify-between gap-3 md:hidden">
                      <Badge variant="secondary" className="h-6 px-2.5 text-xs">
                        รายการที่ {index + 1}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        className="size-10 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => removeRecipeIngredientLine(index)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">ลบวัตถุดิบ</span>
                      </Button>
                    </div>
                    <div>
                      <Label className="mb-1.5 block sm:mb-2">วัตถุดิบ</Label>
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
                      <Label className="mb-1.5 block sm:mb-2">
                        ปริมาณ
                        {ingredient ? ` (${ingredient.unit})` : ""}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-11"
                        value={item.quantity === 0 ? "" : item.quantity}
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
                className="h-11 w-full text-base sm:h-12 sm:text-sm"
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
                  className: "h-11 w-full text-base sm:h-12 sm:text-sm",
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
  isSaving,
  canEdit,
}: {
  recipe: RecipeImpact
  store: Store
  onUnpin: (recipeId: string) => void
  isSaving: boolean
  canEdit: boolean
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
      <CardHeader className="gap-2 px-3 sm:px-(--card-spacing) max-sm:grid-cols-1">
        <CardAction className="max-sm:col-start-1 max-sm:row-start-1 max-sm:mb-1 max-sm:w-full max-sm:justify-self-stretch">
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
              disabled={!canEdit || isSaving || recipe.isCooked}
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
        <CardDescription className="truncate text-xs leading-snug sm:text-sm">
          {recipe.menuCategory}
        </CardDescription>
        <CardTitle className="text-base leading-snug sm:text-lg">
          {recipe.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-(--card-spacing)">
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

        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2.5">
          <p className="text-sm font-semibold">วัตถุดิบที่ใช้</p>
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-auto sm:max-h-none">
            {recipe.ingredients.map((item) => {
              const ingredient = store.ingredientById.get(item.ingredientId)

              return (
                <Badge key={item.ingredientId} variant="secondary" className="h-6 max-w-full text-xs">
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
          type="search"
          name={`recipe-ingredient-search-${value || "new"}`}
          className="h-11 pl-9"
          value={isOpen ? query : (selectedIngredient?.name ?? query)}
          placeholder="ค้นหาวัตถุดิบ"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
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
    <div className="flex flex-wrap gap-1.5 lg:max-h-24 lg:overflow-y-auto lg:pr-1">
      {branches.map((branch) => (
        <Badge key={branch.id} variant="secondary" className="h-7">
          {branch.name}
        </Badge>
      ))}
    </div>
  )
}

function BranchAccessCell({
  member,
  store,
}: {
  member: Store["members"][number]
  store: Store
}) {
  const forceAll = member.role === "owner"
  const selectionMode = member.role === "manager" ? "multiple" : "single"
  const memberBranchIds =
    member.role === "manager" ? member.branchIds : member.branchIds.slice(0, 1)
  const selectedBranchIds = forceAll
    ? store.branches.map((branch) => branch.id)
    : memberBranchIds
  const selectedBranches = selectedBranchIds
    .map((branchId) =>
      store.branches.find((branch) => branch.id === branchId)
    )
    .filter((branch): branch is Store["branches"][number] => Boolean(branch))
  const editable = store.canManageMembers && !forceAll
  const branchOptions = store.accessibleBranches
  const previewBranches = selectedBranches.slice(0, 2)
  const hiddenCount = Math.max(0, selectedBranches.length - previewBranches.length)
  const summary =
    selectedBranches.length > 0
      ? `${selectedBranches.length} สาขา`
      : "ยังไม่กำหนด"

  function updateBranches(nextBranchIds: string[]) {
    store.updateMemberBranches(member.id, nextBranchIds)
  }

  function toggleBranch(branchId: string) {
    if (!editable) {
      return
    }

    const selectedIds = new Set(selectedBranchIds)

    if (selectedIds.has(branchId)) {
      if (selectionMode === "single" || selectedBranchIds.length === 1) {
        return
      }

      updateBranches(selectedBranchIds.filter((item) => item !== branchId))
      return
    }

    if (selectionMode === "single") {
      updateBranches([branchId])
      return
    }

    updateBranches([...selectedBranchIds, branchId])
  }

  const summaryContent = (
    <div className="min-w-0">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        {previewBranches.length > 0 ? (
          previewBranches.map((branch) => (
            <Badge key={branch.id} variant="secondary" className="h-6 max-w-32 truncate px-2 text-xs">
              {branch.name}
            </Badge>
          ))
        ) : (
          <Badge variant="outline" className="h-6 border-amber-200 px-2 text-xs text-amber-700">
            ยังไม่กำหนด
          </Badge>
        )}
        {hiddenCount > 0 && (
          <Badge variant="outline" className="h-6 px-2 text-xs">
            +{hiddenCount}
          </Badge>
        )}
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {forceAll
          ? "เห็นทุกสาขาอัตโนมัติ"
          : selectedBranches[0]
            ? `${selectedBranches[0].code} · ${summary}`
            : summary}
      </p>
    </div>
  )

  if (!editable) {
    return <div className="max-w-72">{summaryContent}</div>
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-11 w-full max-w-72 justify-between gap-3 px-3 py-2 text-left"
          />
        }
      >
        <div className="flex min-w-0 items-center gap-2">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          {summaryContent}
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div>
          <p className="font-semibold">สาขาที่เข้าถึง</p>
          <p className="text-xs text-muted-foreground">
            {selectionMode === "multiple"
              ? "เลือกได้หลายสาขาสำหรับผู้ดูแลระบบ"
              : "เลือกได้ 1 สาขาสำหรับพนักงาน"}
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            {branchOptions.map((branch) => {
              const selected = selectedBranchIds.includes(branch.id)

              return (
                <button
                  key={branch.id}
                  type="button"
                  className={cn(
                    "flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm transition hover:bg-muted",
                    selected && "border-sky-200 bg-sky-50 text-sky-950"
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
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
    <div className="grid gap-2 lg:max-h-32 lg:overflow-y-auto lg:pr-1 lg:gap-1.5">
      {branchOptions.map((branch) => {
        const selected = selectedIds.has(branch.id)

        return (
          <button
            key={branch.id}
            type="button"
            className={cn(
              "flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm transition lg:min-h-9 lg:gap-2 lg:px-2.5 lg:py-1.5 lg:text-xs",
              selected && "border-sky-200 bg-sky-50 text-sky-950",
              !disabled && !forceAll && "hover:bg-muted",
              (disabled || forceAll) && "cursor-default opacity-90"
            )}
            onClick={() => toggleBranch(branch.id)}
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{branch.name}</span>
              <span className="block truncate text-xs text-muted-foreground lg:text-[0.68rem]">
                {branch.code} · {branch.location}
              </span>
            </span>
            {selected && <CircleCheck className="size-4 shrink-0 text-sky-700 lg:size-3.5" />}
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

function BudgetsView({ store }: { store: Store }) {
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({})
  const [unlimitedDrafts, setUnlimitedDrafts] = useState<Record<string, boolean>>(
    {}
  )
  const [messages, setMessages] = useState<Record<string, string>>({})
  const branches = store.accessibleBranches
  const limitedBranches = branches.filter(
    (branch) => branch.dailyPurchaseBudget !== null
  )
  const totalDailyBudget = limitedBranches.reduce(
    (total, branch) => total + (branch.dailyPurchaseBudget ?? 0),
    0
  )
  const overBudgetCount = branches.filter((branch) => {
    const budget = branch.dailyPurchaseBudget

    return budget !== null && (store.dailyBudgetUsageByBranch[branch.id] ?? 0) > budget
  }).length

  async function handleSaveBudget(branchId: string) {
    const branch = branches.find((item) => item.id === branchId)

    if (!branch) {
      return
    }

    const isUnlimited =
      unlimitedDrafts[branchId] ?? (branch.dailyPurchaseBudget === null)
    const budgetValue =
      budgetDrafts[branchId] ??
      (branch.dailyPurchaseBudget === null ? "" : String(branch.dailyPurchaseBudget))
    const result = await store.updateBranchBudget(
      branchId,
      isUnlimited ? null : toNumber(budgetValue)
    )

    setMessages((current) => ({
      ...current,
      [branchId]: result.ok
        ? "บันทึกงบรายวันแล้ว"
        : (result.error ?? "ไม่สามารถบันทึกงบรายวันได้"),
    }))
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="สาขาที่จัดการได้"
          value={`${branches.length} สาขา`}
          helper="ตามสิทธิ์ของบัญชีนี้"
          icon={Building2}
          tone="border-sky-200 bg-sky-50 text-sky-800"
        />
        <MetricCard
          label="ตั้งงบแล้ว"
          value={`${limitedBranches.length} สาขา`}
          helper="สาขาที่มีเพดานรายวัน"
          icon={CircleCheck}
          tone="border-emerald-200 bg-emerald-50 text-emerald-800"
        />
        <MetricCard
          label="งบรวมรายวัน"
          value={formatCurrency(totalDailyBudget)}
          helper="รวมเฉพาะสาขาที่จำกัดงบ"
          icon={CircleDollarSign}
          tone="border-lime-200 bg-lime-50 text-lime-800"
        />
        <MetricCard
          label="เกินงบวันนี้"
          value={`${overBudgetCount} สาขา`}
          helper="คำนวณจากใบซื้อที่บันทึกวันนี้"
          icon={AlertTriangle}
          tone="border-red-200 bg-red-50 text-red-800"
        />
      </section>

      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="size-5 text-lime-700" />
            <h2 className="text-lg font-semibold">จัดการงบรายวันของสาขา</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            กำหนด budget ต่อวันเพื่อควบคุม cost ของใบสั่งซื้อวัตถุดิบแต่ละสาขา
          </p>
          {!store.canManageBranchBudget && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              บัญชีนี้ดูงบรายวันได้ แต่ไม่มีสิทธิ์แก้ไขงบของสาขา
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <FreezableTable className="min-w-[58rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-72">สาขา</TableHead>
                <TableHead className="w-36 text-right">ใช้วันนี้</TableHead>
                <TableHead className="w-36 text-right">งบปัจจุบัน</TableHead>
                <TableHead className="w-36 text-right">คงเหลือวันนี้</TableHead>
                <TableHead className="w-56">ตั้งค่า</TableHead>
                <TableHead className="w-40 text-right">บันทึก</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => {
                const isUnlimited =
                  unlimitedDrafts[branch.id] ?? (branch.dailyPurchaseBudget === null)
                const budgetValue =
                  budgetDrafts[branch.id] ??
                  (branch.dailyPurchaseBudget === null
                    ? ""
                    : String(branch.dailyPurchaseBudget))
                const usedToday = store.dailyBudgetUsageByBranch[branch.id] ?? 0
                const currentBudget = branch.dailyPurchaseBudget
                const remaining =
                  currentBudget === null ? null : Math.max(currentBudget - usedToday, 0)
                const isOverBudget =
                  currentBudget !== null && usedToday > currentBudget
                const message = messages[branch.id]

                return (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <p className="font-semibold">{branch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {branch.code} · {branch.location}
                      </p>
                      {message && (
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            message.includes("แล้ว")
                              ? "text-emerald-700"
                              : "text-red-700"
                          )}
                        >
                          {message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(usedToday)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {currentBudget === null
                        ? "ไม่จำกัด"
                        : formatCurrency(currentBudget)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        isOverBudget && "text-red-700"
                      )}
                    >
                      {remaining === null ? "ไม่จำกัด" : formatCurrency(remaining)}
                    </TableCell>
                    <TableCell>
                      <div className="grid grid-cols-[auto_1fr] gap-2">
                        <button
                          type="button"
                          className={cn(
                            "h-10 rounded-lg border px-3 text-sm font-medium",
                            isUnlimited
                              ? "border-sky-300 bg-sky-50 text-sky-800"
                              : "border-border text-muted-foreground"
                          )}
                          disabled={!store.canManageBranchBudget}
                          onClick={() =>
                            setUnlimitedDrafts((current) => ({
                              ...current,
                              [branch.id]: !isUnlimited,
                            }))
                          }
                        >
                          {isUnlimited ? "ไม่จำกัด" : "จำกัด"}
                        </button>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-10"
                          disabled={isUnlimited || !store.canManageBranchBudget}
                          value={budgetValue}
                          onChange={(event) =>
                            setBudgetDrafts((current) => ({
                              ...current,
                              [branch.id]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        className="h-10"
                        disabled={
                          !store.canManageBranchBudget ||
                          store.isBranchBudgetSaving
                        }
                        onClick={() => handleSaveBudget(branch.id)}
                      >
                        {store.isBranchBudgetSaving ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        บันทึก
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </FreezableTable>
        </div>
      </section>
    </div>
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
    <div className="space-y-4 pb-20 sm:space-y-5 sm:pb-0">
      <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
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
          helper="Owner และผู้ดูแลระบบ"
          icon={ShieldCheck}
          tone="border-sky-200 bg-sky-50 text-sky-800"
        />
      </section>

      <section className="space-y-3">
        <div className="rounded-lg border border-border bg-background p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold sm:text-lg">การจัดการสมาชิก</h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
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

        <div className="grid gap-2 sm:gap-3 lg:hidden">
          {store.members.map((member) => (
            <MemberMobileCard key={member.id} member={member} store={store} />
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-border bg-background lg:block">
          <FreezableTable className="min-w-[64rem] text-sm">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[24rem]">สมาชิก</TableHead>
                <TableHead className="w-40">สิทธิ์</TableHead>
                <TableHead className="w-40">สถานะ</TableHead>
                <TableHead className="min-w-72">สาขา</TableHead>
                <TableHead className="w-36">ใช้งานล่าสุด</TableHead>
                <TableHead className="w-32">วันที่เพิ่ม</TableHead>
                <TableHead className="w-32 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.members.map((member) => (
                <TableRow key={member.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <UserRound className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{member.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{member.username}
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
                  <TableCell className="min-w-72">
                    <BranchAccessCell member={member} store={store} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.lastActive}</TableCell>
                  <TableCell className="text-muted-foreground">{member.joinedAt}</TableCell>
                  <TableCell className="text-right">
                    <MemberEditDialog member={member} store={store} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </FreezableTable>
        </div>
      </section>
    </div>
  )
}

function MemberFormView() {
  const store = useEasyReceipt()
  const router = useRouter()
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
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
      username,
      password,
      role,
      branchIds: nextBranchIds,
    })

    if (!ok) {
      setMessage(
        store.memberError ||
          "กรุณากรอกชื่อ ชื่อผู้ใช้ รหัสผ่านอย่างน้อย 6 ตัวอักษร เลือกสาขา และใช้ชื่อผู้ใช้ที่ยังไม่ซ้ำ"
      )
      return
    }

    setName("")
    setUsername("")
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
                <Label className="mb-2 block">ชื่อผู้ใช้</Label>
                <Input
                  className="h-11"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="เช่น staff9"
                  autoComplete="username"
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
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <UserRound className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="min-w-0 truncate text-base font-semibold leading-tight">
                {member.name}
              </p>
              <Badge
                variant="outline"
                className={cn("h-6 shrink-0", memberStatusClassName(member.status))}
              >
                {memberStatusLabel(member.status)}
              </Badge>
            </div>
            <p className="mt-1 break-all text-sm leading-snug text-muted-foreground">
              @{member.username}
            </p>
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block text-xs text-muted-foreground">สิทธิ์</Label>
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
            <Label className="mb-2 block text-xs text-muted-foreground">สถานะ</Label>
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
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <Label className="mb-2 block text-xs text-muted-foreground">สาขาที่เข้าถึง</Label>
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
          <SummaryPill compact label="ใช้งานล่าสุด" value={member.lastActive} />
          <SummaryPill compact label="วันที่เพิ่ม" value={member.joinedAt} />
        </div>
        <MemberEditDialog
          member={member}
          store={store}
          className="h-11 w-full"
        />
      </CardContent>
    </Card>
  )
}

function MemberEditDialog({
  member,
  store,
  compact = false,
  className,
}: {
  member: Store["members"][number]
  store: Store
  compact?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(member.name)
  const [username, setUsername] = useState(member.username)
  const [password, setPassword] = useState("")
  const [resetPassword, setResetPassword] = useState(false)
  const [permissions, setPermissions] = useState<MemberMenuPermissions>(() =>
    normalizeMemberPermissions(member.role, member.permissions)
  )
  const [message, setMessage] = useState("")

  function openEditor() {
    setName(member.name)
    setUsername(member.username)
    setPassword("")
    setResetPassword(false)
    setPermissions(normalizeMemberPermissions(member.role, member.permissions))
    setMessage("")
    setOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!store.canManageMembers) {
      setMessage("บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูลสมาชิก")
      return
    }

    const nextPassword = resetPassword ? password.trim() : undefined

    if (resetPassword && (!nextPassword || nextPassword.length < 6)) {
      setMessage("กรุณากรอกรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร")
      return
    }

    const ok = await store.updateMemberProfile(member.id, {
      name,
      username,
      password: nextPassword,
      ...(store.canManageMenuPermissions ? { permissions } : {}),
    })

    if (!ok) {
      setMessage(
        store.memberError ||
          "กรุณาตรวจสอบชื่อสมาชิก ชื่อผู้ใช้ หรือใช้ชื่อผู้ใช้ที่ยังไม่ซ้ำ"
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
          compact ? "w-9 px-0" : "px-3",
          className
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
            ปรับชื่อ ชื่อผู้ใช้ หรือกรอกรหัสผ่านใหม่เพื่อ reset รหัสผ่าน
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
            <Label className="mb-2 block">ชื่อผู้ใช้</Label>
            <Input
              className="h-11"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
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

          {store.canManageMenuPermissions && (
            <MemberMenuPermissionEditor
              permissions={permissions}
              onChange={setPermissions}
            />
          )}

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

function MemberMenuPermissionEditor({
  permissions,
  onChange,
}: {
  permissions: MemberMenuPermissions
  onChange: (permissions: MemberMenuPermissions) => void
}) {
  function updatePermission(
    key: MenuPermissionKey,
    patch: Partial<{ view: boolean; edit: boolean }>
  ) {
    const currentPermission = permissions[key] ?? { view: false, edit: false }
    const nextPermission = {
      ...currentPermission,
      ...patch,
    }

    if (!nextPermission.view) {
      nextPermission.edit = false
    }

    if (nextPermission.edit) {
      nextPermission.view = true
    }

    onChange({
      ...permissions,
      [key]: nextPermission,
    })
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3">
        <Label className="block">สิทธิ์รายเมนู</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          กำหนดการมองเห็นและการเพิ่ม ลบ แก้ไข ในแต่ละเมนู
        </p>
      </div>
      <div className="grid gap-2">
        {menuPermissionKeys.map((key) => {
          const navItem = navItems.find((item) => item.id === key)
          const permission = permissions[key] ?? { view: false, edit: false }
          const Icon = navItem?.icon ?? ShieldCheck

          return (
            <div
              key={key}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {navItem?.label ?? key}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {navItem?.description ?? "กำหนดสิทธิ์ใช้งานเมนูนี้"}
                  </div>
                </div>
                <Icon className="size-4 shrink-0 text-sky-700" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <PermissionToggle
                  label="มองเห็น"
                  checked={permission.view}
                  onChange={(checked) => updatePermission(key, { view: checked })}
                />
                <PermissionToggle
                  label="เพิ่ม ลบ แก้ไข"
                  checked={permission.edit}
                  onChange={(checked) => updatePermission(key, { edit: checked })}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PermissionToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "flex h-10 items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm",
        checked
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : "border-border bg-background text-muted-foreground"
      )}
      onClick={() => onChange(!checked)}
    >
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 rounded-full border transition",
          checked ? "border-sky-600 bg-sky-600" : "border-border bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-background shadow-sm transition",
            checked ? "left-4" : "left-0.5"
          )}
        />
      </span>
    </button>
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
      <SelectTrigger className="h-11 w-full lg:h-9">
        <SelectValue>{(nextValue) => memberRoleLabel(String(nextValue) as MemberRole)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {(["owner", "manager", "staff"] as MemberRole[]).map(
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
      <SelectTrigger className="h-11 w-full lg:h-9">
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
    <div className="space-y-4 pb-20 sm:space-y-5 sm:pb-0">
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

      <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
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

      <section className="rounded-lg border border-border bg-background p-3 sm:p-5">
        <Tabs defaultValue="purchase" className="gap-3 sm:gap-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold sm:text-lg">รายงาน / การใช้งาน</h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {store.reportBranchSummary.helper}
              </p>
            </div>
            <TabsList className="h-10 w-full sm:h-11 sm:w-fit" variant="default">
              <TabsTrigger value="purchase" className="h-8 px-3 sm:h-9">
                ยอดซื้อ
              </TabsTrigger>
              {isCashFlowReportTabEnabled && (
                <TabsTrigger value="cashflow" className="h-8 px-3 sm:h-9">
                  เงินสด
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="purchase">
            <BranchPurchaseBarSeries
              data={store.reportBranchPurchaseSeries}
              label="ยอดซื้อรายวัน"
            />
          </TabsContent>
          {isCashFlowReportTabEnabled && (
            <TabsContent value="cashflow">
              <CashFlowList metrics={store.reportCashFlowMetrics} />
            </TabsContent>
          )}
        </Tabs>
      </section>
    </div>
  )
}

const branchChartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
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
  const branchKeyById = new Map(
    branches.map((branch, index) => [branch.branchId, `branch_${index}`])
  )
  const chartConfig = Object.fromEntries(
    branches.map((branch, index) => {
      const key = branchKeyById.get(branch.branchId) ?? `branch_${index}`

      return [
        key,
        {
          label: branch.branchName,
          color: branchChartColors[index % branchChartColors.length],
        },
      ]
    })
  ) satisfies ChartConfig
  const chartData = data.map((item) => {
    const row: Record<string, string | number> = {
      label: item.label,
      total: item.total,
    }

    for (const branch of branches) {
      const key = branchKeyById.get(branch.branchId)

      if (!key) {
        continue
      }

      row[key] =
        item.branches.find((entry) => entry.branchId === branch.branchId)
          ?.total ?? 0
    }

    return row
  })
  const minChartWidth = Math.max(
    520,
    data.length * Math.max(branches.length, 1) * 52
  )

  if (data.length === 0 || branches.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground sm:mt-5 sm:p-6">
        ยังไม่มียอดซื้อสำหรับแสดงในกราฟ
      </div>
    )
  }

  return (
    <div className="mt-3 sm:mt-5">
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
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

      <div className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
        <ChartContainer
          config={chartConfig}
          className="h-60 min-h-60 w-full sm:h-72"
          style={{ minWidth: `${minChartWidth}px` }}
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 10, right: 12, bottom: 4, left: 4 }}
            barCategoryGap="22%"
            barGap={4}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval={0}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={54}
              fontSize={12}
              tickFormatter={(value) => `฿${formatCompactCurrency(Number(value))}`}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  valueFormatter={(value) => formatCurrency(value)}
                />
              }
            />
            {branches.map((branch) => {
              const key = branchKeyById.get(branch.branchId)

              if (!key) {
                return null
              }

              return (
                <Bar
                  key={branch.branchId}
                  dataKey={key}
                  fill={`var(--color-${key})`}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={34}
                />
              )
            })}
          </BarChart>
        </ChartContainer>
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
    <div className="mt-3 grid gap-2 sm:mt-5 md:grid-cols-2">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="rounded-lg border border-border p-3 sm:p-4"
        >
          <div className="mb-1.5 flex items-start justify-between gap-3 sm:mb-3">
            <p className="text-sm font-semibold leading-snug sm:text-base">
              {metric.label}
            </p>
            <Badge variant="secondary" className="h-6 shrink-0">
              {metric.kind}
            </Badge>
          </div>
          <p className="text-xl font-bold leading-tight sm:text-2xl">
            {formatMetricValue(metric)}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">
            {metricHelper(metric)}
          </p>
        </div>
      ))}
    </div>
  )
}
