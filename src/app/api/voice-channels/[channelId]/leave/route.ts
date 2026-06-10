/**
 * POST /api/voice-channels/:channelId/leave — покинуть голосовой канал
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { channelId } = await params;

    await prisma.voiceSession.updateMany({
      where: { channel_id: channelId, userId: user!.id, leftAt: null },
      data: { leftAt: new Date() },
    });

    // Если в канале никого нет — деактивируем
    const activeCount = await prisma.voiceSession.count({
      where: { channel_id: channelId, leftAt: null },
    });
    if (activeCount === 0) {
      await prisma.voiceChannel.update({
        where: { id: channelId },
        data: { isActive: false },
      });
    }

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
