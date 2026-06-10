/**
 * POST   /api/messages/[messageId]/pin   — закрепить
 * DELETE /api/messages/[messageId]/pin   — открепить
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { togglePinMessage } from "@/services/message-service";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { messageId } = await params;
    const dto = await togglePinMessage({ messageId, userId: user.id, pin: true });
    return ok({ message: dto });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { messageId } = await params;
    const dto = await togglePinMessage({ messageId, userId: user.id, pin: false });
    return ok({ message: dto });
  } catch (err) {
    return fail(err);
  }
}
