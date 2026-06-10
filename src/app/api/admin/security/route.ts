/**
 * GET /api/admin/security — список security events
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "50"));
    const type = searchParams.get("type") ?? undefined;

    const where: any = {};
    if (type) where.type = type;

    const [events, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, username: true, displayName: true } } },
      }),
      prisma.securityEvent.count({ where }),
    ]);

    return ok({ events, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}
