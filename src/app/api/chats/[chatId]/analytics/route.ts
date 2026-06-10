/**
 * GET /api/chats/[chatId]/analytics — channel analytics for owner only
 */
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true, creatorId: true },
    });
    if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (chat.type !== "CHANNEL" && chat.type !== "GROUP") {
      return NextResponse.json({ error: "not_a_channel" }, { status: 400 });
    }

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
      select: { role: true },
    });
    if (!participant || participant.role !== "OWNER") {
      return NextResponse.json({ error: "owner_only" }, { status: 403 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [subscriberCount, messageCount, messagesByDayRows, topPosters, growthDataRows] =
      await Promise.all([
        prisma.participant.count({ where: { chatId } }),

        prisma.message.count({
          where: { chatId, isDeleted: false },
        }),

        prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
          `SELECT DATE("createdAt") AS day, COUNT(*)::int AS count
           FROM "Message"
           WHERE "chatId" = $1
             AND "isDeleted" = false
             AND "createdAt" >= $2
           GROUP BY DATE("createdAt")
           ORDER BY day`,
          chatId,
          sevenDaysAgo,
        ),

        prisma.message.groupBy({
          by: ["senderId"],
          where: { chatId, isDeleted: false },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 5,
        }),

        prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
          `SELECT DATE("joinedAt") AS day, COUNT(*)::int AS count
           FROM "Participant"
           WHERE "chatId" = $1
             AND "joinedAt" >= $2
           GROUP BY DATE("joinedAt")
           ORDER BY day`,
          chatId,
          sevenDaysAgo,
        ),
      ]);

    const senderIds = topPosters.map((tp) => tp.senderId);
    const senders = await prisma.user!.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    const senderMap = new Map(senders.map((s) => [s.id, s]));

    const topPostersWithInfo = topPosters.map((tp) => ({
      user: senderMap.get(tp.senderId) ?? { id: tp.senderId, username: "unknown", displayName: "Unknown", avatarUrl: null },
      count: tp._count.id,
    }));

    // Fill missing days for messagesByDay (last 7 days)
    const messagesByDayMap = new Map(messagesByDayRows.map((r) => [r.day, Number(r.count)]));
    const messagesByDay: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      messagesByDay.push({ date: key, count: messagesByDayMap.get(key) ?? 0 });
    }

    // Fill missing days for growthData (last 7 days)
    const growthMap = new Map(growthDataRows.map((r) => [r.day, Number(r.count)]));
    const growthData: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      growthData.push({ date: key, count: growthMap.get(key) ?? 0 });
    }

    return ok({
      subscriberCount,
      messageCount,
      messagesByDay,
      topPosters: topPostersWithInfo,
      growthData,
    });
  } catch (err) {
    return fail(err);
  }
}
