import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";
import { requireAdmin, logAudit } from "@/lib/admin-auth";

const patchEventSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  theme: z
    .object({
      colors: z.array(z.string()).optional(),
      icon: z.string().max(10).optional(),
      background: z.string().url().optional(),
    })
    .nullable()
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { eventId } = await params;
    const body = await parseJson(req, patchEventSchema);

    const existing = await prisma.seasonalEvent.findUnique({
      where: { id: eventId },
    });
    if (!existing) throw new HttpError(404, "event_not_found");

    const data: Record<string, unknown> = {};
    if (body.code !== undefined) data.code = body.code;
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.startsAt !== undefined) data.startsAt = new Date(body.startsAt);
    if (body.endsAt !== undefined) data.endsAt = new Date(body.endsAt);
    if (body.theme !== undefined) data.theme = body.theme ?? undefined;

    const event = await prisma.seasonalEvent.update({
      where: { id: eventId },
      data,
    });

    await logAudit(admin.id, "SETTINGS_CHANGE", `seasonal:${eventId}`, {
      action: "update",
      code: event.code,
    });

    return ok({ event });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { eventId } = await params;

    const existing = await prisma.seasonalEvent.findUnique({
      where: { id: eventId },
    });
    if (!existing) throw new HttpError(404, "event_not_found");

    await prisma.seasonalEvent.delete({ where: { id: eventId } });

    await logAudit(admin.id, "SETTINGS_CHANGE", `seasonal:${eventId}`, {
      action: "delete",
      code: existing.code,
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
