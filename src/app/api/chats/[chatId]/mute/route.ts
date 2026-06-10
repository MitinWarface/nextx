/**
 * POST /api/chats/:chatId/mute — mute/unmute a chat with optional duration
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError, requireUser } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { chatId } = await params;
    const { muted, durationMinutes } = await req.json();

    // Validate input
    if (typeof muted !== "boolean") throw new HttpError(400, "invalid_muted");
    if (durationMinutes !== undefined && durationMinutes !== null) {
      if (typeof durationMinutes !== "number" || durationMinutes < 0 || !Number.isFinite(durationMinutes)) {
        throw new HttpError(400, "invalid_duration");
      }
    }

    const participant = await prisma.participant.findFirst({
      where: { chatId, userId: user.id },
    });
    if (!participant) throw new HttpError(403, "not_participant");

    const mutedUntil = muted && durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000)
      : null;

    await prisma.participant.update({
      where: { id: participant.id },
      data: {
        isMuted: !!muted,
        mutedUntil,
      },
    });

    return ok({ ok: true, muted: !!muted, mutedUntil });
  } catch (err) {
    return fail(err);
  }
}
