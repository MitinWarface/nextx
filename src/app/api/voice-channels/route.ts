/**
 * GET  /api/voice-channels?chatId=... — список голосовых каналов чата
 * POST /api/voice-channels            — создать голосовой канал
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
    const chatId = searchParams.get("chatId");
    if (!chatId) throw new HttpError(400, "chatId_required");

    const channels = await prisma.voiceChannel.findMany({
      where: { chatId },
      include: {
        sessions: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    return ok({ channels });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const chatId = body.chatId as string;
    const name = (body.name ?? "").trim();
    if (!chatId || !name)
      throw new HttpError(400, "chatId_and_name_required");

    // Проверяем, что пользователь — участник чата
    const member = await prisma.participant.findFirst({
      where: { chatId, userId: user!.id },
    });
    if (!member)
      throw new HttpError(403, "not_chat_member");

    const channel = await prisma.voiceChannel.create({
      data: {
        chatId,
        name,
        description: body.description ?? null,
      },
    });
    return ok({ channel });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
