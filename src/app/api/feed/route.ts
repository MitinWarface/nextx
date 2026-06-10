/**
 * GET /api/feed — aggregated news feed
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const type = searchParams.get("type"); // "channels", "groups", "contacts"
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 50);

    // Get channel IDs the user is subscribed to
    const channelParticipations = await prisma.participant.findMany({
      where: {
        userId: user!.id,
        chat: { type: "CHANNEL" },
      },
      select: { chatId: true },
    });
    const channelIds = channelParticipations.map((p) => p.chatId);

    // Get group IDs
    const groupParticipations = await prisma.participant.findMany({
      where: {
        userId: user!.id,
        chat: { type: "GROUP" },
      },
      select: { chatId: true },
    });
    const groupIds = groupParticipations.map((p) => p.chatId);

    // Get contact IDs
    const contacts = await prisma.contact.findMany({
      where: { ownerId: user!.id, isBlocked: false },
      select: { targetId: true },
    });
    const contactIds = contacts.map((c) => c.targetId);

    // Build feed from messages in channels/groups, and activity from contacts
    const whereConditions: Record<string, unknown>[] = [];

    if (!type || type === "channels") {
      whereConditions.push({
        chatId: { in: channelIds },
        senderId: { not: user!.id },
      });
    }
    if (!type || type === "groups") {
      whereConditions.push({
        chatId: { in: groupIds },
        senderId: { not: user!.id },
      });
    }
    if (!type || type === "contacts") {
      whereConditions.push({
        senderId: { in: contactIds },
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: whereConditions.length > 0 ? whereConditions : [{ id: { in: [] } }],
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        chat: { select: { id: true, name: true, avatarUrl: true, type: true } },
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Get recent gifts
    const gifts = !type || type === "contacts"
      ? await prisma.gift.findMany({
          where: {
            OR: [
              { receiverId: user!.id },
              { senderId: { in: contactIds } },
            ],
          },
          include: {
            sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : [];

    const feedItems = [
      ...messages.map((m) => ({
        id: m.id,
        type: m.chat.type === "CHANNEL" ? "channel_post" : "group_post",
        content: m.content,
        mediaUrl: m.mediaUrl,
        createdAt: m.createdAt.toISOString(),
        chat: m.chat,
        sender: m.sender,
        reactions: m.reactions,
        reactionsCount: m.reactions.length,
      })),
      ...gifts.map((g) => ({
        id: `gift-${g.id}`,
        type: "gift_notification" as const,
        content: `${g.sender.displayName} отправил(а) вам подарок ${g.emoji}`,
        createdAt: g.createdAt.toISOString(),
        chat: null,
        sender: g.sender,
        reactions: [],
        reactionsCount: 0,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const nextCursor = feedItems.length === limit
      ? feedItems[feedItems.length - 1].createdAt
      : null;

    return ok({ items: feedItems, nextCursor });
  } catch (err) {
    return fail(err);
  }
}
