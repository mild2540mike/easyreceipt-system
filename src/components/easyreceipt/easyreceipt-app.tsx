"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarIcon,
  ChefHat,
  CircleCheck,
  Clock3,
  Database,
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
  Plus,
  ReceiptText,
  Save,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  UserPlus,
  UserRound,
  Users,
  Wallet,
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

const percentFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 1,
})

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.max(value, 0))
}

function formatNumber(value: number) {
  return decimalFormatter.format(value)
}

function formatThaiDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-lg"
                      className="hidden h-11 w-11 sm:inline-flex"
                    />
                  }
                >
                  <Search className="size-5" />
                  <span className="sr-only">ตรวจวัตถุดิบ</span>
                </TooltipTrigger>
                <TooltipContent>ตรวจวัตถุดิบ</TooltipContent>
              </Tooltip>
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const ok = store.login(email, password)

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

            <Button type="submit" className="h-12 w-full">
              <LogIn className="size-4" />
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
            รายการที่ต่ำกว่าหรือใกล้จุดสั่งซื้อสำหรับวันนี้
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
                    เหลือ {formatNumber(item.onHand)} {item.ingredient.unit}
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

function DashboardView({ store }: { store: Store }) {
  const dailySales =
    store.cashFlowMetrics.find((metric) => metric.id === "sales")?.value ?? 0
  const margin =
    store.cashFlowMetrics.find((metric) => metric.id === "margin")?.value ?? 0

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="ยอดซื้อร่างล่าสุด"
          value={formatCurrency(store.currentPurchaseTotal)}
          helper="คำนวณอัตโนมัติจากใบซื้อ"
          icon={ShoppingCart}
          tone="border-amber-200 bg-amber-50 text-amber-800"
        />
        <MetricCard
          label="ยอดขายวันนี้"
          value={formatCurrency(dailySales)}
          helper="+12.4% จากเมื่อวาน"
          icon={TrendingUp}
          tone="border-emerald-200 bg-emerald-50 text-emerald-800"
        />
        <MetricCard
          label="สต็อกต้องดูแล"
          value={`${store.lowStockItems.length} รายการ`}
          helper="ต่ำหรือใกล้จุดสั่งซื้อ"
          icon={AlertTriangle}
          tone="border-red-200 bg-red-50 text-red-800"
        />
        <MetricCard
          label="กำไรขั้นต้น"
          value={formatCurrency(margin)}
          helper="รวมผลจากยอดซื้อร่าง"
          icon={Wallet}
          tone="border-teal-200 bg-teal-50 text-teal-800"
        />
      </section>

      <section>
        <div className="rounded-lg border border-border bg-background p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            <h2 className="text-lg font-semibold">รายการที่ควรซื้อเพิ่ม</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {store.lowStockItems.map((item) => (
              <StockAlertRow key={item.ingredientId} item={item} />
            ))}
          </div>
        </div>
      </section>
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
    <Card className="rounded-lg">
      <CardHeader>
        <CardAction>
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-lg border",
              tone
            )}
          >
            <Icon className="size-5" />
          </span>
        </CardAction>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}

function StockAlertRow({ item }: { item: InventoryRow }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{item.ingredient.name}</p>
          <p className="text-sm text-muted-foreground">
            จุดสั่งซื้อ {formatNumber(item.reorderPoint)} {item.ingredient.unit}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("h-6", statusClassName(item.status))}
        >
          {statusLabel(item.status)}
        </Badge>
      </div>
      <Progress value={item.stockPercent} />
      <p className="mt-2 text-sm text-muted-foreground">
        คงเหลือ {formatNumber(item.onHand)} {item.ingredient.unit}
      </p>
    </div>
  )
}

