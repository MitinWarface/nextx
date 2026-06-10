import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86_400_000);

    const [
      totalUsers,
      onlineUsers,
      newRegistrations,
      messagesLast24h,
      premiumUsers,
      totalRevenue,
      openReports,
      bannedUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { isBot: false } }),
      prisma.user.count({ where: { status: "ONLINE" } }),
      prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.message.count({ where: { createdAt: { gte: dayAgo }, isDeleted: false } }),
      prisma.user.count({ where: { premiumStatus: "active" } }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amountKopecks: true },
      }),
      (prisma as any).report?.count({ where: { status: "PENDING" } }) ?? Promise.resolve(0),
      prisma.user.count({ where: { isBanned: true } }),
    ]);

    return ok({
      totalUsers,
      onlineUsers,
      newRegistrations,
      messagesLast24h,
      premiumUsers,
      totalRevenue: totalRevenue._sum.amountKopecks ?? 0,
      openReports,
      bannedUsers,
    });
  } catch (err) {
    return fail(err);
  }
}
