/**
 * POST /api/mini-apps/[appId]/launch — increment install count, return miniAppUrl
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await params;

    const app = await prisma.developerApp.findUnique({
      where: { id: appId, isPublished: true },
      select: { id: true, miniAppUrl: true },
    });

    if (!app) throw new HttpError(404, "app_not_found");
    if (!app.miniAppUrl) throw new HttpError(400, "mini_app_url_missing");

    await prisma.developerApp.update({
      where: { id: appId },
      data: { miniAppInstalls: { increment: 1 } },
    });

    return ok({ miniAppUrl: app.miniAppUrl });
  } catch (err) {
    return fail(err);
  }
}
