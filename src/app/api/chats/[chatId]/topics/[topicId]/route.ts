/**
 * PATCH  /api/chats/[chatId]/topics/[topicId] — update topic
 * DELETE /api/chats/[chatId]/topics/[topicId] — delete topic
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, noContent, parseJson, HttpError } from "@/lib/api-helpers";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  icon: z.string().max(10).nullable().optional(),
  isPinned: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string; topicId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { chatId, topicId } = await params;
    const body = await parseJson(req, updateSchema);

    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!meP || (meP.role !== "OWNER" && meP.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    const existing = await prisma.forumTopic.findFirst({
      where: { id: topicId, chatId },
    });
    if (!existing) throw new HttpError(404, "topic_not_found");

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.isPinned !== undefined) data.isPinned = body.isPinned;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    const topic = await prisma.forumTopic.update({
      where: { id: topicId },
      data,
    });

    return ok({ topic });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string; topicId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { chatId, topicId } = await params;

    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!meP || (meP.role !== "OWNER" && meP.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    const existing = await prisma.forumTopic.findFirst({
      where: { id: topicId, chatId },
    });
    if (!existing) throw new HttpError(404, "topic_not_found");

    // Unlink messages before deleting topic
    await prisma.message.updateMany({
      where: { forumTopicId: topicId },
      data: { forumTopicId: null },
    });

    await prisma.forumTopic.delete({ where: { id: topicId } });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
