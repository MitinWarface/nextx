/**
 * DELETE /api/scheduled/[messageId]  — cancel a scheduled message
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, isScheduled: true },
    });
    if (!message) throw new HttpError(404, "not_found");
    if (message.senderId !== user!.id) throw new HttpError(403, "forbidden");
    if (!message.isScheduled) throw new HttpError(400, "not_scheduled");

    await prisma.message.delete({ where: { id: messageId } });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
