import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { listingId } = await params;
    const listing = await prisma.freelanceListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new HttpError(404, "not_found");
    if (!listing.isActive) throw new HttpError(400, "listing_inactive");
    if (listing.userId === user!.id) throw new HttpError(400, "cannot_order_own");

    const body = await req.json();
    const { description, price } = body as { description: string; price: number };
    if (!description || description.length < 5) throw new HttpError(400, "description_too_short");
    if (!price || price <= 0) throw new HttpError(400, "invalid_price");

    // Check buyer balance
    const buyerWallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    if (!buyerWallet || buyerWallet.balance < price) throw new HttpError(402, "insufficient_balance");

    // Create order and deduct balance (escrow)
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.freelanceOrder.create({
        data: {
          listingId,
          buyerId: user!.id,
          sellerId: listing.userId,
          description,
          price,
          status: "pending",
        },
      });

      await tx.wallet.update({ where: { userId: user!.id }, data: { balance: { decrement: price } } });
      await tx.transaction.create({
        data: { walletId: buyerWallet.id, type: "GIFT_SENT", amount: -price, description: `Фриланс заказ: ${listing.title}`, relatedId: o.id },
      });

      return o;
    });

    return created({ order });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
