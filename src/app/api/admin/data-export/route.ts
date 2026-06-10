/**
 * GET  /api/admin/data-export — list deletion requests and export history
 * POST /api/admin/data-export — trigger data export for a user
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSectionAccess, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const exportHistory: Array<{
  id: string;
  userId: string;
  username: string;
  adminId: string;
  adminName: string;
  date: string;
}> = [];

export async function GET(req: NextRequest) {
  try {
    const admin = await requireSectionAccess(
      "data_export",
      req.headers.get("cookie") ?? undefined,
    );

    const deletionRequests = await prisma.user.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        username: true,
        displayName: true,
        deletedAt: true,
        deletedReason: true,
      },
      orderBy: { deletedAt: "desc" },
      take: 100,
    });

    const formattedDeletions = deletionRequests.map((u) => {
      const deletedAt = new Date(u.deletedAt!);
      const now = new Date();
      const daysElapsed = Math.floor(
        (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysRemaining = Math.max(0, 30 - daysElapsed);
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        deletedAt: u.deletedAt,
        reason: u.deletedReason ?? "—",
        daysRemaining,
      };
    });

    const recentAuditLogs = await prisma.auditLog.findMany({
      where: { action: "DATA_EXPORT" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { id: true, displayName: true, username: true } } },
    });

    const exportHistoryFromAudit = recentAuditLogs.map((log) => ({
      id: log.id,
      target: log.target ?? "—",
      admin: log.actor.displayName ?? log.actor.username,
      date: log.createdAt,
      details: log.details,
    }));

    return ok({
      deletionRequests: formattedDeletions,
      exportHistory: [
        ...exportHistory.slice(-50).reverse(),
        ...exportHistoryFromAudit,
      ].slice(0, 50),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSectionAccess(
      "data_export",
      req.headers.get("cookie") ?? undefined,
    );
    const body = await req.json();
    const { userId } = body;

    if (!userId) throw new HttpError(400, "missing_userId");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
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
    if (!user) throw new HttpError(404, "user_not_found");

    const contacts = await prisma.contact.count({
      where: { ownerId: userId },
    });

    const participants = await prisma.participant.findMany({
      where: { userId },
      select: { chatId: true },
    });
    const chatIds = participants.map((p) => p.chatId);
    const messageCount = await prisma.message.count({
      where: { chatId: { in: chatIds } },
    });

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: {
        balance: true,
        currency: true,
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    const devices = await prisma.device.findMany({
      where: { userId },
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

    const storiesCount = await prisma.story.count({
      where: { authorId: userId },
    });

    const premiumPlan = user.premiumPlanId
      ? await prisma.subscriptionPlan.findUnique({
          where: { id: user.premiumPlanId },
          select: { name: true, durationDays: true },
        })
      : null;

    const exportData = {
      profile: user,
      contacts: { count: contacts },
      messages: { count: messageCount, chatCount: chatIds.length },
      wallet: wallet
        ? { balance: wallet.balance, currency: wallet.currency, transactions: wallet.transactions }
        : null,
      devices,
      stories: { count: storiesCount },
      premium: {
        status: user.premiumStatus,
        until: user.premiumUntil,
        plan: premiumPlan,
      },
      exportedAt: new Date().toISOString(),
      exportedBy: admin.id,
    };

    const adminUser = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { displayName: true, username: true },
    });

    exportHistory.push({
      id: `export_${Date.now()}`,
      userId,
      username: user.username,
      adminId: admin.id,
      adminName: adminUser?.displayName ?? adminUser?.username ?? admin.id,
      date: new Date().toISOString(),
    });

    await logAudit(admin.id, "DATA_EXPORT", `user:${userId}`, {
      username: user.username,
    });

    return ok({ export: exportData });
  } catch (err) {
    return fail(err);
  }
}
