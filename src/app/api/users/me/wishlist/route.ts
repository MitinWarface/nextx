/**
 * GET    /api/users/me/wishlist — get wishlist
 * POST   /api/users/me/wishlist — add to wishlist
 * DELETE /api/users/me/wishlist — remove from wishlist
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { GIFT_CATALOG } from "@/lib/gift-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const items = await prisma.wishlistItem.findMany({
      where: { userId: user!.id },
      orderBy: { addedAt: "desc" },
    });

    const wishlist = items.map((item) => {
      const giftDef = GIFT_CATALOG.find((g) => g.name === item.giftType);
      return {
        giftName: item.giftType,
        emoji: giftDef?.emoji ?? "🎁",
        price: giftDef?.price ?? 0,
        rarity: giftDef?.rarity ?? "common",
        addedAt: item.addedAt.toISOString(),
      };
    });

    return ok({ wishlist });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const body = await parseJson(
      req,
      z.object({ giftName: z.string().min(1) })
    );

    const giftDef = GIFT_CATALOG.find((g) => g.name === body.giftName);
    if (!giftDef) throw new HttpError(400, "unknown_gift_type");

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_giftType: { userId: user!.id, giftType: body.giftName } },
    });

    if (existing) {
      throw new HttpError(409, "already_in_wishlist");
    }

    await prisma.wishlistItem.create({
      data: { userId: user!.id, giftType: body.giftName },
    });

    const items = await prisma.wishlistItem.findMany({
      where: { userId: user!.id },
      orderBy: { addedAt: "desc" },
    });

    const wishlist = items.map((item) => {
      const def = GIFT_CATALOG.find((g) => g.name === item.giftType);
      return {
        giftName: item.giftType,
        emoji: def?.emoji ?? "🎁",
        price: def?.price ?? 0,
        rarity: def?.rarity ?? "common",
        addedAt: item.addedAt.toISOString(),
      };
    });

    return ok({ wishlist });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { searchParams } = new URL(req.url);
    const giftName = searchParams.get("giftName");
    if (!giftName) throw new HttpError(400, "giftName_required");

    await prisma.wishlistItem.deleteMany({
      where: { userId: user!.id, giftType: giftName },
    });

    const items = await prisma.wishlistItem.findMany({
      where: { userId: user!.id },
      orderBy: { addedAt: "desc" },
    });

    const wishlist = items.map((item) => {
      const def = GIFT_CATALOG.find((g) => g.name === item.giftType);
      return {
        giftName: item.giftType,
        emoji: def?.emoji ?? "🎁",
        price: def?.price ?? 0,
        rarity: def?.rarity ?? "common",
        addedAt: item.addedAt.toISOString(),
      };
    });

    return ok({ wishlist });
  } catch (err) {
    return fail(err);
  }
}
