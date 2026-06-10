/**
 * GET  /api/marketplace — list published listings, filter by type/category, sort
 * POST /api/marketplace — create listing
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError, created, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const sortBy = searchParams.get("sortBy") ?? "newest"; // rating | downloads | newest | price_asc | price_desc | name

    const where: Record<string, unknown> = { isPublished: true };
    if (type && type !== "all") where.type = type;
    if (category && category !== "all") where.category = category;

    let orderBy: Record<string, string>;
    switch (sortBy) {
      case "rating":
        orderBy = { rating: "desc" };
        break;
      case "downloads":
        orderBy = { downloads: "desc" };
        break;
      case "price_asc":
        orderBy = { price: "asc" };
        break;
      case "price_desc":
        orderBy = { price: "desc" };
        break;
      case "name":
        orderBy = { title: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const listings = await prisma.marketplaceListing.findMany({
      where,
      orderBy,
      include: {
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { reviews: true, purchases: true } },
      },
    });

    return ok({ listings });
  } catch (err) {
    return fail(err);
  }
}

const createListingSchema = z.object({
  type: z.enum(["sticker_pack", "template", "course", "bot", "mini_app", "digital_good"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  price: z.number().int().min(0),
  imageUrl: z.string().url().optional().nullable(),
  category: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const body = await parseJson(req, createListingSchema);

    const listing = await prisma.marketplaceListing.create({
      data: {
        sellerId: user.id,
        type: body.type,
        title: body.title,
        description: body.description,
        price: body.price,
        imageUrl: body.imageUrl ?? null,
        category: body.category,
        isPublished: true,
      },
      include: {
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    return created({ listing });
  } catch (err) {
    return fail(err);
  }
}
