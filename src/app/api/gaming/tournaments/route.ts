import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser } from "@/lib/api-helpers";

const postSchema = z.object({
  chatId: z.string().optional(),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  game: z.string().min(1).max(50),
  maxPlayers: z.number().int().min(2).max(256).optional(),
  startTime: z.string().datetime(),
  prizePool: z.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const game = searchParams.get("game");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 100);

    const where: Record<string, unknown> = {};
    if (game) where.game = game;
    if (status) where.status = status;

    const tournaments = await prisma.tournament.findMany({
      where,
      orderBy: [{ startTime: "asc" }],
      take: limit,
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { participants: true } },
      },
    });

    return ok({
      tournaments: tournaments.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        game: t.game,
        maxPlayers: t.maxPlayers,
        startTime: t.startTime.toISOString(),
        status: t.status,
        prizePool: t.prizePool,
        createdAt: t.createdAt.toISOString(),
        creator: t.creator,
        participantCount: t._count.participants,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const body = await parseJson(req, postSchema);

    const tournament = await prisma.tournament.create({
      data: {
        creatorId: currentUser!.id,
        chatId: body.chatId ?? null,
        title: body.title,
        description: body.description ?? null,
        game: body.game,
        maxPlayers: body.maxPlayers ?? 16,
        startTime: new Date(body.startTime),
        prizePool: body.prizePool ?? null,
      },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    return ok({
      tournament: {
        ...tournament,
        startTime: tournament.startTime.toISOString(),
        createdAt: tournament.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return fail(err);
  }
}
