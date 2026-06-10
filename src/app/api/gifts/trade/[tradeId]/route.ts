import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ tradeId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { tradeId } = await params;
    const trade = await prisma.giftTrade.findUnique({ where: { id: tradeId } });
    if (!trade) throw new HttpError(404, "not_found");
    if (trade.status !== "active") throw new HttpError(400, "trade_not_active");
    if (trade.sellerId === user!.id) throw new HttpError(400, "cannot_buy_own");

    // Check buyer balance
    const buyerWallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    if (!buyerWallet || buyerWallet.balance < trade.price) throw new HttpError(402, "insufficient_balance");

    const sellerWallet = await prisma.wallet.findUnique({ where: { userId: trade.sellerId } });
    if (!sellerWallet) throw new HttpError(500, "seller_wallet_not_found");

    await prisma.$transaction(async (tx) => {
      // Mark trade as sold
      await tx.giftTrade.update({
        where: { id: tradeId },
        data: { status: "sold", buyerId: user!.id },
      });

      // Transfer funds
      await tx.wallet.update({ where: { userId: user!.id }, data: { balance: { decrement: trade.price } } });
      await tx.wallet.update({ where: { userId: trade.sellerId }, data: { balance: { increment: trade.price } } });

      await tx.transaction.create({
        data: { walletId: buyerWallet.id, type: "GIFT_SENT", amount: -trade.price, description: `Покупка подарка: ${trade.giftType}`, relatedId: tradeId },
      });
      await tx.transaction.create({
        data: { walletId: sellerWallet.id, type: "GIFT_RECEIVED", amount: trade.price, description: `Продажа подарка: ${trade.giftType}`, relatedId: tradeId },
      });

      // Transfer gift ownership
      const gift = await tx.gift.findFirst({
        where: { receiverId: trade.sellerId, name: trade.giftType, status: { in: ["SENT", "ACCEPTED"] } },
      });
      if (gift) {
        await tx.gift.update({
          where: { id: gift.id },
          data: { receiverId: user!.id, senderId: trade.sellerId },
        });
      }
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ tradeId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { tradeId } = await params;
    const trade = await prisma.giftTrade.findUnique({ where: { id: tradeId } });
    if (!trade) throw new HttpError(404, "not_found");
    if (trade.sellerId !== user!.id) throw new HttpError(403, "forbidden");
    if (trade.status !== "active") throw new HttpError(400, "trade_not_active");

    await prisma.giftTrade.update({ where: { id: tradeId }, data: { status: "cancelled" } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
