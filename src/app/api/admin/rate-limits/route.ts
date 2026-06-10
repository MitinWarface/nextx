/**
 * GET  /api/admin/rate-limits — список лимитов
 * PUT  /api/admin/rate-limits — обновить лимит
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, parseJson } from "@/lib/api-helpers";
import { invalidateRateLimitCache } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const configs = await prisma.rateLimitConfig.findMany({ orderBy: { action: "asc" } });
    return ok({ configs });
  } catch (err) {
    return fail(err);
  }
}

const updateSchema = z.object({
  action: z.string(),
  freeLimit: z.number().min(1).max(10000),
  premiumLimit: z.number().min(1).max(10000),
  windowMs: z.number().min(1000).max(3600000).optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await parseJson(req, updateSchema);

    const config = await prisma.rateLimitConfig.upsert({
      where: { action: body.action },
      create: { action: body.action, freeLimit: body.freeLimit, premiumLimit: body.premiumLimit, windowMs: body.windowMs ?? 60000 },
      update: { freeLimit: body.freeLimit, premiumLimit: body.premiumLimit, windowMs: body.windowMs },
    });

    await logAudit(admin.id, "SETTINGS_CHANGE", `rate_limit:${body.action}`, {
      freeLimit: config.freeLimit,
      premiumLimit: config.premiumLimit,
    });

    invalidateRateLimitCache();

    return ok({ config });
  } catch (err) {
    return fail(err);
  }
}
