/**
 * GET /api/videos — list video messages across user's chats
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const cursor = searchParams.get("cursor");

    const chatIds = (
      await prisma.participant.findMany({
        where: { userId: user!.id },
        select: { chatId: true },
      })
    ).map((p) => p.chatId);

    const videos = await prisma.message.findMany({
      where: {
        chatId: { in: chatIds },
        type: "VIDEO",
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      select: {
        id: true,
        content: true,
        mediaUrl: true,
        thumbnailUrl: true,
        hlsUrl: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
        chat: { select: { id: true, name: true, type: true } },
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return ok({
      videos,
      nextCursor: videos.length === limit ? videos[videos.length - 1].createdAt.toISOString() : null,
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
