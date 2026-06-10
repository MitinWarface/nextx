/**
 * GET  /api/chats/[chatId]/drafts — list channel drafts
 * POST /api/chats/[chatId]/drafts — create/update channel draft
 * DELETE /api/chats/[chatId]/drafts?id=... — delete channel draft
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

async function ensureChannelAdmin(chatId: string, userId: string) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { creatorId: true, type: true },
  });
  if (!chat) throw new HttpError(404, "chat_not_found");
  if (chat.type !== "CHANNEL") throw new HttpError(400, "not_channel");
  if (chat.creatorId !== userId) throw new HttpError(403, "not_owner");
}

const createDraftSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(50000),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;
    await ensureChannelAdmin(chatId, user!.id);

    const drafts = await prisma.channelDraft.findMany({
      where: { chatId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok({ drafts });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;
    await ensureChannelAdmin(chatId, user!.id);

    const body = createDraftSchema.parse(await req.json());

    const draft = await prisma.channelDraft.create({
      data: {
        chatId,
        authorId: user!.id,
        title: body.title ?? null,
        content: body.content,
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return created({ draft });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;
    await ensureChannelAdmin(chatId, user!.id);

    const { searchParams } = new URL(req.url);
    const draftId = searchParams.get("id");
    if (!draftId) throw new HttpError(400, "draft_id_required");

    const draft = await prisma.channelDraft.findUnique({
      where: { id: draftId },
      select: { id: true, chatId: true },
    });
    if (!draft || draft.chatId !== chatId) throw new HttpError(404, "draft_not_found");

    await prisma.channelDraft.delete({ where: { id: draftId } });

    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
