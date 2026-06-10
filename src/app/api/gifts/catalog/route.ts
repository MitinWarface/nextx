/**
 * GET  /api/gifts/catalog — list available gifts
 * GET  /api/gifts/catalog?rarity=rare — filter by rarity
 */
import { NextRequest, NextResponse } from "next/server";
import { GIFT_CATALOG, formatPrice } from "@/lib/gift-catalog";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rarity = searchParams.get("rarity");

  let catalog = GIFT_CATALOG.map((g) => ({
    ...g,
    label: formatPrice(g.price),
  }));

  if (rarity && ["common", "rare", "epic", "legendary"].includes(rarity)) {
    catalog = catalog.filter((g) => g.rarity === rarity);
  }

  return NextResponse.json({ catalog });
}

export const dynamic = "force-dynamic";
