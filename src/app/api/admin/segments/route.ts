/**
 * GET  /api/admin/segments — список сегментов
 * POST /api/admin/segments — создать сегмент
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
    const segments = await prisma.userSegment.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ segments });
  } catch (err) {
    return fail(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  filter: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await parseJson(req, createSchema);

    const segment = await prisma.userSegment.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        filter: body.filter ?? {},
        userCount: 0,
      },
    });

    await logAudit(admin.id, "SETTINGS_CHANGE", `segment:${segment.id}`, {
      name: segment.name,
    });

    return ok({ segment });
  } catch (err) {
    return fail(err);
  }
}
