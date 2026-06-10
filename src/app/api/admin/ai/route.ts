/**
 * GET /api/admin/ai — AI usage stats
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400000);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    const [totalRequests, requestsToday, requestsWeek, failedRequests] = await Promise.all([
      prisma.aiRequest.count(),
      prisma.aiRequest.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.aiRequest.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.aiRequest.count({ where: { success: false } }),
    ]);

    const tokenStats = await prisma.aiRequest.aggregate({
      _sum: { tokensUsed: true },
      _avg: { tokensUsed: true },
      where: { createdAt: { gte: monthAgo } },
    });

    const byType = await prisma.aiRequest.groupBy({
      by: ["requestType"],
      _count: { id: true },
      _sum: { tokensUsed: true },
      where: { createdAt: { gte: monthAgo } },
    });

    const byModel = await prisma.aiRequest.groupBy({
      by: ["model"],
      _count: { id: true },
      _sum: { tokensUsed: true },
      where: { createdAt: { gte: monthAgo } },
    });

    const byDay = await prisma.$queryRawUnsafe<Array<{ date: string; count: bigint; tokens: bigint }>>(
      `SELECT DATE("createdAt") as date, COUNT(*) as count, COALESCE(SUM("tokensUsed"), 0) as tokens
       FROM "AiRequest"
       WHERE "createdAt" >= $1
       GROUP BY DATE("createdAt")
       ORDER BY date ASC`,
      monthAgo,
    );

    const topUsers = await prisma.$queryRawUnsafe<Array<{ userId: string; count: bigint; tokens: bigint }>>(
      `SELECT "userId", COUNT(*) as count, COALESCE(SUM("tokensUsed"), 0) as tokens
       FROM "AiRequest"
       WHERE "createdAt" >= $1
       GROUP BY "userId"
       ORDER BY count DESC
       LIMIT 10`,
      monthAgo,
    );

    // Resolve user info
    const topUserIds = topUsers.map((u) => u.userId);
    const userMap = new Map<string, { username: string; displayName: string }>();
    if (topUserIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: { id: true, username: true, displayName: true },
      });
      for (const u of users) userMap.set(u.id, { username: u.username, displayName: u.displayName });
    }

    return ok({
      totalRequests,
      requestsToday,
      requestsWeek,
      failedRequests,
      totalTokens: Number(tokenStats._sum.tokensUsed ?? 0),
      avgTokens: Math.round(Number(tokenStats._avg.tokensUsed ?? 0)),
      byType: byType.map((r) => ({ type: r.requestType, count: r._count.id, tokens: Number(r._sum.tokensUsed ?? 0) })),
      byModel: byModel.filter((r) => r.model).map((r) => ({ model: r.model!, count: r._count.id, tokens: Number(r._sum.tokensUsed ?? 0) })),
      byDay: byDay.map((r) => ({ date: r.date, count: Number(r.count), tokens: Number(r.tokens) })),
      topUsers: topUsers.map((r) => ({
        userId: r.userId,
        username: userMap.get(r.userId)?.username ?? "unknown",
        displayName: userMap.get(r.userId)?.displayName ?? "Unknown",
        count: Number(r.count),
        tokens: Number(r.tokens),
      })),
    });
  } catch (err) {
    return fail(err);
  }
}
