/**
 * GET  /api/users/me/referral — get referral info
 * POST /api/users/me/referral — apply referral code (for existing users)
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const dbUser = await prisma.user!.findUnique({
      where: { id: user!.id },
      select: {
        referralCode: true,
        referralCount: true,
        referralBonus: true,
        referredBy: true,
      },
    });

    const referredUsers = await prisma.referralReward.findMany({
      where: { referrerId: user!.id },
      include: {
        referred: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok({
      referralCode: dbUser?.referralCode,
      referralCount: dbUser?.referralCount ?? 0,
      referralBonus: dbUser?.referralBonus ?? 0,
      referredBy: dbUser?.referredBy,
      referredUsers: referredUsers.map((r) => ({
        user: r.referred,
        bonusAmount: r.bonusAmount,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}

const applySchema = z.object({
  action: z.literal("apply"),
  referralCode: z.string().min(1).max(20),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await parseJson(req, applySchema);

    const dbUser = await prisma.user!.findUnique({
      where: { id: user!.id },
      select: { referredBy: true },
    });

    if (dbUser?.referredBy) {
      throw new HttpError(400, "referral_already_applied");
    }

    const referrer = await prisma.user!.findUnique({
      where: { referralCode: body.referralCode },
      select: { id: true, username: true },
    });

    if (!referrer) {
      throw new HttpError(404, "invalid_referral_code");
    }

    if (referrer.id === user!.id) {
      throw new HttpError(400, "cannot_refer_self");
    }

    const BONUS = 50; // NC bonus for retroactive application

    await prisma.$transaction(async (tx) => {
      await tx.user!.update({
        where: { id: user!.id },
        data: { referredBy: body.referralCode },
      });

      let referrerWallet = await tx.wallet.findUnique({ where: { userId: referrer.id } });
      if (!referrerWallet) {
        referrerWallet = await tx.wallet.create({ data: { userId: referrer.id, balance: 0 } });
      }

      await tx.wallet.update({
        where: { userId: referrer.id },
        data: { balance: { increment: BONUS } },
      });
      await tx.transaction.create({
        data: {
          walletId: referrerWallet.id,
          type: "DEPOSIT",
          amount: BONUS,
          description: `Реферальный бонус: ${user!.username} применил код`,
        },
      });

      await tx.user!.update({
        where: { id: referrer.id },
        data: {
          referralCount: { increment: 1 },
          referralBonus: { increment: BONUS },
        },
      });

      await tx.referralReward.create({
        data: {
          referrerId: referrer.id,
          referredId: user!.id,
          bonusAmount: BONUS,
        },
      });
    });

    return ok({ success: true, bonus: BONUS, referrerUsername: referrer.username });
  } catch (err) {
    return fail(err);
  }
}
