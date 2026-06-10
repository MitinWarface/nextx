import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { userId } = await params;
    const body = await req.json();
    const { userRole, roleBadge } = body as {
      userRole?: string | null;
      roleBadge?: string | null;
    };

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, userRole: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");

    const updates: any = {};
    if (userRole !== undefined) {
      updates.userRole = userRole || null;
      updates.roleVerifiedAt = userRole ? new Date() : null;
    }
    if (roleBadge !== undefined) {
      updates.roleBadge = roleBadge || null;
    }

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_updates");
    }

    await prisma.user.update({ where: { id: userId }, data: updates });

    await logAudit(admin.id, "USER_ROLE_CHANGE", `user:${userId}`, {
      action: "set_user_role",
      userRole: userRole ?? target.userRole,
      roleBadge,
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
