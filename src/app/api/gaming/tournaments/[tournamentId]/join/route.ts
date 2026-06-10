import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);

    const { tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { participants: true } } },
    });

    if (!tournament) throw new HttpError(404, "tournament_not_found");
    if (tournament.status !== "upcoming") throw new HttpError(400, "tournament_not_upcoming");
    if (tournament._count.participants >= tournament.maxPlayers) {
      throw new HttpError(400, "tournament_full");
    }

    const existing = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId: currentUser!.id,
        },
      },
    });

    if (existing) throw new HttpError(400, "already_joined");

    const participant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId: currentUser!.id,
      },
    });

    return ok({ participant });
  } catch (err) {
    return fail(err);
  }
}
