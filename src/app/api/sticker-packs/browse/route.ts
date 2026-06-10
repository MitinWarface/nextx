import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const premium = searchParams.get("premium"); // "true" | "false" | null (all)
    const sortBy = searchParams.get("sortBy") ?? "newest"; // newest | popular | name

    const where: Record<string, unknown> = { isPublic: true };
    if (premium === "true") where.isPremium = true;
    if (premium === "false") where.isPremium = false;

    let orderBy: Record<string, string>;
    switch (sortBy) {
      case "popular":
        orderBy = { createdAt: "desc" }; // fallback — no install count field
        break;
      case "name":
        orderBy = { name: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const packs = await prisma.stickerPack.findMany({
      where,
      orderBy,
      include: {
        _count: { select: { stickers: true } },
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    return ok({ packs });
  } catch (err) {
    return fail(err);
  }
}
