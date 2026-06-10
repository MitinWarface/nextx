/**
 * GET /api/users/me/activity — recent activity feed
 */
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Message counts
    const [todayMessages, weekMessages, monthMessages, totalMessages] = await Promise.all([
      prisma.message.count({ where: { senderId: me.id, createdAt: { gte: todayStart } } }),
      prisma.message.count({ where: { senderId: me.id, createdAt: { gte: weekStart } } }),
      prisma.message.count({ where: { senderId: me.id, createdAt: { gte: monthStart } } }),
      prisma.message.count({ where: { senderId: me.id } }),
    ]);

    // Groups created
    const groupsCreated = await prisma.chat.count({
      where: { creatorId: me.id, type: "GROUP", createdAt: { gte: monthStart } },
    });

    // Gifts received
    const giftsReceived = await prisma.gift.count({
      where: { receiverId: me.id, createdAt: { gte: monthStart } },
    });

    // Calls made (from AuditLog)
    const callsMade = await prisma.auditLog.count({
      where: { actorId: me.id, action: "USER_BAN", createdAt: { gte: monthStart } },
    }).catch(() => 0);

    // Recent activity items from AuditLog
    const auditLogs = await prisma.auditLog.findMany({
      where: { actorId: me.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        target: true,
        details: true,
        createdAt: true,
      },
    });

    // Recent messages sent
    const recentMessages = await prisma.message.findMany({
      where: { senderId: me.id, type: "TEXT" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        content: true,
        createdAt: true,
        chat: { select: { id: true, name: true, type: true } },
      },
    });

    // Group activity: groups the user created this month
    const recentGroups = await prisma.chat.findMany({
      where: { creatorId: me.id, createdAt: { gte: monthStart } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
      },
    });

    // Gifts received recently
    const recentGifts = await prisma.gift.findMany({
      where: { receiverId: me.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Build activity feed
    const activities: Array<{
      id: string;
      type: "message" | "group_created" | "gift_received" | "audit";
      summary: string;
      detail?: string;
      chatName?: string;
      createdAt: string;
    }> = [];

    for (const msg of recentMessages) {
      activities.push({
        id: `msg-${msg.id}`,
        type: "message",
        summary: `Написано сообщение`,
        detail: msg.content?.slice(0, 120) ?? undefined,
        chatName: msg.chat?.name ?? undefined,
        createdAt: msg.createdAt.toISOString(),
      });
    }

    for (const g of recentGroups) {
      activities.push({
        id: `group-${g.id}`,
        type: "group_created",
        summary: `Создана группа «${g.name}»`,
        createdAt: g.createdAt.toISOString(),
      });
    }

    for (const gift of recentGifts) {
      activities.push({
        id: `gift-${gift.id}`,
        type: "gift_received",
        summary: `Получен подарок от ${gift.sender.displayName}`,
        createdAt: gift.createdAt.toISOString(),
      });
    }

    for (const log of auditLogs) {
      const actionLabels: Record<string, string> = {
        USER_BAN: "Бан пользователя",
        USER_UNBAN: "Разбан пользователя",
        USER_ROLE_CHANGE: "Смена роли",
        CHAT_DELETE: "Удаление чата",
        CHAT_MEMBER_REMOVE: "Удаление участника",
        MESSAGE_DELETE: "Удаление сообщения",
        BOT_CREATE: "Создание бота",
        DATA_EXPORT: "Экспорт данных",
      };
      const label = actionLabels[log.action] ?? log.action;
      activities.push({
        id: `audit-${log.id}`,
        type: "audit",
        summary: label,
        detail: log.target ?? undefined,
        createdAt: log.createdAt.toISOString(),
      });
    }

    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Group by time period
    const todayItems = activities.filter((a) => new Date(a.createdAt) >= todayStart);
    const weekItems = activities.filter((a) => new Date(a.createdAt) >= weekStart && new Date(a.createdAt) < todayStart);
    const monthItems = activities.filter((a) => new Date(a.createdAt) < weekStart);

    return ok({
      stats: {
        todayMessages,
        weekMessages,
        monthMessages,
        totalMessages,
        groupsCreated,
        giftsReceived,
      },
      activities: {
        today: todayItems.slice(0, 20),
        thisWeek: weekItems.slice(0, 20),
        thisMonth: monthItems.slice(0, 20),
      },
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
