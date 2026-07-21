import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Building2,
  ChefHat,
  CircleDollarSign,
  KeyRound,
  Minus,
  Package,
  Plus,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "คู่มือการใช้งาน | timetoeat",
  description: "คู่มือเริ่มต้นใช้งานระบบจัดการใบซื้อและคลังวัตถุดิบ timetoeat",
}

const contents = [
  { href: "#getting-started", label: "เริ่มต้นใช้งาน" },
  { href: "#daily-workflow", label: "ขั้นตอนประจำวัน" },
  { href: "#daily-guides", label: "วิธีใช้ 4 เมนูหลัก" },
  { href: "#features", label: "เมนูทั้งหมด" },
  { href: "#roles", label: "สิทธิ์ผู้ใช้งาน" },
  { href: "#help", label: "เมื่อพบปัญหา" },
]

const dailySteps = [
  {
    title: "บันทึกของมาเพิ่ม",
    description:
      "เลือกวันที่และผู้ขาย เพิ่มวัตถุดิบ ระบุจำนวน หน่วย และราคา แล้วตรวจยอดรวมก่อนบันทึก",
    icon: Plus,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    title: "บันทึกของใช้ไป",
    description:
      "สร้างรอบการใช้งาน เลือกเหตุผลและวัตถุดิบ ใส่จำนวนที่ใช้ ระบบจะตัดคลังเมื่อยืนยัน",
    icon: Minus,
    tone: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    title: "ตรวจคลังวัตถุดิบ",
    description:
      "ตรวจยอดคงเหลือ รายการใกล้หมด และจำนวนที่ถูกจองไว้ก่อนวางแผนซื้อรอบถัดไป",
    icon: Package,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    title: "ตรวจรายงาน",
    description:
      "เลือกช่วงเวลาและสาขาเพื่อดูต้นทุนการซื้อ ปริมาณการใช้ และข้อมูลประกอบการควบคุมงบ",
    icon: BarChart3,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
]

const features = [
  {
    title: "บันทึกของมาเพิ่ม",
    description: "เพิ่มรายการซื้อเข้าคลัง ตรวจยอดรวม และเก็บประวัติใบซื้อ",
    icon: ReceiptText,
  },
  {
    title: "บันทึกของใช้ไป",
    description: "ตัดวัตถุดิบเป็นรอบ พร้อมเหตุผลการใช้และประวัติย้อนหลัง",
    icon: Minus,
  },
  {
    title: "คลังวัตถุดิบ",
    description: "ดูคงเหลือ จุดสั่งซื้อ หน่วยนับ และสถานะวัตถุดิบแต่ละรายการ",
    icon: Package,
  },
  {
    title: "ทดลองสูตรอาหาร",
    description: "สร้างสูตร คำนวณวัตถุดิบ และตรวจผลกระทบต่อคลังก่อนใช้งานจริง",
    icon: ChefHat,
  },
  {
    title: "รายงาน",
    description: "สรุปต้นทุน รายการซื้อ และการใช้วัตถุดิบตามช่วงเวลาที่เลือก",
    icon: BarChart3,
  },
  {
    title: "งบรายวัน",
    description: "กำหนดเพดานงบของแต่ละสาขาและติดตามยอดใช้เทียบกับงบ",
    icon: CircleDollarSign,
  },
  {
    title: "สมาชิก",
    description: "เพิ่มบัญชี กำหนดบทบาท สาขา และสิทธิ์การมองเห็นเมนู",
    icon: Users,
  },
]

const dailyGuides = [
  {
    id: "purchase-guide",
    title: "บันทึกของมาเพิ่ม",
    summary:
      "ใช้เมื่อรับวัตถุดิบหรือสินค้าเข้าจากการซื้อ เพื่อเพิ่มยอดคงเหลือและบันทึกต้นทุนของวัน",
    image: "/manual/purchase-mobile-detail.png",
    imageWidth: 830,
    imageHeight: 1692,
    imageAlt: "หน้าบันทึกของมาเพิ่ม แสดงฟอร์มชื่อบิล รายการวัตถุดิบ และสรุปยอดซื้อ",
    icon: Plus,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    steps: [
      "ตรวจชื่อสาขาที่มุมขวาบน และเลือกวันที่ให้ตรงกับวันที่รับของหรือวันที่ในบิล",
      "ถ้ามีรูปบิล กด “สแกนบิล” แล้วถ่ายรูปหรือเลือกรูป JPEG, PNG หรือ WebP ระบบจะเพิ่มบิลใหม่ให้โดยไม่ลบรายการเดิม",
      "ตรวจชื่อบิล วันที่ และทุกรายการที่ระบบอ่านได้ โดยเฉพาะแถวที่แสดงว่า “ยังไม่จับคู่กับวัตถุดิบในคลัง”",
      "ถ้าไม่มีรูป กด “เพิ่มบิลแรก” แล้วตั้งชื่อบิลให้ค้นย้อนหลังได้ง่าย เช่น ชื่อผู้ขายหรือเลขที่บิล",
      "ค้นหาวัตถุดิบ ใส่ปริมาณ หน่วย และราคาต่อหน่วย ระบบจะคำนวณราคารวมให้",
      "ถ้ามีหลายผู้ขายหรือหลายบิล กด “เพิ่มบิลถัดไป” เพื่อแยกรายการออกจากกัน",
      "ตรวจสรุปยอดซื้อและงบของวัน แล้วกด “บันทึกซื้อ” เมื่อข้อมูลครบ",
      "ตรวจรายการอีกครั้งใน “ประวัติของมาเพิ่มวันนี้” เพื่อยืนยันว่าบันทึกสำเร็จ",
    ],
    checks: [
      "ผลจากรูปเป็นข้อมูลช่วยกรอก ต้องตรวจชื่อ ปริมาณ หน่วย และราคาอีกครั้งก่อนบันทึก",
      "ราคาที่กรอกต้องเป็นราคาต่อหน่วย ไม่ใช่ราคารวมทั้งบิล",
      "หน่วยนับต้องตรงกับหน่วยที่ใช้ในคลัง เช่น กิโลกรัม แพ็ค หรือขวด",
      "ห้ามรวมของจากคนละสาขาหรือคนละวันไว้ในบิลเดียวกัน",
    ],
    result:
      "ระบบสร้างประวัติการซื้อ เพิ่มยอดคงเหลือในคลัง และนำยอดเงินไปแสดงในรายงานของวันที่เลือก",
  },
  {
    id: "usage-guide",
    title: "บันทึกของใช้ไป",
    summary:
      "ใช้เมื่อเบิกวัตถุดิบไปประกอบอาหาร สูญเสีย หรือใช้ในงานอื่น เพื่อให้ยอดคลังตรงกับของจริง",
    image: "/manual/usage-mobile-detail.png",
    imageWidth: 830,
    imageHeight: 1692,
    imageAlt: "หน้าบันทึกของใช้ไป แสดงชื่อรายการ เหตุผล วัตถุดิบ และจำนวนที่ใช้",
    icon: Minus,
    tone: "border-rose-200 bg-rose-50 text-rose-700",
    steps: [
      "เลือกวันที่ใช้วัตถุดิบให้ถูกต้อง แล้วกด “เพิ่มรายการแรก” เพื่อสร้างรอบการใช้งาน",
      "ตั้งชื่อรายการ เช่น รอบเช้า ครัวกลาง หรืออาหารกลางวัน เพื่อแยกประวัติให้อ่านง่าย",
      "ระบุเหตุผลรวมของรอบนั้น เหตุผลเดียวกันจะถูกใช้กับวัตถุดิบทุกแถวในกลุ่ม",
      "ค้นหาวัตถุดิบและใส่จำนวนที่ใช้ ระบบจะแสดงคงเหลือปัจจุบันและยอดหลังบันทึก",
      "เพิ่มรายการอื่นในรอบเดียวกัน หรือสร้างรอบถัดไปเมื่อต้องการแยกเหตุผล",
      "ตรวจยอดหลังบันทึกแล้วกด “บันทึก” จากนั้นตรวจประวัติด้านล่าง",
    ],
    checks: [
      "จำนวนที่ใช้ต้องไม่มากกว่ายอดคงเหลือที่สามารถใช้ได้",
      "ถ้าเหตุผลต่างกัน ควรแยกเป็นคนละรอบเพื่อให้รายงานย้อนหลังชัดเจน",
      "ตรวจหน่วยก่อนกรอกจำนวน โดยเฉพาะวัตถุดิบที่ซื้อและใช้คนละหน่วย",
    ],
    result:
      "ระบบตัดยอดคงเหลือทันที เก็บเหตุผลและประวัติผู้บันทึก และรวมข้อมูลไว้ในรายงานของใช้ไป",
  },
  {
    id: "stock-guide",
    title: "คลังวัตถุดิบ",
    summary:
      "ใช้ตรวจยอดคงเหลือ ของใกล้หมด รายการที่กำลังรับเข้า และข้อมูลราคาก่อนตัดสินใจซื้อ",
    image: "/manual/stock-mobile-detail.png",
    imageWidth: 830,
    imageHeight: 1692,
    imageAlt: "หน้าคลังวัตถุดิบ แสดงตัวเลขสรุป ตัวกรอง และรายการวัตถุดิบคงเหลือ",
    icon: Package,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    steps: [
      "ดูตัวเลขสรุปด้านบนเพื่อทราบจำนวนวัตถุดิบทั้งหมด รายการที่ต้องสั่งซื้อ และรายการกำลังรับเข้า",
      "ค้นหาด้วยชื่อ หมวดหมู่ หน่วย หรือซัพพลายเออร์ หรือเลือกหมวดหมู่เพื่อลดรายการที่แสดง",
      "ใช้ตัวกรอง “ต้องดูแล” เพื่อดูของใกล้หมด และ “มีคงเหลือ” เพื่อดูของที่พร้อมใช้งาน",
      "สลับระหว่างมุมมองรายการและตารางตามงานที่ทำ มุมมองตารางเหมาะกับการเปรียบเทียบหลายรายการ",
      "อ่านยอดคงเหลือ ราคาปัจจุบัน ราคาตลาด และเวลาอัปเดตล่าสุดก่อนสั่งซื้อ",
      "ผู้มีสิทธิ์แก้ไขสามารถกดไอคอนดินสอเพื่อปรับข้อมูลหลักของวัตถุดิบ",
    ],
    checks: [
      "“กำลังรับเข้า” คือรายการจากฉบับร่าง จึงยังไม่ใช่ยอดคงเหลือที่ใช้งานได้",
      "สถานะต้องสั่งซื้อพิจารณาจากยอดหลังหักจำนวนที่จองไว้เทียบกับจุดสั่งซื้อ",
      "หากยอดหน้าจอไม่ตรงของจริง ให้ตรวจประวัติของมาเพิ่มและของใช้ไปก่อนแก้ข้อมูลหลัก",
    ],
    result:
      "หน้านี้ไม่ตัดหรือเพิ่มสต็อกเอง แต่ช่วยตรวจความถูกต้องและวางแผนซื้อจากข้อมูลล่าสุดของสาขา",
  },
  {
    id: "reports-guide",
    title: "รายงาน",
    summary:
      "ใช้ตรวจยอดซื้อและความเคลื่อนไหววัตถุดิบตามวันที่ เพื่อควบคุมต้นทุนและตรวจความผิดปกติ",
    image: "/manual/reports-mobile-detail.png",
    imageWidth: 830,
    imageHeight: 1692,
    imageAlt: "หน้ารายงาน แสดงวันที่ ยอดซื้อรวม ความเคลื่อนไหวสต็อก และแท็บรายงาน",
    icon: BarChart3,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
    steps: [
      "ตรวจสาขาที่มุมขวาบน แล้วเลือกวันที่รายงานให้ตรงกับช่วงที่ต้องการตรวจสอบ",
      "ดูยอดซื้อรวมเพื่อเทียบกับบิลหรือวงเงินของวัน และดูจำนวนความเคลื่อนไหวสต็อก",
      "เลือกแท็บ “ยอดซื้อ” เพื่อดูข้อมูลจากหน้าบันทึกของมาเพิ่ม",
      "เลือกแท็บ “ของใช้ไป” เพื่อดูการตัดวัตถุดิบและเหตุผลการใช้งาน",
      "หากไม่พบข้อมูล ให้ย้อนตรวจวันที่ สาขา และประวัติการบันทึกในเมนูต้นทาง",
      "Owner หรือผู้ดูแลหลายสาขาควรตรวจชื่อสาขาทุกครั้งก่อนนำตัวเลขไปใช้อ้างอิง",
    ],
    checks: [
      "รายงานแสดงตามวันที่ที่เลือก ไม่ใช่วันที่เปิดหน้าจอเสมอไป",
      "ยอดซื้อจะเกิดขึ้นหลังบันทึกซื้อสำเร็จ ฉบับร่างจะยังไม่รวมในรายงาน",
      "ตัวเลขรายงานควรสอดคล้องกับประวัติของมาเพิ่ม ของใช้ไป และยอดคงเหลือ",
    ],
    result:
      "รายงานรวบรวมข้อมูลที่บันทึกแล้วเพื่อให้ตรวจต้นทุน ปริมาณการใช้ และความเคลื่อนไหวของแต่ละสาขา",
  },
]

export default function ManualPage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ReceiptText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">timetoeat</p>
            <p className="truncate font-semibold">คู่มือการใช้งาน</p>
          </div>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", className: "h-10 px-3" })
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">กลับหน้าเข้าสู่ระบบ</span>
            <span className="sm:hidden">กลับ</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="border-b border-border pb-7 sm:pb-9">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 sm:flex">
              <BookOpen className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold leading-tight text-balance sm:text-3xl">
                ใช้งานระบบซื้อและคลังวัตถุดิบได้อย่างมั่นใจ
              </h1>
              <p className="mt-3 max-w-[68ch] text-sm leading-7 text-muted-foreground sm:text-base">
                คู่มือนี้สรุปตั้งแต่การเข้าสู่ระบบ งานที่ต้องทำในแต่ละวัน
                ไปจนถึงการตรวจรายงานและจัดการสิทธิ์สมาชิก โดยเมนูที่เห็นอาจแตกต่างกันตามบทบาทของบัญชี
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-8 pt-7 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-12">
          <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="สารบัญ">
            <p className="mb-2 text-sm font-semibold">สารบัญ</p>
            <nav className="flex flex-wrap gap-1.5 lg:flex-col lg:flex-nowrap">
              {contents.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 space-y-12">
            <section id="getting-started" className="scroll-mt-24">
              <SectionHeading
                title="เริ่มต้นใช้งาน"
                description="ใช้ชื่อผู้ใช้และรหัสผ่านที่ผู้ดูแลระบบมอบให้"
              />
              <ol className="mt-5 divide-y divide-border rounded-lg border border-border bg-background">
                <InstructionRow
                  number="1"
                  title="กรอกชื่อผู้ใช้และรหัสผ่าน"
                  description="ตรวจสอบภาษาแป้นพิมพ์และตัวพิมพ์เล็ก–ใหญ่ก่อนกดเข้าสู่ระบบ"
                  icon={KeyRound}
                />
                <InstructionRow
                  number="2"
                  title="เลือกสาขาที่ต้องการทำงาน"
                  description="หากบัญชีดูแลหลายสาขา ให้ตรวจชื่อสาขาที่แถบด้านบนก่อนบันทึกข้อมูลทุกครั้ง"
                  icon={Building2}
                />
                <InstructionRow
                  number="3"
                  title="ตรวจเมนูตามสิทธิ์ของคุณ"
                  description="ระบบแสดงเฉพาะเมนูที่บัญชีได้รับอนุญาต หากขาดเมนูที่ต้องใช้ให้ติดต่อ Owner"
                  icon={ShieldCheck}
                />
              </ol>
            </section>

            <section id="daily-workflow" className="scroll-mt-24">
              <SectionHeading
                title="ขั้นตอนประจำวัน"
                description="ลำดับแนะนำเพื่อให้ยอดซื้อ ยอดใช้ และยอดคงเหลือตรงกัน"
              />
              <div className="mt-5 space-y-3">
                {dailySteps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <div
                      key={step.title}
                      className="flex gap-4 rounded-lg border border-border bg-background p-4 sm:items-center"
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-lg border",
                          step.tone
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            ขั้นที่ {index + 1}
                          </span>
                          <h3 className="font-semibold">{step.title}</h3>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm leading-6 text-secondary-foreground">
                <strong>ควรตรวจทุกครั้ง:</strong> วันที่ สาขา หน่วยนับ จำนวน และราคา
                ก่อนยืนยัน เพราะข้อมูลเหล่านี้มีผลต่อยอดคลังและรายงานทันที
              </div>
            </section>

            <section id="daily-guides" className="scroll-mt-24">
              <SectionHeading
                title="วิธีใช้ 4 เมนูหลักแบบละเอียด"
                description="ทำตามลำดับในแต่ละเมนูและตรวจจุดสำคัญก่อนยืนยันข้อมูล"
              />
              <div className="mt-3 divide-y divide-border">
                {dailyGuides.map((guide) => {
                  const Icon = guide.icon

                  return (
                    <section
                      key={guide.id}
                      id={guide.id}
                      className="scroll-mt-24 py-8 first:pt-5 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-lg border",
                            guide.tone
                          )}
                        >
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <h3 className="text-lg font-bold text-balance sm:text-xl">
                            {guide.title}
                          </h3>
                          <p className="mt-1 max-w-[70ch] text-sm leading-6 text-muted-foreground">
                            {guide.summary}
                          </p>
                        </div>
                      </div>

                      <figure
                        className="mx-auto mt-5 w-full overflow-hidden rounded-lg border border-border bg-background"
                        style={{
                          maxWidth: guide.imageWidth > 390 ? 320 : 390,
                        }}
                      >
                        <a
                          href={guide.image}
                          target="_blank"
                          rel="noreferrer"
                          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          aria-label={`เปิดภาพ ${guide.title} ขนาดเต็ม`}
                        >
                          <Image
                            src={guide.image}
                            alt={guide.imageAlt}
                            width={guide.imageWidth}
                            height={guide.imageHeight}
                            sizes={
                              guide.imageWidth > 390
                                ? "(max-width: 360px) calc(100vw - 2rem), 320px"
                                : "(max-width: 430px) calc(100vw - 2rem), 390px"
                            }
                            loading={
                              guide.id === "purchase-guide" ? "eager" : "lazy"
                            }
                            className="h-auto w-full"
                          />
                        </a>
                        <figcaption className="border-t border-border px-4 py-2.5 text-xs leading-5 text-muted-foreground">
                          ภาพตัวอย่างหน้า “{guide.title}” บนมือถือ
                          เมนูหลักอยู่ที่แถบด้านล่างของหน้าจอ
                          <span className="font-medium text-primary"> แตะภาพเพื่อเปิดขนาดเต็ม</span>
                        </figcaption>
                      </figure>

                      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.8fr)]">
                        <div>
                          <h4 className="font-semibold">ขั้นตอนการใช้งาน</h4>
                          <ol className="mt-3 space-y-3">
                            {guide.steps.map((step, index) => (
                              <li key={step} className="flex gap-3 text-sm leading-6">
                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-bold text-primary-foreground">
                                  {index + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-lg bg-muted p-4">
                            <h4 className="font-semibold">ตรวจให้ครบก่อนยืนยัน</h4>
                            <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                              {guide.checks.map((check) => (
                                <li key={check} className="flex gap-2">
                                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                                  <span>{check}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
                            <strong>ผลที่เกิดกับระบบ:</strong> {guide.result}
                          </div>
                        </div>
                      </div>
                    </section>
                  )
                })}
              </div>
            </section>

            <section id="features" className="scroll-mt-24">
              <SectionHeading
                title="เมนูทั้งหมด"
                description="หน้าที่ของแต่ละเมนูในระบบ"
              />
              <div className="mt-5 divide-y divide-border border-y border-border">
                {features.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <div key={feature.title} className="flex gap-4 py-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                        <Icon className="size-4.5" />
                      </span>
                      <div>
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section id="roles" className="scroll-mt-24">
              <SectionHeading
                title="สิทธิ์ผู้ใช้งาน"
                description="บทบาทช่วยป้องกันการแก้ไขข้อมูลเกินหน้าที่"
              />
              <div className="mt-5 overflow-hidden rounded-lg border border-border bg-background">
                <dl className="divide-y divide-border text-sm">
                  <RoleRow
                    role="Owner"
                    detail="เข้าถึงการทำงานหลัก ตั้งงบ จัดการสมาชิก สาขา และสิทธิ์เมนู"
                  />
                  <RoleRow
                    role="Manager"
                    detail="ดูแลการซื้อ คลัง สูตร รายงาน และงานที่ได้รับมอบหมายในสาขา"
                  />
                  <RoleRow
                    role="Staff"
                    detail="บันทึกงานประจำวันตามเมนูและสาขาที่ได้รับอนุญาต"
                  />
                  <RoleRow
                    role="Viewer"
                    detail="ดูข้อมูลที่ได้รับอนุญาตโดยไม่แก้ไขรายการสำคัญ"
                  />
                </dl>
              </div>
            </section>

            <section id="help" className="scroll-mt-24 pb-4">
              <SectionHeading
                title="เมื่อพบปัญหา"
                description="ตรวจสอบสิ่งต่อไปนี้ก่อนติดต่อผู้ดูแลระบบ"
              />
              <ul className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  หากเข้าสู่ระบบไม่ได้ ให้ตรวจชื่อผู้ใช้ รหัสผ่าน และสถานะบัญชี
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  หากไม่พบเมนูหรือสาขา ให้ Owner ตรวจบทบาทและสิทธิ์ของบัญชี
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  หากบันทึกไม่ได้ ให้ตรวจช่องที่มีข้อความเตือน จำนวนคงเหลือ และการเชื่อมต่ออินเทอร์เน็ต
                </li>
              </ul>
              <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">พร้อมเริ่มใช้งานแล้วหรือยัง?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    กลับไปหน้าเข้าสู่ระบบและทำตามขั้นตอนด้านบน
                  </p>
                </div>
                <Link
                  href="/"
                  className={cn(
                    buttonVariants({ className: "h-10 px-4 sm:shrink-0" })
                  )}
                >
                  <ArrowLeft className="size-4" />
                  กลับหน้าเข้าสู่ระบบ
                </Link>
              </div>
            </section>
          </article>
        </div>
      </div>
    </main>
  )
}

function SectionHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-balance sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function InstructionRow({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: string
  title: string
  description: string
  icon: typeof KeyRound
}) {
  return (
    <li className="flex gap-4 p-4">
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Icon className="size-4" />
        <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[0.625rem] font-bold text-primary-foreground">
          {number}
        </span>
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </li>
  )
}

function RoleRow({ role, detail }: { role: string; detail: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[110px_1fr] sm:gap-4">
      <dt className="font-semibold text-foreground">{role}</dt>
      <dd className="leading-6 text-muted-foreground">{detail}</dd>
    </div>
  )
}
