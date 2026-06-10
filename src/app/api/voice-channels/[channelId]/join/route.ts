/**
 * POST /api/voice-channels/:channelId/join   — присоединиться к каналу
 * POST /api/voice-channels/:channelId/leave  — покинуть канал
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { channelId } = await params;

    const channel = await prisma.voiceChannel.findUnique({
      where: { id: channelId },
      include: { chat: { select: { id: true } } },
    });
    if (!channel)
      throw new HttpError(404, "channel_not_found");

    // Проверяем участие в чате
    const member = await prisma.participant.findFirst({
      where: { chatId: channel.chat.id, userId: user!.id },
    });
    if (!member)
      throw new HttpError(403, "not_chat_member");

    // Уже в канале?
    const existing = await prisma.voiceSession.findFirst({
      where: { channel_id: channelId, userId: user!.id, leftAt: null },
    });
    if (existing)
      return ok({ session: existing });

    const session = await prisma.voiceSession.create({
      data: { channel_id: channelId, userId: user!.id },
    });

    await prisma.voiceChannel.update({
      where: { id: channelId },
      data: { isActive: true },
    });

    return ok({ session });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
