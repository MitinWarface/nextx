import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        isBanned: true,
        isPermabanned: true,
        isBot: true,
        premiumStatus: true,
        avatarUrl: true,
        createdAt: true,
        lastSeenAt: true,
        isReadOnly: true,
        usernameHistory: true,
        _count: {
          select: {
            messages: true,
            participants: true,
            reportedUsers: true,
          },
        },
      },
    });
    if (!user) throw new HttpError(404, "user_not_found");

    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: { lastActivity: "desc" },
      take: 10,
      select: {
        id: true,
        deviceName: true,
        platform: true,
        browser: true,
        ipAddress: true,
        city: true,
        country: true,
        trustLevel: true,
        isRevoked: true,
        lastActivity: true,
        createdAt: true,
      },
    });

    const reports = await prisma.report.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        reason: true,
        status: true,
        description: true,
        createdAt: true,
        reporter: { select: { username: true, displayName: true } },
      },
    });

    const reportsFiled = await prisma.report.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
        targetUser: { select: { username: true, displayName: true } },
      },
    });

    const blockedContacts = await prisma.contact.findMany({
      where: { ownerId: userId, isBlocked: true },
      select: {
        targetId: true,
        target: { select: { username: true, displayName: true, avatarUrl: true } },
      },
    });

    const blockedBy = await prisma.contact.findMany({
      where: { targetId: userId, isBlocked: true },
      select: {
        ownerId: true,
        owner: { select: { username: true, displayName: true } },
      },
    });

    const loginHistory = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        ipAddress: true,
        city: true,
        country: true,
        success: true,
        device: true,
        createdAt: true,
      },
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        target: true,
        details: true,
        createdAt: true,
      },
    });

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true, currency: true },
    });

    return ok({
      user,
      devices,
      reports,
      reportsFiled,
      blockedContacts,
      blockedBy,
      loginHistory,
      auditLogs,
      wallet,
      sentMessages: user._count.messages,
    });
  } catch (err) {
    return fail(err);
  }
}
