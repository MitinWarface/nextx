/**
 * PATCH  /api/messages/[messageId]  — редактировать
 * DELETE /api/messages/[messageId]  — пометить удалённым
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { deleteMessage, editMessage } from "@/services/message-service";
import { fail, ok, parseJson, requireUser } from "@/lib/api-helpers";

const editSchema = z.object({
  content: z.string().min(1).max(8000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { messageId } = await params;
    const body = await parseJson(req, editSchema);
    const message = await editMessage({
      messageId,
      userId: user!.id,
      content: body.content,
    });
    return ok({ message });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { messageId } = await params;
    await deleteMessage({ messageId, userId: user!.id });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
