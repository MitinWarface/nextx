/**
 * GET  /api/messages/trash — list soft-deleted messages for current user
 * POST /api/messages/trash/[messageId]/restore — restore a deleted message
 * DELETE /api/messages/trash/[messageId] — permanently delete
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const userId = user.id as string;
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const limit = 50;

    const where: any = {
      deletedByUserIds: { has: userId },
    };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        chat: { select: { id: true, name: true, type: true } },
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    return ok({
      messages: items.map((m) => ({
        id: m.id,
        content: m.content,
        mediaUrl: m.mediaUrl,
        type: m.type,
        createdAt: m.createdAt,
        chatName: m.chat?.name ?? "Чат",
        chatId: m.chatId,
        senderName: m.sender?.displayName ?? "Unknown",
      })),
      nextCursor: hasMore ? items[items.length - 1]?.createdAt?.toISOString() ?? null : null,
    });
  } catch (err) {
    return fail(err);
  }
}
