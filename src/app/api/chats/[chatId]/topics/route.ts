/**
 * GET    /api/chats/[chatId]/topics — list topics for a chat
 * POST   /api/chats/[chatId]/topics — create a topic (owner/admin only)
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  icon: z.string().max(10).nullable().optional(),
  isPinned: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) return fail(new HttpError(401, "unauthorized"));
    const { chatId } = await params;

    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { id: true },
    });
    if (!meP) throw new HttpError(403, "not_a_participant");

    const topics = await prisma.forumTopic.findMany({
      where: { chatId },
      orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { messages: true } } },
    });

    return ok({ topics });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;
    const body = await parseJson(req, createSchema);

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "GROUP") throw new HttpError(400, "topics_only_in_groups");

    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!meP || (meP.role !== "OWNER" && meP.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    const topic = await prisma.forumTopic.create({
      data: {
        chatId,
        title: body.title.trim(),
        icon: body.icon ?? null,
        isPinned: body.isPinned ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return ok({ topic });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
