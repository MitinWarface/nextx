import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const giftType = searchParams.get("giftType");
    const sort = searchParams.get("sort") ?? "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

    const where: any = { status: "active" };
    if (giftType) where.giftType = giftType;

    const orderBy = sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
        ? { price: "desc" as const }
        : { createdAt: "desc" as const };

    const [trades, total] = await Promise.all([
      prisma.giftTrade.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          seller: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
      prisma.giftTrade.count({ where }),
    ]);

    return ok({ trades, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await req.json();
    const { giftType, price } = body as { giftType: string; price: number };
    if (!giftType) throw new HttpError(400, "giftType_required");
    if (!price || price <= 0) throw new HttpError(400, "invalid_price");

    // Verify user owns this gift type (received it)
    const gift = await prisma.gift.findFirst({
      where: { receiverId: user!.id, name: giftType, status: { in: ["SENT", "ACCEPTED"] } },
    });
    if (!gift) throw new HttpError(400, "gift_not_owned");

    // Check if already listed
    const existing = await prisma.giftTrade.findFirst({
      where: { sellerId: user!.id, giftType, status: "active" },
    });
    if (existing) throw new HttpError(409, "already_listed");

    const trade = await prisma.giftTrade.create({
      data: { sellerId: user!.id, giftType, price, status: "active" },
    });

    return created({ trade });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
