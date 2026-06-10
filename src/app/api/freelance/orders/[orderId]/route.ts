import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { orderId } = await params;
    const order = await prisma.freelanceOrder.findUnique({
      where: { id: orderId },
      include: {
        listing: { select: { id: true, title: true, category: true } },
        buyer: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        seller: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!order) throw new HttpError(404, "not_found");
    if (order.buyerId !== user!.id && order.sellerId !== user!.id) throw new HttpError(403, "forbidden");
    return ok({ order });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { orderId } = await params;
    const order = await prisma.freelanceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new HttpError(404, "not_found");

    const body = await req.json();
    const newStatus = body.status as string;
    if (!newStatus) throw new HttpError(400, "status_required");

    const validTransitions: Record<string, string[]> = {
      pending: ["accepted", "cancelled"],
      accepted: ["in_progress", "cancelled"],
      in_progress: ["completed", "disputed"],
    };

    const allowed = validTransitions[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new HttpError(400, `cannot_transition_from_${order.status}_to_${newStatus}`);
    }

    // Only seller can accept/complete, buyer can cancel/dispute, either can cancel from pending
    const isBuyer = order.buyerId === user!.id;
    const isSeller = order.sellerId === user!.id;

    if (newStatus === "accepted" && !isSeller) throw new HttpError(403, "only_seller_can_accept");
    if (newStatus === "completed" && !isSeller) throw new HttpError(403, "only_seller_can_complete");
    if (newStatus === "cancelled" && !isBuyer && order.status !== "pending") throw new HttpError(403, "only_buyer_can_cancel");
    if (newStatus === "disputed" && !isBuyer) throw new HttpError(403, "only_buyer_can_dispute");

    // If completed, release funds to seller. If cancelled from pending/accepted, refund buyer.
    await prisma.$transaction(async (tx) => {
      await tx.freelanceOrder.update({ where: { id: orderId }, data: { status: newStatus } });

      if (newStatus === "completed") {
        const sellerWallet = await tx.wallet.findUnique({ where: { userId: order.sellerId } });
        if (sellerWallet) {
          await tx.wallet.update({ where: { userId: order.sellerId }, data: { balance: { increment: order.price } } });
          await tx.transaction.create({
            data: { walletId: sellerWallet.id, type: "GIFT_RECEIVED", amount: order.price, description: `Оплата фриланса`, relatedId: orderId },
          });
        }
      }

      if (newStatus === "cancelled" && (order.status === "pending" || order.status === "accepted")) {
        const buyerWallet = await tx.wallet.findUnique({ where: { userId: order.buyerId } });
        if (buyerWallet) {
          await tx.wallet.update({ where: { userId: order.buyerId }, data: { balance: { increment: order.price } } });
          await tx.transaction.create({
            data: { walletId: buyerWallet.id, type: "DEPOSIT", amount: order.price, description: `Возврат фриланса`, relatedId: orderId },
          });
        }
      }
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
