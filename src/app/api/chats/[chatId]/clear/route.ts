/**
 * POST /api/chats/:chatId/clear — clear chat history (soft-delete all messages for current user only)
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

    const participant = await prisma.participant.findFirst({
      where: { chatId, userId: user.id },
    });
    if (!participant) throw new HttpError(403, "not_participant");

    // Add current user to deletedByUserIds for all messages in the chat
    await prisma.$executeRaw`
      UPDATE "Message"
      SET "deletedByUserIds" = CASE
        WHEN ${user.id} = ANY("deletedByUserIds") THEN "deletedByUserIds"
        ELSE array_append("deletedByUserIds", ${user.id})
      END
      WHERE "chatId" = ${chatId}
        AND NOT (${user.id} = ANY("deletedByUserIds"))
    `;

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
