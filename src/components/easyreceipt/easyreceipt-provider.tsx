"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"

import {
  useEasyReceiptStore,
  type EasyReceiptStore,
} from "@/hooks/use-easyreceipt-store"
import type { ViewId } from "@/lib/easyreceipt-data"

const EasyReceiptContext = createContext<EasyReceiptStore | null>(null)

type EasyReceiptLayoutContextValue = {
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
}

const EasyReceiptLayoutContext =
  createContext<EasyReceiptLayoutContextValue | null>(null)

function activeViewFromPathname(pathname: string): ViewId | undefined {
  if (pathname.startsWith("/portal/members")) {
    return "members"
  }

  if (pathname.startsWith("/portal/recipes")) {
    return "recipes"
  }

  if (pathname.startsWith("/portal/usage")) {
    return "usage"
  }

  if (pathname.startsWith("/portal/stock")) {
    return "stock"
  }

  if (pathname.startsWith("/portal/reports")) {
    return "reports"
  }

  if (pathname.startsWith("/portal/budgets")) {
    return "budgets"
  }

  if (pathname === "/portal" || pathname.startsWith("/portal/purchase")) {
    return "purchase"
  }

  return undefined
}

export function EasyReceiptProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const activeView = useMemo(() => activeViewFromPathname(pathname), [pathname])
  const store = useEasyReceiptStore(activeView)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((current) => !current)
  }, [])
  const layout = useMemo(
    () => ({ isSidebarCollapsed, toggleSidebar }),
    [isSidebarCollapsed, toggleSidebar]
  )

  return (
    <EasyReceiptContext.Provider value={store}>
      <EasyReceiptLayoutContext.Provider value={layout}>
        {children}
      </EasyReceiptLayoutContext.Provider>
    </EasyReceiptContext.Provider>
  )
}

export function useEasyReceipt() {
  const store = useContext(EasyReceiptContext)

  if (!store) {
    throw new Error("useEasyReceipt must be used inside EasyReceiptProvider")
  }

  return store
}

export function useEasyReceiptLayout() {
  const layout = useContext(EasyReceiptLayoutContext)

  if (!layout) {
    throw new Error("useEasyReceiptLayout must be used inside EasyReceiptProvider")
  }

  return layout
}
