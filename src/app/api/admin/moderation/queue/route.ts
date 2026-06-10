/**
 * GET /api/admin/moderation/queue — returns pending moderation items
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
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "30"));

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { status: "PENDING" },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          targetUser: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, warningCount: true, isShadowBanned: true },
          },
        },
      }),
      prisma.report.count({ where: { status: "PENDING" } }),
    ]);

    // Also fetch auto-flagged content (users with high warning counts or shadow bans)
    const flaggedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { warningCount: { gte: 3 } },
          { isShadowBanned: true },
        ],
      },
      take: 20,
      orderBy: { warningCount: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        warningCount: true,
        isShadowBanned: true,
        isReadOnly: true,
        isBanned: true,
      },
    });

    return ok({
      reports,
      total,
      page,
      limit,
      flaggedUsers,
    });
  } catch (err) {
    return fail(err);
  }
}
