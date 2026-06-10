import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "30"));

    const recentBans = await prisma.user.findMany({
      where: { isBanned: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isBanned: true,
        updatedAt: true,
      },
    });

    const totalBans = await prisma.user.count({ where: { isBanned: true } });

    const recentSuspiciousActivity = await prisma.auditLog.findMany({
      where: {
        action: { in: ["USER_BAN", "USER_UNBAN", "USER_DELETE", "USER_ROLE_CHANGE", "MESSAGE_DELETE", "CHAT_DELETE"] },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { id: true, username: true, displayName: true } },
      },
    });

    const flaggedChats = await prisma.chat.findMany({
      where: {
        messages: { some: { type: "SYSTEM", serviceType: "SECURITY" } },
      },
      take: 10,
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        lastMessageAt: true,
        _count: { select: { messages: true } },
      },
    });

    return ok({
      recentBans,
      totalBans,
      recentSuspiciousActivity,
      flaggedChats,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { action, userId, reason, duration } = body as {
      action: "mute" | "ban" | "unban" | "shadowBan" | "warn";
      userId: string;
      reason?: string;
      duration?: number;
    };

    if (!userId) throw new HttpError(400, "userId_required");

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, username: true, isBanned: true, isReadOnly: true, warningCount: true, isShadowBanned: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");

    if (target.role === "SUPER_ADMIN" || target.role === "OWNER") {
      throw new HttpError(403, "cannot_moderate_admin");
    }

    switch (action) {
      case "ban": {
        if (target.isBanned) throw new HttpError(400, "already_banned");
        await prisma.user.update({ where: { id: userId }, data: { isBanned: true } });
        await logAudit(admin.id, "USER_BAN", `user:${userId}`, {
          reason: reason ?? "moderation",
          duration,
        });
        return ok({ ok: true, action: "banned" });
      }
      case "unban": {
        if (!target.isBanned) throw new HttpError(400, "not_banned");
        await prisma.user.update({ where: { id: userId }, data: { isBanned: false } });
        await logAudit(admin.id, "USER_UNBAN", `user:${userId}`, { reason: reason ?? "moderation" });
        return ok({ ok: true, action: "unbanned" });
      }
      case "mute": {
        await prisma.user.update({ where: { id: userId }, data: { isReadOnly: true } });
        await logAudit(admin.id, "USER_BAN", `user:${userId}`, {
          type: "mute",
          reason: reason ?? "moderation",
          duration,
        });
        return ok({ ok: true, action: "muted", duration });
      }
      case "shadowBan": {
        const newShadowBanState = !target.isShadowBanned;
        await prisma.user.update({
          where: { id: userId },
          data: {
            isShadowBanned: newShadowBanState,
            shadowBannedBy: newShadowBanState ? admin.id : null,
          },
        });
        await logAudit(admin.id, "USER_BAN", `user:${userId}`, {
          type: "shadowBan",
          shadowBanned: newShadowBanState,
          reason: reason ?? "moderation",
        });
        return ok({ ok: true, action: newShadowBanState ? "shadow_banned" : "shadow_unbanned" });
      }
      case "warn": {
        const newWarningCount = target.warningCount + 1;
        const updateData: Record<string, unknown> = { warningCount: newWarningCount };

        // At 3 warnings, auto-mute (set isReadOnly)
        if (newWarningCount === 3) {
          updateData.isReadOnly = true;
        }
        // At 5 warnings, auto-ban
        if (newWarningCount >= 5) {
          updateData.isBanned = true;
        }

        await prisma.user.update({ where: { id: userId }, data: updateData });

        // Send warning service message
        const serviceChat = await prisma.chat.findFirst({
          where: { type: "SERVICE", participants: { some: { userId } } },
          select: { id: true },
        });
        if (serviceChat) {
          await prisma.message.create({
            data: {
              chatId: serviceChat.id,
              senderId: admin.id,
              type: "SYSTEM",
              serviceType: "SECURITY",
              content: `Warning issued (${newWarningCount}/5). ${reason ? `Reason: ${reason}` : ""}${newWarningCount === 3 ? " You have been muted due to repeated warnings." : ""}${newWarningCount >= 5 ? " You have been banned due to repeated warnings." : ""}`,
            },
          });
        }

        await logAudit(admin.id, "SETTINGS_CHANGE", `user:${userId}`, {
          type: "warn",
          warningCount: newWarningCount,
          reason: reason ?? "moderation",
        });

        return ok({
          ok: true,
          action: "warned",
          warningCount: newWarningCount,
          autoMuted: newWarningCount === 3,
          autoBanned: newWarningCount >= 5,
        });
      }
      default:
        throw new HttpError(400, "invalid_action");
    }
  } catch (err) {
    return fail(err);
  }
}
