import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        isViewOnce: true,
        isDeleted: true,
        chatId: true,
        senderId: true,
        type: true,
      },
    });
    if (!message) throw new HttpError(404, "message_not_found");
    if (!message.isViewOnce) throw new HttpError(400, "not_view_once");
    if (message.isDeleted) throw new HttpError(410, "already_viewed");

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: message.chatId, userId: me.id } },
      select: { id: true },
    });
    if (!participant) throw new HttpError(403, "not_a_participant");

    // Soft-delete the message after viewing
    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return ok({ success: true });
  } catch (err) {
    return fail(err);
  }
}
