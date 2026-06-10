/**
 * GET /api/admin/notifications — notification log stats
 * POST /api/admin/notifications — send notification to user
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);

    const [totalLogs, channels, recentLogs, dailyStats] = await Promise.all([
      prisma.notificationLog.count(),
      prisma.notificationLog.findMany({
        select: { channel: true, success: true, delivered: true, opened: true },
      }),
      prisma.notificationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          channel: true,
          title: true,
          success: true,
          delivered: true,
          opened: true,
          error: true,
          createdAt: true,
        },
      }),
      prisma.notificationLog.groupBy({
        by: ["channel"],
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _count: true,
      }),
    ]);

    // Aggregate channel stats
    const channelMap: Record<string, { total: number; success: number; failed: number; delivered: number; opened: number }> = {};
    for (const row of channels) {
      if (!channelMap[row.channel]) channelMap[row.channel] = { total: 0, success: 0, failed: 0, delivered: 0, opened: 0 };
      channelMap[row.channel].total++;
      if (row.success) channelMap[row.channel].success++;
      else channelMap[row.channel].failed++;
      if (row.delivered === true) channelMap[row.channel].delivered++;
      if (row.opened === true) channelMap[row.channel].opened++;
    }

    return ok({
      totalLogs,
      channelStats: Object.entries(channelMap).map(([channel, stats]) => ({ channel, ...stats })),
      recentLogs,
      dailyStats,
    });
  } catch (err) {
    return fail(err);
  }
}
