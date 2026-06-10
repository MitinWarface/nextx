/**
 * GET /api/chats/[chatId]/media — список медиа-сообщений чата
 * Query: ?type=ALL|IMAGE|VIDEO|FILE|AUDIO|VOICE
 */
import type { NextRequest } from "next/server";
import type { MessageType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "unauthorized");
    const { chatId } = await ctx.params;
    const me = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user.id } },
      select: { id: true },
    });
    if (!me) throw new HttpError(403, "not_a_participant");
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "ALL").toUpperCase();

    const types: MessageType[] =
      type === "IMAGE"
        ? ["IMAGE"]
        : type === "VIDEO"
          ? ["VIDEO"]
          : type === "FILE"
            ? ["FILE"]
            : type === "AUDIO"
              ? ["AUDIO"]
              : type === "VOICE"
                ? ["VOICE"]
                : ["IMAGE", "VIDEO", "FILE", "AUDIO", "VOICE"];

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
        type: { in: types },
        mediaUrl: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        type: true,
        mediaUrl: true,
        thumbnailUrl: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
        sender: { select: { id: true, displayName: true, username: true } },
      },
    });

    return ok({ messages });
  } catch (err) {
    return fail(err);
  }
}
