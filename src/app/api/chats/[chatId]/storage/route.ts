/**
 * GET  /api/chats/[chatId]/storage — storage breakdown for a chat
 * POST /api/chats/[chatId]/storage — clear cache for a chat (delete file messages)
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;

    const me = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user.id } },
      select: { id: true },
    });
    if (!me) throw new HttpError(403, "not_a_participant");

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
        type: { in: ["IMAGE", "VIDEO", "AUDIO", "FILE"] },
        mediaUrl: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        type: true,
        fileSize: true,
      },
    });

    const breakdown = {
      IMAGE: { count: 0, totalSize: 0 },
      VIDEO: { count: 0, totalSize: 0 },
      AUDIO: { count: 0, totalSize: 0 },
      FILE: { count: 0, totalSize: 0 },
    };

    for (const msg of messages) {
      const key = msg.type as keyof typeof breakdown;
      if (breakdown[key]) {
        breakdown[key].count += 1;
        breakdown[key].totalSize += msg.fileSize ?? 0;
      }
    }

    const totalSize = Object.values(breakdown).reduce((sum, b) => sum + b.totalSize, 0);
    const totalCount = Object.values(breakdown).reduce((sum, b) => sum + b.count, 0);

    return ok({ breakdown, totalSize, totalCount });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;

    const me = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user.id } },
      select: { id: true },
    });
    if (!me) throw new HttpError(403, "not_a_participant");

    // Soft-delete file messages (only for current user's view)
    const result = await prisma.message.updateMany({
      where: {
        chatId,
        type: { in: ["IMAGE", "VIDEO", "AUDIO", "FILE"] },
        isDeleted: false,
        NOT: {
          deletedByUserIds: { has: user.id },
        },
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedByUserIds: { push: user.id },
      },
    });

    return ok({ cleared: result.count });
  } catch (err) {
    return fail(err);
  }
}
