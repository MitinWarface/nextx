/**
 * POST /api/reports — пользователь отправляет жалобу
 * GET  /api/reports — мои жалобы
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError, requireUser } from "@/lib/api-helpers";

const reportSchema = z.object({
  targetUserId: z.string().optional(),
  targetMessageId: z.string().optional(),
  targetChatId: z.string().optional(),
  reason: z.enum(["SPAM", "FRAUD", "ABUSE", "PORN", "VIOLENCE", "FAKE", "OTHER"]),
  description: z.string().max(1000).optional(),
  evidence: z.string().max(5000).optional(),
  witnesses: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const body = await parseJson(req, reportSchema);

    if (!body.targetUserId && !body.targetMessageId && !body.targetChatId) {
      throw new HttpError(400, "report_target_required");
    }

    // Duplicate check: same reporter + same target in last 24h
    const recentReport = await prisma.report.findFirst({
      where: {
        reporterId: user.id,
        ...(body.targetUserId ? { targetUserId: body.targetUserId } : {}),
        ...(body.targetMessageId ? { targetMessageId: body.targetMessageId } : {}),
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentReport) {
      throw new HttpError(429, "already_reported_recently");
    }

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        targetUserId: body.targetUserId ?? null,
        targetMessageId: body.targetMessageId ?? null,
        targetChatId: body.targetChatId ?? null,
        reason: body.reason,
        description: body.description ?? null,
        evidence: body.evidence ?? null,
        witnesses: body.witnesses ?? [],
      },
    });

    return ok({ reportId: report.id });
  } catch (err) {
    return fail(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? "20"));

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { reporterId: user.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.report.count({ where: { reporterId: user.id } }),
    ]);

    return ok({ reports, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}
