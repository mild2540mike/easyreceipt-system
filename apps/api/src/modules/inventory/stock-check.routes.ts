import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../db/prisma"
import { getAuthMember } from "../../middleware/auth"
import { asyncHandler } from "../../utils/async-handler"
import { forbidden, notFound } from "../../utils/http-error"
import { routeParam } from "../../utils/route-param"
import { assertBranchAccess, memberCanViewMenu } from "../common/permissions"
import {
  saveStockCheck,
  serializeStockCheck,
  stockCheckInclude,
  stockCheckInputSchema,
} from "./stock-check.service"

export const stockChecksRouter = Router({ mergeParams: true })

stockChecksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req)
    const branchId = routeParam(req.params.branchId, "branchId")
    const input = stockCheckInputSchema.parse(req.body)
    res.json({
      check: await saveStockCheck(prisma, member.id, branchId, input),
    })
  })
)

stockChecksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const branchId = routeParam(req.params.branchId, "branchId")
    const { member } = await assertBranchAccess(
      prisma,
      getAuthMember(req).id,
      branchId
    )
    if (!memberCanViewMenu(member, "stock-check"))
      throw forbidden("คุณไม่มีสิทธิ์ดูประวัติการเช็คสต็อก")
    const { offset } = z
      .object({ offset: z.coerce.number().int().min(0).default(0) })
      .parse(req.query)
    const checks = await prisma.stockCheck.findMany({
      where: { branchId },
      orderBy: [{ savedAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: 21,
      include: { _count: { select: { items: true } } },
    })
    res.json({
      checks: checks.slice(0, 20).map((check) => ({
        id: check.id,
        branchId,
        startedAt: check.startedAt,
        savedAt: check.savedAt,
        createdByName: check.createdByName,
        itemCount: check._count.items,
      })),
      nextOffset: checks.length > 20 ? offset + 20 : null,
    })
  })
)

stockChecksRouter.get(
  "/:checkId",
  asyncHandler(async (req, res) => {
    const branchId = routeParam(req.params.branchId, "branchId")
    const { member } = await assertBranchAccess(
      prisma,
      getAuthMember(req).id,
      branchId
    )
    if (!memberCanViewMenu(member, "stock-check"))
      throw forbidden("คุณไม่มีสิทธิ์ดูประวัติการเช็คสต็อก")
    const check = await prisma.stockCheck.findFirst({
      where: { id: routeParam(req.params.checkId, "checkId"), branchId },
      include: stockCheckInclude,
    })
    if (!check) throw notFound("ไม่พบผลเช็คสต็อกของสาขานี้")
    res.json({ check: serializeStockCheck(check) })
  })
)