function PurchaseView({ store }: { store: Store }) {
  return (
    <div className="space-y-5">
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

        <div className="space-y-3 lg:hidden">
          {store.purchaseItems.map((item, index) => (
            <PurchaseMobileRow
              key={item.id}
              index={index}
              item={item}
              store={store}
            />
          ))}
        </div>

        <div className="hidden rounded-lg border border-border lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">#</TableHead>
                <TableHead>ชื่อวัตถุดิบ</TableHead>
                <TableHead className="w-36">ปริมาณ</TableHead>
                <TableHead className="w-28">หน่วย</TableHead>
                <TableHead className="w-40">ราคาต่อหน่วย</TableHead>
                <TableHead className="w-36 text-right">ราคารวม</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.purchaseItems.map((item, index) => (
                <PurchaseTableRow
                  key={item.id}
                  index={index}
                  item={item}
                  store={store}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button className="h-11" onClick={store.addPurchaseItem}>
              <Plus className="size-4" />
              เพิ่มรายการ
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={store.resetPurchaseItems}
            >
              <Minus className="size-4" />
              รีเซ็ต
            </Button>
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-950 sm:min-w-80">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold">ราคารวม</span>
              <span className="text-2xl font-bold">
                {formatCurrency(store.currentPurchaseTotal)}
              </span>
            </div>
            <p className="mt-1 text-sm text-sky-700">
              ระบบใช้ยอดนี้ไปคำนวณรายงานและ stock incoming
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
                หลังบันทึกจะเป็น {formatNumber(item.projected)}{" "}
                {item.ingredient.unit}
              </p>
            </div>
          ))}
      </section>
    </div>
  )
}

