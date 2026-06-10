/**
 * POST /api/chats/[chatId]/read — пометить все сообщения чата прочитанными
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markAsRead } from "@/services/message-service";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;
    const result = await markAsRead({ chatId, userId: user!.id });
    return ok(result);
  } catch (err) {
    return fail(err);
  }
}
