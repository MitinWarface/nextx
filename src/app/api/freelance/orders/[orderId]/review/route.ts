import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { orderId } = await params;
    const order = await prisma.freelanceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new HttpError(404, "not_found");
    if (order.status !== "completed") throw new HttpError(400, "order_not_completed");
    if (order.buyerId !== user!.id) throw new HttpError(403, "only_buyer_can_review");

    const existing = await prisma.freelanceReview.findUnique({ where: { orderId_userId: { orderId, userId: user!.id } } });
    if (existing) throw new HttpError(409, "already_reviewed");

    const body = await req.json();
    const { rating, comment } = body as { rating: number; comment?: string };
    if (!rating || rating < 1 || rating > 5) throw new HttpError(400, "invalid_rating");

    const review = await prisma.$transaction(async (tx) => {
      const r = await tx.freelanceReview.create({
        data: { orderId, userId: user!.id, rating, comment: comment ?? null },
      });

      // Update listing average rating
      const stats = await tx.freelanceReview.aggregate({
        where: { order: { listingId: order.listingId } },
        _avg: { rating: true },
      });
      const avgRating = stats._avg.rating ?? 0;
      await tx.freelanceListing.update({ where: { id: order.listingId }, data: { rating: avgRating } });

      return r;
    });

    return created({ review });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
