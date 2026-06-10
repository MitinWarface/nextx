/**
 * POST /api/marketplace/[listingId]/purchase — purchase listing, deduct NC from wallet, increment downloads
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { listingId } = await params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId, isPublished: true },
      select: { id: true, price: true, sellerId: true },
    });
    if (!listing) throw new HttpError(404, "listing_not_found");
    if (listing.sellerId === user.id) throw new HttpError(400, "cannot_buy_own_listing");

    // Check for existing purchase
    const existingPurchase = await prisma.marketplacePurchase.findUnique({
      where: { listingId_userId: { listingId, userId: user.id } },
    });
    if (existingPurchase) throw new HttpError(400, "already_purchased");

    // Get wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      select: { id: true, balance: true },
    });
    if (!wallet) throw new HttpError(400, "wallet_not_found");
    if (wallet.balance < listing.price) throw new HttpError(400, "insufficient_balance");

    // Atomic: deduct balance, create purchase, increment downloads
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: listing.price } },
      }),
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amount: -listing.price,
          description: `Purchase: ${listingId}`,
        },
      }),
      prisma.marketplacePurchase.create({
        data: { listingId, userId: user.id, amount: listing.price },
      }),
      prisma.marketplaceListing.update({
        where: { id: listingId },
        data: { downloads: { increment: 1 } },
      }),
    ]);

    return ok({ success: true });
  } catch (err) {
    return fail(err);
  }
}
