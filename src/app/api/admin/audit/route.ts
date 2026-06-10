/**
 * GET /api/admin/audit — audit log
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "50"));
    const action = searchParams.get("action") ?? undefined;

    const where: any = {};
    if (action) {
      const validActions = ["USER_BAN","USER_UNBAN","USER_ROLE_CHANGE","USER_DELETE","CHAT_DELETE","CHAT_MEMBER_REMOVE","MESSAGE_DELETE","BOT_CREATE","BOT_DELETE","SETTINGS_CHANGE","BROADCAST_SEND"];
      if (validActions.includes(action)) {
        where.action = action;
      } else {
        return ok({ logs: [], total: 0, page, limit });
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return ok({ logs, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
