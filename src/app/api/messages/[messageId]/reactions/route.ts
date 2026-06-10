/**
 * POST   /api/messages/[messageId]/reactions  — добавить реакцию
 * DELETE /api/messages/[messageId]/reactions  — удалить реакцию
 *   Тело: { emoji: string }
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError, requireUser } from "@/lib/api-helpers";
import { addReaction, removeReaction } from "@/services/reaction-service";
import { getUserFeatures } from "@/lib/premium";
import { isFreeEmoji } from "@/lib/emoji-sets";

const reactionSchema = z.object({
  emoji: z.string().min(1).max(16),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { messageId } = await params;
    const body = await parseJson(req, reactionSchema);

    // Premium gate: free users can only use 16 common emojis
    const features = await getUserFeatures(user.id);
    if (!features.includes("premium_reactions") && !isFreeEmoji(body.emoji)) {
      throw new HttpError(403, "Этот эмодзи доступен только в Premium");
    }

    const summary = await addReaction({
      messageId,
      userId: user.id,
      emoji: body.emoji,
    });
    return ok({ reactions: summary });
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
    const body = await parseJson(req, reactionSchema);
    const summary = await removeReaction({
      messageId,
      userId: user.id,
      emoji: body.emoji,
    });
    return ok({ reactions: summary });
  } catch (err) {
    return fail(err);
  }
}
