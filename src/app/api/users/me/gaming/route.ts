import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser } from "@/lib/api-helpers";

const postSchema = z.object({
  gameUsername: z.string().max(50).nullable().optional(),
  platform: z.enum(["pc", "ps", "xbox", "mobile"]).nullable().optional(),
  games: z.array(z.string().max(50)).max(20).optional(),
  rank: z.string().max(50).nullable().optional(),
  lfg: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);

    const profile = await prisma.gamingProfile.findUnique({
      where: { userId: currentUser!.id },
    });

    return ok({ profile: profile ?? null });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const body = await parseJson(req, postSchema);

    const profile = await prisma.gamingProfile.upsert({
      where: { userId: currentUser!.id },
      create: {
        userId: currentUser!.id,
        gameUsername: body.gameUsername ?? null,
        platform: body.platform ?? null,
        games: body.games ?? [],
        rank: body.rank ?? null,
        lfg: body.lfg ?? false,
      },
      update: {
        ...(body.gameUsername !== undefined && { gameUsername: body.gameUsername }),
        ...(body.platform !== undefined && { platform: body.platform }),
        ...(body.games !== undefined && { games: body.games }),
        ...(body.rank !== undefined && { rank: body.rank }),
        ...(body.lfg !== undefined && { lfg: body.lfg }),
      },
    });

    return ok({ profile });
  } catch (err) {
    return fail(err);
  }
}
