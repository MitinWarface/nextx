import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { fail, ok, parseJson } from "@/lib/api-helpers";
import { ensureSpecialChats } from "@/lib/service-chat";

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/, "username只能包含小写字母、数字和下划线"),
  displayName: z.string().min(1).max(64),
  password: z.string().min(6).max(128),
});

function generateReferralCode(username: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${username.toUpperCase()}-${suffix}`;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await parseJson(req, registerSchema);
    const url = new URL(req.url);
    const refCode = url.searchParams.get("ref") || undefined;

    const existing = await prisma.user.findUnique({
      where: { username: body.username },
      select: { id: true },
    });
    if (existing) {
      return fail(new Error("username_taken"));
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const referralCode = generateReferralCode(body.username);

    const user = await prisma.user.create({
      data: {
        username: body.username,
        displayName: body.displayName,
        email: `${body.username}@nextx.local`,
        internalEmail: `${body.username}@nextx.app`,
        passwordHash,
        role: "USER",
        referralCode,
        referredBy: refCode || null,
        publicId: `NX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        referralCode: true,
        publicId: true,
      },
    });

    await ensureSpecialChats(user.id);

    if (refCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: refCode },
        select: { id: true, username: true },
      });

      if (referrer && referrer.id !== user.id) {
        const REFERRAL_BONUS = 100;

        await prisma.$transaction(async (tx) => {
          let referrerWallet = await tx.wallet.findUnique({ where: { userId: referrer.id } });
          if (!referrerWallet) {
            referrerWallet = await tx.wallet.create({ data: { userId: referrer.id, balance: 0 } });
          }

          await tx.wallet.update({
            where: { userId: referrer.id },
            data: { balance: { increment: REFERRAL_BONUS } },
          });
          await tx.transaction.create({
            data: {
              walletId: referrerWallet.id,
              type: "DEPOSIT",
              amount: REFERRAL_BONUS,
              description: `Реферальный бонус за приглашение ${body.username}`,
            },
          });

          await tx.user.update({
            where: { id: referrer.id },
            data: {
              referralCount: { increment: 1 },
              referralBonus: { increment: REFERRAL_BONUS },
            },
          });

          await tx.referralReward.create({
            data: {
              referrerId: referrer.id,
              referredId: user.id,
              bonusAmount: REFERRAL_BONUS,
            },
          });
        });
      }
    }

    return ok({ user });
  } catch (err) {
    return fail(err);
  }
}
