/**
 * PATCH /api/app-reviews/[reviewId] — update review
 * DELETE /api/app-reviews/[reviewId] — delete review
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError, noContent, requireUser } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { reviewId } = await params;

    const existing = await prisma.appReview.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, appId: true },
    });
    if (!existing) throw new HttpError(404, "review_not_found");
    if (existing.userId !== user.id) throw new HttpError(403, "forbidden");

    const body = await parseJson(req, updateReviewSchema);

    const review = await prisma.appReview.update({
      where: { id: reviewId },
      data: {
        ...(body.rating !== undefined && { rating: body.rating }),
        ...(body.comment !== undefined && { comment: body.comment }),
      },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    const stats = await prisma.appReview.aggregate({
      where: { appId: existing.appId },
      _avg: { rating: true },
    });
    await prisma.developerApp.update({
      where: { id: existing.appId },
      data: { miniAppRating: stats._avg.rating ?? 0 },
    });

    return ok({ review });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { reviewId } = await params;

    const existing = await prisma.appReview.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, appId: true },
    });
    if (!existing) throw new HttpError(404, "review_not_found");
    if (existing.userId !== user.id) throw new HttpError(403, "forbidden");

    await prisma.appReview.delete({ where: { id: reviewId } });

    const stats = await prisma.appReview.aggregate({
      where: { appId: existing.appId },
      _avg: { rating: true },
    });
    await prisma.developerApp.update({
      where: { id: existing.appId },
      data: { miniAppRating: stats._avg.rating ?? 0 },
    });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}
