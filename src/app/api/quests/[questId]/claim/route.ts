import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ questId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { questId } = await params;
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new HttpError(404, "quest_not_found");

    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId: user!.id, questId } },
    });
    if (!userQuest) throw new HttpError(400, "quest_not_started");
    if (!userQuest.completed) throw new HttpError(400, "quest_not_completed");
    if (userQuest.claimedAt) throw new HttpError(400, "already_claimed");

    await prisma.userQuest.update({
      where: { id: userQuest.id },
      data: { claimedAt: new Date() },
    });

    let wallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: user!.id, balance: 0 } });
    }
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: quest.reward } },
    });
    await prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT",
        amount: quest.reward,
        description: `Quest reward: ${quest.title}`,
      },
    });

    return ok({ reward: quest.reward, balance: wallet.balance + quest.reward });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
