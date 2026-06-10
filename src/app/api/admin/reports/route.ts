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
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "20"));
    const status = searchParams.get("status") ?? undefined;

    const where: any = {};
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: { select: { id: true, username: true, displayName: true } },
          targetUser: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return ok({ reports, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { reportId, action, resolution } = body as {
      reportId: string;
      action: "dismiss" | "warn" | "mute" | "ban";
      resolution?: string;
    };

    if (!reportId) throw new HttpError(400, "reportId_required");

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new HttpError(404, "report_not_found");

    const statusMap: Record<string, "DISMISSED" | "ACTION_TAKEN"> = {
      dismiss: "DISMISSED",
      warn: "ACTION_TAKEN",
      mute: "ACTION_TAKEN",
      ban: "ACTION_TAKEN",
    };

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: statusMap[action] ?? "ACTION_TAKEN",
        reviewedById: admin.id,
        reviewedAt: new Date(),
        ...(resolution && { resolution, resolvedAt: new Date() }),
      },
    });

    if ((action === "mute" || action === "ban") && report.targetUserId) {
      const target = await prisma.user.findUnique({
        where: { id: report.targetUserId },
        select: { id: true, role: true, isBanned: true },
      });

      if (target && target.role !== "SUPER_ADMIN" && target.role !== "OWNER") {
        if (action === "ban") {
          await prisma.user.update({ where: { id: report.targetUserId }, data: { isBanned: true } });
          await logAudit(admin.id, "USER_BAN", `user:${report.targetUserId}`, {
            reason: "report_resolution",
            reportId,
          });
        }
        await logAudit(admin.id, "USER_ROLE_CHANGE", `user:${report.targetUserId}`, {
          action,
          reportId,
        });
      }
    }

    if (action === "warn") {
      await logAudit(admin.id, "SETTINGS_CHANGE", `report:${reportId}`, {
        action: "warn",
      });
    }

    return ok({ ok: true, action });
  } catch (err) {
    return fail(err);
  }
}
