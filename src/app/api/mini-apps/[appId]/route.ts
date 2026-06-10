/**
 * GET /api/mini-apps/[appId] — get mini app details (public)
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await params;

    const app = await prisma.developerApp.findUnique({
      where: { id: appId },
      select: {
        id: true,
        name: true,
        description: true,
        miniAppUrl: true,
        miniAppIcon: true,
        miniAppDescription: true,
        miniAppCategory: true,
        miniAppScreenshots: true,
        miniAppRating: true,
        miniAppInstalls: true,
        miniAppVersion: true,
        isPublished: true,
        createdAt: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!app) throw new HttpError(404, "app_not_found");

    return ok({ app });
  } catch (err) {
    return fail(err);
  }
}
