/**
 * POST /api/chats/:chatId/archive — toggle archive for current user's participant
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!currentUser) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;

    const participant = await prisma.participant.findFirst({
      where: { chatId, userId: currentUser.id },
    });
    if (!participant) throw new HttpError(403, "not_participant");

    const newArchived = !participant.isArchived;

    await prisma.participant.update({
      where: { id: participant.id },
      data: { isArchived: newArchived },
    });

    return ok({ ok: true, isArchived: newArchived });
  } catch (err) {
    return fail(err);
  }
}
