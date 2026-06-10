/**
 * GET  /api/admin/promo-codes — список промокодов
 * POST /api/admin/promo-codes — создать промокод
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, parseJson } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const codes = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { plan: { select: { id: true, name: true } } },
    });
    return ok({ codes });
  } catch (err) {
    return fail(err);
  }
}

const createSchema = z.object({
  code: z.string().min(2).max(50),
  discount: z.number().min(1).max(100),
  planId: z.string().optional(),
  maxUses: z.number().min(1).optional(),
  expiresAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await parseJson(req, createSchema);

    const code = await prisma.promoCode.create({
      data: {
        code: body.code.toUpperCase(),
        discount: body.discount,
        planId: body.planId ?? null,
        maxUses: body.maxUses ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    await logAudit(admin.id, "SETTINGS_CHANGE", `promo_code:${code.code}`, {
      discount: code.discount,
      planId: code.planId,
    });

    return ok({ code });
  } catch (err) {
    return fail(err);
  }
}
