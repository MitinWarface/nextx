/**
 * GET /api/developer/apps/[appId]/logs — app usage logs with pagination
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

async function ensureOwnership(appId: string, userId: string) {
  const app = await prisma.developerApp.findUnique({
    where: { id: appId },
    select: { id: true, userId: true },
  });
  if (!app) throw new HttpError(404, "app_not_found");
  if (app.userId !== userId) throw new HttpError(403, "forbidden");
  return app;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { appId } = await params;
    await ensureOwnership(appId, user.id);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "50"));

    const [logs, total] = await Promise.all([
      prisma.developerLog.findMany({
        where: { appId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.developerLog.count({ where: { appId } }),
    ]);

    const stats = await prisma.developerLog.aggregate({
      where: { appId },
      _avg: { duration: true, statusCode: true },
      _count: true,
    });

    const successCount = await prisma.developerLog.count({
      where: { appId, statusCode: { gte: 200, lt: 400 } },
    });

    return ok({
      logs,
      total,
      page,
      limit,
      stats: {
        totalRequests: stats._count,
        avgDuration: stats._avg.duration ?? 0,
        avgStatusCode: stats._avg.statusCode ?? 0,
        successRate: stats._count > 0 ? (successCount / stats._count) * 100 : 0,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
