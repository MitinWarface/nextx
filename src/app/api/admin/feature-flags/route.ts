/**
 * GET  /api/admin/feature-flags — список всех флагов
 * POST /api/admin/feature-flags — создать/обновить флаг
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
    const flags = await prisma.featureFlag.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ flags });
  } catch (err) {
    return fail(err);
  }
}

const flagSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  rolloutPercent: z.number().min(0).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await parseJson(req, flagSchema);

    const flag = await prisma.featureFlag.upsert({
      where: { code: body.code },
      create: {
        code: body.code,
        name: body.name,
        description: body.description,
        enabled: body.enabled ?? false,
        rolloutPercent: body.rolloutPercent ?? 100,
      },
      update: {
        name: body.name,
        description: body.description,
        enabled: body.enabled,
        rolloutPercent: body.rolloutPercent,
      },
    });

    await logAudit(admin.id, "SETTINGS_CHANGE", `feature_flag:${body.code}`, {
      enabled: flag.enabled,
      rolloutPercent: flag.rolloutPercent,
    });

    return ok({ flag });
  } catch (err) {
    return fail(err);
  }
}