function PurchaseMobileRow({
  index,
  item,
  store,
}: {
  index: number
  item: PurchaseItem
  store: Store
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="secondary" className="h-7">
          รายการที่ {index + 1}
        </Badge>
        <Button
          variant="ghost"
          size="icon-lg"
          className="h-11 w-11 text-muted-foreground"
          onClick={() => store.removePurchaseItem(item.id)}
          disabled={store.purchaseItems.length === 1}
        >
          <Trash2 className="size-4" />
          <span className="sr-only">ลบรายการ</span>
        </Button>
      </div>

      <div className="grid gap-3">
        <IngredientSelect
          key={`${item.id}-${item.ingredientId}`}
          item={item}
          store={store}
        />

        <div className="grid grid-cols-2 gap-3">
          <FieldNumber
            label="ปริมาณ"
            value={item.quantity}
            onChange={(value) =>
              store.updatePurchaseItem(item.id, { quantity: value })
            }
          />
          <div>
            <Label className="mb-2 block">หน่วย</Label>
            <Input
              className="h-11"
              value={item.unit}
              onChange={(event) =>
                store.updatePurchaseItem(item.id, { unit: event.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldNumber
            label="ราคาต่อหน่วย"
            value={item.unitPrice}
            onChange={(value) =>
              store.updatePurchaseItem(item.id, { unitPrice: value })
            }
          />
          <div>
            <Label className="mb-2 block">ราคารวม</Label>
            <div className="flex h-11 items-center justify-end rounded-lg border border-border bg-muted px-3 font-semibold">
              {formatCurrency(lineTotal(item))}
            </div>
          </div>
        </div>
      </div>
    </div>
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
      <TableCell className="text-center">{index + 1}</TableCell>
      <TableCell>
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
          step="0.01"
          value={item.quantity}
          onChange={(event) =>
            store.updatePurchaseItem(item.id, {
              quantity: toNumber(event.target.value),
            })
          }
          className="h-11"
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-11"
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
          step="0.01"
          value={item.unitPrice}
          onChange={(event) =>
            store.updatePurchaseItem(item.id, {
              unitPrice: toNumber(event.target.value),
            })
          }
          className="h-11"
        />
      </TableCell>
      <TableCell className="text-right font-semibold">
        {formatCurrency(lineTotal(item))}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon-lg"
          className="h-11 w-11"
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

  function handleAddIngredient() {
    const ingredient = store.addIngredientFromPurchase({
      name: query,
      unit: item.unit,
      unitPrice: item.unitPrice,
    })

    if (!ingredient) {
      return
    }

    store.updatePurchaseItem(item.id, { ingredientId: ingredient.id })
    setQuery(ingredient.name)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Label className="mb-2 block lg:hidden">ชื่อวัตถุดิบ</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9"
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
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 max-h-80 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg">
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
            >
              <Plus className="size-4 shrink-0" />
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
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(toNumber(event.target.value))}
        className="h-11"
      />
    </div>
  )
}

function StockView({ store }: { store: Store }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
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
          helper="ต่ำหรือใกล้จุดสั่งซื้อ"
          icon={AlertTriangle}
          tone="border-red-200 bg-red-50 text-red-800"
        />
        <MetricCard
          label="กำลังรับเข้า"
          value={`${store.inventoryRows.filter((item) => item.incoming > 0).length} รายการ`}
          helper="จากใบซื้อร่างล่าสุด"
          icon={Package}
          tone="border-emerald-200 bg-emerald-50 text-emerald-800"
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:hidden">
        {store.inventoryRows.map((item) => (
          <StockMobileCard key={item.ingredientId} item={item} />
        ))}
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
              <TableHead>สถานะ</TableHead>
              <TableHead>อัปเดตล่าสุด</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {store.inventoryRows.map((item) => (
              <TableRow key={item.ingredientId}>
                <TableCell className="font-semibold">
                  {item.ingredient.name}
                </TableCell>
                <TableCell>{item.ingredient.category}</TableCell>
                <TableCell className="text-right">
                  {formatNumber(item.onHand)} {item.ingredient.unit}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(item.reserved)} {item.ingredient.unit}
                </TableCell>
                <TableCell className="text-right text-emerald-700">
                  +{formatNumber(item.incoming)} {item.ingredient.unit}
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}

function StockMobileCard({ item }: { item: InventoryRow }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardAction>
          <Badge
            variant="outline"
            className={cn("h-6", statusClassName(item.status))}
          >
            {statusLabel(item.status)}
          </Badge>
        </CardAction>
        <CardDescription>{item.ingredient.category}</CardDescription>
        <CardTitle>{item.ingredient.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={item.stockPercent} />
        <div className="grid grid-cols-3 gap-2 text-sm">
          <StockValue label="คงเหลือ" value={item.onHand} unit={item.ingredient.unit} />
          <StockValue label="จองใช้" value={item.reserved} unit={item.ingredient.unit} />
          <StockValue label="รับเข้า" value={item.incoming} unit={item.ingredient.unit} />
        </div>
      </CardContent>
    </Card>
  )
}

function StockValue({
  label,
  value,
  unit,
}: {
  label: string
  value: number
  unit: string
}) {
  return (
    <div className="rounded-lg bg-muted px-2 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">
        {formatNumber(value)} <span className="text-xs">{unit}</span>
      </p>
    </div>
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

function RecipesView({ store }: { store: Store }) {
  function handleDeleteRecipe(recipeId: string) {
    store.deleteRecipe(recipeId)
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="เมนูทั้งหมด"
          value={`${store.recipeStats.total} สูตร`}
          helper="เพิ่ม ลบ แก้ไขได้"
          icon={ChefHat}
          tone="border-rose-200 bg-rose-50 text-rose-800"
        />
        <MetricCard
          label="พร้อมผลิต"
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

      <section className="rounded-lg border border-border bg-background p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ChefHat className="size-5 text-rose-600" />
              <h2 className="text-lg font-semibold">
                สูตรอาหารและผลกระทบสต็อก
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              ตรวจความพร้อมของวัตถุดิบก่อนตัดสต็อกตามสูตร
            </p>
          </div>
          <Badge variant="outline" className="h-7 w-fit">
            {store.recipeImpacts.length} สูตรพร้อมตรวจ
          </Badge>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {store.recipeImpacts.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            store={store}
            editHref={`/portal/recipes/${recipe.id}/edit`}
            onDelete={handleDeleteRecipe}
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
      className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-rose-300 bg-background text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-20 items-center justify-center rounded-full border border-rose-200 bg-rose-50">
        <Plus className="size-10" />
      </span>
      <span className="sr-only">เพิ่มเมนูสูตรอาหาร</span>
    </Link>
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
      ? store.recipeImpacts.find((recipe) => recipe.id === recipeId)
      : undefined
  const [recipeDraft, setRecipeDraft] = useState<RecipeFormInput>(() =>
    editingRecipe
      ? draftFromRecipe(editingRecipe)
      : createRecipeDraft(defaultIngredientId)
  )
  const [message, setMessage] = useState("")

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
      store.ingredients.find((item) => !usedIngredientIds.has(item.id)) ??
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

  function handleSubmitRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedDraft = normalizeRecipeDraft(recipeDraft)
    const ok =
      mode === "edit" && recipeId
        ? store.updateRecipe(recipeId, normalizedDraft)
        : store.addRecipe(normalizedDraft)

    if (!ok) {
      setMessage("กรุณากรอกชื่อเมนู และเพิ่มวัตถุดิบอย่างน้อย 1 รายการ")
      return
    }

    router.push("/portal/recipes")
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
              เมนูนี้อาจถูกลบแล้ว หรือข้อมูล mock ถูกรีเซ็ตหลัง refresh
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

      <Card className="rounded-lg">
        <CardHeader>
          <CardAction>
            <span className="flex size-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700">
              {mode === "edit" ? (
                <Pencil className="size-5" />
              ) : (
                <Plus className="size-5" />
              )}
            </span>
          </CardAction>
          <CardTitle>
            {mode === "edit" ? "แก้ไขเมนูสูตรอาหาร" : "เพิ่มเมนูสูตรอาหาร"}
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
              <div className="flex items-center justify-between gap-3">
                <Label>วัตถุดิบในสูตร</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
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
                    className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_8rem_2.75rem] md:items-end"
                  >
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
                        step="0.01"
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
                      variant="ghost"
                      size="icon-lg"
                      className="h-11 w-11 text-muted-foreground"
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

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" className="h-11 flex-1">
                <Save className="size-4" />
                {mode === "edit" ? "บันทึกเมนู" : "เพิ่มเมนู"}
              </Button>
              <Link
                href="/portal/recipes"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-11 flex-1",
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
  editHref,
  onDelete,
}: {
  recipe: RecipeImpact
  store: Store
  editHref: string
  onDelete: (recipeId: string) => void
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "h-6",
                recipe.canProduce
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              )}
            >
              {recipe.canProduce ? "พร้อมผลิต" : "วัตถุดิบไม่พอ"}
            </Badge>
            <Link
              href={editHref}
              className={buttonVariants({
                variant: "outline",
                size: "icon-lg",
                className: "h-10 w-10",
              })}
            >
              <Pencil className="size-4" />
              <span className="sr-only">แก้ไขเมนู</span>
            </Link>
            <Button
              variant="ghost"
              size="icon-lg"
              className="h-10 w-10 text-red-600"
              onClick={() => onDelete(recipe.id)}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">ลบเมนู</span>
            </Button>
          </div>
        </CardAction>
        <CardDescription>{recipe.menuCategory}</CardDescription>
        <CardTitle>{recipe.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <SummaryPill label="จำนวน" value={`${recipe.yield} เสิร์ฟ`} />
          <SummaryPill label="ต้นทุน" value={formatCurrency(recipe.cost)} />
          <SummaryPill label="กำไร" value={formatCurrency(recipe.margin)} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">วัตถุดิบที่ใช้</p>
          <div className="flex flex-wrap gap-2">
            {recipe.ingredients.map((item) => {
              const ingredient = store.ingredientById.get(item.ingredientId)

              return (
                <Badge key={item.ingredientId} variant="secondary" className="h-7">
                  {ingredient?.name} {formatNumber(item.quantity)}
                  {ingredient?.unit}
                </Badge>
              )
            })}
          </div>
        </div>

        {!recipe.canProduce && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            ขาด: {recipe.missingNames.join(", ")}
          </div>
        )}
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
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onChange(String(nextValue))
        }
      }}
    >
      <SelectTrigger className="h-11 w-full">
        <SelectValue placeholder="เลือกวัตถุดิบ">
          {(nextValue) =>
            store.ingredientById.get(String(nextValue))?.name ?? "เลือกวัตถุดิบ"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {store.ingredients.map((ingredient) => (
          <SelectItem
            key={ingredient.id}
            value={ingredient.id}
            label={ingredient.name}
          >
            <span className="flex flex-col">
              <span>{ingredient.name}</span>
              <span className="text-xs text-muted-foreground">
                {ingredient.category} · {ingredient.unit}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}

function MembersView({ store }: { store: Store }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<MemberRole>("staff")
  const [message, setMessage] = useState("")

  function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!store.canManageMembers) {
      setMessage("บัญชีนี้ไม่มีสิทธิ์จัดการสมาชิก")
      return
    }

    const ok = store.addMember({ name, email, role })

    if (!ok) {
      setMessage("กรุณากรอกชื่อ อีเมล และใช้อีเมลที่ยังไม่ซ้ำ")
      return
    }

    setName("")
    setEmail("")
    setRole("staff")
    setMessage("เพิ่มสมาชิกใหม่แล้ว สถานะเริ่มต้นคือเชิญแล้ว")
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardAction>
              <span className="flex size-10 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
                <UserPlus className="size-5" />
              </span>
            </CardAction>
            <CardTitle>เพิ่มสมาชิก</CardTitle>
            <CardDescription>
              เชิญสมาชิกใหม่เข้าระบบด้วย role เริ่มต้น
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleAddMember}>
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
                <Label className="mb-2 block">สิทธิ์ใช้งาน</Label>
                <RoleSelect value={role} onChange={setRole} />
              </div>

              {message && (
                <div className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
                  {message}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={!store.canManageMembers}
              >
                <UserPlus className="size-4" />
                เพิ่มสมาชิก
              </Button>
              <p className="text-xs text-muted-foreground">
                บัญชี mock ที่เพิ่มใหม่ใช้รหัสผ่านเริ่มต้น 123456
              </p>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">การจัดการสมาชิก</h2>
                <p className="text-sm text-muted-foreground">
                  ปรับสิทธิ์และสถานะการเข้าใช้งานระบบ
                </p>
              </div>
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
                  <TableHead>ใช้งานล่าสุด</TableHead>
                  <TableHead>วันที่เพิ่ม</TableHead>
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
                    <TableCell>{member.lastActive}</TableCell>
                    <TableCell>{member.joinedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </section>
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
          <Badge
            variant="outline"
            className={cn("h-6", memberStatusClassName(member.status))}
          >
            {memberStatusLabel(member.status)}
          </Badge>
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
        <div className="grid grid-cols-2 gap-2 text-sm">
          <SummaryPill label="ใช้งานล่าสุด" value={member.lastActive} />
          <SummaryPill label="วันที่เพิ่ม" value={member.joinedAt} />
        </div>
      </CardContent>
    </Card>
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
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {store.cashFlowMetrics.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={formatCurrency(metric.value)}
            helper={`${metric.delta > 0 ? "+" : ""}${percentFormatter.format(metric.delta)}% จากช่วงก่อน`}
            icon={metric.kind === "cash" ? Wallet : BarChart3}
            tone={
              metric.kind === "expense"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : metric.kind === "margin"
                  ? "border-teal-200 bg-teal-50 text-teal-800"
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
                กราฟ mock สำหรับตรวจภาพรวมต้นทุนและกระแสเงินสด
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
            <BarSeries
              data={store.purchaseSeries}
              label="ยอดซื้อรายวัน"
              tone="bg-amber-500"
            />
          </TabsContent>
          <TabsContent value="cashflow">
            <CashFlowList store={store} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}

function BarSeries({
  data,
  label,
  tone,
}: {
  data: { label: string; total: number }[]
  label: string
  tone: string
}) {
  const max = Math.max(...data.map((item) => item.total), 1)

  return (
    <div className="mt-5">
      <p className="mb-4 text-sm font-semibold">{label}</p>
      <div className="flex h-64 items-end gap-3 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
        {data.map((item) => (
          <div
            key={item.label}
            className="flex min-w-16 flex-1 flex-col items-center gap-2"
          >
            <div className="flex h-44 w-full items-end">
              <div
                className={cn("w-full rounded-t-lg", tone)}
                style={{ height: `${Math.max((item.total / max) * 100, 8)}%` }}
              />
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

function CashFlowList({ store }: { store: Store }) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {store.cashFlowMetrics.map((metric) => (
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
          <p className="text-2xl font-bold">{formatCurrency(metric.value)}</p>
          <p className="text-sm text-muted-foreground">
            {metric.delta > 0 ? "+" : ""}
            {percentFormatter.format(metric.delta)}% จากช่วงก่อน
          </p>
        </div>
      ))}
    </div>
  )
}
