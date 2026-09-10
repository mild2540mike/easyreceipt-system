import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../db/prisma";
import { getAuthMember } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { badRequest, forbidden, notFound } from "../../utils/http-error";
import { routeParam } from "../../utils/route-param";
import {
  assertBranchAccess,
  getAccessibleBranches,
  memberCanEditMenu,
  serializeBranch,
} from "../common/permissions";

export const branchesRouter = Router();

const branchCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Branch code may contain only letters, numbers, _ or -.",
  )
  .transform((value) => value.toUpperCase());

const createBranchSchema = z
  .object({
    code: branchCodeSchema,
    name: z.string().trim().min(1).max(160),
    location: z.string().trim().min(1).max(180),
  })
  .strict();

const updateBranchSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    location: z.string().trim().min(1).max(180).optional(),
  })
  .strict()
  .refine((input) => input.name !== undefined || input.location !== undefined, {
    message: "At least one branch field is required.",
  });

const updateBranchBudgetSchema = z.object({
  dailyPurchaseBudget: z.union([z.null(), z.coerce.number().min(0)]),
});

function parseCreateBranchInput(body: unknown) {
  const result = createBranchSchema.safeParse(body);

  if (result.success) {
    return result.data;
  }

  const fields = result.error.flatten().fieldErrors;
  if (fields.code) {
    throw badRequest(
      "รหัสสาขาต้องมี 1–20 ตัว และใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข _ หรือ -",
    );
  }
  if (fields.name) {
    throw badRequest("กรุณาระบุชื่อสาขา ความยาวไม่เกิน 160 ตัวอักษร");
  }
  if (fields.location) {
    throw badRequest("กรุณาระบุที่ตั้ง ความยาวไม่เกิน 180 ตัวอักษร");
  }

  throw badRequest("ข้อมูลสาขาไม่ถูกต้อง");
}

function parseUpdateBranchInput(body: unknown) {
  if (
    typeof body === "object" &&
    body !== null &&
    Object.prototype.hasOwnProperty.call(body, "code")
  ) {
    throw badRequest("ไม่สามารถเปลี่ยนรหัสสาขาหลังสร้างได้");
  }

  const result = updateBranchSchema.safeParse(body);
  if (result.success) {
    return result.data;
  }

  const fields = result.error.flatten().fieldErrors;
  if (fields.name) {
    throw badRequest("ชื่อสาขาต้องไม่ว่างและยาวไม่เกิน 160 ตัวอักษร");
  }
  if (fields.location) {
    throw badRequest("ที่ตั้งต้องไม่ว่างและยาวไม่เกิน 180 ตัวอักษร");
  }

  throw badRequest("แก้ไขได้เฉพาะชื่อสาขาและที่ตั้งเท่านั้น");
}

function assertOwner(member: { role: string }) {
  if (member.role !== "owner") {
    throw forbidden("เฉพาะ Owner เท่านั้นที่จัดการสาขาได้");
  }
}

async function findOrganizationBranch(
  tx: Prisma.TransactionClient,
  organizationId: string,
  branchId: string,
) {
  const branch = await tx.branch.findFirst({
    where: { id: branchId, organizationId },
  });

  if (!branch) {
    throw notFound("ไม่พบสาขาที่ต้องการ");
  }

  return branch;
}

branchesRouter.get(
  "/manage",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req);
    assertOwner(member);

    const [branches, accessRows] = await Promise.all([
      prisma.branch.findMany({
        where: { organizationId: member.organizationId },
        orderBy: [{ isActive: "desc" }, { code: "asc" }],
      }),
      prisma.memberBranchAccess.findMany({
        where: { member: { organizationId: member.organizationId } },
        select: {
          branchId: true,
          memberId: true,
          branch: { select: { isActive: true } },
        },
      }),
    ]);

    const assignedCount = new Map<string, number>();
    const activeBranchCountByMember = new Map<string, number>();

    for (const row of accessRows) {
      assignedCount.set(
        row.branchId,
        (assignedCount.get(row.branchId) ?? 0) + 1,
      );
      if (row.branch.isActive) {
        activeBranchCountByMember.set(
          row.memberId,
          (activeBranchCountByMember.get(row.memberId) ?? 0) + 1,
        );
      }
    }

    const soleAccessCount = new Map<string, number>();
    for (const row of accessRows) {
      if (
        row.branch.isActive &&
        activeBranchCountByMember.get(row.memberId) === 1
      ) {
        soleAccessCount.set(
          row.branchId,
          (soleAccessCount.get(row.branchId) ?? 0) + 1,
        );
      }
    }

    res.json({
      branches: branches.map((branch) => ({
        ...serializeBranch(branch),
        assignedMemberCount: assignedCount.get(branch.id) ?? 0,
        soleAccessMemberCount: soleAccessCount.get(branch.id) ?? 0,
      })),
    });
  }),
);

branchesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req);
    const branches = await getAccessibleBranches(prisma, member.id);

    res.json({ branches: branches.map(serializeBranch) });
  }),
);

branchesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req);
    assertOwner(member);
    const input = parseCreateBranchInput(req.body);

    let branch;
    try {
      branch = await prisma.$transaction(async (tx) => {
        const duplicate = await tx.branch.findFirst({
          where: { organizationId: member.organizationId, code: input.code },
          select: { id: true },
        });

        if (duplicate) {
          throw badRequest(
            `รหัสสาขา ${input.code} ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น`,
          );
        }

        const created = await tx.branch.create({
          data: {
            organizationId: member.organizationId,
            code: input.code,
            name: input.name,
            location: input.location,
            dailyPurchaseBudget: null,
          },
        });
        const [ingredients, owners] = await Promise.all([
          tx.ingredient.findMany({
            where: { organizationId: member.organizationId, isActive: true },
            select: { id: true },
          }),
          tx.member.findMany({
            where: { organizationId: member.organizationId, role: "owner" },
            select: { id: true },
          }),
        ]);

        if (ingredients.length > 0) {
          await tx.branchInventory.createMany({
            data: ingredients.map((ingredient) => ({
              branchId: created.id,
              ingredientId: ingredient.id,
              onHand: 0,
              reservedQuantity: 0,
              reorderPoint: 0,
              costPerUnit: 0,
            })),
          });
        }

        if (owners.length > 0) {
          await tx.memberBranchAccess.createMany({
            data: owners.map((owner) => ({
              memberId: owner.id,
              branchId: created.id,
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            organizationId: member.organizationId,
            branchId: created.id,
            memberId: member.id,
            action: "branch_created",
            entityType: "branch",
            entityId: created.id,
            metadataJson: JSON.stringify({
              code: created.code,
              name: created.name,
              location: created.location,
            }),
          },
        });

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw badRequest(
          `รหัสสาขา ${input.code} ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น`,
        );
      }
      throw error;
    }

    res.status(201).json({ branch: serializeBranch(branch) });
  }),
);

branchesRouter.patch(
  "/:branchId/budget",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req);
    const branchId = routeParam(req.params.branchId, "branchId");
    const input = updateBranchBudgetSchema.parse(req.body);

    const branch = await prisma.$transaction(async (tx) => {
      const access = await assertBranchAccess(tx, member.id, branchId);

      if (!memberCanEditMenu(access.member, "budgets")) {
        throw forbidden(
          "Member does not have permission to update branch budget.",
        );
      }

      return tx.branch.update({
        where: {
          id: branchId,
        },
        data: {
          dailyPurchaseBudget: input.dailyPurchaseBudget,
        },
      });
    });

    res.json({ branch: serializeBranch(branch) });
  }),
);

branchesRouter.patch(
  "/:branchId",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req);
    assertOwner(member);
    const branchId = routeParam(req.params.branchId, "branchId");
    const input = parseUpdateBranchInput(req.body);

    const branch = await prisma.$transaction(async (tx) => {
      const current = await findOrganizationBranch(
        tx,
        member.organizationId,
        branchId,
      );
      const updated = await tx.branch.update({
        where: { id: branchId },
        data: input,
      });

      await tx.auditLog.create({
        data: {
          organizationId: member.organizationId,
          branchId,
          memberId: member.id,
          action: "branch_updated",
          entityType: "branch",
          entityId: branchId,
          metadataJson: JSON.stringify({
            before: { name: current.name, location: current.location },
            after: { name: updated.name, location: updated.location },
          }),
        },
      });

      return updated;
    });

    res.json({ branch: serializeBranch(branch) });
  }),
);

