/**
 * POST /api/gifts — send a gift
 * GET  /api/gifts — list my sent/received gifts
 * GET  /api/gifts?rarity=rare — filter by rarity
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";
import { GIFT_CATALOG } from "@/lib/gift-catalog";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { searchParams } = new URL(req.url);
    const rarity = searchParams.get("rarity");

    const rarityFilter = rarity && ["common", "rare", "epic", "legendary"].includes(rarity)
      ? { name: { in: GIFT_CATALOG.filter((g) => g.rarity === rarity).map((g) => g.name) } }
      : {};

    const [sent, received] = await Promise.all([
      prisma.gift.findMany({
        where: { senderId: user!.id, ...rarityFilter },
        include: { receiver: { select: { id: true, displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.gift.findMany({
        where: { receiverId: user!.id, ...rarityFilter },
        include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return ok({ sent, received });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const receiverId = body.receiverId as string;
    const giftType = body.giftType as string;
    const message = (body.message as string) ?? null;

    if (!receiverId || !giftType) {
      throw new HttpError(400, "receiverId and giftType required");
    }

    const giftDef = GIFT_CATALOG.find((g) => g.name === giftType);
    if (!giftDef) throw new HttpError(400, "unknown_gift_type");

    // Check supply limit for limited edition gifts
    if (giftDef.isLimited && giftDef.totalSupply !== null) {
      const mintedCount = await prisma.gift.count({
        where: { name: giftDef.name },
      });
      if (mintedCount >= giftDef.totalSupply) {
        throw new HttpError(410, "gift_sold_out");
      }
    }

    // Check balance
    const wallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    if (!wallet || wallet.balance < giftDef.price) {
      throw new HttpError(402, "insufficient_balance");
    }

    // Create gift + deduct balance
    const gift = await prisma.$transaction(async (tx) => {
      const g = await tx.gift.create({
        data: {
          senderId: user!.id,
          receiverId,
          name: giftDef.name,
          emoji: giftDef.emoji,
          price: giftDef.price,
          rarity: giftDef.rarity,
          isLimited: giftDef.isLimited,
          totalSupply: giftDef.totalSupply,
          type: body.exclusive ? "EXCLUSIVE" : "STANDARD",
          message,
        },
      });

      await tx.wallet.update({ where: { userId: user!.id }, data: { balance: { decrement: giftDef.price } } });
      await tx.transaction.create({
        data: { walletId: wallet.id, type: "GIFT_SENT", amount: -giftDef.price, description: `Подарок: ${giftDef.emoji} ${giftDef.name}`, relatedId: g.id },
      });

      // Credit receiver
      const receiverWallet = await tx.wallet.findUnique({ where: { userId: receiverId } });
      if (receiverWallet) {
        await tx.wallet.update({ where: { userId: receiverId }, data: { balance: { increment: giftDef.price } } });
        await tx.transaction.create({
          data: { walletId: receiverWallet.id, type: "GIFT_RECEIVED", amount: giftDef.price, description: `Получен подарок: ${giftDef.emoji} ${giftDef.name}`, relatedId: g.id },
        });
      }

      return g;
    });

    // Notify via socket
    const io = (globalThis as any).__ioInstance;
    if (io) {
      io.to(`user:${receiverId}`).emit("gift:received", {
        id: gift.id,
        emoji: gift.emoji,
        name: gift.name,
        rarity: gift.rarity,
        senderName: user!.displayName,
        message,
      });
    }

    return ok({ gift });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  // Accept/reject a gift
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const giftId = body.giftId as string;
    const action = body.action as string;

    if (!giftId || !action) throw new HttpError(400, "giftId and action required");
    if (action !== "ACCEPTED" && action !== "REJECTED") {
      throw new HttpError(400, "action must be ACCEPTED or REJECTED");
    }

    const gift = await prisma.gift.findFirst({
      where: { id: giftId, receiverId: user!.id, status: "SENT" },
    });
    if (!gift) throw new HttpError(404, "gift_not_found");

    await prisma.gift.update({ where: { id: giftId }, data: { status: action } });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
