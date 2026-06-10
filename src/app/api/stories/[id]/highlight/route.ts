/**
 * PUT  /api/stories/[id]/highlight  — поставить/снять highlight
 *   Body: { name?: string | null }   null = убрать из highlights
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const schema = z.object({
  name: z.string().min(1).max(64).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { id } = await ctx.params;
    const body = await parseJson(req, schema);

    const story = await prisma.story.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!story) throw new HttpError(404, "story_not_found");
    if (story.authorId !== user!.id) {
      throw new HttpError(403, "can_highlight_only_own_story");
    }

    const updated = await prisma.story.update({
      where: { id },
      data: { highlightName: body.name ?? "Highlights" },
      select: { id: true, highlightName: true },
    });
    return ok({ story: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { id } = await ctx.params;
    const story = await prisma.story.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!story) throw new HttpError(404, "story_not_found");
    if (story.authorId !== user!.id) {
      throw new HttpError(403, "can_highlight_only_own_story");
    }
    const updated = await prisma.story.update({
      where: { id },
      data: { highlightName: null },
      select: { id: true, highlightName: true },
    });
    return ok({ story: updated });
  } catch (err) {
    return fail(err);
  }
}
