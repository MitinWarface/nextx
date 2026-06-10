/**
 * POST /api/users/me/shop — purchase profile customization
 * Price is determined server-side from SHOP_CATALOG, not trusted from client.
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const SHOP_CATALOG: Record<string, Record<string, number>> = {
  themes: { sunset: 50, ocean: 50, forest: 50, neon: 100 },
  badges: { verified: 200, premium_star: 300 },
  reactions: { fire: 10, heart: 10, rocket: 15 },
};

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await parseJson(req, z.object({
      category: z.string(),
      itemId: z.string(),
    }));
    const { category, itemId } = body;

    if (!category || !itemId) throw new HttpError(400, "missing_fields");

    const serverPrice = SHOP_CATALOG[category]?.[itemId];
    if (serverPrice === undefined) {
      throw new HttpError(400, "unknown_item");
    }

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId: user.id as string },
    });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: user.id as string, balance: 0 },
      });
    }

    if (wallet.balance < serverPrice) {
      throw new HttpError(400, "insufficient_funds");
    }

    // Deduct balance + record transaction in a single update
    if (serverPrice > 0) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: serverPrice } },
      });

      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amount: serverPrice,
          description: `Магазин: ${category}/${itemId}`,
        },
      });
    }

    return ok({ ok: true, price: serverPrice });
  } catch (err) {
    return fail(err);
  }
}
