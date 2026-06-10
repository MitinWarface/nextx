/**
 * GET  /api/users/me/message-collections — list all collections with item counts
 * POST /api/users/me/message-collections — create collection (name, emoji)
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, parseJson, requireUser } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().max(10).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const collections = await prisma.messageCollection.findMany({
      where: { userId: user!.id },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    });

    return ok({ collections });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const body = await parseJson(req, createSchema);
    const collection = await prisma.messageCollection.create({
      data: {
        userId: user!.id,
        name: body.name,
        emoji: body.emoji,
      },
    });

    return created({ collection });
  } catch (err) {
    return fail(err);
  }
}