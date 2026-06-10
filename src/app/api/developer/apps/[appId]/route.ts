/**
 * PATCH /api/developer/apps/[appId] — update app
 * DELETE /api/developer/apps/[appId] — delete app
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError, noContent, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const updateAppSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  webhookUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

async function ensureOwnership(appId: string, userId: string) {
  const app = await prisma.developerApp.findUnique({
    where: { id: appId },
    select: { id: true, userId: true },
  });
  if (!app) throw new HttpError(404, "app_not_found");
  if (app.userId !== userId) throw new HttpError(403, "forbidden");
  return app;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { appId } = await params;
    await ensureOwnership(appId, user.id);

    const body = await parseJson(req, updateAppSchema);

    const updated = await prisma.developerApp.update({
      where: { id: appId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.webhookUrl !== undefined && { webhookUrl: body.webhookUrl }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return ok({ app: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { appId } = await params;
    await ensureOwnership(appId, user.id);

    await prisma.developerApp.delete({ where: { id: appId } });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}
