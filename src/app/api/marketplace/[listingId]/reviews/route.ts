/**
 * GET  /api/marketplace/[listingId]/reviews — list reviews
 * POST /api/marketplace/[listingId]/reviews — leave review { rating, comment? }
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError, created, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  try {
    const { listingId } = await params;

    const reviews = await prisma.marketplaceReview.findMany({
      where: { listingId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    return ok({ reviews });
  } catch (err) {
    return fail(err);
  }
}

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { listingId } = await params;
    const body = await parseJson(req, createReviewSchema);

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!listing) throw new HttpError(404, "listing_not_found");

    const review = await prisma.marketplaceReview.upsert({
      where: { listingId_userId: { listingId, userId: user.id } },
      update: { rating: body.rating, comment: body.comment },
      create: { listingId, userId: user.id, rating: body.rating, comment: body.comment },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Recalculate average rating
    const stats = await prisma.marketplaceReview.aggregate({
      where: { listingId },
      _avg: { rating: true },
    });
    await prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { rating: stats._avg.rating ?? 0 },
    });

    return created({ review });
  } catch (err) {
    return fail(err);
  }
}
