import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

const BOOST_COST_PER_LEVEL = 100; // NC per boost
const LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 75, 100, 150, 200, 300]; // boostCount thresholds for each level

function calculateLevel(boostCount: number): number {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (boostCount >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
}

function getLevelUpThreshold(currentLevel: number): number | null {
  if (currentLevel >= LEVEL_THRESHOLDS.length - 1) return null;
  return LEVEL_THRESHOLDS[currentLevel + 1];
}

function getLevelBenefits(level: number): string[] {
  const benefits: string[] = [];
  if (level >= 1) benefits.push("Больше реакций на постах");
  if (level >= 2) benefits.push("Расширенный набор эмодзи");
  if (level >= 3) benefits.push("Больше закреплённых сообщений");
  if (level >= 4) benefits.push("Приоритет в поиске");
  if (level >= 5) benefits.push("Кастомный цвет заголовка");
  if (level >= 6) benefits.push("Эксклюзивный бейдж канала");
  if (level >= 7) benefits.push("Бесплатные AI-посты");
  if (level >= 8) benefits.push("Приоритетная поддержка");
  if (level >= 9) benefits.push("Все привилегии maximum");
  return benefits;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { chatId } = await params;
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        type: true,
        boostLevel: true,
        boostCount: true,
        creatorId: true,
        name: true,
      },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "CHANNEL") throw new HttpError(400, "not_channel");

    const myBoost = await prisma.channelBoost.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
    });

    const nextThreshold = getLevelUpThreshold(chat.boostLevel);
    const benefits = getLevelBenefits(chat.boostLevel);

    return ok({
      chatId: chat.id,
      chatName: chat.name,
      isOwner: chat.creatorId === user!.id,
      boostLevel: chat.boostLevel,
      boostCount: chat.boostCount,
      myBoost: myBoost ? { amount: myBoost.amount, createdAt: myBoost.createdAt } : null,
      nextLevelThreshold: nextThreshold,
      benefits,
      boostCost: BOOST_COST_PER_LEVEL,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { chatId } = await params;
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, type: true, creatorId: true, boostLevel: true, boostCount: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "CHANNEL") throw new HttpError(400, "not_channel");
    if (chat.creatorId === user!.id) throw new HttpError(400, "cannot_boost_own_channel");

    const wallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    if (!wallet) throw new HttpError(400, "wallet_not_found");
    if (wallet.balance < BOOST_COST_PER_LEVEL) throw new HttpError(400, "insufficient_balance");

    const existingBoost = await prisma.channelBoost.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
    });

    const newBoostCount = chat.boostCount + 1;
    const newLevel = calculateLevel(newBoostCount);

    await prisma.$transaction([
      // Deduct NC from wallet
      prisma.wallet.update({
        where: { userId: user!.id },
        data: { balance: { decrement: BOOST_COST_PER_LEVEL } },
      }),
      // Record transaction
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "GIFT_SENT",
          amount: -BOOST_COST_PER_LEVEL,
          description: `Boosted channel`,
          relatedId: chatId,
        },
      }),
      // Upsert boost record
      prisma.channelBoost.upsert({
        where: { chatId_userId: { chatId, userId: user!.id } },
        create: { chatId, userId: user!.id, amount: 1 },
        update: { amount: { increment: 1 } },
      }),
      // Update chat boost stats
      prisma.chat.update({
        where: { id: chatId },
        data: {
          boostCount: { increment: 1 },
          boostLevel: newLevel,
        },
      }),
    ]);

    const nextThreshold = getLevelUpThreshold(newLevel);
    const benefits = getLevelBenefits(newLevel);

    return ok({
      message: "Boost applied",
      boostLevel: newLevel,
      boostCount: newBoostCount,
      nextLevelThreshold: nextThreshold,
      benefits,
      deducted: BOOST_COST_PER_LEVEL,
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
