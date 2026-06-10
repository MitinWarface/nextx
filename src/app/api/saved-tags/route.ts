/**
 * GET  /api/saved-tags          — список тегов пользователя (опционально ?tag=работа)
 * POST /api/saved-tags          — добавить тег к сообщению { messageId, tag }
 * DELETE /api/saved-tags        — удалить тег { messageId, tag }
 *
 * Premium feature: saved_tags
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";

const createSchema = z.object({
  messageId: z.string().min(1),
  tag: z.string().min(1).max(50),
});

const deleteSchema = z.object({
  messageId: z.string().min(1),
  tag: z.string().min(1).max(50),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const hasSavedTags = await hasFeature(user!.id, "saved_tags");
    if (!hasSavedTags) throw new HttpError(403, "premium_required");

    const { searchParams } = new URL(req.url);
    const tagFilter = searchParams.get("tag") ?? undefined;
    const messageId = searchParams.get("messageId") ?? undefined;

    const where: any = { userId: user!.id };
    if (tagFilter) where.tag = tagFilter;
    if (messageId) where.messageId = messageId;

    const tags = await prisma.savedTag.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        message: {
          select: { id: true, content: true, type: true, chatId: true },
        },
      },
    });

    return ok({ tags });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const hasSavedTags = await hasFeature(user!.id, "saved_tags");
    if (!hasSavedTags) throw new HttpError(403, "premium_required");

    const body = await parseJson(req, createSchema);

    const message = await prisma.message.findUnique({
      where: { id: body.messageId },
      select: { id: true },
    });
    if (!message) throw new HttpError(404, "message_not_found");

    const existing = await prisma.savedTag.findUnique({
      where: {
        userId_messageId_tag: {
          userId: user!.id,
          messageId: body.messageId,
          tag: body.tag,
        },
      },
    });
    if (existing) return ok({ tag: existing });

    const tag = await prisma.savedTag.create({
      data: {
        userId: user!.id,
        messageId: body.messageId,
        tag: body.tag,
      },
    });

    return ok({ tag });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const hasSavedTags = await hasFeature(user!.id, "saved_tags");
    if (!hasSavedTags) throw new HttpError(403, "premium_required");

    const body = await parseJson(req, deleteSchema);

    await prisma.savedTag.deleteMany({
      where: {
        userId: user!.id,
        messageId: body.messageId,
        tag: body.tag,
      },
    });

    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
