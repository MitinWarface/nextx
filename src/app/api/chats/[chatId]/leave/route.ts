/**
 * POST /api/chats/:chatId/leave — leave a group chat
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

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type === "PRIVATE") throw new HttpError(400, "cannot_leave_private");
    if (chat.type === "SERVICE") throw new HttpError(403, "cannot_leave_service");
    if (chat.type === "SELF") throw new HttpError(403, "cannot_leave_self");

    const participant = await prisma.participant.findFirst({
      where: { chatId, userId: user.id },
    });
    if (!participant) throw new HttpError(403, "not_participant");
    if (participant.role === "OWNER") {
      // Transfer ownership to another admin or member before leaving
      const nextOwner = await prisma.participant.findFirst({
        where: { chatId, userId: { not: user.id } },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      });
      if (nextOwner) {
        await prisma.participant.update({
          where: { id: nextOwner.id },
          data: { role: "OWNER" },
        });
      } else {
        // Sole owner leaving — delete the chat entirely
        await prisma.chat.delete({ where: { id: chatId } });
        return ok({ ok: true, chatDeleted: true });
      }
    }

    await prisma.participant.delete({
      where: { id: participant.id },
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
