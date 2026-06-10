/**
 * GET  /api/admin/remote-config — list all configs
 * POST /api/admin/remote-config — create/update config
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const configs = await prisma.remoteConfig.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return ok({ configs });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { key, value, description } = body as { key: string; value: any; description?: string };

    if (!key || typeof key !== "string") throw new HttpError(400, "key_required");

    const existing = await prisma.remoteConfig.findUnique({ where: { key } });

    if (existing) {
      await prisma.remoteConfig.update({
        where: { key },
        data: { value: value ?? existing.value, description: description ?? existing.description },
      });
    } else {
      await prisma.remoteConfig.create({
        data: { key, value: value ?? {}, description: description ?? null },
      });
    }

    await logAudit(admin.id, "UPDATE_REMOTE_CONFIG", "remote-config", { key });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
