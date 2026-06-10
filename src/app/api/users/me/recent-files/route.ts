/**
 * GET /api/users/me/recent-files — recent files shared across all chats
 * Query: ?type=IMAGE|VIDEO|AUDIO|FILE|ALL&limit=50
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "unauthorized");

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "ALL").toUpperCase();
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

    const types =
      type === "IMAGE"
        ? ["IMAGE"]
        : type === "VIDEO"
          ? ["VIDEO"]
          : type === "AUDIO"
            ? ["AUDIO"]
            : type === "FILE"
              ? ["FILE"]
              : ["IMAGE", "VIDEO", "AUDIO", "FILE"];

    const chatIds = await prisma.participant.findMany({
      where: { userId: user.id },
      select: { chatId: true },
    });
    const ids = chatIds.map((p) => p.chatId);

    const messages = await prisma.message.findMany({
      where: {
        chatId: { in: ids },
        isDeleted: false,
        type: { in: types as any },
        mediaUrl: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        mediaUrl: true,
        thumbnailUrl: true,
        fileName: true,
        fileSize: true,
        content: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
        chat: {
          select: {
            id: true,
            name: true,
            type: true,
            avatarUrl: true,
          },
        },
      },
    });

    return ok({ files: messages });
  } catch (err) {
    return fail(err);
  }
}
