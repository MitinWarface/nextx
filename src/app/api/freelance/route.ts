import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") ?? "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

    const where: any = { isActive: true };
    if (type && ["offer", "request"].includes(type)) where.type = type;
    if (category && ["design", "development", "marketing", "video", "translation", "other"].includes(category)) where.category = category;

    const orderBy = sort === "rating" ? { rating: "desc" as const } : { createdAt: "desc" as const };

    const [listings, total] = await Promise.all([
      prisma.freelanceListing.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.freelanceListing.count({ where }),
    ]);

    return ok({ listings, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await req.json();
    const { type, category, title, description, price, portfolio } = body as {
      type: string;
      category: string;
      title: string;
      description: string;
      price?: string;
      portfolio?: string[];
    };

    if (!type || !["offer", "request"].includes(type)) throw new HttpError(400, "invalid_type");
    if (!category || !["design", "development", "marketing", "video", "translation", "other"].includes(category)) throw new HttpError(400, "invalid_category");
    if (!title || title.length < 3) throw new HttpError(400, "title_too_short");
    if (!description || description.length < 10) throw new HttpError(400, "description_too_short");

    const listing = await prisma.freelanceListing.create({
      data: {
        userId: user!.id,
        type,
        category,
        title,
        description,
        price: price ?? null,
        portfolio: portfolio ?? [],
        isActive: true,
      },
    });

    return created({ listing });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
