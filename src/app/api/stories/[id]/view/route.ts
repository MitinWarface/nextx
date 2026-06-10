/**
 * POST /api/stories/[id]/view — пометить story просмотренной
 */
import type { NextRequest } from "next/server";
import { ok, fail, requireUser } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";
import { markStoryViewed } from "@/services/story-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { id } = await params;
    await markStoryViewed(id, user.id);
    return ok({ viewed: true });
  } catch (err) {
    return fail(err);
  }
}
