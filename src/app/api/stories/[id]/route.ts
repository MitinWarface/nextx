/**
 * DELETE /api/stories/[id] — удалить story (только автор)
 */
import type { NextRequest } from "next/server";
import { ok, fail, requireUser } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";
import { deleteStory } from "@/services/story-service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { id } = await params;
    const ok2 = await deleteStory(id, user.id);
    if (!ok2) return fail(new Error("not_found_or_forbidden"));
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}