branchesRouter.delete(
  "/:branchId",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req);
    assertOwner(member);
    const branchId = routeParam(req.params.branchId, "branchId");

    await prisma.$transaction(
      async (tx) => {
        const branch = await findOrganizationBranch(
          tx,
          member.organizationId,
          branchId,
        );

        if (!branch.isActive) {
          throw badRequest("สาขานี้ถูกปิดใช้งานอยู่แล้ว");
        }

        const activeBranchCount = await tx.branch.count({
          where: { organizationId: member.organizationId, isActive: true },
        });

        if (activeBranchCount <= 1) {
          throw badRequest("ไม่สามารถปิดสาขาสุดท้ายขององค์กรได้");
        }

        const assignedMembers = await tx.memberBranchAccess.findMany({
          where: { branchId },
          select: {
            member: {
              select: {
                id: true,
                branchAccess: {
                  where: { branch: { isActive: true } },
                  select: { branchId: true },
                },
              },
            },
          },
        });
        const soleAccessMembers = assignedMembers
          .map((row) => row.member)
          .filter((assignedMember) => assignedMember.branchAccess.length === 1);

        if (soleAccessMembers.length > 0) {
          throw badRequest(
            `ยังปิดสาขานี้ไม่ได้ เพราะมีสมาชิก ${soleAccessMembers.length} คนที่ไม่มีสาขาใช้งานอื่น กรุณาย้ายสมาชิกก่อน`,
            {
              memberIds: soleAccessMembers.map(
                (assignedMember) => assignedMember.id,
              ),
            },
          );
        }

        await tx.branch.update({
          where: { id: branchId },
          data: { isActive: false },
        });
        await tx.auditLog.create({
          data: {
            organizationId: member.organizationId,
            branchId,
            memberId: member.id,
            action: "branch_deactivated",
            entityType: "branch",
            entityId: branchId,
            metadataJson: JSON.stringify({
              code: branch.code,
              name: branch.name,
            }),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    res.status(204).send();
  }),
);

branchesRouter.post(
  "/:branchId/restore",
  asyncHandler(async (req, res) => {
    const member = getAuthMember(req);
    assertOwner(member);
    const branchId = routeParam(req.params.branchId, "branchId");

    const branch = await prisma.$transaction(async (tx) => {
      const current = await findOrganizationBranch(
        tx,
        member.organizationId,
        branchId,
      );

      if (current.isActive) {
        throw badRequest("สาขานี้เปิดใช้งานอยู่แล้ว");
      }

      const [owners, activeIngredients, existingInventory] = await Promise.all([
        tx.member.findMany({
          where: { organizationId: member.organizationId, role: "owner" },
          select: {
            id: true,
            branchAccess: { where: { branchId }, select: { branchId: true } },
          },
        }),
        tx.ingredient.findMany({
          where: { organizationId: member.organizationId, isActive: true },
          select: { id: true },
        }),
        tx.branchInventory.findMany({
          where: { branchId },
          select: { ingredientId: true },
        }),
      ]);
      const missingOwners = owners.filter(
        (owner) => owner.branchAccess.length === 0,
      );
      const existingIngredientIds = new Set(
        existingInventory.map((row) => row.ingredientId),
      );
      const missingIngredients = activeIngredients.filter(
        (ingredient) => !existingIngredientIds.has(ingredient.id),
      );

      if (missingOwners.length > 0) {
        await tx.memberBranchAccess.createMany({
          data: missingOwners.map((owner) => ({
            memberId: owner.id,
            branchId,
          })),
        });
      }

      if (missingIngredients.length > 0) {
        await tx.branchInventory.createMany({
          data: missingIngredients.map((ingredient) => ({
            branchId,
            ingredientId: ingredient.id,
            onHand: 0,
            reservedQuantity: 0,
            reorderPoint: 0,
            costPerUnit: 0,
          })),
        });
      }

      const restored = await tx.branch.update({
        where: { id: branchId },
        data: { isActive: true },
      });
      await tx.auditLog.create({
        data: {
          organizationId: member.organizationId,
          branchId,
          memberId: member.id,
          action: "branch_restored",
          entityType: "branch",
          entityId: branchId,
          metadataJson: JSON.stringify({
            code: restored.code,
            name: restored.name,
          }),
        },
      });

      return restored;
    });

    res.json({ branch: serializeBranch(branch) });
  }),
);
