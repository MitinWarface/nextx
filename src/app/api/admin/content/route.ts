/**
 * GET  /api/admin/content — list content items (files)
 * DELETE /api/admin/content/[itemId] — delete a content item
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "50");

    const where: any = {};
    if (category) where.category = category;

    const [items, total] = await Promise.all([
      prisma.contentItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, username: true, displayName: true } } },
      }),
      prisma.contentItem.count({ where }),
    ]);

    const categoryStats = await prisma.contentItem.groupBy({
      by: ["category"],
      _sum: { fileSize: true },
      _count: true,
    });

    // Daily growth for last 14 days
    const growthData = await prisma.$queryRaw`
      SELECT
        date_trunc('day', "createdAt")::date as day,
        COUNT(*) as count,
        COALESCE(SUM("fileSize"), 0) as size
      FROM "ContentItem"
      WHERE "createdAt" > NOW() - INTERVAL '14 days'
      GROUP BY date_trunc('day', "createdAt")::date
      ORDER BY day ASC
    `;

    return ok({ items, total, categoryStats, growthData, page, limit });
  } catch (err) {
    return fail(err);
  }
}
