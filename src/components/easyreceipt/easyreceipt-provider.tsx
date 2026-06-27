"use client"

import { createContext, useContext, type ReactNode } from "react"

import {
  useEasyReceiptStore,
  type EasyReceiptStore,
} from "@/hooks/use-easyreceipt-store"

const EasyReceiptContext = createContext<EasyReceiptStore | null>(null)

export function EasyReceiptProvider({ children }: { children: ReactNode }) {
  const store = useEasyReceiptStore()

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
