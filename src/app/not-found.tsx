import Link from "next/link"
import { ArrowLeft, LayoutDashboard, ReceiptText } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
            <ReceiptText className="size-6" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-700">404</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal">
              ไม่พบหน้าที่ต้องการ
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              ลิงก์นี้อาจถูกย้าย ลบออก หรือพิมพ์ที่อยู่ไม่ถูกต้อง
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/portal"
                className={cn(buttonVariants({ className: "h-11" }))}
              >
                <LayoutDashboard className="size-4" />
                ไปแดชบอร์ด
              </Link>
              <Link
                href="/"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    className: "h-11",
                  })
                )}
              >
                <ArrowLeft className="size-4" />
                กลับหน้าเข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
