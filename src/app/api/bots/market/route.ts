/**
 * GET /api/bots/market — list published bots with filters
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return fail({ status: 401, message: "unauthorized" });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") ?? "rating";

    const where: Record<string, unknown> = {
      isPublished: true,
      isActive: true,
    };

    if (category && category !== "all") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy =
      sort === "installs"
        ? { installCount: "desc" as const }
        : { rating: "desc" as const };

    const bots = await prisma.bot.findMany({
      where,
      orderBy,
      take: 100,
      select: {
        id: true,
        name: true,
        username: true,
        description: true,
        longDescription: true,
        avatarUrl: true,
        category: true,
        installCount: true,
        rating: true,
        screenshots: true,
        createdAt: true,
        creator: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    return ok({ bots });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
