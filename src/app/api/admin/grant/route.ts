import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const baseSchema = z.object({
  userId: z.string().min(1),
  type: z.enum([
    "balance",
    "premium",
    "gift",
    "sticker_pack",
    "achievement",
    "badge",
    "frame",
    "background",
    "spin",
  ]),
});

const balanceSchema = baseSchema.extend({
  type: z.literal("balance"),
  amount: z.number().int(),
  reason: z.string().optional(),
});

const premiumSchema = baseSchema.extend({
  type: z.literal("premium"),
  planId: z.string().min(1),
  durationDays: z.number().int().positive().optional(),
});

const giftSchema = baseSchema.extend({
  type: z.literal("gift"),
  giftType: z.string().min(1),
  amount: z.number().int().positive().optional(),
});

const stickerPackSchema = baseSchema.extend({
  type: z.literal("sticker_pack"),
  packId: z.string().min(1),
});

const achievementSchema = baseSchema.extend({
  type: z.literal("achievement"),
  code: z.string().min(1),
});

const badgeSchema = baseSchema.extend({
  type: z.literal("badge"),
  badgeName: z.string().min(1),
});

const frameSchema = baseSchema.extend({
  type: z.literal("frame"),
  frameId: z.string().min(1),
});

const backgroundSchema = baseSchema.extend({
  type: z.literal("background"),
  bgId: z.string().min(1),
});

const spinSchema = baseSchema.extend({
  type: z.literal("spin"),
});

function parseGrantBody(body: any) {
  const type = body?.type;
  switch (type) {
    case "balance":
      return balanceSchema.parse(body);
    case "premium":
      return premiumSchema.parse(body);
    case "gift":
      return giftSchema.parse(body);
    case "sticker_pack":
      return stickerPackSchema.parse(body);
    case "achievement":
      return achievementSchema.parse(body);
    case "badge":
      return badgeSchema.parse(body);
    case "frame":
      return frameSchema.parse(body);
    case "background":
      return backgroundSchema.parse(body);
    case "spin":
      return spinSchema.parse(body);
    default:
      throw new HttpError(400, "invalid_grant_type");
  }
}

async function handleGrant(adminId: string, body: any) {
  const parsed = parseGrantBody(body);
  const { userId, type } = parsed;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, displayName: true },
  });
  if (!user) throw new HttpError(404, "user_not_found");

  const details: Record<string, unknown> = { type, username: user.username };

  switch (type) {
    case "balance": {
      const { amount, reason } = parsed;
      let wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await prisma.wallet.create({ data: { userId, balance: 0 } });
      }
      const newBalance = wallet.balance + amount;
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });
      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          amount,
          description: reason ?? `Admin grant: +${amount} NC`,
        },
      });
      await prisma.economyLog.create({
        data: {
          userId,
          type: "earn",
          source: "admin",
          amount,
          balance: newBalance,
          details: reason ?? `Admin grant`,
        },
      });
      details.amount = amount;
      details.reason = reason;
      details.newBalance = newBalance;
      break;
    }
    case "premium": {
      const { planId, durationDays } = parsed;
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) throw new HttpError(404, "plan_not_found");
      const days = durationDays ?? plan.durationDays;
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + days);
      await prisma.user.update({
        where: { id: userId },
        data: {
          premiumStatus: "active",
          premiumUntil,
          premiumPlanId: planId,
        },
      });
      details.planId = planId;
      details.planName = plan.name;
      details.durationDays = days;
      details.premiumUntil = premiumUntil.toISOString();
      break;
    }
    case "gift": {
      const { giftType, amount } = parsed;
      const adminUser = await prisma.user.findUnique({
        where: { id: adminId },
        select: { id: true },
      });
      if (!adminUser) throw new HttpError(400, "admin_user_not_found");

      let senderWallet = await prisma.wallet.findUnique({ where: { userId: adminId } });
      if (!senderWallet) {
        senderWallet = await prisma.wallet.create({ data: { userId: adminId, balance: 0 } });
      }

      // Look up gift in catalog by name
      const { GIFT_CATALOG } = await import("@/lib/gift-catalog");
      const catalogGift = GIFT_CATALOG.find((g) => g.name === giftType);
      const giftPrice = amount ?? catalogGift?.price ?? 0;
      const giftEmoji = catalogGift?.emoji ?? "🎁";
      const giftRarity = catalogGift?.rarity ?? "common";
      const giftIsLimited = catalogGift?.isLimited ?? false;
      const giftTotalSupply = catalogGift?.totalSupply ?? null;

      const gift = await prisma.gift.create({
        data: {
          senderId: adminId,
          receiverId: userId,
          type: "STANDARD",
          name: giftType,
          emoji: giftEmoji,
          price: giftPrice,
          rarity: giftRarity,
          isLimited: giftIsLimited,
          totalSupply: giftTotalSupply,
          mintedCount: 0,
          status: "ACCEPTED",
        },
      });

      if (giftPrice > 0) {
        await prisma.transaction.create({
          data: {
            walletId: senderWallet.id,
            type: "GIFT_SENT",
            amount: -giftPrice,
            description: `Admin gift to ${user.username}`,
            relatedId: gift.id,
          },
        });
      }

      details.giftType = giftType;
      details.giftId = gift.id;
      details.price = giftPrice;
      details.emoji = giftEmoji;
      details.rarity = giftRarity;
      break;
    }
    case "sticker_pack": {
      const { packId } = parsed;
      const pack = await prisma.stickerPack.findUnique({ where: { id: packId } });
      if (!pack) throw new HttpError(404, "pack_not_found");

      const alreadyInstalled = await prisma.user.findUnique({
        where: { id: userId },
        select: { installedStickerPackIds: true },
      });
      const current = alreadyInstalled?.installedStickerPackIds ?? [];
      if (!current.includes(packId)) {
        await prisma.user.update({
          where: { id: userId },
          data: { installedStickerPackIds: [...current, packId] },
        });
      }
      details.packId = packId;
      details.packName = pack.name;
      break;
    }
    case "achievement": {
      const { code } = parsed;
      const achievement = await prisma.achievement.findUnique({ where: { code } });
      if (!achievement) throw new HttpError(404, "achievement_not_found");

      await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: { userId, achievementId: achievement.id },
        },
        create: { userId, achievementId: achievement.id },
        update: {},
      });
      details.achievementCode = code;
      details.achievementName = achievement.name;
      break;
    }
    case "badge": {
      const { badgeName } = parsed;
      await prisma.user.update({
        where: { id: userId },
        data: { roleBadge: badgeName },
      });
      details.badgeName = badgeName;
      break;
    }
    case "frame": {
      const { frameId } = parsed;
      details.frameId = frameId;
      break;
    }
    case "background": {
      const { bgId } = parsed;
      details.bgId = bgId;
      break;
    }
    case "spin": {
      await prisma.spinHistory.create({
        data: {
          userId,
          reward: "admin_grant",
          amount: 1,
        },
      });
      details.spinGranted = true;
      break;
    }
  }

  await logAudit(adminId, "SETTINGS_CHANGE", `grant:${type}:${userId}`, details);

  return { ok: true, type, userId: user.id, username: user.username, details };
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const result = await handleGrant(admin.id, body);
    return ok(result);
  } catch (err) {
    return fail(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "50"));

    const where = { target: { startsWith: "grant:" } };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const grants = logs.map((log) => {
      const parts = log.target?.split(":") ?? [];
      return {
        id: log.id,
        type: parts[1] ?? "unknown",
        userId: parts[2] ?? "",
        details: log.details,
        actor: log.actor,
        createdAt: log.createdAt,
      };
    });

    return ok({ grants, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}
