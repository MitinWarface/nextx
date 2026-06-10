/**
 * GET  /api/app-reviews?appId=xxx — list reviews for an app
 * POST /api/app-reviews — leave a review { appId, rating: 1-5, comment? }
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError, created, requireUser } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get("appId");
    if (!appId) throw new HttpError(400, "appId_required");

    const reviews = await prisma.appReview.findMany({
      where: { appId },
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
  appId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const body = await parseJson(req, createReviewSchema);

    const app = await prisma.developerApp.findUnique({
      where: { id: body.appId },
      select: { id: true },
    });
    if (!app) throw new HttpError(404, "app_not_found");

    const review = await prisma.appReview.upsert({
      where: { appId_userId: { appId: body.appId, userId: user.id } },
      update: { rating: body.rating, comment: body.comment },
      create: { appId: body.appId, userId: user.id, rating: body.rating, comment: body.comment },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Recalculate average rating
    const stats = await prisma.appReview.aggregate({
      where: { appId: body.appId },
      _avg: { rating: true },
    });
    await prisma.developerApp.update({
      where: { id: body.appId },
      data: { miniAppRating: stats._avg.rating ?? 0 },
    });

    return created({ review });
  } catch (err) {
    return fail(err);
  }
}
