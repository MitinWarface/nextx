/**
 * GET /api/users/me/data-export — GDPR data export
 * Returns all user data as JSON.
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError, requireUser } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        username: true,
        displayName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        premiumStatus: true,
        premiumUntil: true,
        premiumPlanId: true,
      },
    });
    if (!fullUser) throw new HttpError(404, "user_not_found");

    const contacts = await prisma.contact.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        targetId: true,
        nickname: true,
        isBlocked: true,
        createdAt: true,
      },
    });

    const participants = await prisma.participant.findMany({
      where: { userId: user.id },
      select: {
        chatId: true,
        chat: { select: { id: true, name: true, type: true } },
      },
    });
    const chats = participants.map((p) => ({
      id: p.chat.id,
      name: p.chat.name,
      type: p.chat.type,
    }));

    const chatIds = participants.map((p) => p.chatId);
    const messageCounts = await prisma.message.groupBy({
      by: ["chatId"],
      where: { chatId: { in: chatIds } },
      _count: { id: true },
    });
    const messages: Record<string, number> = {};
    for (const mc of messageCounts) {
      messages[mc.chatId] = mc._count.id;
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      select: {
        balance: true,
        currency: true,
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            relatedId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const devices = await prisma.device.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        deviceName: true,
        platform: true,
        browser: true,
        trustLevel: true,
        lastActivity: true,
        isRevoked: true,
        createdAt: true,
      },
      orderBy: { lastActivity: "desc" },
    });

    const loginHistory = await prisma.loginHistory.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        success: true,
        ipAddress: true,
        country: true,
        city: true,
        device: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const reports = await prisma.report.findMany({
      where: { reporterId: user.id },
      select: {
        id: true,
        targetUserId: true,
        targetMessageId: true,
        targetChatId: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const premiumPlan = fullUser.premiumPlanId
      ? await prisma.subscriptionPlan.findUnique({
          where: { id: fullUser.premiumPlanId },
          select: { name: true, durationDays: true },
        })
      : null;

    const giftsSent = await prisma.gift.findMany({
      where: { senderId: user.id },
      select: {
        id: true,
        receiverId: true,
        type: true,
        name: true,
        emoji: true,
        price: true,
        status: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const giftsReceived = await prisma.gift.findMany({
      where: { receiverId: user.id },
      select: {
        id: true,
        senderId: true,
        type: true,
        name: true,
        emoji: true,
        price: true,
        status: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const storiesCount = await prisma.story.count({
      where: { authorId: user.id },
    });

    const subscriptions = await prisma.payment.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        planId: true,
        amountKopecks: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      export: {
        profile: fullUser,
        contacts,
        chats,
        messages,
        wallet: wallet
          ? { balance: wallet.balance, currency: wallet.currency, transactions: wallet.transactions }
          : null,
        devices,
        loginHistory,
        reports,
        subscriptions,
        gifts: { sent: giftsSent, received: giftsReceived },
        stories: { count: storiesCount },
        premium: {
          status: fullUser.premiumStatus,
          until: fullUser.premiumUntil,
          plan: premiumPlan,
        },
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return fail(err);
  }
}
