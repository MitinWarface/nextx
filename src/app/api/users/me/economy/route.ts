/**
 * GET /api/users/me/economy — transaction history, balance, earnings summary
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
    const offset = Number(searchParams.get("offset") ?? "0");

    const [wallet, logs, summary] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId: user!.id },
        select: { balance: true },
      }),
      prisma.economyLog.findMany({
        where: { userId: user!.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          source: true,
          amount: true,
          balance: true,
          details: true,
          createdAt: true,
        },
      }),
      prisma.economyLog.groupBy({
        by: ["source"],
        where: { userId: user!.id, type: "earn" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalEarned = summary.reduce((s, r) => s + (r._sum.amount ?? 0), 0);

    const bySource: Record<string, { total: number; count: number }> = {};
    for (const r of summary) {
      bySource[r.source] = { total: r._sum.amount ?? 0, count: r._count };
    }

    return ok({
      balance: wallet?.balance ?? 0,
      totalEarned,
      earningsBySource: bySource,
      transactions: logs.map((l) => ({
        id: l.id,
        type: l.type,
        source: l.source,
        amount: l.amount,
        balanceAfter: l.balance,
        details: l.details,
        date: l.createdAt,
      })),
      hasMore: offset + limit < (await prisma.economyLog.count({ where: { userId: user!.id } })),
    });
  } catch (err) {
    return fail(err);
  }
}
