"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import {
  useEasyReceiptStore,
  type EasyReceiptStore,
} from "@/hooks/use-easyreceipt-store"
import type { ViewId } from "@/lib/easyreceipt-data"

const EasyReceiptContext = createContext<EasyReceiptStore | null>(null)

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

  return (
    <EasyReceiptContext.Provider value={store}>
      {children}
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
