/**
 * GET /api/mini-apps — list published mini apps (public catalog)
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const sortBy = searchParams.get("sortBy") ?? "newest"; // rating | installs | newest | name

    const where: Record<string, unknown> = { isPublished: true };
    if (category && category !== "all") {
      where.miniAppCategory = category;
    }

    let orderBy: Record<string, string>;
    switch (sortBy) {
      case "rating":
        orderBy = { miniAppRating: "desc" };
        break;
      case "installs":
        orderBy = { miniAppInstalls: "desc" };
        break;
      case "name":
        orderBy = { name: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const apps = await prisma.developerApp.findMany({
      where,
      orderBy,
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
      },
    });

    return ok({ apps });
  } catch (err) {
    return fail(err);
  }
}
