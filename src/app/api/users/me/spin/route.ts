/**
 * POST /api/users/me/spin — spin the daily wheel
 * GET  /api/users/me/spin — check if can spin today
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const REWARDS = [
  { label: "1 NC", amount: 1, weight: 40 },
  { label: "2 NC", amount: 2, weight: 30 },
  { label: "5 NC", amount: 5, weight: 15 },
  { label: "10 NC", amount: 10, weight: 10 },
  { label: "25 NC", amount: 25, weight: 4 },
  { label: "50 NC", amount: 50, weight: 1 },
];

function pickReward() {
  const totalWeight = REWARDS.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const r of REWARDS) {
    rand -= r.weight;
    if (rand <= 0) return r;
  }
  return REWARDS[0];
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaySpin = await prisma.spinHistory.findFirst({
      where: { userId: user!.id, spunAt: { gte: startOfDay } },
      orderBy: { spunAt: "desc" },
    });

    const totalSpins = await prisma.spinHistory.count({
      where: { userId: user!.id },
    });

    return ok({
      canSpin: !todaySpin,
      lastReward: todaySpin ? { reward: todaySpin.reward, amount: todaySpin.amount } : null,
      totalSpins,
      rewards: REWARDS.map((r) => ({ label: r.label, amount: r.amount })),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaySpin = await prisma.spinHistory.findFirst({
      where: { userId: user!.id, spunAt: { gte: startOfDay } },
    });
    if (todaySpin) throw new HttpError(400, "already_spun_today");

    const reward = pickReward();

    const [spinRecord] = await prisma.$transaction([
      prisma.spinHistory.create({
        data: { userId: user!.id, reward: reward.label, amount: reward.amount },
      }),
      prisma.wallet.upsert({
        where: { userId: user!.id },
        update: { balance: { increment: reward.amount } },
        create: { userId: user!.id, balance: reward.amount },
      }),
    ]);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user!.id },
      select: { balance: true },
    });

    await prisma.economyLog.create({
      data: {
        userId: user!.id,
        type: "earn",
        source: "spin",
        amount: reward.amount,
        balance: wallet?.balance ?? reward.amount,
        details: `Daily spin: ${reward.label}`,
      },
    });

    return ok({
      reward: reward.label,
      amount: reward.amount,
      newBalance: wallet?.balance ?? reward.amount,
      spinId: spinRecord.id,
    });
  } catch (err) {
    return fail(err);
  }
}
