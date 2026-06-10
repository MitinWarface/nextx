/**
 * POST /api/messages/trash/[messageId]/restore — restore deleted message
 * DELETE /api/messages/trash/[messageId] — permanently delete
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { publishNewMessage } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const { messageId } = await params;
    const userId = user.id as string;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { deletedByUserIds: true, chatId: true },
    });
    if (!message) throw new HttpError(404, "not_found");
    if (!message.deletedByUserIds.includes(userId)) {
      throw new HttpError(400, "not_deleted");
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedByUserIds: message.deletedByUserIds.filter((id) => id !== userId) },
    });

    await publishNewMessage(message.chatId, {
      _event: "restored",
      chatId: message.chatId,
      messageId,
    } as any);

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const { messageId } = await params;
    const userId = user.id as string;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { deletedByUserIds: true, chatId: true, mediaUrl: true, thumbnailUrl: true },
    });
    if (!message) throw new HttpError(404, "not_found");

    // Remove from user's trash
    const remaining = message.deletedByUserIds.filter((id) => id !== userId);

    if (remaining.length === 0) {
      // No one else has it in trash — hard delete
      if (message.mediaUrl) {
        try {
          const { deleteFile } = await import("@/lib/s3");
          const key = message.mediaUrl.startsWith("/uploads/") ? message.mediaUrl.slice(1) : message.mediaUrl;
          await deleteFile(key);
        } catch {}
      }
      if (message.thumbnailUrl) {
        try {
          const { deleteFile } = await import("@/lib/s3");
          const key = message.thumbnailUrl.startsWith("/uploads/") ? message.thumbnailUrl.slice(1) : message.thumbnailUrl;
          await deleteFile(key);
        } catch {}
      }
      await prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true, deletedAt: new Date(), content: null, mediaUrl: null, thumbnailUrl: null },
      });
    } else {
      // Others still have it — just remove from this user's list
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedByUserIds: remaining },
      });
    }

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
