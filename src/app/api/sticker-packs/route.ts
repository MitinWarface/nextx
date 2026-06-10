/**
 * GET  /api/sticker-packs        — list public packs + my packs
 * POST /api/sticker-packs        — create a pack
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";

const createPackSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  emoji: z.string().max(4).optional(),
  isPublic: z.boolean().optional(),
  isPremium: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const isPremium = await hasFeature(user!.id, "premium_stickers");
    const packs = await prisma.stickerPack.findMany({
      where: {
        OR: [
          { isPublic: true, isPremium: false },
          { isPublic: true, isPremium: true, authorId: user!.id },
          { authorId: user!.id },
          ...(isPremium ? [{ isPublic: true, isPremium: true }] : []),
        ],
      },
      include: {
        stickers: { orderBy: { createdAt: "asc" } },
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({ packs });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await parseJson(req, createPackSchema);

    if (body.isPremium) {
      const isPremium = await hasFeature(user!.id, "premium_stickers");
      if (!isPremium) {
        throw new HttpError(403, "premium_required");
      }
    }

    const pack = await prisma.stickerPack.create({
      data: {
        name: body.name,
        description: body.description,
        emoji: body.emoji,
        isPublic: body.isPublic ?? false,
        isPremium: body.isPremium ?? false,
        authorId: user!.id,
      },
    });

    return ok({ pack });
  } catch (err) {
    return fail(err);
  }
}
