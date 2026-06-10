/**
 * GET /api/admin/analytics — analytics data for admin dashboard
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400000);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    // Total counts
    const [totalUsers, totalChats, totalMessages, onlineUsers] = await Promise.all([
      prisma.user.count(),
      prisma.chat.count(),
      prisma.message.count(),
      prisma.user.count({ where: { status: "ONLINE" } }),
    ]);

    // New users per day (last 30 days)
    const usersByDay = await prisma.$queryRawUnsafe<Array<{ date: string; count: bigint }>>(
      `SELECT DATE("createdAt") as date, COUNT(*) as count
       FROM "User"
       WHERE "createdAt" >= $1
       GROUP BY DATE("createdAt")
       ORDER BY date ASC`,
      monthAgo,
    );

    // Messages per day (last 30 days)
    const messagesByDay = await prisma.$queryRawUnsafe<Array<{ date: string; count: bigint }>>(
      `SELECT DATE("createdAt") as date, COUNT(*) as count
       FROM "Message"
       WHERE "createdAt" >= $1 AND "isScheduled" = false
       GROUP BY DATE("createdAt")
       ORDER BY date ASC`,
      monthAgo,
    );

    // Messages by type
    const messagesByType = await prisma.message.groupBy({
      by: ["type"],
      _count: { id: true },
      where: { createdAt: { gte: monthAgo } },
    });

    // Chat types distribution
    const chatsByType = await prisma.chat.groupBy({
      by: ["type"],
      _count: { id: true },
    });

    // Recent activity (last 7 days)
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, displayName: true, username: true, avatarUrl: true, createdAt: true, status: true },
    });

    const recentMessages = await prisma.message.count({
      where: { createdAt: { gte: dayAgo } },
    });

    // Active users (sent messages in last 7 days)
    const activeUsers = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(DISTINCT "senderId") as count
       FROM "Message"
       WHERE "createdAt" >= $1`,
      weekAgo,
    );

    // Retention: DAU for last 14 days
    const retentionDays = 14;
    const retentionStart = new Date(now.getTime() - retentionDays * 86400000);
    const retentionData = await prisma.$queryRawUnsafe<Array<{ date: string; dau: bigint; new_users: bigint }>>(
      `WITH days AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date as day
      )
      SELECT
        d.day::text as date,
        COALESCE(active.dau, 0) as dau,
        COALESCE(new_u.new_users, 0) as new_users
      FROM days d
      LEFT JOIN (
        SELECT DATE("createdAt") as day, COUNT(DISTINCT "senderId") as dau
        FROM "Message"
        WHERE "createdAt" >= $1
        GROUP BY DATE("createdAt")
      ) active ON active.day = d.day
      LEFT JOIN (
        SELECT DATE("createdAt") as day, COUNT(*) as new_users
        FROM "User"
        WHERE "createdAt" >= $1
        GROUP BY DATE("createdAt")
      ) new_u ON new_u.day = d.day
      ORDER BY d.day ASC`,
      retentionStart,
      now,
    );

    return ok({
      totalUsers,
      totalChats,
      totalMessages,
      onlineUsers,
      activeUsersWeek: Number(activeUsers[0]?.count ?? 0),
      recentMessagesToday: recentMessages,
      usersByDay: usersByDay.map((r) => ({ date: r.date, count: Number(r.count) })),
      messagesByDay: messagesByDay.map((r) => ({ date: r.date, count: Number(r.count) })),
      messagesByType: messagesByType.map((r) => ({ type: r.type, count: r._count.id })),
      chatsByType: chatsByType.map((r) => ({ type: r.type, count: r._count.id })),
      recentUsers,
      retention: retentionData.map((r) => ({
        date: r.date,
        dau: Number(r.dau),
        newUsers: Number(r.new_users),
      })),
    });
  } catch (err) {
    return fail(err);
  }
}
